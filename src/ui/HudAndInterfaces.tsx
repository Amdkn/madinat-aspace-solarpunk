import React, { useState } from 'react';
import {
  Building2,
  Compass,
  Crown,
  Layers,
  Mic,
  Monitor,
  Play,
  Radio,
  Smartphone,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import {
  MARKETPLACE_BLUEPRINTS,
  SOLAR_DEPARTMENTS,
} from '../data/madinatOntology';
import { useWorldStore } from '../store/useWorldStore';
import { solarpunkAudio } from '../audio/solarpunkAudio';

// 1. TOP TRIMODAL SWITCHER BAR (Proving seamless 0.5s continuity across Dashboard <-> Web Desktop <-> 3D GTA Solarpunk)
export const TopTrimodalBar: React.FC = () => {
  const interfaceMode = useWorldStore((s) => s.interfaceMode);
  const setInterfaceMode = useWorldStore((s) => s.setInterfaceMode);
  const treasuryEur = useWorldStore((s) => s.treasuryEur);
  const harmonyStars = useWorldStore((s) => s.harmonyStars);
  const opsPerSecTotal = useWorldStore((s) => s.opsPerSecTotal);
  const sunPreset = useWorldStore((s) => s.sunPreset);
  const setSunPreset = useWorldStore((s) => s.setSunPreset);
  const setPhoneOpen = useWorldStore((s) => s.setPhoneOpen);
  const phoneOpen = useWorldStore((s) => s.phoneOpen);
  const setBuilderOpen = useWorldStore((s) => s.setBuilderOpen);
  const builderOpen = useWorldStore((s) => s.builderOpen);
  const aerialCam = useWorldStore((s) => s.aerialCam);
  const toggleAerialCamera = useWorldStore((s) => s.toggleAerialCamera);
  const jumpToNextAgentNeedingYou = useWorldStore((s) => s.jumpToNextAgentNeedingYou);
  const resolvedNeedsIds = useWorldStore((s) => s.resolvedNeedsIds);

  const pendingCount = SOLAR_DEPARTMENTS.reduce(
    (acc, d) => acc + d.streams.filter((st) => st.needsHuman && !resolvedNeedsIds.includes(st.id)).length,
    0,
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 16,
        right: 16,
        height: 52,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(12, 19, 28, 0.86)',
        backdropFilter: 'blur(14px)',
        borderRadius: 14,
        border: '1px solid rgba(212, 162, 76, 0.38)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      }}
    >
      {/* Brand + Trimodal Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #f59e0b, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              color: '#0f172a',
              fontSize: 14,
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.6, color: '#fef3c7' }}>
              ASPACE MARKETPLACE
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>Madinat Aspace · Bagdad × Apple Park</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 4,
            background: 'rgba(255,255,255,0.05)',
            padding: 4,
            borderRadius: 10,
            marginLeft: 8,
          }}
        >
          {[
            { id: 'garden', label: '1 · Digital Garden', icon: Layers },
            { id: 'desktop', label: '2 · Web Desktop', icon: Monitor },
            { id: 'world3d', label: '3 · 3D GTA Solarpunk', icon: Compass },
            { id: 'glbInspector', label: '4 · Maquette .GLB', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = interfaceMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setInterfaceMode(tab.id as typeof interfaceMode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 11px',
                  borderRadius: 7,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  background: active ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                  color: active ? '#0f172a' : '#cbd5e1',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right KPIs, Harmony Stars, Needs You Alert & Quick Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {pendingCount > 0 && (
          <button
            onClick={() => {
              jumpToNextAgentNeedingYou();
              solarpunkAudio.playChime(true);
            }}
            style={{
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid #f59e0b',
              color: '#fde047',
              padding: '5px 10px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🙋 {pendingCount} Agent(s) t’attendent [N]
          </button>
        )}

        <div className="font-mono-tech" style={{ fontSize: 12, color: '#5eead4', fontWeight: 600 }}>
          {opsPerSecTotal.toLocaleString('fr-FR')} ops/s
        </div>
        <div className="font-mono-tech" style={{ fontSize: 13, color: '#fde68a', fontWeight: 700 }}>
          {treasuryEur.toLocaleString('fr-FR')} €
        </div>
        <div title="Indice d'Harmonie Solarpunk" style={{ color: '#fbbf24', fontSize: 14, letterSpacing: 2 }}>
          {'★'.repeat(harmonyStars)}
          <span style={{ opacity: 0.25 }}>{'★'.repeat(5 - harmonyStars)}</span>
        </div>

        {/* Sun Cycle Selector */}
        <select
          value={sunPreset}
          onChange={(e) => setSunPreset(e.target.value as typeof sunPreset)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 8,
            padding: '5px 8px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          <option value="dawn" style={{ background: '#0f172a' }}>🌅 Aube Rose</option>
          <option value="noon" style={{ background: '#0f172a' }}>☀️ Zénith Solaire</option>
          <option value="golden" style={{ background: '#0f172a' }}>✨ Golden Hour</option>
          <option value="sanctuaryNight" style={{ background: '#0f172a' }}>🌙 Nuit Beth (00h-05h)</option>
        </select>

        <button
          onClick={toggleAerialCamera}
          title="Basculer Caméra Aérienne Drone / Sol GTA [G]"
          style={{
            background: aerialCam ? '#38bdf8' : 'rgba(255,255,255,0.08)',
            color: aerialCam ? '#0f172a' : '#f8fafc',
            border: 'none',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {aerialCam ? '🦅 Vue Sol [G]' : '🛰️ Vue Cité [G]'}
        </button>

        <button
          onClick={() => setBuilderOpen(!builderOpen)}
          title="Architecte In-World [B]"
          style={{
            background: builderOpen ? '#14b8a6' : 'rgba(255,255,255,0.08)',
            color: builderOpen ? '#0f172a' : '#f8fafc',
            border: 'none',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Building2 size={14} /> [B] Bâtir
        </button>

        <button
          onClick={() => setPhoneOpen(!phoneOpen)}
          title="Smartphone CEO [P]"
          style={{
            background: phoneOpen ? '#f59e0b' : 'rgba(255,255,255,0.08)',
            color: phoneOpen ? '#0f172a' : '#f8fafc',
            border: 'none',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Smartphone size={14} /> [P]
        </button>
      </div>
    </div>
  );
};

// 2. GTA SOLARPUNK CIRCULAR RADAR MINIMAP + MISSIONS TRACKER + INTERACTION PROMPT
export const World3DHudOverlay: React.FC = () => {
  const playerPos = useWorldStore((s) => s.playerPos);
  const playerRotY = useWorldStore((s) => s.playerRotY);
  const locomotion = useWorldStore((s) => s.locomotion);
  const interactionHint = useWorldStore((s) => s.interactionHint);
  const toastMessage = useWorldStore((s) => s.toastMessage);
  const missions = useWorldStore((s) => s.missions);
  const completedMissionIds = useWorldStore((s) => s.completedMissionIds);
  const rogueDroneAngle = useWorldStore((s) => s.rogueDroneAngle);
  const rogueDroneNeutralized = useWorldStore((s) => s.rogueDroneNeutralized);
  const teleportTo = useWorldStore((s) => s.teleportTo);
  const activeDepartmentId = useWorldStore((s) => s.activeDepartmentId);
  const openDepartment = useWorldStore((s) => s.openDepartment);
  const resolveAgentNeed = useWorldStore((s) => s.resolveAgentNeed);
  const resolvedNeedsIds = useWorldStore((s) => s.resolvedNeedsIds);
  const soukModalOpen = useWorldStore((s) => s.soukModalOpen);
  const setSoukModalOpen = useWorldStore((s) => s.setSoukModalOpen);
  const deployedBlueprints = useWorldStore((s) => s.deployedBlueprints);
  const deployBlueprint = useWorldStore((s) => s.deployBlueprint);
  const phoneOpen = useWorldStore((s) => s.phoneOpen);
  const builderOpen = useWorldStore((s) => s.builderOpen);
  const spawnStructureInFront = useWorldStore((s) => s.spawnStructureInFront);
  const radioStation = useWorldStore((s) => s.radioStation);
  const setRadioStation = useWorldStore((s) => s.setRadioStation);
  const timelapseSpeed = useWorldStore((s) => s.timelapseSpeed);
  const setTimelapseSpeed = useWorldStore((s) => s.setTimelapseSpeed);
  const ceoMessages = useWorldStore((s) => s.ceoMessages);
  const sendCeoPrompt = useWorldStore((s) => s.sendCeoPrompt);

  const [chatInput, setChatInput] = useState('');
  const [listeningVoice, setListeningVoice] = useState(false);

  const activeDept = SOLAR_DEPARTMENTS.find((d) => d.id === activeDepartmentId) ?? null;

  // Map world coordinates [-215..215] to 170x170 radar SVG
  const mapScale = 76 / 210;
  const px = 85 + playerPos[0] * mapScale;
  const pz = 85 + playerPos[2] * mapScale;
  const rx = 85 + Math.cos(rogueDroneAngle) * 134 * mapScale;
  const rz = 85 + Math.sin(rogueDroneAngle) * 134 * mapScale;

  const startVoiceArchitect = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!SpeechRec) {
      spawnStructureInFront('pavilion', 'Pavillon Vocal Solaire');
      return;
    }
    const rec = new SpeechRec();
    rec.lang = 'fr-FR';
    setListeningVoice(true);
    rec.onresult = (ev: any) => {
      const transcript: string = ev.results?.[0]?.[0]?.transcript ?? '';
      const low = transcript.toLowerCase();
      if (low.includes('fontaine') || low.includes('eau')) spawnStructureInFront('fountain', `Fontaine · "${transcript}"`);
      else if (low.includes('arbre') || low.includes('jardin') || low.includes('palmier'))
        spawnStructureInFront('palmGrove', `Jardin · "${transcript}"`);
      else if (low.includes('tour') || low.includes('vent')) spawnStructureInFront('solarTower', `Tour · "${transcript}"`);
      else spawnStructureInFront('pavilion', `Pavillon · "${transcript}"`);
      setListeningVoice(false);
    };
    rec.onerror = () => setListeningVoice(false);
    rec.onend = () => setListeningVoice(false);
    rec.start();
  };

  return (
    <>
      {/* Toast Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 74,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(251, 191, 36, 0.5)',
            color: '#fef3c7',
            padding: '8px 18px',
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 600,
            backdropFilter: 'blur(10px)',
            pointerEvents: 'none',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Right Mission Tracker Card (GTA Solarpunk Objectives) */}
      <div
        style={{
          position: 'fixed',
          top: 76,
          right: 16,
          width: 320,
          zIndex: 35,
          background: 'rgba(12, 19, 28, 0.82)',
          backdropFilter: 'blur(12px)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.12)',
          padding: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', letterSpacing: 1 }}>
            OPÉRATIONS ANTI-ENTROPIE
          </span>
          <span style={{ fontSize: 11, color: '#5eead4', fontWeight: 700 }}>
            {completedMissionIds.length}/{missions.length} complétées
          </span>
        </div>
        {missions.map((m) => {
          const done = completedMissionIds.includes(m.id);
          return (
            <div
              key={m.id}
              onClick={() => teleportTo(m.targetPos, `Téléportation rapide -> ${m.title}`)}
              title="Cliquer pour s'y téléporter instantanément"
              style={{
                padding: '8px 10px',
                borderRadius: 9,
                marginBottom: 6,
                background: done ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${done ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 10, color: done ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                {done ? '✓ MISSION ACCOMPLIE' : m.code}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2, textDecoration: done ? 'line-through' : 'none' }}>
                {m.title}
              </div>
              {!done && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{m.description}</div>}
            </div>
          );
        })}

        {/* Quick Fast-Travel Ring Jumps */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
          <button
            onClick={() => teleportTo([0, 0.4, 18], 'Hall du Grand Dôme (CEO & Recrutement)')}
            style={miniBtnStyle}
          >
            🏛️ Dôme Lobby
          </button>
          <button
            onClick={() => teleportTo([0, 8.7, 6], 'Sommet Observatoire S0 & Hologramme .GLB')}
            style={miniBtnStyle}
          >
            👑 Sommet S0
          </button>
          <button
            onClick={() => teleportTo([-96, 0.3, 0], 'La Forge R&D & Portails Mario 64')}
            style={miniBtnStyle}
          >
            🖼️ Portails R&D
          </button>
          <button
            onClick={() => teleportTo([130, 0.35, 130], 'Grand Souk Aspace Marketplace')}
            style={miniBtnStyle}
          >
            🕌 Grand Souk
          </button>
        </div>
      </div>

      {/* Bottom-Center Contextual Interaction Prompt [E] */}
      {interactionHint && (
        <button
          onClick={interactionHint.action}
          style={{
            position: 'fixed',
            bottom: 92,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 45,
            background: 'linear-gradient(135deg, #fbbf24, #d97706)',
            color: '#0f172a',
            border: '2px solid #fef3c7',
            borderRadius: 12,
            padding: '11px 22px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 12px 28px rgba(245, 158, 11, 0.45)',
          }}
        >
          {interactionHint.label}
        </button>
      )}

      {/* Bottom-Left GTA Concentric Radar Minimap + Controls Legend */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          zIndex: 35,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 170,
            height: 170,
            borderRadius: '50%',
            background: 'rgba(10, 18, 28, 0.9)',
            border: '3px solid #d4a24c',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <svg width={170} height={170}>
            {/* Outer Rampart */}
            <circle cx={85} cy={85} r={205 * mapScale} fill="none" stroke="rgba(212,162,76,0.35)" strokeWidth={2} />
            {/* Ring 3 Boulevard */}
            <circle cx={85} cy={85} r={134 * mapScale} fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth={5} />
            {/* Ring 2 Apple Park */}
            <circle cx={85} cy={85} r={99 * mapScale} fill="none" stroke="rgba(56,189,248,0.45)" strokeWidth={6} />
            {/* Ring 1 Emerald Lagoon */}
            <circle cx={85} cy={85} r={59 * mapScale} fill="none" stroke="rgba(20,184,166,0.55)" strokeWidth={8} />
            {/* Ring 0 Golden Dome */}
            <circle cx={85} cy={85} r={34 * mapScale} fill="rgba(245,158,11,0.35)" stroke="#fbbf24" strokeWidth={1.5} />

            {/* Grand Souk Marker */}
            <circle cx={85 + 138 * mapScale} cy={85 + 138 * mapScale} r={4} fill="#f472b6" />

            {/* Rogue Drone Red Blip */}
            {!rogueDroneNeutralized && <circle cx={rx} cy={rz} r={4.5} fill="#ef4444" />}

            {/* Player Arrow */}
            <g transform={`translate(${px}, ${pz}) rotate(${(-playerRotY * 180) / Math.PI})`}>
              <polygon points="0,-6 5,5 0,2 -5,5" fill="#fef08a" stroke="#0f172a" strokeWidth={1} />
            </g>
          </svg>
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              width: '100%',
              textAlign: 'center',
              fontSize: 9.5,
              fontWeight: 800,
              color: '#fde68a',
            }}
          >
            {locomotion.toUpperCase()}
          </div>
        </div>

        {/* Controls Bar */}
        <div
          style={{
            background: 'rgba(12, 19, 28, 0.84)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 11.5,
            color: '#cbd5e1',
            lineHeight: 1.6,
          }}
        >
          <div>
            <strong style={{ color: '#fde68a' }}>[ZQSD / WASD]</strong> Déplacer ·{' '}
            <strong style={{ color: '#fde68a' }}>[Shift]</strong> Turbo ·{' '}
            <strong style={{ color: '#fde68a' }}>[Espace]</strong> Saut / Monter eVTOL
          </div>
          <div>
            <strong style={{ color: '#5eead4' }}>[E]</strong> Véhicule / Pupitre / Portail ·{' '}
            <strong style={{ color: '#5eead4' }}>[C]</strong> 1ère/3ème pers ·{' '}
            <strong style={{ color: '#5eead4' }}>[G]</strong> Drone Aérien ·{' '}
            <strong style={{ color: '#5eead4' }}>[Glisser Souris]</strong> Caméra
          </div>
        </div>
      </div>

      {/* DIEGETIC DEPARTMENT EXPLOITATION MODAL (Opened when pressing [E] inside any of the 8 Apple Park Pavilions!) */}
      {activeDept && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(2, 6, 23, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(6px)',
          }}
          onClick={() => openDepartment(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 660,
              maxWidth: '92vw',
              background: '#0f172a',
              border: `1px solid ${activeDept.color}`,
              borderRadius: 18,
              padding: 24,
              boxShadow: '0 25px 60px rgba(0,0,0,0.65)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: activeDept.color, letterSpacing: 1.2 }}>
                  {activeDept.code} · PILIER {activeDept.bridgePillar} · APP REACT : /{activeDept.appSlug}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{activeDept.name}</h2>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
                  VP Gouverneur : <strong style={{ color: '#f8fafc' }}>{activeDept.vpName}</strong> · Squad :{' '}
                  {activeDept.squadName} · {activeDept.aiRatio}
                </div>
              </div>
              <button onClick={() => openDepartment(null)} style={closeBtnStyle}>
                ✕ Fermer [Échap]
              </button>
            </div>

            <div
              className="font-mono-tech"
              style={{
                marginTop: 14,
                padding: '10px 12px',
                background: '#020617',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 11.5,
                color: '#5eead4',
              }}
            >
              {activeDept.terminalLine}
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeDept.streams.map((st) => {
                const pending = st.needsHuman && !resolvedNeedsIds.includes(st.id);
                return (
                  <div
                    key={st.id}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: pending ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${pending ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{st.agentName}</div>
                      <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3 }}>{st.task}</div>
                    </div>
                    {pending ? (
                      <button
                        onClick={() => {
                          resolveAgentNeed(st.id);
                          solarpunkAudio.playGoldenGong();
                        }}
                        style={{
                          background: '#f59e0b',
                          color: '#0f172a',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 14px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Approuver S0 ✓
                      </button>
                    ) : (
                      <span style={{ fontSize: 11.5, color: '#34d399', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {st.statusLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GRAND SOUK MARKETPLACE MODAL (Deploy YAML Blueprints -> Drones build Villa in 3D!) */}
      {soukModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(2, 6, 23, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(6px)',
          }}
          onClick={() => setSoukModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 760,
              maxWidth: '94vw',
              background: '#0f172a',
              border: '1px solid #d4a24c',
              borderRadius: 18,
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 800 }}>
                  GRAND SOUK ASPACE MARKETPLACE · INFRASTRUCTURE-AS-CODE
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
                  Assemblez un Blueprint Certifié → Érigez sa Villa Solarpunk en Direct
                </h2>
              </div>
              <button onClick={() => setSoukModalOpen(false)} style={closeBtnStyle}>
                ✕ Fermer
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
              {MARKETPLACE_BLUEPRINTS.map((bp) => {
                const built = deployedBlueprints.includes(bp.id);
                return (
                  <div
                    key={bp.id}
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${built ? '#10b981' : 'rgba(255,255,255,0.12)'}`,
                    }}
                  >
                    <div style={{ fontSize: 11, color: bp.accentColor, fontWeight: 800 }}>{bp.specVersion}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, marginTop: 3 }}>{bp.title}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{bp.subtitle}</div>
                    <pre
                      className="font-mono-tech"
                      style={{
                        marginTop: 10,
                        padding: 8,
                        borderRadius: 8,
                        background: '#020617',
                        fontSize: 10.5,
                        color: '#cbd5e1',
                        overflowX: 'auto',
                      }}
                    >
                      {bp.yamlPreview}
                    </pre>
                    <button
                      disabled={built}
                      onClick={() => {
                        deployBlueprint(bp.id);
                        solarpunkAudio.playChime(true);
                      }}
                      style={{
                        marginTop: 12,
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 9,
                        border: 'none',
                        fontWeight: 800,
                        cursor: built ? 'default' : 'pointer',
                        background: built ? 'rgba(16,185,129,0.2)' : bp.accentColor,
                        color: built ? '#34d399' : '#0f172a',
                      }}
                    >
                      {built ? '✓ Villa Patricienne Déjà Active sur la Couronne' : `Déployer par Drones Solaires (${bp.modulesCount} modules)`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* IN-WORLD LIVE ARCHITECT PANEL ([B] + Voice [Mic] inspired by Spellthorn) */}
      {builderOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 200,
            right: 16,
            width: 320,
            zIndex: 55,
            background: 'rgba(12, 19, 28, 0.94)',
            border: '1px solid #14b8a6',
            borderRadius: 16,
            padding: 16,
            backdropFilter: 'blur(14px)',
          }}
        >
          <div style={{ fontSize: 11, color: '#5eead4', fontWeight: 800 }}>
            MODE ARCHITECTE IN-WORLD (SPELLTHORN × BLENDERWORLD)
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
            Matérialiser devant ton avatar (à 12 m) :
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => {
                spawnStructureInFront('pavilion');
                solarpunkAudio.playChime(true);
              }}
              style={buildBtnStyle}
            >
              🏛️ Kiosque Solaire
            </button>
            <button
              onClick={() => {
                spawnStructureInFront('fountain');
                solarpunkAudio.playChime(true);
              }}
              style={buildBtnStyle}
            >
              ⛲ Fontaine Qanat
            </button>
            <button
              onClick={() => {
                spawnStructureInFront('palmGrove');
                solarpunkAudio.playChime(true);
              }}
              style={buildBtnStyle}
            >
              🌴 Bosquet Oasis
            </button>
            <button
              onClick={() => {
                spawnStructureInFront('solarTower');
                solarpunkAudio.playChime(true);
              }}
              style={buildBtnStyle}
            >
              🌬️ Tour Badgir
            </button>
          </div>
          <button
            onClick={startVoiceArchitect}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid #fbbf24',
              background: listeningVoice ? '#ef4444' : 'rgba(245, 158, 11, 0.18)',
              color: '#fef3c7',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Mic size={15} />
            {listeningVoice ? 'Écoute en cours... Parle !' : 'Commande Vocale Architecte ("Fontaine", "Pavillon"...)'}
          </button>
        </div>
      )}

      {/* SMARTPHONE DYNAMIC ISLAND ([P] — CubeFarm CEO Chat + Radio Solarpunk + Time-Lapse 600x) */}
      {phoneOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 350,
            width: 330,
            height: 470,
            zIndex: 55,
            background: '#090d16',
            border: '3px solid #334155',
            borderRadius: 32,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.65)',
          }}
        >
          {/* Dynamic Island Pill */}
          <div
            style={{
              alignSelf: 'center',
              width: 120,
              height: 22,
              borderRadius: 999,
              background: '#000000',
              border: '1px solid rgba(251,191,36,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#fbbf24',
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            ● A0 AMADEUS · 7D
          </div>

          {/* Solarpunk Radio Selector */}
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Radio size={13} color="#fbbf24" /> RADIO SOLARPUNK SYNTHÉTISÉE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 6 }}>
              {[
                { id: 0, n: 'Off' },
                { id: 1, n: 'Al-Hikma' },
                { id: 2, n: 'Cupertino' },
                { id: 3, n: '172 BPM' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    setRadioStation(st.id);
                    solarpunkAudio.setRadioStation(st.id);
                  }}
                  style={{
                    padding: '5px 4px',
                    fontSize: 10.5,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: radioStation === st.id ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                    color: radioStation === st.id ? '#0f172a' : '#cbd5e1',
                  }}
                >
                  {st.n}
                </button>
              ))}
            </div>
          </div>

          {/* CubeFarm Time-Lapse Replay */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[0, 60, 600].map((sp) => (
              <button
                key={sp}
                onClick={() => setTimelapseSpeed(sp as 0 | 60 | 600)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: timelapseSpeed === sp ? '#14b8a6' : 'rgba(255,255,255,0.05)',
                  color: timelapseSpeed === sp ? '#0f172a' : '#cbd5e1',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {sp === 0 ? '▶ Live 1×' : `⏩ Replay ${sp}×`}
              </button>
            ))}
          </div>

          {/* CEO Chat Feed */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
            {ceoMessages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '86%',
                  padding: '8px 11px',
                  borderRadius: 12,
                  fontSize: 11.5,
                  lineHeight: 1.4,
                  background: m.sender === 'user' ? '#d97706' : 'rgba(255,255,255,0.08)',
                  color: '#f8fafc',
                }}
              >
                {m.text}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendCeoPrompt(chatInput);
              setChatInput('');
            }}
            style={{ display: 'flex', gap: 6, marginTop: 8 }}
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder='Ex: "Recrute un agent", "Construis villa"...'
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 9,
                padding: '7px 10px',
                color: '#ffffff',
                fontSize: 11.5,
              }}
            />
            <button
              type="submit"
              style={{
                background: '#f59e0b',
                color: '#0f172a',
                border: 'none',
                borderRadius: 9,
                padding: '0 12px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ↑
            </button>
          </form>
        </div>
      )}
    </>
  );
};

// 3. COMPANION VIEWS 1 & 2 (Showing exact synchronization between Digital Garden, Web Desktop & 3D World!)
export const CompanionFlatInterfaces: React.FC<{ mode: 'garden' | 'desktop' }> = ({ mode }) => {
  const setInterfaceMode = useWorldStore((s) => s.setInterfaceMode);
  const teleportTo = useWorldStore((s) => s.teleportTo);
  const openDepartment = useWorldStore((s) => s.openDepartment);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        padding: '84px 32px 32px',
        overflowY: 'auto',
        background: mode === 'garden' ? 'linear-gradient(160deg, #faf6ee 0%, #e7dec8 100%)' : '#0b1120',
        color: mode === 'garden' ? '#1e293b' : '#f8fafc',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#d97706', letterSpacing: 1.2 }}>
              {mode === 'garden'
                ? 'INTERFACE 1 · DIGITAL GARDEN SAAS OS (CULTIVATE · NURTURE · BLOOM · ROOTS)'
                : 'INTERFACE 2 · PRO WEB DESKTOP OS (26 APPS MÉTIERS PARTAGEANT LE MÊME ÉTAT)'}
            </div>
            <h1 className="font-serif-sacred" style={{ fontSize: 36, fontWeight: 700, marginTop: 4 }}>
              {mode === 'garden'
                ? 'Continuité Trimodale vers Madinat Aspace'
                : 'Poste de Commande Multi-Fenêtres Synchronisé'}
            </h1>
          </div>
          <button
            onClick={() => setInterfaceMode('world3d')}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #0d9488)',
              color: '#0f172a',
              border: 'none',
              borderRadius: 12,
              padding: '12px 20px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Plonger dans le Monde 3D à cet endroit →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
          {SOLAR_DEPARTMENTS.map((d) => (
            <div
              key={d.id}
              style={{
                padding: 18,
                borderRadius: 16,
                background: mode === 'garden' ? 'rgba(255,255,255,0.82)' : 'rgba(30, 41, 59, 0.72)',
                border: `1px solid ${d.color}55`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: d.color }}>
                {d.bridgePillar} · {d.code}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4 }}>{d.name}</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                VP {d.vpName} · {d.opsPerSec} · {d.efficiencyDelta}
              </div>
              <button
                onClick={() => {
                  const rad = (d.angleDeg * Math.PI) / 180;
                  teleportTo([Math.cos(rad) * 95, 0.3, -Math.sin(rad) * 95], `Entrée directe dans ${d.name}`);
                  openDepartment(d.id);
                }}
                style={{
                  marginTop: 14,
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 9,
                  border: `1px solid ${d.color}`,
                  background: 'transparent',
                  color: mode === 'garden' ? '#0f172a' : '#f8fafc',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Visiter ce Pavillon en 3D →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const miniBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: '#e2e8f0',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 7,
  padding: '5px 8px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: '#cbd5e1',
  border: 'none',
  borderRadius: 8,
  padding: '6px 12px',
  cursor: 'pointer',
  fontWeight: 700,
};

const buildBtnStyle: React.CSSProperties = {
  background: 'rgba(20, 184, 166, 0.14)',
  border: '1px solid rgba(20, 184, 166, 0.45)',
  color: '#f8fafc',
  borderRadius: 9,
  padding: '9px 8px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};
