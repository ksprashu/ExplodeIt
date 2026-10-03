/**
 * Community Blueprint Vector SVGs & Fallbacks
 * Self-contained, technical isometric blueprints encoded as clean data URIs
 * for offline catalog seeding and resilient visual fallbacks.
 */

export const svgToDataUri = (svg: string): string =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(svg.trim());

// ============================================================================
// 1. Twin-Lens Reflex (TLR) Camera Isometric Exploded Blueprint
// ============================================================================

export const TLR_CAMERA_BLUEPRINT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <pattern id="tlr-subgrid" width="10" height="10" patternUnits="userSpaceOnUse">
      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#0e2338" stroke-width="0.5"/>
    </pattern>
    <pattern id="tlr-grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#163857" stroke-width="1"/>
    </pattern>
    <linearGradient id="tlr-glass" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.05"/>
    </linearGradient>
  </defs>

  <!-- Background Canvas & Technical Grid -->
  <rect width="800" height="600" fill="#0a0f1d"/>
  <rect width="800" height="600" fill="url(#tlr-subgrid)"/>
  <rect width="800" height="600" fill="url(#tlr-grid)"/>

  <!-- Border & Technical Framing -->
  <rect x="18" y="18" width="764" height="564" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="8 4" opacity="0.6"/>
  <rect x="24" y="24" width="752" height="552" fill="none" stroke="#38bdf8" stroke-width="0.5" opacity="0.3"/>

  <!-- Corner Crosshairs -->
  <g stroke="#38bdf8" stroke-width="1.2" opacity="0.8">
    <path d="M 14 24 H 34 M 24 14 V 34"/>
    <path d="M 766 24 H 786 M 776 14 V 34"/>
    <path d="M 14 576 H 34 M 24 566 V 586"/>
    <path d="M 766 576 H 786 M 776 566 V 586"/>
  </g>

  <!-- Technical Header -->
  <text x="40" y="55" fill="#38bdf8" font-family="monospace" font-size="16" font-weight="900" letter-spacing="2">TWIN-LENS REFLEX (TLR) CAMERA // OPTICAL DECONSTRUCTION</text>
  <text x="40" y="74" fill="#94a3b8" font-family="monospace" font-size="10" letter-spacing="1">SYSTEM: DUAL-FOCAL AXIS // SCALE 1:1.5 // DIE-CAST ALUMINUM CHASSIS // REF: DWG-TLR-75-F28</text>
  <line x1="40" y1="84" x2="760" y2="84" stroke="#0284c7" stroke-width="1" stroke-dasharray="4 2"/>

  <!-- Top Viewing Hood & Ground Glass Screen -->
  <g transform="translate(180, 100)">
    <polygon points="120,40 180,10 260,10 280,40" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4 2"/>
    <polygon points="120,40 140,80 260,80 280,40" fill="none" stroke="#0ea5e9" stroke-width="2"/>
    <rect x="145" y="45" width="110" height="30" fill="url(#tlr-glass)" stroke="#38bdf8" stroke-width="1.5"/>
    <path d="M 200 45 V 75 M 145 60 H 255" stroke="#38bdf8" stroke-width="0.8" stroke-dasharray="2 2"/>
    <circle cx="200" cy="60" r="12" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="2 2"/>
  </g>

  <!-- 45-Degree Mirror Optical Chamber -->
  <g transform="translate(240, 180)">
    <line x1="80" y1="40" x2="160" y2="120" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    <path d="M 20 120 L 120 120 L 120 40" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3 3"/>
    <polygon points="120,50 116,60 124,60" fill="#38bdf8"/>
    <polygon points="65,120 55,116 55,124" fill="#38bdf8"/>
  </g>

  <!-- Camera Body Skeleton (Isometric exploded) -->
  <g transform="translate(320, 220)">
    <path d="M 80 40 L 180 0 L 240 30 L 240 180 L 140 220 L 80 180 Z" fill="#0f172a" fill-opacity="0.7" stroke="#0ea5e9" stroke-width="1.8"/>
    <path d="M 140 220 L 140 80 L 240 30" fill="none" stroke="#0ea5e9" stroke-width="1.5"/>
    <path d="M 80 40 L 140 80" fill="none" stroke="#0ea5e9" stroke-width="1.5"/>
    <path d="M 80 110 L 140 150 L 240 100" fill="none" stroke="#38bdf8" stroke-width="1" stroke-dasharray="4 2"/>
  </g>

  <!-- Top Viewing Lens Assembly (Heidosmat 75mm f/2.8) -->
  <g transform="translate(130, 220)">
    <line x1="-30" y1="50" x2="270" y2="50" stroke="#0ea5e9" stroke-width="1" stroke-dasharray="6 3" opacity="0.6"/>
    <ellipse cx="20" cy="50" rx="20" ry="32" fill="none" stroke="#38bdf8" stroke-width="2"/>
    <path d="M 70 20 A 20 32 0 0 1 70 80 A 12 32 0 0 0 70 20 Z" fill="url(#tlr-glass)" stroke="#ffffff" stroke-width="1.8"/>
    <ellipse cx="70" cy="50" rx="14" ry="30" fill="none" stroke="#38bdf8" stroke-width="1"/>
    <rect x="110" y="24" width="30" height="52" fill="#0284c7" fill-opacity="0.2" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="116" y1="24" x2="116" y2="76" stroke="#38bdf8" stroke-width="1"/>
    <line x1="124" y1="24" x2="124" y2="76" stroke="#38bdf8" stroke-width="1"/>
    <line x1="132" y1="24" x2="132" y2="76" stroke="#38bdf8" stroke-width="1"/>
    <ellipse cx="170" cy="50" rx="18" ry="28" fill="none" stroke="#0ea5e9" stroke-width="2"/>
  </g>

  <!-- Bottom Taking Lens Assembly (Tessar 75mm f/3.5) & Shutter -->
  <g transform="translate(100, 360)">
    <line x1="0" y1="50" x2="300" y2="50" stroke="#0ea5e9" stroke-width="1" stroke-dasharray="6 3" opacity="0.6"/>
    <ellipse cx="30" cy="50" rx="24" ry="36" fill="url(#tlr-glass)" stroke="#38bdf8" stroke-width="2"/>
    <ellipse cx="50" cy="50" rx="20" ry="32" fill="none" stroke="#ffffff" stroke-width="1.5"/>
    <circle cx="105" cy="50" r="32" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="105" cy="50" r="14" fill="#0a0f1d" stroke="#ffffff" stroke-width="1.5"/>
    <path d="M 105 36 L 118 45 M 118 45 L 114 62 M 114 62 L 96 62 M 96 62 L 92 45 M 92 45 L 105 36" stroke="#38bdf8" stroke-width="1.5"/>
    <ellipse cx="160" cy="50" rx="22" ry="34" fill="url(#tlr-glass)" stroke="#0ea5e9" stroke-width="2"/>
    <ellipse cx="175" cy="50" rx="18" ry="30" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
    <rect x="205" y="20" width="22" height="60" fill="#0369a1" fill-opacity="0.3" stroke="#38bdf8" stroke-width="1.5"/>
  </g>

  <!-- Film Transport Crank & Geneva Drive -->
  <g transform="translate(580, 290)">
    <circle cx="50" cy="50" r="36" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <circle cx="50" cy="50" r="14" fill="#1e293b" stroke="#ffffff" stroke-width="1.5"/>
    <path d="M 50 50 L 95 20" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
    <circle cx="95" cy="20" r="8" fill="#ffffff" stroke="#0ea5e9" stroke-width="2"/>
    <path d="M 50 14 V 24 M 50 76 V 86 M 14 50 H 24 M 76 50 H 86" stroke="#0ea5e9" stroke-width="2"/>
  </g>

  <!-- Technical Callouts -->
  <g>
    <polyline points="200,240 160,190 70,190" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="200" cy="240" r="3" fill="#38bdf8"/>
    <rect x="50" y="176" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="61" y="188" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">01</text>
    <text x="80" y="188" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">VIEWING LENS (HEIDOSMAT 75mm f/2.8)</text>
  </g>
  <g>
    <polyline points="150,420 120,490 60,490" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="150" cy="420" r="3" fill="#38bdf8"/>
    <rect x="40" y="476" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="51" y="488" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">02</text>
    <text x="70" y="488" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">TAKING LENS (TESSAR 75mm f/3.5)</text>
  </g>
  <g>
    <polyline points="210,410 240,530 310,530" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="210" cy="410" r="3" fill="#38bdf8"/>
    <rect x="316" y="522" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="327" y="534" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">03</text>
    <text x="345" y="534" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">SYNCHRO-COMPUR LEAF SHUTTER</text>
  </g>
  <g>
    <polyline points="360,240 420,160 520,160" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="360" cy="240" r="3" fill="#38bdf8"/>
    <rect x="526" y="152" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="537" y="164" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">04</text>
    <text x="555" y="164" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">45° SURFACE MIRROR &amp; WAIST FINDER</text>
  </g>
  <g>
    <polyline points="630,340 680,410 740,410" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="630" cy="340" r="3" fill="#38bdf8"/>
    <rect x="530" y="442" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="541" y="454" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">05</text>
    <text x="560" y="454" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">GENEVA FILM ADVANCE CRANK</text>
  </g>

  <!-- Dimension Bar -->
  <g transform="translate(200, 560)">
    <line x1="0" y1="0" x2="400" y2="0" stroke="#0ea5e9" stroke-width="1"/>
    <line x1="0" y1="-5" x2="0" y2="5" stroke="#0ea5e9" stroke-width="1.5"/>
    <line x1="400" y1="-5" x2="400" y2="5" stroke="#0ea5e9" stroke-width="1.5"/>
    <text x="200" y="-6" fill="#0ea5e9" font-family="monospace" font-size="10" text-anchor="middle">|◄─── 142.0 mm (CHASSIS DEPTH) ───►|</text>
  </g>
</svg>`;

// ============================================================================
// 2. High-Bypass Turbofan Jet Engine Aerodynamic Schematic
// ============================================================================

export const TURBOFAN_ENGINE_BLUEPRINT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <pattern id="tf-subgrid" width="10" height="10" patternUnits="userSpaceOnUse">
      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#0e2338" stroke-width="0.5"/>
    </pattern>
    <pattern id="tf-grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#163857" stroke-width="1"/>
    </pattern>
    <linearGradient id="tf-flame" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ef4444" stop-opacity="0.7"/>
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="800" height="600" fill="#0a0f1d"/>
  <rect width="800" height="600" fill="url(#tf-subgrid)"/>
  <rect width="800" height="600" fill="url(#tf-grid)"/>

  <!-- Border & Technical Framing -->
  <rect x="18" y="18" width="764" height="564" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="8 4" opacity="0.6"/>
  <rect x="24" y="24" width="752" height="552" fill="none" stroke="#38bdf8" stroke-width="0.5" opacity="0.3"/>

  <!-- Corner Crosshairs -->
  <g stroke="#38bdf8" stroke-width="1.2" opacity="0.8">
    <path d="M 14 24 H 34 M 24 14 V 34"/>
    <path d="M 766 24 H 786 M 776 14 V 34"/>
    <path d="M 14 576 H 34 M 24 566 V 586"/>
    <path d="M 766 576 H 786 M 776 566 V 586"/>
  </g>

  <!-- Technical Header -->
  <text x="40" y="55" fill="#38bdf8" font-family="monospace" font-size="16" font-weight="900" letter-spacing="2">HIGH-BYPASS TURBOFAN JET ENGINE // AERODYNAMIC SCHEMATIC</text>
  <text x="40" y="74" fill="#94a3b8" font-family="monospace" font-size="10" letter-spacing="1">TWIN-SPOOL AXIAL FLOW // BYPASS 10.5:1 // TITANIUM BLISK // REF: DWG-TF-900-E4</text>
  <line x1="40" y1="84" x2="760" y2="84" stroke="#0284c7" stroke-width="1" stroke-dasharray="4 2"/>

  <!-- Centerline -->
  <line x1="60" y1="300" x2="740" y2="300" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="12 4 3 4" opacity="0.8"/>
  <text x="745" y="304" fill="#0ea5e9" font-family="monospace" font-size="10">CL</text>

  <!-- Cowling Profiles -->
  <path d="M 110 180 Q 200 130, 380 140 T 600 200 L 590 220 Q 380 160, 220 180 Z" fill="#0f172a" fill-opacity="0.8" stroke="#38bdf8" stroke-width="1.8"/>
  <path d="M 110 420 Q 200 470, 380 460 T 600 400 L 590 380 Q 380 440, 220 420 Z" fill="#0f172a" fill-opacity="0.8" stroke="#38bdf8" stroke-width="1.8"/>

  <!-- Bypass Ducts & Airflow Vectors -->
  <path d="M 230 220 Q 320 200, 480 230 L 640 260" fill="none" stroke="#0ea5e9" stroke-width="1.2" stroke-dasharray="4 2"/>
  <path d="M 230 380 Q 320 400, 480 370 L 640 340" fill="none" stroke="#0ea5e9" stroke-width="1.2" stroke-dasharray="4 2"/>
  <g fill="#38bdf8" opacity="0.7">
    <polygon points="300,180 290,175 290,185"/>
    <polygon points="450,195 440,190 440,200"/>
    <polygon points="300,420 290,415 290,425"/>
    <polygon points="450,405 440,400 440,410"/>
  </g>

  <!-- Front Titanium Fan & Spinner -->
  <g transform="translate(100, 300)">
    <path d="M 20 0 Q 60 -15, 80 -40 L 80 40 Q 60 15, 20 0 Z" fill="#0284c7" stroke="#ffffff" stroke-width="1.8"/>
    <path d="M 20 0 Q 50 -10, 75 -20" fill="none" stroke="#ffffff" stroke-width="1.5"/>
    <path d="M 80 -150 Q 70 -80, 80 0 Q 70 80, 80 150" fill="none" stroke="#38bdf8" stroke-width="4"/>
    <path d="M 85 -140 Q 75 -70, 85 0 Q 75 70, 85 140" fill="none" stroke="#ffffff" stroke-width="2"/>
    <line x1="80" y1="-150" x2="100" y2="-150" stroke="#38bdf8" stroke-width="2"/>
    <line x1="80" y1="150" x2="100" y2="150" stroke="#38bdf8" stroke-width="2"/>
  </g>

  <!-- Flow Splitters -->
  <polygon points="215,240 230,230 235,245" fill="#38bdf8" stroke="#ffffff" stroke-width="1"/>
  <polygon points="215,360 230,370 235,355" fill="#38bdf8" stroke="#ffffff" stroke-width="1"/>

  <!-- Compressors -->
  <g transform="translate(240, 300)">
    <rect x="0" y="-55" width="45" height="110" fill="#0f172a" stroke="#0ea5e9" stroke-width="1.2"/>
    <line x1="10" y1="-50" x2="10" y2="50" stroke="#38bdf8" stroke-width="2"/>
    <line x1="22" y1="-45" x2="22" y2="45" stroke="#38bdf8" stroke-width="2"/>
    <line x1="34" y1="-40" x2="34" y2="40" stroke="#38bdf8" stroke-width="2"/>
    <polygon points="50,-40 150,-24 150,24 50,40" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="60" y1="-38" x2="60" y2="38" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="75" y1="-35" x2="75" y2="35" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="90" y1="-32" x2="90" y2="32" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="105" y1="-29" x2="105" y2="29" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="120" y1="-27" x2="120" y2="27" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="135" y1="-25" x2="135" y2="25" stroke="#38bdf8" stroke-width="1.5"/>
  </g>

  <!-- Annular Combustor -->
  <g transform="translate(400, 300)">
    <path d="M 0 -24 L 20 -38 L 70 -38 L 85 -24 Z" fill="url(#tf-flame)" stroke="#f59e0b" stroke-width="1.5"/>
    <path d="M 0 24 L 20 38 L 70 38 L 85 24 Z" fill="url(#tf-flame)" stroke="#f59e0b" stroke-width="1.5"/>
    <circle cx="20" cy="-30" r="4" fill="#ffffff" stroke="#f59e0b" stroke-width="1"/>
    <circle cx="20" cy="30" r="4" fill="#ffffff" stroke="#f59e0b" stroke-width="1"/>
  </g>

  <!-- Turbines -->
  <g transform="translate(490, 300)">
    <rect x="0" y="-28" width="18" height="56" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="9" y1="-26" x2="9" y2="26" stroke="#ffffff" stroke-width="2"/>
    <polygon points="25,-30 85,-58 85,58 25,30" fill="#0f172a" stroke="#0ea5e9" stroke-width="1.5"/>
    <line x1="38" y1="-36" x2="38" y2="36" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="52" y1="-43" x2="52" y2="43" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="66" y1="-50" x2="66" y2="50" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="80" y1="-56" x2="80" y2="56" stroke="#38bdf8" stroke-width="1.5"/>
  </g>

  <!-- Tailcone -->
  <g transform="translate(585, 300)">
    <polygon points="0,-25 80,0 0,25" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <path d="M 0 -60 L 50 -45 L 70 -48" fill="none" stroke="#0ea5e9" stroke-width="1.8"/>
    <path d="M 0 60 L 50 45 L 70 48" fill="none" stroke="#0ea5e9" stroke-width="1.8"/>
  </g>

  <!-- Shafts -->
  <g transform="translate(180, 300)">
    <rect x="110" y="-6" width="200" height="12" fill="#0284c7" fill-opacity="0.4" stroke="#38bdf8" stroke-width="1"/>
    <line x1="0" y1="0" x2="390" y2="0" stroke="#ffffff" stroke-width="2.5"/>
  </g>

  <!-- Callouts -->
  <g>
    <polyline points="180,180 140,110 50,110" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="180" cy="180" r="3" fill="#38bdf8"/>
    <rect x="30" y="96" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="41" y="108" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">01</text>
    <text x="60" y="108" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">WIDE-CHORD TITANIUM FAN (Dia 2.95m)</text>
  </g>
  <g>
    <polyline points="330,265 310,125 380,125" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="330" cy="265" r="3" fill="#38bdf8"/>
    <rect x="386" y="117" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="397" y="129" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">02</text>
    <text x="415" y="129" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">10-STAGE HP AXIAL COMPRESSOR</text>
  </g>
  <g>
    <polyline points="440,265 470,150 560,150" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="440" cy="265" r="3" fill="#38bdf8"/>
    <rect x="566" y="142" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="577" y="154" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">03</text>
    <text x="595" y="154" fill="#f59e0b" font-family="monospace" font-size="11" font-weight="bold">ANNULAR COMBUSTOR (1820 C)</text>
  </g>
  <g>
    <polyline points="540,350 510,480 430,480" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="540" cy="350" r="3" fill="#38bdf8"/>
    <rect x="230" y="472" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="241" y="484" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">04</text>
    <text x="260" y="484" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">COUNTER-ROTATING HP/LP TURBINES</text>
  </g>
  <g>
    <polyline points="630,360 670,490 730,490" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="630" cy="360" r="3" fill="#38bdf8"/>
    <rect x="510" y="522" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="521" y="534" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">05</text>
    <text x="540" y="534" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">VARIABLE CONVERGENT EXHAUST NOZZLE</text>
  </g>

  <!-- Metric Bar -->
  <g transform="translate(60, 555)">
    <text x="0" y="0" fill="#94a3b8" font-family="monospace" font-size="10">MAX THRUST: 340 kN | BYPASS RATIO: 10.5:1 | OPR: 42.8:1 | DRY WEIGHT: 3,650 kg</text>
  </g>
</svg>`;

// ============================================================================
// 3. Neural Transformer Attention Architecture Schematic
// ============================================================================

export const NEURAL_TRANSFORMER_BLUEPRINT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <pattern id="nt-subgrid" width="10" height="10" patternUnits="userSpaceOnUse">
      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#0e2338" stroke-width="0.5"/>
    </pattern>
    <pattern id="nt-grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#163857" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background Canvas -->
  <rect width="800" height="600" fill="#0a0f1d"/>
  <rect width="800" height="600" fill="url(#nt-subgrid)"/>
  <rect width="800" height="600" fill="url(#nt-grid)"/>

  <!-- Border & Technical Framing -->
  <rect x="18" y="18" width="764" height="564" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="8 4" opacity="0.6"/>
  <rect x="24" y="24" width="752" height="552" fill="none" stroke="#38bdf8" stroke-width="0.5" opacity="0.3"/>

  <!-- Corner Crosshairs -->
  <g stroke="#38bdf8" stroke-width="1.2" opacity="0.8">
    <path d="M 14 24 H 34 M 24 14 V 34"/>
    <path d="M 766 24 H 786 M 776 14 V 34"/>
    <path d="M 14 576 H 34 M 24 566 V 586"/>
    <path d="M 766 576 H 786 M 776 566 V 586"/>
  </g>

  <!-- Technical Header -->
  <text x="40" y="55" fill="#38bdf8" font-family="monospace" font-size="16" font-weight="900" letter-spacing="2">TRANSFORMER ATTENTION ARCHITECTURE // DEEP DATA FLOW TOPOLOGY</text>
  <text x="40" y="74" fill="#94a3b8" font-family="monospace" font-size="10" letter-spacing="1">MULTI-HEAD SELF-ATTENTION // d_model=512 // h=8 HEADS // d_ff=2048 // REF: DWG-XFRM-512D</text>
  <line x1="40" y1="84" x2="760" y2="84" stroke="#0284c7" stroke-width="1" stroke-dasharray="4 2"/>

  <!-- Layer Normalization & Output (Top) -->
  <g transform="translate(300, 105)">
    <rect x="0" y="0" width="200" height="34" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="100" y="22" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">ADD &amp; LAYER NORMALIZATION</text>
    <line x1="100" y1="0" x2="100" y2="-15" stroke="#38bdf8" stroke-width="2"/>
    <polygon points="100,-18 96,-10 104,-10" fill="#38bdf8"/>
    <text x="100" y="-22" fill="#38bdf8" font-family="monospace" font-size="10" text-anchor="middle">Output [B, S, 512]</text>
  </g>

  <!-- Feed-Forward Dense Layer -->
  <g transform="translate(300, 165)">
    <rect x="0" y="0" width="200" height="48" rx="8" fill="#0f172a" stroke="#818cf8" stroke-width="1.8"/>
    <text x="100" y="22" fill="#818cf8" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">POSITION-WISE FEED-FORWARD</text>
    <text x="100" y="38" fill="#94a3b8" font-family="monospace" font-size="10" text-anchor="middle">Linear(512-2048) - GELU - Linear(2048-512)</text>
    <line x1="100" y1="0" x2="100" y2="-26" stroke="#38bdf8" stroke-width="1.5"/>
    <polygon points="100,-26 96,-20 104,-20" fill="#38bdf8"/>
  </g>

  <!-- Skip Connection 2 (Around FFN) -->
  <g>
    <path d="M 270 280 L 250 280 L 250 122 L 300 122" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4 2"/>
    <polygon points="300,122 292,118 292,126" fill="#38bdf8"/>
    <text x="240" y="200" fill="#38bdf8" font-family="monospace" font-size="9" text-anchor="end">RESIDUAL 2</text>
  </g>

  <!-- Sub-Layer Add & Norm (Middle) -->
  <g transform="translate(300, 240)">
    <rect x="0" y="0" width="200" height="34" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="100" y="22" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">ADD &amp; LAYER NORMALIZATION</text>
    <line x1="100" y1="0" x2="100" y2="-27" stroke="#38bdf8" stroke-width="1.5"/>
    <polygon points="100,-27 96,-21 104,-21" fill="#38bdf8"/>
  </g>

  <!-- Skip Connection 1 (Around MHA) -->
  <g>
    <path d="M 270 480 L 230 480 L 230 257 L 300 257" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4 2"/>
    <polygon points="300,257 292,253 292,261" fill="#38bdf8"/>
    <text x="220" y="370" fill="#38bdf8" font-family="monospace" font-size="9" text-anchor="end">RESIDUAL 1</text>
  </g>

  <!-- Multi-Head Attention Block (h=8) -->
  <g transform="translate(290, 305)">
    <rect x="20" y="0" width="200" height="60" rx="8" fill="#0284c7" fill-opacity="0.3" stroke="#0ea5e9" stroke-width="1"/>
    <rect x="10" y="6" width="200" height="60" rx="8" fill="#0284c7" fill-opacity="0.5" stroke="#0ea5e9" stroke-width="1"/>
    <rect x="0" y="12" width="200" height="60" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <text x="100" y="34" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="900" text-anchor="middle">MULTI-HEAD ATTENTION</text>
    <text x="100" y="52" fill="#ffffff" font-family="monospace" font-size="10" text-anchor="middle">Scaled Dot-Product (h = 8 parallel heads)</text>
    <line x1="100" y1="12" x2="100" y2="-31" stroke="#38bdf8" stroke-width="1.5"/>
    <polygon points="100,-31 96,-25 104,-25" fill="#38bdf8"/>
  </g>

  <!-- Attention Matrix Heatmap Display -->
  <g transform="translate(560, 290)">
    <rect x="0" y="0" width="180" height="130" rx="8" fill="#0f172a" stroke="#0ea5e9" stroke-width="1.5"/>
    <text x="90" y="20" fill="#38bdf8" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">ATTENTION HEATMAP (QK)</text>
    <g transform="translate(30, 30)">
      <rect x="0" y="0" width="18" height="12" fill="#38bdf8" opacity="0.9"/>
      <rect x="20" y="0" width="18" height="12" fill="#0284c7" opacity="0.3"/>
      <rect x="40" y="0" width="18" height="12" fill="#38bdf8" opacity="0.6"/>
      <rect x="60" y="0" width="18" height="12" fill="#0284c7" opacity="0.2"/>
      <rect x="80" y="0" width="18" height="12" fill="#38bdf8" opacity="0.8"/>
      <rect x="100" y="0" width="18" height="12" fill="#0284c7" opacity="0.4"/>
      <rect x="0" y="15" width="18" height="12" fill="#0284c7" opacity="0.3"/>
      <rect x="20" y="15" width="18" height="12" fill="#38bdf8" opacity="0.9"/>
      <rect x="40" y="15" width="18" height="12" fill="#0284c7" opacity="0.4"/>
      <rect x="60" y="15" width="18" height="12" fill="#38bdf8" opacity="0.7"/>
      <rect x="80" y="15" width="18" height="12" fill="#0284c7" opacity="0.2"/>
      <rect x="100" y="15" width="18" height="12" fill="#38bdf8" opacity="0.5"/>
      <rect x="0" y="30" width="18" height="12" fill="#38bdf8" opacity="0.7"/>
      <rect x="20" y="30" width="18" height="12" fill="#0284c7" opacity="0.2"/>
      <rect x="40" y="30" width="18" height="12" fill="#38bdf8" opacity="0.85"/>
      <rect x="60" y="30" width="18" height="12" fill="#0284c7" opacity="0.5"/>
      <rect x="80" y="30" width="18" height="12" fill="#38bdf8" opacity="0.3"/>
      <rect x="100" y="30" width="18" height="12" fill="#0284c7" opacity="0.6"/>
      <rect x="0" y="45" width="18" height="12" fill="#0284c7" opacity="0.4"/>
      <rect x="20" y="45" width="18" height="12" fill="#38bdf8" opacity="0.6"/>
      <rect x="40" y="45" width="18" height="12" fill="#0284c7" opacity="0.2"/>
      <rect x="60" y="45" width="18" height="12" fill="#38bdf8" opacity="0.9"/>
      <rect x="80" y="45" width="18" height="12" fill="#0284c7" opacity="0.4"/>
      <rect x="100" y="45" width="18" height="12" fill="#38bdf8" opacity="0.75"/>
    </g>
    <text x="90" y="112" fill="#94a3b8" font-family="monospace" font-size="9" text-anchor="middle">Softmax(QK / 8) V</text>
  </g>
  <line x1="490" y1="340" x2="560" y2="340" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="3 3"/>

  <!-- Linear Projection Heads (Q, K, V) -->
  <g transform="translate(260, 405)">
    <rect x="0" y="0" width="70" height="30" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="35" y="19" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">QUERIES (Q)</text>
    <line x1="35" y1="0" x2="60" y2="-28" stroke="#38bdf8" stroke-width="1.5"/>
    <polygon points="60,-28 52,-25 57,-20" fill="#38bdf8"/>
    <rect x="95" y="0" width="70" height="30" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="130" y="19" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">KEYS (K)</text>
    <line x1="130" y1="0" x2="130" y2="-28" stroke="#38bdf8" stroke-width="1.5"/>
    <polygon points="130,-28 126,-22 134,-22" fill="#38bdf8"/>
    <rect x="190" y="0" width="70" height="30" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="225" y="19" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">VALUES (V)</text>
    <line x1="225" y1="0" x2="200" y2="-28" stroke="#38bdf8" stroke-width="1.5"/>
    <polygon points="200,-28 203,-20 208,-25" fill="#38bdf8"/>
  </g>

  <!-- Input Embeddings & Positional Encoding -->
  <g transform="translate(270, 480)">
    <rect x="0" y="0" width="240" height="36" rx="8" fill="#0f172a" stroke="#0ea5e9" stroke-width="1.8"/>
    <text x="120" y="22" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">INPUT EMBEDDINGS (512-dim)</text>
    <circle cx="210" cy="18" r="10" fill="#0284c7" stroke="#ffffff" stroke-width="1"/>
    <path d="M 204 18 Q 207 13, 210 18 T 216 18" fill="none" stroke="#ffffff" stroke-width="1.5"/>
    <path d="M 120 0 L 25 -45 M 120 0 L 120 -45 M 120 0 L 215 -45" stroke="#0ea5e9" stroke-width="1.5"/>
  </g>

  <!-- Callouts -->
  <g>
    <polyline points="290,340 180,340 120,340" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="290" cy="340" r="3" fill="#38bdf8"/>
    <rect x="30" y="326" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="41" y="338" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">01</text>
    <text x="60" y="338" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">MULTI-HEAD ATTENTION (8 HEADS)</text>
  </g>
  <g>
    <polyline points="740,350 755,350 755,240 680,240" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="740" cy="350" r="3" fill="#38bdf8"/>
    <rect x="520" y="232" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="531" y="244" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">02</text>
    <text x="550" y="244" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">SCALED MATMUL MATRIX (QK)</text>
  </g>
  <g>
    <polyline points="230,220 180,220 100,220" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="230" cy="220" r="3" fill="#38bdf8"/>
    <rect x="20" y="206" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="31" y="218" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">03</text>
    <text x="50" y="218" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">RESIDUAL SKIP ADD &amp; NORM</text>
  </g>
  <g>
    <polyline points="500,190 560,190 620,190" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="500" cy="190" r="3" fill="#38bdf8"/>
    <rect x="626" y="182" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="637" y="194" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">04</text>
    <text x="655" y="194" fill="#818cf8" font-family="monospace" font-size="11" font-weight="bold">DENSE FEED-FORWARD (2048-dim)</text>
  </g>
  <g>
    <polyline points="510,500 580,500 640,500" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="510" cy="500" r="3" fill="#38bdf8"/>
    <rect x="420" y="532" width="22" height="16" rx="3" fill="#0284c7"/>
    <text x="431" y="544" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">05</text>
    <text x="450" y="544" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">SINUSOIDAL POSITIONAL ENCODINGS</text>
  </g>

  <!-- Metric Bar -->
  <g transform="translate(60, 555)">
    <text x="0" y="0" fill="#94a3b8" font-family="monospace" font-size="10">COMPLEXITY: O(N2 d) | PARAMETERS: ~65M (BASE) | LATENCY: PARALLEL TRAINING</text>
  </g>
</svg>`;

// ============================================================================
// 4. Universal Fallback Blueprint Vector SVG
// ============================================================================

export const FALLBACK_BLUEPRINT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <pattern id="fb-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="0.75"/>
    </pattern>
  </defs>
  <rect width="800" height="600" fill="#0a0f1d"/>
  <rect width="800" height="600" fill="url(#fb-grid)"/>
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="6 4"/>
  <circle cx="400" cy="270" r="60" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 4"/>
  <path d="M 400 230 L 400 310 M 360 270 L 440 270" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="400" y="380" fill="#38bdf8" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle" letter-spacing="2">TECHNICAL BLUEPRINT SCHEMATIC</text>
  <text x="400" y="410" fill="#64748b" font-family="monospace" font-size="11" text-anchor="middle">ASSET PENDING OR OFFLINE MODE</text>
</svg>`;

// ============================================================================
// Pre-Encoded Self-Contained Data URIs
// ============================================================================

export const TLR_CAMERA_SVG_DATA_URL = svgToDataUri(TLR_CAMERA_BLUEPRINT_SVG);
export const TURBOFAN_ENGINE_SVG_DATA_URL = svgToDataUri(TURBOFAN_ENGINE_BLUEPRINT_SVG);
export const NEURAL_TRANSFORMER_SVG_DATA_URL = svgToDataUri(NEURAL_TRANSFORMER_BLUEPRINT_SVG);
export const FALLBACK_BLUEPRINT_SVG_DATA_URL = svgToDataUri(FALLBACK_BLUEPRINT_SVG);

// 44-byte silent WAV data URI
export const DUMMY_AUDIO_DATA_URL =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
