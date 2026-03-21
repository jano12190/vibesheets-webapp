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
# DNS - Route53 + ACM Certificate
# =============================================================================
module "dns" {
  source = "../../modules/dns"

  domain_name = "vibesheets.com"
}

# =============================================================================
# Frontend - S3 + CloudFront
# =============================================================================
module "frontend" {
  source = "../../modules/frontend"

  project_name    = "vibesheets"
  environment     = var.environment
  domain_aliases  = ["vibesheets.com", "www.vibesheets.com"]
  certificate_arn = module.dns.certificate_arn
}

# =============================================================================
# Route53 A Records - Point domain to CloudFront
# =============================================================================
resource "aws_route53_record" "apex" {
  zone_id = module.dns.zone_id
  name    = "vibesheets.com"
  type    = "A"

  alias {
    name                   = module.frontend.cloudfront_domain_name
    zone_id                = module.frontend.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = module.dns.zone_id
  name    = "www.vibesheets.com"
  type    = "A"

  alias {
    name                   = module.frontend.cloudfront_domain_name
    zone_id                = module.frontend.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# =============================================================================
# Monitoring - CloudWatch Alarms
# =============================================================================
module "monitoring" {
  source = "../../modules/monitoring"

  project_name         = "vibesheets"
  lambda_function_name = module.lambda.function_name
  api_gateway_id       = module.api_gateway.api_id
  api_gateway_stage    = module.api_gateway.stage_name
}
