output "api_url" {
  description = "Public URL of the API (ALB DNS)"
  value       = "http://${aws_lb.api.dns_name}"
}

output "frontend_url" {
  description = "S3 static website URL for the frontend"
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "ecr_api_repository_url" {
  description = "ECR repository URL for API image"
  value       = data.aws_ecr_repository.api.repository_url
}

output "s3_frontend_bucket" {
  description = "S3 bucket for frontend static files"
  value       = aws_s3_bucket.frontend.id
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "sqs_queue_url" {
  description = "SQS queue URL"
  value       = aws_sqs_queue.report_jobs.url
}
