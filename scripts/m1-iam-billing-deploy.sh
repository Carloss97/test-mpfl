#!/usr/bin/env bash
# KRUMM M1 (cierre) — Deploy IAM mínimo privilegio + presupuesto con alarmas Billing.
#
# Requisitos:
#   - `aws sso login --profile admin-carlos` ACTIVO (tokens frescos).
#   - `infra/m1-iam-billing-stack.yaml` validado con cfn-lint (0 errores).
#
# Qué hace (5 pasos, evidencia en stdout):
#   1. CFN stack `krumm-m1-iam-billing-staging` (idempotente): rol deploy scoped
#      + topic SNS + presupuesto mensual $25 con alarmas 80%/100% (ACTUAL).
#   2. Instance ARN de IAM Identity Center (`sso-admin list-instances`).
#   3. Permission set `krumm-staging-frontend-deploy` (crear si no existe) con
#      inline policy `sts:AssumeRole` al rol deploy (`put-inline-policy-to-
#      permission-set`, parámetro `--inline-policy`).
#   4. Account assignment usuario `admin-carlos` -> permission set -> cuenta
#      (`create-account-assignment`; `--principal-id` = USER ID, no ARN;
#      polling por `--account-assignment-creation-request-id` hasta SUCCEEDED;
#      idempotente: si ya existe, lo detecta y salta la creación).
#   5. Test end-to-end con perfil temporal `krumm-deploy` (config en mktemp;
#      NO modifica ~/.aws/config; reutiliza la sesión SSO logueada):
#      get-caller-identity (rol reservado AWSReservedSSO_*) -> `sts:AssumeRole`
#      al rol deploy (verifica trust condition + inline policy) -> controles
#      de scoping con credenciales scoped:
#        + s3api list-objects-v2 (bucket staging)     [debe pasar]
#        + cloudfront get-distribution --id           [debe pasar]
#        - s3api list-buckets                         [debe dar AccessDenied]
#   Extra: budgets describe-budget (perfil admin).
#
# Notas de API verificadas en vivo 2026-08-27 (CLI 2.36, cuenta 931932531447):
#   - `sso-admin list-permission-sets` devuelve lista de ARNs PLAIN (no objetos).
#   - `sso-admin create-permission-set` usa `--name` (no --permission-set-name).
#   - `identitystore list-users` reemplaza a `sso-admin list-users`.
#   - Respuestas SSO (get-role-credentials/list-accounts) en LOWERCASE
#     (roleCredentials/accessKeyId/secretAccessKey/sessionToken); STS/IAM/
#     Budgets en PascalCase.
#   - `create-account-assignment` responde `AccountAssignmentCreationStatus`
#     (AccountAssignmentArn + AccountAssignmentCreationRequestId).
#   - `describe-account-assignment-creation-status` exige
#     `--account-assignment-creation-request-id`; status: SUCCEEDED/FAILED.
#   - GetRoleCredentials manual rechaza el token de forma intermitente bajo
#     ráfaga de llamadas; por eso el e2e usa el perfil SSO de la CLI (cachea
#     las credenciales del rol reservado y no dispara ráfagas).
#   - El ARN del rol reservado NO lleva segmento de región en el path:
#     .../role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_<ps>_<hash>.
#   - `cloudfront get-distribution` usa `--id` en esta CLI.
#   - `get-role-credentials` puede rechazar el token de forma transitoria
#     bajo ráfaga de llamadas (retry 3x con 5s).
#
# Uso:
#   bash scripts/m1-iam-billing-deploy.sh
#   ALERT_EMAIL=otro@dominio.com bash scripts/m1-iam-billing-deploy.sh
set -euo pipefail

PROFILE="admin-carlos"
ACCOUNT_ID="931932531447"
DIRECTORY_ID="d-90667969cb"
SSO_START_URL="https://d-90667969cb.awsapps.com/start"
EMAIL="${ALERT_EMAIL:-carlos.saldivia@sansano.usm.cl}"
STACK="krumm-m1-iam-billing-staging"
PS_NAME="krumm-staging-frontend-deploy"
BUCKET="krumm-staging-frontend-931932531447"
DIST="EDQ39PDNI931R"
REGION="us-east-1"
BUDGET_NAME="krumm-staging-monthly-billing"

cd "$(dirname "$0")/.."

echo "==> 0/5 Verificar SSO activo"
aws sts get-caller-identity --profile "$PROFILE"

echo
echo "==> 1/5 CFN stack $STACK (rol deploy + topic + presupuesto + alarmas)"
if aws cloudformation describe-stacks --stack-name "$STACK" --profile "$PROFILE" >/dev/null 2>&1; then
  ST_STATUS="$(aws cloudformation describe-stacks --stack-name "$STACK" --profile "$PROFILE" --query 'Stacks[0].StackStatus' --output text)"
  case "$ST_STATUS" in
    CREATE_COMPLETE|UPDATE_COMPLETE) echo "STACK EXISTE ($ST_STATUS) — sin cambios" ;;
    *) echo "Stack en estado inesperado: $ST_STATUS — revisar antes de continuar"; exit 1 ;;
  esac
else
  aws cloudformation create-stack \
    --stack-name "$STACK" \
    --template-body file://infra/m1-iam-billing-stack.yaml \
    --parameters \
      ParameterKey=AlertEmail,ParameterValue="$EMAIL" \
    --capabilities CAPABILITY_NAMED_IAM CAPABILITY_IAM \
    --tags Key=phase,Value=M1 Key=environment,Value=staging \
    --profile "$PROFILE"
  aws cloudformation wait stack-create-complete --stack-name "$STACK" --profile "$PROFILE"
  echo "STACK CREATE_COMPLETE"
fi

get_out() {
  aws cloudformation describe-stacks --stack-name "$STACK" --profile "$PROFILE" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
ROLE_ARN="$(get_out FrontendDeployRoleArn)"
TOPIC_ARN="$(get_out BillingAlertsTopicArn)"
[ -n "$ROLE_ARN" ] && [ "$ROLE_ARN" != "None" ] || { echo "FALTA Output FrontendDeployRoleArn"; exit 1; }
echo "ROLE_ARN=$ROLE_ARN"
echo "TOPIC_ARN=$TOPIC_ARN"
echo "BUDGET=$BUDGET_NAME (limit \$25/mes; alarmas 80%/100% ACTUAL)"
echo "EMAIL_SNS=$EMAIL (requiere confirmar la suscripción por email al llegar)"

echo
echo "==> 2/5 Instance ARN Identity Center"
INSTANCE_ARN="$(aws sso-admin list-instances --profile "$PROFILE" --query 'Instances[0].InstanceArn' --output text)"
[ -n "$INSTANCE_ARN" ] && [ "$INSTANCE_ARN" != "None" ] || { echo "NO HAY INSTANCIA SSO"; exit 1; }
echo "INSTANCE_ARN=$INSTANCE_ARN"

# list-permission-sets devuelve ARNs plain (sin objetos) → resolver por nombre
resolve_ps_arn() {
  local arn name
  for arn in $(aws sso-admin list-permission-sets --instance-arn "$INSTANCE_ARN" --profile "$PROFILE" \
      --query 'PermissionSets[]' --output text 2>/dev/null); do
    name="$(aws sso-admin describe-permission-set --instance-arn "$INSTANCE_ARN" \
      --permission-set-arn "$arn" --profile "$PROFILE" \
      --query 'PermissionSet.Name' --output text 2>/dev/null || true)"
    if [ "$name" = "$PS_NAME" ]; then echo "$arn"; return 0; fi
  done
  return 1
}

echo
echo "==> 3/5 Permission set $PS_NAME (create si no existe + inline policy)"
if ! PS_ARN="$(resolve_ps_arn)"; then
  aws sso-admin create-permission-set --instance-arn "$INSTANCE_ARN" \
    --name "$PS_NAME" \
    --description "Least-privilege deploy: sts:AssumeRole $ROLE_ARN" \
    --profile "$PROFILE" >/dev/null
  echo "PERMISSION SET CREADO"
  PS_ARN="$(resolve_ps_arn)" || { echo "NO SE RESUELVE PS_ARN tras crear"; exit 1; }
fi
echo "PS_ARN=$PS_ARN"
POLICY_FILE="$(mktemp /tmp/krumm-ps-policy.XXXXXX.json)"
cat > "$POLICY_FILE" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AssumeDeployRole",
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "$ROLE_ARN"
    }
  ]
}
EOF
aws sso-admin put-inline-policy-to-permission-set --instance-arn "$INSTANCE_ARN" \
  --permission-set-arn "$PS_ARN" --inline-policy "$(cat "$POLICY_FILE")" --profile "$PROFILE"
echo "INLINE POLICY OK"

echo
echo "==> 4/5 Account assignment: usuario admin-carlos -> permission set (cuenta $ACCOUNT_ID)"
USER_ID="$(aws identitystore list-users --identity-store-id "$DIRECTORY_ID" --profile "$PROFILE" \
  --query "Users[?UserName=='admin-carlos'].UserId" --output text)"
[ -n "$USER_ID" ] && [ "$USER_ID" != "None" ] || { echo "USUARIO NO ENCONTRADO"; exit 1; }
echo "USER_ID=$USER_ID"
EXISTING="$(aws sso-admin list-account-assignments-for-principal --instance-arn "$INSTANCE_ARN" \
  --principal-id "$USER_ID" --principal-type USER --profile "$PROFILE" \
  --query "AccountAssignments[?PermissionSetArn=='${PS_ARN}'].PermissionSetArn" \
  --output text 2>/dev/null || true)"
if [ -n "$EXISTING" ]; then
  echo "ASIGNACION YA EXISTE — sin crear de nuevo (el test e2e la verifica)"
else
  CREATE_OUT="$(aws sso-admin create-account-assignment --instance-arn "$INSTANCE_ARN" \
    --permission-set-arn "$PS_ARN" \
    --principal-id "$USER_ID" --principal-type USER \
    --target-id "$ACCOUNT_ID" --target-type AWS_ACCOUNT \
    --profile "$PROFILE" --output json)"
  ASSIGN_REQ="$(echo "$CREATE_OUT" | python3 -c 'import json,sys; d=json.load(sys.stdin)["AccountAssignmentCreationStatus"]; print(d.get("AccountAssignmentCreationRequestId") or d.get("RequestId"))')"
  ASSIGN_ARN="$(echo "$CREATE_OUT" | python3 -c 'import json,sys; d=json.load(sys.stdin)["AccountAssignmentCreationStatus"]; print(d.get("AccountAssignmentArn") or d.get("Arn") or "")')"
  echo "ASSIGN_ARN=${ASSIGN_ARN:-<sin arn en response>} (request=$ASSIGN_REQ)"
  ST="INPROGRESS"
  for i in $(seq 1 30); do
    ST="$(aws sso-admin describe-account-assignment-creation-status --instance-arn "$INSTANCE_ARN" \
      --account-assignment-creation-request-id "$ASSIGN_REQ" --profile "$PROFILE" \
      --query 'AccountAssignmentCreationStatus.Status' --output text 2>/dev/null || true)"
    case "$ST" in
      SUCCEEDED) break ;;
      FAILED) echo "ASIGNACION FAILED"; exit 1 ;;
    esac
    sleep 4
  done
  [ "$ST" = "SUCCEEDED" ] || { echo "TIMEOUT asignacion (ultimo estado: $ST)"; exit 1; }
  echo "ASIGNACION SUCCEEDED (rol reservado AWSReservedSSO_${PS_NAME}_* creado)"
fi

echo
echo "==> 5/5 Test end-to-end: perfil krumm-deploy (config temporal, SSO compartido) -> assume deploy role"
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN AWS_PROFILE 2>/dev/null || true
export AWS_REGION="$REGION"
# Config temporal (NO modifica ~/.aws/config): perfil que apunta al permission set.
# La CLI reutiliza la sesión SSO ya logueada (cache compartido por startUrl) y
# cachea las credenciales del rol reservado → sin ráfagas de GetRoleCredentials.
TMP_CFG="$(mktemp -d /tmp/krumm-aws-cfg.XXXXXX)"
trap 'rm -rf "$TMP_CFG"' EXIT
cat > "$TMP_CFG/config" <<EOF
[profile krumm-deploy]
sso_session = Test-env
sso_account_id = $ACCOUNT_ID
sso_role_name = $PS_NAME
region = $REGION
output = json

[sso-session Test-env]
sso_start_url = $SSO_START_URL
sso_region = $REGION
sso_registration_scopes = sso:account:access
EOF
export AWS_CONFIG_FILE="$TMP_CFG/config"
echo "-- caller via krumm-deploy (rol reservado del permission set):"
aws sts get-caller-identity --profile krumm-deploy --query 'Arn' --output text
echo "-- assume deploy role (verifica trust condition + inline policy):"
CREDS="$(aws sts assume-role --role-arn "$ROLE_ARN" --role-session-name krumm-m1-verify --profile krumm-deploy --query 'Credentials' --output json)"
export AWS_ACCESS_KEY_ID="$(echo "$CREDS" | python3 -c 'import json,sys; print(json.load(sys.stdin)["AccessKeyId"])')"
export AWS_SECRET_ACCESS_KEY="$(echo "$CREDS" | python3 -c 'import json,sys; print(json.load(sys.stdin)["SecretAccessKey"])')"
export AWS_SESSION_TOKEN="$(echo "$CREDS" | python3 -c 'import json,sys; print(json.load(sys.stdin)["SessionToken"])')"
echo "ASSUME-ROLE DEPLOY OK (trust condition + inline policy verificados)"

echo "-- positivo: S3 ListObjects (scoped)"
aws s3api list-objects-v2 --bucket "$BUCKET" --max-items 3 --query 'Contents[].Key' --output json
echo "-- positivo: CloudFront GetDistribution"
aws cloudfront get-distribution --id "$DIST" --query 'Distribution.Status' --output text
echo "-- negativo (control): ListAllMyBuckets DEBE dar AccessDenied"
if aws s3api list-buckets 2>/tmp/krumm-neg.err; then
  echo "FALLO CONTROL NEGATIVO: list-buckets SÍ permitió (política no scoped?)"
  exit 1
else
  grep -q "AccessDenied" /tmp/krumm-neg.err && echo "DENY ESPERADO (AccessDenied) ✓"
fi

echo
echo "==> Verificación extra (perfil admin): presupuesto activo"
unset AWS_CONFIG_FILE  # volver a la config default para --profile $PROFILE
aws budgets describe-budget --account-id "$ACCOUNT_ID" --budget-name "$BUDGET_NAME" \
  --profile "$PROFILE" \
  --query 'Budget.{name:BudgetName,limit:BudgetLimit.Amount,unit:BudgetLimit.Unit,time:TimeUnit}' \
  --output json

echo
echo "OK: deploy M1 IAM+Billing completado. Evidencia arriba."
