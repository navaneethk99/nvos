# Guacamole JSON Authentication

This deployment overlay enables `guacamole-auth-json` alongside the existing
PostgreSQL authentication. It does not remove or replace the PostgreSQL
environment variables, so `guacadmin` continues to authenticate normally.

## Configuration

Set `GUACAMOLE_JSON_SECRET` in the environment file used by Docker Compose.
It must be the 32-character hexadecimal 128-bit AES key generated for NVOS.
Do not commit this value.

The overlay maps `GUACAMOLE_JSON_SECRET` to Guacamole's official Docker
variable, `JSON_SECRET_KEY`, and sets `JSON_ENABLED=true` to install and
enable the extension.

## Apply

From the directory containing the existing Guacamole `docker-compose.yml`:

```sh
cp /path/to/nvos/deploy/guacamole/.env.example .env
# Set GUACAMOLE_JSON_SECRET in .env with the generated 32-character hex key.
docker compose --env-file .env \
  -f docker-compose.yml \
  -f /path/to/nvos/deploy/guacamole/docker-compose.json-auth.override.yml.example \
  up -d --force-recreate guacamole
```

This recreates only the Guacamole web application container. It does not
require a `guacd` restart, though active Guacamole web sessions are dropped.

## Verify

Confirm the container is healthy and the JSON extension configuration exists:

```sh
docker compose ps guacamole
docker compose logs --tail=100 guacamole
docker compose exec guacamole sh -c 'test -f /etc/guacamole/guacamole.properties && grep -q "^json-secret-key:" /etc/guacamole/guacamole.properties'
```

Sign in with `guacadmin` to confirm PostgreSQL authentication still works.
For JSON authentication, submit a valid encrypted and signed JSON payload to
`POST /api/tokens` as the `data` form parameter. A successful response
contains an `authToken`; invalid payloads are rejected.
