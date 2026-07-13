// ============================================================
//  COMBAT BOT — a "dummy that fights back"
//
//  A mobile, AI-driven opponent for the combat playground. Unlike the
//  inert training dummies in combat.js, this entity has its own physics,
//  attack telegraphs, and a Hollow-Knight-flavored state machine that
//  picks moves based on distance, cooldowns, and a small personality.
//
//  Externally this file exposes only a handful of functions which
//  combat.js calls into:
//    _spawnCombatBot(x, y, opts)        — build a bot entity
//    _updateBots()                       — physics + AI each frame
//    _updateBotProjectiles()             — projectile physics + player hits
//    _drawBots(T)                        — render bots
//    _drawBotProjectiles(Z)              — render projectiles
//    _onBotHit(bot, box)                 — player attack landed on bot
//    _summonPlaygroundBot()              — entry point bound to the B key
//
//  All shared helpers (_rectsOverlap, _holoBox, _roundRect, _randGlyph,
//  CODE_GLYPHS, COMBAT, Sound, shake, etc.) live in combat.js / sound.js /
//  gameplay.js and are referenced as globals.
// ============================================================

const BOT = {
    // Body
    W: 30, H: 64,
    MAX_HP: 160,
    // Movement
    WALK_SPEED: 2.6,
    RUN_SPEED: 4.4,
    JUMP_V: -12.5,
    DASH_SPEED: 11.0,
    DASH_FRAMES: 14,
    GRAVITY: 0.62,            // slightly lighter than the player so jumps feel weightier
    AIR_DRIFT: 0.55,
    // Combat
    MELEE_REACH: 60,
    MELEE_HEIGHT: 48,
    MELEE_DMG: 12,
    PROJ_DMG: 8,
    PROJ_SPEED: 7.5,
    // Telegraphs (windup frames before the active hitbox / projectile spawn)
    WINDUP_MELEE: 22,
    ACTIVE_MELEE: 9,
    RECOVER_MELEE: 18,
    WINDUP_THROW: 26,
    ACTIVE_THROW: 4,
    RECOVER_THROW: 18,
    // Cooldowns (frames after action ends before it can be picked again)
    CD_MELEE: 40,
    CD_THROW: 70,
    CD_DASH: 55,
    CD_JUMP: 35,
    // Stagger — accumulates damage, triggers a brief hurt state at threshold
    STAGGER_THRESHOLD: 32,
    HURT_FRAMES: 22,
    // Player damage iframes after a bot hit — 0.25s at 60fps
    PLAYER_HIT_IFRAMES: 15,
    // Touch damage — taken just from overlapping the bot's body, no attack needed
    CONTACT_DMG: 6,
};

// ---- Difficulty presets ---------------------------------------------------
// Each preset is a partial override of BOT. Properties not listed inherit
// from BOT defaults. Personality (aggression/ranged/mobility) is also driven
// through here so a "hard" bot fights with hard personality stats.
const BOT_PRESETS = {
    easy: {
        label: 'AGENT.easy',
        MAX_HP: 90, MELEE_DMG: 6, PROJ_DMG: 4, CONTACT_DMG: 2, PROJ_SPEED: 5.5,
        WINDUP_MELEE: 36, WINDUP_THROW: 40,
        CD_MELEE: 80, CD_THROW: 140, CD_DASH: 100, CD_JUMP: 60,
        WALK_SPEED: 1.8, RUN_SPEED: 3.0, DASH_SPEED: 8.0,
        aggression: 0.30, ranged: 0.25, mobility: 0.25,
    },
    medium: {
        label: 'AGENT.med',
        MAX_HP: 160, MELEE_DMG: 12, PROJ_DMG: 8, CONTACT_DMG: 6, PROJ_SPEED: 7.5,
        WINDUP_MELEE: 22, WINDUP_THROW: 26,
        CD_MELEE: 40, CD_THROW: 70, CD_DASH: 55, CD_JUMP: 35,
        WALK_SPEED: 2.6, RUN_SPEED: 4.4, DASH_SPEED: 11.0,
        aggression: 0.65, ranged: 0.55, mobility: 0.65,
    },
    hard: {
        label: 'AGENT.hard',
        MAX_HP: 240, MELEE_DMG: 18, PROJ_DMG: 12, CONTACT_DMG: 9, PROJ_SPEED: 9.5,
        WINDUP_MELEE: 13, WINDUP_THROW: 16,
        CD_MELEE: 22, CD_THROW: 40, CD_DASH: 30, CD_JUMP: 22,
        WALK_SPEED: 3.4, RUN_SPEED: 5.6, DASH_SPEED: 13.5,
        aggression: 0.90, ranged: 0.70, mobility: 0.90,
    },
};

// Schema for the bot config menu — drives slider generation. Each entry is
// one customizable knob: key matches a property name in BOT or personality.
const BOT_CUSTOM_SETTINGS = [
    // COMBAT
    { key:'MAX_HP',       label:'Max HP',            min:40,  max:400, step:10,  section:'COMBAT' },
    { key:'MELEE_DMG',    label:'Melee Damage',      min:2,   max:30,  step:1,   section:'COMBAT' },
    { key:'PROJ_DMG',     label:'Projectile Damage', min:1,   max:25,  step:1,   section:'COMBAT' },
    { key:'CONTACT_DMG',  label:'Contact Damage',    min:0,   max:15,  step:1,   section:'COMBAT' },
    { key:'PROJ_SPEED',   label:'Projectile Speed',  min:3,   max:14,  step:0.5, section:'COMBAT' },
    // TIMING
    { key:'WINDUP_MELEE', label:'Melee Windup',      min:6,   max:50,  step:1,   section:'TIMING', hint:'lower = harder' },
    { key:'WINDUP_THROW', label:'Throw Windup',      min:8,   max:50,  step:1,   section:'TIMING', hint:'lower = harder' },
    { key:'CD_MELEE',     label:'Melee Cooldown',    min:10,  max:120, step:5,   section:'TIMING' },
    { key:'CD_THROW',     label:'Throw Cooldown',    min:20,  max:200, step:5,   section:'TIMING' },
    { key:'CD_DASH',      label:'Dash Cooldown',     min:20,  max:150, step:5,   section:'TIMING' },
    // MOVEMENT
    { key:'WALK_SPEED',   label:'Walk Speed',        min:0.8, max:5.0, step:0.1, section:'MOVEMENT' },
    { key:'RUN_SPEED',    label:'Run Speed',         min:1.5, max:8.0, step:0.1, section:'MOVEMENT' },
    { key:'DASH_SPEED',   label:'Dash Speed',        min:4,   max:18,  step:0.5, section:'MOVEMENT' },
    // PERSONALITY (0..1)
    { key:'aggression',   label:'Aggression',        min:0,   max:1,   step:0.05, section:'PERSONALITY' },
    { key:'ranged',       label:'Ranged Tendency',   min:0,   max:1,   step:0.05, section:'PERSONALITY' },
    { key:'mobility',     label:'Mobility',          min:0,   max:1,   step:0.05, section:'PERSONALITY' },
];

// Last-used custom settings — persisted across menu opens within a session.
// Starts as a copy of the medium preset so first-time-open is friendly.
let BOT_LAST_CUSTOM = null;

// ---- Spawn ----------------------------------------------------------------

function _spawnCombatBot(x, y, opts){
    opts = opts || {};
    // Build a per-bot settings object. Customizable properties default to BOT
    // values but can be overridden by opts.settings. Geometry (W/H) and a few
    // tightly-tuned timings (ACTIVE_*, RECOVER_*, GRAVITY, JUMP_V,
    // STAGGER_THRESHOLD, HURT_FRAMES, PLAYER_HIT_IFRAMES, MELEE_REACH/HEIGHT,
    // DASH_FRAMES, AIR_DRIFT) stay on BOT — exposing them would require
    // rebalancing animations and collision shapes.
    const ps = opts.settings || {};
    const s = Object.assign({}, BOT, ps);
    return {
        type: 'bot',
        s,                          // settings (per-bot) — runtime lookups go through this
        x, y,                       // foot position
        spawnX: x, spawnY: y,
        vx: 0, vy: 0,
        w: BOT.W, h: BOT.H,
        facing: opts.facing || -1,
        hp: s.MAX_HP, maxHp: s.MAX_HP,
        label: opts.label || ps.label || 'AGENT',
        grounded: false,
        // Visual / hit feedback
        hitFlash: 0,
        flicker: 0,
        invuln: 0,                  // brief iframes during dash + post-hurt
        // AI state machine
        state: 'idle',
        stateTimer: 30,             // ticks down; 0 = pick next state
        prevState: 'idle',
        attackHit: false,           // single-hit guard within an attack
        attackBox: null,            // cached active hitbox (rendered as the swing)
        attackDir: 0,               // facing locked at attack-start
        // Telegraph progress (0..1, drives the windup glow)
        telegraph: 0,
        // Dash
        dashTimer: 0,
        dashDir: 1,
        // Cooldowns
        cd: { melee: 0, throw: 0, dash: 0, jump: 0 },
        // Stagger
        stagger: 0,
        // Personality — explicit settings (from preset / sliders) win; otherwise
        // we jitter so repeat summons of the default feel different.
        personality: {
            aggression: ps.aggression !== undefined ? ps.aggression : 0.55 + Math.random()*0.25,
            ranged:     ps.ranged     !== undefined ? ps.ranged     : 0.40 + Math.random()*0.35,
            mobility:   ps.mobility   !== undefined ? ps.mobility   : 0.50 + Math.random()*0.30,
            preferredRange: ps.preferredRange || 200 + Math.random()*80,
        },
        // Death animation
        dying: false,
        dyingTimer: 0,
        dyingLife: 70,
        cleanup: 0,                  // frames after death before removal
        // Spawn-in flourish
        spawnFlash: 30,
        // For drawing — track a brief swing arc when melee fires
        swingArc: null,              // {t, life, dir}
        // Memory of last player position — used to lead projectiles slightly
        lastSeenPlayerVx: 0,
        // Used to dampen flip-flopping decisions
        commitTimer: 0,
    };
}

// Bound to the B key from combat.js. Opens the config menu so the player can
// pick a preset or fine-tune settings before the bot actually spawns.
function _summonPlaygroundBot(){
    if (!G.combat || !G.holo) return;
    openBotConfig();
}

// Actually drops a bot into the arena with the given settings object. The
// menu's "spawn" buttons call this. If a bot is already alive, the existing
// one is hurried into death so a fresh fight can start immediately.
function _spawnConfiguredBot(settings){
    const Z = G.combat; const h = G.holo;
    if (!Z || !h) return;
    // Replace any existing live bot
    for (const b of Z.bots){
        if (!b.dying){
            _killBot(b, /*silent*/true);
        }
    }
    // Spawn at ground level, on the far side from the player's facing so the
    // bot starts behind/opposite the player and the encounter opens with a turn.
    const groundY = 1180;
    const side = h.facing >= 0 ? 1 : -1;
    let sx = h.x + side * 380;
    // Clamp to inside the world walls (40px wall on each side, world is 2400 wide)
    sx = Math.max(120, Math.min((Z.worldW||2400) - 120, sx));
    const bot = _spawnCombatBot(sx, groundY, { facing: -side, settings });
    Z.bots.push(bot);
    // Spawn FX — code shower + ground ring
    for (let i=0; i<22; i++){
        const ang = -Math.PI/2 + (Math.random()-0.5)*Math.PI*1.4;
        const spd = 1.5 + Math.random()*4;
        Z.fx.push({
            type:'char',
            x: sx + (Math.random()-0.5)*30,
            y: groundY - 30 + (Math.random()-0.5)*40,
            vx: Math.cos(ang)*spd,
            vy: Math.sin(ang)*spd - 0.4,
            life: 36, max: 36,
            rot: 0, spin: (Math.random()-0.5)*0.15,
            text: _randGlyph(),
            color: i%3===0 ? '#ffffff' : '#ff8e3c',
            size: 11 + Math.floor(Math.random()*4),
            rise: true,
        });
    }
    Z.fx.push({
        type:'ring',
        x: sx, y: groundY - 2,
        r: 6, rMax: 90,
        life: 24, max: 24,
        color: '#ff5a3c',
    });
    if (typeof shake === 'function') shake(3, 8);
    try { Sound.explode && Sound.explode(); } catch(e){}
    // On-screen note above the new bot — use the bot's chosen label
    Z.popups.push({
        x: sx, y: groundY - BOT.H - 22,
        vy: -1.0, life: 70, max: 70,
        text: bot.label, color: '#ff8e3c', scaleIn: 1.0,
    });
}

// ---- Config menu UI -------------------------------------------------------
// Renders the bot-config modal, reads slider values back, applies presets,
// and invokes _spawnConfiguredBot when the player confirms.
//
// The menu's outer DOM (#botConfigMenu) lives in Game.html. The slider list
// is generated here from BOT_CUSTOM_SETTINGS the first time the menu opens,
// so adding a new knob only requires extending the schema.

function openBotConfig(){
    const el = document.getElementById('botConfigMenu');
    if (!el) return;
    if (!BOT_LAST_CUSTOM) BOT_LAST_CUSTOM = Object.assign({}, BOT_PRESETS.medium);
    _buildBotConfigSliders();
    _applyBotConfigValues(BOT_LAST_CUSTOM);
    el.style.display = 'flex';
    G.botConfigOpen = true;
}

function closeBotConfig(){
    const el = document.getElementById('botConfigMenu');
    if (el) el.style.display = 'none';
    G.botConfigOpen = false;
}

// Preset button handler — applies the preset's full settings and spawns
// immediately. Also stashes the preset values into BOT_LAST_CUSTOM so the
// custom sliders reflect the most recent choice next time the menu opens.
function spawnBotPreset(name){
    const preset = BOT_PRESETS[name];
    if (!preset) return;
    BOT_LAST_CUSTOM = Object.assign({}, preset);
    _spawnConfiguredBot(Object.assign({}, preset));
    closeBotConfig();
}

// "SPAWN" button handler — reads each slider, builds a settings object, and
// hands it to the spawn pipeline. Personality keys (0..1) and BOT-shaped keys
// live in the same flat object — _spawnCombatBot already knows how to apply
// both sides.
function spawnBotCustom(){
    const settings = _readBotConfigValues();
    settings.label = 'AGENT.custom';
    BOT_LAST_CUSTOM = Object.assign({}, settings);
    _spawnConfiguredBot(settings);
    closeBotConfig();
}

// Builds the slider rows once, keyed off BOT_CUSTOM_SETTINGS. Idempotent —
// re-calling on an already-built menu is a no-op.
function _buildBotConfigSliders(){
    const host = document.getElementById('botCfgSliders');
    if (!host || host.dataset.built === '1') return;
    // Group by section
    const sections = {};
    for (const cfg of BOT_CUSTOM_SETTINGS){
        if (!sections[cfg.section]) sections[cfg.section] = [];
        sections[cfg.section].push(cfg);
    }
    let html = '';
    for (const section of Object.keys(sections)){
        html += `<div class="botCfgSection"><div class="botCfgSectionHdr">${section}</div>`;
        for (const cfg of sections[section]){
            const hintHtml = cfg.hint ? ` <span class="botCfgHint">(${cfg.hint})</span>` : '';
            html += `
                <div class="botCfgRow">
                    <label for="botCfg_${cfg.key}">${cfg.label}${hintHtml}</label>
                    <input type="range" id="botCfg_${cfg.key}" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}"
                        oninput="document.getElementById('botCfgVal_${cfg.key}').textContent = (+this.value).toFixed(${cfg.step < 1 ? 2 : 0})">
                    <span class="botCfgVal" id="botCfgVal_${cfg.key}">0</span>
                </div>`;
        }
        html += `</div>`;
    }
    host.innerHTML = html;
    host.dataset.built = '1';
}

function _applyBotConfigValues(settings){
    for (const cfg of BOT_CUSTOM_SETTINGS){
        const input = document.getElementById('botCfg_'+cfg.key);
        const span  = document.getElementById('botCfgVal_'+cfg.key);
        if (!input) continue;
        const v = settings[cfg.key] !== undefined ? settings[cfg.key] : BOT[cfg.key];
        input.value = v;
        if (span) span.textContent = (+v).toFixed(cfg.step < 1 ? 2 : 0);
    }
}

function _readBotConfigValues(){
    const out = {};
    for (const cfg of BOT_CUSTOM_SETTINGS){
        const input = document.getElementById('botCfg_'+cfg.key);
        if (!input) continue;
        out[cfg.key] = +input.value;
    }
    return out;
}

// Preset button in the menu that loads (but doesn't spawn) — lets the player
// pick a preset baseline then tweak. Bound from HTML via onclick.
function applyBotPreset(name){
    const preset = BOT_PRESETS[name];
    if (!preset) return;
    _applyBotConfigValues(preset);
}

// ---- Per-frame entry from combat.js --------------------------------------

function _updateBots(){
    const Z = G.combat; if (!Z || !Z.bots) return;
    const h = G.holo;
    for (let i = Z.bots.length-1; i >= 0; i--){
        const b = Z.bots[i];
        if (b.spawnFlash > 0) b.spawnFlash--;
        if (b.hitFlash > 0) b.hitFlash--;
        if (b.invuln > 0) b.invuln--;
        b.flicker = (b.flicker + 1) % 7;
        for (const k in b.cd) if (b.cd[k] > 0) b.cd[k]--;
        if (b.dying){
            _updateBotDying(b, Z);
            if (b.cleanup > 0){
                b.cleanup--;
                if (b.cleanup <= 0) Z.bots.splice(i, 1);
            }
            continue;
        }
        if (h && !h.dying){
            _updateBotAI(b, h, Z);
        }
        _updateBotPhysics(b, Z);
        // Active melee hitbox window — checks player overlap once per active frame
        if (b.state === 'melee_active' && !b.attackHit && h){
            const box = _botMeleeBox(b);
            b.attackBox = box;
            if (_rectsOverlap(box, _holoBox(h))){
                if (h.parryWindow > 0){
                    _onPlayerParryMelee(h, b);
                } else {
                    _hitHoloFromBot(h, box, b.s.MELEE_DMG, b.facing);
                }
                b.attackHit = true;
            }
        } else if (b.state !== 'melee_active') {
            b.attackBox = null;
        }
        // Decrement swing arc visual
        if (b.swingArc){
            b.swingArc.t++;
            if (b.swingArc.t >= b.swingArc.life) b.swingArc = null;
        }
        // Contact damage — body overlap chips the player. Cheaper than a real
        // attack, but means standing inside the bot is never free. Gated by
        // player iframes, the parry window, and the ground-slam state — the
        // player is phased out of normal interaction in all three cases.
        if (h && h.invuln <= 0 && h.parryWindow <= 0 && !h.groundSlamming && !b.dying){
            if (_rectsOverlap(_botBox(b), _holoBox(h))){
                const pushDir = (h.x >= b.x) ? 1 : -1;
                _hitHoloFromBot(h, null, b.s.CONTACT_DMG, pushDir);
            }
        }
    }
}

// ---- AI -------------------------------------------------------------------

function _updateBotAI(b, h, Z){
    // Track player horizontal velocity for projectile leading
    b.lastSeenPlayerVx = h.vx;

    b.stateTimer--;
    if (b.commitTimer > 0) b.commitTimer--;

    // Reactive layer — fires regardless of current state if conditions met.
    // Dodge: if player is mid-attack AND close AND we have a dash, jump away.
    if (b.state === 'idle' || b.state === 'track'){
        const closeX = Math.abs(h.x - b.x) < 110;
        const playerAttacking = h.attackTimer > 0 || (h.slash && h.slash.t < 6);
        if (closeX && playerAttacking && b.cd.dash <= 0 && Math.random() < 0.6){
            const away = (b.x >= h.x) ? 1 : -1;
            _botStartDash(b, away);
            return;
        }
    }

    if (b.stateTimer > 0){
        // Mid-state ticking — drive substate transitions (windup → active → recover)
        _tickBotState(b, h, Z);
        return;
    }

    // State ended — advance to the next phase or pick a fresh action.
    switch (b.state){
        case 'windup_melee':
            b.state = 'melee_active';
            b.stateTimer = BOT.ACTIVE_MELEE;
            b.attackHit = false;
            b.swingArc = { t: 0, life: BOT.ACTIVE_MELEE + 6, dir: b.facing };
            try { Sound.hit && Sound.hit(); } catch(e){}
            return;
        case 'melee_active':
            b.state = 'recover';
            b.stateTimer = BOT.RECOVER_MELEE;
            b.cd.melee = b.s.CD_MELEE;
            return;
        case 'windup_throw':
            b.state = 'throw_active';
            b.stateTimer = BOT.ACTIVE_THROW;
            _botFireProjectile(b, h);
            try { Sound.shoot && Sound.shoot(); } catch(e){}
            return;
        case 'throw_active':
            b.state = 'recover';
            b.stateTimer = BOT.RECOVER_THROW;
            b.cd.throw = b.s.CD_THROW;
            return;
        case 'dash':
            b.state = 'idle';
            b.stateTimer = 6 + Math.floor(Math.random()*10);
            return;
        case 'hurt':
            b.state = 'idle';
            b.stateTimer = 4;
            return;
    }

    // From idle/recover/track — choose what to do next.
    _botPickNextAction(b, h, Z);
}

// Pick the next AI action by scoring each option against distance, cooldowns,
// and personality, then sampling weighted-random from the survivors so the
// bot stays unpredictable even when one option dominates.
function _botPickNextAction(b, h, Z){
    const dx = h.x - b.x;
    const adx = Math.abs(dx);
    const dy = (h.y - h.h*0.5) - (b.y - b.h*0.5);
    const towardPlayer = Math.sign(dx) || b.facing;
    // Face the player whenever idle and not in a windup
    b.facing = (dx >= 0) ? 1 : -1;

    const p = b.personality;
    const options = [];

    // MELEE — only viable when very close (and roughly same height)
    if (b.cd.melee <= 0 && adx < BOT.MELEE_REACH + 18 && Math.abs(dy) < 60){
        options.push({ kind:'melee', weight: 3.0 + p.aggression*2 });
    }
    // THROW — preferred at medium/long range, ground-only so the bot plants its feet
    if (b.cd.throw <= 0 && adx > 120 && b.grounded){
        const distScore = Math.min(1, adx / 600);
        options.push({ kind:'throw', weight: 1.0 + p.ranged*2.4 + distScore*1.5 });
    }
    // DASH — close gap when too far, or reposition when player is at preferred range
    if (b.cd.dash <= 0){
        const tooFar = adx > p.preferredRange + 120;
        const wantClose = adx > 200;
        const w = (tooFar ? 2.2 : 0.7) + p.mobility*1.5 + (wantClose?0.6:0);
        options.push({ kind:'dash_in', weight: w });
        // Less often, a defensive backstep when very close and not ready to melee
        if (adx < 130 && b.cd.melee > 10){
            options.push({ kind:'dash_out', weight: 1.0 + p.mobility });
        }
    }
    // JUMP — to clear a height gap or just to be evasive
    if (b.cd.jump <= 0 && b.grounded){
        const playerAbove = dy < -50;
        const playerFar   = adx > 280;
        let w = 0.3 + p.mobility*0.6;
        if (playerAbove) w += 1.8;
        if (playerFar && Math.random() < 0.3) w += 0.6;
        options.push({ kind:'jump', weight: w });
    }
    // TRACK — default; walk/run toward preferred range
    options.push({ kind:'track', weight: 1.4 });

    // Weighted-random pick
    let total = 0; for (const o of options) total += o.weight;
    let r = Math.random() * total;
    let pick = options[options.length-1];
    for (const o of options){
        if (r < o.weight){ pick = o; break; }
        r -= o.weight;
    }

    switch (pick.kind){
        case 'melee':
            b.state = 'windup_melee';
            b.stateTimer = b.s.WINDUP_MELEE;
            b.attackDir = b.facing;
            b.telegraph = 0;
            break;
        case 'throw':
            b.state = 'windup_throw';
            b.stateTimer = b.s.WINDUP_THROW;
            b.attackDir = b.facing;
            b.telegraph = 0;
            break;
        case 'dash_in':
            _botStartDash(b, towardPlayer);
            break;
        case 'dash_out': {
            const away = -towardPlayer;
            _botStartDash(b, away);
            break;
        }
        case 'jump':
            _botStartJump(b, towardPlayer);
            break;
        case 'track':
        default:
            b.state = 'track';
            b.stateTimer = 18 + Math.floor(Math.random()*22);
            break;
    }
}

// Per-frame behavior while a state is still timing out. Most states either run
// out the clock or drive a windup → active transition; track/idle need to
// actually move the bot toward its target distance.
function _tickBotState(b, h, Z){
    const dx = h.x - b.x;
    const adx = Math.abs(dx);

    if (b.state === 'windup_melee' || b.state === 'windup_throw'){
        // Plant feet during windup, face the player, build up the telegraph.
        b.vx *= 0.5;
        b.facing = (dx >= 0) ? 1 : -1;
        const total = (b.state === 'windup_melee') ? b.s.WINDUP_MELEE : b.s.WINDUP_THROW;
        const elapsed = total - b.stateTimer;
        b.telegraph = Math.min(1, elapsed / total);
        // Emit a tiny charge spark each frame near the weapon hand
        if (Z && elapsed % 3 === 0){
            const offX = b.facing * (b.state==='windup_throw' ? 14 : 22);
            Z.fx.push({
                type:'spark',
                x: b.x + offX + (Math.random()-0.5)*6,
                y: b.y - b.h*0.55 + (Math.random()-0.5)*8,
                vx: (Math.random()-0.5)*0.6,
                vy: -0.4 - Math.random()*0.6,
                life: 14, max: 14,
                color: b.state==='windup_throw' ? '#ffd84a' : '#ff5a3c',
            });
        }
        return;
    }
    if (b.state === 'melee_active' || b.state === 'throw_active' || b.state === 'recover'){
        // No locomotion during the swing/recovery — feels more readable.
        b.vx *= 0.7;
        return;
    }
    if (b.state === 'dash'){
        // Dash velocity is held by _botStartDash; just keep facing pinned.
        b.facing = b.dashDir;
        return;
    }
    if (b.state === 'hurt'){
        b.vx *= 0.85;
        return;
    }

    // idle / track — move toward the personality's preferred range.
    b.facing = (dx >= 0) ? 1 : -1;
    const target = b.personality.preferredRange;
    const tooFar  = adx > target + 30;
    const tooNear = adx < target - 40;
    let dir = 0;
    if (tooFar)  dir = (dx > 0) ? 1 : -1;
    else if (tooNear) dir = (dx > 0) ? -1 : 1;
    // Use run speed when far away, walk when close to target — feels more
    // deliberate up close, like the bot is sizing up its options.
    const sp = (adx > target + 200) ? b.s.RUN_SPEED : b.s.WALK_SPEED;
    if (dir !== 0 && b.grounded){
        b.vx += dir * 0.5;
        if (b.vx >  sp) b.vx =  sp;
        if (b.vx < -sp) b.vx = -sp;
    } else if (dir === 0 && b.grounded) {
        // Stop drifting once at preferred range
        b.vx *= 0.7;
    }
}

function _botStartDash(b, dir){
    b.state = 'dash';
    b.stateTimer = BOT.DASH_FRAMES;
    b.dashDir = dir || b.facing;
    b.facing = b.dashDir;
    b.vx = b.dashDir * b.s.DASH_SPEED;
    b.vy = Math.min(b.vy, 0);
    b.cd.dash = b.s.CD_DASH;
    b.invuln = Math.max(b.invuln, 10);
    // Streak FX
    const Z = G.combat; if (Z){
        for (let i=0; i<10; i++){
            Z.fx.push({
                type:'char',
                x: b.x - b.dashDir*4 + (Math.random()-0.5)*8,
                y: b.y - b.h*0.5 + (Math.random()-0.5)*b.h*0.7,
                vx: -b.dashDir * (1.5 + Math.random()*2.5),
                vy: (Math.random()-0.5)*0.5,
                life: 22, max: 22,
                rot: 0, spin: (Math.random()-0.5)*0.1,
                text: _randGlyph(),
                color: i%3===0 ? '#ffffff' : '#ff8e3c',
                size: 10 + Math.floor(Math.random()*3),
            });
        }
    }
}

function _botStartJump(b, towardDir){
    b.state = 'idle';
    b.stateTimer = 8;
    b.cd.jump = b.s.CD_JUMP;
    b.vy = BOT.JUMP_V;
    b.grounded = false;
    // Give it some horizontal push in the chosen direction
    const Z = G.combat;
    const h = G.holo;
    const dx = h ? (h.x - b.x) : 0;
    const dir = towardDir || (dx>=0?1:-1);
    // If the player is well above and roughly overhead, jump more vertically.
    const overhead = h && Math.abs(dx) < 80;
    b.vx = dir * (overhead ? 2.0 : 4.5);
    if (Z) {
        for (let i=0; i<5; i++){
            Z.fx.push({
                type:'dust',
                x: b.x + (Math.random()-0.5)*14,
                y: b.y - 2,
                vx: (Math.random()-0.5)*1.6,
                vy: Math.random()*0.4,
                life: 18, max: 18,
                color: 'rgba(255,180,140,0.5)',
            });
        }
    }
}

// ---- Physics --------------------------------------------------------------

function _updateBotPhysics(b, Z){
    // Dash overrides regular movement; gravity is suspended for the burst.
    if (b.state === 'dash'){
        b.vx = b.dashDir * b.s.DASH_SPEED;
        b.vy = 0;
    } else {
        // Gravity
        b.vy += BOT.GRAVITY;
        if (b.vy > 18) b.vy = 18;
        // Air drift damping so horizontal jump arcs feel controlled
        if (!b.grounded) b.vx *= 0.985;
    }

    // Move + collide
    const wasGrounded = b.grounded;
    _botMoveAndCollide(b, Z.platforms);

    // Ground friction (skip during dash so the burst doesn't get sapped)
    if (b.grounded && b.state !== 'dash'){
        b.vx *= 0.84;
        if (Math.abs(b.vx) < 0.04) b.vx = 0;
    }

    // Landing dust
    if (!wasGrounded && b.grounded && Math.abs(b.vy) > 1){
        for (let i=0; i<6; i++){
            Z.fx.push({
                type:'dust',
                x: b.x + (Math.random()-0.5)*16,
                y: b.y - 2,
                vx: (Math.random()-0.5)*1.6,
                vy: -Math.random()*1.2,
                life: 16, max: 16,
                color: 'rgba(255,180,140,0.55)',
            });
        }
    }

    // World clamp
    if (b.x < 50 + b.w/2){ b.x = 50 + b.w/2; if (b.vx < 0) b.vx = 0; }
    if (b.x > Z.worldW - 50 - b.w/2){ b.x = Z.worldW - 50 - b.w/2; if (b.vx > 0) b.vx = 0; }
    // Safety net — if a bot ever falls out of the world, snap it back to spawn
    if (b.y > Z.worldH + 200){ b.x = b.spawnX; b.y = b.spawnY; b.vx = 0; b.vy = 0; }
}

function _botMoveAndCollide(b, platforms){
    b.grounded = false;
    // X
    b.x += b.vx;
    let bb = _botBox(b);
    for (const p of platforms){
        if (!_rectsOverlap(bb, p)) continue;
        if (b.vx > 0) b.x = p.x - b.w/2 - 0.01;
        else if (b.vx < 0) b.x = p.x + p.w + b.w/2 + 0.01;
        b.vx = 0;
        bb = _botBox(b);
    }
    // Y
    b.y += b.vy;
    bb = _botBox(b);
    for (const p of platforms){
        if (!_rectsOverlap(bb, p)) continue;
        if (b.vy > 0){
            b.y = p.y - 0.01;
            b.vy = 0;
            b.grounded = true;
        } else if (b.vy < 0){
            b.y = p.y + p.h + b.h + 0.01;
            b.vy = 0;
        }
        bb = _botBox(b);
    }
}

function _botBox(b){ return { x: b.x - b.w/2, y: b.y - b.h, w: b.w, h: b.h }; }

function _botMeleeBox(b){
    const fx = b.attackDir >= 0 ? b.x : b.x - BOT.MELEE_REACH;
    return {
        x: fx,
        y: b.y - b.h - 4,
        w: BOT.MELEE_REACH,
        h: BOT.MELEE_HEIGHT + 12,
        dir: 'side',
        facing: b.attackDir,
    };
}

// ---- Projectiles ----------------------------------------------------------

function _botFireProjectile(b, h){
    const Z = G.combat; if (!Z) return;
    // Spawn at the bot's "hand" — facing-side, mid-torso
    const sx = b.x + b.facing * 18;
    const sy = b.y - b.h*0.55;
    // Aim at the player's mid-body, with a small lead based on player vx and
    // travel time. Lead is deliberately undertuned so a moving player can still
    // sidestep — accurate enough to feel intentional, beatable enough to be fair.
    const tx = h.x;
    const ty = h.y - h.h*0.5;
    let dx = tx - sx;
    let dy = ty - sy;
    // Quick lead estimate — assume player keeps current vx for the projectile flight time
    const roughDist = Math.hypot(dx, dy);
    const tFlight = roughDist / b.s.PROJ_SPEED;
    dx += (b.lastSeenPlayerVx || 0) * tFlight * 0.55;
    const m = Math.hypot(dx, dy) || 1;
    const vx = (dx/m) * b.s.PROJ_SPEED;
    const vy = (dy/m) * b.s.PROJ_SPEED;
    Z.botProjectiles.push({
        x: sx, y: sy,
        vx, vy,
        life: 110, max: 110,
        r: 8,
        dmg: b.s.PROJ_DMG,
        rot: Math.atan2(vy, vx),
        spin: (Math.random()-0.5)*0.1,
        trail: [],
    });
    // Muzzle flash
    Z.fx.push({
        type:'ring',
        x: sx, y: sy,
        r: 3, rMax: 22,
        life: 10, max: 10,
        color: '#ffd84a',
    });
}

function _updateBotProjectiles(){
    const Z = G.combat; if (!Z || !Z.botProjectiles) return;
    const h = G.holo;
    for (let i = Z.botProjectiles.length-1; i >= 0; i--){
        const pr = Z.botProjectiles[i];
        // Trail sample
        pr.trail.push({ x: pr.x, y: pr.y, life: 8, max: 8 });
        if (pr.trail.length > 8) pr.trail.shift();
        for (const t of pr.trail) t.life--;
        // Physics
        pr.x += pr.vx;
        pr.y += pr.vy;
        pr.vy += 0.12;                      // gentle arc — telegraphs the lob
        pr.rot = Math.atan2(pr.vy, pr.vx);
        pr.life--;
        // Platform collision — fizzles on contact with a puff of glyphs
        let dead = false;
        for (const p of Z.platforms){
            if (pr.x > p.x && pr.x < p.x+p.w && pr.y > p.y && pr.y < p.y+p.h){
                dead = true; break;
            }
        }
        // Player hit (only checks projectiles that still belong to the bot —
        // a parried projectile passes through the player on its way back).
        if (!dead && h && !h.dying && !pr.parried){
            const hb = _holoBox(h);
            // Circle vs rect: clamp circle center to rect, measure to clamp
            const cx = Math.max(hb.x, Math.min(pr.x, hb.x + hb.w));
            const cy = Math.max(hb.y, Math.min(pr.y, hb.y + hb.h));
            if ((cx-pr.x)*(cx-pr.x) + (cy-pr.y)*(cy-pr.y) <= pr.r*pr.r){
                if (h.parryWindow > 0){
                    _parryProjectile(h, pr);
                    // Projectile lives — now flagged as parried, will hit bots
                } else if (h.invuln <= 0){
                    _hitHoloFromProjectile(h, pr);
                    dead = true;
                }
                // else: invuln — passes through (dash-through, unchanged behavior)
            }
        }
        // Parried projectile vs bots — flies back at whoever fired it
        if (!dead && pr.parried && Z.bots){
            for (const b of Z.bots){
                if (b.dying) continue;
                const bb = _botBox(b);
                const cx2 = Math.max(bb.x, Math.min(pr.x, bb.x + bb.w));
                const cy2 = Math.max(bb.y, Math.min(pr.y, bb.y + bb.h));
                if ((cx2-pr.x)*(cx2-pr.x) + (cy2-pr.y)*(cy2-pr.y) <= pr.r*pr.r){
                    _onBotHit(b, { dir:'side', facing: pr.vx >= 0 ? 1 : -1, parried: true });
                    dead = true;
                    break;
                }
            }
        }
        if (dead || pr.life <= 0){
            // Pop FX
            for (let k=0; k<6; k++){
                Z.fx.push({
                    type:'char',
                    x: pr.x, y: pr.y,
                    vx: (Math.random()-0.5)*3,
                    vy: (Math.random()-0.5)*3 - 0.5,
                    life: 18, max: 18,
                    rot: 0, spin: (Math.random()-0.5)*0.2,
                    text: _randGlyph(),
                    color: '#ffd84a',
                    size: 10,
                });
            }
            Z.botProjectiles.splice(i, 1);
        }
    }
}

// ---- Damage hooks ---------------------------------------------------------

// Called from combat.js's _resolveAttackHits when a player slash overlaps a bot.
function _onBotHit(b, box){
    if (b.dying || b.invuln > 0) return;
    const dmg = 9 + Math.floor(Math.random()*5);
    b.hp = Math.max(0, b.hp - dmg);
    b.hitFlash = 14;
    b.stagger += dmg;
    // Knockback only on side hits — keeps up/down hits from yanking the bot off-screen
    if (box.dir === 'side'){
        b.vx = (box.facing||1) * 4.0;
    } else if (box.dir === 'up'){
        b.vy = -4.5;
    }
    // Interrupt a windup — feels VERY good. Active swings still complete.
    if (b.state === 'windup_melee' || b.state === 'windup_throw'){
        b.stagger = BOT.STAGGER_THRESHOLD; // force-stagger
    }
    // Parry-reflected projectiles always force-stagger — the reward for
    // nailing a tight 0.5s window has to be visible across the room.
    if (box.parried){
        b.stagger = BOT.STAGGER_THRESHOLD;
    }
    const Z = G.combat;
    Z.popups.push({
        x: b.x + (Math.random()-0.5)*16,
        y: b.y - b.h - 4,
        vy: -1.6,
        life: 40, max: 40,
        text: '-'+dmg,
        color: box.dir==='down' ? '#ffd84a' : (box.dir==='up' ? '#ff8e3c' : '#ff5a3c'),
        scaleIn: 1.0,
    });
    Z.fx.push({
        type:'ring',
        x: b.x, y: b.y - b.h*0.55,
        r: 4, rMax: 36,
        life: 14, max: 14,
        color: '#ff5a3c',
    });
    for (let i=0; i<10; i++){
        const ang = Math.random()*Math.PI*2;
        const spd = 2 + Math.random()*4;
        Z.fx.push({
            type:'char',
            x: b.x + (Math.random()-0.5)*b.w*0.6,
            y: b.y - b.h*0.55 + (Math.random()-0.5)*b.h*0.5,
            vx: Math.cos(ang)*spd,
            vy: Math.sin(ang)*spd - 1.0,
            life: 24, max: 24,
            rot: 0, spin: (Math.random()-0.5)*0.2,
            text: _randGlyph(),
            color: i<2 ? '#ffffff' : '#ff8e3c',
            size: 10 + Math.floor(Math.random()*4),
        });
    }
    // Stagger threshold reached → flinch state, brief iframes after recover
    if (b.stagger >= BOT.STAGGER_THRESHOLD){
        b.state = 'hurt';
        b.stateTimer = BOT.HURT_FRAMES;
        b.stagger = 0;
        b.invuln = BOT.HURT_FRAMES + 6;
        b.attackBox = null;
        b.swingArc = null;
    }
    // Death
    if (b.hp <= 0 && !b.dying) _killBot(b, false);
}

function _killBot(b, silent){
    b.dying = true;
    b.dyingTimer = 0;
    b.cleanup = b.dyingLife + 20;
    b.vx = 0; b.vy = 0;
    b.attackBox = null; b.swingArc = null;
    const Z = G.combat;
    if (!Z) return;
    if (!silent){
        Z.popups.push({
            x: b.x, y: b.y - b.h - 14, vy: -1.2, life: 70, max: 70,
            text: 'TERMINATED', color: '#ff5a3c',
        });
        Z.glitch = Math.max(Z.glitch||0, 14);
        if (typeof shake === 'function') shake(5, 12);
        try { Sound.explode && Sound.explode(); } catch(e){}
    }
    // Burst of fire glyphs
    for (let i=0; i<24; i++){
        const ang = -Math.PI/2 + (Math.random()-0.5)*Math.PI*1.4;
        const spd = 1.5 + Math.random()*4.5;
        Z.fx.push({
            type:'char',
            x: b.x + (Math.random()-0.5)*b.w*0.8,
            y: b.y - b.h*0.4 + (Math.random()-0.5)*b.h*0.7,
            vx: Math.cos(ang)*spd,
            vy: Math.sin(ang)*spd - 0.5,
            life: 46, max: 46,
            rot: 0, spin: (Math.random()-0.5)*0.16,
            text: _randGlyph(),
            color: i%3===0 ? '#ffd84a' : '#ff5a3c',
            size: 11 + Math.floor(Math.random()*4),
            rise: true,
        });
    }
}

function _updateBotDying(b, Z){
    b.dyingTimer++;
    // Trickle of code chars rising
    if (b.dyingTimer < b.dyingLife - 10 && b.dyingTimer % 3 === 0){
        Z.fx.push({
            type:'char',
            x: b.x + (Math.random()-0.5)*b.w,
            y: b.y - b.h*0.4 + (Math.random()-0.5)*b.h*0.7,
            vx: (Math.random()-0.5)*0.8,
            vy: -0.5 - Math.random()*0.9,
            life: 28, max: 28,
            rot: 0, spin: (Math.random()-0.5)*0.06,
            text: _randGlyph(),
            color: Math.random()<0.5 ? '#ff8e3c' : '#ffd84a',
            size: 10,
            rise: true,
        });
    }
    // Apply some lingering gravity so the body settles
    b.vy += BOT.GRAVITY * 0.6;
    if (b.vy > 12) b.vy = 12;
    b.y += b.vy;
    if (b.y >= b.spawnY) { b.y = b.spawnY; b.vy = 0; }
}

// ---- Parry ----------------------------------------------------------------

// Parrying a melee strike: no damage to the player, bot is force-staggered
// and knocked back. The player gets a short iframe grace so chip damage from
// the bot's body overlap can't immediately punish the parry.
function _onPlayerParryMelee(h, b){
    const Z = G.combat;
    const fromDir = (h.x >= b.x) ? -1 : 1;     // direction from player to bot
    // Force the bot out of its swing and into hurt state
    b.state = 'hurt';
    b.stateTimer = BOT.HURT_FRAMES;
    b.stagger = 0;
    b.invuln = BOT.HURT_FRAMES + 6;
    b.attackBox = null;
    b.swingArc = null;
    b.vx = -fromDir * 5.5;
    b.hitFlash = 14;
    _spawnParryFX(h, h.x - fromDir*18, h.y - h.h*0.55);
    if (typeof shake === 'function') shake(5, 8);
    // Slight grace iframes so the player can reposition without instantly
    // taking contact damage from the bot they just parried.
    h.invuln = Math.max(h.invuln, 14);
    h.parryWindow = 0;     // consume the window — one parry per attack press
}

// Parrying a projectile: reverses its velocity (back toward the bot), boosts
// speed slightly, flips ownership so it now damages bots, and recolors it.
function _parryProjectile(h, pr){
    const Z = G.combat;
    pr.parried = true;
    // Parry-reflected projectiles always pack a meaningful punch — a flat
    // bonus on top of the original throw damage, with a floor so easy-bot
    // shards still feel rewarding to send back.
    pr.dmg = Math.max(pr.dmg + 4, 12);
    // Reflect: send it back where it came from, slightly faster than before.
    const sp = Math.hypot(pr.vx, pr.vy);
    const newSp = Math.min(14, sp + 2.5);
    // Reflect roughly toward the nearest bot if one is alive; otherwise just
    // reverse the velocity vector.
    let aimed = false;
    if (Z.bots){
        let nearest = null, nd = Infinity;
        for (const b of Z.bots){
            if (b.dying) continue;
            const d = Math.hypot(b.x - pr.x, (b.y - b.h*0.5) - pr.y);
            if (d < nd){ nd = d; nearest = b; }
        }
        if (nearest){
            const dx = nearest.x - pr.x;
            const dy = (nearest.y - nearest.h*0.5) - pr.y;
            const m = Math.hypot(dx, dy) || 1;
            pr.vx = (dx/m) * newSp;
            pr.vy = (dy/m) * newSp;
            aimed = true;
        }
    }
    if (!aimed){
        pr.vx = -pr.vx * (newSp/sp);
        pr.vy = -Math.abs(pr.vy) * 0.4;     // a little upward arc back
    }
    pr.life = Math.max(pr.life, 90);         // refresh time so it can reach the bot
    pr.rot = Math.atan2(pr.vy, pr.vx);
    _spawnParryFX(h, pr.x, pr.y);
    if (typeof shake === 'function') shake(4, 6);
    h.invuln = Math.max(h.invuln, 12);
    h.parryWindow = 0;
}

// Shared parry FX — bright cyan/white burst, ring, popup, brief screen flash.
function _spawnParryFX(h, fxX, fxY){
    const Z = G.combat; if (!Z) return;
    h.parryFlash = 18;
    Z.glitch = Math.max(Z.glitch||0, 6);
    Z.popups.push({
        x: fxX, y: fxY - 18,
        vy: -1.4, life: 50, max: 50,
        text: 'PARRY!', color: '#ffffff', scaleIn: 0.6,
    });
    Z.fx.push({
        type:'ring',
        x: fxX, y: fxY,
        r: 4, rMax: 60,
        life: 18, max: 18,
        color: '#ffffff',
    });
    Z.fx.push({
        type:'ring',
        x: fxX, y: fxY,
        r: 4, rMax: 44,
        life: 22, max: 22,
        color: '#aef9ff',
    });
    for (let i=0; i<18; i++){
        const ang = Math.random()*Math.PI*2;
        const spd = 2 + Math.random()*5;
        Z.fx.push({
            type:'char',
            x: fxX + (Math.random()-0.5)*10,
            y: fxY + (Math.random()-0.5)*10,
            vx: Math.cos(ang)*spd,
            vy: Math.sin(ang)*spd - 0.5,
            life: 26, max: 26,
            rot: 0, spin: (Math.random()-0.5)*0.25,
            text: _randGlyph(),
            color: i%3===0 ? '#ffffff' : '#aef9ff',
            size: 11 + Math.floor(Math.random()*4),
        });
    }
    try { Sound.ui && Sound.ui(); } catch(e){}
}

// ---- Damage to player -----------------------------------------------------

function _hitHoloFromBot(h, box, dmg, facing){
    _damageHolo(dmg, facing || h.facing*-1);
    // Add a sound + ring on the player
    const Z = G.combat;
    if (Z){
        Z.fx.push({
            type:'ring',
            x: h.x, y: h.y - h.h*0.5,
            r: 4, rMax: 36,
            life: 12, max: 12,
            color: '#ff5a3c',
        });
    }
}

function _hitHoloFromProjectile(h, pr){
    _damageHolo(pr.dmg, pr.vx >= 0 ? 1 : -1);
    const Z = G.combat;
    if (Z){
        Z.fx.push({
            type:'ring',
            x: pr.x, y: pr.y,
            r: 4, rMax: 28,
            life: 12, max: 12,
            color: '#ffd84a',
        });
    }
}

// Apply HP loss + knockback + iframes to the player. If HP hits zero, respawn
// the player at the zone spawn point with full HP — the playground is a
// sandbox, not a death zone.
function _damageHolo(amount, dirSign){
    const h = G.holo;
    if (!h || h.invuln > 0 || h.parryWindow > 0 || h.groundSlamming) return;
    h.hp = Math.max(0, h.hp - amount);
    h.invuln = BOT.PLAYER_HIT_IFRAMES;
    h.vx = (dirSign||1) * 4.5;
    h.vy = -3.5;
    h.grounded = false;
    h.animState = 'fall';
    h.animTimer = 0;
    if (typeof shake === 'function') shake(5, 10);
    try { Sound.hit && Sound.hit(); } catch(e){}
    const Z = G.combat;
    if (Z){
        Z.popups.push({
            x: h.x, y: h.y - h.h - 4,
            vy: -1.4, life: 36, max: 36,
            text: '-'+amount, color: '#ff5a3c', scaleIn: 1.0,
        });
        Z.glitch = Math.max(Z.glitch||0, 8);
    }
    if (h.hp <= 0){
        // Respawn the player at the spawn point with full HP
        h.hp = h.maxHp;
        h.x = 240; h.y = 1180;
        h.vx = 0; h.vy = 0;
        h.invuln = 90;
        if (Z){
            Z.popups.push({
                x: 240, y: 1180 - 80,
                vy: -1.2, life: 70, max: 70,
                text: 'REBOOTING', color: '#5cf6ff', scaleIn: 1.0,
            });
            Z.fx.push({
                type:'ring',
                x: 240, y: 1180 - 2,
                r: 6, rMax: 80,
                life: 24, max: 24,
                color: '#5cf6ff',
            });
        }
    }
}

// ---- Render ---------------------------------------------------------------

function _drawBots(T){
    const Z = G.combat; if (!Z || !Z.bots) return;
    for (const b of Z.bots) _drawBot(b, T);
}

function _drawBot(b, T){
    if (b.dying){ _drawBotDying(b, T); return; }
    const flickerOff = (b.flicker === 0 ? 0.15 : 0);
    const invulnBlink = (b.invuln > 0 && (b.invuln % 4 < 2)) ? 0.4 : 0;
    const alpha = Math.max(0.25, 1 - flickerOff - invulnBlink);

    // Spawn-in flash — bright cyan-to-orange flare
    if (b.spawnFlash > 0){
        const sa = b.spawnFlash / 30;
        ctx.save();
        ctx.globalAlpha = sa * 0.6;
        ctx.fillStyle = '#ffffff';
        _roundRect(b.x - b.w/2 - 4, b.y - b.h - 4, b.w+8, b.h+8, 8);
        ctx.fill();
        ctx.restore();
    }

    // Telegraph aura before an attack — pulses brighter as windup completes
    if (b.telegraph > 0 && (b.state === 'windup_melee' || b.state === 'windup_throw')){
        const tcol = b.state === 'windup_throw' ? '#ffd84a' : '#ff5a3c';
        ctx.save();
        ctx.translate(b.x, b.y - b.h*0.5);
        const r = 22 + b.telegraph*28;
        const grd = ctx.createRadialGradient(0,0,2,0,0,r);
        grd.addColorStop(0, tcol);
        grd.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.35 * b.telegraph;
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
        // Inner sharp ring
        ctx.globalAlpha = 0.65 * b.telegraph;
        ctx.strokeStyle = tcol;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, 0, r*0.55, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    _drawBotSilhouette(b, T);
    ctx.restore();

    // Melee swing arc (orange crescent) during the active window
    if (b.swingArc) _drawBotSwing(b, b.swingArc);

    // Floor ring under bot
    if (b.grounded){
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.strokeStyle = 'rgba(255,90,60,0.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, 1, 16, 5, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
    }

    // HP bar above
    const barW = 56, barH = 5;
    const bx = b.x - barW/2, by = b.y - b.h - 22;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx-1, by-1, barW+2, barH+2);
    ctx.fillStyle = '#3a0a0a';
    ctx.fillRect(bx, by, barW, barH);
    const pct = b.hp/b.maxHp;
    ctx.fillStyle = pct>0.55 ? '#ff8e3c' : (pct>0.25 ? '#ffd84a' : '#ff3a2a');
    ctx.fillRect(bx, by, barW*pct, barH);
    // Label
    ctx.fillStyle = '#ff8e3c';
    ctx.font = 'bold 9px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(b.label || 'AGENT', b.x, by - 4);
}

function _drawBotSilhouette(b, T){
    const orange = '#ff8e3c';
    const orangeDim = 'rgba(255,142,60,0.4)';
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.facing, 1);
    ctx.strokeStyle = orange;
    ctx.fillStyle = 'rgba(255,90,60,0.22)';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#ff5a3c';
    ctx.shadowBlur = 10;

    // Body geometry — taller, leaner than the player; spike on the shoulder for menace
    const torsoY = -28;
    const torsoH = 22;
    const headY  = -46;
    const hipY   = -10;

    // Legs — simple posed stance unless dashing/jumping
    let lfx = -4, rfx = 4, lfy = 0, rfy = 0;
    if (b.state === 'dash'){
        lfx = -8; rfx = 4; lfy = 2; rfy = 0;
    } else if (!b.grounded){
        lfx = -3; rfx = 6; lfy = 4; rfy = 6;
    } else if (b.state === 'track' && Math.abs(b.vx) > 0.4){
        const ph = (T/90 + b.x*0.01);
        lfx = -4 + Math.sin(ph)*4;
        rfx =  4 - Math.sin(ph)*4;
        lfy = Math.max(0, Math.sin(ph))*3;
        rfy = Math.max(0, -Math.sin(ph))*3;
    }
    // Thighs
    ctx.beginPath();
    ctx.moveTo(-3, hipY); ctx.lineTo(lfx, -lfy);
    ctx.moveTo( 3, hipY); ctx.lineTo(rfx, -rfy);
    ctx.stroke();

    // Torso
    ctx.beginPath();
    _roundRect(-7, torsoY, 14, torsoH, 4);
    ctx.fill(); ctx.stroke();

    // Shoulder spike (forward-facing, signals "danger")
    ctx.beginPath();
    ctx.moveTo(4, torsoY+3);
    ctx.lineTo(11, torsoY-3);
    ctx.lineTo(7,  torsoY+6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,90,60,0.55)';
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,90,60,0.22)';

    // Arms — pose depends on state. The weapon-arm extends during attacks.
    let armX = 9, armY = torsoY + 14;
    let weapon = null; // {x,y,angle,kind}
    if (b.state === 'windup_melee'){
        // Sword raised behind for a windmill chop
        const t = 1 - (b.stateTimer / b.s.WINDUP_MELEE);
        armX = -2 - t*4;
        armY = torsoY - 6 - t*4;
        weapon = { x: armX-6, y: armY-4, angle: -Math.PI*0.85, kind:'sword' };
    } else if (b.state === 'melee_active'){
        // Sword swung forward — sweeping arc
        const t = 1 - (b.stateTimer / BOT.ACTIVE_MELEE);
        armX = 8 + t*6;
        armY = torsoY + 8;
        weapon = { x: armX, y: armY, angle: -Math.PI*0.2 + t*Math.PI*0.6, kind:'sword' };
    } else if (b.state === 'windup_throw'){
        const t = 1 - (b.stateTimer / b.s.WINDUP_THROW);
        armX = -8 + t*4;
        armY = torsoY + 4 - t*6;
        weapon = { x: armX, y: armY, angle: -Math.PI*0.6, kind:'spear' };
    } else if (b.state === 'throw_active'){
        armX = 14;
        armY = torsoY + 4;
    } else if (b.state === 'recover'){
        armX = 6;
        armY = torsoY + 12;
    }
    ctx.beginPath();
    ctx.moveTo(-4, torsoY+4); ctx.lineTo(-8, torsoY+12);
    ctx.moveTo( 4, torsoY+4); ctx.lineTo(armX, armY);
    ctx.stroke();

    if (weapon) _drawBotWeapon(weapon);

    // Head — angular, with a glowing horizontal eye-stripe
    ctx.beginPath();
    ctx.moveTo(-5, headY+5);
    ctx.lineTo(-5, headY-2);
    ctx.lineTo(0,  headY-6);
    ctx.lineTo(5,  headY-2);
    ctx.lineTo(5,  headY+5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Eye stripe
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = '#ffd84a';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(-4, headY+1); ctx.lineTo(4, headY+1); ctx.stroke();
    // Cape wisp behind the back
    ctx.shadowBlur = 0;
    ctx.strokeStyle = orangeDim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, torsoY+8);
    ctx.quadraticCurveTo(-12, torsoY+6, -18, torsoY+18);
    ctx.stroke();

    // Hit-flash overlay
    if (b.hitFlash > 0){
        const a = b.hitFlash/14;
        ctx.fillStyle = `rgba(255,255,255,${a*0.6})`;
        _roundRect(-b.w/2-2, -b.h-2, b.w+4, b.h+4, 8);
        ctx.fill();
    }

    // Scanline overlay
    ctx.save();
    ctx.beginPath();
    _roundRect(-9, -50, 18, 50, 6);
    ctx.clip();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ff8e3c';
    const offset = (T*0.04) % 3;
    for (let yy=-50+offset; yy<0; yy+=3) ctx.fillRect(-10, yy, 20, 0.7);
    ctx.restore();

    ctx.restore();
    ctx.shadowBlur = 0;
}

function _drawBotWeapon(w){
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.angle);
    if (w.kind === 'sword'){
        const len = 26;
        ctx.shadowColor = '#ff5a3c';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = '#ff5a3c';
        ctx.lineCap = 'round';
        ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(len,0); ctx.stroke();
        ctx.shadowBlur = 6;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(2,0); ctx.lineTo(len-1,0); ctx.stroke();
        ctx.shadowBlur = 0;
        // Guard
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-1,-4); ctx.lineTo(-1,4); ctx.stroke();
    } else {
        // Spear / projectile-shaped weapon used during a throw windup
        const len = 30;
        ctx.shadowColor = '#ffd84a';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = '#ffd84a';
        ctx.lineCap = 'round';
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(len,0); ctx.stroke();
        // Spearhead
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(len, -3); ctx.lineTo(len+8, 0); ctx.lineTo(len, 3); ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    ctx.restore();
}

function _drawBotSwing(b, arc){
    const prog = arc.t / arc.life;
    const a = Math.pow(1 - prog, 1.3);
    const reach = BOT.MELEE_REACH;
    const cy = b.y - b.h*0.55;
    const cx = b.x;
    const facing = arc.dir;
    const a0 = (facing>=0 ? 0 : Math.PI) - Math.PI*0.4;
    const a1 = (facing>=0 ? 0 : Math.PI) + Math.PI*0.4;
    const angNow = a0 + (a1-a0) * Math.min(1, prog*1.4);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = a * 0.85;
    ctx.shadowColor = '#ff5a3c';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = '#ff5a3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const steps = 14;
    const rInner = reach - 18 - 10*Math.sin(Math.PI*prog);
    for (let i=0; i<=steps; i++){
        const t = i/steps;
        const aa = a0 + (angNow-a0)*t;
        if (i===0) ctx.moveTo(Math.cos(aa)*reach, Math.sin(aa)*reach);
        else ctx.lineTo(Math.cos(aa)*reach, Math.sin(aa)*reach);
    }
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i=0; i<=steps; i++){
        const t = i/steps;
        const aa = a0 + (angNow-a0)*t;
        const rr = (reach + rInner)/2 + (Math.random()-0.5)*2;
        if (i===0) ctx.moveTo(Math.cos(aa)*rr, Math.sin(aa)*rr);
        else ctx.lineTo(Math.cos(aa)*rr, Math.sin(aa)*rr);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
}

function _drawBotDying(b, T){
    const tt = b.dyingTimer / b.dyingLife;
    const fade = Math.max(0, 1 - tt);
    // Dissolving silhouette — broken into vertical shards that drift apart
    const slices = 8;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.facing, 1);
    for (let i=0; i<slices; i++){
        const x0 = -b.w/2 + (b.w/slices)*i;
        const ox = (Math.random()-0.5)*4 + (i - slices/2) * tt * 2.5;
        const oy = -tt * (10 + (i%3)*5);
        ctx.save();
        ctx.globalAlpha = fade * 0.85;
        ctx.fillStyle = 'rgba(255,90,60,0.65)';
        ctx.shadowColor = '#ff5a3c';
        ctx.shadowBlur = 8;
        ctx.fillRect(x0 + ox, -b.h + oy, b.w/slices + 0.5, b.h);
        ctx.restore();
    }
    // Bright seam where the silhouette splits
    ctx.globalAlpha = Math.sin(Math.PI*Math.min(1, tt*1.4)) * 0.8;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#ffd84a';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i=0; i<=8; i++){
        const yy = -b.h + (b.h/8)*i;
        const jx = (Math.random()-0.5)*3;
        if (i===0) ctx.moveTo(jx, yy);
        else ctx.lineTo(jx, yy);
    }
    ctx.stroke();
    ctx.restore();
}

function _drawBotProjectiles(Z){
    if (!Z.botProjectiles) return;
    for (const pr of Z.botProjectiles){
        // Parried projectiles are recolored cyan so the player can tell at a
        // glance which way the shard is flying.
        const trailRGB = pr.parried ? '174,249,255' : '255,216,74';
        const bodyColor = pr.parried ? '#aef9ff' : '#ffd84a';
        // Trail
        for (let i=0; i<pr.trail.length; i++){
            const t = pr.trail[i];
            const a = (t.life/t.max) * 0.5;
            if (a <= 0) continue;
            ctx.fillStyle = `rgba(${trailRGB},${a.toFixed(2)})`;
            ctx.beginPath(); ctx.arc(t.x, t.y, 2 + i*0.4, 0, Math.PI*2); ctx.fill();
        }
        // Projectile body — glowing shard
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(pr.rot);
        ctx.shadowColor = bodyColor;
        ctx.shadowBlur = 16;
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(10, 0); ctx.lineTo(-6, 5); ctx.lineTo(-3, 0); ctx.lineTo(-6, -5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(8, 0); ctx.lineTo(-2, 2.5); ctx.lineTo(-1, 0); ctx.lineTo(-2, -2.5);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
