# Prosperas — Sistema de Procesamiento Asíncrono de Reportes

[![CI — Lint & Test](https://github.com/Joangeldelarosa/joangel-prosperas-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/Joangeldelarosa/joangel-prosperas-challenge/actions/workflows/ci.yml)
[![Deploy to AWS](https://github.com/Joangeldelarosa/joangel-prosperas-challenge/actions/workflows/deploy.yml/badge.svg)](https://github.com/Joangeldelarosa/joangel-prosperas-challenge/actions/workflows/deploy.yml)

## Aplicación en Producción

| | URL |
|--|-----|
| **Frontend** | http://prosperas-frontend-026818612421.s3-website-us-east-1.amazonaws.com |
| **API** | http://prosperas-api-alb-358203692.us-east-1.elb.amazonaws.com |
| **API Docs (Swagger)** | http://prosperas-api-alb-358203692.us-east-1.elb.amazonaws.com/docs |

---

## Descripción

Plataforma web que permite a usuarios autenticados solicitar la generación de reportes analíticos (engagement, revenue, growth) en formatos PDF, CSV o JSON. Los reportes se procesan de forma **asíncrona** mediante colas de mensajes, con actualizaciones en **tiempo real** vía WebSocket.

### Flujo del sistema

```
                        ┌─────────────────────────────────────────────────────────┐
                        │                    AWS Cloud                            │
                        │                                                         │
  Usuario ──→ React SPA ──→ ALB ──→ FastAPI API ──────→ SQS Queue ──→ Worker ──→ DynamoDB
              (S3)          │           │                   │             │
                            │           │                   ↓ (3 fallos) │
                            │           │              Dead Letter Queue │
                            │           │                                ↓
                            │           └── WebSocket (tiempo real) ←── S3 (reportes)
                            │
                            └── Health Check (/health)
```

**Flujo detallado:**
1. El usuario se registra/inicia sesión y recibe un JWT
2. Crea un reporte eligiendo tipo, rango de fechas y formato
3. La API encola el trabajo en SQS (cola estándar o de alta prioridad)
4. El Worker consume mensajes concurrentemente con `ThreadPoolExecutor`
5. Genera el reporte (PDF/CSV/JSON), lo sube a S3 y actualiza DynamoDB
6. El frontend recibe actualizaciones en tiempo real vía WebSocket
7. El usuario descarga el reporte completado mediante URL pre-firmada de S3

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | React 18, TypeScript 5.7, Vite 6, Tailwind CSS 3.4, Framer Motion | SPA moderna con tipado estricto, build rápido y animaciones fluidas |
| **Backend API** | Python 3.11, FastAPI, Pydantic v2 | Framework async de alto rendimiento con validación automática y docs OpenAPI |
| **Worker** | Python, ThreadPoolExecutor, boto3 | Procesamiento concurrente de mensajes SQS con control de paralelismo |
| **Cola de mensajes** | AWS SQS (estándar + DLQ + alta prioridad) | Cola managed, sin servidores que administrar, con reintentos automáticos |
| **Base de datos** | AWS DynamoDB | NoSQL serverless con GSIs para queries por usuario, sin gestión de servidores |
| **Almacenamiento** | AWS S3 | Almacenamiento de objetos escalable para reportes generados |
| **Cómputo** | AWS ECS Fargate | Contenedores serverless — sin EC2 que mantener, auto-scaling nativo |
| **Balanceador** | AWS ALB | Distribución de tráfico HTTP con health checks integrados |
| **Frontend hosting** | AWS S3 Static Website | Hosting de archivos estáticos de bajo costo, sin servidores |
| **Registro de imágenes** | AWS ECR | Registry privado de Docker integrado con ECS |
| **Autenticación** | JWT (HS256) + bcrypt | Tokens stateless, hashing seguro de contraseñas |
| **Infraestructura local** | Docker Compose + LocalStack | Emulación completa de AWS en local con un solo comando |
| **IaC** | Terraform (HCL) | Infraestructura versionada y reproducible |
| **CI/CD** | GitHub Actions | Integrado con el repositorio, sin herramientas externas |

---

## Decisiones de Diseño

### ¿Por qué estos servicios de AWS?

Se eligieron servicios **serverless/managed** para minimizar la carga operativa y maximizar la escalabilidad:

- **ECS Fargate** sobre EC2: No hay instancias que parchear ni clusters que dimensionar. Fargate escala automáticamente y solo se paga por el tiempo de ejecución de los contenedores. Ideal para un equipo pequeño que no quiere gestionar infraestructura.
- **DynamoDB** sobre RDS/PostgreSQL: El modelo de datos (jobs, users) es simple y accesado por key lookups + queries por usuario. DynamoDB ofrece latencia de milisegundos sin administrar servidores, backups automáticos y PAY_PER_REQUEST (sin pagar por capacidad ociosa).
- **SQS** sobre RabbitMQ/Redis: Cola de mensajes fully managed con Dead Letter Queues nativas, reintentos automáticos y garantía de entrega. No hay brokers que mantener, configurar o escalar.
- **S3 Static Website** para el frontend: Los archivos estáticos de React no necesitan un servidor — S3 los sirve directamente con alta disponibilidad y bajo costo.
- **ALB** como punto de entrada: Health checks integrados, terminación TLS y distribución de tráfico a los contenedores Fargate.

### ¿Por qué esta arquitectura?

El patrón **API + Worker + Cola** desacopla la solicitud del procesamiento:

- El usuario no espera a que el reporte se genere — recibe confirmación inmediata
- Si el worker falla, el mensaje permanece en la cola y se reintenta automáticamente
- Se pueden escalar API y Worker independientemente según la carga
- El Dead Letter Queue captura mensajes que fallan 3 veces, evitando loops infinitos

### ¿Por qué el pipeline CI/CD está diseñado así?

Se separaron **dos workflows** (`ci.yml` + `deploy.yml`) para mantener feedback rápido y deploy seguro:

- **`ci.yml` como gate de calidad**: Lint (ruff + eslint) y tests (pytest + vitest) corren en ~2 min. Si fallan, no se despliega. Esto evita romper producción por errores que un pipeline monolítico detectaría demasiado tarde.
- **`deploy.yml` secuencial con dependencias**: Cada stage depende del anterior (`CI → ECR → Terraform → ECS + Frontend → Health Check`). Si cualquier paso falla, el pipeline se detiene. La versión anterior sigue corriendo en ECS hasta que el nuevo deploy pase el health check — rollback implícito.
- **Terraform dentro del pipeline**: La infraestructura se versiona junto al código. Cualquier cambio en `infra/` se aplica automáticamente, reduciendo drift y errores humanos.
- **Health check final**: Después de desplegar, el pipeline verifica `GET /health` en la URL pública (hasta 5 reintentos). Si no responde 200, el deploy se marca como fallido.
- **Frontend separado del backend**: Se construye como archivos estáticos (Vite build) y se sube a S3. Esto desacopla los ciclos de deploy — un cambio en la UI no requiere re-deployar contenedores.

---

## Ejecución Local

### Requisitos previos

| Herramienta | Versión mínima | Instalación |
|-------------|---------------|-------------|
| **Docker Desktop** | v4.0+ | https://www.docker.com/products/docker-desktop/ |
| **Git** | 2.x+ | https://git-scm.com/ |

> **Nota:** No se necesita Python, Node.js, ni AWS CLI instalados localmente. Todo corre dentro de contenedores Docker. LocalStack emula los servicios de AWS (SQS, DynamoDB, S3) automáticamente.

### Levantar el proyecto (1 comando)

```bash
# 1. Clonar el repositorio
git clone https://github.com/Joangeldelarosa/joangel-prosperas-challenge.git
cd joangel-prosperas-challenge

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar todos los servicios
docker compose up --build
```

Esto inicia **4 servicios** automáticamente:

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **LocalStack** | `4566` | Emula SQS, DynamoDB y S3. Crea colas, tablas y bucket automáticamente al iniciar |
| **Backend (API)** | `8000` | FastAPI con endpoints REST + WebSocket |
| **Worker** | — | Consumidor SQS concurrente (misma imagen Docker, distinto entrypoint) |
| **Frontend** | `3000` | React SPA servida por nginx |

**URLs locales:**
- Frontend: http://localhost:3000
- API Docs (Swagger): http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### ¿Qué se crea automáticamente en LocalStack?

El script `local/localstack/init-aws.sh` crea al iniciar:

- **4 colas SQS**: `report-jobs`, `report-jobs-dlq`, `report-jobs-high`, `report-jobs-high-dlq`
- **2 tablas DynamoDB**: `jobs` (con GSI `user_id-index`), `users` (con GSI `username-index`)
- **1 bucket S3**: `report-results`

### Comandos de Makefile

```bash
make dev              # Levantar todos los servicios con Docker Compose
make dev-down         # Detener todos los servicios
make test             # Ejecutar todos los tests (backend + frontend)
make test-backend     # Tests del backend con cobertura (pytest + moto)
make test-frontend    # Tests del frontend (vitest + testing-library)
make lint             # Ejecutar linters (ruff + eslint)
make clean            # Limpiar artefactos de build
```

---

## Despliegue a Producción

### Flujo automatizado

Cada **push a `main`** activa el pipeline de GitHub Actions que despliega automáticamente:

```
Push a main
    │
    ▼
┌─── CI ───────────────────────────────┐
│  Backend: ruff check + pytest        │
│  Frontend: eslint + vitest           │
└──────────────┬───────────────────────┘
               │ (solo si pasa)
               ▼
┌─── Build & Push ECR ────────────────┐
│  docker build backend → ECR :latest │
└──────────────┬──────────────────────┘
               │
               ▼
┌─── Terraform Apply ─────────────────┐
│  infra/ → VPC, ALB, ECS, DynamoDB,  │
│           SQS, S3, IAM, ECR         │
│  Outputs: api_url, frontend_bucket  │
└──────┬───────────────┬──────────────┘
       │               │
       ▼               ▼
┌── Deploy ECS ──┐ ┌── Deploy Frontend ──────────┐
│  API: force    │ │  npm build (VITE_API_URL     │
│  new deploy    │ │  from Terraform output)      │
│  Worker: force │ │  aws s3 sync → S3 bucket     │
│  new deploy    │ └──────────────┬───────────────┘
│  Wait stable   │                │
└──────┬─────────┘                │
       │                          │
       ▼                          ▼
┌─── Health Check ────────────────────┐
│  curl /health (5 reintentos, 15s)   │
└─────────────────────────────────────┘
```

### Requisitos para desplegar desde cero

1. **Cuenta de AWS** con un usuario IAM con permisos para: ECS, ECR, ALB, DynamoDB, SQS, S3, VPC, IAM, CloudWatch
2. **Bucket S3 para Terraform state**: `aws s3api create-bucket --bucket prosperas-terraform-state --region us-east-1`
3. **Repositorio ECR**: `aws ecr create-repository --repository-name prosperas-api --region us-east-1`
4. **GitHub Secrets** configurados en el repositorio:

| Secret | Descripción |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Credenciales IAM para despliegue |
| `AWS_SECRET_ACCESS_KEY` | Credenciales IAM para despliegue |
| `JWT_SECRET_KEY` | Clave secreta para firmar tokens JWT en producción |

5. **Push a `main`** — el pipeline hace todo lo demás automáticamente

### Infraestructura creada por Terraform

Toda la infraestructura está definida como código en `infra/` (12 archivos `.tf`):

| Recurso | Detalle |
|---------|---------|
| **VPC** | Red privada `10.0.0.0/16` con 2 subnets públicas en `us-east-1a` y `us-east-1b` |
| **ALB** | Application Load Balancer con health check en `/health` |
| **ECS Fargate** | Cluster con 2 servicios: API (256 CPU / 512 MB) y Worker (256 CPU / 512 MB) |
| **ECR** | Repositorio de imágenes Docker (referenciado, no creado por Terraform) |
| **DynamoDB** | Tablas `prosperas-jobs` y `prosperas-users` (PAY_PER_REQUEST) con GSIs |
| **SQS** | 4 colas: estándar + DLQ, alta prioridad + DLQ (maxReceiveCount=3) |
| **S3** | Bucket para reportes + bucket para frontend (static website hosting) |
| **IAM** | Roles ECS con políticas de mínimo privilegio (solo acceso a los recursos necesarios) |
| **CloudWatch** | Log groups para API y Worker (retención 14 días) |
| **Security Groups** | ALB acepta 80/443, ECS solo acepta tráfico del ALB en puerto 8000 |

---

## API REST

| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| `POST` | `/api/auth/register` | — | Registrar usuario nuevo |
| `POST` | `/api/auth/login` | — | Iniciar sesión, devuelve JWT |
| `POST` | `/api/jobs` | JWT | Crear solicitud de reporte |
| `GET` | `/api/jobs` | JWT | Listar reportes del usuario (paginado) |
| `GET` | `/api/jobs/{job_id}` | JWT | Obtener estado de un reporte |
| `GET` | `/api/jobs/{job_id}/download` | JWT | Descargar reporte completado (redirect a URL pre-firmada S3) |
| `GET` | `/health` | — | Estado del sistema y dependencias |
| `WS` | `/ws/jobs?token=JWT` | JWT | WebSocket para actualizaciones en tiempo real |

**Tipos de reporte:** `engagement_analytics`, `revenue_breakdown`, `growth_summary`
**Formatos de salida:** `pdf`, `csv`, `json`
**Prioridad automática:** `revenue_breakdown` se encola en la cola de alta prioridad

---

## Funcionalidades Avanzadas (Bonus)

### B1 — Colas de prioridad
Sistema de dos colas SQS: estándar y alta prioridad. Los reportes de tipo `revenue_breakdown` se enrutan automáticamente a la cola de alta prioridad. El Worker consume primero la cola de alta prioridad (short poll) y luego la estándar con los slots restantes.

### B2 — Circuit Breaker
Implementación de Circuit Breaker por tipo de reporte con tres estados (CLOSED → OPEN → HALF_OPEN). Cuando un tipo de reporte falla `N` veces consecutivas, el circuito se abre y los mensajes se difieren automáticamente cambiando su visibility timeout en SQS. Tras un período de recuperación, se permite una petición de prueba (HALF_OPEN).

### B3 — Reintentos con Exponential Backoff
Los mensajes fallidos se reintentan con delays crecientes: `delay = min(base × 2^(intento-1), max)`. Con la configuración por defecto (base=10s, max=120s): 10s → 20s → 40s → 80s → 120s. Después de 3 fallos, el mensaje se mueve automáticamente al Dead Letter Queue.

### B4 — Generación real de reportes
Los reportes se generan en formato real:
- **PDF**: Documento estilizado con `reportlab` — tablas, colores, branding Prosperas
- **CSV**: Archivo estructurado con secciones de resumen y desglose
- **JSON**: Datos raw con formato legible

Los archivos se suben a S3 y se descargan mediante URLs pre-firmadas.

### B5 — WebSocket para actualizaciones en tiempo real
El backend mantiene una conexión WebSocket por usuario autenticado. Un loop de polling interno consulta DynamoDB cada 2 segundos, detecta cambios de estado y envía actualizaciones push al frontend. El frontend implementa reconnexión automática con exponential backoff (1s base, 30s máximo).

### B6 — Procesamiento concurrente del Worker
El Worker utiliza un `ThreadPoolExecutor` con concurrencia configurable (por defecto 2). Gestiona futures in-flight para no exceder la capacidad, e implementa shutdown graceful mediante señales SIGINT/SIGTERM esperando a que los trabajos activos finalicen.

---

## Testing

```bash
# Backend — 6 archivos de test (unit + integration) con moto para mocking de AWS
cd backend && pytest tests/ -v --cov=app --cov-report=term-missing

# Frontend — 8 archivos de test (componentes + hooks)
cd frontend && npm test
```

Los tests del backend usan [moto](https://github.com/getmoto/moto) para emular DynamoDB, SQS y S3 — no requieren infraestructura real ni LocalStack corriendo.

Los tests del frontend usan [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) para testing de componentes y hooks.

---

## Estructura del Proyecto

```
├── backend/
│   ├── app/
│   │   ├── api/                # Routers: auth, jobs, health, websocket
│   │   ├── core/               # Config, database, security, excepciones
│   │   ├── models/             # Modelos de datos + schemas Pydantic
│   │   ├── services/           # Lógica de negocio (jobs, queue, users)
│   │   └── worker/             # Consumidor SQS + procesador + circuit breaker
│   ├── tests/                  # Unit + integration tests (pytest + moto)
│   ├── Dockerfile              # Multi-stage: python:3.11-slim
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # 8 componentes React (Layout, Forms, Lists, etc.)
│   │   ├── hooks/              # useAuth (JWT), useJobs (polling + WebSocket)
│   │   ├── services/           # Cliente Axios con interceptor JWT
│   │   ├── types/              # Interfaces TypeScript
│   │   └── __tests__/          # 8 archivos de test (vitest + testing-library)
│   ├── Dockerfile              # Multi-stage: node:18 → nginx:alpine (puerto 3000)
│   └── nginx.conf              # SPA fallback + headers de seguridad
├── infra/                      # Terraform HCL (12 archivos)
│   ├── main.tf                 # Provider AWS, backend S3 para state
│   ├── vpc.tf                  # VPC, subnets, IGW, security groups
│   ├── alb.tf                  # Application Load Balancer + target group
│   ├── ecs.tf                  # Cluster, task definitions, servicios Fargate
│   ├── ecr.tf                  # Data source del repositorio ECR
│   ├── dynamodb.tf             # Tablas jobs + users con GSIs
│   ├── sqs.tf                  # 4 colas (estándar + DLQ, alta prioridad + DLQ)
│   ├── s3.tf                   # Buckets de reportes y frontend (static website)
│   ├── iam.tf                  # Roles con least-privilege para ECS tasks
│   ├── variables.tf            # Variables configurables
│   └── outputs.tf              # URLs y ARNs de salida
├── local/
│   ├── docker-compose.yml      # 4 servicios: localstack, backend, worker, frontend
│   └── localstack/
│       └── init-aws.sh         # Crea colas SQS, tablas DynamoDB, bucket S3
├── scripts/                    # Scripts de utilidad (init-db, seed-data, cleanup)
├── .github/workflows/
│   ├── ci.yml                  # Lint + Test (push a main)
│   └── deploy.yml              # CI → ECR → Terraform → ECS → S3 → Health Check
├── TECHNICAL_DOCS.md           # Documentación técnica completa
├── AI_WORKFLOW.md              # Evidencia de uso de IA en el desarrollo
├── DESIGN_REFERENCE.html       # Referencia visual del diseño frontend
└── SKILL.md                    # Guía de troubleshooting y patrones del proyecto
```

---

## Variables de Entorno

Configuradas en `.env.example` (copiar a `.env` para desarrollo local):

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `APP_ENV` | `development` | Entorno de ejecución |
| `FRONTEND_URL` | `http://localhost:3000` | URL del frontend (para CORS) |
| `AWS_ENDPOINT_URL` | `http://localhost.localstack.cloud:4566` | Endpoint LocalStack (no se configura en producción) |
| `JWT_SECRET_KEY` | `change-me-in-production` | Clave para firmar tokens JWT |
| `JWT_EXPIRATION_MINUTES` | `60` | Duración del token JWT |
| `WORKER_CONCURRENCY` | `4` | Número de workers concurrentes |
| `SQS_QUEUE_NAME` | `report-jobs` | Cola SQS estándar |
| `SQS_HIGH_PRIORITY_QUEUE_NAME` | `report-jobs-high` | Cola SQS de alta prioridad |
| `DYNAMODB_JOBS_TABLE` | `jobs` | Tabla de trabajos |
| `DYNAMODB_USERS_TABLE` | `users` | Tabla de usuarios |
| `S3_BUCKET_NAME` | `report-results` | Bucket para reportes generados |
| `CIRCUIT_BREAKER_THRESHOLD` | `3` | Fallos antes de abrir el circuito |
| `RETRY_BASE_DELAY` | `10` | Delay base para reintentos (segundos) |
| `RETRY_MAX_DELAY` | `120` | Delay máximo para reintentos (segundos) |

---

## Documentación Adicional

- [TECHNICAL_DOCS.md](TECHNICAL_DOCS.md) — Arquitectura detallada, modelos de datos, decisiones de diseño, guía de despliegue
- [AI_WORKFLOW.md](AI_WORKFLOW.md) — Evidencia de uso de IA durante el desarrollo
- [DESIGN_REFERENCE.html](DESIGN_REFERENCE.html) — Referencia visual del diseño del frontend (abrir en navegador)
- [SKILL.md](SKILL.md) — Guía de troubleshooting y patrones del proyecto

---

## Desarrollado con IA

Este proyecto fue desarrollado usando **GitHub Copilot (Claude)** como asistente de pair-programming con IA. Ver [AI_WORKFLOW.md](AI_WORKFLOW.md) para evidencia detallada del uso de IA a lo largo del proceso de desarrollo.
