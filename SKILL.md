# SKILL.md — Prosperas Async Report Processing System

> Referencia técnica rápida del proyecto. Para documentación completa, ver [TECHNICAL_DOCS.md](TECHNICAL_DOCS.md).

---

## Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend API | Python + FastAPI | 3.11+ / 0.115+ |
| Frontend | React + TypeScript + Vite | 18+ / 5+ / 6+ |
| Styling | Tailwind CSS | 3+ |
| Queue | AWS SQS (Standard + High-Priority + DLQ) | — |
| Database | AWS DynamoDB | — |
| Storage | AWS S3 | — |
| Compute | AWS ECS Fargate | — |
| CDN | AWS CloudFront | — |
| Registry | AWS ECR | — |
| Local Dev | Docker Compose + LocalStack | — |
| IaC | Terraform | 1.5+ |
| CI/CD | GitHub Actions | — |
| Auth | JWT (HS256) + bcrypt | — |
| Real-time | WebSocket (FastAPI native + Starlette) | — |
| Observability | Structured JSON Logging + /health | — |

---

## Repository Map

```
backend/app/core/config.py        → Pydantic Settings from env vars
backend/app/core/database.py      → DynamoDB connection (boto3, LocalStack-aware)
backend/app/core/security.py      → JWT encode/decode, bcrypt hashing, get_current_user
backend/app/core/exceptions.py    → AppException hierarchy + global FastAPI handlers
backend/app/core/logging_config.py → Structured JSON logging (JSONFormatter)
backend/app/models/job.py         → Job dataclass (to_dict / from_dict)
backend/app/models/user.py        → User dataclass
backend/app/models/schemas.py     → Pydantic v2 request/response schemas
backend/app/api/auth.py           → POST /api/auth/register, POST /api/auth/login
backend/app/api/jobs.py           → POST /api/jobs, GET /api/jobs/{id}, GET /api/jobs, GET /api/jobs/{id}/download
backend/app/api/health.py         → GET /health — dependency check (DynamoDB, SQS, S3)
backend/app/api/websocket.py      → WS /ws/jobs — real-time job status push
backend/app/services/job_service.py    → Job CRUD on DynamoDB
backend/app/services/queue_service.py  → SQS message publishing (priority routing)
backend/app/services/user_service.py   → User registration + authentication
backend/app/worker/consumer.py    → SQS polling loop with ThreadPoolExecutor + priority queues
backend/app/worker/processor.py   → Report generation (PDF/CSV/JSON via reportlab) + S3 upload
backend/app/worker/circuit_breaker.py → CircuitBreaker pattern (per report_type)
backend/app/worker/__main__.py    → Worker entrypoint with graceful shutdown
backend/app/main.py               → FastAPI app assembly + CORS + routers + logging
backend/Dockerfile                → Multi-stage build (python:3.11-slim)
backend/tests/                    → 76 tests (unit + integration) with moto + pytest
frontend/src/App.tsx              → Root component with auth state
frontend/src/config.ts            → API_URL + WS_URL
frontend/src/components/          → Layout, LoginForm, JobForm, JobList, SummaryCards, etc.
frontend/src/hooks/useAuth.ts     → Login/register/logout with localStorage
frontend/src/hooks/useJobs.ts     → WebSocket push + REST fallback (no polling)
frontend/src/services/api.ts      → Axios + JWT interceptor
frontend/src/utils/labels.ts      → Report type labels (Spanish)
frontend/Dockerfile               → Multi-stage (node:18 → nginx:alpine)
infra/*.tf                        → Terraform: VPC, ECS, ALB, DynamoDB, SQS (4 queues), S3, CloudFront, ECR, IAM
local/docker-compose.yml          → LocalStack + backend + worker + frontend
local/localstack/init-aws.sh      → Creates SQS (4 queues), DynamoDB tables, S3 bucket
.github/workflows/ci.yml          → Lint + Test on push
.github/workflows/deploy.yml      → Full deploy pipeline to AWS
```

---

## API Spec

| Method | Route | Auth | Request | Response | Status |
|--------|-------|------|---------|----------|--------|
| POST | /api/auth/register | No | `{username, password}` | `{user_id, token, username}` | 201 |
| POST | /api/auth/login | No | `{username, password}` | `{token, username}` | 200 |
| POST | /api/jobs | JWT | `{report_type, date_range, format}` | `{job_id, status}` | 201 |
| GET | /api/jobs/{job_id} | JWT | — | `JobResponse` | 200 |
| GET | /api/jobs?page=1&per_page=20 | JWT | — | `{jobs[], total, page, has_next}` | 200 |
| GET | /api/jobs/{job_id}/download | JWT (query) | `?token=JWT` | Redirect to S3 presigned URL | 302 |
| GET | /health | No | — | `{status, dependencies, timestamp}` | 200 |
| WS | /ws/jobs?token=JWT | JWT (query) | — | Push: `{type: "job_update", job: {...}}` | — |

**report_type**: `engagement_analytics` | `revenue_breakdown` | `growth_summary` | `failing_report`
**format**: `pdf` | `csv` | `json`
**priority**: `revenue_breakdown` → HIGH priority queue, others → STANDARD

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

### Priority Queue Routing
```python
# queue_service.py
HIGH_PRIORITY_TYPES = {"revenue_breakdown"}
queue_url = high_priority_queue_url if report_type in HIGH_PRIORITY_TYPES else queue_url
```
Worker polls HIGH queue first (short poll), then STANDARD (long poll).

### Circuit Breaker
```python
# circuit_breaker.py — per report_type, 3 states
CLOSED → (3 consecutive failures) → OPEN → (60s timeout) → HALF_OPEN → (success) → CLOSED
```
`failing_report` type always fails — use to demonstrate circuit breaker.

### Exponential Backoff Retry
```python
# consumer.py — on failure, delay = min(base × 2^(attempt-1), max)
# attempt 1 → 10s, attempt 2 → 20s, attempt 3 → 40s → then DLQ
```

### WebSocket Real-Time Updates
```
Frontend connects: ws://host/ws/jobs?token=JWT
Server polls DynamoDB every 2s for connected user's jobs
On status change → pushes {type: "job_update", job: {...}} to client
Frontend updates job list in-place — no client-side polling
```

### Structured Logging (JSON)
```python
# logging_config.py — every log line is JSON
{"timestamp": "...", "level": "INFO", "logger": "app.worker", "message": "...", "job_id": "..."}
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
cd backend && pytest tests/ -v --cov=app    # 76 tests (fail_under=70%)
cd frontend && npm test                      # 44 React component tests
```

Backend suites: `test_models` (10), `test_services` (12), `test_worker` (11), `test_circuit_breaker` (10), `test_consumer` (6), `test_api` (21 integration + health + priority routing).

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

---

## Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| `Circuit OPEN for report_type=X` | 3+ consecutive failures for that report type | Wait 60s for HALF_OPEN, or restart worker to reset circuit state |
| `WebSocket 4001` | Invalid or expired JWT token in WS query param | Re-authenticate (login) to get fresh token |
| `LocalStack queues not found` | `init-aws.sh` didn't run or LocalStack not ready | Wait for LocalStack healthcheck, then restart containers |
| `CORS blocked` | Frontend URL doesn't match `FRONTEND_URL` env var | Set `FRONTEND_URL` to match the origin of your frontend |
| `Job stuck in PROCESSING` | Worker crashed during processing | Job will be retried via SQS visibility timeout → DLQ after 3 attempts |

---

## How to Extend: Add a New Report Type

1. **Backend schema** — Add the type name to the regex in `backend/app/models/schemas.py` → `CreateJobRequest.report_type`
2. **Processor** — Add a title to `REPORT_TITLES` in `backend/app/worker/processor.py`
3. **Frontend labels** — Add the Spanish label to the `LABELS` map in `frontend/src/utils/labels.ts`
4. **Priority** (optional) — If high priority, add to `HIGH_PRIORITY_TYPES` in `backend/app/services/queue_service.py`
5. **Test** — Add an integration test in `backend/tests/integration/test_api.py` confirming the new type is accepted
