---
name: challenge-developer
description: "Implementation skill for the Prosperas challenge. Provides coding patterns, commit strategy, design reference specs, LocalStack setup, CI/CD pipeline structure, and quality checklists for building the async report processing system. Use when: implementing backend endpoints, writing React components, creating workers, setting up Docker/LocalStack, writing tests, building CI/CD, deploying to AWS."
argument-hint: "Describe what component to implement or what task to execute"
---

# Challenge Developer — Implementation Skill

## System Overview

Async report processing platform: users request reports via React frontend → FastAPI backend creates job + publishes to SQS → Workers consume concurrently (simulated processing) → status updates in DynamoDB → frontend shows real-time status via polling.

**Stack**: Python 3.11+ / FastAPI / React 18+ / Vite / Tailwind CSS / AWS SQS / DynamoDB / S3 / ECS Fargate / CloudFront / Terraform / GitHub Actions / LocalStack

---

## Repository Map

```
joangel-prosperas-challenge/
├── .github/
│   ├── agents/
│   │   ├── challenge-architect.agent.md   # Planificador — NO escribe código
│   │   └── challenge-developer.agent.md   # Ejecutor — implementa el código
│   ├── skills/
│   │   ├── challenge-architect/SKILL.md   # Plan maestro, arquitectura, requisitos
│   │   └── challenge-developer/SKILL.md   # Este archivo — guía de implementación
│   └── workflows/
│       ├── ci.yml                         # Lint + Test on every push
│       └── deploy.yml                     # Full deploy to AWS on push to main
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                        # FastAPI app, CORS, routers, error handlers
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                    # POST /auth/register, /auth/login
│   │   │   ├── jobs.py                    # POST /jobs, GET /jobs/{id}, GET /jobs
│   │   │   └── health.py                  # GET /health (bonus B5)
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py                  # Pydantic Settings — all env vars
│   │   │   ├── database.py                # DynamoDB client (endpoint-aware)
│   │   │   ├── security.py                # JWT create/verify, password hash
│   │   │   └── exceptions.py              # Custom exceptions + global handlers
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── job.py                     # Job dataclass/model
│   │   │   ├── user.py                    # User dataclass/model
│   │   │   └── schemas.py                 # Pydantic v2 request/response schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── job_service.py             # Create, get, list jobs — DynamoDB ops
│   │   │   └── queue_service.py           # Publish to SQS
│   │   └── worker/
│   │       ├── __init__.py
│   │       ├── __main__.py                # python -m app.worker entrypoint
│   │       ├── consumer.py                # SQS polling loop, concurrent dispatch
│   │       ├── processor.py               # Simulated processing per job
│   │       └── circuit_breaker.py         # Bonus B2
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                    # Fixtures: mock AWS, test client, test user
│   │   ├── unit/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py             # Pydantic schema validation
│   │   │   ├── test_services.py           # job_service, queue_service (mocked)
│   │   │   └── test_worker.py             # processor logic, circuit breaker
│   │   └── integration/
│   │       ├── __init__.py
│   │       ├── test_api.py                # Full endpoint tests with test client
│   │       └── test_worker.py             # Worker with mocked SQS
│   ├── Dockerfile                         # Multi-stage: builder → slim runtime
│   ├── requirements.txt                   # Pinned dependencies
│   ├── pyproject.toml                     # Project metadata + tool config
│   └── ruff.toml                          # Linter config
├── frontend/
│   ├── src/
│   │   ├── main.tsx                       # React entry point
│   │   ├── App.tsx                        # Router + auth context provider
│   │   ├── components/
│   │   │   ├── Layout.tsx                 # Header + main container
│   │   │   ├── LoginForm.tsx              # Auth form
│   │   │   ├── JobForm.tsx                # Report request form
│   │   │   ├── JobList.tsx                # Jobs table with pagination
│   │   │   ├── JobStatusBadge.tsx         # Color-coded status badges
│   │   │   ├── SummaryCards.tsx           # Footer stat cards
│   │   │   ├── ErrorBoundary.tsx          # React error boundary
│   │   │   └── ErrorNotification.tsx      # Toast/snackbar errors (NOT alert())
│   │   ├── hooks/
│   │   │   ├── useAuth.ts                 # JWT login/register/logout
│   │   │   └── useJobs.ts                 # Fetch jobs + polling interval
│   │   ├── services/
│   │   │   └── api.ts                     # Axios instance + JWT interceptor
│   │   ├── types/
│   │   │   └── index.ts                   # TypeScript interfaces
│   │   └── config.ts                      # VITE_API_URL and constants
│   ├── public/
│   ├── index.html
│   ├── Dockerfile                         # Multi-stage: build → nginx
│   ├── nginx.conf                         # Production nginx config
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts                 # Custom theme from DESIGN_REFERENCE
│   └── vite.config.ts
├── infra/                                 # Terraform — AWS production
│   ├── main.tf                            # Provider, backend state
│   ├── vpc.tf                             # VPC, subnets, security groups
│   ├── ecs.tf                             # ECS cluster, task defs, services
│   ├── alb.tf                             # Application Load Balancer
│   ├── dynamodb.tf                        # Tables + GSIs
│   ├── sqs.tf                             # Queues + DLQ
│   ├── s3.tf                              # Report results + frontend hosting
│   ├── cloudfront.tf                      # CDN for frontend
│   ├── ecr.tf                             # Container registry
│   ├── iam.tf                             # Task execution roles
│   ├── cloudwatch.tf                      # Log groups
│   ├── variables.tf                       # Input variables
│   ├── outputs.tf                         # URLs, ARNs
│   └── terraform.tfvars.example           # Example values (NO secrets)
├── local/
│   ├── docker-compose.yml                 # Full local stack
│   ├── localstack/
│   │   └── init-aws.sh                    # Create SQS, DynamoDB, S3 in LocalStack
│   └── .env.local                         # Local-only overrides
├── scripts/
│   ├── init-db.sh                         # Initialize DynamoDB tables
│   ├── seed-data.sh                       # Insert test data
│   └── deploy.sh                          # Manual deploy helper
├── .env.example                           # All env vars with descriptions
├── .gitignore
├── docker-compose.yml                     # Root compose (delegates to local/)
├── Makefile                               # Common commands
├── DESIGN_REFERENCE.html                  # Visual frontend mockup
├── TECHNICAL_DOCS.md                      # Architecture + deployment docs
├── SKILL.md                               # AI agent context (root-level)
├── AI_WORKFLOW.md                         # Evidence of AI tool usage
└── README.md                              # Setup + URL + badge + decisions
```

---

## API Specification

### Auth Endpoints
```
POST /api/auth/register
  Body: { "username": "string", "password": "string" }
  Response 201: { "user_id": "uuid", "token": "jwt-string" }

POST /api/auth/login
  Body: { "username": "string", "password": "string" }
  Response 200: { "token": "jwt-string" }
  Response 401: { "detail": "Invalid credentials" }
```

### Job Endpoints
```
POST /api/jobs
  Headers: Authorization: Bearer <token>
  Body: {
    "report_type": "engagement_analytics | revenue_breakdown | growth_summary",
    "date_range": { "start": "2025-01-01", "end": "2025-12-31" },
    "format": "pdf | csv | json"
  }
  Response 201: { "job_id": "uuid", "status": "PENDING" }

GET /api/jobs/{job_id}
  Headers: Authorization: Bearer <token>
  Response 200: {
    "job_id": "uuid",
    "user_id": "uuid",
    "status": "PENDING | PROCESSING | COMPLETED | FAILED",
    "report_type": "string",
    "parameters": { "date_range": {...}, "format": "..." },
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    "result_url": "string | null"
  }
  Response 404: { "detail": "Job not found" }

GET /api/jobs?page=1&per_page=20
  Headers: Authorization: Bearer <token>
  Response 200: {
    "jobs": [...],
    "total": 48,
    "page": 1,
    "per_page": 20,
    "has_next": true
  }
```

### Health Endpoint (Bonus B5)
```
GET /api/health
  Response 200: {
    "status": "healthy",
    "dependencies": {
      "dynamodb": "ok",
      "sqs": "ok",
      "s3": "ok"
    },
    "timestamp": "ISO8601"
  }
```

---

## Data Models

### DynamoDB: Jobs Table
```
Table: jobs
  PK: job_id (String, UUID)
  Attributes: user_id, status, report_type, parameters, created_at, updated_at, result_url
  GSI: user_id-index
    PK: user_id (String)
    SK: created_at (String, ISO8601)
    Projection: ALL
```

### DynamoDB: Users Table
```
Table: users
  PK: user_id (String, UUID)
  Attributes: username, password_hash, created_at
  GSI: username-index
    PK: username (String)
    Projection: ALL
```

### SQS Message Format
```json
{
  "job_id": "uuid",
  "user_id": "uuid",
  "report_type": "engagement_analytics",
  "parameters": {
    "date_range": { "start": "2025-01-01", "end": "2025-12-31" },
    "format": "pdf"
  }
}
```

---

## Commit Strategy

### Commit Points (in order)
| # | Commit Message | What's Included |
|---|----------------|-----------------|
| 1 | `chore: project bootstrap` | Project structure, configs, .env.example, .gitignore, Makefile |
| 2 | `feat: backend core — config, database, auth, models` | core/, models/ — NO endpoints yet |
| 3 | `feat: REST API — jobs endpoints, auth, queue integration` | api/, services/, main.py, Dockerfile |
| 4 | `feat: async worker — SQS consumer with concurrent processing` | worker/ — consumer + processor |
| 5 | `test: backend unit and integration tests` | tests/ — all passing |
| 6 | `feat: React frontend — job form, status list, polling` | Full frontend matching DESIGN_REFERENCE |
| 7 | `infra: local development with Docker Compose + LocalStack` | local/, scripts/, docker-compose |
| 8 | `ci: GitHub Actions — lint and test on push` | .github/workflows/ci.yml |
| 9 | `infra: Terraform for AWS production` | infra/ — all AWS resources |
| 10 | `ci: full CI/CD — auto-deploy to AWS on push to main` | .github/workflows/deploy.yml |
| 11 | `docs: complete technical documentation and README` | TECHNICAL_DOCS, SKILL.md, AI_WORKFLOW, README |
| 12+ | `feat(bonus): B{N} — {description}` | Each bonus as separate commit |

### Pre-Commit Safety Check
```bash
# MUST run before every commit — descalificación if secrets leak
grep -rn "AKIA\|aws_secret_access_key\|password\s*=\s*['\"]" \
  --include="*.py" --include="*.ts" --include="*.tsx" \
  --include="*.yml" --include="*.yaml" --include="*.env" \
  --include="*.tf" --include="*.json" .

# Verify .gitignore excludes
cat .gitignore | grep -E "\.env$|__pycache__|node_modules|\.terraform"
```

### Push Frequency
- Push after EVERY commit point above
- This ensures GitHub Actions history shows incremental progress
- Early commits (1-5) will trigger CI (lint + test)
- Later commits (8-10) will include deploy stages
- **Badge must be green** at final delivery

---

## GitHub Actions Pipeline

### Stage 1: CI (`ci.yml`) — runs on every push
```yaml
# Triggered by: push to any branch
jobs:
  lint-and-test:
    steps:
      - Checkout code
      - Setup Python 3.11
      - Install backend dependencies
      - Run ruff (lint)
      - Run pytest with coverage
      - Setup Node 18
      - Install frontend dependencies
      - Run ESLint
      - Run Vitest
```

### Stage 2: Deploy (`deploy.yml`) — runs on push to main only
```yaml
# Triggered by: push to main
jobs:
  test:        # Same as CI
  build:       # Docker build + push to ECR
  deploy-infra: # Terraform apply
  deploy-app:   # Update ECS services + S3/CloudFront
  verify:       # Health check on production URL
```

### Running Locally Before Push
```bash
# Test backend
cd backend && pip install -r requirements.txt && pytest tests/ -v

# Test frontend  
cd frontend && npm install && npm test

# Full stack integration
docker compose -f local/docker-compose.yml up --build
# Then test manually: create user → login → create job → watch status
```

---

## Frontend Design Tokens (from DESIGN_REFERENCE.html)

### Tailwind Config
```typescript
// tailwind.config.ts — must match DESIGN_REFERENCE.html exactly
export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface": "#f7f9fb",
        "primary": "#000000",
        "primary-container": "#00174b",
        "surface-tint": "#0053db",
        "on-surface": "#191c1e",
        "on-surface-variant": "#45464d",
        "outline-variant": "#c6c6cd",
        "surface-container-low": "#f2f4f6",
        "surface-container": "#eceef0",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#e6e8ea",
        "secondary-container": "#d0e1fb",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-tertiary-container": "#009668",
        // ... full palette in DESIGN_REFERENCE.html
      },
      fontFamily: {
        "headline": ["Inter"],
        "body": ["Inter"],
        "label": ["Inter"],
      },
    },
  },
}
```

### Component Style Patterns
```
Labels:      text-[10px] font-black tracking-[0.1em] uppercase text-on-surface-variant
Inputs:      bg-surface-container-low border-none rounded-lg py-3 px-4 text-sm font-medium
Buttons:     bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-lg
             font-bold text-xs uppercase tracking-[0.2em]
Table rows:  bg-surface-container-lowest rounded-xl hover:shadow-md
Job IDs:     text-xs font-mono font-bold text-slate-900
Timestamps:  text-xs font-medium text-slate-500
Pagination:  text-[10px] font-bold text-slate-400 uppercase tracking-widest
```

---

## Common Patterns

### Adding a new API endpoint
1. Define Pydantic schemas in `backend/app/models/schemas.py`
2. Create router in `backend/app/api/{name}.py` with `APIRouter(prefix="/api/{name}", tags=["{name}"])`
3. Add business logic in `backend/app/services/{name}_service.py`
4. Register router in `backend/app/main.py`: `app.include_router(router)`
5. Add tests in `backend/tests/unit/` and `backend/tests/integration/`

### Publishing a message to SQS
```python
# In queue_service.py
async def publish_job(job_id: str, user_id: str, report_type: str, parameters: dict):
    message = {
        "job_id": job_id,
        "user_id": user_id,
        "report_type": report_type,
        "parameters": parameters,
    }
    await sqs_client.send_message(
        QueueUrl=settings.sqs_queue_url,
        MessageBody=json.dumps(message),
    )
```

### Worker processing a message
```python
# In consumer.py — concurrent processing loop
async def consume():
    while True:
        messages = await sqs_client.receive_message(
            QueueUrl=queue_url,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=settings.worker_poll_interval,
        )
        tasks = [process_message(msg) for msg in messages.get("Messages", [])]
        await asyncio.gather(*tasks)  # Concurrent processing

# In processor.py — simulated processing
async def process_job(job_id: str, report_type: str, parameters: dict):
    await update_job_status(job_id, "PROCESSING")
    try:
        delay = random.randint(5, 30)
        await asyncio.sleep(delay)  # Simulated processing
        result = generate_dummy_report(report_type, parameters)
        result_url = await upload_to_s3(job_id, result)
        await update_job_status(job_id, "COMPLETED", result_url=result_url)
    except Exception as e:
        await update_job_status(job_id, "FAILED")
        raise  # Let SQS handle retry via visibility timeout
```

### Frontend polling for job updates
```typescript
// In useJobs.ts
const useJobs = (pollInterval = 5000) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  
  useEffect(() => {
    const fetch = async () => {
      const data = await api.get('/api/jobs');
      setJobs(data.jobs);
    };
    fetch();
    const interval = setInterval(fetch, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);
  
  return { jobs };
};
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `docker compose up` hangs | LocalStack not ready | Add `depends_on` with healthcheck `curl localstack:4566/_localstack/health` |
| Worker doesn't consume | Wrong SQS URL | Check `AWS_ENDPOINT_URL` in worker env, must point to `http://localstack:4566` |
| CORS errors | Missing middleware | Add `CORSMiddleware` in main.py with `allow_origins=[settings.frontend_url]` |
| JWT decode fails | Clock skew in Docker | Use `datetime.now(timezone.utc)` consistently |
| DynamoDB table not found | init-aws.sh didn't run | Check LocalStack logs, verify healthcheck |
| Frontend can't reach API | Wrong VITE_API_URL | Must be `http://localhost:8000` for local dev |
| GitHub Actions fails | Missing secrets | Configure `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` in repo settings |
| Terraform state conflict | No remote backend | Use S3 backend for state or local state for simplicity |
