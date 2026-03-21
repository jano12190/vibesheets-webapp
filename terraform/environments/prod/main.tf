terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "vibesheets-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "vibesheets-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "vibesheets"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}

# =============================================================================
# DynamoDB - Time entries table
# =============================================================================
module "dynamodb" {
  source = "../../modules/dynamodb"

  project_name                  = "vibesheets"
  enable_point_in_time_recovery = true
}

# =============================================================================
# Cognito - User authentication
# =============================================================================
module "cognito" {
  source = "../../modules/cognito"

  project_name   = "vibesheets"
  cognito_domain = "vibesheets-auth"

  # OAuth callback URLs
  callback_urls = [
    "http://localhost:3000/callback",  # Local dev
    "https://vibesheets.com/callback", # Production
    "https://www.vibesheets.com/callback"
  ]

  logout_urls = [
    "http://localhost:3000",
    "https://vibesheets.com",
    "https://www.vibesheets.com"
  ]
}
