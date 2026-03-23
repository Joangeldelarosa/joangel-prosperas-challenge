---
name: challenge-architect
description: "Analyzes technical challenges and coding tests to produce AWS deployment plans, repository structures, and implementation roadmaps. Use when: receiving a technical challenge document, planning AWS architecture for a coding test, defining repository structure for a take-home assignment, creating implementation plans for tech assessments, ensuring documentation coherence across SKILL.md and TECHNICAL_DOCS.md."
argument-hint: "Describe what you need: plan, review, validate, or check coherence"
---

# Challenge Architect — Skill de Planificación

## Sistema: Procesamiento Asíncrono de Reportes (Prosperas)

### Qué hace
Plataforma SaaS donde usuarios generan reportes de datos bajo demanda. El procesamiento es asíncrono (5s–minutos), con cola de mensajes AWS, workers concurrentes, y frontend con visibilidad en tiempo real.

### Stack obligatorio
- **Backend**: Python 3.11+ / FastAPI
- **Frontend**: React 18+
- **Cloud**: AWS (servicios a elección)
- **Dev local**: LocalStack + Docker Compose
- **CI/CD**: GitHub Actions → deploy a AWS real

---

## Mapa del Repositorio

```
joangel-prosperas-challenge/
├── .github/
│   ├── agents/                    # Agentes de IA personalizados
│   │   ├── challenge-architect.agent.md  # Planificador — NO escribe código
│   │   └── challenge-developer.agent.md  # Ejecutor — implementa el código
│   ├── skills/                    # Skills para agentes
│   │   ├── challenge-architect/
│   │   │   └── SKILL.md           # Este archivo (skill de planificación)
│   │   └── challenge-developer/
│   │       └── SKILL.md           # Guía de implementación y patrones
│   └── workflows/                 # GitHub Actions CI/CD
│       ├── ci.yml                 # Lint + Test on every push
│       └── deploy.yml             # Full deploy to AWS on push to main
├── backend/                       # FastAPI app + worker
│   ├── app/
│   │   ├── api/                   # Routers FastAPI (jobs, auth, health)
│   │   │   ├── __init__.py
│   │   │   ├── jobs.py            # POST/GET /jobs endpoints
│   │   │   ├── auth.py            # JWT login/register
│   │   │   └── health.py          # GET /health (bonus B5)
│   │   ├── core/                  # Config, auth middleware, DB setup
│   │   │   ├── __init__.py
│   │   │   ├── config.py          # Settings desde env vars
│   │   │   ├── security.py        # JWT encode/decode, password hashing
│   │   │   ├── database.py        # Conexión a BD AWS
│   │   │   └── exceptions.py      # Manejo centralizado de errores
│   │   ├── models/                # Pydantic v2 + ORM models
│   │   │   ├── __init__.py
│   │   │   ├── job.py             # Job model (job_id, user_id, status, ...)
│   │   │   ├── user.py            # User model
│   │   │   └── schemas.py         # Request/Response schemas Pydantic
│   │   ├── services/              # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── job_service.py     # Crear job, publicar a cola, consultar
│   │   │   └── queue_service.py   # Publicar mensajes a SQS
│   │   └── worker/                # Queue consumer + processor
│   │       ├── __init__.py
│   │       ├── consumer.py        # Consume mensajes de SQS
│   │       ├── processor.py       # Procesa job (sleep simulado + datos dummy)
│   │       └── circuit_breaker.py # Bonus B2: Circuit Breaker pattern
│   ├── tests/
│   │   ├── unit/                  # Tests unitarios
│   │   ├── integration/           # Tests de integración con LocalStack
│   │   └── conftest.py            # Fixtures pytest
│   ├── Dockerfile                 # Multi-stage build para producción
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/                      # React app
│   ├── src/
│   │   ├── components/            # UI components
│   │   │   ├── Layout.tsx         # Header + contenedor principal
│   │   │   ├── LoginForm.tsx      # Formulario de auth
│   │   │   ├── JobForm.tsx        # Formulario: report_type, date_range, format
│   │   │   ├── JobList.tsx        # Lista de jobs con badges de colores
│   │   │   ├── JobStatusBadge.tsx # Badge: PENDING/PROCESSING/COMPLETED/FAILED
│   │   │   ├── SummaryCards.tsx   # Cards de estadísticas del footer
│   │   │   ├── ErrorBoundary.tsx  # React error boundary
│   │   │   └── ErrorNotification.tsx # Toast/snackbar errores (NO alert())
│   │   ├── hooks/                 # Custom hooks
│   │   │   ├── useJobs.ts         # Fetch/polling/websocket para jobs
│   │   │   └── useAuth.ts        # Manejo de JWT auth
│   │   ├── services/              # API calls
│   │   │   └── api.ts             # Axios/fetch wrapper con auth headers
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── infra/                         # Infrastructure as Code para AWS producción
│   ├── main.tf                    # o CDK/SAM equivalente
│   ├── variables.tf
│   └── outputs.tf
├── local/                         # Docker Compose + LocalStack (desarrollo)
│   ├── docker-compose.yml         # Levanta TODO con `docker compose up`
│   ├── localstack/
│   │   └── init-aws.sh            # Script para crear recursos en LocalStack
│   └── .env.local
├── scripts/                       # Scripts de utilidad
│   ├── init-db.sh                 # Inicializar schema de BD
│   ├── seed-data.sh               # Datos de prueba
│   └── deploy.sh                  # Deploy manual a AWS
├── .env.example                   # Variables de entorno (SIN secrets reales)
├── docker-compose.yml             # Compose principal (referencia a local/)
├── Makefile                       # Comandos frecuentes
├── README.md                      # Setup, URL producción, badge CI/CD, decisiones
├── DESIGN_REFERENCE.html          # Diseño visual de referencia para frontend
├── TECHNICAL_DOCS.md              # Documentación técnica completa
├── SKILL.md                       # Contexto para agentes IA (raíz)
└── AI_WORKFLOW.md                 # Evidencia de uso de IA
```

---

## API Endpoints

| Método | Ruta | Descripción | Auth | Response |
|--------|------|-------------|------|----------|
| `POST` | `/api/auth/register` | Registrar usuario | No | `{ user_id, token }` |
| `POST` | `/api/auth/login` | Login usuario | No | `{ token }` |
| `POST` | `/api/jobs` | Crear nuevo job de reporte | JWT | `{ job_id, status: 'PENDING' }` |
| `GET` | `/api/jobs/{job_id}` | Estado y resultado del job | JWT | `{ job_id, status, result_url?, ... }` |
| `GET` | `/api/jobs` | Listar jobs del usuario (paginado) | JWT | `{ jobs: [...], total, page, per_page }` |
| `GET` | `/api/health` | Estado del sistema (bonus B5) | No | `{ status, dependencies: {...} }` |

### Modelo de Datos — Job

```python
class Job:
    job_id: str          # UUID v4
    user_id: str         # FK al usuario autenticado
    status: str          # PENDING | PROCESSING | COMPLETED | FAILED
    report_type: str     # Tipo de reporte solicitado
    parameters: dict     # { date_range, format, ... }
    created_at: datetime
    updated_at: datetime
    result_url: str | None  # URL del resultado cuando COMPLETED
```

### Estados del Job (máquina de estados)

```
PENDING ──→ PROCESSING ──→ COMPLETED
                │
                └──→ FAILED (con retry según estrategia)
```

---

## Patrones del Proyecto

### Cómo agregar una nueva ruta al backend
1. Crear router en `backend/app/api/new_router.py`
2. Definir schemas Pydantic en `backend/app/models/schemas.py`
3. Implementar lógica en `backend/app/services/new_service.py`
4. Registrar router en `backend/app/main.py` con `app.include_router()`
5. Agregar tests en `backend/tests/`

### Cómo publicar un mensaje a la cola
1. Importar `queue_service` desde `backend/app/services/queue_service.py`
2. Llamar `await queue_service.publish_message({ job_id, report_type, parameters })`
3. El servicio usa boto3 para enviar a SQS
4. El mensaje incluye: `job_id`, `report_type`, `parameters`, `user_id`

### Cómo leer el estado de un job
1. `GET /api/jobs/{job_id}` consulta la BD
2. Si el job pertenece al usuario autenticado, devuelve estado actual
3. Si `status == 'COMPLETED'`, incluye `result_url`
4. Si el job no existe o no pertenece al usuario → 404

### Cómo funciona el worker
1. El worker hace polling a SQS en un loop infinito
2. Recibe mensajes en batches (hasta 10)
3. Para cada mensaje, lanza procesamiento concurrente (asyncio/threading)
4. Actualiza estado en BD: `PENDING → PROCESSING → COMPLETED/FAILED`
5. Si falla: el mensaje vuelve a la cola (visibility timeout) o va a DLQ tras N intentos
6. Procesamiento simulado: `time.sleep(random.randint(5, 30))` + genera JSON dummy

### Cómo agregar un nuevo tipo de reporte
1. Agregar el tipo en el enum/lista de `report_type` en `backend/app/models/schemas.py`
2. En `backend/app/worker/processor.py`, agregar handler para el nuevo tipo
3. En el frontend, agregar opción al select de `report_type` en `JobForm.tsx`
4. El resto del pipeline (cola, worker, BD) es genérico y no requiere cambios
5. Agregar test unitario del nuevo processor handler

---

## Servicios AWS — Decisiones de Arquitectura

| Componente | Servicio AWS | Justificación |
|------------|-------------|---------------|
| Cola de mensajes | **SQS** (Standard Queue) | Fully managed, free tier (1M requests/mes), integración nativa con DLQ, visibilidad timeout para reintentos |
| Dead Letter Queue | **SQS DLQ** | Mensajes que fallan N veces se mueven aquí automáticamente, sin perderlos |
| Base de datos | **DynamoDB** | Serverless, free tier (25 GB + 25 WCU/RCU), queries eficientes por partition key (user_id), no requiere gestión de servidor |
| Compute (API) | **ECS Fargate** | Containerizado, sin gestión de servidores, escala automáticamente |
| Compute (Worker) | **ECS Fargate** (servicio separado) | Mismo container, distinto entrypoint, escala independiente |
| Frontend hosting | **S3 + CloudFront** | Estático, barato, CDN global, HTTPS gratis |
| IaC | **Terraform** / **AWS CDK** | Infraestructura reproducible, versionada |
| Monitoreo | **CloudWatch** | Logs centralizados, métricas, alarms — incluido en free tier |
| Almacenamiento reportes | **S3** | Reportes generados se guardan como objetos, result_url apunta aquí |

### Alternativas descartadas y por qué
- **RDS/PostgreSQL**: Más familiar pero requiere instancia 24/7, no es serverless. DynamoDB es mejor para este patrón key-value con queries simples.
- **SNS**: Para fan-out, no para job queue. SQS es el servicio correcto para cola de trabajos.
- **Lambda**: Límite de 15 min, el procesamiento simulado puede acercarse. Fargate sin límite de tiempo.
- **EC2**: Requiere gestión de servidor, no justificado para este scope.
- **ElasticBeanstalk**: Demasiado opaco, pierde transparencia en decisiones de infra.

---

## Comandos Frecuentes

```bash
# Levantar entorno local completo (LocalStack + backend + frontend + worker)
docker compose -f local/docker-compose.yml up --build

# Correr tests backend
cd backend && pytest tests/ -v --cov=app --cov-report=term-missing

# Correr tests frontend
cd frontend && npm test

# Deploy manual a AWS (si no usas CI/CD)
cd infra && terraform apply -auto-approve

# Ver logs del worker
docker compose -f local/docker-compose.yml logs -f worker

# Inicializar schema de BD (LocalStack)
./scripts/init-db.sh

# Lint backend
cd backend && ruff check app/

# Lint frontend
cd frontend && npm run lint
```

---

## Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `docker compose up` falla con "port already in use" | Otro servicio usando el puerto | `docker compose down` o cambiar puerto en `.env` |
| SQS timeout en LocalStack | LocalStack tarda en inicializar | Agregar `depends_on` con health check en compose |
| JWT "token expired" | Token expirado o clock skew en container | Verificar sincronización de reloj, aumentar `exp` para dev |
| DynamoDB "ResourceNotFoundException" | Tabla no creada | Ejecutar `./scripts/init-db.sh` o verificar `init-aws.sh` |
| Worker no consume mensajes | URL de SQS incorrecta o permisos | Verificar `AWS_ENDPOINT_URL` en `.env` para LocalStack |
| CORS error en frontend | Backend no permite origin del frontend | Agregar `CORSMiddleware` en FastAPI con origins correctos |
| `Pydantic validation error` | Payload no cumple schema | Revisar campos requeridos en el schema Pydantic |

---

## Variables de Entorno (.env.example)

```env
# === App ===
APP_ENV=development                    # development | production
APP_PORT=8000                          # Puerto del backend
FRONTEND_URL=http://localhost:3000     # Para CORS

# === AWS ===
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test                 # Para LocalStack: 'test'
AWS_SECRET_ACCESS_KEY=test             # Para LocalStack: 'test'
AWS_ENDPOINT_URL=http://localhost.localstack.cloud:4566  # Solo para desarrollo local

# === SQS ===
SQS_QUEUE_NAME=report-jobs
SQS_DLQ_NAME=report-jobs-dlq
SQS_MAX_RECEIVE_COUNT=3               # Reintentos antes de DLQ

# === DynamoDB ===
DYNAMODB_TABLE_NAME=jobs
DYNAMODB_USERS_TABLE=users

# === JWT ===
JWT_SECRET_KEY=change-me-in-production  # NUNCA commitear el valor real
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60

# === Worker ===
WORKER_CONCURRENCY=2                   # Mínimo 2 workers paralelos
WORKER_POLL_INTERVAL=5                 # Segundos entre polls a SQS

# === S3 ===
S3_BUCKET_NAME=report-results          # Bucket para reportes generados
```

---

## Coherence Checklist — Validar Siempre

### Requisitos vs Implementación
- [ ] R1: POST /api/jobs devuelve inmediatamente { job_id, status: PENDING }
- [ ] R2: API publica a SQS, worker consume de SQS — están desacoplados
- [ ] R3: Worker procesa >= 2 mensajes en paralelo (WORKER_CONCURRENCY >= 2)
- [ ] R4: Estado persistido en DynamoDB con todos los campos del modelo
- [ ] R5: DLQ configurada, visibility timeout, mensajes no se pierden
- [ ] R6: Frontend actualiza estado automáticamente (polling o WebSocket)

### Core Requirements vs Archivos
- [ ] 3.1: `backend/app/api/jobs.py` tiene POST/GET /api/jobs endpoints, JWT, Pydantic, error handlers
- [ ] 3.2: `backend/app/services/queue_service.py` publica a SQS, `backend/app/worker/` consume
- [ ] 3.3: `backend/app/core/database.py` conecta a DynamoDB, modelo tiene todos los campos
- [ ] 3.4: `frontend/src/components/` tiene formulario, lista, badges, responsive
- [ ] 3.5: `local/docker-compose.yml` + LocalStack funciona con `docker compose up`
- [ ] 3.6: `.github/workflows/deploy.yml` despliega a AWS real al push
- [ ] 3.7: `TECHNICAL_DOCS.md` + `SKILL.md` + `AI_WORKFLOW.md` presentes y completos

### Descalificaciones — Verificar en CADA revisión
- [ ] NINGÚN secret/credencial/password en el código commiteado
- [ ] `docker compose up` funciona siguiendo README
- [ ] App desplegada en AWS con URL pública accesible
- [ ] Pipeline GitHub Actions tiene historial de ejecuciones
- [ ] SQS (u otro servicio de colas AWS) utilizado
- [ ] Worker tiene concurrencia real
- [ ] Usuario IAM creado para revisión
- [ ] TECHNICAL_DOCS.md y SKILL.md existen en el repo

---

## Preguntas del Test en Vivo que el SKILL.md debe responder

1. **¿Cómo funciona el worker? ¿Qué pasa si falla el procesamiento?**
   → Ver "Cómo funciona el worker" + R5 resiliencia + DLQ

2. **¿Qué servicio de AWS se usa para la cola y por qué?**
   → SQS Standard. Ver tabla "Servicios AWS" + "Alternativas descartadas"

3. **¿Cómo agrego un nuevo tipo de reporte al sistema?**
   → Ver "Cómo agregar un nuevo tipo de reporte" (5 pasos)

4. **¿Cómo levanto el entorno local desde cero?**
   → Ver "Comandos Frecuentes" → `docker compose up`

5. **¿Qué hace exactamente el endpoint POST /jobs?**
   → Ver "API Endpoints" + "Cómo publicar un mensaje a la cola"
