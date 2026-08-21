FROM nginx:1.27-alpine
COPY . /usr/share/nginx/html
RUN date -u +%Y%m%d%H%M%S > /build-version && chmod +x /usr/share/nginx/html/docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/usr/share/nginx/html/docker-entrypoint.sh"]
