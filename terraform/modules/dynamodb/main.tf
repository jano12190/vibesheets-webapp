# DynamoDB table for time entries
resource "aws_dynamodb_table" "time_entries" {
  name         = "${var.project_name}-time-entries"
  billing_mode = "PAY_PER_REQUEST" # On-demand, scales automatically, pay per use

  # Primary key: user_id (partition) + entry_id (sort)
  # entry_id format: ISO timestamp for efficient date range queries
  hash_key  = "user_id"
  range_key = "entry_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "entry_id"
    type = "S"
  }

  # Global Secondary Index for querying by date across users (admin/reporting)
  attribute {
    name = "date"
    type = "S"
  }

  global_secondary_index {
    name            = "date-index"
    hash_key        = "date"
    range_key       = "user_id"
    projection_type = "ALL"
  }

  # GSI for querying time entries by project (for project-based reporting)
  attribute {
    name = "project_id"
    type = "S"
  }

  global_secondary_index {
    name            = "project-index"
    hash_key        = "project_id"
    range_key       = "entry_id"
    projection_type = "ALL"
  }

  # Point-in-time recovery for data protection
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # TTL disabled - we want to keep time entries indefinitely
  # Can enable later if you want auto-delete old entries

  tags = {
    Name = "${var.project_name}-time-entries"
  }
}

# DynamoDB table for projects
resource "aws_dynamodb_table" "projects" {
  name         = "${var.project_name}-projects"
  billing_mode = "PAY_PER_REQUEST"

  # Primary key: user_id (partition) + project_id (sort)
  # Each user has their own set of projects
  hash_key  = "user_id"
  range_key = "project_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "project_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  tags = {
    Name = "${var.project_name}-projects"
  }
}

# DynamoDB table for user profiles
resource "aws_dynamodb_table" "user_profiles" {
  name         = "${var.project_name}-user-profiles"
  billing_mode = "PAY_PER_REQUEST"

  # Primary key: user_id only (one profile per user)
  hash_key = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  tags = {
    Name = "${var.project_name}-user-profiles"
  }
}

# Note: Additional attributes don't need to be defined here - DynamoDB is schemaless.
# User profiles will store: name, address, email, phone, created_at, updated_at
# Projects will store: name, client, client_address, hourly_rate, color, active
