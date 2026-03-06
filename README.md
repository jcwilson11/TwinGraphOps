# TwinGraphOps

TwinGraphOps is a simple FastAPI + Neo4j + Node frontend stack for dependency graph exploration.

## How to change Neo4j username/password

You now change credentials by updating secret files (not `docker-compose.yml`).

- `infra/secrets/neo4j_auth.txt` → `<username>/<password>` (used by Neo4j container)
- `infra/secrets/neo4j_user.txt` → `<username>` (used by API)
- `infra/secrets/neo4j_password.txt` → `<password>` (used by API)

The easiest way is the helper script:

```bash
NEO4J_USER=myuser NEO4J_PASSWORD='my-strong-password' ./infra/scripts/setup-local-secrets.sh
```

or run interactive mode:

```bash
./infra/scripts/setup-local-secrets.sh
```

## Run locally

1. Create/refresh local secret files:
   ```bash
   ./infra/scripts/setup-local-secrets.sh
   ```
2. Start the stack:
   ```bash
   docker compose up --build
   ```
3. Open:
   - Frontend: http://localhost:3000
   - API health: http://localhost:8000/health
   - Neo4j browser: http://localhost:7474

## Team setup (shared workflow)

For teammates, each person should:

1. Pull latest code.
2. Obtain the team-approved dev credentials from your secret manager (1Password, Vault, etc.).
3. Generate local secret files with the helper script:
   ```bash
   NEO4J_USER='<team-dev-user>' NEO4J_PASSWORD='<team-dev-password>' ./infra/scripts/setup-local-secrets.sh
   ```
4. Run `docker compose up --build`.

> Do not commit `infra/secrets/*.txt`. They are gitignored.

## Runtime secret requirements (API)

The API fails fast at startup when required secrets are missing.

### Required key(s)

- `NEO4J_PASSWORD` or `NEO4J_PASSWORD_FILE`

### Optional key(s)

- `NEO4J_URI` (default: `bolt://neo4j:7687`)
- `NEO4J_USER` or `NEO4J_USER_FILE` (default: `neo4j`)

## CI/CD secrets handling

GitHub Actions injects secrets per environment:

- **Staging** (`Dev` branch, environment `staging`):
  - `STAGING_NEO4J_AUTH` (`<user>/<password>`)
  - `STAGING_NEO4J_USER`
  - `STAGING_NEO4J_PASSWORD`
- **Production** (`main` branch, environment `production`):
  - `PROD_NEO4J_AUTH` (`<user>/<password>`)
  - `PROD_NEO4J_USER`
  - `PROD_NEO4J_PASSWORD`

Jobs write secrets to ephemeral files under `infra/secrets/`, validate `docker compose config`, then clean files up.



### Trivy remediation note (Python image)

The API Docker build uses `api/constraints.txt` to enforce patched minimum versions for vulnerable transitive Python packages used by installer tooling (for example `jaraco.context` and `wheel`).

## Secret scanning gate

A dedicated workflow (`.github/workflows/secret-scan.yml`) blocks merges when potential plaintext secrets are committed by running Gitleaks on pushes and pull requests.


## CI behavior with your branching model

Workflows are now split with clear ownership:

- **`.github/workflows/ci.yml`**: build + smoke tests + environment config validation.
- **`.github/workflows/secret-scan.yml`**: Gitleaks-only secret scanning gate.
- **`.github/workflows/trivy.yml`**: Trivy vulnerability scanning (filesystem + built images) and fails on HIGH/CRITICAL findings.
- **`.github/workflows/codeql.yml`**: CodeQL static analysis for Python (`api/`) and JavaScript (`frontend/`).

### What runs when

- Push/PR to `dev`/`Dev`/`main`: CI build + smoke checks run.
- Push to `dev`/`Dev`: staging config validation runs.
- Push to `main`: production config validation runs.
- Push/PR to `main`, `dev`/`Dev`, and `twin-*` pushes: secret scan and Trivy run.
- CodeQL runs on push/PR plus weekly schedule.

### Important: validation vs deployment

You are correct: `validate-staging-config` and `validate-production-config` validate secret wiring and rendered Compose config only. They do **not** execute a real deployment command yet.

When you choose deployment target(s), add deploy steps after validation in `ci.yml` (for example: SSH to host and `docker compose pull && docker compose up -d`, or Kubernetes/cloud deploy commands).

### Branch protection recommendations

Configure GitHub branch protection/rulesets to enforce your policy:

- `main`
  - Require pull request before merging
  - Require 2 approvals
  - Require status checks to pass (`build-and-smoke-test`, `gitleaks`, `trivy`, `CodeQL / Analyze (python)`, `CodeQL / Analyze (javascript)`)
  - Restrict direct pushes
  - Restrict source branch to `dev` for merges into `main` (ruleset)

- `dev`
  - Require pull request before merging
  - Require 1 approval
  - Require status checks to pass (`build-and-smoke-test`, `gitleaks`, `trivy`, `CodeQL / Analyze (python)`, `CodeQL / Analyze (javascript)`)
  - Restrict direct pushes
  - Restrict source branch pattern to `twin-*` for merges into `dev` (ruleset)
