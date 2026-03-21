terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
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

# =============================================================================
# Lambda - API functions
# =============================================================================
module "lambda" {
  source = "../../modules/lambda"

  project_name            = "vibesheets"
  environment             = var.environment
  time_entries_table_name = module.dynamodb.time_entries_table_name
  time_entries_table_arn  = module.dynamodb.time_entries_table_arn
  projects_table_name     = module.dynamodb.projects_table_name
  projects_table_arn      = module.dynamodb.projects_table_arn
  log_retention_days      = 14
}

# =============================================================================
# API Gateway - HTTP API with Cognito auth
# =============================================================================
module "api_gateway" {
  source = "../../modules/api-gateway"

  project_name         = "vibesheets"
  lambda_function_name = module.lambda.function_name
  lambda_invoke_arn    = module.lambda.invoke_arn
  cognito_user_pool_id = module.cognito.user_pool_id
  cognito_client_id    = module.cognito.web_client_id
  log_retention_days   = 14

  cors_origins = [
    "http://localhost:3000",
    "https://vibesheets.com",
    "https://www.vibesheets.com"
  ]
}

# =============================================================================
# Frontend - S3 + CloudFront
# =============================================================================
module "frontend" {
  source = "../../modules/frontend"

  project_name = "vibesheets"
  environment  = var.environment
}
