'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { copy } from '@/copy/es';
import { mapsLinkFor, type CustomerLocation } from '@/domain/customer-location';
import type { NewCustomerDraft } from '@/domain/new-customer';
import { suggestFirstDueDate, withPaymentIds } from '@/domain/payment-plan';
import { todayBogota, type LocalDate } from '@/domain/time';
import {
  NewCustomerScreen,
  mapTiles,
  planPreview,
  useAddCustomerInfoPhoto,
  useAddInvoicePhoto,
  useCreateInvoiceWithPhoto,
  useRememberLastChosenPoint,
  useSaveNewCustomer,
  useUpdateInvoice,
  type DownPaymentValue,
  type PaymentPlanValue,
} from '@/features/customers';
import { DEFAULT_PAY_METHOD } from '@/features/payments';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, ShellScreen, useAppShell } from '@/features/shell';
import { systemClock } from '@/lib/clock';
import { newId } from '@/lib/ids';
import { useToast } from '@/ui/molecules/Toast';
import { usePlatform } from '@/ui/platform';
import { LocationPickerContainer } from '../location-picker-container';
import { DraftBooksContainer, type DraftBook } from './draft-books';

/** Una foto tomada antes de guardar: vive en el teléfono hasta «Guardar cliente». */
type LocalPhoto = { readonly photoId: string; readonly file: File; readonly thumbUrl: string };
type LocalInvoice = {
  readonly invoiceId: string;
  readonly number: string | null;
  readonly date: LocalDate | null;
  readonly photos: readonly LocalPhoto[];
};

const localPhoto = (file: File): LocalPhoto => ({
  photoId: newId(),
  file,
  thumbUrl: URL.createObjectURL(file),
});
/** La fecha de venta como instante (mediodía en Bogotá), para mostrarla igual que la de un libro ya vendido. */
const middayBogota = (date: LocalDate) => new Date(`${date}T12:00:00-05:00`);

/**
 * Nuevo cliente (HU-PAN-CLI-03; ronda 35, #57, ADR-0051): **el cliente solo existe al guardarlo**. Todo lo que se
 * escribe, los libros elegidos (que siguen En físico, sin historial), la cuota, el plan y las fotos viven en el teléfono.
 * «Guardar cliente» guarda cliente, libros, cuota y plan en una sola transacción y después sube las fotos; si una foto
 * falla, el cliente ya quedó guardado y el Aviso ofrece reintentarla. Salir con algo escrito pregunta antes.
 */
function NewCustomerRoute() {
  const shell = useAppShell();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobile = usePlatform() === 'mobile';
  const toast = useToast();
  const [today] = useState(() => todayBogota(systemClock));
  const [id] = useState(newId);
  const [downPaymentId] = useState(newId);

  const [name, setName] = useState(() => searchParams.get('nombre')?.trim() ?? '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [info, setInfo] = useState('');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [location, setLocation] = useState<CustomerLocation | null>(null);
  const [choosingLocation, setChoosingLocation] = useState(false);
  const [tiles] = useState(mapTiles);
  const [books, setBooks] = useState<readonly DraftBook[]>([]);
  const [addingBook, setAddingBook] = useState(false);
  const [photos, setPhotos] = useState<readonly LocalPhoto[]>([]);
  const [invoices, setInvoices] = useState<readonly LocalInvoice[]>([]);
  const [down, setDown] = useState<DownPaymentValue>({
    amount: null,
    method: DEFAULT_PAY_METHOD,
    paidOn: today,
  });
  const [plan, setPlan] = useState<PaymentPlanValue>({
    frequency: 'biweekly',
    amount: null,
    firstDueDate: null,
  });
  /** Fechas del plan corregidas a mano (HU-PAN-CLI-05); se descartan si el plan se recalcula (I-08). */
  const [overrides, setOverrides] = useState<Record<number, LocalDate>>({});
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string>(ROUTES.customers);
  const saved = useRef(false);

  const { saveNewCustomer } = useSaveNewCustomer();
  const { addCustomerInfoPhoto } = useAddCustomerInfoPhoto();
  const { createInvoiceWithPhoto } = useCreateInvoiceWithPhoto();
  const { addInvoicePhoto } = useAddInvoicePhoto();
  const { updateInvoice } = useUpdateInvoice();
  const rememberLastChosenPoint = useRememberLastChosenPoint();

  const showError = (error: unknown) =>
    toast.show({ message: appErrorMessage(error).message, tone: 'error' });

  const hasName = name.trim() !== '';
  const dirty =
    hasName ||
    [phone, address, info].some((v) => v.trim() !== '') ||
    emoji !== null ||
    location !== null ||
    books.length > 0 ||
    photos.length > 0 ||
    invoices.length > 0 ||
    down.amount !== null ||
    plan.amount !== null;

  // Cerrar la pestaña con algo escrito: el navegador pregunta (no queda borrador, #57).
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!saved.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const leave = (href: string) => {
    if (!dirty) return router.push(href);
    setLeaveTo(href);
    setLeaveOpen(true);
  };

  const debt = books.reduce((sum, b) => sum + (b.agreedPrice ?? b.price ?? 0), 0);
  // El primer abono sugerido sigue a la frecuencia hasta que se cambia a mano (HU-ABO-03 R3).
  const firstDueDate =
    plan.firstDueDate ?? (plan.amount !== null ? suggestFirstDueDate(plan.frequency, today) : null);
  const preview = planPreview({
    debt,
    downPayment: down.amount,
    frequency: plan.frequency,
    amount: plan.amount,
    firstDueDate,
    today,
    overrides,
  });
  const downDateInFuture = down.paidOn > today;

  /** Sube las fotos del cliente ya guardado; devuelve lo que falló, para reintentar. */
  const uploadPhotos = async (customerId: string) => {
    const failed: (() => Promise<boolean>)[] = [];
    const attempt = async (run: () => Promise<{ ok: boolean }>) => {
      const result = await run();
      if (!result.ok) failed.push(async () => (await run()).ok);
    };
    for (const photo of photos)
      await attempt(() => addCustomerInfoPhoto({ photoId: photo.photoId, customerId, file: photo.file }));
    for (const invoice of invoices) {
      const [first, ...rest] = invoice.photos;
      if (!first) continue;
      const created = await createInvoiceWithPhoto({
        invoiceId: invoice.invoiceId,
        photoId: first.photoId,
        customerId,
        file: first.file,
      });
      if (!created.ok) {
        failed.push(async () => {
          const again = await createInvoiceWithPhoto({
            invoiceId: invoice.invoiceId,
            photoId: first.photoId,
            customerId,
            file: first.file,
          });
          return again.ok;
        });
        continue;
      }
      for (const photo of rest)
        await attempt(() =>
          addInvoicePhoto({ invoiceId: invoice.invoiceId, photoId: photo.photoId, file: photo.file }),
        );
      if (invoice.number || invoice.date)
        await attempt(() =>
          updateInvoice({
            invoiceId: invoice.invoiceId,
            patch: { number: invoice.number, date: invoice.date },
          }),
        );
    }
    return failed;
  };

  const offerRetry = (failed: (() => Promise<boolean>)[]) => {
    if (failed.length === 0) return;
    toast.show({
      message: copy.customers.create.photosFailed(failed.length),
      tone: 'error',
      action: {
        label: copy.errors.retry,
        onAction: async () => {
          const results = await Promise.all(failed.map((retry) => retry()));
          offerRetry(failed.filter((_, i) => !results[i]));
        },
      },
    });
  };

  const save = async () => {
    const draft: NewCustomerDraft = {
      id,
      name,
      phone,
      address,
      info,
      avatarEmoji: emoji,
      location,
      books: books.map((b) => ({
        copyId: b.copyId,
        agreedPrice: b.agreedPrice ?? b.price ?? 0,
        soldOn: b.soldOn,
      })),
      downPayment:
        down.amount && down.amount > 0
          ? { paymentId: downPaymentId, amount: down.amount, method: down.method, paidOn: down.paidOn }
          : null,
      plan: preview.items
        ? withPaymentIds(
            preview.items.map(({ dueDate, amount }) => ({ dueDate, amount })),
            newId,
          )
        : null,
    };
    const result = await saveNewCustomer(draft);
    if (!result.ok) {
      showError(result.error);
      // Que el resumen siga abierto: todo sigue en el teléfono para corregir o reintentar.
      throw new Error(result.error.code);
    }
    saved.current = true;
    if (location) await rememberLastChosenPoint({ lat: location.latitude, lng: location.longitude });
    toast.show({ message: copy.customers.create.saved, tone: 'success' });
    router.push(ROUTES.customer(id));
    offerRetry(await uploadPhotos(id));
  };

  const screen = (
    <NewCustomerScreen
      name={name}
      onNameChange={setName}
      nameError={undefined}
      avatarEmoji={emoji}
      onAvatarChange={setEmoji}
      avatarDisabledReason={null}
      invoices={invoices.map((invoice) => ({
        invoiceId: invoice.invoiceId,
        number: invoice.number,
        date: invoice.date,
        photos: invoice.photos.map(({ photoId, thumbUrl }) => ({ photoId, thumbUrl })),
      }))}
      onCreateInvoice={(file) =>
        setInvoices((current) => [
          ...current,
          { invoiceId: newId(), number: null, date: today, photos: [localPhoto(file)] },
        ])
      }
      onAddInvoicePhoto={(invoiceId, file) =>
        setInvoices((current) =>
          current.map((i) =>
            i.invoiceId === invoiceId ? { ...i, photos: [...i.photos, localPhoto(file)] } : i,
          ),
        )
      }
      onInvoiceChange={(invoiceId, patch) =>
        setInvoices((current) => current.map((i) => (i.invoiceId === invoiceId ? { ...i, ...patch } : i)))
      }
      invoiceDisabledReason={null}
      phone={phone}
      onPhoneChange={setPhone}
      address={address}
      onAddressChange={setAddress}
      info={info}
      onInfoChange={setInfo}
      location={location && { lat: location.latitude, lng: location.longitude }}
      mapsLink={mapsLinkFor({
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        mapsUrl: null,
        address,
      })}
      tiles={tiles}
      onChooseLocation={() => setChoosingLocation(true)}
      onRemoveLocation={() => setLocation(null)}
      photos={photos.map(({ photoId, thumbUrl }) => ({ photoId, thumbUrl }))}
      onAddPhoto={(file) => setPhotos((current) => [...current, localPhoto(file)])}
      photoDisabledReason={null}
      books={books.map((b) => {
        const agreed = b.agreedPrice ?? b.price ?? 0;
        return {
          copyId: b.copyId,
          titleName: b.titleName,
          titleImageUrl: b.imageUrl,
          number: b.number,
          agreedPrice: agreed,
          publicPriceSnapshot: b.price,
          priceDelta: b.price !== null && agreed !== b.price ? agreed - b.price : null,
          soldAt: middayBogota(b.soldOn),
        };
      })}
      copyHref={ROUTES.copy}
      onAddBook={() => setAddingBook(true)}
      onRemoveBook={(copyId) => setBooks((current) => current.filter((b) => b.copyId !== copyId))}
      debt={debt}
      downPayment={down}
      onDownPaymentChange={(patch) => setDown((current) => ({ ...current, ...patch }))}
      downPaymentDateError={downDateInFuture ? copy.customers.create.payments.dateInFuture : undefined}
      plan={{ ...plan, firstDueDate }}
      onPlanChange={(patch) => {
        setPlan((current) => ({ ...current, ...patch }));
        setOverrides({});
      }}
      onPlanDateChange={(index, date) => setOverrides((current) => ({ ...current, [index]: date }))}
      today={today}
      preview={preview}
      excess={null}
      banner={shell.offlineBanner}
      isOnline={shell.isOnline}
      created={hasName}
      onSave={save}
      discardOpen={leaveOpen}
      onDiscardOpenChange={setLeaveOpen}
      onDiscard={async () => {
        // No hay nada guardado que borrar: se sale y lo escrito se pierde (#57).
        saved.current = true;
        router.push(leaveTo);
      }}
      backHref={ROUTES.customers}
      onLeave={() => leave(ROUTES.customers)}
    />
  );
  const sheet = (
    <>
      {addingBook && (
        <DraftBooksContainer
          books={books}
          onChange={setBooks}
          today={today}
          onClose={() => setAddingBook(false)}
        />
      )}
      {choosingLocation && (
        <LocationPickerContainer
          saved={location}
          onConfirm={async (chosen) => {
            setLocation(chosen);
            return true;
          }}
          onClose={() => setChoosingLocation(false)}
        />
      )}
    </>
  );
  if (mobile)
    return (
      <>
        {screen}
        {sheet}
      </>
    );
  return (
    <ShellScreen nav={{ ...shell.nav, onNavigate: leave, onNewCustomer: undefined }}>
      {screen}
      {sheet}
    </ShellScreen>
  );
}

export default function NewCustomerPage() {
  return (
    <Suspense>
      <NewCustomerRoute />
    </Suspense>
  );
}
