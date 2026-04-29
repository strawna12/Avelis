FROM nginx:alpine

# Cache buster: force rebuild to pick up latest nginx.conf (try_files /index.html fix)
COPY nginx.conf /etc/nginx/nginx.conf
COPY *.html /usr/share/nginx/html/

EXPOSE 8080

CMD ["nginx"]
