// index.mjs — Entrypoint Lambda para API Gateway HTTP (v2).
// Crea el DocumentClient real (fuera del handler, reutilizado entre invocations)
// y routea según path. En tests se inyecta docClient; en producción se usa el real.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { routeSessions } from './handlers/sessions.mjs';
import { routeInvitations } from './handlers/invitations.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
});

export async function handler(event, context = {}) {
  // Se permite inyectar un docClient vía context (tests / integración).
  const deps = { docClient: context.docClient ?? docClient };
  try {
    const routeKey = event?.routeKey ?? event?.resource ?? '';
    if (routeKey.includes('/invitations')) {
      return await routeInvitations(event, deps);
    }
    return await routeSessions(event, deps);
  } catch (err) {
    // Sin PII en el mensaje de error: logueamos el código, no el stack completo.
    const code = err?.code ?? err?.name ?? 'internal_error';
    console.error('handler_error', code); // no loguear payloads crudos
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'internal_error', code }),
    };
  }
}