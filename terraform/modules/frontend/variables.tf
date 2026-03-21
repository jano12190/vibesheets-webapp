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
