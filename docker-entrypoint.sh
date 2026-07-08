#!/bin/sh
set -e

mkdir -p /app/data /app/uploads

echo "[entrypoint] Applying Prisma migrations..."
npx prisma migrate deploy

echo "[entrypoint] Starting app..."
exec "$@"
