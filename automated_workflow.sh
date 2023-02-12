#!/bin/bash

containerid=$(docker ps -aqf "name=file")
docker container rm $containerid 2>/dev/null
docker rmi heisenberg8622/file-store
docker compose up -d