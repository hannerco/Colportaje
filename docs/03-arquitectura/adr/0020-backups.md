# ADR-0020: Copias de seguridad
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Supabase en plan gratuito **no incluye backups**. Los datos son financieros y de clientes de ~10 personas.

## Decisión
Tarea programada en **GitHub Actions** que exporta la base (`supabase db dump`) y el bucket de fotos a un almacenamiento privado: **cada 2 días en las primeras semanas, luego semanal**; retención de 8 semanas; **guía de restauración probada**. Un segundo workflow **keep-alive cada 3 días** evita la pausa por inactividad del plan gratuito. Secretos solo en GitHub Secrets. Cuando la app maneje dinero real de varios usuarios, **pasar a Supabase Pro** (copias diarias, sin pausa).

## Alternativas descartadas
- *Confiar en el proveedor*: sin backups en gratis.
- *Plan de pago*: sin presupuesto.

## Consecuencias
Hay que verificar restauraciones periódicamente. Detalle en `05-operacion/DEPLOYMENT.md`.

## Referencias
RQ-QLT-04 · 03-arquitectura/SECURITY.md · DECISION-LOG Q49
