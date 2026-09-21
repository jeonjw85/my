#!/bin/sh
set -e

mkdir -p /app/data /app/uploads

echo "[entrypoint] Applying Prisma migrations and removing retired team files..."
npm run db:migrate

echo "[entrypoint] Starting app..."
exec "$@"
