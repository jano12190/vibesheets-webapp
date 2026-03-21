variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "lambda_function_name" {
  description = "Name of the Lambda function to monitor"
  type        = string
}

variable "api_gateway_id" {
  description = "ID of the API Gateway to monitor"
  type        = string
}

variable "api_gateway_stage" {
  description = "API Gateway stage name"
  type        = string
  default     = "$default"
}

variable "alarm_email" {
  description = "Email address for alarm notifications (optional)"
  type        = string
  default     = null
}
