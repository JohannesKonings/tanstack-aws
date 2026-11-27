#!/usr/bin/env bash
# Print one JSON key from the envs secret in us-east-2.
# Stdout is only the value. Callers must mask it before anything else prints it.
set -euo pipefail

KEY="${1:?Usage: read-envs-secret-key.sh KEY}"
if ! [[ "$KEY" =~ ^[A-Z0-9_]+$ ]]; then
  echo "Secret key must match [A-Z0-9_]+." >&2
  exit 1
fi

SECRET_JSON="$(aws secretsmanager get-secret-value \
  --region us-east-2 \
  --secret-id envs \
  --query SecretString \
  --output text)"
VALUE="$(jq -r --arg key "$KEY" '.[$key] // empty' <<<"$SECRET_JSON")"
if [ -z "$VALUE" ]; then
  echo "The envs secret in us-east-2 has no ${KEY} string." >&2
  exit 1
fi
printf '%s' "$VALUE"
