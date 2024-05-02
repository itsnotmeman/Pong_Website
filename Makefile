#	Makefile Pong_Website

ifeq ($(shell uname), Linux)  # For WSL 2.
	DOCKER_COMPOSE_PATH = docker-compose-windows.yml
	VOLUME = volume
else
	DOCKER_COMPOSE_PATH = docker-compose.yml
	VOLUME := # Empty.
endif

all: $(VOLUME)
	docker compose -f $(DOCKER_COMPOSE_PATH) up --detach --build

up:
	docker compose -f $(DOCKER_COMPOSE_PATH) up --detach

stop:
	docker compose -f $(DOCKER_COMPOSE_PATH) stop 

down:
	docker compose -f $(DOCKER_COMPOSE_PATH) down

fill:
	postgres/insertData.sh

volume:  # For Windows.
	# This solution:
	# if ! docker volume inspect postgres-data >/dev/null 2>&1; then \
	# 	docker volume create --name=postgres-data; \
	# fi
	# Or this solution. Both work.
	docker volume inspect postgres-data >/dev/null 2>&1 || docker volume create --name=postgres-data

clean:	down
	# rm -rf postgres/postgres-data
	# rm -rf redis/* 
	
fclean:	clean 
	rm -rf postgres/postgres-data  
	rm -rf redis/*
	docker volume rm -f postgres-data  # For Windows.
	
re: 	clean all

.PHONY: all up stop down clean fclean re
