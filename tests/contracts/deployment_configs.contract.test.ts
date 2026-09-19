import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Deployment Configuration Contract Test Suite
 * 
 * Verifies that all configuration artifacts, templates, CI/CD pipelines,
 * package scripts, ignore rules, and operational deployment documentation
 * conform strictly to the Cloudflare Pages and R2 deployment contracts
 * specified in Milestone 3.
 */

// Authoritative project root directory
const PROJECT_ROOT = path.resolve(__dirname).includes('contracts')
  ? path.resolve(__dirname, '../..')
  : process.cwd();

// Helper to safely strip JSON comments and parse JSONC
function parseJsonc<T = Record<string, any>>(content: string): T {
  // Strip block comments (/* ... */) and line comments (// ...)
  const stripped = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^\\])\/\/.*$/gm, '$1');
  return JSON.parse(stripped);
}

// Helper to parse key-value lines from .env files
function parseEnvLines(content: string): Map<string, string> {
  const envMap = new Map<string, string>();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      envMap.set(key, val);
    }
  }
  return envMap;
}

// Structured Step descriptor for GitHub Actions workflow
interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, string>;
}

// Helper to parse GitHub Actions workflow steps without external yaml dependency
function parseWorkflowSteps(yamlContent: string): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  const lines = yamlContent.split(/\r?\n/);
  
  let inSteps = false;
  let currentStep: WorkflowStep | null = null;
  let currentWithKey: string | null = null;
  let inWith = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!inSteps) {
      if (trimmed === 'steps:') {
        inSteps = true;
      }
      continue;
    }

    // Check if exiting steps block (new top-level or new job key with indentation <= 4)
    if (/^[a-zA-Z0-9_-]+:/.test(rawLine) && !rawLine.startsWith(' ')) {
      break;
    }

    // New step item indicator: "      - " or "    - "
    const stepMatch = rawLine.match(/^(\s+)-\s+(.*)$/);
    if (stepMatch) {
      if (currentStep) {
        steps.push(currentStep);
      }
      currentStep = {};
      inWith = false;
      currentWithKey = null;

      const rest = stepMatch[2].trim();
      if (rest.startsWith('name:')) {
        currentStep.name = rest.replace('name:', '').trim().replace(/^['"]|['"]$/g, '');
      } else if (rest.startsWith('uses:')) {
        currentStep.uses = rest.replace('uses:', '').trim().replace(/^['"]|['"]$/g, '');
      } else if (rest.startsWith('run:')) {
        currentStep.run = rest.replace('run:', '').trim().replace(/^['"]|['"]$/g, '');
      }
      continue;
    }

    if (!currentStep) continue;

    const indentMatch = rawLine.match(/^(\s+)(.*)$/);
    if (!indentMatch) continue;
    const content = indentMatch[2].trim();

    if (content.startsWith('name:')) {
      currentStep.name = content.replace('name:', '').trim().replace(/^['"]|['"]$/g, '');
      inWith = false;
    } else if (content.startsWith('uses:')) {
      currentStep.uses = content.replace('uses:', '').trim().replace(/^['"]|['"]$/g, '');
      inWith = false;
    } else if (content.startsWith('run:')) {
      currentStep.run = content.replace('run:', '').trim().replace(/^['"]|['"]$/g, '');
      inWith = false;
    } else if (content === 'with:') {
      inWith = true;
      currentStep.with = currentStep.with || {};
    } else if (inWith) {
      const withMatch = content.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (withMatch) {
        currentWithKey = withMatch[1];
        const val = withMatch[2].trim().replace(/^['"]|['"]$/g, '');
        currentStep.with![currentWithKey] = val;
      }
    }
  }

  if (currentStep) {
    steps.push(currentStep);
  }

  return steps;
}

describe('Deployment Configuration Contract Suite', () => {

  // ==========================================================================
  // CONTRACT 1: wrangler.jsonc Schema & Invariants
  // ==========================================================================
  describe('Contract 1: wrangler.jsonc Schema & Invariants', () => {
    const wranglerFilePath = path.join(PROJECT_ROOT, 'wrangler.jsonc');

    it('C1.1: wrangler.jsonc must exist and be valid JSONC', () => {
      expect(fs.existsSync(wranglerFilePath), `wrangler.jsonc not found at ${wranglerFilePath}`).toBe(true);
      const rawContent = fs.readFileSync(wranglerFilePath, 'utf8');
      expect(rawContent.trim().length).toBeGreaterThan(0);

      expect(() => {
        parseJsonc(rawContent);
      }).not.toThrow();
    });

    it('C1.2: wrangler.jsonc enforces required top-level attributes', () => {
      const config = parseJsonc<Record<string, any>>(fs.readFileSync(wranglerFilePath, 'utf8'));

      // Project Name
      expect(config.name).toBe('explodeit');

      // Pages Build Output Directory must match Vite standard output ('dist')
      expect(config.pages_build_output_dir).toBe('dist');

      // Compatibility Date must be valid ISO date string >= 2024-09-23
      expect(typeof config.compatibility_date).toBe('string');
      expect(config.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(config.compatibility_date >= '2024-09-23').toBe(true);

      // Compatibility Flags must include 'nodejs_compat'
      expect(Array.isArray(config.compatibility_flags)).toBe(true);
      expect(config.compatibility_flags).toContain('nodejs_compat');
    });

    it('C1.3: wrangler.jsonc declares R2 bucket binding for COMMUNITY_BUCKET', () => {
      const config = parseJsonc<Record<string, any>>(fs.readFileSync(wranglerFilePath, 'utf8'));

      expect(Array.isArray(config.r2_buckets)).toBe(true);
      expect(config.r2_buckets.length).toBeGreaterThanOrEqual(1);

      const communityBucketBinding = config.r2_buckets.find(
        (b: any) => b.binding === 'COMMUNITY_BUCKET'
      );
      expect(communityBucketBinding).toBeDefined();
      expect(communityBucketBinding.binding).toBe('COMMUNITY_BUCKET');
      expect(communityBucketBinding.bucket_name).toBe('explodeit-community');
    });

    it('C1.4: [Adversarial] wrangler.jsonc must not declare duplicate bindings or invalid output dirs', () => {
      const config = parseJsonc<Record<string, any>>(fs.readFileSync(wranglerFilePath, 'utf8'));

      // No duplicate binding names
      const bindings = config.r2_buckets.map((b: any) => b.binding);
      const uniqueBindings = new Set(bindings);
      expect(bindings.length).toBe(uniqueBindings.size);

      // Pages build output dir must not be empty or point to root/build/public
      expect(config.pages_build_output_dir).not.toBe('');
      expect(config.pages_build_output_dir).not.toBe('.');
      expect(config.pages_build_output_dir).not.toBe('build');
      expect(config.pages_build_output_dir).not.toBe('public');
      expect(config.pages_build_output_dir).toBe('dist');
    });
  });

  // ==========================================================================
  // CONTRACT 2: .env.example Completeness & Secret Protection
  // ==========================================================================
  describe('Contract 2: .env.example Completeness & Secret Protection', () => {
    const envExamplePath = path.join(PROJECT_ROOT, '.env.example');

    it('C2.1: .env.example must exist and contain header instructions', () => {
      expect(fs.existsSync(envExamplePath), `.env.example not found at ${envExamplePath}`).toBe(true);
      const rawContent = fs.readFileSync(envExamplePath, 'utf8');
      expect(rawContent).toContain('ExplodeIt: Environment Configuration Template');
      expect(rawContent).toContain('.dev.vars');
    });

    it('C2.2: .env.example must document all 7 mandatory configuration keys', () => {
      const rawContent = fs.readFileSync(envExamplePath, 'utf8');
      const envMap = parseEnvLines(rawContent);

      const expectedKeys = [
        'CLOUDFLARE_ACCOUNT_ID',
        'CLOUDFLARE_API_TOKEN',
        'CLOUDFLARE_PROJECT_NAME',
        'CLOUDFLARE_R2_BUCKET_NAME',
        'COMMUNITY_PUBLIC_URL',
        'GEMINI_API_KEY',
        'VITE_BASE_PATH'
      ];

      for (const key of expectedKeys) {
        expect(envMap.has(key), `Missing required environment variable: ${key}`).toBe(true);
      }
      expect(envMap.size).toBeGreaterThanOrEqual(7);
    });

    it('C2.3: .env.example default values match project architecture', () => {
      const rawContent = fs.readFileSync(envExamplePath, 'utf8');
      const envMap = parseEnvLines(rawContent);

      expect(envMap.get('CLOUDFLARE_PROJECT_NAME')).toBe('explodeit');
      expect(envMap.get('CLOUDFLARE_R2_BUCKET_NAME')).toBe('explodeit-community');
      expect(envMap.get('VITE_BASE_PATH')).toBe('./');
    });

    it('C2.4: [Adversarial] .env.example must have zero secret leakage', () => {
      const rawContent = fs.readFileSync(envExamplePath, 'utf8');
      const envMap = parseEnvLines(rawContent);

      // Account ID must be placeholder or empty, never a live 32-char hex string
      const accountId = envMap.get('CLOUDFLARE_ACCOUNT_ID') || '';
      expect(accountId).not.toMatch(/^[a-f0-9]{32}$/i);
      expect(accountId === '' || accountId.includes('your_') || accountId.includes('here')).toBe(true);

      // API Token must be placeholder or empty, never a live token
      const apiToken = envMap.get('CLOUDFLARE_API_TOKEN') || '';
      expect(apiToken === '' || apiToken.includes('your_') || apiToken.includes('here')).toBe(true);

      // Gemini Key must not match Google API key pattern (AIzaSy...)
      const geminiKey = envMap.get('GEMINI_API_KEY') || '';
      expect(geminiKey).not.toMatch(/AIzaSy[A-Za-z0-9_-]{33}/);

      // Global regex scans for accidental key leaks anywhere in the file
      expect(rawContent).not.toMatch(/AIzaSy[A-Za-z0-9_-]{33}/);
      expect(rawContent).not.toMatch(/ya29\.[A-Za-z0-9_-]+/);
      expect(rawContent).not.toMatch(/-----BEGIN (RSA )?PRIVATE KEY-----/);
    });
  });

  // ==========================================================================
  // CONTRACT 3: package.json Scripts & Cloudflare Dependencies
  // ==========================================================================
  describe('Contract 3: package.json Scripts & Cloudflare Dependencies', () => {
    const pkgPath = path.join(PROJECT_ROOT, 'package.json');

    it('C3.1: package.json contains required scripts for Cloudflare Pages emulation and deployment', () => {
      expect(fs.existsSync(pkgPath)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      expect(pkg.scripts).toBeDefined();
      expect(pkg.scripts['pages:dev']).toBeDefined();
      expect(pkg.scripts['pages:dev']).toBe('wrangler pages dev dist');

      expect(pkg.scripts['pages:deploy']).toBeDefined();
      expect(pkg.scripts['pages:deploy']).toBe('wrangler pages deploy dist --project-name explodeit');
    });

    it('C3.2: package.json preserves standard verification scripts', () => {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      expect(pkg.scripts['build']).toBe('vite build');
      expect(pkg.scripts['typecheck']).toBe('tsc --noEmit');
      expect(pkg.scripts['test']).toBe('vitest run');
    });

    it('C3.3: package.json includes wrangler in devDependencies (v3.x)', () => {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      expect(pkg.devDependencies).toBeDefined();
      expect(pkg.devDependencies['wrangler']).toBeDefined();
      expect(pkg.devDependencies['wrangler']).toMatch(/(\^|~)?3\./);
    });
  });

  // ==========================================================================
  // CONTRACT 4: GitHub Actions Cloudflare CI/CD Pipeline
  // ==========================================================================
  describe('Contract 4: GitHub Actions Cloudflare CI/CD Pipeline', () => {
    const workflowPath = path.join(PROJECT_ROOT, '.github/workflows/deploy-cloudflare.yml');

    it('C4.1: deploy-cloudflare.yml must exist and have valid structure', () => {
      expect(fs.existsSync(workflowPath), `Workflow not found at ${workflowPath}`).toBe(true);
      const rawContent = fs.readFileSync(workflowPath, 'utf8');

      expect(rawContent.trim().length).toBeGreaterThan(0);
      expect(rawContent).toContain('name: Deploy ExplodeIt to Cloudflare Pages');
    });

    it('C4.2: deploy-cloudflare.yml triggers on main push and manual workflow_dispatch', () => {
      const rawContent = fs.readFileSync(workflowPath, 'utf8');

      // Main push trigger
      expect(rawContent).toMatch(/push:\s*\n\s*branches:\s*\[\s*main\s*\]/);

      // Workflow dispatch trigger
      expect(rawContent).toMatch(/workflow_dispatch:/);
    });

    it('C4.3: deploy-cloudflare.yml defines concurrency control and permissions', () => {
      const rawContent = fs.readFileSync(workflowPath, 'utf8');

      expect(rawContent).toContain('concurrency:');
      expect(rawContent).toContain('group: "cloudflare-pages"');
      expect(rawContent).toContain('cancel-in-progress: true');

      expect(rawContent).toContain('permissions:');
      expect(rawContent).toContain('contents: read');
      expect(rawContent).toContain('deployments: write');
    });

    it('C4.4: deploy-cloudflare.yml executes 5 strict quality gates in sequential order', () => {
      const rawContent = fs.readFileSync(workflowPath, 'utf8');
      const steps = parseWorkflowSteps(rawContent);

      expect(steps.length).toBeGreaterThanOrEqual(6);

      // Extract step commands / action names
      const stepUses = steps.map(s => s.uses || '');
      const stepRuns = steps.map(s => s.run || '');

      // Gate 1: Checkout & Node Setup
      expect(stepUses).toContain('actions/checkout@v4');
      const nodeStep = steps.find(s => s.uses?.startsWith('actions/setup-node'));
      expect(nodeStep).toBeDefined();
      expect(nodeStep?.with?.['node-version']).toBe('20');
      expect(nodeStep?.with?.['cache']).toBe('npm');

      // Gate 2: Install dependencies
      const installIdx = stepRuns.indexOf('npm ci');
      expect(installIdx).toBeGreaterThan(-1);

      // Gate 3: Strict TypeScript typecheck
      const typecheckIdx = stepRuns.indexOf('npm run typecheck');
      expect(typecheckIdx).toBeGreaterThan(-1);

      // Gate 4: Test execution
      const testIdx = stepRuns.indexOf('npm test');
      expect(testIdx).toBeGreaterThan(-1);

      // Gate 5: Production build
      const buildIdx = stepRuns.indexOf('npm run build');
      expect(buildIdx).toBeGreaterThan(-1);

      // Final Deployment Action
      const deployStep = steps.find(s => s.uses?.startsWith('cloudflare/wrangler-action'));
      expect(deployStep).toBeDefined();
      const deployIdx = steps.indexOf(deployStep!);

      // Assert strict sequential quality gating:
      // install -> typecheck -> test -> build -> deploy
      expect(installIdx).toBeLessThan(typecheckIdx);
      expect(typecheckIdx).toBeLessThan(testIdx);
      expect(testIdx).toBeLessThan(buildIdx);
      expect(buildIdx).toBeLessThan(deployIdx);
    });

    it('C4.5: deploy-cloudflare.yml references required repository secrets and parameters', () => {
      const rawContent = fs.readFileSync(workflowPath, 'utf8');
      const steps = parseWorkflowSteps(rawContent);

      const deployStep = steps.find(s => s.uses?.startsWith('cloudflare/wrangler-action'));
      expect(deployStep).toBeDefined();
      expect(deployStep?.uses).toBe('cloudflare/wrangler-action@v3');

      expect(deployStep?.with?.['apiToken']).toBe('${{ secrets.CLOUDFLARE_API_TOKEN }}');
      expect(deployStep?.with?.['accountId']).toBe('${{ secrets.CLOUDFLARE_ACCOUNT_ID }}');
      expect(deployStep?.with?.['command']).toBe('pages deploy dist --project-name=explodeit');

      // Zero hardcoded secret patterns
      expect(rawContent).not.toMatch(/AIzaSy[A-Za-z0-9_-]{33}/);
      expect(rawContent).not.toMatch(/ya29\.[A-Za-z0-9_-]+/);
      expect(rawContent).not.toContain('ksprashanth@google.com');
    });
  });

  // ==========================================================================
  // CONTRACT 5: Legacy Workflow Archival
  // ==========================================================================
  describe('Contract 5: Legacy Workflow Archival', () => {
    const legacyActivePath = path.join(PROJECT_ROOT, '.github/workflows/gh-pages.yml');
    const legacyDisabledPath = path.join(PROJECT_ROOT, '.github/workflows/gh-pages.yml.disabled');

    it('C5.1: Active gh-pages.yml must NOT exist in .github/workflows/', () => {
      expect(fs.existsSync(legacyActivePath), 'gh-pages.yml is active! Must be disabled to prevent dual-deployment collisions.').toBe(false);
    });

    it('C5.2: Disabled gh-pages.yml.disabled MUST exist with archival banner', () => {
      expect(fs.existsSync(legacyDisabledPath), `Archived workflow not found at ${legacyDisabledPath}`).toBe(true);

      const rawContent = fs.readFileSync(legacyDisabledPath, 'utf8');
      expect(rawContent).toContain('ARCHIVED WORKFLOW - DISABLED');
      expect(rawContent).toContain('deploy-cloudflare.yml');
      expect(rawContent).toContain('dual-deployment');
    });

    it('C5.3: [Adversarial] No other active deployment workflows exist', () => {
      const workflowsDir = path.join(PROJECT_ROOT, '.github/workflows');
      const entries = fs.readdirSync(workflowsDir);

      const activeWorkflows = entries.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
      expect(activeWorkflows).toEqual(['deploy-cloudflare.yml']);
    });
  });

  // ==========================================================================
  // CONTRACT 6: .gitignore Rules
  // ==========================================================================
  describe('Contract 6: .gitignore Rules', () => {
    const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');

    it('C6.1: .gitignore must exist and exclude .wrangler and .dev.vars*', () => {
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const rawContent = fs.readFileSync(gitignorePath, 'utf8');
      const lines = rawContent.split(/\r?\n/).map(l => l.trim());

      // Check wrangler directory ignore
      expect(lines.some(l => l === '.wrangler' || l === '.wrangler/')).toBe(true);

      // Check local vars ignore
      expect(lines.some(l => l === '.dev.vars*' || l === '.dev.vars')).toBe(true);
    });

    it('C6.2: [Adversarial] Critical config files are NOT gitignored', () => {
      const rawContent = fs.readFileSync(gitignorePath, 'utf8');
      const lines = rawContent.split(/\r?\n/).map(l => l.trim());

      const forbiddenIgnores = ['wrangler.jsonc', '.env.example', 'DEPLOY_CLOUDFLARE.md', 'package.json'];
      for (const item of forbiddenIgnores) {
        expect(lines).not.toContain(item);
      }
    });
  });

  // ==========================================================================
  // CONTRACT 7: Cross-Configuration Coherence & Synchronization
  // ==========================================================================
  describe('Contract 7: Cross-Configuration Coherence & Synchronization', () => {
    it('C7.1: Output directory "dist" is consistently specified across all configs', () => {
      const wrangler = parseJsonc<Record<string, any>>(fs.readFileSync(path.join(PROJECT_ROOT, 'wrangler.jsonc'), 'utf8'));
      const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
      const workflowRaw = fs.readFileSync(path.join(PROJECT_ROOT, '.github/workflows/deploy-cloudflare.yml'), 'utf8');
      const gitignoreRaw = fs.readFileSync(path.join(PROJECT_ROOT, '.gitignore'), 'utf8');

      // wrangler output dir
      expect(wrangler.pages_build_output_dir).toBe('dist');

      // package.json scripts
      expect(pkg.scripts['pages:dev']).toContain('dist');
      expect(pkg.scripts['pages:deploy']).toContain('dist');

      // CI/CD deploy command
      expect(workflowRaw).toContain('pages deploy dist');

      // gitignore ignores build output
      const gitignoreLines = gitignoreRaw.split(/\r?\n/).map(l => l.trim());
      expect(gitignoreLines).toContain('dist');
    });

    it('C7.2: Project name "explodeit" is consistently specified across all configs', () => {
      const wrangler = parseJsonc<Record<string, any>>(fs.readFileSync(path.join(PROJECT_ROOT, 'wrangler.jsonc'), 'utf8'));
      const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
      const envMap = parseEnvLines(fs.readFileSync(path.join(PROJECT_ROOT, '.env.example'), 'utf8'));
      const workflowRaw = fs.readFileSync(path.join(PROJECT_ROOT, '.github/workflows/deploy-cloudflare.yml'), 'utf8');

      expect(wrangler.name).toBe('explodeit');
      expect(pkg.scripts['pages:deploy']).toContain('--project-name explodeit');
      expect(envMap.get('CLOUDFLARE_PROJECT_NAME')).toBe('explodeit');
      expect(workflowRaw).toContain('--project-name=explodeit');
    });

    it('C7.3: R2 bucket name "explodeit-community" matches between wrangler and .env.example', () => {
      const wrangler = parseJsonc<Record<string, any>>(fs.readFileSync(path.join(PROJECT_ROOT, 'wrangler.jsonc'), 'utf8'));
      const envMap = parseEnvLines(fs.readFileSync(path.join(PROJECT_ROOT, '.env.example'), 'utf8'));

      const communityBucket = wrangler.r2_buckets.find((b: any) => b.binding === 'COMMUNITY_BUCKET');
      expect(communityBucket.bucket_name).toBe('explodeit-community');
      expect(envMap.get('CLOUDFLARE_R2_BUCKET_NAME')).toBe('explodeit-community');
    });

    it('C7.4: Binding "COMMUNITY_BUCKET" matches functions/api/contribute.ts Env interface', () => {
      const wrangler = parseJsonc<Record<string, any>>(fs.readFileSync(path.join(PROJECT_ROOT, 'wrangler.jsonc'), 'utf8'));
      const contributeTsRaw = fs.readFileSync(path.join(PROJECT_ROOT, 'functions/api/contribute.ts'), 'utf8');

      const communityBucket = wrangler.r2_buckets.find((b: any) => b.binding === 'COMMUNITY_BUCKET');
      expect(communityBucket).toBeDefined();

      // Ensure contribute.ts defines COMMUNITY_BUCKET: R2Bucket
      expect(contributeTsRaw).toMatch(/COMMUNITY_BUCKET:\s*R2Bucket/);
    });
  });

  // ==========================================================================
  // CONTRACT 8: DEPLOY_CLOUDFLARE.md Onboarding Runbook Invariants
  // ==========================================================================
  describe('Contract 8: DEPLOY_CLOUDFLARE.md Onboarding Runbook Invariants', () => {
    const runbookPath = path.join(PROJECT_ROOT, 'DEPLOY_CLOUDFLARE.md');

    it('C8.1: DEPLOY_CLOUDFLARE.md must exist and contain title and edge architecture overview', () => {
      expect(fs.existsSync(runbookPath), `DEPLOY_CLOUDFLARE.md not found at ${runbookPath}`).toBe(true);
      const rawContent = fs.readFileSync(runbookPath, 'utf8');

      expect(rawContent.length).toBeGreaterThan(500);
      expect(rawContent).toContain('Deploying ExplodeIt to Cloudflare Pages & R2');
      expect(rawContent).toContain('Edge Architecture Overview');
      expect(rawContent).toContain('COMMUNITY_BUCKET');
    });

    it('C8.2: DEPLOY_CLOUDFLARE.md covers all 6 sequential onboarding & deployment steps', () => {
      const rawContent = fs.readFileSync(runbookPath, 'utf8');

      // Step 1: Bucket creation & CORS
      expect(rawContent).toContain('Step 1: Cloudflare R2 Bucket Creation & CORS Setup');
      expect(rawContent).toContain('explodeit-community');
      expect(rawContent).toContain('AllowedOrigins');
      expect(rawContent).toContain('AllowedMethods');

      // Step 2: Scoped API Token
      expect(rawContent).toContain('Step 2: Scoped Cloudflare API Token Generation');
      expect(rawContent).toContain('Cloudflare Pages');
      expect(rawContent).toContain('Workers R2 Storage');
      expect(rawContent).toContain('Account ID');

      // Step 3: GitHub Secrets
      expect(rawContent).toContain('Step 3: GitHub Repository Secrets Configuration');
      expect(rawContent).toContain('CLOUDFLARE_API_TOKEN');
      expect(rawContent).toContain('CLOUDFLARE_ACCOUNT_ID');

      // Step 4: Local Edge Emulation
      expect(rawContent).toContain('Step 4: Local Edge Emulation');
      expect(rawContent).toContain('npm run pages:dev');
      expect(rawContent).toContain('8788');

      // Step 5: Automated Push-to-Deploy
      expect(rawContent).toContain('Step 5: Automated Push-to-Deploy CI/CD Workflow');
      expect(rawContent).toContain('git push origin main');
      expect(rawContent).toContain('deploy-cloudflare.yml');

      // Step 6: Manual Emergency Deployment
      expect(rawContent).toContain('Step 6: Manual Emergency Deployment');
      expect(rawContent).toContain('npm run pages:deploy');
    });

    it('C8.3: [Adversarial] DEPLOY_CLOUDFLARE.md has zero live credentials or real secrets', () => {
      const rawContent = fs.readFileSync(runbookPath, 'utf8');

      // No real Google API keys
      expect(rawContent).not.toMatch(/AIzaSy[A-Za-z0-9_-]{33}/);
      // No live OAuth tokens
      expect(rawContent).not.toMatch(/ya29\.[A-Za-z0-9_-]+/);
      // No corporate email addresses
      expect(rawContent).not.toContain('ksprashanth@google.com');
    });
  });
});
