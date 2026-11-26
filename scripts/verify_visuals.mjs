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
await page.waitForFunction(() => Boolean(window.__madinatDebug), null, { timeout: 45000 });
await page.waitForTimeout(2400);
console.log('CAPTURE_1_AERIAL');

// 1. Aerial masterplan view of the whole Solarpunk City
await page.evaluate(() => {
  window.__madinatDebug.setCameraView([0, 138, 240], [0, 8, 0]);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT_DIR, 'verified_1_aerial_masterplan.png') });
console.log('CAPTURE_2_GATE');

// 2. Street-level 3rd person view inside the Royal South Gate looking straight North across Bridge -> Dome
await page.evaluate(() => {
  window.__madinatDebug.clearCameraView();
  window.__madinatDebug.teleport([0, 0.35, 184]);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT_DIR, 'verified_2_royal_gate_supercar.png') });
console.log('CAPTURE_3_DOME');

// 3. Inside Bayt al-Hikma Dome showing clean ceiling, CEO A0 Amadeus, fountain, gong & spiral staircase
await page.evaluate(() => {
  window.__madinatDebug.setCameraView([15, 4.4, 17], [0, 3.2, -10]);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT_DIR, 'verified_3_dome_bayt_interior.png') });
console.log('CAPTURE_4_PAVILION');

// 4. Inside Apple Park x Baghdad Forge R&D Pavilion (Ground level, looking at Agents + 3 Mario-64 Portal Paintings!)
await page.evaluate(() => {
  window.__madinatDebug.setCameraView([-107.5, 3.8, 6.5], [-90.5, 2.2, -1.2]);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT_DIR, 'verified_4_apple_ring_pavilion.png') });
console.log('CAPTURE_5_GLB');

// 5. Inspect original .GLB view mode 4 (wait deterministically for 42.5 MB GLB parse & mount)
await page.evaluate(() => {
  window.__madinatDebug.setMode('glbInspector');
});
await page.waitForFunction(() => Boolean(window.__madinatGlbLoaded), null, { timeout: 25000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT_DIR, 'verified_5_glb_inspector.png') });

console.log('VISUAL_CAPTURE_COMPLETE');
console.log('ERRORS_COUNT:', errors.length);
if (errors.length > 0) console.log(errors.join('\n'));
await browser.close();
if (errors.length > 0) process.exit(1);
