#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SECRETS_DIR="${SECRETS_DIR:-$ROOT_DIR/infra/secrets}"
NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASSWORD="${NEO4J_PASSWORD:-}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"

if [[ -z "$NEO4J_PASSWORD" ]]; then
  echo "NEO4J_PASSWORD cannot be empty" >&2
  exit 1
fi

if [[ "$NEO4J_USER" != "neo4j" ]]; then
  echo "NEO4J_USER must be 'neo4j' for the local Compose-backed Neo4j instance. Using 'neo4j'." >&2
  NEO4J_USER="neo4j"
fi

if [[ -z "$GEMINI_API_KEY" ]]; then
  GEMINI_API_KEY="replace-me"
fi

mkdir -p "$SECRETS_DIR"
printf '%s/%s' "$NEO4J_USER" "$NEO4J_PASSWORD" > "$SECRETS_DIR/neo4j_auth.txt"
printf '%s' "$NEO4J_USER" > "$SECRETS_DIR/neo4j_user.txt"
printf '%s' "$NEO4J_PASSWORD" > "$SECRETS_DIR/neo4j_password.txt"
printf '%s' "$GEMINI_API_KEY" > "$SECRETS_DIR/gemini_api_key.txt"

echo "Wrote:"
echo "  - $SECRETS_DIR/neo4j_auth.txt"
echo "  - $SECRETS_DIR/neo4j_user.txt"
echo "  - $SECRETS_DIR/neo4j_password.txt"
echo "  - $SECRETS_DIR/gemini_api_key.txt"
