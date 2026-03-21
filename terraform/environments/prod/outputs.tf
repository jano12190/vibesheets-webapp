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

# =============================================================================
# Cognito Outputs
# =============================================================================
output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "cognito_web_client_id" {
  description = "ID of the Cognito web client (for React app)"
  value       = module.cognito.web_client_id
}

output "cognito_domain" {
  description = "Cognito hosted UI domain"
  value       = module.cognito.cognito_domain
}
