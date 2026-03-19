#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
AWS_SECRET_ID="${AWS_SECRETS_MANAGER_SECRET_ID:-${1:-}}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI is required. Install it and authenticate before running this script." >&2
  exit 1
fi

if ! command -v python >/dev/null 2>&1; then
  echo "Python is required to parse the AWS secret JSON payload." >&2
  exit 1
fi

if [[ -z "$AWS_SECRET_ID" ]]; then
  echo "Provide an AWS Secrets Manager secret id as the first argument or via AWS_SECRETS_MANAGER_SECRET_ID." >&2
  exit 1
fi

AWS_ARGS=(secretsmanager get-secret-value --secret-id "$AWS_SECRET_ID" --query SecretString --output text)
if [[ -n "$AWS_REGION" ]]; then
  AWS_ARGS+=(--region "$AWS_REGION")
fi

SECRET_STRING="$(aws "${AWS_ARGS[@]}")"
if [[ -z "$SECRET_STRING" || "$SECRET_STRING" == "None" ]]; then
  echo "AWS Secrets Manager returned an empty SecretString for '$AWS_SECRET_ID'." >&2
  exit 1
fi

mapfile -t SECRET_VALUES < <(
  TWIN_AWS_SECRET_JSON="$SECRET_STRING" python - <<'PY'
import json
import os
import sys

try:
    payload = json.loads(os.environ["TWIN_AWS_SECRET_JSON"])
except json.JSONDecodeError as exc:
    raise SystemExit(f"SecretString must be valid JSON: {exc}") from exc


def read_value(*keys: str, default: str = "") -> str:
    for key in keys:
        value = payload.get(key)
        if value not in (None, ""):
            return str(value)
    return default


print(read_value("neo4j_user", "NEO4J_USER", default="neo4j"))
print(read_value("neo4j_password", "NEO4J_PASSWORD"))
print(read_value("gemini_api_key", "GEMINI_API_KEY"))
PY
)

if [[ "${#SECRET_VALUES[@]}" -ne 3 ]]; then
  echo "Failed to extract the expected secret fields from '$AWS_SECRET_ID'." >&2
  exit 1
fi

export NEO4J_USER="${SECRET_VALUES[0]}"
export NEO4J_PASSWORD="${SECRET_VALUES[1]}"
export GEMINI_API_KEY="${SECRET_VALUES[2]}"
export SECRETS_DIR="${SECRETS_DIR:-$ROOT_DIR/infra/secrets}"

bash "$SCRIPT_DIR/write-secret-files.sh"
