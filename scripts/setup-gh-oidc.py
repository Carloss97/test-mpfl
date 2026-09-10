#!/usr/bin/env python3
"""GitHub Actions -> AWS OIDC federation for KRUMM frontend deploys (KRU-51).

Idempotente: crea el OIDC provider (si no existe), el rol y la policy mínima
(S3 deploy + CloudFront invalidation), y muestra el ARN del rol para el
workflow de CD.

Seguridad: el trust SOLO firma tokens con
  sub = repo:Carloss97/test-mpfl:ref:refs/heads/main
(repo público: nunca se permite pull_request en el rol de deploy).
"""

import base64
import hashlib
import json
import subprocess
import sys
import urllib.request

GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com"
GITHUB_OIDC_HOST = "token.actions.githubusercontent.com"  # AWS almacena la URL sin esquema
# El JWT de GitHub para STS tiene aud = sts.amazonaws.com; si el provider
# tiene ClientIDList, AWS valida la audiencia contra esa lista (sin sts
# aca → "web identity token could not be validated").
GITHUB_OIDC_CLIENT_ID = "sts.amazonaws.com"
ROLE_NAME = "krumm-gh-actions-deploy"
POLICY_NAME = "krumm-gh-actions-deploy-policy"
# SOLO main branch (repo público: nunca PRs). AWS normaliza listas de 1
# elemento a string al almacenar → usar string directo para comparar.
SUBJECT = "repo:Carloss97/test-mpfl:ref:refs/heads/main"

S3_ARN = "arn:aws:s3:::krumm-staging-frontend-931932531447"
CFN_ARN = "arn:aws:cloudfront::931932531447:distribution/EDQ39PDNI931R"

from cryptography.hazmat.primitives.asymmetric.ec import (
    EllipticCurvePublicKey,
    SECP256R1,
)
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    PublicFormat,
)


def b64u_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def aws(args: list) -> str:
    cmd = ["aws"] + args + ["--output", "json"]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"aws {' '.join(args[:4])}… failed: {result.stderr[:400]}")
    return result.stdout


def fetch_thumbprints() -> list:
    meta = json.load(
        urllib.request.urlopen(
            urllib.request.Request(
                GITHUB_OIDC_ISSUER + "/.well-known/openid-configuration",
                headers={"User-Agent": "krumm-oidc-setup"},
            ),
            timeout=30,
        )
    )
    jwks = json.load(
        urllib.request.urlopen(
            urllib.request.Request(meta["jwks_uri"], headers={"User-Agent": "krumm-oidc-setup"}),
            timeout=30,
        )
    )
    thumbprints = []
    for key in jwks["keys"]:
        kty = key.get("kty")
        if kty == "EC":
            x = b64u_decode(key["x"])
            y = b64u_decode(key["y"])
            pub = EllipticCurvePublicKey.from_encoded_point(
                SECP256R1(),
                0x04 + len(x) + len(y),
                x + y,
            )
        elif kty == "RSA":
            n = int.from_bytes(b64u_decode(key["n"]), "big")
            e = int.from_bytes(b64u_decode(key["e"]), "big")
            pub = RSAPublicNumbers(e, n).public_key()
        else:
            continue
        der = pub.public_bytes(Encoding.DER, PublicFormat.SubjectPublicKeyInfo)
        # AWS OIDC ThumbprintList = SHA-1 hexdigest del DER (40 chars).
        thumbprints.append(hashlib.sha1(der).hexdigest())
    if not thumbprints:
        raise RuntimeError("no EC/RSA keys in GitHub JWKS")
    return sorted(set(thumbprints))


def main() -> None:
    # 1. SSO vivo
    sts = json.loads(aws(["sts", "get-caller-identity"]))
    print("STS:", sts["Arn"].split("/")[-1])

    thumbprints = fetch_thumbprints()
    print("thumbprints:", thumbprints)

    # 2. OIDC provider (idempotente) — AWS almacena Url sin esquema.
    providers = json.loads(aws(["iam", "list-open-id-connect-providers"]))
    provider_arn = None
    for entry in providers.get("OpenIDConnectProviderList", []):
        arn = entry.get("Arn")
        if not arn:
            continue
        detail = json.loads(aws(["iam", "get-open-id-connect-provider", "--open-id-connect-provider-arn", arn]))
        stored_url = str(detail.get("Url", "")).split("//")[-1].rstrip("/")
        if stored_url == GITHUB_OIDC_HOST:
            provider_arn = arn
            existing = [t for t in detail.get("ThumbprintList", []) if t in thumbprints]
            if set(existing) != set(thumbprints):
                aws(["iam", "set-open-id-connect-provider-thumbprint",
                     "--open-id-connect-provider-arn", arn,
                     "--thumbprint-list", *thumbprints])
                print("provider: thumbprints actualizados")
            else:
                print("provider: thumbprints OK")
            client_ids = detail.get("ClientIDList", [])
            # add-client-id es idempotente; si el aud real (sts.amazonaws.com)
            # no está en la lista, AWS rechaza el JWT ("could not be validated").
            aws(["iam", "add-client-id-to-open-id-connect-provider",
                 "--open-id-connect-provider-arn", arn,
                 "--client-id", GITHUB_OIDC_CLIENT_ID])
            print(f"provider: client-id {GITHUB_OIDC_CLIENT_ID} asegurado")
            # Retirar el client-id erróneo original (el issuer no es una audiencia)
            stale_id = GITHUB_OIDC_HOST
            if stale_id in client_ids:
                aws(["iam", "remove-client-id-from-open-id-connect-provider",
                     "--open-id-connect-provider-arn", arn,
                     "--client-id", stale_id])
                print(f"provider: client-id stale {stale_id} removido")
            break
    if not provider_arn:
        out = aws(["iam", "create-open-id-connect-provider",
                   "--url", GITHUB_OIDC_ISSUER,
                   "--client-id-list", GITHUB_OIDC_CLIENT_ID,
                   "--thumbprint-list", *thumbprints])
        provider_arn = json.loads(out).get("OpenConnectProviderArn") \
            or f"arn:aws:iam::931932531447:oidc-provider/{GITHUB_OIDC_HOST}"
        print("provider CREADO:", provider_arn)

    # 3. Rol (idempotente)
    # Trust OIDC estándar (docs AWS/GitHub): condition con host sin esquema;
    # aud = sts.amazonaws.com; sub = SOLO main branch (repo público: sin PRs).
    trust = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Federated": provider_arn},
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    f"{GITHUB_OIDC_HOST}:aud": "sts.amazonaws.com",
                    f"{GITHUB_OIDC_HOST}:sub": SUBJECT,
                },
            },
        }],
    }
    roles = json.loads(aws(["iam", "list-roles", "--path", "/"]))
    role_arn = None
    for r in roles.get("Roles", []):
        if r["RoleName"] == ROLE_NAME:
            current = json.loads(aws(["iam", "get-role", "--role-name", ROLE_NAME]))["Role"]
            if current.get("AssumeRolePolicyDocument") != trust:
                aws(["iam", "update-assume-role-policy", "--role-name", ROLE_NAME,
                     "--policy-document", json.dumps(trust)])
                print("rol: trust actualizado (subjects/audience)")
            else:
                print("rol: existente, trust OK")
            role_arn = r["Arn"]
            break
    if not role_arn:
        out = aws(["iam", "create-role", "--role-name", ROLE_NAME,
                   "--assume-role-policy-document", json.dumps(trust),
                   "--description", "Deploy KRUMM frontend (S3 + CloudFront invalidation) from GitHub Actions; solo main branch, repo Carloss97/test-mpfl"])
        role_arn = json.loads(out)["Role"]["Arn"]
        print("rol CREADO:", role_arn)

    # 4. Policy (idempotente) — permisos mínimos exactos de scripts/deploy-frontend.sh:
    #    s3 sync --delete (ListBucket + Get/Put/DeleteObject) + cloudfront create-invalidation.
    policy_doc = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "FrontendS3Deploy",
                "Effect": "Allow",
                "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
                "Resource": [f"{S3_ARN}/*"],
            },
            {
                "Sid": "FrontendS3List",
                "Effect": "Allow",
                "Action": ["s3:ListBucket"],
                "Resource": [S3_ARN],
            },
            {
                "Sid": "CloudFrontInvalidation",
                "Effect": "Allow",
                "Action": ["cloudfront:CreateInvalidation", "cloudfront:GetDistribution"],
                "Resource": [CFN_ARN],
            },
        ],
    }
    existing_pol = None
    for p in json.loads(aws(["iam", "list-policies", "--scope", "Local"]))["Policies"]:
        if p["PolicyName"] == POLICY_NAME:
            existing_pol = p["Arn"]
            break
    if existing_pol:
        # Solo nueva version si el doc del default cambio (IAM limita a 5 versions)
        ver = json.loads(aws(["iam", "get-policy", "--policy-arn", existing_pol]))["Policy"]
        cur_doc = json.loads(aws(["iam", "get-policy-version", "--policy-arn", existing_pol,
                                  "--version-id", ver["DefaultVersionId"]]))["PolicyVersion"]["Document"]
        if cur_doc != policy_doc:
            aws(["iam", "create-policy-version", "--policy-arn", existing_pol,
                 "--policy-document", json.dumps(policy_doc), "--set-as-default"])
            print("policy: version actualizada (doc cambió)")
        else:
            print("policy: doc sin cambios")
    else:
        out = aws(["iam", "create-policy", "--policy-name", POLICY_NAME,
                   "--policy-document", json.dumps(policy_doc),
                   "--description", "KRUMM frontend deploy: S3 put + CloudFront invalidation (mínimo privilegio)"])
        existing_pol = json.loads(out)["Policy"]["Arn"]
        print("policy CREADA:", existing_pol)

    # 5. Attach (idempotente)
    attached = [a["PolicyArn"] for a in json.loads(aws(["iam", "list-attached-role-policies", "--role-name", ROLE_NAME]))["AttachedPolicies"]]
    if existing_pol not in attached:
        aws(["iam", "attach-role-policy", "--role-name", ROLE_NAME, "--policy-arn", existing_pol])
        print("policy: attached")
    else:
        print("policy: ya attached")

    print("\nRESULTADO:")
    print(f"OIDC_PROVIDER={provider_arn}")
    print(f"ROLE_ARN={role_arn}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001 - reportar y salir con error
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
