import { describe, expect, it } from 'vitest';
import {
  DUPLICATE_NAME_THRESHOLD,
  findPossibleDuplicates,
  isValidAvatarEmoji,
  isValidMapsUrl,
  nameSimilarity,
  normalizePhone,
  validateCustomerName,
  validateCustomerPatch,
  type DuplicateCandidate,
} from './customer-data';

describe('customer-data: avatar (BR-CUS-15, R2)', () => {
  it('CA-4: "🌻", "👍🏽" y "👨‍👩‍👧" son emojis válidos', () => {
    for (const emoji of ['🌻', '👍🏽', '👨‍👩‍👧']) expect(isValidAvatarEmoji(emoji)).toBe(true);
  });

  it('CA-4: "ab", "🌻🌻" y "🌻a" no lo son', () => {
    for (const text of ['ab', '🌻🌻', '🌻a']) expect(isValidAvatarEmoji(text)).toBe(false);
  });

  it('también banderas, teclas y emojis con selector de variación; no letras, dígitos ni vacío', () => {
    for (const emoji of ['🇨🇴', '1️⃣', '❤️', '🏳️‍🌈', '👩🏾‍💻']) expect(isValidAvatarEmoji(emoji)).toBe(true);
    for (const text of ['', 'a', '1', ' ', '🌻 ', 'é']) expect(isValidAvatarEmoji(text)).toBe(false);
  });
});

describe('customer-data: enlace de Maps (R3, SECURITY.md)', () => {
  it('CA-5: "https://maps.app.goo.gl/abc" se acepta; "https://evil.com/maps" no', () => {
    expect(isValidMapsUrl('https://maps.app.goo.gl/abc')).toBe(true);
    expect(isValidMapsUrl('https://evil.com/maps')).toBe(false);
  });

  it.each([
    'https://www.google.com/maps/place/Medell%C3%ADn',
    'https://google.com/maps?q=6.2,-75.5',
    'https://maps.google.com/?q=6.2,-75.5',
    'https://maps.app.goo.gl/AbC123',
  ])('acepta %s', (url) => expect(isValidMapsUrl(url)).toBe(true));

  it.each([
    ['http (sin TLS)', 'http://maps.app.goo.gl/abc'],
    ['google.com fuera de /maps', 'https://www.google.com/search?q=maps'],
    ['camino que solo empieza parecido', 'https://www.google.com/mapsxyz'],
    ['subdominio falso', 'https://maps.app.goo.gl.evil.com/abc'],
    ['usuario delante del host', 'https://maps.google.com@evil.com/'],
    ['puerto', 'https://maps.google.com:8443/'],
    ['javascript', 'javascript:alert(1)'],
    ['espacios', 'https://maps.app.goo.gl/a b'],
    ['texto', 'mi casa'],
    ['texto sin espacios (no es URL)', 'micasa'],
    ['otro dominio de Google', 'https://www.google.com.co/maps'],
  ])('rechaza %s', (_, url) => expect(isValidMapsUrl(url)).toBe(false));
});

describe('customer-data: teléfono (R5)', () => {
  it('solo dígitos e ignora el prefijo 57 de un número de 10 dígitos', () => {
    expect(normalizePhone('+57 312 555 1234')).toBe('3125551234');
    expect(normalizePhone('312-555-1234')).toBe('3125551234');
    expect(normalizePhone('573125551234')).toBe('3125551234');
    expect(normalizePhone('5712345')).toBe('5712345'); // fijo que empieza por 57: no se toca
    expect(normalizePhone(null)).toBe('');
    expect(normalizePhone(undefined)).toBe('');
  });
});

describe('customer-data: umbral de nombre parecido (BR-CUS-11, se fija aquí)', () => {
  it('el umbral vive en la configuración: 0,85', () => {
    expect(DUPLICATE_NAME_THRESHOLD).toBe(0.85);
  });

  it.each([
    ['maria gomez', 'María Gómez'],
    ['Natalia Cardenaz', 'Natalia Cárdenas'],
    ['Natalia Andrea Cardenas', 'Natalia Andrea Cárdenas'],
    ['Gómez María', 'María Gómez'],
    ['Jhon Jairo Ruiz', 'John Jairo Ruiz'],
    ['Luz Marina  Ospina', 'luz marina ospina'],
  ])('"%s" y "%s" se consideran el mismo nombre', (a, b) => {
    expect(nameSimilarity(a, b)).toBeGreaterThanOrEqual(DUPLICATE_NAME_THRESHOLD);
  });

  it.each([
    ['Pedro Pérez', 'Pablo Pérez'],
    ['Ana Gómez', 'Ana Gómez Restrepo'],
    ['Carlos Ruiz', 'Carla Ríos'],
    ['María Gómez', 'Mario López'],
    ['Juan', 'Juana Pérez'],
  ])('"%s" y "%s" no', (a, b) => {
    expect(nameSimilarity(a, b)).toBeLessThan(DUPLICATE_NAME_THRESHOLD);
  });

  it('nombres vacíos son idénticos entre sí (no se usa: un nombre vacío no busca)', () => {
    expect(nameSimilarity('', '  ')).toBe(1);
  });
});

describe('customer-data: posibles duplicados (R5, AF-70)', () => {
  const candidates: DuplicateCandidate[] = [
    { id: 'c1', name: 'María Gómez', phone: '3125551234', archived: false },
    { id: 'c2', name: 'Pedro Pérez', phone: null, archived: true },
    { id: 'c3', name: 'Maria  Gomes', phone: '3001112233', archived: false },
    { id: 'c4', name: 'Rosa Díaz', phone: '+57 312 555 1234', archived: true },
  ];

  it('CA-6: "maria gomez" encuentra a María Gómez por nombre (y al parecido)', () => {
    expect(findPossibleDuplicates(candidates, { name: 'maria gomez' })).toEqual([
      { id: 'c1', name: 'María Gómez', phone: '3125551234', archived: false, reason: 'name' },
      { id: 'c3', name: 'Maria  Gomes', phone: '3001112233', archived: false, reason: 'name' },
    ]);
  });

  it('CA-6: el teléfono "+57 312 555 1234" la encuentra por teléfono, incluidos los archivados', () => {
    expect(findPossibleDuplicates(candidates, { phone: '+57 312 555 1234' })).toEqual([
      { id: 'c1', name: 'María Gómez', phone: '3125551234', archived: false, reason: 'phone' },
      { id: 'c4', name: 'Rosa Díaz', phone: '+57 312 555 1234', archived: true, reason: 'phone' },
    ]);
  });

  it('teléfono primero y cada cliente una sola vez; excludeId deja fuera al propio cliente', () => {
    const result = findPossibleDuplicates(candidates, {
      name: 'María Gómez',
      phone: '3125551234',
      excludeId: 'c4',
    });
    expect(result.map((r) => [r.id, r.reason])).toEqual([
      ['c1', 'phone'],
      ['c3', 'name'],
    ]);
  });

  it('sin nombre ni teléfono no hay duplicados; un archivado parecido aparece marcado', () => {
    expect(findPossibleDuplicates(candidates, {})).toEqual([]);
    expect(findPossibleDuplicates(candidates, { name: '   ', phone: '  ' })).toEqual([]);
    expect(findPossibleDuplicates(candidates, { name: 'pedro perez' })).toEqual([
      { id: 'c2', name: 'Pedro Pérez', phone: null, archived: true, reason: 'name' },
    ]);
  });

  it('empate de nombre: por id', () => {
    const twins: DuplicateCandidate[] = [
      { id: 'b', name: 'Ana', phone: null, archived: false },
      { id: 'a', name: 'Ana', phone: null, archived: false },
    ];
    expect(findPossibleDuplicates(twins, { name: 'ana' }).map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('customer-data: crear y editar (R1–R3)', () => {
  it('CA-2: un nombre de solo espacios → VALIDATION en name; el nombre se guarda recortado', () => {
    expect(validateCustomerName('   ')).toEqual({
      ok: false,
      error: { code: 'VALIDATION', retryable: false, details: { field: 'name' } },
    });
    expect(validateCustomerName('  Natalia Andrea Cárdenas ')).toEqual({
      ok: true,
      value: 'Natalia Andrea Cárdenas',
    });
    expect(validateCustomerPatch({ name: ' ' })).toMatchObject({
      ok: false,
      error: { details: { field: 'name' } },
    });
  });

  it('CA-3: el teléfono queda tal cual; textos opcionales vacíos quedan en null', () => {
    expect(validateCustomerPatch({ phone: '312 448 0917', info: '  ', address: 'Calle 10 # 4-21' })).toEqual({
      ok: true,
      value: { phone: '312 448 0917', info: null, address: 'Calle 10 # 4-21' },
    });
    expect(validateCustomerPatch({ phone: null })).toEqual({ ok: true, value: { phone: null } });
  });

  it('emoji y enlace: válidos pasan, null o vacío los quitan, inválidos dan VALIDATION con su campo', () => {
    expect(validateCustomerPatch({ avatarEmoji: '🌻', mapsUrl: 'https://maps.app.goo.gl/abc' })).toEqual({
      ok: true,
      value: { avatarEmoji: '🌻', mapsUrl: 'https://maps.app.goo.gl/abc' },
    });
    expect(validateCustomerPatch({ avatarEmoji: null, mapsUrl: '' })).toEqual({
      ok: true,
      value: { avatarEmoji: null, mapsUrl: null },
    });
    expect(validateCustomerPatch({ avatarEmoji: '🌻a' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'avatarEmoji' } },
    });
    expect(validateCustomerPatch({ mapsUrl: 'https://evil.com/maps' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'mapsUrl' } },
    });
  });

  it('un parche vacío es válido y no cambia nada', () => {
    expect(validateCustomerPatch({})).toEqual({ ok: true, value: {} });
  });
});
