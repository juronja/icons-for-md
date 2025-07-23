# Icons for md

Display icons in your markup documents with this tool.

## Exposed ports:
App: `8402`

## Deploy

Here is a docker compose.yaml.

```yaml
name: icons-for-md # Will be used for auto naming (network, volume names)
services:
  app:
    container_name: icons-app
    restart: unless-stopped
    image: juronja/icons-for-md:latest
    pull_policy: always
    ports:
      - 8402:3000 # These ports are in format <host-port>:<container-port>
```


