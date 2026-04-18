/* ============================================
   HOTFIX: THE GAME - Endless Stage Engine
   ============================================ */

// ============================================
// SECTION 1: CONSTANTS
// ============================================
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

const MAX_JUMP_H = 220;
const MAX_DASH_H = 340;
const MAX_JUMP_V = 118;

const CONSOLE_WIDTH = 320;
const STAGE_ALERT_DURATION = 1800;
const FLOOR_HEIGHT = 30;
const SAFE_FALLBACK_ARCHETYPE_ID = 'recovery-floor';
const ENCOURAGEMENT_LINES = [
    'Great effort!',
    'Good luck next time.',
    'Nice try, rerun incoming.',
    'You almost had it.',
    'Keep pushing, the AI is learning too.',
    'Another run, better route.',
];

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
    laser: '#bf40ff',
    spike: '#ffa657',
    pathTrail: 'rgba(0, 229, 255, 0.08)',
    deathZone: '#ff073a',
    lineNumbers: 'rgba(139, 148, 158, 0.3)',
    startZone: '#007acc',
    minimap: 'rgba(0, 229, 255, 0.3)',
    minimapPlayer: '#00e5ff',
    minimapGoal: '#39ff14',
};

// ============================================
// SECTION 2: DOM ELEMENTS
// ============================================
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
const stageAlert = $('stage-alert');
const stageAlertTitle = $('stage-alert-title');
const stageAlertSubtitle = $('stage-alert-subtitle');
const startBtn = $('start-btn');
const hudStage = $('hud-stage');
const hudRun = $('hud-run');
const hudVersion = $('hud-version');
const hudTimer = $('hud-timer');
const hudPatches = $('hud-patches');
const hudBest = $('hud-best');
const deathMessage = $('death-message');
const deathEncouragement = $('death-encouragement');
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

// ============================================
// SECTION 3: GAME STATE
// ============================================
let gameState = 'title'; // title | playing | dead | won | loading
let currentStage = 0;
let stageRunNumber = 0;
let totalRunNumber = 0;
let bestTime = Infinity;
let runStartTime = 0;
let currentTime = 0;
let frameCount = 0;
let levelWidth = 0;
let timeLimit = 0;
let isTimeTrial = false;
let playerName = 'anonymous';
let maxDistanceThisRun = 0;
let currentStageData = null;
let lastArchetypeId = null;
let lastEncouragementIndex = -1;

// ============================================
// SECTION 4: INPUT
// ============================================
const keys = {};
let jumpBufferCounter = 0;

// ============================================
// SECTION 5: CAMERA
// ============================================
const camera = { x: 0, y: 0 };

function updateCamera() {
    const targetX = player.x - canvas.width * 0.3;
    camera.x += (targetX - camera.x) * 0.08;
    camera.x = Math.max(0, Math.min(levelWidth - canvas.width, camera.x));
    camera.y = 0;
}

// ============================================
// SECTION 6: PLAYER
// ============================================
const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    width: 16,
    height: 20,
    onGround: false,
    coyoteCounter: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    facingRight: true,
    trail: [],
};

let spawnPoint = { x: 80, y: 0 };

// ============================================
// SECTION 7: LEVEL DATA
// ============================================
let platforms = [];
let goal = { x: 0, y: 0, w: 40, h: 50 };
let aiObstacles = [];

// ============================================
// SECTION 8: AI ANALYTICS
// ============================================
let currentPath = [];
let previousPaths = [];

function createAnalytics() {
    return {
        totalRuns: 0,
        stagesCompleted: 0,
        totalJumps: 0,
        totalDashes: 0,
        avgCompletionTime: 0,
        stageJumps: 0,
        stageDashes: 0,
        stageDeaths: 0,
        heightSamples: [],
        speedSamples: [],
    };
}

const analytics = createAnalytics();

function resetAnalytics() {
    Object.assign(analytics, createAnalytics());
}

function createAIProfile() {
    return {
        recentDeaths: [],
        hesitationZones: [],
        clearedStagePaths: [],
        shortcutUsage: 0,
    };
}

let aiProfile = createAIProfile();

function resetAIProfile() {
    aiProfile = createAIProfile();
    previousPaths = [];
    lastArchetypeId = null;
}

// ============================================
// SECTION 9: HELPERS
// ============================================
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createPlatform(x, y, w, role = 'main', routeLane = 'mid', h = 20) {
    return {
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h,
        type: 'solid',
        role,
        routeLane,
    };
}

function makeGoalFromPlatform(platform) {
    return {
        x: Math.round(platform.x + platform.w / 2 - 20),
        y: platform.y - 50,
        w: 40,
        h: 50,
    };
}

function makeSpawnFromPlatform(platform) {
    return {
        x: platform.x + 40,
        y: platform.y - player.height - 2,
    };
}

function makeSurfaceSlot(platform, align, lane, counterTags, threat, typeOptions, minStage = 1) {
    return {
        platform,
        align,
        lane,
        counterTags,
        threat,
        typeOptions,
        minStage,
    };
}

function finishStage(archetype, platformsList, spawnPlatform, goalPlatform, bugSlots) {
    const maxRight = Math.max(...platformsList.map(platform => platform.x + platform.w));
    return {
        archetypeId: archetype.id,
        archetypeName: archetype.name,
        archetypeDifficulty: archetype.difficulty,
        platforms: platformsList,
        spawnPlatform,
        goalPlatform,
        bugSlots,
        spawn: makeSpawnFromPlatform(spawnPlatform),
        goal: makeGoalFromPlatform(goalPlatform),
        levelWidth: Math.max(canvas.width, maxRight + 160),
        isTimeTrial: false,
        timeLimit: 0,
    };
}

function ratioToLane(ratio) {
    if (ratio > 0.68) return 'low';
    if (ratio > 0.42) return 'mid';
    return 'high';
}

function pickEncouragement() {
    if (ENCOURAGEMENT_LINES.length === 1) return ENCOURAGEMENT_LINES[0];

    let index = Math.floor(Math.random() * ENCOURAGEMENT_LINES.length);
    if (index === lastEncouragementIndex) {
        index = (index + 1) % ENCOURAGEMENT_LINES.length;
    }
    lastEncouragementIndex = index;
    return ENCOURAGEMENT_LINES[index];
}

function computeAIProfileSummary() {
    const clears = aiProfile.clearedStagePaths.length;
    if (clears === 0) {
        return {
            preferredLane: 'mid',
            jumpRate: 0,
            dashRate: 0,
            avgSpeed: 0,
            confidence: 0.2,
            shortcutUsage: 0,
            hesitationZones: [],
            clearedStages: 0,
            tendencyText: 'Fresh profile. Baseline counters only.',
        };
    }

    const laneScore = { low: 0, mid: 0, high: 0 };
    const jumpRates = [];
    const dashRates = [];
    const avgSpeeds = [];

    for (const pathSummary of aiProfile.clearedStagePaths) {
        laneScore[pathSummary.preferredLane] += 1;
        jumpRates.push(pathSummary.jumpRate);
        dashRates.push(pathSummary.dashRate);
        avgSpeeds.push(pathSummary.avgSpeed);
    }

    const preferredLane = Object.entries(laneScore).sort((a, b) => b[1] - a[1])[0][0];
    const jumpRate = average(jumpRates);
    const dashRate = average(dashRates);
    const avgSpeed = average(avgSpeeds);
    const hesitationZones = aiProfile.hesitationZones.slice(-8);
    const confidence = clamp(
        0.2 + clears * 0.12 + Math.min(aiProfile.shortcutUsage, 4) * 0.05 + Math.min(hesitationZones.length, 5) * 0.03,
        0.2,
        0.95
    );

    let tendencyText = 'Balanced runner. Mixed counters armed.';
    if (dashRate > 0.28) tendencyText = 'Aggressive dasher. Beam counters preferred.';
    else if (jumpRate > 0.9) tendencyText = 'Vertical mover. Spike traps gain value.';
    else if (avgSpeed > PLAYER_SPEED * 0.72) tendencyText = 'Fast line runner. Speed traps viable.';
    else if (preferredLane === 'high') tendencyText = 'High route bias detected.';
    else if (preferredLane === 'low') tendencyText = 'Low route bias detected.';

    return {
        preferredLane,
        jumpRate,
        dashRate,
        avgSpeed,
        confidence,
        shortcutUsage: aiProfile.shortcutUsage,
        hesitationZones,
        clearedStages: clears,
        tendencyText,
    };
}

function collectHesitationZones(path) {
    const zones = [];
    for (let i = 1; i < path.length; i++) {
        const dx = path[i].x - path[i - 1].x;
        const dy = path[i].y - path[i - 1].y;
        const speed = Math.sqrt(dx * dx + dy * dy);
        if (speed <= 5) {
            zones.push({
                progress: clamp(path[i].x / Math.max(levelWidth, 1), 0, 1),
                lane: ratioToLane(path[i].y / Math.max(canvas.height, 1)),
            });
        }
    }

    return zones.slice(0, 4);
}

function detectTouchedPlatforms(stageData, path) {
    const touched = new Set();
    for (const point of path) {
        for (const platform of stageData.platforms) {
            if (
                point.x >= platform.x - 4 &&
                point.x <= platform.x + platform.w + 4 &&
                point.y >= platform.y - 14 &&
                point.y <= platform.y + platform.h + 24
            ) {
                touched.add(platform);
            }
        }
    }
    return [...touched];
}

function learnFromClearedStage(stageData, path) {
    if (!path || path.length < 8) return;

    const touchedPlatforms = detectTouchedPlatforms(stageData, path);
    const laneCounts = { low: 0, mid: 0, high: 0 };
    for (const point of path) {
        laneCounts[ratioToLane(point.y / canvas.height)] += 1;
    }

    const preferredLane = Object.entries(laneCounts).sort((a, b) => b[1] - a[1])[0][0];
    const speeds = [];
    for (let i = 1; i < path.length; i++) {
        const dx = path[i].x - path[i - 1].x;
        const dy = path[i].y - path[i - 1].y;
        speeds.push(Math.sqrt(dx * dx + dy * dy));
    }

    const shortcutUsed = touchedPlatforms.some(platform => platform.role === 'shortcut');
    const hesitationZones = collectHesitationZones(path);

    aiProfile.clearedStagePaths.push({
        stageIndex: currentStage,
        archetypeId: stageData.archetypeId,
        preferredLane,
        jumpRate: analytics.stageJumps,
        dashRate: analytics.stageDashes,
        avgSpeed: average(speeds),
        shortcutUsed,
    });

    if (shortcutUsed) {
        aiProfile.shortcutUsage += 1;
    }

    aiProfile.hesitationZones.push(...hesitationZones);
    if (aiProfile.hesitationZones.length > 16) {
        aiProfile.hesitationZones.splice(0, aiProfile.hesitationZones.length - 16);
    }

    previousPaths = [path.slice()];
}

// ============================================
// SECTION 10: STAGE ARCHETYPES
// ============================================
function buildIntroFlats(archetype) {
    const ground = canvas.height - 56;
    const floorY = canvas.height - 34;

    const spawn = createPlatform(30, ground, 220, 'spawn', 'mid');
    const p1 = createPlatform(320, ground - 8, 170, 'main', 'mid');
    const p2 = createPlatform(590, ground - 16, 160, 'main', 'mid');
    const p3 = createPlatform(850, ground - 4, 170, 'main', 'mid');
    const goalPlat = createPlatform(1110, ground - 12, 220, 'goal', 'mid');
    const floor = createPlatform(720, floorY, 120, 'floor', 'low', FLOOR_HEIGHT);

    const bugSlots = [
        makeSurfaceSlot(p1, 0.68, 'mid', ['speed'], 1.0, ['bug'], 4),
        makeSurfaceSlot(p2, 0.32, 'mid', ['jump'], 1.1, ['spike', 'bug'], 5),
        makeSurfaceSlot(p3, 0.58, 'mid', ['speed', 'hesitation'], 1.2, ['bug', 'laser'], 6),
    ];

    return finishStage(archetype, [spawn, p1, p2, floor, p3, goalPlat], spawn, goalPlat, bugSlots);
}

function buildStepUp(archetype) {
    const ground = canvas.height - 56;
    const floorY = canvas.height - 34;

    const spawn = createPlatform(30, ground, 200, 'spawn', 'low');
    const p1 = createPlatform(285, ground - 40, 150, 'main', 'mid');
    const p2 = createPlatform(520, ground - 88, 140, 'main', 'high');
    const p3 = createPlatform(770, ground - 42, 150, 'main', 'mid');
    const goalPlat = createPlatform(1015, ground - 96, 180, 'goal', 'high');
    const floor = createPlatform(610, floorY, 110, 'floor', 'low', FLOOR_HEIGHT);

    const bugSlots = [
        makeSurfaceSlot(p1, 0.55, 'mid', ['jump'], 1.2, ['spike', 'bug'], 4),
        makeSurfaceSlot(p2, 0.5, 'high', ['jump', 'shortcut'], 1.4, ['spike', 'laser'], 5),
        makeSurfaceSlot(p3, 0.35, 'mid', ['hesitation'], 1.1, ['bug'], 6),
    ];

    return finishStage(archetype, [spawn, p1, p2, floor, p3, goalPlat], spawn, goalPlat, bugSlots);
}

function buildDashBridge(archetype) {
    const ground = canvas.height - 56;
    const floorY = canvas.height - 34;

    const spawn = createPlatform(30, ground, 220, 'spawn', 'low');
    const p1 = createPlatform(360, ground - 22, 150, 'main', 'mid');
    const p2 = createPlatform(760, ground - 58, 145, 'main', 'mid');
    const p3 = createPlatform(1010, ground - 24, 160, 'main', 'mid');
    const goalPlat = createPlatform(1290, ground - 70, 190, 'goal', 'high');
    const floor = createPlatform(590, floorY, 140, 'floor', 'low', FLOOR_HEIGHT);

    const bugSlots = [
        makeSurfaceSlot(p1, 0.72, 'mid', ['dash', 'speed'], 1.5, ['laser', 'bug'], 4),
        makeSurfaceSlot(p2, 0.35, 'mid', ['dash', 'jump'], 1.6, ['laser', 'spike'], 5),
        makeSurfaceSlot(p3, 0.62, 'mid', ['speed'], 1.2, ['bug'], 6),
    ];

    return finishStage(archetype, [spawn, p1, floor, p2, p3, goalPlat], spawn, goalPlat, bugSlots);
}

function buildSplitRoute(archetype) {
    const ground = canvas.height - 56;
    const floorY = canvas.height - 34;

    const spawn = createPlatform(30, ground, 190, 'spawn', 'low');
    const low1 = createPlatform(270, ground - 8, 160, 'main', 'low');
    const high1 = createPlatform(265, ground - 92, 140, 'shortcut', 'high');
    const low2 = createPlatform(520, ground - 12, 150, 'main', 'low');
    const high2 = createPlatform(510, ground - 126, 145, 'shortcut', 'high');
    const merge = createPlatform(795, ground - 56, 165, 'main', 'mid');
    const floor = createPlatform(640, floorY, 120, 'floor', 'low', FLOOR_HEIGHT);
    const goalPlat = createPlatform(1060, ground - 102, 180, 'goal', 'high');

    const bugSlots = [
        makeSurfaceSlot(low1, 0.55, 'low', ['speed'], 1.1, ['bug', 'spike'], 5),
        makeSurfaceSlot(high1, 0.52, 'high', ['shortcut', 'jump'], 1.5, ['spike', 'laser'], 5),
        makeSurfaceSlot(high2, 0.7, 'high', ['shortcut', 'dash'], 1.7, ['laser', 'spike'], 6),
        makeSurfaceSlot(merge, 0.5, 'mid', ['hesitation'], 1.3, ['bug', 'laser'], 6),
    ];

    return finishStage(archetype, [spawn, low1, high1, low2, high2, floor, merge, goalPlat], spawn, goalPlat, bugSlots);
}

function buildLowTunnel(archetype) {
    const ground = canvas.height - 56;
    const floorY = canvas.height - 34;

    const spawn = createPlatform(30, ground, 190, 'spawn', 'low');
    const tunnelFloor = createPlatform(250, ground - 8, 180, 'main', 'low');
    const tunnelRoof = createPlatform(250, ground - 102, 240, 'main', 'high');
    const exit1 = createPlatform(560, ground - 62, 150, 'main', 'mid');
    const exit2 = createPlatform(820, ground - 82, 145, 'shortcut', 'high');
    const safetyFloor = createPlatform(700, floorY, 130, 'floor', 'low', FLOOR_HEIGHT);
    const goalPlat = createPlatform(1090, ground - 48, 190, 'goal', 'mid');

    const bugSlots = [
        makeSurfaceSlot(tunnelFloor, 0.72, 'low', ['speed', 'hesitation'], 1.2, ['bug'], 6),
        makeSurfaceSlot(exit1, 0.45, 'mid', ['jump'], 1.4, ['spike', 'bug'], 6),
        makeSurfaceSlot(exit2, 0.55, 'high', ['shortcut'], 1.5, ['laser', 'spike'], 7),
    ];

    return finishStage(archetype, [spawn, tunnelFloor, tunnelRoof, exit1, safetyFloor, exit2, goalPlat], spawn, goalPlat, bugSlots);
}

function buildRecoveryFloor(archetype) {
    const ground = canvas.height - 56;
    const floorY = canvas.height - 34;

    const spawn = createPlatform(30, ground, 210, 'spawn', 'low');
    const p1 = createPlatform(300, ground - 12, 140, 'main', 'low');
    const high1 = createPlatform(470, ground - 84, 120, 'shortcut', 'high');
    const floor1 = createPlatform(450, floorY, 180, 'floor', 'low', FLOOR_HEIGHT);
    const p2 = createPlatform(720, ground - 36, 150, 'main', 'mid');
    const p3 = createPlatform(970, ground - 58, 150, 'main', 'mid');
    const goalPlat = createPlatform(1220, ground - 72, 190, 'goal', 'high');

    const bugSlots = [
        makeSurfaceSlot(p1, 0.62, 'low', ['speed'], 1.0, ['bug'], 5),
        makeSurfaceSlot(high1, 0.48, 'high', ['shortcut', 'jump'], 1.4, ['spike', 'laser'], 6),
        makeSurfaceSlot(p3, 0.4, 'mid', ['hesitation'], 1.2, ['bug', 'spike'], 7),
    ];

    return finishStage(archetype, [spawn, p1, high1, floor1, p2, p3, goalPlat], spawn, goalPlat, bugSlots);
}

function buildVerticalLadder(archetype) {
    const ground = canvas.height - 56;

    const spawn = createPlatform(30, ground, 200, 'spawn', 'low');
    const p1 = createPlatform(260, ground - 56, 120, 'main', 'mid');
    const p2 = createPlatform(470, ground - 112, 112, 'main', 'high');
    const p3 = createPlatform(670, ground - 168, 110, 'main', 'high');
    const p4 = createPlatform(900, ground - 112, 122, 'main', 'mid');
    const p5 = createPlatform(1110, ground - 196, 110, 'shortcut', 'high');
    const goalPlat = createPlatform(1320, ground - 144, 170, 'goal', 'high');

    const bugSlots = [
        makeSurfaceSlot(p1, 0.55, 'mid', ['jump'], 1.3, ['spike', 'bug'], 6),
        makeSurfaceSlot(p2, 0.4, 'high', ['jump'], 1.5, ['spike', 'laser'], 7),
        makeSurfaceSlot(p4, 0.7, 'mid', ['hesitation'], 1.4, ['bug', 'laser'], 7),
        makeSurfaceSlot(p5, 0.5, 'high', ['shortcut'], 1.6, ['laser', 'spike'], 8),
    ];

    return finishStage(archetype, [spawn, p1, p2, p3, p4, p5, goalPlat], spawn, goalPlat, bugSlots);
}

function buildStaggerJump(archetype) {
    const ground = canvas.height - 56;
    const floorY = canvas.height - 34;

    const spawn = createPlatform(30, ground, 200, 'spawn', 'low');
    const p1 = createPlatform(280, ground - 36, 120, 'main', 'mid');
    const p2 = createPlatform(500, ground - 6, 110, 'main', 'low');
    const p3 = createPlatform(730, ground - 82, 120, 'main', 'high');
    const floor = createPlatform(645, floorY, 100, 'floor', 'low', FLOOR_HEIGHT);
    const p4 = createPlatform(970, ground - 28, 125, 'main', 'mid');
    const goalPlat = createPlatform(1200, ground - 102, 170, 'goal', 'high');

    const bugSlots = [
        makeSurfaceSlot(p1, 0.65, 'mid', ['jump'], 1.3, ['spike', 'bug'], 6),
        makeSurfaceSlot(p2, 0.4, 'low', ['speed'], 1.1, ['bug'], 6),
        makeSurfaceSlot(p3, 0.5, 'high', ['jump', 'dash'], 1.5, ['laser', 'spike'], 7),
        makeSurfaceSlot(p4, 0.58, 'mid', ['hesitation'], 1.3, ['bug', 'laser'], 7),
    ];

    return finishStage(archetype, [spawn, p1, p2, p3, floor, p4, goalPlat], spawn, goalPlat, bugSlots);
}

function buildAlternatingHeights(archetype) {
    const ground = canvas.height - 56;

    const spawn = createPlatform(30, ground, 210, 'spawn', 'low');
    const p1 = createPlatform(295, ground - 74, 128, 'main', 'high');
    const p2 = createPlatform(540, ground - 16, 124, 'main', 'low');
    const p3 = createPlatform(790, ground - 102, 120, 'main', 'high');
    const p4 = createPlatform(1040, ground - 34, 124, 'main', 'mid');
    const p5 = createPlatform(1280, ground - 114, 118, 'shortcut', 'high');
    const goalPlat = createPlatform(1510, ground - 56, 180, 'goal', 'mid');

    const bugSlots = [
        makeSurfaceSlot(p1, 0.48, 'high', ['jump'], 1.4, ['spike', 'laser'], 7),
        makeSurfaceSlot(p2, 0.68, 'low', ['speed'], 1.2, ['bug'], 7),
        makeSurfaceSlot(p3, 0.58, 'high', ['dash', 'jump'], 1.6, ['laser', 'spike'], 8),
        makeSurfaceSlot(p5, 0.42, 'high', ['shortcut'], 1.7, ['laser'], 8),
    ];

    return finishStage(archetype, [spawn, p1, p2, p3, p4, p5, goalPlat], spawn, goalPlat, bugSlots);
}

function buildLongTraversal(archetype) {
    const ground = canvas.height - 56;
    const floorY = canvas.height - 34;

    const spawn = createPlatform(30, ground, 220, 'spawn', 'low');
    const p1 = createPlatform(340, ground - 18, 150, 'main', 'low');
    const p2 = createPlatform(700, ground - 60, 140, 'main', 'mid');
    const floor = createPlatform(880, floorY, 120, 'floor', 'low', FLOOR_HEIGHT);
    const p3 = createPlatform(1060, ground - 16, 145, 'main', 'low');
    const p4 = createPlatform(1400, ground - 78, 136, 'shortcut', 'high');
    const p5 = createPlatform(1700, ground - 32, 150, 'main', 'mid');
    const goalPlat = createPlatform(1980, ground - 88, 185, 'goal', 'high');

    const bugSlots = [
        makeSurfaceSlot(p1, 0.62, 'low', ['speed'], 1.1, ['bug'], 7),
        makeSurfaceSlot(p2, 0.52, 'mid', ['dash'], 1.5, ['laser', 'bug'], 8),
        makeSurfaceSlot(p4, 0.5, 'high', ['shortcut'], 1.7, ['laser', 'spike'], 8),
        makeSurfaceSlot(p5, 0.35, 'mid', ['hesitation'], 1.4, ['bug', 'spike'], 9),
    ];

    return finishStage(archetype, [spawn, p1, p2, floor, p3, p4, p5, goalPlat], spawn, goalPlat, bugSlots);
}

function buildPrecisionTower(archetype) {
    const ground = canvas.height - 56;

    const spawn = createPlatform(30, ground, 190, 'spawn', 'low');
    const p1 = createPlatform(265, ground - 54, 104, 'main', 'mid');
    const p2 = createPlatform(470, ground - 112, 96, 'main', 'high');
    const p3 = createPlatform(645, ground - 164, 92, 'main', 'high');
    const p4 = createPlatform(840, ground - 88, 96, 'main', 'mid');
    const p5 = createPlatform(1045, ground - 178, 92, 'shortcut', 'high');
    const p6 = createPlatform(1260, ground - 124, 98, 'main', 'high');
    const goalPlat = createPlatform(1480, ground - 190, 150, 'goal', 'high');

    const bugSlots = [
        makeSurfaceSlot(p1, 0.45, 'mid', ['jump'], 1.4, ['spike', 'bug'], 8),
        makeSurfaceSlot(p2, 0.52, 'high', ['jump'], 1.6, ['spike', 'laser'], 9),
        makeSurfaceSlot(p4, 0.7, 'mid', ['hesitation'], 1.5, ['bug', 'laser'], 9),
        makeSurfaceSlot(p5, 0.5, 'high', ['shortcut'], 1.8, ['laser', 'spike'], 10),
        makeSurfaceSlot(p6, 0.4, 'high', ['dash'], 1.6, ['laser', 'bug'], 10),
    ];

    return finishStage(archetype, [spawn, p1, p2, p3, p4, p5, p6, goalPlat], spawn, goalPlat, bugSlots);
}

function buildMixedGauntlet(archetype) {
    const ground = canvas.height - 56;
    const floorY = canvas.height - 34;

    const spawn = createPlatform(30, ground, 210, 'spawn', 'low');
    const low1 = createPlatform(300, ground - 12, 140, 'main', 'low');
    const high1 = createPlatform(295, ground - 90, 118, 'shortcut', 'high');
    const low2 = createPlatform(560, ground - 26, 130, 'main', 'mid');
    const high2 = createPlatform(545, ground - 142, 116, 'shortcut', 'high');
    const floor = createPlatform(720, floorY, 110, 'floor', 'low', FLOOR_HEIGHT);
    const tower = createPlatform(850, ground - 66, 120, 'main', 'mid');
    const tower2 = createPlatform(1080, ground - 146, 114, 'main', 'high');
    const finalRun = createPlatform(1340, ground - 48, 140, 'main', 'mid');
    const goalPlat = createPlatform(1600, ground - 110, 180, 'goal', 'high');

    const bugSlots = [
        makeSurfaceSlot(low1, 0.58, 'low', ['speed'], 1.2, ['bug', 'spike'], 8),
        makeSurfaceSlot(high1, 0.5, 'high', ['shortcut'], 1.6, ['laser', 'spike'], 8),
        makeSurfaceSlot(high2, 0.62, 'high', ['shortcut', 'dash'], 1.8, ['laser'], 9),
        makeSurfaceSlot(tower, 0.44, 'mid', ['hesitation'], 1.5, ['bug', 'laser'], 9),
        makeSurfaceSlot(tower2, 0.48, 'high', ['jump'], 1.7, ['spike', 'laser'], 10),
        makeSurfaceSlot(finalRun, 0.62, 'mid', ['speed', 'dash'], 1.6, ['bug', 'laser'], 10),
    ];

    return finishStage(archetype, [spawn, low1, high1, low2, high2, floor, tower, tower2, finalRun, goalPlat], spawn, goalPlat, bugSlots);
}

const STAGE_ARCHETYPES = [
    { id: 'intro-flats', name: 'Intro Flats', difficulty: 0, build: buildIntroFlats },
    { id: 'step-up', name: 'Step Up', difficulty: 1, build: buildStepUp },
    { id: 'dash-bridge', name: 'Dash Bridge', difficulty: 2, build: buildDashBridge },
    { id: 'split-route', name: 'Split Route', difficulty: 3, build: buildSplitRoute },
    { id: 'low-tunnel', name: 'Low Tunnel', difficulty: 3, build: buildLowTunnel },
    { id: 'recovery-floor', name: 'Recovery Floor', difficulty: 1, build: buildRecoveryFloor },
    { id: 'vertical-ladder', name: 'Vertical Ladder', difficulty: 5, build: buildVerticalLadder },
    { id: 'stagger-jump', name: 'Stagger Jump', difficulty: 4, build: buildStaggerJump },
    { id: 'alternating-heights', name: 'Alternating Heights', difficulty: 4, build: buildAlternatingHeights },
    { id: 'long-traversal', name: 'Long Traversal', difficulty: 5, build: buildLongTraversal },
    { id: 'precision-tower', name: 'Precision Tower', difficulty: 6, build: buildPrecisionTower },
    { id: 'mixed-gauntlet', name: 'Mixed Gauntlet', difficulty: 7, build: buildMixedGauntlet },
];

const ARCHETYPES_BY_ID = Object.fromEntries(STAGE_ARCHETYPES.map(archetype => [archetype.id, archetype]));

function isLimitedTimeStage(stageIndex) {
    return stageIndex >= 4 && stageIndex % 4 === 0;
}

function computeTimeLimit(stageIndex) {
    return Math.max(16, 30 - Math.floor(stageIndex / 4));
}

function computeBugBudget(stageIndex, aiConfidence, limitedTime) {
    let budget = clamp(Math.floor((stageIndex - 1) / 3), 0, 6);
    if (limitedTime) budget -= 1;
    if (aiConfidence < 0.45) budget -= 1;
    return Math.max(0, budget);
}

function stageTier(stageIndex) {
    return Math.floor((stageIndex - 1) / 5);
}

function selectArchetypeForStage(stageIndex, limitedTime) {
    if (stageIndex === 1) return ARCHETYPES_BY_ID['intro-flats'];
    if (stageIndex === 2) return ARCHETYPES_BY_ID['step-up'];
    if (stageIndex === 3) return ARCHETYPES_BY_ID['dash-bridge'];

    const tier = stageTier(stageIndex);
    const targetDifficulty = clamp(tier + 2 + Math.floor(stageIndex / 10), 1, 7);
    const easedDifficulty = Math.max(0, targetDifficulty - 1);
    const target = limitedTime ? easedDifficulty : targetDifficulty;

    const candidates = STAGE_ARCHETYPES.filter(archetype => {
        const minDifficulty = limitedTime ? Math.max(0, target - 2) : Math.max(0, target - 1);
        const maxDifficulty = limitedTime ? target + 1 : target + 2;
        return archetype.difficulty >= minDifficulty && archetype.difficulty <= maxDifficulty;
    });

    const pool = candidates.length ? candidates : STAGE_ARCHETYPES;
    let index = (stageIndex + tier * 3) % pool.length;
    if (pool[index].id === lastArchetypeId && pool.length > 1) {
        index = (index + 1) % pool.length;
    }
    return pool[index];
}

function pickFallbackArchetype(stageIndex, primary, limitedTime) {
    const targetDifficulty = Math.max(0, primary.difficulty - 1);
    const candidates = STAGE_ARCHETYPES.filter(archetype => {
        if (archetype.id === primary.id) return false;
        if (limitedTime) return archetype.difficulty <= targetDifficulty + 1;
        return archetype.difficulty >= Math.max(0, targetDifficulty - 1) && archetype.difficulty <= targetDifficulty + 1;
    });

    if (!candidates.length) {
        return ARCHETYPES_BY_ID[SAFE_FALLBACK_ARCHETYPE_ID];
    }

    return candidates[(stageIndex + 1) % candidates.length];
}

function decorateStageDifficulty(stageIndex, stageData) {
    const limitedTime = isLimitedTimeStage(stageIndex);
    const tier = stageTier(stageIndex);
    const effectiveTier = limitedTime ? Math.max(0, tier - 1) : tier;
    const widthScale = clamp(1 - effectiveTier * 0.035, 0.78, 1);
    const gapPush = effectiveTier * 18;
    const verticalPush = effectiveTier * 5;

    stageData.tier = tier;
    stageData.isTimeTrial = limitedTime;
    stageData.timeLimit = limitedTime ? computeTimeLimit(stageIndex) : 0;

    for (let i = 1; i < stageData.platforms.length; i++) {
        const platform = stageData.platforms[i];
        const progress = i / Math.max(1, stageData.platforms.length - 1);

        if (platform.role !== 'floor') {
            platform.x += Math.round(progress * i * gapPush * 0.35);
        }

        if (platform.role !== 'spawn' && platform.role !== 'goal' && platform.role !== 'floor') {
            platform.w = Math.max(platform.role === 'shortcut' ? 70 : 82, Math.round(platform.w * widthScale));
        }

        if (platform.role !== 'floor' && platform.routeLane !== 'low') {
            platform.y = Math.max(76, platform.y - Math.round(progress * verticalPush));
        }
    }

    stageData.platforms.sort((a, b) => (a.x - b.x) || (a.y - b.y));
    stageData.spawn = makeSpawnFromPlatform(stageData.spawnPlatform);
    stageData.goal = makeGoalFromPlatform(stageData.goalPlatform);
    stageData.levelWidth = Math.max(canvas.width, Math.max(...stageData.platforms.map(platform => platform.x + platform.w)) + 160);

    return stageData;
}

function resolveBugSlot(slot, stageData) {
    const x = slot.platform.x + slot.platform.w * slot.align;
    return {
        ...slot,
        x: Math.round(x),
        y: slot.platform.y,
        progress: clamp(x / Math.max(stageData.levelWidth, 1), 0, 1),
    };
}

function chooseObstacleType(slot, aiSummary) {
    const weights = { bug: 1, laser: 1, spike: 1 };
    for (const type of slot.typeOptions) {
        if (type === 'laser') {
            if (slot.counterTags.includes('dash')) weights.laser += 1.2;
            if (slot.counterTags.includes('speed')) weights.laser += 0.8;
            if (aiSummary.dashRate > 0.3) weights.laser += 1.0;
            if (aiSummary.avgSpeed > PLAYER_SPEED * 0.72) weights.laser += 0.7;
        }
        if (type === 'spike') {
            if (slot.counterTags.includes('jump')) weights.spike += 1.2;
            if (slot.counterTags.includes('shortcut')) weights.spike += 0.6;
            if (aiSummary.jumpRate > 0.9) weights.spike += 0.9;
        }
        if (type === 'bug') {
            if (slot.counterTags.includes('hesitation')) weights.bug += 0.8;
            if (slot.counterTags.includes('speed')) weights.bug += 0.4;
        }
    }

    return slot.typeOptions
        .slice()
        .sort((a, b) => weights[b] - weights[a])[0];
}

function scoreBugSlot(slot, aiSummary, stageIndex) {
    let score = slot.threat * 0.75 + stageIndex * 0.02;

    if (slot.lane === aiSummary.preferredLane) score += 1.4;
    if (slot.counterTags.includes('jump') && aiSummary.jumpRate > 0.9) score += 1.2;
    if (slot.counterTags.includes('dash') && aiSummary.dashRate > 0.3) score += 1.2;
    if (slot.counterTags.includes('speed') && aiSummary.avgSpeed > PLAYER_SPEED * 0.72) score += 0.9;
    if (slot.counterTags.includes('shortcut') && aiSummary.shortcutUsage > 0) score += 1.0;
    if (slot.counterTags.includes('hesitation') && aiSummary.hesitationZones.some(zone => Math.abs(zone.progress - slot.progress) < 0.12)) {
        score += 0.85;
    }

    return score;
}

function buildObstacleFromSlot(slot, type) {
    if (type === 'laser') {
        return {
            x: slot.x - 3,
            y: slot.y - 92,
            w: 6,
            h: 92,
            type,
            phase: Math.random() * Math.PI * 2,
            threat: slot.threat,
            platform: slot.platform,
        };
    }

    if (type === 'spike') {
        return {
            x: slot.x - 12,
            y: slot.y - 16,
            w: 24,
            h: 16,
            type,
            phase: Math.random() * Math.PI * 2,
            threat: slot.threat,
            platform: slot.platform,
        };
    }

    return {
        x: slot.x - 15,
        y: slot.y - 30,
        w: 30,
        h: 30,
        type: 'bug',
        phase: Math.random() * Math.PI * 2,
        threat: slot.threat,
        platform: slot.platform,
    };
}

function planStageObstacles(stageData, aiSummary) {
    const bugBudget = computeBugBudget(stageData.stageIndex, aiSummary.confidence, stageData.isTimeTrial);
    const resolvedSlots = stageData.bugSlots
        .filter(slot => stageData.stageIndex >= slot.minStage)
        .map(slot => resolveBugSlot(slot, stageData))
        .filter(slot => slot.x > stageData.spawn.x + 60 && slot.x < stageData.goal.x - 40);

    const scoredSlots = resolvedSlots
        .map(slot => ({ slot, score: scoreBugSlot(slot, aiSummary, stageData.stageIndex) }))
        .sort((a, b) => b.score - a.score);

    const selected = [];
    for (const entry of scoredSlots) {
        if (selected.length >= bugBudget) break;

        const tooClose = selected.some(obstacle => Math.abs(obstacle.x + obstacle.w / 2 - entry.slot.x) < 68);
        if (tooClose) continue;

        const type = chooseObstacleType(entry.slot, aiSummary);
        selected.push(buildObstacleFromSlot(entry.slot, type));
    }

    return {
        bugBudget,
        plannedObstacles: selected,
    };
}

function createStageCandidate(stageIndex, archetype, aiSummary, options = {}) {
    const baseStage = archetype.build(archetype);
    const stageData = decorateStageDifficulty(stageIndex, {
        ...baseStage,
        stageIndex,
    });

    const obstaclePlan = options.disableBugs
        ? { bugBudget: 0, plannedObstacles: [] }
        : planStageObstacles(stageData, aiSummary);

    stageData.aiSummary = aiSummary;
    stageData.bugBudget = obstaclePlan.bugBudget;
    stageData.plannedObstacles = obstaclePlan.plannedObstacles;
    stageData.meta = {
        removedBugs: 0,
        fallbackLevel: 0,
        validationAttempts: 0,
    };

    return stageData;
}

function getBlockedRanges(platform, obstacles) {
    const ranges = [];
    for (const obstacle of obstacles) {
        if (obstacle.platform !== platform) continue;

        let left = obstacle.x - 6;
        let right = obstacle.x + obstacle.w + 6;
        if (obstacle.type === 'laser') {
            left = obstacle.x - 12;
            right = obstacle.x + obstacle.w + 12;
        }

        left = clamp(left - platform.x, 0, platform.w);
        right = clamp(right - platform.x, 0, platform.w);
        if (right > left) ranges.push([left, right]);
    }

    ranges.sort((a, b) => a[0] - b[0]);
    return ranges;
}

function hasSafeLandingZone(platform, obstacles) {
    const blockedRanges = getBlockedRanges(platform, obstacles);
    if (!blockedRanges.length) return true;

    const requiredWidth = player.width + 6;
    let cursor = 0;

    for (const [start, end] of blockedRanges) {
        if (start - cursor >= requiredWidth) return true;
        cursor = Math.max(cursor, end);
    }

    return platform.w - cursor >= requiredWidth;
}

function edgeBlockedByLaser(from, to, obstacles) {
    const startX = from.x + from.w / 2;
    const endX = to.x + to.w / 2;
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(from.y, to.y) - 88;
    const maxY = Math.max(from.y, to.y) + 26;

    return obstacles.some(obstacle => {
        if (obstacle.type !== 'laser') return false;
        return obstacle.x + obstacle.w >= minX && obstacle.x <= maxX && obstacle.y <= maxY && obstacle.y + obstacle.h >= minY;
    });
}

function getReachMetrics(from, to) {
    const fromRight = from.x + from.w;
    const toRight = to.x + to.w;

    let horizontalGap = 0;
    if (to.x > fromRight) horizontalGap = to.x - fromRight;
    else if (from.x > toRight) horizontalGap = from.x - toRight;

    const verticalDiff = from.y - to.y;
    if (verticalDiff > MAX_JUMP_V) return null;

    const jumpReach = verticalDiff > 24 ? MAX_JUMP_H * 0.92 : MAX_JUMP_H;
    const dashRequired = horizontalGap > jumpReach;
    const maxReach = dashRequired ? MAX_DASH_H : jumpReach;

    if (horizontalGap > maxReach) return null;

    const centerDistance = Math.abs((to.x + to.w / 2) - (from.x + from.w / 2));
    const eta = centerDistance / (PLAYER_SPEED * 60) + (verticalDiff >= 10 ? 0.45 : 0.18) + (dashRequired ? 0.25 : 0);

    return {
        eta,
        dashRequired,
    };
}

function validateStage(stageData, obstacles) {
    const stagePlatforms = stageData.platforms;
    const startIndex = stagePlatforms.indexOf(stageData.spawnPlatform);
    const goalIndex = stagePlatforms.indexOf(stageData.goalPlatform);

    if (startIndex === -1 || goalIndex === -1) {
        return { valid: false, reason: 'missing-endpoints' };
    }

    if (!hasSafeLandingZone(stageData.goalPlatform, obstacles)) {
        return { valid: false, reason: 'goal-blocked' };
    }

    const costs = Array(stagePlatforms.length).fill(Infinity);
    const previous = Array(stagePlatforms.length).fill(-1);
    const queue = [{ index: startIndex, cost: 0 }];
    costs[startIndex] = 0;

    while (queue.length) {
        queue.sort((a, b) => a.cost - b.cost);
        const current = queue.shift();
        if (current.index === goalIndex) break;

        const from = stagePlatforms[current.index];
        for (let nextIndex = 0; nextIndex < stagePlatforms.length; nextIndex++) {
            if (nextIndex === current.index) continue;

            const to = stagePlatforms[nextIndex];
            if (!hasSafeLandingZone(to, obstacles)) continue;

            const move = getReachMetrics(from, to);
            if (!move) continue;
            if (edgeBlockedByLaser(from, to, obstacles)) continue;

            const nextCost = current.cost + move.eta;
            if (nextCost < costs[nextIndex]) {
                costs[nextIndex] = nextCost;
                previous[nextIndex] = current.index;
                queue.push({ index: nextIndex, cost: nextCost });
            }
        }
    }

    if (!Number.isFinite(costs[goalIndex])) {
        return { valid: false, reason: 'no-route' };
    }

    if (stageData.isTimeTrial && costs[goalIndex] > stageData.timeLimit - 1.5) {
        return {
            valid: false,
            reason: 'slow-route',
            shortestEta: costs[goalIndex],
        };
    }

    const pathIndices = [];
    let cursor = goalIndex;
    while (cursor !== -1) {
        pathIndices.unshift(cursor);
        cursor = previous[cursor];
    }

    return {
        valid: true,
        shortestEta: costs[goalIndex],
        pathIndices,
    };
}

function fitValidatedVariant(stageData) {
    let obstacles = stageData.plannedObstacles.slice().sort((a, b) => b.threat - a.threat);
    let validation = validateStage(stageData, obstacles);
    let removedBugs = 0;

    while (!validation.valid && obstacles.length) {
        obstacles.shift();
        removedBugs++;
        validation = validateStage(stageData, obstacles);
    }

    return {
        valid: validation.valid,
        obstacles,
        removedBugs,
        validation,
    };
}

function buildSafeFallbackStage(stageIndex, aiSummary) {
    const safeArchetype = ARCHETYPES_BY_ID[SAFE_FALLBACK_ARCHETYPE_ID];
    const fallbackStage = createStageCandidate(stageIndex, safeArchetype, aiSummary, { disableBugs: true });
    fallbackStage.meta.fallbackLevel = 2;
    fallbackStage.meta.removedBugs = 0;
    fallbackStage.validation = validateStage(fallbackStage, []);
    fallbackStage.obstacles = [];
    return fallbackStage;
}

function buildValidatedStage(stageIndex) {
    const limitedTime = isLimitedTimeStage(stageIndex);
    const aiSummary = computeAIProfileSummary();

    const primaryArchetype = selectArchetypeForStage(stageIndex, limitedTime);
    let stageData = createStageCandidate(stageIndex, primaryArchetype, aiSummary);
    let fitted = fitValidatedVariant(stageData);

    if (fitted.valid) {
        stageData.meta.removedBugs = fitted.removedBugs;
        stageData.meta.validationAttempts = fitted.removedBugs + 1;
        stageData.validation = fitted.validation;
        stageData.obstacles = fitted.obstacles;
        return stageData;
    }

    const fallbackArchetype = pickFallbackArchetype(stageIndex, primaryArchetype, limitedTime);
    stageData = createStageCandidate(stageIndex, fallbackArchetype, aiSummary);
    stageData.meta.fallbackLevel = 1;
    fitted = fitValidatedVariant(stageData);

    if (fitted.valid) {
        stageData.meta.removedBugs = fitted.removedBugs;
        stageData.meta.validationAttempts = fitted.removedBugs + 1;
        stageData.validation = fitted.validation;
        stageData.obstacles = fitted.obstacles;
        return stageData;
    }

    const safeFallback = buildSafeFallbackStage(stageIndex, aiSummary);
    if (!safeFallback.validation.valid) {
        logConsole(`[ERROR]: Safe fallback failed for stage ${stageIndex}.`, 'error');
    }
    return safeFallback;
}

function runStageLibrarySelfCheck() {
    const aiSummary = computeAIProfileSummary();
    let failures = 0;

    for (let i = 0; i < STAGE_ARCHETYPES.length; i++) {
        const stageIndex = i + 2;
        const stageData = createStageCandidate(stageIndex, STAGE_ARCHETYPES[i], aiSummary, { disableBugs: true });
        const validation = validateStage(stageData, []);
        if (!validation.valid) {
            failures++;
            logConsole(`[ERROR]: Self-check failed for ${STAGE_ARCHETYPES[i].name} (${validation.reason}).`, 'error');
        }
    }

    if (failures === 0) {
        logConsole(`[TESTER]: Stage library self-check passed (${STAGE_ARCHETYPES.length} archetypes).`, 'success');
    }
}

// ============================================
// SECTION 11: PARTICLES
// ============================================
let particles = [];

function spawnParticle(x, y, vx, vy, color, life = 30, size = 2) {
    particles.push({ x, y, vx, vy, color, life, maxLife: life, size });
}

function spawnExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 2 + Math.random() * 3;
        spawnParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 25 + Math.random() * 15, 2 + Math.random() * 2);
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.05;
        particle.vx *= 0.98;
        if (--particle.life <= 0) particles.splice(i, 1);
    }
}

// ============================================
// SECTION 12: CONSOLE LOGGER
// ============================================
function logConsole(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    entry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
    consoleOutput.appendChild(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    while (consoleOutput.children.length > 120) {
        consoleOutput.removeChild(consoleOutput.firstChild);
    }
}

function formatTime(ms) {
    const seconds = ms / 1000;
    const minutes = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const millis = Math.floor(ms % 1000);
    return `${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

// ============================================
// SECTION 13: STAGE ALERT + LOADING
// ============================================
function showLimitedTimeStageAlert(stageData, callback) {
    if (!stageData.isTimeTrial) {
        callback();
        return;
    }

    stageAlertTitle.textContent = 'LIMITED TIME STAGE';
    stageAlertSubtitle.textContent = `COMPLETE IN ${stageData.timeLimit}s`;
    stageAlert.classList.remove('hidden');
    stageAlert.classList.remove('stage-alert-active');
    void stageAlert.offsetWidth;
    stageAlert.classList.add('stage-alert-active');

    setTimeout(() => {
        stageAlert.classList.remove('stage-alert-active');
        stageAlert.classList.add('hidden');
        callback();
    }, STAGE_ALERT_DURATION);
}

function showLoadingScreen(stageIndex, callback) {
    gameState = 'loading';
    deathOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
    loadingOverlay.classList.remove('hidden');
    loadingStageNum.textContent = String(stageIndex).padStart(3, '0');
    loadingTerminal.innerHTML = '';
    loadingBar.style.width = '0%';
    loadingStatus.textContent = 'Initializing...';

    const result = buildValidatedStage(stageIndex);
    const aiSummary = result.aiSummary;
    const shortestEtaLabel = Number.isFinite(result.validation.shortestEta) ? result.validation.shortestEta.toFixed(2) : 'n/a';
    const messages = [
        { t: 0, text: `$ hotfix build stage_${String(stageIndex).padStart(3, '0')} --archetype ${result.archetypeId}`, cls: 'lt-info' },
        { t: 350, text: `[COMPILER]: Loading archetype ${result.archetypeName}...`, cls: 'lt-system', pct: 12 },
        { t: 700, text: `[AI]: Cleared stages in profile: ${aiSummary.clearedStages}`, cls: 'lt-ai', pct: 24 },
        { t: 1050, text: `[AI]: Preferred lane => ${aiSummary.preferredLane.toUpperCase()}`, cls: 'lt-ai', pct: 34 },
        { t: 1400, text: `[AI]: ${aiSummary.tendencyText}`, cls: 'lt-warning', pct: 46 },
        { t: 1750, text: `[LEVELER]: Tier ${result.tier + 1} | Budget ${result.bugBudget} bug(s)`, cls: 'lt-system', pct: 58 },
        { t: 2100, text: `[VALIDATOR]: Checking route graph...`, cls: 'lt-system', pct: 72 },
        { t: 2500, text: `[VALIDATOR]: Route OK (${shortestEtaLabel}s shortest ETA)`, cls: 'lt-success', pct: 86 },
        { t: 2900, text: `[SYSTEM]: Stage ${stageIndex} ready. Deploying runtime...`, cls: 'lt-success', pct: 100 },
    ];

    if (result.isTimeTrial) {
        messages.splice(5, 0, {
            t: 1600,
            text: `[WATCHDOG]: LIMITED TIME STAGE - ${result.timeLimit}s`,
            cls: 'lt-error',
            pct: 52,
        });
    }

    if (result.meta.removedBugs > 0) {
        messages.splice(messages.length - 2, 0, {
            t: 2250,
            text: `[VALIDATOR]: Removed ${result.meta.removedBugs} bug(s) to preserve a valid route.`,
            cls: 'lt-warning',
            pct: 78,
        });
    }

    if (result.meta.fallbackLevel === 1) {
        messages.splice(5, 0, {
            t: 1600,
            text: `[SYSTEM]: Primary archetype failed. Switching to fallback build.`,
            cls: 'lt-warning',
            pct: 50,
        });
    } else if (result.meta.fallbackLevel === 2) {
        messages.splice(5, 0, {
            t: 1600,
            text: `[SYSTEM]: Escalating to safe fallback build.`,
            cls: 'lt-error',
            pct: 50,
        });
    }

    let messageIndex = 0;
    const startMs = performance.now();

    function tick() {
        if (gameState !== 'loading') return;
        const elapsed = performance.now() - startMs;

        while (messageIndex < messages.length && elapsed >= messages[messageIndex].t) {
            const message = messages[messageIndex];
            const element = document.createElement('div');
            element.className = `lt-entry ${message.cls}`;
            element.textContent = message.text;
            loadingTerminal.appendChild(element);
            loadingTerminal.scrollTop = loadingTerminal.scrollHeight;
            if (message.pct !== undefined) {
                loadingBar.style.width = `${message.pct}%`;
            }
            messageIndex++;
        }

        if (messageIndex >= messages.length) {
            loadingStatus.textContent = 'Deploying...';
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                callback(result);
            }, 400);
            return;
        }

        loadingStatus.textContent = messageIndex < 4 ? 'Compiling...' : messageIndex < 7 ? 'Profiling...' : 'Validating...';
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

// ============================================
// SECTION 14: PLAYER PHYSICS
// ============================================
function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function updatePlayer() {
    if (gameState !== 'playing') return;

    let inputX = 0;
    if (keys.a || keys.arrowleft) inputX -= 1;
    if (keys.d || keys.arrowright) inputX += 1;

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
                COLORS.playerDash,
                15,
                3
            );
        }
    } else {
        if (inputX !== 0) {
            player.vx += inputX * PLAYER_ACCEL;
            player.vx = clamp(player.vx, -PLAYER_SPEED, PLAYER_SPEED);
            player.facingRight = inputX > 0;
        } else if (Math.abs(player.vx) < PLAYER_DECEL) {
            player.vx = 0;
        } else {
            player.vx -= Math.sign(player.vx) * PLAYER_DECEL;
        }
    }

    if (player.onGround) player.coyoteCounter = COYOTE_TIME;
    else player.coyoteCounter--;

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
                    player.y + player.height,
                    (Math.random() - 0.5) * 3,
                    -Math.random() * 2,
                    COLORS.playerGlow,
                    15,
                    2
                );
            }
        }
    }

    if (keys.w !== true && keys[' '] !== true && keys.Space !== true) {
        if (player.vy < -3) player.vy *= 0.85;
    }

    if ((keys.shift || keys.ShiftLeft || keys.ShiftRight) && player.dashCooldown <= 0 && player.dashTimer <= 0) {
        player.dashTimer = DASH_DURATION;
        player.dashCooldown = DASH_COOLDOWN;
        player.dashDirX = inputX !== 0 ? inputX : (player.facingRight ? 1 : -1);
        player.vy = 0;
        analytics.stageDashes++;
        analytics.totalDashes++;
        spawnExplosion(player.x + player.width / 2, player.y + player.height / 2, COLORS.playerDash, 10);
    }

    if (player.dashCooldown > 0) player.dashCooldown--;

    if (player.dashTimer <= 0) {
        player.vy += GRAVITY;
        if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
    }

    player.x += player.vx;
    for (const platform of platforms) {
        if (aabb(player.x, player.y, player.width, player.height, platform.x, platform.y, platform.w, platform.h)) {
            if (player.vx > 0) player.x = platform.x - player.width;
            else if (player.vx < 0) player.x = platform.x + platform.w;
            player.vx = 0;
        }
    }

    player.y += player.vy;
    player.onGround = false;
    for (const platform of platforms) {
        if (aabb(player.x, player.y, player.width, player.height, platform.x, platform.y, platform.w, platform.h)) {
            if (player.vy > 0) {
                player.y = platform.y - player.height;
                player.vy = 0;
                player.onGround = true;
            } else if (player.vy < 0) {
                player.y = platform.y + platform.h;
                player.vy = 0;
            }
        }
    }

    if (frameCount % 2 === 0) {
        player.trail.push({ x: player.x + player.width / 2, y: player.y + player.height / 2 });
        if (player.trail.length > 20) player.trail.shift();
    }

    if (player.onGround && Math.abs(player.vx) > 2 && frameCount % 4 === 0) {
        spawnParticle(
            player.x + player.width / 2 + (Math.random() - 0.5) * 8,
            player.y + player.height,
            -player.vx * 0.1 + (Math.random() - 0.5),
            -Math.random() * 1.5,
            COLORS.playerGlow,
            12,
            1.5
        );
    }

    if (frameCount % PATH_RECORD_INTERVAL === 0) {
        currentPath.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            t: performance.now() - runStartTime,
        });
        analytics.heightSamples.push(player.y / canvas.height);
        analytics.speedSamples.push(Math.abs(player.vx));
        if (analytics.heightSamples.length > 500) analytics.heightSamples.shift();
        if (analytics.speedSamples.length > 500) analytics.speedSamples.shift();
    }

    for (const obstacle of aiObstacles) {
        if (aabb(player.x + 2, player.y + 2, player.width - 4, player.height - 4, obstacle.x, obstacle.y, obstacle.w, obstacle.h)) {
            playerDeath(obstacle.type);
            return;
        }
    }

    if (aabb(player.x, player.y, player.width, player.height, goal.x, goal.y, goal.w, goal.h)) {
        playerWin();
        return;
    }

    if (player.y > canvas.height + 60) {
        playerDeath('void');
        return;
    }

    if (player.x < 0) {
        player.x = 0;
        player.vx = 0;
    }

    if (player.x + player.width > levelWidth) {
        player.x = levelWidth - player.width;
        player.vx = 0;
    }

    currentTime = performance.now() - runStartTime;
    hudTimer.textContent = formatTime(currentTime);
    statusLine.textContent = Math.round(player.y);
    statusCol.textContent = Math.round(player.x);

    if (player.x > maxDistanceThisRun) maxDistanceThisRun = player.x;

    if (isTimeTrial && timeLimit > 0 && currentTime / 1000 > timeLimit) {
        playerDeath('timeout');
    }
}

// ============================================
// SECTION 15: DEATH / WIN
// ============================================
function playerDeath(cause) {
    currentTime = performance.now() - runStartTime;
    gameState = 'dead';
    analytics.stageDeaths++;
    analytics.totalRuns++;

    aiProfile.recentDeaths.push({
        stageIndex: currentStage,
        cause,
        archetypeId: currentStageData ? currentStageData.archetypeId : 'unknown',
    });
    if (aiProfile.recentDeaths.length > 6) aiProfile.recentDeaths.shift();

    spawnExplosion(player.x + player.width / 2, player.y + player.height / 2, COLORS.deathZone, 20);
    deathOverlay.classList.remove('hidden');

    const deathMessages = {
        bug: 'Caught by a Bug patch. Exception thrown.',
        laser: 'Terminated by Laser firewall. Access denied.',
        spike: 'Impaled on Spike assertion. Stack trace lost.',
        void: 'Segmentation fault. Player fell out of scope.',
        timeout: `Process timed out after ${timeLimit}s. Killed by watchdog.`,
    };

    const distPct = getDistancePercent();
    const score = calculateScore(currentStage, distPct);

    deathMessage.textContent = deathMessages[cause] || 'Process terminated unexpectedly.';
    deathEncouragement.textContent = pickEncouragement();
    deathScore.textContent = `Run ended at Stage ${currentStage} | Distance ${distPct}% | Score ${score}`;

    logConsole(`[ERROR]: ${deathMessages[cause] || 'Unknown error'}`, 'error');
    logConsole(`[SYSTEM]: Run failed at stage ${currentStage}. Restarting from stage 1 on rerun.`, 'system');
}

function playerWin() {
    currentTime = performance.now() - runStartTime;
    gameState = 'won';
    analytics.totalRuns++;
    analytics.stagesCompleted++;

    if (currentTime < bestTime) {
        bestTime = currentTime;
        hudBest.textContent = formatTime(bestTime);
        logConsole(`[SYSTEM]: New best split: ${formatTime(bestTime)}`, 'success');
    }

    if (analytics.stagesCompleted > 1 && analytics.avgCompletionTime > 0) {
        analytics.avgCompletionTime = (analytics.avgCompletionTime + currentTime) / 2;
    } else {
        analytics.avgCompletionTime = currentTime;
    }

    learnFromClearedStage(currentStageData, currentPath);

    const aiSummary = computeAIProfileSummary();
    spawnExplosion(goal.x + goal.w / 2, goal.y + goal.h / 2, COLORS.goal, 24);
    winOverlay.classList.remove('hidden');
    winTime.textContent = formatTime(currentTime);
    winMessage.textContent = `Stage ${currentStage} cleared. AI confidence ${Math.round(aiSummary.confidence * 100)}%. Next build incoming.`;

    logConsole(`[SYSTEM]: Stage ${currentStage} cleared in ${formatTime(currentTime)}.`, 'success');
    logConsole(`[AI]: Profile updated. ${aiSummary.tendencyText}`, 'warning');
}

// ============================================
// SECTION 16: GAME FLOW
// ============================================
function resetCampaignState() {
    currentStage = 0;
    stageRunNumber = 0;
    totalRunNumber = 0;
    bestTime = Infinity;
    runStartTime = 0;
    currentTime = 0;
    frameCount = 0;
    levelWidth = 0;
    timeLimit = 0;
    isTimeTrial = false;
    currentStageData = null;
    platforms = [];
    aiObstacles = [];
    currentPath = [];
    particles = [];
    maxDistanceThisRun = 0;
    hudBest.textContent = '--:--.---';
    resetAnalytics();
    resetAIProfile();
}

function startGame() {
    if (gameState !== 'title') return;

    playerName = (playerNameInput.value.trim() || 'anonymous').substring(0, 16);
    localStorage.setItem('hotfix_player_name', playerName);

    titleScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    stageAlert.classList.add('hidden');
    loadingOverlay.classList.add('hidden');
    resizeCanvas();

    consoleOutput.innerHTML = '';
    logConsole('[SYSTEM]: Initializing endless runtime...', 'system');
    logConsole('[AI]: Archetype library online. Adaptive counters enabled.', 'ai');
    logConsole('-'.repeat(40), 'info');

    resetCampaignState();
    advanceToNextStage();
}

function applyStageResult(stageData) {
    currentStageData = stageData;
    platforms = stageData.platforms;
    goal = stageData.goal;
    spawnPoint = stageData.spawn;
    levelWidth = stageData.levelWidth;
    timeLimit = stageData.timeLimit;
    isTimeTrial = stageData.isTimeTrial;
    aiObstacles = stageData.obstacles.slice();
    currentPath = [];
    previousPaths = [];
    lastArchetypeId = stageData.archetypeId;
}

function startRun() {
    stageRunNumber = 1;
    totalRunNumber++;
    gameState = 'playing';

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

    analytics.stageJumps = 0;
    analytics.stageDashes = 0;
    analytics.stageDeaths = 0;

    currentPath = [];
    frameCount = 0;
    runStartTime = performance.now();
    particles = [];
    maxDistanceThisRun = spawnPoint.x;
    camera.x = 0;

    hudStage.textContent = String(currentStage).padStart(3, '0') + (isTimeTrial ? ' T' : '');
    hudRun.textContent = `#${String(totalRunNumber).padStart(3, '0')}`;
    hudVersion.textContent = `v${currentStage}.${currentStageData.tier + 1}.${aiObstacles.length}`;
    hudPatches.textContent = String(aiObstacles.length);
    hudTimer.textContent = '00:00.000';

    logConsole(`[SYSTEM]: === STAGE ${currentStage}${isTimeTrial ? ' [LIMITED TIME]' : ''} ===`, 'system');
    logConsole(`[SYSTEM]: Archetype ${currentStageData.archetypeName} | Budget ${currentStageData.bugBudget} | Live ${aiObstacles.length}`, 'system');
    if (isTimeTrial) {
        logConsole(`[WARNING]: LIMITED TIME STAGE - clear in ${timeLimit}s.`, 'warning');
    }
}

function advanceToNextStage() {
    currentStage++;
    const bootStage = result => {
        applyStageResult(result);
        showLimitedTimeStageAlert(result, startRun);
    };

    if (currentStage === 1) {
        bootStage(buildValidatedStage(1));
    } else {
        showLoadingScreen(currentStage, bootStage);
    }
}

function restartCampaign() {
    deathOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
    stageAlert.classList.add('hidden');
    loadingOverlay.classList.add('hidden');
    resetCampaignState();
    advanceToNextStage();
}

function handleRespawn() {
    deathOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');

    if (gameState === 'won') {
        advanceToNextStage();
    } else if (gameState === 'dead') {
        restartCampaign();
    }
}

function returnToTitle() {
    gameState = 'title';
    deathOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
    stageAlert.classList.add('hidden');
    loadingOverlay.classList.add('hidden');
    gameScreen.classList.add('hidden');
    titleScreen.classList.remove('hidden');
}

function quitAndSave() {
    const distPct = getDistancePercent();
    const score = calculateScore(currentStage, distPct);
    saveScore(playerName, currentStage, distPct, score);
    logConsole(`[SYSTEM]: Score saved -> ${playerName}: Stage ${currentStage}, ${distPct}%, Score ${score}`, 'success');
    returnToTitle();
}

// ============================================
// SECTION 17: LEADERBOARD
// ============================================
const LB_KEY = 'hotfix_leaderboard';
const LB_MAX = 20;

function getDistancePercent() {
    if (levelWidth <= 0) return 0;
    const distance = Math.max(maxDistanceThisRun, player.x);
    return Math.min(100, Math.round((distance / levelWidth) * 100));
}

function calculateScore(stage, distPct) {
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
    const leaderboard = loadLeaderboard();
    leaderboard.push({
        name: name || 'anonymous',
        stage,
        dist: distPct,
        score,
        time: Date.now(),
    });
    leaderboard.sort((a, b) => b.score - a.score);
    while (leaderboard.length > LB_MAX) leaderboard.pop();
    try {
        localStorage.setItem(LB_KEY, JSON.stringify(leaderboard));
    } catch {
        // Ignore storage quota failures.
    }
}

function clearLeaderboard() {
    localStorage.removeItem(LB_KEY);
    renderLeaderboard();
}

function renderLeaderboard() {
    const leaderboard = loadLeaderboard();
    lbEntries.innerHTML = '';

    if (!leaderboard.length) {
        lbEntries.innerHTML = '<div class="lb-empty">No scores recorded yet. Go break some builds!</div>';
        return;
    }

    leaderboard.forEach((entry, index) => {
        const row = document.createElement('div');
        let className = 'lb-entry';
        if (index === 0) className += ' lb-gold';
        else if (index === 1) className += ' lb-silver';
        else if (index === 2) className += ' lb-bronze';
        if (entry.name === playerName && playerName !== 'anonymous') className += ' lb-self';
        row.className = className;

        const medal = index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : `${index + 1}`;
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
    const element = document.createElement('div');
    element.textContent = str;
    return element.innerHTML;
}

function showLeaderboard() {
    renderLeaderboard();
    leaderboardOverlay.classList.remove('hidden');
}

function hideLeaderboard() {
    leaderboardOverlay.classList.add('hidden');
}

// ============================================
// SECTION 18: RENDERING
// ============================================
function drawBackground() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gridSize = 40;
    const offsetX = camera.x % gridSize;

    ctx.lineWidth = 1;
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
    for (const platform of platforms) {
        const sx = platform.x - camera.x;
        const sy = platform.y;
        if (sx + platform.w < -20 || sx > canvas.width + 20) continue;

        ctx.fillStyle = COLORS.platform;
        ctx.fillRect(sx, sy, platform.w, platform.h);
        ctx.strokeStyle = COLORS.platformBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 0.5, sy + 0.5, platform.w - 1, platform.h - 1);

        let topColor = COLORS.platformTop;
        if (platform.role === 'shortcut') topColor = '#7ee787';
        else if (platform.role === 'floor') topColor = '#484f58';
        ctx.fillStyle = topColor;
        ctx.fillRect(sx, sy, platform.w, 2);

        ctx.fillStyle = 'rgba(88, 166, 255, 0.12)';
        const label = platform.role === 'shortcut'
            ? '// shortcut'
            : platform.role === 'floor'
                ? '// floor'
                : `${currentStageData ? currentStageData.archetypeId : 'plat'}`;
        ctx.fillText(label, sx + 5, sy + platform.h / 2 + 3);
    }
}

function drawGoal() {
    const sx = goal.x - camera.x;
    const pulse = Math.sin(frameCount * 0.08) * 0.3 + 0.7;

    ctx.globalAlpha = 0.15 * pulse;
    ctx.fillStyle = COLORS.goal;
    ctx.fillRect(sx - 8, goal.y - 8, goal.w + 16, goal.h + 16);
    ctx.globalAlpha = 0.25 * pulse;
    ctx.fillRect(sx - 4, goal.y - 4, goal.w + 8, goal.h + 8);

    ctx.globalAlpha = 0.3 + pulse * 0.4;
    ctx.fillStyle = COLORS.goal;
    ctx.fillRect(sx, goal.y, goal.w, goal.h);
    ctx.globalAlpha = 1;

    ctx.fillStyle = COLORS.goal;
    ctx.font = 'bold 10px "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('COMMIT', sx + goal.w / 2, goal.y - 8);
    ctx.fillText('{ }', sx + goal.w / 2, goal.y - 20);

    if (frameCount % 12 === 0) {
        spawnParticle(goal.x + Math.random() * goal.w, goal.y + goal.h, (Math.random() - 0.5) * 0.5, -0.5 - Math.random() * 1.5, COLORS.goal, 30, 2);
    }
}

function drawObstacles() {
    for (const obstacle of aiObstacles) {
        const sx = obstacle.x - camera.x;
        if (sx + obstacle.w < -20 || sx > canvas.width + 20) continue;

        const pulse = Math.sin(frameCount * 0.1 + obstacle.phase) * 0.2 + 0.8;

        if (obstacle.type === 'bug') {
            ctx.globalAlpha = 0.15 * pulse;
            ctx.fillStyle = COLORS.bugBlock;
            ctx.fillRect(sx - 4, obstacle.y - 4, obstacle.w + 8, obstacle.h + 8);
            ctx.globalAlpha = 0.8 + pulse * 0.2;
            ctx.fillRect(sx, obstacle.y, obstacle.w, obstacle.h);
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px "Fira Code", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('BUG', sx + obstacle.w / 2, obstacle.y + obstacle.h / 2 + 3);
        } else if (obstacle.type === 'laser') {
            ctx.globalAlpha = 0.12 * pulse;
            ctx.fillStyle = COLORS.laser;
            ctx.fillRect(sx - 6, obstacle.y, obstacle.w + 12, obstacle.h);
            ctx.globalAlpha = 0.6 + pulse * 0.4;
            ctx.fillRect(sx, obstacle.y, obstacle.w, obstacle.h);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.5 * pulse;
            ctx.fillRect(sx + 1, obstacle.y, obstacle.w - 2, obstacle.h);
            const scanY = obstacle.y + ((frameCount * 2 + obstacle.phase * 50) % obstacle.h);
            ctx.globalAlpha = 0.9;
            ctx.fillRect(sx - 2, scanY, obstacle.w + 4, 2);
        } else if (obstacle.type === 'spike') {
            ctx.globalAlpha = 0.12 * pulse;
            ctx.fillStyle = COLORS.spike;
            ctx.fillRect(sx - 4, obstacle.y - 4, obstacle.w + 8, obstacle.h + 8);
            ctx.globalAlpha = 0.8 + pulse * 0.2;
            const centerX = sx + obstacle.w / 2;
            ctx.beginPath();
            ctx.moveTo(centerX, obstacle.y);
            ctx.lineTo(sx + obstacle.w, obstacle.y + obstacle.h);
            ctx.lineTo(sx, obstacle.y + obstacle.h);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.globalAlpha = 0.7;
            ctx.font = 'bold 8px "Fira Code", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('!', centerX, obstacle.y + obstacle.h - 3);
        }
        ctx.globalAlpha = 1;
    }
}

function drawPreviousPath() {
    if (!previousPaths.length) return;

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

    for (let i = 0; i < player.trail.length; i++) {
        const trail = player.trail[i];
        ctx.globalAlpha = (i / player.trail.length) * 0.25;
        ctx.fillStyle = glow;
        ctx.fillRect(trail.x - camera.x - 4, trail.y - 5, 8, 10);
    }
    ctx.globalAlpha = 1;

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 4, player.y - 4, player.width + 8, player.height + 8);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(sx - 2, player.y - 2, player.width + 4, player.height + 4);
    ctx.globalAlpha = 1;

    ctx.fillStyle = glow;
    ctx.fillRect(sx, player.y, player.width, player.height);
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(sx + 3, player.y + 3, player.width - 6, player.height - 6);

    const eyeY = player.y + 7;
    ctx.fillStyle = glow;
    if (player.facingRight) {
        ctx.fillRect(sx + 8, eyeY, 3, 3);
        ctx.fillRect(sx + 12, eyeY, 3, 3);
    } else {
        ctx.fillRect(sx + 1, eyeY, 3, 3);
        ctx.fillRect(sx + 5, eyeY, 3, 3);
    }

    if (player.dashCooldown > 0) {
        const progress = 1 - player.dashCooldown / DASH_COOLDOWN;
        ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.fillRect(sx, player.y + player.height + 3, player.width * progress, 2);
    } else {
        ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
        ctx.fillRect(sx, player.y + player.height + 3, player.width, 2);
    }
}

function drawParticles() {
    for (const particle of particles) {
        ctx.globalAlpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - camera.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
}

function drawSpawnMarker() {
    if (!platforms.length) return;
    const sx = spawnPoint.x - 20 - camera.x;
    ctx.globalAlpha = 0.3 + Math.sin(frameCount * 0.05) * 0.1;
    ctx.fillStyle = COLORS.startZone;
    ctx.fillRect(sx, currentStageData.spawnPlatform.y - 35, 50, 35);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.startZone;
    ctx.font = '9px "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SPAWN', sx + 25, currentStageData.spawnPlatform.y - 40);
    ctx.textAlign = 'left';
}

function drawTimeLimitBar() {
    if (gameState !== 'playing' || !isTimeTrial || timeLimit <= 0) return;

    const progress = Math.min(currentTime / (timeLimit * 1000), 1);
    const barWidth = canvas.width - 60;
    const barX = 30;
    const barY = 14;

    ctx.fillStyle = 'rgba(48, 54, 61, 0.5)';
    ctx.fillRect(barX, barY, barWidth, 4);

    let color;
    if (progress < 0.5) color = COLORS.playerGlow;
    else if (progress < 0.8) color = COLORS.spike;
    else color = COLORS.bugBlock;

    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barWidth * progress, 4);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(barX + barWidth * progress - 1, barY, 2, 4);
    ctx.globalAlpha = 1;

    const remaining = Math.max(0, timeLimit - currentTime / 1000);
    ctx.font = '10px "Fira Code", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = progress > 0.8 ? COLORS.bugBlock : COLORS.playerGlow;
    ctx.fillText(`${remaining.toFixed(1)}s`, barX + barWidth, barY - 3);

    ctx.textAlign = 'left';
    ctx.fillStyle = progress > 0.8 ? COLORS.bugBlock : COLORS.spike;
    if (progress > 0.8) {
        ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.3) * 0.5;
    }
    ctx.fillText('LIMITED TIME', barX, barY - 3);
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
    for (const platform of platforms) {
        const px = mmX + platform.x * scale;
        const pw = Math.max(2, platform.w * scale);
        ctx.fillRect(px, mmY + 4, pw, platform.role === 'floor' ? 4 : 3);
    }

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.strokeRect(mmX + camera.x * scale, mmY, canvas.width * scale, mmH);

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
    if (currentTime < 2200 && gameState === 'playing' && currentStageData) {
        const alpha = Math.max(0, 1 - currentTime / 2200);
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 28px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`STAGE ${currentStage}`, canvas.width / 2, canvas.height / 2 - 46);

        ctx.font = '13px "Fira Code", monospace';
        ctx.fillStyle = '#8b949e';
        ctx.globalAlpha = alpha * 0.65;
        const limitText = currentStageData.isTimeTrial ? `${currentStageData.timeLimit}s watchdog` : 'No limit';
        ctx.fillText(`${currentStageData.archetypeName} | ${aiObstacles.length} bug(s) | ${limitText}`, canvas.width / 2, canvas.height / 2 - 12);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }
}

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

// ============================================
// SECTION 19: RESIZE + INIT
// ============================================
function resizeCanvas() {
    const area = $('game-area');
    if (!area) return;
    const rect = area.getBoundingClientRect();
    canvas.width = rect.width - CONSOLE_WIDTH;
    canvas.height = rect.height;
}

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const savedName = localStorage.getItem('hotfix_player_name');
    if (savedName) playerNameInput.value = savedName;

    runStageLibrarySelfCheck();

    window.addEventListener('keydown', event => {
        if (document.activeElement === playerNameInput) return;

        keys[event.key.toLowerCase()] = true;
        keys[event.code] = true;

        if (event.key === 'Enter' && gameState === 'title') startGame();
        if ((event.key === 'r' || event.key === 'R') && (gameState === 'dead' || gameState === 'won')) handleRespawn();
        if ((event.key === 'q' || event.key === 'Q') && gameState === 'dead') quitAndSave();
        if ((event.key === 'w' || event.key === ' ') && gameState === 'playing') jumpBufferCounter = JUMP_BUFFER;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
        if (event.key === 'Escape') hideLeaderboard();
    });

    window.addEventListener('keyup', event => {
        keys[event.key.toLowerCase()] = false;
        keys[event.code] = false;
    });

    startBtn.addEventListener('click', startGame);
    leaderboardBtn.addEventListener('click', showLeaderboard);
    lbCloseBtn.addEventListener('click', hideLeaderboard);
    lbClearBtn.addEventListener('click', () => {
        if (confirm('Clear all scores?')) clearLeaderboard();
    });

    requestAnimationFrame(gameLoop);
}

init();
