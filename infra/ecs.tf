# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.project_name}/api"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/ecs/${var.project_name}/worker"
  retention_in_days = 14
}

# API Task Definition
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project_name}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.api_container_cpu
  memory                   = var.api_container_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "api"
    image = "${aws_ecr_repository.api.repository_url}:latest"
    portMappings = [{
      containerPort = 8000
      protocol      = "tcp"
    }]
    environment = [
      { name = "APP_ENV", value = "production" },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "SQS_QUEUE_NAME", value = aws_sqs_queue.report_jobs.name },
      { name = "SQS_DLQ_NAME", value = aws_sqs_queue.report_jobs_dlq.name },
      { name = "DYNAMODB_JOBS_TABLE", value = aws_dynamodb_table.jobs.name },
      { name = "DYNAMODB_USERS_TABLE", value = aws_dynamodb_table.users.name },
      { name = "S3_BUCKET_NAME", value = aws_s3_bucket.reports.id },
      { name = "JWT_SECRET_KEY", value = var.jwt_secret_key },
      { name = "FRONTEND_URL", value = "https://${aws_cloudfront_distribution.frontend.domain_name}" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }
  }])
}

# Worker Task Definition
resource "aws_ecs_task_definition" "worker" {
  family                   = "${var.project_name}-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.worker_container_cpu
  memory                   = var.worker_container_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name    = "worker"
    image   = "${aws_ecr_repository.api.repository_url}:latest"
    command = ["python", "-m", "app.worker"]
    environment = [
      { name = "APP_ENV", value = "production" },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "SQS_QUEUE_NAME", value = aws_sqs_queue.report_jobs.name },
      { name = "SQS_DLQ_NAME", value = aws_sqs_queue.report_jobs_dlq.name },
      { name = "DYNAMODB_JOBS_TABLE", value = aws_dynamodb_table.jobs.name },
      { name = "DYNAMODB_USERS_TABLE", value = aws_dynamodb_table.users.name },
      { name = "S3_BUCKET_NAME", value = aws_s3_bucket.reports.id },
      { name = "JWT_SECRET_KEY", value = var.jwt_secret_key },
      { name = "WORKER_CONCURRENCY", value = "2" },
      { name = "WORKER_POLL_INTERVAL", value = "5" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.worker.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "worker"
      }
    }
  }])
}

# API Service
resource "aws_ecs_service" "api" {
  name            = "${var.project_name}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_a.id, aws_subnet.public_b.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.api]
}

# Worker Service
resource "aws_ecs_service" "worker" {
  name            = "${var.project_name}-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_a.id, aws_subnet.public_b.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }
}
