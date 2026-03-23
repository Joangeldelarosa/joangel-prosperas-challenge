# Prosperas — Async Report Processing System

[![CI — Lint & Test](https://github.com/Joangeldelarosa/joangel-prosperas-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/Joangeldelarosa/joangel-prosperas-challenge/actions/workflows/ci.yml)

> Sistema de procesamiento asíncrono de reportes construido con FastAPI, React, y servicios AWS (SQS, DynamoDB, S3, ECS Fargate).

---

## Architecture

```
Browser → React SPA → FastAPI API → SQS Queue → Worker → DynamoDB / S3
                                         ↓ (after 3 failures)
                                    Dead Letter Queue
```

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend API** | Python 3.11, FastAPI, Pydantic v2 |
| **Worker** | Python, concurrent SQS consumer (ThreadPoolExecutor) |
| **Queue** | AWS SQS (Standard + DLQ) |
| **Database** | AWS DynamoDB (jobs + users tables) |
| **Storage** | AWS S3 (generated reports) |
| **Auth** | JWT (HS256) with bcrypt password hashing |
| **Local Dev** | Docker Compose + LocalStack |
| **IaC** | Terraform (ECS Fargate, ALB, CloudFront, VPC) |
| **CI/CD** | GitHub Actions |

---

## Quick Start (Local Development)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) v4+
- [Git](https://git-scm.com/) 2.x+

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Joangeldelarosa/joangel-prosperas-challenge.git
cd joangel-prosperas-challenge

# 2. Copy environment variables
cp .env.example .env

# 3. Start all services
docker compose -f local/docker-compose.yml up --build

# 4. Open in browser
#    Frontend:  http://localhost:3000
#    API Docs:  http://localhost:8000/docs
```

All AWS resources (SQS queues, DynamoDB tables, S3 bucket) are created automatically by LocalStack on startup.

### Makefile Commands

```bash
make dev            # Start all services with Docker Compose
make dev-down       # Stop all services
make test           # Run all tests (backend + frontend)
make test-backend   # Run backend tests with coverage
make test-frontend  # Run frontend tests
make lint           # Run linters (ruff + eslint)
make clean          # Clean build artifacts
```

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| `POST` | `/api/auth/register` | — | Register a new user |
| `POST` | `/api/auth/login` | — | Login, returns JWT |
| `POST` | `/api/jobs` | JWT | Create a report job |
| `GET` | `/api/jobs/{job_id}` | JWT | Get job status |
| `GET` | `/api/jobs` | JWT | List jobs (paginated) |

**Report types:** `engagement_analytics`, `revenue_breakdown`, `growth_summary`
**Formats:** `pdf`, `csv`, `json`

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI routers (auth, jobs)
│   │   ├── core/          # Config, database, security, exceptions
│   │   ├── models/        # Data models + Pydantic schemas
│   │   ├── services/      # Business logic (jobs, queue, users)
│   │   └── worker/        # SQS consumer + report processor
│   ├── tests/             # Unit + integration tests (pytest + moto)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/    # React components (Layout, Forms, etc.)
│   │   ├── hooks/         # Custom hooks (useAuth, useJobs)
│   │   └── services/      # API client (Axios + JWT interceptor)
│   └── Dockerfile
├── infra/                 # Terraform (VPC, ECS, ALB, S3, CloudFront)
├── local/                 # Docker Compose + LocalStack config
├── scripts/               # Utility scripts (init-db, seed-data)
├── .github/workflows/     # CI/CD pipelines
├── TECHNICAL_DOCS.md      # Full technical documentation
└── AI_WORKFLOW.md         # AI usage evidence
```

---

## Testing

```bash
# Backend — 48 tests (unit + integration)
cd backend && pytest tests/ -v --cov=app

# Frontend
cd frontend && npm test
```

Tests use [moto](https://github.com/getmoto/moto) to mock AWS services — no running infrastructure needed.

---

## CI/CD

| Workflow | Trigger | Stages |
|----------|---------|--------|
| `ci.yml` | Push to `main` | Lint (ruff + eslint) → Test (pytest + vitest) |
| `deploy.yml` | Push to `main` | CI → Build & Push ECR → Terraform Apply → Deploy ECS → Deploy Frontend (S3 + CloudFront) → Health Check |

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | IAM credentials for deployment |
| `AWS_SECRET_ACCESS_KEY` | IAM credentials for deployment |
| `JWT_SECRET_KEY` | JWT signing secret for production |
| `API_URL` | Production API URL for frontend build |

---

## Production Infrastructure (Terraform)

All infrastructure is defined in `infra/` as Terraform HCL:

- **VPC** with public subnets across 2 AZs
- **ECS Fargate** cluster with API + Worker services
- **ALB** with health checks for the API
- **DynamoDB** tables (jobs + users) with GSIs
- **SQS** queues (standard + DLQ with redrive policy)
- **S3** buckets (reports + frontend static files)
- **CloudFront** distribution for frontend with OAC
- **ECR** repositories with lifecycle policies
- **IAM** roles with least-privilege policies
- **CloudWatch** log groups for container logs

```bash
cd infra
terraform init
terraform plan -var="jwt_secret_key=YOUR_SECRET"
terraform apply
```

---

## Documentation

- [TECHNICAL_DOCS.md](TECHNICAL_DOCS.md) — Architecture diagrams, data models, design decisions, deployment guide
- [AI_WORKFLOW.md](AI_WORKFLOW.md) — Evidence of AI-assisted development
- [DESIGN_REFERENCE.html](DESIGN_REFERENCE.html) — Visual design reference for the frontend

---

## Built With AI

This project was developed using **GitHub Copilot (Claude)** as an AI pair-programming assistant. See [AI_WORKFLOW.md](AI_WORKFLOW.md) for detailed evidence of AI usage throughout the development process.
