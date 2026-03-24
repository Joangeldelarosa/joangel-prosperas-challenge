# ECR Repository — created manually before first deploy, referenced as data source
data "aws_ecr_repository" "api" {
  name = "${var.project_name}-api"
}
