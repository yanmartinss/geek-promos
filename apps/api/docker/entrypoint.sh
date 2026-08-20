#!/bin/sh
set -e

export PATH="$PATH:/app/apps/api/node_modules/.bin"

prisma migrate deploy

exec node /app/apps/api/dist/src/server.js
