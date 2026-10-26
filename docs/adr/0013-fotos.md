# ADR-0013: Política de fotos
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Habrá fotos en la información del cliente, en la factura y en el recibo del Abibono (obligatorio). Supabase gratis ofrece 1 GB de archivos y 5 GB de tráfico de salida. El dueño estimó ~300 fotos al mes en total.

## Decisión
- **Compresión obligatoria en el cliente:** WebP, lado mayor ≤ 1280 px, ~150 KB, más **miniatura de ~15 KB** para las listas.
- Bucket **privado** `user-photos` con **URLs firmadas** de corta duración, ruta `{owner_id}/{kind}/{uuid}.webp`; portadas de Títulos en bucket público.
- Acceso mediante la interfaz **`StorageRepository`**. Al **70 %** de uso, alerta al admin y migración a **Cloudflare R2** (10 GB gratis, sin cobro por tráfico de salida).
- F1 requiere conexión para subir; en F2 habrá cola de subida.

## Cálculo (300 fotos/mes en total)
| Peso por foto | Por mes | Dura 1 GB |
|---|---|---|
| 3–5 MB (sin comprimir) | ~1 GB | ~1 mes |
| 250 KB | 75 MB | ~13 meses |
| 150 KB (WebP) | 45 MB | ~22 meses |

## Alternativas descartadas
- *Subir fotos originales*: agotaría el espacio en un mes.
- *Imágenes completas en listas*: gasta tráfico de salida.

## Consecuencias
La interfaz permite cambiar de proveedor sin tocar la UI. Si cada usuario sube 300 fotos, multiplicar por 10.

## Referencias
BR-PHO-01..04 · RQ-PHO-01/02 · DECISION-LOG Q7, Q8, Q18
