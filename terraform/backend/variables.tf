variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "state_bucket_name" {
  description = "Name of the S3 bucket for Terraform state"
  type        = string
  default     = "vibesheets-terraform-state"
}

variable "lock_table_name" {
  description = "Name of the DynamoDB table for state locking"
  type        = string
  default     = "vibesheets-terraform-locks"
}

variable "github_repo" {
  description = "GitHub repository in format 'owner/repo' (e.g., 'jakenord/vibesheets')"
  type        = string
}
