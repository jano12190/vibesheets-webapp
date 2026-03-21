# =============================================================================
# DynamoDB Outputs
# =============================================================================
output "time_entries_table_name" {
  description = "Name of the DynamoDB time entries table"
  value       = module.dynamodb.time_entries_table_name
}

output "time_entries_table_arn" {
  description = "ARN of the DynamoDB time entries table"
  value       = module.dynamodb.time_entries_table_arn
}

output "projects_table_name" {
  description = "Name of the DynamoDB projects table"
  value       = module.dynamodb.projects_table_name
}

output "projects_table_arn" {
  description = "ARN of the DynamoDB projects table"
  value       = module.dynamodb.projects_table_arn
}
