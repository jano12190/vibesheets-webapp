output "sns_topic_arn" {
  description = "ARN of the SNS topic for alarms (if created)"
  value       = var.alarm_email != null ? aws_sns_topic.alarms[0].arn : null
}

output "lambda_error_alarm_arn" {
  description = "ARN of the Lambda errors alarm"
  value       = aws_cloudwatch_metric_alarm.lambda_errors.arn
}

output "api_5xx_alarm_arn" {
  description = "ARN of the API 5xx errors alarm"
  value       = aws_cloudwatch_metric_alarm.api_5xx_errors.arn
}
