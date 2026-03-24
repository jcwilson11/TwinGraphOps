#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DEPLOY_ENV_DIR="${DEPLOY_ENV_DIR:-$ROOT_DIR/runtime/deploy}"
BOOTSTRAP_SCRIPT="$ROOT_DIR/infra/scripts/bootstrap-cloud-env-from-aws.sh"
COMPOSE_FILE="$ROOT_DIR/docker-compose.cloud.yml"

AWS_SECRET_ID="${AWS_SECRETS_MANAGER_SECRET_ID:-${1:-}}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"
API_IMAGE="${API_IMAGE:-}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-}"
PUBLIC_API_BASE_URL="${PUBLIC_API_BASE_URL:-http://api:8000}"
TWIN_ENV="${TWIN_ENV:-production}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-twingraphops}"

if [[ -z "$AWS_SECRET_ID" ]]; then
  echo "Provide AWS_SECRETS_MANAGER_SECRET_ID or pass the secret id as the first argument." >&2
  exit 1
fi

if [[ -z "$API_IMAGE" || -z "$FRONTEND_IMAGE" ]]; then
  echo "Set both API_IMAGE and FRONTEND_IMAGE before running this script." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required on the EC2 host." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required on the EC2 host." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required on the EC2 host." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required on the EC2 host." >&2
  exit 1
fi

mkdir -p "$DEPLOY_ENV_DIR"
ENV_FILE="$DEPLOY_ENV_DIR/cloud.env"
TMP_EXPORTS="$(mktemp)"

bash "$BOOTSTRAP_SCRIPT" "$AWS_SECRET_ID" > "$TMP_EXPORTS"

# Compose reads a standard env file, so convert the shell exports into key=value lines.
{
  while IFS= read -r line; do
    case "$line" in
      export\ *=*)
        key="${line#export }"
        key="${key%%=*}"
        value="${line#*=}"
        TWIN_EXPORT_VALUE="$value" python3 - "$key" <<'PY'
import ast
import os
import sys

key = sys.argv[1]
value = ast.literal_eval(os.environ["TWIN_EXPORT_VALUE"])
print(f"{key}={value}")
PY
        ;;
    esac
  done < "$TMP_EXPORTS"
  printf 'API_IMAGE=%s\n' "$API_IMAGE"
  printf 'FRONTEND_IMAGE=%s\n' "$FRONTEND_IMAGE"
  printf 'PUBLIC_API_BASE_URL=%s\n' "$PUBLIC_API_BASE_URL"
  printf 'TWIN_ENV=%s\n' "$TWIN_ENV"
  printf 'COMPOSE_PROJECT_NAME=%s\n' "$COMPOSE_PROJECT_NAME"
} > "$ENV_FILE"

rm -f "$TMP_EXPORTS"

docker pull "$API_IMAGE"
docker pull "$FRONTEND_IMAGE"

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up -d --remove-orphans

check_url() {
  local url="$1"
  if ! curl -fsS "$url" >/dev/null; then
    echo "Check failed: $url" >&2
    return 1
  fi
}

for i in {1..30}; do
  echo "Deployment health check attempt $i/30"
  if check_url http://127.0.0.1/healthz \
    && check_url http://127.0.0.1/api/health \
    && check_url http://127.0.0.1/api/ready \
    && check_url http://127.0.0.1/api/metrics; then
    echo "Deployment checks passed."
    exit 0
  fi
  sleep 5
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=200
exit 1
