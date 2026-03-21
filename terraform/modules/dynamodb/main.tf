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
