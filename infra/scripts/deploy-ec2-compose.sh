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
GEMINI_MODEL="${GEMINI_MODEL:-}"
GEMINI_MODEL_PARAMETER_NAME="${GEMINI_MODEL_PARAMETER_NAME:-/${COMPOSE_PROJECT_NAME}/${TWIN_ENV}/gemini_model}"

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

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI is required on the EC2 host." >&2
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

if [[ -z "$GEMINI_MODEL" ]]; then
  AWS_SSM_ARGS=(ssm get-parameter --name "$GEMINI_MODEL_PARAMETER_NAME" --query Parameter.Value --output text)
  if [[ -n "$AWS_REGION" ]]; then
    AWS_SSM_ARGS+=(--region "$AWS_REGION")
  fi

  if GEMINI_MODEL="$(aws "${AWS_SSM_ARGS[@]}" 2>/dev/null)"; then
    echo "Loaded GEMINI_MODEL from SSM Parameter Store: $GEMINI_MODEL_PARAMETER_NAME"
  else
    GEMINI_MODEL=""
    echo "GEMINI_MODEL was not set and SSM parameter '$GEMINI_MODEL_PARAMETER_NAME' was not readable; using compose default." >&2
  fi
fi

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
  if [[ -n "$GEMINI_MODEL" ]]; then
    printf 'GEMINI_MODEL=%s\n' "$GEMINI_MODEL"
  fi
  printf 'TWIN_ENV=%s\n' "$TWIN_ENV"
  printf 'COMPOSE_PROJECT_NAME=%s\n' "$COMPOSE_PROJECT_NAME"
} > "$ENV_FILE"

rm -f "$TMP_EXPORTS"

TWIN_DEPLOY_ENV_FILE="$ENV_FILE" python3 - <<'PY'
import hashlib
import os
from pathlib import Path

env_file = Path(os.environ["TWIN_DEPLOY_ENV_FILE"])
values: dict[str, str] = {}
for raw_line in env_file.read_text(encoding="utf-8").splitlines():
    if not raw_line or raw_line.startswith("#") or "=" not in raw_line:
        continue
    key, value = raw_line.split("=", 1)
    values[key] = value

api_key = values.get("GEMINI_API_KEY", "")
if not api_key:
    raise SystemExit("Generated cloud env is missing GEMINI_API_KEY.")
if api_key in {"replace-me", "replace-with-real-api-key"}:
    raise SystemExit("Generated cloud env still contains a placeholder GEMINI_API_KEY.")

fingerprint = hashlib.sha256(api_key.encode("utf-8")).hexdigest()[:12]
model = values.get("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")
print(
    "Deployment Gemini config: "
    f"key_present=true key_length={len(api_key)} key_sha256_prefix={fingerprint} model={model}"
)
PY

login_to_ecr_if_needed() {
  local image="$1"
  local registry=""

  if [[ "$image" == *"/"* ]]; then
    registry="${image%%/*}"
  fi

  if [[ "$registry" == *.amazonaws.com ]]; then
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$registry"
  fi
}

login_to_ecr_if_needed "$API_IMAGE"
if [[ "$FRONTEND_IMAGE" != "$API_IMAGE" ]]; then
  login_to_ecr_if_needed "$FRONTEND_IMAGE"
fi

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
    && check_url http://127.0.0.1/api/metrics \
    && check_url http://127.0.0.1/grafana/api/health; then
    echo "Deployment checks passed."
    exit 0
  fi
  sleep 5
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=200
exit 1
