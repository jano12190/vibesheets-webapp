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

variable "domain_aliases" {
  description = "List of domain aliases for CloudFront (e.g., ['vibesheets.com', 'www.vibesheets.com'])"
  type        = list(string)
  default     = []
}

variable "certificate_arn" {
  description = "ARN of ACM certificate for custom domain (required if domain_aliases is set)"
  type        = string
  default     = null
}
