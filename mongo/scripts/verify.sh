#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "Starting MongoDB tutorial environment..."
docker compose up -d --wait

echo "Seeding demo data..."
docker compose exec -T mongodb mongosh -u admin -p admin123 --authenticationDatabase admin < scripts/seed_demo.js

echo "Running tutorial verification..."
docker compose exec -T mongodb mongosh -u admin -p admin123 --authenticationDatabase admin < scripts/run_demo.js

echo
echo "Verification passed."
echo "Interactive shell:"
echo "docker compose exec mongodb mongosh -u admin -p admin123 --authenticationDatabase admin"
