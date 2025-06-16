#!/bin/bash

# Stopping container
docker image prune --all --force
# docker system prune --all --force

# Downloading and overwriting the compose file
wget -O compose.base.yaml https://raw.githubusercontent.com/juronja/utm-builder/refs/heads/main/compose.base.yaml > compose.base.yaml
wget -O compose.yaml https://raw.githubusercontent.com/juronja/utm-builder/refs/heads/main/compose.prod.yaml > compose.yaml

# Starting the container
docker compose up -d --remove-orphans #--pull always
