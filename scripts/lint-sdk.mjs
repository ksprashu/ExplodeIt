import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 [SDK Linter] Starting static analysis of @google/genai call sites...');

const violations = [];

// 1. Scan services/geminiService.ts
const geminiServicePath = path.join(rootDir, 'services', 'geminiService.ts');
if (!fs.existsSync(geminiServicePath)) {
  violations.push(`services/geminiService.ts does not exist`);
} else {
  const content = fs.readFileSync(geminiServicePath, 'utf8');

  // Check A: No uppercase 'HIGH' in thinking_level
  const uppercaseThinkingLevelRegex = /thinking_level\s*:\s*['"](HIGH|LOW|MEDIUM|MINIMAL)['"]/g;
  let match;
  while ((match = uppercaseThinkingLevelRegex.exec(content)) !== null) {
    violations.push(`Found uppercase thinking_level '${match[1]}' in services/geminiService.ts at index ${match.index}. Must be lowercase.`);
  }

  // Check B: No top-level thinkingConfig in ai.interactions.create call sites
  // Scan all interactions.create calls
  const interactionsCreateRegex = /ai\.interactions\.create\s*\(\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*\)/gs;
  while ((match = interactionsCreateRegex.exec(content)) !== null) {
    const callBody = match[1];
    if (/\bthinkingConfig\b\s*:/.test(callBody)) {
      violations.push(`Found top-level 'thinkingConfig' in ai.interactions.create in services/geminiService.ts. Use generation_config: { thinking_level: 'high' } instead.`);
    }
    if (/\btemperature\b\s*:/.test(callBody) || /\btop_p\b\s*:/.test(callBody) || /\btop_k\b\s*:/.test(callBody)) {
      violations.push(`Found deprecated sampling parameter (temperature/top_p/top_k) in ai.interactions.create in services/geminiService.ts.`);
    }
  }

  // Check C: Ensure thinking_level in planObject is 'high' or uses normalized variable
  if (!content.includes("thinking_level: thinkingLevel") && !content.includes("thinking_level: 'high'")) {
    violations.push(`planObject in services/geminiService.ts must pass thinking_level: thinkingLevel or 'high'.`);
  }

  // Check D: Ensure normalizeThinkingLevel function is defined and exported
  if (!content.includes('export const normalizeThinkingLevel')) {
    violations.push(`services/geminiService.ts must export normalizeThinkingLevel utility.`);
  }
}

// 2. Scan for deprecated models across all src and services
const filesToScan = [
  'services/geminiService.ts',
  'constants.ts',
  'App.tsx'
];

const deprecatedModelRegex = /['"](gemini-1\.5-[^'"]+|gemini-2\.0-[^'"]+|gemini-2\.5-[^'"]+)['"]/g;

for (const relFile of filesToScan) {
  const filePath = path.join(rootDir, relFile);
  if (fs.existsSync(filePath)) {
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      // Ignore comments or mock fallback checks
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
      if (line.includes('model ===') || line.includes('modelId ===') || line.includes('retained for backward compatibility')) return;

      let modelMatch;
      while ((modelMatch = deprecatedModelRegex.exec(line)) !== null) {
        // Exclude allowed fallback check lines
        if (!line.includes('gemini-2.5-flash') || line.includes('MODEL_')) {
          violations.push(`Found deprecated model reference '${modelMatch[1]}' at ${relFile}:${idx + 1}: ${trimmed}`);
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error('\n❌ [SDK Linter] Found SDK signature/schema violations:');
  for (const v of violations) {
    console.error(`   • ${v}`);
  }
  process.exit(1);
} else {
  console.log('✅ [SDK Linter] All Gemini SDK call sites and schema signatures verified successfully!');
  process.exit(0);
}
