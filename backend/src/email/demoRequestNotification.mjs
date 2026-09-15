// demoRequestNotification.mjs — private, untracked SES notification for a saved demo request.
import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { DEFAULT_FROM } from './invitationEmail.mjs';

function text(request) {
  return [
    'New KRUMM demo request',
    '',
    `Name: ${request.name}`,
    `Work email: ${request.workEmail}`,
    `Company: ${request.company}`,
    `Role: ${request.role}`,
    `Team size: ${request.teamSize}`,
    `Use case: ${request.useCase}`,
    '',
    'Contact consent: confirmed',
  ].join('\n');
}

/** Recipient is supplied only through infrastructure/env; it is never embedded in code or frontend output. */
export async function sendDemoRequestNotification({ sesClient, to, from, request }) {
  if (!sesClient) throw Object.assign(new Error('ses_client_required'), { code: 'missing_client' });
  if (!to) throw Object.assign(new Error('recipient_required'), { code: 'missing_recipient' });
  const body = text(request);
  const out = await sesClient.send(new SendEmailCommand({
    FromEmailAddress: from || DEFAULT_FROM,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: 'New KRUMM demo request', Charset: 'UTF-8' },
        Body: { Text: { Data: body, Charset: 'UTF-8' } },
      },
    },
  }));
  return { messageId: out?.MessageId ?? null };
}
