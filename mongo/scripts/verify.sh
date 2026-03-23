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
"${COMPOSE_CMD[@]}" up -d

echo "Waiting for MongoDB to become healthy..."
container_id="$("${COMPOSE_CMD[@]}" ps -q mongodb)"

if [[ -z "$container_id" ]]; then
  echo "Could not determine MongoDB container ID." >&2
  exit 1
fi

for _ in {1..60}; do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  if [[ "$status" == "unhealthy" ]]; then
    echo "MongoDB container became unhealthy." >&2
    docker logs "$container_id" >&2 || true
    exit 1
  fi
  sleep 2
done

status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
if [[ "$status" != "healthy" ]]; then
  echo "MongoDB did not become healthy in time." >&2
  docker logs "$container_id" >&2 || true
  exit 1
fi

echo "Seeding demo data..."
"${COMPOSE_CMD[@]}" exec -T mongodb mongosh -u admin -p admin123 --authenticationDatabase admin < scripts/seed_demo.js

echo "Running tutorial verification..."
"${COMPOSE_CMD[@]}" exec -T mongodb mongosh -u admin -p admin123 --authenticationDatabase admin < scripts/run_demo.js

echo
echo "Verification passed."
echo "Interactive shell:"
echo "${COMPOSE_CMD[*]} exec mongodb mongosh -u admin -p admin123 --authenticationDatabase admin"
