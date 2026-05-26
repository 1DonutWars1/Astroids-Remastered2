// ============================================================
//  COMBAT SYSTEM — hologram on-foot combat for combat zones
//  Controls: Left/Right move, Z jump, X strike, C sprint,
//            Up+X uppercut, Down+X aerial pogo
// ============================================================

// ---- Constants ----
const COMBAT = {
    GRAVITY: 0.65,
    MOVE_ACCEL: 0.85,
    SPRINT_ACCEL_MULT: 2.0,    // accel multiplier while sprinting — needed so the
                                // sprint cap actually exceeds the friction equilibrium.
    MAX_RUN: 4.2,
    MAX_SPRINT: 7.0,
    FRICTION_GROUND: 0.82,
    FRICTION_AIR: 0.94,
    // Dash (tap C). Hold C past the dash to flow into sprint.
    DASH_SPEED: 12.0,
    DASH_FRAMES: 12,            // duration of the dash burst
    DASH_COOLDOWN: 30,          // frames before another dash can fire
    DASH_IFRAMES: 14,           // invuln frames during dash
    JUMP_V: -11.5,
    JUMP_HOLD_FRAMES: 8,           // extra lift while holding Z
    JUMP_HOLD_BOOST: -0.55,
    COYOTE_FRAMES: 6,
    JUMP_BUFFER_FRAMES: 6,
    ATTACK_COOLDOWN: 18,
    ATTACK_DURATION: 14,
    // Parry — frames after pressing X during which incoming bot melee /
    // projectiles get reflected instead of damaging the player. 0.5s @ 60fps.
    PARRY_WINDOW: 30,
    ATTACK_REACH: 56,
    ATTACK_HEIGHT: 44,
    UP_ATTACK_REACH: 50,
    POGO_REACH: 36,
    POGO_BOUNCE_V: -10.5,
    SPRITE_W: 22,
    SPRITE_H: 32,
    CAM_LERP: 0.12,
    CAM_LOOKAHEAD: 80,
    // Enlarged canvas while in a combat zone
    CANVAS_W: 1200,
    CANVAS_H: 720,
};

// ---- State containers ----
G.combat = null;            // active zone state, or null
G.combatReturn = null;      // { mode, canvasW, canvasH } so we can restore on exit

// Glyphs sampled for "code being destroyed" effects.
const CODE_GLYPHS = ['0','1','0','1','{','}','<','>','/','\\','*','&','|','#','%','$',';',':','=','!','?','^','~','+',
                     'A','B','C','D','E','F','x','f','a','e','i','o',
                     '0x','01','10','FF','00','NaN','??','[]','()',':;','->'];
const ERROR_TAGS = ['NULL','VOID','0x00','SEGFAULT','UNDEFINED','[DEREFERENCED]','CTX_LOST',
                    'DEALLOC','REFCOUNT=0','OUT_OF_BOUNDS','PURGED','404'];

function _randGlyph(){ return CODE_GLYPHS[Math.floor(Math.random()*CODE_GLYPHS.length)]; }

// A combat zone is a self-contained world with bounds, platforms, dummies.
// Architecturally identical to G.mode==='station' but with platformer physics.
function _newCombatZone(opts){
    opts = opts||{};
    const zone = {
        name: opts.name || 'COMBAT PLAYGROUND',
        worldW: opts.worldW || 2400,
        worldH: opts.worldH || 1400,
        // Floor + platform geometry — array of axis-aligned rects {x,y,w,h}
        platforms: opts.platforms || _defaultPlaygroundPlatforms(),
        // Training dummies
        dummies: opts.dummies || [],
        // AI bots — mobile, fights-back opponents (see combat-bot.js)
        bots: [],
        // Projectiles fired by bots — circles that damage the player on contact
        botProjectiles: [],
        // Floating damage popups
        popups: [],
        // Particles (sparks, dust, hit flashes, code shards, glitch slices)
        fx: [],
        // Camera (world coords of top-left of view)
        cam: { x: 0, y: 0 },
        // Banner / intro text
        banner: { text: opts.name || 'COMBAT PLAYGROUND', t: 0, life: 180 },
        // Background scroll seed
        bgSeed: Math.random()*1000,
        // Source we came from so 'exit' returns us correctly. 'menu' returns home.
        returnTo: opts.returnTo || 'menu',
        // 'Exit' portal — when player walks onto it + presses Z+up arrow, they leave.
        exitPortal: opts.exitPortal || { x: 120, y: 0, w: 60, h: 90 },
        elapsed: 0,
        // Background code rain — matrix-like columns of dim glyphs
        codeRain: [],
        // Screen-space chromatic glitch (set briefly on dummy death)
        glitch: 0,
    };
    // Seed code rain columns spread across a wide band (drawn in screen space).
    for (let i=0; i<28; i++){
        zone.codeRain.push({
            col: i,
            x: Math.random()*1400,
            y: Math.random()*900 - 400,
            vy: 0.6 + Math.random()*1.4,
            chars: Array.from({length: 10+Math.floor(Math.random()*8)}, _randGlyph),
            cycle: Math.floor(Math.random()*40),
            alpha: 0.18 + Math.random()*0.25,
        });
    }
    return zone;
}

function _defaultPlaygroundPlatforms(){
    // Ground spans most of the floor; a few platforms for jumping/pogo practice.
    const groundY = 1180;
    return [
        // Ground
        { x: 0,    y: groundY, w: 2400, h: 220 },
        // Mid-air platforms (good for pogo bouncing between dummies)
        { x: 460,  y: 960,  w: 220, h: 22 },
        { x: 820,  y: 820,  w: 200, h: 22 },
        { x: 1180, y: 920,  w: 220, h: 22 },
        { x: 1540, y: 780,  w: 240, h: 22 },
        { x: 1880, y: 940,  w: 220, h: 22 },
        // Wall on far right so the player can't walk off
        { x: 2360, y: 0,    w: 40,  h: groundY+220 },
        { x: 0,    y: 0,    w: 40,  h: groundY+220 },
    ];
}

function _spawnTrainingDummy(x, y){
    return {
        x: x, y: y,            // foot position
        baseX: x, baseY: y,
        vx: 0, vy: 0,
        w: 30, h: 64,
        hp: 100, maxHp: 100,
        hitFlash: 0,           // frames since last hit
        lean: 0,               // visual lean angle from hits
        leanVel: 0,
        bobPhase: Math.random()*Math.PI*2,
        respawnTimer: 0,       // when >0, dummy is downed
        grounded: true,
        // What hit it most recently — used for arrow/visual direction
        lastHitDir: 1,
    };
}

// ---- Hologram player ----
G.holo = null;

function _newHoloPlayer(spawnX, spawnY){
    return {
        x: spawnX, y: spawnY,        // FOOT position (so y == ground when grounded)
        vx: 0, vy: 0,
        facing: 1,                    // 1 right, -1 left
        w: COMBAT.SPRITE_W,
        h: COMBAT.SPRITE_H,
        grounded: false,
        jumping: false,
        jumpHoldFrames: 0,
        jumpBuffer: 0,
        coyote: 0,
        sprinting: false,
        // Dash (tap C). Hold C through the dash to flow into sprint.
        dashing: false,
        dashTimer: 0,
        dashCooldown: 0,
        dashDir: 1,
        invuln: 0,                    // dash i-frames
        // Attack state
        attackTimer: 0,               // counts down; >0 means attack in progress
        attackCooldown: 0,
        attackDir: 'side',            // 'side' | 'up' | 'down'
        attackHit: false,             // already connected this attack
        parryWindow: 0,               // >0: pressing X just now; incoming hits get parried
        parryFlash: 0,                // >0: visual flash after a successful parry
        // Animation
        animState: 'idle',            // idle | run | jump | fall | land | attack
        animTimer: 0,
        runStep: 0,                   // 0..1 oscillates for bobbing
        landSquash: 0,                // 0..1 squash on landing
        flicker: 0,                   // hologram flicker
        hp: 100, maxHp: 100,
        // Trail for sprint effect
        trail: [],
        // Slash arc draw state
        slash: null,                  // {t,life,dir,reach,heightRatio,angle0,angle1}
    };
}

// ---- Public entry points ----
function startCombatPlayground(){
    try { Sound.ui(); } catch(e) {}
    // Hide menu screens
    if (typeof $menu!=='undefined' && $menu) $menu.style.display='none';
    const moreDrop = document.getElementById('moreDropdown');
    if (moreDrop) moreDrop.style.display='none';
    document.getElementById('overScreen').style.display='none';
    document.getElementById('winScreen').style.display='none';
    document.getElementById('pauseMenu').style.display='none';
    // Build dummies — three spread across the arena, including one perched for pogo practice
    const groundY = 1180;
    const dummies = [
        _spawnTrainingDummy(600,  groundY),
        _spawnTrainingDummy(1300, groundY),
        _spawnTrainingDummy(900,  820),   // standing on the second platform — great for uppercut/pogo
    ];
    enterCombatZone({
        name: 'COMBAT PLAYGROUND',
        dummies: dummies,
        returnTo: 'menu',
        exitPortal: { x: 110, y: groundY-90, w: 60, h: 90 },
        spawnX: 240, spawnY: groundY,
    });
}

function enterCombatZone(opts){
    opts = opts || {};
    // Preserve current canvas so we can restore on exit
    G.combatReturn = {
        mode: G.mode,
        canvasW: canvas.width,
        canvasH: canvas.height,
    };
    // Enlarge canvas for the bigger combat view
    canvas.width  = COMBAT.CANVAS_W;
    canvas.height = COMBAT.CANVAS_H;
    W = canvas.width; H = canvas.height;
    G.mode = 'combat';
    G.running = true;
    G.paused = false;
    G.combat = _newCombatZone(opts);
    G.holo = _newHoloPlayer(opts.spawnX || 240, opts.spawnY || 1180);
    if (typeof $ui!=='undefined' && $ui) $ui.style.display='none';
    try { Sound.playMusic('bgm'); } catch(e) {}
    // Tutorial — runs the first time the player ever enters a combat zone.
    // Persists completion to localStorage so it doesn't replay.
    if (!_isCombatTutorialDone()) _beginCombatTutorial();
}

function exitCombatZone(){
    const ret = G.combatReturn || { mode:'space', canvasW:900, canvasH:650 };
    const goMenu = G.combat && G.combat.returnTo === 'menu';
    // Restore canvas
    canvas.width  = ret.canvasW || 900;
    canvas.height = ret.canvasH || 650;
    W = canvas.width; H = canvas.height;
    G.combat = null;
    G.holo = null;
    G.combatReturn = null;
    if (goMenu) {
        // Return to home menu
        G.running = false;
        G.mode = 'space';
        if (typeof $ui!=='undefined' && $ui) $ui.style.display='none';
        if (typeof $menu!=='undefined' && $menu) $menu.style.display='block';
    } else {
        G.mode = ret.mode || 'space';
        if (typeof $ui!=='undefined' && $ui) $ui.style.display='block';
    }
}

function isInCombatZone(){ return G.mode === 'combat' && !!G.combat; }

// ============================================================
//  COMBAT TUTORIAL — one-time, persisted via localStorage.
//  Each step waits for a real player action so the player learns by doing,
//  rather than dismissing a wall-of-text panel.
// ============================================================
const COMBAT_TUTORIAL_STEPS = [
    { id:'move',    text:'PRESS  ← / →  TO MOVE',                  hint:'Get comfortable with the basics.' },
    { id:'jump',    text:'PRESS  Z  TO JUMP (HOLD FOR HIGHER)',    hint:'Variable height — release early to hop, hold to leap.' },
    { id:'dash',    text:'TAP  C  TO DASH',                         hint:'A short invulnerable burst in the way you\'re facing.' },
    { id:'sprint',  text:'HOLD  C  WHILE MOVING TO SPRINT',         hint:'Hold past the dash to keep going at full speed.  Sprint-jumps go higher.' },
    { id:'strike',  text:'PRESS  X  TO STRIKE',                     hint:'Face a training dummy, then slash.' },
    { id:'upper',   text:'HOLD  ↑  +  X  FOR AN UPPERCUT',          hint:'Useful for hitting things above you.' },
    { id:'pogo',    text:'JUMP, THEN HOLD  ↓  +  X  TO POGO',      hint:'Bounce off enemies and platforms below you — Hollow Knight style.' },
    { id:'kill',    text:'DEFEAT A TRAINING DUMMY',                 hint:'They\'re removed from reality on the spot.' },
    { id:'exit',    text:'WALK TO THE GOLD EXIT,  ↑ + Z  TO LEAVE', hint:'Or hit ESC for the pause menu.' },
];
const COMBAT_TUTORIAL_KEY = 'ast_rem_combat_tutorial_done';

function _isCombatTutorialDone(){
    try { return localStorage.getItem(COMBAT_TUTORIAL_KEY) === '1'; }
    catch(e){ return false; }
}
function _markCombatTutorialDone(){
    try { localStorage.setItem(COMBAT_TUTORIAL_KEY, '1'); } catch(e) {}
}

function _beginCombatTutorial(){
    G.combat.tutorial = {
        step: 0,
        flash: 0,        // frame counter for "step complete" flash
        finishedAt: 0,   // when set, total complete celebration timer
        moveHeldFrames: 0,
        sprintHeldFrames: 0,
    };
}

// Returns the active step object, or null if tutorial isn't running.
function _combatTutorialActive(){
    if (!G.combat || !G.combat.tutorial) return null;
    const t = G.combat.tutorial;
    if (t.finishedAt) return null;
    return COMBAT_TUTORIAL_STEPS[t.step] || null;
}

// Called by the combat update each frame to detect progress.
function _updateCombatTutorial(){
    if (!G.combat || !G.combat.tutorial) return;
    const t = G.combat.tutorial;
    if (t.flash > 0) t.flash--;
    if (t.finishedAt){
        t.finishedAt++;
        if (t.finishedAt > 220) G.combat.tutorial = null; // remove panel
        return;
    }
    const cur = COMBAT_TUTORIAL_STEPS[t.step];
    if (!cur) return;
    const h = G.holo; if (!h) return;
    let done = false;
    switch(cur.id){
        case 'move':
            if (_holoLeftHeld() || _holoRightHeld()) t.moveHeldFrames++;
            if (t.moveHeldFrames > 25) done = true;
            break;
        case 'jump':
            if (h.jumping || (!h.grounded && h.vy < -1)) done = true;
            break;
        case 'dash':
            if (h.dashing || h.dashCooldown > 0) done = true;
            break;
        case 'sprint':
            // Only count sprint frames AFTER any active dash ends, so the
            // dash burst doesn't auto-complete this step.
            if (h.sprinting && !h.dashing) t.sprintHeldFrames++;
            if (t.sprintHeldFrames > 20) done = true;
            break;
        case 'strike':
            if (h.slash && h.slash.dir === 'side') done = true;
            break;
        case 'upper':
            if (h.slash && h.slash.dir === 'up') done = true;
            break;
        case 'pogo':
            if (h.slash && h.slash.dir === 'down') done = true;
            break;
        case 'kill':
            for (const d of G.combat.dummies){
                if (d.dying || (d.respawnTimer > 0)){ done = true; break; }
            }
            break;
        case 'exit':
            // This is the final step — auto-complete after ~6 seconds so the
            // player isn't blocked if they don't immediately want to leave.
            t.exitTimer = (t.exitTimer||0) + 1;
            if (t.exitTimer > 60*6) done = true;
            break;
    }
    if (done){
        t.flash = 40;
        t.step++;
        // Reset per-step counters
        t.moveHeldFrames = 0;
        t.sprintHeldFrames = 0;
        if (t.step >= COMBAT_TUTORIAL_STEPS.length){
            t.finishedAt = 1;
            _markCombatTutorialDone();
        }
        try { Sound.ui(); } catch(e) {}
    }
}

// Draws the tutorial panel at the top center. Screen-space.
function _drawCombatTutorial(){
    if (!G.combat || !G.combat.tutorial) return;
    const t = G.combat.tutorial;
    const T = performance.now();
    // Finished panel
    if (t.finishedAt){
        const a = t.finishedAt < 30 ? t.finishedAt/30 : (t.finishedAt > 180 ? Math.max(0, (220-t.finishedAt)/40) : 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        _roundRect(W/2-220, 50, 440, 64, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(255,216,74,0.9)';
        ctx.lineWidth = 1.5;
        _roundRect(W/2-220, 50, 440, 64, 10); ctx.stroke();
        ctx.fillStyle = '#ffd84a';
        ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 14;
        ctx.font = 'bold 22px Courier New, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▶ COMBAT TUTORIAL COMPLETE', W/2, 80);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff8c0';
        ctx.font = '12px Courier New, monospace';
        ctx.fillText('You\'re good to go.', W/2, 102);
        ctx.restore();
        return;
    }
    const cur = COMBAT_TUTORIAL_STEPS[t.step];
    if (!cur) return;
    const flash = t.flash > 0 ? (t.flash/40) : 0;
    const pulse = 0.85 + 0.15*Math.sin(T/220);
    ctx.save();
    // Panel background
    const pw = 540, ph = 92;
    const px = W/2 - pw/2, py = 36;
    ctx.fillStyle = 'rgba(2,6,18,0.78)';
    _roundRect(px, py, pw, ph, 12); ctx.fill();
    ctx.strokeStyle = flash ? `rgba(255,216,74,${flash})` : `rgba(92,246,255,${pulse.toFixed(2)})`;
    ctx.lineWidth = 1.5;
    _roundRect(px, py, pw, ph, 12); ctx.stroke();
    // Step counter
    ctx.fillStyle = '#5cf6ff';
    ctx.font = '11px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TUTORIAL  ' + (t.step+1) + ' / ' + COMBAT_TUTORIAL_STEPS.length, px+16, py+18);
    // Prompt
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#5cf6ff'; ctx.shadowBlur = 10;
    ctx.font = 'bold 20px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(cur.text, W/2, py+50);
    ctx.shadowBlur = 0;
    // Hint
    ctx.fillStyle = '#aef9ff';
    ctx.font = '11px Courier New, monospace';
    ctx.fillText(cur.hint, W/2, py+74);
    // Step pip strip
    const pipsY = py + ph - 6;
    for (let i=0; i<COMBAT_TUTORIAL_STEPS.length; i++){
        const cx = W/2 - (COMBAT_TUTORIAL_STEPS.length-1)*7 + i*14;
        ctx.beginPath();
        ctx.arc(cx, pipsY, 3, 0, Math.PI*2);
        ctx.fillStyle = i < t.step ? '#5cf6ff' : (i === t.step ? '#ffffff' : 'rgba(92,246,255,0.25)');
        ctx.fill();
    }
    // "Step complete" flash burst
    if (flash > 0){
        ctx.globalAlpha = flash;
        ctx.fillStyle = '#ffd84a';
        ctx.font = 'bold 12px Courier New, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✓  STEP COMPLETE', W/2, py - 8);
    }
    ctx.restore();
}

// ---- Input helpers ----
function _holoLeftHeld(){ return !!(keys['ArrowLeft']); }
function _holoRightHeld(){ return !!(keys['ArrowRight']); }
function _holoUpHeld(){ return !!(keys['ArrowUp']); }
function _holoDownHeld(){ return !!(keys['ArrowDown']); }
function _holoSprintHeld(){ return !!(keys['KeyC']); }
function _holoJumpHeld(){ return !!(keys['KeyZ']); }

// Key down — called from engine's keydown when in combat
function combatKeyDown(e){
    if (!G.holo || !G.combat) return false;
    if (G.paused) return false;
    if (e.code === 'KeyZ' && !e.repeat) {
        G.holo.jumpBuffer = COMBAT.JUMP_BUFFER_FRAMES;
        return true;
    }
    if (e.code === 'KeyX' && !e.repeat) {
        _holoTryAttack();
        return true;
    }
    if (e.code === 'KeyC' && !e.repeat) {
        _holoTryDash();
        return true;
    }
    if (e.code === 'KeyB' && !e.repeat) {
        if (typeof _summonPlaygroundBot === 'function') _summonPlaygroundBot();
        return true;
    }
    return false;
}
function combatKeyUp(e){
    if (!G.holo) return false;
    if (e.code === 'KeyZ') {
        // Cut the jump short if released early — gives variable jump height
        if (G.holo.vy < 0) G.holo.vy *= 0.55;
        G.holo.jumpHoldFrames = 0;
        return true;
    }
    return false;
}

// ---- Attacks ----
function _holoTryAttack(){
    const h = G.holo;
    if (h.attackCooldown > 0 || h.attackTimer > 0) return;
    let dir = 'side';
    if (_holoUpHeld()) dir = 'up';
    else if (_holoDownHeld() && !h.grounded) dir = 'down'; // pogo only mid-air
    h.attackDir = dir;
    h.attackTimer = COMBAT.ATTACK_DURATION;
    h.attackCooldown = COMBAT.ATTACK_COOLDOWN;
    h.attackHit = false;
    // Open the parry window — any bot melee or projectile that connects in
    // the next PARRY_WINDOW frames is reflected instead of dealing damage.
    h.parryWindow = COMBAT.PARRY_WINDOW;
    h.animState = 'attack';
    h.animTimer = 0;
    // Build slash arc — purely visual
    h.slash = _buildSlashArc(dir, h.facing);
    try { Sound.ui(); } catch(e) {}
}

// Tap C → instant dash burst. Hold C past the dash to keep sprinting after it ends.
function _holoTryDash(){
    const h = G.holo;
    if (h.dashing || h.dashCooldown > 0) return;
    // Dash in the direction the player is actively pushing, else facing
    let dir = h.facing;
    if (_holoLeftHeld() && !_holoRightHeld()) dir = -1;
    else if (_holoRightHeld() && !_holoLeftHeld()) dir = 1;
    h.facing = dir;
    h.dashing = true;
    h.dashTimer = COMBAT.DASH_FRAMES;
    h.dashCooldown = COMBAT.DASH_COOLDOWN;
    h.dashDir = dir;
    h.vx = dir * COMBAT.DASH_SPEED;
    h.vy = 0;                            // gravity is suspended during the dash
    h.invuln = Math.max(h.invuln, COMBAT.DASH_IFRAMES);
    h.animState = 'sprint';              // reuse sprint pose for dash
    h.animTimer = 0;
    _spawnDashBurst(h);
    try { Sound.ui(); } catch(e) {}
}

// Visual burst when the dash fires — code glyphs streaming away from the start
// point, plus a quick puff of dust at the feet.
function _spawnDashBurst(h){
    const Z = G.combat; if (!Z) return;
    const startX = h.x - h.dashDir * 4;
    for (let i=0; i<16; i++){
        const spread = (Math.random()-0.5)*0.7;
        const spd = 1.5 + Math.random()*3.5;
        Z.fx.push({
            type:'char',
            x: startX + (Math.random()-0.5)*8,
            y: h.y - h.h*0.5 + (Math.random()-0.5)*h.h*0.7,
            vx: -h.dashDir * spd + (Math.random()-0.5)*0.6,
            vy: spread - 0.5,
            life: 26 + Math.floor(Math.random()*8),
            max: 26,
            rot: 0, spin: (Math.random()-0.5)*0.15,
            text: _randGlyph(),
            color: i%4===0 ? '#ffffff' : '#5cf6ff',
            size: 11 + Math.floor(Math.random()*3),
            rise: false,
        });
    }
    _spawnDustPuff(h.x, h.y, 1);
    // Quick shockwave ring on the floor
    Z.fx.push({
        type:'ring',
        x: h.x, y: h.y - 2,
        r: 4, rMax: 36,
        life: 14, max: 14,
        color: '#aef9ff',
    });
}

function _buildSlashArc(dir, facing){
    if (dir === 'up') {
        return { t:0, life:COMBAT.ATTACK_DURATION, dir, reach:COMBAT.UP_ATTACK_REACH,
            cx: 0, cy: -10, a0:-Math.PI*0.85, a1:-Math.PI*0.15, facing };
    }
    if (dir === 'down') {
        return { t:0, life:COMBAT.ATTACK_DURATION, dir, reach:COMBAT.POGO_REACH,
            cx: 0, cy: 10, a0: Math.PI*0.15, a1: Math.PI*0.85, facing };
    }
    // side
    const base = facing>=0 ? 0 : Math.PI;
    return { t:0, life:COMBAT.ATTACK_DURATION, dir, reach:COMBAT.ATTACK_REACH,
        cx: 0, cy: -COMBAT.SPRITE_H/2, a0: base - Math.PI*0.45, a1: base + Math.PI*0.45, facing };
}

// ---- Update ----
function updateCombat(){
    if (!G.combat || !G.holo) return;
    const Z = G.combat;
    Z.elapsed++;
    if (Z.banner.t < Z.banner.life) Z.banner.t++;

    _updateHoloPhysics();
    _updateHoloAttack();
    _updateDummies();
    if (typeof _updateBots === 'function') _updateBots();
    if (typeof _updateBotProjectiles === 'function') _updateBotProjectiles();
    _updateCombatFx();
    _updateCombatCamera();
    _updateCombatTutorial();
    _checkCombatExit();
}

function _updateHoloPhysics(){
    const h = G.holo;
    const Z = G.combat;

    // Tick timers that exist regardless of dash state
    if (h.dashCooldown > 0) h.dashCooldown--;
    if (h.invuln > 0) h.invuln--;

    // --- DASH OVERRIDE ---
    // While dashing we lock horizontal velocity, suspend gravity, ignore input,
    // and spawn a denser afterimage trail. Sprint state is disabled until the
    // dash ends, so the player can flow tap-C → dash → hold-C → sprint cleanly.
    if (h.dashing){
        h.sprinting = false;
        h.vx = h.dashDir * COMBAT.DASH_SPEED;
        h.vy = 0;
        h.dashTimer--;
        // Dense ghost trail samples — pure visual feedback
        h.trail.push({ x:h.x, y:h.y, facing:h.facing, life:14, max:14 });
        if (h.trail.length > 14) h.trail.shift();
        if (h.dashTimer <= 0){
            h.dashing = false;
            // Preserve momentum: vx is left at the dash speed; the next-frame
            // cap will clamp it down to MAX_SPRINT or MAX_RUN.
        }
    } else {
        // Horizontal input. Sprint is sticky across jumps so a running leap keeps its
        // momentum — without that the cap would slam vx back down to MAX_RUN mid-air.
        const left = _holoLeftHeld(), right = _holoRightHeld();
        h.sprinting = _holoSprintHeld() && (left || right);
        let accel = COMBAT.MOVE_ACCEL;
        if (h.sprinting && h.grounded) accel *= COMBAT.SPRINT_ACCEL_MULT;
        if (!h.grounded) accel *= 0.55;
        if (left && !right) {
            h.vx -= accel;
            h.facing = -1;
        } else if (right && !left) {
            h.vx += accel;
            h.facing = 1;
        }
    }
    const maxV = h.sprinting ? COMBAT.MAX_SPRINT : COMBAT.MAX_RUN;
    if (!h.dashing){
        if (h.vx >  maxV) h.vx =  maxV;
        if (h.vx < -maxV) h.vx = -maxV;
    }

    // Gravity (suspended during dash above)
    if (!h.dashing){
        h.vy += COMBAT.GRAVITY;
        if (h.vy > 18) h.vy = 18; // terminal velocity
    }

    // Coyote + buffered jump
    if (h.grounded) h.coyote = COMBAT.COYOTE_FRAMES;
    else if (h.coyote > 0) h.coyote--;
    if (h.jumpBuffer > 0) h.jumpBuffer--;

    if (h.jumpBuffer > 0 && (h.grounded || h.coyote > 0)) {
        // Sprinting jumps go higher — both stronger initial velocity and a few
        // extra hold-boost frames for variable-height control.
        const sprintJump = h.sprinting;
        h.vy = sprintJump ? COMBAT.JUMP_V * 1.18 : COMBAT.JUMP_V;
        h.grounded = false;
        h.jumping = true;
        h.jumpHoldFrames = sprintJump ? COMBAT.JUMP_HOLD_FRAMES + 3 : COMBAT.JUMP_HOLD_FRAMES;
        h.coyote = 0;
        h.jumpBuffer = 0;
        h.animState = 'jump';
        h.animTimer = 0;
        _spawnDustPuff(h.x, h.y, -1);
        try { Sound.ui(); } catch(e) {}
    }
    if (h.jumpHoldFrames > 0 && _holoJumpHeld()) {
        h.vy += COMBAT.JUMP_HOLD_BOOST;
        h.jumpHoldFrames--;
    } else {
        h.jumpHoldFrames = 0;
    }

    // Move with simple AABB resolution against platforms
    const wasGrounded = h.grounded;
    _moveAndCollide(h, Z.platforms);

    // Friction
    if (h.grounded) h.vx *= COMBAT.FRICTION_GROUND;
    else h.vx *= COMBAT.FRICTION_AIR;
    if (Math.abs(h.vx) < 0.05) h.vx = 0;

    // Landing
    if (!wasGrounded && h.grounded) {
        h.landSquash = 1;
        h.jumping = false;
        h.animState = 'land';
        h.animTimer = 0;
        if (Math.abs(h.vy) > 4 || Math.abs(h.prevVy||0) > 4) _spawnDustPuff(h.x, h.y, 1);
    }
    h.prevVy = h.vy;

    // Animation state selection (overridden by attack timer)
    if (h.attackTimer <= 0) {
        if (!h.grounded) {
            h.animState = (h.vy < 0) ? 'jump' : 'fall';
        } else if (Math.abs(h.vx) > 0.4) {
            h.animState = h.sprinting ? 'sprint' : 'run';
        } else if (h.landSquash > 0) {
            h.animState = 'land';
        } else {
            h.animState = 'idle';
        }
    }
    h.animTimer++;
    if (h.landSquash > 0) h.landSquash -= 0.12;
    h.flicker = (h.flicker + 1) % 7;

    // Trail samples while sprinting / dashing
    if (h.sprinting || Math.abs(h.vx) > COMBAT.MAX_RUN-0.5) {
        h.trail.push({ x:h.x, y:h.y, facing:h.facing, life:14, max:14 });
        if (h.trail.length > 8) h.trail.shift();
    }
    for (let i=h.trail.length-1; i>=0; i--){
        h.trail[i].life--;
        if (h.trail[i].life<=0) h.trail.splice(i,1);
    }

    // Clamp to world horizontally (walls also block but this is a safety net)
    if (h.x < 40+h.w/2) { h.x = 40+h.w/2; if (h.vx<0) h.vx=0; }
    if (h.x > Z.worldW-40-h.w/2) { h.x = Z.worldW-40-h.w/2; if (h.vx>0) h.vx=0; }
    if (h.y > Z.worldH+200) { // fell out — respawn
        h.x = 240; h.y = 1180; h.vx=0; h.vy=0;
    }
}

// Simple per-axis AABB resolution against the platform list. The hologram's
// position is at its FEET, so its hitbox is [x-w/2, y-h, x+w/2, y].
function _moveAndCollide(h, platforms){
    h.grounded = false;
    // X
    h.x += h.vx;
    const hbX = _holoBox(h);
    for (const p of platforms){
        if (!_rectsOverlap(hbX, p)) continue;
        if (h.vx > 0) h.x = p.x - h.w/2 - 0.01;
        else if (h.vx < 0) h.x = p.x + p.w + h.w/2 + 0.01;
        h.vx = 0;
    }
    // Y
    h.y += h.vy;
    const hbY = _holoBox(h);
    for (const p of platforms){
        if (!_rectsOverlap(hbY, p)) continue;
        if (h.vy > 0) { // landing on top
            h.y = p.y - 0.01;
            h.vy = 0;
            h.grounded = true;
        } else if (h.vy < 0) {
            h.y = p.y + p.h + h.h + 0.01;
            h.vy = 0;
        }
    }
}
function _holoBox(h){ return { x: h.x - h.w/2, y: h.y - h.h, w: h.w, h: h.h }; }
function _rectsOverlap(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }

function _updateHoloAttack(){
    const h = G.holo;
    if (h.attackCooldown > 0) h.attackCooldown--;
    if (h.attackTimer > 0) h.attackTimer--;
    if (h.parryWindow > 0) h.parryWindow--;
    if (h.parryFlash > 0) h.parryFlash--;
    if (h.slash) {
        h.slash.t++;
        if (h.slash.t >= h.slash.life) h.slash = null;
    }

    // Hitbox is active during the first half of the attack
    if (h.attackTimer > 0 && !h.attackHit && h.attackTimer >= COMBAT.ATTACK_DURATION - 8) {
        const box = _attackHitbox(h);
        if (box) _resolveAttackHits(box);
    }
}
function _attackHitbox(h){
    if (h.attackDir === 'up') {
        return {
            x: h.x - COMBAT.UP_ATTACK_REACH/2,
            y: h.y - h.h - COMBAT.UP_ATTACK_REACH,
            w: COMBAT.UP_ATTACK_REACH,
            h: COMBAT.UP_ATTACK_REACH,
            dir: 'up',
        };
    }
    if (h.attackDir === 'down') {
        return {
            x: h.x - COMBAT.POGO_REACH/2,
            y: h.y,
            w: COMBAT.POGO_REACH,
            h: COMBAT.POGO_REACH,
            dir: 'down',
        };
    }
    // side
    const fx = h.facing >= 0 ? h.x : h.x - COMBAT.ATTACK_REACH;
    return {
        x: fx,
        y: h.y - h.h - 2,
        w: COMBAT.ATTACK_REACH,
        h: COMBAT.ATTACK_HEIGHT,
        dir: 'side',
        facing: h.facing,
    };
}
function _resolveAttackHits(box){
    const h = G.holo;
    const Z = G.combat;
    for (const d of Z.dummies){
        if (d.respawnTimer > 0) continue;
        const dbx = { x: d.x - d.w/2, y: d.y - d.h, w: d.w, h: d.h };
        if (!_rectsOverlap(box, dbx)) continue;
        // Connected!
        h.attackHit = true;
        _onDummyHit(d, box);
        // Pogo: bounce player upward
        if (box.dir === 'down') {
            h.vy = COMBAT.POGO_BOUNCE_V;
            h.jumping = true;
            h.grounded = false;
            h.animState = 'jump';
            h.animTimer = 0;
        }
        // Sound + screen shake
        try { Sound.explode && Sound.explode(); } catch(e){}
        if (typeof shake === 'function') shake(4, 6);
        return;
    }
    // Also check bots — same hit semantics, separate damage path
    if (Z.bots){
        for (const b of Z.bots){
            if (b.dying) continue;
            const bbx = { x: b.x - b.w/2, y: b.y - b.h, w: b.w, h: b.h };
            if (!_rectsOverlap(box, bbx)) continue;
            h.attackHit = true;
            if (typeof _onBotHit === 'function') _onBotHit(b, box);
            // Pogo bounce on down-strike
            if (box.dir === 'down') {
                h.vy = COMBAT.POGO_BOUNCE_V;
                h.jumping = true;
                h.grounded = false;
                h.animState = 'jump';
                h.animTimer = 0;
            }
            try { Sound.explode && Sound.explode(); } catch(e){}
            if (typeof shake === 'function') shake(4, 6);
            return;
        }
    }
}

function _onDummyHit(d, box){
    const dmg = 8 + Math.floor(Math.random()*6);
    d.hp = Math.max(0, d.hp - dmg);
    d.hitFlash = 14;
    // Knockback only on side hits
    if (box.dir === 'side') {
        d.leanVel += (box.facing||1) * 0.35;
        d.vx = (box.facing||1) * 2.6;
        d.lastHitDir = box.facing||1;
    } else if (box.dir === 'up') {
        d.vy = -3.2;
        d.lastHitDir = G.holo.facing;
    } else {
        d.lastHitDir = G.holo.facing;
    }
    // Damage popup
    G.combat.popups.push({
        x: d.x + (Math.random()-0.5)*16,
        y: d.y - d.h - 4,
        vy: -1.6,
        life: 40, max: 40,
        text: '-'+dmg,
        color: box.dir==='down' ? '#ffd84a' : (box.dir==='up' ? '#ff8e3c' : '#5cf6ff'),
        scaleIn: 1.0,
    });
    const hitColor = box.dir==='down' ? '#ffd84a' : (box.dir==='up' ? '#ff8e3c' : '#5cf6ff');
    // Hit shockwave ring
    G.combat.fx.push({
        type:'ring',
        x: d.x + (Math.random()-0.5)*8,
        y: d.y - d.h*0.55,
        r: 4, rMax: 38,
        life: 14, max: 14,
        color: hitColor,
    });
    // Code-shard particles — small glyphs flung outward from the hit point
    for (let i=0; i<14; i++){
        const ang = Math.random()*Math.PI*2;
        const spd = 2 + Math.random()*5;
        G.combat.fx.push({
            type:'char',
            x: d.x + (Math.random()-0.5)*d.w*0.6,
            y: d.y - d.h*0.55 + (Math.random()-0.5)*d.h*0.5,
            vx: Math.cos(ang)*spd,
            vy: Math.sin(ang)*spd - 1.2,
            life: 26 + Math.floor(Math.random()*12),
            max:  26,
            rot: (Math.random()-0.5)*0.4,
            spin: (Math.random()-0.5)*0.25,
            text: _randGlyph(),
            color: i<3 ? '#ffffff' : hitColor,
            size: 10 + Math.floor(Math.random()*4),
        });
    }
    // A few glitch slices that whip across the dummy
    for (let i=0; i<3; i++){
        G.combat.fx.push({
            type:'glitch',
            x: d.x - d.w,
            y: d.y - d.h*0.2 - Math.random()*d.h*0.7,
            w: d.w*2 + Math.random()*30,
            offset: (Math.random()-0.5)*22,
            life: 8 + Math.floor(Math.random()*5),
            max: 12,
            color: hitColor,
        });
    }
    // Down dummy → start the "removed from reality" sequence
    if (d.hp <= 0 && !d.dying) {
        _beginDereal(d);
    }
}

// Kick off the multi-phase deletion animation on a dummy.
function _beginDereal(d){
    d.dying = true;
    d.dyingTimer = 0;
    d.dyingLife = 78;          // total length of the death animation
    d.respawnTimer = 0;         // gated separately after the death animation
    d.vx = 0; d.vy = 0; d.lean = 0; d.leanVel = 0;
    // Pre-compute 8 horizontal slices that will scatter — each carries a piece
    // of the dummy silhouette and drifts outward.
    d.slices = [];
    const SL = 9;
    for (let i=0; i<SL; i++){
        d.slices.push({
            yFrac: i/SL,
            hFrac: 1/SL,
            vx: (Math.random()-0.5)*1.4,
            vy: -0.6 + Math.random()*1.6,
            rot: (Math.random()-0.5)*0.2,
            spin: (Math.random()-0.5)*0.04,
            offset: 0,
            life: 1.0,
        });
    }
    // Burst of code chars erupting from the dummy
    for (let i=0; i<28; i++){
        const ang = -Math.PI/2 + (Math.random()-0.5)*Math.PI*1.4;
        const spd = 1.5 + Math.random()*5;
        G.combat.fx.push({
            type:'char',
            x: d.x + (Math.random()-0.5)*d.w*0.8,
            y: d.y - d.h*0.4 + (Math.random()-0.5)*d.h*0.7,
            vx: Math.cos(ang)*spd,
            vy: Math.sin(ang)*spd - 0.5,
            life: 50 + Math.floor(Math.random()*22),
            max: 50,
            rot: 0, spin: (Math.random()-0.5)*0.18,
            text: _randGlyph(),
            color: i%4===0 ? '#ffffff' : (i%3===0 ? '#ffd84a' : '#5cf6ff'),
            size: 11 + Math.floor(Math.random()*5),
            rise: true,    // these float upward as they fade
        });
    }
    // A few ERROR_TAG tokens that float up like null pointer leaks
    for (let i=0; i<2; i++){
        const tag = ERROR_TAGS[Math.floor(Math.random()*ERROR_TAGS.length)];
        G.combat.fx.push({
            type:'errortag',
            x: d.x + (Math.random()-0.5)*40,
            y: d.y - d.h*0.5 + (Math.random()-0.5)*30,
            vy: -0.6 - Math.random()*0.6,
            life: 70, max: 70,
            text: tag,
            color: i===0 ? '#ff5a3c' : '#ffd84a',
        });
    }
    // Reality crack — a vertical tear that opens at the dummy and closes
    G.combat.fx.push({
        type:'tear',
        x: d.x,
        y: d.y - d.h*0.5,
        h: d.h*1.4,
        life: 60, max: 60,
        wMax: 18 + Math.random()*8,
    });
    // Floor splash ring
    G.combat.fx.push({
        type:'ring',
        x: d.x, y: d.y - 2,
        r: 6, rMax: 90,
        life: 26, max: 26,
        color: '#5cf6ff',
    });
    // Screen-space chromatic glitch flash
    G.combat.glitch = 14;
    if (typeof shake === 'function') shake(6, 14);
    try { Sound.explode && Sound.explode(); } catch(e){}
    G.combat.popups.push({
        x: d.x, y: d.y - d.h - 14, vy:-1.2, life:70, max:70,
        text:'DELETED', color:'#ff5a3c',
    });
}

function _updateDummies(){
    const Z = G.combat;
    for (const d of Z.dummies){
        d.bobPhase += 0.04;
        // --- DYING / DEREAL state ---
        if (d.dying){
            d.dyingTimer++;
            // Trickle of code chars rising for the duration
            if (d.dyingTimer < d.dyingLife - 14 && d.dyingTimer % 3 === 0){
                Z.fx.push({
                    type:'char',
                    x: d.x + (Math.random()-0.5)*d.w,
                    y: d.y - d.h*0.4 + (Math.random()-0.5)*d.h*0.7,
                    vx: (Math.random()-0.5)*0.6,
                    vy: -0.4 - Math.random()*0.9,
                    life: 32, max: 32,
                    rot: 0, spin: (Math.random()-0.5)*0.05,
                    text: _randGlyph(),
                    color: Math.random()<0.5 ? '#5cf6ff' : '#aef9ff',
                    size: 10,
                    rise: true,
                });
            }
            // Update slice physics
            for (const s of d.slices){
                s.offset += s.vx;
                s.vy += 0.06;
                s.rot += s.spin;
                s.life -= 1/d.dyingLife;
            }
            if (d.dyingTimer >= d.dyingLife){
                d.dying = false;
                d.respawnTimer = 90;  // delete-then-rebuild grace period
                d.hp = 0;
            }
            continue;
        }
        if (d.respawnTimer > 0){
            d.respawnTimer--;
            if (d.respawnTimer <= 0){
                d.hp = d.maxHp;
                d.x = d.baseX;
                d.y = d.baseY;
                d.vx = 0; d.vy = 0;
                d.lean = 0; d.leanVel = 0;
                d.hitFlash = 0;
                d.dying = false; d.slices = null; d.dyingTimer = 0;
                // Respawn flash particles
                for (let i=0; i<10; i++){
                    Z.fx.push({
                        type:'char',
                        x: d.baseX + (Math.random()-0.5)*d.w,
                        y: d.baseY - d.h*0.5 + (Math.random()-0.5)*d.h,
                        vx: (Math.random()-0.5)*1.4,
                        vy: -0.4 - Math.random()*0.6,
                        life: 22, max: 22,
                        rot: 0, spin: 0,
                        text: _randGlyph(),
                        color: '#5cf6ff',
                        size: 10,
                    });
                }
            }
            continue;
        }
        // Apply gravity / knockback velocities
        d.vy += 0.4;
        d.x += d.vx;
        d.y += d.vy;
        // Land back on base Y (dummies are pinned to their base height)
        if (d.y >= d.baseY) { d.y = d.baseY; d.vy = 0; d.grounded = true; }
        // Drift back toward base X
        const dx = d.baseX - d.x;
        d.vx += dx * 0.012;
        d.vx *= 0.86;
        // Lean springs back to upright
        d.leanVel -= d.lean * 0.06;
        d.leanVel *= 0.86;
        d.lean += d.leanVel;
        if (Math.abs(d.lean) > 0.6) d.lean = 0.6 * Math.sign(d.lean);
        if (d.hitFlash > 0) d.hitFlash--;
    }
}

function _updateCombatFx(){
    const Z = G.combat;
    if (Z.glitch > 0) Z.glitch--;
    // Code rain columns (screen-space)
    for (const r of Z.codeRain){
        r.y += r.vy;
        r.cycle++;
        if (r.cycle > 6 + (r.col%4)){
            r.cycle = 0;
            // Rotate one char in
            r.chars.push(_randGlyph());
            r.chars.shift();
        }
        if (r.y > H + 200){
            r.y = -200 - Math.random()*200;
            r.x = Math.random()*Math.max(W, 1400);
            r.vy = 0.6 + Math.random()*1.6;
        }
    }
    for (let i=Z.popups.length-1; i>=0; i--){
        const p = Z.popups[i];
        p.y += p.vy; p.vy *= 0.94;
        if (p.scaleIn !== undefined && p.scaleIn < 1.4) p.scaleIn += 0.08;
        p.life--;
        if (p.life <= 0) Z.popups.splice(i,1);
    }
    for (let i=Z.fx.length-1; i>=0; i--){
        const f = Z.fx[i];
        if (f.type === 'ring'){
            f.r += (f.rMax - f.r) * 0.22;
            f.life--;
        } else if (f.type === 'glitch'){
            f.life--;
        } else if (f.type === 'tear'){
            f.life--;
        } else if (f.type === 'errortag'){
            f.y += f.vy;
            f.vy *= 0.97;
            f.life--;
        } else if (f.type === 'char'){
            f.x += f.vx; f.y += f.vy;
            if (f.rise){
                f.vy *= 0.97;
                f.vy -= 0.025;
            } else {
                f.vy += 0.16;
            }
            f.vx *= 0.97;
            f.rot += f.spin || 0;
            f.life--;
        } else {
            f.x += f.vx; f.y += f.vy;
            f.vy += 0.18; // light gravity
            f.vx *= 0.96;
            f.life--;
        }
        if (f.life <= 0) Z.fx.splice(i,1);
    }
}

function _spawnDustPuff(x, y, dir){
    const Z = G.combat; if (!Z) return;
    for (let i=0; i<6; i++){
        Z.fx.push({
            type:'dust',
            x: x + (Math.random()-0.5)*16,
            y: y - 2,
            vx: (Math.random()-0.5)*1.6,
            vy: dir<0 ? Math.random()*0.4 : -Math.random()*1.5,
            life: 18, max: 18,
            color: 'rgba(180,220,255,0.55)',
        });
    }
}

function _updateCombatCamera(){
    const Z = G.combat;
    const h = G.holo;
    // Target the player but lookahead in facing direction
    const tx = h.x + h.facing * COMBAT.CAM_LOOKAHEAD - W/2;
    const ty = h.y - H*0.65;
    Z.cam.x += (tx - Z.cam.x) * COMBAT.CAM_LERP;
    Z.cam.y += (ty - Z.cam.y) * COMBAT.CAM_LERP;
    // Clamp to world
    if (Z.cam.x < 0) Z.cam.x = 0;
    if (Z.cam.x > Z.worldW - W) Z.cam.x = Z.worldW - W;
    if (Z.cam.y < 0) Z.cam.y = 0;
    if (Z.cam.y > Z.worldH - H) Z.cam.y = Z.worldH - H;
}

// ============================================================
//  RENDERING
// ============================================================
function drawCombat(){
    if (!G.combat || !G.holo) return;
    const Z = G.combat;
    const h = G.holo;
    const T = performance.now();

    // Background — deep arena. Drawn in screen space.
    _drawCombatBackground(T);

    ctx.save();
    ctx.translate(-Z.cam.x, -Z.cam.y);

    // Floor grid (world space)
    _drawArenaGrid(T, Z);

    // Platforms
    _drawPlatforms(Z);

    // Exit portal
    _drawExitPortal(Z);

    // Training dummies
    for (const d of Z.dummies) _drawDummy(d, T);

    // AI bots — drawn before FX so hit sparks read on top of them
    if (typeof _drawBots === 'function') _drawBots(T);

    // Bot projectiles
    if (typeof _drawBotProjectiles === 'function') _drawBotProjectiles(Z);

    // FX particles (sparks, dust) — beneath player so hits feel snappy
    _drawCombatFx(Z);

    // Hologram trail
    _drawHoloTrail(h);

    // Hologram player
    _drawHologram(h, T);

    // Slash arc
    if (h.slash) _drawSlash(h, h.slash, T);

    // Damage popups
    _drawDamagePopups(Z);

    ctx.restore();

    // Screen-space glitch overlay — pulses briefly when something dies
    if (Z.glitch > 0) _drawGlitchOverlay(Z.glitch, T);

    // HUD overlay (screen space)
    _drawCombatHUD(Z, h, T);

    // Tutorial panel — drawn last so it sits above all combat visuals
    _drawCombatTutorial();
}

function _drawGlitchOverlay(level, T){
    const intensity = Math.min(1, level/14);
    // Random horizontal stripe displacements painted directly on the screen
    ctx.save();
    for (let i=0; i<6; i++){
        const stripeY = Math.random()*H;
        const stripeH = 6 + Math.random()*18;
        const off = (Math.random()-0.5) * 60 * intensity;
        // Sample from a region nearby — cheap fake by drawing colored bars
        const channel = i%3;
        const col = channel===0 ? 'rgba(255,40,80,0.16)'
                  : channel===1 ? 'rgba(40,255,160,0.14)'
                  :              'rgba(60,140,255,0.16)';
        ctx.fillStyle = col;
        ctx.globalAlpha = intensity;
        ctx.fillRect(off, stripeY, W, stripeH);
    }
    // Vignette flash
    const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.2, W/2, H/2, Math.max(W,H)*0.7);
    vig.addColorStop(0, 'rgba(255,40,80,0)');
    vig.addColorStop(1, 'rgba(255,40,80,'+(0.18*intensity).toFixed(2)+')');
    ctx.fillStyle = vig;
    ctx.globalAlpha = 1;
    ctx.fillRect(0,0,W,H);
    ctx.restore();
}

function _drawCombatBackground(T){
    // Vertical gradient — deeper teal-violet
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#020616');
    g.addColorStop(0.55, '#080f28');
    g.addColorStop(1, '#10052a');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // Far nebula glows — slow drifting orbs
    const cx = W*0.72 + Math.sin(T/4000)*40, cy = H*0.32 + Math.cos(T/5000)*22;
    const r = 320 + Math.sin(T/3000)*22;
    const rg = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    rg.addColorStop(0,'rgba(120,80,200,0.22)');
    rg.addColorStop(1,'transparent');
    ctx.fillStyle = rg; ctx.fillRect(0,0,W,H);
    const cx2 = W*0.22 + Math.cos(T/4500)*40, cy2 = H*0.65 + Math.sin(T/5500)*30;
    const rg2 = ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,260);
    rg2.addColorStop(0,'rgba(0,150,200,0.16)');
    rg2.addColorStop(1,'transparent');
    ctx.fillStyle = rg2; ctx.fillRect(0,0,W,H);

    // Background CODE RAIN — dim cyan glyph columns falling slowly. This is the
    // signature look of the combat zone: an arena rendered inside the matrix.
    const Z = G.combat;
    if (Z && Z.codeRain){
        ctx.font = '12px Courier New, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const r of Z.codeRain){
            const baseX = (r.x - Z.cam.x*0.15) % (W+200);
            const x = baseX < 0 ? baseX + W+200 : baseX;
            for (let i=0; i<r.chars.length; i++){
                const yy = r.y + i*14;
                if (yy < -20 || yy > H+20) continue;
                const head = i === r.chars.length-1;
                const a = r.alpha * (0.25 + (i/r.chars.length)*0.75);
                ctx.fillStyle = head ? `rgba(174,249,255,${(a+0.35).toFixed(2)})` : `rgba(92,246,255,${a.toFixed(2)})`;
                ctx.fillText(r.chars[i], x, yy);
            }
        }
    }

    // Soft horizontal scan-lines (very low alpha)
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#5cf6ff';
    for (let y=(T/40)%4; y<H; y+=4){ ctx.fillRect(0, y, W, 1); }
    ctx.globalAlpha = 1;
    // CRT-style vignette darkening at edges
    const vg = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);
}

function _drawArenaGrid(T, Z){
    // World-space grid that scrolls subtly to communicate the holographic feel.
    const step = 60;
    const cam = Z.cam;
    const x0 = Math.floor(cam.x/step)*step;
    const y0 = Math.floor(cam.y/step)*step;
    ctx.strokeStyle = 'rgba(40,140,200,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x=x0; x<cam.x+W+step; x+=step){
        ctx.moveTo(x, cam.y);
        ctx.lineTo(x, cam.y+H);
    }
    for (let y=y0; y<cam.y+H+step; y+=step){
        ctx.moveTo(cam.x, y);
        ctx.lineTo(cam.x+W, y);
    }
    ctx.stroke();
    // Subtle "wireframe horizon" line on the floor
    ctx.strokeStyle = 'rgba(92,246,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 1180);
    ctx.lineTo(Z.worldW, 1180);
    ctx.stroke();
}

function _drawPlatforms(Z){
    const T = performance.now();
    for (const p of Z.platforms){
        // Solid dark base
        const baseG = ctx.createLinearGradient(0, p.y, 0, p.y+p.h);
        baseG.addColorStop(0, '#0d172c');
        baseG.addColorStop(0.5, '#091022');
        baseG.addColorStop(1, '#050a18');
        ctx.fillStyle = baseG;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        // Top neon edge — animated brightness
        const flick = 0.85 + 0.15*Math.sin(T/180 + p.x*0.013);
        const grad = ctx.createLinearGradient(0, p.y, 0, p.y+10);
        grad.addColorStop(0, 'rgba(92,246,255,'+(flick).toFixed(2)+')');
        grad.addColorStop(1, 'rgba(92,246,255,0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, p.y, p.w, 10);
        // Bright 1px highlight stripe
        ctx.fillStyle = 'rgba(255,255,255,'+(0.6*flick).toFixed(2)+')';
        ctx.fillRect(p.x, p.y-1, p.w, 1);
        // Edge bevel rectangle
        ctx.strokeStyle = 'rgba(60,120,180,0.55)';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x+0.5, p.y+0.5, p.w-1, p.h-1);
        // Hex pattern overlay along the top (decorative)
        ctx.strokeStyle = 'rgba(92,246,255,0.12)';
        ctx.lineWidth = 1;
        const hexStep = 28;
        for (let x=p.x+10; x<p.x+p.w-10; x+=hexStep){
            ctx.beginPath();
            ctx.moveTo(x,    p.y+8);
            ctx.lineTo(x+8,  p.y+4);
            ctx.lineTo(x+16, p.y+8);
            ctx.lineTo(x+16, p.y+14);
            ctx.lineTo(x+8,  p.y+18);
            ctx.lineTo(x,    p.y+14);
            ctx.closePath();
            ctx.stroke();
        }
        // Underside struts (only on horizontal platforms that aren't walls)
        if (p.h < 80){
            ctx.strokeStyle = 'rgba(60,90,140,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x=p.x+8; x<p.x+p.w-8; x+=18){
                ctx.moveTo(x, p.y+p.h);
                ctx.lineTo(x+4, p.y+p.h+6);
            }
            ctx.stroke();
            // Cable hanging from underside
            ctx.strokeStyle = 'rgba(92,246,255,0.18)';
            ctx.beginPath();
            for (let x=p.x+24; x<p.x+p.w-24; x+=72){
                ctx.moveTo(x, p.y+p.h);
                ctx.lineTo(x + Math.sin(T/600 + x*0.01)*4, p.y+p.h+18);
            }
            ctx.stroke();
        }
        // Tick marks along bottom edge
        ctx.strokeStyle = 'rgba(92,246,255,0.18)';
        ctx.beginPath();
        for (let x=p.x; x<p.x+p.w; x+=24){
            ctx.moveTo(x, p.y+p.h-3);
            ctx.lineTo(x, p.y+p.h);
        }
        ctx.stroke();
    }
}

function _drawExitPortal(Z){
    const p = Z.exitPortal;
    const T = performance.now();
    ctx.save();
    ctx.translate(p.x + p.w/2, p.y + p.h);
    // Glow pillar
    const grd = ctx.createLinearGradient(0, -p.h, 0, 0);
    grd.addColorStop(0, 'rgba(255,216,74,0.0)');
    grd.addColorStop(1, 'rgba(255,216,74,0.55)');
    ctx.fillStyle = grd;
    ctx.fillRect(-p.w/2, -p.h, p.w, p.h);
    ctx.strokeStyle = 'rgba(255,216,74,0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-p.w/2, -p.h, p.w, p.h);
    // Pulsing band
    const bandY = -p.h*0.4 + Math.sin(T/300)*6;
    ctx.fillStyle = 'rgba(255,216,74,0.6)';
    ctx.fillRect(-p.w/2, bandY, p.w, 4);
    // Label
    ctx.fillStyle = '#ffd84a';
    ctx.font = 'bold 11px Courier New, monospace';
    ctx.textAlign='center';
    ctx.fillText('EXIT', 0, -p.h-8);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '9px Courier New, monospace';
    ctx.fillText('PRESS  ↑ + Z', 0, -p.h-22);
    ctx.restore();
}

function _drawDummy(d, T){
    // --- DYING / REMOVED FROM REALITY ---
    if (d.dying){
        _drawDummyDying(d, T);
        return;
    }
    if (d.respawnTimer > 0) {
        // Reforming animation — wireframe assembles from code chars.
        const a = 1 - d.respawnTimer/90;
        ctx.save();
        ctx.globalAlpha = a*0.7;
        ctx.strokeStyle = '#5cf6ff';
        ctx.shadowColor = '#5cf6ff';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.2;
        // Reconstructing wire box
        ctx.strokeRect(d.baseX-d.w/2, d.baseY-d.h, d.w, d.h);
        ctx.shadowBlur = 0;
        // Inner crossings
        ctx.globalAlpha = a*0.35;
        ctx.beginPath();
        ctx.moveTo(d.baseX-d.w/2, d.baseY-d.h);
        ctx.lineTo(d.baseX+d.w/2, d.baseY);
        ctx.moveTo(d.baseX+d.w/2, d.baseY-d.h);
        ctx.lineTo(d.baseX-d.w/2, d.baseY);
        ctx.stroke();
        // Scrolling text inside the box hinting at reconstruction
        ctx.globalAlpha = a*0.55;
        ctx.font = '10px Courier New, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#aef9ff';
        ctx.fillText('REBUILDING...', d.baseX, d.baseY - d.h - 4);
        ctx.restore();
        return;
    }
    ctx.save();
    const bob = Math.sin(d.bobPhase)*1.2;
    ctx.translate(d.x, d.y + bob);
    ctx.rotate(d.lean);
    // Wooden post base
    ctx.fillStyle = '#3a2814';
    ctx.fillRect(-4, 0, 8, 14);
    // Sandbag body — three sausage segments
    const segs = [
        { y:-22, w:d.w,     h:22, c:'#7d4a1c' },
        { y:-44, w:d.w-4,   h:22, c:'#8a521d' },
        { y:-d.h, w:d.w-8,  h:d.h-44, c:'#955a22' },
    ];
    for (const s of segs){
        ctx.fillStyle = s.c;
        _roundRect(-s.w/2, s.y, s.w, s.h, 6);
        ctx.fill();
        // Belt rings
        ctx.strokeStyle = 'rgba(20,10,5,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-s.w/2+2, s.y+s.h-2);
        ctx.lineTo(s.w/2-2, s.y+s.h-2);
        ctx.stroke();
    }
    // Stitching on top
    ctx.strokeStyle = 'rgba(40,20,10,0.7)';
    ctx.beginPath();
    for (let i=0;i<5;i++){
        const sx = -d.w/2 + 6 + i*((d.w-12)/4);
        ctx.moveTo(sx, -d.h);
        ctx.lineTo(sx, -d.h+3);
    }
    ctx.stroke();
    // Target reticle/face
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -d.h/2, 9, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -d.h/2, 5, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#c0322a';
    ctx.beginPath(); ctx.arc(0, -d.h/2, 2.5, 0, Math.PI*2); ctx.fill();
    // Hit flash overlay
    if (d.hitFlash > 0){
        const a = d.hitFlash/14;
        ctx.fillStyle = `rgba(255,255,255,${a*0.55})`;
        _roundRect(-d.w/2-2, -d.h-2, d.w+4, d.h+4, 8);
        ctx.fill();
    }
    ctx.restore();

    // HP bar above
    const barW = 44, barH = 5;
    const bx = d.x - barW/2, by = d.y - d.h - 18;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx-1, by-1, barW+2, barH+2);
    ctx.fillStyle = '#2a0a0a';
    ctx.fillRect(bx, by, barW, barH);
    const pct = d.hp/d.maxHp;
    ctx.fillStyle = pct>0.55 ? '#5cf6ff' : (pct>0.25 ? '#ffd84a' : '#ff5a3c');
    ctx.fillRect(bx, by, barW*pct, barH);
}

// Renders the dummy as it's deleted from reality: a brief glitch flash, then
// horizontal slices scatter apart while code chars bleed out, while a vertical
// void crack widens behind it. The whole thing fades to nothing.
function _drawDummyDying(d, T){
    const tt = d.dyingTimer / d.dyingLife;     // 0..1
    const fade = Math.max(0, 1 - tt*1.1);
    // Phase 1 (0..0.18): chromatic strobe — pre-shatter freeze
    const strobe = tt < 0.18 ? (1 - tt/0.18) : 0;
    if (strobe > 0){
        // Three offset silhouettes in RGB-ish channels to read as "channel split"
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i=0; i<3; i++){
            const off = (i-1) * 4 * strobe;
            ctx.globalAlpha = 0.55 * strobe;
            ctx.fillStyle = ['#ff3344','#33ff99','#3399ff'][i];
            _roundRect(d.x-d.w/2+off, d.y-d.h, d.w, d.h, 6);
            ctx.fill();
        }
        ctx.restore();
    }

    // Phase 2 (0.1+): slice scatter
    if (tt >= 0.1 && d.slices){
        for (const s of d.slices){
            if (s.life <= 0) continue;
            const sy = d.y - d.h + s.yFrac*d.h;
            const sh = s.hFrac * d.h + 1;
            const px = d.x + s.offset;
            const py = sy + s.vy*d.dyingTimer*0.25;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, s.life)) * fade;
            ctx.translate(px, py + sh/2);
            ctx.rotate(s.rot);
            // Body slice — sandbag-ish tan/brown gradient with neon edge
            const grd = ctx.createLinearGradient(0, -sh/2, 0, sh/2);
            grd.addColorStop(0, '#8a521d');
            grd.addColorStop(1, '#5a3415');
            ctx.fillStyle = grd;
            ctx.fillRect(-d.w/2, -sh/2, d.w, sh);
            // Bright cyan top edge — the cut
            ctx.fillStyle = 'rgba(174,249,255,0.9)';
            ctx.fillRect(-d.w/2, -sh/2 - 1, d.w, 2);
            // Cyan underline (lower cut)
            ctx.fillStyle = 'rgba(92,246,255,0.55)';
            ctx.fillRect(-d.w/2, sh/2 - 1, d.w, 2);
            // Glyphs leaking off the slice edges
            if (Math.random() < 0.4){
                ctx.font = '10px Courier New, monospace';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#aef9ff';
                ctx.fillText(_randGlyph(), (Math.random()-0.5)*d.w*0.6, -sh/2 - 4);
            }
            ctx.restore();
        }
    }

    // Phase 3 (0.55+): faint outline ghost shrinks
    if (tt > 0.55){
        const tail = (tt - 0.55) / 0.45;
        ctx.save();
        ctx.globalAlpha = (1 - tail) * 0.4;
        ctx.strokeStyle = '#5cf6ff';
        ctx.shadowColor = '#5cf6ff';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1;
        const shrink = tail * d.h * 0.4;
        ctx.strokeRect(d.x - d.w/2 + shrink*0.4, d.y - d.h + shrink, d.w - shrink*0.8, d.h - shrink*2);
        ctx.restore();
        ctx.shadowBlur = 0;
    }

    // Phase 4 (all phases): bright cyan vertical seam where the dummy was
    const seamA = Math.sin(Math.PI * Math.min(1, tt*1.4));
    if (seamA > 0){
        ctx.save();
        ctx.globalAlpha = seamA * 0.7;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#aef9ff';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i=0; i<=8; i++){
            const yy = d.y - d.h + (d.h/8)*i;
            const jx = (Math.random()-0.5)*3;
            if (i===0) ctx.moveTo(d.x + jx, yy);
            else ctx.lineTo(d.x + jx, yy);
        }
        ctx.stroke();
        ctx.restore();
    }
    ctx.globalAlpha = 1;
}

function _drawHoloTrail(h){
    for (const t of h.trail){
        const a = (t.life/t.max) * 0.35;
        ctx.globalAlpha = a;
        _drawHologramSilhouette(t.x, t.y, t.facing, 'idle', 0, 0);
    }
    ctx.globalAlpha = 1;
}

function _drawHologram(h, T){
    // Slight flicker
    const baseAlpha = 0.95 - (h.flicker===0 ? 0.15 : 0);
    ctx.globalAlpha = baseAlpha;
    // Glow halo behind
    ctx.save();
    ctx.translate(h.x, h.y - h.h/2);
    const halo = ctx.createRadialGradient(0,0,2,0,0,40);
    halo.addColorStop(0,'rgba(92,246,255,0.35)');
    halo.addColorStop(1,'transparent');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0,0,40,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // Post-parry flash — bright white-cyan rim expanding outward from the
    // player's silhouette. Sells the "you just parried" moment.
    if (h.parryFlash > 0){
        const pf = h.parryFlash / 18;
        ctx.save();
        ctx.translate(h.x, h.y - h.h/2);
        ctx.globalAlpha = pf;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#aef9ff';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 26 + (1-pf)*22, 0, Math.PI*2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }
    _drawHologramSilhouette(h.x, h.y, h.facing, h.animState, h.animTimer, h.landSquash, h.attackDir);
    ctx.globalAlpha = 1;
    // Faint base ring (the "projector" floor mark)
    if (h.grounded){
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.strokeStyle = 'rgba(92,246,255,0.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, 1, 14, 4, 0, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = 'rgba(92,246,255,0.18)';
        ctx.beginPath(); ctx.ellipse(0, 1, 22, 6, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
    }
}

// Hologram is drawn as a stylized humanoid silhouette in cyan, with simple
// procedural pose changes per anim state. Origin is FEET center.
function _drawHologramSilhouette(x, y, facing, state, animTimer, landSquash, attackDir){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    // Squash on landing
    const sx = 1 + landSquash*0.25;
    const sy = 1 - landSquash*0.3;
    ctx.scale(sx, sy);

    const cyan = '#5cf6ff';
    const cyanDim = 'rgba(92,246,255,0.35)';
    ctx.strokeStyle = cyan;
    ctx.fillStyle = 'rgba(92,246,255,0.18)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = '#5cf6ff';
    ctx.shadowBlur = 8;

    // Pose params per state
    // Walk-cycle params: stride drives a proper biped step (foot lifts, knee
    // bends, opposite arm swings forward) instead of the old leg-translation
    // that just made the hologram shuffle. Phase is shared between the two
    // legs (offset by π between them) and between legs and arms (offset by π).
    let bodyBob = 0;
    let headTilt = 0;
    let crouch = 0;
    let phase = 0;          // walk-cycle phase, radians
    let stride = 0;         // horizontal foot reach
    let lift = 0;           // peak foot height when leg is in swing
    let armReach = 0;       // how far the hand swings forward/back
    let kneeBend = 2;       // forward knee offset (deeper = more crouched gait)
    let staticLegOffset = 0;// when 0, legs use stride; else legs are posed statically (jump/fall/attack)
    let staticArmOffset = 0;
    let useWalkCycle = false;

    if (state === 'idle') {
        bodyBob = Math.sin(animTimer*0.08)*0.6;
    } else if (state === 'run') {
        useWalkCycle = true;
        phase = animTimer * 0.28;
        stride = 6;
        lift = 5;
        armReach = 5;
        kneeBend = 2;
        bodyBob = Math.abs(Math.sin(phase*2)) * -1.4;
    } else if (state === 'sprint') {
        useWalkCycle = true;
        phase = animTimer * 0.42;
        stride = 9;
        lift = 7;
        armReach = 7;
        kneeBend = 3;
        bodyBob = Math.abs(Math.sin(phase*2)) * -2.2;
        headTilt = -0.18;
    } else if (state === 'jump') {
        // Legs tucked, arms back
        staticLegOffset = -3;
        staticArmOffset = -6;
        bodyBob = -1;
    } else if (state === 'fall') {
        staticLegOffset = 5;
        staticArmOffset = 6;
    } else if (state === 'land') {
        crouch = 4;
    } else if (state === 'attack') {
        const t = animTimer; // 0..ATTACK_DURATION
        if (attackDir === 'up') {
            staticArmOffset = -10;
            headTilt = -0.25;
            bodyBob = -1;
        } else if (attackDir === 'down') {
            staticArmOffset = 8;
            headTilt = 0.18;
            staticLegOffset = 4;
        } else {
            staticArmOffset = 12 - Math.min(t,8)*1.5;
            headTilt = 0.05;
        }
    }

    // ---- Geometry ----
    // Feet origin at 0,0. Hips a bit above the ground.
    const torsoY = -18 + bodyBob + crouch;
    const headY  = -28 + bodyBob + crouch;
    const hipY = -10 + crouch;

    // Helper: draw one leg as thigh + shin with a knee. Hip at (hx, hipY).
    // foot pos (fx, fy) — fy is positive UP from ground (i.e. foot lifts).
    function _drawLegSegment(hx, fx, fy, kneeFwd){
        // foot canvas y = -fy because canvas y increases downward (origin at feet)
        const footY = -fy;
        const footX = fx;
        // Midpoint, then bias forward (in the facing direction) for knee bend
        const midX = (hx + footX) * 0.5 + kneeFwd;
        const midY = (hipY + footY) * 0.5 - 1.5;  // slight upward bend
        ctx.beginPath();
        ctx.moveTo(hx, hipY);
        ctx.lineTo(midX, midY);
        ctx.lineTo(footX, footY);
        ctx.stroke();
        // Tiny foot tick so steps read clearly
        ctx.beginPath();
        ctx.moveTo(footX - 1.5, footY);
        ctx.lineTo(footX + 3, footY);
        ctx.stroke();
    }

    // ---- Legs ----
    let leftFootX, leftFootY, rightFootX, rightFootY;
    if (useWalkCycle){
        const sL = Math.sin(phase);
        const sR = Math.sin(phase + Math.PI);
        leftFootX  = sL * stride;
        rightFootX = sR * stride;
        // Lift only during the SWING half (when sin>0 the leg is moving forward
        // through the air — that's when it should rise off the ground).
        leftFootY  = sL > 0 ? sL * lift : 0;
        rightFootY = sR > 0 ? sR * lift : 0;
    } else {
        // Static legs (jump/fall/attack): planted with a small offset.
        leftFootX  = -3 + staticLegOffset * 0.3;
        rightFootX =  3 - staticLegOffset * 0.3;
        leftFootY  = 0;
        rightFootY = 0;
    }
    _drawLegSegment(-2.5, leftFootX, leftFootY,  kneeBend);
    _drawLegSegment( 2.5, rightFootX, rightFootY, kneeBend);

    // Torso (rounded rect)
    ctx.beginPath();
    _roundRect(-5, torsoY - 4, 10, 14, 3);
    ctx.fill();
    ctx.stroke();

    // ---- Arms ----
    // Arms swing opposite the legs during walk/run/sprint. Render as two
    // segments per arm (shoulder → elbow → hand) so they read as natural swings.
    function _drawArmSegment(sx, hx, hy, elbowFwd){
        const ex = (sx + hx) * 0.5 + elbowFwd;
        const ey = (torsoY + 2 + hy) * 0.5 + 1;
        ctx.beginPath();
        ctx.moveTo(sx, torsoY + 2);
        ctx.lineTo(ex, ey);
        ctx.lineTo(hx, hy);
        ctx.stroke();
    }
    if (state === 'attack'){
        // Swing param 0..1 — held high during the windup, sweeps through the
        // active portion, lingers in follow-through. The sword visual and the
        // sword-arm pose both derive from this.
        const tProg = animTimer / COMBAT.ATTACK_DURATION;
        const swing = Math.min(1, Math.max(0, (tProg - 0.1) / 0.55));

        let pivotX, pivotY, bladeAngle;
        if (attackDir === 'up') {
            pivotX = 2;
            pivotY = torsoY - 4 - swing*10;
            // Blade rotates from straight down (90°) through forward (0°) to straight up (-90°)
            bladeAngle = (90 - swing*180) * Math.PI / 180;
            // Two-handed upward thrust
            ctx.beginPath();
            ctx.moveTo(-3, torsoY + 2); ctx.lineTo(pivotX-2, pivotY+2);
            ctx.moveTo( 3, torsoY + 2); ctx.lineTo(pivotX+2, pivotY+2);
            ctx.stroke();
        } else if (attackDir === 'down') {
            // Pogo / aerial down-strike — sword pointed straight down
            pivotX = 4;
            pivotY = torsoY + 10;
            bladeAngle = (90 + Math.sin(tProg*Math.PI*3)*4) * Math.PI / 180;
            ctx.beginPath();
            // Left arm trails back, right arm extends down to grip
            ctx.moveTo(-3, torsoY + 2); ctx.lineTo(-6, torsoY + 9);
            ctx.moveTo( 3, torsoY + 2); ctx.lineTo(pivotX-1, pivotY-1);
            ctx.stroke();
        } else {
            // Side — full one-handed swing from up-and-back to forward-down
            pivotX = -2 + swing*10;
            pivotY = torsoY + 3 + swing*3;
            bladeAngle = (-110 + swing*170) * Math.PI / 180;
            // Right arm sweeps with the sword; left arm trails behind for counterweight
            ctx.beginPath();
            ctx.moveTo(-3, torsoY + 1); ctx.lineTo(-7 + swing*2, torsoY + 9);
            ctx.moveTo( 3, torsoY + 1); ctx.lineTo(pivotX, pivotY);
            ctx.stroke();
        }

        // Draw the holographic sword at the grip point, rotated to the blade angle
        _drawHoloSword(pivotX, pivotY, bladeAngle, attackDir, swing);
    } else if (useWalkCycle){
        // Walking arms — left arm forward when right leg forward (opposite phase)
        const aL = Math.sin(phase + Math.PI);
        const aR = Math.sin(phase);
        const leftHandX  = aL * armReach;
        const leftHandY  = torsoY + 9 + (aL > 0 ? -aL*2 : 0);
        const rightHandX = aR * armReach;
        const rightHandY = torsoY + 9 + (aR > 0 ? -aR*2 : 0);
        _drawArmSegment(-3, leftHandX,  leftHandY,  aL * 2);
        _drawArmSegment( 3, rightHandX, rightHandY, aR * 2);
    } else {
        // Static arms (jump/fall/idle)
        ctx.beginPath();
        ctx.moveTo(-4, torsoY + 1);
        ctx.lineTo(-6 - staticArmOffset*0.4, torsoY + 8);
        ctx.moveTo(4, torsoY + 1);
        ctx.lineTo(6 + staticArmOffset*0.4, torsoY + 8);
        ctx.stroke();
    }
    // Head
    ctx.save();
    ctx.translate(1, headY);
    ctx.rotate(headTilt);
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    // Visor stripe
    ctx.strokeStyle = '#aef9ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, -0.5);
    ctx.lineTo(4, -0.5);
    ctx.stroke();
    ctx.restore();
    // Cape/coat tail — wisp of energy behind. The sway tracks the walk cycle
    // when in motion (more stride → more sway) and is calm otherwise.
    const sway = useWalkCycle ? Math.abs(Math.sin(phase)) * stride : 0;
    ctx.strokeStyle = cyanDim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, torsoY + 6);
    ctx.quadraticCurveTo(-10 - sway*0.5, torsoY + 4, -16 - sway*0.7, torsoY + 12);
    ctx.stroke();

    // Scanline overlay across the figure (clipped to a rough silhouette box)
    ctx.save();
    ctx.beginPath();
    _roundRect(-8, -34 + bodyBob, 16, 36, 6);
    ctx.clip();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#5cf6ff';
    const offset = (animTimer*0.5) % 3;
    for (let yy=-34+offset; yy<6; yy+=3) ctx.fillRect(-9, yy, 18, 0.7);
    ctx.restore();

    ctx.restore();
    ctx.shadowBlur = 0;
}

// Holographic sword drawn during an attack. Called from inside the silhouette's
// local frame (already translated/scaled to the player), so all coords are
// player-local. Pivot is where the hand grips; angle rotates the blade.
function _drawHoloSword(px, py, angle, dir, swing){
    const color = dir === 'down' ? '#ffd84a' : (dir === 'up' ? '#ff8e3c' : '#5cf6ff');
    const len = 22;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    // --- motion-blur trail: three faded copies trailing the blade angle ---
    for (let i = 1; i <= 3; i++){
        ctx.save();
        ctx.rotate(-i * 0.22);
        ctx.globalAlpha = 0.22 - i*0.05;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(len-1, 0);
        ctx.stroke();
        ctx.restore();
    }

    // --- outer glow blade (tapered) ---
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();

    // --- bright white inner core ---
    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(len-1, 0);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // --- blade tip flare ---
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(len, 0, 1.8, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- crossguard (perpendicular to blade) ---
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-1, -4);
    ctx.lineTo(-1, 4);
    ctx.stroke();
    // small spikes/wings on the guard for personality
    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(-1, -4); ctx.lineTo(3, -3);
    ctx.moveTo(-1,  4); ctx.lineTo(3,  3);
    ctx.stroke();

    // --- hilt grip ---
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-6, -1.5, 5, 3);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let i = -5; i < -1; i++){
        ctx.moveTo(i, -1.5); ctx.lineTo(i, 1.5);
    }
    ctx.stroke();

    // --- pommel (round cap on the back of the hilt) ---
    ctx.fillStyle = '#aaaaaa';
    ctx.beginPath();
    ctx.arc(-7, 0, 1.8, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
}

// The slash isn't a clean blade — it's a wave of fractured code. We draw a
// fast crescent of light, then trail it with jagged glyph fragments and a
// jittered "static" outline so each swing reads as the player tearing open
// the underlying source of reality.
function _drawSlash(h, s, T){
    const cx = h.x + s.cx;
    const cy = h.y + s.cy;
    const prog = s.t / s.life;                // 0..1
    const a = Math.pow(1 - prog, 1.4);         // fade out
    const colorEdge = s.dir==='down' ? '#ffd84a' : (s.dir==='up' ? '#ff8e3c' : '#5cf6ff');
    const a0 = s.a0, a1 = s.a1;
    const ang = a0 + (a1-a0) * Math.min(1, prog*1.5);
    ctx.save();
    ctx.translate(cx, cy);
    // Facing is already baked into a0/a1 (side attacks use base=π when facing<0),
    // so do NOT scale(-1,1) — that double-flip put the arc on the wrong side.

    // --- jagged outer glow ribbon ---
    ctx.globalAlpha = a*0.85;
    ctx.shadowColor = colorEdge;
    ctx.shadowBlur = 22;
    ctx.strokeStyle = colorEdge;
    ctx.lineCap = 'round';
    const steps = 18;
    const rOuter = s.reach;
    const rInner = s.reach - 14 - 14*Math.sin(Math.PI*prog);
    ctx.beginPath();
    for (let i=0; i<=steps; i++){
        const t = i/steps;
        const aa = a0 + (ang-a0)*t;
        const jitter = (Math.random()-0.5)*4;
        const rr = rOuter + jitter;
        const px = Math.cos(aa)*rr;
        const py = Math.sin(aa)*rr;
        if (i===0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    for (let i=steps; i>=0; i--){
        const t = i/steps;
        const aa = a0 + (ang-a0)*t;
        const jitter = (Math.random()-0.5)*3;
        const rr = rInner + jitter;
        ctx.lineTo(Math.cos(aa)*rr, Math.sin(aa)*rr);
    }
    ctx.closePath();
    const grd = ctx.createRadialGradient(0,0,rInner-4,0,0,rOuter+8);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.55, colorEdge);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fill();

    // --- hot white inner crescent ---
    ctx.shadowBlur = 0;
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3 + 4*Math.sin(Math.PI*prog);
    ctx.beginPath();
    const cSteps = 22;
    for (let i=0; i<=cSteps; i++){
        const t = i/cSteps;
        const aa = a0 + (ang-a0)*t;
        const rr = (rOuter+rInner)/2 + (Math.random()-0.5)*2;
        const px = Math.cos(aa)*rr, py = Math.sin(aa)*rr;
        if (i===0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // --- code glyphs scattered along the arc ---
    ctx.font = 'bold 13px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = colorEdge;
    ctx.shadowBlur = 8;
    const glyphCount = 14;
    for (let i=0; i<glyphCount; i++){
        const t = (i/glyphCount + prog*0.4) % 1;
        const aa = a0 + (ang-a0)*t;
        const rr = rInner + Math.random()*(rOuter-rInner+8);
        const px = Math.cos(aa)*rr + (Math.random()-0.5)*4;
        const py = Math.sin(aa)*rr + (Math.random()-0.5)*4;
        const lift = (1-t)*0.9 + 0.1;
        ctx.globalAlpha = a*lift;
        ctx.fillStyle = (i%4===0) ? '#ffffff' : colorEdge;
        ctx.fillText(_randGlyph(), px, py);
    }
    ctx.shadowBlur = 0;

    // --- crackling lightning tendrils branching off the leading edge ---
    ctx.globalAlpha = a*0.7;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.3;
    for (let b=0; b<3; b++){
        const aa = a0 + (ang-a0)*(0.8 + Math.random()*0.2);
        let px = Math.cos(aa)*rOuter;
        let py = Math.sin(aa)*rOuter;
        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let k=0; k<3; k++){
            px += (Math.cos(aa)+ (Math.random()-0.5)*0.8) * (6 + Math.random()*8);
            py += (Math.sin(aa)+ (Math.random()-0.5)*0.8) * (6 + Math.random()*8);
            ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
}

function _drawCombatFx(Z){
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of Z.fx){
        const a = Math.max(0, f.life/f.max);
        ctx.globalAlpha = a;
        if (f.type === 'char'){
            // Glyph fragment — code being scattered
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rot || 0);
            ctx.font = 'bold '+(f.size||12)+'px Courier New, monospace';
            ctx.shadowColor = f.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, 0, 0);
            // Faint duplicate offset for chromatic vibe
            ctx.globalAlpha = a*0.4;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(f.text, 0.6, -0.4);
            ctx.shadowBlur = 0;
            ctx.restore();
        } else if (f.type === 'glitch'){
            // Horizontal banding strip — pulled sideways
            ctx.fillStyle = f.color;
            ctx.globalAlpha = a*0.55;
            ctx.fillRect(f.x + f.offset, f.y, f.w, 2);
            ctx.globalAlpha = a*0.25;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(f.x + f.offset, f.y+2, f.w, 1);
        } else if (f.type === 'ring'){
            ctx.strokeStyle = f.color;
            ctx.shadowColor = f.color;
            ctx.shadowBlur = 12;
            ctx.lineWidth = 2*a + 0.8;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (f.type === 'tear'){
            // Reality crack — vertical black slit with cyan plasma edges
            const tt = 1 - a; // 0..1 over life
            const open = Math.sin(Math.PI*tt) * f.wMax; // open then close
            ctx.save();
            ctx.translate(f.x, f.y);
            // Bright spine
            ctx.shadowColor = '#aef9ff';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            const segs = 6;
            for (let i=0; i<=segs; i++){
                const yy = -f.h/2 + (f.h/segs)*i;
                const jx = (Math.random()-0.5)*3;
                if (i===0) ctx.moveTo(jx, yy);
                else ctx.lineTo(jx, yy);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            // Black void between two halves
            ctx.fillStyle = 'rgba(0,0,0,0.9)';
            ctx.beginPath();
            for (let i=0; i<=segs; i++){
                const yy = -f.h/2 + (f.h/segs)*i;
                ctx.lineTo((Math.random()-0.5)*1.2 - open*0.5, yy);
            }
            for (let i=segs; i>=0; i--){
                const yy = -f.h/2 + (f.h/segs)*i;
                ctx.lineTo((Math.random()-0.5)*1.2 + open*0.5, yy);
            }
            ctx.closePath();
            ctx.fill();
            // Cyan edge gradient
            ctx.strokeStyle = 'rgba(92,246,255,'+(a*0.9)+')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i=0; i<=segs; i++){
                const yy = -f.h/2 + (f.h/segs)*i;
                const xx = (Math.random()-0.5)*1.5 - open*0.5;
                if (i===0) ctx.moveTo(xx, yy);
                else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
            ctx.beginPath();
            for (let i=0; i<=segs; i++){
                const yy = -f.h/2 + (f.h/segs)*i;
                const xx = (Math.random()-0.5)*1.5 + open*0.5;
                if (i===0) ctx.moveTo(xx, yy);
                else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
            ctx.restore();
        } else if (f.type === 'errortag'){
            ctx.font = 'bold 14px Courier New, monospace';
            ctx.shadowColor = f.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, f.x, f.y);
            ctx.shadowBlur = 0;
        } else if (f.type === 'spark'){
            ctx.fillStyle = f.color;
            ctx.shadowColor = f.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 2.2*a + 0.6, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (f.type === 'dust'){
            ctx.fillStyle = f.color;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 3*a + 1, 0, Math.PI*2);
            ctx.fill();
        } else {
            ctx.fillStyle = f.color || '#fff';
            ctx.beginPath();
            ctx.arc(f.x, f.y, 3*a + 1, 0, Math.PI*2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

function _drawDamagePopups(Z){
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of Z.popups){
        const a = p.life/p.max;
        ctx.save();
        const scale = p.scaleIn !== undefined ? Math.min(1.4, p.scaleIn) : 1;
        ctx.translate(p.x, p.y);
        ctx.scale(scale, scale);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        // Bigger / heavier for DELETED kill labels
        const big = p.text === 'DELETED' || p.text === 'DOWN';
        ctx.font = big ? 'bold 18px Courier New, monospace' : 'bold 14px Courier New, monospace';
        ctx.fillText(p.text, 0, 0);
        // Subtle chromatic offset behind text
        ctx.globalAlpha = a*0.35;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p.text, 1, -0.5);
        ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
}

function _drawCombatHUD(Z, h, T){
    // Combat zone badge — top-right
    drawCombatZoneHUD();

    // Banner intro — hidden while the tutorial panel is showing (they share the same screen space)
    if (Z.banner.t < Z.banner.life && !Z.tutorial){
        const fade = Z.banner.t < 30 ? Z.banner.t/30 : (Z.banner.t > Z.banner.life-40 ? (Z.banner.life-Z.banner.t)/40 : 1);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 60, W, 64);
        ctx.fillStyle = '#5cf6ff';
        ctx.font = 'bold 26px Courier New, monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#5cf6ff'; ctx.shadowBlur = 12;
        ctx.fillText(Z.banner.text, W/2, 100);
        ctx.shadowBlur = 0;
        ctx.font = '11px Courier New, monospace';
        ctx.fillStyle = '#aef9ff';
        ctx.fillText('Z JUMP   X STRIKE   C SPRINT   ↑+X UPPERCUT   ↓+X POGO   B SUMMON BOT', W/2, 118);
        ctx.restore();
    }

    // Player HP bar bottom-left
    const barW = 220, barH = 12;
    const bx = 24, by = H - 36;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bx-3, by-16, barW+6, barH+22);
    ctx.fillStyle = '#5cf6ff';
    ctx.font = 'bold 10px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('HOLO INTEGRITY', bx, by-4);
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = '#5cf6ff';
    ctx.fillRect(bx, by, barW * (h.hp/h.maxHp), barH);
    ctx.strokeStyle = 'rgba(92,246,255,0.6)';
    ctx.strokeRect(bx, by, barW, barH);
}

// HUD combat-zone indicator. Draws a swords icon + 'COMBAT ZONE' text top-right.
// Called from the main draw() so the indicator works in the playground today,
// and can be reused from other modes later as combat zones are added.
function drawCombatZoneHUD(){
    if (!isInCombatZone()) return;
    const T = performance.now();
    const pulse = 0.6 + 0.4*Math.sin(T/280);
    const ix = W - 130, iy = 30;
    ctx.save();
    // Background pill
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    _roundRect(ix-12, iy-22, 130, 36, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,90,60,'+pulse.toFixed(2)+')';
    ctx.lineWidth = 1.5;
    _roundRect(ix-12, iy-22, 130, 36, 8); ctx.stroke();
    // Crossed-swords icon
    ctx.save();
    ctx.translate(ix, iy-4);
    ctx.strokeStyle = '#ff5a3c'; ctx.lineWidth = 2.2;
    ctx.shadowColor = '#ff5a3c'; ctx.shadowBlur = 8;
    // sword 1
    ctx.beginPath(); ctx.moveTo(-8,-8); ctx.lineTo(8,8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10,-10); ctx.lineTo(-6,-6); ctx.stroke(); // hilt
    // sword 2
    ctx.beginPath(); ctx.moveTo(-8,8); ctx.lineTo(8,-8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10,10); ctx.lineTo(-6,6); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Text
    ctx.fillStyle = '#ff5a3c';
    ctx.font = 'bold 11px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('COMBAT ZONE', ix+18, iy);
    ctx.restore();
}

// ---- Misc helpers ----
function _roundRect(x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
}

// ---- Exit detection ----
// Called every update tick from updateCombat() — exits when player overlaps the
// portal box and pushes Up+Jump together.
function _checkCombatExit(){
    if (!G.combat || !G.holo) return;
    const Z = G.combat, h = G.holo;
    const p = Z.exitPortal;
    if (!p) return;
    const inPortal = h.x > p.x && h.x < p.x+p.w && h.y > p.y && h.y < p.y+p.h+10;
    if (inPortal && _holoUpHeld() && _holoJumpHeld()) {
        exitCombatZone();
    }
}

// ---- Home-menu "MORE" dropdown ----
function toggleMoreMenu(){
    try { Sound.ui(); } catch(e) {}
    const el = document.getElementById('moreDropdown');
    if (!el) return;
    el.style.display = (el.style.display === 'block') ? 'none' : 'block';
}
document.addEventListener('click', function(e){
    const dd = document.getElementById('moreDropdown');
    const btn = document.getElementById('moreBtn');
    if (!dd || !btn) return;
    if (dd.style.display !== 'block') return;
    if (dd.contains(e.target) || btn.contains(e.target)) return;
    dd.style.display = 'none';
});
