---
type: "Sentry / Resilience"
title: "Error Recovery & Exponential Backoff Architecture"
description: "Network fault resilience, retry loops with exponential delays, and API rate limit management."
resource: "file:///C:/Users/kspra/code/github/ExplodeIt/services/geminiService.ts"
tags: ["error-handling", "exponential-backoff", "resilience", "retry-logic"]
---

# Error Recovery & Exponential Backoff Architecture

## Overview
Because ExplodeIt orchestrates multiple distributed AI foundation models over external HTTPS APIs, transient network failures, model concurrency spikes, and rate limiting (HTTP 429) are inherent runtime risks. To ensure system resilience, the service layer wraps operations in an exponential backoff retry loop and implements strategic error classification in the UI controller.

## Retry Engine Implementation (`callWithRetry`)

All core API operations in `services/geminiService.ts` are guarded by the `callWithRetry` higher-order utility:

```typescript
const callWithRetry = async <T>(
    fn: () => Promise<T>, 
    retries = 3, 
    delay = 1000, 
    context = ""
): Promise<T> => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            console.warn(`Attempt ${i + 1} failed for ${context}:`, error);
            if (i === retries - 1) throw error;
            // Exponential backoff: delay * 2^i
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
    throw new Error(`Failed after ${retries} attempts`);
};
```

### Backoff Schedule Analysis:
For a default operation (`retries = 3`, `delay = 1000`):
- **Initial Execution**: Immediate call ($t = 0\text{s}$).
- **Failure 1**: Pauses $1000 \times 2^0 = 1000\text{ms}$ (1 second) before Attempt 2.
- **Failure 2**: Pauses $1000 \times 2^1 = 2000\text{ms}$ (2 seconds) before Attempt 3.
- **Final Exhaustion**: If Attempt 3 fails, the exception is propagated to the UI controller.

For long-running operations like Veo Video Generation (`retries = 2`, `delay = 5000`):
- **Failure 1**: Pauses $5000 \times 2^0 = 5000\text{ms}$ (5 seconds) before Attempt 2.

## Authentication Error Interception & Circuit Breaking

Unlike transient network blips or rate limits, HTTP 401/403 credential errors will never resolve through retries. In `App.tsx`, these errors bypass prolonged retries:

```typescript
// Auth Error Interception
if (msg.includes("401") || msg.includes("API key") || msg.includes("403")) {
     setError("Invalid API Key. Please check your key and try again.");
     setIsModalOpen(true); // Re-opens credential configuration modal
     setStatus(GenerationStatus.FAILED);
     return;
}
```
This protects the user's rate limits and avoids unnecessary delays when credentials are expired or invalid.

## Graceful JSON Fallback & Search Parsing

During Phase 4 (`enrichComponentDetails`), models returning search grounding may wrap JSON in Markdown code fences or output minor variations. The service employs a robust multi-pass extraction regex:

```typescript
const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
const jsonString = jsonMatch ? jsonMatch[1] : text;

let result: { components: ComponentPart[] } = { components: [] };
try {
    result = JSON.parse(jsonString);
} catch (e) {
    console.error("Failed to parse JSON from search result", text);
    // Graceful continuation: retains partial batch rather than crashing pipeline
}
```

If parsing encounters an anomaly, the batch yields empty or fallback structures without interrupting the concurrent execution of other components or sibling pipelines.
