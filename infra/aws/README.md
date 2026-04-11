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

The staging GitHub Actions role should be able to read from the shared API/frontend ECR repositories because the `dev` branch staging simulation now pulls the exact digest refs published by CI.

## 4. Release to production

Create and push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Production release is tag-only: the workflow is not manually runnable with an arbitrary branch, SHA, or other ref. The tag must point to a commit whose CI run already published promotable `sha-<commit>` images into ECR.

The `TwinGraphOps Release` workflow will then:

1. run API tests, frontend tests, and build the frontend
2. resolve the previously published `sha-<commit>` images in ECR into immutable digest refs
3. resolve the previous successful production release from its `production-release-metadata.json` GitHub release asset
4. optionally alias those same digests to the release tag and `latest`
5. use AWS Systems Manager to deploy those exact digest refs to the EC2 host
6. automatically roll back to the prior known-good digest refs if that production deployment fails
7. publish the GitHub release and attach the new `production-release-metadata.json` asset after a successful deploy

If there is no prior successful production release yet, the workflow does not invent a rollback target. It fails clearly so the operator can investigate the initial release problem.

## 5. Verify the deployment

Use the EC2 public DNS name or public IP from the CloudFormation outputs:

- `http://<public-host>/`
- `http://<public-host>/healthz`
- `http://<public-host>/api/health`
- `http://<public-host>/api/ready`
- `http://<public-host>/api/metrics`
