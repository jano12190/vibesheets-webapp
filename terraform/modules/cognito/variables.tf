variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "vibesheets"
}

variable "callback_urls" {
  description = "Allowed callback URLs for OAuth"
  type        = list(string)
  default     = ["http://localhost:3000/callback"]
}

variable "logout_urls" {
  description = "Allowed logout URLs"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

variable "cognito_domain" {
  description = "Domain prefix for Cognito hosted UI (must be unique across AWS)"
  type        = string
}
