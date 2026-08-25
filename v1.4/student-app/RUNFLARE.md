# Student app on Runflare

Use this directory as the Docker build context. Expose container port 80 and configure `/health`. The app is static and needs no persistent disk. Set `API_PROXY_TARGET` to the public or internal backend origin without `/api/v1` at the end.

See `../RUNFLARE-DEPLOY.md` for the complete deployment order.

