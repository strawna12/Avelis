FROM nginx:alpine

COPY *.html /usr/share/nginx/html/

RUN sed -i 's/listen\s*80;/listen 8080;/g; s/listen\s*\[::\]:80;/listen [::]:8080;/g' \
    /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
