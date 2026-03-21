# Terraform Backend + OIDC Setup

This directory contains the bootstrap configuration:
- S3 bucket for Terraform state
- DynamoDB table for state locking
- GitHub Actions OIDC authentication

## Why Separate?

This config uses **local state** because of the chicken-and-egg problem:
- You can't use an S3 backend until the bucket exists
- GitHub Actions can't authenticate until OIDC is configured

After this is applied once (locally), all future changes go through GitHub Actions.

## First-Time Setup

### 1. Create your tfvars file

```bash
cd terraform/backend
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your GitHub repo:
```hcl
github_repo = "your-username/vibesheets"
```

### 2. Configure temporary AWS credentials

Option A - AWS CLI:
```bash
aws configure
```

Option B - Environment variables:
```bash
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_REGION="us-east-1"
```

Option C - AWS SSO:
```bash
aws sso login --profile your-profile
export AWS_PROFILE=your-profile
```

### 3. Initialize and apply

```bash
terraform init
terraform plan
terraform apply
```

### 4. Note the outputs

After apply, you'll see:
```
github_actions_role_arn = "arn:aws:iam::123456789:role/vibesheets-github-actions"
```

### 5. Add the role ARN to GitHub Secrets

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Create a new secret:
   - Name: `AWS_ROLE_ARN`
   - Value: (the role ARN from step 4)

### 6. Initialize the main infrastructure

```bash
cd ../environments/prod
terraform init
```

## After Setup

- All infrastructure changes go through GitHub Actions (push to main)
- Pull requests run `terraform plan` for review
- You don't need local AWS credentials anymore

## S3 Bucket Naming

If `vibesheets-terraform-state` is taken, update:
1. `state_bucket_name` in `terraform.tfvars`
2. `backend "s3"` block in `environments/prod/main.tf`

## Files

- `main.tf` - S3 bucket, DynamoDB table, OIDC provider, IAM role
- `variables.tf` - Configuration variables
- `outputs.tf` - Role ARN and other outputs
- `terraform.tfvars` - Your configuration (gitignored)
- `terraform.tfstate` - Local state for bootstrap resources (safe to commit)
