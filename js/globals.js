// ============================================================
//  GLOBALS
// ============================================================
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W = canvas.width, H = canvas.height;

const $ui = document.getElementById('ui');
const $menu = document.getElementById('menuScreen');
const $over = document.getElementById('overScreen');
const $win = document.getElementById('winScreen');
const $debug = document.getElementById('debugMenu');
const $practice = document.getElementById('practiceMenu');

const G = {
    running: false, paused: false, slotId: null, tutorial: false, practice: false, practicePaused: false,
    score: 0, lives: 3, level: 1, ammo: 50,
    combo: 0, comboTimer: 0,
    waveStart: 0, shotTimer: 0,
    shakeTimer: 0, shakeIntensity: 0,
    spawnTimer: 0, ammoTimer: 0, powerTimer: 0, fuelTimer: 0,
    tripleShotTimer: 0, invincibleTimer: 0,
    hasForceField: false, shieldFuel: 0,
    forceFieldDrop: null,
    tutStep: 0, tutTimer: 0, checkpoint: 1,
    godMode: false, infAmmo: false, hyperGun: false, noMiniBoss: false, noBoss: false, testMode: false, albertMode: false,
    // achievement tracking (per-run)
    asteroidsDestroyed: 0, miniBossKills: 0, fuelCollected: 0,
    damageTakenThisBoss: false, gameStartTime: 0,
    // DLC tracking
    shotsFired: 0, totalBossesDefeated: 0, levelsCleared: 0,
    noShieldBoss3: true, consecutiveKills: 0, peakAmmo: 0,
    // Gilbert / Boss Rush (DLC) — initialized here so draw() doesn't crash before startGame
    bossRush: false, bossRushWave: 0, bossRushKills: 0, bossRushTotal: 0,
    bossRushPauseOffset: 0, bossRushStartTime: 0,
    gilbert: null, gilbertState: 'none',
    gilbertDialogue: '', gilbertDialogueTimer: 0, gilbertDialogueQueue: [],
    gilbertDialogueCallback: null, gilbertFlashTimer: 0, rope: false,
    cyborgScraps: [], scrapsCollected: 0, scrapsNeeded: 5, gilbertShootTimer: 0,
    // Gilbert quip system (non-blocking short text)
    gilbertQuip: '', gilbertQuipTimer: 0,
    // First-seen flags for Gilbert intros (reset per run)
    gilbertSeen: {},
    // Widescreen (snake boss)
    widescreenReturning: false, widescreenReturnProgress: 0,
    // Station
    mode: 'space', fastTravelOpen: false, // 'space' or 'station' or 'cutscene'
    mb: 0, stationCutscene: null, stationCutsceneTimer: 0,
    npcShip: null, dialogueChoices: null, dialogueChoiceIndex: 0,
    station: {playerX:450,playerY:480,playerVX:0,playerFacing:1,cameraX:0,floor:0,
        interactTarget:null,shopOpen:false,shopCategory:null,shopSelection:0},
    upgrades: {speed:0,agility:0,hull:0,ammoCap:0,reload:0},
    gilbertUpgrades: {fireRate:0,range:0,damage:0},
    modules: [], equippedModules: [], dashCooldown:0,
    stationUnlocked: false,
    // Inventory system (TAB to open, Z to use/equip)
    inventory: [],           // [{id,name,type:'key'|'module',desc}, ...]
    inventoryOpen: false,
    inventorySelection: 0,
    // Docking bay / scanner terminal state
    dockingBay: { open:false, selection:0, terminalPhase:null, terminalText:[], terminalTimer:0,
                   mapOpen:false, mapSelection:5, teleport:null },
    // One-time flags
    kratGreeted: false,
    itemTutorialShown: false,
    // Lore collectibles — seen fragment IDs
    dataFragmentsSeen: [],
    dataFragmentPopup: null,
    // Grimm boss (optional level 7)
    grimmSpawned: false, grimmDefeated: false
};

let pSettings = { bulletSpeed: 8, ammo: 50, b1hp: 25, b2hp: 45, b3hp: 100 };

// Difficulty multipliers: easy helps new players, hard for veterans
const DIFFICULTY = {
    easy:   { label:'EASY',   color:'#00ff88', astMax:0.6, astRate:1.5, astSpeed:0.7, mbChance:0.5, ammo:70, bossHp:0.7, fuelRate:0.7, desc:'Fewer & slower asteroids, more ammo, weaker bosses' },
    normal: { label:'NORMAL', color:'#00ccff', astMax:1.0, astRate:1.0, astSpeed:1.0, mbChance:1.0, ammo:50, bossHp:1.0, fuelRate:1.0, desc:'The intended experience' },
    hard:   { label:'HARD',   color:'#ff4444', astMax:1.4, astRate:0.7, astSpeed:1.3, mbChance:1.5, ammo:35, bossHp:1.3, fuelRate:1.4, desc:'More & faster asteroids, less ammo, tougher bosses' }
};
let currentDifficulty = 'normal'; // active difficulty for current run

let saves = { 1: null, 2: null, 3: null };
let ship = { x: W/2, y: H/2, a: -Math.PI/2, r: 14, tx: 0, ty: 0 };
let asteroids = [], bullets = [], particles = [], ammoBoxes = [], powerups = [];
let stars = [];
let miniBosses = [], enemyBullets = [], gasterBlasters = [], boss = null;
let keys = {};
let cheatBuf = '';
let shieldFlashes = []; // {x, y, r, life, maxLife} for asteroid shield deflect animations
let bulletSpeed = 8;

let FRICTION = 0.985, THRUST = 0.32, TURN = 0.11;
let SHOT_CD = 16;
const BOSS_TIME = 55;
const BASE_THRUST=0.32, BASE_TURN=0.11, BASE_SHOT_CD=16;

// Stars
for (let i = 0; i < 120; i++) stars.push({ x: Math.random()*W, y: Math.random()*H, size: Math.random()*1.8+0.2, speed: Math.random()*0.3+0.1, alpha: Math.random()*0.6+0.2 });

// Ambient space dust motes
let spaceDust = [];
for (let i = 0; i < 30; i++) spaceDust.push({ x: Math.random()*W, y: Math.random()*H, size: Math.random()*1.5+0.5, dx: (Math.random()-0.5)*0.15, dy: (Math.random()-0.5)*0.15, alpha: Math.random()*0.08+0.02 });

// Shooting stars (occasional)
let shootingStars = [];

// Engine trail particles (separate from boom particles for persistence)
let engineTrail = [];

