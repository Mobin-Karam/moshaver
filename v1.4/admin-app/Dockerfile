FROM nginx:1.27-alpine
COPY . /usr/share/nginx/html
RUN date -u +%Y%m%d%H%M%S > /build-version && chmod +x /usr/share/nginx/html/docker-entrypoint.sh
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
ENTRYPOINT ["/usr/share/nginx/html/docker-entrypoint.sh"]
