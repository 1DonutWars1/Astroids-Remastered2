// ============================================================
//  GILBERT / BOSS RUSH (DLC)
// ============================================================

// --- Gilbert quip system (non-blocking, doesn't freeze game) ---
function gilbertQuip(text){
    if(G.albertMode) return; // Albert is silent
    if(G.gilbertState!=='rope'&&G.gilbertState!=='ally'&&G.gilbertState!=='scrap_collect') return;
    G.gilbertQuip=text;
    G.gilbertQuipTimer=180; // ~3 seconds
}
function gilbertIntro(key,text){
    // Show a quip the first time something is seen (per run)
    if(!G.gilbertSeen) G.gilbertSeen={};
    if(G.gilbertSeen[key]) return;
    G.gilbertSeen[key]=true;
    gilbertQuip(text);
}

// Intro text definitions
const GILBERT_INTROS = {
    // Mini-bosses
    chaser:   "That purple thing is a Chaser! It's dumb, just runs straight at you.",
    shooter:  "Careful, that red one's a Shooter! It'll spray bullets at you.",
    blaster:  "That skull thing is a Blaster! When it locks on, MOVE. That beam hurts.",
    spawner:  "A Spawner! Kill it fast — it shields all the asteroids while it's alive.",
    // Bosses
    boss4:    "That's... a Cyborg?! Watch out for the wall, it'll trap you on one side!",
    boss5:    "What IS that thing?! A snake?! Destroy the asteroids on its body first!",
    boss10:   "No way... that's Sans. This is the real deal. Stay sharp!",
    boss6:    "What the — do you FEEL that heat?! That thing is radiating pure fire. I've never seen anything like it... be VERY careful!",
    boss7:    "What is THAT?! It came out of nowhere — I don't think it's on any star chart!",
    // Pickups
    forcefield: "Ooh a shield! That'll absorb hits for you. Don't waste it!",
    tripleshot: "Triple shot! Now you're cookin! Chews through ammo though.",
    fuel:       "See that yellow rock? Shoot it to refuel your shield!",
    ammobox:    "There's an ammo box! Fly into it to stock up.",
};

function startBossRush(){
    G.bossRush=true; G.bossRushWave=0; G.bossRushKills=0; G.bossRushTotal=8;
    // Pause the wave timer by recording offset
    G.bossRushPauseOffset=performance.now()-G.waveStart;
    asteroids=[]; miniBosses=[]; enemyBullets=[];
    spawnBossRushWave();
}
function spawnBossRushWave(){
    G.bossRushWave++;
    // Wave 1: 2 chasers, Wave 2: 1 shooter + 1 chaser, Wave 3: 1 blaster + 1 spawner, Wave 4: 1 shooter + 1 chaser
    const waves=[
        [['chaser'],['chaser']],
        [['shooter'],['chaser']],
        [['blaster'],['spawner']],
        [['shooter'],['chaser']]
    ];
    const w=waves[Math.min(G.bossRushWave-1,waves.length-1)];
    for(const types of w){
        for(const t of types) spawnMiniBoss(t,true);
    }
}
function updateBossRush(){
    if(!G.bossRush) return;
    // Check if all mini bosses are dead in current wave
    if(miniBosses.length===0){
        if(G.bossRushWave>=4){
            // Boss rush complete — spawn Gilbert (fake boss)
            G.bossRush=false;
            spawnGilbert();
        } else {
            spawnBossRushWave();
        }
    }
}
function spawnGilbert(){
    // Gilbert enters like a boss but is friendly — fake boss warning
    G.gilbert={x:W/2,y:-60,r:30,angle:Math.random()*Math.PI*2,
        dx:(Math.random()-0.5)*1.2,dy:1.5,
        entering:true, hit:false, hp:1, enterTimer:0};
    G.gilbertState='drifting';
    Sound.bossWarn();
}
function spawnGilbertAlly(){
    G.gilbert={x:ship.x+80,y:ship.y,r:30,angle:0,
        dx:0,dy:0,entering:false,hit:true,hp:1,enterTimer:0};
    G.gilbertState='ally';
    G.rope=false;
    G.gilbertShootTimer=0;
    boom(G.gilbert.x,G.gilbert.y,'#00ff00',25);
    Sound.powerup();
}
function showGilbertDialogue(lines,callback){
    if(G.albertMode){
        // Albert skips all dialogue, just fire the callback immediately
        if(callback) callback();
        return;
    }
    G.gilbertDialogueQueue=lines.slice();
    G.gilbertDialogue=G.gilbertDialogueQueue.shift();
    G.gilbertDialogueTimer=0;
    G.gilbertDialogueCallback=callback||null;
}
function updateGilbert(){
    if(!G.gilbert||G.gilbertState==='none') return;

    // Gilbert entering from top
    if(G.gilbert.entering){
        G.gilbert.y+=G.gilbert.dy;
        if(G.gilbert.y>120){G.gilbert.entering=false;G.gilbert.dy=(Math.random()-0.5)*0.8;}
        return;
    }

    // Dialogue system
    if(G.gilbertDialogue){
        G.gilbertDialogueTimer++;
        // Advance dialogue on long timer or space press (but not shooting)
        if(G.gilbertDialogueTimer>180){
            if(G.gilbertDialogueQueue.length>0){
                G.gilbertDialogue=G.gilbertDialogueQueue.shift();
                G.gilbertDialogueTimer=0;
            } else {
                G.gilbertDialogue='';
                G.gilbertDialogueTimer=0;
                if(G.gilbertDialogueCallback){G.gilbertDialogueCallback();G.gilbertDialogueCallback=null;}
            }
        }
        return; // freeze game during dialogue
    }

    // Repair prompt state — wait for E press
    if(G.gilbertState==='repair_prompt') return;

    // Repair flash
    if(G.gilbertState==='repair_flash'){
        G.gilbertFlashTimer--;
        if(G.gilbertFlashTimer<=0){
            G.gilbertState='ally';
            G.rope=false;
            if(window.DLC&&window.DLC.loaded)unlockAch('dlc_gilberts_friend');
            showGilbertDialogue([
                "Wow, I haven't felt like this in a WHILE!",
                "I'll aid you on your journey from now on",
                "(I feel so honored to see you!)"
            ],function(){
                // Resume timer after all Gilbert events
                G.waveStart=performance.now()-G.bossRushPauseOffset;
            });
        }
        return;
    }

    // Drifting state — Gilbert floats around
    if(G.gilbertState==='drifting'){
        G.gilbert.x+=G.gilbert.dx;
        G.gilbert.y+=G.gilbert.dy;
        G.gilbert.angle+=0.01;
        // Bounce off walls
        if(G.gilbert.x<G.gilbert.r||G.gilbert.x>W-G.gilbert.r) G.gilbert.dx*=-1;
        if(G.gilbert.y<G.gilbert.r||G.gilbert.y>H-G.gilbert.r) G.gilbert.dy*=-1;

        // Check if player shoots Gilbert
        for(let j=bullets.length-1;j>=0;j--){
            if(Math.hypot(bullets[j].x-G.gilbert.x,bullets[j].y-G.gilbert.y)<G.gilbert.r+4){
                bullets.splice(j,1);
                boom(G.gilbert.x,G.gilbert.y,'#00ff88',8);
                Sound.hit();
                G.gilbertState='dialogue_hit';
                showGilbertDialogue([
                    "Ow, why'd you do that?",
                    "Oh wait, you're one of them!",
                    "You're one of the FRAGMENTS.",
                    "Hope you don't mind helpin me,",
                    "I don't really have any kind of booster",
                    "so you're going to have to drag me",
                    "around with this rope."
                ],function(){
                    G.rope=true;
                    G.gilbertState='rope';
                    // Resume timer — cyborg will come at 55s
                    G.waveStart=performance.now()-G.bossRushPauseOffset;
                });
                break;
            }
        }
        return;
    }

    // Rope state — Gilbert trails behind ship
    if(G.gilbertState==='rope'){
        const ropeLen=80;
        const toShip=Math.atan2(ship.y-G.gilbert.y,ship.x-G.gilbert.x);
        const dist=Math.hypot(ship.x-G.gilbert.x,ship.y-G.gilbert.y);
        if(dist>ropeLen){
            G.gilbert.x=ship.x-Math.cos(toShip)*ropeLen;
            G.gilbert.y=ship.y-Math.sin(toShip)*ropeLen;
        }
        // Gentle drag physics
        G.gilbert.dx+=(ship.x-ropeLen*Math.cos(ship.a)-G.gilbert.x)*0.02;
        G.gilbert.dy+=(ship.y-ropeLen*Math.sin(ship.a)-G.gilbert.y)*0.02;
        G.gilbert.dx*=0.95;G.gilbert.dy*=0.95;
        G.gilbert.x+=G.gilbert.dx;G.gilbert.y+=G.gilbert.dy;
        G.gilbert.angle+=0.02;
        // Keep on screen
        G.gilbert.x=Math.max(G.gilbert.r,Math.min(W-G.gilbert.r,G.gilbert.x));
        G.gilbert.y=Math.max(G.gilbert.r,Math.min(H-G.gilbert.r,G.gilbert.y));
        return;
    }

    // Scrap collect state — Gilbert trails, player collects scraps
    if(G.gilbertState==='scrap_collect'){
        // Same rope physics
        const ropeLen=80;
        const dist=Math.hypot(ship.x-G.gilbert.x,ship.y-G.gilbert.y);
        const toShip=Math.atan2(ship.y-G.gilbert.y,ship.x-G.gilbert.x);
        if(dist>ropeLen){
            G.gilbert.x=ship.x-Math.cos(toShip)*ropeLen;
            G.gilbert.y=ship.y-Math.sin(toShip)*ropeLen;
        }
        G.gilbert.dx+=(ship.x-ropeLen*Math.cos(ship.a)-G.gilbert.x)*0.02;
        G.gilbert.dy+=(ship.y-ropeLen*Math.sin(ship.a)-G.gilbert.y)*0.02;
        G.gilbert.dx*=0.95;G.gilbert.dy*=0.95;
        G.gilbert.x+=G.gilbert.dx;G.gilbert.y+=G.gilbert.dy;
        G.gilbert.angle+=0.02;
        G.gilbert.x=Math.max(G.gilbert.r,Math.min(W-G.gilbert.r,G.gilbert.x));
        G.gilbert.y=Math.max(G.gilbert.r,Math.min(H-G.gilbert.r,G.gilbert.y));

        // Check scrap pickup
        for(let i=G.cyborgScraps.length-1;i>=0;i--){
            const sc=G.cyborgScraps[i];
            if(Math.hypot(ship.x-sc.x,ship.y-sc.y)<ship.r+sc.r){
                boom(sc.x,sc.y,'#00ff88',10);Sound.powerup();
                G.cyborgScraps.splice(i,1);
                G.scrapsCollected++;
            }
        }
        if(G.scrapsCollected>=G.scrapsNeeded){
            G.gilbertState='repair_dialogue';
            showGilbertDialogue([
                "These look familiar...",
                "I don't care though,",
                "just fix me up would ya?"
            ],function(){
                G.gilbertState='repair_prompt';
            });
        }
        return;
    }

    // Ally state — Gilbert fights alongside player
    if(G.gilbertState==='ally'){
        // Skip normal ally AI during finisher — boss update handles Gilbert's movement
        if(boss&&(boss.type===3||boss.type===10)&&boss.state==='gilbert_finisher') return;
        // Gilbert orbits near player loosely
        const idealDist=100;
        const toShipA=Math.atan2(ship.y-G.gilbert.y,ship.x-G.gilbert.x);
        const dist=Math.hypot(ship.x-G.gilbert.x,ship.y-G.gilbert.y);
        if(dist>idealDist+30){
            G.gilbert.dx+=Math.cos(toShipA)*0.15;
            G.gilbert.dy+=Math.sin(toShipA)*0.15;
        } else if(dist<idealDist-30){
            G.gilbert.dx-=Math.cos(toShipA)*0.1;
            G.gilbert.dy-=Math.sin(toShipA)*0.1;
        }
        G.gilbert.dx*=0.97;G.gilbert.dy*=0.97;
        G.gilbert.x+=G.gilbert.dx;G.gilbert.y+=G.gilbert.dy;
        // Keep on screen
        if(G.gilbert.x<G.gilbert.r)G.gilbert.x=G.gilbert.r;
        if(G.gilbert.x>W-G.gilbert.r)G.gilbert.x=W-G.gilbert.r;
        if(G.gilbert.y<G.gilbert.r)G.gilbert.y=G.gilbert.r;
        if(G.gilbert.y>H-G.gilbert.r)G.gilbert.y=H-G.gilbert.r;

        // Gilbert shoots at nearest asteroid or boss (faster during Sans phase 2)
        const isP2Fight=boss&&(boss.type===3||boss.type===10)&&boss.phase2;
        G.gilbertShootTimer++;
        const gFireRate=Math.max(10,(isP2Fight?25:45)-(G.gilbertUpgrades.fireRate||0)*8);
        const gRange=400+(G.gilbertUpgrades.range||0)*100;
        // Find nearest target for aiming
        let aimTarget=null,aimMinD=gRange;
        for(const a of asteroids){
            if(a.type==='fuel') continue;
            const d=Math.hypot(a.x-G.gilbert.x,a.y-G.gilbert.y);
            if(d<aimMinD){aimMinD=d;aimTarget={x:a.x,y:a.y};}
        }
        for(const mb of miniBosses){
            const d=Math.hypot(mb.x-G.gilbert.x,mb.y-G.gilbert.y);
            if(d<aimMinD){aimMinD=d;aimTarget={x:mb.x,y:mb.y};}
        }
        if(boss&&boss.state!=='enter'&&boss.state!=='dialogue'){
            const d=Math.hypot(boss.x-G.gilbert.x,boss.y-G.gilbert.y);
            if(d<aimMinD){aimMinD=d;aimTarget={x:boss.x,y:boss.y};}
        }
        // Face toward target (smooth rotation)
        if(aimTarget){
            const goalAngle=Math.atan2(aimTarget.y-G.gilbert.y,aimTarget.x-G.gilbert.x);
            let diff=goalAngle-G.gilbert.angle;
            while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
            G.gilbert.angle+=diff*0.12;
        } else {
            // Slow idle spin when no target
            G.gilbert.angle+=0.01;
        }
        // Suppress Gilbert shooting while NEXUS sequence is being input
        if(G.nexusListening&&!G.nexusDefeated&&G.level<=3){ return; }
        if(G.gilbertShootTimer>gFireRate&&aimTarget){
            const angle=Math.atan2(aimTarget.y-G.gilbert.y,aimTarget.x-G.gilbert.x);
            bullets.push({x:G.gilbert.x+Math.cos(angle)*G.gilbert.r,
                y:G.gilbert.y+Math.sin(angle)*G.gilbert.r,
                dx:Math.cos(angle)*6,dy:Math.sin(angle)*6,trail:[],gilbert:true});
            G.gilbertShootTimer=0;
        }
        return;
    }
}
function spawnCyborgScraps(x,y){
    G.cyborgScraps=[];
    G.scrapsCollected=0;
    for(let i=0;i<G.scrapsNeeded;i++){
        const angle=Math.random()*Math.PI*2;
        const dist=60+Math.random()*200;
        const sx=Math.max(20,Math.min(W-20,x+Math.cos(angle)*dist));
        const sy=Math.max(20,Math.min(H-20,y+Math.sin(angle)*dist));
        G.cyborgScraps.push({
            x:sx, y:sy,
            r:15,dx:(Math.random()-0.5)*1.5,dy:(Math.random()-0.5)*1.5,
            angle:Math.random()*Math.PI*2,rot:(Math.random()-0.5)*0.05
        });
    }
}

