#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project_name="activitypub-public-test"
configuration_directory="${PUBLIC_TEST_CONFIG_DIR:-/etc/mkdotnet-public-test}"
environment_file="${PUBLIC_TEST_ENV_FILE:-$configuration_directory/public-test.env}"
vault_token_file="$configuration_directory/vault-token"
data_protection_certificate_file="$configuration_directory/data-protection.pfx"
data_protection_password_file="$configuration_directory/data-protection-password"
compose_override="$repository_root/deploy/public-test/docker-compose.public-test.yml"
nginx_template="$repository_root/deploy/public-test/nginx.conf.template"
nginx_configuration="${PUBLIC_TEST_NGINX_CONFIG:-/etc/nginx/conf.d/activitypub-public-test.conf}"

require_root() {
  if ((EUID != 0)); then
    echo "Run this operation as root." >&2
    exit 1
  fi
}

require_environment() {
  if [[ ! -f "$environment_file" ]]; then
    echo "Run 'sudo bash eng/public-test.sh init' first." >&2
    exit 1
  fi

  set -a
  # shellcheck source=/dev/null
  source "$environment_file"
  set +a

  : "${PUBLIC_TEST_HOST:?set PUBLIC_TEST_HOST in $environment_file}"
  : "${PUBLIC_TEST_HTTP_PORT:?set PUBLIC_TEST_HTTP_PORT in $environment_file}"
  : "${AP_POSTGRES_PASSWORD:?set AP_POSTGRES_PASSWORD in $environment_file}"
  : "${AP_MINIO_ROOT_USER:?set AP_MINIO_ROOT_USER in $environment_file}"
  : "${AP_MINIO_ROOT_PASSWORD:?set AP_MINIO_ROOT_PASSWORD in $environment_file}"
  : "${AP_VAULT_TOKEN:?set AP_VAULT_TOKEN in $environment_file}"
  : "${AP_VAULT_TOKEN_FILE:?set AP_VAULT_TOKEN_FILE in $environment_file}"
  : "${PUBLIC_TEST_DATA_PROTECTION_CERTIFICATE_FILE:?set PUBLIC_TEST_DATA_PROTECTION_CERTIFICATE_FILE in $environment_file}"
  : "${PUBLIC_TEST_DATA_PROTECTION_PASSWORD_FILE:?set PUBLIC_TEST_DATA_PROTECTION_PASSWORD_FILE in $environment_file}"

  if [[ ! "$PUBLIC_TEST_HOST" =~ ^[A-Za-z0-9.-]+$ ]]; then
    echo "PUBLIC_TEST_HOST must be a DNS hostname." >&2
    exit 1
  fi
  if ! [[ "$PUBLIC_TEST_HTTP_PORT" =~ ^[0-9]+$ ]] ||
     ((PUBLIC_TEST_HTTP_PORT < 1024 || PUBLIC_TEST_HTTP_PORT > 65535)); then
    echo "PUBLIC_TEST_HTTP_PORT must be a TCP port from 1024 through 65535." >&2
    exit 1
  fi
  if [[ "$AP_VAULT_TOKEN_FILE" != "$vault_token_file" ]]; then
    echo "AP_VAULT_TOKEN_FILE must be $vault_token_file." >&2
    exit 1
  fi
  if [[ "$PUBLIC_TEST_DATA_PROTECTION_CERTIFICATE_FILE" != "$data_protection_certificate_file" ||
        "$PUBLIC_TEST_DATA_PROTECTION_PASSWORD_FILE" != "$data_protection_password_file" ]]; then
    echo "Data Protection secret files must be stored in $configuration_directory." >&2
    exit 1
  fi
  if [[ ! -f "$vault_token_file" ]]; then
    echo "Vault token file is missing." >&2
    exit 1
  fi
  if [[ ! -f "$data_protection_certificate_file" || ! -f "$data_protection_password_file" ]]; then
    echo "Data Protection secret files are missing." >&2
    exit 1
  fi
}

compose() {
  docker compose \
    --project-name "$project_name" \
    --project-directory "$repository_root" \
    --env-file "$environment_file" \
    --file "$repository_root/docker-compose.yml" \
    --file "$compose_override" \
    "$@"
}

initialize() {
  require_root
  if [[ -e "$environment_file" || -e "$vault_token_file" ||
        -e "$data_protection_certificate_file" || -e "$data_protection_password_file" ]]; then
    echo "Refusing to overwrite the existing public-test configuration." >&2
    exit 1
  fi

  umask 077
  install -d -m 0700 "$configuration_directory"
  postgres_password="$(openssl rand -hex 32)"
  minio_access_key="$(openssl rand -hex 16)"
  minio_secret_key="$(openssl rand -hex 32)"
  vault_token="$(openssl rand -hex 32)"
  data_protection_password="$(openssl rand -hex 32)"
  temporary_environment="$(mktemp "$configuration_directory/public-test.env.XXXXXX")"
  temporary_vault_token="$(mktemp "$configuration_directory/vault-token.XXXXXX")"
  temporary_certificate="$(mktemp "$configuration_directory/data-protection.XXXXXX.pfx")"
  temporary_certificate_password="$(mktemp "$configuration_directory/data-protection-password.XXXXXX")"
  temporary_private_key="$(mktemp "$configuration_directory/data-protection-key.XXXXXX.pem")"
  temporary_public_certificate="$(mktemp "$configuration_directory/data-protection-certificate.XXXXXX.pem")"
  trap 'rm -f "$temporary_environment" "$temporary_vault_token" "$temporary_certificate" "$temporary_certificate_password" "$temporary_private_key" "$temporary_public_certificate"' EXIT

  printf '%s\n' "$vault_token" > "$temporary_vault_token"
  chmod 0400 "$temporary_vault_token"
  chown 1654:1654 "$temporary_vault_token"
  mv "$temporary_vault_token" "$vault_token_file"

  openssl req -x509 -newkey rsa:3072 -sha256 -days 825 -nodes \
    -subj '/CN=activitypub-public-test-data-protection' \
    -keyout "$temporary_private_key" \
    -out "$temporary_public_certificate" >/dev/null 2>&1
  openssl pkcs12 -export \
    -inkey "$temporary_private_key" \
    -in "$temporary_public_certificate" \
    -out "$temporary_certificate" \
    -passout "pass:$data_protection_password" >/dev/null 2>&1
  printf '%s\n' "$data_protection_password" > "$temporary_certificate_password"
  chmod 0400 "$temporary_certificate" "$temporary_certificate_password"
  chown 1654:1654 "$temporary_certificate" "$temporary_certificate_password"
  mv "$temporary_certificate" "$data_protection_certificate_file"
  mv "$temporary_certificate_password" "$data_protection_password_file"
  rm -f "$temporary_private_key" "$temporary_public_certificate"

  {
    printf 'PUBLIC_TEST_HOST=%s\n' 'testtest.exekey.net'
    printf 'PUBLIC_TEST_HTTP_PORT=%s\n' '2972'
    printf 'ACTIVITYPUB_IMAGE=%s\n' 'activitypub-server:public-test'
    printf 'AP_POSTGRES_PASSWORD=%s\n' "$postgres_password"
    printf 'AP_MINIO_ROOT_USER=%s\n' "$minio_access_key"
    printf 'AP_MINIO_ROOT_PASSWORD=%s\n' "$minio_secret_key"
    printf 'AP_VAULT_TOKEN=%s\n' "$vault_token"
    printf 'AP_VAULT_TOKEN_FILE=%s\n' "$vault_token_file"
    printf 'PUBLIC_TEST_DATA_PROTECTION_CERTIFICATE_FILE=%s\n' "$data_protection_certificate_file"
    printf 'PUBLIC_TEST_DATA_PROTECTION_PASSWORD_FILE=%s\n' "$data_protection_password_file"
  } > "$temporary_environment"
  chmod 0600 "$temporary_environment"
  mv "$temporary_environment" "$environment_file"
  echo "Created public-test secrets in $configuration_directory (values not displayed)."
}

add_data_protection_secrets() {
  require_root
  if [[ ! -f "$environment_file" || ! -f "$vault_token_file" ]]; then
    echo "The existing public-test environment and Vault token are required." >&2
    exit 1
  fi
  if [[ -e "$data_protection_certificate_file" || -e "$data_protection_password_file" ]] ||
     grep -q '^PUBLIC_TEST_DATA_PROTECTION_' "$environment_file"; then
    echo "Refusing to overwrite existing Data Protection material." >&2
    exit 1
  fi

  umask 077
  data_protection_password="$(openssl rand -hex 32)"
  temporary_certificate="$(mktemp "$configuration_directory/data-protection.XXXXXX.pfx")"
  temporary_certificate_password="$(mktemp "$configuration_directory/data-protection-password.XXXXXX")"
  temporary_private_key="$(mktemp "$configuration_directory/data-protection-key.XXXXXX.pem")"
  temporary_public_certificate="$(mktemp "$configuration_directory/data-protection-certificate.XXXXXX.pem")"
  trap 'rm -f "$temporary_certificate" "$temporary_certificate_password" "$temporary_private_key" "$temporary_public_certificate"' EXIT

  openssl req -x509 -newkey rsa:3072 -sha256 -days 825 -nodes \
    -subj '/CN=activitypub-public-test-data-protection' \
    -keyout "$temporary_private_key" \
    -out "$temporary_public_certificate" >/dev/null 2>&1
  openssl pkcs12 -export \
    -inkey "$temporary_private_key" \
    -in "$temporary_public_certificate" \
    -out "$temporary_certificate" \
    -passout "pass:$data_protection_password" >/dev/null 2>&1
  printf '%s\n' "$data_protection_password" > "$temporary_certificate_password"
  chmod 0400 "$temporary_certificate" "$temporary_certificate_password"
  chown 1654:1654 "$temporary_certificate" "$temporary_certificate_password" "$vault_token_file"
  mv "$temporary_certificate" "$data_protection_certificate_file"
  mv "$temporary_certificate_password" "$data_protection_password_file"
  rm -f "$temporary_private_key" "$temporary_public_certificate"
  {
    printf 'PUBLIC_TEST_DATA_PROTECTION_CERTIFICATE_FILE=%s\n' "$data_protection_certificate_file"
    printf 'PUBLIC_TEST_DATA_PROTECTION_PASSWORD_FILE=%s\n' "$data_protection_password_file"
  } >> "$environment_file"
  chmod 0600 "$environment_file"
  echo "Added Data Protection secrets without displaying their values."
}

install_nginx() {
  require_root
  require_environment
  temporary_nginx="$(mktemp)"
  trap 'rm -f "$temporary_nginx"' EXIT
  sed \
    -e "s/__PUBLIC_TEST_HOST__/$PUBLIC_TEST_HOST/g" \
    -e "s/__PUBLIC_TEST_HTTP_PORT__/$PUBLIC_TEST_HTTP_PORT/g" \
    "$nginx_template" > "$temporary_nginx"
  install -m 0644 "$temporary_nginx" "$nginx_configuration"
  nginx -t
  systemctl reload nginx
  echo "Installed the nginx route for https://$PUBLIC_TEST_HOST/."
}

verify_local() {
  require_environment
  curl --silent --show-error --fail --max-time 30 \
    --resolve "$PUBLIC_TEST_HOST:443:127.0.0.1" \
    "https://$PUBLIC_TEST_HOST/health/ready" >/dev/null
  config="$(curl --silent --show-error --fail --max-time 30 \
    --resolve "$PUBLIC_TEST_HOST:443:127.0.0.1" \
    "https://$PUBLIC_TEST_HOST/api/frontend/config")"
  jq -e \
    --arg origin "https://$PUBLIC_TEST_HOST" \
    '.enabled == true and
     .localAccountsEnabled == true and
     .publicBaseUri == $origin and
     .apiBaseUri == ($origin + "/api/")' \
    <<<"$config" >/dev/null
  curl --silent --show-error --fail --max-time 30 \
    --resolve "$PUBLIC_TEST_HOST:443:127.0.0.1" \
    "https://$PUBLIC_TEST_HOST/app/" >/dev/null
  echo "Local TLS, readiness, runtime configuration, and frontend checks passed."
}

action="${1:-}"
case "$action" in
  init)
    initialize
    ;;
  add-data-protection-secrets)
    add_data_protection_secrets
    ;;
  config)
    require_environment
    compose config --quiet
    ;;
  install-nginx)
    install_nginx
    ;;
  up)
    require_environment
    # api, worker, and migrate share one immutable application image. Build it once so
    # parallel Compose builds cannot race while writing the public-test tag.
    compose build api
    compose up --no-build --detach --wait --wait-timeout 600 \
      redis postgres minio minio-init clamav vault vault-init migrate api worker
    ;;
  verify)
    verify_local
    ;;
  status)
    require_environment
    compose ps
    ;;
  logs)
    require_environment
    shift
    compose logs --follow "$@"
    ;;
  down)
    require_environment
    compose down
    ;;
  *)
    echo "Usage: eng/public-test.sh init|add-data-protection-secrets|config|install-nginx|up|verify|status|logs [service...]|down" >&2
    exit 1
    ;;
esac
