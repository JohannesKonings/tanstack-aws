#!/usr/bin/env bash
# Print API_CURSOR_SUB from the envs secret in us-east-2.
# Stdout is only the subject. Callers must mask it before anything else prints it.
set -euo pipefail

SECRET_JSON="$(aws secretsmanager get-secret-value \
  --region us-east-2 \
  --secret-id envs \
  --query SecretString \
  --output text)"
SUBJECT="$(jq -r '.API_CURSOR_SUB // empty' <<<"$SECRET_JSON")"
if [ -z "$SUBJECT" ]; then
  echo "The envs secret in us-east-2 has no API_CURSOR_SUB string." >&2
  exit 1
fi
printf '%s' "$SUBJECT"
