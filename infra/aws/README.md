# AWS deployment

TwinGraphOps now builds on the same container topology used for localhost development and deploys it to a single production EC2 host:

- `neo4j` runs in Docker with persistent local volumes
- `api` and `frontend` run as containers pulled from Amazon ECR
- `nginx` listens on port `80` and routes `/` to the frontend and `/api/*` to the FastAPI service
- runtime secrets come from AWS Secrets Manager during deployment
- GitHub Actions uses AWS OIDC, Amazon ECR, and AWS Systems Manager to release tagged versions

## 1. Prepare the AWS secret

The production secret in Secrets Manager must have a JSON `SecretString` like:

```json
{
  "neo4j_user": "neo4j",
  "neo4j_password": "replace-with-real-password",
  "gemini_api_key": "replace-with-real-api-key"
}
```

## 2. Launch the EC2 host

Deploy the CloudFormation stack in a public subnet:

```bash
aws cloudformation deploy \
  --stack-name twingraphops-prod \
  --template-file infra/aws/ec2-compose-stack.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
      ProjectName=twingraphops \
      VpcId=vpc-xxxxxxxx \
      SubnetId=subnet-xxxxxxxx \
      AwsSecretArn=arn:aws:secretsmanager:us-east-1:123456789012:secret:your-prod-secret
```

Important notes:

- use a public subnet with outbound internet access
- `t3.medium` is the default because Neo4j is more comfortable there than on a tiny instance
- the stack only opens port `80`
- the instance reads the secret directly, so the EC2 role only needs read access to that one secret plus ECR read access
- the EC2 bootstrap installs Docker from Amazon Linux 2023 and installs Docker Compose as a CLI plugin

## 3. Configure GitHub Actions

Set these repository or environment variables:

- `AWS_REGION`
- `PROD_AWS_ROLE_ARN`
- `PROD_AWS_SECRET_ID`
- `PROD_EC2_INSTANCE_ID`

Optional overrides:

- `PROD_API_ECR_REPOSITORY` default: `twingraphops-api`
- `PROD_FRONTEND_ECR_REPOSITORY` default: `twingraphops-frontend`

The GitHub OIDC role should be able to:

- push images to ECR
- create the ECR repositories if they do not exist yet
- call `ssm:SendCommand`, `ssm:GetCommandInvocation`, and related read APIs for the production instance

## 4. Release to production

Create and push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The `TwinGraphOps Release` workflow will then:

1. run API tests and build the frontend
2. build and push `api` and `frontend` images to ECR
3. use AWS Systems Manager to deploy that ref to the EC2 host
4. publish the GitHub release

## 5. Verify the deployment

Use the EC2 public DNS name or public IP from the CloudFormation outputs:

- `http://<public-host>/`
- `http://<public-host>/healthz`
- `http://<public-host>/api/health`
- `http://<public-host>/api/ready`
- `http://<public-host>/api/metrics`
