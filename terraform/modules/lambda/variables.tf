variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "vibesheets"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "time_entries_table_name" {
  description = "Name of the DynamoDB time entries table"
  type        = string
}

variable "time_entries_table_arn" {
  description = "ARN of the DynamoDB time entries table"
  type        = string
}

variable "projects_table_name" {
  description = "Name of the DynamoDB projects table"
  type        = string
}

variable "projects_table_arn" {
  description = "ARN of the DynamoDB projects table"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}
