#!/bin/bash
# One-shot deploy: build+push ECR, then start App Runner deployments.
set -euo pipefail

AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-149843772536}"
REGION="${AWS_REGION:-ap-southeast-2}"
ECR_REPOSITORY="${ECR_REPOSITORY:-tabinaka-media}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
FULL_IMAGE_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"

SECRET_ARN_DEFAULT="arn:aws:secretsmanager:ap-southeast-2:149843772536:secret:tabinaka-media-main/prod/env-Y24Xdv"
SECRET_ARN="${SECRET_ARN:-${SECRET_ARN_DEFAULT}}"

DEPLOY_ENV="both"

usage() {
  cat <<'USAGE'
Usage: ./scripts/deploy-oneshot.sh [--env develop|main|both] [--image-tag TAG]

Defaults:
  --env both
  --image-tag latest

Environment overrides:
  AWS_ACCOUNT_ID, AWS_REGION, ECR_REPOSITORY, IMAGE_TAG, SECRET_ARN
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --env)
      DEPLOY_ENV="$2"
      shift 2
      ;;
    --image-tag)
      IMAGE_TAG="$2"
      FULL_IMAGE_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: missing command: $1" >&2
    exit 1
  }
}

require_cmd aws
require_cmd jq
require_cmd docker

load_build_args() {
  echo "[1/4] Load build args from Secrets Manager (no output)"
  local secret_json
  secret_json=$(aws secretsmanager get-secret-value \
    --secret-id "${SECRET_ARN}" \
    --region "${REGION}" \
    --query 'SecretString' \
    --output text)

  export NEXT_PUBLIC_SUPABASE_URL="$(printf '%s' "${secret_json}" | jq -r '.NEXT_PUBLIC_SUPABASE_URL')"
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="$(printf '%s' "${secret_json}" | jq -r '.NEXT_PUBLIC_SUPABASE_ANON_KEY')"
  export NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$(printf '%s' "${secret_json}" | jq -r '.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')"
  export NEXT_PUBLIC_BASE_URL="$(printf '%s' "${secret_json}" | jq -r '.NEXT_PUBLIC_BASE_URL')"
  export NEXT_PUBLIC_SITE_URL="$(printf '%s' "${secret_json}" | jq -r '.NEXT_PUBLIC_SITE_URL')"
  export CI="${CI:-true}"

  for k in \
    NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
    NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_SITE_URL; do
    local v
    v="${!k:-}"
    if [ -z "${v}" ] || [ "${v}" = "null" ]; then
      echo "ERROR: ${k} missing in Secrets Manager JSON" >&2
      exit 1
    fi
  done
}

build_and_push() {
  echo "[2/4] Docker build (linux/amd64)"
  aws ecr get-login-password --region "${REGION}" \
    | docker login --username AWS --password-stdin "${ECR_REGISTRY}" >/dev/null

  DOCKER_BUILDKIT=1 docker build --platform linux/amd64 \
    -t "${ECR_REPOSITORY}:${IMAGE_TAG}" \
    --build-arg NEXT_PUBLIC_SUPABASE_URL \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY \
    --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
    --build-arg NEXT_PUBLIC_BASE_URL \
    --build-arg NEXT_PUBLIC_SITE_URL \
    --build-arg CI \
    .

  docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${FULL_IMAGE_URI}"

  echo "[3/4] Push to ECR: ${FULL_IMAGE_URI}"
  docker push --quiet "${FULL_IMAGE_URI}"
}

start_deploy() {
  local service_name="$1"
  local service_arn

  service_arn=$(aws apprunner list-services \
    --region "${REGION}" \
    --query "ServiceSummaryList[?ServiceName=='${service_name}'].ServiceArn" \
    --output text)

  if [ -z "${service_arn}" ] || [ "${service_arn}" = "None" ]; then
    echo "ERROR: Service ARN not found for ${service_name}" >&2
    exit 1
  fi

  aws apprunner start-deployment \
    --service-arn "${service_arn}" \
    --region "${REGION}" >/dev/null

  echo "Started deployment: ${service_name} (${service_arn})"
}

echo "=== One-shot deploy ==="
echo "Region: ${REGION}"
echo "Image:  ${FULL_IMAGE_URI}"

load_build_args
build_and_push

case "${DEPLOY_ENV}" in
  develop)
    start_deploy "tabinaka-media-ecr"
    ;;
  main)
    start_deploy "tabinaka-media-main-ecr"
    ;;
  both)
    start_deploy "tabinaka-media-ecr"
    start_deploy "tabinaka-media-main-ecr"
    ;;
  *)
    echo "ERROR: --env must be develop, main, or both" >&2
    exit 1
    ;;
esac

echo "=== Done ==="
