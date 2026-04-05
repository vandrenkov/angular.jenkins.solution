# angular_test

Demo monorepo used to exercise **Jenkins** multi-component pipelines (similar to production AIM / VIKS-style jobs), **Karma + Puppeteer** for headless tests, and **Docker** deployment.

## Quick start

| Goal | Where | Command / action |
|------|--------|-------------------|
| **Run the Jenkins pipeline** | Jenkins job | Point the job at this repo’s **root** `Jenkinsfile`, SCM to your Git URL/branch, then **Build Now**. |
| **Run both apps in Docker** | Repo root on any machine with Docker | `docker compose up --build` → UI [localhost:8080](http://localhost:8080), API [localhost:3000/health](http://localhost:3000/health). |
| **Smoke-test web UI tests locally** | `aim/viks-webui` | `npm ci --legacy-peer-deps` then `npm run test:ci`. |
| **Smoke-test API locally** | `aim/viks-api` | `npm ci` then `npm test` and `npm start`. |

**Hyper-V Ubuntu VM + Jenkins in Docker (typical lab setup):** use the commands in [Jenkins on Hyper-V (Ubuntu guest)](#jenkins-on-hyper-v-ubuntu-guest) on the **guest**—nothing here assumes your Windows host except that the VM runs Linux.

---

## Repository layout

| Path | Description |
|------|-------------|
| `Jenkinsfile` | Pipeline at the **repository root** (point your Jenkins job here). |
| `docker-compose.yml` | Runs both services in containers. |
| `aim/viks-webui/` | Angular 18 SPA (Karma/Puppeteer, production build → static files). |
| `aim/viks-api/` | Small Node.js HTTP API (`/health`). |

## Prerequisites

- **Node.js 18+** and npm (for local development and Jenkins agents).
- **Docker** and **Docker Compose** (for container deployment).
- For **viks-webui** tests on Linux: OS libraries Chromium expects (same idea as production Jenkins agents). Puppeteer resolves Chromium via `CHROME_BIN` in `karma.conf.js`.

## Local development

Install dependencies **per project** (each has its own `package.json` and lockfile).

### viks-webui (Angular)

```bash
cd aim/viks-webui
npm ci --legacy-peer-deps
npm start
```

Runs the dev server (default `http://localhost:4200`).

**CI-style tests** (headless Chrome via Puppeteer):

```bash
npm run test:ci
```

**Production build:**

```bash
npx ng build viks-webui --configuration production
```

Output: `aim/viks-webui/dist/viks-webui/` (browser bundle under `browser/`).

### viks-api (Node)

```bash
cd aim/viks-api
npm ci
npm start
```

API listens on port **3000** unless `PORT` is set. Health check:

- `GET http://localhost:3000/health`  
- `GET http://localhost:3000/api/health`

**Tests and build:**

```bash
npm test
npm run build
```

## Docker deployment

From the **repository root**:

```bash
docker compose up --build
```

| Service | URL | Notes |
|---------|-----|--------|
| **viks-webui** | http://localhost:8080 | nginx serves the Angular production build. |
| **viks-api** | http://localhost:3000/health | Node listens on port 3000 inside the container. |

**Custom host ports** (optional):

```bash
# Windows (PowerShell)
$env:VIKS_API_PORT="3001"; $env:VIKS_WEBUI_PORT="8081"; docker compose up --build
```

```bash
# Linux / macOS
export VIKS_API_PORT=3001 VIKS_WEBUI_PORT=8081
docker compose up --build
```

- **`aim/viks-webui/Dockerfile`**: multi-stage build (`ng build`) then **nginx** for static files and SPA fallback (`nginx.conf`).
- **`aim/viks-api/Dockerfile`**: production install (`npm ci --omit=dev`), runs `node src/index.js`.

The webui image sets `PUPPETEER_SKIP_DOWNLOAD=true` during `npm ci` so the Docker build does not download Chromium (tests are not run in that image).

## Jenkins

- Configure the job to use the **root** `Jenkinsfile` and checkout this repository.
- The agent needs **Node.js and npm** on `PATH` (`sh` steps assume a Unix-like agent or WSL-style shell).
- **Puppeteer cache** for repeatable cache purge tests: `PUPPETEER_CACHE_DIR` is set to  
  `/mnt/vladimir/.cache/puppeteer` (shared on the agent). The **Test viks-webui** stage runs  
  `npx puppeteer browsers install chrome` before tests so Chromium is present after cache purges.
- Stages follow a production-like pattern: checkout, tool install, initialization, git metadata, then **viks-webui** and **viks-api** (test → build → placeholder SonarQube → placeholder Docker). Replace the SonarQube and Docker **echo** stages with real steps when your environment supports them.

No extra Jenkins plugins are required for the current pipeline beyond what you already use for Git and Pipeline.

**SonarQube:** see **[SONARQUBE.md](SONARQUBE.md)** for server install (Docker + PostgreSQL), Jenkins plugin, and wiring **`viks-webui`** / **`viks-api`**.

### Jenkins on Hyper-V (Ubuntu guest)

Use these on the **Linux VM** (Ubuntu 24.x) where Jenkins runs—**not** on Windows PowerShell unless you are SSH’d into the guest.

1. **Install Node.js 18+ on the Jenkins agent** (if the container does not already have `node` / `npm` on `PATH` when running `sh` steps):

   ```bash
   # Example: Node 20 from NodeSource (adjust version to match your policy)
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node -v && npm -v
   ```

   If Jenkins itself runs **inside Docker**, either bake Node into your Jenkins image, install it in a custom image, or run builds on an **agent** (SSH or inbound agent) where Node is installed.

2. **Chromium libraries for Karma/Puppeteer** (only if `npm run test:ci` fails with missing `.so` / sandbox errors):

   ```bash
   sudo apt-get update
   sudo apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
     libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 \
     libxfixes3 libxrandr2 xdg-utils
   ```

   If it still fails, compare with [Puppeteer Linux troubleshooting](https://pptr.dev/troubleshooting) and add any extra packages it lists for your Chromium build.

3. **Shared Puppeteer cache directory** — the pipeline uses `PUPPETEER_CACHE_DIR=/mnt/vladimir/.cache/puppeteer`. On the agent, create the path (or mount NFS there) and ensure the user that runs builds can write to it, for example:

   ```bash
   sudo mkdir -p /mnt/vladimir/.cache/puppeteer
   sudo chown -R <jenkins-agent-user>:<group> /mnt/vladimir/.cache
   ```

4. **Create the Jenkins job:** New Item → Pipeline (or Multibranch), definition **Pipeline script from SCM**, SCM Git, branch `main` (or yours), Script Path **`Jenkinsfile`** (repository root).

5. **Build:** **Build Now** and open **Stage View**; you should see stages such as `Test viks-webui`, `Build viks-webui`, `Test viks-api`, etc.

6. **Optional — same VM, Docker Compose app stack** (separate from Jenkins): from a clone of this repo on the VM:

   ```bash
   cd /path/to/angular.jenkins.solution
   docker compose up --build -d
   ```

   Then open `http://<VM-LAN-IP>:8080` from your host browser (allow the port in the VM firewall if needed).

## License

Private / demo — adjust as needed for your organization.
