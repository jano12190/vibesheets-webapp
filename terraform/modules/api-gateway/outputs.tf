output "api_id" {
  description = "ID of the API Gateway"
  value       = aws_apigatewayv2_api.main.id
}

output "api_endpoint" {
  description = "HTTP API endpoint URL"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "stage_name" {
  description = "Name of the deployed stage"
  value       = aws_apigatewayv2_stage.default.name
}
