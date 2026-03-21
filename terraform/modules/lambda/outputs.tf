output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.api.function_name
}

output "function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.api.arn
}

output "invoke_arn" {
  description = "Invoke ARN of the Lambda function (for API Gateway)"
  value       = aws_lambda_function.api.invoke_arn
}

output "execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_exec.arn
}
