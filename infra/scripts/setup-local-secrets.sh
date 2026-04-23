#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

if [[ -z "${GRAFANA_ADMIN_USER:-}" ]]; then
  read -r -p "GRAFANA_ADMIN_USER: " GRAFANA_ADMIN_USER
fi

if [[ -z "${GRAFANA_ADMIN_PASSWORD:-}" ]]; then
  read -r -s -p "GRAFANA_ADMIN_PASSWORD: " GRAFANA_ADMIN_PASSWORD
  echo
fi

bash "$SCRIPT_DIR/write-secret-files.sh"
