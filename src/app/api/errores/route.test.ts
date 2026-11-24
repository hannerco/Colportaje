import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const post = (body: string) => POST(new Request('http://localhost/api/errores', { method: 'POST', body }));

describe('POST /api/errores (#104)', () => {
  it('escribe el error en el registro del servidor y responde 204', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await post(
      JSON.stringify({ ref: 'K7Q2', code: 'NETWORK_ERROR', where: '/dinero', online: false }),
    );
    expect(res.status).toBe(204);
    expect(log).toHaveBeenCalledWith('[client-error]', expect.stringContaining('"ref":"K7Q2"'));
    log.mockRestore();
  });

  it('rechaza lo que no es un reporte (texto raro o demasiado largo)', async () => {
    expect((await post('no es json')).status).toBe(400);
    expect((await post('x'.repeat(3000))).status).toBe(413);
  });
});
