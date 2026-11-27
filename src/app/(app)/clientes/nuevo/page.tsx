'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { copy } from '@/copy/es';
import { mapsLinkFor, type CustomerLocation } from '@/domain/customer-location';
import type { NewCustomerDraft } from '@/domain/new-customer';
import { isSavable, proposedAmount, sortByDueDate, type ScheduleDraftRow } from '@/domain/manual-schedule';
import { todayBogota, type LocalDate } from '@/domain/time';
import {
  NewCustomerScreen,
  mapTiles,
  useQueueNewCustomerPhotos,
  useRememberLastChosenPoint,
  useSaveNewCustomer,
  type DownPaymentValue,
} from '@/features/customers';
import { DEFAULT_PAY_METHOD } from '@/features/payments';
import { errorToast } from '@/features/shared/error-report';
import { ROUTES, ShellScreen, useAppShell } from '@/features/shell';
import { systemClock } from '@/lib/clock';
import { newId } from '@/lib/ids';
import { useToast } from '@/ui/molecules/Toast';
import { usePlatform } from '@/ui/platform';
import { LocationPickerContainer } from '../location-picker-container';
import { DraftBooksContainer, type DraftBook } from './draft-books';
import {
  removeInvoicePhoto,
  removePhoto,
  replaceInvoicePhoto,
  replacePhoto,
  type LocalInvoice,
  type LocalPhoto,
} from './local-photos';

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
 * «Guardar cliente» guarda cliente, libros, cuota y plan en una sola transacción y pone las fotos en la bandeja
 * (ADR-0054): quedan guardadas en el teléfono y se suben solas, aunque se cierre la app o no haya señal. La ficha
 * muestra lo que falta. Salir con algo escrito pregunta antes.
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
  /** Abonos a mano (ronda 38, ADR-0052): fecha y valor libres; se guardan solo los que tienen ambos. */
  const [schedule, setSchedule] = useState<readonly ScheduleDraftRow[]>([]);
  const [focusPaymentId, setFocusPaymentId] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string>(ROUTES.customers);
  const saved = useRef(false);

  const { saveNewCustomer } = useSaveNewCustomer();
  const queuePhotos = useQueueNewCustomerPhotos();
  const rememberLastChosenPoint = useRememberLastChosenPoint();

  const showError = (error: unknown) => toast.show(errorToast(error));

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
    schedule.length > 0;

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
  const pending = Math.max(0, debt - (down.amount ?? 0));
  const scheduledTotal = schedule.reduce((sum, row) => sum + row.amount, 0);
  const updatePayment = (id: string, patch: Partial<ScheduleDraftRow>) =>
    setSchedule((current) =>
      sortByDueDate(current.map((row) => (row.id === id ? { ...row, ...patch } : row))),
    );
  const downDateInFuture = down.paidOn > today;

  /** Las fotos del cliente ya guardado van a la bandeja, que las sube sola (ADR-0054). */
  const queueAllPhotos = async () => {
    const count = photos.length + invoices.reduce((sum, invoice) => sum + invoice.photos.length, 0);
    if (count === 0) return;
    try {
      await queuePhotos({
        customerId: id,
        photos: {
          infoPhotos: photos.map(({ photoId, file }) => ({ photoId, file })),
          invoices: invoices.map((invoice) => ({
            invoiceId: invoice.invoiceId,
            number: invoice.number,
            date: invoice.date,
            photos: invoice.photos.map(({ photoId, file }) => ({ photoId, file })),
          })),
        },
      });
    } catch {
      // Solo pasa si se cerró la sesión justo al guardar: el cliente quedó guardado, las fotos no.
      toast.show({ message: copy.customers.create.photosFailed(count), tone: 'error' });
    }
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
      // Ronda 38: los abonos sin fecha o en $0 no se guardan (la fila ya lo avisa).
      plan: schedule
        .filter(isSavable)
        .map((row) => ({ paymentId: row.id, dueDate: row.dueDate!, amount: row.amount })),
    };
    const result = await saveNewCustomer(draft);
    if (!result.ok) {
      showError(result.error);
      // Que el resumen siga abierto: todo sigue en el teléfono para corregir o reintentar.
      throw new Error(result.error.code);
    }
    saved.current = true;
    if (location) await rememberLastChosenPoint({ lat: location.latitude, lng: location.longitude });
    await queueAllPhotos();
    toast.show({ message: copy.customers.create.saved, tone: 'success' });
    router.push(ROUTES.customer(id));
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
      onReplaceInvoicePhoto={(invoiceId, photoId, file) =>
        setInvoices((current) => replaceInvoicePhoto(current, invoiceId, photoId, localPhoto(file)))
      }
      onRemoveInvoicePhoto={(photoId) => setInvoices((current) => removeInvoicePhoto(current, photoId))}
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
      onReplacePhoto={(photoId, file) =>
        setPhotos((current) => replacePhoto(current, photoId, localPhoto(file)))
      }
      onRemovePhoto={(photoId) => setPhotos((current) => removePhoto(current, photoId))}
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
      schedule={schedule}
      focusPaymentId={focusPaymentId}
      onAddPayment={() => {
        const id = newId();
        setSchedule((current) => [
          ...current,
          { id, dueDate: null, amount: proposedAmount(pending, scheduledTotal) },
        ]);
        setFocusPaymentId(id);
      }}
      onPaymentDateChange={(id, dueDate) => updatePayment(id, { dueDate })}
      onPaymentAmountChange={(id, amount) => updatePayment(id, { amount })}
      onRemovePayment={(id) => setSchedule((current) => current.filter((row) => row.id !== id))}
      today={today}
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
