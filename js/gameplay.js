// ============================================================
//  START / RESET
// ============================================================
function startGame() {
    $menu.style.display='none'; $over.style.display='none'; $win.style.display='none';
    $debug.style.display='none'; $practice.style.display='none';
    document.getElementById('pauseMenu').style.display='none';
    $ui.style.display='block';

    G.running=true; G.paused=false; G.score=0; G.level=1; G.albertMode=false; G.fastTravelOpen=false;
    G.widescreenReturning=false; canvas.width=900; W=900;
    const diff = DIFFICULTY[currentDifficulty] || DIFFICULTY.normal;
    G.ammo = G.tutorial ? 999 : (G.practice ? pSettings.ammo : diff.ammo);
    bulletSpeed = G.practice ? pSettings.bulletSpeed : 8;
    G.combo=0; G.comboTimer=0;
    G.waveStart=performance.now(); G.shotTimer=0;
    G.shakeTimer=0; G.spawnTimer=0; G.ammoTimer=0; G.powerTimer=0; G.fuelTimer=0;
    G.tripleShotTimer=0; G.invincibleTimer=0;
    G.hasForceField=false; G.shieldFuel=0; G.forceFieldDrop=null;
    G.tutStep=0; G.tutTimer=0; G.checkpoint=1;
    G.asteroidsDestroyed=0; G.miniBossKills=0; G.fuelCollected=0;
    G.damageTakenThisBoss=false; G.gameStartTime=performance.now();
    G.shotsFired=0; G.totalBossesDefeated=0; G.levelsCleared=0;
    G.noShieldBoss3=true; G.consecutiveKills=0; G.peakAmmo=0;
    G.practicePaused=false;
    // Gilbert / Boss Rush (DLC)
    G.bossRush=false; G.bossRushWave=0; G.bossRushKills=0; G.bossRushTotal=0;
    G.bossRushPauseOffset=0; G.bossRushStartTime=0;
    G.gilbert=null; G.gilbertState='none'; // none, drifting, dialogue_hit, rope, scrap_collect, repair_prompt, repair_flash, ally
    G.gilbertDialogue=''; G.gilbertDialogueTimer=0; G.gilbertDialogueQueue=[];
    G.gilbertDialogueCallback=null; G.gilbertFlashTimer=0; G.rope=false;
    G.cyborgScraps=[]; G.scrapsCollected=0; G.scrapsNeeded=5;
    G.gilbertShootTimer=0;
    G.gilbertQuip=''; G.gilbertQuipTimer=0;
    G.gilbertSeen={};

    ship={x:W/2,y:H/2,a:-Math.PI/2,r:14,tx:0,ty:0};
    asteroids=[]; bullets=[]; particles=[]; ammoBoxes=[]; powerups=[];
    miniBosses=[]; enemyBullets=[]; gasterBlasters=[]; boss=null;
    G.cyborgScraps=[];

    document.getElementById('bossRow').style.display='none';
    document.getElementById('powerupRow').style.display='none';
    document.getElementById('comboRow').style.display='none';
    document.getElementById('godRow').style.display = G.godMode ? 'block' : 'none';
    document.getElementById('hyperRow').style.display = G.hyperGun ? 'block' : 'none';
    document.getElementById('practiceHint').style.display = G.practice ? 'block' : 'none';
    updateShieldUI();

    if (G.slotId) document.getElementById('highVal').innerText=saves[G.slotId].high;
    else document.getElementById('highVal').innerText = G.practice ? 'PRC' : (G.tutorial ? 'TUT' : '---');

    // Apply upgrades from save
    THRUST=BASE_THRUST;TURN=BASE_TURN;SHOT_CD=BASE_SHOT_CD;
    G.mode='space';G.stationCutscene=null;G.dashCooldown=0;
    G.tankHP=0;G.tankDamaged=false;G.tankRepairTimer=0;
    if(G.slotId&&saves[G.slotId]){
        const su=saves[G.slotId].upgrades||{};
        THRUST=BASE_THRUST+(su.speed||0)*0.06;
        TURN=BASE_TURN+(su.agility||0)*0.02;
        SHOT_CD=Math.max(6,BASE_SHOT_CD-(su.reload||0)*2);
        G.ammo+=(su.ammoCap||0)*15;
        G.upgrades=Object.assign({speed:0,agility:0,hull:0,ammoCap:0,reload:0},su);
        G.gilbertUpgrades=Object.assign({fireRate:0,range:0,damage:0},saves[G.slotId].gilbertUpgrades||{});
        G.modules=saves[G.slotId].modules||[];
        G.equippedModules=saves[G.slotId].equippedModules||[];
        G.mb=saves[G.slotId].mb||0;
        G.stationUnlocked=saves[G.slotId].stationUnlocked||false;
        // Apply class starting score bonus
        const cls=saves[G.slotId].playerClass;
        if(cls&&CLASS_DEFS[cls]) G.score+=CLASS_DEFS[cls].score;
        // Tank class: extra HP, slightly slower
        if(cls==='tank'){
            G.tankHP=1;
            THRUST*=0.85;
        }
    }

    if (!G.tutorial) for(let i=0;i<4;i++) spawnAsteroid();
    updateUI(); Sound.playMusic('bgm');
}

// ============================================================
//  PAUSE MENU
// ============================================================
function togglePause(){
    if(!G.running) return;
    if(G.paused) resumeGame();
    else pauseGame();
}
function pauseGame(){
    G.paused=true;
    G.pauseTime=performance.now();
    // Sync pause menu controls with current settings
    document.getElementById('pause_masterVol').value=settings.masterVol;
    document.getElementById('pause_masterVol_val').innerText=settings.masterVol;
    document.getElementById('pause_musicVol').value=settings.musicVol;
    document.getElementById('pause_musicVol_val').innerText=settings.musicVol;
    document.getElementById('pause_sfxVol').value=settings.sfxVol;
    document.getElementById('pause_sfxVol_val').innerText=settings.sfxVol;
    document.getElementById('pause_shake').value=settings.shake;
    document.getElementById('pause_particles').value=settings.particles;
    document.getElementById('pause_timer').value=settings.timer;
    document.getElementById('pause_bosshp').value=settings.bosshp;
    document.getElementById('pauseMenu').style.display='block';
}
function resumeGame(){
    G.paused=false;
    // Adjust timers so pause time doesn't count
    const pauseDuration=performance.now()-G.pauseTime;
    G.waveStart+=pauseDuration;
    G.gameStartTime+=pauseDuration;
    if(G.bossRushStartTime>0) G.bossRushStartTime+=pauseDuration;
    document.getElementById('pauseMenu').style.display='none';
    try{Sound.ui();}catch(e){}
}
function quitToMenu(){
    G.paused=false;
    document.getElementById('pauseMenu').style.display='none';
    returnToMenu();
}
function applyPauseAudio(){
    settings.masterVol=parseInt(document.getElementById('pause_masterVol').value);
    settings.musicVol=parseInt(document.getElementById('pause_musicVol').value);
    settings.sfxVol=parseInt(document.getElementById('pause_sfxVol').value);
    document.getElementById('pause_masterVol_val').innerText=settings.masterVol;
    document.getElementById('pause_musicVol_val').innerText=settings.musicVol;
    document.getElementById('pause_sfxVol_val').innerText=settings.sfxVol;
    // Apply to sound engine
    if(Sound.master) Sound.master.gain.value=(settings.masterVol/100)*(settings.sfxVol/100)*0.6;
    const mv=settings.musicVol/100*(settings.masterVol/100)*0.8;
    if(Sound.bgmAudio) Sound.bgmAudio.volume=Sound.muted?0:mv;
    if(Sound.boss3Audio) Sound.boss3Audio.volume=Sound.muted?0:mv;
    if(Sound.boss3P2Audio) Sound.boss3P2Audio.volume=Sound.muted?0:mv;
    if(Sound.boss4Audio) Sound.boss4Audio.volume=Sound.muted?0:mv;
    if(Sound.boss5Audio) Sound.boss5Audio.volume=Sound.muted?0:mv;
    if(Sound.rougeAudio) Sound.rougeAudio.volume=Sound.muted?0:mv;
    // Sync main settings UI too
    document.getElementById('set_masterVol').value=settings.masterVol;
    document.getElementById('set_musicVol').value=settings.musicVol;
    document.getElementById('set_sfxVol').value=settings.sfxVol;
    document.getElementById('set_masterVol_val').innerText=settings.masterVol;
    document.getElementById('set_musicVol_val').innerText=settings.musicVol;
    document.getElementById('set_sfxVol_val').innerText=settings.sfxVol;
    saveSettings();
}
function applyPauseDisplay(){
    settings.shake=document.getElementById('pause_shake').value;
    settings.particles=document.getElementById('pause_particles').value;
    settings.timer=document.getElementById('pause_timer').value;
    settings.bosshp=document.getElementById('pause_bosshp').value;
    document.getElementById('timeRow').style.display=settings.timer==='on'?'block':'none';
    // Sync main settings UI
    document.getElementById('set_shake').value=settings.shake;
    document.getElementById('set_particles').value=settings.particles;
    document.getElementById('set_timer').value=settings.timer;
    document.getElementById('set_bosshp').value=settings.bosshp;
    saveSettings();
}

function returnToMenu() {
    Sound.ui(); Sound.playMusic('none');
    G.running=false; G.paused=false; G.practice=false; G.tutorial=false; G.practicePaused=false;
    $over.style.display='none'; $win.style.display='none'; $debug.style.display='none'; $practice.style.display='none';
    document.getElementById('pauseMenu').style.display='none';
    $ui.style.display='none'; $menu.style.display='block';
    asteroids=[]; miniBosses=[]; enemyBullets=[]; gasterBlasters=[]; boss=null;
    G.godMode=false; G.infAmmo=false; G.hyperGun=false; G.noMiniBoss=false; G.noBoss=false;
    G.gilbert=null; G.gilbertState='none'; G.bossRush=false; G.cyborgScraps=[];
    engineTrail=[]; shootingStars=[];
    G.gilbertDialogue=''; G.gilbertDialogueQueue=[]; G.rope=false;
    G.widescreenReturning=false; canvas.width=900; W=900;
    G.mode='space';G.stationCutscene=null;G.stationDialogue='';
}

function retryCheckpoint() {
    Sound.ui(); $over.style.display='none';
    // If station is unlocked, respawn there
    if(G.stationUnlocked&&window.DLC&&window.DLC.loaded){
        ship={x:W/2,y:H/2,a:-Math.PI/2,r:14,tx:0,ty:0};
        G.running=true;G.ammo=50;
        asteroids=[];bullets=[];particles=[];ammoBoxes=[];powerups=[];
        miniBosses=[];enemyBullets=[];gasterBlasters=[];boss=null;
        G.hasForceField=true;G.shieldFuel=getMaxShieldFuel();updateShieldUI();
        if(G.gilbertState==='none'){spawnGilbertAlly();G.albertMode=false;}
        canvas.width=900;W=900;G.widescreenReturning=false;
        enterStation();
        updateUI();return;
    }
    ship={x:W/2,y:H/2,a:-Math.PI/2,r:14,tx:0,ty:0};
    G.ammo=50; G.invincibleTimer=0;
    asteroids=[]; bullets=[]; particles=[]; ammoBoxes=[]; powerups=[];
    miniBosses=[]; enemyBullets=[]; gasterBlasters=[]; boss=null;
    G.waveStart=performance.now(); G.shotTimer=0; G.tripleShotTimer=0;
    document.getElementById('bossRow').style.display='none';
    document.getElementById('powerupRow').style.display='none';
    G.running=true;
    if (G.checkpoint>=3) {
        G.level=G.checkpoint; G.hasForceField=true; G.shieldFuel=3; updateShieldUI();
        if(G.checkpoint===3){
            if(window.DLC&&window.DLC.loaded){
                // DLC: replace the Sans fight with the Boss Rush (cyborg comes after, as usual)
                for(let k=0;k<8;k++)spawnAsteroid();
                G.bossRushStartTime=performance.now();
                Sound.playMusic('bgm');
            } else {
                spawnBoss(3);
            }
        } else Sound.playMusic('bgm');
    }
    updateUI();
}

// ============================================================
//  UI
// ============================================================
function updateUI() {
    document.getElementById('scoreVal').innerText=G.score;
    document.getElementById('levelVal').innerText=G.level;
    document.getElementById('ammoVal').innerText=G.infAmmo?'INF':G.ammo;
    document.getElementById('timeVal').innerText=((performance.now()-G.waveStart)/1000).toFixed(1);
    if(boss){
        if(boss.type===5&&!boss.headVulnerable) document.getElementById('bossVal').innerText='SEGMENTS: '+boss.segmentsAlive;
        else document.getElementById('bossVal').innerText=boss.hp+'/'+boss.maxHp;
    }
}
function shake(i,d){
    if(settings.shake==='off') return;
    if(settings.shake==='reduced'){i*=0.4;d=Math.floor(d*0.5);}
    G.shakeIntensity=i;G.shakeTimer=d;
}

// ============================================================
//  DEBUG / CHEATS
// ============================================================
function toggleDebug() { $debug.style.display=$debug.style.display==='block'?'none':'block'; }
function toggleGodMode() { G.godMode=!G.godMode; document.getElementById('godRow').style.display=G.godMode?'block':'none'; }
function toggleInfAmmo() { G.infAmmo=!G.infAmmo; if(G.infAmmo)G.ammo=999; updateUI(); }
function toggleHyperGun() { G.hyperGun=!G.hyperGun; document.getElementById('hyperRow').style.display=G.hyperGun?'block':'none'; }
function skipLevel() { if(boss) boss.hp=0; else { asteroids=[]; spawnBoss(G.level); } }
function nukeAll() {
    boom(W/2,H/2,'white',60); Sound.explode();
    for(const a of asteroids) boom(a.x,a.y,'#888');
    asteroids=[];
    for(const m of miniBosses){boom(m.x,m.y,'purple',20);G.score+=500;}
    miniBosses=[]; enemyBullets=[]; gasterBlasters=[];
    if(boss) boss.hp-=50;
    updateUI();
}
function addCheatScore(n){G.score+=n;updateUI();}
function toggleMiniBossSpawns(){G.noMiniBoss=!G.noMiniBoss;alert('Mini boss spawns: '+(G.noMiniBoss?'OFF':'ON'));}
function toggleBossSpawns(){G.noBoss=!G.noBoss;alert('Boss spawns: '+(G.noBoss?'OFF':'ON'));}

// ============================================================
//  TEST MODE
// ============================================================
function toggleTestMode(){
    G.testMode=!G.testMode;
    const btn=document.getElementById('testModeBtn');
    btn.innerText=G.testMode?'DISABLE TEST MODE':'ENABLE TEST MODE';
    btn.style.borderColor=G.testMode?'#00ffaa':'#005500';
    btn.style.color=G.testMode?'#00ffaa':'#00ff00';
    document.getElementById('testRow').style.display=G.testMode?'block':'none';
    if(G.testMode){
        // Auto-enable helpful cheats
        G.godMode=true; G.infAmmo=true;
        document.getElementById('godRow').style.display='block';
        G.ammo=999;
        // Skip license/splash annoyances are already past at this point
        // Disable asteroid/miniboss natural spawns so you can test specific things
        G.noMiniBoss=true; G.noBoss=true;
    } else {
        G.godMode=false; G.infAmmo=false;
        document.getElementById('godRow').style.display='none';
        G.noMiniBoss=false; G.noBoss=false;
    }
    updateUI();
}
function setLevel(val){
    const n=parseInt(val);if(!n||n<1) return;
    G.level=n;G.waveStart=performance.now();G.spawnTimer=0;updateUI();
}
function setBossHP(val){
    const n=parseInt(val);if(!n||!boss) return;
    boss.hp=Math.min(n,boss.maxHp);updateUI();
}
function teleportShip(){
    ship.x=W/2;ship.y=H/2;ship.tx=0;ship.ty=0;
}
function clearAll(){
    asteroids=[];bullets=[];miniBosses=[];enemyBullets=[];gasterBlasters=[];
    ammoBoxes=[];powerups=[];particles=[];shieldFlashes=[];
    G.cyborgScraps=[];
}
function giveShield(){
    G.hasForceField=true;G.shieldFuel=getMaxShieldFuel();updateShieldUI();
}

// Practice menu
function togglePracticeMenu() {
    if(!G.practice) return;
    Sound.ui();
    if($practice.style.display==='block') { applyPractice(); }
    else { $practice.style.display='block'; G.practicePaused=true; }
}
function applyPractice() {
    pSettings.bulletSpeed=parseFloat(document.getElementById('ps_bspd').value)||8;
    pSettings.ammo=parseInt(document.getElementById('ps_ammo').value)||50;
    pSettings.b1hp=parseInt(document.getElementById('ps_b1hp').value)||25;
    pSettings.b2hp=parseInt(document.getElementById('ps_b2hp').value)||45;
    pSettings.b3hp=parseInt(document.getElementById('ps_b3hp').value)||100;
    bulletSpeed=pSettings.bulletSpeed;
    $practice.style.display='none'; G.practicePaused=false;
}

// ============================================================
//  PARTICLES / SPAWNING
// ============================================================
function boom(x,y,color,count=12) {
    if(settings.particles==='off') return;
    if(settings.particles==='reduced') count=Math.max(2,Math.floor(count*0.4));
    for(let i=0;i<count;i++){
        const a=Math.random()*Math.PI*2;
        const sp=Math.random()*3.5+0.8;
        const life=25+Math.random()*30;
        particles.push({x,y,dx:Math.cos(a)*sp,dy:Math.sin(a)*sp,life,maxLife:life+10,color,size:Math.random()*3+0.8});
    }
    // Add a few bright white sparks for extra punch
    const sparkCount=Math.max(1,Math.floor(count*0.2));
    for(let i=0;i<sparkCount;i++){
        const a=Math.random()*Math.PI*2;
        const sp=Math.random()*5+2;
        particles.push({x,y,dx:Math.cos(a)*sp,dy:Math.sin(a)*sp,life:10+Math.random()*10,maxLife:22,color:'#ffffff',size:Math.random()*1.5+0.5});
    }
}
function spawnAsteroid(x,y,r,type='normal') {
    const baseR=r||(Math.random()<0.2?55:28), verts=Math.floor(Math.random()*5)+7, offsets=[];
    for(let i=0;i<verts;i++) offsets.push((Math.random()-0.5)*baseR*0.5);
    const speed=(1.5+G.level*0.15)*(DIFFICULTY[currentDifficulty]||DIFFICULTY.normal).astSpeed;
    let dx=(Math.random()-0.5)*speed, dy=(Math.random()-0.5)*speed;
    if(G.tutorial){dx=0;dy=0;}
    asteroids.push({
        x:x??(Math.random()<0.5?-40:W+40), y:y??Math.random()*H,
        dx,dy, r:baseR, verts, offsets, type,
        angle:Math.random()*Math.PI*2, rot:(Math.random()-0.5)*0.04
    });
}
function fireBullet(offset=0) {
    bullets.push({x:ship.x+Math.cos(ship.a)*ship.r, y:ship.y+Math.sin(ship.a)*ship.r,
        dx:Math.cos(ship.a+offset)*bulletSpeed, dy:Math.sin(ship.a+offset)*bulletSpeed, trail:[]});
}
function shoot() {
    if(G.shotTimer>0||(boss&&(boss.state==='enter'||boss.state==='dialogue'))||G.gilbertDialogue) return;
    if(!G.hyperGun&&!G.infAmmo&&G.ammo<1) return;
    Sound.shoot();
    if(G.tripleShotTimer>0) {
        if(!G.hyperGun&&!G.infAmmo&&G.ammo<3) return;
        fireBullet(0);fireBullet(-0.12);fireBullet(0.12);
        if(!G.hyperGun&&!G.infAmmo) G.ammo-=3;
    } else { fireBullet(0); if(!G.hyperGun&&!G.infAmmo) G.ammo--; }
    G.shotTimer = G.hyperGun ? 1 : SHOT_CD;
    G.shotsFired++; if(G.shotsFired>=500&&window.DLC&&window.DLC.loaded)unlockAch('dlc_trigger_happy');
    updateUI();
}
function dropAmmo() { ammoBoxes.push({x:Math.random()*(W-100)+50,y:-30,dy:1.2,size:18}); }
function dropPowerup() { powerups.push({x:Math.random()*W,y:-30,dx:(Math.random()-0.5)*0.5,dy:1.3,size:22}); }
function spawnForceFieldDrop(x,y) { G.forceFieldDrop={x,y,size:35}; }
function spawnMiniBoss(typeOverride,force) {
    if(!force && miniBosses.length>=(G.level>=3?2:1)) return;
    const edge=Math.floor(Math.random()*4);
    let sx,sy;
    if(edge===0){sx=Math.random()*W;sy=-40;}else if(edge===1){sx=W+40;sy=Math.random()*H;}
    else if(edge===2){sx=Math.random()*W;sy=H+40;}else{sx=-40;sy=Math.random()*H;}
    let type=typeOverride||(Math.random()<0.3?'shooter':'chaser');
    // DLC types only after level 4
    if(!typeOverride && window.DLC&&window.DLC.loaded && G.level>=4){
        const roll=Math.random();
        if(roll<0.2) type='blaster';
        else if(roll<0.4) type='spawner';
    }
    let hp,speed,r=22;
    if(type==='blaster'){hp=18;speed=0.8;r=28;}
    else if(type==='spawner'){hp=7;speed=2.5;r=20;}
    else if(type==='shooter'){hp=12;speed=1.0;}
    else{hp=8;speed=1.6;}
    miniBosses.push({type,x:sx,y:sy,r:r,hp,maxHp:hp,
        speed,rot:0,state:'move',timer:0,blasterLocked:false,blasterTarget:null,
        dashTarget:null});
    // Gilbert intro for mini-boss types
    if(window.DLC&&window.DLC.loaded&&GILBERT_INTROS[type]) gilbertIntro(type,GILBERT_INTROS[type]);
}
function spawnEnemyBullet(x,y,angle,speed=10) {
    enemyBullets.push({x,y,dx:Math.cos(angle)*speed,dy:Math.sin(angle)*speed,life:100});
}
function spawnBoss(type) {
    for(const a of asteroids)boom(a.x,a.y,'#666'); asteroids=[];
    for(const m of miniBosses)boom(m.x,m.y,'purple',15); miniBosses=[]; enemyBullets=[]; gasterBlasters=[];
    // Type 10 uses Sans (type 3) logic internally
    const isSans = (type===3||type===10);
    const diff=DIFFICULTY[currentDifficulty]||DIFFICULTY.normal;
    let hp;
    if(type===5) hp=Math.round(10*diff.bossHp);
    else if(type===4) hp=Math.round(30*diff.bossHp);
    else if(isSans) hp=G.practice?pSettings.b3hp:Math.round(100*diff.bossHp);
    else if(G.practice) hp=type===1?pSettings.b1hp:pSettings.b2hp;
    else hp=Math.round((type===1?25:type===2?45:80)*diff.bossHp);

    if(type===5){
        // --- SNAKE BOSS ---
        boss={type:5,x:W/2,y:-80,r:30,hp,maxHp:hp,angle:Math.PI/2,dx:0,dy:2,
            state:'enter',timer:0,phase2:false,
            segments:[],segmentsAlive:0,headVulnerable:false,
            shootTimer:0,turnSpeed:0.03,moveSpeed:2.5,
            widescreenTransition:0,widescreenActive:true,
            wallSide:null,wallTimer:0};
        // Build snake: head + 10 asteroid segments with machinery connectors
        // Mini-bosses at asteroid indices 2,4,7,9 (0-indexed)
        const mbSlots={2:'blaster',4:'chaser',7:'blaster',9:'chaser'};
        boss.segments.push({x:boss.x,y:boss.y,r:30,type:'head',angle:0});
        for(let i=0;i<10;i++){
            const verts=Math.floor(Math.random()*5)+7,offsets=[];
            for(let v=0;v<verts;v++) offsets.push((Math.random()-0.5)*12);
            // Machinery connector
            boss.segments.push({x:boss.x,y:boss.y-(i*2+1)*35,r:12,type:'machinery',destroyed:false});
            // Asteroid segment
            boss.segments.push({x:boss.x,y:boss.y-(i*2+2)*35,r:25,type:'asteroid',
                hp:3,maxHp:3,destroyed:false,
                miniBoss:mbSlots[i]?{type:mbSlots[i],released:false}:null,
                verts,offsets,angle:Math.random()*Math.PI*2,rot:(Math.random()-0.5)*0.03});
        }
        boss.segmentsAlive=10;
    } else {
        boss={type,x:W/2,y:-80,r:type===4?32:45,hp,maxHp:hp,angle:Math.PI/2,dx:0,dy:2,
            state:'enter',timer:0,phase2:false,
            wallSide:null,wallTimer:0};
    }
    G.damageTakenThisBoss=false;
    document.getElementById('bossRow').style.display='block'; updateUI();
    if(type===1) Sound.playMusic('boss1');
    else if(type===2) Sound.playMusic('boss2');
    else if(isSans){ Sound.playMusic('boss3'); G.checkpoint=G.level; }
    else if(type===4) Sound.playMusic('boss4');
    else if(type===5) Sound.playMusic('boss5');
    Sound.bossWarn();
    // Gilbert intro for bosses
    if(window.DLC&&window.DLC.loaded){
        if(type===4) gilbertIntro('boss4',GILBERT_INTROS.boss4);
        if(type===5) gilbertIntro('boss5',GILBERT_INTROS.boss5);
        if(type===10) gilbertIntro('boss10',GILBERT_INTROS.boss10);
    }
}

// ============================================================
//  DAMAGE
// ============================================================
function hurtPlayer(instantKill) {
    if(G.tutorial){boom(ship.x,ship.y,'orange',8);ship.x=W/2;ship.y=H/2;ship.tx=0;ship.ty=0;return;}
    if(G.godMode) return;
    if(G.invincibleTimer>0) return;
    // Shield absorb (only available after boss 2)
    if(!instantKill && G.hasForceField && G.shieldFuel>0) {
        if(G.shieldFuel===1) unlockAch('last_stand');
        G.shieldFuel--; updateShieldUI();
        boom(ship.x,ship.y,'cyan',15); Sound.shieldSfx();
        if(G.shieldFuel<=0) boom(ship.x,ship.y,'white',30);
        G.damageTakenThisBoss=true;
        if(boss&&boss.type>=3) G.noShieldBoss3=false;
        return;
    }
    // Tank class: survive one hit (blasters bypass this)
    if(!instantKill && G.tankHP>0){
        G.tankHP--;
        G.tankDamaged=true;
        G.tankRepairTimer=900; // 15 seconds at 60fps
        G.invincibleTimer=180; // 3 seconds invincibility
        G.damageTakenThisBoss=true;
        shake(10,20); boom(ship.x,ship.y,'#ff8800',20); Sound.shieldSfx();
        return;
    }
    // One hit kill — no lives system
    G.damageTakenThisBoss=true;
    shake(8,15); boom(ship.x,ship.y,'#ff4444',25); Sound.explode();
    endGame();
}
function endGame() {
    G.running=false; Sound.playMusic('none'); Sound.explode();
    if(G.slotId){const s=saves[G.slotId];if(G.score>s.high)s.high=G.score;if(G.level>s.maxLvl)s.maxLvl=G.level;saveToDisk();
        document.getElementById('savedSlot').innerText=G.slotId;document.getElementById('savedInfo').style.display='block';
    } else document.getElementById('savedInfo').style.display='none';
    document.getElementById('finalScore').innerText=G.score; $over.style.display='block';
}
function winGame() {
    G.running=false; Sound.playMusic('none');
    if(G.slotId){const s=saves[G.slotId];if(G.score>s.high)s.high=G.score;if(G.level>s.maxLvl)s.maxLvl=G.level;saveToDisk();}
    document.getElementById('winScore').innerText=G.score; $win.style.display='block';
    if(G.tutorial) unlockAch('graduate');
    // Speed demon: beat game (non-tutorial) under 8 minutes
    if(!G.tutorial && !G.practice) {
        const totalTime = (performance.now() - G.gameStartTime) / 1000;
        if(totalTime < 480) unlockAch('speed_demon');
    }
}
function addScore(pts) {
    G.combo++; G.comboTimer=90;
    const mult=Math.min(Math.floor(G.combo/3)+1,8);
    G.score+=pts*mult;
    if(mult>=5)unlockAch('sharpshooter');
    if(mult>=8)unlockAch('combo_king');
    if(G.score>=10000)unlockAch('marksman');
    if(G.score>=25000)unlockAch('high_roller');
    if(G.score>=50000)unlockAch('legend');
    if(window.DLC&&window.DLC.loaded&&G.score>=100000)unlockAch('dlc_galactic_hero');
    if(mult>1){document.getElementById('comboRow').style.display='block';document.getElementById('comboVal').innerText=mult;}
    updateUI();
}

// ============================================================
//  TUTORIAL
// ============================================================
function updateTutorial() {
    switch(G.tutStep) {
        case 0: if(isAction('thrust'))G.tutTimer++; if(G.tutTimer>25){G.tutStep++;G.tutTimer=0;} break;
        case 1: if(isAction('left')||isAction('right'))G.tutTimer++; if(G.tutTimer>25){G.tutStep++;G.tutTimer=0;spawnAsteroid(W/2,120,20);} break;
        case 2: if(asteroids.length===0){G.tutStep++;G.tutTimer=0;G.ammo=0;updateUI();dropAmmo();}else G.ammo=999; break;
        case 3: if(G.ammo>0){G.tutStep++;G.tutTimer=0;} break;
        case 4: G.tutTimer++; if(G.tutTimer>90)winGame(); break;
    }
}
const tutMsgs=[['FLIGHT CHECK','Press W or Up Arrow to thrust'],['NAVIGATION','Use A/D or Left/Right to turn'],
    ['WEAPONS HOT','Press SPACE to destroy the target'],['RESUPPLY','Collect the green ammo box'],['SYSTEMS NOMINAL','Ready for deployment!']];

