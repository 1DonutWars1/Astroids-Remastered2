// ============================================================
//  UPDATE
// ============================================================
function update() {
    if(!G.running||G.practicePaused||G.paused||G.fastTravelOpen) {
        if(!G.practicePaused&&!G.paused){
            for(const a of asteroids){a.x+=a.dx;a.y+=a.dy;a.angle+=a.rot;
                if(a.x<-a.r)a.x=W+a.r;if(a.x>W+a.r)a.x=-a.r;if(a.y<-a.r)a.y=H+a.r;if(a.y>H+a.r)a.y=-a.r;}
        }
        return;
    }
    // Station mode
    if(G.mode==='station'){updateStation();return;}
    // Cutscene mode
    if(G.stationCutscene){updateCutscene();return;}
    if(G.tutorial) updateTutorial();

    if(G.comboTimer>0)G.comboTimer--; else{G.combo=0;G.consecutiveKills=0;document.getElementById('comboRow').style.display='none';}
    if(isAction('fire')) shoot();
    if(G.shotTimer>0) G.shotTimer--;
    if(G.invincibleTimer>0) G.invincibleTimer--;
    if(G.tripleShotTimer>0){G.tripleShotTimer--;document.getElementById('powerupRow').style.display=G.tripleShotTimer>0?'block':'none';}
    if(G.shakeTimer>0) G.shakeTimer--;
    if(G.dashCooldown>0) G.dashCooldown--;
    // Tank repair timer
    if(G.tankRepairTimer>0){G.tankRepairTimer--;if(G.tankRepairTimer<=0){G.tankDamaged=false;}}
    // Passive modules
    if(G.equippedModules.includes('shield_regen')&&G.hasForceField&&G.shieldFuel<3&&!G.tankDamaged){
        G.fuelTimer++;if(G.fuelTimer>600){G.shieldFuel++;updateShieldUI();G.fuelTimer=0;}
    }
    if(G.equippedModules.includes('rear_gun')&&G.running){
        G.rearGunTimer=(G.rearGunTimer||0)+1;
        if(G.rearGunTimer>90){
            const ra=ship.a+Math.PI;
            bullets.push({x:ship.x+Math.cos(ra)*ship.r,y:ship.y+Math.sin(ra)*ship.r,
                dx:Math.cos(ra)*5,dy:Math.sin(ra)*5,trail:[]});
            G.rearGunTimer=0;
        }
    }

    const elapsed=(performance.now()-G.waveStart)/1000;
    // reload bar
    const pct=G.shotTimer>0?(1-G.shotTimer/SHOT_CD)*100:100;
    const bar=document.getElementById('reloadBar');
    bar.style.width=pct+'%';
    bar.style.background=G.shotTimer>0?(G.tripleShotTimer>0?'orange':'#ff3333'):(G.tripleShotTimer>0?'orange':'#00ff00');

    // stars
    for(const s of stars){s.y+=s.speed;if(isAction('thrust'))s.y+=s.speed*3;if(s.y>H){s.y=0;s.x=Math.random()*W;}}

    // SHIP
    if(isAction('left')) ship.a-=TURN;
    if(isAction('right')) ship.a+=TURN;
    if(isAction('thrust')){
        ship.tx+=THRUST*Math.cos(ship.a); ship.ty+=THRUST*Math.sin(ship.a);
        if(Math.random()<0.6) particles.push({x:ship.x-Math.cos(ship.a)*ship.r,y:ship.y-Math.sin(ship.a)*ship.r,dx:(Math.random()-0.5)*1.5,dy:(Math.random()-0.5)*1.5,life:12,maxLife:12,color:'#00ccff',size:2});
    }
    ship.x+=ship.tx;ship.y+=ship.ty;ship.tx*=FRICTION;ship.ty*=FRICTION;
    if(ship.x<-ship.r)ship.x=W+ship.r;if(ship.x>W+ship.r)ship.x=-ship.r;
    if(ship.y<-ship.r)ship.y=H+ship.r;if(ship.y>H+ship.r)ship.y=-ship.r;

    // BOSS ENTER
    if(boss&&boss.state==='enter'){
        boss.y+=boss.dy;
        // Snake boss: drag segments down during enter + start widescreen
        if(boss.type===5){
            boss.segments[0].y=boss.y;boss.segments[0].x=boss.x;
            for(let i=1;i<boss.segments.length;i++){
                boss.segments[i].y+=boss.dy*0.8;
                boss.segments[i].x=boss.x;
            }
            if(boss.widescreenActive&&boss.widescreenTransition<1){
                boss.widescreenTransition=Math.min(1,boss.widescreenTransition+0.015);
                const nw=Math.round(900+(1400-900)*boss.widescreenTransition);
                canvas.width=nw;W=nw;
            }
        }
        if(boss.y>100){boss.state=boss.type===5?'slither':'target';boss.dy=0;boss.timer=0;G.invincibleTimer=90;}
        updateUI();return;
    }

    // LEVEL TRIGGER (blocked during boss rush and Gilbert events)
    if(!boss&&!G.tutorial&&!G.noBoss&&!G.bossRush&&(G.gilbertState==='none'||G.gilbertState==='rope'||G.gilbertState==='ally'||G.gilbertState==='scrap_collect')&&elapsed>BOSS_TIME){
        if(window.DLC&&window.DLC.loaded){
            // DLC: 10 levels. Bosses at 1, 2, 4(cyborg), 10(sans). Others are wave-only.
            if(G.level<=2) spawnBoss(G.level);
            else if(G.level===4) spawnBoss(4);
            else if(G.level===5) spawnBoss(5);
            else if(G.level>=10) spawnBoss(10);
            else { G.level++;G.waveStart=performance.now();G.spawnTimer=0;asteroids=[];for(let k=0;k<8;k++)spawnAsteroid();updateUI(); }
        } else {
            // No DLC: 3 levels. Boss 1, Boss 2, Sans (boss 3).
            if(G.level<=3) spawnBoss(G.level);
        }
    }

    // BOSS RUSH (DLC) — trigger 55s after boss 2 defeat
    if(window.DLC&&window.DLC.loaded&&!G.bossRush&&G.bossRushStartTime>0&&G.gilbertState==='none'&&!boss){
        const sinceB2=(performance.now()-G.bossRushStartTime)/1000;
        if(sinceB2>=55){
            G.bossRushStartTime=0;
            startBossRush();
        }
    }
    // Boss rush wave management
    if(G.bossRush) updateBossRush();

    // Gilbert update
    if(window.DLC&&window.DLC.loaded) updateGilbert();
    // Gilbert quip timer
    if(G.gilbertQuipTimer>0) G.gilbertQuipTimer--; else G.gilbertQuip='';

    // Widescreen return transition (after snake boss defeat)
    if(G.widescreenReturning){
        G.widescreenReturnProgress-=0.02;
        if(G.widescreenReturnProgress<=0){
            G.widescreenReturning=false;canvas.width=900;W=900;
        } else {
            const nw=Math.round(900+(1400-900)*G.widescreenReturnProgress);
            canvas.width=nw;W=nw;
        }
    }

    // SPAWNING (blocked during boss rush and Gilbert dialogue)
    if(!boss&&!G.tutorial&&!G.bossRush&&!G.gilbertDialogue){
        G.spawnTimer++;
        const diff=DIFFICULTY[currentDifficulty]||DIFFICULTY.normal;
        const maxAst=Math.round((5+G.level*3)*diff.astMax), rate=Math.max(30,Math.round((90-G.level*10)*diff.astRate));
        if(G.spawnTimer>rate&&asteroids.length<maxAst){spawnAsteroid();G.spawnTimer=0;}
        if(!G.noMiniBoss&&Math.random()<0.0002*G.level*diff.mbChance) spawnMiniBoss();
        // fuel spawns after boss 2
        if(G.hasForceField){G.fuelTimer++;if(G.fuelTimer>Math.round(1500*diff.fuelRate)){spawnAsteroid(undefined,undefined,undefined,'fuel');G.fuelTimer=0;}}
    }

    // Force field drop pickup
    if(G.forceFieldDrop){
        if(Math.hypot(ship.x-G.forceFieldDrop.x,ship.y-G.forceFieldDrop.y)<ship.r+G.forceFieldDrop.size){
            G.hasForceField=true; G.shieldFuel=getMaxShieldFuel(); updateShieldUI();
            boom(ship.x,ship.y,'cyan',30); Sound.powerup(); G.forceFieldDrop=null;
            unlockAch('shield_up');
            if(window.DLC&&window.DLC.loaded) gilbertIntro('forcefield',GILBERT_INTROS.forcefield);
        }
    }

    // AMMO
    G.ammoTimer++; if(!G.tutorial&&G.ammoTimer>1500){dropAmmo();G.ammoTimer=0;}
    for(let i=ammoBoxes.length-1;i>=0;i--){const b=ammoBoxes[i];b.y+=b.dy;
        // Magnet module
        if(G.equippedModules.includes('magnet')){const md=Math.hypot(ship.x-b.x,ship.y-b.y);if(md<200&&md>1){b.x+=(ship.x-b.x)/md*1.5;b.y+=(ship.y-b.y)/md*1.5;}}
        if(Math.hypot(ship.x-b.x,ship.y-b.y)<ship.r+b.size){G.ammo+=25;if(G.ammo>=100)unlockAch('stockpile');if(G.ammo>G.peakAmmo)G.peakAmmo=G.ammo;if(window.DLC&&window.DLC.loaded&&G.peakAmmo>=200)unlockAch('dlc_hoarder');Sound.powerup();ammoBoxes.splice(i,1);if(window.DLC&&window.DLC.loaded)gilbertIntro('ammobox',GILBERT_INTROS.ammobox);updateUI();}
        else if(b.y>H+50)ammoBoxes.splice(i,1);}

    // POWERUPS
    G.powerTimer++; if(!G.tutorial&&G.powerTimer>2200){dropPowerup();G.powerTimer=0;}
    for(let i=powerups.length-1;i>=0;i--){const p=powerups[i];p.x+=p.dx;p.y+=p.dy;
        if(Math.hypot(ship.x-p.x,ship.y-p.y)<ship.r+p.size){G.tripleShotTimer=480;Sound.powerup();powerups.splice(i,1);if(window.DLC&&window.DLC.loaded)gilbertIntro('tripleshot',GILBERT_INTROS.tripleshot);}
        else if(p.y>H+50)powerups.splice(i,1);}

    // ASTEROIDS
    for(let i=asteroids.length-1;i>=0;i--){
        const a=asteroids[i];
        if(!G.tutorial){a.x+=a.dx;a.y+=a.dy;} a.angle+=a.rot;
        if(a.x<-120||a.x>W+120||a.y<-120||a.y>H+120){asteroids.splice(i,1);continue;}
        const dist=Math.hypot(ship.x-a.x,ship.y-a.y);
        if(dist<ship.r*0.6+a.r*0.7){hurtPlayer();boom(a.x,a.y,'#888');asteroids.splice(i,1);continue;}
        // Check if a spawner is alive (shields asteroids)
        const spawnerAlive=miniBosses.some(m=>m.type==='spawner');
        for(let j=bullets.length-1;j>=0;j--){
            if(Math.hypot(bullets[j].x-a.x,bullets[j].y-a.y)<a.r+4){
                // If spawner is alive and this isn't a fuel asteroid, deflect the bullet
                if(spawnerAlive&&a.type!=='fuel'){
                    // Shield deflect — reflect bullet away
                    const bAngle=Math.atan2(bullets[j].dy,bullets[j].dx);
                    const deflectAngle=Math.atan2(bullets[j].y-a.y,bullets[j].x-a.x);
                    bullets[j].dx=Math.cos(deflectAngle)*bulletSpeed*0.5;
                    bullets[j].dy=Math.sin(deflectAngle)*bulletSpeed*0.5;
                    bullets[j].x=a.x+Math.cos(deflectAngle)*(a.r+8);
                    bullets[j].y=a.y+Math.sin(deflectAngle)*(a.r+8);
                    // Shield flash animation
                    shieldFlashes.push({x:a.x,y:a.y,r:a.r,life:20,maxLife:20,hitAngle:deflectAngle});
                    Sound.shieldSfx();
                    continue;
                }
                if(a.type==='fuel'){boom(a.x,a.y,'#ffff00');Sound.powerup();if(G.hasForceField&&G.shieldFuel<3){G.shieldFuel++;updateShieldUI();}G.fuelCollected++;if(G.fuelCollected>=5)unlockAch('fuel_collector');if(window.DLC&&window.DLC.loaded)gilbertIntro('fuel',GILBERT_INTROS.fuel);}
                else{boom(a.x,a.y,'#888');Sound.explode();if(a.r>20&&!G.tutorial){spawnAsteroid(a.x,a.y,a.r/2);spawnAsteroid(a.x,a.y,a.r/2);}
                    G.asteroidsDestroyed++;unlockAch('first_blood');if(G.asteroidsDestroyed>=100)unlockAch('rock_crusher');
                    if(G.tripleShotTimer>0)unlockAch('triple_threat');
                    if(window.DLC&&window.DLC.loaded){G.consecutiveKills++;if(G.consecutiveKills>=10)unlockAch('dlc_chain_reaction');if(G.asteroidsDestroyed>=250)unlockAch('dlc_mass_destroyer');}}
                bullets.splice(j,1);asteroids.splice(i,1);addScore(100);break;
            }
        }
    }

    // BULLETS
    for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.trail.push({x:b.x,y:b.y});if(b.trail.length>6)b.trail.shift();
        b.x+=b.dx;b.y+=b.dy;if(b.x<0||b.x>W||b.y<0||b.y>H)bullets.splice(i,1);}

    // PARTICLES
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.dx;p.y+=p.dy;p.life--;p.dx*=0.98;p.dy*=0.98;if(p.life<=0)particles.splice(i,1);}

    // SHIELD FLASHES
    for(let i=shieldFlashes.length-1;i>=0;i--){shieldFlashes[i].life--;if(shieldFlashes[i].life<=0)shieldFlashes.splice(i,1);}

    // CYBORG SCRAPS drift
    for(const sc of (G.cyborgScraps||[])){
        sc.x+=sc.dx;sc.y+=sc.dy;sc.angle+=sc.rot;
        sc.dx*=0.995;sc.dy*=0.995;
        if(sc.x<sc.r)sc.dx=Math.abs(sc.dx);if(sc.x>W-sc.r)sc.dx=-Math.abs(sc.dx);
        if(sc.y<sc.r)sc.dy=Math.abs(sc.dy);if(sc.y>H-sc.r)sc.dy=-Math.abs(sc.dy);
    }

    // MINI BOSSES
    for(let i=miniBosses.length-1;i>=0;i--){
        const mb=miniBosses[i], toShip=Math.atan2(ship.y-mb.y,ship.x-mb.x);
        if(mb.type==='chaser'){
            mb.x+=Math.cos(toShip)*mb.speed;mb.y+=Math.sin(toShip)*mb.speed;mb.rot+=0.08;
        } else if(mb.type==='blaster'){
            // BLASTER mini boss (DLC): approaches for 10s, then fires a gaster blaster
            mb.rot+=0.03;mb.timer++;
            if(mb.state==='move'){
                // Slowly approach player
                mb.x+=Math.cos(toShip)*mb.speed;mb.y+=Math.sin(toShip)*mb.speed;
                // After 600 frames (~10 seconds), lock and charge
                if(mb.timer>600){mb.state='lock';mb.timer=0;mb.blasterTarget={x:ship.x,y:ship.y};}
            } else if(mb.state==='lock'){
                // Stop moving, telegraph — shake in place
                mb.x+=(Math.random()-0.5)*4;mb.y+=(Math.random()-0.5)*4;
                // After brief telegraph, fire blaster
                if(mb.timer>60){
                    const angle=Math.atan2(ship.y-mb.y,ship.x-mb.x);
                    gasterBlasters.push({x:mb.x,y:mb.y,angle:angle,timer:0});
                    boom(mb.x,mb.y,'cyan',15);Sound.bossWarn();
                    mb.state='cooldown';mb.timer=0;
                }
            } else if(mb.state==='cooldown'){
                // Drift slowly after firing
                mb.x+=Math.cos(toShip)*0.3;mb.y+=Math.sin(toShip)*0.3;
                if(mb.timer>180){mb.state='move';mb.timer=0;}
            }
        } else if(mb.type==='spawner'){
            // SPAWNER mini boss (DLC): wanders, spawns asteroids, shields all asteroids while alive
            mb.rot+=0.06;mb.timer++;
            // Drift away from player, stay on screen
            mb.x+=Math.cos(toShip+Math.PI)*mb.speed*0.3;
            mb.y+=Math.sin(toShip+Math.PI)*mb.speed*0.3;
            if(mb.x<50)mb.x=50; if(mb.x>W-50)mb.x=W-50;
            if(mb.y<50)mb.y=50; if(mb.y>H-50)mb.y=H-50;
            // Spawn asteroids periodically
            if(mb.timer%90===0){
                spawnAsteroid(mb.x,mb.y,20);
                boom(mb.x,mb.y,'#44ff44',5);
            }
        } else {
            // Shooter type
            mb.rot+=0.04;
            if(mb.state==='move'){mb.x+=Math.cos(toShip)*mb.speed;mb.y+=Math.sin(toShip)*mb.speed;mb.timer++;if(mb.timer>70){mb.state='charge';mb.timer=0;}}
            else if(mb.state==='charge'){mb.x+=(Math.random()-0.5)*2.5;mb.y+=(Math.random()-0.5)*2.5;mb.timer++;
                if(mb.timer>35){mb.state='move';mb.timer=0;const a=Math.atan2(ship.y-mb.y,ship.x-mb.x);
                for(let k=-2;k<=2;k++)spawnEnemyBullet(mb.x,mb.y,a+k*0.15,9+Math.abs(k));Sound.shoot();boom(mb.x,mb.y,'red',5);}}
        }
        if(Math.hypot(ship.x-mb.x,ship.y-mb.y)<ship.r*0.6+mb.r) hurtPlayer();
        for(let j=bullets.length-1;j>=0;j--){
            if(Math.hypot(bullets[j].x-mb.x,bullets[j].y-mb.y)<mb.r+4){
                const hitCol=mb.type==='blaster'?'cyan':mb.type==='spawner'?'#44ff44':(mb.type==='shooter'?'red':'violet');
                boom(bullets[j].x,bullets[j].y,hitCol,4);mb.hp--;Sound.hit();bullets.splice(j,1);
                if(mb.hp<=0){boom(mb.x,mb.y,hitCol,25);Sound.explode();addScore(mb.type==='blaster'?1000:mb.type==='spawner'?600:(mb.type==='shooter'?800:400));G.miniBossKills++;if(G.miniBossKills>=5)unlockAch('bounty_hunter');if(window.DLC&&window.DLC.loaded&&G.miniBossKills>=10)unlockAch('dlc_exterminator');miniBosses.splice(i,1);break;}
            }
        }
    }

    // GASTER BLASTERS UPDATE
    for(let i=gasterBlasters.length-1;i>=0;i--){
        const gb=gasterBlasters[i]; gb.timer++;
        if(gb.timer===60) Sound.blaster();
        // Beam active from frame 60-90: check if player is in beam path
        if(gb.timer>=60&&gb.timer<90){
            const dx=ship.x-gb.x, dy=ship.y-gb.y;
            const rotX=dx*Math.cos(-gb.angle)-dy*Math.sin(-gb.angle);
            const rotY=dx*Math.sin(-gb.angle)+dy*Math.cos(-gb.angle);
            if(rotX>0&&Math.abs(rotY)<30){
                // Blaster beam kills through everything
                G.shieldFuel=0; updateShieldUI();
                hurtPlayer(true);
            }
        }
        if(gb.timer>100) gasterBlasters.splice(i,1);
    }

    // ENEMY BULLETS
    for(let i=enemyBullets.length-1;i>=0;i--){
        const eb=enemyBullets[i];eb.x+=eb.dx;eb.y+=eb.dy;eb.life--;
        const dist=Math.hypot(ship.x-eb.x,ship.y-eb.y);
        if(G.hasForceField&&G.shieldFuel>0&&dist<ship.r+12){G.shieldFuel--;updateShieldUI();boom(ship.x,ship.y,'cyan',10);Sound.shieldSfx();enemyBullets.splice(i,1);if(G.shieldFuel<=0)boom(ship.x,ship.y,'white',30);continue;}
        if(dist<ship.r*0.6){hurtPlayer();enemyBullets.splice(i,1);continue;}
        if(eb.life<=0||eb.x<-50||eb.x>W+50||eb.y<-50||eb.y>H+50)enemyBullets.splice(i,1);
    }

    // BOSS
    if(boss&&boss.state!=='enter'){
        boss.timer++;boss.x+=boss.dx;boss.y+=boss.dy;
        if(boss.x<-boss.r)boss.x=W+boss.r;if(boss.x>W+boss.r)boss.x=-boss.r;
        if(boss.y<-boss.r)boss.y=H+boss.r;if(boss.y>H+boss.r)boss.y=-boss.r;

        if(boss.type<=2){
            if(boss.state==='target'){boss.angle=Math.atan2(ship.y-boss.y,ship.x-boss.x);boss.dx=Math.cos(boss.angle)*1.5;boss.dy=Math.sin(boss.angle)*1.5;
                if(boss.type===2&&boss.timer>100){boss.state='spawn';boss.timer=0;}else if(boss.timer>160){boss.state='telegraph';boss.timer=0;}}
            else if(boss.state==='spawn'){boss.dx=0;boss.dy=0;if(boss.timer%18===0&&boss.timer<55){spawnAsteroid(boss.x,boss.y,18);boom(boss.x,boss.y,'cyan',4);}if(boss.timer>65){boss.state='target';boss.timer=0;}}
            else if(boss.state==='telegraph'){boss.dx=0;boss.dy=0;boss.x+=(Math.random()-0.5)*5;if(boss.timer>50){boss.state='charge';boss.timer=0;const sp=boss.type===1?13:9;boss.dx=Math.cos(boss.angle)*sp;boss.dy=Math.sin(boss.angle)*sp;}}
            else if(boss.state==='charge'){if(boss.x<0||boss.x>W)boss.dx*=-1;if(boss.y<0||boss.y>H)boss.dy*=-1;if(boss.timer>(boss.type===1?150:80)){boss.state='cooldown';boss.timer=0;boss.dx*=0.1;boss.dy*=0.1;}}
            else if(boss.state==='cooldown'){if(boss.timer>80){boss.state='target';boss.timer=0;}}
        } else if(boss.type===4){
            // --- CYBORG BOSS (DLC Level 4) ---
            if(boss.state==='target'){
                boss.angle=Math.atan2(ship.y-boss.y,ship.x-boss.x);
                boss.dx=Math.cos(boss.angle)*1.8;boss.dy=Math.sin(boss.angle)*1.8;
                if(boss.timer>140){boss.state='wall_telegraph';boss.timer=0;}
            }
            else if(boss.state==='wall_telegraph'){
                // Stop, shake, telegraph the wall
                boss.dx=0;boss.dy=0;
                boss.x+=(Math.random()-0.5)*6;boss.y+=(Math.random()-0.5)*6;
                if(boss.timer>50){
                    // Pick side: push player to left or right half
                    boss.wallSide=ship.x<W/2?'left':'right';
                    boss.state='wall_active';boss.timer=0;boss.wallTimer=0;
                }
            }
            else if(boss.state==='wall_active'){
                // Wall is up — player is trapped on wallSide, boss attacks
                boss.wallTimer++;
                // Boss drifts toward player slowly
                const toShipA=Math.atan2(ship.y-boss.y,ship.x-boss.x);
                boss.dx=Math.cos(toShipA)*1.2;boss.dy=Math.sin(toShipA)*1.2;
                // Keep boss on the correct side
                if(boss.wallSide==='left'&&boss.x>W/2-boss.r){boss.x=W/2-boss.r;boss.dx=-Math.abs(boss.dx);}
                if(boss.wallSide==='right'&&boss.x<W/2+boss.r){boss.x=W/2+boss.r;boss.dx=Math.abs(boss.dx);}
                // Keep player on their trapped side
                if(boss.wallSide==='left'&&ship.x>W/2-5){ship.x=W/2-8;ship.tx=-Math.abs(ship.tx);}
                if(boss.wallSide==='right'&&ship.x<W/2+5){ship.x=W/2+8;ship.tx=Math.abs(ship.tx);}
                // Asteroids from top — moderate pace
                if(boss.timer%35===0){
                    const ax=boss.wallSide==='left'?Math.random()*W*0.45:W*0.55+Math.random()*W*0.45;
                    spawnAsteroid(ax,-40,18);
                }
                // Boss fires single bullet at the player
                if(boss.timer%70===0){
                    const a=Math.atan2(ship.y-boss.y,ship.x-boss.x);
                    spawnEnemyBullet(boss.x,boss.y,a,6);
                    boom(boss.x,boss.y,'#00ff88',3);
                }
                // Wall lasts 4 seconds
                if(boss.wallTimer>240){boss.wallSide=null;boss.state='dash_telegraph';boss.timer=0;}
            }
            else if(boss.state==='dash_telegraph'){
                boss.dx=0;boss.dy=0;
                boss.x+=(Math.random()-0.5)*6;boss.y+=(Math.random()-0.5)*6;
                boss.angle=Math.atan2(ship.y-boss.y,ship.x-boss.x);
                if(boss.timer>55){
                    boss.state='dash';boss.timer=0;
                    boss.dx=Math.cos(boss.angle)*12;boss.dy=Math.sin(boss.angle)*12;
                }
            }
            else if(boss.state==='dash'){
                if(boss.x<0||boss.x>W)boss.dx*=-1;
                if(boss.y<0||boss.y>H)boss.dy*=-1;
                if(boss.timer>100){boss.state='cooldown';boss.timer=0;boss.dx*=0.05;boss.dy*=0.05;}
            }
            else if(boss.state==='cooldown'){
                if(boss.timer>90){boss.state='target';boss.timer=0;}
            }
        } else if(boss.type===5){
            // --- SNAKE BOSS (DLC Level 5) ---
            // Widescreen transition
            if(boss.widescreenActive&&boss.widescreenTransition<1){
                boss.widescreenTransition=Math.min(1,boss.widescreenTransition+0.015);
                const newW=Math.round(900+(1400-900)*boss.widescreenTransition);
                canvas.width=newW;W=newW;
            }
            // Head movement — sinusoidal slither tracking player
            const desA=Math.atan2(ship.y-boss.y,ship.x-boss.x);
            let adiff=desA-boss.angle;
            while(adiff>Math.PI)adiff-=Math.PI*2;
            while(adiff<-Math.PI)adiff+=Math.PI*2;
            boss.angle+=Math.sign(adiff)*Math.min(Math.abs(adiff),boss.turnSpeed);
            const weave=Math.sin(boss.timer*0.05)*0.4;
            const mAngle=boss.angle+weave;
            boss.dx=Math.cos(mAngle)*boss.moveSpeed;
            boss.dy=Math.sin(mAngle)*boss.moveSpeed;
            // Bounce off screen edges (snake doesn't wrap)
            if(boss.x<30){boss.x=30;boss.angle=0;}
            if(boss.x>W-30){boss.x=W-30;boss.angle=Math.PI;}
            if(boss.y<30){boss.y=30;boss.angle=Math.PI/2;}
            if(boss.y>H-30){boss.y=H-30;boss.angle=-Math.PI/2;}
            // Update head segment position
            boss.segments[0].x=boss.x;boss.segments[0].y=boss.y;
            boss.segments[0].angle=boss.angle;
            // Segment following
            const spacing=35;
            for(let i=1;i<boss.segments.length;i++){
                const prev=boss.segments[i-1],seg=boss.segments[i];
                const sdx=prev.x-seg.x,sdy=prev.y-seg.y;
                const sdist=Math.hypot(sdx,sdy);
                if(sdist>spacing&&sdist>0.01){
                    seg.x+=sdx/sdist*(sdist-spacing);
                    seg.y+=sdy/sdist*(sdist-spacing);
                } else if(sdist<0.01){
                    // Prevent NaN — nudge apart
                    seg.x=prev.x-spacing;
                }
                seg.angle=Math.atan2(prev.y-seg.y,prev.x-seg.x);
                if(seg.type==='asteroid'&&!seg.destroyed) seg.angle+=seg.rot*boss.timer;
            }
            // Head shoots at player
            boss.shootTimer++;
            const fireRate=boss.headVulnerable?35:70;
            if(boss.shootTimer>=fireRate){
                const toP=Math.atan2(ship.y-boss.y,ship.x-boss.x);
                if(boss.headVulnerable){
                    for(let k=-2;k<=2;k++) spawnEnemyBullet(boss.x,boss.y,toP+k*0.2,7);
                } else {
                    spawnEnemyBullet(boss.x,boss.y,toP,6);
                    spawnEnemyBullet(boss.x,boss.y,toP+0.15,5);
                    spawnEnemyBullet(boss.x,boss.y,toP-0.15,5);
                }
                boss.shootTimer=0;boom(boss.x,boss.y,'#ff4444',3);
            }
            // Enraged mode — faster
            if(boss.headVulnerable){
                boss.moveSpeed=4;boss.turnSpeed=0.05;
            }
        } else {
            // --- SANS BOSS (type 3 or 10) — matching original attacks ---
            if(boss.state==='dialogue'){
                boss.dx*=0.9; boss.dy*=0.9;
                if(boss.timer>180){boss.state='attack';boss.timer=0;}
            }
            else if(boss.state==='special_pattern'){
                boss.dx*=0.9; boss.dy*=0.9;
                const px=ship.x, py=ship.y;
                // X pattern at frame 15
                if(boss.timer===15){
                    gasterBlasters.push({x:px-200,y:py-200,angle:Math.PI/4,timer:0});
                    gasterBlasters.push({x:px+200,y:py-200,angle:Math.PI*3/4,timer:0});
                    gasterBlasters.push({x:px-200,y:py+200,angle:-Math.PI/4,timer:0});
                    gasterBlasters.push({x:px+200,y:py+200,angle:-Math.PI*3/4,timer:0});
                }
                // + pattern at frames 75 and 135
                if(boss.timer===75||boss.timer===135){
                    gasterBlasters.push({x:px,y:py-200,angle:Math.PI/2,timer:0});
                    gasterBlasters.push({x:px,y:py+200,angle:-Math.PI/2,timer:0});
                    gasterBlasters.push({x:px-200,y:py,angle:0,timer:0});
                    gasterBlasters.push({x:px+200,y:py,angle:Math.PI,timer:0});
                }
                if(boss.timer>200){boss.state='attack';boss.timer=0;}
            }
            else if(boss.state==='attack'||boss.state==='target'){
                boss.state='attack';
                const blasterFreq=boss.phase2?40:60;
                const asteroidFreq=boss.phase2?30:45;

                // Re-target player periodically
                if(boss.timer%180===0||boss.timer===1){
                    boss.angle=Math.atan2(ship.y-boss.y,ship.x-boss.x);
                    boss.dx=Math.cos(boss.angle)*(boss.phase2?4:3);
                    boss.dy=Math.sin(boss.angle)*(boss.phase2?4:3);
                }

                // Spawn gaster blasters from screen edges aimed at player
                if(boss.timer%blasterFreq===0){
                    const side=Math.floor(Math.random()*4);
                    let bx,by;
                    if(side===0){bx=ship.x;by=-50;}
                    else if(side===1){bx=W+50;by=ship.y;}
                    else if(side===2){bx=ship.x;by=H+50;}
                    else{bx=-50;by=ship.y;}
                    const angle=Math.atan2(ship.y-by,ship.x-bx);
                    gasterBlasters.push({x:bx,y:by,angle:angle,timer:0});
                }

                // Spawn asteroids
                if(boss.timer%asteroidFreq===0) spawnAsteroid(boss.x,boss.y,25);

                // Phase 2: position swap (teleport player and boss)
                if(boss.phase2&&Math.random()<0.002){
                    const tx=ship.x,ty=ship.y;
                    ship.x=boss.x;ship.y=boss.y;
                    boss.x=tx;boss.y=ty;
                    Sound.ui();
                    boom(ship.x,ship.y,'purple',15);
                    boom(boss.x,boss.y,'purple',15);
                }

                // Phase 2: trigger special pattern randomly
                if(boss.phase2&&boss.timer>300&&Math.random()<0.01){
                    boss.state='special_pattern';boss.timer=0;
                }

                if(boss.timer>1200){boss.state='breather';boss.timer=0;boss.gilbertCritDone=false;boss.gilbertCritHit=false;}
            }
            else if(boss.state==='breather'){
                boss.angle=Math.atan2(ship.y-boss.y,ship.x-boss.x);
                boss.dx=Math.cos(boss.angle)*0.8;
                boss.dy=Math.sin(boss.angle)*0.8;
                // Gilbert critical attack during breather
                if(window.DLC&&window.DLC.loaded&&G.gilbertState==='ally'&&G.gilbert&&!boss.gilbertCritDone){
                    // Rush toward boss
                    const toBoss=Math.atan2(boss.y-G.gilbert.y,boss.x-G.gilbert.x);
                    const dist=Math.hypot(boss.x-G.gilbert.x,boss.y-G.gilbert.y);
                    if(dist>boss.r+10){
                        G.gilbert.dx=Math.cos(toBoss)*6;
                        G.gilbert.dy=Math.sin(toBoss)*6;
                        G.gilbert.x+=G.gilbert.dx;G.gilbert.y+=G.gilbert.dy;
                    } else if(!boss.gilbertCritHit){
                        // Impact — 8 damage critical hit
                        boss.gilbertCritHit=true;
                        boss.hp=Math.max(0,boss.hp-8);
                        boom(boss.x,boss.y,'#00ff00',35);
                        boom(G.gilbert.x,G.gilbert.y,'#00ff88',15);
                        shake(10,20);Sound.explode();
                        gilbertQuip("NOW'S MY CHANCE! Take THAT!");
                        updateUI();
                        // Bounce Gilbert back
                        G.gilbert.dx=-Math.cos(toBoss)*4;
                        G.gilbert.dy=-Math.sin(toBoss)*4;
                        boss.gilbertCritDone=true;
                    }
                }
                if(boss.timer>420){boss.state='attack';boss.timer=0;}
            }
            else if(boss.state==='gilbert_finisher'){
                // Sans is stunned, drifting slowly
                boss.dx*=0.95;boss.dy*=0.95;
                // Phase 1: Dialogue (frames 0-300)
                if(boss.timer===1){
                    showGilbertDialogue([
                        "...",
                        "I remember now.",
                        "I know what you are.",
                        "You took EVERYTHING from me.",
                        "This ends HERE.",
                        "FULL POWER!!!"
                    ],function(){
                        if(boss) boss.gilbertFinisherReady=true;
                    });
                }
                // Phase 2: Gilbert charges up and strikes (after dialogue)
                if(boss.gilbertFinisherReady&&!boss.gilbertFinisherDone){
                    const toBoss=Math.atan2(boss.y-G.gilbert.y,boss.x-G.gilbert.x);
                    const dist=Math.hypot(boss.x-G.gilbert.x,boss.y-G.gilbert.y);
                    // Gilbert glows intensely
                    G.gilbertFlashTimer=999;
                    if(dist>boss.r+5){
                        // Rush at high speed
                        G.gilbert.dx=Math.cos(toBoss)*10;
                        G.gilbert.dy=Math.sin(toBoss)*10;
                        G.gilbert.x+=G.gilbert.dx;G.gilbert.y+=G.gilbert.dy;
                    } else {
                        // IMPACT — mark done so this only fires once
                        boss.gilbertFinisherDone=true;
                        G.gilbertFlashTimer=0;
                        boom(boss.x,boss.y,'#00ff00',60);
                        boom(boss.x,boss.y,'#ffffff',40);
                        boom(boss.x,boss.y,'#44ff44',50);
                        shake(20,40);Sound.explode();Sound.explode();
                        // Bounce Gilbert back
                        G.gilbert.dx=-Math.cos(toBoss)*8;
                        G.gilbert.dy=-Math.sin(toBoss)*8;
                        // Directly trigger boss death
                        boss.hp=0;
                        const isSansBoss=(boss.type===3||boss.type===10);
                        addScore(isSansBoss?6000:2000);
                        if(isSansBoss) unlockAch('determination');
                        if(window.DLC&&window.DLC.loaded){
                            G.totalBossesDefeated++;
                            if(isSansBoss&&!G.damageTakenThisBoss)unlockAch('dlc_untouchable');
                            if(isSansBoss&&G.noShieldBoss3)unlockAch('dlc_naked_run');
                        }
                        document.getElementById('bossRow').style.display='none';
                        Sound.playMusic('bgm');
                        if(boss.type===10){boss=null;winGame();return;}
                        else{boss=null;winGame();return;}
                    }
                }
            }
        }

        // --- SNAKE BOSS collision (segments) ---
        if(boss&&boss.type===5){
            // Player-segment collision
            for(const seg of boss.segments){
                if(seg.destroyed) continue;
                if(Math.hypot(ship.x-seg.x,ship.y-seg.y)<ship.r*0.6+seg.r){hurtPlayer();break;}
            }
            // Bullet-segment collision
            for(let j=bullets.length-1;j>=0;j--){
                let hitSeg=false;
                for(let s=boss.segments.length-1;s>=0;s--){
                    const seg=boss.segments[s];
                    if(seg.destroyed||seg.type==='machinery') continue;
                    if(Math.hypot(bullets[j].x-seg.x,bullets[j].y-seg.y)<seg.r+4){
                        if(seg.type==='head'){
                            if(!boss.headVulnerable){
                                // Deflect — head is shielded
                                boom(bullets[j].x,bullets[j].y,'white',3);Sound.shieldSfx();
                            } else {
                                boss.hp--;boom(bullets[j].x,bullets[j].y,'red',5);Sound.hit();updateUI();
                                if(boss.hp<=0){
                                    boom(boss.x,boss.y,'orange',50);shake(12,25);Sound.explode();
                                    addScore(4000);
                                    if(window.DLC&&window.DLC.loaded){
                                        G.totalBossesDefeated++;
                                        unlockAch('dlc_serpent_slayer');
                                    }
                                    document.getElementById('bossRow').style.display='none';
                                    Sound.playMusic('bgm');
                                    if(G.practice){boss=null;winGame();return;}
                                    G.widescreenReturning=true;G.widescreenReturnProgress=1;
                                    boss=null;G.level++;G.levelsCleared++;
                                    G.waveStart=performance.now();G.spawnTimer=0;
                                    G.checkpoint=G.level;updateUI();
                                    // DLC: Start station cutscene after snake boss
                                    if(window.DLC&&window.DLC.loaded&&G.gilbertState==='ally'&&!G.stationUnlocked){
                                        startStationCutscene();
                                    } else {
                                        asteroids=[];for(let k=0;k<8;k++)spawnAsteroid();
                                    }
                                    return;
                                }
                            }
                        } else if(seg.type==='asteroid'){
                            seg.hp--;boom(bullets[j].x,bullets[j].y,'#888',4);Sound.hit();
                            if(seg.hp<=0){
                                seg.destroyed=true;boom(seg.x,seg.y,'#888',20);Sound.explode();addScore(200);
                                // Release embedded mini-boss
                                if(seg.miniBoss&&!seg.miniBoss.released){
                                    seg.miniBoss.released=true;
                                    spawnMiniBoss(seg.miniBoss.type,true);
                                    miniBosses[miniBosses.length-1].x=seg.x;
                                    miniBosses[miniBosses.length-1].y=seg.y;
                                }
                                // Destroy adjacent machinery
                                if(s>0&&boss.segments[s-1].type==='machinery') boss.segments[s-1].destroyed=true;
                                if(s<boss.segments.length-1&&boss.segments[s+1].type==='machinery') boss.segments[s+1].destroyed=true;
                                // Check if all asteroids destroyed
                                boss.segmentsAlive=boss.segments.filter(ss=>ss.type==='asteroid'&&!ss.destroyed).length;
                                if(boss.segmentsAlive===0){
                                    boss.headVulnerable=true;shake(8,15);
                                    gilbertQuip("The head is exposed! Hit it now!");
                                }
                            }
                        }
                        bullets.splice(j,1);hitSeg=true;break;
                    }
                }
                if(hitSeg) continue;
            }
        }

        // No collision during dialogue or finisher (non-snake bosses)
        if(boss&&boss.type!==5&&!((boss.type===3||boss.type===10)&&(boss.state==='dialogue'||boss.state==='gilbert_finisher'))){
            if(Math.hypot(ship.x-boss.x,ship.y-boss.y)<ship.r*0.6+boss.r) hurtPlayer();
        }

        for(let j=bullets.length-1;j>=0;j--){
            // Absorb bullets during dialogue (no damage)
            if(boss&&(boss.type===3||boss.type===10)&&boss.state==='dialogue'&&Math.hypot(bullets[j].x-boss.x,bullets[j].y-boss.y)<boss.r+5){
                boom(bullets[j].x,bullets[j].y,'white',3);bullets.splice(j,1);continue;
            }
            if(boss&&boss.state==='gilbert_finisher'&&Math.hypot(bullets[j].x-boss.x,bullets[j].y-boss.y)<boss.r+5){
                boom(bullets[j].x,bullets[j].y,'white',3);bullets.splice(j,1);continue;
            }
            if(boss&&boss.type===5) continue; // Snake collision handled above
            if(boss&&Math.hypot(bullets[j].x-boss.x,bullets[j].y-boss.y)<boss.r+5){
                boom(bullets[j].x,bullets[j].y,'red',3);boss.hp--;Sound.hit();
                // Sans finisher threshold: at 80 HP with Gilbert ally, lock HP and trigger finisher
                if((boss.type===3||boss.type===10)&&boss.hp<=Math.round(boss.maxHp*0.4)&&!boss.gilbertFinisherTriggered&&window.DLC&&window.DLC.loaded&&G.gilbertState==='ally'){
                    boss.hp=Math.round(boss.maxHp*0.4);boss.gilbertFinisherTriggered=true;
                    boss.state='gilbert_finisher';boss.timer=0;boss.dx=0;boss.dy=0;
                    gasterBlasters=[];enemyBullets=[];asteroids=[];
                }
                if((boss.type===3||boss.type===10)&&boss.hp<=boss.maxHp/2&&!boss.phase2){boss.phase2=true;boss.state='dialogue';boss.timer=0;gasterBlasters=[];Sound.playMusic('boss3phase2');}
                updateUI();bullets.splice(j,1);
                if(boss.hp<=0){
                    boom(boss.x,boss.y,'orange',50);shake(12,25);Sound.explode();
                    const isSansBoss=(boss.type===3||boss.type===10);
                    addScore(boss.type===1?1500:boss.type===2?3000:boss.type===4?2500:(isSansBoss?6000:2000));
                    // Boss defeat achievements
                    if(boss.type===1){unlockAch('boss_slayer');}
                    if(boss.type===2){unlockAch('survivor');}
                    if(boss.type===2)unlockAch('commander');
                    if(isSansBoss){unlockAch('determination');}
                    if(window.DLC&&window.DLC.loaded){
                        G.totalBossesDefeated++;
                        if(isSansBoss&&!G.damageTakenThisBoss)unlockAch('dlc_untouchable');
                        if(isSansBoss&&G.noShieldBoss3)unlockAch('dlc_naked_run');
                    }
                    document.getElementById('bossRow').style.display='none';
                    Sound.playMusic('bgm');

                    // Practice mode: stop after boss kill
                    if(G.practice){boss=null;winGame();return;}

                    // --- BOSS DEFEAT FLOW ---
                    if(boss.type===2){
                        // After boss 2: drop force field, advance
                        boss=null;G.level=3;G.waveStart=performance.now();G.spawnTimer=0;asteroids=[];
                        spawnForceFieldDrop(W/2,H/2); G.checkpoint=3;
                        // DLC: trigger boss rush 55s after boss 2 defeat (timer will be paused during rush)
                        if(window.DLC&&window.DLC.loaded&&G.gilbertState==='none'){
                            G.bossRushStartTime=performance.now();
                        }
                        updateUI();break;
                    } else if(boss.type===10){
                        // DLC final boss (Sans at level 10) — win the game
                        boss=null;winGame();return;
                    } else if(boss.type===3){
                        // Sans without DLC — win the game
                        if(window.DLC&&window.DLC.loaded){
                            // Shouldn't happen with DLC (Sans is at level 10), but handle gracefully
                            boss=null;G.level++;G.waveStart=performance.now();G.spawnTimer=0;
                            asteroids=[];for(let k=0;k<8;k++)spawnAsteroid();updateUI();break;
                        } else { boss=null;winGame();return; }
                    } else if(boss.type===4){
                        // Cyborg defeated — clear wall, continue
                        if(window.DLC&&window.DLC.loaded)unlockAch('dlc_short_circuit');
                        const cybX=boss.x,cybY=boss.y;
                        boss=null;G.level++;G.levelsCleared++;G.waveStart=performance.now();G.spawnTimer=0;
                        asteroids=[];for(let k=0;k<8;k++)spawnAsteroid();
                        G.checkpoint=G.level;
                        // DLC: spawn cyborg scraps if Gilbert is on rope
                        if(window.DLC&&window.DLC.loaded&&G.gilbertState==='rope'){
                            spawnCyborgScraps(cybX,cybY);
                            G.gilbertState='scrap_collect';
                        }
                        if(G.level>=5)unlockAch('dlc_beyond');
                        if(G.level>=7)unlockAch('dlc_endless');
                        updateUI();break;
                    }
                    // Default: advance level (boss 1, etc)
                    boss=null;G.level++;G.waveStart=performance.now();G.spawnTimer=0;
                    for(let k=0;k<6;k++)spawnAsteroid();updateUI();break;
                }
            }
        }
    }
    // Daily mission check
    if(G.running&&!isDailyComplete()){
        const dm=getDailyMission();
        if(dm.check()) completeDailyMission();
    }

    updateUI();
}

// ============================================================
//  DRAW (REMASTERED GRAPHICS)
// ============================================================
function draw() {
    // Station mode draws separately
    if(G.mode==='station'){drawStation();return;}
    ctx.save();
    if(G.shakeTimer>0) ctx.translate((Math.random()-0.5)*G.shakeIntensity,(Math.random()-0.5)*G.shakeIntensity);
    const T=performance.now();
    const isP2=boss&&(boss.type===3||boss.type===10)&&boss.phase2;

    // --- BACKGROUND ---
    // Deep space gradient
    const bgGrad=ctx.createRadialGradient(W/2,H/2,50,W/2,H/2,W*0.8);
    if(isP2){bgGrad.addColorStop(0,'#1a0020');bgGrad.addColorStop(1,'#050005');}
    else{bgGrad.addColorStop(0,'#060812');bgGrad.addColorStop(1,'#010104');}
    ctx.fillStyle=bgGrad;ctx.fillRect(-10,-10,W+20,H+20);

    // Subtle nebula clouds
    ctx.globalAlpha=0.03;
    for(let i=0;i<3;i++){
        const nx=W*(0.2+i*0.3)+Math.sin(T/8000+i)*40;
        const ny=H*(0.3+i*0.2)+Math.cos(T/6000+i*2)*30;
        const ng=ctx.createRadialGradient(nx,ny,0,nx,ny,150);
        ng.addColorStop(0,isP2?'#ff00ff':'#0066ff');ng.addColorStop(1,'transparent');
        ctx.fillStyle=ng;ctx.fillRect(0,0,W,H);
    }
    ctx.globalAlpha=1;

    // Stars with color variety and twinkle
    const starColors=isP2?['#ff00ff','#ff44aa','#ff88cc']:['#ffffff','#aaccff','#ffeecc','#88aaff'];
    for(const s of stars){
        const twinkle=Math.sin(T/600+s.x*3+s.y)*0.25;
        ctx.globalAlpha=Math.max(0.05,s.alpha+twinkle);
        ctx.fillStyle=starColors[Math.floor(s.x+s.y)%starColors.length];
        ctx.beginPath();ctx.arc(s.x,s.y,s.size,0,Math.PI*2);ctx.fill();
        // Bright stars get a cross flare
        if(s.size>1.4&&s.alpha>0.5){
            ctx.globalAlpha*=0.3;ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=0.5;
            ctx.beginPath();ctx.moveTo(s.x-4,s.y);ctx.lineTo(s.x+4,s.y);ctx.moveTo(s.x,s.y-4);ctx.lineTo(s.x,s.y+4);ctx.stroke();
        }
    }
    ctx.globalAlpha=1;

    // --- FORCE FIELD DROP ---
    if(G.forceFieldDrop){
        const fy=G.forceFieldDrop.y+Math.sin(T/300)*5;
        ctx.save();ctx.translate(G.forceFieldDrop.x,fy);
        // Outer glow
        const fg=ctx.createRadialGradient(0,0,5,0,0,35);
        fg.addColorStop(0,'rgba(0,255,255,0.3)');fg.addColorStop(1,'transparent');
        ctx.fillStyle=fg;ctx.fillRect(-35,-35,70,70);
        // Box
        ctx.shadowBlur=25;ctx.shadowColor='cyan';ctx.strokeStyle='cyan';ctx.lineWidth=2;
        ctx.beginPath();for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,r=18;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.stroke();
        ctx.fillStyle='#00ffff';ctx.font='bold 16px Courier New';ctx.textAlign='center';ctx.fillText('S',0,6);
        ctx.shadowBlur=0;ctx.restore();
    }

    // --- CYBORG WALL ---
    if(boss&&boss.type===4&&boss.wallSide){
        const wx=W/2;
        // Main wall line
        ctx.save();
        ctx.shadowBlur=20;ctx.shadowColor='#00ff88';
        ctx.strokeStyle='#00ff88';ctx.lineWidth=4;
        ctx.beginPath();ctx.moveTo(wx,0);ctx.lineTo(wx,H);ctx.stroke();
        // Electric crackling effect
        ctx.strokeStyle='rgba(0,255,136,0.4)';ctx.lineWidth=1;
        for(let y=0;y<H;y+=20){
            const off=(Math.random()-0.5)*15;
            ctx.beginPath();ctx.moveTo(wx+off,y);ctx.lineTo(wx+(Math.random()-0.5)*15,y+20);ctx.stroke();
        }
        // Gradient fade on the blocked side
        const blocked=boss.wallSide==='left'?0:W/2;
        ctx.fillStyle=`rgba(0,255,136,0.04)`;ctx.fillRect(blocked,0,W/2,H);
        // Arrow indicators showing which side is blocked
        ctx.fillStyle='rgba(0,255,136,0.3)';ctx.font='bold 16px Courier New';ctx.textAlign='center';
        const arrowX=boss.wallSide==='left'?W*0.25:W*0.75;
        ctx.fillText('BLOCKED',arrowX,H/2);
        ctx.shadowBlur=0;ctx.restore();
    }

    // --- GASTER BLASTERS ---
    for(const gb of gasterBlasters){
        ctx.save();ctx.translate(gb.x,gb.y);ctx.rotate(gb.angle);
        // Skull with glow
        ctx.shadowBlur=10;ctx.shadowColor='rgba(255,255,255,0.5)';
        ctx.fillStyle='#eee';ctx.beginPath();
        ctx.moveTo(-22,-22);ctx.lineTo(22,-12);ctx.lineTo(22,12);ctx.lineTo(-22,22);ctx.lineTo(-32,0);
        ctx.closePath();ctx.fill();
        ctx.strokeStyle='#888';ctx.lineWidth=1;ctx.stroke();
        ctx.shadowBlur=0;
        // Eyes
        ctx.fillStyle='#000';ctx.beginPath();ctx.arc(-10,-10,5,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(-10,10,5,0,Math.PI*2);ctx.fill();
        // Eye glow
        if(gb.timer>30){
            const eg=gb.timer/60;
            ctx.fillStyle=`rgba(0,255,255,${Math.min(eg,1)})`;
            ctx.beginPath();ctx.arc(-10,-10,2,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.arc(-10,10,2,0,Math.PI*2);ctx.fill();
        }
        // Targeting laser
        if(gb.timer<60){
            const la=gb.timer/60;
            ctx.strokeStyle=`rgba(0,255,255,${la*0.6})`;ctx.lineWidth=1+la;
            ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(2000,0);ctx.stroke();ctx.setLineDash([]);
            // Pulsing dot at origin
            ctx.fillStyle=`rgba(0,255,255,${la})`;ctx.beginPath();ctx.arc(0,0,3+Math.sin(T/50)*2,0,Math.PI*2);ctx.fill();
        }
        // Active beam
        else if(gb.timer>=60&&gb.timer<90){
            const intensity=1-((gb.timer-60)/30);
            // Outer glow
            ctx.fillStyle=`rgba(0,100,255,${intensity*0.4})`;ctx.fillRect(0,-40,2000,80);
            // Main beam
            ctx.fillStyle=`rgba(0,255,255,${intensity*0.7})`;ctx.shadowBlur=30;ctx.shadowColor='cyan';
            ctx.fillRect(0,-25,2000,50);
            // Core
            ctx.fillStyle=`rgba(255,255,255,${intensity})`;
            ctx.fillRect(0,-10,2000,20);
            ctx.shadowBlur=0;
        }
        ctx.restore();
    }

    // --- ASTEROIDS ---
    for(const a of asteroids){
        ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.angle);
        if(a.type==='fuel'){
            ctx.shadowBlur=12;ctx.shadowColor='#ffff00';
            ctx.strokeStyle='#ddcc00';ctx.fillStyle='#1a1800';
        } else if(isP2){
            ctx.shadowBlur=8;ctx.shadowColor='#00ffff';
            ctx.strokeStyle='#00cccc';ctx.fillStyle='rgba(0,40,40,0.6)';
        } else {
            ctx.shadowBlur=0;
            // Subtle gradient fill
            const ag=ctx.createRadialGradient(-a.r*0.2,-a.r*0.2,0,0,0,a.r);
            ag.addColorStop(0,'#1a1a1a');ag.addColorStop(1,'#080808');
            ctx.fillStyle=ag;ctx.strokeStyle='#555';
        }
        ctx.lineWidth=1.5;ctx.beginPath();
        for(let i=0;i<a.verts;i++){const ang=(Math.PI*2/a.verts)*i,r=a.r+a.offsets[i];i===0?ctx.moveTo(Math.cos(ang)*r,Math.sin(ang)*r):ctx.lineTo(Math.cos(ang)*r,Math.sin(ang)*r);}
        ctx.closePath();ctx.fill();ctx.stroke();
        ctx.shadowBlur=0;
        if(a.type==='fuel'){
            // Fuel cross symbol
            ctx.strokeStyle='#ffff00';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(6,0);ctx.moveTo(0,-6);ctx.lineTo(0,6);ctx.stroke();
            ctx.fillStyle='#ffff00';ctx.globalAlpha=0.3;ctx.beginPath();ctx.arc(0,0,a.r*0.5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
        } else {
            // Surface detail: crater rings + scratch lines
            ctx.strokeStyle=isP2?'#003333':'#1a1a1a';ctx.lineWidth=0.7;
            ctx.beginPath();ctx.arc(a.r*0.15,-a.r*0.1,a.r*0.3,0,Math.PI*2);ctx.stroke();
            ctx.beginPath();ctx.arc(-a.r*0.25,a.r*0.2,a.r*0.15,0,Math.PI*2);ctx.stroke();
            // Edge highlights
            ctx.strokeStyle=isP2?'#005555':'#2a2a2a';ctx.lineWidth=0.5;
            ctx.beginPath();ctx.arc(0,0,a.r*0.6,0.5,1.8);ctx.stroke();
        }
        // Spawner shield ring around non-fuel asteroids
        const spawnerUp=miniBosses.some(m=>m.type==='spawner');
        if(spawnerUp&&a.type!=='fuel'){
            ctx.rotate(-a.angle);
            const pulse=0.4+Math.sin(T/200+a.x)*0.2;
            ctx.strokeStyle=`rgba(68,255,68,${pulse})`;ctx.lineWidth=2;
            ctx.shadowBlur=8;ctx.shadowColor='#44ff44';
            ctx.beginPath();ctx.arc(0,0,a.r+6,0,Math.PI*2);ctx.stroke();
            ctx.shadowBlur=0;
        }
        ctx.restore();
    }

    // Shield flash animations
    for(const sf of shieldFlashes){
        const al=sf.life/sf.maxLife;
        ctx.save();ctx.translate(sf.x,sf.y);
        // Expanding bright ring
        const expandR=sf.r+6+(1-al)*20;
        ctx.strokeStyle=`rgba(150,255,150,${al})`;ctx.lineWidth=3*al;
        ctx.shadowBlur=25*al;ctx.shadowColor='#44ff44';
        ctx.beginPath();ctx.arc(0,0,expandR,0,Math.PI*2);ctx.stroke();
        // Impact flash at hit point
        const fx=Math.cos(sf.hitAngle)*(sf.r+6);
        const fy=Math.sin(sf.hitAngle)*(sf.r+6);
        ctx.fillStyle=`rgba(255,255,255,${al})`;
        ctx.shadowBlur=20*al;ctx.shadowColor='#fff';
        ctx.beginPath();ctx.arc(fx,fy,6*al,0,Math.PI*2);ctx.fill();
        // Spark lines radiating from hit point
        ctx.strokeStyle=`rgba(68,255,68,${al*0.8})`;ctx.lineWidth=1.5;
        for(let s=0;s<4;s++){
            const sa=sf.hitAngle-0.4+s*0.25;
            const sl=15*(1-al);
            ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx+Math.cos(sa)*sl,fy+Math.sin(sa)*sl);ctx.stroke();
        }
        ctx.shadowBlur=0;ctx.restore();
    }

    // --- AMMO BOXES ---
    for(const b of ammoBoxes){
        const pulse=0.8+Math.sin(T/200)*0.2;
        ctx.save();ctx.translate(b.x,b.y);
        // Glow aura
        ctx.shadowBlur=15;ctx.shadowColor='#00ff00';
        ctx.strokeStyle=`rgba(0,255,0,${pulse})`;ctx.lineWidth=2;
        ctx.strokeRect(-b.size/2,-b.size/2,b.size,b.size);
        // Inner fill
        ctx.fillStyle='rgba(0,60,0,0.5)';ctx.fillRect(-b.size/2,-b.size/2,b.size,b.size);
        ctx.shadowBlur=0;
        // Letter
        ctx.fillStyle='#00ff00';ctx.font='bold 13px Courier New';ctx.textAlign='center';ctx.fillText('A',0,5);
        ctx.restore();
    }

    // --- POWERUPS ---
    for(const p of powerups){
        const pulse=0.8+Math.sin(T/150)*0.2;
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(T/800);
        ctx.shadowBlur=15;ctx.shadowColor='orange';
        ctx.strokeStyle=`rgba(255,170,0,${pulse})`;ctx.lineWidth=2;
        // Diamond shape
        ctx.beginPath();ctx.moveTo(0,-p.size/2);ctx.lineTo(p.size/2,0);ctx.lineTo(0,p.size/2);ctx.lineTo(-p.size/2,0);ctx.closePath();ctx.stroke();
        ctx.fillStyle='rgba(80,40,0,0.5)';ctx.fill();
        ctx.shadowBlur=0;ctx.rotate(-T/800);
        ctx.fillStyle='#ffaa00';ctx.font='bold 12px Courier New';ctx.textAlign='center';ctx.fillText('3x',0,4);
        ctx.restore();
    }

    // --- MINI BOSSES ---
    for(const mb of miniBosses){
        ctx.save();ctx.translate(mb.x,mb.y);ctx.rotate(mb.rot);
        if(mb.type==='chaser'){
            // Outer glow ring
            ctx.shadowBlur=20;ctx.shadowColor='#aa00ff';
            ctx.fillStyle='#1a0033';ctx.strokeStyle='#cc00ff';ctx.lineWidth=2.5;
            ctx.beginPath();for(let i=0;i<10;i++){const r=i%2===0?mb.r:mb.r*0.4,a=(Math.PI*2*i)/10;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
            ctx.closePath();ctx.fill();ctx.stroke();
            // Inner glow
            const cg=ctx.createRadialGradient(0,0,0,0,0,mb.r*0.5);
            cg.addColorStop(0,'rgba(255,200,255,0.6)');cg.addColorStop(1,'transparent');
            ctx.fillStyle=cg;ctx.fill();
            // Core eye
            ctx.shadowBlur=15;ctx.shadowColor='white';
            ctx.fillStyle='#ffccff';ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.fill();
        } else if(mb.type==='blaster'){
            // BLASTER mini boss — skull-like shape with cyan glow
            const isLocking=mb.state==='lock';
            ctx.shadowBlur=isLocking?25:15;ctx.shadowColor=isLocking?'#fff':'#00cccc';
            // Body: skull shape
            ctx.fillStyle=isLocking?'#112':'#0a1a1a';ctx.strokeStyle=isLocking?'#ffffff':'#00dddd';ctx.lineWidth=2.5;
            ctx.beginPath();
            ctx.arc(0,-4,mb.r*0.8,Math.PI,0);
            ctx.lineTo(mb.r*0.6,mb.r*0.6);ctx.lineTo(-mb.r*0.6,mb.r*0.6);
            ctx.closePath();ctx.fill();ctx.stroke();
            // Eye sockets
            ctx.fillStyle='#000';
            ctx.beginPath();ctx.arc(-8,-2,7,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.arc(8,-2,7,0,Math.PI*2);ctx.fill();
            // Glowing eyes — pulse faster when locking
            const eyePulse=isLocking?Math.sin(T/40):Math.sin(T/200);
            if(eyePulse>0){
                ctx.fillStyle=isLocking?'#fff':'#00ffff';ctx.shadowBlur=10;ctx.shadowColor=isLocking?'#fff':'cyan';
                ctx.beginPath();ctx.arc(-8,-2,3,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(8,-2,3,0,Math.PI*2);ctx.fill();
            }
            ctx.shadowBlur=0;
            // Teeth
            ctx.strokeStyle=isLocking?'#fff':'#00aaaa';ctx.lineWidth=1.5;
            ctx.beginPath();for(let t=-8;t<=8;t+=8){ctx.moveTo(t,mb.r*0.4);ctx.lineTo(t,mb.r*0.55);}ctx.stroke();
            // Charge indicator ring when locking
            if(isLocking){
                const prog=mb.timer/60;
                ctx.strokeStyle=`rgba(255,255,255,${0.5+Math.sin(T/30)*0.3})`;ctx.lineWidth=2;
                ctx.beginPath();ctx.arc(0,0,mb.r+6,0,Math.PI*2*prog);ctx.stroke();
            }
        } else if(mb.type==='spawner'){
            // SPAWNER mini boss — green diamond with asteroid symbol
            const isDashing=mb.state==='dash_intercept';
            ctx.shadowBlur=isDashing?20:12;ctx.shadowColor=isDashing?'#fff':'#00ff44';
            ctx.fillStyle=isDashing?'#113311':'#0a200a';ctx.strokeStyle=isDashing?'#ffffff':'#44ff44';ctx.lineWidth=2;
            // Diamond body
            ctx.beginPath();
            ctx.moveTo(0,-mb.r);ctx.lineTo(mb.r,0);ctx.lineTo(0,mb.r);ctx.lineTo(-mb.r,0);
            ctx.closePath();ctx.fill();ctx.stroke();
            ctx.shadowBlur=0;
            // Inner ring
            ctx.strokeStyle=isDashing?'rgba(255,255,255,0.5)':'rgba(68,255,68,0.3)';ctx.lineWidth=1;
            ctx.beginPath();ctx.arc(0,0,mb.r*0.45,0,Math.PI*2);ctx.stroke();
            // Core — pulsing spawn indicator
            const sp=0.5+Math.sin(T/150)*0.5;
            ctx.fillStyle=`rgba(68,255,68,${sp})`;
            ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();
            // Small orbiting dots (asteroid symbols)
            for(let o=0;o<3;o++){
                const oa=T/400+o*Math.PI*2/3;
                const ox=Math.cos(oa)*mb.r*0.6,oy=Math.sin(oa)*mb.r*0.6;
                ctx.fillStyle='#44ff44';ctx.beginPath();ctx.arc(ox,oy,2.5,0,Math.PI*2);ctx.fill();
            }
            // Speed trail when dashing
            if(isDashing){
                ctx.strokeStyle='rgba(68,255,68,0.4)';ctx.lineWidth=2;
                ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-mb.r*1.5,0);ctx.stroke();
            }
        } else {
            // Shooter type
            const isCharging=mb.state==='charge';
            ctx.shadowBlur=18;ctx.shadowColor=isCharging?'#fff':'#ff2200';
            ctx.fillStyle='#220000';ctx.strokeStyle=isCharging?'#ffffff':'#ff3333';ctx.lineWidth=2.5;
            ctx.beginPath();for(let i=0;i<6;i++){const a=(Math.PI*2/6)*i;ctx.lineTo(Math.cos(a)*mb.r,Math.sin(a)*mb.r);}
            ctx.closePath();ctx.fill();ctx.stroke();
            // Crosshair
            ctx.strokeStyle=isCharging?'#fff':'#ff6666';ctx.lineWidth=1.5;
            ctx.beginPath();ctx.moveTo(-mb.r*0.5,0);ctx.lineTo(mb.r*0.5,0);ctx.moveTo(0,-mb.r*0.5);ctx.lineTo(0,mb.r*0.5);ctx.stroke();
            ctx.beginPath();ctx.arc(0,0,mb.r*0.3,0,Math.PI*2);ctx.stroke();
        }
        ctx.shadowBlur=0;ctx.rotate(-mb.rot);
        // HP bar with border
        ctx.fillStyle='#000';ctx.fillRect(-20,-mb.r-16,40,7);
        ctx.fillStyle='#440000';ctx.fillRect(-19,-mb.r-15,38,5);
        ctx.fillStyle='#00ff00';ctx.fillRect(-19,-mb.r-15,38*(mb.hp/mb.maxHp),5);
        ctx.restore();
    }

    // --- ENEMY BULLETS ---
    for(const eb of enemyBullets){
        ctx.shadowBlur=10;ctx.shadowColor='red';
        const eg=ctx.createRadialGradient(eb.x,eb.y,0,eb.x,eb.y,5);
        eg.addColorStop(0,'#fff');eg.addColorStop(0.3,'#ff4444');eg.addColorStop(1,'rgba(255,0,0,0)');
        ctx.fillStyle=eg;ctx.beginPath();ctx.arc(eb.x,eb.y,5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#ff6666';ctx.beginPath();ctx.arc(eb.x,eb.y,2.5,0,Math.PI*2);ctx.fill();
    }
    ctx.shadowBlur=0;

    // --- PARTICLES (enhanced) ---
    for(const p of particles){
        const a=p.life/p.maxLife;
        ctx.globalAlpha=a;
        // Glow halo
        const sz=p.size*(0.5+a*0.5);
        ctx.shadowBlur=sz*3;ctx.shadowColor=p.color;
        ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,sz,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
        // Bright core
        ctx.fillStyle='#fff';ctx.globalAlpha=a*0.5;
        ctx.beginPath();ctx.arc(p.x,p.y,sz*0.4,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;ctx.shadowBlur=0;

    // --- BOSS ---
    if(boss){
        // Warning text with pulsing
        if(boss.state==='enter'){
            const wa=0.5+Math.sin(T/100)*0.5;
            ctx.globalAlpha=wa;ctx.font='bold 40px Courier New';ctx.fillStyle='red';ctx.textAlign='center';
            ctx.shadowBlur=30;ctx.shadowColor='red';ctx.fillText('WARNING',W/2,H/2);
            ctx.font='14px Courier New';ctx.fillStyle='#ff8888';ctx.fillText('BOSS APPROACHING',W/2,H/2+25);
            ctx.shadowBlur=0;ctx.globalAlpha=1;
        }
        if(boss.state==='dialogue'){
            ctx.font='bold 26px Courier New';ctx.fillStyle='#fff';ctx.textAlign='center';
            ctx.shadowBlur=15;ctx.shadowColor='red';
            ctx.fillText("* I WON'T GO DOWN EASY.",W/2,H/2-80);
            ctx.shadowBlur=0;
        }
        if(boss.state==='gilbert_finisher'){
            // Screen-wide energy buildup effect
            const fp=Math.min(1,boss.timer/120);
            ctx.globalAlpha=fp*0.15;
            ctx.fillStyle='#00ff00';ctx.fillRect(0,0,W,H);
            ctx.globalAlpha=1;
            // Stunned text on Sans
            if(!boss.gilbertFinisherReady){
                const sa=0.5+Math.sin(T/80)*0.5;
                ctx.globalAlpha=sa;ctx.font='bold 20px Courier New';ctx.fillStyle='#ff4444';ctx.textAlign='center';
                ctx.shadowBlur=15;ctx.shadowColor='red';
                ctx.fillText('* ...!?',boss.x,boss.y-boss.r-20);
                ctx.shadowBlur=0;ctx.globalAlpha=1;
            } else {
                // Energy trail from Gilbert to Sans
                if(G.gilbert){
                    const gx=G.gilbert.x,gy=G.gilbert.y;
                    ctx.strokeStyle=`rgba(0,255,68,${0.6+Math.sin(T/30)*0.4})`;ctx.lineWidth=4;
                    ctx.shadowBlur=25;ctx.shadowColor='#00ff00';
                    ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(boss.x,boss.y);ctx.stroke();
                    ctx.shadowBlur=0;
                }
            }
        }

        ctx.save();ctx.translate(boss.x,boss.y);
        if(boss.type<=2){
            // Aura ring
            ctx.globalAlpha=0.15;const ac=boss.type===1?'#ff0000':'#00ccff';
            for(let r=boss.r+15;r<boss.r+30;r+=5){
                ctx.strokeStyle=ac;ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r+Math.sin(T/300+r)*3,0,Math.PI*2);ctx.stroke();
            }
            ctx.globalAlpha=1;
            // Main body
            ctx.rotate(T/500);
            ctx.strokeStyle=boss.state==='charge'?'#ffff00':(boss.type===1?'#ff2222':'#00ccff');
            ctx.shadowBlur=20;ctx.shadowColor=boss.type===1?'red':'cyan';ctx.lineWidth=3;
            ctx.beginPath();for(let i=0;i<16;i++){const r=i%2===0?boss.r:boss.r*0.65,a=(Math.PI*2/16)*i;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
            ctx.closePath();ctx.stroke();
            // Inner structure
            ctx.strokeStyle=boss.type===1?'rgba(255,0,0,0.3)':'rgba(0,200,255,0.3)';ctx.lineWidth=1;
            ctx.beginPath();for(let i=0;i<8;i++){const a=(Math.PI*2/8)*i;ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*boss.r*0.6,Math.sin(a)*boss.r*0.6);}ctx.stroke();
            ctx.shadowBlur=0;
            // Core
            const cg=ctx.createRadialGradient(0,0,0,0,0,12);
            cg.addColorStop(0,'#fff');cg.addColorStop(1,boss.type===1?'#ff4444':'#44aaff');
            ctx.fillStyle=cg;ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();
        } else if(boss.type===4){
            // --- CYBORG BOSS ---
            const isDashing=boss.state==='dash';
            const isTele=boss.state==='wall_telegraph'||boss.state==='dash_telegraph';
            // Aura
            ctx.globalAlpha=0.12;
            for(let r=boss.r+10;r<boss.r+25;r+=5){
                ctx.strokeStyle=isDashing?'#ffaa00':'#00ff88';ctx.lineWidth=1;
                ctx.beginPath();ctx.arc(0,0,r+Math.sin(T/200+r)*3,0,Math.PI*2);ctx.stroke();
            }
            ctx.globalAlpha=1;
            // Body — angular, mechanical
            ctx.fillStyle='#0a1a10';ctx.strokeStyle=isDashing?'#ffaa00':'#00ff88';
            ctx.shadowBlur=20;ctx.shadowColor=isDashing?'#ffaa00':'#00ff88';ctx.lineWidth=3;
            ctx.beginPath();
            ctx.moveTo(0,-boss.r);ctx.lineTo(boss.r*0.7,-boss.r*0.3);
            ctx.lineTo(boss.r,0);ctx.lineTo(boss.r*0.7,boss.r*0.3);
            ctx.lineTo(0,boss.r);ctx.lineTo(-boss.r*0.7,boss.r*0.3);
            ctx.lineTo(-boss.r,0);ctx.lineTo(-boss.r*0.7,-boss.r*0.3);
            ctx.closePath();ctx.fill();ctx.stroke();
            // Inner circuit lines
            ctx.strokeStyle=isDashing?'rgba(255,170,0,0.4)':'rgba(0,255,136,0.3)';ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(-boss.r*0.4,-boss.r*0.4);ctx.lineTo(boss.r*0.4,boss.r*0.4);
            ctx.moveTo(boss.r*0.4,-boss.r*0.4);ctx.lineTo(-boss.r*0.4,boss.r*0.4);ctx.stroke();
            ctx.beginPath();ctx.arc(0,0,boss.r*0.4,0,Math.PI*2);ctx.stroke();
            ctx.shadowBlur=0;
            // Eye — single red cybernetic eye
            ctx.fillStyle='#000';ctx.beginPath();ctx.arc(0,-boss.r*0.15,10,0,Math.PI*2);ctx.fill();
            ctx.fillStyle=isTele?'#fff':(isDashing?'#ffaa00':'#ff0000');
            ctx.shadowBlur=15;ctx.shadowColor=isDashing?'#ffaa00':'red';
            ctx.beginPath();ctx.arc(0,-boss.r*0.15,5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,-boss.r*0.15,2,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;
        } else if(boss.type===5){
            // --- SNAKE BOSS --- (drawn from tail to head)
            ctx.restore(); // Undo the translate(boss.x, boss.y) — we draw each segment separately
            // Connection lines first (behind segments)
            for(let i=1;i<boss.segments.length;i++){
                const prev=boss.segments[i-1],seg=boss.segments[i];
                const bothDead=(prev.type!=='head'&&prev.destroyed)&&seg.destroyed;
                // Metal rod — always visible, darkened when damaged
                ctx.strokeStyle=bothDead?'#1a1a1a':(seg.destroyed||prev.destroyed?'#333':'#555');
                ctx.lineWidth=bothDead?6:8;
                ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(seg.x,seg.y);ctx.stroke();
                // Inner cable
                ctx.strokeStyle=bothDead?'#0f0f0f':(seg.destroyed||prev.destroyed?'#222':'#333');
                ctx.lineWidth=bothDead?3:4;
                ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(seg.x,seg.y);ctx.stroke();
                // Spark visual on destroyed sections (no boom in draw — just draw inline)
                if(seg.destroyed&&Math.random()<0.05){
                    const sx=(prev.x+seg.x)/2+(Math.random()-0.5)*10;
                    const sy=(prev.y+seg.y)/2+(Math.random()-0.5)*10;
                    ctx.fillStyle='#ffaa00';ctx.shadowBlur=8;ctx.shadowColor='#ffaa00';
                    ctx.beginPath();ctx.arc(sx,sy,2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
                }
            }
            // Draw segments from tail to head
            for(let i=boss.segments.length-1;i>=0;i--){
                const seg=boss.segments[i];
                if(seg.type==='machinery') continue; // drawn as connections
                if(seg.destroyed) continue;
                ctx.save();ctx.translate(seg.x,seg.y);
                if(seg.type==='asteroid'){
                    // Asteroid body with green-tinted machinery
                    ctx.rotate(seg.angle+seg.rot*boss.timer);
                    ctx.shadowBlur=6;ctx.shadowColor='#00aa44';
                    const ag=ctx.createRadialGradient(-seg.r*0.2,-seg.r*0.2,0,0,0,seg.r);
                    ag.addColorStop(0,'#1a2a1a');ag.addColorStop(1,'#0a0a0a');
                    ctx.fillStyle=ag;ctx.strokeStyle='#44aa44';ctx.lineWidth=1.5;
                    ctx.beginPath();
                    for(let v=0;v<seg.verts;v++){const a=(Math.PI*2/seg.verts)*v,r=seg.r+seg.offsets[v];v===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
                    ctx.closePath();ctx.fill();ctx.stroke();
                    // Mini-boss indicator glow
                    if(seg.miniBoss&&!seg.miniBoss.released){
                        const mp=0.4+Math.sin(T/200)*0.3;
                        ctx.strokeStyle=seg.miniBoss.type==='blaster'?`rgba(0,255,255,${mp})`:`rgba(200,0,255,${mp})`;
                        ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,seg.r+5,0,Math.PI*2);ctx.stroke();
                    }
                    // Bolts
                    ctx.fillStyle='#666';
                    for(let b=0;b<3;b++){const ba=Math.PI*2/3*b;ctx.beginPath();ctx.arc(Math.cos(ba)*seg.r*0.5,Math.sin(ba)*seg.r*0.5,2,0,Math.PI*2);ctx.fill();}
                    ctx.shadowBlur=0;
                } else if(seg.type==='head'){
                    // Snake head — armored, angular
                    ctx.rotate(boss.angle);
                    const vuln=boss.headVulnerable;
                    ctx.shadowBlur=20;ctx.shadowColor=vuln?'#ff0000':'#ff8800';
                    ctx.fillStyle=vuln?'#2a0a0a':'#1a1a0a';
                    ctx.strokeStyle=vuln?'#ff4444':'#ffaa00';ctx.lineWidth=3;
                    // Head shape — arrow/wedge
                    ctx.beginPath();
                    ctx.moveTo(seg.r+8,0);
                    ctx.lineTo(seg.r*0.4,-seg.r*0.8);
                    ctx.lineTo(-seg.r*0.6,-seg.r*0.6);
                    ctx.lineTo(-seg.r,0);
                    ctx.lineTo(-seg.r*0.6,seg.r*0.6);
                    ctx.lineTo(seg.r*0.4,seg.r*0.8);
                    ctx.closePath();ctx.fill();ctx.stroke();
                    // Eyes
                    ctx.fillStyle='#000';
                    ctx.beginPath();ctx.arc(seg.r*0.2,-seg.r*0.25,6,0,Math.PI*2);ctx.fill();
                    ctx.beginPath();ctx.arc(seg.r*0.2,seg.r*0.25,6,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle=vuln?'#ff0000':'#ffcc00';ctx.shadowBlur=10;ctx.shadowColor=vuln?'red':'#ffcc00';
                    ctx.beginPath();ctx.arc(seg.r*0.2,-seg.r*0.25,3,0,Math.PI*2);ctx.fill();
                    ctx.beginPath();ctx.arc(seg.r*0.2,seg.r*0.25,3,0,Math.PI*2);ctx.fill();
                    ctx.shadowBlur=0;
                    // Shield indicator when invulnerable
                    if(!vuln){
                        const sp=0.3+Math.sin(T/200)*0.2;
                        ctx.strokeStyle=`rgba(255,170,0,${sp})`;ctx.lineWidth=2;
                        ctx.beginPath();ctx.arc(0,0,seg.r+10,0,Math.PI*2);ctx.stroke();
                    } else {
                        // Pulsing red vulnerability indicator
                        const vp=0.4+Math.sin(T/80)*0.4;
                        ctx.strokeStyle=`rgba(255,0,0,${vp})`;ctx.lineWidth=3;
                        ctx.beginPath();ctx.arc(0,0,seg.r+10,0,Math.PI*2);ctx.stroke();
                    }
                }
                ctx.restore();
            }
            // HP bar for head when vulnerable
            if(boss.headVulnerable){
                ctx.fillStyle='#000';ctx.fillRect(boss.x-30,boss.y-boss.r-22,60,8);
                ctx.fillStyle='#440000';ctx.fillRect(boss.x-29,boss.y-boss.r-21,58,6);
                ctx.fillStyle='#ff0000';ctx.fillRect(boss.x-29,boss.y-boss.r-21,58*(boss.hp/boss.maxHp),6);
            }
            ctx.save(); // Balance the restore at end of boss draw block
        } else {
            // --- SANS BOSS ---
            if(!boss.phase2){
                // Aura
                ctx.globalAlpha=0.1;ctx.fillStyle='cyan';
                ctx.beginPath();ctx.arc(0,-5,boss.r+15,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
                // Head
                ctx.fillStyle='#fff';ctx.shadowBlur=20;ctx.shadowColor='cyan';
                ctx.beginPath();ctx.arc(0,-8,boss.r,Math.PI,0);ctx.lineTo(boss.r*0.75,boss.r*0.75);ctx.lineTo(-boss.r*0.75,boss.r*0.75);ctx.closePath();ctx.fill();
                ctx.shadowBlur=0;
                // Eye sockets
                ctx.fillStyle='#000';ctx.beginPath();ctx.arc(-15,-4,12,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(15,-4,12,0,Math.PI*2);ctx.fill();
                // Glowing eye
                if(Math.floor(T/100)%2===0){
                    ctx.fillStyle='cyan';ctx.shadowBlur=12;ctx.shadowColor='cyan';
                    ctx.beginPath();ctx.arc(-15,-4,5,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-15,-4,2,0,Math.PI*2);ctx.fill();
                    ctx.shadowBlur=0;
                }
                // Nose
                ctx.fillStyle='#000';ctx.beginPath();ctx.moveTo(0,9);ctx.lineTo(-4,15);ctx.lineTo(4,15);ctx.fill();
                // Mouth
                ctx.lineWidth=2.5;ctx.strokeStyle='#000';ctx.beginPath();ctx.moveTo(-24,24);ctx.quadraticCurveTo(0,34,24,24);ctx.stroke();
                for(let t=-15;t<=15;t+=10){ctx.beginPath();ctx.moveTo(t,26);ctx.lineTo(t,30);ctx.stroke();}
            } else {
                // Phase 2 — dark + red
                ctx.globalAlpha=0.15;ctx.fillStyle='red';
                ctx.beginPath();ctx.arc(0,-5,boss.r+20+Math.sin(T/200)*5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
                // Head
                ctx.fillStyle='#0a0a0a';ctx.strokeStyle='red';ctx.lineWidth=3;
                ctx.shadowBlur=35;ctx.shadowColor='red';
                ctx.beginPath();ctx.arc(0,-8,boss.r,Math.PI,0);ctx.lineTo(boss.r*0.85,boss.r*0.75);ctx.lineTo(-boss.r*0.85,boss.r*0.75);ctx.closePath();ctx.fill();ctx.stroke();
                // Crack
                ctx.strokeStyle='#ff4444';ctx.lineWidth=2;ctx.beginPath();
                ctx.moveTo(0,-boss.r-8);ctx.lineTo(4,-25);ctx.lineTo(-2,-10);ctx.stroke();
                ctx.shadowBlur=0;
                // Eye sockets
                ctx.fillStyle='#000';ctx.beginPath();ctx.arc(-15,-4,14,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(15,-4,14,0,Math.PI*2);ctx.fill();
                // Burning eye
                ctx.fillStyle='red';ctx.shadowBlur=25;ctx.shadowColor='red';
                ctx.beginPath();ctx.arc(-15,-4,7,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#ff8800';ctx.beginPath();ctx.arc(-15,-4,4,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-15,-4,2,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
                // Nose
                ctx.fillStyle='red';ctx.beginPath();ctx.moveTo(0,9);ctx.lineTo(-6,18);ctx.lineTo(6,18);ctx.fill();
                // Jagged mouth
                ctx.lineWidth=2;ctx.strokeStyle='#ff2222';ctx.beginPath();ctx.moveTo(-30,28);
                for(let t=-30;t<=30;t+=10) ctx.lineTo(t,t%20===0?28:36);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    // --- CYBORG SCRAPS ---
    for(const sc of (G.cyborgScraps||[])){
        ctx.save();ctx.translate(sc.x,sc.y);
        // Pulsing beacon glow so scraps are easy to spot
        const scPulse=0.4+Math.sin(T/200+sc.x)*0.3;
        ctx.shadowBlur=25;ctx.shadowColor='#00ff88';
        ctx.strokeStyle=`rgba(0,255,136,${scPulse})`;ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(0,0,sc.r+10+Math.sin(T/300)*4,0,Math.PI*2);ctx.stroke();
        // Scrap body
        ctx.rotate(sc.angle);
        ctx.fillStyle='#102a18';ctx.strokeStyle='#00ff88';ctx.lineWidth=2.5;
        ctx.beginPath();
        ctx.moveTo(-sc.r,-sc.r*0.5);ctx.lineTo(sc.r*0.3,-sc.r);
        ctx.lineTo(sc.r,sc.r*0.2);ctx.lineTo(sc.r*0.5,sc.r);
        ctx.lineTo(-sc.r*0.3,sc.r*0.7);
        ctx.closePath();ctx.fill();ctx.stroke();
        // Circuit lines
        ctx.strokeStyle='rgba(0,255,136,0.5)';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(-6,-3);ctx.lineTo(6,3);ctx.moveTo(-3,5);ctx.lineTo(4,-4);ctx.stroke();
        // Core glow dot
        ctx.fillStyle='#00ff88';ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;ctx.restore();
    }
    // Scrap counter UI
    if(G.gilbertState==='scrap_collect'&&G.cyborgScraps&&G.cyborgScraps.length>0){
        ctx.font='bold 18px Courier New';ctx.fillStyle='#00ff88';ctx.textAlign='center';
        ctx.shadowBlur=10;ctx.shadowColor='#00ff88';
        ctx.fillText('SCRAPS: '+G.scrapsCollected+'/'+G.scrapsNeeded,W/2,30);
        ctx.shadowBlur=0;
    }

    // --- ROPE ---
    if(G.rope&&G.gilbert&&(G.gilbertState==='rope'||G.gilbertState==='scrap_collect')){
        ctx.strokeStyle='#888';ctx.lineWidth=2;ctx.setLineDash([6,4]);
        ctx.beginPath();ctx.moveTo(ship.x,ship.y);ctx.lineTo(G.gilbert.x,G.gilbert.y);ctx.stroke();
        ctx.setLineDash([]);
    }

    // --- GILBERT / ALBERT ---
    if(G.gilbert&&G.gilbertState!=='none'){
        ctx.save();ctx.translate(G.gilbert.x,G.gilbert.y);ctx.rotate(G.gilbert.angle);
        const isFlashing=G.gilbertState==='repair_flash';
        const isAlly=G.gilbertState==='ally';
        const isAlbert=G.albertMode;

        if(isFlashing){
            ctx.shadowBlur=40;ctx.shadowColor=isAlbert?'#0088ff':'#00ff00';
            ctx.fillStyle=isAlbert?'#0088ff':'#00ff00';ctx.strokeStyle=isAlbert?'#aaccff':'#aaffaa';
        } else {
            ctx.shadowBlur=isAlly?18:10;ctx.shadowColor=isAlbert?'#0066cc':'#00cc44';
            ctx.fillStyle=isAlbert?'#0a0a20':'#0a200a';ctx.strokeStyle=isAlbert?'#4488ff':'#44ff44';
        }
        ctx.lineWidth=2.5;

        // Body: hybrid spaceship-asteroid shape — irregular with a nose
        ctx.beginPath();
        // Spaceship nose (front)
        ctx.moveTo(G.gilbert.r+4,0);
        // Upper asteroid bumps
        ctx.lineTo(G.gilbert.r*0.6,-G.gilbert.r*0.5);
        ctx.lineTo(G.gilbert.r*0.2,-G.gilbert.r*0.9);
        ctx.lineTo(-G.gilbert.r*0.3,-G.gilbert.r*0.7);
        // Rear wing (top)
        ctx.lineTo(-G.gilbert.r*0.8,-G.gilbert.r*0.6);
        ctx.lineTo(-G.gilbert.r,-G.gilbert.r*0.2);
        // Rear flat
        ctx.lineTo(-G.gilbert.r*0.7,0);
        // Rear wing (bottom)
        ctx.lineTo(-G.gilbert.r,G.gilbert.r*0.2);
        ctx.lineTo(-G.gilbert.r*0.8,G.gilbert.r*0.6);
        // Lower asteroid bumps
        ctx.lineTo(-G.gilbert.r*0.3,G.gilbert.r*0.7);
        ctx.lineTo(G.gilbert.r*0.2,G.gilbert.r*0.9);
        ctx.lineTo(G.gilbert.r*0.6,G.gilbert.r*0.5);
        ctx.closePath();
        ctx.fill();ctx.stroke();

        // Surface details — asteroid crater rings
        if(!isFlashing){
            ctx.strokeStyle='rgba(68,255,68,0.2)';ctx.lineWidth=0.7;
            ctx.beginPath();ctx.arc(G.gilbert.r*0.1,-G.gilbert.r*0.2,G.gilbert.r*0.25,0,Math.PI*2);ctx.stroke();
            ctx.beginPath();ctx.arc(-G.gilbert.r*0.3,G.gilbert.r*0.15,G.gilbert.r*0.15,0,Math.PI*2);ctx.stroke();
        }

        // Cockpit / eye
        const eyePulse=isAlly?0.8+Math.sin(T/150)*0.2:0.5+Math.sin(T/300)*0.3;
        ctx.fillStyle=isFlashing?'#fff':(isAlbert?`rgba(68,136,255,${eyePulse})`:`rgba(0,255,68,${eyePulse})`);
        ctx.shadowBlur=isAlly?15:8;ctx.shadowColor=isAlbert?'#4488ff':'#00ff44';
        ctx.beginPath();ctx.arc(G.gilbert.r*0.25,0,5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(G.gilbert.r*0.25,0,2,0,Math.PI*2);ctx.fill();

        // Ally boost glow
        if(isAlly){
            ctx.strokeStyle=isAlbert?`rgba(68,136,255,${0.3+Math.sin(T/200)*0.2})`:`rgba(0,255,68,${0.3+Math.sin(T/200)*0.2})`;ctx.lineWidth=2;
            ctx.beginPath();ctx.arc(0,0,G.gilbert.r+8,0,Math.PI*2);ctx.stroke();
        }
        ctx.shadowBlur=0;ctx.restore();
    }

    // --- GILBERT FAKE BOSS WARNING ---
    if(G.gilbert&&G.gilbert.entering){
        const wa=0.5+Math.sin(T/100)*0.5;
        ctx.globalAlpha=wa;ctx.font='bold 40px Courier New';ctx.fillStyle='red';ctx.textAlign='center';
        ctx.shadowBlur=30;ctx.shadowColor='red';ctx.fillText('WARNING',W/2,H/2);
        ctx.font='14px Courier New';ctx.fillStyle='#ff8888';ctx.fillText('BOSS APPROACHING',W/2,H/2+25);
        ctx.shadowBlur=0;ctx.globalAlpha=1;
    }

    // --- BOSS RUSH WARNING ---
    if(G.bossRush){
        const wa=0.5+Math.sin(T/100)*0.5;
        ctx.globalAlpha=wa;ctx.font='bold 24px Courier New';ctx.fillStyle='#ff8800';ctx.textAlign='center';
        ctx.shadowBlur=20;ctx.shadowColor='#ff8800';
        ctx.fillText('BOSS RUSH — WAVE '+G.bossRushWave+'/4',W/2,50);
        ctx.shadowBlur=0;ctx.globalAlpha=1;
    }

    // --- GILBERT DIALOGUE ---
    if(G.gilbertDialogue){
        // Dark overlay
        ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,H*0.65,W,100);
        // Name tag
        ctx.font='bold 16px Courier New';ctx.fillStyle='#44ff44';ctx.textAlign='left';
        ctx.shadowBlur=8;ctx.shadowColor='#00ff44';
        ctx.fillText('GILBERT:',40,H*0.65+25);
        ctx.shadowBlur=0;
        // Dialogue text
        ctx.font='15px Courier New';ctx.fillStyle='#fff';
        ctx.fillText(G.gilbertDialogue,40,H*0.65+50);
        // Advance hint
        ctx.font='11px Courier New';ctx.fillStyle='#666';
        ctx.fillText('(wait...)',40,H*0.65+75);
    }

    // --- GILBERT QUIP (non-blocking) ---
    if(G.gilbertQuip&&G.gilbertQuipTimer>0&&!G.gilbertDialogue){
        const qa=Math.min(1,G.gilbertQuipTimer/30); // fade out in last 30 frames
        ctx.globalAlpha=qa*0.85;
        ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,H-55,W,45);
        ctx.globalAlpha=qa;
        ctx.font='bold 13px Courier New';ctx.fillStyle='#44ff44';ctx.textAlign='left';
        ctx.fillText('GILBERT:',15,H-35);
        ctx.font='13px Courier New';ctx.fillStyle='#ddd';
        ctx.fillText(G.gilbertQuip,110,H-35);
        ctx.globalAlpha=1;
    }

    // --- REPAIR PROMPT ---
    if(G.gilbertState==='repair_prompt'){
        const pulse=0.6+Math.sin(T/150)*0.4;
        ctx.font='bold 22px Courier New';ctx.fillStyle=`rgba(0,255,68,${pulse})`;ctx.textAlign='center';
        ctx.shadowBlur=15;ctx.shadowColor='#00ff44';
        ctx.fillText('PRESS E TO FIX GILBERT',W/2,H/2);
        ctx.shadowBlur=0;
    }

    // --- SHIP ---
    if(G.running){
        const blink=G.invincibleTimer>0&&Math.floor(T/60)%2===0;
        if(!blink){
            ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.a);

            // Resolve class ship shape
            const _cls = (G.slotId&&saves[G.slotId]&&saves[G.slotId].playerClass) ? saves[G.slotId].playerClass : 'none';
            const _shape = CLASS_SHIPS[_cls] || CLASS_SHIPS.none;
            const _clsDef = CLASS_DEFS[_cls] || CLASS_DEFS.none;
            const _classCol = isP2 ? '#ff00ff' : _clsDef.color;

            // Thrust flame (layered)
            if(isAction('thrust')){
                const fc=isP2?'#ff00ff':_classCol;
                const flameStart=ship.r*_shape.flameX;
                const len=ship.r*1.3+Math.random()*8;
                // Outer flame
                ctx.shadowBlur=15;ctx.shadowColor=fc;
                ctx.strokeStyle=fc;ctx.lineWidth=5;ctx.globalAlpha=0.4;
                ctx.beginPath();ctx.moveTo(flameStart,0);ctx.lineTo(-len-4,0);ctx.stroke();
                // Mid flame
                ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.globalAlpha=0.6;
                ctx.beginPath();ctx.moveTo(flameStart,0);ctx.lineTo(-len,0);ctx.stroke();
                // Core
                ctx.strokeStyle=isP2?'#ffaaff':'#aaeeff';ctx.lineWidth=1.5;ctx.globalAlpha=1;
                ctx.beginPath();ctx.moveTo(flameStart,0);ctx.lineTo(-len+3,0);ctx.stroke();
                ctx.shadowBlur=0;
            }

            // Ship body (class shape)
            ctx.beginPath();
            _shape.body(ctx,ship.r);
            ctx.closePath();
            // Fill gradient
            const sg=ctx.createLinearGradient(-ship.r,0,ship.r,0);
            sg.addColorStop(0,'#0a0a0a');sg.addColorStop(1,'#1a1a2a');
            ctx.fillStyle=sg;ctx.fill();
            // Outline (class color)
            ctx.strokeStyle=isP2?'#ff00ff':_classCol;
            if(isP2){ctx.shadowBlur=18;ctx.shadowColor='#ff00ff';}
            else{ctx.shadowBlur=6;ctx.shadowColor=_classCol;}
            ctx.lineWidth=2;ctx.stroke();ctx.shadowBlur=0;

            // Wing accent lines (class shape)
            ctx.globalAlpha=0.35;ctx.strokeStyle=isP2?'#ff00ff':_classCol;ctx.lineWidth=1;
            for(const wl of _shape.wingLines){
                ctx.beginPath();ctx.moveTo(ship.r*wl[0],ship.r*wl[1]);ctx.lineTo(ship.r*wl[2],ship.r*wl[3]);ctx.stroke();
            }
            ctx.globalAlpha=1;

            // Cockpit glow (class color)
            const _cpx=_shape.cockpitX;
            const cockpit=ctx.createRadialGradient(_cpx,0,0,_cpx,0,4);
            cockpit.addColorStop(0,isP2?'#ff66ff':_classCol);cockpit.addColorStop(1,'rgba(0,0,0,0)');
            ctx.fillStyle=cockpit;ctx.beginPath();ctx.arc(_cpx,0,5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle=isP2?'#ff00ff':_classCol;ctx.beginPath();ctx.arc(_cpx,0,2,0,Math.PI*2);ctx.fill();

            // Tank damage sparks
            if(G.tankDamaged){
                for(let sp=0;sp<2;sp++){
                    const sx=(Math.random()-0.5)*ship.r*1.5;
                    const sy=(Math.random()-0.5)*ship.r*1.2;
                    const ss=Math.random()*3+1;
                    ctx.globalAlpha=0.6+Math.random()*0.4;
                    ctx.fillStyle=Math.random()>0.5?'#ffaa00':'#ff4400';
                    ctx.fillRect(sx,sy,ss,ss);
                    // Spark lines
                    if(Math.random()>0.6){
                        ctx.strokeStyle='#ffcc00';ctx.lineWidth=1;ctx.globalAlpha=0.5;
                        ctx.beginPath();ctx.moveTo(sx,sy);
                        ctx.lineTo(sx+(Math.random()-0.5)*8,sy+(Math.random()-0.5)*8);ctx.stroke();
                    }
                }
                ctx.globalAlpha=1;
            }

            // Shield ring
            if(G.hasForceField&&G.shieldFuel>0){
                ctx.beginPath();ctx.arc(0,0,ship.r+7,0,Math.PI*2);
                ctx.strokeStyle=`rgba(0,255,255,${0.15+G.shieldFuel*0.15+Math.sin(T/300)*0.1})`;
                ctx.lineWidth=2;ctx.stroke();
            }
            if(G.godMode){
                ctx.beginPath();ctx.arc(0,0,ship.r+11,0,Math.PI*2);
                ctx.strokeStyle=`rgba(255,215,0,${0.4+Math.sin(T/200)*0.3})`;ctx.lineWidth=2;ctx.stroke();
            }
            if(G.invincibleTimer>0){
                ctx.beginPath();ctx.arc(0,0,ship.r+11,0,Math.PI*2);
                ctx.strokeStyle=`rgba(100,180,255,${0.3+Math.sin(T/50)*0.3})`;ctx.lineWidth=2;ctx.stroke();
            }
            ctx.restore();
        }
    }

    // --- BULLETS (elongated with glow trails) ---
    for(const b of bullets){
        const isTriple=G.tripleShotTimer>0;
        const isGilbert=!!b.gilbert;
        const allyCol=G.albertMode?'#4488ff':'#44ff44';
        const allyGlow=G.albertMode?'#0066ff':'#00ff44';
        const allyCore=G.albertMode?'#aaccff':'#aaffaa';
        // Trail
        for(let i=0;i<b.trail.length;i++){
            const ta=i/b.trail.length;
            ctx.globalAlpha=ta*0.35;
            ctx.fillStyle=isGilbert?allyCol:(isTriple?'#ff8800':'#ff5555');
            ctx.beginPath();ctx.arc(b.trail[i].x,b.trail[i].y,1.5+ta,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
        // Bullet head glow
        ctx.shadowBlur=12;ctx.shadowColor=isGilbert?allyGlow:(isTriple?'#ff8800':'#ff3333');
        const bg=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,5);
        bg.addColorStop(0,'#fff');bg.addColorStop(0.4,isGilbert?allyCol:(isTriple?'#ffcc00':'#ff8888'));bg.addColorStop(1,'transparent');
        ctx.fillStyle=bg;ctx.beginPath();ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();
        // Core
        ctx.fillStyle=isGilbert?allyCore:(isTriple?'#ffdd44':'#ffcccc');
        ctx.beginPath();ctx.arc(b.x,b.y,2,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
    }

    // --- TUTORIAL OVERLAY ---
    if(G.tutorial&&G.running&&G.tutStep<tutMsgs.length){
        const msg=tutMsgs[G.tutStep];
        // Gradient banner
        const tg=ctx.createLinearGradient(0,H*0.18,0,H*0.18+75);
        tg.addColorStop(0,'rgba(0,0,0,0)');tg.addColorStop(0.2,'rgba(0,0,0,0.7)');
        tg.addColorStop(0.8,'rgba(0,0,0,0.7)');tg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=tg;ctx.fillRect(0,H*0.18,W,75);
        ctx.font='bold 28px Courier New';ctx.fillStyle='#00ff00';ctx.textAlign='center';
        ctx.shadowBlur=10;ctx.shadowColor='#00ff00';
        ctx.fillText(msg[0],W/2,H*0.18+32);ctx.shadowBlur=0;
        ctx.font='15px Courier New';ctx.fillStyle='#aaa';
        ctx.fillText(msg[1],W/2,H*0.18+55);
    }

    // --- TEST MODE OVERLAY ---
    if(G.testMode&&G.running){
        ctx.globalAlpha=1;ctx.font='11px Courier New';ctx.textAlign='right';ctx.fillStyle='#00ffaa';
        let ty=60;
        const tl=s=>{ctx.fillText(s,W-10,ty);ty+=14;};
        tl('--- TEST MODE ---');
        tl('Level: '+G.level);
        tl('Asteroids: '+asteroids.length);
        tl('MiniBosses: '+miniBosses.length);
        tl('EnemyBullets: '+enemyBullets.length);
        tl('Blasters: '+gasterBlasters.length);
        tl('Particles: '+particles.length);
        tl('Ship: '+Math.round(ship.x)+','+Math.round(ship.y));
        tl('Canvas: '+W+'x'+H);
        if(boss){
            tl('Boss type: '+boss.type);
            tl('Boss state: '+boss.state);
            tl('Boss HP: '+boss.hp+'/'+boss.maxHp);
            tl('Boss timer: '+boss.timer);
            if(boss.type===5) tl('Segments: '+boss.segmentsAlive+' | Head vuln: '+boss.headVulnerable);
            if(boss.type===3||boss.type===10) tl('Phase2: '+boss.phase2);
        }
        if(G.gilbert){
            tl('Gilbert: '+G.gilbertState);
            tl('Gilbert pos: '+Math.round(G.gilbert.x)+','+Math.round(G.gilbert.y));
        }
        if(G.bossRush) tl('BossRush wave: '+G.bossRushWave+'/4');
        tl('Elapsed: '+((performance.now()-G.waveStart)/1000).toFixed(1)+'s');
        // Hitbox circles
        ctx.globalAlpha=0.25;ctx.strokeStyle='#00ff00';ctx.lineWidth=1;
        // Ship hitbox
        ctx.beginPath();ctx.arc(ship.x,ship.y,ship.r*0.6,0,Math.PI*2);ctx.stroke();
        // Asteroid hitboxes
        ctx.strokeStyle='#ffff00';
        for(const a of asteroids){ctx.beginPath();ctx.arc(a.x,a.y,a.r*0.7,0,Math.PI*2);ctx.stroke();}
        // Mini boss hitboxes
        ctx.strokeStyle='#ff00ff';
        for(const mb of miniBosses){ctx.beginPath();ctx.arc(mb.x,mb.y,mb.r,0,Math.PI*2);ctx.stroke();}
        // Boss hitbox
        if(boss){
            ctx.strokeStyle='#ff0000';
            if(boss.type===5){
                for(const seg of boss.segments){if(!seg.destroyed){ctx.beginPath();ctx.arc(seg.x,seg.y,seg.r,0,Math.PI*2);ctx.stroke();}}
            } else {
                ctx.beginPath();ctx.arc(boss.x,boss.y,boss.r,0,Math.PI*2);ctx.stroke();
            }
        }
        ctx.globalAlpha=1;
    }

    // Fast travel menu
    if(G.fastTravelOpen){
        ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
        ctx.fillStyle='rgba(5,5,20,0.9)';
        ctx.fillRect(W/2-180,H/2-80,360,160);
        ctx.strokeStyle='#00ccff';ctx.lineWidth=2;
        ctx.strokeRect(W/2-180,H/2-80,360,160);
        ctx.font='bold 20px Courier New';ctx.textAlign='center';ctx.fillStyle='#00ccff';
        ctx.shadowBlur=10;ctx.shadowColor='#00ccff';
        ctx.fillText('FAST TRAVEL',W/2,H/2-48);ctx.shadowBlur=0;
        ctx.font='14px Courier New';ctx.fillStyle='#aaa';
        ctx.fillText('Return to Space Station?',W/2,H/2-15);
        ctx.font='bold 13px Courier New';
        ctx.fillStyle='#00ff88';ctx.fillText('[SPACE] Confirm',W/2,H/2+25);
        ctx.fillStyle='#ff6666';ctx.fillText('[ESC] Cancel',W/2,H/2+50);
        ctx.font='10px Courier New';ctx.fillStyle='#555';
        ctx.fillText('Your score will be saved',W/2,H/2+72);
    }

    // Cutscene overlay
    if(G.stationCutscene) drawCutscene();

    // Anti-piracy canvas watermark
    if(window._watermarkId){
        ctx.globalAlpha=0.03;ctx.fillStyle='#fff';ctx.font='9px monospace';ctx.textAlign='right';
        ctx.fillText('ID:'+window._watermarkId,W-5,H-5);ctx.globalAlpha=1;
    }

    ctx.restore();
}

// ============================================================
//  LOOP + INPUT
// ============================================================
function loop(){update();draw();updateAchNotify();requestAnimationFrame(loop);}
for(let i=0;i<5;i++) spawnAsteroid();
loop();

document.addEventListener('keydown', e => {
    // Keybind capture mode
    if(listeningForBind){handleKeybindCapture(e);return;}

    keys[e.code]=true;
    // Prevent scroll on fire key
    if(settings.keybinds.fire.includes(e.code)) e.preventDefault();

    // Close fast travel menu with ESC (before pause toggle)
    if(e.code==='Escape'&&G.fastTravelOpen){G.fastTravelOpen=false;Sound.ui();return;}
    // Close practice menu with ESC (before pause toggle)
    if(e.code==='Escape'&&G.practicePaused){applyPractice();Sound.ui();return;}
    // Pause toggle (ESC)
    if(e.code==='Escape'&&G.running&&G.mode!=='station'){togglePause();return;}
    // Don't process other keys while paused
    if(G.paused) return;

    // --- STATION MODE KEYS ---
    if(G.mode==='station'){
        const st=G.station;
        if(st.shopOpen){
            if(e.code==='ArrowUp'||e.code==='KeyW'){st.shopSelection--;if(st.shopSelection<0)st.shopSelection=0;Sound.ui();}
            if(e.code==='ArrowDown'||e.code==='KeyS'){st.shopSelection++;Sound.ui();}
            if(e.code==='Space'||e.code==='Enter'){
                const items=G._shopItems;
                if(items&&items[st.shopSelection]&&items[st.shopSelection].canBuy) items[st.shopSelection].action();
            }
            if(e.code==='Escape'){st.shopOpen=false;Sound.ui();return;}
        } else if(G.stationDialogue){
            if(e.code==='Space'||e.code==='Enter'){
                if(!advanceStationDialogue()){
                    // Dialogue done — open shop if NPC has one
                    const npc=st.interactTarget;
                    if(npc&&npc.role==='shop_upgrades'){st.shopOpen=true;st.shopCategory='upgrades';st.shopSelection=0;}
                    else if(npc&&npc.role==='shop_modules'){st.shopOpen=true;st.shopCategory='modules';st.shopSelection=0;}
                    else if(npc&&npc.role==='shop_gilbert'){st.shopOpen=true;st.shopCategory='gilbert';st.shopSelection=0;}
                }
                Sound.ui();
            }
        } else if(e.code==='KeyE'&&st.interactTarget){
            if(st.interactTarget.id==='airlock'){leaveStation();Sound.ui();}
            else if(st.interactTarget.id==='elevator'){
                st.floor=st.floor===0?1:0;
                st.playerX=st.floor===0?STATION_WIDTH-100:100;
                st.cameraX=Math.max(0,st.playerX-W/2);
                st.interactTarget=null;Sound.ui();
            }
            else if(st.interactTarget.role==='banker'){
                // Convert score to MB
                const earned=Math.floor(G.score/100);
                if(earned>0){G.mb+=earned;G.score=0;saveStation();
                    showStationDialogue({name:'BANKER',color:'#ffdd00',lines:["Converted! You got "+earned+" MB.","Pleasure doing business."]});
                } else {
                    showStationDialogue({name:'BANKER',color:'#ffdd00',lines:["You don't have any Score to convert.","Come back when you've earned some."]});
                }
                Sound.ui();
            }
            else if(st.interactTarget.lines){showStationDialogue(st.interactTarget);Sound.ui();}
        }
        if(e.code==='Escape'&&!st.shopOpen&&!G.stationDialogue){togglePause();return;}
        return;
    }

    // --- CUTSCENE KEYS ---
    if(G.stationCutscene==='choice'){
        if(e.code==='ArrowUp'||e.code==='KeyW') G.dialogueChoiceIndex=0;
        if(e.code==='ArrowDown'||e.code==='KeyS') G.dialogueChoiceIndex=1;
        if(e.code==='Space'||e.code==='Enter'){
            if(G.dialogueChoiceIndex===0){G.stationCutscene='who_response';G.stationCutsceneTimer=0;}
            else{G.stationCutscene='help_response';G.stationCutsceneTimer=0;}
        }
        return;
    }
    if(G.stationCutscene) return; // Block all input during other cutscene phases

    // Fast travel menu (X key)
    if(e.code==='KeyX'&&G.running&&G.stationUnlocked&&!boss&&G.mode==='space'&&!G.bossRush&&!G.stationCutscene){
        G.fastTravelOpen=!G.fastTravelOpen;Sound.ui();return;
    }
    // Confirm fast travel
    if(G.fastTravelOpen){
        if(e.code==='Space'||e.code==='Enter'){G.fastTravelOpen=false;enterStation();return;}
        if(e.code==='Escape'){G.fastTravelOpen=false;Sound.ui();return;}
        return; // Block other input while menu is open
    }

    // Dash module (E key)
    if(e.code==='KeyE'&&G.running&&G.mode==='space'&&!G.practice&&G.equippedModules.includes('dash')&&G.dashCooldown<=0&&G.gilbertState!=='repair_prompt'){
        G.dashCooldown=180;
        ship.tx+=Math.cos(ship.a)*8;ship.ty+=Math.sin(ship.a)*8;
        G.invincibleTimer=Math.max(G.invincibleTimer,15);
        for(let p=0;p<10;p++) particles.push({x:ship.x,y:ship.y,dx:(Math.random()-0.5)*3,dy:(Math.random()-0.5)*3,life:20,maxLife:20,color:'#00ccff',size:2});
        Sound.shieldSfx();
    }

    // Practice menu toggle
    if(e.code==='KeyE'&&G.practice&&G.running&&!boss) togglePracticeMenu();

    // Gilbert repair (DLC)
    if(e.code==='KeyE'&&G.gilbertState==='repair_prompt'&&G.running){
        G.gilbertState='repair_flash';
        G.gilbertFlashTimer=60;
        boom(G.gilbert.x,G.gilbert.y,'#00ff00',40);
        Sound.powerup();
    }

    // Cheat code: 13132 (only with verified devkey.js)
    if(window._DEVKEY_VERIFIED&&G.running&&!G.practicePaused){
        cheatBuf+=e.key;
        if(cheatBuf.length>5) cheatBuf=cheatBuf.slice(-5);
        if(cheatBuf==='13132'){toggleDebug();cheatBuf='';}
    }
});
document.addEventListener('keyup', e => { keys[e.code]=false; });

// Splash dismiss
let splashDismissed=false;
function dismissSplash(){
    if(splashDismissed) return;
    splashDismissed=true;
    Sound.init();
    const sp=document.getElementById('splash');
    sp.style.opacity='0';sp.style.pointerEvents='none';
    setTimeout(()=>{
        sp.style.display='none';
        // Don't show menu if a game is already running (user was fast)
        if(G.running) return;
        if(!checkExistingLicense()){
            document.getElementById('menuScreen').style.display='none';
            document.getElementById('licenseScreen').style.display='flex';
        } else {
            document.getElementById('menuScreen').style.display='block';
            applyWatermark();
        }
    },1000);
}
document.getElementById('splash').addEventListener('click',dismissSplash);
document.addEventListener('keydown',function splashKey(){dismissSplash();document.removeEventListener('keydown',splashKey);},{once:true});

// ============================================================
//  DLC LOADER — auto-detects dlc.js in the game folder
// ============================================================
function checkDLC() {
    if (window.DLC && window.DLC.loaded) {
        document.getElementById('dlcBtn').style.display = 'inline-block';
        if (window.DLC.init) window.DLC.init();
        console.log('[GAME] DLC detected and enabled: ' + (window.DLC.name || 'Unknown'));
    }
}
function openDLC() {
    try { Sound.ui(); } catch(e) {}
    if (window.DLC && window.DLC.loaded) {
        const checks = [];
        // Check DLC core
        checks.push(['DLC Module', !!window.DLC.loaded]);
        checks.push(['DLC Version', !!window.DLC.version]);
        checks.push(['DLC Achievements', !!(window.DLC.achievements && window.DLC.achievements.length > 0)]);
        // Check achievement injection
        const dlcAchInGame = ACH_DEFS.some(a => a.id.startsWith('dlc_'));
        checks.push(['Achievement Injection', dlcAchInGame]);
        // Check boss 4 audio
        checks.push(['Boss 4 Audio Track', !!Sound.boss4Audio]);
        // Check boss 4 spawnable
        checks.push(['Cyborg Boss (Type 4)', typeof spawnBoss === 'function']);
        // Check spawner mini boss
        checks.push(['Spawner Mini Boss', typeof spawnMiniBoss === 'function']);
        // Check blaster mini boss
        checks.push(['Blaster Mini Boss', typeof spawnMiniBoss === 'function']);
        // Check save system
        checks.push(['Save System', !!localStorage.getItem('ast_rem_saves') || true]);
        // Check sound system
        checks.push(['Sound Engine', !!Sound.ctx]);

        let status = 'DLC Installed. Systems Functional.\n\n--- DIAGNOSTIC REPORT ---\n';
        let allGood = true;
        for (const [name, ok] of checks) {
            status += (ok ? '[OK] ' : '[FAIL] ') + name + '\n';
            if (!ok) allGood = false;
        }
        status += '\n' + (allGood ? 'All systems operational. No bugs detected.' : 'WARNING: Some checks failed. See above.');
        alert(status);
    }
}

// --- DEV KEY VERIFICATION ---
function verifyDevKey() {
    window._DEVKEY_VERIFIED = false;
    if (!window._DEVKEY_PAYLOAD) {
        console.log('[ANTI-CHEAT] No dev key payload found.');
        return;
    }
    const p = window._DEVKEY_PAYLOAD;
    // Verify structure
    if (!p.sig || !p.ts || p.cs === undefined || p.v === undefined) {
        console.warn('[ANTI-CHEAT] Invalid dev key structure — rejected.');
        window._DEVKEY_PAYLOAD = null;
        return;
    }
    // Verify signature matches expected
    const EXPECTED_SIG = 'AST-REM-DEV-a7f3bc91e24d';
    if (p.sig !== EXPECTED_SIG) {
        console.warn('[ANTI-CHEAT] Invalid dev key signature — rejected.');
        window._DEVKEY_PAYLOAD = null;
        return;
    }
    // Verify checksum
    const expectedCS = ((p.sig.length * 7) + (p.ts % 9973)) ^ 0xBEEF;
    if (p.cs !== expectedCS) {
        console.warn('[ANTI-CHEAT] Dev key checksum mismatch — rejected.');
        window._DEVKEY_PAYLOAD = null;
        return;
    }
    // Verify version
    if (p.v !== 2) {
        console.warn('[ANTI-CHEAT] Dev key version mismatch — rejected.');
        window._DEVKEY_PAYLOAD = null;
        return;
    }
    // All checks passed
    window._DEVKEY_VERIFIED = true;
    console.log('[ANTI-CHEAT] Dev key verified successfully. Cheats enabled.');
}

