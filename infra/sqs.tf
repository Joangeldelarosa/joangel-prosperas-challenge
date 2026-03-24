# SQS Queues
resource "aws_sqs_queue" "report_jobs_dlq" {
  name                      = "${var.project_name}-report-jobs-dlq"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "report_jobs" {
  name                       = "${var.project_name}-report-jobs"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400 # 1 day

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.report_jobs_dlq.arn
    maxReceiveCount     = 3
  })
}

# High-Priority SQS Queues
resource "aws_sqs_queue" "report_jobs_high_dlq" {
  name                      = "${var.project_name}-report-jobs-high-dlq"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "report_jobs_high" {
  name                       = "${var.project_name}-report-jobs-high"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400 # 1 day

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.report_jobs_high_dlq.arn
    maxReceiveCount     = 3
  })
}
