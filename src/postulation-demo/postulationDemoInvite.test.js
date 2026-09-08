import { describe, expect, it, vi } from 'vitest';
import {
  parseInviteToken,
  hasInviteParam,
  validateInvitationToken,
  localValidateInvitationToken,
  runIdForInvitation,
  extractInviteToken,
  buildInvitationUrl,
  INVITATION_STATUS,
} from './postulationDemoInvite.js';

describe('postulationDemoInvite parseInviteToken', () => {
  it('extrae token válido del query', () => {
    expect(parseInviteToken('?invite=tok-valid-abc')).toBe('tok-valid-abc');
  });

  it('normaliza search sin signo de interrogación', () => {
    expect(parseInviteToken('invite=tok-valid-abc')).toBe('tok-valid-abc');
  });

  it('devuelve null si el token no pasa el regex (corto, inválido, espacios)', () => {
    expect(parseInviteToken('?invite=abc')).toBeNull();
    expect(parseInviteToken('?invite=café con espacios!')).toBeNull();
    expect(parseInviteToken('?invite=')).toBeNull();
    expect(parseInviteToken('?otro=param')).toBeNull();
  });

  it('mid-level token con caracteres válidos pasa', () => {
    expect(hasInviteParam('?invite=AbC-123_def')).toBe(true);
    expect(hasInviteParam('?invite=abc')).toBe(false);
  });
});

describe('localValidateInvitationToken (demo/sin backend, determinista)', () => {
  it('token válido -> valid con maskedEmail', () => {
    const result = localValidateInvitationToken('tok-valid-abcdef');
    expect(result.status).toBe(INVITATION_STATUS.VALID);
    expect(result.source).toBe('local');
  });

  it('tok-expired -> expired', () => {
    expect(localValidateInvitationToken('TOK-EXPIRED-1').status).toBe(INVITATION_STATUS.EXPIRED);
  });

  it('tok-used -> used', () => {
    expect(localValidateInvitationToken('tok-used-1').status).toBe(INVITATION_STATUS.USED);
  });

  it('tok-revoked -> revoked', () => {
    expect(localValidateInvitationToken('tok-revoked-1').status).toBe(INVITATION_STATUS.REVOKED);
  });

  it('tok-invalid -> invalid (guard bloquea token inválido)', () => {
    expect(localValidateInvitationToken('tok-invalid-1').status).toBe(INVITATION_STATUS.INVALID);
  });

  it('token mal formado -> invalid', () => {
    expect(localValidateInvitationToken('x').status).toBe(INVITATION_STATUS.INVALID);
  });
});

describe('validateInvitationToken (backend)', () => {
  it('sin endpoint usa validador local', async () => {
    const result = await validateInvitationToken({ token: 'tok-valid-abcdef' });
    expect(result.status).toBe(INVITATION_STATUS.VALID);
    expect(result.source).toBe('local');
  });

  it('200 -> valid con maskedEmail del backend', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ maskedEmail: 'c***@x.cl' }) });
    const result = await validateInvitationToken({ token: 'tok-valid-abcdef', fetchImpl, endpoint: 'https://api.krumm.cl' });
    expect(result.status).toBe(INVITATION_STATUS.VALID);
    expect(result.maskedEmail).toBe('c***@x.cl');
    expect(fetchImpl).toHaveBeenCalledWith('https://api.krumm.cl/invitations/tok-valid-abcdef', expect.any(Object));
  });

  it('410 invitation_revoked -> revoked', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 410, json: async () => ({ error: 'invitation_revoked' }) });
    const result = await validateInvitationToken({ token: 'tok-x-abcdef', fetchImpl, endpoint: 'https://api.krumm.cl' });
    expect(result.status).toBe(INVITATION_STATUS.REVOKED);
  });

  it('410 invitation_already_used -> used', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 410, json: async () => ({ error: 'invitation_already_used' }) });
    const result = await validateInvitationToken({ token: 'tok-x-abcdef', fetchImpl, endpoint: 'https://api.krumm.cl' });
    expect(result.status).toBe(INVITATION_STATUS.USED);
  });

  it('410 invitation_expired -> expired', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 410, json: async () => ({ error: 'invitation_expired' }) });
    const result = await validateInvitationToken({ token: 'tok-x-abcdef', fetchImpl, endpoint: 'https://api.krumm.cl' });
    expect(result.status).toBe(INVITATION_STATUS.EXPIRED);
  });

  it('404 -> invalid', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 404, json: async () => ({ error: 'invitation_not_found' }) });
    const result = await validateInvitationToken({ token: 'tok-x-abcdef', fetchImpl, endpoint: 'https://api.krumm.cl' });
    expect(result.status).toBe(INVITATION_STATUS.INVALID);
  });

  it('network error -> error (no crash)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('timeout'));
    const result = await validateInvitationToken({ token: 'tok-x-abcdef', fetchImpl, endpoint: 'https://api.krumm.cl' });
    expect(result.status).toBe(INVITATION_STATUS.ERROR);
  });
});

describe('runIdForInvitation', () => {
  it('deriva runId estable correlacionado con la invitación', () => {
    const a = runIdForInvitation('tok-valid-abc');
    expect(a).toMatch(/^krumm-inv-tok-valid-abc-/);
    expect(a.length).toBeGreaterThan('krumm-inv-tok-valid-abc-'.length);
  });

  it('fallback a postulation-demo si el token no es usale', () => {
    expect(runIdForInvitation('')).toMatch(/^postulation-demo-/);
  });
});

describe('extractInviteToken (t_482f57b2 V1: input pegado → token)', () => {
  it('acepta un token crudo válido (con ±whitespace)', () => {
    expect(extractInviteToken('tok-valid-abc123')).toBe('tok-valid-abc123');
    expect(extractInviteToken('  tok-valid-abc123  ')).toBe('tok-valid-abc123');
  });

  it('extrae el token de una URL completa (https)', () => {
    expect(extractInviteToken('https://krumm.cl/postulaciones?invite=tok-valid-abc123')).toBe('tok-valid-abc123');
    expect(extractInviteToken('https://staging.krumm.cl/postulaciones?battery=stable_dg&invite=tok-valid-abc123')).toBe('tok-valid-abc123');
  });

  it('extrae el token de una URL relativa', () => {
    expect(extractInviteToken('/postulaciones?invite=tok-valid-abc123')).toBe('tok-valid-abc123');
  });

  it('ignora el fragment de la URL', () => {
    expect(extractInviteToken('https://krumm.cl/postulaciones?invite=tok-valid-abc123#sesion')).toBe('tok-valid-abc123');
  });

  it('URL sin param invite → null', () => {
    expect(extractInviteToken('https://krumm.cl/postulaciones?battery=stable_dg')).toBeNull();
    expect(extractInviteToken('https://krumm.cl/postulaciones')).toBeNull();
  });

  it('URL con invite mal formado → null (no lo trata como token crudo)', () => {
    expect(extractInviteToken('https://krumm.cl/postulaciones?invite=abc')).toBeNull();
    expect(extractInviteToken('https://krumm.cl/postulaciones?invite=')).toBeNull();
  });

  it('texto basura → null', () => {
    expect(extractInviteToken('hola mundo')).toBeNull();
    expect(extractInviteToken('https://krumm.cl/ayuda')).toBeNull();
    expect(extractInviteToken('')).toBeNull();
    expect(extractInviteToken(null)).toBeNull();
    expect(extractInviteToken(undefined)).toBeNull();
  });

  it('token crudo corto/inválido → null (regex)', () => {
    expect(extractInviteToken('abc')).toBeNull();
    expect(extractInviteToken('tok valid!')).toBeNull();
  });
});

describe('buildInvitationUrl (t_482f57b2 V1)', () => {
  it('compone /postulaciones?invite=<token>', () => {
    expect(buildInvitationUrl('tok-valid-abc123')).toBe('/postulaciones?invite=tok-valid-abc123');
  });

  it('codifica el token (aunque el regex actual no lo permita, el encode es defensivo)', () => {
    expect(buildInvitationUrl('AbC-123_def')).toBe('/postulaciones?invite=AbC-123_def');
  });
});