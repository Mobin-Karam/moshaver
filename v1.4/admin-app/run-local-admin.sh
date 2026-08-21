#!/bin/sh
set -eu
cd "$(dirname "$0")"
exec node local-server.js --prod --port=8081
