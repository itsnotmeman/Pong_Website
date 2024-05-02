# Pong_Website
A website where users can create an account, chat with other users and play the "Pong" game.

Usage:

1. 
A .env file has to be created in backend/ and filled like this:
SERVER_IP= your ip address 
DJANGO_SETTINGS_MODULE=transcendence.settings
DJANGO_SECRET_KEY='your django secret key'
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your redis password
POSTGRES_USER=your postgres username
POSTGRES_PASSWORD=your postgres password
POSTGRES_DB=your postgres database name
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

To generate a new DJANGO_SECRET_KEY, use the following command in the console of the backend container <br>
(after having done "make" to run the container, see step 3.):
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'


2. 
A selfsigned certificate has to be created like this:
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout private_key.pem -out certificate.pem

Move the newly created certificate keys (certificate.pem and private_key.pem) to {your_path}/Pong_Website/nginx/certificates/.


3. 
Docker has to be installed and running.
Then, in the root directory type "make".

The Pong website is then accessible in the browser by typing your SERVER_IP or localhost in the address bar.

To delete all docker containers and volumes, type "make fclean".