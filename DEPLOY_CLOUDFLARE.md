# Deploying ExplodeIt to Cloudflare Pages & R2

ExplodeIt is an interactive educational encyclopedia designed to run natively on the **Cloudflare Pages** edge network paired with **Cloudflare R2** object storage for zero-egress community contributions.

This operational runbook provides step-by-step instructions for initial provisioning, credentials configuration, local edge emulation, automated CI/CD deployment, and emergency procedures.

---

## 🏛️ Edge Architecture Overview

ExplodeIt employs an edge-native hybrid architecture:

```
                      ┌──────────────────────────────────────────────┐
                      │              Browser Client                  │
                      │  (React 19 + Tailwind CSS + sessionStorage)  │
                      └───────┬───────────────────────────────┬──────┘
                              │                               │
                      Static Assets (CDN)             API Requests (/api/*)
                              │                               │
                              ▼                               ▼
                      ┌──────────────┐                ┌──────────────┐
                      │  Cloudflare  │                │  Cloudflare  │
                      │ Pages Global │                │    Pages     │
                      │     CDN      │                │  Functions   │
                      │   (/dist)    │                │ (Node Compat)│
                      └──────────────┘                └───────┬──────┘
                                                              │
                                                      R2 Bucket Binding
                                                      (COMMUNITY_BUCKET)
                                                              │
                                                              ▼
                                                      ┌──────────────┐
                                                      │  Cloudflare  │
                                                      │  R2 Storage  │
                                                      │ (explodeit-  │
                                                      │  community)  │
                                                      └──────────────┘
```

1. **Static Frontend**: Compiled by Vite to `dist/` and served with low latency globally via Cloudflare Pages CDN.
2. **Serverless Edge Functions**: Handled by `functions/api/contribute.ts` running in Cloudflare Pages Functions runtime (`nodejs_compat`).
3. **Community Object Storage**: Uploaded blueprints, images, animations, and audio narrations are stored in Cloudflare R2 bucket `explodeit-community` via the `COMMUNITY_BUCKET` binding.
4. **Media Delivery**: Media assets are streamed directly from R2 using Pages Functions (`/api/contribute?assetPath=topics/...`) with immutable cache headers (`Cache-Control: public, max-age=31536000, immutable`), or optionally via a custom R2 CDN domain (`COMMUNITY_PUBLIC_URL`).
5. **Zero-Leak BYOK**: Gemini API keys reside strictly in browser `sessionStorage`. They are never uploaded, never logged, and never stored in R2 or local storage.

---

## Step 1: Cloudflare R2 Bucket Creation & CORS Setup

### 1.1 Create the R2 Bucket

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the navigation sidebar, go to **Storage & Databases** → **R2 Object Storage**.
3. Click **Create bucket**.
4. Configure bucket settings:
   - **Bucket name**: `explodeit-community` *(Must match the `bucket_name` declared in `wrangler.jsonc`)*.
   - **Location**: Select **Automatic** (or your preferred region).
5. Click **Create bucket**.

### 1.2 Configure Bucket CORS Policy

To allow browsers to load and upload media assets smoothly:

1. On the `explodeit-community` bucket page, select the **Settings** tab.
2. Scroll to the **CORS Policy** section and click **Add CORS policy** (or **Edit CORS policy**).
3. Paste the following JSON policy:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:8788",
      "https://explodeit.pages.dev",
      "https://*.explodeit.pages.dev",
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "POST",
      "HEAD",
      "OPTIONS"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "Accept",
      "Authorization",
      "Range"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type",
      "Cache-Control"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

4. Click **Save**.

### 1.3 Optional Custom CDN Domain / Public Access

- If you wish to serve media via a public domain or R2.dev subdomain:
  1. In the **Settings** tab under **Public access**, click **Connect Domain** (or **Allow Access** for `r2.dev`).
  2. Note the resulting URL (e.g. `https://pub-xxxxxxxxxxxxxxxx.r2.dev`).
  3. Set this URL as the `COMMUNITY_PUBLIC_URL` variable in your environment or Cloudflare Pages settings.
- *Note*: If omitted, ExplodeIt automatically falls back to streaming media securely through the built-in Pages Function (`/api/contribute?assetPath=...`), requiring zero public bucket exposure.

---

## Step 2: Scoped Cloudflare API Token Generation

### 2.1 Locate Your Cloudflare Account ID

- **Via Dashboard**: Go to **Workers & Pages** → **Overview**. In the right-hand sidebar under **Account ID**, click **Copy**.
- **Via CLI**:
  ```bash
  npx wrangler whoami
  ```
  Copy the 32-character hexadecimal Account ID (e.g., `4f9e8a1b2c3d4e5f6a7b8c9d0e1f2a3b`).

### 2.2 Create a Least-Privilege Scoped API Token

1. Navigate to **My Profile** → **API Tokens** (or visit [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)).
2. Click **Create Token**.
3. Under **Custom token**, click **Get started**.
4. Configure the token:
   - **Token name**: `ExplodeIt Deployment Token`
   - **Permissions**:
     - `Account` — `Cloudflare Pages` — **Edit**
     - `Account` — `Workers R2 Storage` — **Edit**
   - **Account Resources**:
     - Include — `All accounts` (or select your specific Cloudflare account).
5. Click **Continue to summary**, review the details, and click **Create Token**.
6. **Copy the API Token immediately** and store it safely. Cloudflare will not display this secret value again.

---

## Step 3: GitHub Repository Secrets Configuration

To enable the automated GitHub Actions deployment pipeline, configure the credentials in your GitHub repository:

1. Open your **ExplodeIt** repository on GitHub.
2. Navigate to **Settings** → **Secrets and variables** → **Actions**.
3. Under **Repository secrets**, click **New repository secret** for each variable:

| Secret Name | Description | Value |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Scoped API token created in Step 2 | *Your Cloudflare API Token* |
| `CLOUDFLARE_ACCOUNT_ID` | 32-character Cloudflare Account ID | *Your Account ID (hex string)* |

> ⚠️ **Formatting Tip**: Ensure there are no accidental leading/trailing spaces or quotation marks when pasting secrets into GitHub.

---

## Step 4: Local Edge Emulation (`npm run pages:dev`)

Test the complete static frontend and serverless edge functions locally using Wrangler and Miniflare:

1. **Build the production client**:
   ```bash
   npm run build
   ```
2. **Launch the local Pages edge emulator**:
   ```bash
   npm run pages:dev
   ```
   - Wrangler starts a local server at `http://localhost:8788`.
   - Wrangler reads `wrangler.jsonc` and automatically creates an isolated, local simulated R2 store under `.wrangler/state/v3/r2/explodeit-community`.
3. **Verify Function & Storage Execution**:
   - Open `http://localhost:8788` in your browser.
   - Generate an exploded view topic and submit a community contribution.
   - Verify that the contribution manifest and media blobs persist in `.wrangler/state/v3/r2/explodeit-community/`.
4. *(Optional)* **Local Environment Overrides**:
   - Create a `.dev.vars` file in the project root to supply local environment variables:
     ```ini
     COMMUNITY_PUBLIC_URL=http://localhost:8788/api/contribute?assetPath=
     ```
   - Note: `.dev.vars` is automatically git-ignored to prevent secret leaks.

---

## Step 5: Automated Push-to-Deploy CI/CD Workflow

Once your GitHub Secrets are configured, deployment is fully automated:

1. **Push your code to the `main` branch**:
   ```bash
   git add .
   git commit -m "feat: configure cloudflare pages deployment"
   git push origin main
   ```
2. **The 5-Gate CI/CD Pipeline**:
   The workflow at `.github/workflows/deploy-cloudflare.yml` runs automatically with concurrency protection:
   - **Gate 1: Environment Setup**: Configures Node.js 20, enables npm cache, and runs `npm ci`.
   - **Gate 2: Typecheck**: Runs `npm run typecheck` (`tsc --noEmit`) to guarantee zero TypeScript errors.
   - **Gate 3: Contract & Unit Tests**: Runs `npm test` (`vitest run`) across all contract and unit test suites.
   - **Gate 4: Production Build**: Runs `npm run build` (`vite build`) producing optimized assets in `dist/`.
   - **Gate 5: Edge Deployment**: Invokes `cloudflare/wrangler-action@v3` with your secrets to deploy `dist/` and compile `functions/` to Cloudflare Pages project `explodeit`.
3. **Monitor the Pipeline**:
   - Check the **Actions** tab in GitHub to watch real-time step execution.
   - When complete, access your live application at `https://explodeit.pages.dev`.

---

## Step 6: Manual Emergency Deployment

If GitHub Actions is temporarily unavailable or you need an immediate emergency hotfix:

1. **Build the production bundle**:
   ```bash
   npm run build
   ```
2. **Authenticate Wrangler**:
   - **Via Environment Variables**:
     ```bash
     # Linux / macOS / Bash
     export CLOUDFLARE_API_TOKEN="your_api_token"
     export CLOUDFLARE_ACCOUNT_ID="your_account_id"

     # Windows PowerShell
     $env:CLOUDFLARE_API_TOKEN="your_api_token"
     $env:CLOUDFLARE_ACCOUNT_ID="your_account_id"
     ```
   - **Via Interactive Web Login**:
     ```bash
     npx wrangler login
     ```
3. **Deploy directly to Cloudflare Pages**:
   ```bash
   npm run pages:deploy
   ```
   *(Executes `wrangler pages deploy dist --project-name explodeit`)*.

---

## 🔍 Verification & Troubleshooting

| Symptom | Probable Cause | Resolution |
|---|---|---|
| `Directory "dist" not found` on `npm run pages:dev` | Missing build output | Run `npm run build` first before starting `pages:dev`. |
| `HTTP 503: COMMUNITY_BUCKET binding not configured` | Missing or mismatched R2 binding | Verify `wrangler.jsonc` specifies `binding: "COMMUNITY_BUCKET"` with bucket name `explodeit-community`. |
| `Error: apiToken is required` in GitHub Actions | Missing GitHub Secret | Add `CLOUDFLARE_API_TOKEN` under **Settings** → **Secrets and variables** → **Actions**. |
| `HTTP 403 Forbidden` during Wrangler deploy | Insufficient API token permissions | Verify token has `Account -> Cloudflare Pages -> Edit` AND `Account -> Workers R2 Storage -> Edit`. |
| Browser blocks image/video downloads with CORS error | Incomplete CORS configuration on R2 bucket | Re-apply the CORS configuration JSON from Step 1.2 to the `explodeit-community` bucket in the Cloudflare Dashboard. |
| Dual deployment triggered on GitHub Pages and Cloudflare | Active legacy workflow | Verify `.github/workflows/gh-pages.yml` was renamed to `.github/workflows/gh-pages.yml.disabled`. |
