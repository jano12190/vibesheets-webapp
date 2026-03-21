# =============================================================================
# DynamoDB Outputs
# =============================================================================
output "dynamodb_table_name" {
  description = "Name of the DynamoDB time entries table"
  value       = module.dynamodb.table_name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB time entries table"
  value       = module.dynamodb.table_arn
}
