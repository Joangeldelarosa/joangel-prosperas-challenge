# AI_WORKFLOW.md — Evidencia de Uso de IA

> Este documento registra cómo se utilizó la IA (GitHub Copilot con Claude) durante el desarrollo del proyecto Prosperas.

---

## Herramienta Utilizada

| Campo | Detalle |
|-------|---------|
| **Herramienta** | GitHub Copilot |
| **Modelo** | Claude (Anthropic) |
| **Interfaz** | VS Code — Copilot Chat (Agent Mode) |
| **Período** | Marzo 2026 |

---

## Metodología de Trabajo

Se utilizaron dos agentes especializados configurados como modos de Copilot:

### 1. Challenge Architect (Planificador)
- **Rol**: Analizar requisitos, diseñar arquitectura, definir especificaciones técnicas
- **Outputs**: `TECHNICAL_DOCS.md`, `SKILL.md`, estructura del repositorio, decisiones de diseño
- **Patrón**: Recibe el challenge → produce documentación técnica detallada con diagramas Mermaid

### 2. Challenge Developer (Ejecutor)
- **Rol**: Implementar código siguiendo las especificaciones del Arquitecto
- **Outputs**: Todo el código fuente, tests, infraestructura, CI/CD
- **Patrón**: Lee especificaciones → implementa → ejecuta tests → commitea

### Flujo de trabajo
```
Challenge Architect → specs/docs → Challenge Developer → implementation → tests → commit
```

---

## Fases de Desarrollo con IA

### Fase 1: Project Bootstrap
- **Prompt**: "Planifica y desarrolla todas las fases del challenge de forma autónoma"
- **IA generó**: `pyproject.toml`, `requirements.txt`, `ruff.toml`, estructura frontend con Vite + Tailwind + TypeScript, `.env.example`, `.gitignore`, `Makefile`
- **Decisiones de IA**: Eligió Python 3.11 + FastAPI por los requisitos, Pydantic v2 por ser la versión actual, Vite sobre CRA por velocidad

### Fase 2: Backend Core
- **IA generó**: `config.py` (Pydantic Settings), `database.py` (boto3 DynamoDB), `security.py` (JWT + bcrypt), `exceptions.py` (jerarquía custom), modelos de datos
- **Decisión de IA**: Usar `dataclass` para modelos internos + Pydantic `BaseModel` para schemas de request/response — separación clara entre representación interna y API

### Fase 3: Backend API
- **IA generó**: Routers de auth y jobs, servicios de negocio, integración SQS, `main.py` con CORS y exception handlers, Dockerfile multi-stage
- **Decisión de IA**: Paginación server-side sobre GSI `user_id-index` con `ScanIndexForward=False` para orden descendente por fecha

### Fase 4: Worker
- **IA generó**: Consumer con `ThreadPoolExecutor` para procesamiento concurrente, processor con simulación de reportes, entrypoint separado
- **Decisión de IA**: `ThreadPoolExecutor` en lugar de `asyncio` puro porque el procesamiento simulado (sleep) es CPU-bound/blocking, y el thread pool permite concurrencia real sin complicar con event loops

### Fase 5: Backend Tests
- **IA generó**: 48 tests — unitarios (modelos, servicios) + integración (API endpoints completos)
- **Problema resuelto por IA**: Incompatibilidad entre `bcrypt==5.0.0` y `passlib==1.7.4` en Python 3.13. La IA diagnosticó el error, investigó la causa, y fijó `bcrypt==4.2.1`
- **Problema resuelto por IA**: Conflicto de versiones entre `boto3`, `aiobotocore` y `moto`. Resuelto flexibilizando los constraints de versión

### Fase 6: Frontend
- **IA generó**: Todos los componentes React siguiendo `DESIGN_REFERENCE.html` — Layout, LoginForm, JobForm, JobList, JobStatusBadge, SummaryCards, ErrorBoundary, ErrorNotification
- **IA generó**: Custom hooks (`useAuth`, `useJobs` con polling), servicio API con Axios + JWT interceptor
- **Decisión de IA**: Palette de colores extraída del HTML de referencia y mapeada a tokens de Tailwind custom

### Fase 7: Local Infrastructure
- **IA generó**: `docker-compose.yml` completo con healthchecks, `init-aws.sh` para LocalStack (crea SQS, DynamoDB, S3), scripts utilitarios
- **Decisión de IA**: Usar `localhost.localstack.cloud:4566` como endpoint para garantizar resolución DNS correcta en containers

### Fase 8: CI Pipeline
- **IA generó**: `.github/workflows/ci.yml` — pipeline de lint + test para backend (ruff + pytest) y frontend (eslint + vitest)
- **Decisión de IA**: Usar `workflow_call` para hacer el workflow reutilizable desde `deploy.yml`

### Fase 9: Production Infrastructure
- **IA generó**: 13 archivos Terraform: VPC (2 AZs), ECS Fargate (API + Worker), ALB, DynamoDB, SQS, S3 (reports + frontend), CloudFront con OAC, ECR con lifecycle policies, IAM con least-privilege, CloudWatch
- **Decisión de IA**: Usar `PAY_PER_REQUEST` para DynamoDB (sin provisioned capacity) por simplicidad y costo cero en idle

### Fase 10: CI/CD Deploy Pipeline
- **IA generó**: `.github/workflows/deploy.yml` — pipeline completo: CI → Build & Push ECR → Terraform Apply → Deploy ECS → Deploy Frontend (S3 + CloudFront invalidation) → Health Check
- **Decisión de IA**: Separar frontend deploy como artifact upload + S3 sync (en lugar de container) para menor latencia y costo

### Fase 11: Documentation & Polish
- **IA generó**: `README.md`, `AI_WORKFLOW.md` (este documento), actualización de `TECHNICAL_DOCS.md`, `SKILL.md`
- **IA actualizó**: Estructura del repositorio, endpoints de LocalStack, coherencia entre docs y código real

---

## Tipos de Asistencia de la IA

| Categoría | Ejemplos |
|-----------|----------|
| **Generación de código** | Todos los archivos Python, TypeScript, HCL, YAML, Dockerfiles |
| **Diseño de arquitectura** | Diagramas Mermaid, decisiones de diseño documentadas, selección de servicios AWS |
| **Debugging** | Diagnóstico de incompatibilidad bcrypt/passlib, conflictos de dependencias boto3/moto |
| **Testing** | Generación de 48+ tests con moto para mocking de AWS |
| **DevOps** | Docker Compose, GitHub Actions workflows, Terraform modules |
| **Documentación** | TECHNICAL_DOCS.md con diagramas, tablas de API, guías de setup |

---

## Prompts Clave Utilizados

1. **Inicio**: *"De forma totalmente autónoma y precisa vas a planificar y desarrollar todas las fases, haciendo los commits al repo"*
2. **Corrección de curso**: *"Debes ir commiteando mientras vas desarrollando, no hacerlo todo al final"*
3. **CI requirement**: *"Los tests también deberían ejecutarse en GitHub al subir un commit"*
4. **Calidad**: *"Da el mejor resultado posible y continúa hasta que todo esté totalmente listo"*

---

## Verificación de No-Descalificación

Checks ejecutados por la IA antes de cada commit:

- ✅ Sin credenciales hardcodeadas (`grep` para AKIA, aws_secret, passwords)
- ✅ `.env.example` solo tiene valores de desarrollo/placeholder
- ✅ JWT secret viene de variable de entorno
- ✅ Tests pasan localmente antes de push
- ✅ Linters pasan sin warnings
- ✅ GitHub Actions configurado y ejecutándose
