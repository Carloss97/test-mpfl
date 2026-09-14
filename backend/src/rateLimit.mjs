// G.3 (KRU-138): rate limiting per-IP en rutas sensibles (invitations/sessions).
//
// El plan original usaba AWS WAF con rate-based rule sobre API Gateway, pero
// en la API WAF 2026 la asociación WebACL→API Gateway se rechaza (ARN inválido
// en 6 formatos probados: sin stage, /staging, /staging/*, /$default, v1-style)
// → la implementación es en la Lambda: token por minuto vía writes
// condicionales en DynamoDB (tabla krumm-<env>-rate-limit, TTL 3 min).
//
// Límite: 10 req/min/IP por bucket de ruta (invitations | sessions). Sobra
// para uso normal (una carga de página = 1-3 llamadas) y frena brute force /
// enumeración masiva. Sin tabla (deps.rateLimitTable ausente) = no-op seguro.
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

export const RATE_LIMIT = 10;
export const RATE_WINDOW_S = 60;
const TTL_S = 180;

// Bucket de ruta: 'invitations' | 'sessions' | null (sin rate limit).
export function rateBucketForRoute(routeKey) {
  if (routeKey.includes('/invitations')) return 'invitations';
  if (routeKey.includes('/sessions')) return 'sessions';
  return null;
}

// IP cliente: payload 2.0 → requestContext.ip; payload 1.0 (rutas nativas HR)
// → requestContext.identity.ip.
export function clientIpFromEvent(event) {
  const rc = event?.requestContext;
  // 2.0: requestContext.ip · 1.0: requestContext.identity.ip o .sourceIp
  return rc?.ip || rc?.identity?.ip || rc?.identity?.sourceIp || null;
}

function isConditionalCheckFailed(err) {
  const n = String(err?.name || err?.code || '');
  return n.includes('ConditionalCheckFailed');
}

// devuelve {allowed: boolean, count?, limit, retryAfter?}
export async function checkRateLimit({ docClient, table, ip, bucket, now = Date.now }) {
  if (!docClient || !table || !ip || !bucket) return { allowed: true, limit: RATE_LIMIT };
  const ts = Math.floor(now() / 1000);
  const minute = Math.floor(ts / RATE_WINDOW_S);
  const key = `${bucket}:${minute}:${ip}`;
  const expireAt = ts + TTL_S;

  // 'key' y 'count' son keywords reservadas de DynamoDB en expresiones →
  // Escape con ExpressionAttributeNames. Ojo: DDB exige que TODOS los
  // nombres declarados se usen en las expresiones de ESA llamada (mapas
  // separados por operación).
  const keyEscape = { '#k': 'key' };
  const countEscape = { '#c': 'count' };

  // 1) 1ª petición del minuto: create condicional (count=1).
  try {
    await docClient.put({
      TableName: table,
      Item: { key, count: 1, expireAt },
      ConditionExpression: 'attribute_not_exists(#k)',
      ExpressionAttributeNames: keyEscape,
    });
    return { allowed: true, count: 1, limit: RATE_LIMIT };
  } catch (err) {
    if (!isConditionalCheckFailed(err)) throw err;
  }

  // 2) Peticiones siguientes: incremento condicional mientras count < límite.
  try {
    await docClient.update({
      TableName: table,
      Key: { key },
      UpdateExpression: 'SET #c = #c + :i',
      ConditionExpression: '#c < :limit',
      ExpressionAttributeNames: countEscape,
      ExpressionAttributeValues: { ':i': 1, ':limit': RATE_LIMIT },
    });
    return { allowed: true, count: RATE_LIMIT, limit: RATE_LIMIT };
  } catch (err) {
    if (isConditionalCheckFailed(err)) {
      return {
        allowed: false,
        limit: RATE_LIMIT,
        retryAfter: RATE_WINDOW_S - (ts % RATE_WINDOW_S),
      };
    }
    throw err;
  }
}

// Exportado para referencia (la actualización va por docClient.update).
export { UpdateCommand };
