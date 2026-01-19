# Icons for md

Display icons in your markdown documents.

## Exposed ports

App: `8402`

## Selfhost

Here is a docker compose.yaml.

```yaml
name: icons-for-md
services:
  app:
    container_name: icons-app
    restart: unless-stopped
    image: juronja/icons-for-md:latest
    pull_policy: always
    ports:
      - 8402:3000
```
