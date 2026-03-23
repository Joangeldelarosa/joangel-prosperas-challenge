output "api_url" {
  description = "Public URL of the API (ALB DNS)"
  value       = "http://${aws_lb.api.dns_name}"
}

output "frontend_url" {
  description = "CloudFront distribution URL for the frontend"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "ecr_api_repository_url" {
  description = "ECR repository URL for API image"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_frontend_repository_url" {
  description = "ECR repository URL for frontend image"
  value       = aws_ecr_repository.frontend.repository_url
}

output "s3_frontend_bucket" {
  description = "S3 bucket for frontend static files"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "sqs_queue_url" {
  description = "SQS queue URL"
  value       = aws_sqs_queue.report_jobs.url
}
