# ADR-0020: Copias de seguridad
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Supabase en plan gratuito **no incluye backups**. Los datos son financieros y de clientes de ~10 personas.

## Decisión
Tarea programada semanal en **GitHub Actions** que exporta la base (`pg_dump` vía Supabase CLI) y el contenido del bucket de fotos a un almacenamiento privado, con retención definida, más una **guía de restauración** probada. Secretos solo en GitHub Secrets.

## Alternativas descartadas
- *Confiar en el proveedor*: sin backups en gratis.
- *Plan de pago*: sin presupuesto.

## Consecuencias
Hay que verificar restauraciones periódicamente. Detalle en `DEPLOYMENT.md`.

## Referencias
RQ-QLT-04 · SECURITY.md · DECISION-LOG Q49
