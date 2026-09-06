// index.mjs — Entrypoint Lambda para API Gateway HTTP (v2).
// Crea el DocumentClient real (fuera del handler, reutilizado entre invocations)
// y routea según path. En tests se inyecta docClient; en producción se usa el real.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { routeSessions } from './handlers/sessions.mjs';
import { routeInvitations } from './handlers/invitations.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
});

// Adaptador producción: la capa de repositorios (y sus mocks de test) usa la API
// de conveniencia put/get/scan/delete inyectable; el SDK v3 es command-based.
// El adaptador vive SOLO aquí: los tests inyectan su propio docClient.
const productionDocClient = Object.freeze({
  put: (input) => docClient.send(new PutCommand(input)),
  get: (input) => docClient.send(new GetCommand(input)),
  scan: (input) => docClient.send(new ScanCommand(input)),
  delete: (input) => docClient.send(new DeleteCommand(input)),
});

export async function handler(event, context = {}) {
  // Se permite inyectar un docClient vía context (tests / integración).
  const deps = { docClient: context.docClient ?? productionDocClient };
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