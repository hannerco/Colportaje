import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Repositories } from '@/repositories';
import { RepositoriesProvider, useRepositories } from './repositories-provider';

describe('RepositoriesProvider', () => {
  it('entrega a los hooks las implementaciones inyectadas', () => {
    const fake = { marker: 'fake' } as unknown as Repositories;
    let received: Repositories | undefined;
    function Probe() {
      received = useRepositories();
      return null;
    }
    renderToStaticMarkup(
      <RepositoriesProvider repositories={fake}>
        <Probe />
      </RepositoriesProvider>,
    );
    expect(received).toBe(fake);
  });

  it('falla si se usa fuera del proveedor', () => {
    function Probe() {
      useRepositories();
      return null;
    }
    expect(() => renderToStaticMarkup(<Probe />)).toThrow(/RepositoriesProvider/);
  });
});
