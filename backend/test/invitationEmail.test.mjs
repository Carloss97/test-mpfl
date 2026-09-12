import { describe, expect, it } from 'vitest';
import {
  buildInvitationLink,
  buildInvitationEmailContent,
  sendInvitationEmail,
  DEFAULT_FROM,
} from '../src/email/invitationEmail.mjs';

describe('invitationEmail (A.1 — email de invitación real)', () => {
  describe('buildInvitationLink', () => {
    it('construye link base + ?invite=token', () => {
      expect(buildInvitationLink({ appBaseUrl: 'https://krumm.cl', token: 'tok-1' }))
        .toBe('https://krumm.cl/postulaciones?invite=tok-1');
    });
    it('remueve slash final de la base', () => {
      expect(buildInvitationLink({ appBaseUrl: 'https://stage.krumm.cl/', token: 't' }))
        .toBe('https://stage.krumm.cl/postulaciones?invite=t');
    });
    it('codifica tokens con caracteres especiales', () => {
      const link = buildInvitationLink({ appBaseUrl: 'https://krumm.cl', token: 'a b&c=d' });
      expect(link).toBe('https://krumm.cl/postulaciones?invite=a%20b%26c%3Dd');
    });
    it('null si falta base o token', () => {
      expect(buildInvitationLink({ appBaseUrl: '', token: 't' })).toBeNull();
      expect(buildInvitationLink({ appBaseUrl: 'https://krumm.cl', token: '' })).toBeNull();
      expect(buildInvitationLink({ appBaseUrl: null, token: null })).toBeNull();
    });
  });

  describe('buildInvitationEmailContent (ES)', () => {
    const c = buildInvitationEmailContent({ language: 'es', expiresInHours: 72, link: 'https://krumm.cl/postulaciones?invite=tok' });
    it('sujeto menciona KRUMM y evaluación', () => {
      expect(c.subject).toContain('KRUMM');
      expect(c.subject.toLowerCase()).toContain('evaluaci');
    });
    it('texto plano incluye el link y la expiración en horas', () => {
      expect(c.text).toContain('https://krumm.cl/postulaciones?invite=tok');
      expect(c.text).toContain('72 horas');
    });
    it('HTML sin tracking pixel (0 <img>) y sin recursos externos ajenos a krumm.cl', () => {
      expect(c.html).not.toContain('<img');
      const urls = c.html.match(/https?:\/\/[^\s"']+/g) ?? [];
      for (const u of urls) {
        expect(u).toContain('krumm.cl');
      }
    });
    it('HTML incluye el botón con el link y la marca (paleta beige/marrón)', () => {
      expect(c.html).toContain('https://krumm.cl/postulaciones?invite=tok');
      expect(c.html).toContain('#d8b38c');
      expect(c.html).toContain('#3d2b20');
    });
    it('cuerpo genérico: sin dirección de email ni datos personales (solo el To lo lleva)', () => {
      expect(c.text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
      expect(c.html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    });
  });

  describe('buildInvitationEmailContent (EN)', () => {
    const c = buildInvitationEmailContent({ language: 'en', expiresInHours: 24, link: 'https://krumm.cl/postulaciones?invite=tok' });
    it('sujeto y expiración en inglés', () => {
      expect(c.subject.toLowerCase()).toContain('invitation');
      expect(c.text).toContain('24 hours');
      expect(c.text).toContain('single-use');
    });
  });

  describe('buildInvitationEmailContent sin link', () => {
    const c = buildInvitationEmailContent({ language: 'es', expiresInHours: 48, link: null });
    it('text/html válidos sin link (modo informativo)', () => {
      expect(c.text).toContain('48 horas');
      expect(c.html).not.toContain('/postulaciones?invite=');
    });
  });

  describe('sendInvitationEmail', () => {
    it('envía vía SESv2 con From/Destination/Body correctos y retorna messageId', async () => {
      let captured = null;
      const sesClient = { send: async (cmd) => { captured = cmd; return { MessageId: 'msg-123' }; } };
      const out = await sendInvitationEmail({
        sesClient,
        to: 'candidato@correo.cl',
        token: 'tok-1',
        appBaseUrl: 'https://krumm.cl',
        language: 'es',
        expiresInHours: 72,
      });
      expect(out).toMatchObject({ messageId: 'msg-123', language: 'es' });
      expect(captured.input.FromEmailAddress).toBe(DEFAULT_FROM);
      expect(captured.input.Destination.ToAddresses).toEqual(['candidato@correo.cl']);
      expect(captured.input.Content.Subject.Charset).toBe('UTF-8');
      expect(captured.input.Content.Body.Text.Charset).toBe('UTF-8');
      expect(captured.input.Content.Body.Html.Data).toContain('https://krumm.cl/postulaciones?invite=tok-1');
    });

    it('usa from inyectado si se proporciona', async () => {
      let captured = null;
      const sesClient = { send: async (cmd) => { captured = cmd; return {}; } };
      await sendInvitationEmail({
        sesClient, from: 'invite@krumm.cl', to: 'a@b.cl', token: 't',
        appBaseUrl: 'https://krumm.cl', language: 'es', expiresInHours: 72,
      });
      expect(captured.input.FromEmailAddress).toBe('invite@krumm.cl');
    });

    it('lanza no_link si no hay appBaseUrl', async () => {
      const sesClient = { send: async () => ({}) };
      await expect(sendInvitationEmail({ sesClient, to: 'a@b.cl', token: 't', appBaseUrl: null, language: 'es', expiresInHours: 72 }))
        .rejects.toMatchObject({ code: 'no_link' });
    });

    it('lanza missing_client / missing_recipient', async () => {
      await expect(sendInvitationEmail({ sesClient: null, to: 'a@b.cl', token: 't', appBaseUrl: 'https://krumm.cl', language: 'es', expiresInHours: 72 }))
        .rejects.toMatchObject({ code: 'missing_client' });
      await expect(sendInvitationEmail({ sesClient: {}, to: null, token: 't', appBaseUrl: 'https://krumm.cl', language: 'es', expiresInHours: 72 }))
        .rejects.toMatchObject({ code: 'missing_recipient' });
    });
  });
});
