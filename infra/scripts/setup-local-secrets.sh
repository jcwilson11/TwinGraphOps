#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   NEO4J_USER=myuser NEO4J_PASSWORD='strong-password' ./infra/scripts/setup-local-secrets.sh
# or interactively:
#   ./infra/scripts/setup-local-secrets.sh

if [[ -z "${NEO4J_USER:-}" ]]; then
  read -r -p "NEO4J_USER (default: neo4j): " INPUT_USER
  NEO4J_USER="${INPUT_USER:-neo4j}"
fi

if [[ -z "${NEO4J_PASSWORD:-}" ]]; then
  read -r -s -p "NEO4J_PASSWORD: " NEO4J_PASSWORD
  echo
fi

if [[ -z "$NEO4J_PASSWORD" ]]; then
  echo "NEO4J_PASSWORD cannot be empty" >&2
  exit 1
fi

if [[ "$NEO4J_USER" != "neo4j" ]]; then
  echo "NEO4J_USER must be 'neo4j' for Neo4j local auth. Using 'neo4j'." >&2
  NEO4J_USER="neo4j"
fi

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  read -r -p "GEMINI_API_KEY (required for /ingest, press Enter to write a placeholder): " GEMINI_API_KEY
fi

if [[ -z "${GEMINI_API_KEY}" ]]; then
  GEMINI_API_KEY="replace-me"
fi

mkdir -p infra/secrets
printf '%s/%s' "$NEO4J_USER" "$NEO4J_PASSWORD" > infra/secrets/neo4j_auth.txt
printf '%s' "$NEO4J_USER" > infra/secrets/neo4j_user.txt
printf '%s' "$NEO4J_PASSWORD" > infra/secrets/neo4j_password.txt
printf '%s' "$GEMINI_API_KEY" > infra/secrets/gemini_api_key.txt

echo "Wrote:"
echo "  - infra/secrets/neo4j_auth.txt"
echo "  - infra/secrets/neo4j_user.txt"
echo "  - infra/secrets/neo4j_password.txt"
echo "  - infra/secrets/gemini_api_key.txt"
