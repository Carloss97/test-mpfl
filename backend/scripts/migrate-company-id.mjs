#!/usr/bin/env node
// G.5: asigna el tenant demo a registros legacy sin companyId.
// Por defecto es dry-run. Requiere --apply para escribir y nunca acepta payloads.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const region = process.env.AWS_REGION ?? 'us-east-1';
const environment = process.env.KRUMM_ENVIRONMENT ?? 'staging';
const companyId = process.env.KRUMM_DEMO_COMPANY_ID ?? 'krumm-demo';
const apply = process.argv.includes('--apply');
const tables = [
  process.env.SESSIONS_TABLE ?? `krumm-${environment}-sessions`,
  process.env.INVITATIONS_TABLE ?? `krumm-${environment}-invitations`,
];

if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,95}$/.test(companyId)) throw new Error('invalid_company_id');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});

async function scanAll(tableName) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const out = await docClient.send(new ScanCommand({
      TableName: tableName,
      ProjectionExpression: tableName.endsWith('sessions') ? 'sessionId, companyId' : 'invitationId, companyId',
      ExclusiveStartKey,
    }));
    items.push(...(out.Items ?? []));
    ExclusiveStartKey = out.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

for (const tableName of tables) {
  const items = await scanAll(tableName);
  const keyName = tableName.endsWith('sessions') ? 'sessionId' : 'invitationId';
  const legacy = items.filter((item) => !item.companyId);
  console.log(JSON.stringify({ tableName, total: items.length, legacyWithoutCompanyId: legacy.length, mode: apply ? 'apply' : 'dry-run' }));
  if (!apply) continue;
  for (const item of legacy) {
    await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { [keyName]: item[keyName] },
      UpdateExpression: 'SET companyId = :companyId',
      ExpressionAttributeValues: { ':companyId': companyId },
      ConditionExpression: 'attribute_not_exists(companyId)',
    }));
  }
}
