# Admin app on Runflare

Use this directory as the Docker build context. Expose container port 80 and configure `/health`. Set both API targets; `LOCAL_API_PROXY_TARGET` must be reachable from the container and must never rely on `host.docker.internal` in Runflare.

See `../RUNFLARE-DEPLOY.md` for the complete deployment order.

