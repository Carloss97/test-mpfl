#!/usr/bin/env bash
# Pre-commit: secret scanning local (KRU-51) — gate rápido contra patrones
# sensibles en archivos staged. El scan completo (gitleaks, historia) corre
# en CI (.github/workflows/ci.yml).
#
# Instalación: cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
# Exclusiones: .gitleaks.toml (documenta el allowlist del leak histórico) y
# lockfiles (hashes, no secretos).
set -uo pipefail
status=0
patterns=(
  'AKIA[0-9A-Z]{16}'                        # AWS access key ID
  'gh[pousr]_[A-Za-z0-9]{36,}'              # GitHub tokens (PAT/OT/OAT/app/refresh)
  'secret_hx100_[A-Za-z0-9]{16,}'           # formato key Lambda (leak histórico f44a7e4)
  'BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY'
  'xox[baprs]-[A-Za-z0-9-]{10,}'            # Slack tokens
  'AIza[0-9A-Za-z_-]{35}'                    # Google API key
)
staged=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null)
[ -z "$staged" ] && exit 0
for f in $staged; do
  [ -f "$f" ] || continue
  case "$f" in
    .gitleaks.toml|package-lock.json|pnpm-lock.yaml|yarn.lock) continue ;;
  esac
  for p in "${patterns[@]}"; do
    if grep -qE "$p" "$f" 2>/dev/null; then
      echo "PRE-COMMIT: posible secret /$p/ en $f" >&2
      status=1
    fi
  done
done
if [ "$status" -ne 0 ]; then
  echo "Commit bloqueado: mueve el secreto a env/secret manager." >&2
  echo "Si es un leak documentado (ver .gitleaks.toml + SECURITY.md §Parches)," >&2
  echo "retira la cadena completa del archivo y commitea de nuevo." >&2
fi
exit $status
