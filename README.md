# Pong_Website
A website where users can create an account, chat with other users and play the "Pong" game.

Usage:

A .env file has to be created in backend/ and filled like this:
SERVER_IP= your ip address 
DJANGO_SETTINGS_MODULE=transcendence.settings
DJANGO_SECRET_KEY = 'your django secret key'
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD= your redis password
POSTGRES_USER= your postgres username
POSTGRES_PASSWORD= your postgres password
POSTGRES_DB= your postgres database name
POSTGRES_HOST=postgres
POSTGRES_PORT=5432


A selfsigned certificate has to be created like this:
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout private_key.pem -out certificate.pem

Move the newly created certificate keys (certificate.pem and private_key.pem) to {your_path}/Pong_Website/nginx/certificates/.


In the root directory type "make".