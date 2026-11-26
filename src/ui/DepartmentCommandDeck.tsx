import React, { useEffect, useState } from 'react';
import { MARKETPLACE_BLUEPRINTS, PORTAL_GAMES, SolarDepartment } from '../data/madinatOntology';
import { solarpunkAudio } from '../audio/solarpunkAudio';

interface DepartmentCommandDeckProps {
  dept: SolarDepartment;
  enteredDepartmentId: string | null;
  resolvedNeedsIds: string[];
  onClose: () => void;
  onResolveNeed: (id: string) => void;
  onToggleInterior: () => void;
  onOpenDesktop: () => void;
  onEnterPortal: (portalId: string) => void;
  onNotify: (msg: string) => void;
}

interface KanbanCard {
  id: string;
  title: string;
  owner: string;
  col: 0 | 1 | 2;
  metric: string;
}

function buildInitialCards(dept: SolarDepartment): KanbanCard[] {
  const first = dept.streams[0]?.agentName.split('//')[0].trim() ?? 'Holon';
  const second = dept.streams[1]?.agentName.split('//')[0].trim() ?? 'Sentinel';
  if (dept.id === 'rd') {
    return [
      { id: 'k1', title: 'Rendu CubeFarm Studio + Shader N8AO', owner: 'Stark', col: 1, metric: '60 FPS' },
      { id: 'k2', title: 'Audit différentiel PR #1042 & Portage E2E', owner: first, col: 2, metric: '412/412 ✓' },
      { id: 'k3', title: 'Portails 3D Mario-64 & Bridge API /app', owner: second, col: 1, metric: '3 Portails' },
      { id: 'k4', title: 'Optimisation Bundle Vite + Checkpoints SQLite', owner: 'Kang', col: 0, metric: 'PR #1048' },
    ];
  }
  return [
    { id: 'k1', title: `Exécution SOP ${dept.appSlug.toUpperCase()} #104`, owner: first, col: 1, metric: 'SLA 99.8%' },
    { id: 'k2', title: `Audit Conformité ${dept.bridgePillar} R10`, owner: second, col: 2, metric: 'Certifié ✓' },
    { id: 'k3', title: 'Optimisation Flux Multi-Holons', owner: dept.vpName, col: 0, metric: '+14% vélocité' },
  ];
}

export const DepartmentCommandDeck: React.FC<DepartmentCommandDeckProps> = ({
  dept,
  enteredDepartmentId,
  resolvedNeedsIds,
  onClose,
  onResolveNeed,
  onToggleInterior,
  onOpenDesktop,
  onEnterPortal,
  onNotify,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(dept.streams[0]?.id ?? '');
  const [orderText, setOrderText] = useState('');
  const [termLines, setTermLines] = useState<string[]>([
    `● BOOT KERNEL ${dept.code} (${dept.bridgePillar}) · BRIDGE 11ms OK`,
    `❯ ${dept.terminalLine}`,
    `✓ SQUAD ${dept.squadName} EN LIGNE (${dept.opsPerSec})`,
  ]);
  const [cards, setCards] = useState<KanbanCard[]>(() => buildInitialCards(dept));
  const [sealCount, setSealCount] = useState(1);

  useEffect(() => {
    setSelectedAgentId(dept.streams[0]?.id ?? '');
    setTermLines([
      `● BOOT KERNEL ${dept.code} (${dept.bridgePillar}) · BRIDGE 11ms OK`,
      `❯ ${dept.terminalLine}`,
      `✓ SQUAD ${dept.squadName} EN LIGNE (${dept.opsPerSec})`,
    ]);
    setCards(buildInitialCards(dept));
  }, [dept]);

  const sendDirective = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = orderText.trim();
    if (!cmd) return;
    const agent = dept.streams.find((s) => s.id === selectedAgentId) ?? dept.streams[0];
    const shortAgent = agent?.agentName.split('//')[0].trim() ?? 'Holon';
    solarpunkAudio.playChime(true);
    setTermLines((prev) => [
      ...prev.slice(-6),
      `S0@amdkn:~$ dispatch --target=${shortAgent.toLowerCase()} "${cmd}"`,
      `✓ [${shortAgent}] Mandat exécuté sous bail Concordia TTL 300s · Preuve R10 scellée.`,
    ]);
    setOrderText('');
    onNotify(`${shortAgent} a pris en charge : « ${cmd} »`);
  };

  const advanceCard = (cardId: string) => {
    solarpunkAudio.playGoldenGong();
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, col: (Math.min(2, c.col + 1) as 0 | 1 | 2) } : c)),
    );
  };

  const selectedStream = dept.streams.find((s) => s.id === selectedAgentId) ?? dept.streams[0];
  const insideThisStudio = enteredDepartmentId === dept.id;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(2, 6, 23, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 1160,
          maxWidth: '95vw',
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #0b1324 0%, #0f172a 100%)',
          border: `1.5px solid ${dept.color}`,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 28px 75px rgba(0,0,0,0.75)',
        }}
      >
        {/* TOP HEADER BAR */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 11, fontWeight: 800, color: dept.color }}>
              <span style={{ whiteSpace: 'nowrap' }}>{dept.code}</span>
              <span>·</span>
              <span style={{ whiteSpace: 'nowrap' }}>PILIER {dept.bridgePillar}</span>
              <span>·</span>
              <span className="font-mono-tech" style={{ color: '#5eead4', whiteSpace: 'nowrap' }}>APP : /{dept.appSlug}</span>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.16)',
                  color: '#34d399',
                  padding: '2px 8px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}
              >
                {dept.opsPerSec}
              </span>
              <span style={{ color: '#fde68a', whiteSpace: 'nowrap' }}>{dept.efficiencyDelta}</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#f8fafc' }}>{dept.name}</h2>
            <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>
              VP Gouverneur : <strong style={{ color: '#f8fafc' }}>{dept.vpName}</strong> · Squad : {dept.squadName} ·{' '}
              {dept.aiRatio} · <span style={{ whiteSpace: 'nowrap' }}>Module {dept.monthlyPrice}&nbsp;€/mois</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              onClick={onToggleInterior}
              style={{
                background: insideThisStudio ? 'rgba(239, 68, 68, 0.18)' : 'rgba(56, 189, 248, 0.18)',
                color: insideThisStudio ? '#fca5a5' : '#7dd3fc',
                border: `1px solid ${insideThisStudio ? 'rgba(239,68,68,0.45)' : 'rgba(56,189,248,0.45)'}`,
                borderRadius: 9,
                padding: '8px 13px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {insideThisStudio ? '🚪 Sortir du Studio 3D' : '🏢 Visiter Studio 3D'}
            </button>
            <button
              onClick={onOpenDesktop}
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#0f172a',
                border: 'none',
                borderRadius: 9,
                padding: '8px 13px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Ouvrir Web Desktop [2] →
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 9,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ✕ Fermer [Échap]
            </button>
          </div>
        </div>

        {/* 3-COLUMN WORKSPACE BODY */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 1.15fr 0.95fr',
            gap: 16,
            padding: 20,
            overflowY: 'auto',
          }}
        >
          {/* COLUMN 1 — AGENTS & LIVE INTERACTIVE TERMINAL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', letterSpacing: 1 }}>
              1 · SQUAD HOLONS & TERMINAL PTY LIVE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dept.streams.map((st) => {
                const pending = Boolean(st.needsHuman && !resolvedNeedsIds.includes(st.id));
                const active = selectedStream?.id === st.id;
                return (
                  <div
                    key={st.id}
                    onClick={() => setSelectedAgentId(st.id)}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      cursor: 'pointer',
                      background: active ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${pending ? '#f59e0b' : active ? dept.color : 'rgba(255,255,255,0.09)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{st.agentName}</div>
                      <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 2 }}>{st.task}</div>
                    </div>
                    {pending ? (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onResolveNeed(st.id);
                        }}
                        style={{
                          background: '#f59e0b',
                          color: '#0f172a',
                          border: 'none',
                          borderRadius: 8,
                          padding: '7px 12px',
                          fontSize: 11.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Approuver S0 ✓
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: '#34d399', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {st.statusLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Interactive Live Terminal */}
            <div
              className="font-mono-tech"
              style={{
                background: '#020617',
                border: '1px solid rgba(94, 234, 212, 0.25)',
                borderRadius: 12,
                padding: 12,
                fontSize: 11,
                lineHeight: 1.55,
                color: '#5eead4',
                minHeight: 140,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div>
                {termLines.map((line, i) => (
                  <div key={i} style={{ color: line.startsWith('S0@') ? '#fde68a' : line.startsWith('✓') ? '#4ade80' : '#5eead4' }}>
                    {line}
                  </div>
                ))}
              </div>
              <form onSubmit={sendDirective} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  value={orderText}
                  onChange={(e) => setOrderText(e.target.value)}
                  placeholder={`Ordre direct à ${selectedStream?.agentName.split('//')[0].trim() ?? 'Agent'}...`}
                  style={{
                    flex: 1,
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid rgba(255,255,255,0.16)',
                    borderRadius: 7,
                    padding: '6px 10px',
                    fontSize: 11.5,
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: dept.color,
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: 7,
                    padding: '6px 12px',
                    fontWeight: 800,
                    fontSize: 11.5,
                    cursor: 'pointer',
                  }}
                >
                  Exécuter
                </button>
              </form>
            </div>
          </div>

          {/* COLUMN 2 — INTERACTIVE KANBAN BOARD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#5eead4', letterSpacing: 1 }}>
              2 · KANBAN OPÉRATIONNEL INTERACTIF (CLIQUER POUR AVANCER)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, flex: 1 }}>
              {(['À Traiter', 'En Exécution IA', 'Validé R10 ✓'] as const).map((colTitle, colIdx) => (
                <div
                  key={colTitle}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: colIdx === 2 ? '#34d399' : '#94a3b8' }}>
                    {colTitle}
                  </div>
                  {cards
                    .filter((c) => c.col === colIdx)
                    .map((card) => (
                      <div
                        key={card.id}
                        style={{
                          padding: 9,
                          borderRadius: 9,
                          background: '#172033',
                          border: `1px solid ${colIdx === 2 ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        }}
                      >
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#f8fafc', lineHeight: 1.35 }}>
                          {card.title}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 7,
                            fontSize: 10,
                            color: '#94a3b8',
                          }}
                        >
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.owner} · {card.metric}</span>
                          {colIdx < 2 && (
                            <button
                              onClick={() => advanceCard(card.id)}
                              style={{
                                background: 'rgba(245,158,11,0.2)',
                                color: '#fde047',
                                border: '1px solid rgba(245,158,11,0.45)',
                                borderRadius: 5,
                                padding: '2px 6px',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 3 — EXPLOITABLE DOMAIN SURFACE (/appSlug) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', letterSpacing: 0.7, whiteSpace: 'nowrap' }}>
              3 · SURFACE MÉTIER (/{dept.appSlug.toUpperCase()})
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                flex: 1,
              }}
            >
              {dept.id === 'rd' ? (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#93c5fd' }}>
                    Pipeline CI/CD Forge & Portails 3D Mario-64
                  </div>
                  <div className="font-mono-tech" style={{ fontSize: 11, color: '#4ade80' }}>
                    ✓ Vite 6.4.5 + Three.js + N8AO Vert · 412 Tests Pass
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                    Lancer directement un des 3 Mondes Enfants 3D :
                  </div>
                  {PORTAL_GAMES.map((pg) => (
                    <button
                      key={pg.id}
                      onClick={() => {
                        solarpunkAudio.playChime(true);
                        onEnterPortal(pg.id);
                      }}
                      style={{
                        textAlign: 'left',
                        background: 'rgba(59, 130, 246, 0.14)',
                        border: `1px solid ${pg.accent}`,
                        color: '#f8fafc',
                        borderRadius: 10,
                        padding: '9px 11px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: pg.accent }}>{pg.title} →</div>
                      <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>{pg.subtitle}</div>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fde68a' }}>
                    Gouvernance & Reçus Cryptographiques R10 ({sealCount})
                  </div>
                  <div style={{ fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                    Chaque action exécutée dans <strong>{dept.name}</strong> émet un reçu immuable sous bail
                    Concordia (TTL 300s) relié à la Trésorerie Souveraine d’Aspace Marketplace.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {MARKETPLACE_BLUEPRINTS.slice(0, 2).map((bp) => (
                      <div
                        key={bp.id}
                        style={{
                          padding: '8px 10px',
                          background: '#0f172a',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.08)',
                          fontSize: 11,
                        }}
                      >
                        <strong style={{ color: bp.accentColor }}>{bp.title}</strong> · {bp.escrowThreshold}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      solarpunkAudio.playGoldenGong();
                      setSealCount((n) => n + 1);
                      onNotify(`Preuve R10 CANARY_RECEIPT #${sealCount + 1} scellée sur /${dept.appSlug}`);
                    }}
                    style={{
                      marginTop: 'auto',
                      background: `linear-gradient(135deg, ${dept.color}, #f59e0b)`,
                      color: '#0f172a',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontWeight: 800,
                      fontSize: 12.5,
                      cursor: 'pointer',
                    }}
                  >
                    🔐 Sceller Reçu R10 (/aspace.{dept.appSlug})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
