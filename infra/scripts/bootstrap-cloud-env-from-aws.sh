#!/usr/bin/env bash
set -euo pipefail

AWS_SECRET_ID="${AWS_SECRETS_MANAGER_SECRET_ID:-${1:-}}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI is required. Install it and authenticate before running this script." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required to parse the AWS secret JSON payload." >&2
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

TWIN_AWS_SECRET_JSON="$SECRET_STRING" python3 - <<'PY'
import json
import os

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


neo4j_user = read_value("neo4j_user", "NEO4J_USER", default="neo4j") or "neo4j"
neo4j_password = read_value("neo4j_password", "NEO4J_PASSWORD")
gemini_api_key = read_value("gemini_api_key", "GEMINI_API_KEY")
grafana_admin_user = read_value("grafana_admin_user", "GRAFANA_ADMIN_USER")
grafana_admin_password = read_value("grafana_admin_password", "GRAFANA_ADMIN_PASSWORD")

if not neo4j_password:
    raise SystemExit("The secret must contain neo4j_password (or NEO4J_PASSWORD).")

if not gemini_api_key:
    raise SystemExit("The secret must contain gemini_api_key (or GEMINI_API_KEY).")

if gemini_api_key in {"replace-me", "replace-with-real-api-key"}:
    raise SystemExit("The production Gemini API key is still a placeholder.")

if not grafana_admin_user:
    raise SystemExit("The secret must contain grafana_admin_user (or GRAFANA_ADMIN_USER).")

if not grafana_admin_password:
    raise SystemExit("The secret must contain grafana_admin_password (or GRAFANA_ADMIN_PASSWORD).")


def emit_export(key: str, value: str) -> None:
    print(f"export {key}={value!r}")


emit_export("NEO4J_USER", neo4j_user)
emit_export("NEO4J_PASSWORD", neo4j_password)
emit_export("NEO4J_AUTH", f"{neo4j_user}/{neo4j_password}")
emit_export("GEMINI_API_KEY", gemini_api_key)
emit_export("GF_SECURITY_ADMIN_USER", grafana_admin_user)
emit_export("GF_SECURITY_ADMIN_PASSWORD", grafana_admin_password)
PY
