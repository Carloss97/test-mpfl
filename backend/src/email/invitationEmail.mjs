// invitationEmail.mjs — Email de invitación bilingüe ES/EN (FASE A.1, KRU-112).
//
// Privacidad no negociable:
// - Sin tracking pixel, sin shorteners, sin recursos externos (CSS inline, 0 imgs).
// - Copy genérico: la única PII es el destinatario (To) y el token en el link.
// - El link es el mecanismo de acceso (token single-use); se muestra la expiración.
// - `sendInvitationEmail` NUNCA crea el cliente SES: lo inyecta index.mjs (patrón
//   del repo: los módulos de negocio no instancian clientes reales).

import { SendEmailCommand } from '@aws-sdk/client-sesv2';

export const DEFAULT_FROM = 'no-reply@krumm.cl';
export const PRIVACY_URL = 'https://krumm.cl/privacidad';
export const TERMS_URL = 'https://krumm.cl/terminos';

/** Link de acceso del candidato: base + ?invite=<token> (único, single-use). */
export function buildInvitationLink({ appBaseUrl, token }) {
  const base = String(appBaseUrl ?? '').trim().replace(/\/+$/, '');
  if (!base || !token) return null;
  return `${base}/postulaciones?invite=${encodeURIComponent(String(token))}`;
}

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Contenido del email. `language`: 'es' | 'en'. `expiresInHours`: TTL de la
 * invitación. `link`: URL de acceso (si es null, el email solo informa).
 */
export function buildInvitationEmailContent({ language = 'es', expiresInHours = 72, link = null }) {
  const es = language !== 'en';
  const hours = Math.max(1, Math.round(Number(expiresInHours) || 72));
  const hourLabel = es
    ? (hours === 1 ? '1 hora' : `${hours} horas`)
    : (hours === 1 ? '1 hour' : `${hours} hours`);

  const subject = es
    ? 'Tu invitación a la evaluación de talento KRUMM'
    : 'Your invitation to the KRUMM talent assessment';

  const text = es
    ? [
        'Hola:',
        '',
        'Te invitamos a realizar una evaluación de talento con KRUMM, una experiencia interactiva de 15 a 25 minutos que nos ayuda a conocer cómo resuelves tareas concretas.',
        ...(link ? ['', 'Para comenzar, usa este enlace (es personal y de uso único):', '', link, ''] : []),
        `El enlace expira en ${hourLabel}. Si no lo recibiste o no funciona, respóndenos a este correo.`,
        '',
        'Qué debes saber:',
        '• La evaluación se realiza en el navegador, con ejercicios interactivos (sin preguntas de personalidad).',
        '• Algunos ejercicios piden acceso a la cámara solo para verificar tu presencia y condiciones; no se guarda video.',
        '• Puedes salir en cualquier momento; si no completas la evaluación, la señal ausente no se interpreta como desempeño bajo.',
        `• Tu información se trata según nuestra Política de Privacidad: ${PRIVACY_URL}`,
        `• Términos de servicio: ${TERMS_URL}`,
        '',
        'Si no esperabas esta invitación, puedes ignorar este correo.',
        '',
        'Equipo KRUMM',
        'KRUMM SpA — Santiago, Chile',
      ].join('\n')
    : [
        'Hello:',
        '',
        'You are invited to take a talent assessment with KRUMM — an interactive 15–25 minute experience that helps us understand how you approach concrete tasks.',
        ...(link ? ['', 'To get started, use this link (it is personal and single-use):', '', link, ''] : []),
        `The link expires in ${hourLabel}. If you did not receive it or it does not work, reply to this email.`,
        '',
        'What you should know:',
        '• The assessment runs in your browser, with interactive exercises (no personality questionnaires).',
        '• Some exercises ask for camera access only to verify your presence and conditions; no video is stored.',
        '• You can leave at any time; if you do not complete the assessment, a missing signal is not interpreted as low performance.',
        `• Your information is handled according to our Privacy Policy: ${PRIVACY_URL}`,
        `• Terms of service: ${TERMS_URL}`,
        '',
        'If you did not expect this invitation, you can ignore this email.',
        '',
        'KRUMM Team',
        'KRUMM SpA — Santiago, Chile',
      ].join('\n');

  const linkHtml = link
    ? `<tr><td style="padding:24px 0;">
        <a href="${esc(link)}" style="display:inline-block;background:#d8b38c;color:#38271d;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:8px;">${es ? 'Comenzar evaluación' : 'Start assessment'}</a>
      </td></tr>
      <tr><td style="padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b5d52;word-break:break-all;">${esc(link)}</td></tr>`
    : '';

  const bullets = es
    ? `<li>La evaluación se realiza en el navegador, con ejercicios interactivos (sin preguntas de personalidad).</li>
<li>Algunos ejercicios piden acceso a la cámara solo para verificar tu presencia y condiciones; no se guarda video.</li>
<li>Puedes salir en cualquier momento; la señal ausente no se interpreta como desempeño bajo.</li>
<li>Tu información se trata según nuestra <a href="${PRIVACY_URL}" style="color:#7a5c3e;">Política de Privacidad</a>. <a href="${TERMS_URL}" style="color:#7a5c3e;">Términos de servicio</a>.</li>`
    : `<li>The assessment runs in your browser, with interactive exercises (no personality questionnaires).</li>
<li>Some exercises ask for camera access only to verify your presence and conditions; no video is stored.</li>
<li>You can leave at any time; a missing signal is not interpreted as low performance.</li>
<li>Your information is handled according to our <a href="${PRIVACY_URL}" style="color:#7a5c3e;">Privacy Policy</a>. <a href="${TERMS_URL}" style="color:#7a5c3e;">Terms of service</a>.</li>`;

  const html = `<!DOCTYPE html>
<html lang="${es ? 'es' : 'en'}">
<body style="margin:0;padding:0;background:#f2e8dc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2e8dc;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#f7efe6;border-radius:12px;padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#3d2b20;">
        <tr><td style="font-size:20px;font-weight:bold;padding-bottom:8px;">KRUMM</td></tr>
        <tr><td style="font-size:15px;line-height:24px;padding-bottom:16px;">${es ? 'Te invitamos a una evaluación de talento interactiva de 15 a 25 minutos.' : 'You are invited to an interactive 15–25 minute talent assessment.'}</td></tr>
        ${linkHtml}
        <tr><td style="font-size:13px;color:#6b5d52;padding-bottom:16px;">${es ? `El enlace es personal, de uso único y expira en ${hourLabel}.` : `The link is personal, single-use, and expires in ${hourLabel}.`}</td></tr>
        <tr><td style="font-size:13px;line-height:20px;padding-bottom:20px;">
          ${es ? 'Qué debes saber:' : 'What you should know:'}
          <ul style="margin:8px 0 0 18px;padding:0;font-size:13px;line-height:20px;">${bullets}</ul>
        </td></tr>
        <tr><td style="font-size:13px;line-height:20px;padding-bottom:20px;">${es ? 'Si no esperabas esta invitación, puedes ignorar este correo.' : 'If you did not expect this invitation, you can ignore this email.'}</td></tr>
        <tr><td style="font-size:11px;color:#8a7a6d;border-top:1px solid #e4cdb5;padding-top:16px;">KRUMM SpA — Santiago, Chile · ${es ? 'Política de Privacidad' : 'Privacy Policy'}: ${PRIVACY_URL}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Envía el email de invitación vía SESv2. `sesClient` inyectado (index.mjs).
 * Lanza con `code` descriptivo si faltan deps o el link no se puede construir.
 */
export async function sendInvitationEmail({ sesClient, from, to, token, appBaseUrl, language, expiresInHours }) {
  if (!sesClient) throw Object.assign(new Error('ses_client_required'), { code: 'missing_client' });
  if (!to) throw Object.assign(new Error('recipient_required'), { code: 'missing_recipient' });
  const link = buildInvitationLink({ appBaseUrl, token });
  if (!link) throw Object.assign(new Error('app_base_url_required'), { code: 'no_link' });

  const content = buildInvitationEmailContent({ language, expiresInHours, link });
  const command = new SendEmailCommand({
    FromEmailAddress: from || DEFAULT_FROM,
    Destination: { ToAddresses: [to] },
    Content: {
      Subject: { Data: content.subject, Charset: 'UTF-8' },
      Body: {
        Text: { Data: content.text, Charset: 'UTF-8' },
        Html: { Data: content.html, Charset: 'UTF-8' },
      },
    },
  });
  const out = await sesClient.send(command);
  return { messageId: out?.MessageId ?? null, language };
}
