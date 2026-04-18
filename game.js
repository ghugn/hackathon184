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
const DASH_SPEED = 15;
const DASH_DURATION = 6;
const DASH_COOLDOWN = 40;
const MAX_FALL_SPEED = 14;
const PATH_RECORD_INTERVAL = 3;
const COYOTE_TIME = 6;
const JUMP_BUFFER = 8;

const MAX_JUMP_H = 220;
const MAX_DASH_H = 280;
const MAX_JUMP_V = 118;

const CONSOLE_WIDTH = 320;
const STAGE_ALERT_DURATION = 1800;
const LOADING_STEP_MS = 520;
const LOADING_DEPLOY_DELAY_MS = 700;
const REACH_SIM_FRAMES = 72;
const SAFE_LANDING_MARGIN = 8;
const REACH_DASH_STARTS = [6, 8, 10, 12];
const TESTER_PROFILES = [
    { id: 'scout', label: 'Scout', gapBias: 0.9, riseBias: 0.92, comboBias: 0.9, marginBias: 1.12, landingBias: 1.04 },
    { id: 'runner', label: 'Runner', gapBias: 1.02, riseBias: 1.04, comboBias: 1.03, marginBias: 0.92, landingBias: 0.94 },
    { id: 'architect', label: 'Architect', gapBias: 0.95, riseBias: 0.98, comboBias: 0.96, marginBias: 1.05, landingBias: 1.02 },
];
const FLOOR_HEIGHT = 30;
const SAFE_FALLBACK_ARCHETYPE_ID = 'recovery-floor';
const AUDIO_PREF_KEY = 'hotfix_audio_muted';
const SETTINGS_KEY = 'hotfix_settings';
const INTRO_STATE_KEY = 'hotfix_intro_state';
const FIRST_TIME_ALERT_DURATION = 2150;
const DOUBLE_JUMP_UNLOCK_STAGE = 10;
const PLAYER_AIR_JUMPS = 1;
const ENCOURAGEMENT_LINES = [
    'Great effort!',
    'Good luck next time.',
    'Nice try, rerun incoming.',
    'You almost had it.',
    'Keep pushing, the AI is learning too.',
    'Another run, better route.',
];
const DEFAULT_SETTINGS = {
    obstacleAlerts: true,
    abilityAlerts: true,
};
const INTRO_COPY = {
    obstacles: {
        bug: {
            title: 'NEW HAZARD',
            subtitle: 'BUG PATCH',
            body: 'Direct contact kills. Stay off the glowing red block and use the free side of the platform.',
        },
        spike: {
            title: 'NEW HAZARD',
            subtitle: 'SPIKE ASSERTION',
            body: 'Sharp tips punish sloppy landings. Aim for the clear side before committing the jump.',
        },
        laser: {
            title: 'NEW HAZARD',
            subtitle: 'LASER FIREWALL',
            body: 'The beam blocks your route. Dash or route around it before your landing closes.',
        },
        turret: {
            title: 'NEW HAZARD',
            subtitle: 'SENTRY TURRET',
            body: 'It fires live rounds on a rhythm. Bait a shot, then move through the lane cleanly.',
        },
        crawler: {
            title: 'NEW HAZARD',
            subtitle: 'MOVING CRAWLER',
            body: 'This one patrols the platform. Watch the sweep, then cross when it opens.',
        },
    },
    abilities: {
        'double-jump': {
            title: 'ABILITY ONLINE',
            subtitle: 'DOUBLE JUMP',
            body: 'You now get one extra jump in the air. Use it to recover late or take harder lines.',
        },
    },
    drones: {
        drone: {
            title: 'NEW THREAT',
            subtitle: 'PATROL DRONE',
            body: 'Flying drones track your position and fire shots. Keep moving and use dash to dodge.',
        },
    },
};
const EXTERNAL_STAGE_LIBRARY = window.AI_STAGE_LIBRARY && Array.isArray(window.AI_STAGE_LIBRARY.blueprints)
    ? window.AI_STAGE_LIBRARY
    : null;
const EXTERNAL_STAGE_BLUEPRINTS = EXTERNAL_STAGE_LIBRARY?.blueprints || [];
const EXTERNAL_STAGE_BLUEPRINT_MAP = new Map(EXTERNAL_STAGE_BLUEPRINTS.map(blueprint => [blueprint.stageIndex, blueprint]));

const COLORS = {
    bg: '#060914',
    gridLine: 'rgba(64, 247, 255, 0.04)',
    gridLineMajor: 'rgba(255, 113, 206, 0.08)',
    platform: '#121c2a',
    platformBorder: '#35506d',
    platformTop: '#66f4ff',
    player: '#ffffff',
    playerGlow: '#40f7ff',
    playerDash: '#ff71ce',
    goal: '#8bff72',
    goalGlow: 'rgba(139, 255, 114, 0.32)',
    bugBlock: '#ff5d73',
    laser: '#ff88f6',
    spike: '#ffbe5c',
    pathTrail: 'rgba(64, 247, 255, 0.1)',
    deathZone: '#ff335f',
    lineNumbers: 'rgba(137, 175, 208, 0.24)',
    startZone: '#4fdcff',
    minimap: 'rgba(93, 229, 255, 0.36)',
    minimapPlayer: '#40f7ff',
    minimapGoal: '#8bff72',
};

const VISUAL_THEMES = [
    {
        id: 'aurora-grid',
        skyTop: '#050814',
        skyBottom: '#170f30',
        haze: '#ff5fb0',
        hazeSecondary: '#40f7ff',
        sun: '#ff9f5c',
        cityFar: '#0b1427',
        cityMid: '#13243e',
        cityNear: '#1b3657',
        windows: '#ff96f5',
        windowsAlt: '#7fffd4',
        accent: '#40f7ff',
        accentSoft: '#6fe7ff',
        platformMain: '#152030',
        platformEdge: '#355577',
        floorTop: '#ff9f5c',
    },
    {
        id: 'night-market',
        skyTop: '#070c18',
        skyBottom: '#24133a',
        haze: '#ff7a59',
        hazeSecondary: '#4ef2d0',
        sun: '#ffd95c',
        cityFar: '#101427',
        cityMid: '#1a2841',
        cityNear: '#25324c',
        windows: '#ffd166',
        windowsAlt: '#64ffda',
        accent: '#61f0ff',
        accentSoft: '#ffb36b',
        platformMain: '#172132',
        platformEdge: '#42556c',
        floorTop: '#f6c760',
    },
    {
        id: 'violet-monsoon',
        skyTop: '#070615',
        skyBottom: '#160d2a',
        haze: '#b86cff',
        hazeSecondary: '#56d2ff',
        sun: '#ff7ac3',
        cityFar: '#110f22',
        cityMid: '#1d1d35',
        cityNear: '#29314d',
        windows: '#9dfffb',
        windowsAlt: '#ff7edb',
        accent: '#78e6ff',
        accentSoft: '#d08fff',
        platformMain: '#151c2c',
        platformEdge: '#485282',
        floorTop: '#c283ff',
    },
    {
        id: 'acid-terminal',
        skyTop: '#071113',
        skyBottom: '#122328',
        haze: '#73ff93',
        hazeSecondary: '#3cc0ff',
        sun: '#9dff75',
        cityFar: '#08171b',
        cityMid: '#112931',
        cityNear: '#183742',
        windows: '#b2ff59',
        windowsAlt: '#58efff',
        accent: '#52ffcf',
        accentSoft: '#80ffef',
        platformMain: '#132229',
        platformEdge: '#35665d',
        floorTop: '#93ff78',
    },
];

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
const stageAlertBody = $('stage-alert-body');
const startBtn = $('start-btn');
const audioToggle = $('audio-toggle');
const obstacleAlertToggle = $('toggle-obstacle-alerts');
const abilityAlertToggle = $('toggle-ability-alerts');
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
let adminMode = false; // 🎮 Admin mode: handle = 'admin12321' → hazards disabled, auto-win
let userSettings = loadUserSettings();
let introState = loadIntroState();
let abilityState = createAbilityState();

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
    airJumpsRemaining: 0,
    trail: [],
};

let spawnPoint = { x: 80, y: 0 };

// ============================================
// SECTION 7: LEVEL DATA
// ============================================
let platforms = [];
let goal = { x: 0, y: 0, w: 40, h: 50 };
let aiObstacles = [];
let obstacleProjectiles = [];
let drones = [];
let droneProjectiles = [];

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

function loadUserSettings() {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (!stored) return { ...DEFAULT_SETTINGS };
        return {
            ...DEFAULT_SETTINGS,
            ...JSON.parse(stored),
        };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function saveUserSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(userSettings));
    } catch {
        // Ignore storage failures.
    }
}

function applySettingsToMenu() {
    if (obstacleAlertToggle) obstacleAlertToggle.checked = !!userSettings.obstacleAlerts;
    if (abilityAlertToggle) abilityAlertToggle.checked = !!userSettings.abilityAlerts;
}

function getIntroStateKey(name) {
    return INTRO_STATE_KEY + '_' + (name || 'anonymous');
}

function loadIntroState(name) {
    try {
        const key = getIntroStateKey(name);
        const stored = localStorage.getItem(key);
        const parsed = stored ? JSON.parse(stored) : {};
        return {
            obstacles: { ...(parsed.obstacles || {}) },
            abilities: { ...(parsed.abilities || {}) },
        };
    } catch {
        return {
            obstacles: {},
            abilities: {},
        };
    }
}

function saveIntroState() {
    try {
        const key = getIntroStateKey(playerName);
        localStorage.setItem(key, JSON.stringify(introState));
    } catch {
        // Ignore storage failures.
    }
}

function createAbilityState() {
    return {
        doubleJumpUnlocked: false,
    };
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
const directorState = {
    runSerial: 0,
    buildSerial: 0,
    recentArchetypes: [],
    recentModes: [],
};

function resetAIProfile() {
    aiProfile = createAIProfile();
    previousPaths = [];
    lastArchetypeId = null;
}

function beginCampaignRun() {
    directorState.runSerial++;
}

function getExternalStageBlueprint(stageIndex) {
    if (!EXTERNAL_STAGE_BLUEPRINTS.length || stageIndex <= 0) return null;

    const exact = EXTERNAL_STAGE_BLUEPRINT_MAP.get(stageIndex);
    const baseBlueprint = exact || EXTERNAL_STAGE_BLUEPRINTS[(stageIndex - 1) % EXTERNAL_STAGE_BLUEPRINTS.length];
    if (!baseBlueprint) return null;

    const cycle = exact ? 0 : Math.floor((stageIndex - 1) / EXTERNAL_STAGE_BLUEPRINTS.length);
    return {
        ...baseBlueprint,
        stageIndex,
        cycle,
        remixLevel: clamp((baseBlueprint.remixLevel ?? 0.28) + cycle * 0.04, 0.12, 0.96),
        gapScale: clamp((baseBlueprint.gapScale ?? 1) + cycle * 0.035, 0.72, 1.4),
        riseScale: clamp((baseBlueprint.riseScale ?? 1) + cycle * 0.025, 0.74, 1.32),
        widthScale: clamp((baseBlueprint.widthScale ?? 1) - cycle * 0.015, 0.82, 1.2),
        bugBudgetBias: (baseBlueprint.bugBudgetBias ?? 0) + Math.min(cycle, 3),
        timeLimit: baseBlueprint.timeTrial
            ? Math.max(18, (baseBlueprint.timeLimit ?? 32) - cycle)
            : 0,
        label: cycle > 0 ? `${baseBlueprint.label} Mk.${cycle + 1}` : baseBlueprint.label,
    };
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

function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function createRng(seed) {
    let state = seed >>> 0;

    const next = () => {
        state += 0x6D2B79F5;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    return {
        next,
        range(min, max) {
            return min + next() * (max - min);
        },
        int(min, max) {
            return Math.floor(this.range(min, max + 1));
        },
        chance(probability) {
            return next() < probability;
        },
        pick(list) {
            return list[this.int(0, list.length - 1)];
        },
    };
}

function weightedPick(rng, entries, fallback = null) {
    const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
    if (total <= 0) {
        return fallback ?? entries[0].value;
    }

    let roll = rng.range(0, total);
    for (const entry of entries) {
        const weight = Math.max(0, entry.weight);
        if (roll <= weight) return entry.value;
        roll -= weight;
    }

    return entries[entries.length - 1].value;
}

function registerDirectorMemory(stageData) {
    directorState.recentArchetypes.push(stageData.archetypeId);
    directorState.recentModes.push(stageData.director.mode);
    if (directorState.recentArchetypes.length > 10) directorState.recentArchetypes.shift();
    if (directorState.recentModes.length > 10) directorState.recentModes.shift();
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

function hashNoise(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
    return value - Math.floor(value);
}

function hexToRgba(hex, alpha = 1) {
    const normalized = hex.replace('#', '');
    const chunkSize = normalized.length === 3 ? 1 : 2;
    const values = [];
    for (let i = 0; i < normalized.length; i += chunkSize) {
        const chunk = normalized.slice(i, i + chunkSize);
        const expanded = chunkSize === 1 ? chunk + chunk : chunk;
        values.push(parseInt(expanded, 16));
    }
    return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
}

function getVisualTheme(stageData = currentStageData) {
    if (!stageData) return VISUAL_THEMES[0];
    const signature = `${stageData.archetypeId || 'stage'}:${stageData.variantName || 'variant'}:${stageData.tier || 0}:${stageData.isTimeTrial ? 1 : 0}`;
    const index = (hashString(signature) + currentStage * 7 + directorState.runSerial * 3) % VISUAL_THEMES.length;
    return VISUAL_THEMES[index];
}

function createAudioManager() {
    let ctx = null;
    let master = null;
    let musicBus = null;
    let sfxBus = null;
    let noiseBuffer = null;
    let themeTimer = null;
    let nextThemeTime = 0;
    let themeStep = 0;
    let unlocked = false;
    let muted = false;

    try {
        muted = localStorage.getItem(AUDIO_PREF_KEY) === '1';
    } catch {
        muted = false;
    }

    const bassLine = [40, null, 40, 40, 43, null, 43, 35, 38, null, 38, 40, 47, 47, 43, 35];
    const arpPattern = [88, 91, 95, 100, 91, 95, 100, 103, 86, 90, 93, 98, 90, 93, 98, 102];
    const leadPattern = [null, 83, null, 88, null, 91, 88, 83, null, 81, null, 83, 88, 91, 95, 98];
    const hatPattern = [1, 0.45, 0.7, 0.42, 1, 0.48, 0.76, 0.4, 1, 0.45, 0.72, 0.42, 1, 0.5, 0.8, 0.44];
    const padChords = [
        [52, 59, 64],
        [50, 57, 62],
        [47, 54, 59],
        [45, 52, 57],
    ];

    function updateToggleLabel() {
        if (!audioToggle) return;
        audioToggle.textContent = muted ? 'AUDIO OFF' : unlocked ? 'AUDIO ON' : 'AUDIO ARM';
        audioToggle.classList.toggle('audio-muted', muted);
    }

    function hasAudioSupport() {
        return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
    }

    function midiToFreq(midi) {
        return 440 * 2 ** ((midi - 69) / 12);
    }

    function createNoiseBuffer(audioCtx) {
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    function ensureContext() {
        if (ctx || !hasAudioSupport()) return ctx;

        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioCtor();
        master = ctx.createGain();
        musicBus = ctx.createGain();
        sfxBus = ctx.createGain();

        const musicFilter = ctx.createBiquadFilter();
        musicFilter.type = 'lowpass';
        musicFilter.frequency.value = 2200;
        musicFilter.Q.value = 0.5;

        musicBus.connect(musicFilter);
        musicFilter.connect(master);
        sfxBus.connect(master);
        master.connect(ctx.destination);

        master.gain.value = 0;
        musicBus.gain.value = 0.18;
        sfxBus.gain.value = 0.72;
        noiseBuffer = createNoiseBuffer(ctx);

        return ctx;
    }

    function scheduleDispose(source, ...nodes) {
        if (!source) return;
        source.onended = () => {
            [source, ...nodes].forEach(node => {
                if (node && typeof node.disconnect === 'function') node.disconnect();
            });
        };
    }

    function playTone(type, frequency, start, duration, options = {}) {
        if (!ctx || muted || ctx.state === 'suspended') return;

        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, start);
        if (options.endFreq) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(30, options.endFreq), start + duration);
        }
        if (options.detune) {
            osc.detune.value = options.detune;
        }

        filter.type = options.filterType || 'lowpass';
        filter.frequency.setValueAtTime(options.filter || 1800, start);
        filter.Q.value = options.q || 0.8;

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, options.gain || 0.06), start + (options.attack || 0.01));
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + (options.release || 0.14));

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(options.bus || sfxBus);

        osc.start(start);
        osc.stop(start + duration + (options.release || 0.14) + 0.02);
        scheduleDispose(osc, filter, gain);
    }

    function playNoise(start, duration, options = {}) {
        if (!ctx || muted || ctx.state === 'suspended' || !noiseBuffer) return;

        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        source.buffer = noiseBuffer;
        filter.type = options.filterType || 'bandpass';
        filter.frequency.setValueAtTime(options.filter || 1400, start);
        filter.Q.value = options.q || 0.9;

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, options.gain || 0.04), start + (options.attack || 0.005));
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + (options.release || 0.08));

        source.connect(filter);
        filter.connect(gain);
        gain.connect(options.bus || sfxBus);

        source.start(start);
        source.stop(start + duration + (options.release || 0.08) + 0.02);
        scheduleDispose(source, filter, gain);
    }

    function playKick(start, intensity = 1) {
        playTone('sine', 58, start, 0.11, {
            gain: 0.15 * intensity,
            attack: 0.002,
            release: 0.12,
            filter: 180,
            endFreq: 34,
            bus: musicBus,
        });
        playNoise(start, 0.02, {
            gain: 0.01 * intensity,
            filter: 500,
            q: 0.6,
            release: 0.03,
            bus: musicBus,
        });
    }

    function playSnare(start, intensity = 1) {
        playNoise(start, 0.045, {
            gain: 0.034 * intensity,
            filter: 2200,
            q: 0.8,
            release: 0.1,
            bus: musicBus,
        });
        playTone('triangle', 220, start, 0.035, {
            gain: 0.012 * intensity,
            attack: 0.002,
            release: 0.07,
            filter: 1400,
            endFreq: 132,
            bus: musicBus,
        });
    }

    function playHiHat(start, intensity = 1, open = false) {
        playNoise(start, open ? 0.03 : 0.015, {
            gain: (open ? 0.016 : 0.01) * intensity,
            filterType: 'highpass',
            filter: open ? 5200 : 6400,
            q: 0.55,
            release: open ? 0.08 : 0.03,
            bus: musicBus,
        });
    }

    function applySidechainPulse(start, intensity = 1) {
        if (!musicBus) return;
        const baseLevel = getMusicLevel();
        musicBus.gain.setValueAtTime(Math.max(0.035, baseLevel * (0.42 - intensity * 0.04)), start);
        musicBus.gain.setTargetAtTime(baseLevel, start + 0.02, 0.08);
    }

    function getMusicLevel() {
        if (muted) return 0;
        if (gameState === 'dead') return 0.08;
        if (gameState === 'won') return 0.2;
        if (gameState === 'loading') return 0.14;
        if (gameState === 'title') return 0.16;
        return isTimeTrial ? 0.3 : 0.24;
    }

    function scheduleThemeStep(step, when) {
        if (!musicBus || muted) return;

        const bassNote = bassLine[step % bassLine.length];
        if (bassNote !== null) {
            const freq = midiToFreq(bassNote);
            playTone('sawtooth', freq, when, 0.18, {
                gain: 0.075,
                attack: 0.004,
                release: 0.12,
                filter: 680,
                endFreq: freq * 0.97,
                bus: musicBus,
            });
            playTone('square', freq / 2, when, 0.12, {
                gain: 0.028,
                attack: 0.003,
                release: 0.08,
                filter: 260,
                endFreq: (freq / 2) * 0.95,
                bus: musicBus,
            });
        }

        const kickSteps = step === 0 || step === 6 || step === 8 || step === 12 || (isTimeTrial && step === 14);
        if (kickSteps) {
            const kickIntensity = step === 0 || step === 8 ? 1 : 0.82;
            playKick(when, gameState === 'playing' ? kickIntensity : kickIntensity * 0.7);
            applySidechainPulse(when, kickIntensity);
        }

        if (step === 4 || step === 12) {
            playSnare(when, isTimeTrial ? 1.1 : 0.9);
        }

        playHiHat(when, hatPattern[step % hatPattern.length], step === 7 || step === 15);

        if (step % 2 === 0 || step === 3 || step === 11) {
            const patternOffset = isTimeTrial ? 4 : 0;
            const arpNote = arpPattern[(step + patternOffset) % arpPattern.length];
            playTone('triangle', midiToFreq(arpNote), when + 0.025, 0.1, {
                gain: isTimeTrial ? 0.046 : 0.034,
                attack: 0.003,
                release: 0.06,
                filter: isTimeTrial ? 3600 : 3000,
                bus: musicBus,
            });
        }

        if (step % 8 === 0) {
            const chord = padChords[Math.floor(step / 4) % padChords.length];
            chord.forEach((note, index) => {
                playTone('triangle', midiToFreq(note), when, 0.42, {
                    gain: 0.026,
                    attack: 0.04,
                    release: 0.18,
                    filter: 1600,
                    detune: index * 6,
                    bus: musicBus,
                });
            });
        }

        const leadNote = leadPattern[step % leadPattern.length];
        if (leadNote !== null && (gameState === 'playing' || isTimeTrial)) {
            const leadFreq = midiToFreq(isTimeTrial ? leadNote + 2 : leadNote);
            playTone('sawtooth', leadFreq, when + 0.01, 0.11, {
                gain: isTimeTrial ? 0.032 : 0.022,
                attack: 0.005,
                release: 0.1,
                filter: isTimeTrial ? 4200 : 3400,
                endFreq: leadFreq * 0.992,
                bus: musicBus,
            });
            playTone('triangle', leadFreq / 2, when + 0.01, 0.08, {
                gain: isTimeTrial ? 0.012 : 0.009,
                attack: 0.004,
                release: 0.08,
                filter: 1800,
                bus: musicBus,
            });
        }
    }

    function scheduleThemeLoop() {
        if (!ctx || muted || ctx.state === 'suspended') return;
        const tempo = isTimeTrial ? 136 : 128;
        const stepDuration = 60 / tempo / 4;
        while (nextThemeTime < ctx.currentTime + 0.25) {
            scheduleThemeStep(themeStep, nextThemeTime);
            nextThemeTime += stepDuration;
            themeStep = (themeStep + 1) % 16;
        }
    }

    function startThemeLoop() {
        if (!ctx || muted || themeTimer) return;
        nextThemeTime = Math.max(ctx.currentTime + 0.08, nextThemeTime || 0);
        themeTimer = setInterval(scheduleThemeLoop, 90);
    }

    function stopThemeLoop() {
        if (!themeTimer) return;
        clearInterval(themeTimer);
        themeTimer = null;
    }

    function syncMix() {
        updateToggleLabel();
        if (!ctx || !master || !musicBus) return;
        const now = ctx.currentTime;
        master.gain.setTargetAtTime(muted ? 0.0001 : 0.92, now, 0.04);
        musicBus.gain.setTargetAtTime(getMusicLevel(), now, 0.12);
        if (muted) stopThemeLoop();
        else startThemeLoop();
    }

    function unlock() {
        const audioCtx = ensureContext();
        updateToggleLabel();
        if (!audioCtx) return;
        unlocked = true;
        audioCtx.resume().catch(() => {});
        startThemeLoop();
        syncMix();
    }

    function persistMute() {
        try {
            localStorage.setItem(AUDIO_PREF_KEY, muted ? '1' : '0');
        } catch {
            // Ignore persistence failures.
        }
    }

    function playUiClick() {
        if (!ctx || muted) return;
        const now = ctx.currentTime;
        playTone('triangle', midiToFreq(88), now, 0.03, { gain: 0.03, attack: 0.002, release: 0.05, filter: 3200 });
        playTone('triangle', midiToFreq(95), now + 0.035, 0.04, { gain: 0.018, attack: 0.003, release: 0.06, filter: 3600 });
    }

    function playStart() {
        if (!ctx || muted) return;
        const now = ctx.currentTime;
        [71, 76, 83].forEach((note, index) => {
            playTone('triangle', midiToFreq(note), now + index * 0.06, 0.08, {
                gain: 0.04,
                attack: 0.004,
                release: 0.1,
                filter: 2600,
            });
        });
    }

    function playJump() {
        if (!ctx || muted) return;
        const now = ctx.currentTime;
        playTone('square', 420, now, 0.08, {
            gain: 0.036,
            attack: 0.003,
            release: 0.08,
            filter: 2200,
            endFreq: 690,
        });
        playNoise(now, 0.015, { gain: 0.014, filter: 1600, q: 0.7, release: 0.03 });
    }

    function playDash() {
        if (!ctx || muted) return;
        const now = ctx.currentTime;
        playTone('sawtooth', 340, now, 0.12, {
            gain: 0.05,
            attack: 0.004,
            release: 0.1,
            filter: 1800,
            endFreq: 120,
        });
        playNoise(now, 0.06, { gain: 0.024, filter: 900, q: 0.5, release: 0.08 });
    }

    function playLand(intensity = 1) {
        if (!ctx || muted) return;
        const now = ctx.currentTime;
        playTone('sine', 90, now, 0.05, {
            gain: 0.02 * intensity,
            attack: 0.002,
            release: 0.08,
            filter: 260,
            endFreq: 58,
        });
        playNoise(now, 0.02, { gain: 0.008 * intensity, filter: 650, q: 0.7, release: 0.04 });
    }

    function playAlert() {
        if (!ctx || muted) return;
        const now = ctx.currentTime;
        [0, 0.12, 0.24].forEach((offset, index) => {
            playTone('square', index % 2 === 0 ? 880 : 740, now + offset, 0.05, {
                gain: 0.035,
                attack: 0.002,
                release: 0.05,
                filter: 2800,
            });
        });
    }

    function playDeath(cause = 'void') {
        if (!ctx || muted) return;
        const now = ctx.currentTime;
        const accent = cause === 'laser' ? 220 : cause === 'spike' ? 180 : 140;
        playTone('sawtooth', accent * 2, now, 0.16, {
            gain: 0.06,
            attack: 0.002,
            release: 0.16,
            filter: 900,
            endFreq: accent * 0.6,
        });
        playTone('triangle', accent, now + 0.02, 0.2, {
            gain: 0.03,
            attack: 0.004,
            release: 0.18,
            filter: 480,
            endFreq: accent * 0.45,
        });
        playNoise(now, 0.08, { gain: 0.03, filter: cause === 'laser' ? 2400 : 1000, q: 0.8, release: 0.12 });
    }

    function playWin() {
        if (!ctx || muted) return;
        const now = ctx.currentTime;
        [76, 81, 88, 93].forEach((note, index) => {
            playTone('triangle', midiToFreq(note), now + index * 0.05, 0.12, {
                gain: 0.042,
                attack: 0.004,
                release: 0.12,
                filter: 3000,
            });
        });
    }

    function toggleMute() {
        if (!muted) playUiClick();
        muted = !muted;
        if (!muted) unlock();
        persistMute();
        syncMix();
    }

    updateToggleLabel();

    return {
        unlock,
        syncMix,
        toggleMute,
        playUiClick,
        playStart,
        playJump,
        playDash,
        playLand,
        playAlert,
        playDeath,
        playWin,
        isMuted: () => muted,
    };
}

const audioManager = createAudioManager();

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
        makeSurfaceSlot(p1, 0.74, 'mid', ['speed'], 0.9, ['bug'], 1),
        makeSurfaceSlot(p2, 0.28, 'mid', ['jump'], 1.0, ['spike', 'bug'], 2),
        makeSurfaceSlot(p3, 0.58, 'mid', ['speed', 'hesitation'], 1.15, ['bug', 'spike'], 3),
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
        makeSurfaceSlot(p1, 0.62, 'mid', ['jump'], 1.0, ['bug', 'spike'], 2),
        makeSurfaceSlot(p2, 0.46, 'high', ['jump', 'shortcut'], 1.25, ['spike', 'bug'], 3),
        makeSurfaceSlot(p3, 0.35, 'mid', ['hesitation'], 1.05, ['bug'], 4),
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
        makeSurfaceSlot(p1, 0.74, 'mid', ['dash', 'speed'], 1.1, ['bug', 'spike'], 3),
        makeSurfaceSlot(p2, 0.35, 'mid', ['dash', 'jump'], 1.45, ['laser', 'spike'], 4),
        makeSurfaceSlot(p3, 0.62, 'mid', ['speed'], 1.2, ['bug'], 5),
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

function buildZigzagGauntlet(archetype) {
    const ground = canvas.height - 56;

    const spawn = createPlatform(30, ground, 190, 'spawn', 'low');
    const p1 = createPlatform(280, ground - 90, 96, 'main', 'high');
    const p2 = createPlatform(480, ground - 18, 100, 'main', 'low');
    const p3 = createPlatform(680, ground - 110, 92, 'main', 'high');
    const p4 = createPlatform(880, ground - 24, 98, 'main', 'low');
    const p5 = createPlatform(1080, ground - 130, 88, 'main', 'high');
    const p6 = createPlatform(1280, ground - 36, 96, 'main', 'low');
    const p7 = createPlatform(1480, ground - 150, 86, 'shortcut', 'high');
    const goalPlat = createPlatform(1700, ground - 80, 160, 'goal', 'high');

    const bugSlots = [
        makeSurfaceSlot(p1, 0.5, 'high', ['jump'], 1.6, ['spike', 'laser'], 8),
        makeSurfaceSlot(p2, 0.4, 'low', ['speed', 'hesitation'], 1.4, ['bug', 'crawler'], 8),
        makeSurfaceSlot(p3, 0.6, 'high', ['jump', 'dash'], 1.8, ['laser', 'spike'], 9),
        makeSurfaceSlot(p4, 0.5, 'low', ['speed'], 1.5, ['turret', 'bug'], 9),
        makeSurfaceSlot(p5, 0.45, 'high', ['shortcut', 'jump'], 1.9, ['laser', 'spike'], 10),
        makeSurfaceSlot(p6, 0.55, 'low', ['hesitation'], 1.6, ['crawler', 'turret'], 10),
        makeSurfaceSlot(p7, 0.5, 'high', ['shortcut'], 2.0, ['laser'], 11),
    ];

    return finishStage(archetype, [spawn, p1, p2, p3, p4, p5, p6, p7, goalPlat], spawn, goalPlat, bugSlots);
}

function buildSkylineRush(archetype) {
    const ground = canvas.height - 56;

    const spawn = createPlatform(30, ground, 200, 'spawn', 'low');
    const p1 = createPlatform(310, ground - 68, 88, 'main', 'mid');
    const p2 = createPlatform(530, ground - 136, 84, 'main', 'high');
    const p3 = createPlatform(740, ground - 190, 80, 'main', 'high');
    const p4 = createPlatform(960, ground - 142, 86, 'main', 'high');
    const p5 = createPlatform(1170, ground - 86, 90, 'main', 'mid');
    const p6 = createPlatform(1400, ground - 156, 82, 'shortcut', 'high');
    const goalPlat = createPlatform(1620, ground - 200, 150, 'goal', 'high');

    const bugSlots = [
        makeSurfaceSlot(p1, 0.5, 'mid', ['jump'], 1.5, ['spike', 'bug'], 9),
        makeSurfaceSlot(p2, 0.45, 'high', ['jump', 'dash'], 1.8, ['laser', 'spike'], 9),
        makeSurfaceSlot(p3, 0.5, 'high', ['shortcut'], 2.0, ['laser'], 10),
        makeSurfaceSlot(p4, 0.55, 'high', ['dash'], 1.7, ['spike', 'laser'], 10),
        makeSurfaceSlot(p5, 0.4, 'mid', ['hesitation', 'speed'], 1.6, ['turret', 'crawler'], 11),
        makeSurfaceSlot(p6, 0.5, 'high', ['shortcut', 'jump'], 2.1, ['laser', 'spike'], 11),
    ];

    return finishStage(archetype, [spawn, p1, p2, p3, p4, p5, p6, goalPlat], spawn, goalPlat, bugSlots);
}

function buildCascadeDrop(archetype) {
    const ground = canvas.height - 56;

    const spawn = createPlatform(30, ground - 180, 200, 'spawn', 'high');
    const p1 = createPlatform(300, ground - 140, 92, 'main', 'high');
    const p2 = createPlatform(510, ground - 96, 88, 'main', 'mid');
    const p3 = createPlatform(720, ground - 48, 86, 'main', 'low');
    const p4 = createPlatform(940, ground - 8, 100, 'main', 'low');
    const p5 = createPlatform(1150, ground - 66, 84, 'main', 'mid');
    const p6 = createPlatform(1370, ground - 132, 82, 'main', 'high');
    const goalPlat = createPlatform(1580, ground - 4, 170, 'goal', 'low');

    const bugSlots = [
        makeSurfaceSlot(p1, 0.5, 'high', ['jump'], 1.6, ['spike', 'laser'], 9),
        makeSurfaceSlot(p2, 0.55, 'mid', ['speed'], 1.4, ['bug', 'turret'], 9),
        makeSurfaceSlot(p3, 0.45, 'low', ['hesitation'], 1.5, ['crawler', 'bug'], 10),
        makeSurfaceSlot(p4, 0.5, 'low', ['speed', 'dash'], 1.7, ['turret', 'laser'], 10),
        makeSurfaceSlot(p5, 0.4, 'mid', ['jump', 'dash'], 1.8, ['laser', 'spike'], 11),
        makeSurfaceSlot(p6, 0.5, 'high', ['shortcut'], 2.0, ['laser', 'spike'], 11),
    ];

    return finishStage(archetype, [spawn, p1, p2, p3, p4, p5, p6, goalPlat], spawn, goalPlat, bugSlots);
}

function buildNarrowSpine(archetype) {
    const ground = canvas.height - 56;

    const spawn = createPlatform(30, ground, 180, 'spawn', 'low');
    const p1 = createPlatform(280, ground - 42, 74, 'main', 'mid');
    const p2 = createPlatform(460, ground - 84, 70, 'main', 'high');
    const p3 = createPlatform(650, ground - 38, 72, 'main', 'mid');
    const p4 = createPlatform(840, ground - 98, 68, 'main', 'high');
    const p5 = createPlatform(1020, ground - 52, 70, 'main', 'mid');
    const p6 = createPlatform(1210, ground - 114, 66, 'shortcut', 'high');
    const p7 = createPlatform(1400, ground - 62, 72, 'main', 'mid');
    const goalPlat = createPlatform(1600, ground - 128, 140, 'goal', 'high');

    const bugSlots = [
        makeSurfaceSlot(p1, 0.5, 'mid', ['jump'], 1.5, ['spike'], 10),
        makeSurfaceSlot(p2, 0.5, 'high', ['jump', 'dash'], 1.8, ['laser', 'spike'], 10),
        makeSurfaceSlot(p3, 0.5, 'mid', ['speed'], 1.4, ['bug', 'crawler'], 10),
        makeSurfaceSlot(p4, 0.5, 'high', ['shortcut'], 2.0, ['laser'], 11),
        makeSurfaceSlot(p5, 0.5, 'mid', ['hesitation'], 1.6, ['turret', 'bug'], 11),
        makeSurfaceSlot(p6, 0.5, 'high', ['shortcut', 'dash'], 2.2, ['laser', 'spike'], 12),
        makeSurfaceSlot(p7, 0.5, 'mid', ['speed'], 1.7, ['crawler', 'turret'], 12),
    ];

    return finishStage(archetype, [spawn, p1, p2, p3, p4, p5, p6, p7, goalPlat], spawn, goalPlat, bugSlots);
}

const DIRECTOR_LABELS = {
    flow: 'Flow Corridor',
    fork: 'Forked Pressure',
    tower: 'Vertical Puzzle',
    sprint: 'Redline Sprint',
    switchback: 'Switchback Lines',
    recovery: 'Recovery Mesh',
    roller: 'Waveform Drift',
};

function buildStageDirector(stageIndex, aiSummary, limitedTime, fallbackLevel = 0) {
    directorState.buildSerial++;
    const blueprint = getExternalStageBlueprint(stageIndex);
    const recentDeath = aiProfile.recentDeaths[aiProfile.recentDeaths.length - 1];
    const seed = hashString([
        directorState.runSerial,
        directorState.buildSerial,
        stageIndex,
        limitedTime ? 'tt' : 'normal',
        fallbackLevel,
        aiSummary.preferredLane,
        Math.round(aiSummary.jumpRate * 100),
        Math.round(aiSummary.dashRate * 100),
        Math.round(aiSummary.avgSpeed * 100),
        aiSummary.clearedStages,
        recentDeath ? `${recentDeath.stageIndex}:${recentDeath.cause}` : 'clean',
        blueprint ? blueprint.id : 'runtime',
    ].join('|'));
    const rng = createRng(seed);
    const onboardingBand = blueprint?.onboardingBand || (stageIndex <= 2 ? 'intro' : stageIndex <= 4 ? 'teach' : stageIndex <= 6 ? 'bridge' : 'full');

    const lateGameWeight = Math.min(stageIndex / 12, 1.5);
    let mode = weightedPick(rng, [
        { value: 'flow', weight: limitedTime ? 2.6 : Math.max(0.6, 1.6 - lateGameWeight * 0.5) },
        { value: 'fork', weight: 1.4 + aiSummary.shortcutUsage * 0.3 + lateGameWeight * 0.3 },
        { value: 'tower', weight: 1.0 + Math.min(aiSummary.jumpRate, 1.2) * 0.8 + lateGameWeight * 0.4 },
        { value: 'sprint', weight: limitedTime ? 2.8 : 1.0 + Math.min(aiSummary.avgSpeed / PLAYER_SPEED, 1) + lateGameWeight * 0.2 },
        { value: 'switchback', weight: stageIndex > 3 ? 1.6 + lateGameWeight * 0.3 : 0.8 },
        { value: 'recovery', weight: recentDeath && recentDeath.cause === 'void' ? 2.1 : Math.max(0.4, 1.0 - lateGameWeight * 0.3) },
        { value: 'roller', weight: stageIndex > 4 ? 1.7 + lateGameWeight * 0.3 : 0.7 },
    ], 'flow');
    if (onboardingBand === 'intro') mode = rng.pick(['flow', 'recovery']);
    else if (onboardingBand === 'teach') mode = rng.pick(['flow', 'recovery', 'sprint']);
    else if (onboardingBand === 'bridge' && !limitedTime) mode = rng.pick(['flow', 'sprint', 'switchback', 'fork']);
    if (blueprint?.mode) mode = blueprint.mode;

    let laneBias = weightedPick(rng, [
        { value: aiSummary.preferredLane, weight: 2.3 },
        { value: 'mid', weight: 1.4 },
        { value: 'high', weight: aiSummary.preferredLane === 'high' ? 1.8 : 1.0 },
        { value: 'low', weight: aiSummary.preferredLane === 'low' ? 1.8 : 1.0 },
    ], 'mid');
    if (onboardingBand === 'intro') laneBias = rng.pick(['mid', 'low']);
    else if (onboardingBand === 'teach') laneBias = rng.pick(['mid', 'low', 'high']);
    if (blueprint?.laneBias) laneBias = blueprint.laneBias;

    const lateStagePush = Math.max(0, stageIndex - 10) * 0.015;
    let remixLevel = clamp(
        0.28 + stageTier(stageIndex) * 0.14 + directorState.runSerial * 0.06 + aiSummary.confidence * 0.25 + lateStagePush - fallbackLevel * 0.15,
        0.25,
        0.98
    );
    if (onboardingBand === 'intro') remixLevel = clamp(0.18 + directorState.runSerial * 0.04, 0.16, 0.38);
    else if (onboardingBand === 'teach') remixLevel = clamp(0.24 + directorState.runSerial * 0.05, 0.22, 0.46);
    else if (onboardingBand === 'bridge') remixLevel = clamp(0.34 + directorState.runSerial * 0.05 + aiSummary.confidence * 0.1, 0.32, 0.58);
    if (blueprint?.remixLevel !== undefined) {
        remixLevel = clamp(blueprint.remixLevel - fallbackLevel * 0.05, 0.12, 0.96);
    }

    return {
        seed,
        variantCode: seed.toString(16).slice(-4).toUpperCase(),
        mode,
        label: blueprint?.label || DIRECTOR_LABELS[mode],
        laneBias,
        onboardingBand,
        remixLevel,
        widthVariance: lerp(0.08, 0.36, remixLevel),
        gapVariance: lerp(10, 72, remixLevel),
        verticalVariance: lerp(8, 78, remixLevel),
        jitter: lerp(10, 44, remixLevel),
        branchChance: onboardingBand === 'intro'
            ? 0
            : onboardingBand === 'teach'
                ? clamp(0.06 + remixLevel * 0.14, 0.06, 0.16)
                : clamp(0.14 + remixLevel * 0.34 + (mode === 'fork' ? 0.2 : 0), 0.12, 0.72),
        connectorChance: onboardingBand === 'intro'
            ? 0.12
            : onboardingBand === 'teach'
                ? clamp(0.12 + remixLevel * 0.14, 0.12, 0.26)
                : clamp(0.16 + remixLevel * 0.22 + (mode === 'recovery' ? 0.16 : 0), 0.16, 0.58),
        supportChance: onboardingBand === 'intro'
            ? 0.42
            : onboardingBand === 'teach'
                ? 0.34
                : clamp(0.14 + remixLevel * 0.25 + (limitedTime ? 0.12 : 0), 0.14, 0.62),
        routeSplitBias: mode === 'fork' ? 1.4 : mode === 'recovery' ? 0.7 : 1,
        blueprint,
        source: blueprint ? 'python-library' : 'runtime',
    };
}

function createSafeDirector(stageIndex) {
    const blueprint = getExternalStageBlueprint(stageIndex);
    const seed = hashString(`safe|${directorState.runSerial}|${stageIndex}|${directorState.buildSerial}`);
    return {
        seed,
        variantCode: `S${seed.toString(16).slice(-3).toUpperCase()}`,
        mode: blueprint?.mode || 'flow',
        label: blueprint?.label || (stageIndex <= 3 ? 'Gentle Onboarding' : 'Safe Route'),
        laneBias: blueprint?.laneBias || 'mid',
        onboardingBand: blueprint?.onboardingBand || (stageIndex <= 2 ? 'intro' : stageIndex <= 6 ? 'teach' : 'full'),
        remixLevel: stageIndex <= 2 ? 0.12 : stageIndex <= 6 ? 0.18 : 0.24,
        widthVariance: 0.03,
        gapVariance: stageIndex <= 2 ? 4 : 8,
        verticalVariance: stageIndex <= 2 ? 2 : 6,
        jitter: 4,
        branchChance: 0,
        connectorChance: 0.08,
        supportChance: 0.54,
        routeSplitBias: 0.4,
        blueprint,
        source: blueprint ? 'python-library-safe' : 'runtime-safe',
    };
}

function laneOffsetForBias(lane, director) {
    const laneBase = {
        high: -28,
        mid: 0,
        low: 18,
    };
    let offset = laneBase[lane] || 0;
    if (lane === director.laneBias) offset += director.mode === 'tower' ? -12 : director.mode === 'sprint' ? 8 : -4;
    if (director.mode === 'roller') {
        if (lane === 'high') offset -= 10;
        if (lane === 'low') offset += 12;
    }
    if (director.mode === 'recovery' && lane === 'low') offset += 8;
    return offset;
}

function stagePlatformConflict(candidate, stagePlatforms, paddingX = 20, paddingY = 24) {
    return stagePlatforms.some(platform =>
        candidate.x < platform.x + platform.w + paddingX &&
        candidate.x + candidate.w > platform.x - paddingX &&
        candidate.y < platform.y + platform.h + paddingY &&
        candidate.y + candidate.h > platform.y - paddingY
    );
}

function refreshStageGeometry(stageData) {
    stageData.platforms.sort((a, b) => (a.x - b.x) || (a.y - b.y));
    stageData.spawn = makeSpawnFromPlatform(stageData.spawnPlatform);
    stageData.goal = makeGoalFromPlatform(stageData.goalPlatform);
    stageData.levelWidth = Math.max(canvas.width, Math.max(...stageData.platforms.map(platform => platform.x + platform.w)) + 160);
}

function injectSupportPlatform(stageData, from, to, director, rng) {
    const gap = to.x - (from.x + from.w);
    if (gap < 120) return;

    const x = from.x + from.w + gap * rng.range(0.28, 0.48);
    const y = clamp(Math.max(from.y, to.y) + rng.range(24, 58), 112, canvas.height - 62);
    const w = rng.range(82, 126);
    const platform = createPlatform(x, y, w, 'floor', 'low', FLOOR_HEIGHT);
    if (stagePlatformConflict(platform, stageData.platforms, 10, 12)) return;
    stageData.platforms.push(platform);
}

function injectBranchPlatform(stageData, from, to, director, rng) {
    const gap = to.x - (from.x + from.w);
    if (gap < 110) return;

    const lane = director.mode === 'recovery'
        ? 'low'
        : director.laneBias === 'high'
            ? (rng.chance(0.35) ? 'mid' : 'low')
            : 'high';
    const x = from.x + from.w + gap * rng.range(0.24, 0.44);
    const baseY = lerp(from.y, to.y, rng.range(0.25, 0.55));
    const y = clamp(baseY + laneOffsetForBias(lane, director) + rng.range(-18, 18), 82, canvas.height - 90);
    const w = rng.range(86, 132);
    const role = lane === 'low' ? 'main' : 'shortcut';
    const platform = createPlatform(x, y, w, role, lane);
    if (stagePlatformConflict(platform, stageData.platforms, 12, 16)) return;

    stageData.platforms.push(platform);
    stageData.bugSlots.push(
        makeSurfaceSlot(
            platform,
            rng.range(0.34, 0.7),
            lane,
            lane === 'high' ? ['shortcut', 'jump'] : ['speed', 'hesitation'],
            1.2 + director.remixLevel * 0.6,
            lane === 'high' ? ['laser', 'spike'] : ['bug', 'spike'],
            Math.max(3, Math.floor(stageData.stageIndex / 2))
        )
    );
}

function injectConnectorPlatform(stageData, from, to, director, rng) {
    const gap = to.x - (from.x + from.w);
    if (gap < 180) return;

    const x = from.x + from.w + gap * rng.range(0.42, 0.58);
    const y = clamp(lerp(from.y, to.y, 0.5) + rng.range(-10, 14), 84, canvas.height - 96);
    const w = rng.range(78, 112);
    const lane = ratioToLane(y / canvas.height);
    const platform = createPlatform(x, y, w, 'main', lane);
    if (stagePlatformConflict(platform, stageData.platforms, 12, 14)) return;

    stageData.platforms.push(platform);
    if (director.mode === 'switchback' || director.mode === 'tower') {
        stageData.bugSlots.push(
            makeSurfaceSlot(platform, rng.range(0.3, 0.7), lane, ['hesitation', 'jump'], 1.05 + director.remixLevel * 0.5, ['bug', 'spike'], 4)
        );
    }
}

function remixStageWithDirector(stageData, director) {
    const rng = createRng(director.seed ^ 0x9e3779b9);
    const routePlatforms = stageData.platforms
        .filter(platform => platform.role !== 'floor')
        .sort((a, b) => a.x - b.x);

    const cumulativeShift = { value: 0 };
    for (let i = 1; i < routePlatforms.length; i++) {
        const platform = routePlatforms[i];
        const progress = i / Math.max(1, routePlatforms.length - 1);
        const widthFactor = 1 + rng.range(-director.widthVariance, director.widthVariance * 0.8);
        const wave = director.mode === 'roller'
            ? Math.sin(progress * Math.PI * (2 + director.remixLevel * 2)) * director.verticalVariance * 0.45
            : director.mode === 'switchback'
                ? (i % 2 === 0 ? 1 : -1) * director.verticalVariance * 0.3
                : 0;
        const lateral = director.gapVariance * progress * rng.range(0.35, 0.9);
        const jitterX = rng.range(-director.jitter, director.jitter);
        const jitterY = rng.range(-director.jitter * 0.45, director.jitter * 0.45);

        cumulativeShift.value += lateral;
        if (platform.role !== 'floor') {
            platform.x += Math.round(cumulativeShift.value + jitterX * 0.4);
        }

        if (platform.role !== 'spawn' && platform.role !== 'goal' && platform.role !== 'floor') {
            const minWidth = platform.role === 'shortcut' ? 72 : 86;
            platform.w = Math.max(minWidth, Math.round(platform.w * widthFactor));
        }

        if (platform.role !== 'floor') {
            const laneBiasOffset = laneOffsetForBias(platform.routeLane, director);
            const vertical = laneBiasOffset + wave + jitterY;
            platform.y = clamp(platform.y + Math.round(vertical), 76, canvas.height - 78);
        }
    }

    const mainPlatforms = routePlatforms.filter(platform => platform.role !== 'shortcut');
    for (let i = 0; i < mainPlatforms.length - 1; i++) {
        const from = mainPlatforms[i];
        const to = mainPlatforms[i + 1];
        if (rng.chance(director.supportChance * (director.onboardingBand === 'intro' ? 0.7 : 0.45))) {
            injectSupportPlatform(stageData, from, to, director, rng);
        }
        if (stageData.stageIndex >= 4 && rng.chance(director.branchChance * director.routeSplitBias * (director.onboardingBand === 'teach' ? 0.18 : 0.5))) {
            injectBranchPlatform(stageData, from, to, director, rng);
        }
        if (stageData.stageIndex >= 3 && rng.chance(director.connectorChance * (director.onboardingBand === 'intro' ? 0.22 : 0.42))) {
            injectConnectorPlatform(stageData, from, to, director, rng);
        }
    }

    refreshStageGeometry(stageData);
}

const STAGE_ARCHETYPES = [
    { id: 'intro-flats', name: 'Intro Flats', difficulty: 0, tags: ['flow', 'recovery', 'sprint'], build: buildIntroFlats },
    { id: 'step-up', name: 'Step Up', difficulty: 1, tags: ['tower', 'flow'], build: buildStepUp },
    { id: 'dash-bridge', name: 'Dash Bridge', difficulty: 2, tags: ['sprint', 'flow'], build: buildDashBridge },
    { id: 'split-route', name: 'Split Route', difficulty: 3, tags: ['fork', 'switchback'], build: buildSplitRoute },
    { id: 'low-tunnel', name: 'Low Tunnel', difficulty: 3, tags: ['recovery', 'switchback'], build: buildLowTunnel },
    { id: 'recovery-floor', name: 'Recovery Floor', difficulty: 1, tags: ['recovery', 'flow'], build: buildRecoveryFloor },
    { id: 'vertical-ladder', name: 'Vertical Ladder', difficulty: 5, tags: ['tower', 'fork'], build: buildVerticalLadder },
    { id: 'stagger-jump', name: 'Stagger Jump', difficulty: 4, tags: ['switchback', 'tower'], build: buildStaggerJump },
    { id: 'alternating-heights', name: 'Alternating Heights', difficulty: 4, tags: ['roller', 'switchback'], build: buildAlternatingHeights },
    { id: 'long-traversal', name: 'Long Traversal', difficulty: 5, tags: ['sprint', 'flow'], build: buildLongTraversal },
    { id: 'precision-tower', name: 'Precision Tower', difficulty: 6, tags: ['tower', 'switchback'], build: buildPrecisionTower },
    { id: 'mixed-gauntlet', name: 'Mixed Gauntlet', difficulty: 7, tags: ['fork', 'roller', 'tower'], build: buildMixedGauntlet },
    { id: 'zigzag-gauntlet', name: 'Zigzag Gauntlet', difficulty: 8, tags: ['switchback', 'roller', 'sprint'], build: buildZigzagGauntlet },
    { id: 'skyline-rush', name: 'Skyline Rush', difficulty: 8, tags: ['tower', 'sprint', 'fork'], build: buildSkylineRush },
    { id: 'cascade-drop', name: 'Cascade Drop', difficulty: 9, tags: ['roller', 'switchback', 'tower'], build: buildCascadeDrop },
    { id: 'narrow-spine', name: 'Narrow Spine', difficulty: 9, tags: ['tower', 'switchback', 'fork'], build: buildNarrowSpine },
];

const ARCHETYPES_BY_ID = Object.fromEntries(STAGE_ARCHETYPES.map(archetype => [archetype.id, archetype]));

function isLimitedTimeStage(stageIndex) {
    const blueprint = getExternalStageBlueprint(stageIndex);
    if (blueprint?.timeTrial !== undefined) {
        return !!blueprint.timeTrial;
    }
    return stageIndex >= 8 && stageIndex % 4 === 0;
}

function computeTimeLimit(stageIndex) {
    const blueprint = getExternalStageBlueprint(stageIndex);
    if (blueprint?.timeTrial && blueprint.timeLimit) {
        return blueprint.timeLimit;
    }
    const trialIndex = Math.floor((stageIndex - 8) / 4);
    return Math.max(20, 32 - Math.max(0, trialIndex) * 2);
}

function computeBugBudget(stageIndex, aiConfidence, limitedTime) {
    const blueprint = getExternalStageBlueprint(stageIndex);
    let budget;
    if (stageIndex <= 3) budget = 1;
    else if (stageIndex <= 6) budget = 1;
    else if (stageIndex <= 10) budget = clamp(1 + Math.floor((stageIndex - 7) / 2), 1, 4);
    else if (stageIndex <= 20) budget = clamp(3 + Math.floor((stageIndex - 10) / 2), 3, 7);
    else budget = clamp(5 + Math.floor((stageIndex - 20) / 3), 5, 10);
    if (limitedTime) budget -= 1;
    if (aiConfidence < 0.45 && stageIndex > 8) budget -= 1;
    if (stageIndex >= DOUBLE_JUMP_UNLOCK_STAGE) budget += 1;
    if (blueprint?.bugBudgetBias !== undefined && stageIndex > 3) budget += blueprint.bugBudgetBias;
    if (blueprint?.bugBudgetCap !== undefined && blueprint.bugBudgetCap !== null && stageIndex > 3) {
        budget = Math.min(budget, Math.max(1, blueprint.bugBudgetCap));
    }
    if (stageIndex <= 6) budget = Math.max(1, budget);
    return Math.max(0, budget);
}

function stageTier(stageIndex) {
    return Math.floor((stageIndex - 1) / 5);
}

function archetypeRecentPenalty(archetypeId) {
    const recent = directorState.recentArchetypes.slice(-4);
    const index = recent.lastIndexOf(archetypeId);
    if (index === -1) return 0;
    return 1.4 - index * 0.25;
}

function selectArchetypeForStage(stageIndex, limitedTime, director) {
    if (director.blueprint?.archetypeId && ARCHETYPES_BY_ID[director.blueprint.archetypeId]) {
        return ARCHETYPES_BY_ID[director.blueprint.archetypeId];
    }

    const rng = createRng(director.seed ^ 0x51f15e3d);
    const tier = stageTier(stageIndex);
    let targetDifficulty = clamp(tier + 2 + Math.floor(stageIndex / 6), 1, 9);
    if (stageIndex <= 3) targetDifficulty = stageIndex - 1;
    else if (stageIndex > 16) targetDifficulty = clamp(targetDifficulty + 1, 5, 9);
    const easedDifficulty = Math.max(0, targetDifficulty - 1);
    const target = limitedTime ? easedDifficulty : targetDifficulty;

    const onboardingPools = {
        1: ['intro-flats', 'recovery-floor'],
        2: ['intro-flats', 'recovery-floor', 'step-up'],
        3: ['step-up', 'dash-bridge', 'recovery-floor'],
        4: ['dash-bridge', 'split-route', 'recovery-floor', 'low-tunnel'],
        5: ['step-up', 'split-route', 'stagger-jump', 'alternating-heights'],
        6: ['split-route', 'low-tunnel', 'stagger-jump', 'alternating-heights'],
    };
    const allowedIds = onboardingPools[stageIndex];

    const candidates = STAGE_ARCHETYPES.filter(archetype => {
        if (allowedIds) {
            return allowedIds.includes(archetype.id);
        }
        const minDifficulty = limitedTime ? Math.max(0, target - 2) : Math.max(0, target - 1);
        const maxDifficulty = limitedTime ? target + 1 : target + 2;
        return archetype.difficulty >= minDifficulty && archetype.difficulty <= maxDifficulty;
    });

    const pool = candidates.length ? candidates : STAGE_ARCHETYPES;
    const weightedPool = pool.map(archetype => {
        let weight = 1.5 - Math.abs(archetype.difficulty - target) * 0.24;
        if (archetype.tags.includes(director.mode)) weight += 1.2;
        if (archetype.tags.includes('tower') && director.laneBias === 'high') weight += 0.4;
        if (archetype.tags.includes('recovery') && director.mode === 'recovery') weight += 0.7;
        if (archetype.tags.includes('sprint') && director.mode === 'sprint') weight += 0.7;
        if (archetype.id === lastArchetypeId) weight -= 0.9;
        weight -= archetypeRecentPenalty(archetype.id);
        weight += rng.range(0.05, 0.4);
        return { value: archetype, weight: Math.max(0.08, weight) };
    });

    return weightedPick(rng, weightedPool, pool[0]);
}

function pickFallbackArchetype(stageIndex, primary, limitedTime, director) {
    if (director.blueprint?.fallbackArchetypeId && ARCHETYPES_BY_ID[director.blueprint.fallbackArchetypeId]) {
        return ARCHETYPES_BY_ID[director.blueprint.fallbackArchetypeId];
    }

    const rng = createRng(director.seed ^ 0x85ebca6b);
    const targetDifficulty = Math.max(0, primary.difficulty - 1);
    const candidates = STAGE_ARCHETYPES.filter(archetype => {
        if (archetype.id === primary.id) return false;
        if (limitedTime) return archetype.difficulty <= targetDifficulty + 1;
        return archetype.difficulty >= Math.max(0, targetDifficulty - 1) && archetype.difficulty <= targetDifficulty + 1;
    });

    if (!candidates.length) {
        return ARCHETYPES_BY_ID[SAFE_FALLBACK_ARCHETYPE_ID];
    }

    const weightedPool = candidates.map(archetype => ({
        value: archetype,
        weight: Math.max(0.15, 1.6 - Math.abs(archetype.difficulty - targetDifficulty) * 0.35 + (archetype.tags.includes(director.mode) ? 0.5 : 0)),
    }));
    return weightedPick(rng, weightedPool, candidates[0]);
}

function decorateStageDifficulty(stageIndex, stageData, director) {
    const limitedTime = isLimitedTimeStage(stageIndex);
    const blueprint = director.blueprint;
    const tier = stageTier(stageIndex);
    const effectiveTier = limitedTime ? Math.max(0, tier - 1) : tier;
    const onboardingWideBoost = director.onboardingBand === 'intro' ? 0.14 : director.onboardingBand === 'teach' ? 0.08 : director.onboardingBand === 'bridge' ? 0.04 : 0;
    const lateWidthPenalty = Math.max(0, stageIndex - 12) * 0.006;
    const widthScale = clamp((1 - effectiveTier * 0.04 + (director.mode === 'recovery' ? 0.05 : 0) - director.remixLevel * 0.08 - lateWidthPenalty + onboardingWideBoost) * (blueprint?.widthScale ?? 1), 0.68, 1.22);
    const gapPush = (director.onboardingBand === 'intro'
        ? director.gapVariance * 0.28
        : director.onboardingBand === 'teach'
            ? effectiveTier * 10 + director.gapVariance * 0.4
            : effectiveTier * 18 + director.gapVariance * (limitedTime ? 0.55 : 1)) * (blueprint?.gapScale ?? 1);
    const verticalPush = (director.onboardingBand === 'intro'
        ? director.verticalVariance * 0.04
        : director.onboardingBand === 'teach'
            ? effectiveTier * 2 + director.verticalVariance * 0.08
            : effectiveTier * 5 + director.verticalVariance * 0.18) * (blueprint?.riseScale ?? 1);
    const rng = createRng(director.seed ^ 0x27d4eb2f);

    stageData.tier = tier;
    stageData.isTimeTrial = limitedTime;
    stageData.timeLimit = limitedTime ? computeTimeLimit(stageIndex) : 0;
    stageData.director = director;
    stageData.blueprint = blueprint;
    stageData.blueprintProvider = EXTERNAL_STAGE_LIBRARY?.provider || null;
    stageData.variantName = `${director.label} ${director.variantCode}`;
    stageData.abilities = {
        doubleJump: stageIndex >= DOUBLE_JUMP_UNLOCK_STAGE,
    };

    for (let i = 1; i < stageData.platforms.length; i++) {
        const platform = stageData.platforms[i];
        const progress = i / Math.max(1, stageData.platforms.length - 1);
        const jitterScale = director.onboardingBand === 'intro' ? 0.32 : director.onboardingBand === 'teach' ? 0.55 : 1;
        const jitter = rng.range(-director.jitter * jitterScale, director.jitter * jitterScale);

        if (platform.role !== 'floor') {
            platform.x += Math.round(progress * i * gapPush * 0.3 + jitter * 0.25);
        }

        if (platform.role !== 'spawn' && platform.role !== 'goal' && platform.role !== 'floor') {
            const widthJitter = 1 + rng.range(-director.widthVariance, director.widthVariance * 0.75);
            platform.w = Math.max(platform.role === 'shortcut' ? 70 : 82, Math.round(platform.w * widthScale * widthJitter));
        }

        if (platform.role !== 'floor') {
            const bias = laneOffsetForBias(platform.routeLane, director);
            platform.y = clamp(platform.y - Math.round(progress * verticalPush) + Math.round(bias + jitter * 0.3), 76, canvas.height - 84);
        }
    }

    if (blueprint?.supportChance !== undefined) {
        stageData.director.supportChance = clamp(blueprint.supportChance, 0, 0.9);
    }
    if (blueprint?.connectorChance !== undefined) {
        stageData.director.connectorChance = clamp(blueprint.connectorChance, 0, 0.9);
    }
    if (blueprint?.branchChance !== undefined) {
        stageData.director.branchChance = clamp(blueprint.branchChance, 0, 0.9);
    }
    if (blueprint?.routeSplitBias !== undefined) {
        stageData.director.routeSplitBias = clamp(blueprint.routeSplitBias, 0.2, 1.6);
    }

    remixStageWithDirector(stageData, director);
    refreshStageGeometry(stageData);
    return stageData;
}

function resolveBugSlot(slot, stageData) {
    const x = slot.platform.x + slot.platform.w * slot.align;
    const availableTypes = getExpandedTypeOptions(slot, stageData);
    return {
        ...slot,
        x: Math.round(x),
        y: slot.platform.y,
        progress: clamp(x / Math.max(stageData.levelWidth, 1), 0, 1),
        availableTypes,
    };
}

function getExpandedTypeOptions(slot, stageData) {
    const typeSet = new Set(slot.typeOptions);
    if (stageData.stageIndex >= 4 && slot.platform.w >= 126 && slot.lane !== 'high' && !slot.counterTags.includes('shortcut')) {
        typeSet.add('turret');
    }
    if (stageData.stageIndex >= 6 && slot.platform.w >= 112 && slot.platform.role !== 'goal' && !slot.counterTags.includes('shortcut')) {
        typeSet.add('crawler');
    }

    if (stageData.stageIndex <= 3) {
        return [...typeSet].filter(type => type === 'bug' || type === 'spike');
    }

    return [...typeSet];
}

function chooseObstacleType(slot, aiSummary, stageData) {
    const weights = Object.fromEntries(slot.availableTypes.map(type => [type, 1]));
    for (const type of slot.availableTypes) {
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
        if (type === 'turret') {
            if (slot.counterTags.includes('speed')) weights.turret += 0.9;
            if (slot.counterTags.includes('hesitation')) weights.turret += 1.0;
            if (slot.lane === aiSummary.preferredLane) weights.turret += 0.5;
            if (aiSummary.avgSpeed > PLAYER_SPEED * 0.65) weights.turret += 0.75;
        }
        if (type === 'crawler') {
            if (slot.counterTags.includes('jump')) weights.crawler += 0.75;
            if (slot.counterTags.includes('hesitation')) weights.crawler += 0.65;
            if (slot.counterTags.includes('speed')) weights.crawler += 0.35;
            if (slot.lane === aiSummary.preferredLane) weights.crawler += 0.55;
        }
    }

    if (stageData.stageIndex <= 2 && slot.availableTypes.includes('bug')) {
        return 'bug';
    }
    if (stageData.stageIndex === 3) {
        if (slot.availableTypes.includes('spike')) return 'spike';
        if (slot.availableTypes.includes('bug')) return 'bug';
    }

    return slot.availableTypes
        .slice()
        .sort((a, b) => weights[b] - weights[a])[0];
}

function scoreBugSlot(slot, aiSummary, stageIndex) {
    let score = slot.threat * 0.75 + stageIndex * 0.02;

    if (stageIndex <= 3) {
        score = 2.6 - slot.threat * 1.1;
        if (slot.lane === 'mid') score += 0.45;
        if (slot.counterTags.includes('hesitation')) score += 0.15;
        return score;
    }

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

function buildObstacleFromSlot(slot, type, stageData) {
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

    if (type === 'turret') {
        const fireDir = slot.align >= 0.5 ? -1 : 1;
        const bodyX = fireDir > 0
            ? slot.platform.x + 6
            : slot.platform.x + slot.platform.w - 28;
        return {
            x: bodyX,
            y: slot.y - 24,
            w: 22,
            h: 24,
            type,
            phase: Math.random() * Math.PI * 2,
            threat: slot.threat + 0.2,
            platform: slot.platform,
            fireDir,
            fireRate: stageData.stageIndex <= 6 ? 102 : stageData.stageIndex <= 10 ? 92 : 82,
            bulletSpeed: stageData.stageIndex <= 6 ? 5.2 : stageData.stageIndex <= 10 ? 5.8 : 6.4,
            bulletRange: stageData.stageIndex <= 6 ? 210 : stageData.stageIndex <= 10 ? 250 : 290,
        };
    }

    if (type === 'crawler') {
        const range = Math.max(18, Math.min(46, Math.round(slot.platform.w * 0.22)));
        return {
            x: slot.x - 12,
            y: slot.y - 18,
            w: 24,
            h: 18,
            type,
            phase: Math.random() * Math.PI * 2,
            threat: slot.threat + 0.1,
            platform: slot.platform,
            range,
            moveSpeed: 0.045 + Math.min(stageData.stageIndex, 12) * 0.002,
            sweepMin: slot.x - 12 - range,
            sweepMax: slot.x - 12 + range + 24,
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
        .filter(slot => slot.availableTypes.length > 0)
        .filter(slot => slot.x > stageData.spawn.x + 60 && slot.x < stageData.goal.x - 40);

    const scoredSlots = resolvedSlots
        .map(slot => ({ slot, score: scoreBugSlot(slot, aiSummary, stageData.stageIndex) }))
        .sort((a, b) => stageData.stageIndex <= 3 ? b.score - a.score : b.score - a.score);

    const selected = [];
    for (const entry of scoredSlots) {
        if (selected.length >= bugBudget) break;

        const tooClose = selected.some(obstacle => Math.abs(obstacle.x + obstacle.w / 2 - entry.slot.x) < 68);
        if (tooClose) continue;

        const type = chooseObstacleType(entry.slot, aiSummary, stageData);
        selected.push(buildObstacleFromSlot(entry.slot, type, stageData));
    }

    return {
        bugBudget,
        plannedObstacles: selected,
    };
}

function createStageCandidate(stageIndex, archetype, aiSummary, options = {}) {
    const director = options.director ?? buildStageDirector(stageIndex, aiSummary, isLimitedTimeStage(stageIndex), options.fallbackLevel || 0);
    const baseStage = archetype.build(archetype);
    const stageData = decorateStageDifficulty(stageIndex, {
        ...baseStage,
        stageIndex,
    }, director);
    const topology = pruneDisconnectedPlatforms(stageData);

    const obstaclePlan = options.disableBugs
        ? { bugBudget: 0, plannedObstacles: [] }
        : planStageObstacles(stageData, aiSummary);

    stageData.aiSummary = aiSummary;
    stageData.bugBudget = obstaclePlan.bugBudget;
    stageData.plannedObstacles = obstaclePlan.plannedObstacles;
    stageData.meta = {
        removedBugs: 0,
        removedPlatforms: topology.removedPlatforms,
        redesigns: 0,
        fallbackLevel: 0,
        validationAttempts: 0,
    };
    stageData.topology = topology;

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
        } else if (obstacle.type === 'crawler') {
            left = (obstacle.sweepMin ?? obstacle.x) - 6;
            right = (obstacle.sweepMax ?? (obstacle.x + obstacle.w)) + 6;
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

function estimateTakeoffSpeed(platform) {
    const runway = Math.max(0, platform.w - player.width - SAFE_LANDING_MARGIN * 2);
    let vx = 0;
    let distance = 0;
    let frames = 0;

    while (frames < 24 && distance < runway) {
        vx = Math.min(PLAYER_SPEED, vx + PLAYER_ACCEL);
        distance += vx;
        frames++;
    }

    return clamp(vx, Math.min(PLAYER_SPEED, 2.4), PLAYER_SPEED);
}

function platformGap(from, to) {
    const fromRight = from.x + from.w;
    const toRight = to.x + to.w;
    if (to.x > fromRight) return to.x - fromRight;
    if (from.x > toRight) return from.x - toRight;
    return 0;
}

function simulateTraversePattern(from, to, stagePlatforms, direction, dashStartFrame = null) {
    const startX = direction > 0
        ? from.x + from.w - player.width - 1
        : from.x + 1;
    const landingInset = Math.min(SAFE_LANDING_MARGIN, Math.max(3, Math.floor((to.w - player.width) / 4)));
    const safeCenterMin = to.x + landingInset + player.width / 2;
    const safeCenterMax = to.x + to.w - landingInset - player.width / 2;

    if (safeCenterMax < safeCenterMin) {
        return null;
    }

    let x = startX;
    let y = from.y - player.height;
    let vx = estimateTakeoffSpeed(from) * direction;
    let vy = JUMP_FORCE;
    let dashFrames = 0;
    let usedDash = false;

    for (let frame = 1; frame <= REACH_SIM_FRAMES; frame++) {
        if (dashStartFrame !== null && !usedDash && frame >= dashStartFrame) {
            dashFrames = DASH_DURATION;
            usedDash = true;
            vy = 0;
        }

        const prevX = x;
        const prevY = y;

        if (dashFrames > 0) {
            vx = direction * DASH_SPEED;
            vy = 0;
            dashFrames--;
        } else {
            vx = clamp(vx + direction * PLAYER_ACCEL, -PLAYER_SPEED, PLAYER_SPEED);
            vy = Math.min(vy + GRAVITY, MAX_FALL_SPEED);
        }

        x += vx;
        for (const platform of stagePlatforms) {
            if (platform === from && y + player.height <= from.y + 1) continue;
            if (!aabb(x, y, player.width, player.height, platform.x, platform.y, platform.w, platform.h)) continue;

            if (vx > 0) x = platform.x - player.width;
            else if (vx < 0) x = platform.x + platform.w;
            vx = 0;
        }

        y += vy;
        let landedPlatform = null;
        for (const platform of stagePlatforms) {
            if (!aabb(x, y, player.width, player.height, platform.x, platform.y, platform.w, platform.h)) continue;

            if (vy > 0) {
                y = platform.y - player.height;
                vy = 0;
                landedPlatform = platform;
            } else if (vy < 0) {
                y = platform.y + platform.h;
                vy = 0;
            }
        }

        if (landedPlatform) {
            if (landedPlatform !== to) {
                return null;
            }

            const center = x + player.width / 2;
            if (center >= safeCenterMin && center <= safeCenterMax) {
                return {
                    eta: frame / 60,
                    dashRequired: usedDash,
                };
            }

            return null;
        }

        if (y > canvas.height + 180) break;
        if (direction > 0 && x > to.x + to.w + MAX_DASH_H) break;
        if (direction < 0 && x + player.width < to.x - MAX_DASH_H) break;
    }

    return null;
}

function getReachMetrics(from, to, stagePlatforms = [from, to]) {
    const rise = from.y - to.y;
    const gap = platformGap(from, to);

    if (rise > MAX_JUMP_V + 14) return null;
    if (gap > MAX_DASH_H + 24) return null;

    if (gap === 0 && to.y >= from.y) {
        const centerDistance = Math.abs((to.x + to.w / 2) - (from.x + from.w / 2));
        return {
            eta: Math.max(0.16, centerDistance / (PLAYER_SPEED * 60)),
            dashRequired: false,
        };
    }

    const direction = to.x + to.w / 2 >= from.x + from.w / 2 ? 1 : -1;
    const noDash = simulateTraversePattern(from, to, stagePlatforms, direction, null);
    let bestDash = null;

    for (const dashStartFrame of REACH_DASH_STARTS) {
        const candidate = simulateTraversePattern(from, to, stagePlatforms, direction, dashStartFrame);
        if (!candidate) continue;
        if (!bestDash || candidate.eta < bestDash.eta) bestDash = candidate;
    }

    if (noDash) {
        return {
            eta: noDash.eta,
            optimalEta: Math.min(noDash.eta, bestDash ? bestDash.eta : Infinity),
            dashRequired: false,
        };
    }

    if (bestDash) {
        return {
            eta: bestDash.eta,
            optimalEta: bestDash.eta,
            dashRequired: true,
        };
    }

    return null;
}

function buildTraversalGraph(stageData, obstacles) {
    const stagePlatforms = stageData.platforms;
    const edges = Array.from({ length: stagePlatforms.length }, () => []);
    const safeLanding = stagePlatforms.map(platform => hasSafeLandingZone(platform, obstacles));

    for (let fromIndex = 0; fromIndex < stagePlatforms.length; fromIndex++) {
        const from = stagePlatforms[fromIndex];

        for (let toIndex = 0; toIndex < stagePlatforms.length; toIndex++) {
            if (toIndex === fromIndex || !safeLanding[toIndex]) continue;

            const to = stagePlatforms[toIndex];
            const move = getReachMetrics(from, to, stagePlatforms);
            if (!move) continue;
            if (edgeBlockedByLaser(from, to, obstacles)) continue;

            edges[fromIndex].push({
                index: toIndex,
                eta: move.optimalEta ?? move.eta,
                dashRequired: move.dashRequired,
            });
        }
    }

    return { edges, safeLanding };
}

function collectReachableIndices(edges, startIndex) {
    const visited = new Set([startIndex]);
    const stack = [startIndex];

    while (stack.length) {
        const current = stack.pop();
        for (const edge of edges[current]) {
            if (visited.has(edge.index)) continue;
            visited.add(edge.index);
            stack.push(edge.index);
        }
    }

    return visited;
}

function collectReverseReachableIndices(edges, goalIndex) {
    const reverseEdges = Array.from({ length: edges.length }, () => []);
    for (let fromIndex = 0; fromIndex < edges.length; fromIndex++) {
        for (const edge of edges[fromIndex]) {
            reverseEdges[edge.index].push(fromIndex);
        }
    }

    const visited = new Set([goalIndex]);
    const stack = [goalIndex];

    while (stack.length) {
        const current = stack.pop();
        for (const previousIndex of reverseEdges[current]) {
            if (visited.has(previousIndex)) continue;
            visited.add(previousIndex);
            stack.push(previousIndex);
        }
    }

    return visited;
}

function analyzeStageTopology(stageData, obstacles = []) {
    const stagePlatforms = stageData.platforms;
    const startIndex = stagePlatforms.indexOf(stageData.spawnPlatform);
    const goalIndex = stagePlatforms.indexOf(stageData.goalPlatform);
    const graph = buildTraversalGraph(stageData, obstacles);
    const reachableFromSpawn = startIndex === -1 ? new Set() : collectReachableIndices(graph.edges, startIndex);
    const reachableToGoal = goalIndex === -1 ? new Set() : collectReverseReachableIndices(graph.edges, goalIndex);
    const usableIndices = new Set();

    for (let index = 0; index < stagePlatforms.length; index++) {
        const platform = stagePlatforms[index];
        if (platform === stageData.spawnPlatform || platform === stageData.goalPlatform || platform.role === 'floor') {
            usableIndices.add(index);
            continue;
        }

        if (reachableFromSpawn.has(index) && reachableToGoal.has(index)) {
            usableIndices.add(index);
        }
    }

    return {
        startIndex,
        goalIndex,
        edges: graph.edges,
        safeLanding: graph.safeLanding,
        reachableFromSpawn,
        reachableToGoal,
        usableIndices,
        unreachableIndices: stagePlatforms
            .map((_, index) => index)
            .filter(index => !usableIndices.has(index)),
    };
}

function pruneDisconnectedPlatforms(stageData) {
    const topology = analyzeStageTopology(stageData, []);
    if (!topology.unreachableIndices.length) {
        return {
            ...topology,
            removedPlatforms: 0,
        };
    }

    const keepPlatforms = stageData.platforms.filter((_, index) => topology.usableIndices.has(index));
    const keepSet = new Set(keepPlatforms);
    stageData.platforms = keepPlatforms;
    stageData.bugSlots = stageData.bugSlots.filter(slot => keepSet.has(slot.platform));
    refreshStageGeometry(stageData);

    const nextTopology = analyzeStageTopology(stageData, []);
    return {
        ...nextTopology,
        removedPlatforms: topology.unreachableIndices.length,
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

    const traversal = buildTraversalGraph(stageData, obstacles);
    const costs = Array(stagePlatforms.length).fill(Infinity);
    const previous = Array(stagePlatforms.length).fill(-1);
    const queue = [{ index: startIndex, cost: 0 }];
    costs[startIndex] = 0;

    while (queue.length) {
        queue.sort((a, b) => a.cost - b.cost);
        const current = queue.shift();
        if (current.index === goalIndex) break;

        for (const edge of traversal.edges[current.index]) {
            const nextCost = current.cost + edge.eta;
            if (nextCost < costs[edge.index]) {
                costs[edge.index] = nextCost;
                previous[edge.index] = current.index;
                queue.push({ index: edge.index, cost: nextCost });
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

function summarizeCriticalPath(stageData, validation) {
    const route = validation.pathIndices.map(index => stageData.platforms[index]);
    const summary = {
        steps: Math.max(0, route.length - 1),
        maxGap: 0,
        maxRise: 0,
        dashEdges: 0,
        shortcutSteps: 0,
    };

    for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];
        const move = getReachMetrics(from, to, stageData.platforms);
        const gap = Math.max(0, to.x - (from.x + from.w), from.x - (to.x + to.w));
        const rise = Math.max(0, from.y - to.y);
        summary.maxGap = Math.max(summary.maxGap, gap);
        summary.maxRise = Math.max(summary.maxRise, rise);
        if (move && move.dashRequired) summary.dashEdges++;
        if (to.role === 'shortcut') summary.shortcutSteps++;
    }

    return summary;
}

function getTesterBudgets(stageData, profile) {
    const blueprint = stageData.blueprint;
    const tier = stageTier(stageData.stageIndex);
    const onboardingFactor = stageData.stageIndex <= 4 ? -12 : stageData.stageIndex <= 8 ? -4 : 0;
    const limitedTimePenalty = stageData.isTimeTrial ? 18 : 0;
    const gapBudget = (148 + stageData.stageIndex * 4 + tier * 12 + onboardingFactor - limitedTimePenalty) * profile.gapBias * (blueprint?.testerGapBias ?? 1);
    const riseBudget = (60 + stageData.stageIndex * 2 + tier * 6 + Math.min(stageData.stageIndex, 6) - (stageData.isTimeTrial ? 10 : 0)) * profile.riseBias * (blueprint?.testerRiseBias ?? 1);
    const comboBudget = (208 + stageData.stageIndex * 6 + tier * 14 + onboardingFactor - (stageData.isTimeTrial ? 24 : 0)) * profile.comboBias * (blueprint?.testerComboBias ?? 1);
    const maxDashEdges = stageData.isTimeTrial
        ? 1 + Math.floor(Math.max(0, stageData.stageIndex - 12) / 8)
        : 1 + Math.floor(Math.max(0, stageData.stageIndex - 8) / 7);
    const maxDashStreak = stageData.stageIndex >= 14 && !stageData.isTimeTrial ? 2 : 1;
    const minLandingWidth = Math.max(88, (stageData.isTimeTrial ? 122 : 112) * profile.landingBias - tier * 2);
    const minTimeMargin = stageData.isTimeTrial
        ? Math.max(4.2, (stageData.stageIndex <= 10 ? 7.2 : 5.6) * profile.marginBias)
        : 0;

    return {
        gapBudget,
        riseBudget,
        comboBudget,
        maxDashEdges,
        maxDashStreak,
        minLandingWidth,
        minTimeMargin,
    };
}

function runTesterSquad(stageData, validation) {
    if (!validation.valid) {
        return {
            ok: false,
            requiredPasses: TESTER_PROFILES.length,
            passCount: 0,
            results: TESTER_PROFILES.map(profile => ({
                id: profile.id,
                label: profile.label,
                pass: false,
                reasons: ['invalid-route'],
            })),
        };
    }

    const route = validation.pathIndices.map(index => stageData.platforms[index]);
    const results = TESTER_PROFILES.map(profile => {
        const budgets = getTesterBudgets(stageData, profile);
        const reasons = [];
        let dashEdges = 0;
        let dashStreak = 0;
        let peakCombo = 0;

        for (let i = 0; i < route.length - 1; i++) {
            const from = route[i];
            const to = route[i + 1];
            const move = getReachMetrics(from, to, stageData.platforms);
            if (!move) {
                reasons.push(`edge-${i + 1}-unreachable`);
                continue;
            }

            const gap = platformGap(from, to);
            const rise = Math.max(0, from.y - to.y);
            const landingAssist = Math.max(0, to.w - 120) * 0.2 + Math.max(0, from.w - 120) * 0.08;
            const effectiveGap = Math.max(0, gap - landingAssist);
            const comboLoad = effectiveGap + rise * 0.78 + (move.dashRequired ? 30 : 0);
            peakCombo = Math.max(peakCombo, comboLoad);

            if (move.dashRequired) {
                dashEdges++;
                dashStreak++;
            } else {
                dashStreak = 0;
            }

            if (effectiveGap > budgets.gapBudget) reasons.push(`edge-${i + 1}-gap`);
            if (rise > budgets.riseBudget) reasons.push(`edge-${i + 1}-rise`);
            if (comboLoad > budgets.comboBudget) reasons.push(`edge-${i + 1}-combo`);
            if (move.dashRequired && dashEdges > budgets.maxDashEdges) reasons.push('dash-count');
            if (move.dashRequired && dashStreak > budgets.maxDashStreak) reasons.push('dash-streak');
            if (to.w < budgets.minLandingWidth && rise > budgets.riseBudget * 0.72) reasons.push(`edge-${i + 1}-landing`);
        }

        if (stageData.isTimeTrial && validation.shortestEta > stageData.timeLimit - budgets.minTimeMargin) {
            reasons.push('watchdog-margin');
        }

        return {
            id: profile.id,
            label: profile.label,
            pass: reasons.length === 0,
            reasons,
            budgets,
            peakCombo: Math.round(peakCombo),
            dashEdges,
        };
    });

    const passCount = results.filter(result => result.pass).length;
    const requiredPasses = stageData.isTimeTrial || stageData.stageIndex <= 10 ? TESTER_PROFILES.length : 2;
    const architectPass = results.some(result => result.id === 'architect' && result.pass);

    return {
        ok: passCount >= requiredPasses && architectPass,
        passCount,
        requiredPasses,
        results,
        summary: results.map(result => `${result.label}:${result.pass ? 'PASS' : 'FAIL'}`).join(' | '),
    };
}

function rebalanceStageRoute(stageData, validation, testerSquad) {
    if (!validation.valid) return false;

    const architect = testerSquad.results.find(result => result.id === 'architect');
    if (!architect) return false;

    const targetGap = architect.budgets.gapBudget - (stageData.isTimeTrial ? 18 : 8);
    const targetRise = architect.budgets.riseBudget - (stageData.isTimeTrial ? 8 : 4);
    let changed = false;

    for (let i = 0; i < validation.pathIndices.length - 1; i++) {
        const from = stageData.platforms[validation.pathIndices[i]];
        const to = stageData.platforms[validation.pathIndices[i + 1]];
        const move = getReachMetrics(from, to, stageData.platforms);
        const gap = platformGap(from, to);
        const rise = Math.max(0, from.y - to.y);

        if (gap > targetGap) {
            const shift = Math.min(72, Math.ceil((gap - targetGap) * (stageData.isTimeTrial ? 0.9 : 0.65)));
            for (const platform of stageData.platforms) {
                if (platform === stageData.spawnPlatform) continue;
                if (platform.x < to.x) continue;
                platform.x = Math.max(stageData.spawnPlatform.x + stageData.spawnPlatform.w + 36, platform.x - shift);
            }
            changed = true;
        }

        if (rise > targetRise) {
            const drop = Math.min(52, Math.ceil((rise - targetRise) * 0.8));
            for (const platform of stageData.platforms) {
                if (platform === stageData.spawnPlatform || platform.role === 'floor') continue;
                if (platform.x + platform.w <= from.x) continue;
                platform.y = clamp(platform.y + drop, 76, canvas.height - 84);
            }
            changed = true;
        }

        const minimumLanding = Math.ceil(architect.budgets.minLandingWidth + (stageData.isTimeTrial ? 12 : 6));
        if (to.role !== 'goal' && to.role !== 'floor' && to.w < minimumLanding) {
            to.w = minimumLanding;
            changed = true;
        }

        if (move && move.dashRequired && stageData.isTimeTrial && to.w < minimumLanding + 18) {
            to.w = minimumLanding + 18;
            changed = true;
        }
    }

    if (!changed) return false;

    refreshStageGeometry(stageData);
    const topology = pruneDisconnectedPlatforms(stageData);
    stageData.meta.removedPlatforms += topology.removedPlatforms;
    stageData.topology = topology;

    const obstaclePlan = planStageObstacles(stageData, stageData.aiSummary);
    stageData.bugBudget = obstaclePlan.bugBudget;
    stageData.plannedObstacles = obstaclePlan.plannedObstacles;
    return true;
}

function passesStageComfortPolicy(stageData, validation) {
    if (!validation.valid) {
        return { ok: false, reason: validation.reason || 'invalid-route' };
    }

    if (stageData.stageIndex > 20) {
        return { ok: true, summary: summarizeCriticalPath(stageData, validation) };
    }

    const summary = summarizeCriticalPath(stageData, validation);
    const thresholds = {
        1: { steps: 4, maxGap: 110, maxRise: 48, dashEdges: 0, shortcutSteps: 0 },
        2: { steps: 5, maxGap: 130, maxRise: 60, dashEdges: 0, shortcutSteps: 0 },
        3: { steps: 6, maxGap: 160, maxRise: 72, dashEdges: 1, shortcutSteps: 1 },
        4: { steps: 7, maxGap: 170, maxRise: 82, dashEdges: 1, shortcutSteps: 1 },
        5: { steps: 8, maxGap: 186, maxRise: 92, dashEdges: 1, shortcutSteps: 2 },
        6: { steps: 9, maxGap: 205, maxRise: 100, dashEdges: 2, shortcutSteps: 2 },
        7: { steps: 10, maxGap: 220, maxRise: 108, dashEdges: 2, shortcutSteps: 2 },
        8: { steps: 10, maxGap: 230, maxRise: 114, dashEdges: 2, shortcutSteps: 2 },
        9: { steps: 11, maxGap: 240, maxRise: 120, dashEdges: 2, shortcutSteps: 3 },
        10: { steps: 11, maxGap: 248, maxRise: 124, dashEdges: 3, shortcutSteps: 3 },
        11: { steps: 12, maxGap: 254, maxRise: 128, dashEdges: 3, shortcutSteps: 3 },
        12: { steps: 12, maxGap: 260, maxRise: 132, dashEdges: 3, shortcutSteps: 3 },
    }[stageData.stageIndex];

    // For stages 13-20, compute scaled thresholds
    if (!thresholds) {
        const scale = Math.min(1.5, 1 + (stageData.stageIndex - 12) * 0.04);
        const computedThresholds = {
            steps: Math.floor(12 * scale),
            maxGap: Math.floor(260 * scale),
            maxRise: Math.floor(132 * scale),
            dashEdges: 3 + Math.floor((stageData.stageIndex - 12) / 3),
            shortcutSteps: 3 + Math.floor((stageData.stageIndex - 12) / 4),
        };
        const tooManySteps = summary.steps > computedThresholds.steps;
        const tooWide = summary.maxGap > computedThresholds.maxGap;
        const tooTall = summary.maxRise > computedThresholds.maxRise;
        const tooDashy = summary.dashEdges > computedThresholds.dashEdges;
        const tooBranchy = summary.shortcutSteps > computedThresholds.shortcutSteps;
        const tooTightTime = stageData.isTimeTrial && validation.shortestEta > stageData.timeLimit - 3;

        if (tooManySteps || tooWide || tooTall || tooDashy || tooBranchy || tooTightTime) {
            return { ok: false, reason: 'over-tuned-mid', summary };
        }
        return { ok: true, summary };
    }

    const tooManySteps = summary.steps > thresholds.steps;
    const tooWide = summary.maxGap > thresholds.maxGap;
    const tooTall = summary.maxRise > thresholds.maxRise;
    const tooDashy = summary.dashEdges > thresholds.dashEdges;
    const tooBranchy = summary.shortcutSteps > thresholds.shortcutSteps;
    const tooTightTime = stageData.isTimeTrial && validation.shortestEta > stageData.timeLimit - 4;

    if (tooManySteps || tooWide || tooTall || tooDashy || tooBranchy || tooTightTime) {
        return {
            ok: false,
            reason: 'over-tuned-early',
            summary,
        };
    }

    return { ok: true, summary };
}

function runStageVerificationSuite(stageData) {
    const geometryValidation = validateStage(stageData, []);
    const obstacleValidation = validateStage(stageData, stageData.obstacles || []);
    const comfort = stageData.comfort || passesStageComfortPolicy(stageData, obstacleValidation);
    const criticalPath = obstacleValidation.valid ? summarizeCriticalPath(stageData, obstacleValidation) : null;
    const testerSquad = stageData.testerSquad || runTesterSquad(stageData, obstacleValidation);

    return {
        geometryValidation,
        obstacleValidation,
        comfort,
        testerSquad,
        criticalPath,
        watchdogMargin: stageData.isTimeTrial && obstacleValidation.valid
            ? stageData.timeLimit - obstacleValidation.shortestEta
            : null,
    };
}

function fitValidatedVariant(stageData) {
    let obstacles = stageData.plannedObstacles.slice().sort((a, b) => b.threat - a.threat);
    let validation = validateStage(stageData, obstacles);
    let removedBugs = 0;
    let redesigns = 0;

    while (!validation.valid && obstacles.length) {
        obstacles.shift();
        removedBugs++;
        validation = validateStage(stageData, obstacles);
    }

    let comfort = passesStageComfortPolicy(stageData, validation);
    let testerSquad = runTesterSquad(stageData, validation);

    while (validation.valid && redesigns < 2 && (!comfort.ok || !testerSquad.ok)) {
        const changed = rebalanceStageRoute(stageData, validation, testerSquad);
        if (!changed) break;

        redesigns++;
        obstacles = stageData.plannedObstacles.slice().sort((a, b) => b.threat - a.threat);
        removedBugs = 0;
        validation = validateStage(stageData, obstacles);

        while (!validation.valid && obstacles.length) {
            obstacles.shift();
            removedBugs++;
            validation = validateStage(stageData, obstacles);
        }

        comfort = passesStageComfortPolicy(stageData, validation);
        testerSquad = runTesterSquad(stageData, validation);
    }

    return {
        valid: validation.valid && comfort.ok && testerSquad.ok,
        obstacles,
        removedBugs,
        validation,
        comfort,
        testerSquad,
        redesigns,
    };
}

function buildSafeFallbackStage(stageIndex, aiSummary) {
    const blueprint = getExternalStageBlueprint(stageIndex);
    const allowEarlyHazards = stageIndex <= 3;
    const candidateIds = [
        blueprint?.fallbackArchetypeId,
        blueprint?.archetypeId,
        ...(stageIndex <= 2
        ? ['intro-flats', 'recovery-floor']
        : stageIndex <= 4
            ? ['step-up', 'intro-flats', 'recovery-floor', 'split-route']
            : stageIndex <= 6
                ? ['split-route', 'step-up', 'low-tunnel', 'intro-flats', 'recovery-floor']
                : [SAFE_FALLBACK_ARCHETYPE_ID, 'intro-flats', 'step-up'])
    ].filter((value, index, list) => value && list.indexOf(value) === index);

    let lastCandidate = null;
    for (const archetypeId of candidateIds) {
        const archetype = ARCHETYPES_BY_ID[archetypeId];
        if (!archetype) continue;

        const safeDirector = createSafeDirector(stageIndex);
        const candidate = createStageCandidate(stageIndex, archetype, aiSummary, {
            disableBugs: !allowEarlyHazards,
            fallbackLevel: 2,
            director: safeDirector,
        });
        candidate.meta.fallbackLevel = 2;

        if (allowEarlyHazards) {
            const fitted = fitValidatedVariant(candidate);
            candidate.meta.removedBugs = fitted.removedBugs;
            candidate.meta.redesigns = fitted.redesigns;
            candidate.validation = fitted.validation;
            candidate.comfort = fitted.comfort;
            candidate.testerSquad = fitted.testerSquad;
            candidate.obstacles = fitted.obstacles;
            lastCandidate = candidate;
            if (fitted.valid) {
                return candidate;
            }
            continue;
        }

        candidate.meta.removedBugs = 0;
        candidate.validation = validateStage(candidate, []);
        candidate.comfort = passesStageComfortPolicy(candidate, candidate.validation);
        candidate.testerSquad = runTesterSquad(candidate, candidate.validation);
        candidate.obstacles = [];
        lastCandidate = candidate;

        if (candidate.validation.valid && candidate.comfort.ok && candidate.testerSquad.ok) {
            return candidate;
        }
    }

    return lastCandidate;
}

function buildValidatedStage(stageIndex) {
    const limitedTime = isLimitedTimeStage(stageIndex);
    const aiSummary = computeAIProfileSummary();
    const primaryDirector = buildStageDirector(stageIndex, aiSummary, limitedTime, 0);

    const primaryArchetype = selectArchetypeForStage(stageIndex, limitedTime, primaryDirector);
    let stageData = createStageCandidate(stageIndex, primaryArchetype, aiSummary, { director: primaryDirector });
    let fitted = fitValidatedVariant(stageData);

    if (fitted.valid) {
        stageData.meta.removedBugs = fitted.removedBugs;
        stageData.meta.redesigns = fitted.redesigns;
        stageData.meta.validationAttempts = fitted.removedBugs + 1;
        stageData.validation = fitted.validation;
        stageData.comfort = fitted.comfort;
        stageData.testerSquad = fitted.testerSquad;
        stageData.obstacles = fitted.obstacles;
        return stageData;
    }

    const fallbackDirector = buildStageDirector(stageIndex, aiSummary, limitedTime, 1);
    const fallbackArchetype = pickFallbackArchetype(stageIndex, primaryArchetype, limitedTime, fallbackDirector);
    stageData = createStageCandidate(stageIndex, fallbackArchetype, aiSummary, { director: fallbackDirector, fallbackLevel: 1 });
    stageData.meta.fallbackLevel = 1;
    fitted = fitValidatedVariant(stageData);

    if (fitted.valid) {
        stageData.meta.removedBugs = fitted.removedBugs;
        stageData.meta.redesigns = fitted.redesigns;
        stageData.meta.validationAttempts = fitted.removedBugs + 1;
        stageData.validation = fitted.validation;
        stageData.comfort = fitted.comfort;
        stageData.testerSquad = fitted.testerSquad;
        stageData.obstacles = fitted.obstacles;
        return stageData;
    }

    const safeFallback = buildSafeFallbackStage(stageIndex, aiSummary);
    if (!safeFallback.validation.valid || !safeFallback.comfort.ok || !safeFallback.testerSquad.ok) {
        logConsole(`[ERROR]: Safe fallback failed for stage ${stageIndex}.`, 'error');
    }
    return safeFallback;
}

function runStageLibrarySelfCheck() {
    const aiSummary = computeAIProfileSummary();
    let failures = 0;

    for (let i = 0; i < STAGE_ARCHETYPES.length; i++) {
        const stageIndex = i + 2;
        const director = buildStageDirector(stageIndex, aiSummary, isLimitedTimeStage(stageIndex), 0);
        const stageData = createStageCandidate(stageIndex, STAGE_ARCHETYPES[i], aiSummary, { disableBugs: true, director });
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

function instantiateRuntimeObstacle(obstacle) {
    const runtime = {
        ...obstacle,
        x: obstacle.x,
        y: obstacle.y,
        baseX: obstacle.x,
        baseY: obstacle.y,
    };

    if (runtime.type === 'crawler') {
        runtime.originX = obstacle.x;
    }

    if (runtime.type === 'turret') {
        runtime.fireTimer = Math.floor(((obstacle.phase || 0) / (Math.PI * 2)) * runtime.fireRate) % runtime.fireRate;
    }

    return runtime;
}

function spawnObstacleProjectile(obstacle) {
    const originX = obstacle.fireDir > 0 ? obstacle.x + obstacle.w + 4 : obstacle.x - 10;
    const originY = obstacle.y + 10;
    obstacleProjectiles.push({
        x: originX,
        y: originY,
        w: 10,
        h: 6,
        vx: obstacle.fireDir * obstacle.bulletSpeed,
        vy: 0,
        travelled: 0,
        maxDistance: obstacle.bulletRange,
        color: COLORS.playerGlow,
    });
    spawnParticle(originX, originY + 2, obstacle.fireDir * 1.2, (Math.random() - 0.5) * 0.2, COLORS.playerGlow, 16, 2);
}

function updateDynamicObstacles() {
    for (const obstacle of aiObstacles) {
        if (obstacle.type === 'crawler') {
            obstacle.x = obstacle.originX + Math.sin(frameCount * obstacle.moveSpeed + obstacle.phase) * obstacle.range;
        } else if (obstacle.type === 'turret') {
            obstacle.fireTimer++;
            if (obstacle.fireTimer >= obstacle.fireRate) {
                obstacle.fireTimer = 0;
                spawnObstacleProjectile(obstacle);
            }
        }
    }

    obstacleProjectiles = obstacleProjectiles.filter(projectile => {
        projectile.x += projectile.vx;
        projectile.y += projectile.vy;
        projectile.travelled += Math.abs(projectile.vx) + Math.abs(projectile.vy);
        return projectile.travelled <= projectile.maxDistance && projectile.x + projectile.w >= -24 && projectile.x <= levelWidth + 24;
    });
}

// ============================================
// SECTION 10B: DRONE SYSTEM
// ============================================
const DRONE_START_STAGE = 1;
const DRONE_COLOR = '#ff4488';
const DRONE_BULLET_COLOR = '#ff66aa';
const DRONE_SIZE = 18;
const DRONE_FLOAT_SPEED = 0.8;
const DRONE_TRACK_SPEED = 0.015;
const DRONE_HOVER_HEIGHT = 90;
const DRONE_BULLET_SPEED = 4.5;
const DRONE_BULLET_SIZE = 8;

function getDroneCount(stageIndex) {
    if (stageIndex < DRONE_START_STAGE) return 0;
    return 1 + Math.floor((stageIndex - DRONE_START_STAGE) / 10);
}

function getDroneFireRate(stageIndex) {
    // Frames between shots. Gets faster with stage.
    const base = 180;
    const reduction = Math.min(120, (stageIndex - DRONE_START_STAGE) * 4);
    return Math.max(60, base - reduction);
}

function spawnDrones(stageIndex, stageData) {
    const count = getDroneCount(stageIndex);
    if (count <= 0) return [];

    const droneList = [];
    for (let i = 0; i < count; i++) {
        const spawnX = stageData.spawn.x + 200 + (i * levelWidth / (count + 1));
        droneList.push({
            x: clamp(spawnX, stageData.spawn.x + 100, levelWidth - 100),
            y: 60 + i * 30,
            targetX: 0,
            targetY: 0,
            floatPhase: Math.random() * Math.PI * 2,
            fireTimer: Math.floor(Math.random() * getDroneFireRate(stageIndex)),
            fireRate: getDroneFireRate(stageIndex),
            bulletSpeed: DRONE_BULLET_SPEED + Math.min(stageIndex - DRONE_START_STAGE, 20) * 0.08,
            size: DRONE_SIZE,
            active: true,
        });
    }
    return droneList;
}

function updateDrones() {
    if (!drones.length) return;

    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    for (const drone of drones) {
        if (!drone.active) continue;

        // Track player with smooth lerp, hover above
        drone.targetX = playerCenterX + Math.sin(frameCount * 0.005 + drone.floatPhase) * 80;
        drone.targetY = playerCenterY - DRONE_HOVER_HEIGHT + Math.cos(frameCount * 0.008 + drone.floatPhase) * 20;
        drone.targetY = clamp(drone.targetY, 30, canvas.height - 80);

        drone.x += (drone.targetX - drone.x) * DRONE_TRACK_SPEED;
        drone.y += (drone.targetY - drone.y) * DRONE_TRACK_SPEED;

        // Float bobbing
        drone.y += Math.sin(frameCount * 0.04 + drone.floatPhase) * DRONE_FLOAT_SPEED;

        // Firing
        drone.fireTimer++;
        if (drone.fireTimer >= drone.fireRate) {
            drone.fireTimer = 0;
            fireDroneBullet(drone, playerCenterX, playerCenterY);
        }
    }

    // Update drone projectiles
    droneProjectiles = droneProjectiles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.travelled += Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        return p.travelled <= p.maxDistance &&
            p.x >= -50 && p.x <= levelWidth + 50 &&
            p.y >= -50 && p.y <= canvas.height + 100;
    });
}

function fireDroneBullet(drone, targetX, targetY) {
    const dx = targetX - drone.x;
    const dy = targetY - drone.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const vx = (dx / dist) * drone.bulletSpeed;
    const vy = (dy / dist) * drone.bulletSpeed;

    droneProjectiles.push({
        x: drone.x,
        y: drone.y + drone.size / 2,
        w: DRONE_BULLET_SIZE,
        h: DRONE_BULLET_SIZE,
        vx,
        vy,
        travelled: 0,
        maxDistance: 500,
    });

    // Muzzle flash particles
    spawnParticle(drone.x, drone.y + drone.size / 2, vx * 0.3, vy * 0.3, DRONE_BULLET_COLOR, 12, 2);
}

function drawDrones() {
    for (const drone of drones) {
        if (!drone.active) continue;
        const sx = drone.x - camera.x;
        const sy = drone.y;
        if (sx + drone.size < -30 || sx - drone.size > canvas.width + 30) continue;

        const pulse = Math.sin(frameCount * 0.06 + drone.floatPhase) * 0.15 + 0.85;

        // Glow
        ctx.globalAlpha = 0.15 * pulse;
        ctx.fillStyle = DRONE_COLOR;
        ctx.beginPath();
        ctx.arc(sx, sy + drone.size / 2, drone.size * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Body (diamond shape)
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = DRONE_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + drone.size * 0.6, sy + drone.size / 2);
        ctx.lineTo(sx, sy + drone.size);
        ctx.lineTo(sx - drone.size * 0.6, sy + drone.size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner eye (targeting indicator)
        ctx.globalAlpha = pulse;
        ctx.fillStyle = DRONE_COLOR;
        ctx.beginPath();
        ctx.arc(sx, sy + drone.size / 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Rotor lines
        const rotorAngle = frameCount * 0.15 + drone.floatPhase;
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = DRONE_BULLET_COLOR;
        ctx.lineWidth = 1;
        const rotorLen = drone.size * 0.7;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(rotorAngle) * rotorLen, sy - 2 + Math.sin(rotorAngle) * 3);
        ctx.lineTo(sx - Math.cos(rotorAngle) * rotorLen, sy - 2 - Math.sin(rotorAngle) * 3);
        ctx.stroke();

        ctx.globalAlpha = 1;
    }
}

function drawDroneProjectiles() {
    for (const p of droneProjectiles) {
        const sx = p.x - camera.x;
        const sy = p.y;
        if (sx + p.w < -20 || sx > canvas.width + 20) continue;

        // Glow trail
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = DRONE_BULLET_COLOR;
        ctx.beginPath();
        ctx.arc(sx + p.w / 2, sy + p.h / 2, p.w, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.globalAlpha = 1;
        ctx.fillStyle = DRONE_BULLET_COLOR;
        ctx.beginPath();
        ctx.arc(sx + p.w / 2, sy + p.h / 2, p.w / 2, 0, Math.PI * 2);
        ctx.fill();

        // Bright center
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(sx + p.w / 2, sy + p.h / 2, p.w / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
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
function showStageAlert(alert, callback) {
    if (!alert) {
        callback();
        return;
    }

    audioManager.playAlert();
    stageAlertTitle.textContent = alert.title;
    stageAlertSubtitle.textContent = alert.subtitle || '';
    if (stageAlertBody) stageAlertBody.textContent = alert.body || '';
    stageAlert.classList.remove('hidden');
    stageAlert.classList.remove('stage-alert-active');
    void stageAlert.offsetWidth;
    stageAlert.classList.add('stage-alert-active');

    setTimeout(() => {
        stageAlert.classList.remove('stage-alert-active');
        stageAlert.classList.add('hidden');
        callback();
    }, alert.duration || STAGE_ALERT_DURATION);
}

function markIntroSeen(group, id) {
    if (!introState[group]) introState[group] = {};
    if (introState[group][id]) return;
    introState[group][id] = true;
    saveIntroState();
}

function collectStageEntryAlerts(stageData) {
    const alerts = [];

    if (userSettings.obstacleAlerts) {
        const obstacleTypes = [...new Set((stageData.obstacles || []).map(obstacle => obstacle.type))];
        for (const type of obstacleTypes) {
            const copy = INTRO_COPY.obstacles[type];
            if (!copy || introState.obstacles[type]) continue;
            markIntroSeen('obstacles', type);
            alerts.push({
                ...copy,
                duration: FIRST_TIME_ALERT_DURATION,
            });
        }
    } else {
        const obstacleTypes = [...new Set((stageData.obstacles || []).map(obstacle => obstacle.type))];
        obstacleTypes.forEach(type => {
            if (INTRO_COPY.obstacles[type]) markIntroSeen('obstacles', type);
        });
    }

    if (userSettings.abilityAlerts) {
        for (const abilityId of stageData.justUnlockedAbilities || []) {
            const copy = INTRO_COPY.abilities[abilityId];
            if (!copy || introState.abilities[abilityId]) continue;
            markIntroSeen('abilities', abilityId);
            alerts.push({
                ...copy,
                duration: FIRST_TIME_ALERT_DURATION,
            });
        }
    } else {
        (stageData.justUnlockedAbilities || []).forEach(abilityId => {
            if (INTRO_COPY.abilities[abilityId]) markIntroSeen('abilities', abilityId);
        });
    }

    if (stageData.isTimeTrial) {
        alerts.push({
            title: 'LIMITED TIME STAGE',
            subtitle: `COMPLETE IN ${stageData.timeLimit}s`,
            body: 'This stage is slightly kinder on layout, but the watchdog will kill the run if you slow down.',
            duration: STAGE_ALERT_DURATION,
        });
    }

    // Drone intro alert
    if (userSettings.obstacleAlerts && currentStage >= 10) {
        const copy = INTRO_COPY.drones?.drone;
        if (copy && !(introState.drones && introState.drones.drone)) {
            markIntroSeen('drones', 'drone');
            alerts.push({
                ...copy,
                duration: FIRST_TIME_ALERT_DURATION,
            });
        }
    } else if (currentStage >= DRONE_START_STAGE) {
        if (INTRO_COPY.drones?.drone) markIntroSeen('drones', 'drone');
    }

    return alerts;
}

function showStageEntryAlerts(stageData, callback) {
    const alerts = collectStageEntryAlerts(stageData);
    if (!alerts.length) {
        callback();
        return;
    }

    const next = index => {
        if (index >= alerts.length) {
            callback();
            return;
        }
        showStageAlert(alerts[index], () => next(index + 1));
    };

    next(0);
}

function showLoadingScreen(stageIndex, callback) {
    gameState = 'loading';
    audioManager.syncMix();
    deathOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
    loadingOverlay.classList.remove('hidden');
    loadingStageNum.textContent = String(stageIndex).padStart(3, '0');
    loadingTerminal.innerHTML = '';
    loadingBar.style.width = '0%';
    loadingStatus.textContent = 'Initializing...';

    const result = buildValidatedStage(stageIndex);
    const aiSummary = result.aiSummary;
    const verification = runStageVerificationSuite(result);
    const shortestEtaLabel = Number.isFinite(verification.obstacleValidation.shortestEta) ? verification.obstacleValidation.shortestEta.toFixed(2) : 'n/a';
    const geometryEtaLabel = Number.isFinite(verification.geometryValidation.shortestEta) ? verification.geometryValidation.shortestEta.toFixed(2) : 'n/a';
    const marginLabel = Number.isFinite(verification.watchdogMargin) ? verification.watchdogMargin.toFixed(2) : null;
    const pathSummary = verification.criticalPath;
    const testerSummary = verification.testerSquad.summary || `${verification.testerSquad.passCount}/${verification.testerSquad.requiredPasses}`;
    const messages = [
        { t: 0 * LOADING_STEP_MS, text: `$ hotfix build stage_${String(stageIndex).padStart(3, '0')} --archetype ${result.archetypeId}`, cls: 'lt-info' },
        { t: 1 * LOADING_STEP_MS, text: `[COMPILER]: Loading archetype ${result.archetypeName}...`, cls: 'lt-system', pct: 10 },
        { t: 2 * LOADING_STEP_MS, text: `[AI]: Cleared stages in profile: ${aiSummary.clearedStages}`, cls: 'lt-ai', pct: 20 },
        { t: 3 * LOADING_STEP_MS, text: `[AI]: Preferred lane => ${aiSummary.preferredLane.toUpperCase()}`, cls: 'lt-ai', pct: 28 },
        { t: 4 * LOADING_STEP_MS, text: `[DIRECTOR]: ${result.variantName} | bias ${result.director.laneBias.toUpperCase()}`, cls: 'lt-ai', pct: 38 },
        { t: 5 * LOADING_STEP_MS, text: `[AI]: ${aiSummary.tendencyText}`, cls: 'lt-warning', pct: 46 },
        { t: 6 * LOADING_STEP_MS, text: `[LEVELER]: Tier ${result.tier + 1} | Budget ${result.bugBudget} hazard(s)`, cls: 'lt-system', pct: 56 },
        { t: 7 * LOADING_STEP_MS, text: `[TESTER-1]: Geometry route OK (${geometryEtaLabel}s obstacle-free ETA)`, cls: 'lt-system', pct: 66 },
        { t: 8 * LOADING_STEP_MS, text: `[TESTER-2]: Obstacle route OK (${shortestEtaLabel}s live ETA)`, cls: 'lt-success', pct: 78 },
        { t: 9 * LOADING_STEP_MS, text: `[TESTER-3]: Comfort gate ${verification.comfort.ok ? 'PASS' : 'FAIL'}${pathSummary ? ` | steps ${pathSummary.steps} | gap ${Math.round(pathSummary.maxGap)} | rise ${Math.round(pathSummary.maxRise)}` : ''}`, cls: verification.comfort.ok ? 'lt-success' : 'lt-error', pct: 88 },
        { t: 10 * LOADING_STEP_MS, text: `[TESTER-4]: Squad ${verification.testerSquad.ok ? 'PASS' : 'FAIL'} (${testerSummary})`, cls: verification.testerSquad.ok ? 'lt-success' : 'lt-error', pct: 95 },
        { t: 11 * LOADING_STEP_MS, text: `[SYSTEM]: Stage ${stageIndex} ready. Deploying runtime...`, cls: 'lt-success', pct: 100 },
    ];

    if (result.blueprint) {
        messages.splice(5, 0, {
            t: 4.5 * LOADING_STEP_MS,
            text: `[PY-AI]: Blueprint ${result.blueprint.id} via ${result.blueprintProvider || 'external-library'}`,
            cls: 'lt-ai',
            pct: 42,
        });
    }

    if (result.isTimeTrial) {
        messages.splice(6, 0, {
            t: 6.5 * LOADING_STEP_MS,
            text: `[WATCHDOG]: LIMITED TIME STAGE - ${result.timeLimit}s${marginLabel !== null ? ` | margin ${marginLabel}s` : ''}`,
            cls: 'lt-error',
            pct: 50,
        });
    }

    if (result.meta.removedBugs > 0) {
        messages.splice(messages.length - 2, 0, {
            t: 8.5 * LOADING_STEP_MS,
            text: `[VALIDATOR]: Removed ${result.meta.removedBugs} hazard(s) to preserve a valid route.`,
            cls: 'lt-warning',
            pct: 84,
        });
    }

    if (result.meta.removedPlatforms > 0) {
        messages.splice(messages.length - 2, 0, {
            t: 8.2 * LOADING_STEP_MS,
            text: `[TESTER-2B]: Pruned ${result.meta.removedPlatforms} unreachable platform(s) from this build.`,
            cls: 'lt-warning',
            pct: 82,
        });
    }

    if (result.meta.redesigns > 0) {
        messages.splice(messages.length - 2, 0, {
            t: 8.35 * LOADING_STEP_MS,
            text: `[DIRECTOR]: Tester squad forced ${result.meta.redesigns} route redesign pass(es).`,
            cls: 'lt-warning',
            pct: 83,
        });
    }

    if (result.meta.fallbackLevel === 1) {
        messages.splice(5, 0, {
            t: 4.5 * LOADING_STEP_MS,
            text: `[SYSTEM]: Primary archetype failed. Switching to fallback build.`,
            cls: 'lt-warning',
            pct: 42,
        });
    } else if (result.meta.fallbackLevel === 2) {
        messages.splice(5, 0, {
            t: 4.5 * LOADING_STEP_MS,
            text: `[SYSTEM]: Escalating to safe fallback build.`,
            cls: 'lt-error',
            pct: 42,
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
            }, LOADING_DEPLOY_DELAY_MS);
            return;
        }

        loadingStatus.textContent = messageIndex < 4 ? 'Compiling...' : messageIndex < 7 ? 'Profiling...' : 'Testing stage...';
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

function getAirJumpCapacity() {
    return currentStageData?.abilities?.doubleJump ? PLAYER_AIR_JUMPS : 0;
}

function updatePlayer() {
    if (gameState !== 'playing') return;

    const wasOnGround = player.onGround;
    const verticalSpeedBeforeStep = player.vy;
    updateDynamicObstacles();
    updateDrones();
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
        if (player.coyoteCounter > 0 || player.airJumpsRemaining > 0) {
            const usingAirJump = player.coyoteCounter <= 0;
            player.vy = JUMP_FORCE;
            if (usingAirJump) {
                player.vy *= 0.96;
                player.airJumpsRemaining--;
            }
            player.onGround = false;
            player.coyoteCounter = 0;
            jumpBufferCounter = 0;
            analytics.stageJumps++;
            analytics.totalJumps++;
            audioManager.playJump();
            for (let i = 0; i < 6; i++) {
                spawnParticle(
                    player.x + player.width / 2 + (Math.random() - 0.5) * 14,
                    player.y + player.height,
                    (Math.random() - 0.5) * 3,
                    -Math.random() * 2,
                    usingAirJump ? COLORS.playerDash : COLORS.playerGlow,
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
        audioManager.playDash();
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

    if (!wasOnGround && player.onGround && verticalSpeedBeforeStep > 4) {
        audioManager.playLand(clamp(verticalSpeedBeforeStep / MAX_FALL_SPEED, 0.6, 1.2));
    }
    if (player.onGround) {
        player.airJumpsRemaining = getAirJumpCapacity();
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
            if (!adminMode) {  // 🎮 ADMIN: Skip death on hazard
                playerDeath(obstacle.type);
                return;
            }
        }
    }

    for (const projectile of obstacleProjectiles) {
        if (aabb(player.x + 2, player.y + 2, player.width - 4, player.height - 4, projectile.x, projectile.y, projectile.w, projectile.h)) {
            if (!adminMode) {
                playerDeath('projectile');
                return;
            }
        }
    }

    // Drone projectile collision
    for (const projectile of droneProjectiles) {
        if (aabb(player.x + 2, player.y + 2, player.width - 4, player.height - 4, projectile.x, projectile.y, projectile.w, projectile.h)) {
            if (!adminMode) {
                playerDeath('drone');
                return;
            }
        }
    }

    if (aabb(player.x, player.y, player.width, player.height, goal.x, goal.y, goal.w, goal.h)) {
        playerWin();
        return;
    }

    if (player.y > canvas.height + 60) {
        if (adminMode) {  // 🎮 ADMIN: Auto-win on fall
            logConsole('[ADMIN]: Auto-win triggered (void in test mode)', 'warning');
            playerWin();
        } else {
            playerDeath('void');
        }
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
        if (adminMode) {  // 🎮 ADMIN: Auto-win on timeout
            logConsole('[ADMIN]: Auto-win triggered (timeout in test mode)', 'warning');
            playerWin();
        } else {
            playerDeath('timeout');
        }
    }
}

// ============================================
// SECTION 15: DEATH / WIN
// ============================================
function playerDeath(cause) {
    currentTime = performance.now() - runStartTime;
    gameState = 'dead';
    audioManager.syncMix();
    analytics.stageDeaths++;
    analytics.totalRuns++;

    aiProfile.recentDeaths.push({
        stageIndex: currentStage,
        cause,
        archetypeId: currentStageData ? currentStageData.archetypeId : 'unknown',
    });
    if (aiProfile.recentDeaths.length > 6) aiProfile.recentDeaths.shift();

    spawnExplosion(player.x + player.width / 2, player.y + player.height / 2, COLORS.deathZone, 20);
    audioManager.playDeath(cause);
    deathOverlay.classList.remove('hidden');

    const deathMessages = {
        bug: 'Caught by a Bug patch. Exception thrown.',
        laser: 'Terminated by Laser firewall. Access denied.',
        spike: 'Impaled on Spike assertion. Stack trace lost.',
        turret: 'Tagged by a Sentry Turret. Runtime punctured.',
        crawler: 'Pinned by a Moving Crawler. Route collapsed.',
        projectile: 'Shot by a live round. Thread terminated.',
        drone: 'Locked by Patrol Drone. Air superiority denied.',
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
    audioManager.syncMix();
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
    audioManager.playWin();
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
    obstacleProjectiles = [];
    drones = [];
    droneProjectiles = [];
    currentPath = [];
    particles = [];
    maxDistanceThisRun = 0;
    hudBest.textContent = '--:--.---';
    abilityState = createAbilityState();
    resetAnalytics();
    resetAIProfile();
    adminMode = false; // Reset admin mode on new campaign
}

function startGame() {
    if (gameState !== 'title') return;

    playerName = (playerNameInput.value.trim() || 'anonymous').substring(0, 16);
    const isAdmin = playerNameInput.value.trim() === 'admin12321';
    
    localStorage.setItem('hotfix_player_name', playerName);
    // Reload intro state for this handle (new handle = fresh alerts)
    introState = loadIntroState(playerName);
    beginCampaignRun();
    audioManager.unlock();
    audioManager.playStart();

    titleScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    stageAlert.classList.add('hidden');
    loadingOverlay.classList.add('hidden');
    resizeCanvas();

    consoleOutput.innerHTML = '';
    logConsole('[SYSTEM]: Initializing endless runtime...', 'system');
    logConsole('[AI]: Archetype library online. Adaptive counters enabled.', 'ai');
    logConsole(`[AUDIO]: ${audioManager.isMuted() ? 'Muted' : 'Synthwave bus online.'}`, 'info');
    logConsole('-'.repeat(40), 'info');

    resetCampaignState();

    // 🔑 CHECK ADMIN MODE (must be after resetCampaignState which clears adminMode)
    adminMode = isAdmin;
    if (adminMode) {
        logConsole('[ADMIN]: 🎮 Cheat mode enabled. Hazards disabled, auto-win on void/timeout.', 'warning');
    }

    advanceToNextStage();
}

function applyStageResult(stageData) {
    const justUnlockedAbilities = [];
    if (stageData.abilities?.doubleJump && !abilityState.doubleJumpUnlocked) {
        abilityState.doubleJumpUnlocked = true;
        justUnlockedAbilities.push('double-jump');
    }

    currentStageData = stageData;
    platforms = stageData.platforms;
    goal = stageData.goal;
    spawnPoint = stageData.spawn;
    levelWidth = stageData.levelWidth;
    timeLimit = stageData.timeLimit;
    isTimeTrial = stageData.isTimeTrial;
    stageData.justUnlockedAbilities = justUnlockedAbilities;
    aiObstacles = stageData.obstacles.map(instantiateRuntimeObstacle);
    obstacleProjectiles = [];
    drones = spawnDrones(currentStage, stageData);
    droneProjectiles = [];
    currentPath = [];
    previousPaths = [];
    lastArchetypeId = stageData.archetypeId;
    registerDirectorMemory(stageData);
}

function startRun() {
    stageRunNumber = 1;
    totalRunNumber++;
    gameState = 'playing';
    audioManager.syncMix();

    player.x = spawnPoint.x;
    player.y = spawnPoint.y;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.coyoteCounter = 0;
    player.dashTimer = 0;
    player.dashCooldown = 0;
    player.facingRight = true;
    player.airJumpsRemaining = currentStageData?.abilities?.doubleJump ? PLAYER_AIR_JUMPS : 0;
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
    hudVersion.textContent = `v${currentStage}.${currentStageData.tier + 1}.${aiObstacles.length}${currentStageData.abilities?.doubleJump ? '.DJ' : ''}`;
    hudPatches.textContent = String(aiObstacles.length);
    hudTimer.textContent = '00:00.000';

    logConsole(`[SYSTEM]: === STAGE ${currentStage}${isTimeTrial ? ' [LIMITED TIME]' : ''} ===`, 'system');
    logConsole(`[AI]: Director ${currentStageData.variantName} | Archetype ${currentStageData.archetypeName}`, 'ai');
    logConsole(`[SYSTEM]: Budget ${currentStageData.bugBudget} | Live ${aiObstacles.length} hazard(s) | Seed ${currentStageData.director.variantCode}`, 'system');
    if (currentStageData.blueprint) {
        logConsole(`[PY-AI]: ${currentStageData.blueprint.id} via ${currentStageData.blueprintProvider || 'external-library'}`, 'ai');
    }
    if (currentStageData.justUnlockedAbilities?.includes('double-jump')) {
        logConsole('[ABILITY]: Double Jump unlocked for this run.', 'success');
    } else if (currentStageData.abilities?.doubleJump) {
        logConsole('[ABILITY]: Double Jump online.', 'info');
    }
    if (currentStageData.testerSquad) {
        logConsole(`[TESTER]: Squad ${currentStageData.testerSquad.passCount}/${currentStageData.testerSquad.requiredPasses} -> ${currentStageData.testerSquad.summary}`, 'success');
    }
    if (isTimeTrial) {
        logConsole(`[WARNING]: LIMITED TIME STAGE - clear in ${timeLimit}s.`, 'warning');
    }
    if (drones.length > 0) {
        logConsole(`[THREAT]: ${drones.length} Patrol Drone(s) deployed. Watch the skies.`, 'warning');
    }
}

function advanceToNextStage() {
    currentStage++;
    const bootStage = result => {
        applyStageResult(result);
        showStageEntryAlerts(result, startRun);
    };
    showLoadingScreen(currentStage, bootStage);
}

function restartCampaign() {
    deathOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
    stageAlert.classList.add('hidden');
    loadingOverlay.classList.add('hidden');
    beginCampaignRun();
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
    audioManager.syncMix();
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
// SECTION 17: LEADERBOARD (Backend-Persistent)
// ============================================
const LB_KEY = 'hotfix_leaderboard';
const LB_MAX = 20;
const API_BASE = '/api/leaderboard';

// In-memory cache of leaderboard data
let leaderboardCache = [];

function getDistancePercent() {
    if (levelWidth <= 0) return 0;
    const distance = Math.max(maxDistanceThisRun, player.x);
    return Math.min(100, Math.round((distance / levelWidth) * 100));
}

function calculateScore(stage, distPct) {
    return stage * 1000 + Math.round(distPct * 10);
}

// ── LocalStorage fallback helpers ───────────────
function loadLeaderboardLocal() {
    try {
        const data = localStorage.getItem(LB_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveLeaderboardLocal(leaderboard) {
    try {
        localStorage.setItem(LB_KEY, JSON.stringify(leaderboard));
    } catch {
        // Ignore storage quota failures.
    }
}

// ── API helpers ─────────────────────────────────
async function fetchLeaderboardFromServer() {
    try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.leaderboard)) {
            leaderboardCache = data.leaderboard;
            saveLeaderboardLocal(leaderboardCache);
            return leaderboardCache;
        }
    } catch (err) {
        console.warn('[LEADERBOARD] Server unavailable, using local fallback:', err.message);
    }
    leaderboardCache = loadLeaderboardLocal();
    return leaderboardCache;
}

async function saveScoreToServer(name, stage, distPct, score) {
    try {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name || 'anonymous',
                stage,
                dist: distPct,
                score,
            }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.leaderboard)) {
            leaderboardCache = data.leaderboard;
            saveLeaderboardLocal(leaderboardCache);
            return;
        }
    } catch (err) {
        console.warn('[LEADERBOARD] Server save failed, saving locally:', err.message);
    }
    // Fallback: save locally
    const leaderboard = loadLeaderboardLocal();
    leaderboard.push({
        name: name || 'anonymous',
        stage,
        dist: distPct,
        score,
        time: Date.now(),
    });
    leaderboard.sort((a, b) => b.score - a.score);
    while (leaderboard.length > LB_MAX) leaderboard.pop();
    saveLeaderboardLocal(leaderboard);
    leaderboardCache = leaderboard;
}

async function clearLeaderboardOnServer() {
    try {
        const res = await fetch(API_BASE, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
        console.warn('[LEADERBOARD] Server clear failed:', err.message);
    }
    localStorage.removeItem(LB_KEY);
    leaderboardCache = [];
}

// ── Public API (used by the rest of the game) ───
function loadLeaderboard() {
    return leaderboardCache.length ? leaderboardCache : loadLeaderboardLocal();
}

function saveScore(name, stage, distPct, score) {
    // Fire and forget — updates cache + localStorage async
    saveScoreToServer(name, stage, distPct, score);
}

function clearLeaderboard() {
    clearLeaderboardOnServer().then(() => renderLeaderboard());
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
    // Fetch fresh data from server, then render
    fetchLeaderboardFromServer().then(() => {
        renderLeaderboard();
        leaderboardOverlay.classList.remove('hidden');
    });
}

function hideLeaderboard() {
    leaderboardOverlay.classList.add('hidden');
}

// ============================================
// SECTION 18: RENDERING
// ============================================
function drawSkylineLayer(theme, options) {
    const layerCamera = camera.x * options.parallax;
    const startIndex = Math.floor((layerCamera - 240) / options.spacing) - 2;
    const endIndex = Math.ceil((layerCamera + canvas.width + 240) / options.spacing) + 2;

    for (let index = startIndex; index <= endIndex; index++) {
        const widthNoise = hashNoise(index * 7.31 + options.seed + currentStage * 0.3);
        const heightNoise = hashNoise(index * 11.77 + options.seed * 0.7 + currentStage * 0.5);
        const width = Math.round(lerp(options.minWidth, options.maxWidth, widthNoise));
        const height = Math.round(lerp(options.minHeight, options.maxHeight, heightNoise));
        const jitter = Math.round((widthNoise - 0.5) * 24);
        const sx = Math.round(index * options.spacing + jitter - layerCamera);
        const sy = options.baseY - height;

        ctx.fillStyle = options.fill;
        ctx.fillRect(sx, sy, width, height);

        ctx.fillStyle = hexToRgba('#ffffff', 0.03);
        ctx.fillRect(sx + width - 8, sy, 2, height);

        const windowCols = Math.max(1, Math.floor((width - 10) / 16));
        const windowRows = Math.max(2, Math.floor((height - 14) / 18));
        const windowAlpha = options.windowAlpha || 0.24;

        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                const lit = hashNoise(index * 17 + row * 5 + col * 13 + options.seed) > 0.42;
                if (!lit) continue;
                const wx = sx + 6 + col * 12;
                const wy = sy + 8 + row * 14;
                const color = (row + col + index) % 3 === 0 ? options.windowAlt : options.windowColor;
                ctx.fillStyle = hexToRgba(color, windowAlpha);
                ctx.fillRect(wx, wy, 6, 4);
            }
        }

        if (options.billboards && hashNoise(index * 21 + options.seed * 3) > 0.76) {
            const boardW = Math.min(width - 16, 26 + Math.round(widthNoise * 20));
            const boardH = 8 + Math.round(heightNoise * 8);
            const boardX = sx + Math.round((width - boardW) * 0.5);
            const boardY = sy + 10;
            ctx.fillStyle = hexToRgba(options.windowColor, 0.35);
            ctx.fillRect(boardX, boardY, boardW, boardH);
            ctx.fillStyle = hexToRgba('#ffffff', 0.45);
            ctx.fillRect(boardX + 2, boardY + 2, boardW - 4, 2);
        }
    }
}

function drawBackground() {
    const theme = getVisualTheme();
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, theme.skyTop);
    skyGradient.addColorStop(0.6, theme.skyBottom);
    skyGradient.addColorStop(1, '#05070f');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glowX = canvas.width * 0.72 - camera.x * 0.05;
    const glowY = canvas.height * 0.24;
    const mainGlow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, 160);
    mainGlow.addColorStop(0, hexToRgba(theme.sun, 0.42));
    mainGlow.addColorStop(0.45, hexToRgba(theme.haze, 0.16));
    mainGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = mainGlow;
    ctx.fillRect(glowX - 180, glowY - 180, 360, 360);

    const accentGlow = ctx.createRadialGradient(canvas.width * 0.2, canvas.height * 0.2, 0, canvas.width * 0.2, canvas.height * 0.2, 220);
    accentGlow.addColorStop(0, hexToRgba(theme.hazeSecondary, 0.18));
    accentGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = accentGlow;
    ctx.fillRect(-40, -40, 420, 320);

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = hexToRgba(theme.sun, 0.18);
    ctx.beginPath();
    ctx.arc(glowX, glowY, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    drawSkylineLayer(theme, {
        parallax: 0.15,
        seed: 17,
        baseY: canvas.height * 0.7,
        spacing: 76,
        minWidth: 34,
        maxWidth: 70,
        minHeight: 40,
        maxHeight: 110,
        fill: theme.cityFar,
        windowColor: theme.windows,
        windowAlt: theme.windowsAlt,
        windowAlpha: 0.12,
        billboards: false,
    });
    drawSkylineLayer(theme, {
        parallax: 0.28,
        seed: 41,
        baseY: canvas.height * 0.78,
        spacing: 92,
        minWidth: 42,
        maxWidth: 86,
        minHeight: 60,
        maxHeight: 150,
        fill: theme.cityMid,
        windowColor: theme.windowsAlt,
        windowAlt: theme.windows,
        windowAlpha: 0.18,
        billboards: true,
    });
    drawSkylineLayer(theme, {
        parallax: 0.42,
        seed: 79,
        baseY: canvas.height * 0.86,
        spacing: 104,
        minWidth: 52,
        maxWidth: 110,
        minHeight: 76,
        maxHeight: 200,
        fill: theme.cityNear,
        windowColor: theme.windows,
        windowAlt: theme.windowsAlt,
        windowAlpha: 0.25,
        billboards: true,
    });

    const horizonGlow = ctx.createLinearGradient(0, canvas.height * 0.58, 0, canvas.height);
    horizonGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    horizonGlow.addColorStop(0.55, hexToRgba(theme.haze, 0.08));
    horizonGlow.addColorStop(1, hexToRgba(theme.hazeSecondary, 0.12));
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);

    const gridSize = 48;
    const offsetX = camera.x % gridSize;
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.gridLine;
    ctx.beginPath();
    for (let x = -offsetX; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, canvas.height * 0.48);
        ctx.lineTo(x, canvas.height);
    }
    for (let y = canvas.height * 0.48; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    ctx.strokeStyle = COLORS.gridLineMajor;
    ctx.beginPath();
    for (let x = -offsetX; x < canvas.width; x += gridSize * 4) {
        ctx.moveTo(x, canvas.height * 0.45);
        ctx.lineTo(x, canvas.height);
    }
    ctx.stroke();

    for (let i = 0; i < 22; i++) {
        const seed = i + currentStage * 11;
        const rx = ((seed * 73) - camera.x * 0.18) % (canvas.width + 140);
        const x = rx < 0 ? rx + canvas.width + 140 : rx;
        const y = ((frameCount * 7) + i * 35) % (canvas.height + 120) - 120;
        ctx.strokeStyle = hexToRgba(theme.accentSoft, 0.12);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 8, y + 22);
        ctx.stroke();
    }

    ctx.fillStyle = COLORS.lineNumbers;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    for (let y = gridSize; y < canvas.height; y += gridSize) {
        ctx.fillText(String(Math.floor(y / gridSize)), 26, y + 3);
    }
    ctx.textAlign = 'left';
}

function drawPlatforms() {
    const theme = getVisualTheme();
    ctx.font = '9px "JetBrains Mono", monospace';
    for (const platform of platforms) {
        const sx = platform.x - camera.x;
        const sy = platform.y;
        if (sx + platform.w < -20 || sx > canvas.width + 20) continue;

        const topColor = platform.role === 'shortcut'
            ? '#8cff8a'
            : platform.role === 'floor'
                ? theme.floorTop
                : theme.accent;
        const edgeColor = platform.role === 'floor' ? hexToRgba(theme.floorTop, 0.45) : theme.platformEdge;
        const fillGradient = ctx.createLinearGradient(sx, sy, sx, sy + platform.h);
        fillGradient.addColorStop(0, theme.platformMain);
        fillGradient.addColorStop(1, '#0a121d');

        ctx.fillStyle = hexToRgba('#000000', 0.22);
        ctx.fillRect(sx + 4, sy + platform.h, platform.w, 8);

        ctx.fillStyle = fillGradient;
        ctx.fillRect(sx, sy, platform.w, platform.h);
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 1.25;
        ctx.strokeRect(sx + 0.5, sy + 0.5, platform.w - 1, platform.h - 1);

        ctx.fillStyle = topColor;
        ctx.fillRect(sx, sy, platform.w, platform.role === 'floor' ? 4 : 3);

        ctx.save();
        ctx.beginPath();
        ctx.rect(sx, sy, platform.w, platform.h);
        ctx.clip();
        ctx.strokeStyle = hexToRgba('#ffffff', 0.06);
        ctx.lineWidth = 1;
        for (let stripe = -platform.h; stripe < platform.w + platform.h; stripe += 18) {
            ctx.beginPath();
            ctx.moveTo(sx + stripe, sy + platform.h);
            ctx.lineTo(sx + stripe + platform.h, sy);
            ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = hexToRgba(topColor, 0.16);
        ctx.fillRect(sx, sy - 4, platform.w, 7);

        for (let node = 8; node < platform.w - 6; node += 26) {
            ctx.fillStyle = hexToRgba(topColor, 0.65);
            ctx.fillRect(sx + node, sy + 5, 5, 2);
        }

        if (platform.role !== 'floor' && platform.h <= 22) {
            ctx.strokeStyle = hexToRgba(edgeColor, 0.42);
            ctx.beginPath();
            for (let brace = 14; brace < platform.w - 4; brace += 30) {
                ctx.moveTo(sx + brace, sy + platform.h);
                ctx.lineTo(sx + brace - 7, sy + platform.h + 10);
                ctx.moveTo(sx + brace + 6, sy + platform.h);
                ctx.lineTo(sx + brace + 13, sy + platform.h + 10);
            }
            ctx.stroke();
        }

        ctx.fillStyle = hexToRgba(topColor, 0.24);
        const label = platform.role === 'shortcut'
            ? 'ALT'
            : platform.role === 'floor'
                ? 'BASE'
                : `${currentStageData ? currentStageData.archetypeId.toUpperCase() : 'PLAT'}`;
        ctx.fillText(label, sx + 5, sy + platform.h / 2 + 3);
    }
}

function drawGoal() {
    const theme = getVisualTheme();
    const sx = goal.x - camera.x;
    const centerX = sx + goal.w / 2;
    const centerY = goal.y + goal.h / 2;
    const pulse = Math.sin(frameCount * 0.08) * 0.3 + 0.7;

    ctx.globalAlpha = 0.12 * pulse;
    ctx.fillStyle = hexToRgba(theme.accent, 0.8);
    ctx.fillRect(sx - 14, goal.y - 18, goal.w + 28, goal.h + 36);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = hexToRgba(COLORS.goal, 0.85);
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 5, goal.y + 4, goal.w - 10, goal.h - 8);
    ctx.strokeStyle = hexToRgba(theme.accent, 0.55);
    ctx.strokeRect(sx, goal.y, goal.w, goal.h);

    ctx.fillStyle = hexToRgba(COLORS.goal, 0.18 + pulse * 0.12);
    ctx.fillRect(sx + 8, goal.y + 8, goal.w - 16, goal.h - 16);

    ctx.strokeStyle = hexToRgba(theme.accentSoft, 0.8);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 18 + pulse * 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = COLORS.goal;
    ctx.font = '700 11px "Orbitron", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('UPLOAD', centerX, goal.y - 12);
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText('NODE', centerX, goal.y - 24);

    if (frameCount % 12 === 0) {
        spawnParticle(goal.x + Math.random() * goal.w, goal.y + goal.h, (Math.random() - 0.5) * 0.5, -0.5 - Math.random() * 1.5, COLORS.goal, 30, 2);
    }
}

function drawObstacles() {
    const theme = getVisualTheme();
    for (const obstacle of aiObstacles) {
        const sx = obstacle.x - camera.x;
        if (sx + obstacle.w < -20 || sx > canvas.width + 20) continue;

        const pulse = Math.sin(frameCount * 0.1 + obstacle.phase) * 0.2 + 0.8;

        if (obstacle.type === 'bug') {
            ctx.globalAlpha = 0.15 * pulse;
            ctx.fillStyle = COLORS.bugBlock;
            ctx.fillRect(sx - 4, obstacle.y - 4, obstacle.w + 8, obstacle.h + 8);
            ctx.globalAlpha = 1;
            const bugGradient = ctx.createLinearGradient(sx, obstacle.y, sx, obstacle.y + obstacle.h);
            bugGradient.addColorStop(0, '#2a1119');
            bugGradient.addColorStop(1, '#51101f');
            ctx.fillStyle = bugGradient;
            ctx.fillRect(sx, obstacle.y, obstacle.w, obstacle.h);
            ctx.strokeStyle = hexToRgba(COLORS.bugBlock, 0.8);
            ctx.strokeRect(sx + 0.5, obstacle.y + 0.5, obstacle.w - 1, obstacle.h - 1);
            ctx.fillStyle = hexToRgba('#ffffff', 0.42);
            ctx.fillRect(sx + 4, obstacle.y + 4, obstacle.w - 8, 2);
            ctx.fillStyle = hexToRgba(COLORS.bugBlock, 0.3 + pulse * 0.3);
            ctx.fillRect(sx + 3, obstacle.y + obstacle.h / 2 - 1, obstacle.w - 6, 3);
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = '#fff4f4';
            ctx.font = '700 8px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('BUG', sx + obstacle.w / 2, obstacle.y + obstacle.h / 2 + 3);
        } else if (obstacle.type === 'laser') {
            ctx.globalAlpha = 0.16 * pulse;
            ctx.fillStyle = COLORS.laser;
            ctx.fillRect(sx - 8, obstacle.y - 2, obstacle.w + 16, obstacle.h + 4);
            ctx.globalAlpha = 1;
            ctx.fillStyle = hexToRgba(theme.haze, 0.24);
            ctx.fillRect(sx, obstacle.y, obstacle.w, obstacle.h);
            ctx.fillStyle = hexToRgba(COLORS.laser, 0.7 + pulse * 0.2);
            ctx.fillRect(sx + 2, obstacle.y + obstacle.h / 2 - 2, obstacle.w - 4, 4);
            ctx.fillStyle = hexToRgba('#ffffff', 0.7);
            ctx.fillRect(sx + 4, obstacle.y + obstacle.h / 2 - 1, obstacle.w - 8, 2);
            ctx.fillStyle = hexToRgba(COLORS.laser, 0.9);
            ctx.fillRect(sx - 3, obstacle.y + obstacle.h / 2 - 6, 6, 12);
            ctx.fillRect(sx + obstacle.w - 3, obstacle.y + obstacle.h / 2 - 6, 6, 12);
            const scanY = obstacle.y + ((frameCount * 2 + obstacle.phase * 50) % obstacle.h);
            ctx.globalAlpha = 0.9;
            ctx.fillRect(sx - 2, scanY, obstacle.w + 4, 2);
        } else if (obstacle.type === 'spike') {
            ctx.globalAlpha = 0.12 * pulse;
            ctx.fillStyle = COLORS.spike;
            ctx.fillRect(sx - 4, obstacle.y - 4, obstacle.w + 8, obstacle.h + 8);
            ctx.globalAlpha = 1;
            const shards = Math.max(2, Math.floor(obstacle.w / 10));
            const shardWidth = obstacle.w / shards;
            for (let shard = 0; shard < shards; shard++) {
                const left = sx + shard * shardWidth;
                const centerX = left + shardWidth / 2;
                const height = obstacle.h - (shard % 2 === 0 ? 0 : 4);
                ctx.fillStyle = shard % 2 === 0 ? hexToRgba(COLORS.spike, 0.9) : hexToRgba(theme.floorTop, 0.8);
                ctx.beginPath();
                ctx.moveTo(centerX, obstacle.y + obstacle.h - height);
                ctx.lineTo(left + shardWidth, obstacle.y + obstacle.h);
                ctx.lineTo(left, obstacle.y + obstacle.h);
                ctx.closePath();
                ctx.fill();
            }
        } else if (obstacle.type === 'turret') {
            ctx.globalAlpha = 0.18 * pulse;
            ctx.fillStyle = COLORS.playerGlow;
            ctx.fillRect(sx - 5, obstacle.y - 4, obstacle.w + 10, obstacle.h + 8);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#13202d';
            ctx.fillRect(sx, obstacle.y, obstacle.w, obstacle.h);
            ctx.strokeStyle = hexToRgba(COLORS.playerGlow, 0.65);
            ctx.strokeRect(sx + 0.5, obstacle.y + 0.5, obstacle.w - 1, obstacle.h - 1);
            ctx.fillStyle = hexToRgba('#ffffff', 0.18);
            ctx.fillRect(sx + 4, obstacle.y + 4, obstacle.w - 8, 3);
            ctx.fillStyle = hexToRgba(COLORS.playerGlow, 0.85);
            const muzzleX = obstacle.fireDir > 0 ? sx + obstacle.w - 2 : sx - 8;
            ctx.fillRect(muzzleX, obstacle.y + 8, 10, 5);
            ctx.fillStyle = hexToRgba(COLORS.playerGlow, 0.3 + pulse * 0.3);
            ctx.fillRect(sx + 6, obstacle.y + obstacle.h - 6, obstacle.w - 12, 2);
        } else if (obstacle.type === 'crawler') {
            ctx.globalAlpha = 0.12 * pulse;
            ctx.fillStyle = COLORS.playerDash;
            ctx.fillRect(sx - 4, obstacle.y - 4, obstacle.w + 8, obstacle.h + 8);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#28192f';
            ctx.fillRect(sx, obstacle.y, obstacle.w, obstacle.h);
            ctx.strokeStyle = hexToRgba(COLORS.playerDash, 0.72);
            ctx.strokeRect(sx + 0.5, obstacle.y + 0.5, obstacle.w - 1, obstacle.h - 1);
            ctx.fillStyle = hexToRgba('#ffffff', 0.42);
            ctx.fillRect(sx + 4, obstacle.y + 4, obstacle.w - 8, 2);
            for (let leg = 2; leg < obstacle.w - 3; leg += 6) {
                ctx.strokeStyle = hexToRgba(COLORS.playerDash, 0.72);
                ctx.beginPath();
                ctx.moveTo(sx + leg, obstacle.y + obstacle.h);
                ctx.lineTo(sx + leg - 3, obstacle.y + obstacle.h + 5);
                ctx.moveTo(sx + leg + 2, obstacle.y + obstacle.h);
                ctx.lineTo(sx + leg + 5, obstacle.y + obstacle.h + 5);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }
}

function drawObstacleProjectiles() {
    for (const projectile of obstacleProjectiles) {
        const sx = projectile.x - camera.x;
        if (sx + projectile.w < -16 || sx > canvas.width + 16) continue;
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = projectile.color;
        ctx.fillRect(sx - 4, projectile.y - 3, projectile.w + 8, projectile.h + 6);
        ctx.globalAlpha = 1;
        ctx.fillStyle = projectile.color;
        ctx.fillRect(sx, projectile.y, projectile.w, projectile.h);
        ctx.fillStyle = hexToRgba('#ffffff', 0.75);
        ctx.fillRect(sx + 2, projectile.y + 1, projectile.w - 4, projectile.h - 2);
    }
}

function drawPreviousPath() {
    if (!previousPaths.length) return;

    const theme = getVisualTheme();
    const path = previousPaths[previousPaths.length - 1];
    ctx.strokeStyle = hexToRgba(theme.accentSoft, 0.22);
    ctx.lineWidth = 2.5;
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
        ctx.globalAlpha = (i / player.trail.length) * 0.3;
        ctx.fillStyle = glow;
        ctx.fillRect(trail.x - camera.x - 4, trail.y - 4, 8, 8);
    }
    ctx.globalAlpha = 1;

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 5, player.y - 5, player.width + 10, player.height + 10);
    ctx.globalAlpha = 0.28;
    ctx.fillRect(sx - 2, player.y - 2, player.width + 4, player.height + 4);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#0a1320';
    ctx.fillRect(sx + 3, player.y + 2, 10, 17);
    ctx.fillStyle = '#dcefff';
    ctx.fillRect(sx + 4, player.y + 2, 8, 6);
    ctx.fillStyle = glow;
    if (player.facingRight) {
        ctx.fillRect(sx + 6, player.y + 4, 5, 2);
    } else {
        ctx.fillRect(sx + 5, player.y + 4, 5, 2);
    }
    ctx.fillStyle = '#1a3556';
    ctx.fillRect(sx + 4, player.y + 9, 8, 5);
    ctx.fillStyle = player.dashTimer > 0 ? '#ffe57d' : '#ff9f5c';
    ctx.fillRect(sx + 7, player.y + 10, 2, 3);
    ctx.fillStyle = '#dcefff';
    ctx.fillRect(sx + 4, player.y + 14, 3, 5);
    ctx.fillRect(sx + 9, player.y + 14, 3, 5);
    ctx.fillStyle = '#0a1320';
    ctx.fillRect(sx + 4, player.y + 18, 3, 2);
    ctx.fillRect(sx + 9, player.y + 18, 3, 2);

    if (player.dashTimer > 0) {
        ctx.fillStyle = hexToRgba(glow, 0.5);
        const slashX = player.facingRight ? sx - 10 : sx + player.width + 2;
        ctx.fillRect(slashX, player.y + 7, 9, 3);
        ctx.fillRect(slashX + (player.facingRight ? -4 : 4), player.y + 11, 6, 2);
    }

    if (player.dashCooldown > 0) {
        const progress = 1 - player.dashCooldown / DASH_COOLDOWN;
        ctx.fillStyle = 'rgba(64, 247, 255, 0.18)';
        ctx.fillRect(sx - 1, player.y + player.height + 4, player.width + 2, 3);
        ctx.fillStyle = 'rgba(64, 247, 255, 0.7)';
        ctx.fillRect(sx - 1, player.y + player.height + 4, (player.width + 2) * progress, 3);
    } else {
        ctx.fillStyle = 'rgba(64, 247, 255, 0.82)';
        ctx.fillRect(sx - 1, player.y + player.height + 4, player.width + 2, 3);
    }

    if (currentStageData?.abilities?.doubleJump) {
        const pipColor = player.airJumpsRemaining > 0 ? 'rgba(255, 215, 106, 0.92)' : 'rgba(255, 215, 106, 0.24)';
        ctx.fillStyle = pipColor;
        ctx.fillRect(sx + 3, player.y - 8, 4, 4);
        ctx.fillRect(sx + 9, player.y - 8, 4, 4);
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
    const theme = getVisualTheme();
    const sx = spawnPoint.x - 20 - camera.x;
    ctx.globalAlpha = 0.18 + Math.sin(frameCount * 0.05) * 0.08;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(sx, currentStageData.spawnPlatform.y - 38, 52, 36);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hexToRgba(theme.accentSoft, 0.85);
    ctx.strokeRect(sx + 0.5, currentStageData.spawnPlatform.y - 38 + 0.5, 51, 35);
    ctx.fillStyle = theme.accent;
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DROP', sx + 26, currentStageData.spawnPlatform.y - 43);
    ctx.textAlign = 'left';
}

function drawTimeLimitBar() {
    if (gameState !== 'playing' || !isTimeTrial || timeLimit <= 0) return;

    const theme = getVisualTheme();
    const progress = Math.min(currentTime / (timeLimit * 1000), 1);
    const barWidth = canvas.width - 60;
    const barX = 30;
    const barY = 18;

    ctx.fillStyle = 'rgba(4, 7, 14, 0.72)';
    ctx.fillRect(barX - 6, barY - 8, barWidth + 12, 16);
    ctx.strokeStyle = hexToRgba(theme.haze, 0.45);
    ctx.strokeRect(barX - 6.5, barY - 8.5, barWidth + 13, 17);
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
    ctx.font = '700 10px "JetBrains Mono", monospace';
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

    const theme = getVisualTheme();
    const mmW = 200;
    const mmH = 16;
    const mmX = canvas.width - mmW - 10;
    const mmY = canvas.height - mmH - 8;
    const scale = mmW / levelWidth;

    ctx.fillStyle = 'rgba(4, 9, 16, 0.82)';
    ctx.fillRect(mmX - 6, mmY - 5, mmW + 12, mmH + 10);
    ctx.strokeStyle = hexToRgba(theme.accent, 0.42);
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX - 6.5, mmY - 5.5, mmW + 13, mmH + 11);

    ctx.fillStyle = hexToRgba(theme.accent, 0.32);
    for (const platform of platforms) {
        const px = mmX + platform.x * scale;
        const pw = Math.max(2, platform.w * scale);
        ctx.fillRect(px, mmY + 4, pw, platform.role === 'floor' ? 4 : 3);
    }

    ctx.strokeStyle = hexToRgba(theme.hazeSecondary, 0.46);
    ctx.strokeRect(mmX + camera.x * scale, mmY, canvas.width * scale, mmH);

    ctx.fillStyle = COLORS.minimapPlayer;
    ctx.fillRect(mmX + player.x * scale - 1, mmY + 3, 3, 5);
    ctx.fillStyle = COLORS.minimapGoal;
    ctx.fillRect(mmX + goal.x * scale - 1, mmY + 3, 3, 5);

    ctx.fillStyle = 'rgba(189, 201, 219, 0.55)';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('MAP', mmX - 6, mmY + 11);
    ctx.textAlign = 'left';
}

function drawStageIndicator() {
    if (currentTime < 2200 && gameState === 'playing' && currentStageData) {
        const theme = getVisualTheme();
        const alpha = Math.max(0, 1 - currentTime / 2200);
        ctx.globalAlpha = alpha * 0.72;
        ctx.fillStyle = 'rgba(3, 8, 15, 0.78)';
        ctx.fillRect(canvas.width / 2 - 250, canvas.height / 2 - 86, 500, 94);
        ctx.strokeStyle = hexToRgba(theme.accent, alpha * 0.7);
        ctx.strokeRect(canvas.width / 2 - 250.5, canvas.height / 2 - 86.5, 501, 95);
        ctx.fillStyle = theme.accent;
        ctx.font = '700 28px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`STAGE ${currentStage}`, canvas.width / 2, canvas.height / 2 - 46);

        ctx.font = '700 13px "JetBrains Mono", monospace';
        ctx.fillStyle = hexToRgba('#d8e0f2', alpha * 0.8);
        ctx.globalAlpha = alpha * 0.65;
        const limitText = currentStageData.isTimeTrial ? `${currentStageData.timeLimit}s watchdog` : 'No limit';
        ctx.fillText(`${currentStageData.variantName} | ${aiObstacles.length} bug(s) | ${limitText}`, canvas.width / 2, canvas.height / 2 - 12);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }
}

function drawForegroundEffects() {
    const theme = getVisualTheme();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(0, 0, canvas.width, 8);
    ctx.fillRect(0, canvas.height - 8, canvas.width, 8);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let y = 0; y < canvas.height; y += 5) {
        ctx.fillRect(0, y, canvas.width, 1);
    }

    const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.2, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = hexToRgba(theme.accent, 0.08);
    ctx.strokeRect(3.5, 3.5, canvas.width - 7, canvas.height - 7);
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
    drawObstacleProjectiles();
    drawDrones();
    drawDroneProjectiles();
    drawPlayer();
    drawParticles();
    drawMinimap();
    drawStageIndicator();
    drawForegroundEffects();
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
    const panel = $('console-panel');
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const styles = window.getComputedStyle(area);
    const isColumn = styles.flexDirection === 'column';
    const panelRect = panel ? panel.getBoundingClientRect() : { width: CONSOLE_WIDTH, height: 0 };
    canvas.width = Math.max(320, Math.floor(rect.width - (isColumn ? 0 : panelRect.width || CONSOLE_WIDTH)));
    canvas.height = Math.max(220, Math.floor(rect.height - (isColumn ? panelRect.height || 0 : 0)));
}

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const savedName = localStorage.getItem('hotfix_player_name');
    if (savedName) playerNameInput.value = savedName;
    applySettingsToMenu();

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

    startBtn.addEventListener('click', () => {
        audioManager.unlock();
        audioManager.playUiClick();
        startGame();
    });
    leaderboardBtn.addEventListener('click', () => {
        audioManager.unlock();
        audioManager.playUiClick();
        showLeaderboard();
    });
    lbCloseBtn.addEventListener('click', () => {
        audioManager.playUiClick();
        hideLeaderboard();
    });
    lbClearBtn.addEventListener('click', () => {
        if (confirm('Clear all scores?')) clearLeaderboard();
    });
    if (obstacleAlertToggle) {
        obstacleAlertToggle.addEventListener('change', () => {
            userSettings.obstacleAlerts = obstacleAlertToggle.checked;
            saveUserSettings();
        });
    }
    if (abilityAlertToggle) {
        abilityAlertToggle.addEventListener('change', () => {
            userSettings.abilityAlerts = abilityAlertToggle.checked;
            saveUserSettings();
        });
    }
    if (audioToggle) {
        audioToggle.addEventListener('click', () => {
            audioManager.unlock();
            audioManager.toggleMute();
        });
    }

    requestAnimationFrame(gameLoop);
}

init();
