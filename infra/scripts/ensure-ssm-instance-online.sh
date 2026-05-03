#!/usr/bin/env bash
set -euo pipefail

INSTANCE_ID=""
TIMEOUT_SECONDS="${SSM_INSTANCE_READY_TIMEOUT_SECONDS:-300}"
POLL_SECONDS="${SSM_INSTANCE_READY_POLL_SECONDS:-10}"
GITHUB_OUTPUT_PATH="${GITHUB_OUTPUT:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --instance-id)
      INSTANCE_ID="${2:-}"
      shift 2
      ;;
    --timeout-seconds)
      TIMEOUT_SECONDS="${2:-}"
      shift 2
      ;;
    --poll-seconds)
      POLL_SECONDS="${2:-}"
      shift 2
      ;;
    --github-output)
      GITHUB_OUTPUT_PATH="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$INSTANCE_ID" ]]; then
  echo "Usage: $0 --instance-id <id> [--timeout-seconds seconds] [--poll-seconds seconds]" >&2
  exit 2
fi

if ! [[ "$TIMEOUT_SECONDS" =~ ^[0-9]+$ ]] || [[ "$TIMEOUT_SECONDS" -le 0 ]]; then
  echo "SSM instance ready timeout must be a positive integer, got: $TIMEOUT_SECONDS" >&2
  exit 2
fi

if ! [[ "$POLL_SECONDS" =~ ^[0-9]+$ ]] || [[ "$POLL_SECONDS" -le 0 ]]; then
  echo "SSM instance ready poll interval must be a positive integer, got: $POLL_SECONDS" >&2
  exit 2
fi

TMP_DIR="$(mktemp -d)"
INSTANCE_FILE="$TMP_DIR/instance.json"
ERROR_FILE="$TMP_DIR/aws-error.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

LAST_PING_STATUS="Unavailable"
LAST_DETAILS="Instance has not been returned by SSM yet."

write_github_output() {
  local key="$1"
  local value="$2"

  if [[ -z "$GITHUB_OUTPUT_PATH" ]]; then
    return
  fi

  value="${value//$'\r'/ }"
  value="${value//$'\n'/ }"
  printf '%s=%s\n' "$key" "$value" >> "$GITHUB_OUTPUT_PATH"
}

write_final_outputs() {
  local ready="$1"

  write_github_output "ssm_instance_ready" "$ready"
  write_github_output "ssm_ping_status" "$LAST_PING_STATUS"
  write_github_output "ssm_instance_ready_details" "$LAST_DETAILS"
  write_github_output "rollback_required" "false"
}

read_instance_field() {
  local field="$1"
  python3 - "$INSTANCE_FILE" "$field" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
instances = payload.get("InstanceInformationList", [])
if not instances:
    print("")
    raise SystemExit(0)
value = instances[0].get(sys.argv[2], "")
if value is None:
    value = ""
print(value)
PY
}

start_time="$(date +%s)"
deadline=$((start_time + TIMEOUT_SECONDS))

echo "Waiting up to ${TIMEOUT_SECONDS}s for SSM managed instance ${INSTANCE_ID} to be Online."

while true; do
  if aws ssm describe-instance-information \
    --filters "Key=InstanceIds,Values=${INSTANCE_ID}" \
    --output json > "$INSTANCE_FILE" 2> "$ERROR_FILE"; then
    LAST_PING_STATUS="$(read_instance_field PingStatus)"
    agent_version="$(read_instance_field AgentVersion)"
    platform_name="$(read_instance_field PlatformName)"

    if [[ -z "$LAST_PING_STATUS" ]]; then
      LAST_PING_STATUS="NotRegistered"
      LAST_DETAILS="Instance is not registered as an SSM managed instance in this AWS account/region."
    else
      LAST_DETAILS="PingStatus=${LAST_PING_STATUS}"
      if [[ -n "$agent_version" ]]; then
        LAST_DETAILS+=", AgentVersion=${agent_version}"
      fi
      if [[ -n "$platform_name" ]]; then
        LAST_DETAILS+=", PlatformName=${platform_name}"
      fi
    fi

    echo "SSM managed instance ${INSTANCE_ID}: ${LAST_DETAILS}"

    if [[ "$LAST_PING_STATUS" == "Online" ]]; then
      write_final_outputs true
      exit 0
    fi
  else
    LAST_PING_STATUS="Unavailable"
    LAST_DETAILS="$(tr '\r\n' '  ' < "$ERROR_FILE")"
    echo "Could not describe SSM managed instance ${INSTANCE_ID}: ${LAST_DETAILS}" >&2

    case "$LAST_DETAILS" in
      *AccessDenied*|*Unauthorized*|*ExpiredToken*|*ValidationException*)
        write_final_outputs false
        exit 1
        ;;
    esac
  fi

  now="$(date +%s)"
  if [[ "$now" -ge "$deadline" ]]; then
    echo "Timed out after ${TIMEOUT_SECONDS}s waiting for SSM managed instance ${INSTANCE_ID} to be Online. Last status: ${LAST_PING_STATUS} (${LAST_DETAILS})." >&2
    write_final_outputs false
    exit 1
  fi

  sleep_for="$POLL_SECONDS"
  if [[ $((now + sleep_for)) -gt "$deadline" ]]; then
    sleep_for=$((deadline - now))
  fi
  sleep "$sleep_for"
done
