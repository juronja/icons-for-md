# Icons for md

Display popular tech app and brand icons in your markdown documents.

## How to use

Search for icons, stack them in the order you like and copy the link to your markdown document.

Try out this demo: [icons-for-md.homelabtales.com](https://icons-for-md.homelabtales.com/)

⚠️ Website must be online for icons to show.

## Selfhost

Rely on your own infrastructure and self-host with this Docker compose yaml.

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
