// ============================================================
//  LEVEL 6 — THE ROUGE WAR
//  Scavenger ambush, kidnap, arena fight, battlefield rescue
// ============================================================

// Global state containers
var rouges = [];
var battleBots = [];      // {team:'rouge'|'alliance', x,y,vx,vy,angle,hp,shootTimer,state}
var battleBullets = [];   // bullets fired by bots (separate from enemyBullets)

G.level6 = {
    state: null,          // null | 'warning' | 'rouges' | 'kidnap_warn' | 'kidnap_grab'
                          //       | 'arena_enter' | 'arena' | 'arena_surround'
                          //       | 'rescue_arrive' | 'rescue_dialog' | 'ambush'
                          //       | 'battlefield' | 'gilbert_yell' | 'gilbert_found'
                          //       | 'charging' | 'released' | 'victory' | 'failed'
    timer: 0,
    clockStart: 0,        // performance.now at level start
    rouges_spawned: 0,
    arenaWave: 0,
    arenaKills: 0,
    gilbertPos: {x:0,y:0},// location of gilbert in battlefield world
    camera: {x:0,y:0},    // camera offset for battlefield mode
    worldW: 2700, worldH: 1950,
    chargeHold: 0,        // frames space held during 'charging'
    bigShotUnlocked: false,
    bigShotReady: false,  // false until charged + released
    arrowAngle: 0,
    captainShip: null,    // alliance captain ship data
    shake: 0,
};

// ============================================================
//  ENTRY POINT (called from leaveStation when level>=6 + DLC)
// ============================================================
function startLevel6(){
    if(!(window.DLC && window.DLC.loaded)) return;
    G.level6.state='warning_pending';
    G.level6.timer=0;
    G.level6.clockStart=performance.now();
    G.level6.rouges_spawned=0;
    rouges.length=0; battleBots.length=0; battleBullets.length=0;
    // Ensure player has shields for this intense level
    if(G.hasForceField && G.shieldFuel<3) G.shieldFuel=3;
    updateShieldUI();
}

// ============================================================
//  ROUGE MINIBOSS
//  AI-controlled player-like ship: 1 HP, 3 shield pips, forcefield
// ============================================================
function spawnRouge(opts){
    opts=opts||{};
    const edge=Math.floor(Math.random()*4);
    let sx,sy;
    if(opts.x!==undefined){sx=opts.x;sy=opts.y;}
    else if(edge===0){sx=Math.random()*W;sy=-40;}
    else if(edge===1){sx=W+40;sy=Math.random()*H;}
    else if(edge===2){sx=Math.random()*W;sy=H+40;}
    else{sx=-40;sy=Math.random()*H;}
    rouges.push({
        x:sx, y:sy, vx:0, vy:0, angle:Math.atan2(ship.y-sy,ship.x-sx),
        r:13, hp:1, maxHp:1, shields:2, maxShields:2,
        shootTimer:90+Math.random()*60,
        state:'approach',           // approach | strafe | dash | orbit
        stateTimer:0,
        strafeDir: Math.random()<0.5?1:-1,
        thrustFlame:0,
        captive:!!opts.captive,
        lockedArena:!!opts.lockedArena,
        arenaCenter:opts.arenaCenter||null,
        orbit:opts.orbit||null,     // {center, radius, angle, angularVel} — decorative orbiters
        decorative:!!opts.decorative, // doesn't shoot or damage
        shieldFlash:0,
    });
}

function updateRouges(){
    const safe=G.level6 && (G.level6.state==='arena_surround'||G.level6.state==='kidnap_grab'||G.level6.state==='rescue_arrive'||G.level6.state==='rescue_dialog');
    for(let i=rouges.length-1;i>=0;i--){
        const r=rouges[i];
        r.stateTimer++;
        if(r.shieldFlash>0) r.shieldFlash--;
        const dx=ship.x-r.x, dy=ship.y-r.y;
        const dist=Math.hypot(dx,dy);
        const targetAngle=Math.atan2(dy,dx);

        // DECORATIVE ORBITERS — circle the player/center, no damage, no shooting
        if(r.decorative && r.orbit){
            r.orbit.angle+=r.orbit.angularVel;
            const cx=r.orbit.center.x(), cy=r.orbit.center.y();
            r.x=cx+Math.cos(r.orbit.angle)*r.orbit.radius;
            r.y=cy+Math.sin(r.orbit.angle)*r.orbit.radius;
            // Face tangent direction (travel direction)
            const tangent=r.orbit.angle+(r.orbit.angularVel>0?Math.PI/2:-Math.PI/2);
            let da=((tangent-r.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
            r.angle+=da*0.15;
            r.thrustFlame=0.5;
            // Still take damage from player bullets (bigger hit area — easier to pick off)
            for(let j=bullets.length-1;j>=0;j--){
                const b=bullets[j];
                if(Math.hypot(b.x-r.x,b.y-r.y)<r.r+12){
                    bullets.splice(j,1);
                    if(r.shields>0){r.shields--;r.shieldFlash=12;boom(b.x,b.y,'#00ffff',6);if(typeof Sound!=='undefined'&&Sound.hit)Sound.hit();}
                    else{r.hp--;boom(b.x,b.y,'#ff8800',6);if(typeof Sound!=='undefined'&&Sound.hit)Sound.hit();
                        if(r.hp<=0){boom(r.x,r.y,'#ff6600',30);if(typeof Sound!=='undefined'&&Sound.explode)Sound.explode();addScore(400);G.mb+=4;rouges.splice(i,1);break;}}
                }
            }
            continue;
        }

        // Smooth rotate
        let da=((targetAngle-r.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
        r.angle+=da*0.07;

        // AI state machine (weakened for easier combat)
        if(r.state==='approach'){
            r.vx+=Math.cos(r.angle)*0.10;
            r.vy+=Math.sin(r.angle)*0.10;
            r.thrustFlame=0.9;
            if(dist<220||r.stateTimer>180){r.state='strafe';r.stateTimer=0;}
        } else if(r.state==='strafe'){
            const perp=r.angle+Math.PI/2*r.strafeDir;
            r.vx+=Math.cos(perp)*0.09;
            r.vy+=Math.sin(perp)*0.09;
            if(dist>280){r.vx+=Math.cos(r.angle)*0.06;r.vy+=Math.sin(r.angle)*0.06;}
            if(dist<170){r.vx-=Math.cos(r.angle)*0.08;r.vy-=Math.sin(r.angle)*0.08;}
            r.thrustFlame=0.5+Math.random()*0.3;
            if(r.stateTimer>140){
                // Less frequent dashes (20% instead of 40%)
                if(Math.random()<0.2){r.state='dash';r.stateTimer=0;}
                else{r.strafeDir*=-1;r.stateTimer=0;}
            }
        } else if(r.state==='dash'){
            r.vx+=Math.cos(r.angle)*0.25;
            r.vy+=Math.sin(r.angle)*0.25;
            r.thrustFlame=1.2;
            if(r.stateTimer>35){r.state='strafe';r.stateTimer=0;}
        }
        // Apply velocity with drag
        r.vx*=0.93; r.vy*=0.93;
        const sp=Math.hypot(r.vx,r.vy);
        const maxSp=r.state==='dash'?4:2.6;
        if(sp>maxSp){r.vx=r.vx/sp*maxSp;r.vy=r.vy/sp*maxSp;}
        r.x+=r.vx; r.y+=r.vy;

        // Arena containment — larger radius now
        if(r.lockedArena && r.arenaCenter){
            const ac=r.arenaCenter;
            const adx=r.x-ac.x, ady=r.y-ac.y;
            const ad=Math.hypot(adx,ady);
            const maxR=280;
            if(ad>maxR){
                r.x=ac.x+adx/ad*maxR;
                r.y=ac.y+ady/ad*maxR;
                r.vx*=-0.3; r.vy*=-0.3;
            }
        } else {
            if(r.x<-30)r.x=W+30; if(r.x>W+30)r.x=-30;
            if(r.y<-30)r.y=H+30; if(r.y>H+30)r.y=-30;
        }

        // Shooting (slower cadence, not during safe phases)
        r.shootTimer--;
        if(!safe && r.shootTimer<=0 && Math.abs(da)<0.35 && dist<380){
            const bs=5.5;
            enemyBullets.push({
                x:r.x+Math.cos(r.angle)*r.r,
                y:r.y+Math.sin(r.angle)*r.r,
                dx:Math.cos(r.angle)*bs,
                dy:Math.sin(r.angle)*bs,
                life:140, fromRouge:true
            });
            if(typeof Sound!=='undefined' && Sound.shoot) Sound.shoot();
            r.shootTimer=90+Math.random()*70;
        }

        // Collision with player — smaller hitbox (harder to bump into)
        if(!safe && dist<ship.r*0.4+r.r*0.55){
            hurtPlayer();
            boom(r.x,r.y,'#ff6600',15);
        }

        // Player bullets hit rouge — bigger hitbox (easier to shoot)
        for(let j=bullets.length-1;j>=0;j--){
            const b=bullets[j];
            if(Math.hypot(b.x-r.x,b.y-r.y)<r.r+12){
                const bigDmg=b.big?(b.damage||5):1;
                bullets.splice(j,1);
                // Shield absorbs first (but big shot can punch through)
                if(r.shields>0 && !b.big){
                    r.shields--;
                    r.shieldFlash=12;
                    boom(b.x,b.y,'#00ffff',6);
                    if(typeof Sound!=='undefined'&&Sound.hit) Sound.hit();
                } else {
                    r.hp-=bigDmg;
                    // Big shot also pops shields
                    if(b.big) r.shields=0;
                    boom(b.x,b.y,'#ff8800',6);
                    if(typeof Sound!=='undefined'&&Sound.hit) Sound.hit();
                    if(r.hp<=0){
                        boom(r.x,r.y,'#ff6600',30);
                        if(typeof Sound!=='undefined'&&Sound.explode) Sound.explode();
                        addScore(700); G.mb+=7;
                        rouges.splice(i,1);
                        G.level6.arenaKills++;
                        break;
                    }
                }
            }
        }
    }
}

function drawRouges(){
    const T=performance.now();
    for(const r of rouges){
        ctx.save();
        ctx.translate(r.x,r.y);
        // Shield bubble
        if(r.shields>0){
            const sp=0.55+Math.sin(T/200+r.x)*0.15+(r.shieldFlash>0?0.4:0);
            ctx.globalAlpha=sp*0.5;
            ctx.strokeStyle='#ff8833';
            ctx.lineWidth=1.5+(r.shieldFlash>0?1.5:0);
            ctx.shadowBlur=15;ctx.shadowColor='#ff6600';
            ctx.beginPath();ctx.arc(0,0,r.r+8,0,Math.PI*2);ctx.stroke();
            // Inner hex facets
            ctx.globalAlpha=sp*0.25;ctx.lineWidth=0.8;
            for(let h=0;h<6;h++){
                const a1=h*Math.PI/3, a2=(h+1)*Math.PI/3;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a1)*(r.r+8),Math.sin(a1)*(r.r+8));
                ctx.lineTo(Math.cos(a2)*(r.r+8),Math.sin(a2)*(r.r+8));
                ctx.stroke();
            }
            ctx.shadowBlur=0;ctx.globalAlpha=1;
        }
        ctx.rotate(r.angle);
        // Thrust flame
        if(r.thrustFlame>0){
            const flLen=10+r.thrustFlame*10+Math.random()*3;
            ctx.shadowBlur=18;ctx.shadowColor='#ff4400';
            ctx.globalAlpha=0.6;
            ctx.fillStyle='#ff6600';
            ctx.beginPath();ctx.moveTo(-r.r*0.7,3);ctx.lineTo(-r.r*0.7-flLen,0);ctx.lineTo(-r.r*0.7,-3);ctx.closePath();ctx.fill();
            ctx.globalAlpha=0.9;ctx.fillStyle='#ffaa00';
            ctx.beginPath();ctx.moveTo(-r.r*0.7,1.5);ctx.lineTo(-r.r*0.7-flLen*0.6,0);ctx.lineTo(-r.r*0.7,-1.5);ctx.closePath();ctx.fill();
            ctx.globalAlpha=1;ctx.shadowBlur=0;
        }
        // Hull — triangular ship, orange/red pirate coloring
        ctx.shadowBlur=12;ctx.shadowColor='#ff4400';
        ctx.beginPath();
        ctx.moveTo(r.r,0);
        ctx.lineTo(-r.r*0.7,r.r*0.85);
        ctx.lineTo(-r.r*0.4,0);
        ctx.lineTo(-r.r*0.7,-r.r*0.85);
        ctx.closePath();
        const hg=ctx.createLinearGradient(0,-r.r,0,r.r);
        hg.addColorStop(0,'#4a1200');hg.addColorStop(0.5,'#2a0a00');hg.addColorStop(1,'#1a0500');
        ctx.fillStyle=hg;ctx.fill();
        ctx.strokeStyle='#ff6622';ctx.lineWidth=1.8;ctx.stroke();
        ctx.shadowBlur=0;
        // Pirate stripe
        ctx.strokeStyle='rgba(255,180,40,0.4)';ctx.lineWidth=0.8;
        ctx.beginPath();ctx.moveTo(r.r*0.5,-2);ctx.lineTo(-r.r*0.3,-2);ctx.stroke();
        ctx.beginPath();ctx.moveTo(r.r*0.5,2);ctx.lineTo(-r.r*0.3,2);ctx.stroke();
        // Cockpit (red)
        const cp=ctx.createRadialGradient(r.r*0.2,0,0,r.r*0.2,0,4);
        cp.addColorStop(0,'#ffffff');cp.addColorStop(0.4,'#ff3300');cp.addColorStop(1,'transparent');
        ctx.fillStyle=cp;ctx.beginPath();ctx.arc(r.r*0.2,0,4,0,Math.PI*2);ctx.fill();
        ctx.restore();

        // Shield pip indicator (tiny, above ship)
        const pipY=r.y-r.r-14;
        for(let p=0;p<r.maxShields;p++){
            ctx.fillStyle=p<r.shields?'#ff8833':'rgba(60,30,10,0.6)';
            if(p<r.shields){ctx.shadowBlur=5;ctx.shadowColor='#ff6600';}
            ctx.fillRect(r.x-r.maxShields*3.5+p*7,pipY,5,2.5);
            ctx.shadowBlur=0;
        }
    }
}

// ============================================================
//  BATTLEFIELD BOTS
//  Simple AI: pick nearest enemy, fly toward & shoot
// ============================================================
function spawnBattleBot(team, x, y){
    battleBots.push({
        team:team, x:x, y:y, vx:0, vy:0, angle:Math.random()*Math.PI*2,
        hp:team==='alliance'?4:3, maxHp:team==='alliance'?4:3,
        shootTimer:30+Math.random()*60, targetIdx:-1,
        thrustFlame:0, r:18
    });
}

// Gilbert figure drawing helper — matches engine.js's Gilbert ally appearance
function drawGilbertFigure(ctx, r, opts){
    opts=opts||{};
    const T=performance.now();
    const flash=!!opts.flash;
    const eyePulse=0.7+Math.sin(T/180)*0.3;
    ctx.shadowBlur=18;ctx.shadowColor='#00cc44';
    ctx.fillStyle='#0a200a';ctx.strokeStyle='#44ff44';ctx.lineWidth=2.5;
    // Hybrid spaceship-asteroid shape
    ctx.beginPath();
    ctx.moveTo(r+4,0);
    ctx.lineTo(r*0.6,-r*0.5);
    ctx.lineTo(r*0.2,-r*0.9);
    ctx.lineTo(-r*0.3,-r*0.7);
    ctx.lineTo(-r*0.8,-r*0.6);
    ctx.lineTo(-r,-r*0.2);
    ctx.lineTo(-r*0.7,0);
    ctx.lineTo(-r,r*0.2);
    ctx.lineTo(-r*0.8,r*0.6);
    ctx.lineTo(-r*0.3,r*0.7);
    ctx.lineTo(r*0.2,r*0.9);
    ctx.lineTo(r*0.6,r*0.5);
    ctx.closePath();
    ctx.fill();ctx.stroke();
    // Crater details
    ctx.strokeStyle='rgba(68,255,68,0.2)';ctx.lineWidth=0.8;
    ctx.beginPath();ctx.arc(r*0.1,-r*0.2,r*0.25,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(68,255,68,0.06)';
    ctx.beginPath();ctx.arc(r*0.1,-r*0.2,r*0.18,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(68,255,68,0.15)';ctx.lineWidth=0.6;
    ctx.beginPath();ctx.arc(-r*0.3,r*0.15,r*0.15,0,Math.PI*2);ctx.stroke();
    // Bolts
    ctx.fillStyle='rgba(68,255,68,0.3)';
    ctx.beginPath();ctx.arc(-r*0.5,0,2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(r*0.1,r*0.4,1.5,0,Math.PI*2);ctx.fill();
    // Eye outer glow
    const eyeOG=ctx.createRadialGradient(r*0.25,0,0,r*0.25,0,10);
    eyeOG.addColorStop(0,'rgba(0,255,68,0.4)');eyeOG.addColorStop(1,'transparent');
    ctx.fillStyle=eyeOG;ctx.globalAlpha=0.4*eyePulse;
    ctx.beginPath();ctx.arc(r*0.25,0,10,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
    // Eye
    ctx.fillStyle=flash?'#fff':`rgba(0,255,68,${eyePulse})`;
    ctx.shadowBlur=20;ctx.shadowColor='#00ff44';
    ctx.beginPath();ctx.arc(r*0.25,0,5,0,Math.PI*2);ctx.fill();
    // Pupil
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(r*0.25,0,1.8,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
}

// Battlefield debris — static floating wreckage
var battleDebris = [];
function spawnBattleDebris(x,y){
    battleDebris.push({
        x:x, y:y,
        vx:(Math.random()-0.5)*0.15, vy:(Math.random()-0.5)*0.15,
        angle:Math.random()*Math.PI*2, rot:(Math.random()-0.5)*0.008,
        type:Math.floor(Math.random()*3), size:8+Math.random()*14
    });
}
function updateBattleDebris(){
    const s=G.level6;
    for(const d of battleDebris){
        d.x+=d.vx; d.y+=d.vy; d.angle+=d.rot;
        // Gentle world bounds
        if(d.x<0||d.x>s.worldW) d.vx*=-1;
        if(d.y<0||d.y>s.worldH) d.vy*=-1;
    }
}
function drawBattleDebris(){
    const s=G.level6;
    for(const d of battleDebris){
        const sx=d.x-s.camera.x, sy=d.y-s.camera.y;
        if(sx<-50||sx>W+50||sy<-50||sy>H+50) continue;
        ctx.save();ctx.translate(sx,sy);ctx.rotate(d.angle);
        ctx.globalAlpha=0.55;
        if(d.type===0){
            // Hull fragment
            ctx.fillStyle='#3a2820';ctx.strokeStyle='#6a4838';ctx.lineWidth=1;
            ctx.beginPath();
            ctx.moveTo(-d.size,-d.size*0.3);ctx.lineTo(d.size*0.7,-d.size*0.5);
            ctx.lineTo(d.size,d.size*0.2);ctx.lineTo(-d.size*0.3,d.size*0.5);
            ctx.closePath();ctx.fill();ctx.stroke();
            // Panel lines
            ctx.strokeStyle='rgba(120,80,60,0.4)';ctx.lineWidth=0.5;
            ctx.beginPath();ctx.moveTo(-d.size*0.5,0);ctx.lineTo(d.size*0.5,0);ctx.stroke();
        } else if(d.type===1){
            // Engine bell
            ctx.fillStyle='#1a1a2e';ctx.strokeStyle='#4466aa';ctx.lineWidth=1.2;
            ctx.beginPath();ctx.arc(0,0,d.size*0.6,0,Math.PI*2);ctx.fill();ctx.stroke();
            ctx.fillStyle='rgba(100,140,200,0.3)';
            ctx.beginPath();ctx.arc(0,0,d.size*0.3,0,Math.PI*2);ctx.fill();
        } else {
            // Girder/beam
            ctx.fillStyle='#2a2418';ctx.strokeStyle='#5a4828';ctx.lineWidth=1;
            ctx.fillRect(-d.size,-d.size*0.15,d.size*2,d.size*0.3);
            ctx.strokeRect(-d.size,-d.size*0.15,d.size*2,d.size*0.3);
            // Rivets
            ctx.fillStyle='#6a5838';
            for(let rv=-d.size*0.7;rv<d.size*0.7;rv+=d.size*0.4){
                ctx.fillRect(rv-0.5,-0.5,1,1);
            }
        }
        ctx.globalAlpha=1;
        ctx.restore();
    }
}

function updateBattleBots(){
    const s=G.level6;
    const playerWX=ship.x+s.camera.x, playerWY=ship.y+s.camera.y;
    // Cap how many rouges target the player at once (to not overwhelm them)
    let playerTargetCount=0;
    for(const b of battleBots){if(b.targetingPlayer) playerTargetCount++;}
    const MAX_PLAYER_TARGETERS=3;
    for(let i=battleBots.length-1;i>=0;i--){
        const b=battleBots[i];
        // Captor orbit behavior — circle Gilbert instead of fighting
        if(b.captor && s.gilbertPos){
            b.orbitAngle+=0.018;
            const tx=s.gilbertPos.x+Math.cos(b.orbitAngle)*b.orbitRadius;
            const ty=s.gilbertPos.y+Math.sin(b.orbitAngle)*b.orbitRadius;
            b.x+=(tx-b.x)*0.15; b.y+=(ty-b.y)*0.15;
            b.angle=b.orbitAngle+Math.PI/2;
            b.thrustFlame=0.3;
            continue;
        }
        // Rouges may target the player — but only a few at a time
        const playerD=Math.hypot(playerWX-b.x,playerWY-b.y);
        // Keep previously-targeting rouges targeting player; only switch fresh ones up to cap
        let targetingPlayer = false;
        if(b.team==='rouge'){
            if(b.targetingPlayer){
                // Keep targeting if still close enough, else drop
                if(playerD<650) targetingPlayer=true;
                else b.targetingPlayer=false;
            } else if(playerD<350 && playerTargetCount<MAX_PLAYER_TARGETERS){
                targetingPlayer=true;
                b.targetingPlayer=true;
                playerTargetCount++;
            }
        }
        // Validate current target first — invalidate if it points at a teammate,
        // a captor, or is out of range after an array splice. This prevents a
        // one-frame drift bug that made larger alliance bots (Krat) visibly stall.
        if(b.targetIdx>=0){
            const tCheck = (b.targetIdx<battleBots.length)?battleBots[b.targetIdx]:null;
            if(!tCheck || tCheck.team===b.team || tCheck.captor) b.targetIdx=-1;
        }
        // Find target — alliance prioritizes rouges attacking the player (Gilbert strongly)
        if(b.shootTimer%15===0 || b.targetIdx<0){
            let bestD=1e9, bestI=-1;
            for(let j=0;j<battleBots.length;j++){
                if(j===i) continue;
                const o=battleBots[j];
                if(o.team===b.team) continue;
                if(o.captor) continue;
                const d=Math.hypot(o.x-b.x,o.y-b.y);
                // Gilbert + Krail very strongly protect player (25% eff dist on player-targeters).
                // Regular alliance at 40%.
                const mult = o.targetingPlayer ? ((b.isGilbert||b.isKrail)?0.25:(b.team==='alliance'?0.4:1)) : 1;
                const effD = d*mult;
                if(effD<bestD){bestD=effD;bestI=j;}
            }
            b.targetIdx=bestI;
        }
        // Decide actual target: player takes priority for rouges when close
        let tx,ty,d,ta;
        if(targetingPlayer){
            tx=playerWX; ty=playerWY; d=playerD; ta=Math.atan2(ty-b.y,tx-b.x);
        } else if(b.targetIdx>=0 && b.targetIdx<battleBots.length && battleBots[b.targetIdx]){
            const t=battleBots[b.targetIdx];
            tx=t.x; ty=t.y;
            d=Math.hypot(tx-b.x,ty-b.y);
            ta=Math.atan2(ty-b.y,tx-b.x);
        } else {
            // No enemies exist — drift with decay
            b.x+=b.vx; b.y+=b.vy; b.vx*=0.9; b.vy*=0.9; continue;
        }
        let da=((ta-b.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
        b.angle+=da*0.05;
        // Movement forces
        if(d>200){
            b.vx+=Math.cos(b.angle)*0.06;
            b.vy+=Math.sin(b.angle)*0.06;
            b.thrustFlame=0.5;
        } else if(d<140){
            b.vx-=Math.cos(b.angle)*0.04;
            b.vy-=Math.sin(b.angle)*0.04;
            b.thrustFlame=0.25;
        } else {
            const perp=b.angle+Math.PI/2;
            b.vx+=Math.cos(perp)*0.025*((b.x*7)%2<1?1:-1);
            b.vy+=Math.sin(perp)*0.025*((b.x*7)%2<1?1:-1);
            b.thrustFlame=0.3;
        }
        // Shoot
        b.shootTimer--;
        if(b.shootTimer<=0 && Math.abs(da)<0.6 && d<460){
            if(b.isGilbert || b.isKrail){
                // Triple-shot spread, 2 damage per bullet, extra glow
                for(let sp=-1;sp<=1;sp++){
                    const a=b.angle+sp*0.12;
                    battleBullets.push({
                        x:b.x+Math.cos(a)*b.r,
                        y:b.y+Math.sin(a)*b.r,
                        dx:Math.cos(a)*12, dy:Math.sin(a)*12,
                        life:90, team:'alliance', damage:2,
                        gilbert:!!b.isGilbert, krail:!!b.isKrail
                    });
                }
                b.shootTimer = 22+Math.random()*15;
            } else {
                // Rouges shoot slower projectiles; alliance stay fast
                const bspd=b.team==='rouge'?6:10;
                const blife=b.team==='rouge'?130:80;
                battleBullets.push({
                    x:b.x+Math.cos(b.angle)*b.r,
                    y:b.y+Math.sin(b.angle)*b.r,
                    dx:Math.cos(b.angle)*bspd, dy:Math.sin(b.angle)*bspd,
                    life:blife, team:b.team, damage:1
                });
                if(b.team==='alliance'){
                    b.shootTimer = 35+Math.random()*30;
                } else {
                    b.shootTimer = targetingPlayer ? (55+Math.random()*40) : (75+Math.random()*55);
                }
            }
        }
        // Separation force — push away from same-team neighbors so they spread out
        let sepX=0, sepY=0, near=0;
        for(let j=0;j<battleBots.length;j++){
            if(j===i) continue;
            const o=battleBots[j];
            if(o.team!==b.team) continue;
            if(o.captor) continue;
            const sdx=b.x-o.x, sdy=b.y-o.y;
            const sd=Math.hypot(sdx,sdy);
            if(sd>0 && sd<80){
                // Weight inversely by distance
                const w=(80-sd)/80;
                sepX+=sdx/sd*w; sepY+=sdy/sd*w;
                near++;
            }
        }
        if(near>0){
            b.vx+=sepX*0.15; b.vy+=sepY*0.15;
        }
        // Drag and cap — Gilbert + Krail are faster
        b.vx*=0.90; b.vy*=0.90;
        const sp=Math.hypot(b.vx,b.vy);
        const maxSp=(b.isGilbert||b.isKrail)?2.8:1.8;
        if(sp>maxSp){b.vx=b.vx/sp*maxSp;b.vy=b.vy/sp*maxSp;}
        b.x+=b.vx; b.y+=b.vy;
        // World bounds
        const W6=G.level6.worldW, H6=G.level6.worldH;
        if(b.x<20){b.x=20;b.vx=Math.abs(b.vx);}
        if(b.x>W6-20){b.x=W6-20;b.vx=-Math.abs(b.vx);}
        if(b.y<20){b.y=20;b.vy=Math.abs(b.vy);}
        if(b.y>H6-20){b.y=H6-20;b.vy=-Math.abs(b.vy);}
    }
    // Battle bullets
    for(let i=battleBullets.length-1;i>=0;i--){
        const bl=battleBullets[i];
        bl.x+=bl.dx; bl.y+=bl.dy; bl.life--;
        if(bl.life<=0){battleBullets.splice(i,1);continue;}
        // Hit bots (opposite team only)
        let hit=false;
        for(let j=battleBots.length-1;j>=0;j--){
            const b=battleBots[j];
            if(b.team===bl.team) continue;
            if(b.captor) continue; // captors are invulnerable until the rescue shockwave
            if(Math.hypot(b.x-bl.x,b.y-bl.y)<b.r+3){
                b.hp-=(bl.damage||1);
                const col=bl.gilbert?'#44ff66':(bl.team==='rouge'?'#ff6600':'#88ccff');
                boom(bl.x,bl.y,col,4);
                if(b.hp<=0){
                    boom(b.x,b.y,col,22);
                    spawnBattleDebris(b.x,b.y);
                    battleBots.splice(j,1);
                }
                hit=true; break;
            }
        }
        if(hit){battleBullets.splice(i,1);continue;}
        // Hit player (rouge bullets only)
        if(bl.team==='rouge'){
            const worldShipX=ship.x+G.level6.camera.x;
            const worldShipY=ship.y+G.level6.camera.y;
            const d=Math.hypot(bl.x-worldShipX,bl.y-worldShipY);
            // Shield absorb
            if(G.hasForceField && G.shieldFuel>0 && d<ship.r+12){
                G.shieldFuel--; updateShieldUI();
                boom(worldShipX-G.level6.camera.x,worldShipY-G.level6.camera.y,'cyan',10);
                if(typeof Sound!=='undefined' && Sound.shieldSfx) Sound.shieldSfx();
                if(G.shieldFuel<=0) boom(worldShipX-G.level6.camera.x,worldShipY-G.level6.camera.y,'white',30);
                battleBullets.splice(i,1);
                continue;
            }
            if(d<ship.r*0.55){
                hurtPlayer();
                battleBullets.splice(i,1);
                continue;
            }
        }
    }
}

function drawBattleBot(b){
    // Gilbert uses his own figure
    if(b.isGilbert){
        ctx.save();
        ctx.translate(b.x,b.y);
        ctx.rotate(b.angle);
        // Tag: pulsing green ring so player can spot him
        const T=performance.now();
        const p=0.5+Math.sin(T/300)*0.3;
        ctx.strokeStyle=`rgba(68,255,68,${p*0.5})`;ctx.lineWidth=1.5;
        ctx.shadowBlur=15;ctx.shadowColor='#44ff44';
        ctx.beginPath();ctx.arc(0,0,b.r+6,0,Math.PI*2);ctx.stroke();
        ctx.shadowBlur=0;
        drawGilbertFigure(ctx, b.r);
        ctx.restore();
        // Label above
        ctx.font='bold 9px Courier New';ctx.fillStyle='#44ff44';ctx.textAlign='center';
        ctx.shadowBlur=6;ctx.shadowColor='#44ff44';
        ctx.fillText('GILBERT',b.x,b.y-b.r-10);
        ctx.shadowBlur=0;
        return;
    }
    // Officer Krail — captain of Sector A
    if(b.isKrail){
        const T=performance.now();
        ctx.save();
        ctx.translate(b.x,b.y);
        ctx.rotate(b.angle);
        // Bright cyan ring marker
        const p=0.5+Math.sin(T/280)*0.3;
        ctx.strokeStyle=`rgba(160,230,255,${p*0.6})`;ctx.lineWidth=1.8;
        ctx.shadowBlur=18;ctx.shadowColor='#aaddff';
        ctx.beginPath();ctx.arc(0,0,b.r+7,0,Math.PI*2);ctx.stroke();
        ctx.shadowBlur=0;
        // Thrust
        if(b.thrustFlame>0){
            const fl=10+b.thrustFlame*14+Math.random()*4;
            ctx.globalAlpha=0.8;ctx.fillStyle='#aaddff';
            ctx.beginPath();ctx.moveTo(-b.r*0.7,3);ctx.lineTo(-b.r*0.7-fl,0);ctx.lineTo(-b.r*0.7,-3);ctx.closePath();ctx.fill();
            ctx.globalAlpha=1;
        }
        // Angular cruiser hull (like the rescue scene captain)
        ctx.shadowBlur=14;ctx.shadowColor='#88ccff';
        ctx.beginPath();
        ctx.moveTo(b.r+4,0);
        ctx.lineTo(b.r*0.4,-b.r*0.4);
        ctx.lineTo(-b.r*0.8,b.r*0.9);
        ctx.lineTo(-b.r*0.4,0);
        ctx.lineTo(-b.r*0.8,-b.r*0.9);
        ctx.lineTo(b.r*0.4,b.r*0.4);
        ctx.closePath();
        const kg=ctx.createLinearGradient(0,-b.r,0,b.r);
        kg.addColorStop(0,'#3a4a7a');kg.addColorStop(0.5,'#1e2a4a');kg.addColorStop(1,'#0a1220');
        ctx.fillStyle=kg;ctx.fill();
        ctx.strokeStyle='#aaddff';ctx.lineWidth=2.2;ctx.stroke();
        ctx.shadowBlur=0;
        // Twin flames
        ctx.globalAlpha=0.6;ctx.fillStyle='#88ccff';
        const fl=6+Math.random()*3;
        ctx.beginPath();ctx.moveTo(-b.r*0.8,3);ctx.lineTo(-b.r*0.8-fl,2);ctx.lineTo(-b.r*0.8,1);ctx.closePath();ctx.fill();
        ctx.beginPath();ctx.moveTo(-b.r*0.8,-1);ctx.lineTo(-b.r*0.8-fl,-2);ctx.lineTo(-b.r*0.8,-3);ctx.closePath();ctx.fill();
        ctx.globalAlpha=1;
        // Pulsing cockpit
        const cPulse=0.8+Math.sin(T/400)*0.2;
        ctx.fillStyle=`rgba(255,255,255,${cPulse})`;
        ctx.beginPath();ctx.arc(b.r*0.3,0,2.5,0,Math.PI*2);ctx.fill();
        // Gold badge
        ctx.fillStyle='rgba(255,215,0,0.8)';ctx.fillRect(-b.r*0.1,-2.5,4,5);
        ctx.strokeStyle='#ffcc00';ctx.lineWidth=0.7;ctx.strokeRect(-b.r*0.1,-2.5,4,5);
        ctx.restore();
        // Label
        ctx.font='bold 9px Courier New';ctx.fillStyle='#aaddff';ctx.textAlign='center';
        ctx.shadowBlur=6;ctx.shadowColor='#aaddff';
        ctx.fillText('OFC. KRAT',b.x,b.y-b.r-10);
        ctx.shadowBlur=0;
        return;
    }
    ctx.save();
    ctx.translate(b.x,b.y);
    ctx.rotate(b.angle);
    // Thrust
    if(b.thrustFlame>0){
        const fl=8+b.thrustFlame*10+Math.random()*3;
        ctx.globalAlpha=0.7;
        ctx.fillStyle=b.team==='alliance'?'#88ccff':'#ff6600';
        ctx.beginPath();ctx.moveTo(-b.r*0.6,2);ctx.lineTo(-b.r*0.6-fl,0);ctx.lineTo(-b.r*0.6,-2);ctx.closePath();ctx.fill();
        ctx.globalAlpha=1;
    }
    // Hull
    const col=b.team==='alliance'?'#aaccff':'#ff6622';
    const fill=b.team==='alliance'?'#1a1a3a':'#2a0a00';
    ctx.shadowBlur=8;ctx.shadowColor=col;
    ctx.beginPath();
    ctx.moveTo(b.r,0);
    ctx.lineTo(-b.r*0.7,b.r*0.8);
    ctx.lineTo(-b.r*0.4,0);
    ctx.lineTo(-b.r*0.7,-b.r*0.8);
    ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();
    ctx.strokeStyle=col;ctx.lineWidth=1.3;ctx.stroke();
    ctx.shadowBlur=0;
    // Cockpit dot
    ctx.fillStyle=b.team==='alliance'?'#88ccff':'#ff6600';
    ctx.beginPath();ctx.arc(b.r*0.15,0,1.5,0,Math.PI*2);ctx.fill();
    ctx.restore();
}

function drawBattleBullet(bl){
    if(bl.gilbert){
        // Gilbert bullets: bright green
        ctx.shadowBlur=16;ctx.shadowColor='#44ff44';
        const gg=ctx.createRadialGradient(bl.x,bl.y,0,bl.x,bl.y,6);
        gg.addColorStop(0,'#ffffff');gg.addColorStop(0.4,'#66ff66');gg.addColorStop(1,'transparent');
        ctx.fillStyle=gg;ctx.beginPath();ctx.arc(bl.x,bl.y,6,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#ffffff';
        ctx.beginPath();ctx.arc(bl.x,bl.y,1.8,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
        return;
    }
    if(bl.krail){
        // Krail bullets: bright cyan/gold
        ctx.shadowBlur=16;ctx.shadowColor='#aaddff';
        const kg=ctx.createRadialGradient(bl.x,bl.y,0,bl.x,bl.y,6);
        kg.addColorStop(0,'#ffffff');kg.addColorStop(0.4,'#88ddff');kg.addColorStop(1,'transparent');
        ctx.fillStyle=kg;ctx.beginPath();ctx.arc(bl.x,bl.y,6,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#ffeecc';
        ctx.beginPath();ctx.arc(bl.x,bl.y,1.8,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
        return;
    }
    const col=bl.team==='alliance'?'#aaccff':'#ff8833';
    ctx.shadowBlur=10;ctx.shadowColor=col;
    ctx.fillStyle=col;
    ctx.beginPath();ctx.arc(bl.x,bl.y,2.5,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
}

// ============================================================
//  LEVEL 6 STATE MACHINE
// ============================================================
function updateLevel6(){
    const s=G.level6;
    if(!s.state) return;
    s.timer++;
    if(s.shake>0) s.shake--;

    // Rouge spawn phase — rouges appear while player plays normally
    if(s.state==='warning_pending'){
        // Just play 15s then trigger warning (user said "1 minute" but we'll cut to 45s to keep pace)
        if(s.timer>60*45){
            s.state='warning'; s.timer=0;
            if(typeof Sound!=='undefined' && Sound.bossWarn) Sound.bossWarn();
        }
    } else if(s.state==='warning'){
        // Show warning message for 4 seconds, then start spawning
        if(s.timer>60*4){
            s.state='rouges'; s.timer=0;
        }
    } else if(s.state==='rouges'){
        // Rarer rouge spawns, smaller packs
        const activeRouges=rouges.filter(r=>!r.decorative).length;
        if(s.timer%360===0 && activeRouges<2){
            const count=1+Math.floor(Math.random()*1.7); // 1-2
            for(let i=0;i<count;i++) spawnRouge();
            s.rouges_spawned+=count;
        }
        // After 45s, trigger kidnap approach
        if(s.timer>60*45){
            s.state='kidnap_warn'; s.timer=0;
            if(typeof Sound!=='undefined' && Sound.bossWarn) Sound.bossWarn();
        }
    } else if(s.state==='kidnap_warn'){
        // Screen shakes, ships sound approaching
        s.shake=6;
        if(s.timer>60*3){
            s.state='kidnap_grab'; s.timer=0;
            // Clear field, spawn many rouges that surround ship
            rouges.length=0; asteroids.length=0; enemyBullets.length=0; miniBosses.length=0;
            for(let i=0;i<8;i++){
                const a=(i/8)*Math.PI*2;
                spawnRouge({x:ship.x+Math.cos(a)*200,y:ship.y+Math.sin(a)*200});
            }
        }
    } else if(s.state==='kidnap_grab'){
        // Rouges close in, player can't move much
        s.shake=4;
        // Separate Gilbert: remove him from the player's side
        if(G.gilbert && !s.gilbertSeparated){
            // Save his state so we can restore him as ally in battlefield
            s.gilbertWasAlly = (G.gilbertState==='ally'||G.gilbertState==='rope');
            G.gilbertState='none'; G.gilbert=null; G.rope=false;
            s.gilbertSeparated=true;
            boom(ship.x+40,ship.y,'#ff6600',20);
        }
        // Drift rouges toward player center
        for(const r of rouges){
            const dx=ship.x-r.x, dy=ship.y-r.y;
            const d=Math.hypot(dx,dy);
            if(d>50){r.x+=dx/d*0.7;r.y+=dy/d*0.7;}
        }
        // Freeze player
        ship.tx*=0.85; ship.ty*=0.85;
        // Clear bullets so no damage during grab
        enemyBullets=enemyBullets.filter(e=>!e.fromRouge);
        G.invincibleTimer=Math.max(G.invincibleTimer,300);
        if(s.timer>60*3){
            s.state='arena_enter'; s.timer=0;
        }
    } else if(s.state==='arena_enter'){
        // Black fade in, then set up arena
        if(s.timer===1){
            rouges.length=0;
            // Center ship
            ship.x=W/2; ship.y=H/2; ship.tx=0; ship.ty=0;
            G.invincibleTimer=120;
            G.level6.arenaWave=0;
            G.level6.arenaKills=0;
        }
        if(s.timer>60*2){
            s.state='arena'; s.timer=0;
            G.level6.arenaWave=1;
            // Spawn decorative orbiting rouges (the "circle walls" — 8 of them)
            const centerFn={x:()=>W/2,y:()=>H/2};
            for(let i=0;i<8;i++){
                const a=(i/8)*Math.PI*2;
                spawnRouge({
                    x:W/2+Math.cos(a)*280, y:H/2+Math.sin(a)*280,
                    decorative:true, captive:true,
                    orbit:{center:centerFn,radius:280,angle:a,angularVel:0.004}
                });
            }
            // Wave 1: 2 captive fighters
            const center={x:W/2,y:H/2};
            for(let i=0;i<2;i++){
                const a=(i/2)*Math.PI*2;
                spawnRouge({x:W/2+Math.cos(a)*180,y:H/2+Math.sin(a)*180,captive:true,lockedArena:true,arenaCenter:center});
            }
            if(typeof Sound!=='undefined' && Sound.bossWarn) Sound.bossWarn();
        }
    } else if(s.state==='arena'){
        // Count only non-decorative (active) rouges
        const active=rouges.filter(r=>!r.decorative).length;
        if(active===0){
            G.level6.arenaWave++;
            if(G.level6.arenaWave>3){
                s.state='arena_surround'; s.timer=0;
                // Clear rouge bullets
                enemyBullets=enemyBullets.filter(e=>!e.fromRouge);
                // The decorative orbiters tighten inward (radius shrinks)
                for(const r of rouges){
                    if(r.decorative && r.orbit){r.closeIn=true;}
                }
                G.invincibleTimer=9999;
            } else {
                // Next wave: 2, then 3 fighters
                const center={x:W/2,y:H/2};
                const num=G.level6.arenaWave===2?2:3;
                for(let i=0;i<num;i++){
                    const a=(i/num)*Math.PI*2+Math.random()*0.3;
                    spawnRouge({x:W/2+Math.cos(a)*190,y:H/2+Math.sin(a)*190,captive:true,lockedArena:true,arenaCenter:center});
                }
            }
        }
    } else if(s.state==='arena_surround'){
        // Decorative orbiters close in (tighten radius)
        for(const r of rouges){
            if(r.decorative && r.orbit && r.closeIn){
                r.orbit.radius=Math.max(75,r.orbit.radius-0.55);
                r.orbit.angularVel*=1.003;
            }
        }
        // Keep all rouge bullets out
        enemyBullets=enemyBullets.filter(e=>!e.fromRouge);
        ship.tx*=0.9; ship.ty*=0.9;
        G.invincibleTimer=9999;
        if(s.timer>60*4){
            // Rescue arrives!
            s.state='rescue_arrive'; s.timer=0;
            // Spawn incoming bullets from edges that kill the surrounding rouges
            const bulletStreams=30;
            for(let i=0;i<bulletStreams;i++){
                const target=rouges[i%rouges.length];
                if(!target) break;
                const a=Math.random()*Math.PI*2;
                const start={x:target.x+Math.cos(a)*500,y:target.y+Math.sin(a)*500};
                const dx=target.x-start.x, dy=target.y-start.y;
                const d=Math.hypot(dx,dy);
                enemyBullets.push({
                    x:start.x,y:start.y,
                    dx:dx/d*14, dy:dy/d*14,
                    life:45, friendly:true
                });
            }
        }
    } else if(s.state==='rescue_arrive'){
        // Bullets fly in and kill rouges
        for(let i=enemyBullets.length-1;i>=0;i--){
            const eb=enemyBullets[i];
            if(!eb.friendly) continue;
            for(let j=rouges.length-1;j>=0;j--){
                const r=rouges[j];
                if(Math.hypot(eb.x-r.x,eb.y-r.y)<r.r+5){
                    boom(r.x,r.y,'#ff6600',15);
                    rouges.splice(j,1);
                    enemyBullets.splice(i,1);
                    break;
                }
            }
        }
        if(s.timer>60*2){
            // Alliance fleet arrives — captain + escort ships + Gilbert
            s.captainShip={x:-80,y:H*0.4,targetX:W*0.28,targetY:H*0.42,angle:0,size:1.6};
            s.fleet=[];
            const fleetSlots=[
                {ox:-50,oy:-80,sz:1.0}, {ox:50,oy:-70,sz:0.9},
                {ox:-75,oy:30,sz:1.0},  {ox:70,oy:40,sz:0.95},
                {ox:-40,oy:100,sz:0.9}, {ox:60,oy:110,sz:0.9},
                {ox:-100,oy:-30,sz:0.85},{ox:100,oy:-20,sz:0.85},
                {ox:20,oy:-130,sz:0.8}, {ox:-25,oy:140,sz:0.8}
            ];
            for(const slot of fleetSlots){
                s.fleet.push({
                    x:-120-Math.random()*100,y:H*0.5+slot.oy+(Math.random()-0.5)*40,
                    targetX:W*0.28+slot.ox, targetY:H*0.42+slot.oy,
                    size:slot.sz, angle:0, bob:Math.random()*Math.PI*2
                });
            }
            // Rescued Gilbert — emerges from the rescue formation
            s.gilbertRescue={x:-40,y:H*0.8,targetX:W*0.75,targetY:H*0.75,angle:0};
            s.state='rescue_dialog'; s.timer=0;
            G.invincibleTimer=9999;
            rouges.length=0; enemyBullets.length=0;
        }
    } else if(s.state==='rescue_dialog'){
        if(s.captainShip){
            s.captainShip.x+=(s.captainShip.targetX-s.captainShip.x)*0.04;
            s.captainShip.y+=Math.sin(s.timer*0.03)*0.5+(s.captainShip.targetY-s.captainShip.y)*0.04;
        }
        if(s.fleet){
            for(const f of s.fleet){
                f.x+=(f.targetX-f.x)*0.035;
                f.y+=(f.targetY-f.y)*0.035+Math.sin(s.timer*0.03+f.bob)*0.3;
            }
        }
        if(s.gilbertRescue){
            s.gilbertRescue.x+=(s.gilbertRescue.targetX-s.gilbertRescue.x)*0.03;
            s.gilbertRescue.y+=(s.gilbertRescue.targetY-s.gilbertRescue.y)*0.03+Math.sin(s.timer*0.04)*0.4;
        }
        // Show dialogue for 5 seconds
        if(s.timer>60*5){
            s.state='ambush'; s.timer=0;
            if(typeof Sound!=='undefined' && Sound.bossWarn) Sound.bossWarn();
        }
    } else if(s.state==='ambush'){
        // Screen shakes, rouges appear
        s.shake=8;
        if(s.timer>60*2){
            // Transition to battlefield
            s.state='battlefield'; s.timer=0;
            setupBattlefield();
        }
    } else if(s.state==='battlefield'){
        updateBattlefield();
        // Battle runs for the full 60 seconds regardless of kills.
        if(s.timer>60*60){
            const killedEnough=(s.playerKillsInBattle||0)>=3;
            if(killedEnough){
                // Player pulled their weight — Gilbert gets grabbed and taken off the field.
                captureGilbertToTrappedArea();
                s.state='gilbert_yell'; s.timer=0;
            } else {
                // Timer ran out without 3 kills — alliance starts losing
                s.state='losing_war'; s.timer=0;
                s.allyDeathTimer=0;
                if(typeof Sound!=='undefined' && Sound.bossWarn) Sound.bossWarn();
            }
        }
    } else if(s.state==='losing_war'){
        updateBattlefield();
        const sec=s.timer/60; // fractional seconds
        // Target non-Gilbert alliance count as a piecewise-linear function of time
        //   0s -> 25, 30s -> 20, 40s -> 16, 50s -> 10, 60s -> 5
        const targetCount = (t)=>{
            if(t<=0) return 25;
            if(t<=30) return 25 - (25-20)*(t/30);
            if(t<=40) return 20 - (20-16)*((t-30)/10);
            if(t<=50) return 16 - (16-10)*((t-40)/10);
            if(t<=60) return 10 - (10-5)*((t-50)/10);
            return 5;
        };
        // Count current regular allies (excluding Gilbert + Krail)
        let cullableCount=0;
        for(const b of battleBots){
            if(b.captor) continue;
            if(b.team==='alliance' && !b.isGilbert && !b.isKrail) cullableCount++;
        }
        // Every 15 frames, if we're above the target, pick off one ally (gradual)
        s.cullTick=(s.cullTick||0)+1;
        if(s.cullTick>=15){
            s.cullTick=0;
            const tgt=targetCount(sec);
            if(cullableCount>tgt){
                for(let j=battleBots.length-1;j>=0;j--){
                    const b=battleBots[j];
                    if(b.captor) continue;
                    if(b.team==='alliance' && !b.isGilbert && !b.isKrail){
                        boom(b.x,b.y,'#88ccff',22);
                        spawnBattleDebris(b.x,b.y);
                        battleBots.splice(j,1);
                        break;
                    }
                }
            }
        }
        // Dialogue trigger at 40 seconds
        if(sec>=40 && !s.losingDialogueShown){
            s.losingDialogueShown=true;
            s.losingDialogue="WE CAN'T HOLD 'EM MUCH LONGER — WE NEED A PLAN! PURE FIREPOWER WON'T SUFFICE!";
            s.losingDialogueTimer=360;
            if(typeof Sound!=='undefined' && Sound.bossWarn) Sound.bossWarn();
        }
        if(s.losingDialogueTimer>0) s.losingDialogueTimer--;
        // Player can still recover by killing 3 rouges
        if((s.playerKillsInBattle||0)>=3){
            captureGilbertToTrappedArea();
            s.state='gilbert_yell'; s.timer=0;
        }
        // At 60s — retreat to space station
        if(s.timer>60*60){
            s.state='retreat'; s.timer=0;
        }
    } else if(s.state==='retreat'){
        updateBattlefield();
        if(s.timer>60*3){
            // Transition to station
            s.state=null;
            // Clean up battlefield state
            battleBots.length=0; battleBullets.length=0; battleDebris.length=0;
            rouges.length=0;
            if(s.savedCanvasW){
                canvas.width=s.savedCanvasW; canvas.height=s.savedCanvasH;
                W=canvas.width; H=canvas.height;
                s.savedCanvasW=null; s.savedCanvasH=null;
            }
            s.camera.x=0; s.camera.y=0;
            s.cullMarks={}; s.losingDialogue=''; s.losingDialogueTimer=0;
            // Allow the player to retry the fight after retreat
            if(G.slotId && saves[G.slotId]){
                saves[G.slotId].level6Triggered=false;
                saveToDisk();
            }
            if(typeof Sound!=='undefined' && Sound.playMusic){Sound.currentTrack='none';Sound.playMusic('bgm');}
            enterStation();
        }
    } else if(s.state==='gilbert_yell'){
        updateBattlefield();
        // Gilbert calls out, arrow appears
        if(s.timer>60*3){
            s.state='battlefield_hunt'; s.timer=0;
        }
    } else if(s.state==='battlefield_hunt'){
        updateBattlefield();
        // Player must travel to Gilbert
        const worldShipX=ship.x+s.camera.x, worldShipY=ship.y+s.camera.y;
        const dx=s.gilbertPos.x-worldShipX, dy=s.gilbertPos.y-worldShipY;
        const dist=Math.hypot(dx,dy);
        if(dist<300){
            s.state='gilbert_found'; s.timer=0;
            // Unlock the big shot so the player can charge and fire it to free Gilbert.
            s.bigShotUnlocked=true;
            // Captors were spawned when Gilbert was captured — they've been orbiting since.
        }
    } else if(s.state==='gilbert_found'){
        updateBattlefield();
        G.invincibleTimer=60; // can't die while lining up the rescue shot
        // Player must charge a big shot and hit Gilbert. The hit is detected in
        // the player-bullet collision loop (updateBattlefield) and transitions to 'released'.
    } else if(s.state==='released'){
        updateBattlefield();
        G.invincibleTimer=60;
        // Expanding shockwave — expands at 14px/frame, reaching 840px in 60 frames
        s.shockwaveRadius+=14;
        const gx=s.gilbertPos.x, gy=s.gilbertPos.y;
        // Kill rouges the shockwave reaches
        for(let i=battleBots.length-1;i>=0;i--){
            const b=battleBots[i];
            if(b.team!=='rouge') continue;
            const d=Math.hypot(b.x-gx,b.y-gy);
            // Bot is within shockwave band
            if(d<=s.shockwaveRadius && d>s.shockwaveRadius-40 && s.shockwaveRadius<=840){
                boom(b.x,b.y,'#ffffff',24);
                spawnBattleDebris(b.x,b.y);
                battleBots.splice(i,1);
                s.shake=Math.min(24,(s.shake||0)+2);
            }
        }
        // Extended celebration (5s) for full animation
        if(s.timer>60*5){
            // Rescue complete — Gilbert rejoins the fight as an autonomous alliance bot.
            spawnBattleBot('alliance', s.gilbertPos.x, s.gilbertPos.y);
            const gil=battleBots[battleBots.length-1];
            gil.isGilbert=true;
            gil.hp=999; gil.maxHp=999;
            gil.r=16;
            // Gilbert thanks the player + hands over the MODULE ACCESS key.
            s.state='gilbert_thanks'; s.timer=0;
            s.thanksLine="Heh, I guess I owe you somethin. After all you've saved me, TWICE!";
            // Award the key (if not already owned) and trigger item tutorial
            if(typeof awardKeyItem==='function') awardKeyItem('module_access','MODULE ACCESS','Grants elevator access to the Docking Bay (Floor 3).');
        }
    } else if(s.state==='gilbert_thanks'){
        updateBattlefield();
        G.invincibleTimer=60;
        // 6-second beat then continue to regular post-rescue battle (or longer if player reads).
        if(s.timer>60*6){
            s.state='post_rescue_battle'; s.timer=0;
        }
    } else if(s.state==='post_rescue_battle'){
        // Battle continues for 30 more seconds before the mission is declared won.
        updateBattlefield();
        if(s.timer>60*30){
            s.state='victory'; s.timer=0;
        }
    } else if(s.state==='victory'){
        // Fade out and enter level 7
        if(s.timer>60*4){
            // Reset to normal gameplay at level 7
            s.state=null;
            G.level=7;
            G.checkpoint=7;
            // Restore canvas size
            canvas.width=s.savedCanvasW||900;
            canvas.height=s.savedCanvasH||650;
            W=canvas.width; H=canvas.height;
            s.savedCanvasW=null; s.savedCanvasH=null;
            s.camera.x=0; s.camera.y=0;
            battleBots.length=0; battleBullets.length=0; battleDebris.length=0;
            rouges.length=0;
            ship.x=W/2; ship.y=H/2; ship.tx=0; ship.ty=0;
            G.invincibleTimer=120;
            G.waveStart=performance.now(); G.spawnTimer=0;
            asteroids=[]; for(let k=0;k<8;k++)spawnAsteroid();
            // Restore Gilbert as player's ally (he was with you before the kidnap)
            if(s.gilbertWasAlly && typeof spawnGilbertAlly==='function' && G.gilbertState==='none'){
                spawnGilbertAlly();
            }
            s.gilbertAlly=null; s.gilbertSeparated=false;
            // Force music back to BGM
            if(typeof Sound!=='undefined' && Sound.playMusic){Sound.currentTrack='none';Sound.playMusic('bgm');}
        }
    } else if(s.state==='failed'){
        // Gilbert died, player dies too
        if(s.timer>60*2){
            s.state=null;
            // Restore canvas size before death
            if(s.savedCanvasW){
                canvas.width=s.savedCanvasW; canvas.height=s.savedCanvasH;
                W=canvas.width; H=canvas.height;
                s.savedCanvasW=null; s.savedCanvasH=null;
            }
            G.invincibleTimer=0;
            G.shieldFuel=0; updateShieldUI();
            hurtPlayer(true);
        }
    }
}

// Remove wandering Gilbert from the battlefield and plant a captor circle at gilbertPos.
// Called when the 60s battle ends with 3+ player kills (or during losing_war recovery).
function captureGilbertToTrappedArea(){
    const s=G.level6;
    // Remove the wandering Gilbert bot
    for(let i=battleBots.length-1;i>=0;i--){
        if(battleBots[i].isGilbert){
            boom(battleBots[i].x,battleBots[i].y,'#44ff66',25);
            battleBots.splice(i,1);
            break;
        }
    }
    // Spawn 6 captor rouges orbiting Gilbert at the trapped location
    for(let i=0;i<6;i++){
        const a=(i/6)*Math.PI*2;
        spawnBattleBot('rouge',s.gilbertPos.x+Math.cos(a)*90,s.gilbertPos.y+Math.sin(a)*90);
        const bot=battleBots[battleBots.length-1];
        bot.captor=true;
        bot.orbitAngle=a;
        bot.orbitRadius=90;
    }
}

// Setup battlefield: wider world, many bots
function setupBattlefield(){
    battleBots.length=0; battleBullets.length=0; battleDebris.length=0;
    const s=G.level6;
    // Detach the player's Gilbert ally — he flies off into the field of battle.
    // (Safeguard in case we skipped the kidnap cutscene via the dev menu.)
    if(G.gilbert && G.gilbertState!=='none'){
        if(!s.gilbertSeparated){
            s.gilbertWasAlly=(G.gilbertState==='ally'||G.gilbertState==='rope');
            s.gilbertSeparated=true;
        }
        // Dramatic departure spark where he was
        boom(G.gilbert.x,G.gilbert.y,'#44ff66',25);
        G.gilbertState='none'; G.gilbert=null; G.rope=false;
    }
    // Expand canvas to fill window (fullscreen battlefield)
    if(!s.savedCanvasW){
        s.savedCanvasW=canvas.width; s.savedCanvasH=canvas.height;
        const targetW=Math.min(window.innerWidth-20, 1600);
        const targetH=Math.min(window.innerHeight-20, 950);
        canvas.width=targetW; canvas.height=targetH;
        W=targetW; H=targetH;
    }
    const cx=s.worldW/2, cy=s.worldH/2;
    ship.x=W/2; ship.y=H/2;
    s.camera.x=cx-W/2; s.camera.y=cy-H/2;
    // Place Gilbert in a random direction at a visible distance
    const ga=Math.random()*Math.PI*2;
    s.gilbertPos.x=cx+Math.cos(ga)*800;
    s.gilbertPos.y=cy+Math.sin(ga)*600;
    s.gilbertPos.x=Math.max(250,Math.min(s.worldW-250,s.gilbertPos.x));
    s.gilbertPos.y=Math.max(250,Math.min(s.worldH-250,s.gilbertPos.y));
    // Spawn 25 alliance + 25 rouge bots scattered (balanced)
    for(let i=0;i<25;i++){
        spawnBattleBot('alliance', cx+(Math.random()-0.5)*1800, cy+(Math.random()-0.5)*1200);
    }
    for(let i=0;i<25;i++){
        spawnBattleBot('rouge', cx+(Math.random()-0.5)*2200, cy+(Math.random()-0.5)*1600);
    }
    // Scatter debris across the battlefield
    for(let i=0;i<35;i++){
        spawnBattleDebris(Math.random()*s.worldW, Math.random()*s.worldH);
    }
    // Spawn Gilbert as an autonomous alliance fighter (not following player)
    // He wanders the battlefield on his own and attacks rouges
    spawnBattleBot('alliance', cx-300, cy-200);
    const gil=battleBots[battleBots.length-1];
    gil.isGilbert=true;
    gil.hp=999; gil.maxHp=999; // invincible — he must survive the whole battle
    gil.r=16;
    // Spawn Officer Krail — the Sector A captain, fights alongside player all battle
    spawnBattleBot('alliance', cx+300, cy-200);
    const krail=battleBots[battleBots.length-1];
    krail.isKrail=true;
    krail.hp=999; krail.maxHp=999; // invincible — survives to retreat
    krail.r=18; // biggest alliance ship
    s.gilbertAlly=null;
    s.respawnTimer=0;
    s.playerKillsInBattle=0;
    s.lastPlayerKillCheck=0;
    s.reinforceWaveNum=0;
    s.cullTick=0;
    s.losingDialogueShown=false;
    s.losingDialogue=''; s.losingDialogueTimer=0;
    // Play battle music
    if(typeof Sound!=='undefined' && Sound.playMusic) Sound.playMusic('rouge');
    // 10-second immunity at battle start so player can get oriented
    G.invincibleTimer=600;
}

// Update battlefield movement + camera
function updateBattlefield(){
    const s=G.level6;
    updateBattleBots();
    updateBattleDebris();
    // Camera follows player position in world
    const margin=180;
    if(ship.x<margin){s.camera.x-=margin-ship.x; ship.x=margin;}
    if(ship.x>W-margin){s.camera.x+=ship.x-(W-margin); ship.x=W-margin;}
    if(ship.y<margin){s.camera.y-=margin-ship.y; ship.y=margin;}
    if(ship.y>H-margin){s.camera.y+=ship.y-(H-margin); ship.y=H-margin;}
    // Clamp camera to world
    if(s.camera.x<0) s.camera.x=0;
    if(s.camera.y<0) s.camera.y=0;
    if(s.camera.x>s.worldW-W) s.camera.x=s.worldW-W;
    if(s.camera.y>s.worldH-H) s.camera.y=s.worldH-H;
    // Also clamp player ship to world bounds so you can't escape the battlefield
    const worldShipX=ship.x+s.camera.x, worldShipY=ship.y+s.camera.y;
    if(worldShipX<20){ship.x=20-s.camera.x;ship.tx=Math.max(0,ship.tx);}
    if(worldShipX>s.worldW-20){ship.x=s.worldW-20-s.camera.x;ship.tx=Math.min(0,ship.tx);}
    if(worldShipY<20){ship.y=20-s.camera.y;ship.ty=Math.max(0,ship.ty);}
    if(worldShipY>s.worldH-20){ship.y=s.worldH-20-s.camera.y;ship.ty=Math.min(0,ship.ty);}

    // Arrow angle to Gilbert
    s.arrowAngle=Math.atan2(s.gilbertPos.y-(ship.y+s.camera.y), s.gilbertPos.x-(ship.x+s.camera.x));

    // Asteroid suppression
    asteroids.length=0; enemyBullets=enemyBullets.filter(e=>!e.friendly);

    // Respawn bots to maintain battle intensity
    s.respawnTimer=(s.respawnTimer||0)+1;
    if(s.respawnTimer>45){
        s.respawnTimer=0;
        let a=0,r=0;
        for(const b of battleBots){if(b.captor)continue;if(b.team==='alliance')a++;else r++;}
        const cx=s.worldW/2, cy=s.worldH/2;
        // During losing_war, alliance doesn't respawn (they're being overwhelmed)
        if(a<22 && s.state!=='losing_war'){
            const ea=Math.random()*Math.PI*2;
            spawnBattleBot('alliance', cx+Math.cos(ea)*1100, cy+Math.sin(ea)*800);
        }
        if(r<22){
            const ea=Math.random()*Math.PI*2;
            spawnBattleBot('rouge', cx+Math.cos(ea)*1200, cy+Math.sin(ea)*900);
        }
    }
    // Player participation check — every 10s, if player hasn't killed enough, reinforce rouges
    s.lastPlayerKillCheck=(s.lastPlayerKillCheck||0)+1;
    if(s.state==='battlefield' && s.lastPlayerKillCheck>=60*10){
        s.lastPlayerKillCheck=0;
        const kills=s.playerKillsInBattle||0;
        const expected=Math.floor(s.timer/60/20); // scaled to reach 3 kills by the 60s mark
        if(kills<expected){
            // Reinforcements — each wave adds one more rouge than the last
            s.reinforceWaveNum=(s.reinforceWaveNum||0)+1;
            const num=3+s.reinforceWaveNum; // wave 1→4, wave 2→5, wave 3→6, ...
            const cx=s.worldW/2, cy=s.worldH/2;
            for(let k=0;k<num;k++){
                const ea=Math.random()*Math.PI*2;
                spawnBattleBot('rouge', cx+Math.cos(ea)*900, cy+Math.sin(ea)*700);
            }
            if(typeof Sound!=='undefined' && Sound.bossWarn) Sound.bossWarn();
            s.reinforceFlash=90; // show warning for 1.5s
        }
    }

    // Player bullets vs bots — player bullets are in screen space, convert to world
    for(let i=bullets.length-1;i>=0;i--){
        const b=bullets[i];
        const wx=b.x+s.camera.x, wy=b.y+s.camera.y;
        // Big-shot rescue: during gilbert_found, a big shot that strikes Gilbert frees him.
        if(b.big && s.state==='gilbert_found'){
            const dg=Math.hypot(s.gilbertPos.x-wx, s.gilbertPos.y-wy);
            if(dg<40){
                bullets.splice(i,1);
                s.state='released'; s.timer=0;
                s.shockwaveRadius=0; s.shockwaveKilled={};
                s.shake=18;
                if(typeof Sound!=='undefined' && Sound.explode) Sound.explode();
                continue;
            }
        }
        for(let j=battleBots.length-1;j>=0;j--){
            const bot=battleBots[j];
            if(bot.team==='alliance') continue; // only hit rouges
            if(bot.captor) continue; // captors are invulnerable until the rescue shockwave
            if(Math.hypot(bot.x-wx,bot.y-wy)<bot.r+8){
                const dmg=b.big?(b.damage||5):1;
                bot.hp-=dmg;
                boom(b.x,b.y,'#ff6600',5);
                if(bot.hp<=0){
                    const sx=bot.x-s.camera.x, sy=bot.y-s.camera.y;
                    if(sx>-50&&sx<W+50&&sy>-50&&sy<H+50) boom(sx,sy,'#ff6600',15);
                    spawnBattleDebris(bot.x,bot.y);
                    battleBots.splice(j,1);
                    s.playerKillsInBattle=(s.playerKillsInBattle||0)+1;
                    addScore(200); G.mb+=2;
                }
                if(!b.big) bullets.splice(i,1);
                break;
            }
        }
    }
}

// ============================================================
//  LEVEL 6 DRAW
// ============================================================
function drawLevel6(){
    const s=G.level6;
    if(!s.state) return;
    const T=performance.now();

    if(s.state==='warning'){
        // Radio transmission overlay
        const fade=Math.min(1,s.timer/15);
        ctx.save();ctx.globalAlpha=fade;
        // Dark bar at top
        const grd=ctx.createLinearGradient(0,40,0,180);
        grd.addColorStop(0,'rgba(0,20,40,0.92)');grd.addColorStop(1,'rgba(0,8,20,0.85)');
        ctx.fillStyle=grd;ctx.fillRect(0,50,W,100);
        // Scanline accent
        ctx.fillStyle='rgba(0,220,255,0.15)';ctx.fillRect(0,50,W,1);ctx.fillRect(0,149,W,1);
        // Static flicker
        for(let n=0;n<12;n++){
            ctx.fillStyle=`rgba(0,200,255,${Math.random()*0.1})`;
            ctx.fillRect(Math.random()*W,50+Math.random()*100,1+Math.random()*30,1);
        }
        // Icon
        ctx.shadowBlur=12;ctx.shadowColor='#00ccff';
        ctx.strokeStyle='#00ccff';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(60,100,18,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle='#00ccff';ctx.font='bold 22px Courier New';ctx.textAlign='center';
        ctx.fillText('📡',60,108);
        ctx.shadowBlur=0;
        // Text
        ctx.font='bold 13px Courier New';ctx.fillStyle='#00ccff';ctx.textAlign='left';
        ctx.shadowBlur=6;ctx.shadowColor='#00ccff';
        ctx.fillText('◈ INCOMING TRANSMISSION — SECTOR A ◈',100,78);
        ctx.shadowBlur=0;
        ctx.font='bold 16px Courier New';ctx.fillStyle='#fff';
        ctx.fillText('"ATTENTION PILOT — WATCH OUT FOR SCAVENGERS."',100,104);
        ctx.font='13px Courier New';ctx.fillStyle='#aaccff';
        ctx.fillText('Rogue ships hunt in packs. Stay sharp, stay moving.',100,126);
        ctx.restore();
    }

    if(s.state==='kidnap_warn'){
        // Warning text with shake
        const wa=0.5+Math.sin(T/80)*0.5;
        ctx.globalAlpha=wa*0.15;ctx.fillStyle='#ff0000';ctx.fillRect(0,0,W,H);
        ctx.globalAlpha=wa;
        ctx.font='bold 36px Courier New';ctx.fillStyle='#ff3333';ctx.textAlign='center';
        ctx.shadowBlur=40;ctx.shadowColor='#ff0000';
        ctx.fillText('MULTIPLE CONTACTS INBOUND',W/2,H/2-20);
        ctx.font='bold 16px Courier New';
        ctx.fillText('ROGUE SQUADRON — EVASIVE MANEUVERS',W/2,H/2+15);
        ctx.shadowBlur=0;ctx.globalAlpha=1;
    }

    if(s.state==='kidnap_grab'){
        // Dark vignette closing in
        const prog=Math.min(1,s.timer/(60*3));
        const vigR=W*0.7*(1-prog*0.7);
        const vig=ctx.createRadialGradient(ship.x,ship.y,0,ship.x,ship.y,vigR);
        vig.addColorStop(0,'transparent');vig.addColorStop(0.7,'transparent');vig.addColorStop(1,`rgba(0,0,0,${0.6+prog*0.4})`);
        ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
        // "KIDNAPPED" text fading in at end
        if(s.timer>60*2){
            const ta=Math.min(1,(s.timer-60*2)/30);
            ctx.globalAlpha=ta;
            ctx.font='bold 42px Courier New';ctx.fillStyle='#ff3333';ctx.textAlign='center';
            ctx.shadowBlur=40;ctx.shadowColor='#ff0000';
            ctx.fillText('CAPTURED',W/2,H/2);
            ctx.shadowBlur=0;ctx.globalAlpha=1;
        }
    }

    if(s.state==='arena_enter'){
        // Black fade out then fade in
        const prog=s.timer/(60*2);
        const fade=prog<0.5?1-prog*2:(prog-0.5)*2;
        ctx.fillStyle=`rgba(0,0,0,${fade})`;ctx.fillRect(0,0,W,H);
        if(prog>0.5){
            ctx.globalAlpha=1-fade;
            ctx.font='bold 24px Courier New';ctx.fillStyle='#ff8833';ctx.textAlign='center';
            ctx.shadowBlur=20;ctx.shadowColor='#ff6600';
            ctx.fillText('◇ ROGUE ARENA ◇',W/2,60);
            ctx.font='13px Courier New';ctx.fillStyle='#ffaa66';
            ctx.fillText('Survive the waves',W/2,82);
            ctx.shadowBlur=0;ctx.globalAlpha=1;
        }
    }

    if(s.state==='arena' || s.state==='arena_surround'){
        // Soft arena floor glow beneath decorative orbiters
        const floorPulse=0.15+Math.sin(T/500)*0.05;
        const fg=ctx.createRadialGradient(W/2,H/2,60,W/2,H/2,320);
        fg.addColorStop(0,`rgba(255,120,50,${floorPulse*0.25})`);
        fg.addColorStop(0.6,`rgba(200,60,30,${floorPulse*0.1})`);
        fg.addColorStop(1,'transparent');
        ctx.fillStyle=fg;ctx.beginPath();ctx.arc(W/2,H/2,320,0,Math.PI*2);ctx.fill();
        // Wave indicator
        if(s.state==='arena'){
            ctx.font='bold 16px Courier New';ctx.fillStyle='#ff8833';ctx.textAlign='center';
            ctx.shadowBlur=12;ctx.shadowColor='#ff6600';
            ctx.fillText(`WAVE ${G.level6.arenaWave}/3`,W/2,40);
            // Kills counter
            ctx.font='11px Courier New';ctx.fillStyle='#cc6633';
            ctx.fillText(`Captives defeated: ${G.level6.arenaKills}`,W/2,58);
            ctx.shadowBlur=0;
        }
        if(s.state==='arena_surround'){
            const pulse=0.5+Math.sin(T/150)*0.5;
            ctx.globalAlpha=pulse;
            ctx.font='bold 24px Courier New';ctx.fillStyle='#ff3333';ctx.textAlign='center';
            ctx.shadowBlur=22;ctx.shadowColor='#ff0000';
            ctx.fillText('CLOSING IN...',W/2,40);
            ctx.shadowBlur=0;ctx.globalAlpha=1;
        }
    }

    if(s.state==='rescue_arrive' || s.state==='rescue_dialog'){
        // Draw escort fleet
        if(s.fleet){
            for(const f of s.fleet){
                ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.size,f.size);
                ctx.shadowBlur=15;ctx.shadowColor='#88ccff';
                ctx.beginPath();
                ctx.moveTo(18,0);ctx.lineTo(-12,8);ctx.lineTo(-6,0);ctx.lineTo(-12,-8);ctx.closePath();
                const fg=ctx.createLinearGradient(0,-8,0,8);
                fg.addColorStop(0,'#1e2a4a');fg.addColorStop(1,'#0a1220');
                ctx.fillStyle=fg;ctx.fill();
                ctx.strokeStyle='#88bbdd';ctx.lineWidth=1.5;ctx.stroke();
                ctx.shadowBlur=0;
                // Thrust flame
                const fl=6+Math.random()*3;
                ctx.globalAlpha=0.6;ctx.fillStyle='#88ccff';
                ctx.beginPath();ctx.moveTo(-12,2);ctx.lineTo(-12-fl,0);ctx.lineTo(-12,-2);ctx.closePath();ctx.fill();
                ctx.globalAlpha=1;
                // Cockpit
                ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(4,0,1.8,0,Math.PI*2);ctx.fill();
                ctx.restore();
            }
        }
        // Draw captain ship (bigger, centered)
        if(s.captainShip){
            const cs=s.captainShip;
            ctx.save();ctx.translate(cs.x,cs.y);ctx.scale(cs.size||1.6,cs.size||1.6);
            // Glow
            ctx.shadowBlur=28;ctx.shadowColor='#88ccff';
            ctx.beginPath();
            ctx.moveTo(24,0);ctx.lineTo(14,-8);ctx.lineTo(-16,12);ctx.lineTo(-8,0);ctx.lineTo(-16,-12);ctx.lineTo(14,8);ctx.closePath();
            const cg=ctx.createLinearGradient(0,-12,0,12);
            cg.addColorStop(0,'#3a4a7a');cg.addColorStop(0.5,'#1e2a4a');cg.addColorStop(1,'#0a1220');
            ctx.fillStyle=cg;ctx.fill();
            ctx.strokeStyle='#aaddff';ctx.lineWidth=2.2;ctx.stroke();
            ctx.shadowBlur=0;
            // Twin thrust flames
            const fl=10+Math.random()*4;
            ctx.globalAlpha=0.7;ctx.fillStyle='#88ccff';
            ctx.beginPath();ctx.moveTo(-16,4);ctx.lineTo(-16-fl,2);ctx.lineTo(-16,0);ctx.closePath();ctx.fill();
            ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(-16-fl,-2);ctx.lineTo(-16,-4);ctx.closePath();ctx.fill();
            ctx.globalAlpha=1;
            // Cockpit pulse
            const cPulse=0.8+Math.sin(T/400)*0.2;
            ctx.fillStyle=`rgba(255,255,255,${cPulse})`;ctx.beginPath();ctx.arc(6,0,3,0,Math.PI*2);ctx.fill();
            // Badge
            ctx.fillStyle='rgba(170,220,255,0.7)';ctx.fillRect(-5,-3,6,6);
            ctx.strokeStyle='#ffcc00';ctx.lineWidth=0.8;ctx.strokeRect(-5,-3,6,6);
            ctx.restore();
            // "CAPTAIN" label above
            if(s.state==='rescue_dialog'){
                ctx.font='bold 10px Courier New';ctx.fillStyle='#aaccff';ctx.textAlign='center';
                ctx.shadowBlur=6;ctx.shadowColor='#88ccff';
                ctx.fillText('◆ CAPTAIN ◆',cs.x,cs.y-36);
                ctx.shadowBlur=0;
            }
        }
        // Draw rescued Gilbert
        if(s.gilbertRescue){
            const g=s.gilbertRescue;
            const gp=0.6+Math.sin(T/250)*0.3;
            ctx.save();ctx.translate(g.x,g.y);
            // Outer aura
            const gg=ctx.createRadialGradient(0,0,0,0,0,30);
            gg.addColorStop(0,`rgba(68,255,68,${gp*0.35})`);gg.addColorStop(1,'transparent');
            ctx.fillStyle=gg;ctx.beginPath();ctx.arc(0,0,30,0,Math.PI*2);ctx.fill();
            // Gilbert figure
            ctx.rotate(Math.sin(T/500)*0.2);
            drawGilbertFigure(ctx,16);
            ctx.restore();
            if(s.state==='rescue_dialog'){
                ctx.font='bold 10px Courier New';ctx.fillStyle='#44ff44';ctx.textAlign='center';
                ctx.shadowBlur=6;ctx.shadowColor='#44ff44';
                ctx.fillText('◆ GILBERT (RESCUED) ◆',g.x,g.y-28);
                ctx.shadowBlur=0;
            }
        }
        if(s.state==='rescue_dialog'){
            // Dialog box
            const boxH=90;
            const bx=40, by=H*0.72, bw=W-80;
            ctx.fillStyle='rgba(8,10,20,0.92)';ctx.fillRect(bx,by,bw,boxH);
            const accg=ctx.createLinearGradient(bx,by,bx+bw,by);
            accg.addColorStop(0,'transparent');accg.addColorStop(0.5,'#aaccff');accg.addColorStop(1,'transparent');
            ctx.fillStyle=accg;ctx.fillRect(bx,by,bw,2);
            ctx.strokeStyle='rgba(170,200,255,0.5)';ctx.lineWidth=1;ctx.strokeRect(bx+0.5,by+0.5,bw-1,boxH-1);
            ctx.font='bold 13px Courier New';ctx.textAlign='left';
            ctx.shadowBlur=8;ctx.shadowColor='rgba(170,200,255,0.4)';
            ctx.fillStyle='#aaccff';ctx.fillText('CAPTAIN (SECTOR A)',bx+18,by+26);
            ctx.shadowBlur=0;
            ctx.font='14px Courier New';ctx.fillStyle='#fff';
            ctx.fillText('"YOU SAVED US — WE SAVE YOU!"',bx+18,by+50);
            ctx.font='12px Courier New';ctx.fillStyle='#aaccff';
            ctx.fillText('Hold tight, pilot. The whole fleet is coming.',bx+18,by+72);
        }
    }

    if(s.state==='ambush'){
        // Flash red
        const wa=0.5+Math.sin(T/60)*0.5;
        ctx.globalAlpha=wa*0.18;ctx.fillStyle='#ff0000';ctx.fillRect(0,0,W,H);
        ctx.globalAlpha=wa;
        ctx.font='bold 42px Courier New';ctx.fillStyle='#ff3333';ctx.textAlign='center';
        ctx.shadowBlur=40;ctx.shadowColor='#ff0000';
        ctx.fillText('AMBUSH!',W/2,H/2);
        ctx.shadowBlur=0;ctx.globalAlpha=1;
    }

    // BATTLEFIELD RENDERING
    if(s.state==='battlefield' || s.state==='gilbert_yell' ||
       s.state==='battlefield_hunt' || s.state==='gilbert_found' ||
       s.state==='released' || s.state==='gilbert_thanks' || s.state==='post_rescue_battle' ||
       s.state==='losing_war' || s.state==='retreat' ||
       s.state==='victory' || s.state==='failed'){
        drawBattlefield();
    }
}

function drawBattlefield(){
    const s=G.level6;
    const T=performance.now();
    // Draw parallax grid background (world-space)
    const gridSize=120;
    const offX=-(s.camera.x%gridSize);
    const offY=-(s.camera.y%gridSize);
    ctx.strokeStyle='rgba(80,120,200,0.08)';ctx.lineWidth=1;
    for(let gx=offX;gx<W;gx+=gridSize){
        ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();
    }
    for(let gy=offY;gy<H;gy+=gridSize){
        ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();
    }
    // World boundary (thicker + more visible so player sees they can't escape)
    const bx=-s.camera.x, by=-s.camera.y;
    ctx.strokeStyle='rgba(150,200,255,0.35)';ctx.lineWidth=3;
    ctx.setLineDash([12,8]);
    ctx.strokeRect(bx,by,s.worldW,s.worldH);
    ctx.setLineDash([]);
    // Draw debris first (behind bots)
    drawBattleDebris();
    // Draw all bots (translated by camera)
    ctx.save();ctx.translate(-s.camera.x,-s.camera.y);
    for(const b of battleBots) drawBattleBot(b);
    for(const bl of battleBullets) drawBattleBullet(bl);
    // Draw Gilbert marker once he's been captured and taken to the trapped area
    if(s.state==='gilbert_yell' || s.state==='battlefield_hunt' || s.state==='gilbert_found' ||
       s.state==='released'){
        const gp=s.gilbertPos;
        ctx.save();ctx.translate(gp.x,gp.y);
        // Large up-cast light beam (visible from far)
        const beamPulse=0.5+Math.sin(T/200)*0.3;
        const beam=ctx.createLinearGradient(0,-400,0,20);
        beam.addColorStop(0,'transparent');
        beam.addColorStop(1,`rgba(68,255,68,${beamPulse*0.5})`);
        ctx.fillStyle=beam;
        ctx.beginPath();ctx.moveTo(-30,20);ctx.lineTo(30,20);ctx.lineTo(15,-400);ctx.lineTo(-15,-400);ctx.closePath();ctx.fill();
        // Outer mega ring
        const p=0.6+Math.sin(T/200)*0.4;
        ctx.strokeStyle=`rgba(68,255,68,${p*0.8})`;ctx.lineWidth=4;
        ctx.shadowBlur=35;ctx.shadowColor='#44ff44';
        ctx.beginPath();ctx.arc(0,0,60,0,Math.PI*2);ctx.stroke();
        // Middle ring
        ctx.strokeStyle=`rgba(68,255,68,${p})`;ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(0,0,40,0,Math.PI*2);ctx.stroke();
        // Inner ring
        ctx.strokeStyle=`rgba(170,255,170,${p})`;ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.stroke();
        // Expanding pulse ring
        const expand=((T/20)%60);
        ctx.globalAlpha=1-expand/60;
        ctx.strokeStyle='#aaffaa';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(0,0,60+expand,0,Math.PI*2);ctx.stroke();
        ctx.globalAlpha=1;
        ctx.shadowBlur=0;
        // Gilbert — actual Gilbert figure
        ctx.save();ctx.rotate(Math.sin(T/400)*0.3);
        drawGilbertFigure(ctx,18);
        ctx.restore();
        // Label
        ctx.font='bold 14px Courier New';ctx.fillStyle='#44ff44';ctx.textAlign='center';
        ctx.shadowBlur=10;ctx.shadowColor='#44ff44';
        ctx.fillText('GILBERT',0,-78);
        ctx.font='10px Courier New';ctx.fillStyle='#aaffaa';
        ctx.fillText('(HELP!)',0,-62);
        ctx.shadowBlur=0;
        ctx.restore();
    }
    ctx.restore();

    // UI OVERLAY (screen space)
    // Arrow to Gilbert
    if(s.state==='gilbert_yell' || s.state==='battlefield_hunt'){
        // Radial arrow at edge of screen pointing at Gilbert
        const worldShipX=ship.x+s.camera.x, worldShipY=ship.y+s.camera.y;
        const dx=s.gilbertPos.x-worldShipX, dy=s.gilbertPos.y-worldShipY;
        const dist=Math.hypot(dx,dy);
        const a=Math.atan2(dy,dx);
        const arrowR=220;
        const ax=ship.x+Math.cos(a)*arrowR, ay=ship.y+Math.sin(a)*arrowR;
        // Clamp to screen
        const cx=Math.max(40,Math.min(W-40,ax));
        const cy=Math.max(40,Math.min(H-40,ay));
        ctx.save();ctx.translate(cx,cy);ctx.rotate(a);
        const pulse=0.6+Math.sin(T/200)*0.4;
        ctx.shadowBlur=25;ctx.shadowColor='#44ff44';
        ctx.fillStyle=`rgba(68,255,68,${pulse})`;
        ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-10,10);ctx.lineTo(-4,0);ctx.lineTo(-10,-10);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#88ff88';ctx.lineWidth=2;ctx.stroke();
        ctx.shadowBlur=0;ctx.restore();
        // Distance text
        ctx.font='bold 11px Courier New';ctx.fillStyle='#44ff44';ctx.textAlign='center';
        ctx.shadowBlur=6;ctx.shadowColor='#44ff44';
        ctx.fillText(`GILBERT — ${Math.round(dist)}m`,cx,cy-22);
        ctx.shadowBlur=0;
    }

    // Gilbert yell popup
    if(s.state==='gilbert_yell'){
        const fade=Math.min(1,s.timer/15);
        ctx.globalAlpha=fade;
        const bx=60, by=H/2-50, bw=W-120, bh=80;
        ctx.fillStyle='rgba(5,15,5,0.92)';ctx.fillRect(bx,by,bw,bh);
        ctx.strokeStyle='rgba(68,255,68,0.6)';ctx.lineWidth=2;ctx.strokeRect(bx+0.5,by+0.5,bw-1,bh-1);
        ctx.font='bold 14px Courier New';ctx.textAlign='left';ctx.fillStyle='#44ff44';
        ctx.shadowBlur=10;ctx.shadowColor='#44ff44';
        ctx.fillText('GILBERT:',bx+20,by+30);
        ctx.shadowBlur=0;
        ctx.font='bold 18px Courier New';ctx.fillStyle='#fff';
        ctx.fillText('"HELP!! They\'ve got me cornered!"',bx+20,by+56);
        ctx.globalAlpha=1;
    }

    // Post-rescue battle timer (30s countdown to victory)
    if(s.state==='post_rescue_battle'){
        const remaining=Math.max(0,30-Math.floor(s.timer/60));
        ctx.font='bold 16px Courier New';ctx.textAlign='center';ctx.fillStyle='#44ff66';
        ctx.shadowBlur=12;ctx.shadowColor='#44ff44';
        ctx.fillText(`FINISH THEM — ${remaining}s`,W/2,30);
        ctx.shadowBlur=0;
    }

    // Battlefield timer (60s countdown in battlefield phase)
    if(s.state==='battlefield'){
        const remaining=Math.max(0,60-Math.floor(s.timer/60));
        ctx.font='bold 14px Courier New';ctx.textAlign='center';ctx.fillStyle='#aaccff';
        ctx.shadowBlur=8;ctx.shadowColor='#88ccff';
        ctx.fillText(`HOLD THE LINE — ${remaining}s`,W/2,30);
        ctx.shadowBlur=0;
        // Casualty counts + player kills
        let aCount=0,rCount=0;
        for(const b of battleBots){if(b.captor)continue;if(b.team==='alliance')aCount++;else rCount++;}
        ctx.font='11px Courier New';ctx.textAlign='left';
        ctx.fillStyle='#88ccff';ctx.fillText('◆ ALLIANCE: '+aCount,20,30);
        ctx.textAlign='right';ctx.fillStyle='#ff8833';ctx.fillText('◆ ROGUES: '+rCount,W-20,30);
        const pk=s.playerKillsInBattle||0;
        ctx.textAlign='center';
        if(pk>=3){
            ctx.fillStyle='#44ff66';ctx.shadowBlur=12;ctx.shadowColor='#44ff44';
            ctx.fillText('YOUR KILLS: '+pk+'  ◆ SAFE ◆',W/2,48);
            ctx.shadowBlur=0;
        } else {
            ctx.fillStyle='#ffdd66';
            ctx.fillText('YOUR KILLS: '+pk+' / 3',W/2,48);
        }
        // Battle-start immunity indicator
        if(G.invincibleTimer>0 && s.timer<660){
            const secs=Math.ceil(G.invincibleTimer/60);
            const ip=0.6+Math.sin(T/150)*0.4;
            ctx.globalAlpha=ip;
            ctx.font='bold 20px Courier New';ctx.textAlign='center';ctx.fillStyle='#00ffcc';
            ctx.shadowBlur=20;ctx.shadowColor='#00ffcc';
            ctx.fillText(`◆ IMMUNITY: ${secs}s ◆`,W/2,72);
            ctx.shadowBlur=0;ctx.globalAlpha=1;
        }
        // Reinforcement warning flash
        if(s.reinforceFlash>0){
            s.reinforceFlash--;
            const rp=s.reinforceFlash/90;
            ctx.globalAlpha=rp;
            ctx.font='bold 22px Courier New';ctx.fillStyle='#ff3333';
            ctx.shadowBlur=25;ctx.shadowColor='#ff0000';
            ctx.fillText('⚠ ROGUE REINFORCEMENTS INCOMING ⚠',W/2,72);
            ctx.shadowBlur=0;ctx.globalAlpha=1;
        }
    }

    // Captain radio dialogue during losing war (persists into retreat)
    if((s.state==='losing_war'||s.state==='retreat') && s.losingDialogue && s.losingDialogueTimer>0){
        const fadeIn=Math.min(1,(360-s.losingDialogueTimer)/15);
        const fadeOut=Math.min(1,s.losingDialogueTimer/30);
        ctx.globalAlpha=Math.min(fadeIn,fadeOut);
        const bw=Math.min(W-60,720), bh=80;
        const bx=W/2-bw/2, by=H-bh-24;
        // Glass box
        ctx.fillStyle='rgba(30,5,5,0.92)';ctx.fillRect(bx,by,bw,bh);
        ctx.strokeStyle='rgba(255,80,80,0.7)';ctx.lineWidth=2;ctx.strokeRect(bx+0.5,by+0.5,bw-1,bh-1);
        // Accent bar
        const accg=ctx.createLinearGradient(bx,by,bx+bw,by);
        accg.addColorStop(0,'transparent');accg.addColorStop(0.5,'#ff6666');accg.addColorStop(1,'transparent');
        ctx.fillStyle=accg;ctx.fillRect(bx,by,bw,2);
        // Speaker
        ctx.font='bold 12px Courier New';ctx.textAlign='left';
        ctx.shadowBlur=8;ctx.shadowColor='#ff6666';
        ctx.fillStyle='#ff8888';ctx.fillText('CAPTAIN (SECTOR A):',bx+18,by+24);
        ctx.shadowBlur=0;
        // Line
        ctx.font='bold 14px Courier New';ctx.fillStyle='#ffffff';
        ctx.fillText('"'+s.losingDialogue+'"',bx+18,by+52);
        ctx.globalAlpha=1;
    }

    // Retreat overlay
    if(s.state==='retreat'){
        const fade=Math.min(1,s.timer/20);
        ctx.fillStyle=`rgba(0,0,0,${fade*0.7})`;ctx.fillRect(0,0,W,H);
        ctx.globalAlpha=fade;
        ctx.font='bold 42px Courier New';ctx.textAlign='center';ctx.fillStyle='#ff6666';
        ctx.shadowBlur=30;ctx.shadowColor='#ff0000';
        ctx.fillText('RETREAT TO STATION',W/2,H/2-10);
        ctx.font='bold 15px Courier New';ctx.fillStyle='#ffaaaa';
        ctx.fillText('Regroup. Rearm. Try again.',W/2,H/2+22);
        ctx.shadowBlur=0;ctx.globalAlpha=1;
    }

    // Losing war state — alliance is failing, player needs 3 kills to turn the tide
    if(s.state==='losing_war'){
        const remaining=Math.max(0,60-Math.floor(s.timer/60));
        const kills=s.playerKillsInBattle||0;
        const needed=Math.max(0,3-kills);
        // Red screen pulse
        const pulse=0.15+Math.sin(T/300)*0.05;
        ctx.globalAlpha=pulse;ctx.fillStyle='#660000';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
        // Header
        const hp=0.7+Math.sin(T/250)*0.3;
        ctx.font='bold 28px Courier New';ctx.textAlign='center';ctx.fillStyle='#ff3333';
        ctx.shadowBlur=25;ctx.shadowColor='#ff0000';
        ctx.globalAlpha=hp;
        ctx.fillText('⚠ ALLIANCE LINE COLLAPSING ⚠',W/2,40);
        ctx.globalAlpha=1;
        ctx.shadowBlur=0;
        // Kill requirement
        ctx.font='bold 16px Courier New';ctx.fillStyle='#ffcc33';
        ctx.shadowBlur=10;ctx.shadowColor='#ff8800';
        ctx.fillText(`TURN THE TIDE — ${needed} MORE ROGUE KILL${needed===1?'':'S'} NEEDED`,W/2,72);
        ctx.shadowBlur=0;
        // Counts
        let aCount=0,rCount=0;
        for(const b of battleBots){if(b.captor)continue;if(b.team==='alliance')aCount++;else rCount++;}
        ctx.font='11px Courier New';ctx.textAlign='left';
        ctx.fillStyle='#88ccff';ctx.fillText('◆ ALLIANCE: '+aCount,20,30);
        ctx.textAlign='right';ctx.fillStyle='#ff8833';ctx.fillText('◆ ROGUES: '+rCount,W-20,30);
        ctx.textAlign='center';ctx.fillStyle='#ffdd66';
        ctx.fillText('YOUR KILLS: '+kills+' / 3',W/2,94);
        // Countdown
        ctx.font='bold 13px Courier New';ctx.fillStyle='#ff6666';
        ctx.fillText('COLLAPSE IN — '+remaining+'s',W/2,114);
    }

    // Gilbert thanks popup after rescue
    if(s.state==='gilbert_thanks'){
        const fade=Math.min(1,s.timer/20);
        ctx.globalAlpha=fade;
        const bx=60, by=H/2-70, bw=W-120, bh=110;
        ctx.fillStyle='rgba(5,15,5,0.94)';ctx.fillRect(bx,by,bw,bh);
        ctx.strokeStyle='#44ff44';ctx.lineWidth=2;ctx.strokeRect(bx+0.5,by+0.5,bw-1,bh-1);
        ctx.font='bold 14px Courier New';ctx.textAlign='left';ctx.fillStyle='#44ff44';
        ctx.shadowBlur=10;ctx.shadowColor='#44ff44';
        ctx.fillText('GILBERT:',bx+20,by+30);
        ctx.shadowBlur=0;
        ctx.font='bold 17px Courier New';ctx.fillStyle='#fff';
        ctx.fillText('"'+(s.thanksLine||'')+'"',bx+20,by+58);
        // Key-awarded banner
        ctx.font='bold 13px Courier New';ctx.fillStyle='#ffdd00';
        ctx.shadowBlur=8;ctx.shadowColor='#ffdd00';
        ctx.fillText('★ ITEM RECEIVED:  MODULE ACCESS  ★',bx+20,by+88);
        ctx.shadowBlur=0;
        ctx.font='11px Courier New';ctx.fillStyle='#888';
        ctx.textAlign='right';
        ctx.fillText('Press [TAB] to open your inventory',bx+bw-20,by+bh-8);
        ctx.globalAlpha=1;
    }
    // Rescue prompt — charge a big shot and hit Gilbert with it to free him
    if(s.state==='gilbert_found'){
        const p=0.6+Math.sin(T/150)*0.4;
        ctx.globalAlpha=p;
        ctx.font='bold 22px Courier New';ctx.textAlign='center';ctx.fillStyle='#ffcc00';
        ctx.shadowBlur=20;ctx.shadowColor='#ffaa00';
        ctx.fillText('HOLD [SPACE] TO CHARGE — HIT GILBERT WITH THE BIG SHOT',W/2,H-60);
        ctx.shadowBlur=0;ctx.globalAlpha=1;
    }
    if(s.state==='released'){
        // White flash (only first 15 frames)
        const fl=Math.max(0,1-s.timer/15);
        ctx.globalAlpha=fl;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
        ctx.globalAlpha=1;
        // Draw expanding shockwave ring at Gilbert's position (in world space)
        if(s.shockwaveRadius>0 && s.shockwaveRadius<900){
            const gx=s.gilbertPos.x-s.camera.x, gy=s.gilbertPos.y-s.camera.y;
            const r=s.shockwaveRadius;
            // Outer ring (main wave)
            const ringAlpha=Math.max(0,1-r/840);
            ctx.save();
            ctx.shadowBlur=50;ctx.shadowColor='#ffff00';
            // Main bright ring
            ctx.strokeStyle=`rgba(255,255,200,${ringAlpha})`;ctx.lineWidth=6;
            ctx.beginPath();ctx.arc(gx,gy,r,0,Math.PI*2);ctx.stroke();
            // Inner bright ring
            ctx.strokeStyle=`rgba(255,240,120,${ringAlpha*0.8})`;ctx.lineWidth=12;
            ctx.beginPath();ctx.arc(gx,gy,r-8,0,Math.PI*2);ctx.stroke();
            // Outer fading ring
            ctx.strokeStyle=`rgba(255,180,0,${ringAlpha*0.5})`;ctx.lineWidth=3;
            ctx.beginPath();ctx.arc(gx,gy,r+20,0,Math.PI*2);ctx.stroke();
            // Shockwave-distorted radial streaks
            ctx.strokeStyle=`rgba(255,255,180,${ringAlpha*0.6})`;ctx.lineWidth=2;
            for(let i=0;i<24;i++){
                const a=i*Math.PI*2/24+T/500;
                const x1=gx+Math.cos(a)*r;
                const y1=gy+Math.sin(a)*r;
                const x2=gx+Math.cos(a)*(r+35);
                const y2=gy+Math.sin(a)*(r+35);
                ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
            }
            // Inner burst glow
            const bg=ctx.createRadialGradient(gx,gy,0,gx,gy,r);
            bg.addColorStop(0,`rgba(255,255,255,${ringAlpha*0.25})`);
            bg.addColorStop(0.5,`rgba(255,220,100,${ringAlpha*0.1})`);
            bg.addColorStop(1,'transparent');
            ctx.fillStyle=bg;ctx.beginPath();ctx.arc(gx,gy,r,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;
            ctx.restore();
        }
        // Epicenter burst (at Gilbert pos)
        if(s.timer<45){
            const gx=s.gilbertPos.x-s.camera.x, gy=s.gilbertPos.y-s.camera.y;
            const burstR=60*(1-s.timer/45);
            ctx.save();
            ctx.shadowBlur=60;ctx.shadowColor='#ffffff';
            const eb=ctx.createRadialGradient(gx,gy,0,gx,gy,burstR);
            eb.addColorStop(0,'rgba(255,255,255,0.9)');
            eb.addColorStop(0.5,'rgba(255,240,120,0.5)');
            eb.addColorStop(1,'transparent');
            ctx.fillStyle=eb;ctx.beginPath();ctx.arc(gx,gy,burstR,0,Math.PI*2);ctx.fill();
            ctx.restore();
        }
        // "BIG SHOT!" text — appears then fades
        const ta=Math.min(1,s.timer/15);
        ctx.globalAlpha=ta*(1-Math.max(0,(s.timer-180)/60));
        const textScale=1+Math.min(1,s.timer/20)*0.3;
        ctx.save();ctx.translate(W/2,H/2);ctx.scale(textScale,textScale);
        ctx.font='bold 64px Courier New';ctx.textAlign='center';ctx.fillStyle='#ffff00';
        ctx.shadowBlur=50;ctx.shadowColor='#ffcc00';
        ctx.fillText('BIG SHOT!',0,0);
        // Subtitle
        ctx.font='bold 14px Courier New';ctx.fillStyle='#ffddaa';
        ctx.shadowBlur=15;
        ctx.fillText('◆ ROGUES ELIMINATED ◆',0,28);
        ctx.shadowBlur=0;
        ctx.restore();
        ctx.globalAlpha=1;
    }
    if(s.state==='victory'){
        const fade=Math.min(1,s.timer/30);
        // Dark overlay
        ctx.fillStyle=`rgba(0,10,5,${fade*0.75})`;ctx.fillRect(0,0,W,H);
        ctx.globalAlpha=fade;
        ctx.font='bold 54px Courier New';ctx.textAlign='center';
        ctx.fillStyle='#44ff66';
        ctx.shadowBlur=40;ctx.shadowColor='#00ff44';
        ctx.fillText('VICTORY!',W/2,H/2-50);
        ctx.font='bold 16px Courier New';ctx.fillStyle='#aaffaa';
        ctx.fillText('THE WAR IS WON — LEVEL 7',W/2,H/2-18);
        ctx.shadowBlur=0;
        // Captain thank-you (appears after 1s)
        if(s.timer>60){
            const ca=Math.min(1,(s.timer-60)/20);
            ctx.globalAlpha=fade*ca;
            ctx.font='bold 13px Courier New';ctx.fillStyle='#aaccff';
            ctx.shadowBlur=8;ctx.shadowColor='rgba(170,200,255,0.5)';
            ctx.fillText('CAPTAIN (SECTOR A):',W/2,H/2+14);
            ctx.shadowBlur=0;
            ctx.font='15px Courier New';ctx.fillStyle='#ffffff';
            ctx.fillText('"Thank you, pilot. We owe you everything."',W/2,H/2+36);
            ctx.font='13px Courier New';ctx.fillStyle='#88aacc';
            ctx.fillText('The fleet departs to secure Sector A.',W/2,H/2+56);
        }
        // Big shot unlock notice (appears after 2.5s)
        if(s.timer>150){
            const ua=Math.min(1,(s.timer-150)/20);
            ctx.globalAlpha=fade*ua;
            ctx.font='bold 14px Courier New';ctx.fillStyle='#ffcc00';
            ctx.shadowBlur=12;ctx.shadowColor='#ffaa00';
            ctx.fillText('⚡ ABILITY UNLOCKED: BIG SHOT ⚡',W/2,H/2+92);
            ctx.shadowBlur=0;
            ctx.font='11px Courier New';ctx.fillStyle='#cc9966';
            ctx.fillText('Hold [SPACE] 2s, release for a 5-damage shot that vaporizes asteroids.',W/2,H/2+110);
        }
        ctx.globalAlpha=1;
    }
    if(s.state==='failed'){
        ctx.fillStyle='rgba(30,0,0,0.9)';ctx.fillRect(0,0,W,H);
        ctx.font='bold 36px Courier New';ctx.textAlign='center';ctx.fillStyle='#ff3333';
        ctx.shadowBlur=30;ctx.shadowColor='#ff0000';
        ctx.fillText("GILBERT FELL — YOU COULDN'T SAVE HIM",W/2,H/2);
        ctx.shadowBlur=0;
    }
}

// ============================================================
//  BIG SHOT ABILITY (used after level 6)
// ============================================================
G.bigShotCharging=false;
G.bigShotCharge=0;
G.bigShotReady=false;

function updateBigShot(){
    // Player holds space to charge big shot (only after unlocked + not during level 6)
    if(!G.level6 || !G.level6.bigShotUnlocked) return;
    // Allow charging during the 'gilbert_found' rescue window, otherwise only outside level 6.
    if(G.level6.state && G.level6.state!=='gilbert_found') return;
    if(!G.running || G.mode!=='space') return;
    // Hold for 2 seconds to charge
    if(typeof isAction==='function' && isAction('fire')){
        G.bigShotCharge++;
        if(G.bigShotCharge>120){G.bigShotReady=true;}
    } else {
        if(G.bigShotReady){
            // Fire big shot
            fireBigShot();
        }
        G.bigShotCharge=0; G.bigShotReady=false;
    }
}

function fireBigShot(){
    // Launches a super bullet in ship facing direction
    bullets.push({
        x:ship.x+Math.cos(ship.a)*ship.r,
        y:ship.y+Math.sin(ship.a)*ship.r,
        dx:Math.cos(ship.a)*16, dy:Math.sin(ship.a)*16,
        trail:[], big:true, damage:5
    });
    boom(ship.x,ship.y,'#ffff00',25);
    if(typeof Sound!=='undefined' && Sound.explode) Sound.explode();
    shake(10,15);
}

// ============================================================
//  DEV / DEBUG HELPERS
// ============================================================
function devStartLevel6(){
    G.level6.state=null;
    G.level6.bigShotUnlocked=false;
    if(G.slotId && saves[G.slotId]) saves[G.slotId].level6Triggered=false;
    startLevel6();
    // Skip past warning_pending directly to rouges phase
    G.level6.state='warning'; G.level6.timer=0;
}
function devSkipToArena(){
    startLevel6();
    G.level6.state='kidnap_warn'; G.level6.timer=60*2.9;
}
function devSkipToBattlefield(){
    startLevel6();
    G.level6.state='ambush'; G.level6.timer=60*1.9;
}
function devSkipToGilbertSave(){
    startLevel6();
    setupBattlefield();
    captureGilbertToTrappedArea();
    G.level6.state='gilbert_yell'; G.level6.timer=60*2.9;
}

function drawBigShotUI(){
    if(!G.level6 || !G.level6.bigShotUnlocked) return;
    if(G.level6.state && G.level6.state!=='gilbert_found') return;
    if(G.bigShotCharge<=0) return;
    const pct=Math.min(1,G.bigShotCharge/120);
    const bw=180, bh=10, bx=W/2-bw/2, by=H-45;
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle='#ffcc00';ctx.lineWidth=1.5;ctx.strokeRect(bx,by,bw,bh);
    const fg=ctx.createLinearGradient(bx,by,bx+bw,by);
    fg.addColorStop(0,'#ff6600');fg.addColorStop(1,'#ffff00');
    ctx.fillStyle=fg;ctx.fillRect(bx+2,by+2,(bw-4)*pct,bh-4);
    ctx.font='bold 10px Courier New';ctx.textAlign='center';
    ctx.fillStyle=G.bigShotReady?'#ffff00':'#ffcc00';
    ctx.shadowBlur=G.bigShotReady?10:0;ctx.shadowColor='#ffcc00';
    ctx.fillText(G.bigShotReady?'BIG SHOT READY — RELEASE!':'CHARGING BIG SHOT...',W/2,by-4);
    ctx.shadowBlur=0;
}

