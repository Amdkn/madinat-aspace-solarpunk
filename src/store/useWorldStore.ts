import { create } from 'zustand';
import {
  DepartmentStream,
  EntropyMission,
  INITIAL_MISSIONS,
  MARKETPLACE_BLUEPRINTS,
  SOLAR_DEPARTMENTS,
} from '../data/madinatOntology';
import { resolveExteriorCollisions } from '../world/CollisionEngine';
import { LIVE_WORLD_TELEMETRY, WORLD_LAYOUT } from '../world/worldLayout';

export type InterfaceMode = 'world3d' | 'garden' | 'desktop' | 'glbInspector';
export type LocomotionMode = 'onFoot' | 'car' | 'boat' | 'evtol' | 'parachute' | 'tram';
export type SunPreset = 'dawn' | 'noon' | 'golden' | 'sanctuaryNight';

export interface SpawnedStructure {
  id: string;
  kind: 'pavilion' | 'fountain' | 'palmGrove' | 'solarTower';
  label: string;
  position: [number, number, number];
  rotationY: number;
}

export interface RecruitCandidate {
  id: string;
  name: string;
  harness: 'Claude Code' | 'Codex' | 'DeepSeek Superagent' | 'Pi 1.5';
  specialty: string;
  departmentId: string;
  hired: boolean;
}

export interface VehicleInstance {
  id: string;
  name: string;
  kind: 'car' | 'boat' | 'evtol';
  position: [number, number, number];
  rotationY: number;
  color: string;
}

interface WorldState {
  interfaceMode: InterfaceMode;
  setInterfaceMode: (m: InterfaceMode) => void;

  // Player & Vehicles
  playerPos: [number, number, number];
  playerRotY: number;
  locomotion: LocomotionMode;
  activeVehicleId: string | null;
  firstPerson: boolean;
  aerialCam: boolean;
  teleportTarget: [number, number, number] | null;
  vehicles: VehicleInstance[];

  setPlayerTransform: (pos: [number, number, number], rotY: number) => void;
  toggleCameraPerspective: () => void;
  toggleAerialCamera: () => void;
  enterVehicle: (vehicleId: string) => void;
  exitVehicle: () => void;
  boardTram: () => void;
  triggerParachute: () => void;
  landOnGround: (groundY?: number) => void;
  teleportTo: (pos: [number, number, number], toast?: string) => void;
  clearTeleport: () => void;
  updateVehicleTransform: (id: string, pos: [number, number, number], rotY: number) => void;

  // Sun, Weather & Time-lapse (A1-Beth Homeostasis)
  solarHour: number; // 0..24
  sunPreset: SunPreset;
  timelapseSpeed: 0 | 60 | 600;
  setSunPreset: (p: SunPreset) => void;
  setSolarHour: (h: number) => void;
  setTimelapseSpeed: (s: 0 | 60 | 600) => void;

  // Enterprise & Marketplace State
  treasuryEur: number;
  harmonyStars: number; // 1..5
  opsPerSecTotal: number;
  deployedBlueprints: string[];
   constructingBlueprint: { id: string; progress: number } | null;
  escrowSignedCount: number;
  gongRings: number;
  recruits: RecruitCandidate[];
  resolvedNeedsIds: string[];

  deployBlueprint: (bpId: string) => void;
  tickBlueprintConstruction: (dt: number) => void;
  signEscrow: () => void;
  ringMergeGong: () => void;
  hireRecruit: (id: string) => void;
  resolveAgentNeed: (streamId: string) => void;
  jumpToNextAgentNeedingYou: () => void;

  // Missions & Rogue Drone
  missions: EntropyMission[];
  completedMissionIds: string[];
  rogueDroneAngle: number;
  rogueDroneNeutralized: boolean;
  tickRogueDrone: (dt: number) => void;
  neutralizeRogueDrone: () => void;

  // UI Overlays & Portal Worlds
  activeDepartmentId: string | null;
  enteredDepartmentId: string | null;
  soukModalOpen: boolean;
  phoneOpen: boolean;
  builderOpen: boolean;
  activePortalId: string | null;
  inspectedWorkstation: { stream: DepartmentStream; deptId: string | null; isCeo?: boolean } | null;
  agentDirectives: Record<string, string[]>;
  radioStation: number; // 0=Off, 1=Al-Hikma, 2=Cupertino, 3=Rooftop
  interactionHint: { label: string; action: () => void } | null;
  toastMessage: string | null;
  ceoMessages: { sender: 'user' | 'ceo'; text: string; time: string }[];

  openDepartment: (id: string | null) => void;
  enterDepartmentBuilding: (id: string | null) => void;
  setSoukModalOpen: (v: boolean) => void;
  setPhoneOpen: (v: boolean) => void;
  setBuilderOpen: (v: boolean) => void;
  enterPortal: (portalId: string | null) => void;
  inspectWorkstation: (ws: { stream: DepartmentStream; deptId: string | null; isCeo?: boolean } | null) => void;
  sendAgentDirective: (streamId: string, text: string) => void;
  setRadioStation: (idx: number) => void;
  setInteractionHint: (hint: { label: string; action: () => void } | null) => void;
  pushToast: (msg: string) => void;
  sendCeoPrompt: (prompt: string) => void;

  // Live In-World Architect (Spellthorn Touch V / B)
  spawnedStructures: SpawnedStructure[];
  spawnStructureInFront: (kind: SpawnedStructure['kind'], customLabel?: string) => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  interfaceMode: 'world3d',
  setInterfaceMode: (m) =>
    set({
      interfaceMode: m,
      activeDepartmentId: null,
      enteredDepartmentId: null,
      soukModalOpen: false,
      inspectedWorkstation: null,
    }),

  // Start inside the Royal South Gate Rotunda facing North (rotY = 0) straight through the Gate, Lagoon Bridge & Golden Dome!
  playerPos: [0, 0.35, 184],
  playerRotY: 0,
  locomotion: 'onFoot',
  activeVehicleId: null,
  firstPerson: false,
  aerialCam: false,
  teleportTarget: null,
  vehicles: [
    {
      id: 'car-south',
      name: 'Supercar Solaire « Al-Mansur GT »',
      kind: 'car',
      position: [5.6, 0.25, 179],
      rotationY: 0.22,
      color: '#eab308',
    },
    {
      id: 'car-ring',
      name: 'Rover Exécutif « Cupertino One »',
      kind: 'car',
      position: [124.2, 0.12, 14],
      rotationY: 0,
      color: '#f8fafc',
    },
    {
      id: 'boat-lagoon',
      name: 'Glisseur Solaire d’Émeraude',
      kind: 'boat',
      position: [18, -0.22, 56],
      rotationY: -Math.PI / 3,
      color: '#14b8a6',
    },
    {
      id: 'evtol-north',
      name: 'Aéronef Biplace « Orville eVTOL »',
      kind: 'evtol',
      position: [-15.5, 0.26, 183],
      rotationY: -0.35,
      color: '#38bdf8',
    },
  ],

  setPlayerTransform: (pos, rotY) => set({ playerPos: pos, playerRotY: rotY }),
  toggleCameraPerspective: () => set((s) => ({ firstPerson: !s.firstPerson, aerialCam: false })),
  toggleAerialCamera: () => set((s) => ({ aerialCam: !s.aerialCam, firstPerson: false })),

  enterVehicle: (vehicleId) => {
    const v = get().vehicles.find((x) => x.id === vehicleId);
    if (!v) return;
    const live = LIVE_WORLD_TELEMETRY.vehicles.get(vehicleId);
    const livePos = live ? ([...live.pos] as [number, number, number]) : ([...v.position] as [number, number, number]);
    const liveRot = live ? live.rotY : v.rotationY;
    LIVE_WORLD_TELEMETRY.playerPos = [...livePos];
    LIVE_WORLD_TELEMETRY.playerRotY = liveRot;
    set({
      activeVehicleId: vehicleId,
      locomotion: v.kind,
      playerPos: livePos,
      playerRotY: liveRot,
      teleportTarget: livePos,
      toastMessage: `À bord : ${v.name} — [ZQSD/WASD] Conduire · [Espace] ${v.kind === 'evtol' ? 'Monter' : 'Frein à main'} · [Shift] Boost · [E] Sortir`,
    });
  },

  exitVehicle: () => {
    const s = get();
    const curPlayerPos = LIVE_WORLD_TELEMETRY.playerPos;
    if (s.locomotion === 'evtol' && curPlayerPos[1] > 8) {
      s.triggerParachute();
      return;
    }
    const activeVeh = s.vehicles.find((x) => x.id === s.activeVehicleId);
    const liveVeh = s.activeVehicleId ? LIVE_WORLD_TELEMETRY.vehicles.get(s.activeVehicleId) : undefined;
    const [vx, vy, vz] = liveVeh ? liveVeh.pos : activeVeh ? activeVeh.position : curPlayerPos;
    const vRot = liveVeh ? liveVeh.rotY : activeVeh ? activeVeh.rotationY : LIVE_WORLD_TELEMETRY.playerRotY;

    if (s.locomotion === 'boat') {
      const ang = Math.atan2(vz, vx);
      const rSafe = Math.hypot(vx, vz) < 59 ? 40.0 : 78.2;
      const [rx, rz] = resolveExteriorCollisions(
        Math.cos(ang) * rSafe,
        Math.sin(ang) * rSafe,
        0.35,
        0.48,
        'onFoot',
        s.vehicles,
        null,
        s.deployedBlueprints,
        s.spawnedStructures,
      );
      const exitPos: [number, number, number] = [rx, 0.35, rz];
      LIVE_WORLD_TELEMETRY.playerPos = [...exitPos];
      LIVE_WORLD_TELEMETRY.playerRotY = vRot;
      if (activeVeh) LIVE_WORLD_TELEMETRY.vehicles.set(activeVeh.id, { pos: [vx, vy, vz], rotY: vRot });
      set({
        locomotion: 'onFoot',
        activeVehicleId: null,
        vehicles: s.vehicles.map((v) =>
          v.id === activeVeh?.id ? { ...v, position: [vx, vy, vz], rotationY: vRot } : v,
        ),
        playerPos: exitPos,
        playerRotY: vRot,
        teleportTarget: exitPos,
        toastMessage: 'Mode Piéton actif',
      });
      return;
    }

    const sideDist = activeVeh?.kind === 'evtol' ? 3.45 : 2.38;
    const longDist = 3.55;
    const exitY = Math.max(0.25, vy > 4 ? 0.35 : vy + 0.1);
    const candidates: [number, number][] = [
      [vx - Math.cos(vRot) * sideDist, vz + Math.sin(vRot) * sideDist], // Driver Left Door
      [vx + Math.cos(vRot) * sideDist, vz - Math.sin(vRot) * sideDist], // Passenger Right Door
      [vx + Math.sin(vRot) * longDist, vz + Math.cos(vRot) * longDist], // Rear Bumper
      [vx - Math.sin(vRot) * longDist, vz - Math.cos(vRot) * longDist], // Front Bumper
    ];

    const syncedVehicles = s.vehicles.map((v) =>
      v.id === activeVeh?.id ? { ...v, position: [vx, vy, vz] as [number, number, number], rotationY: vRot } : v,
    );
    let bestX = candidates[0][0];
    let bestZ = candidates[0][1];
    let bestClearance = -1;
    for (const [cx, cz] of candidates) {
      const [rx, rz] = resolveExteriorCollisions(
        cx,
        cz,
        exitY,
        0.48,
        'onFoot',
        syncedVehicles,
        null,
        s.deployedBlueprints,
        s.spawnedStructures,
      );
      const obsDist = Math.hypot(rx - vx, rz - vz);
      if (Math.hypot(rx - cx, rz - cz) < 0.45 && obsDist >= 1.85) {
        bestX = rx;
        bestZ = rz;
        bestClearance = obsDist;
        break;
      }
      if (obsDist > bestClearance) {
        bestX = rx;
        bestZ = rz;
        bestClearance = obsDist;
      }
    }

    const exitPos: [number, number, number] = [bestX, exitY, bestZ];
    LIVE_WORLD_TELEMETRY.playerPos = [...exitPos];
    LIVE_WORLD_TELEMETRY.playerRotY = vRot;
    if (activeVeh) LIVE_WORLD_TELEMETRY.vehicles.set(activeVeh.id, { pos: [vx, vy, vz], rotY: vRot });
    set({
      locomotion: 'onFoot',
      activeVehicleId: null,
      vehicles: syncedVehicles,
      playerPos: exitPos,
      playerRotY: vRot,
      teleportTarget: exitPos,
      toastMessage: 'Mode Piéton actif',
    });
  },

  boardTram: () =>
    set({
      locomotion: 'tram',
      activeVehicleId: null,
      toastMessage: 'À bord du Tramway Magnétique Solaire (Anneau 3) · [E] Descendre à la prochaine arche',
    }),

  triggerParachute: () => {
    const cur = LIVE_WORLD_TELEMETRY.playerPos;
    const chutePos: [number, number, number] = [cur[0], Math.max(cur[1], 42), cur[2]];
    LIVE_WORLD_TELEMETRY.playerPos = [...chutePos];
    set({
      locomotion: 'parachute',
      activeVehicleId: null,
      playerPos: chutePos,
      teleportTarget: chutePos,
      toastMessage: 'Parachute Solaire déployé ! Plane au-dessus de Madinat Aspace !',
    });
  },

  landOnGround: (groundY = 0.35) => {
    const cur = LIVE_WORLD_TELEMETRY.playerPos;
    const landPos: [number, number, number] = [cur[0], groundY, cur[2]];
    LIVE_WORLD_TELEMETRY.playerPos = [...landPos];
    set({
      locomotion: 'onFoot',
      playerPos: landPos,
    });
  },

  teleportTo: (pos, toast) => {
    LIVE_WORLD_TELEMETRY.playerPos = [...pos];
    set({
      locomotion: 'onFoot',
      activeVehicleId: null,
      teleportTarget: pos,
      playerPos: pos,
      activePortalId: null,
      interfaceMode: 'world3d',
      toastMessage: toast ?? 'Téléportation spatiale effectuée',
    });
  },

  clearTeleport: () => set({ teleportTarget: null }),

  updateVehicleTransform: (id, pos, rotY) =>
    set((s) => ({
      vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, position: pos, rotationY: rotY } : v)),
    })),

  // Default Golden Hour Solarpunk lighting matching the concept image!
  solarHour: 17.05,
  sunPreset: 'golden',
  timelapseSpeed: 0,
  setSunPreset: (p) => {
    const map: Record<SunPreset, number> = {
      dawn: 6.8,
      noon: 12.5,
      golden: 17.05,
      sanctuaryNight: 2.0,
    };
    set({ sunPreset: p, solarHour: map[p], timelapseSpeed: 0 });
  },
  setSolarHour: (h) => set({ solarHour: ((h % 24) + 24) % 24 }),
  setTimelapseSpeed: (s) =>
    set({
      timelapseSpeed: s,
      toastMessage: s > 0 ? `Time-Lapse CubeFarm ${s}× activé : observe les flux de la cité en accéléré !` : 'Retour au temps réel',
    }),

  treasuryEur: 364800,
  harmonyStars: 3,
  opsPerSecTotal: 104940,
  deployedBlueprints: ['saas', 'agency', 'ecommerce'],
  constructingBlueprint: null,
  escrowSignedCount: 0,
  gongRings: 1,
  resolvedNeedsIds: [],
  recruits: [
    { id: 'rec-1', name: 'Al-Khwarizmi', harness: 'DeepSeek Superagent', specialty: 'Optimisation Algorithmes & Routage SOP', departmentId: 'rd', hired: false },
    { id: 'rec-2', name: 'Ada Lovelace', harness: 'Claude Code', specialty: 'Audit Financier & Réconciliation Stripe', departmentId: 'finance', hired: false },
    { id: 'rec-3', name: 'Grace Hopper', harness: 'Codex', specialty: 'Compilateur Blueprints & Sécurité OWASP', departmentId: 'legal', hired: false },
    { id: 'rec-4', name: 'Ibn Battuta', harness: 'Pi 1.5', specialty: 'Expansion Internationale & GTM Multi-Marchés', departmentId: 'sales', hired: false },
  ],

  deployBlueprint: (bpId) => {
    const s = get();
    if (s.deployedBlueprints.includes(bpId) || s.constructingBlueprint) return;
    const bp = MARKETPLACE_BLUEPRINTS.find((b) => b.id === bpId);
    if (!bp) return;
    set({
      constructingBlueprint: { id: bpId, progress: 0.02 },
      soukModalOpen: false,
      toastMessage: `Drones Solaires en vol : assemblage de « ${bp.title} » sur l'Anneau Extérieur !`,
    });
  },

  tickBlueprintConstruction: (dt) => {
    const s = get();
    if (!s.constructingBlueprint) return;
    const bp = MARKETPLACE_BLUEPRINTS.find((b) => b.id === s.constructingBlueprint!.id);
    const duration = bp?.provisioningSec ?? 6;
    const next = s.constructingBlueprint.progress + dt / duration;
    if (next >= 1) {
      const doneId = s.constructingBlueprint.id;
      const wasMissionDone = s.completedMissionIds.includes('m-souk');
      set({
        constructingBlueprint: null,
        deployedBlueprints: [...s.deployedBlueprints, doneId],
        opsPerSecTotal: s.opsPerSecTotal + 18400,
        treasuryEur: s.treasuryEur + (wasMissionDone ? 8000 : 24000),
        harmonyStars: Math.min(5, s.harmonyStars + (wasMissionDone ? 0 : 1)),
        completedMissionIds: wasMissionDone ? s.completedMissionIds : [...s.completedMissionIds, 'm-souk'],
        toastMessage: `Villa Patricienne « ${bp?.title} » opérationnelle ! (+18 400 ops/s · Mission Terraformation réussie)`,
      });
    } else {
      set({ constructingBlueprint: { ...s.constructingBlueprint, progress: next } });
    }
  },

  signEscrow: () => {
    const s = get();
    const firstTime = !s.completedMissionIds.includes('m-escrow');
    set({
      escrowSignedCount: s.escrowSignedCount + 1,
      gongRings: s.gongRings + 1,
      treasuryEur: s.treasuryEur + 12500,
      harmonyStars: Math.min(5, s.harmonyStars + (firstTime ? 1 : 0)),
      completedMissionIds: firstTime ? [...s.completedMissionIds, 'm-escrow'] : s.completedMissionIds,
      resolvedNeedsIds: [...new Set([...s.resolvedNeedsIds, 'fin-3'])],
      toastMessage: 'Signature Souveraine human:amdkn scellée (Reçu R10 CANARY_RECEIPT) · Gong d’Or déclenché !',
    });
  },

  ringMergeGong: () =>
    set((s) => ({
      gongRings: s.gongRings + 1,
      treasuryEur: s.treasuryEur + 1500,
      toastMessage: 'GONG D’OR BAYT AL-HIKMA ! Pull Request mergée & célébrée par l’essaim !',
    })),

  hireRecruit: (id) =>
    set((s) => {
      const target = s.recruits.find((r) => r.id === id);
      if (!target || target.hired) return s;
      return {
        recruits: s.recruits.map((r) => (r.id === id ? { ...r, hired: true } : r)),
        opsPerSecTotal: s.opsPerSecTotal + 4500,
        toastMessage: `${target.name} (${target.harness}) recruté ! En route vers le pavillon ${target.departmentId.toUpperCase()}.`,
      };
    }),

  resolveAgentNeed: (streamId) =>
    set((s) => ({
      resolvedNeedsIds: [...new Set([...s.resolvedNeedsIds, streamId])],
      treasuryEur: s.treasuryEur + 4200,
      opsPerSecTotal: s.opsPerSecTotal + 2100,
      toastMessage: `Décision humaine validée pour ${streamId.toUpperCase()} (+4 200 € flux débloqué)`,
    })),

  jumpToNextAgentNeedingYou: () => {
    const s = get();
    for (const dept of SOLAR_DEPARTMENTS) {
      const pending = dept.streams.find((st) => st.needsHuman && !s.resolvedNeedsIds.includes(st.id));
      if (pending) {
        const rad = (dept.angleDeg * Math.PI) / 180;
        const r = 96;
        s.teleportTo(
          [Math.cos(rad) * r, 0.35, -Math.sin(rad) * r],
          `[Touche N] Téléporté auprès de ${pending.agentName} (${dept.name})`,
        );
        set({ activeDepartmentId: dept.id });
        return;
      }
    }
    s.teleportTo([0, 8.68, 4], 'Tous les départements sont autonomes ! Retour à l’Observatoire S0 du Dôme.');
  },

  missions: INITIAL_MISSIONS,
  completedMissionIds: [],
  rogueDroneAngle: Math.PI,
  rogueDroneNeutralized: false,
  tickRogueDrone: (dt) => {
    const s = get();
    if (s.rogueDroneNeutralized) return;
    LIVE_WORLD_TELEMETRY.rogueDroneAngle = (LIVE_WORLD_TELEMETRY.rogueDroneAngle + dt * 0.32) % (Math.PI * 2);
  },
  neutralizeRogueDrone: () =>
    set((s) => {
      if (s.rogueDroneNeutralized) return s;
      return {
        rogueDroneNeutralized: true,
        harmonyStars: Math.min(5, s.harmonyStars + 1),
        treasuryEur: s.treasuryEur + 18000,
        completedMissionIds: [...new Set([...s.completedMissionIds, 'm-drone'])],
        toastMessage: 'DRONE FANTÔME RECALIBRÉ SOUS BAIL CONCORDIA (TTL 300s) ! +1★ Harmonie & +18 000 €',
      };
    }),

  activeDepartmentId: null,
  enteredDepartmentId: null,
  soukModalOpen: false,
  phoneOpen: false,
  builderOpen: false,
  activePortalId: null,
  inspectedWorkstation: null,
  agentDirectives: {},
  radioStation: 0,
  interactionHint: null,
  toastMessage: 'Bienvenue à Madinat Aspace ! Marche vers le Pont Sud, conduis la Supercar [E] ou presse [P] pour ton Smartphone.',
  ceoMessages: [
    {
      sender: 'ceo',
      text: 'Bonjour Amadou (S0). La Cité tourne à 104 940 ops/sec. 3 dossiers d’Escrow attendent ton visa et un Drone Fantôme rôde sur le Boulevard Solaire.',
      time: '16:45',
    },
  ],

  openDepartment: (id) => set({ activeDepartmentId: id, inspectedWorkstation: null }),
  enterDepartmentBuilding: (id) =>
    set({
      enteredDepartmentId: id,
      activeDepartmentId: null,
      inspectedWorkstation: null,
      interactionHint: null,
      toastMessage: id
        ? `Entrée dans le Studio ${id.toUpperCase()} · [E] Écran Agent / Pupitre · [Échap] Sortir sur l’Avenue.`
        : 'Sortie sur l’Esplanade Solarpunk de Madinat Aspace.',
    }),
  setSoukModalOpen: (v) => set({ soukModalOpen: v }),
  setPhoneOpen: (v) => set({ phoneOpen: v }),
  setBuilderOpen: (v) => set({ builderOpen: v }),
  enterPortal: (portalId) =>
    set({
      activePortalId: portalId,
      activeDepartmentId: null,
      inspectedWorkstation: null,
      toastMessage: portalId
        ? 'Téléporté dans le Tableau-Portail 3D ! [Échap] pour revenir dans la Forge R&D.'
        : 'Retour dans la Forge R&D de Madinat Aspace.',
    }),
  inspectWorkstation: (ws) =>
    set({
      inspectedWorkstation: ws,
      toastMessage: ws ? `Terminal ouvert : ${ws.stream.agentName}` : null,
    }),
  sendAgentDirective: (streamId, text) => {
    const clean = text.trim();
    if (!clean) return;
    set((curr) => {
      const prev = curr.agentDirectives[streamId] ?? [];
      return {
        agentDirectives: { ...curr.agentDirectives, [streamId]: [...prev, clean] },
        opsPerSecTotal: curr.opsPerSecTotal + 850,
        toastMessage: `Instruction transmise à ${streamId.toUpperCase()} : exécution SOP lancée.`,
      };
    });
  },
  setRadioStation: (idx) => set({ radioStation: idx }),
  setInteractionHint: (hint) => set({ interactionHint: hint }),
  pushToast: (msg) => set({ toastMessage: msg }),

  sendCeoPrompt: (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const s = get();
    const lower = trimmed.toLowerCase();
    let reply = `Bien reçu. J’orchestre immédiatement les VPs concernés sur « ${trimmed} » sous garde-fou S1-Rick.`;

    if (lower.includes('recrut') || lower.includes('embauch') || lower.includes('agent')) {
      const nextRec = s.recruits.find((r) => !r.hired);
      if (nextRec) {
        s.hireRecruit(nextRec.id);
        reply = `J’ai embauché ${nextRec.name} (${nextRec.harness}) et l’ai affecté au secteur ${nextRec.departmentId.toUpperCase()}.`;
      } else {
        reply = 'Les 4 candidats d’élite du hall sont déjà intégrés dans nos pavillons !';
      }
    } else if (lower.includes('villa') || lower.includes('souk') || lower.includes('blueprint') || lower.includes('construi')) {
      const nextBp = MARKETPLACE_BLUEPRINTS.find((b) => !s.deployedBlueprints.includes(b.id));
      if (nextBp) {
        s.deployBlueprint(nextBp.id);
        reply = `Lancement immédiat du Blueprint « ${nextBp.title} » ! Regarde les drones bâtisseurs sur l’Anneau Extérieur.`;
      } else {
        s.spawnStructureInFront('pavilion', 'Pavillon Solaire Sur-Mesure');
        reply = 'Toutes les villas du Souk sont actives : j’ai érigé un nouveau Pavillon Solaire juste devant ta position !';
      }
    } else if (lower.includes('nuit') || lower.includes('beth') || lower.includes('dors')) {
      s.setSunPreset('sanctuaryNight');
      reply = 'Bouclier Nocturne A1-Beth (00h00–05h00) activé : éclairage bioluminescent doux et exécution autonome silencieuse.';
    } else if (lower.includes('soleil') || lower.includes('jour') || lower.includes('or')) {
      s.setSunPreset('golden');
      reply = 'Lumière Golden Hour Solarpunk rétablie sur les anneaux photovoltaïques.';
    }

    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    set((curr) => ({
      ceoMessages: [
        ...curr.ceoMessages,
        { sender: 'user', text: trimmed, time: now },
        { sender: 'ceo', text: reply, time: now },
      ],
    }));
  },

  spawnedStructures: [],
  spawnStructureInFront: (kind, customLabel) => {
    const s = get();
    const dist = 12;
    const pPos = LIVE_WORLD_TELEMETRY.playerPos;
    const pRot = LIVE_WORLD_TELEMETRY.playerRotY;
    const wantX = pPos[0] - Math.sin(pRot) * dist;
    const wantZ = pPos[2] - Math.cos(pRot) * dist;
    let [x, z] = resolveExteriorCollisions(
      wantX,
      wantZ,
      0.35,
      3.8,
      'onFoot',
      s.vehicles,
      s.activeVehicleId,
      s.deployedBlueprints,
      s.spawnedStructures,
    );
    const rSpawn = Math.hypot(x, z);
    if (rSpawn > WORLD_LAYOUT.LAGOON.innerWallR - 3.8 && rSpawn < WORLD_LAYOUT.LAGOON.outerWallR + 3.8) {
      const targetR = rSpawn < 59 ? WORLD_LAYOUT.LAGOON.innerWallR - 4.0 : WORLD_LAYOUT.LAGOON.outerWallR + 4.0;
      const sc = targetR / (rSpawn || 1);
      x *= sc;
      z *= sc;
    }
    const labels: Record<SpawnedStructure['kind'], string> = {
      pavilion: 'Kiosque Solaire Néo-Abbasside',
      fountain: 'Fontaine Fraîcheur Qanat',
      palmGrove: 'Bosquet d’Oliviers & Palmiers',
      solarTower: 'Tour Capteur de Vent Badgir',
    };
    const item: SpawnedStructure = {
      id: `sp-${Date.now()}`,
      kind,
      label: customLabel ?? labels[kind],
      position: [x, 0, z],
      rotationY: pRot,
    };
    set({
      spawnedStructures: [...s.spawnedStructures, item],
      opsPerSecTotal: s.opsPerSecTotal + 1200,
      toastMessage: `Architecte In-World : « ${item.label} » matérialisé devant toi !`,
    });
  },
}));
