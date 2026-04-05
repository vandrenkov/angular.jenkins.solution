# SonarQube for angular.jenkins.solution

This document explains how to **install and configure SonarQube** for analysis of **viks-webui** (Angular) and **viks-api** (Node), and how it connects to **Jenkins**. The pipeline currently has **placeholder** Sonar stages in the root `Jenkinsfile`; replace those with real steps after the server is available.

---

## Do you need a new Docker Linux container?

**You need a place where SonarQube Server runs.** That is **separate from the Jenkins controller/agent** (another container, another VM, or a managed service).

| Approach | When to use |
|----------|-------------|
| **Docker Compose** on a Linux VM (SonarQube + PostgreSQL) | Typical **lab / Hyper-V Ubuntu** setup; full control. |
| **Linux VM packages** (install SonarQube + DB on the OS) | Org policy prefers no Docker for SonarQube. |
| **SonarCloud** (SaaS) | No self-hosted server; different pricing and setup. |

So: **yes**, you usually run SonarQube in **its own** container (or host), **not** inside the Jenkins container. Jenkins only needs **HTTP(S) access** to the SonarQube URL and a **token** to upload analysis results.

---

## Do you need a database?

**Yes, for anything you keep running beyond a quick trial.**

- **PostgreSQL** is the **recommended** database for SonarQube (Community and commercial editions).
- The **embedded H2** database (if still offered in your edition for evaluation) is **not** for production: it is for **short local trials** only.

**Practical setup:** run **PostgreSQL** in Docker **next to** the SonarQube container (same `docker-compose.yml` is the usual pattern). SonarQube stores projects, issues, history, and user data in that database.

Minimum you plan for:

- **SonarQube container** (web UI + compute engine + Elasticsearch embedded in recent versions — follow image docs for memory).
- **PostgreSQL container** (persistent volume for DB data).

---

## Resource and OS notes (self-hosted)

- **RAM:** SonarQube is **memory-heavy** (often **2 GB+** for the JVM alone on small installs; more for larger instances). Do not colocate on a tiny VM with Jenkins if both are busy.
- **Linux:** On the **Docker host**, you may need to raise **`vm.max_map_count`** for Elasticsearch used inside SonarQube (the official SonarQube Docker docs describe this; often `sysctl -w vm.max_map_count=524288`).
- **Disk:** Plan space for the database volume and SonarQube data directory.

---

## Example: SonarQube + PostgreSQL with Docker Compose

Use **official images** and pin versions to match [SonarQube’s requirements](https://docs.sonarsource.com/sonarqube/latest/) for your edition. The snippet below is a **starting point** for a lab (adjust passwords, versions, and volumes).

```yaml
# Example only — verify image tags and env vars against current SonarQube documentation.
services:
  sonarqube-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: sonar
      POSTGRES_PASSWORD: change_me_strong
      POSTGRES_DB: sonar
    volumes:
      - sonarqube_db_data:/var/lib/postgresql/data

  sonarqube:
    image: sonarqube:community  # or lts/community tag you approve
    depends_on:
      - sonarqube-db
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://sonarqube-db:5432/sonar
      SONAR_JDBC_USERNAME: sonar
      SONAR_JDBC_PASSWORD: change_me_strong
    ports:
      - "9000:9000"
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_logs:/opt/sonarqube/logs
      - sonarqube_extensions:/opt/sonarqube/extensions

volumes:
  sonarqube_db_data:
  sonarqube_data:
  sonarqube_logs:
  sonarqube_extensions:
```

1. Save as e.g. `docker-compose.sonar.yml` **outside** this repo or in a private ops repo (do not commit real passwords).
2. On the Linux host: `docker compose -f docker-compose.sonar.yml up -d`.
3. Open **`http://<host>:9000`**, log in with default admin (change password on first login per on-screen steps).

---

## Configure SonarQube (server)

1. **Create projects** (or let the scanner create them on first analysis if allowed):
   - e.g. `angular-jenkins-viks-webui`, `angular-jenkins-viks-api`.
2. **Generate a token:** **My Account → Security → Generate Tokens** (use for Jenkins).
3. **Quality Gate / Quality Profiles:** optional; start with defaults, tune later.

---

## Configure Jenkins

1. **Install plugin:** **SonarQube Scanner** (ID often `sonar`).
2. **Manage Jenkins → System → SonarQube servers**
   - **Name:** e.g. `SonarQube` (must match `withSonarQubeEnv('SonarQube')` in the pipeline).
   - **Server URL:** `http://your-sonar-host:9000` (or HTTPS behind your reverse proxy).
   - **Server authentication token:** add the Sonar token as a **Secret text** credential and select it.
3. **Network:** the **Jenkins agent** that runs `sh` must reach the SonarQube URL (firewall/DNS). If Jenkins is in Docker, use the host’s IP/DNS or Docker network name, not only `localhost` from the wrong container.

### Optional: Quality Gate in Jenkins

To use **`waitForQualityGate()`** in a pipeline, SonarQube must send analysis results to Jenkins via a **webhook**. Configure **Administration → Configuration → Webhooks** in SonarQube with your Jenkins URL (requires the **SonarQube** plugin features for webhook handling — follow the plugin docs).

---

## Wire this repository

### 1. Add `sonar-project.properties` per component (or one file with modules)

Typical layout:

- `aim/viks-webui/sonar-project.properties` — `sonar.sources=src`, coverage from Karma `lcov.info` after `test:ci`.
- `aim/viks-api/sonar-project.properties` — `sonar.sources=src`, tests under `test/` if you add coverage later.

Use **distinct** `sonar.projectKey` values (e.g. `angular-jenkins.viks-webui` and `angular-jenkins.viks-api`).

### 2. Scanner execution

Either:

- **`sonarqube-scanner` npm package** and `npm run sonar` inside each folder, or  
- **SonarScanner** CLI installed as a **Jenkins tool** and `sonar-scanner` on `PATH`.

Wrap steps with:

```groovy
withSonarQubeEnv('SonarQube') {  // name from Jenkins SonarQube server config
    sh 'cd aim/viks-webui && npm run sonar'
}
```

### 3. Replace placeholder stages in `Jenkinsfile`

Swap the `echo "[SKIP] SonarQube …"` stages for real `withSonarQubeEnv` blocks **after** tests (and coverage for the web UI) so Sonar receives **lcov** where configured.

### 4. Coverage for viks-webui

Ensure **`test:ci`** runs with **`--code-coverage`** and Karma emits **`lcov.info`**; point `sonar.javascript.lcov.reportPaths` at that file in `sonar-project.properties`.

---

## Summary

| Question | Answer |
|----------|--------|
| New Docker Linux container for SonarQube? | **Yes** (recommended): run SonarQube as its **own** service/container, not inside Jenkins. |
| Database? | **Yes** for real use: **PostgreSQL** (e.g. second container). |
| Same machine as Jenkins? | **Possible** in a lab if RAM/CPU are enough; separate VM is cleaner for production. |
| What changes in this repo? | Add **`sonar-project.properties`**, scanner dependency or global tool, and replace **SonarQube** stages in **`Jenkinsfile`**. |

For official, version-specific steps (edition, LDAP, HTTPS, upgrading), always follow **[SonarQube documentation](https://docs.sonarsource.com/sonarqube/latest/)** for the image and version you deploy.
