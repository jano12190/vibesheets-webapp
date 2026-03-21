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

# =============================================================================
# Lambda Outputs
# =============================================================================
output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = module.lambda.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = module.lambda.function_arn
}

output "lambda_invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  value       = module.lambda.invoke_arn
}

# =============================================================================
# API Gateway Outputs
# =============================================================================
output "api_endpoint" {
  description = "API Gateway HTTP endpoint URL"
  value       = module.api_gateway.api_endpoint
}

# =============================================================================
# Frontend Outputs
# =============================================================================
output "frontend_bucket_name" {
  description = "Name of the S3 bucket for frontend"
  value       = module.frontend.bucket_name
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.frontend.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = module.frontend.cloudfront_distribution_id
}
