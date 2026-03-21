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

# Modules will be added here as we build them
# module "dynamodb" {
#   source = "../../modules/dynamodb"
#   ...
# }
