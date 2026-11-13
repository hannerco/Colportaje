// Genera los íconos PROVISIONALES de la PWA (HU-BASE-06) en public/icons/.
// Se reemplazan cuando el diseño defina el ícono definitivo. Uso: node --import tsx scripts/generate-pwa-icons.ts
import { mkdir, writeFile } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';

const ACCENT = '#1F1E1D'; // ARCHITECTURE §4b (provisional)
const FOREGROUND = '#FFFFFF';

async function icon(file: string, size: number, safeZone: number) {
  const canvas = createCanvas(size, size);
  const g = canvas.getContext('2d');
  g.fillStyle = ACCENT;
  g.fillRect(0, 0, size, size);
  g.fillStyle = FOREGROUND;
  g.font = `bold ${Math.round(size * 0.55 * safeZone)}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('C', size / 2, size / 2 + size * 0.03);
  await writeFile(`public/icons/${file}`, canvas.toBuffer('image/png'));
}

await mkdir('public/icons', { recursive: true });
await icon('icon-192.png', 192, 1);
await icon('icon-512.png', 512, 1);
// Maskable: el contenido debe caber en el círculo central (80 %).
await icon('icon-maskable-512.png', 512, 0.8);
process.stdout.write('Íconos generados en public/icons/\n');
