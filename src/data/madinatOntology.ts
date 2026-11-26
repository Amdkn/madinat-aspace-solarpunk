export interface DepartmentStream {
  id: string;
  agentName: string;
  role: string;
  task: string;
  statusLabel: string;
  needsHuman?: boolean;
}

export interface SolarDepartment {
  id: string;
  sectorIndex: number;
  angleDeg: number;
  code: string;
  name: string;
  vpName: string;
  squadName: string;
  bridgePillar: 'CULTIVATE' | 'BLOOM' | 'NURTURE' | 'ROOTS';
  color: string;
  opsPerSec: string;
  efficiencyDelta: string;
  aiRatio: string;
  monthlyPrice: number;
  terminalLine: string;
  appSlug: string;
  streams: DepartmentStream[];
}

export interface MarketplaceBlueprint {
  id: 'saas' | 'agency' | 'ecommerce' | 'consulting';
  title: string;
  subtitle: string;
  specVersion: string;
  provisioningSec: number;
  modulesCount: number;
  aiRatio: string;
  escrowThreshold: string;
  plotAngleDeg: number;
  accentColor: string;
  yamlPreview: string;
}

export interface PortalGameSpec {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  skyTop: string;
  skyBottom: string;
  gridColor: string;
  description: string;
}

export interface EntropyMission {
  id: string;
  code: string;
  title: string;
  description: string;
  targetPos: [number, number, number];
  rewardHarmony: number;
  rewardTreasury: number;
  kind: 'drone_chase' | 'escrow_sign' | 'latency_purge' | 'souk_deploy';
}

export const SOLAR_DEPARTMENTS: SolarDepartment[] = [
  {
    id: 'finance',
    sectorIndex: 0,
    angleDeg: 90, // North (Cultivate)
    code: 'B2-06 // KEPLER',
    name: 'Pavillon Finance & Trésorerie',
    vpName: 'Wonder Woman',
    squadName: 'Thunderbolts (6 B3)',
    bridgePillar: 'CULTIVATE',
    color: '#10b981',
    opsPerSec: '14 290 ops/sec',
    efficiencyDelta: '+18,4 % efficacité',
    aiRatio: '90 % IA • 10 % HUM',
    monthlyPrice: 290,
    terminalLine: 'SOP_EXEC: aspace.finance.reconcile -> Stripe Settlement #TX-9021 vérifié (12ms · 200 OK)',
    appSlug: 'finance',
    streams: [
      {
        id: 'fin-1',
        agentName: 'Kepler // Auditeur Grand Livre',
        role: 'Audit continu',
        task: 'Rapprochement Stripe multi-devises EUR/USD lot #1042',
        statusLabel: 'Actif • 98 %',
      },
      {
        id: 'fin-2',
        agentName: 'Turing // Facturation Autonome',
        role: 'Treasury Flow',
        task: 'Allocation automatique vers Coffre Souverain C1 Saru',
        statusLabel: 'Synchronisé',
      },
      {
        id: 'fin-3',
        agentName: 'Ada // Escrow Exécutif',
        role: 'Gouvernance SOC2',
        task: 'Engagement fournisseur Cloud GPU 18 500 € (> seuil 10k€)',
        statusLabel: 'ATTENTE SIGNATURE S0',
        needsHuman: true,
      },
    ],
  },
  {
    id: 'hr',
    sectorIndex: 1,
    angleDeg: 45, // North-East
    code: 'B2-01 // TALENT',
    name: 'Académie RH & Gouvernance',
    vpName: 'Green Lantern',
    squadName: 'X-Men (8 B3)',
    bridgePillar: 'CULTIVATE',
    color: '#06b6d4',
    opsPerSec: '4 120 ops/sec',
    efficiencyDelta: '+14,0 % rétention',
    aiRatio: '60 % IA • 40 % HUM',
    monthlyPrice: 160,
    terminalLine: 'SOP_EXEC: aspace.hr.onboarding_track -> SSO, Worktrees & Mandats vérifiés (16ms)',
    appSlug: 'people',
    streams: [
      {
        id: 'hr-1',
        agentName: 'ProfessorX // Qualification Talent',
        role: 'Recrutement',
        task: 'Évaluation de 4 nouveaux agents spécialistes dans le Dôme',
        statusLabel: 'Candidats prêts',
      },
      {
        id: 'hr-2',
        agentName: 'Cyclops // Onboarding Loops',
        role: 'Intégration',
        task: 'Provisionnement automatique des clés MCP et worktrees Git',
        statusLabel: 'Nominal',
      },
    ],
  },
  {
    id: 'sales',
    sectorIndex: 2,
    angleDeg: 0, // East (Bloom)
    code: 'B2-04 // ORION',
    name: 'Pavillon Sales & Pipeline ICP',
    vpName: 'Martian Manhunter',
    squadName: 'Illuminati (6 B3)',
    bridgePillar: 'BLOOM',
    color: '#f59e0b',
    opsPerSec: '19 840 ops/sec',
    efficiencyDelta: '+26,1 % conversion',
    aiRatio: '70 % IA • 30 % HUM',
    monthlyPrice: 240,
    terminalLine: 'SOP_EXEC: aspace.gtm.lead_ingest -> HubSpot + LinkedIn Bridge · 1 240 comptes scorés',
    appSlug: 'sales',
    streams: [
      {
        id: 'sal-1',
        agentName: 'Orion // Scoring Comptes Clés',
        role: 'Prospection IA',
        task: 'Qualification temps réel de 128 décideurs Enterprise',
        statusLabel: 'En flux • 91 %',
      },
      {
        id: 'sal-2',
        agentName: 'Reed // Deal Desk',
        role: 'Closing',
        task: 'Remise exceptionnelle 15 % sur contrat annuel Cluster Pro',
        statusLabel: 'VALIDATION REQUISE',
        needsHuman: true,
      },
    ],
  },
  {
    id: 'marketing',
    sectorIndex: 3,
    angleDeg: 315, // South-East
    code: 'B2-05 // PULSE',
    name: 'Studio Croissance, Brand & Media',
    vpName: 'Superman',
    squadName: 'Guardians (6 B3)',
    bridgePillar: 'BLOOM',
    color: '#ec4899',
    opsPerSec: '15 600 ops/sec',
    efficiencyDelta: '+34 % portée organique',
    aiRatio: '85 % IA • 15 % HUM',
    monthlyPrice: 190,
    terminalLine: 'SOP_EXEC: aspace.media.render_campaign -> 14 variantes visuelles Solarpunk publiées',
    appSlug: 'growth',
    streams: [
      {
        id: 'mkt-1',
        agentName: 'Pulse // Studio Campagnes',
        role: 'Acquisition',
        task: 'Génération des trailers 3D de Madinat Aspace pour la Landing Page',
        statusLabel: 'Rendu 4K actif',
      },
      {
        id: 'mkt-2',
        agentName: 'StarLord // Brand Guard',
        role: 'Éditorial',
        task: 'Harmonisation charte Néo-Abbasside Or & Calcaire',
        statusLabel: 'Approuvé',
      },
    ],
  },
  {
    id: 'support',
    sectorIndex: 4,
    angleDeg: 270, // South (Nurture - Main Royal Gate)
    code: 'CX-08 // COPILOTE',
    name: 'Agora Succès Client & Support 24/7',
    vpName: 'J1 Meta-Jerry',
    squadName: 'Ambassadeurs Oasis',
    bridgePillar: 'NURTURE',
    color: '#14b8a6',
    opsPerSec: '11 520 ops/sec',
    efficiencyDelta: '94 % CSAT · <5s clarté',
    aiRatio: '85 % IA • 15 % HUM',
    monthlyPrice: 180,
    terminalLine: 'SOP_EXEC: aspace.cx.triage -> 84 % tickets N1 résolus en < 30s · 0 churn critique',
    appSlug: 'clients',
    streams: [
      {
        id: 'sup-1',
        agentName: 'Copilote // Conciergerie VIP',
        role: 'Support Multilingue',
        task: 'Accueil des visiteurs clients à la Grande Porte Sud',
        statusLabel: 'En ligne 24/7',
      },
      {
        id: 'sup-2',
        agentName: 'Radar // Prévention Churn',
        role: 'Customer Success',
        task: 'Détection proactive de baisse d’usage sur 2 comptes ETI',
        statusLabel: 'Suivi actif',
      },
    ],
  },
  {
    id: 'operations',
    sectorIndex: 5,
    angleDeg: 225, // South-West
    code: 'B2-02 // DISPATCH',
    name: 'Tour Opérations en Loops & Supply',
    vpName: 'Batman',
    squadName: 'Fantastic Four (4 B3)',
    bridgePillar: 'NURTURE',
    color: '#eab308',
    opsPerSec: '9 310 ops/sec',
    efficiencyDelta: '+22,5 % vélocité SLA',
    aiRatio: '95 % IA • 05 % HUM',
    monthlyPrice: 220,
    terminalLine: 'SOP_EXEC: aspace.supply.concordia_lease -> Baux Fencing Token TTL 300s actifs sur 8 flux',
    appSlug: 'operations',
    streams: [
      {
        id: 'ops-1',
        agentName: 'MrFantastic // Architecture SOP',
        role: 'Loops Déterministes',
        task: 'Orchestration des 8 workflows Liberty Ride / Make',
        statusLabel: 'SLA 99,8 %',
      },
      {
        id: 'ops-2',
        agentName: 'HumanTorch // Réponse Incidents',
        role: 'SRE Terrain',
        task: 'Patrouille anti-entropie sur l’Anneau Circulaire',
        statusLabel: 'Prêt au décollage',
      },
    ],
  },
  {
    id: 'rd',
    sectorIndex: 6,
    angleDeg: 180, // West (Roots)
    code: 'B2-07 // FORGE & DEV ROOM',
    name: 'La Forge Logicielle & Galerie des Portails',
    vpName: 'Cyborg & Flash',
    squadName: 'Kang Dynasty & Avengers (13 B3)',
    bridgePillar: 'ROOTS',
    color: '#3b82f6',
    opsPerSec: '22 410 ops/sec',
    efficiencyDelta: '3,4x vélocité · 412 builds/j',
    aiRatio: '80 % IA • 20 % HUM',
    monthlyPrice: 280,
    terminalLine: 'SOP_EXEC: aspace.rd.qa_theatre -> 412 tests E2E verts · 3 Tableaux-Portails 3D montés',
    appSlug: 'saas-builder',
    streams: [
      {
        id: 'rd-1',
        agentName: 'Forge // Revue PR & QA Indépendant',
        role: 'Outside Judge',
        task: 'Vérification différentielle PR #1042 avant auto-merge',
        statusLabel: 'QA Passed ✅',
      },
      {
        id: 'rd-2',
        agentName: 'Synth // Architecte Portails 3D',
        role: 'ThreeProgram Runtime',
        task: 'Maintien des 3 mondes enfants entrables sur le mur Ouest',
        statusLabel: 'Portails ouverts',
      },
    ],
  },
  {
    id: 'legal',
    sectorIndex: 7,
    angleDeg: 135, // North-West
    code: 'B2-08 // LEX ESCROW',
    name: 'Cour d’Albâtre Juridique & SOC2',
    vpName: 'Aquaman',
    squadName: 'Eternals (10 B3)',
    bridgePillar: 'ROOTS',
    color: '#8b5cf6',
    opsPerSec: '6 850 ops/sec',
    efficiencyDelta: '100 % preuves SHA-256',
    aiRatio: '80 % IA • 20 % HUM',
    monthlyPrice: 260,
    terminalLine: 'SOP_EXEC: aspace.legal.contract_redline -> Empreinte R10 CANARY_RECEIPT scellée',
    appSlug: 'legal',
    streams: [
      {
        id: 'leg-1',
        agentName: 'Lex // Analyse MSA & RGPD',
        role: 'Conformité Souveraine',
        task: 'Audit des clauses de souveraineté données sur contrat #882',
        statusLabel: 'Certifié R10',
      },
      {
        id: 'leg-2',
        agentName: 'Vault // Registre Immuable',
        role: 'Preuves SOC2',
        task: 'Signature double-clé requise sur avenant Enterprise',
        statusLabel: 'ATTENTE VISA',
        needsHuman: true,
      },
    ],
  },
];

export const MARKETPLACE_BLUEPRINTS: MarketplaceBlueprint[] = [
  {
    id: 'saas',
    title: 'Entreprise SaaS B2B Core',
    subtitle: 'Acquisition GTM, Audit Stripe, SOC2 & CI/CD autonome',
    specVersion: 'BLUEPRINT v2.4',
    provisioningSec: 6,
    modulesCount: 48,
    aiRatio: '75 % IA / 25 % Humain',
    escrowThreshold: '10 000 €',
    plotAngleDeg: 26,
    accentColor: '#38bdf8',
    yamlPreview: `space: aspace.saas.b2b_core\nisolation: sovereign-enclave\nmodules: [kepler-finance, orion-gtm, forge-ci]\nescrow_gate: "10000 EUR"`,
  },
  {
    id: 'agency',
    title: 'Studio Agence Multi-Clients',
    subtitle: 'Enclave par client, Studio Pulse 4K & facturation jalons',
    specVersion: 'BLUEPRINT v3.1',
    provisioningSec: 5,
    modulesCount: 32,
    aiRatio: '80 % IA / 20 % Humain',
    escrowThreshold: '5 000 €',
    plotAngleDeg: 154,
    accentColor: '#f472b6',
    yamlPreview: `space: aspace.agency.studio\nisolation: strict-per-client\nmodules: [pulse-creative, kepler-billing, copilote-cx]`,
  },
  {
    id: 'ecommerce',
    title: 'Moteur Retail & Supply Unifié',
    subtitle: 'Mesh Shopify temps réel, réappro prédictif & flotte drones',
    specVersion: 'BLUEPRINT v2.9',
    provisioningSec: 6,
    modulesCount: 41,
    aiRatio: '88 % IA / 12 % Humain',
    escrowThreshold: '15 000 €',
    plotAngleDeg: 206,
    accentColor: '#fbbf24',
    yamlPreview: `space: aspace.commerce.retail\nflux: shopify-webhook-mesh\nmodules: [dispatch-supply-v4, copilote-247]`,
  },
  {
    id: 'consulting',
    title: 'Cabinet Conseil & Audit Souverain',
    subtitle: 'Mémoire vectorielle chiffrée, citations forcées & RGPD Tier-4',
    specVersion: 'BLUEPRINT v2.2',
    provisioningSec: 5,
    modulesCount: 29,
    aiRatio: '65 % IA / 35 % Humain',
    escrowThreshold: 'Double Signature',
    plotAngleDeg: 336,
    accentColor: '#a78bfa',
    yamlPreview: `space: aspace.consulting.sovereign\nenclave: eu-tier4-zero-training\nmodules: [lex-audit-v4, okf-wikillm]`,
  },
];

export const PORTAL_GAMES: PortalGameSpec[] = [
  {
    id: 'solar-dunes',
    title: 'Trial des Dunes d’Al-Mansur',
    subtitle: 'three:solar-dunes · Course contre-la-montre en Rover Solaire à travers 8 arches énergétiques',
    accent: '#f59e0b',
    skyTop: '#0c4a6e',
    skyBottom: '#fde68a',
    gridColor: '#d97706',
    description: 'Mini-monde 3D isolé inspiré de la Dev Room de Spellthorn : franchis les anneaux solaires, teste la physique et appuie sur Échap pour ressortir dans la Forge R&D.',
  },
  {
    id: 'bayt-astronomy',
    title: 'Planétarium Bayt al-Hikma 7D',
    subtitle: 'three:astrolabe-7d · Astrolabe céleste interactif des 578 Holons',
    accent: '#14b8a6',
    skyTop: '#020617',
    skyBottom: '#134e4a',
    gridColor: '#2dd4bf',
    description: 'Visualisation spatiale des constellations Holoniques S0..S3 flottant au-dessus d’un miroir d’eau infini.',
  },
  {
    id: 'sandbox-grid',
    title: 'Grille Vierge Architecte Live',
    subtitle: 'three:live-grid · Terrain de prototypage instantané (Touche B pour bâtir)',
    accent: '#60a5fa',
    skyTop: '#1e1b4b',
    skyBottom: '#3b82f6',
    gridColor: '#93c5fd',
    description: 'Comme dans la vidéo "Adding a Dev Room to My AI Office" : une skybox pure et une grille métrique où chaque commande vocale ou clic génère des structures sans toucher à la cité mère.',
  },
];

export const INITIAL_MISSIONS: EntropyMission[] = [
  {
    id: 'm-escrow',
    code: 'ESCROW S0 // BAYT AL-HIKMA',
    title: 'Ratifier la Transaction Cloud GPU (18 500 €)',
    description: 'Monte la rampe hélicoïdale au sommet du Grand Dôme Central (ou approche du pupitre d’or) pour apposer ta signature souveraine human:amdkn.',
    targetPos: [0, 8.5, 0],
    rewardHarmony: 1,
    rewardTreasury: 12500,
    kind: 'escrow_sign',
  },
  {
    id: 'm-souk',
    code: '06 // STAGNATION -> TERRAFORMATION',
    title: 'Déployer une Villa Blueprint depuis le Grand Souk',
    description: 'Rends-toi au Grand Souk des Modules (Esplanade Sud-Est) ou ouvre un kiosque Marketplace pour lancer la construction par drones d’une nouvelle enclave.',
    targetPos: [130, 0.35, 130],
    rewardHarmony: 1,
    rewardTreasury: 24000,
    kind: 'souk_deploy',
  },
  {
    id: 'm-drone',
    code: '04 // DÉRIVE IA FANTÔME',
    title: 'Recalibrer le Drone Rogue sur le Boulevard Solaire',
    description: 'Un drone non gouverné fait des étincelles sur l’Anneau Circulaire (Rayon 134m) ! Prends la Supercar Solaire ou l’eVTOL et approche-toi à moins de 10m avec [E] pour le verrouiller sous Concordia TTL.',
    targetPos: [-134, 2, 0],
    rewardHarmony: 1,
    rewardTreasury: 18000,
    kind: 'drone_chase',
  },
];
