FROM nginx:1.20.1
COPY ./conf/nginx.conf /etc/nginx/nginx.conf
COPY ./certificates/certificate.pem /etc/ssl/certs/certificate.pem
COPY ./certificates/private_key.pem /etc/ssl/private/private_key.pem
COPY ./static/ /usr/share/nginx/static