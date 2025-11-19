#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_ENV_TEMPLATE="${SCRIPT_DIR}/templates/parent.env.example"
DEFAULT_SERVICE_TEMPLATE="${SCRIPT_DIR}/templates/suirify-parent.service"
DEFAULT_ENV_PATH="/etc/suirify/parent.env"
DEFAULT_SERVICE_PATH="/etc/systemd/system/suirify-parent.service"
DEFAULT_SERVICE_NAME="suirify-parent"

IMAGE_URI=""
AWS_REGION="${AWS_REGION:-us-east-1}"
ENV_TEMPLATE="$DEFAULT_ENV_TEMPLATE"
SERVICE_TEMPLATE="$DEFAULT_SERVICE_TEMPLATE"
ENV_OUTPUT="$DEFAULT_ENV_PATH"
SERVICE_OUTPUT="$DEFAULT_SERVICE_PATH"
SERVICE_NAME="$DEFAULT_SERVICE_NAME"
DRY_RUN="false"
DECLARE_VARS=()
SKIP_ECR_LOGIN="false"
DOCKER_VOLUMES=()

usage() {
  cat <<'USE'
Usage: deploy-parent.sh --image-uri <ECR_URI> [options]

Required:
  --image-uri <uri>         Fully qualified ECR image URI (e.g. 123.dkr.ecr.us-east-1.amazonaws.com/suirify-parent:sha)

Optional:
  --region <aws-region>     AWS region for ECR login (default: us-east-1 or $AWS_REGION)
  --env-template <path>     Source .env template (default: scripts/templates/parent.env.example)
  --env-output <path>       Destination env file path (default: /etc/suirify/parent.env)
  --service-template <path> Systemd service template (default: scripts/templates/suirify-parent.service)
  --service-output <path>   Systemd service file path (default: /etc/systemd/system/suirify-parent.service)
  --service-name <name>     Systemd unit name (default: suirify-parent)
  --set-env KEY=VALUE       Override/add env entries (repeatable)
  --volume host:container   Bind mount passed to docker run (repeatable)
  --skip-ecr-login          Assume docker already authenticated to registry
  --dry-run                 Print actions without mutating the host
  -h | --help               Show this help
USE
}

require_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "[deploy-parent] This script must run as root." >&2
    exit 1
  fi
}

apply_env_override() {
  local key="$1"
  local value="$2"
  local file="$3"
  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image-uri)
      IMAGE_URI="$2"
      shift 2
      ;;
    --region)
      AWS_REGION="$2"
      shift 2
      ;;
    --env-template)
      ENV_TEMPLATE="$2"
      shift 2
      ;;
    --env-output)
      ENV_OUTPUT="$2"
      shift 2
      ;;
    --service-template)
      SERVICE_TEMPLATE="$2"
      shift 2
      ;;
    --service-output)
      SERVICE_OUTPUT="$2"
      shift 2
      ;;
    --service-name)
      SERVICE_NAME="$2"
      shift 2
      ;;
    --set-env)
      DECLARE_VARS+=("$2")
      shift 2
      ;;
    --volume)
      DOCKER_VOLUMES+=("$2")
      shift 2
      ;;
    --skip-ecr-login)
      SKIP_ECR_LOGIN="true"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$IMAGE_URI" ]]; then
  echo "--image-uri is required" >&2
  usage >&2
  exit 1
fi

REGISTRY_HOST="${IMAGE_URI%%/*}"

if [[ "$DRY_RUN" == "true" ]]; then
  set -x
fi

require_root

mkdir -p "$(dirname "$ENV_OUTPUT")"
mkdir -p "$(dirname "$SERVICE_OUTPUT")"

if [[ ! -f "$ENV_OUTPUT" ]]; then
  if [[ "$DRY_RUN" == "false" ]]; then
    cp "$ENV_TEMPLATE" "$ENV_OUTPUT"
  else
    echo "cp '$ENV_TEMPLATE' '$ENV_OUTPUT'"
  fi
fi

for pair in "${DECLARE_VARS[@]}"; do
  key="${pair%%=*}"
  value="${pair#*=}"
  if [[ -z "$key" ]]; then
    continue
  fi
  if [[ "$DRY_RUN" == "false" ]]; then
    apply_env_override "$key" "$value" "$ENV_OUTPUT"
  else
    echo "apply_env_override $key $value $ENV_OUTPUT"
  fi

done

DOCKER_EXTRA_ARGS=""
if [[ ${#DOCKER_VOLUMES[@]} -gt 0 ]]; then
  while IFS= read -r vol; do
    [[ -z "$vol" ]] && continue
    DOCKER_EXTRA_ARGS+="  -v ${vol} \\\n"
  done < <(printf '%s\n' "${DOCKER_VOLUMES[@]}")
fi
export DOCKER_EXTRA_ARGS

if [[ "$SKIP_ECR_LOGIN" != "true" ]]; then
  if [[ "$DRY_RUN" == "false" ]]; then
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY_HOST"
  else
    echo "aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $REGISTRY_HOST"
  fi
fi

if [[ "$DRY_RUN" == "false" ]]; then
  docker pull "$IMAGE_URI"
else
  echo "docker pull $IMAGE_URI"
fi

SERVICE_TMP="$(mktemp)"
python3 - "$SERVICE_TEMPLATE" "$SERVICE_TMP" "$IMAGE_URI" <<'PY'
import os
import sys
from pathlib import Path

tmpl_path, out_path, image_uri = sys.argv[1:4]
extra = os.environ.get('DOCKER_EXTRA_ARGS', '')
text = Path(tmpl_path).read_text()
text = text.replace('{{IMAGE_URI}}', image_uri)
text = text.replace('{{DOCKER_EXTRA_ARGS}}', extra)
Path(out_path).write_text(text)
PY

if [[ "$DRY_RUN" == "false" ]]; then
  mv "$SERVICE_TMP" "$SERVICE_OUTPUT"
else
  echo "mv $SERVICE_TMP $SERVICE_OUTPUT"
  rm -f "$SERVICE_TMP"
fi

if [[ "$DRY_RUN" == "false" ]]; then
  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  systemctl restart "$SERVICE_NAME"
else
  echo "systemctl daemon-reload"
  echo "systemctl enable $SERVICE_NAME"
  echo "systemctl restart $SERVICE_NAME"
fi

echo "[deploy-parent] Deployment completed (service: $SERVICE_NAME, image: $IMAGE_URI)."
