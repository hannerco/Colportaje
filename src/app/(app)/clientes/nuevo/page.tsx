'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { copy } from '@/copy/es';
import { mapsLinkFor, type CustomerLocation } from '@/domain/customer-location';
import { suggestFirstDueDate, withPaymentIds } from '@/domain/payment-plan';
import { todayBogota, type LocalDate } from '@/domain/time';
import {
  NewCustomerScreen,
  mapTiles,
  planPreview,
  useAddCustomerInfoPhoto,
  useClearCustomerLocation,
  useCreateCustomer,
  useCustomerDetail,
  useDiscardNewCustomer,
  useDiscardSummary,
  useLiveWrite,
  useRemoveCopyDuringCreation,
  useRememberLastChosenPoint,
  useSetCustomerLocation,
  useUpdateCustomer,
  type DownPaymentValue,
  type PaymentPlanValue,
} from '@/features/customers';
import { DEFAULT_PAY_METHOD, useApplyPaymentPlan, useSetCreationDownPayment } from '@/features/payments';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, ShellScreen, useAppShell } from '@/features/shell';
import { systemClock } from '@/lib/clock';
import { newId } from '@/lib/ids';
import { useToast } from '@/ui/molecules/Toast';
import { usePlatform } from '@/ui/platform';
import { AddBookContainer } from '../add-book-container';
import { LocationPickerContainer } from '../location-picker-container';

/**
 * Contenedor de Nuevo cliente, ficha viva (HU-PAN-CLI-03, ADR-0038): el cliente se crea al escribir el nombre (o
 * llega con `?nombre=` desde «Crear «texto»») y cada dato se escribe solo un momento después. Salir por la navegación
 * pregunta lo mismo que «Descartar» (BR-CUS-14).
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
  const [created, setCreated] = useState(false);
  const creating = useRef(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [info, setInfo] = useState('');
  /** HU-PAN-CLI-06: la ubicación elegida; se escribe cuando el cliente existe, como los demás datos. */
  const [location, setLocation] = useState<CustomerLocation | null>(null);
  const [choosingLocation, setChoosingLocation] = useState(false);
  const [tiles] = useState(mapTiles);
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
  const [discardOpen, setDiscardOpen] = useState(false);
  /** Fechas del plan corregidas a mano (HU-PAN-CLI-05); se descartan si el plan se recalcula (I-08). */
  const [overrides, setOverrides] = useState<Record<number, LocalDate>>({});
  const [addingBook, setAddingBook] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string>(ROUTES.customers);

  const { createCustomer } = useCreateCustomer();
  const { updateCustomer } = useUpdateCustomer();
  const { setCreationDownPayment } = useSetCreationDownPayment();
  const { applyPaymentPlan } = useApplyPaymentPlan();
  const { discardNewCustomer } = useDiscardNewCustomer();
  const { removeCopyDuringCreation } = useRemoveCopyDuringCreation();
  const { setCustomerLocation } = useSetCustomerLocation();
  const { clearCustomerLocation } = useClearCustomerLocation();
  const { addCustomerInfoPhoto } = useAddCustomerInfoPhoto();
  const rememberLastChosenPoint = useRememberLastChosenPoint();
  const detail = useCustomerDetail(created ? id : null);
  const summary = useDiscardSummary(discardOpen && created ? id : null);

  const showError = (error: unknown, retry?: () => void) =>
    toast.show({
      message: appErrorMessage(error).message,
      tone: 'error',
      ...(retry ? { action: { label: copy.errors.retry, onAction: retry } } : {}),
    });

  // Ficha viva: el cliente existe desde que tiene nombre (HU-CLI-02). Mismo `id` si se reintenta (CA-1).
  const nameWrite = useLiveWrite(name, {
    enabled: created && name.trim() !== '',
    initial: name,
    write: async (value) => {
      const result = await updateCustomer({ id, patch: { name: value } });
      if (!result.ok) showError(result.error);
      return result.ok;
    },
  });
  const create = async (value: string) => {
    if (created || creating.current || !value.trim()) return;
    creating.current = true;
    const result = await createCustomer({ id, name: value });
    creating.current = false;
    if (!result.ok) return showError(result.error, () => void create(value));
    nameWrite.markWritten(value);
    setCreated(true);
  };
  // Llega con nombre desde «Crear «texto»» (HU-CLI-05): se crea de una vez.
  const prefilled = useRef(name);
  useEffect(() => {
    if (prefilled.current) void create(prefilled.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al llegar.
  }, []);

  const phoneWrite = useLiveWrite(phone, {
    enabled: created,
    initial: '',
    write: async (value) => {
      const result = await updateCustomer({ id, patch: { phone: value.trim() || null } });
      if (!result.ok) showError(result.error);
      return result.ok;
    },
  });

  const writeText = async (field: 'address' | 'info', value: string) => {
    const result = await updateCustomer({ id, patch: { [field]: value.trim() || null } });
    if (!result.ok) showError(result.error);
    return result.ok;
  };
  const addressWrite = useLiveWrite(address, {
    enabled: created,
    initial: '',
    write: (value) => writeText('address', value),
  });
  const infoWrite = useLiveWrite(info, {
    enabled: created,
    initial: '',
    write: (value) => writeText('info', value),
  });
  const locationWrite = useLiveWrite(location, {
    enabled: created,
    initial: null,
    write: async (value) => {
      const result = value
        ? await setCustomerLocation({ customerId: id, location: value })
        : await clearCustomerLocation(id);
      if (!result.ok) showError(result.error);
      return result.ok;
    },
  });

  const debt = detail.data?.account.debt ?? 0;
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

  // La cuota inicial y luego el plan, en ese orden: el plan reparte lo que queda después de la cuota (HU-ABO-03 R1).
  const money = { down, items: preview.items?.map(({ dueDate, amount }) => ({ dueDate, amount })) ?? null };
  const moneyWrite = useLiveWrite(money, {
    enabled: created && !downDateInFuture,
    initial: { down: { amount: null, method: DEFAULT_PAY_METHOD, paidOn: today }, items: null },
    write: async (value) => {
      const downResult = await setCreationDownPayment({
        paymentId: downPaymentId,
        customerId: id,
        amount: value.down.amount,
        method: value.down.method,
        paidOn: value.down.paidOn,
      });
      if (!downResult.ok) {
        showError(downResult.error);
        return false;
      }
      if (!value.items) return true;
      const planResult = await applyPaymentPlan({
        customerId: id,
        mode: 'replace_all',
        items: withPaymentIds(value.items, newId),
      });
      if (!planResult.ok) showError(planResult.error);
      return planResult.ok;
    },
  });

  // Cerrar la pestaña con un cliente a medias: el navegador pregunta (descartar exige conexión y confirmación).
  useEffect(() => {
    if (!created) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [created]);

  const leave = (href: string) => {
    if (!created) return router.push(href);
    setLeaveTo(href);
    setDiscardOpen(true);
  };

  const save = async () => {
    const results = await Promise.all([
      nameWrite.flush(),
      phoneWrite.flush(),
      addressWrite.flush(),
      infoWrite.flush(),
      locationWrite.flush(),
      moneyWrite.flush(),
    ]);
    if (results.every(Boolean)) {
      toast.show({ message: copy.customers.create.saved, tone: 'success' });
      router.push(ROUTES.customer(id));
    }
  };

  const screen = (
    <NewCustomerScreen
      name={name}
      onNameChange={(value) => {
        setName(value);
        void create(value);
      }}
      nameError={created && !name.trim() ? copy.customers.create.nameRequired : undefined}
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
      photos={detail.data?.infoPhotos ?? []}
      onAddPhoto={async (file) => {
        const result = await addCustomerInfoPhoto({ photoId: newId(), customerId: id, file });
        if (!result.ok) showError(result.error);
      }}
      photoDisabledReason={
        !created ? copy.customers.create.nameRequired : !shell.isOnline ? copy.ui.empty.needsConnection : null
      }
      books={detail.data?.books ?? []}
      copyHref={ROUTES.copy}
      onAddBook={created ? () => setAddingBook(true) : undefined}
      onRemoveBook={async (copyId) => {
        const result = await removeCopyDuringCreation(copyId);
        if (!result.ok) showError(result.error);
      }}
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
      excess={detail.data?.notices.excess?.amount ?? null}
      banner={shell.offlineBanner}
      isOnline={shell.isOnline}
      created={created}
      onSave={save}
      discardOpen={discardOpen}
      onDiscardOpenChange={setDiscardOpen}
      discardSummary={summary.data}
      onDiscard={async () => {
        const result = await discardNewCustomer(id);
        if (!result.ok) return showError(result.error);
        setCreated(false);
        router.push(leaveTo);
      }}
      backHref={ROUTES.customers}
      onLeave={() => router.push(ROUTES.customers)}
    />
  );
  const sheet = (
    <>
      {addingBook && created && (
        <AddBookContainer
          customerId={id}
          books={detail.data?.books ?? []}
          onClose={() => setAddingBook(false)}
        />
      )}
      {choosingLocation && (
        <LocationPickerContainer
          saved={location}
          onConfirm={async (chosen) => {
            // Sin cliente todavía, el punto se recuerda aquí; al guardarlo en el cliente lo recuerda la acción.
            if (!created) await rememberLastChosenPoint({ lat: chosen.latitude, lng: chosen.longitude });
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
