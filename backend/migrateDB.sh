#!/bin/sh

POSTGRES_HOST=postgres
POSTGRES_PORT=5432

echo "Waiting for PostgreSQL to be ready..."
while ! nc -z $POSTGRES_HOST $POSTGRES_PORT; do
  sleep 1
done

echo "PostgreSQL is ready."

python manage.py makemigrations
python manage.py migrate
# python manage.py collectstatic --noinput

python manage.py runworker game_engine &
gunicorn --reload transcendence.asgi:application -k uvicorn.workers.UvicornWorker --workers 3 --bind 0.0.0.0:8001
