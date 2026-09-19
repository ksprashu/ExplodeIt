---
type: "Architecture / Generative Prompt Engineering"
title: "Kinematic & Anatomical Prompt Engineering Architecture"
description: "4-tier anatomical deconstruction and isometric leader line prompts for Gemini 3 Pro Image and Veo 3.1 video assembly."
resource: "file:///constants.ts"
tags: ["prompt-engineering", "kinematics", "infographics", "veo", "gemini-image"]
---

# Kinematic & Anatomical Prompt Engineering Architecture

## Overview
Generating convincing "exploded views" and assembly animations requires rigorous spatial consistency between static infographics and temporal video models. ExplodeIt utilizes an advanced **Kinematic Prompt Engineering Architecture** in `constants.ts` and `geminiService.ts` that enforces structural cutaways, isometric orientation, leader line callouts, and start/end frame temporal alignment.

## Core Prompt Methodologies

### 1. Infographic Anatomical Deconstruction Prompting (`SYSTEM_PROMPT_INFOGRAPHIC`)
Enforces a 4-tier spatial layout for Gemini 3 Pro Image:
1. **Tier 1 (Outer Enclosure & Housing)**: Suspended in upper-left and lower-right quadrants with translucent cross-sections.
2. **Tier 2 (Structural Chassis & Frame)**: Centrally anchored along a consistent 30-degree isometric perspective axis.
3. **Tier 3 (Core Mechanical / Functional Assemblies)**: Exploded outwardly perpendicular to the central axis with visible mounting pins, gears, and fasteners.
4. **Tier 4 (Micro-Components & Electronics)**: Detailed close-up breakout clusters with delicate leader line pointers.

#### Aesthetic & Lighting Invariants
- Studio neutral dark background (`#0b0f19` to `#1e293b`).
- 5600K calibrated studio rim lighting highlighting edge bevels and material textures.
- Clear cyan/amber accented leader lines connecting parts to numerical callout labels.

### 2. Temporal Kinematic Video Prompting (`SYSTEM_PROMPT_VIDEO`)
Veo 3.1 synthesizes 5–8 second kinematic assembly/disassembly sequences. The prompt enforces strict physical mechanics:
- **Spatial Alignment Constraint**:
  - **Start Frame**: Matches the exploded infographic layout (parts floating symmetrically in exploded space).
  - **End Frame**: Matches the fully assembled, sealed studio product shot.
- **4-Phase Motion Timeline**:
  - *Phase 1 (0–2s)*: Floating orientation stabilization, slow camera pan along the primary isometric axis.
  - *Phase 2 (2–4s)*: Internal sub-assemblies (bearings, gears, circuitry) smoothly glide inward along guide trajectories.
  - *Phase 3 (4–6s)*: Structural chassis locks into position with interlocking mechanical tolerances.
  - *Phase 4 (6–8s)*: External enclosures and panels snap into place, sealing the completed object under studio lighting.
- **Physical Invariants**: Zero morphing or teleportation; all components preserve geometric volume and follow realistic translational/rotational vectors.
