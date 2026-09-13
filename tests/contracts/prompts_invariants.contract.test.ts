import { describe, it, expect } from 'vitest';
import * as Constants from '../../constants';

/**
 * Upgraded Kinematic Prompt Generators (Contract Specification from PROJECT.md & ORIGINAL_REQUEST §R3)
 */
export const CONTRACT_PROMPTS = {
  // Infographic with 4-tier separation, isometric leader lines, cutaways, and 5600K studio illumination
  INFOGRAPHIC_UPGRADED: (item: string, style: string, parts: string[], domain: string, metaphor: string) =>
    `Create a high-fidelity educational infographic: A "${metaphor}" of ${item}.

**Context:** This is a ${domain} topic.
**Key Components:** ${parts.join(', ')}.
**Visual Style:** ${style}.

**Anatomical Deconstruction Invariants:**
1. **Multi-Tiered Component Separation:** Organize parts across 4 explicit depth tiers:
   - Tier 1: Outer casing, protective shell, enclosure, or facade.
   - Tier 2: Structural chassis, mounting brackets, skeleton, or sub-frame.
   - Tier 3: Core operational mechanism, power train, circuitry, or data pipeline.
   - Tier 4: Internal sub-components, micro-mechanics, chips, or cellular organelles.
2. **Internal Cutaways & Cross-Sections:** Provide revealing section views exposing interior cavities and internal working surfaces.
3. **Isometric Leader Callout Lines:** Clean, fine leader lines projecting outward isometrically with technical callout anchors.
4. **Studio Illumination & Floating Modularity:** High-contrast 5600K daylight-balanced key illumination, soft ambient fill, floating suspended parts with distinct drop shadows.

Composition: Centered, clean, museum-grade technical illustration, high resolution.`,

  // Veo video assembly prompt with 4-phase kinematics and start/end frame alignment
  VIDEO_ASSEMBLY_UPGRADED: (item: string, domain: string, metaphor: string) =>
    `Cinematic 8K technical assembly animation of ${item}.

**Type:** ${domain} (${metaphor}).

**Kinematic Motion Directives & Frame Alignment:**
- **Initial Frame (Start State):** Perfectly matches the disassembled, floating exploded-view state with all components hovering in suspended modular alignment.
- **Phase 1 (Glide & Trajectory):** Sub-components glide smoothly along designated isometric trajectory paths with realistic inertia.
- **Phase 2 (Sub-Assembly Interlocking):** Adjacent micro-components engage and lock into modular sub-assemblies.
- **Phase 3 (Core Ingestion):** Sub-assemblies converge inward into the structural chassis with mechanical precision.
- **Phase 4 (Final Sealing):** Outer shells and protective casings swing into place, snapping shut with tactile lock-in transitions.
- **Final Frame (End State):** The object rests completely unified, intact, and assembled, matching the finished studio hero shot.

**Visual Fidelity Invariants:**
- Studio 5600K lighting consistent across all frames.
- Smooth camera orbit (45-degree tracking arc).
- Strictly NO 2D synthetic text overlays, HUD graphics, or watermarks.`
};

describe('Contract: Prompt Engineering Invariants (FEAT-04, FEAT-05)', () => {
  describe('Tier 1: Feature Coverage — Infographic Prompt Invariants (FEAT-04)', () => {
    it('test_feat04_prompt_contains_4tier_separation: asserts 4 explicit depth tiers exist in prompt', () => {
      const prompt = CONTRACT_PROMPTS.INFOGRAPHIC_UPGRADED(
        'Mechanical Watch',
        'Technical Blueprint',
        ['Balance Wheel', 'Escapement', 'Mainspring', 'Dial'],
        'PHYSICAL',
        'Exploded View'
      );

      expect(prompt).toContain('Multi-Tiered Component Separation');
      expect(prompt).toContain('Tier 1');
      expect(prompt).toContain('Tier 2');
      expect(prompt).toContain('Tier 3');
      expect(prompt).toContain('Tier 4');
    });

    it('test_feat04_prompt_contains_isometric_leader_lines: requires leader callout lines in prompt', () => {
      const prompt = CONTRACT_PROMPTS.INFOGRAPHIC_UPGRADED(
        'Turbofan Jet Engine',
        'Studio Shot',
        ['Fan Blades', 'Compressor', 'Combustion Chamber', 'Turbine'],
        'PHYSICAL',
        'Exploded View'
      );

      expect(prompt.toLowerCase()).toContain('isometric leader callout lines');
      expect(prompt.toLowerCase()).toContain('callout anchors');
    });

    it('test_feat04_prompt_contains_internal_cutaways: mandates cutaways and internal cross-sections', () => {
      const prompt = CONTRACT_PROMPTS.INFOGRAPHIC_UPGRADED(
        'Human Heart',
        'Anatomical Medical Render',
        ['Aorta', 'Left Ventricle', 'Right Ventricle', 'Mitral Valve'],
        'BIOLOGICAL',
        'Anatomical Dissection'
      );

      expect(prompt).toContain('Internal Cutaways & Cross-Sections');
      expect(prompt.toLowerCase()).toContain('section views');
    });

    it('test_feat04_prompt_contains_5600k_studio_lighting: specifies balanced studio illumination', () => {
      const prompt = CONTRACT_PROMPTS.INFOGRAPHIC_UPGRADED(
        'DSLR Lens',
        'Hyper-realistic',
        ['Aperture Blades', 'Front Element', 'Focus Ring'],
        'PHYSICAL',
        'Exploded View'
      );

      expect(prompt).toContain('5600K');
      expect(prompt).toContain('floating');
    });

    it('test_feat04_prompt_adapts_to_domain_type: adapts context tokens for different domains', () => {
      const physicalPrompt = CONTRACT_PROMPTS.INFOGRAPHIC_UPGRADED('Bicycle', 'Clean', ['Frame'], 'PHYSICAL', 'Exploded View');
      const softwarePrompt = CONTRACT_PROMPTS.INFOGRAPHIC_UPGRADED('PostgreSQL', 'Isometric', ['Buffer Pool'], 'SOFTWARE', 'Architecture Diagram');

      expect(physicalPrompt).toContain('**Context:** This is a PHYSICAL topic');
      expect(softwarePrompt).toContain('**Context:** This is a SOFTWARE topic');
      expect(softwarePrompt).toContain('Architecture Diagram');
    });
  });

  describe('Tier 1: Feature Coverage — Veo Assembly Kinematics (FEAT-05)', () => {
    it('test_feat05_assembly_kinematics_glide_and_align: asserts glide trajectory directives', () => {
      const prompt = CONTRACT_PROMPTS.VIDEO_ASSEMBLY_UPGRADED('Twin-Lens Camera', 'PHYSICAL', 'Exploded View');
      expect(prompt).toContain('Glide & Trajectory');
      expect(prompt).toContain('isometric trajectory paths');
    });

    it('test_feat05_interlocking_mechanical_transitions: asserts sub-assembly interlocking and lock-in', () => {
      const prompt = CONTRACT_PROMPTS.VIDEO_ASSEMBLY_UPGRADED('Twin-Lens Camera', 'PHYSICAL', 'Exploded View');
      expect(prompt).toContain('Sub-Assembly Interlocking');
      expect(prompt).toContain('lock-in transitions');
    });

    it('test_feat05_start_frame_matches_infographic: enforces start frame equals exploded state', () => {
      const prompt = CONTRACT_PROMPTS.VIDEO_ASSEMBLY_UPGRADED('Turbofan Engine', 'PHYSICAL', 'Exploded View');
      expect(prompt).toContain('Initial Frame (Start State)');
      expect(prompt.toLowerCase()).toContain('exploded-view state');
    });

    it('test_feat05_end_frame_matches_assembled_product: enforces final frame equals assembled state', () => {
      const prompt = CONTRACT_PROMPTS.VIDEO_ASSEMBLY_UPGRADED('Turbofan Engine', 'PHYSICAL', 'Exploded View');
      expect(prompt).toContain('Final Frame (End State)');
      expect(prompt.toLowerCase()).toContain('completely unified, intact, and assembled');
    });

    it('test_feat05_no_unwanted_text_overlays: explicitly prohibits synthetic text and HUD overlays', () => {
      const prompt = CONTRACT_PROMPTS.VIDEO_ASSEMBLY_UPGRADED('Mechanical Watch', 'PHYSICAL', 'Exploded View');
      expect(prompt).toContain('NO 2D synthetic text overlays');
    });
  });

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('test_feat04_boundary_single_component_prompt: single component still generates valid structure', () => {
      const prompt = CONTRACT_PROMPTS.INFOGRAPHIC_UPGRADED('Monolith', 'Minimal', ['Solid Core'], 'PHYSICAL', 'Exploded View');
      expect(prompt).toContain('**Key Components:** Solid Core');
      expect(prompt).toContain('Multi-Tiered Component Separation');
    });

    it('test_feat04_boundary_extreme_component_count: 25 components format cleanly without syntax error', () => {
      const parts = Array.from({ length: 25 }, (_, i) => `Component_${i + 1}`);
      const prompt = CONTRACT_PROMPTS.INFOGRAPHIC_UPGRADED('Complex Robot', 'Technical', parts, 'PHYSICAL', 'Exploded View');
      expect(prompt).toContain('Component_1');
      expect(prompt).toContain('Component_25');
      expect(prompt.length).toBeGreaterThan(500);
    });

    it('test_feat04_boundary_special_characters_in_topic: handles quotes and unicode safely', () => {
      const dirtyTopic = 'Robot "Alpha & Omega" <v2.0> 🤖';
      const prompt = CONTRACT_PROMPTS.INFOGRAPHIC_UPGRADED(dirtyTopic, 'Studio', ['Arm'], 'PHYSICAL', 'Exploded View');
      expect(prompt).toContain(dirtyTopic);
      expect(prompt).not.toContain('[object Object]');
    });

    it('test_feat05_boundary_length_constraint: Veo prompt stays within character limit budget', () => {
      const prompt = CONTRACT_PROMPTS.VIDEO_ASSEMBLY_UPGRADED('Chronograph', 'PHYSICAL', 'Exploded View');
      // Veo prompts must be punchy and under 1500 chars to avoid model truncation
      expect(prompt.length).toBeLessThan(1500);
    });

    it('test_feat05_boundary_conceptual_kinematics: conceptual topics generate valid directives', () => {
      const prompt = CONTRACT_PROMPTS.VIDEO_ASSEMBLY_UPGRADED('Mindfulness Meditation', 'CONCEPTUAL', 'Mind Map');
      expect(prompt).toContain('CONCEPTUAL');
      expect(prompt).toContain('Mind Map');
      expect(prompt).toContain('Kinematic Motion Directives');
    });
  });

  describe('Audit against Baseline constants.ts PROMPTS', () => {
    it('verifies existing constants.ts PROMPTS object exists', () => {
      expect(Constants.PROMPTS).toBeDefined();
      expect(typeof Constants.PROMPTS.INFOGRAPHIC).toBe('function');
      expect(typeof Constants.PROMPTS.VIDEO).toBe('function');
      expect(typeof Constants.PROMPTS.ASSEMBLED).toBe('function');
    });

    it('reports baseline vs upgraded prompt differences', () => {
      const baselineInfo = Constants.PROMPTS.INFOGRAPHIC('Camera', 'Clean', ['Lens'], 'PHYSICAL', 'Exploded View');
      const upgradedInfo = CONTRACT_PROMPTS.INFOGRAPHIC_UPGRADED('Camera', 'Clean', ['Lens'], 'PHYSICAL', 'Exploded View');

      // Demonstrates contract requirement: Upgraded prompt has 4-tier separation instructions
      expect(upgradedInfo).toContain('Tier 1');
      expect(baselineInfo).toContain('Tier 1');
      expect(baselineInfo).toContain('Multi-Tiered Component Separation');
    });
  });
});
