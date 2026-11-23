'use client';

import { useRouter } from 'next/navigation';
import { copy } from '@/copy/es';
import { NAV_HREFS, ROUTES } from '@/features/shell';
import { Tabs } from '@/ui/molecules/Tabs';

/** Las partes de Admin (ronda 34): Catálogo y Usuarios, como las secciones de Inventario. */
export function AdminSections({ active }: { active: 'catalog' | 'users' }) {
  const router = useRouter();
  const t = copy.admin.sections;
  return (
    <Tabs
      variant="segmented"
      width="auto"
      aria-label={t.label}
      value={active}
      onValueChange={(next) => router.push(next === 'users' ? ROUTES.adminUsers : NAV_HREFS.admin)}
      items={[
        { id: 'catalog', label: t.catalog },
        { id: 'users', label: t.users },
      ]}
    />
  );
}
