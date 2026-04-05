// ============================================================
//  SAVES
// ============================================================
function loadSaves() { const s=localStorage.getItem('ast_rem_saves'); if(s) saves=JSON.parse(s); renderSlots(); }
function saveToDisk() { localStorage.setItem('ast_rem_saves', JSON.stringify(saves)); renderSlots(); }
function renderSlots() {
    for (let i=1;i<=3;i++) {
        const el=document.getElementById('slot'+i), d=saves[i];
        if (!d) el.innerHTML=`<span class="slot-title">SLOT ${i}</span><span class="slot-empty">EMPTY</span>`;
        else {
            const cls=d.playerClass&&CLASS_DEFS[d.playerClass]?CLASS_DEFS[d.playerClass]:null;
            const diffDef=DIFFICULTY[d.difficulty]||DIFFICULTY.normal;
            const diffTag=`<span style="color:${diffDef.color};font-size:10px;">${diffDef.label}</span> `;
            const clsTag=cls?`${diffTag}<span style="color:${cls.color};font-size:11px;">${cls.name}</span><br>`:'';
            el.innerHTML=`<span class="slot-title">SLOT ${i}</span><div class="slot-info">${clsTag}HIGH: ${d.high}<br>MAX LVL: ${d.maxLvl}</div><button class="del-btn" onclick="delSlot(event,${i})">DELETE</button>`;
        }
    }
}
function delSlot(e,id) { e.stopPropagation(); Sound.ui(); if(confirm('Delete Slot '+id+'?')){saves[id]=null;saveToDisk();} }
function selectSlot(id) {
    if(event&&event.target&&event.target.classList.contains('del-btn')) return;
    Sound.ui();
    // New slot → show difficulty selection first, then class
    if(!saves[id]){ openDifficultySelect(id); return; }
    G.slotId=id; G.tutorial=false; G.practice=false;
    // Migrate old saves
    const s=saves[id];
    // Apply saved difficulty
    currentDifficulty=s.difficulty||'normal';
    if(!s.mb) s.mb=0;
    if(!s.upgrades) s.upgrades={speed:0,agility:0,hull:0,ammoCap:0,reload:0};
    if(!s.gilbertUpgrades) s.gilbertUpgrades={fireRate:0,range:0,damage:0};
    if(!s.modules) s.modules=[];
    if(!s.equippedModules) s.equippedModules=[];
    if(!s.stationUnlocked) s.stationUnlocked=false;
    if(!s.checkpoint) s.checkpoint=1;
    if(!s.inventory) s.inventory=[];
    if(s.kratGreeted==null) s.kratGreeted=false;
    if(s.itemTutorialShown==null) s.itemTutorialShown=false;
    if(!Array.isArray(s.dataFragmentsSeen)) s.dataFragmentsSeen=[];
    // Load into G
    G.inventory=s.inventory.slice();
    G.kratGreeted=!!s.kratGreeted;
    G.itemTutorialShown=!!s.itemTutorialShown;
    G.dataFragmentsSeen=s.dataFragmentsSeen.slice();
    saveToDisk();
    startGame();
    // If station is unlocked, start there and restore checkpoint level
    if(s.stationUnlocked&&window.DLC&&window.DLC.loaded){
        // Station is only reached after boss 5, so level must be at least 6
        G.level=Math.max(6,s.checkpoint||6);
        G.checkpoint=G.level;
        G.stationUnlocked=true;
        // Spawn Gilbert ally if past boss 5
        if(G.gilbertState==='none'){spawnGilbertAlly();G.albertMode=false;}
        // Restore level 6 progress (so fight doesn't re-trigger on reload)
        if(G.level6){
            if(s.bigShotUnlocked) G.level6.bigShotUnlocked=true;
        }
        enterStation();
    }
}
// ============================================================
//  CLASS SYSTEM
// ============================================================
const CLASS_DEFS = {
    none:      { name:'CLASSLESS',  color:'#cccccc', upgrades:{}, modules:[], equipped:[], score:10000, mb:0 },
    agility:   { name:'AGILITY',    color:'#00ccff', upgrades:{speed:3,agility:2}, modules:['dash'], equipped:['dash'], score:0, mb:0 },
    tank:      { name:'TANK',       color:'#ff6600', upgrades:{ammoCap:3,reload:1}, modules:['shield_regen'], equipped:['shield_regen'], score:0, mb:0 },
    gunner:    { name:'GUNNER',     color:'#ff2222', upgrades:{reload:2,ammoCap:1}, modules:['rear_gun'], equipped:['rear_gun'], score:0, mb:0 },
    scavenger: { name:'SCAVENGER',  color:'#aa44ff', upgrades:{ammoCap:2}, modules:['magnet'], equipped:['magnet'], score:0, mb:200 }
};

// Ship shape paths per class (drawn relative to r=14, pointing right)
// Each returns a path function: (ctx, r) => { ctx.moveTo/lineTo... }
const CLASS_SHIPS = {
    // Default triangle — classic asteroids ship
    none: {
        body(ctx,r){
            ctx.moveTo(r+2,0);
            ctx.lineTo(-r,r*0.85);
            ctx.lineTo(-r*0.45,0);
            ctx.lineTo(-r,-r*0.85);
        },
        cockpitX:2, flameX:-0.4,
        wingLines:[[0.3,0,-0.5,0.5],[0.3,0,-0.5,-0.5]]
    },
    // Agility — sleek narrow dart with swept-back fins
    agility: {
        body(ctx,r){
            ctx.moveTo(r+6,0);
            ctx.lineTo(r*0.1,r*0.3);
            ctx.lineTo(-r*0.6,r*0.9);
            ctx.lineTo(-r*0.8,r*0.6);
            ctx.lineTo(-r*0.35,0);
            ctx.lineTo(-r*0.8,-r*0.6);
            ctx.lineTo(-r*0.6,-r*0.9);
            ctx.lineTo(r*0.1,-r*0.3);
        },
        cockpitX:4, flameX:-0.35,
        wingLines:[[0.2,0,-0.6,0.75],[0.2,0,-0.6,-0.75]]
    },
    // Tank — wide bulky hexagonal hull with flat front
    tank: {
        body(ctx,r){
            ctx.moveTo(r+2,r*0.3);
            ctx.lineTo(r+2,-r*0.3);
            ctx.lineTo(r*0.3,-r*0.55);
            ctx.lineTo(-r*0.7,-r*0.95);
            ctx.lineTo(-r*1.0,-r*0.7);
            ctx.lineTo(-r*0.6,0);
            ctx.lineTo(-r*1.0,r*0.7);
            ctx.lineTo(-r*0.7,r*0.95);
            ctx.lineTo(r*0.3,r*0.55);
        },
        cockpitX:3, flameX:-0.6,
        wingLines:[[0.3,0.2,-0.7,0.8],[0.3,-0.2,-0.7,-0.8]]
    },
    // Gunner — angular aggressive arrowhead with weapon prongs
    gunner: {
        body(ctx,r){
            ctx.moveTo(r+4,0);
            ctx.lineTo(r*0.2,r*0.25);
            ctx.lineTo(-r*0.1,r*0.55);
            ctx.lineTo(-r*0.9,r*1.0);
            ctx.lineTo(-r*0.7,r*0.4);
            ctx.lineTo(-r*0.4,0);
            ctx.lineTo(-r*0.7,-r*0.4);
            ctx.lineTo(-r*0.9,-r*1.0);
            ctx.lineTo(-r*0.1,-r*0.55);
            ctx.lineTo(r*0.2,-r*0.25);
        },
        cockpitX:2, flameX:-0.4,
        wingLines:[[0.1,0.3,-0.8,0.7],[0.1,-0.3,-0.8,-0.7]]
    },
    // Scavenger — asymmetric scrapyard ship with cargo pods
    scavenger: {
        body(ctx,r){
            ctx.moveTo(r+2,r*0.1);
            ctx.lineTo(r+2,-r*0.1);
            ctx.lineTo(r*0.4,-r*0.35);
            ctx.lineTo(-r*0.2,-r*0.35);
            ctx.lineTo(-r*0.3,-r*0.8);
            ctx.lineTo(-r*0.8,-r*0.8);
            ctx.lineTo(-r*0.7,-r*0.35);
            ctx.lineTo(-r*0.5,0);
            ctx.lineTo(-r*0.7,r*0.35);
            ctx.lineTo(-r*0.8,r*0.8);
            ctx.lineTo(-r*0.3,r*0.8);
            ctx.lineTo(-r*0.2,r*0.35);
            ctx.lineTo(r*0.4,r*0.35);
        },
        cockpitX:3, flameX:-0.5,
        wingLines:[[0.2,0,-0.5,0.55],[0.2,0,-0.5,-0.55]]
    }
};

// Draw a class ship preview onto a small canvas
function drawClassShipPreview(canvasId, classKey) {
    const cvs = document.getElementById(canvasId);
    if(!cvs) return;
    const c = cvs.getContext('2d');
    const def = CLASS_DEFS[classKey];
    const shape = CLASS_SHIPS[classKey];
    const r = 16;
    c.clearRect(0,0,cvs.width,cvs.height);
    c.save();
    c.translate(cvs.width/2, cvs.height/2);

    // Thrust flame glow
    const fc = def.color;
    c.shadowBlur=12; c.shadowColor=fc;
    c.strokeStyle=fc; c.lineWidth=4; c.globalAlpha=0.35;
    c.beginPath(); c.moveTo(r*shape.flameX,0); c.lineTo(r*shape.flameX-r*1.2,0); c.stroke();
    c.strokeStyle='#fff'; c.lineWidth=2; c.globalAlpha=0.5;
    c.beginPath(); c.moveTo(r*shape.flameX,0); c.lineTo(r*shape.flameX-r*0.9,0); c.stroke();
    c.shadowBlur=0; c.globalAlpha=1;

    // Ship body
    c.beginPath();
    shape.body(c,r);
    c.closePath();
    const sg=c.createLinearGradient(-r,0,r,0);
    sg.addColorStop(0,'#0a0a0a'); sg.addColorStop(1,'#1a1a2a');
    c.fillStyle=sg; c.fill();
    c.shadowBlur=8; c.shadowColor=def.color;
    c.strokeStyle=def.color; c.lineWidth=2; c.stroke();
    c.shadowBlur=0;

    // Wing accents
    c.strokeStyle=def.color.replace(')',',0.35)').replace('rgb','rgba').replace('#','');
    // Use rgba version of class color
    c.globalAlpha=0.35; c.strokeStyle=def.color; c.lineWidth=1;
    for(const wl of shape.wingLines){
        c.beginPath(); c.moveTo(r*wl[0],r*wl[1]); c.lineTo(r*wl[2],r*wl[3]); c.stroke();
    }
    c.globalAlpha=1;

    // Cockpit
    const cockpit=c.createRadialGradient(shape.cockpitX,0,0,shape.cockpitX,0,4);
    cockpit.addColorStop(0,def.color); cockpit.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=cockpit; c.beginPath(); c.arc(shape.cockpitX,0,5,0,Math.PI*2); c.fill();
    c.fillStyle=def.color; c.beginPath(); c.arc(shape.cockpitX,0,2,0,Math.PI*2); c.fill();

    c.restore();
}

let _pendingSlotId = null;
let _pendingDifficulty = null;

function openDifficultySelect(slotId) {
    _pendingSlotId = slotId;
    document.getElementById('difficultySelect').style.display = 'block';
}
function cancelDifficultySelect() {
    Sound.ui();
    _pendingSlotId = null;
    document.getElementById('difficultySelect').style.display = 'none';
}
function pickDifficulty(diff) {
    Sound.ui();
    _pendingDifficulty = diff;
    document.getElementById('difficultySelect').style.display = 'none';
    openClassSelect(_pendingSlotId);
}

function openClassSelect(slotId) {
    _pendingSlotId = slotId;
    document.getElementById('classSelect').style.display = 'block';
    // Draw ship previews on the cards
    for(const key of Object.keys(CLASS_DEFS)){
        drawClassShipPreview('ccShip_'+key, key);
    }
}
function cancelClassSelect() {
    Sound.ui();
    _pendingSlotId = null;
    document.getElementById('classSelect').style.display = 'none';
}
function pickClass(cls) {
    Sound.ui();
    document.getElementById('classSelect').style.display = 'none';
    const def = CLASS_DEFS[cls];
    const id = _pendingSlotId;
    const difficulty = _pendingDifficulty || 'normal';
    _pendingSlotId = null;
    _pendingDifficulty = null;
    currentDifficulty = difficulty;
    // Create save with class data baked in
    const baseUpgrades = {speed:0,agility:0,hull:0,ammoCap:0,reload:0};
    Object.assign(baseUpgrades, def.upgrades);
    saves[id] = {
        high: 0, maxLvl: 1, mb: def.mb,
        upgrades: baseUpgrades,
        gilbertUpgrades: {fireRate:0,range:0,damage:0},
        modules: def.modules.slice(),
        equippedModules: def.equipped.slice(),
        stationUnlocked: false, checkpoint: 1,
        playerClass: cls,
        difficulty: difficulty
    };
    saveToDisk();
    // Now select the slot normally
    selectSlot(id);
}

function startTutorial() { Sound.ui(); G.tutorial=true; G.practice=false; G.slotId=null; currentDifficulty='normal'; startGame(); }
function startPractice() { Sound.ui(); G.practice=true; G.tutorial=false; G.slotId=null; currentDifficulty='normal'; startGame(); }

// Boss Practice
const BOSS_DEFS=[
    {type:1,name:'Boss 1 — Energy Orb',color:'#ff2222',desc:'Charges at you. 25 HP.',dlc:false},
    {type:2,name:'Boss 2 — Cyan Orb',color:'#00ccff',desc:'Spawns asteroids. 45 HP.',dlc:false},
    {type:4,name:'Boss 4 — Cyborg',color:'#00ff88',desc:'Wall trap + dash. 30 HP.',dlc:true},
    {type:5,name:'Boss 5 — Snake',color:'#ffaa00',desc:'Destroy segments first. 10 HP head.',dlc:true},
    {type:3,name:'Boss 3 — Sans',color:'#fff',desc:'Two phases, gaster blasters. 100 HP.',dlc:false},
    {type:10,name:'Boss 10 — Sans (DLC)',color:'#ff00ff',desc:'DLC final boss. 100 HP.',dlc:true},
    {type:'bossRush',name:'Boss Rush (DLC)',color:'#ffaa00',desc:'4 waves of mini-bosses.',dlc:true},
    {type:'rougeAmbush',name:'Rouge Ambush (DLC)',color:'#ff6622',desc:'Kidnap + arena fight.',dlc:true},
    {type:'rougeBattle',name:'Rouge Battlefield (DLC)',color:'#ff8844',desc:'60s fullscreen war.',dlc:true},
];
function openBossPractice(){
    try{Sound.ui();}catch(e){}
    document.getElementById('menuScreen').style.display='none';
    const list=document.getElementById('bossPracticeList');
    list.innerHTML='';
    for(const bd of BOSS_DEFS){
        if(bd.dlc&&!(window.DLC&&window.DLC.loaded)) continue;
        const btn=document.createElement('button');
        btn.style.cssText='display:flex;justify-content:space-between;align-items:center;background:rgba(20,20,30,0.8);border:1px solid '+bd.color+';border-radius:6px;padding:10px 15px;cursor:pointer;font-family:inherit;transition:0.2s;';
        btn.innerHTML='<div style="text-align:left;"><div style="color:'+bd.color+';font-weight:bold;font-size:14px;">'+bd.name+'</div><div style="color:#888;font-size:11px;margin-top:2px;">'+bd.desc+'</div></div><div style="color:'+bd.color+';font-size:20px;">▶</div>';
        btn.onmouseover=function(){this.style.background='rgba(40,40,60,0.9)';this.style.transform='translateX(4px)';};
        btn.onmouseout=function(){this.style.background='rgba(20,20,30,0.8)';this.style.transform='none';};
        btn.onclick=(function(t){return function(){startBossPractice(t);};})(bd.type);
        list.appendChild(btn);
    }
    document.getElementById('bossPracticeScreen').style.display='block';
}
function closeBossPractice(){
    try{Sound.ui();}catch(e){}
    document.getElementById('bossPracticeScreen').style.display='none';
    document.getElementById('menuScreen').style.display='block';
}
function startBossPractice(bossType){
    Sound.ui();
    document.getElementById('bossPracticeScreen').style.display='none';
    G.practice=true;G.tutorial=false;G.slotId=null;
    startGame();
    // Override: god mode, infinite ammo, skip to boss
    G.godMode=true;G.infAmmo=true;G.ammo=999;
    document.getElementById('godRow').style.display='block';
    G.hasForceField=true;G.shieldFuel=getMaxShieldFuel();updateShieldUI();
    // Special DLC set-pieces (boss rush, rouge war phases)
    if(bossType==='bossRush'){
        G.level=3;
        asteroids=[];
        spawnGilbertAlly(); G.albertMode=true;
        if(typeof startBossRush==='function') startBossRush();
        updateUI(); return;
    }
    if(bossType==='rougeAmbush'){
        G.level=6; G.stationUnlocked=true;
        asteroids=[]; miniBosses=[]; enemyBullets=[];
        spawnGilbertAlly(); G.albertMode=true;
        if(typeof startLevel6==='function'){
            startLevel6();
            // Skip to the kidnap sequence
            G.level6.state='kidnap_warn'; G.level6.timer=60*2.9;
        }
        updateUI(); return;
    }
    if(bossType==='rougeBattle'){
        G.level=6; G.stationUnlocked=true;
        asteroids=[]; miniBosses=[]; enemyBullets=[];
        spawnGilbertAlly(); G.albertMode=true;
        if(typeof startLevel6==='function' && typeof setupBattlefield==='function'){
            startLevel6();
            setupBattlefield();
            G.level6.state='battlefield'; G.level6.timer=0;
        }
        updateUI(); return;
    }
    // Set appropriate level
    if(bossType===1) G.level=1;
    else if(bossType===2) G.level=2;
    else if(bossType===4) G.level=4;
    else if(bossType===5) G.level=5;
    else if(bossType===3) G.level=3;
    else if(bossType===10) G.level=10;
    // Spawn the boss directly
    asteroids=[];
    spawnBoss(bossType);
    // Spawn Albert (silent Gilbert replica) for bosses where Gilbert normally helps
    if(bossType===4||bossType===5||bossType===10){
        spawnGilbertAlly();
        G.albertMode=true; // Flag to suppress all Gilbert dialogue/quips
    }
    updateUI();
}

loadSaves();

