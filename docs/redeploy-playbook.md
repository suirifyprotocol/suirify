# Suirify Enclave Backend Redeploy Playbook

Use this document when you need to rebuild the entire Suirify enclave backend stack on a fresh EC2 environment (parent host, Nitro enclave host, load balancer, and frontend updates). It captures every fix we applied during the original deployment, so you can reproduce the same state end-to-end.

## 1. Clean-Room Prerequisites

| Component | Instance Type | Key Packages | Notes |
|-----------|---------------|--------------|-------|
| Parent Host (Docker + systemd) | `t3.large` or bigger | Docker, Git, AWS CLI v2 | Needs outbound internet + access to ECR + ALB target group |
| Nitro Enclave Host | `r5.4xlarge` (Nitro-capable) | `aws-nitro-enclaves-cli`, Docker, `nitro-cli`, `jq` | Enable Nitro allocator service and allocate huge pages |
| Shared Requirements | IAM Instance Profile with ECR (pull/push), S3, CloudWatch, Nitro perms | Security groups allowing port 22 (admin) and ALB health checks on parent port 4000 |

> **Tip:** Attach an IAM role so both `ec2-user` and `root` can use IMDS credentials. Otherwise you must copy `~/.aws` into `/root/.aws` before running scripts with `sudo`.

### 1.1 Base OS Setup (both hosts)

```bash
sudo yum update -y
sudo yum install -y docker git jq awscli
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

Log out/in (or `newgrp docker`) so the user can run Docker without sudo.

### 1.2 Nitro Host Extras

```bash
sudo amazon-linux-extras enable aws-nitro-enclaves-cli
sudo yum install -y aws-nitro-enclaves-cli aws-nitro-enclaves-sdk-devel
sudo usermod -aG ne ec2-user
sudo systemctl enable --now nitro-enclaves-allocator.service
sudo nitro-cli-config --memory 3072 --cpu-count 2
# Reboot to pick up allocator changes
sudo reboot
```

After reboot, verify:

```bash
nitro-cli --version
nitro-cli describe-enclaves  # should be [] on a fresh host
```

## 2. Repository Bootstrap

```bash
git clone https://github.com/suirifyprotocol/suirify.git
cd suirify
```

Important subfolders:

- `suirify-enclave-backend/parent-app` → parent API Docker context
- `suirify-enclave-backend/enclave-app` → enclave Node service & `.env`
- `suirify-enclave-backend/scripts` → helper scripts (`deploy-parent.sh`, `build-enclave-image.sh`)

## 3. Parent Host Workflow

### 3.1 Create / update the ECR repository

```bash
aws ecr create-repository \
  --repository-name suirify-parent \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1 || true
```

### 3.2 Build the parent Docker image

Run from the repo root and scope the build context to `parent-app` to keep uploads small:

```bash
docker build \
  -t suirify-parent \
  -f suirify-enclave-backend/parent-app/Dockerfile \
  suirify-enclave-backend/parent-app
```

### 3.3 Tag & push to ECR

```bash
ACCOUNT_ID=<your-account>
REGION=us-east-1
TAG=$(git rev-parse --short HEAD)  # or v0.1.0, latest, etc.
ECR_URI=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/suirify-parent:${TAG}

aws ecr get-login-password --region ${REGION} \
  | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

docker tag suirify-parent ${ECR_URI}
docker push ${ECR_URI}
```

### 3.4 Configure the parent environment

The deployment script writes `/etc/suirify/parent.env`. Start from the template at `suirify-enclave-backend/scripts/templates/parent.env.example` and fill:

- `SUI_NETWORK`, `SUI_RPC`
- On-chain IDs: `PACKAGE_ID`, `ADMIN_CAP_ID`, `PROTOCOL_CONFIG_ID`, `ATTESTATION_REGISTRY_ID`
- Secrets: `ADMIN_PRIVATE_KEY`, `SECRET_PEPPER`, `API_TOKEN_SECRET`, `ADMIN_API_KEY`
- Enclave binding: `ENCLAVE_CONFIG_ID`, `ENCLAVE_OBJECT_ID`, `ENCLAVE_CID`, `ENCLAVE_PORT`
- Networking: `ALLOWED_ORIGINS` (comma-separated) and `HOST`

You can override any key inline when running the script using `--set-env KEY=value`.

### 3.5 Deploy the parent service

```bash
cd suirify-enclave-backend
sudo ./scripts/deploy-parent.sh \
  --image-uri ${ECR_URI} \
  --region us-east-1 \
  --set-env ALLOWED_ORIGINS=https://app.dev.suirify.com \
  --set-env VSOCK_PARENT_CID=3
```

> If `docker login` was executed separately, add `--skip-ecr-login`.

The script performs:

1. Copies the env template to `/etc/suirify/parent.env`
2. Applies overrides via `--set-env`
3. Logs into ECR (unless skipped)
4. Pulls the tagged image
5. Renders `/etc/systemd/system/suirify-parent.service`
6. Reloads systemd and restarts the service

### 3.6 Verify the parent service

```bash
sudo systemctl status suirify-parent
sudo journalctl -u suirify-parent -n 100 --no-pager
curl -fsS http://127.0.0.1:4000/healthz
```

Troubleshooting reminders:

- **No basic auth credentials** → run the `aws ecr get-login-password | docker login` command in the same region as the repo.
- **Unable to locate credentials when using sudo** → copy `~/.aws/{config,credentials}` to `/root/.aws` or run with `sudo -E` after exporting `AWS_SHARED_CREDENTIALS_FILE`.
- **CORS 403** → update `ALLOWED_ORIGINS` in `/etc/suirify/parent.env` and rerun the deploy script.

## 4. Enclave Workflow

All commands below run on the Nitro-enabled host in `suirify-enclave-backend/`.

### 4.1 Prepare enclave secrets

`enclave-app/.env` must contain the base64-encoded private key registered on-chain:

```dotenv
ENCLAVE_PRIVATE_KEY_B64=<base64-32-byte-secret>
```

Do **not** commit production keys; create the file directly on the host.

### 4.2 Build the EIF

```bash
cd suirify-enclave-backend
./scripts/build-enclave-image.sh \
  --image suirify-enclave:latest \
  --output out/suirify-enclave.eif
```

Outputs:

- `out/suirify-enclave.eif`
- `out/suirify-enclave.measurements.json` (PCRs)

The script automatically falls back to `nitro-cli describe-eif` when the CLI lacks the `--measurements` flag.

### 4.3 Capture PCRs & update on-chain config

```bash
jq '.Measurements' out/suirify-enclave.measurements.json
```

Store `PCR0/1/2` values in your Sui Move `Enclave` object or attestation registry. Any change to the enclave code or Docker base image requires a new registration.

### 4.4 Run and monitor the enclave

```bash
sudo nitro-cli run-enclave \
  --cpu-count 2 \
  --memory 2300 \
  --eif-path out/suirify-enclave.eif \
  --enclave-name suirify-enclave

sudo nitro-cli describe-enclaves
sudo nitro-cli console --enclave-id <EnclaveID>
```

Keep the console open to monitor logs (`E11` socket errors typically mean the enclave exited—check `/var/log/nitro_enclaves/err*.log`).

Stopping the enclave:

```bash
sudo nitro-cli terminate-enclave --enclave-id <EnclaveID>
```

### 4.5 Common enclave issues

| Symptom | Fix |
|---------|-----|
| `nitro-cli console` returns E11 immediately | Enclave process crashed. Inspect `/var/log/nitro_enclaves/err*.log` and ensure `ENCLAVE_PRIVATE_KEY_B64` is set. |
| Parent cannot reach CID | Confirm `ENCLAVE_CID` in `/etc/suirify/parent.env` matches the `EnclaveCID` reported by `run-enclave`. |
| EOF / JSON parse errors | Ensure the parent request payload matches the expected schema: `{ command: 'SIGN_MINT_PAYLOAD', data: { payloadHex } }`. |

## 5. Networking, ALB, and Frontend

### 5.1 Security groups

- Parent host SG: allow ALB health checks on TCP 4000, allow Nitro vsock (no SG needed for vsock itself), allow SSH from admin IPs.
- ALB SG: allow inbound 443 from the internet, outbound 4000 to parent host SG.

### 5.2 Application Load Balancer

1. Create an internal or internet-facing ALB (HTTPS listener on 443).
2. Attach an ACM certificate for your domain (`api.dev.suirify.com`).
3. Create a target group (HTTP, port 4000) and register the parent host instance.
4. Add listener rule forwarding `/` to the target group.
5. Verify health checks (`/healthz`).

### 5.3 DNS / Route 53

- Create an `A` alias record pointing `api.dev.suirify.com` to the ALB.
- Propagate TTL, then test:

```bash
curl -I https://api.dev.suirify.com/healthz
```

### 5.4 Frontend configuration

In `suirify/frontend/.env` (or `vite.config.ts` overrides), set:

```dotenv
VITE_API_URL=https://api.dev.suirify.com
```

Rebuild and redeploy the frontend so the browser calls the ALB endpoint. Ensure the same origin is listed in the parent service `ALLOWED_ORIGINS`.

## 6. Quick Reference Commands

| Task | Command |
|------|---------|
| Verify parent service | `sudo systemctl status suirify-parent` |
| Tail parent logs | `sudo journalctl -u suirify-parent -f` |
| Update parent env entry | `sudo ./scripts/deploy-parent.sh --set-env KEY=value --image-uri <same-image>` |
| List ECR images | `aws ecr describe-images --repository-name suirify-parent --region us-east-1` |
| Show running enclaves | `sudo nitro-cli describe-enclaves` |
| View enclave PCRs | `cat out/suirify-enclave.measurements.json` |

Following this playbook from top to bottom rebuilds everything we touched during the original deployment: host packages, Docker images, AWS credentials, Nitro EIF artifacts, parent systemd service, load balancer exposure, and frontend configuration. Keep it updated as you evolve the stack so a future recovery remains painless.
