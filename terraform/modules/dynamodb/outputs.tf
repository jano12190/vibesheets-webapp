output "table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.time_entries.name
}

output "table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.time_entries.arn
}

output "date_index_name" {
  description = "Name of the date GSI"
  value       = "date-index"
}
