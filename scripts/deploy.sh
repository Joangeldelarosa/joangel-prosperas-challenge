#!/bin/bash
# Manual deploy helper script
set -euo pipefail

echo "=== Prosperas Deploy Script ==="

# Check prerequisites
command -v terraform >/dev/null 2>&1 || { echo "ERROR: terraform not found"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "ERROR: aws cli not found"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker not found"; exit 1; }

echo "1. Building Docker images..."
docker build -t prosperas-api ../backend
docker build -t prosperas-frontend ../frontend

echo "2. Applying Terraform..."
cd ../infra
terraform init
terraform apply -auto-approve

echo "3. Pushing images to ECR..."
# ECR login and push would go here
echo "   (Configure ECR URLs in CI/CD pipeline)"

echo "=== Deploy complete ==="
