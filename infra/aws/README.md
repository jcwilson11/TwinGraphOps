# AWS deployment

TwinGraphOps now builds on the same container topology used for localhost development and deploys it to a single production EC2 host:

- `neo4j` runs in Docker with persistent local volumes
- `api` and `frontend` run as containers pulled from Amazon ECR
- `prometheus` and `grafana` run alongside the app services for cloud observability
- `nginx` listens on port `80` and routes `/` to the frontend, `/api/*` to the FastAPI service, and `/grafana/*` to Grafana
- runtime secrets come from AWS Secrets Manager during deployment
- GitHub Actions uses AWS OIDC, Amazon ECR, and AWS Systems Manager to release tagged versions

## 1. Prepare the AWS secret

The production secret in Secrets Manager must have a JSON `SecretString` like:

```json
{
  "neo4j_user": "neo4j",
  "neo4j_password": "replace-with-real-password",
  "gemini_api_key": "replace-with-real-api-key",
  "grafana_admin_user": "replace-with-real-admin-user",
  "grafana_admin_password": "replace-with-real-admin-password"
}
```

## 2. Launch the EC2 host

Create the production Gemini model parameter in Systems Manager Parameter Store:

- name: `/twingraphops/production/gemini_model`
- type: `String`
- value: the Gemini model name to run in production

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
- `t3.micro` is the default and the intended demo size for this AWS account; keep document uploads small and watch memory/disk pressure because Neo4j, Prometheus, Grafana, and PDF/document ingestion all share the same host
- the stack only opens port `80`
- the instance reads the secret and Gemini model parameter directly, so the EC2 role only needs read access to that one secret, `/twingraphops/production/gemini_model`, and ECR
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
- call `ssm:SendCommand`, `ssm:GetCommandInvocation`, `ssm:DescribeInstanceInformation`, and related read APIs for the production instance

The `dev` branch staging simulation pulls the exact digest refs published by the `TwinGraphOps Promote Dev` workflow after CI passes from the shared production ECR repositories using the staging GitHub Actions role. That staging role therefore needs ECR pull permissions in addition to Secrets Manager read access.

Minimum ECR permissions for the staging role:

- `ecr:GetAuthorizationToken` on `*`
- `ecr:BatchCheckLayerAvailability` on the shared API/frontend repositories
- `ecr:BatchGetImage` on the shared API/frontend repositories
- `ecr:GetDownloadUrlForLayer` on the shared API/frontend repositories

## 4. Release to production

Create and push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Production release is tag-only: the workflow is not manually runnable with an arbitrary branch, SHA, or other ref. The tag must point to a commit whose CI-gated promotion workflow already published promotable `sha-<commit>` images into ECR.

The `TwinGraphOps Release` workflow will then:

1. run API tests, frontend tests, and build the frontend
2. resolve the previously published `sha-<commit>` images in ECR into immutable digest refs
3. resolve the previous successful production release from its `production-release-metadata.json` GitHub release asset
4. optionally alias those same digests to the release tag and `latest`
5. use AWS Systems Manager to deploy those exact digest refs to the EC2 host
6. automatically roll back to the prior known-good digest refs if that production deployment fails
7. publish the GitHub release and attach the new `production-release-metadata.json` asset after a successful deploy

If there is no prior successful production release yet, the workflow does not invent a rollback target. It fails clearly so the operator can investigate the initial release problem.

For operator-driven recovery after a “successful” deploy, use the `TwinGraphOps Manual Rollback` workflow in GitHub Actions and provide a previously successful production release tag such as `v1.2.3`. The workflow resolves that tag’s stored `production-release-metadata.json` asset, validates the digest refs, and redeploys those exact images through the same EC2 compose path.

## 5. Verify the deployment

Use the EC2 public DNS name or public IP from the CloudFormation outputs:

- `http://<public-host>/`
- `http://<public-host>/healthz`
- `http://<public-host>/api/health`
- `http://<public-host>/api/ready`
- `http://<public-host>/api/metrics`
- `http://<public-host>/grafana/`
- `http://<public-host>/grafana/api/health`

AWS console checks for the DevSecOps evidence package:

- EC2 instance state is `running`, status checks are `2/2`, the instance type matches the intended demo size, disk space is healthy, and the SSM agent is online.
- The security group exposes only port `80` publicly unless another port was intentionally approved; Neo4j, Prometheus, Grafana internals, frontend, and API container ports should stay behind nginx.
- The CloudFormation stack has the expected outputs and no unexpected drift.
- ECR has the expected `sha-<commit>` API/frontend images, release aliases, digest refs, and acceptable vulnerability scan findings.
- Secrets Manager contains real production values for `neo4j_user`, `neo4j_password`, `gemini_api_key`, `grafana_admin_user`, and `grafana_admin_password`.
- Systems Manager Parameter Store contains `/twingraphops/production/gemini_model` in the deployment region.
- Prometheus targets are up and the Grafana dashboards have non-empty platform, document KG ingestion, legacy risk, and DevSecOps evidence panels after a smoke upload.

If a release or rollback command remains `Pending`, verify the target host is online in Systems Manager before retrying:

```bash
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$PROD_EC2_INSTANCE_ID" \
  --query 'InstanceInformationList[0].{PingStatus:PingStatus,AgentVersion:AgentVersion,PlatformName:PlatformName}' \
  --output table
```

`PingStatus` must be `Online`. If it is missing, `ConnectionLost`, or `Inactive`, confirm the workflow is using the instance ID from the same AWS region as `AWS_REGION`, the instance profile still includes `AmazonSSMManagedInstanceCore`, the subnet has outbound access to SSM endpoints, and `amazon-ssm-agent` is installed and running on the host.
