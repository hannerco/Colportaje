import { describe, expect, it } from 'vitest';
import { INITIAL_SESSION_STATE, nextSessionState, toProfile, type SessionState } from './auth';

const signedIn: SessionState = { status: 'signed_in', userId: 'u1' };

describe('auth: estado de la sesión', () => {
  it('al abrir, sin sesión guardada queda signed_out y con sesión queda signed_in', () => {
    expect(nextSessionState(INITIAL_SESSION_STATE, { type: 'initial', userId: null })).toEqual({
      status: 'signed_out',
    });
    expect(nextSessionState(INITIAL_SESSION_STATE, { type: 'initial', userId: 'u1' })).toEqual(signedIn);
  });

  it('el estado inicial llega tarde: no pisa un evento que ya llegó', () => {
    expect(nextSessionState(signedIn, { type: 'initial', userId: null })).toBe(signedIn);
  });

  it('BR-USR-02: entrar deja signed_in con el usuario, también desde expired', () => {
    expect(nextSessionState({ status: 'signed_out' }, { type: 'signed_in', userId: 'u1' })).toEqual(signedIn);
    expect(nextSessionState({ status: 'expired' }, { type: 'signed_in', userId: 'u1' })).toEqual(signedIn);
  });

  it('cerrar sesión a propósito deja signed_out', () => {
    expect(nextSessionState(signedIn, { type: 'signed_out', requested: true })).toEqual({
      status: 'signed_out',
    });
  });

  it('AF-83 (CA-5): perder la sesión sin pedirlo deja expired', () => {
    expect(nextSessionState(signedIn, { type: 'signed_out', requested: false })).toEqual({
      status: 'expired',
    });
    expect(nextSessionState({ status: 'expired' }, { type: 'signed_out', requested: false })).toEqual({
      status: 'expired',
    });
  });

  it('un signed_out sin haber tenido sesión no es expired', () => {
    expect(nextSessionState(INITIAL_SESSION_STATE, { type: 'signed_out', requested: false })).toEqual({
      status: 'signed_out',
    });
  });
});

describe('auth: perfil', () => {
  const base = { id: 'u1', fullName: 'Hanner Conde', timeFormat: '12h' as const, isActive: true };

  it('isAdmin solo con el rol admin y el usuario activo', () => {
    expect(toProfile({ ...base, roles: ['colportor'] }).isAdmin).toBe(false);
    expect(toProfile({ ...base, roles: ['colportor', 'admin'] }).isAdmin).toBe(true);
    expect(toProfile({ ...base, isActive: false, roles: ['colportor', 'admin'] }).isAdmin).toBe(false);
  });

  it('conserva nombre, formato de hora y estado', () => {
    expect(toProfile({ ...base, roles: ['colportor'] })).toEqual({ ...base, isAdmin: false });
  });
});
