// #104: errores del navegador. Se escriben en los registros del servidor (Vercel › Logs), buscables por «client-error»,
// su código o su referencia. Solo el código, dónde pasó y cuándo: nunca datos de clientes.
const MAX_BYTES = 2048;

export async function POST(request: Request): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_BYTES) return new Response(null, { status: 413 });
  let report: Record<string, unknown>;
  try {
    report = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }
  const pick = (key: string) =>
    typeof report[key] === 'string' ? (report[key] as string).slice(0, 300) : undefined;
  // Este registro ES el propósito de la ruta: va a los registros de Vercel (Logs).
  // eslint-disable-next-line no-console
  console.error(
    '[client-error]',
    JSON.stringify({
      ref: pick('ref'),
      code: pick('code'),
      where: pick('where'),
      message: pick('message'),
      online: report.online === true,
      at: pick('at'),
      agent: request.headers.get('user-agent')?.slice(0, 160),
    }),
  );
  return new Response(null, { status: 204 });
}
