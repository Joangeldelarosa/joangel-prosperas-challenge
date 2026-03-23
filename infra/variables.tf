variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "prosperas"
}

variable "jwt_secret_key" {
  description = "Secret key for JWT token signing"
  type        = string
  sensitive   = true
}

variable "frontend_domain" {
  description = "Custom domain for frontend (optional)"
  type        = string
  default     = ""
}

variable "api_container_cpu" {
  description = "CPU units for API container (1024 = 1 vCPU)"
  type        = number
  default     = 256
}

variable "api_container_memory" {
  description = "Memory (MB) for API container"
  type        = number
  default     = 512
}

variable "worker_container_cpu" {
  description = "CPU units for worker container"
  type        = number
  default     = 256
}

variable "worker_container_memory" {
  description = "Memory (MB) for worker container"
  type        = number
  default     = 512
}
