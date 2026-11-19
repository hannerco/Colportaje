'use client';

import { copy } from '@/copy/es';
import { ShellRoute } from '@/features/shell';

// Armazón (HU-PAN-BASE-01) hasta que la HU de esta pantalla la reemplace.
export default function InventoryPage() {
  return <ShellRoute title={copy.ui.nav.items.inventory} />;
}
