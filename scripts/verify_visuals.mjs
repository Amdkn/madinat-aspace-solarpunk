import { chromium } from 'playwright-core';
import path from 'path';

const OUT_DIR = 'C:\\Users\\amado\\.gemini\\antigravity\\brain\\48af65f7-47df-410c-b31b-84211472d0ef';
const URL = 'http://127.0.0.1:5194/';

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('response', (res) => {
  if (res.status() >= 400) errors.push(`HTTP ${res.status()} on ${res.url()}`);
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForFunction(() => Boolean(window.__madinatCtl && window.__madinatDebug && window.__madinatTelemetry), null, {
  timeout: 45000,
});
await page.waitForTimeout(1000);

// 0. Real Keyboard Walk -> Zero HUD Re-Render Proof (Bug #1 regression guard + auto-indexed collision check)
await page.evaluate(() => {
  window.__madinatDebug.teleport([0, 0.35, 118]);
});
await page.waitForTimeout(200);
const walkTelemetryBefore = await page.evaluate(() => ({
  pos: [...window.__madinatTelemetry.playerPos],
  hudRenders: window.__madinatTelemetry.hudRenderCount,
}));
await page.keyboard.down('KeyW');
await page.waitForTimeout(1100);
await page.keyboard.up('KeyW');
const walkTelemetryAfter = await page.evaluate(() => ({
  pos: [...window.__madinatTelemetry.playerPos],
  hudRenders: window.__madinatTelemetry.hudRenderCount,
}));
const walkDeltaDist = Math.hypot(
  walkTelemetryAfter.pos[0] - walkTelemetryBefore.pos[0],
  walkTelemetryAfter.pos[2] - walkTelemetryBefore.pos[2],
);
const hudRenderDelta = walkTelemetryAfter.hudRenders - walkTelemetryBefore.hudRenders;
if (walkDeltaDist < 2.0 || hudRenderDelta !== 0) {
  throw new Error('ZERO_HUD_RERENDER_REAL_WALK_FAIL: ' + JSON.stringify({ walkDeltaDist, hudRenderDelta }));
}
console.log('ZERO_HUD_RERENDER_REAL_WALK_PASS:', JSON.stringify({ walkDeltaDist, hudRenderDelta }));

const hudFit = await page.evaluate(() => {
  const btn = document.querySelector('button[title="Smartphone CEO [P]"]');
  return btn ? btn.getBoundingClientRect().right : 9999;
});
if (hudFit > 1436) {
  throw new Error('TOP_HUD_CLIPPING_FAIL: right=' + hudFit);
}
console.log('TOP_HUD_FIT_PASS: right=' + hudFit.toFixed(1));

// 1. CONTRACTUAL VIEW 1 — Human-eye inside Forge R&D Dedicated Studio (collapsed HUD pill + crisp 3D carpets + zero overlap!)
await page.evaluate(() => {
  window.__madinatCtl.enterBuilding('rd');
});
await page.waitForFunction(() => Boolean(window.__madinatInteriorDebug), null, { timeout: 15000 });
await page.waitForTimeout(1300);
await page.screenshot({ path: path.join(OUT_DIR, 'ref_1_forge_rd_interior_human_eye.png') });
console.log('CAPTURED_REF_1_INTERIOR');

// 1b. Side-3/4 Check proving typing devs' hands reach FORWARD onto keyboards
await page.evaluate(() => {
  window.__madinatInteriorDebug.setCameraView([-5.8, 1.55, 3.3], [-3.5, 0.85, 1.1]);
});
await page.waitForTimeout(450);
await page.screenshot({ path: path.join(OUT_DIR, 'ref_1b_dev_hands_check.png') });
await page.evaluate(() => window.__madinatInteriorDebug.clearCameraView());

// 1c & 2. Teleport next to desk, capture clean Command Deck (ref_2), then stack TERMINAL HOLON via [E] & prove single-layer Escape!
await page.evaluate(() => {
  window.__madinatInteriorDebug.teleport([-2.3, 0, 1.35]);
});
await page.waitForTimeout(350);
await page.evaluate(() => {
  window.__madinatCtl.openDept('rd');
});
await page.waitForSelector('text=BOOT KERNEL', { timeout: 6000 });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT_DIR, 'ref_2_forge_rd_workstation_console.png') });
console.log('CAPTURED_REF_2_CONSOLE');

// Open TERMINAL HOLON on top of active Command Deck (inspectWorkstation preserves activeDepartmentId)
await page.keyboard.press('KeyE');
await page.waitForSelector('text=TERMINAL HOLON', { timeout: 6000 });

// First Escape closes only TERMINAL HOLON while Command Deck + Studio stay open
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const escapeStateAfter1 = await page.evaluate(() => ({
  hasTerminal: document.body.innerText.includes('TERMINAL HOLON'),
  hasDeck: document.body.innerText.includes('BOOT KERNEL'),
  inStudio: Boolean(window.__madinatInteriorDebug),
}));
if (escapeStateAfter1.hasTerminal || !escapeStateAfter1.hasDeck || !escapeStateAfter1.inStudio) {
  throw new Error('ESCAPE_LAYER_1_FAIL: ' + JSON.stringify(escapeStateAfter1));
}
// Second Escape closes only Command Deck while Studio stays open
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const escapeStateAfter2 = await page.evaluate(() => ({
  hasDeck: document.body.innerText.includes('BOOT KERNEL'),
  inStudio: Boolean(window.__madinatInteriorDebug),
}));
if (escapeStateAfter2.hasDeck || !escapeStateAfter2.inStudio) {
  throw new Error('ESCAPE_LAYER_2_FAIL: ' + JSON.stringify(escapeStateAfter2));
}
console.log('INTERIOR_AGENT_SCREEN_E_ACCESS_AND_ESCAPE_PRIORITY_PASS');

// Coherence & Interior Physics Assertions: switch to 'support' studio -> verify roster + desk/plant/wall solids!
await page.evaluate(() => window.__madinatCtl.enterBuilding('support'));
await page.waitForFunction(
  () => Boolean(window.__madinatInteriorDebug && window.__madinatInteriorDebug.getRosterNames().includes('Copilote // Conciergerie VIP')),
  null,
  { timeout: 12000 },
);
const interiorTests = await page.evaluate(() => {
  const dbg = window.__madinatInteriorDebug;
  const roster = dbg.getRosterNames();
  const hasSupport = roster.some((n) => n.includes('Copilote')) && !roster.some((n) => n.includes('Kang') || n.includes('Banner'));
  dbg.teleport([-1.5, 0, 1.35]);
  const [dxDesk, dzDesk] = dbg.tryWalkTo(-3.9, 1.35);
  const deskDist = Math.hypot(dxDesk + 3.9, dzDesk - 1.35);

  dbg.teleport([-4.2, 0, -0.3]);
  const [dxPlant, dzPlant] = dbg.tryWalkTo(-6.1, -0.3);
  const plantDist = Math.hypot(dxPlant + 6.1, dzPlant + 0.3);

  dbg.teleport([0, 0, -4.0]);
  const [, wallZ] = dbg.tryWalkTo(0, -12.0);
  return { hasSupport, deskDist, plantDist, wallZ };
});
if (!interiorTests.hasSupport || interiorTests.deskDist < 0.9 || interiorTests.plantDist < 0.78 || interiorTests.wallZ < -7.0) {
  throw new Error('INTERIOR_COHERENCE_OR_COLLISION_FAIL: ' + JSON.stringify(interiorTests));
}
console.log('INTERIOR_COLLISION_AND_COHERENCE_PASS:', JSON.stringify(interiorTests));

// Exit back to Exterior City (auto spatial index builds cleanly via ensureSpatialIndex)
await page.evaluate(() => window.__madinatCtl.enterBuilding(null));
await page.waitForFunction(() => Boolean(window.__madinatDebug), null, { timeout: 15000 });
await page.waitForTimeout(900);

// 3. CONTRACTUAL VIEW 3 — Exterior Royal South Gate courtyard, Relocated Heliport eVTOL, Citizens & Clear Bridge Sightline
await page.evaluate(() => {
  window.__madinatDebug.clearCameraView();
  window.__madinatDebug.teleport([0, 0.35, 184]);
});
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT_DIR, 'ref_3_exterior_courtyard_and_gate.png') });
console.log('CAPTURED_REF_3_GATE');

// Exterior Physics Assertions: Parked Supercar, Olive Planter, Lagoon Water, Open South Bridge into Dome, Rotated Dome Pier, Ring 2 Partition Wall
const exteriorTests = await page.evaluate(() => {
  const dbg = window.__madinatDebug;
  dbg.teleport([1.5, 0.35, 179]);
  const [cx, cz] = dbg.tryWalkTo(5.6, 179);
  const carDist = Math.hypot(cx - 5.6, cz - 179);

  dbg.teleport([-5.0, 0.35, 172]);
  const [px, pz] = dbg.tryWalkTo(-9.5, 172);
  const planterDist = Math.hypot(px + 9.5, pz - 172);

  dbg.teleport([22, 0.35, 81]);
  const [lx, lz] = dbg.tryWalkTo(22, 55);
  const lagoonR = Math.hypot(lx, lz);

  dbg.teleport([0, 0.48, 42]);
  const [, archZ] = dbg.tryWalkTo(0, 24, 90);

  dbg.teleport([8.2, 0.485, 39]);
  const [pierX, pierZ] = dbg.tryWalkTo(6.55, 32.95, 60);
  const pierR = Math.hypot(pierX, pierZ);

  dbg.teleport([82.8, 0.35, -39]);
  const [rwX, rwZ] = dbg.tryWalkTo(82.8, -32, 60);
  const rwDist = Math.hypot(rwX - 82.8, rwZ + 34.3);

  return { carDist, planterDist, lagoonR, archZ, pierR, rwDist };
});
if (
  exteriorTests.carDist < 1.4 ||
  exteriorTests.planterDist < 2.8 ||
  exteriorTests.lagoonR < 75.5 ||
  exteriorTests.archZ > 26.0 ||
  exteriorTests.pierR < 35.8 ||
  exteriorTests.rwDist < 1.8
) {
  throw new Error('EXTERIOR_COLLISION_FAIL: ' + JSON.stringify(exteriorTests));
}
console.log('EXTERIOR_COLLISION_PASS:', JSON.stringify(exteriorTests));

// 3e. Spiral Staircase Side Headroom Block + Full Climb up to S0 Observatory (y >= 8.55m!)
const stairTest = await page.evaluate(() => {
  const dbg = window.__madinatDebug;
  // Walk sideways from ground floor into low ramp underside -> must block before clipping under stairs!
  dbg.teleport([-14.5, 0.485, 9.5]);
  const [blkX, blkZ, blkY] = dbg.tryWalkTo(-19.5, 11.2, 45);

  // Now walk from bottom opening of spiral ramp all the way around to S0 Sky-Bridge -> Observatory!
  const alpha = Math.PI / 16;
  const rMid = 21.4;
  // Walk all the way around spiral ramp from deg=118° to deg=382° (+22° open mouth landing @ [19.9, 8.1])
  dbg.teleport([Math.cos((118 * Math.PI) / 180 - alpha) * rMid, 0.485, Math.sin((118 * Math.PI) / 180 - alpha) * rMid]);
  let lastPos = dbg.getPos();
  for (let d = 128; d <= 382; d += 10) {
    const phi = (d * Math.PI) / 180 - alpha;
    lastPos = dbg.tryWalkTo(Math.cos(phi) * rMid, Math.sin(phi) * rMid, 35);
  }
  // Walk radially inward across Sky-Bridge to S0 Observatory deck (local [11.7, 5.4])
  const bx = 11.7 * Math.cos(alpha) + 5.4 * Math.sin(alpha);
  const bz = -11.7 * Math.sin(alpha) + 5.4 * Math.cos(alpha);
  const bridgeEnd = dbg.tryWalkTo(bx, bz, 75);
  return { blkDist: Math.hypot(blkX + 19.5, blkZ - 11.2), blkY, topAfterRamp: lastPos[2], finalY: bridgeEnd[2], finalPos: bridgeEnd };
});
if (stairTest.blkY > 1.2 || stairTest.finalY < 8.4) {
  throw new Error('STAIRCASE_CLIMB_FAIL: ' + JSON.stringify(stairTest));
}
console.log('STAIRCASE_CLIMB_TO_S0_PASS:', JSON.stringify(stairTest));
await page.waitForFunction(() => Boolean(window.__madinatHologramReady), null, { timeout: 10000 });
await page.evaluate(() => {
  window.__madinatDebug.teleport([4.2, 8.65, 4.6]);
  window.__madinatDebug.setCameraView([9.4, 11.5, 10.2], [0, 9.5, 1.5]);
});
await page.waitForTimeout(550);
await page.screenshot({ path: path.join(OUT_DIR, 'ref_3e_spiral_staircase_climb.png') });

// 3c & 3d. CEO Mission Control + 3D Carpet + [E] Screen Access + Camera Spring-Arm Anti-Wall-Occlusion Proof
await page.evaluate(() => {
  window.__madinatDebug.teleport([0.85, 0.485, -13.4]);
  window.__madinatDebug.setCameraView([2.6, 2.15, -7.2], [0, 1.8, -14.6]);
});
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT_DIR, 'ref_3c_dome_carpet_and_mission_control.png') });

await page.evaluate(() => {
  window.__madinatDebug.teleport([0.85, 0.485, -13.4]);
});
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForSelector('text=ÉCRAN SOUVERAIN 7D', { timeout: 6000 });
await page.keyboard.press('Escape');
console.log('CEO_SCREEN_E_ACCESS_PASS');

await page.evaluate(() => {
  window.__madinatDebug.setCamOrbit(Math.PI, 0.22, 7.5);
});
await page.waitForTimeout(450);
const camSpringPos = await page.evaluate(() => window.__madinatDebug.getCameraPos());
if (camSpringPos[2] < -16.6) {
  throw new Error('CAMERA_SPRINGARM_WALL_CLIP_FAIL: ' + JSON.stringify(camSpringPos));
}
console.log('CAMERA_SPRINGARM_ANTI_OCCLUSION_PASS:', JSON.stringify(camSpringPos));
await page.screenshot({ path: path.join(OUT_DIR, 'ref_3d_ceo_camera_springarm_proof.png') });

// Ring 2 Glass Wall Camera Spring-Arm Test: inside sector near r=85.8 ArchGlass wall -> camera MUST stay inside!
await page.evaluate(() => {
  window.__madinatDebug.teleport([87.5, 0.35, -18.0]);
  window.__madinatDebug.setCamOrbit(-Math.PI * 0.45, 0.18, 6.0);
});
await page.waitForTimeout(450);
const glassCamR = await page.evaluate(() => {
  const c = window.__madinatDebug.getCameraPos();
  return Math.hypot(c[0], c[2]);
});
if (glassCamR <= 85.9) {
  throw new Error('RING2_GLASS_SPRINGARM_FAIL: camR=' + glassCamR);
}
console.log('RING2_GLASS_SPRINGARM_PASS: camR=' + glassCamR.toFixed(2));

// 3b. Car Enter -> Drive -> Brake -> Door Exit Clearance E2E Test + Mouse Drag + [R] Reset
await page.evaluate(() => {
  window.__madinatDebug.clearCameraView();
  window.__madinatDebug.teleport([3.0, 0.35, 179]);
  window.__madinatDebug.enterVehicle('car-south');
});
await page.waitForTimeout(250);
await page.keyboard.down('ShiftLeft');
await page.keyboard.down('KeyW');
await page.keyboard.down('KeyA');
await page.waitForTimeout(1600);
await page.keyboard.up('KeyW');
await page.keyboard.up('KeyA');
await page.keyboard.up('ShiftLeft');
await page.keyboard.down('Space');
await page.waitForTimeout(200);
await page.keyboard.up('Space');
await page.keyboard.press('KeyE');
await page.waitForTimeout(350);

const carExitCheck = await page.evaluate(() => {
  const dbg = window.__madinatDebug;
  const loc = dbg.getLocomotion();
  const car = dbg.getVehicles().find((v) => v.id === 'car-south');
  const p = dbg.getPos();
  const carMovedDist = Math.hypot(car.position[0] - 5.6, car.position[2] - 179);
  const exitClearanceDist = Math.hypot(p[0] - car.position[0], p[2] - car.position[2]);
  return { loc, carMovedDist, exitClearanceDist, carPos: car.position, playerPos: p };
});
if (carExitCheck.loc !== 'onFoot' || carExitCheck.carMovedDist < 2.0 || carExitCheck.exitClearanceDist < 1.95) {
  throw new Error('CAR_DRIVE_OR_EXIT_FAIL: ' + JSON.stringify(carExitCheck));
}
console.log('CAR_DRIVE_AND_EXIT_CLEARANCE_PASS:', JSON.stringify(carExitCheck));
await page.screenshot({ path: path.join(OUT_DIR, 'ref_3b_car_exit_clearance.png') });

// Mouse Camera Orbit + [R] Reset
await page.keyboard.press('KeyR');
await page.waitForTimeout(300);
const yawBefore = await page.evaluate(() => window.__madinatDebug.getCamYaw());
await page.mouse.move(720, 450);
await page.mouse.down();
await page.mouse.move(980, 470, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(450);
const yawAfterDrag = await page.evaluate(() => window.__madinatDebug.getCamYaw());
await page.keyboard.press('KeyR');
await page.waitForTimeout(450);
const yawAfterReset = await page.evaluate(() => window.__madinatDebug.getCamYaw());
const dragDelta = Math.abs(Math.atan2(Math.sin(yawAfterDrag - yawBefore), Math.cos(yawAfterDrag - yawBefore)));
const resetDelta = Math.abs(Math.atan2(Math.sin(yawAfterReset - yawBefore), Math.cos(yawAfterReset - yawBefore)));
if (dragDelta < 0.08 || dragDelta > 1.2 || resetDelta > 0.35) {
  throw new Error('MOUSE_ORBIT_OR_RESET_FAIL: ' + JSON.stringify({ yawBefore, yawAfterDrag, yawAfterReset, dragDelta, resetDelta }));
}
console.log('CAMERA_ORBIT_AND_RESET_PASS:', JSON.stringify({ yawBefore, yawAfterDrag, yawAfterReset, dragDelta, resetDelta }));

// 3f. Autonomous Two-Way Right-Hand Boulevard Traffic Forward Alignment + Inter-Car Queueing Proof (60x timelapse forces real catch-up!)
await page.evaluate(() => {
  window.__madinatDebug.teleport([139, 0.35, 0]);
  window.__madinatCtl.setTimelapse(60);
});
await page.waitForTimeout(2600);
const trafficCheck = await page.evaluate(() => window.__madinatTrafficCheck?.());
if (
  !trafficCheck ||
  trafficCheck.count !== 14 ||
  trafficCheck.minDot < 0.999 ||
  trafficCheck.minSameLaneDist < 5.5 ||
  trafficCheck.minSameLaneDist >= 30.0
) {
  throw new Error('AUTONOMOUS_TRAFFIC_QUEUE_FAIL: ' + JSON.stringify(trafficCheck));
}
console.log(
  'AUTONOMOUS_TRAFFIC_FORWARD_AND_QUEUE_PASS:',
  JSON.stringify({
    count: trafficCheck.count,
    minDot: trafficCheck.minDot,
    minSameLaneDist: Number(trafficCheck.minSameLaneDist.toFixed(2)),
  }),
);
await page.evaluate(() => {
  window.__madinatCtl.setSunPreset('golden');
  window.__madinatDebug.teleport([146.5, 0.35, -18]);
  window.__madinatDebug.setCameraView([133.5, 4.4, -14], [135.0, 0.9, 14]);
});
await page.waitForTimeout(450);
await page.screenshot({ path: path.join(OUT_DIR, 'ref_3f_boulevard_two_way_traffic.png') });
console.log('CAPTURED_REF_3F_TRAFFIC');

// 4. CONTRACTUAL VIEW 4 — Aerial Solarpunk Bagdad x Apple Park Masterplan (Emerald Lagoon + Golden Hour)
await page.evaluate(() => {
  window.__madinatDebug.teleport([0, 0.35, 198]);
  window.__madinatDebug.setCameraView([0, 128, 228], [0, 8, 0]);
});
await page.waitForTimeout(850);
await page.screenshot({ path: path.join(OUT_DIR, 'ref_4_aerial_solarpunk_city.png') });
console.log('CAPTURED_REF_4_AERIAL');
console.log('ALL_PHYSICS_CAMERA_STAIR_SCREEN_E2E_PASSED');
console.log('VISUAL_CAPTURE_COMPLETE');
console.log('ERRORS_COUNT:', errors.length);
if (errors.length > 0) console.log(errors.join('\n'));
await browser.close();
if (errors.length > 0) process.exit(1);
