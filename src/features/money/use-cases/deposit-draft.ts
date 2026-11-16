// Nuevo Abibono precargado y borradores (HU-DIN-04, BR-DEP-02/03/04/08/10/13, AF-43, AF-106).
import { businessConfig } from '@/domain/config/business-config';
import {
  buildDepositView,
  buildNewDepositProposal,
  validateDepositDraft,
  type DepositDraftInput,
  type DepositView,
  type NewDepositProposal,
  type StagedReceipt,
} from '@/domain/deposit-draft';
import { nextDepositNumber } from '@/domain/deposit';
import { appError, COMMON_ERROR_CODES, type AppError } from '@/domain/shared/errors';
import { err, ok, type Result } from '@/domain/shared/result';
import type { LocalDate } from '@/domain/time';
import type { Connectivity, MoneyRepository, PhotoRepository, StorageRepository } from '@/repositories';
import { uploadPhotoFiles, type PhotoUploadDeps } from '../../photos/upload-photo';
import { runMutation } from '../../shared/run-mutation';
import type { MoneySummaryData } from './money-summary';

const KIND = 'deposit_receipt' as const;
const signedUrlSeconds = businessConfig.photos.signedUrlSeconds;

/** La propuesta precargada, sacada de la lectura de Dinero (funciona sin conexión y no escribe nada, R1). */
export const newDepositProposalFrom = (
  data: MoneySummaryData,
  depositId: string,
  today: LocalDate,
): NewDepositProposal =>
  buildNewDepositProposal({
    depositId,
    payments: data.payments,
    customers: data.customers.customers,
    deposits: data.deposits,
    today,
  });

/** Un Abibono con su cuadre y las miniaturas firmadas de sus recibos. Errores: `NOT_FOUND`, `NETWORK_ERROR`. */
export async function loadDeposit(
  deps: { readonly money: MoneyRepository; readonly storage: StorageRepository },
  depositId: string,
): Promise<Result<DepositView, AppError>> {
  const record = await deps.money.getDeposit(depositId);
  if (!record.ok) return record;
  if (!record.value) return err(appError(COMMON_ERROR_CODES.NOT_FOUND));
  const { deposit, payments, receipts, lastNumber, history } = record.value;
  const urls = await Promise.all(receipts.map((r) => deps.storage.signedUrl(r.thumbPath, signedUrlSeconds)));
  const thumbs: { photoId: string; thumbUrl: string }[] = [];
  for (const [i, url] of urls.entries()) {
    if (!url.ok) return url;
    thumbs.push({ photoId: receipts[i]!.id, thumbUrl: url.value });
  }
  return ok(
    buildDepositView({
      deposit,
      payments,
      receipts: thumbs,
      nextNumber: nextDepositNumber([lastNumber]),
      history,
    }),
  );
}

/**
 * Guarda (crea o actualiza) el borrador: vincula los marcados y desvincula los demás, en una transacción (R2).
 * Idempotente por `depositId`. Errores: `OFFLINE`, `VALIDATION` (`details.field`), `PAYMENT_NOT_AVAILABLE`
 * (`details.paymentIds`), `DEPOSIT_NOT_DRAFT`, `CONFLICT`, `NETWORK_ERROR`.
 */
export async function saveDepositDraft(
  deps: { readonly money: MoneyRepository; readonly connectivity: Connectivity },
  input: DepositDraftInput,
): Promise<Result<{ depositId: string }, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateDepositDraft(input);
    if (!valid.ok) return valid;
    return deps.money.saveDepositDraft(valid.value);
  });
}

/**
 * Comprime y sube un recibo. Si el Abibono ya existe (borrador o confirmado) crea la fila y devuelve
 * `staged: null`; si aún es una propuesta sin guardar, solo sube el archivo y devuelve el `StagedReceipt` que
 * se envía al guardar o confirmar (R7, BR-DEP-13). Reintentar con el mismo `photoId` no duplica.
 * Errores: `OFFLINE`, `IMAGE_UNREADABLE`, `IMAGE_ENCODING_FAILED`, `NETWORK_ERROR`, `NOT_FOUND`,
 * `SESSION_EXPIRED`, `FORBIDDEN`.
 */
export async function addDepositReceipt(
  deps: PhotoUploadDeps & { readonly money: MoneyRepository; readonly photos: PhotoRepository },
  input: { depositId: string; photoId: string; file: Blob },
): Promise<Result<{ staged: StagedReceipt | null }, AppError>> {
  const files = await uploadPhotoFiles(deps, { photoId: input.photoId, kind: KIND, file: input.file });
  if (!files.ok) return files;
  return runMutation<{ staged: StagedReceipt | null }>(deps.connectivity, async () => {
    const existing = await deps.money.getDeposit(input.depositId);
    if (!existing.ok) return existing;
    if (!existing.value) return ok({ staged: { photoId: input.photoId, ...files.value } });
    const created = await deps.photos.create({
      id: input.photoId,
      kind: KIND,
      ...files.value,
      leaderDepositId: input.depositId,
    });
    return created.ok ? ok({ staged: null }) : created;
  });
}

/** Borrado lógico de un recibo de un borrador (R6). Errores: `OFFLINE`, `RECEIPT_LOCKED`, `NOT_FOUND`. */
export async function deleteDepositReceipt(
  deps: { readonly photos: PhotoRepository; readonly connectivity: Connectivity },
  photoId: string,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.photos.softDelete(photoId, { kind: KIND }));
}

/**
 * Borra el borrador (la única eliminación física, R5): sus abonos quedan libres y sus recibos desaparecen,
 * filas y archivos. Si borrar los archivos falla, el borrador igual queda borrado (los archivos quedan sin
 * usar, como en I-05). Errores: `OFFLINE`, `DEPOSIT_NOT_DRAFT`, `NETWORK_ERROR`.
 */
export async function deleteDepositDraft(
  deps: {
    readonly money: MoneyRepository;
    readonly storage: StorageRepository;
    readonly connectivity: Connectivity;
  },
  depositId: string,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const deleted = await deps.money.deleteDepositDraft(depositId);
    if (!deleted.ok) return deleted;
    if (deleted.value.paths.length > 0) {
      try {
        await deps.storage.remove(deleted.value.paths);
      } catch {
        // El borrador ya no existe: los archivos quedan sin usar (I-05).
      }
    }
    return ok(undefined);
  });
}
