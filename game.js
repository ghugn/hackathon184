/* ============================================
   HOTFIX: THE GAME — Infinite Stage Engine
   ============================================
   Features:
   - Procedural level generation (infinite stages)
   - AI player analytics & adaptive difficulty
   - Winnability verification (BFS pathfinding)
   - Camera scrolling for large levels
   - Loading screen with compilation animation
   ============================================ */

// ═══════════════════════════════════════════════
// SECTION 1: CONSTANTS
// ═══════════════════════════════════════════════
const GRAVITY = 0.65;
const PLAYER_SPEED = 4.5;
const PLAYER_ACCEL = 0.6;
const PLAYER_DECEL = 0.4;
const JUMP_FORCE = -13;
const DASH_SPEED = 18;
const DASH_DURATION = 8;
const DASH_COOLDOWN = 40;
const MAX_FALL_SPEED = 14;
const PATH_RECORD_INTERVAL = 3;
const COYOTE_TIME = 6;
const JUMP_BUFFER = 8;

// Physics reach (for winnability check)
const MAX_JUMP_H = 220;
const MAX_DASH_H = 340;
const MAX_JUMP_V = 118;

const COLORS = {
    bg: '#0d1117',
    gridLine: 'rgba(0, 229, 255, 0.03)',
    gridLineMajor: 'rgba(0, 229, 255, 0.06)',
    platform: '#21262d',
    platformBorder: '#30363d',
    platformTop: '#58a6ff',
    player: '#ffffff',
    playerGlow: '#00e5ff',
    playerDash: '#bf40ff',
    goal: '#39ff14',
    goalGlow: 'rgba(57, 255, 20, 0.3)',
    bugBlock: '#ff073a',
    bugGlow: 'rgba(255, 7, 58, 0.4)',
    laser: '#bf40ff',
    laserGlow: 'rgba(191, 64, 255, 0.4)',
    spike: '#ffa657',
    spikeGlow: 'rgba(255, 166, 87, 0.4)',
    pathTrail: 'rgba(0, 229, 255, 0.08)',
    deathZone: '#ff073a',
    lineNumbers: 'rgba(139, 148, 158, 0.3)',
    startZone: '#007acc',
    minimap: 'rgba(0, 229, 255, 0.3)',
    minimapPlayer: '#00e5ff',
    minimapGoal: '#39ff14',
};

// ═══════════════════════════════════════════════
// SECTION 2: DOM ELEMENTS
// ═══════════════════════════════════════════════
const $ = id => document.getElementById(id);
const titleScreen = $('title-screen');
const gameScreen = $('game-screen');
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');
const consoleOutput = $('console-output');
const deathOverlay = $('death-overlay');
const winOverlay = $('win-overlay');
const loadingOverlay = $('loading-overlay');
const loadingTerminal = $('loading-terminal');
const loadingBar = $('loading-bar');
const loadingStatus = $('loading-status');
const loadingStageNum = $('loading-stage-num');
const startBtn = $('start-btn');
const hudStage = $('hud-stage');
const hudRun = $('hud-run');
const hudVersion = $('hud-version');
const hudTimer = $('hud-timer');
const hudPatches = $('hud-patches');
const hudBest = $('hud-best');
const deathMessage = $('death-message');
const deathScore = $('death-score');
const winTime = $('win-time');
const winMessage = $('win-message');
const statusLine = $('status-line');
const statusCol = $('status-col');
const playerNameInput = $('player-name');
const leaderboardBtn = $('leaderboard-btn');
const leaderboardOverlay = $('leaderboard-overlay');
const lbEntries = $('lb-entries');
const lbCloseBtn = $('lb-close');
const lbClearBtn = $('lb-clear');

// ═══════════════════════════════════════════════
// SECTION 3: GAME STATE
// ═══════════════════════════════════════════════
let gameState = 'title'; // title | playing | dead | won | loading
let currentStage = 0;
let stageRunNumber = 0;     // runs within current stage
let totalRunNumber = 0;     // total runs across all stages
let bestTime = Infinity;
let runStartTime = 0;
let currentTime = 0;
let frameCount = 0;
let levelWidth = 0;
let timeLimit = 0;
let isTimeTrial = false;    // whether current stage has a time limit
let playerName = 'anonymous';
let maxDistanceThisRun = 0; // track furthest X reached in current stage

// ═══════════════════════════════════════════════
// SECTION 4: INPUT
// ═══════════════════════════════════════════════
const keys = {};
let jumpBufferCounter = 0;

// ═══════════════════════════════════════════════
// SECTION 5: CAMERA
// ═══════════════════════════════════════════════
const camera = { x: 0, y: 0 };

function updateCamera() {
    const targetX = player.x - canvas.width * 0.3;
    camera.x += (targetX - camera.x) * 0.08;
    camera.x = Math.max(0, Math.min(levelWidth - canvas.width, camera.x));
    // Y camera: only adjust if level has negative-Y platforms
    // For now keep y=0
    camera.y = 0;
}

// ═══════════════════════════════════════════════
// SECTION 6: PLAYER
// ═══════════════════════════════════════════════
const player = {
    x: 0, y: 0, vx: 0, vy: 0,
    width: 16, height: 20,
    onGround: false, coyoteCounter: 0,
    dashTimer: 0, dashCooldown: 0,
    dashDirX: 0, facingRight: true,
    trail: [],
};

let spawnPoint = { x: 80, y: 0 };

// ═══════════════════════════════════════════════
// SECTION 7: LEVEL DATA
// ═══════════════════════════════════════════════
let platforms = [];
let goal = { x: 0, y: 0, w: 40, h: 50 };
let aiObstacles = [];

// ═══════════════════════════════════════════════
// SECTION 8: AI ANALYTICS
// ═══════════════════════════════════════════════
let currentPath = [];
let previousPaths = [];

const analytics = {
    totalRuns: 0,
    stagesCompleted: 0,
    totalJumps: 0,
    totalDashes: 0,
    avgCompletionTime: 0,
    // Per-stage tracking (reset each stage)
    stageJumps: 0,
    stageDashes: 0,
    stageDeaths: 0,
    heightSamples: [],    // Y positions sampled
    speedSamples: [],     // |vx| sampled
};

function analyzePlayerTendency() {
    const r = analytics.totalRuns || 1;
    const jumpRate = analytics.totalJumps / r;
    const dashRate = analytics.totalDashes / r;

    const avgH = analytics.heightSamples.length > 0
        ? analytics.heightSamples.reduce((a, b) => a + b, 0) / analytics.heightSamples.length
        : 0.5;
    const avgS = analytics.speedSamples.length > 0
        ? analytics.speedSamples.reduce((a, b) => a + b, 0) / analytics.speedSamples.length
        : 0.5;

    // Normalize to 0-1
    const heightPref = Math.min(1, avgH); // 0=high, 1=low
    const speedPref = Math.min(1, avgS / PLAYER_SPEED); // 0=slow, 1=fast
    const jumpPref = Math.min(1, jumpRate / 3); // 0=rarely jumps, 1=jumps a lot
    const dashPref = Math.min(1, dashRate / 2);

    let tendency = '';
    if (dashPref > 0.6) tendency = 'Heavy dasher. Likes speed exploits.';
    else if (jumpPref > 0.6) tendency = 'Vertical climber. Seeks high routes.';
    else if (speedPref > 0.6) tendency = 'Speedrunner. Prefers direct paths.';
    else if (heightPref < 0.3) tendency = 'Risk-taker. Favors elevated routes.';
    else tendency = 'Balanced player. Adapting countermeasures...';

    return { heightPref, speedPref, jumpPref, dashPref, tendency };
}

// ═══════════════════════════════════════════════
// SECTION 9: PROCEDURAL LEVEL GENERATOR
// ═══════════════════════════════════════════════
// Check if a stage is a Time Trial stage
// Pattern: every 4th stage starting from stage 3 (3, 7, 11, 15, ...)
function checkTimeTrial(stageNum) {
    return stageNum >= 3 && (stageNum - 3) % 4 === 0;
}

function getDifficultyParams(stageNum) {
    const tend = analyzePlayerTendency();
    const timeTrial = checkTimeTrial(stageNum);

    // Use a smooth logarithmic curve so early stages are much easier
    // t goes from 0 (stage 1) to ~1 (stage 30+)
    const t = Math.min(1, Math.log(stageNum) / Math.log(35));

    // === Lerp helper: smoothly transition from easy → hard ===
    const lerp = (easy, hard) => easy + (hard - easy) * t;

    let numPlatforms   = Math.round(lerp(5, 24));
    let minPlatW       = Math.round(lerp(180, 45));
    let maxPlatW       = Math.round(lerp(280, 90));
    let minGapX        = Math.round(lerp(30, 140));
    let maxGapX        = Math.round(lerp(70, 250));
    let maxHeightStep  = Math.round(lerp(20, 105));

    // Time Trial stages: slightly easier layout, strict time
    // Normal stages: no time limit (0 = infinite)
    let tl = 0;
    if (timeTrial) {
        // Easier layout for time trial
        numPlatforms = Math.max(4, numPlatforms - 2);
        minPlatW = Math.round(minPlatW * 1.2);
        maxPlatW = Math.round(maxPlatW * 1.15);
        minGapX = Math.round(minGapX * 0.85);
        maxGapX = Math.round(maxGapX * 0.85);
        maxHeightStep = Math.round(maxHeightStep * 0.8);

        // Time limit: starts generous, gets tighter
        // Stage 3 → 45s, Stage 7 → 35s, Stage 11 → 28s, Stage 15 → 23s, ...
        const trialIndex = Math.floor((stageNum - 3) / 4); // 0, 1, 2, 3, ...
        tl = Math.max(15, 45 - trialIndex * 4);
    }

    // AI counter-strategies only kick in after stage 5
    if (stageNum > 5 && analytics.totalRuns > 3) {
        if (tend.dashPref > 0.5) {
            minPlatW = Math.max(35, minPlatW - 10);
            maxPlatW = Math.max(65, maxPlatW - 15);
        }
        if (tend.speedPref > 0.5) {
            numPlatforms += 1;
        }
        if (tend.jumpPref > 0.5) {
            maxGapX = Math.min(280, maxGapX + 15);
        }
        if (tend.heightPref < 0.35) {
            maxHeightStep = Math.min(110, maxHeightStep + 8);
        }
    }

    return { numPlatforms, minPlatW, maxPlatW, minGapX, maxGapX, maxHeightStep, timeLimit: tl, timeTrial, tendency: tend };
}

function generateLevel(stageNum) {
    const ch = canvas.height;
    const params = getDifficultyParams(stageNum);
    const tend = params.tendency;
    const plats = [];

    // === Spawn platform (always generous) ===
    const spawnW = Math.max(140, params.maxPlatW);
    const spawnPlat = { x: 30, y: ch - 50, w: spawnW, h: 20, type: 'solid', role: 'spawn' };
    plats.push(spawnPlat);

    let lastX = spawnPlat.x + spawnPlat.w;
    let lastY = spawnPlat.y;

    // Height bias based on AI counter-strategy (only at higher stages)
    let heightBias = 0;
    if (stageNum > 5 && analytics.totalRuns > 3) {
        if (tend.heightPref < 0.4) heightBias = 0.2;
        else if (tend.heightPref > 0.7) heightBias = -0.2;
    }

    // === Generate main platform chain ===
    for (let i = 1; i < params.numPlatforms; i++) {
        const progress = i / params.numPlatforms;

        // Gap: add some randomness but keep within bounds
        const gapX = params.minGapX + Math.random() * (params.maxGapX - params.minGapX);

        // Platform width: occasionally grant a wider "rest" platform
        let platW = params.minPlatW + Math.random() * (params.maxPlatW - params.minPlatW);
        if (i % 4 === 0 && stageNum <= 10) {
            platW = Math.max(platW, params.maxPlatW * 0.9); // safe rest platform
        }

        // Height change: keep gentle in early stages
        let heightChange = (Math.random() - 0.45 + heightBias) * params.maxHeightStep;

        // Early stages: strongly limit upward movement to keep things flat
        if (stageNum <= 3) {
            heightChange *= 0.5;
        }

        // For the last few platforms, trend upward for a dramatic finish
        if (progress > 0.75) {
            heightChange = -Math.abs(heightChange) * 0.6;
        }

        const newX = lastX + gapX;
        let newY = lastY + heightChange;

        // Clamp Y generously
        newY = Math.max(80, Math.min(ch - 65, newY));

        // Ensure the vertical gap is actually reachable (conservative check)
        const vDiff = Math.abs(newY - lastY);
        if (vDiff > MAX_JUMP_V * 0.85) {
            // Too steep — flatten it
            newY = lastY + Math.sign(newY - lastY) * MAX_JUMP_V * 0.6;
            newY = Math.max(80, Math.min(ch - 65, newY));
        }

        let role = 'main';
        if (i === params.numPlatforms - 1) role = 'goal';

        plats.push({
            x: Math.round(newX),
            y: Math.round(newY),
            w: Math.round(platW),
            h: 20,
            type: 'solid',
            role: role,
        });

        lastX = newX + platW;
        lastY = newY;
    }

    // === Shortcut bridges (start appearing at stage 3+) ===
    if (stageNum >= 3) {
        const shortcutCount = Math.min(Math.floor((stageNum - 2) / 2), 4) + 1;
        for (let s = 0; s < shortcutCount; s++) {
            const i = 1 + Math.floor(Math.random() * Math.max(1, plats.length - 3));
            const j = Math.min(plats.length - 1, i + 2 + Math.floor(Math.random() * 2));
            if (j >= plats.length) continue;

            const midX = (plats[i].x + plats[i].w + plats[j].x) / 2;
            const midY = Math.min(plats[i].y, plats[j].y) - 15 - Math.random() * 30;
            if (midY < 60 || midY > ch - 60) continue;

            const shortW = params.minPlatW * 0.8 + Math.random() * 30;

            const overlaps = plats.some(p =>
                Math.abs(p.x + p.w / 2 - midX) < (p.w + shortW) / 2 + 20 &&
                Math.abs(p.y - midY) < 40
            );
            if (overlaps) continue;

            plats.push({
                x: Math.round(midX - shortW / 2),
                y: Math.round(midY),
                w: Math.round(shortW),
                h: 16,
                type: 'solid',
                role: 'shortcut',
            });
        }
    }

    // === Floor recovery sections (more in early stages) ===
    const floorY = ch - 40;
    const numFloors = stageNum <= 3 ? 4 : stageNum <= 8 ? 3 : Math.max(1, 3 - Math.floor(stageNum / 6));
    const totalWidth = lastX + 100;

    for (let f = 0; f < numFloors; f++) {
        const fx = 180 + (f / numFloors) * (totalWidth - 350);
        const fw = stageNum <= 3 ? (120 + Math.random() * 140) : (80 + Math.random() * 100);

        const overlaps = plats.some(p =>
            p.y >= floorY - 10 && Math.abs(p.x + p.w / 2 - (fx + fw / 2)) < (p.w + fw) / 2 + 20
        );
        if (overlaps) continue;

        plats.push({
            x: Math.round(fx),
            y: floorY,
            w: Math.round(fw),
            h: 30,
            type: 'solid',
            role: 'floor',
        });
    }

    // === Goal ===
    const goalPlat = plats.find(p => p.role === 'goal') || plats[plats.length - 1];
    const goalObj = {
        x: goalPlat.x + goalPlat.w / 2 - 20,
        y: goalPlat.y - 50,
        w: 40,
        h: 50
    };

    // === Spawn ===
    const sp = { x: spawnPlat.x + 40, y: spawnPlat.y - player.height - 2 };

    // === Level width ===
    const lw = Math.max(canvas.width, lastX + 150);

    // === Time limit ===
    // If time trial: base time + bonus per level width
    // If normal: 0 (no limit)
    let tl = params.timeLimit;
    if (params.timeTrial) {
        tl += Math.floor(lw / 400); // bonus seconds for wider levels
    }

    return { platforms: plats, goal: goalObj, spawn: sp, levelWidth: lw, timeLimit: tl, timeTrial: params.timeTrial, params };
}

// ═══════════════════════════════════════════════
// SECTION 10: WINNABILITY CHECKER (BFS)
// ═══════════════════════════════════════════════
function canReach(from, to) {
    // Can player on platform 'from' reach platform 'to'?
    const fRight = from.x + from.w;
    const tRight = to.x + to.w;

    // Horizontal gap
    let hGap;
    if (to.x > fRight) hGap = to.x - fRight;
    else if (from.x > tRight) hGap = from.x - tRight;
    else hGap = 0; // overlapping horizontally

    // Vertical difference (positive = target is higher UP on screen = lower Y value)
    const vDiff = from.y - to.y;

    if (vDiff >= 0) {
        // Target is above: need to jump up
        if (vDiff > MAX_JUMP_V) return false;
        return hGap <= MAX_DASH_H;
    } else {
        // Target is below: can fall
        return hGap <= MAX_DASH_H;
    }
}

function verifyWinnable(plats, goalObj) {
    // Find the goal platform (platform under the goal)
    let goalPlatIdx = -1;
    for (let i = 0; i < plats.length; i++) {
        const p = plats[i];
        if (goalObj.x + goalObj.w / 2 >= p.x && goalObj.x + goalObj.w / 2 <= p.x + p.w &&
            Math.abs(goalObj.y + goalObj.h - p.y) < 10) {
            goalPlatIdx = i;
            break;
        }
    }
    if (goalPlatIdx === -1) goalPlatIdx = plats.length - 1;

    // BFS from platform 0 (spawn) to goalPlatIdx
    const visited = new Set([0]);
    const queue = [0];
    let iterations = 0;

    while (queue.length > 0) {
        const curr = queue.shift();
        iterations++;
        if (curr === goalPlatIdx) return { winnable: true, iterations };

        for (let next = 0; next < plats.length; next++) {
            if (visited.has(next)) continue;
            if (canReach(plats[curr], plats[next])) {
                visited.add(next);
                queue.push(next);
            }
        }
    }

    return { winnable: false, iterations };
}

function generateAndVerifyStage(stageNum) {
    let attempts = 0;
    let result, check;

    while (attempts < 30) {
        result = generateLevel(stageNum);
        check = verifyWinnable(result.platforms, result.goal);

        if (check.winnable) {
            return { ...result, iterations: check.iterations, attempts: attempts + 1 };
        }
        attempts++;
    }

    // Fallback: generate a simple guaranteed-winnable level
    const ch = canvas.height;
    const simplePlats = [];
    let sx = 30;
    for (let i = 0; i < 8; i++) {
        simplePlats.push({
            x: sx, y: ch - 50 - i * 30, w: 140, h: 20,
            type: 'solid', role: i === 0 ? 'spawn' : i === 7 ? 'goal' : 'main'
        });
        sx += 160;
    }
    const gp = simplePlats[7];
    return {
        platforms: simplePlats,
        goal: { x: gp.x + gp.w / 2 - 20, y: gp.y - 50, w: 40, h: 50 },
        spawn: { x: 70, y: ch - 50 - player.height - 2 },
        levelWidth: sx + 100,
        timeLimit: 45,
        iterations: 0,
        attempts: 31,
        params: getDifficultyParams(stageNum),
    };
}

// ═══════════════════════════════════════════════
// SECTION 11: AI OBSTACLE PLACEMENT
// ═══════════════════════════════════════════════
function placeAIObstacles() {
    if (previousPaths.length === 0) return;

    const lastPath = previousPaths[previousPaths.length - 1];
    if (!lastPath || lastPath.length < 10) return;

    const maxNew = Math.min(2 + Math.floor(currentStage / 2), 8);

    // Find fastest segments
    const segments = [];
    const segSize = Math.max(5, Math.floor(lastPath.length / 15));

    for (let i = 0; i < lastPath.length - segSize; i += Math.floor(segSize / 2)) {
        const start = lastPath[i];
        const end = lastPath[Math.min(i + segSize, lastPath.length - 1)];
        const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        const time = end.t - start.t;
        if (time > 0) {
            segments.push({
                speed: dist / time,
                midX: (start.x + end.x) / 2,
                midY: (start.y + end.y) / 2,
            });
        }
    }

    segments.sort((a, b) => b.speed - a.speed);

    // Heatmap from all previous paths
    const grid = 50;
    const heat = {};
    for (const path of previousPaths) {
        for (const pt of path) {
            const k = `${Math.floor(pt.x / grid)},${Math.floor(pt.y / grid)}`;
            heat[k] = (heat[k] || 0) + 1;
        }
    }

    const hotspots = Object.entries(heat)
        .map(([k, c]) => {
            const [gx, gy] = k.split(',').map(Number);
            return { x: gx * grid + grid / 2, y: gy * grid + grid / 2, count: c };
        })
        .sort((a, b) => b.count - a.count);

    let placed = 0;

    const tryPlace = (px, py) => {
        if (px < spawnPoint.x + 60) return false;
        if (Math.abs(px - goal.x) < 80 && Math.abs(py - goal.y) < 80) return false;
        if (py > canvas.height - 10 || py < 20) return false;
        if (aiObstacles.some(o => Math.abs(o.x + o.w / 2 - px) < 45 && Math.abs(o.y + o.h / 2 - py) < 45)) return false;
        return true;
    };

    // Snap to platform surface
    const snapToPlat = (px, py) => {
        for (const p of platforms) {
            if (px >= p.x && px <= p.x + p.w && Math.abs(py - p.y) < 60) {
                return p.y;
            }
        }
        return py;
    };

    // Place from fast segments
    for (let i = 0; i < segments.length && placed < maxNew; i++) {
        const s = segments[i];
        if (!tryPlace(s.midX, s.midY)) continue;

        const sy = snapToPlat(s.midX, s.midY);
        const types = ['bug', 'laser', 'spike'];
        const type = types[placed % 3]; // rotate types

        let obs;
        if (type === 'bug') obs = { x: s.midX - 15, y: sy - 30, w: 30, h: 30, type: 'bug', phase: Math.random() * 6.28 };
        else if (type === 'laser') obs = { x: s.midX - 3, y: sy - 90, w: 6, h: 90, type: 'laser', phase: Math.random() * 6.28 };
        else obs = { x: s.midX - 12, y: sy - 16, w: 24, h: 16, type: 'spike', phase: Math.random() * 6.28 };

        aiObstacles.push(obs);
        placed++;

        const names = { bug: '🐛 Bug Block', laser: '⚡ Laser Wall', spike: '▲ Spike' };
        logConsole(`[HOTFIX]: Deploying ${names[type]} at (${Math.round(obs.x)}, ${Math.round(obs.y)})`, 'patch');
    }

    // Fill from hotspots
    for (let i = 0; i < hotspots.length && placed < maxNew; i++) {
        const h = hotspots[i];
        if (!tryPlace(h.x, h.y)) continue;
        const sy = snapToPlat(h.x, h.y);
        const type = Math.random() < 0.5 ? 'bug' : 'spike';
        const obs = type === 'bug'
            ? { x: h.x - 15, y: sy - 30, w: 30, h: 30, type: 'bug', phase: Math.random() * 6.28 }
            : { x: h.x - 12, y: sy - 16, w: 24, h: 16, type: 'spike', phase: Math.random() * 6.28 };
        aiObstacles.push(obs);
        placed++;
    }

    if (placed > 0) {
        logConsole(`[SYSTEM]: Shortcut detected. Applying Hotfix...`, 'warning');
        logConsole(`[AI]: ${placed} new patch(es) deployed.`, 'ai');
        for (let i = aiObstacles.length - placed; i < aiObstacles.length; i++) {
            const o = aiObstacles[i];
            spawnExplosion(o.x + o.w / 2, o.y + o.h / 2, COLORS.bugBlock, 8);
        }
    }
}

// ═══════════════════════════════════════════════
// SECTION 12: PARTICLES
// ═══════════════════════════════════════════════
let particles = [];

function spawnParticle(x, y, vx, vy, color, life = 30, size = 2) {
    particles.push({ x, y, vx, vy, color, life, maxLife: life, size });
}

function spawnExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const sp = 2 + Math.random() * 3;
        spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, color, 25 + Math.random() * 15, 2 + Math.random() * 2);
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.vx *= 0.98;
        if (--p.life <= 0) particles.splice(i, 1);
    }
}

// ═══════════════════════════════════════════════
// SECTION 13: CONSOLE LOGGER
// ═══════════════════════════════════════════════
function logConsole(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    entry.innerHTML = `<span class="log-timestamp">[${ts}]</span> ${message}`;
    consoleOutput.appendChild(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    while (consoleOutput.children.length > 120) consoleOutput.removeChild(consoleOutput.firstChild);
}

function formatTime(ms) {
    const s = ms / 1000;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const mil = Math.floor(ms % 1000);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(mil).padStart(3, '0')}`;
}

// ═══════════════════════════════════════════════
// SECTION 14: LOADING SCREEN
// ═══════════════════════════════════════════════
function showLoadingScreen(stageNum, callback) {
    gameState = 'loading';
    deathOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
    loadingOverlay.classList.remove('hidden');
    loadingTerminal.innerHTML = '';
    loadingBar.style.width = '0%';
    loadingStatus.textContent = 'Initializing...';

    // Generate the level immediately
    const result = generateAndVerifyStage(stageNum);
    const tendency = analyzePlayerTendency();
    const isTT = result.timeTrial;

    loadingStageNum.textContent = String(stageNum).padStart(3, '0') + (isTT ? ' ⏱' : '');

    // Build message sequence
    const messages = [
        { t: 0, text: `$ gcc -O2 stage_${String(stageNum).padStart(3, '0')}.js`, cls: 'lt-info' },
        { t: 400, text: `[COMPILER]: Building stage_${String(stageNum).padStart(3, '0')}.js...`, cls: 'lt-system', pct: 10 },
        { t: 800, text: `[AI]: Loading player profile (${analytics.totalRuns} runs analyzed)...`, cls: 'lt-ai', pct: 20 },
        { t: 1200, text: `[AI]: Analyzing movement patterns...`, cls: 'lt-ai', pct: 35 },
        { t: 1600, text: `[AI]: Player tendency → ${tendency.tendency}`, cls: 'lt-warning', pct: 45 },
        { t: 2000, text: `[AI]: Generating ${result.platforms.length} platform nodes...`, cls: 'lt-ai', pct: 55 },
        { t: 2300, text: `[LINKER]: Linking platform_graph.o...`, cls: 'lt-system', pct: 65 },
        { t: 2600, text: `[AI]: Applying ${aiObstacles.length} cached hotfixes...`, cls: 'lt-ai', pct: 72 },
        { t: 2900, text: `[TESTER]: Running winnability simulation...`, cls: 'lt-system', pct: 82 },
        { t: 3200, text: `[TESTER]: ✓ Path verified (${result.iterations} iterations, ${result.attempts} attempt${result.attempts > 1 ? 's' : ''})`, cls: 'lt-success', pct: 92 },
        { t: 3600, text: `[SYSTEM]: Build successful. Deploying stage ${stageNum}...`, cls: 'lt-success', pct: 100 },
    ];

    // Time Trial warning
    if (isTT) {
        messages.splice(5, 0, {
            t: 1800,
            text: `[WATCHDOG]: ⏱ TIME TRIAL ENABLED — ${result.timeLimit}s kill timer active!`,
            cls: 'lt-error',
            pct: 50
        });
    }

    // Add stage-specific flavor
    if (stageNum > 5) {
        messages.splice(isTT ? 7 : 6, 0, {
            t: 2150,
            text: `[AI]: Difficulty scaling: ${Math.min(100, Math.floor((stageNum / 30) * 100))}%`,
            cls: 'lt-warning',
            pct: 60
        });
    }

    // Play messages with timing
    let msgIdx = 0;
    const startMs = performance.now();

    function tick() {
        if (gameState !== 'loading') return;
        const elapsed = performance.now() - startMs;

        while (msgIdx < messages.length && elapsed >= messages[msgIdx].t) {
            const msg = messages[msgIdx];
            const el = document.createElement('div');
            el.className = `lt-entry ${msg.cls}`;
            el.textContent = msg.text;
            loadingTerminal.appendChild(el);
            loadingTerminal.scrollTop = loadingTerminal.scrollHeight;
            if (msg.pct !== undefined) {
                loadingBar.style.width = msg.pct + '%';
            }
            msgIdx++;
        }

        if (msgIdx >= messages.length) {
            // All messages shown, wait a beat then start
            loadingStatus.textContent = 'Deploying...';
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                callback(result);
            }, 500);
            return;
        }

        loadingStatus.textContent = msgIdx < 5 ? 'Compiling...' : msgIdx < 8 ? 'Linking...' : 'Testing...';
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

// ═══════════════════════════════════════════════
// SECTION 15: PLAYER PHYSICS
// ═══════════════════════════════════════════════
function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function updatePlayer() {
    if (gameState !== 'playing') return;

    // ── Horizontal ──
    let inputX = 0;
    if (keys['a'] || keys['arrowleft']) inputX -= 1;
    if (keys['d'] || keys['arrowright']) inputX += 1;

    if (player.dashTimer > 0) {
        player.vx = player.dashDirX * DASH_SPEED;
        player.vy = 0;
        player.dashTimer--;
        if (frameCount % 2 === 0) {
            spawnParticle(
                player.x + player.width / 2 + (Math.random() - 0.5) * 10,
                player.y + player.height / 2 + (Math.random() - 0.5) * 10,
                -player.dashDirX * 2 + (Math.random() - 0.5),
                (Math.random() - 0.5) * 2,
                COLORS.playerDash, 15, 3
            );
        }
    } else {
        if (inputX !== 0) {
            player.vx += inputX * PLAYER_ACCEL;
            player.vx = Math.max(-PLAYER_SPEED, Math.min(PLAYER_SPEED, player.vx));
            player.facingRight = inputX > 0;
        } else {
            if (Math.abs(player.vx) < PLAYER_DECEL) player.vx = 0;
            else player.vx -= Math.sign(player.vx) * PLAYER_DECEL;
        }
    }

    // ── Coyote ──
    if (player.onGround) player.coyoteCounter = COYOTE_TIME;
    else player.coyoteCounter--;

    // ── Jump ──
    if (jumpBufferCounter > 0) {
        jumpBufferCounter--;
        if (player.coyoteCounter > 0) {
            player.vy = JUMP_FORCE;
            player.onGround = false;
            player.coyoteCounter = 0;
            jumpBufferCounter = 0;
            analytics.stageJumps++;
            analytics.totalJumps++;
            for (let i = 0; i < 6; i++) {
                spawnParticle(
                    player.x + player.width / 2 + (Math.random() - 0.5) * 14,
                    player.y + player.height, (Math.random() - 0.5) * 3,
                    -Math.random() * 2, COLORS.playerGlow, 15, 2
                );
            }
        }
    }

    // Variable jump height
    if (keys['w'] !== true && keys[' '] !== true && keys['Space'] !== true) {
        if (player.vy < -3) player.vy *= 0.85;
    }

    // ── Dash ──
    if ((keys['shift'] || keys['ShiftLeft'] || keys['ShiftRight']) && player.dashCooldown <= 0 && player.dashTimer <= 0) {
        player.dashTimer = DASH_DURATION;
        player.dashCooldown = DASH_COOLDOWN;
        player.dashDirX = inputX !== 0 ? inputX : (player.facingRight ? 1 : -1);
        player.vy = 0;
        analytics.stageDashes++;
        analytics.totalDashes++;
        spawnExplosion(player.x + player.width / 2, player.y + player.height / 2, COLORS.playerDash, 10);
    }
    if (player.dashCooldown > 0) player.dashCooldown--;

    // ── Gravity ──
    if (player.dashTimer <= 0) {
        player.vy += GRAVITY;
        if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
    }

    // ── Move X + collide ──
    player.x += player.vx;
    for (const p of platforms) {
        if (aabb(player.x, player.y, player.width, player.height, p.x, p.y, p.w, p.h)) {
            if (player.vx > 0) player.x = p.x - player.width;
            else if (player.vx < 0) player.x = p.x + p.w;
            player.vx = 0;
        }
    }

    // ── Move Y + collide ──
    player.y += player.vy;
    player.onGround = false;
    for (const p of platforms) {
        if (aabb(player.x, player.y, player.width, player.height, p.x, p.y, p.w, p.h)) {
            if (player.vy > 0) { player.y = p.y - player.height; player.vy = 0; player.onGround = true; }
            else if (player.vy < 0) { player.y = p.y + p.h; player.vy = 0; }
        }
    }

    // ── Trail / particles ──
    if (frameCount % 2 === 0) {
        player.trail.push({ x: player.x + player.width / 2, y: player.y + player.height / 2, a: 1 });
        if (player.trail.length > 20) player.trail.shift();
    }
    if (player.onGround && Math.abs(player.vx) > 2 && frameCount % 4 === 0) {
        spawnParticle(player.x + player.width / 2 + (Math.random() - 0.5) * 8,
            player.y + player.height, -player.vx * 0.1 + (Math.random() - 0.5),
            -Math.random() * 1.5, COLORS.playerGlow, 12, 1.5);
    }

    // ── Record path ──
    if (frameCount % PATH_RECORD_INTERVAL === 0) {
        currentPath.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            t: performance.now() - runStartTime
        });
        // Analytics sampling
        analytics.heightSamples.push(player.y / canvas.height);
        analytics.speedSamples.push(Math.abs(player.vx));
        // Keep samples bounded
        if (analytics.heightSamples.length > 500) analytics.heightSamples.shift();
        if (analytics.speedSamples.length > 500) analytics.speedSamples.shift();
    }

    // ── Obstacle collision ──
    for (const obs of aiObstacles) {
        if (aabb(player.x + 2, player.y + 2, player.width - 4, player.height - 4, obs.x, obs.y, obs.w, obs.h)) {
            playerDeath(obs.type);
            return;
        }
    }

    // ── Goal collision ──
    if (aabb(player.x, player.y, player.width, player.height, goal.x, goal.y, goal.w, goal.h)) {
        playerWin();
        return;
    }

    // ── Fell off map ──
    if (player.y > canvas.height + 60) { playerDeath('void'); return; }

    // ── Boundaries ──
    if (player.x < 0) { player.x = 0; player.vx = 0; }
    if (player.x + player.width > levelWidth) { player.x = levelWidth - player.width; player.vx = 0; }

    // ── Timer ──
    currentTime = performance.now() - runStartTime;
    hudTimer.textContent = formatTime(currentTime);
    statusLine.textContent = Math.round(player.y);
    statusCol.textContent = Math.round(player.x);

    // Track max distance for leaderboard
    if (player.x > maxDistanceThisRun) maxDistanceThisRun = player.x;

    if (isTimeTrial && timeLimit > 0 && currentTime / 1000 > timeLimit) playerDeath('timeout');
}

// ═══════════════════════════════════════════════
// SECTION 16: DEATH & WIN
// ═══════════════════════════════════════════════
function playerDeath(cause) {
    gameState = 'dead';
    analytics.stageDeaths++;
    analytics.totalRuns++;

    if (currentPath.length > 10) {
        previousPaths.push([...currentPath]);
        if (previousPaths.length > 5) previousPaths.shift();
    }

    spawnExplosion(player.x + player.width / 2, player.y + player.height / 2, COLORS.deathZone, 20);
    deathOverlay.classList.remove('hidden');

    const msgs = {
        bug: 'Caught by a Bug patch. Exception thrown.',
        laser: 'Terminated by Laser firewall. Access denied.',
        spike: 'Impaled on Spike assertion. Stack trace lost.',
        void: 'Segmentation fault. Player fell out of scope.',
        timeout: `Process timed out after ${timeLimit}s. Killed by watchdog.`
    };
    deathMessage.textContent = msgs[cause] || 'Process terminated unexpectedly.';

    // Show current score on death screen
    const distPct = getDistancePercent();
    const score = calculateScore(currentStage, distPct);
    deathScore.textContent = `Stage ${currentStage} · Distance ${distPct}% · Score: ${score}`;

    logConsole(`[ERROR]: ${msgs[cause] || 'Unknown error'}`, 'error');
    logConsole(`[SYSTEM]: Stage ${currentStage} | Run #${stageRunNumber} failed. ${formatTime(currentTime)}`, 'system');
}

function playerWin() {
    gameState = 'won';
    analytics.totalRuns++;
    analytics.stagesCompleted++;

    if (currentPath.length > 10) {
        previousPaths.push([...currentPath]);
        if (previousPaths.length > 5) previousPaths.shift();
    }

    if (currentTime < bestTime) {
        bestTime = currentTime;
        hudBest.textContent = formatTime(bestTime);
        logConsole(`[SYSTEM]: ★ NEW BEST: ${formatTime(bestTime)}`, 'success');
    }

    if (analytics.stagesCompleted > 1 && analytics.avgCompletionTime > 0) {
        analytics.avgCompletionTime = (analytics.avgCompletionTime + currentTime) / 2;
    } else {
        analytics.avgCompletionTime = currentTime;
    }

    spawnExplosion(goal.x + goal.w / 2, goal.y + goal.h / 2, COLORS.goal, 25);
    winOverlay.classList.remove('hidden');
    winTime.textContent = formatTime(currentTime);
    winMessage.textContent = `Stage ${currentStage} cleared! AI preparing next build...`;

    logConsole(`[SYSTEM]: ✓ STAGE ${currentStage} CLEARED in ${formatTime(currentTime)}`, 'success');
    logConsole(`[AI]: Route logged. Difficulty escalating...`, 'warning');
}

// ═══════════════════════════════════════════════
// SECTION 17: GAME STATE TRANSITIONS
// ═══════════════════════════════════════════════
function startGame() {
    if (gameState !== 'title') return;

    // Capture player name
    playerName = (playerNameInput.value.trim() || 'anonymous').substring(0, 16);
    localStorage.setItem('hotfix_player_name', playerName);

    titleScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    resizeCanvas();

    logConsole('[SYSTEM]: Initializing runtime environment...', 'system');
    logConsole('[AI]: Monitoring module active. Watching for exploits...', 'ai');
    logConsole('─'.repeat(40), 'info');

    currentStage = 0;
    totalRunNumber = 0;
    bestTime = Infinity;
    previousPaths = [];
    aiObstacles = [];

    // Reset analytics
    analytics.totalRuns = 0;
    analytics.stagesCompleted = 0;
    analytics.totalJumps = 0;
    analytics.totalDashes = 0;
    analytics.heightSamples = [];
    analytics.speedSamples = [];

    advanceToNextStage();
}

function advanceToNextStage() {
    currentStage++;
    stageRunNumber = 0;

    // For stage 1, skip loading anim (instant start)
    if (currentStage === 1) {
        const result = generateAndVerifyStage(1);
        applyStageResult(result);
        startRun();
    } else {
        showLoadingScreen(currentStage, (result) => {
            applyStageResult(result);
            startRun();
        });
    }
}

function applyStageResult(result) {
    platforms = result.platforms;
    goal = result.goal;
    spawnPoint = result.spawn;
    levelWidth = result.levelWidth;
    timeLimit = result.timeLimit;
    isTimeTrial = result.timeTrial || false;
    aiObstacles = [];
}

function startRun() {
    stageRunNumber++;
    totalRunNumber++;
    gameState = 'playing';

    // Reset player
    player.x = spawnPoint.x;
    player.y = spawnPoint.y;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.coyoteCounter = 0;
    player.dashTimer = 0;
    player.dashCooldown = 0;
    player.facingRight = true;
    player.trail = [];

    // Reset per-run
    currentPath = [];
    frameCount = 0;
    runStartTime = performance.now();
    particles = [];
    maxDistanceThisRun = spawnPoint.x;

    // Place AI obstacles if we have data
    if (previousPaths.length > 0 && stageRunNumber > 1) {
        placeAIObstacles();
    }

    // Update HUD
    hudStage.textContent = String(currentStage).padStart(3, '0');
    hudRun.textContent = `#${String(stageRunNumber).padStart(3, '0')}`;
    hudVersion.textContent = `v${currentStage}.${stageRunNumber}.0`;
    hudPatches.textContent = String(aiObstacles.length);

    // Time trial badge
    if (isTimeTrial) {
        hudStage.textContent = String(currentStage).padStart(3, '0') + ' ⏱';
    }

    const tlText = isTimeTrial ? `Time limit: ${timeLimit}s` : 'No time limit';
    logConsole(`[SYSTEM]: === STAGE ${currentStage}${isTimeTrial ? ' [TIME TRIAL]' : ''} | RUN #${stageRunNumber} ===`, 'system');
    logConsole(`[SYSTEM]: Build v${currentStage}.${stageRunNumber}.0 | ${tlText}`, 'system');
    if (isTimeTrial) {
        logConsole(`[WARNING]: ⏱ TIME TRIAL — Complete in ${timeLimit}s or process will be killed!`, 'warning');
    }
    if (aiObstacles.length > 0) {
        logConsole(`[AI]: ${aiObstacles.length} active patches deployed.`, 'ai');
    }
}

function handleRespawn() {
    deathOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');

    if (gameState === 'won') {
        // Advance to next stage
        advanceToNextStage();
    } else if (gameState === 'dead') {
        // Retry current stage
        startRun();
    }
}

function quitAndSave() {
    // Save score to leaderboard and return to title
    const distPct = getDistancePercent();
    const score = calculateScore(currentStage, distPct);
    saveScore(playerName, currentStage, distPct, score);

    logConsole(`[SYSTEM]: Score saved → ${playerName}: Stage ${currentStage}, ${distPct}%, Score ${score}`, 'success');

    // Return to title screen
    gameState = 'title';
    deathOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
    gameScreen.classList.add('hidden');
    titleScreen.classList.remove('hidden');
}

// ═══════════════════════════════════════════════
// SECTION 17b: LEADERBOARD SYSTEM
// ═══════════════════════════════════════════════
const LB_KEY = 'hotfix_leaderboard';
const LB_MAX = 20;

function getDistancePercent() {
    if (levelWidth <= 0) return 0;
    const dist = Math.max(maxDistanceThisRun, player.x);
    return Math.min(100, Math.round((dist / levelWidth) * 100));
}

function calculateScore(stage, distPct) {
    // Score = stage * 1000 + distance percentage * 10
    // Stage 5 at 50% = 5500, Stage 10 at 100% = 11000
    return stage * 1000 + Math.round(distPct * 10);
}

function loadLeaderboard() {
    try {
        const data = localStorage.getItem(LB_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveScore(name, stage, distPct, score) {
    const lb = loadLeaderboard();
    lb.push({
        name: name || 'anonymous',
        stage,
        dist: distPct,
        score,
        time: Date.now()
    });
    // Sort by score descending
    lb.sort((a, b) => b.score - a.score);
    // Keep top entries
    while (lb.length > LB_MAX) lb.pop();
    try {
        localStorage.setItem(LB_KEY, JSON.stringify(lb));
    } catch { /* ignore quota errors */ }
}

function clearLeaderboard() {
    localStorage.removeItem(LB_KEY);
    renderLeaderboard();
}

function renderLeaderboard() {
    const lb = loadLeaderboard();
    lbEntries.innerHTML = '';

    if (lb.length === 0) {
        lbEntries.innerHTML = '<div class="lb-empty">No scores recorded yet. Go break some builds!</div>';
        return;
    }

    lb.forEach((entry, i) => {
        const row = document.createElement('div');
        let cls = 'lb-entry';
        if (i === 0) cls += ' lb-gold';
        else if (i === 1) cls += ' lb-silver';
        else if (i === 2) cls += ' lb-bronze';
        // Highlight if it's the current player's name
        if (entry.name === playerName && playerName !== 'anonymous') cls += ' lb-self';
        row.className = cls;

        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
        row.innerHTML = `
            <span class="lb-rank">${medal}</span>
            <span class="lb-name">${escapeHtml(entry.name)}</span>
            <span class="lb-stage">${entry.stage}</span>
            <span class="lb-dist">${entry.dist}%</span>
            <span class="lb-score-val">${entry.score.toLocaleString()}</span>
        `;
        lbEntries.appendChild(row);
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showLeaderboard() {
    renderLeaderboard();
    leaderboardOverlay.classList.remove('hidden');
}

function hideLeaderboard() {
    leaderboardOverlay.classList.add('hidden');
}

function drawBackground() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Batch grid lines for performance
    const gridSize = 40;
    const offsetX = camera.x % gridSize;

    ctx.lineWidth = 1;
    // Minor grid
    ctx.strokeStyle = COLORS.gridLine;
    ctx.beginPath();
    for (let x = -offsetX; x < canvas.width; x += gridSize) {
        const worldX = x + camera.x;
        if (Math.round(worldX) % (gridSize * 5) >= 2) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
        }
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        if (y % (gridSize * 5) !== 0) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
    }
    ctx.stroke();

    // Major grid
    ctx.strokeStyle = COLORS.gridLineMajor;
    ctx.beginPath();
    for (let x = -offsetX; x < canvas.width; x += gridSize) {
        const worldX = x + camera.x;
        if (Math.round(worldX) % (gridSize * 5) < 2) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
        }
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        if (y % (gridSize * 5) === 0) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
    }
    ctx.stroke();

    // Line numbers
    ctx.fillStyle = COLORS.lineNumbers;
    ctx.font = '10px "Fira Code", monospace';
    ctx.textAlign = 'right';
    for (let y = gridSize; y < canvas.height; y += gridSize) {
        ctx.fillText(String(Math.floor(y / gridSize)), 25, y + 3);
    }
    ctx.textAlign = 'left';
}

function drawPlatforms() {
    ctx.font = '9px "Fira Code", monospace';
    for (const p of platforms) {
        const sx = p.x - camera.x;
        const sy = p.y;
        if (sx + p.w < -20 || sx > canvas.width + 20) continue;

        ctx.fillStyle = COLORS.platform;
        ctx.fillRect(sx, sy, p.w, p.h);
        ctx.strokeStyle = COLORS.platformBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 0.5, sy + 0.5, p.w - 1, p.h - 1);

        let topColor = COLORS.platformTop;
        if (p.role === 'shortcut') topColor = '#7ee787';
        else if (p.role === 'floor') topColor = '#484f58';
        ctx.fillStyle = topColor;
        ctx.fillRect(sx, sy, p.w, 2);

        ctx.fillStyle = 'rgba(88, 166, 255, 0.12)';
        const label = p.role === 'shortcut' ? '// shortcut' : p.role === 'floor' ? '// floor' : `plat_${platforms.indexOf(p)}`;
        ctx.fillText(label, sx + 5, sy + p.h / 2 + 3);
    }
}

function drawGoal() {
    const sx = goal.x - camera.x;
    const pulse = Math.sin(frameCount * 0.08) * 0.3 + 0.7;

    // Glow aura (no shadow)
    ctx.globalAlpha = 0.15 * pulse;
    ctx.fillStyle = COLORS.goal;
    ctx.fillRect(sx - 8, goal.y - 8, goal.w + 16, goal.h + 16);
    ctx.globalAlpha = 0.25 * pulse;
    ctx.fillRect(sx - 4, goal.y - 4, goal.w + 8, goal.h + 8);

    // Main body
    ctx.globalAlpha = 0.3 + pulse * 0.4;
    ctx.fillStyle = COLORS.goal;
    ctx.fillRect(sx, goal.y, goal.w, goal.h);
    ctx.globalAlpha = 1;

    // Label
    ctx.fillStyle = COLORS.goal;
    ctx.font = 'bold 10px "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('COMMIT', sx + goal.w / 2, goal.y - 8);
    ctx.fillText('{ }', sx + goal.w / 2, goal.y - 20);

    if (frameCount % 12 === 0) {
        spawnParticle(goal.x + Math.random() * goal.w, goal.y + goal.h,
            (Math.random() - 0.5) * 0.5, -0.5 - Math.random() * 1.5, COLORS.goal, 30, 2);
    }
}

function drawObstacles() {
    for (const obs of aiObstacles) {
        const sx = obs.x - camera.x;
        if (sx + obs.w < -20 || sx > canvas.width + 20) continue;

        const pulse = Math.sin(frameCount * 0.1 + obs.phase) * 0.2 + 0.8;

        if (obs.type === 'bug') {
            // Glow aura
            ctx.globalAlpha = 0.15 * pulse;
            ctx.fillStyle = COLORS.bugBlock;
            ctx.fillRect(sx - 4, obs.y - 4, obs.w + 8, obs.h + 8);
            // Main
            ctx.globalAlpha = 0.8 + pulse * 0.2;
            ctx.fillRect(sx, obs.y, obs.w, obs.h);
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px "Fira Code", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('BUG', sx + obs.w / 2, obs.y + obs.h / 2 + 3);
        } else if (obs.type === 'laser') {
            // Glow aura
            ctx.globalAlpha = 0.12 * pulse;
            ctx.fillStyle = COLORS.laser;
            ctx.fillRect(sx - 6, obs.y, obs.w + 12, obs.h);
            // Main beam
            ctx.globalAlpha = 0.6 + pulse * 0.4;
            ctx.fillRect(sx, obs.y, obs.w, obs.h);
            // Inner white core
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.5 * pulse;
            ctx.fillRect(sx + 1, obs.y, obs.w - 2, obs.h);
            // Scanner line
            const scanY = obs.y + ((frameCount * 2 + obs.phase * 50) % obs.h);
            ctx.globalAlpha = 0.9;
            ctx.fillRect(sx - 2, scanY, obs.w + 4, 2);
        } else if (obs.type === 'spike') {
            // Glow aura
            ctx.globalAlpha = 0.12 * pulse;
            ctx.fillStyle = COLORS.spike;
            ctx.fillRect(sx - 4, obs.y - 4, obs.w + 8, obs.h + 8);
            // Spike triangle
            ctx.globalAlpha = 0.8 + pulse * 0.2;
            const cx = sx + obs.w / 2;
            ctx.beginPath();
            ctx.moveTo(cx, obs.y);
            ctx.lineTo(sx + obs.w, obs.y + obs.h);
            ctx.lineTo(sx, obs.y + obs.h);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.globalAlpha = 0.7;
            ctx.font = 'bold 8px "Fira Code", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('!', cx, obs.y + obs.h - 3);
        }
        ctx.globalAlpha = 1;
    }
}

function drawPreviousPath() {
    if (previousPaths.length === 0) return;
    const path = previousPaths[previousPaths.length - 1];
    ctx.strokeStyle = COLORS.pathTrail;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
        const sx = path[i].x - camera.x;
        if (i === 0) ctx.moveTo(sx, path[i].y);
        else ctx.lineTo(sx, path[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawPlayer() {
    if (gameState === 'dead') return;
    const sx = player.x - camera.x;
    const glow = player.dashTimer > 0 ? COLORS.playerDash : COLORS.playerGlow;

    // Trail (lightweight)
    for (let i = 0; i < player.trail.length; i++) {
        const t = player.trail[i];
        ctx.globalAlpha = (i / player.trail.length) * 0.25;
        ctx.fillStyle = glow;
        ctx.fillRect(t.x - camera.x - 4, t.y - 5, 8, 10);
    }
    ctx.globalAlpha = 1;

    // Glow aura (replaces expensive shadow)
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 4, player.y - 4, player.width + 8, player.height + 8);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(sx - 2, player.y - 2, player.width + 4, player.height + 4);
    ctx.globalAlpha = 1;

    // Outer body (colored)
    ctx.fillStyle = glow;
    ctx.fillRect(sx, player.y, player.width, player.height);
    // Inner body (white)
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(sx + 3, player.y + 3, player.width - 6, player.height - 6);

    // Eyes
    const eyeY = player.y + 7;
    ctx.fillStyle = glow;
    if (player.facingRight) {
        ctx.fillRect(sx + 8, eyeY, 3, 3);
        ctx.fillRect(sx + 12, eyeY, 3, 3);
    } else {
        ctx.fillRect(sx + 1, eyeY, 3, 3);
        ctx.fillRect(sx + 5, eyeY, 3, 3);
    }

    // Dash cooldown bar
    if (player.dashCooldown > 0) {
        const prog = 1 - (player.dashCooldown / DASH_COOLDOWN);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.fillRect(sx, player.y + player.height + 3, player.width * prog, 2);
    } else {
        ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
        ctx.fillRect(sx, player.y + player.height + 3, player.width, 2);
    }
}

function drawParticles() {
    // No shadows on particles — just colored rects
    for (const p of particles) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - camera.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

function drawSpawnMarker() {
    const sx = spawnPoint.x - 20 - camera.x;
    ctx.globalAlpha = 0.3 + Math.sin(frameCount * 0.05) * 0.1;
    ctx.fillStyle = COLORS.startZone;
    ctx.fillRect(sx, platforms[0].y - 35, 50, 35);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.startZone;
    ctx.font = '9px "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SPAWN', sx + 25, platforms[0].y - 40);
    ctx.textAlign = 'left';
}

function drawTimeLimitBar() {
    if (gameState !== 'playing') return;

    // Only show countdown bar on Time Trial stages
    if (!isTimeTrial || timeLimit <= 0) return;

    const progress = Math.min(currentTime / (timeLimit * 1000), 1);
    const bw = canvas.width - 60;
    const bx = 30;
    const by = 14;

    // Background bar
    ctx.fillStyle = 'rgba(48, 54, 61, 0.5)';
    ctx.fillRect(bx, by, bw, 4);

    // Progress color
    let color;
    if (progress < 0.5) color = COLORS.playerGlow;
    else if (progress < 0.8) color = COLORS.spike;
    else color = COLORS.bugBlock;

    ctx.fillStyle = color;
    ctx.fillRect(bx, by, bw * progress, 4);

    // Bright tip
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(bx + bw * progress - 1, by, 2, 4);
    ctx.globalAlpha = 1;

    // Remaining seconds label
    const remaining = Math.max(0, timeLimit - currentTime / 1000);
    ctx.font = '10px "Fira Code", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = progress > 0.8 ? COLORS.bugBlock : COLORS.playerGlow;
    ctx.fillText(`${remaining.toFixed(1)}s`, bx + bw, by - 3);

    // TIME TRIAL badge (pulses when low time)
    ctx.textAlign = 'left';
    ctx.fillStyle = progress > 0.8 ? COLORS.bugBlock : COLORS.spike;
    if (progress > 0.8) {
        ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.3) * 0.5;
    }
    ctx.fillText('⏱ TIME TRIAL', bx, by - 3);
    ctx.globalAlpha = 1;
}

function drawMinimap() {
    if (levelWidth <= canvas.width) return;

    const mmW = 200;
    const mmH = 16;
    const mmX = canvas.width - mmW - 10;
    const mmY = canvas.height - mmH - 8;
    const scale = mmW / levelWidth;

    ctx.fillStyle = 'rgba(13, 17, 23, 0.8)';
    ctx.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
    ctx.strokeStyle = COLORS.platformBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);

    ctx.fillStyle = COLORS.minimap;
    for (const p of platforms) {
        const px = mmX + p.x * scale;
        const pw = Math.max(2, p.w * scale);
        ctx.fillRect(px, mmY + 4, pw, 3);
    }

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX + camera.x * scale, mmY, canvas.width * scale, mmH);

    // Player & Goal dots
    ctx.fillStyle = COLORS.minimapPlayer;
    ctx.fillRect(mmX + player.x * scale - 1, mmY + 3, 3, 5);
    ctx.fillStyle = COLORS.minimapGoal;
    ctx.fillRect(mmX + goal.x * scale - 1, mmY + 3, 3, 5);

    ctx.fillStyle = 'rgba(139, 148, 158, 0.5)';
    ctx.font = '8px "Fira Code", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('MAP', mmX - 6, mmY + 11);
    ctx.textAlign = 'left';
}

function drawStageIndicator() {
    if (currentTime < 2000 && gameState === 'playing') {
        const alpha = Math.max(0, 1 - currentTime / 2000);
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 28px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`STAGE ${currentStage}`, canvas.width / 2, canvas.height / 2 - 40);

        ctx.font = '14px "Fira Code", monospace';
        ctx.fillStyle = '#8b949e';
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillText(`${platforms.length} platforms | ${timeLimit}s limit`, canvas.width / 2, canvas.height / 2 - 10);
        ctx.globalAlpha = 1;
    }
}

// FPS counter for diagnostics
let fpsFrames = 0;
let fpsTime = performance.now();
let fpsDisplay = 60;

function drawFPS() {
    fpsFrames++;
    const now = performance.now();
    if (now - fpsTime >= 1000) {
        fpsDisplay = fpsFrames;
        fpsFrames = 0;
        fpsTime = now;
    }
    ctx.fillStyle = fpsDisplay < 30 ? '#ff073a' : fpsDisplay < 50 ? '#ffa657' : '#39ff14';
    ctx.globalAlpha = 0.6;
    ctx.font = '10px "Fira Code", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${fpsDisplay} FPS`, 35, 26);
    ctx.globalAlpha = 1;
}

function draw() {
    drawBackground();
    drawTimeLimitBar();
    drawPreviousPath();
    drawPlatforms();
    drawSpawnMarker();
    drawGoal();
    drawObstacles();
    drawPlayer();
    drawParticles();
    drawMinimap();
    drawStageIndicator();
    drawFPS();
}

function gameLoop() {
    frameCount++;

    if (gameState === 'playing') {
        updatePlayer();
        updateCamera();
        updateParticles();
    } else if (gameState === 'dead' || gameState === 'won') {
        updateParticles();
    }

    if (!gameScreen.classList.contains('hidden')) {
        draw();
    }

    requestAnimationFrame(gameLoop);
}

// ═══════════════════════════════════════════════
// SECTION 20: RESIZE & INIT
// ═══════════════════════════════════════════════
function resizeCanvas() {
    const area = $('game-area');
    if (!area) return;
    const rect = area.getBoundingClientRect();
    canvas.width = rect.width - 320;
    canvas.height = rect.height;
}

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Load saved player name
    const savedName = localStorage.getItem('hotfix_player_name');
    if (savedName) playerNameInput.value = savedName;

    window.addEventListener('keydown', e => {
        // Don't capture keys when typing in the name input
        if (document.activeElement === playerNameInput) return;

        keys[e.key.toLowerCase()] = true;
        keys[e.code] = true;

        if (e.key === 'Enter' && gameState === 'title') startGame();
        if ((e.key === 'r' || e.key === 'R') && (gameState === 'dead' || gameState === 'won')) handleRespawn();
        if ((e.key === 'q' || e.key === 'Q') && gameState === 'dead') quitAndSave();
        if ((e.key === 'w' || e.key === ' ') && gameState === 'playing') jumpBufferCounter = JUMP_BUFFER;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
        if (e.key === 'Escape') hideLeaderboard();
    });

    window.addEventListener('keyup', e => {
        keys[e.key.toLowerCase()] = false;
        keys[e.code] = false;
    });

    startBtn.addEventListener('click', startGame);
    leaderboardBtn.addEventListener('click', showLeaderboard);
    lbCloseBtn.addEventListener('click', hideLeaderboard);
    lbClearBtn.addEventListener('click', () => { if (confirm('Clear all scores?')) clearLeaderboard(); });

    requestAnimationFrame(gameLoop);
}

init();
