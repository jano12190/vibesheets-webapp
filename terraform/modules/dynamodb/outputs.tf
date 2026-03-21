output "time_entries_table_name" {
  description = "Name of the time entries DynamoDB table"
  value       = aws_dynamodb_table.time_entries.name
}

output "time_entries_table_arn" {
  description = "ARN of the time entries DynamoDB table"
  value       = aws_dynamodb_table.time_entries.arn
}

output "projects_table_name" {
  description = "Name of the projects DynamoDB table"
  value       = aws_dynamodb_table.projects.name
}

output "projects_table_arn" {
  description = "ARN of the projects DynamoDB table"
  value       = aws_dynamodb_table.projects.arn
}

output "date_index_name" {
  description = "Name of the date GSI on time entries table"
  value       = "date-index"
}
