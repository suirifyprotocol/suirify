#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/enclave-app"
OUT_DIR="${REPO_ROOT}/out"

IMAGE_TAG="${IMAGE_TAG:-suirify-enclave:latest}"
EIF_PATH="${EIF_PATH:-${OUT_DIR}/suirify-enclave.eif}"
MEASUREMENTS_PATH="${MEASUREMENTS_PATH:-${EIF_PATH%.eif}.measurements.json}"
DEBUG_MODE="false"
BUILD_ARGS=()

usage() {
  cat <<'USAGE'
Usage: scripts/build-enclave-image.sh [options]
  --image <tag>        Docker image tag to build (default: suirify-enclave:latest)
  --output <path>      EIF output path (default: out/suirify-enclave.eif)
  --debug              Build EIF in debug mode (zeroed PCRs; do not use in prod)
  --build-arg k=v      Extra Docker build-arg (repeatable)
  -h | --help          Show this message
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --output)
      EIF_PATH="$2"
      shift 2
      ;;
    --debug)
      DEBUG_MODE="true"
      shift
      ;;
    --build-arg)
      BUILD_ARGS+=("--build-arg" "$2")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

mkdir -p "$OUT_DIR"
mkdir -p "$(dirname "$EIF_PATH")"
mkdir -p "$(dirname "$MEASUREMENTS_PATH")"
EIF_DIR="$(cd "$(dirname "$EIF_PATH")" && pwd)"
EIF_FILE="${EIF_DIR}/$(basename "$EIF_PATH")"
MEASUREMENTS_FILE="$(cd "$(dirname "$MEASUREMENTS_PATH")" && pwd)/$(basename "$MEASUREMENTS_PATH")"

echo "Building enclave container image: $IMAGE_TAG"
DOCKER_BUILDKIT=1 docker build "${BUILD_ARGS[@]}" -t "$IMAGE_TAG" "$APP_DIR"

echo "Building EIF -> $EIF_FILE"
build_cmd=(nitro-cli build-enclave --docker-uri "$IMAGE_TAG" --output-file "$EIF_FILE" --measurements "$MEASUREMENTS_FILE")
if [[ "$DEBUG_MODE" == "true" ]]; then
  build_cmd+=(--debug-mode)
fi
"${build_cmd[@]}"

echo "EIF ready: $EIF_FILE"
if [[ -f "$MEASUREMENTS_FILE" ]]; then
  echo "PCR measurements written to $MEASUREMENTS_FILE"
fi
