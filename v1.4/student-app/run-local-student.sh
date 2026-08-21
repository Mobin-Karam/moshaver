#!/bin/sh
set -eu
cd "$(dirname "$0")"
exec node local-server.js --local-api --port=8080
