variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "vibesheets"
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB table"
  type        = bool
  default     = true
}
