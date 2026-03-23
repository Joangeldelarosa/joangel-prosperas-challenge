# SKILL.md — Prosperas Async Report Processing System

> Referencia técnica rápida del proyecto. Para documentación completa, ver [TECHNICAL_DOCS.md](TECHNICAL_DOCS.md).

---

## Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend API | Python + FastAPI | 3.11+ / 0.115+ |
| Frontend | React + TypeScript + Vite | 18+ / 5+ / 6+ |
| Styling | Tailwind CSS | 3+ |
| Queue | AWS SQS (Standard + DLQ) | — |
| Database | AWS DynamoDB | — |
| Storage | AWS S3 | — |
| Compute | AWS ECS Fargate | — |
| CDN | AWS CloudFront | — |
| Registry | AWS ECR | — |
| Local Dev | Docker Compose + LocalStack | — |
| IaC | Terraform | 1.5+ |
| CI/CD | GitHub Actions | — |
| Auth | JWT (HS256) + bcrypt | — |

---

## Repository Map

```
backend/app/core/config.py        → Pydantic Settings from env vars
backend/app/core/database.py      → DynamoDB connection (boto3, LocalStack-aware)
backend/app/core/security.py      → JWT encode/decode, bcrypt hashing, get_current_user
backend/app/core/exceptions.py    → AppException hierarchy + global FastAPI handlers
backend/app/models/job.py         → Job dataclass (to_dict / from_dict)
backend/app/models/user.py        → User dataclass
backend/app/models/schemas.py     → Pydantic v2 request/response schemas
backend/app/api/auth.py           → POST /api/auth/register, POST /api/auth/login
backend/app/api/jobs.py           → POST /api/jobs, GET /api/jobs/{id}, GET /api/jobs
backend/app/services/job_service.py    → Job CRUD on DynamoDB
backend/app/services/queue_service.py  → SQS message publishing
backend/app/services/user_service.py   → User registration + authentication
backend/app/worker/consumer.py    → SQS polling loop with ThreadPoolExecutor
backend/app/worker/processor.py   → Simulated report processing (5-30s) + S3 upload
backend/app/worker/__main__.py    → Worker entrypoint
backend/app/main.py               → FastAPI app assembly + CORS + routers
backend/Dockerfile                → Multi-stage build (python:3.11-slim)
backend/tests/                    → 48 tests (unit + integration) with moto
frontend/src/App.tsx              → Root component with auth state
frontend/src/components/          → Layout, LoginForm, JobForm, JobList, etc.
frontend/src/hooks/useAuth.ts     → Login/register/logout with localStorage
frontend/src/hooks/useJobs.ts     → Polling-based job fetching (5s interval)
frontend/src/services/api.ts      → Axios + JWT interceptor
frontend/Dockerfile               → Multi-stage (node:18 → nginx:alpine)
infra/*.tf                        → Terraform: VPC, ECS, ALB, DynamoDB, SQS, S3, CloudFront, ECR, IAM
local/docker-compose.yml          → LocalStack + backend + worker + frontend
local/localstack/init-aws.sh      → Creates SQS, DynamoDB tables, S3 bucket
.github/workflows/ci.yml          → Lint + Test on push
.github/workflows/deploy.yml      → Full deploy pipeline to AWS
```

---

## API Spec

| Method | Route | Auth | Request | Response | Status |
|--------|-------|------|---------|----------|--------|
| POST | /api/auth/register | No | `{username, password}` | `{user_id, token}` | 201 |
| POST | /api/auth/login | No | `{username, password}` | `{token}` | 200 |
| POST | /api/jobs | JWT | `{report_type, date_range, format}` | `{job_id, status, ...}` | 201 |
| GET | /api/jobs/{job_id} | JWT | — | `JobResponse` | 200 |
| GET | /api/jobs?page=1&per_page=20 | JWT | — | `{jobs[], total, page, has_next}` | 200 |

**report_type**: `engagement_analytics` | `revenue_breakdown` | `growth_summary`
**format**: `pdf` | `csv` | `json`

---

## Data Model

### DynamoDB Tables

**jobs** (PK: `job_id`, GSI: `user_id-index` → PK: `user_id`, SK: `created_at`)
- `job_id` (S) — UUID v4
- `user_id` (S) — Reference to users table
- `status` (S) — PENDING | PROCESSING | COMPLETED | FAILED
- `report_type` (S)
- `parameters` (S) — JSON string with date_range and format
- `created_at` (S) — ISO 8601 UTC
- `updated_at` (S) — ISO 8601 UTC
- `result_url` (S) — S3 key (nullable)

**users** (PK: `user_id`, GSI: `username-index` → PK: `username`)
- `user_id` (S) — UUID v4
- `username` (S) — Unique, 3-50 chars
- `password_hash` (S) — bcrypt
- `created_at` (S) — ISO 8601 UTC

---

## Key Patterns

### Environment Detection
```python
# config.py
@property
def is_local(self) -> bool:
    return self.aws_endpoint_url is not None
```
If `AWS_ENDPOINT_URL` is set → LocalStack. Otherwise → real AWS.

### Concurrent Worker
```python
# consumer.py — ThreadPoolExecutor for parallel message processing
executor = ThreadPoolExecutor(max_workers=settings.worker_concurrency)
executor.submit(process_message, message)
```

### Centralized Error Handling
```python
# exceptions.py
class AppException(Exception): ...
class NotFoundException(AppException): ...
# Registered via register_exception_handlers(app) in main.py
```

### JWT Auth Flow
```
Register → bcrypt hash → DynamoDB PutItem → JWT token
Login → DynamoDB Query → bcrypt verify → JWT token
Request → Bearer header → decode JWT → get_current_user dependency
```

---

## Local Development

```bash
cp .env.example .env
docker compose -f local/docker-compose.yml up --build
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

---

## Testing

```bash
cd backend && pytest tests/ -v --cov=app    # 48 tests
cd frontend && npm test                      # React component tests
```

---

## AWS Services & Justification

| Service | Why |
|---------|-----|
| SQS Standard | Decouples API from workers, DLQ for failed jobs, unlimited throughput |
| DynamoDB | Serverless, free tier, key-value model fits jobs perfectly |
| S3 | Cheap storage for generated reports |
| ECS Fargate | Docker-native, same image for API and Worker, no server management |
| CloudFront + S3 | CDN for frontend, HTTPS, global edge caching |
| ALB | Health checks, traffic distribution to ECS tasks |
