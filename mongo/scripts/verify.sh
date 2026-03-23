#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Neither 'docker compose' nor 'docker-compose' is available." >&2
  exit 1
fi

cd "$ROOT_DIR"

echo "Starting MongoDB tutorial environment..."
"${COMPOSE_CMD[@]}" up -d --wait

echo "Seeding demo data..."
"${COMPOSE_CMD[@]}" exec -T mongodb mongosh -u admin -p admin123 --authenticationDatabase admin < scripts/seed_demo.js

echo "Running tutorial verification..."
"${COMPOSE_CMD[@]}" exec -T mongodb mongosh -u admin -p admin123 --authenticationDatabase admin < scripts/run_demo.js

echo
echo "Verification passed."
echo "Interactive shell:"
echo "${COMPOSE_CMD[*]} exec mongodb mongosh -u admin -p admin123 --authenticationDatabase admin"
