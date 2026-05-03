#!/usr/bin/env bash
set -euo pipefail

COMMAND_ID=""
INSTANCE_ID=""
TIMEOUT_SECONDS="${SSM_COMMAND_WAIT_TIMEOUT_SECONDS:-2400}"
POLL_SECONDS="${SSM_COMMAND_POLL_SECONDS:-15}"
GITHUB_OUTPUT_PATH="${GITHUB_OUTPUT:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --command-id)
      COMMAND_ID="${2:-}"
      shift 2
      ;;
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

if [[ -z "$COMMAND_ID" || -z "$INSTANCE_ID" ]]; then
  echo "Usage: $0 --command-id <id> --instance-id <id> [--timeout-seconds seconds] [--poll-seconds seconds]" >&2
  exit 2
fi

if ! [[ "$TIMEOUT_SECONDS" =~ ^[0-9]+$ ]] || [[ "$TIMEOUT_SECONDS" -le 0 ]]; then
  echo "SSM wait timeout must be a positive integer, got: $TIMEOUT_SECONDS" >&2
  exit 2
fi

if ! [[ "$POLL_SECONDS" =~ ^[0-9]+$ ]] || [[ "$POLL_SECONDS" -le 0 ]]; then
  echo "SSM poll interval must be a positive integer, got: $POLL_SECONDS" >&2
  exit 2
fi

TMP_DIR="$(mktemp -d)"
INVOCATION_FILE="$TMP_DIR/invocation.json"
ERROR_FILE="$TMP_DIR/aws-error.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

LAST_STATUS="Unavailable"
LAST_STATUS_DETAILS="Invocation has not been returned by SSM yet."
LAST_RESPONSE_CODE=""

read_json_field() {
  local field="$1"
  python3 - "$INVOCATION_FILE" "$field" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
value = payload.get(sys.argv[2], "")
if value is None:
    value = ""
print(value)
PY
}

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
  local rollback_required="$1"
  local timed_out="$2"

  write_github_output "ssm_status" "$LAST_STATUS"
  write_github_output "ssm_status_details" "$LAST_STATUS_DETAILS"
  write_github_output "ssm_response_code" "$LAST_RESPONSE_CODE"
  write_github_output "rollback_required" "$rollback_required"
  write_github_output "timed_out" "$timed_out"
}

show_invocation_summary() {
  if [[ ! -s "$INVOCATION_FILE" ]]; then
    return
  fi

  python3 - "$INVOCATION_FILE" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
print("SSM invocation summary:")
for key in ("Status", "StatusDetails", "ResponseCode", "ExecutionElapsedTime"):
    value = payload.get(key, "")
    if value not in ("", None):
        print(f"- {key}: {value}")

for key in ("StandardOutputContent", "StandardErrorContent"):
    value = payload.get(key, "") or ""
    if value:
        print(f"- {key}:")
        print(value[-4000:])
PY
}

rollback_required_for_terminal_failure() {
  if [[ "$LAST_STATUS" == "TimedOut" && "$LAST_STATUS_DETAILS" == *"Delivery Timed Out"* ]]; then
    echo false
    return
  fi

  if [[ "$LAST_STATUS" == "Cancelled" ]]; then
    echo false
    return
  fi

  echo true
}

start_time="$(date +%s)"
deadline=$((start_time + TIMEOUT_SECONDS))

echo "Waiting up to ${TIMEOUT_SECONDS}s for SSM command ${COMMAND_ID} on ${INSTANCE_ID}."

while true; do
  if aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --output json > "$INVOCATION_FILE" 2> "$ERROR_FILE"; then
    LAST_STATUS="$(read_json_field Status)"
    LAST_STATUS_DETAILS="$(read_json_field StatusDetails)"
    LAST_RESPONSE_CODE="$(read_json_field ResponseCode)"

    echo "SSM command ${COMMAND_ID}: ${LAST_STATUS} (${LAST_STATUS_DETAILS}), response_code=${LAST_RESPONSE_CODE:-n/a}"

    case "$LAST_STATUS" in
      Success)
        write_final_outputs false false
        exit 0
        ;;
      Failed|Cancelled|TimedOut)
        show_invocation_summary >&2
        write_final_outputs "$(rollback_required_for_terminal_failure)" false
        exit 1
        ;;
      Pending|InProgress|Delayed|Cancelling)
        ;;
      *)
        echo "SSM command ${COMMAND_ID} returned unexpected status '${LAST_STATUS}'; continuing until timeout." >&2
        ;;
    esac
  else
    LAST_STATUS="Unavailable"
    LAST_STATUS_DETAILS="$(tr '\r\n' '  ' < "$ERROR_FILE")"
    LAST_RESPONSE_CODE=""
    echo "SSM command ${COMMAND_ID} is not available yet: ${LAST_STATUS_DETAILS}" >&2
  fi

  now="$(date +%s)"
  if [[ "$now" -ge "$deadline" ]]; then
    echo "Timed out after ${TIMEOUT_SECONDS}s waiting for SSM command ${COMMAND_ID}. Last status: ${LAST_STATUS} (${LAST_STATUS_DETAILS})." >&2
    show_invocation_summary >&2
    write_final_outputs false true
    exit 124
  fi

  sleep_for="$POLL_SECONDS"
  if [[ $((now + sleep_for)) -gt "$deadline" ]]; then
    sleep_for=$((deadline - now))
  fi
  sleep "$sleep_for"
done
