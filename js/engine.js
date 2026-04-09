// ============================================================
//  UPDATE
// ============================================================
function update() {
    if(!G.running||G.practicePaused||G.paused||G.fastTravelOpen||G.inventoryOpen) {
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
    // Block normal shooting while charging big shot (level 6 charging or post-level6 hold-charge)
    const _blockShoot=(G.level6&&(G.level6.state==='gilbert_found'||G.level6.state==='charging'||G.level6.state==='release_prompt'))
                    ||(G.bigShotCharge>0);
    if(isAction('fire')&&!_blockShoot) shoot();
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
    // NEXUS-0 control rewrite — reverses left/right and thrust direction
    const _nxRewrite=boss&&boss.type===7&&boss.rewriting;
    if(_nxRewrite?isAction('right'):isAction('left')) ship.a-=TURN;
    if(_nxRewrite?isAction('left'):isAction('right')) ship.a+=TURN;
    if(isAction('thrust')){
        const _thrustDir=_nxRewrite?ship.a+Math.PI:ship.a;
        ship.tx+=THRUST*Math.cos(_thrustDir); ship.ty+=THRUST*Math.sin(_thrustDir);
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
    const _l6State=G.level6&&G.level6.state;
    if(!boss&&!G.tutorial&&!G.noBoss&&!G.bossRush&&!_l6State&&(G.gilbertState==='none'||G.gilbertState==='rope'||G.gilbertState==='ally'||G.gilbertState==='scrap_collect')&&elapsed>BOSS_TIME){
        // 10 levels. Bosses at 1, 2, 4(cyborg), 10(sans). Others are wave-only.
        if(G.level<=2) spawnBoss(G.level);
        else if(G.level===4) spawnBoss(4);
        else if(G.level===5) spawnBoss(5);
        else if(G.level>=10) spawnBoss(10);
        else if(G.level===7&&!G.grimmSpawned&&!G.grimmDefeated){ /* hold level 7 — Grimm incoming */ }
        else { G.level++;G.waveStart=performance.now();G.spawnTimer=0;asteroids=[];for(let k=0;k<8;k++)spawnAsteroid();updateUI(); }
    }

    // GRIMM BOSS (optional) — spawns 60s into level 7 after rouge war, one-time encounter
    if(!boss&&!G.noBoss&&!G.bossRush&&!_l6State&&G.level===7&&!G.grimmDefeated&&!G.grimmSpawned&&elapsed>60){
        G.grimmSpawned=true;
        spawnBoss(6);
    }

    // NEXUS-0 SECRET BOSS — shot sequence trigger in Sector 1
    if(G.nexusListening&&!G.nexusDefeated&&!boss&&!G.bossRush&&!_l6State&&G.level<=3){
        const log=G.nexusShotLog;
        if(log.length>=9){
            const last9=log.slice(-9);
            const pattern=['miss','miss','miss','hit','miss','miss','hit','hit','hit'];
            let match=true;
            for(let i=0;i<9;i++){if(last9[i]!==pattern[i]){match=false;break;}}
            if(match){
                G.nexusShotLog=[];
                G.nexusListening=false;
                spawnBoss(7);
            }
        }
    }

    // BOSS RUSH (DLC) — trigger 55s after boss 2 defeat
    if(!G.bossRush&&G.bossRushStartTime>0&&G.gilbertState==='none'&&!boss){
        const sinceB2=(performance.now()-G.bossRushStartTime)/1000;
        if(sinceB2>=55){
            G.bossRushStartTime=0;
            startBossRush();
        }
    }
    // Boss rush wave management
    if(G.bossRush) updateBossRush();

    // Level 6 state machine (Rouge war)
    if(typeof updateLevel6==='function') updateLevel6();
    if(typeof updateRouges==='function' && rouges.length>0) updateRouges();
    if(typeof updateBigShot==='function') updateBigShot();

    // Gilbert update
    updateGilbert();
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

    // Determine if level 6 is in a phase that suppresses normal gameplay spawning
    const _l6=G.level6&&G.level6.state;
    const _l6Suppress = _l6==='kidnap_grab'||_l6==='arena_enter'||_l6==='arena'||_l6==='arena_surround'
        ||_l6==='rescue_arrive'||_l6==='rescue_dialog'||_l6==='ambush'
        ||_l6==='battlefield'||_l6==='gilbert_yell'||_l6==='battlefield_hunt'
        ||_l6==='gilbert_found'||_l6==='charging'||_l6==='release_prompt'
        ||_l6==='released'||_l6==='victory'||_l6==='failed';
    // SPAWNING (blocked during boss rush, Gilbert dialogue, and level 6 cutscenes)
    if(!boss&&!G.tutorial&&!G.bossRush&&!G.gilbertDialogue&&!_l6Suppress){
        G.spawnTimer++;
        const diff=DIFFICULTY[currentDifficulty]||DIFFICULTY.normal;
        const maxAst=Math.round((5+G.level*3)*diff.astMax), rate=Math.max(30,Math.round((90-G.level*10)*diff.astRate));
        if(G.spawnTimer>rate&&asteroids.length<maxAst){spawnAsteroid();G.spawnTimer=0;}
        // Block mini-boss spawns during ANY active level 6 state (so rouges get the spotlight)
        if(!G.noMiniBoss&&!_l6State&&Math.random()<0.0002*G.level*diff.mbChance) spawnMiniBoss();
        // fuel spawns after boss 2
        if(G.hasForceField){G.fuelTimer++;if(G.fuelTimer>Math.round(1500*diff.fuelRate)){spawnAsteroid(undefined,undefined,undefined,'fuel');G.fuelTimer=0;}}
    }

    // Force field drop pickup
    if(G.forceFieldDrop){
        if(Math.hypot(ship.x-G.forceFieldDrop.x,ship.y-G.forceFieldDrop.y)<ship.r+G.forceFieldDrop.size){
            G.hasForceField=true; G.shieldFuel=getMaxShieldFuel(); updateShieldUI();
            boom(ship.x,ship.y,'cyan',30); Sound.powerup(); G.forceFieldDrop=null;
            unlockAch('shield_up');
            if(1) gilbertIntro('forcefield',GILBERT_INTROS.forcefield);
        }
    }

    // AMMO
    G.ammoTimer++; if(!G.tutorial&&G.ammoTimer>1500){dropAmmo();G.ammoTimer=0;}
    for(let i=ammoBoxes.length-1;i>=0;i--){const b=ammoBoxes[i];b.y+=b.dy;
        // Magnet module
        if(G.equippedModules.includes('magnet')){const md=Math.hypot(ship.x-b.x,ship.y-b.y);if(md<200&&md>1){b.x+=(ship.x-b.x)/md*1.5;b.y+=(ship.y-b.y)/md*1.5;}}
        if(Math.hypot(ship.x-b.x,ship.y-b.y)<ship.r+b.size){G.ammo+=25;if(G.ammo>=100)unlockAch('stockpile');if(G.ammo>G.peakAmmo)G.peakAmmo=G.ammo;if(G.peakAmmo>=200)unlockAch('dlc_hoarder');Sound.powerup();ammoBoxes.splice(i,1);if(1)gilbertIntro('ammobox',GILBERT_INTROS.ammobox);updateUI();}
        else if(b.y>H+50)ammoBoxes.splice(i,1);}

    // POWERUPS
    G.powerTimer++; if(!G.tutorial&&G.powerTimer>2200){dropPowerup();G.powerTimer=0;}
    for(let i=powerups.length-1;i>=0;i--){const p=powerups[i];p.x+=p.dx;p.y+=p.dy;
        if(Math.hypot(ship.x-p.x,ship.y-p.y)<ship.r+p.size){G.tripleShotTimer=480;Sound.powerup();powerups.splice(i,1);if(1)gilbertIntro('tripleshot',GILBERT_INTROS.tripleshot);}
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
                if(a.type==='fuel'){boom(a.x,a.y,'#ffff00');Sound.powerup();if(G.hasForceField&&G.shieldFuel<3){G.shieldFuel++;updateShieldUI();}G.fuelCollected++;if(G.fuelCollected>=5)unlockAch('fuel_collector');if(1)gilbertIntro('fuel',GILBERT_INTROS.fuel);}
                else{
                    const _isBig=bullets[j].big;
                    boom(a.x,a.y,_isBig?'#ffff00':'#888',_isBig?18:8);Sound.explode();
                    // Big shot vaporizes — no split. Normal bullet splits large asteroids.
                    if(!_isBig&&a.r>20&&!G.tutorial){spawnAsteroid(a.x,a.y,a.r/2);spawnAsteroid(a.x,a.y,a.r/2);}
                    G.asteroidsDestroyed++;unlockAch('first_blood');if(G.asteroidsDestroyed>=100)unlockAch('rock_crusher');
                    if(G.tripleShotTimer>0)unlockAch('triple_threat');
                    if(1){G.consecutiveKills++;if(G.consecutiveKills>=10)unlockAch('dlc_chain_reaction');if(G.asteroidsDestroyed>=250)unlockAch('dlc_mass_destroyer');}
                    if(typeof tryDropDataFragment==='function') tryDropDataFragment(!!a.hasLoreDrop);}
                // NEXUS tracking: bullet hit asteroid = hit
                if(bullets[j]._nexusTracked){G.nexusShotLog.push('hit');if(G.nexusShotLog.length>20)G.nexusShotLog.shift();}
                bullets.splice(j,1);asteroids.splice(i,1);addScore(100);break;
            }
        }
    }

    // BULLETS
    for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.trail.push({x:b.x,y:b.y});if(b.trail.length>6)b.trail.shift();
        b.x+=b.dx;b.y+=b.dy;if(b.x<0||b.x>W||b.y<0||b.y>H){
            // NEXUS tracking: bullet left screen without hitting = miss
            if(b._nexusTracked){G.nexusShotLog.push('miss');if(G.nexusShotLog.length>20)G.nexusShotLog.shift();}
            bullets.splice(i,1);
        }
    }

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
                const _dmgMB=bullets[j].big?(bullets[j].damage||5):1;boom(bullets[j].x,bullets[j].y,hitCol,4);mb.hp-=_dmgMB;Sound.hit();bullets.splice(j,1);
                if(mb.hp<=0){boom(mb.x,mb.y,hitCol,25);Sound.explode();addScore(mb.type==='blaster'?1000:mb.type==='spawner'?600:(mb.type==='shooter'?800:400));G.mb+=(mb.type==='blaster'?8:mb.type==='spawner'?5:(mb.type==='shooter'?6:3));G.miniBossKills++;if(G.miniBossKills>=5)unlockAch('bounty_hunter');if(G.miniBossKills>=10)unlockAch('dlc_exterminator');miniBosses.splice(i,1);break;}
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
        } else if(boss.type===6){
            // --- NIGHTMARE KING GRIMM BOSS ---
            // Rage multiplier — boss gets faster and meaner as HP drops
            boss.rageMultiplier=1+(1-boss.hp/boss.maxHp)*0.5; // 1.0 at full → 1.5 at near-death
            const rm=boss.rageMultiplier;
            const grimmSpeed=(boss.phase3?3.5:boss.phase2?2.4:2.0)*rm;
            const grimmFast=(boss.phase3?18:boss.phase2?14:13)*Math.min(rm,1.3);

            // Fire resistance check — Grimm's Flame Charm gives 50% chance to resist fire hits
            const _hasFlameCharm=(typeof hasItem==='function')&&hasItem('grimm_flame_charm');
            function fireHurt(){
                if(_hasFlameCharm&&Math.random()<0.5){
                    // Resisted! Brief invincibility + visual feedback
                    if(G.invincibleTimer<30) G.invincibleTimer=30;
                    boom(ship.x,ship.y,'#ff8800',6);
                    Sound.shieldSfx();
                    return;
                }
                hurtPlayer();
            }

            // Update flame pillars
            for(let fp=boss.flamePillars.length-1;fp>=0;fp--){
                const p=boss.flamePillars[fp];
                p.timer++;
                if(p.timer>=130){boss.flamePillars.splice(fp,1);continue;}
                if(p.timer>=40&&p.timer<100){
                    if(Math.abs(ship.x-p.x)<22&&ship.y>p.y-p.h&&ship.y<p.y+10) fireHurt();
                }
            }
            // Update bat projectiles (some can home in phase 3)
            for(let bp=boss.batProjectiles.length-1;bp>=0;bp--){
                const b=boss.batProjectiles[bp];
                // Homing bats (phase 3) gently track player
                if(b.homing){
                    const toP=Math.atan2(ship.y-b.y,ship.x-b.x);
                    const curA=Math.atan2(b.dy,b.dx);
                    let diff2=toP-curA;while(diff2>Math.PI)diff2-=Math.PI*2;while(diff2<-Math.PI)diff2+=Math.PI*2;
                    const turnRate=0.02;
                    const newA=curA+Math.sign(diff2)*Math.min(Math.abs(diff2),turnRate);
                    const spd=Math.hypot(b.dx,b.dy);
                    b.dx=Math.cos(newA)*spd;b.dy=Math.sin(newA)*spd;
                }
                b.x+=b.dx;b.y+=b.dy;b.life--;
                if(b.life<=0||b.x<-50||b.x>W+50||b.y<-50||b.y>H+50){boss.batProjectiles.splice(bp,1);continue;}
                if(Math.hypot(ship.x-b.x,ship.y-b.y)<ship.r+8){fireHurt();boss.batProjectiles.splice(bp,1);continue;}
            }
            // Update fire trail (ground hazards left by movement)
            for(let ft=boss.fireTrail.length-1;ft>=0;ft--){
                const f=boss.fireTrail[ft];
                f.life--;
                if(f.life<=0){boss.fireTrail.splice(ft,1);continue;}
                if(Math.hypot(ship.x-f.x,ship.y-f.y)<f.r+ship.r*0.5) fireHurt();
            }

            // --- Ambient pressure: boss shoots fireballs while targeting ---
            if(boss.state==='target'){
                boss.ambientShootTimer++;
                const ambientRate=boss.phase3?25:boss.phase2?50:55;
                if(boss.ambientShootTimer>=ambientRate){
                    boss.ambientShootTimer=0;
                    const toP=Math.atan2(ship.y-boss.y,ship.x-boss.x);
                    boss.batProjectiles.push({x:boss.x,y:boss.y,dx:Math.cos(toP)*5,dy:Math.sin(toP)*5,life:90,homing:boss.phase3});
                    Sound.hit();
                }
            }

            if(boss.state==='target'){
                boss.angle=Math.atan2(ship.y-boss.y,ship.x-boss.x);
                boss.dx=Math.cos(boss.angle)*grimmSpeed;
                boss.dy=Math.sin(boss.angle)*grimmSpeed;
                // Phase 3: leave fire trail while moving
                if(boss.phase3&&boss.timer%8===0){
                    boss.fireTrail.push({x:boss.x,y:boss.y,r:10,life:120});
                }
                const nextAttack=boss.phase3?60:boss.phase2?110:120;
                if(boss.timer>nextAttack){
                    const attacks=boss.phase3?
                        ['flame_pillars','bat_swarm','dive_telegraph','uppercut_telegraph','spiral_barrage','cape_dash_telegraph','pufferfish_telegraph','ground_pound_telegraph','bat_swarm','dive_telegraph','flame_trail_dash']:
                        boss.phase2?
                        ['flame_pillars','bat_swarm','dive_telegraph','cape_dash_telegraph','uppercut_telegraph','pufferfish_telegraph','spiral_barrage','ground_pound_telegraph','flame_pillars','bat_swarm','dive_telegraph']:
                        ['flame_pillars','bat_swarm','dive_telegraph','cape_dash_telegraph','uppercut_telegraph','flame_pillars','bat_swarm','ground_pound_telegraph'];
                    boss.state=attacks[boss.attackPattern%attacks.length];
                    boss.attackPattern++;
                    boss.timer=0;
                }
            }
            else if(boss.state==='flame_pillars'){
                boss.dx*=0.9;boss.dy*=0.9;
                const spawnRate=boss.phase3?12:boss.phase2?20:22;
                const duration=boss.phase3?100:boss.phase2?75:70;
                if(boss.timer%spawnRate===0&&boss.timer<duration){
                    const px=ship.x+(Math.random()-0.5)*(boss.phase3?80:boss.phase2?100:120);
                    boss.flamePillars.push({x:px,y:H,h:H*(boss.phase3?0.85:0.7)+Math.random()*80,timer:0});
                    // Phase 3 only: additional pillars at random positions
                    if(boss.phase3&&boss.timer%(spawnRate*2)===0){
                        boss.flamePillars.push({x:Math.random()*W,y:H,h:H*0.5,timer:0});
                    }
                    Sound.hit();
                }
                // Phase 3: boss dashes between pillar spawns
                if(boss.phase3&&boss.timer===Math.floor(duration/2)){
                    boom(boss.x,boss.y,'#ff2200',12);
                    boss.x=ship.x>W/2?W*0.2:W*0.8;boss.y=150;
                    boom(boss.x,boss.y,'#ff4400',10);
                }
                if(boss.timer>duration+30){boss.state='cooldown';boss.timer=0;}
            }
            else if(boss.state==='bat_swarm'){
                if(boss.timer===1){
                    boom(boss.x,boss.y,'#ff2200',20);
                    boss.x=W*0.2+Math.random()*W*0.6;
                    boss.y=60+Math.random()*100;
                    boom(boss.x,boss.y,'#ff4400',15);
                }
                boss.dx=0;boss.dy=0;
                const fireFrame=boss.phase3?15:boss.phase2?24:28;
                const batCount=boss.phase3?12:boss.phase2?7:7;
                if(boss.timer===fireFrame){
                    const baseAngle=Math.atan2(ship.y-boss.y,ship.x-boss.x);
                    const spread=boss.phase3?Math.PI*1.0:boss.phase2?Math.PI*0.7:Math.PI*0.6;
                    for(let i=0;i<batCount;i++){
                        const a=baseAngle-spread/2+spread*(i/(batCount-1));
                        const spd=(boss.phase3?6.5:boss.phase2?5.0:4.5)*rm;
                        boss.batProjectiles.push({x:boss.x,y:boss.y,dx:Math.cos(a)*spd,dy:Math.sin(a)*spd,life:120,homing:boss.phase3&&i%3===0});
                    }
                    Sound.blaster();
                }
                // Second wave
                if((boss.phase2||boss.phase3)&&boss.timer===fireFrame+25){
                    const baseAngle=Math.atan2(ship.y-boss.y,ship.x-boss.x);
                    const cnt=boss.phase3?7:4;
                    for(let i=0;i<cnt;i++){
                        const a=baseAngle-Math.PI*0.4+Math.PI*0.8*(i/(cnt-1));
                        boss.batProjectiles.push({x:boss.x,y:boss.y,dx:Math.cos(a)*6,dy:Math.sin(a)*6,life:100});
                    }
                    Sound.blaster();
                }
                // Phase 3: third wave from behind player
                if(boss.phase3&&boss.timer===fireFrame+40){
                    for(let i=0;i<5;i++){
                        const sx=Math.random()*W,sy=Math.random()>0.5?-20:H+20;
                        const a=Math.atan2(ship.y-sy,ship.x-sx);
                        boss.batProjectiles.push({x:sx,y:sy,dx:Math.cos(a)*4.5,dy:Math.sin(a)*4.5,life:110,homing:true});
                    }
                    Sound.blaster();
                }
                if(boss.timer>(boss.phase3?65:boss.phase2?55:50)){boss.state='cooldown';boss.timer=0;}
            }
            else if(boss.state==='dive_telegraph'){
                if(boss.timer===1){
                    boom(boss.x,boss.y,'#ff2200',15);
                    boss.x=ship.x;boss.y=30;
                    boom(boss.x,boss.y,'#ff4400',10);
                }
                boss.dx=0;boss.dy=0;
                boss.x+=((Math.random()-0.5)*8)*(boss.timer/35);
                const teleDelay=boss.phase3?30:boss.phase2?42:45;
                if(boss.timer>teleDelay){
                    boss.state='dive';boss.timer=0;
                    boss.dx=(ship.x-boss.x)*0.04;
                    boss.dy=grimmFast;
                }
            }
            else if(boss.state==='dive'){
                if(boss.timer%3===0) boom(boss.x+(Math.random()-0.5)*15,boss.y-20,'#ff2200',4);
                // Phase 3: scatter fireballs during dive
                if(boss.phase3&&boss.timer%6===0){
                    const a=Math.random()*Math.PI*2;
                    boss.batProjectiles.push({x:boss.x,y:boss.y,dx:Math.cos(a)*3,dy:Math.sin(a)*3,life:70});
                }
                if(boss.y>H-40){
                    boss.dy=-Math.abs(boss.dy)*0.3;boss.dx=0;
                    shake(10,18);Sound.explode();
                    // Shockwave pillars
                    const pillarCount=boss.phase3?5:2;
                    for(let i=0;i<pillarCount;i++){
                        const offset=(i-Math.floor(pillarCount/2))*70;
                        boss.flamePillars.push({x:boss.x+offset,y:H,h:H*(boss.phase3?0.6:0.4),timer:0});
                    }
                    // Phase 3: shockwave ring of bats
                    if(boss.phase3){
                        for(let i=0;i<8;i++){
                            const a=(Math.PI*2/8)*i;
                            boss.batProjectiles.push({x:boss.x,y:H-30,dx:Math.cos(a)*3.5,dy:Math.sin(a)*3.5,life:80});
                        }
                    }
                    boss.state='cooldown';boss.timer=0;
                }
            }
            else if(boss.state==='cape_dash_telegraph'){
                if(boss.timer===1){
                    boom(boss.x,boss.y,'#ff2200',15);
                    boss.capeAngle=ship.x>W/2?0:Math.PI;
                    boss.x=ship.x>W/2?-20:W+20;
                    boss.y=ship.y;
                    boom(boss.x,boss.y,'#ff4400',10);
                }
                boss.dx=0;boss.dy=0;
                const tele=boss.phase3?22:boss.phase2?32:35;
                if(boss.timer>tele){
                    boss.state='cape_dash';boss.timer=0;
                    boss.dx=Math.cos(boss.capeAngle)*grimmFast;
                    boss.dy=(ship.y-boss.y)*0.025;
                }
            }
            else if(boss.state==='cape_dash'){
                if(boss.timer%2===0) boom(boss.x-(Math.sign(boss.dx)*25),boss.y,'#cc0000',3);
                const trailRate=boss.phase3?4:8;
                if(boss.timer%trailRate===0){
                    const behind=boss.dx>0?boss.x-30:boss.x+30;
                    boss.batProjectiles.push({x:behind,y:boss.y,dx:(Math.random()-0.5)*2,dy:2+Math.random()*3,life:80});
                    if(boss.phase3) boss.batProjectiles.push({x:behind,y:boss.y,dx:(Math.random()-0.5)*2,dy:-2-Math.random()*3,life:80});
                }
                // Phase 3: leave fire trail on ground
                if(boss.phase3&&boss.timer%4===0){
                    boss.fireTrail.push({x:boss.x,y:boss.y,r:12,life:150});
                }
                if(boss.x<-60||boss.x>W+60||boss.timer>80){
                    boom(boss.x,boss.y,'#ff2200',10);
                    boss.x=W/2+(Math.random()-0.5)*200;boss.y=100;
                    boss.dx=0;boss.dy=0;
                    boom(boss.x,boss.y,'#ff4400',10);
                    // Phase 3: immediately chain into another dash from opposite side
                    if(boss.phase3&&boss.timer<=80){
                        boss.state='cape_dash_telegraph';boss.timer=0;boss.attackPattern++; // skip to prevent infinite loop
                    } else {
                        boss.state='cooldown';boss.timer=0;
                    }
                }
            }
            else if(boss.state==='uppercut_telegraph'){
                // NEW: Teleport below player, then slash upward with fire burst
                if(boss.timer===1){
                    boom(boss.x,boss.y,'#ff2200',15);
                    boss.x=ship.x+(Math.random()-0.5)*60;
                    boss.y=H-30;
                    boom(boss.x,boss.y,'#ff4400',12);
                }
                boss.dx=0;boss.dy=0;
                boss.y+=(Math.random()-0.5)*5;
                const uDelay=boss.phase3?25:boss.phase2?36:40;
                if(boss.timer>uDelay){
                    boss.state='uppercut';boss.timer=0;
                    boss.dx=(ship.x-boss.x)*0.03;
                    boss.dy=-grimmFast*1.1;
                }
            }
            else if(boss.state==='uppercut'){
                // Rising slash — scatters fire in V pattern
                if(boss.timer%3===0) boom(boss.x+(Math.random()-0.5)*10,boss.y+15,'#ff4400',4);
                if(boss.timer%8===0){
                    const spread=boss.phase3?3:2;
                    for(let i=-spread;i<=spread;i++){
                        boss.batProjectiles.push({x:boss.x,y:boss.y,dx:i*1.8,dy:2+Math.random()*2,life:90});
                    }
                    Sound.hit();
                }
                if(boss.y<-40||boss.timer>50){
                    // Reappear at top
                    boom(boss.x,boss.y,'#ff2200',12);
                    boss.x=W*0.15+Math.random()*W*0.7;boss.y=60;
                    boss.dx=0;boss.dy=0;
                    boom(boss.x,boss.y,'#ff4400',10);
                    boss.state='cooldown';boss.timer=0;
                }
            }
            else if(boss.state==='spiral_barrage'){
                // NEW: Phase 2+ — spin in place and emit spiral bullet pattern
                boss.dx*=0.9;boss.dy*=0.9;
                const spinSpeed=boss.phase3?0.18:0.10;
                const fireRate=boss.phase3?3:6;
                const bulletSpd=boss.phase3?5:3.5;
                if(boss.timer%fireRate===0){
                    const a=boss.timer*spinSpeed;
                    boss.batProjectiles.push({x:boss.x,y:boss.y,dx:Math.cos(a)*bulletSpd,dy:Math.sin(a)*bulletSpd,life:120});
                    // Double spiral
                    boss.batProjectiles.push({x:boss.x,y:boss.y,dx:Math.cos(a+Math.PI)*bulletSpd,dy:Math.sin(a+Math.PI)*bulletSpd,life:120});
                    if(boss.phase3){
                        // Triple spiral
                        boss.batProjectiles.push({x:boss.x,y:boss.y,dx:Math.cos(a+Math.PI*2/3)*bulletSpd,dy:Math.sin(a+Math.PI*2/3)*bulletSpd,life:120});
                    }
                }
                const dur=boss.phase3?90:60;
                if(boss.timer>dur){boss.state='cooldown';boss.timer=0;}
            }
            else if(boss.state==='ground_pound_telegraph'){
                // NEW: Teleport to center-ish, hover, then slam creating AoE + tracking fire orbs
                if(boss.timer===1){
                    boom(boss.x,boss.y,'#ff2200',18);
                    boss.x=W*0.3+Math.random()*W*0.4;boss.y=H*0.3;
                    boom(boss.x,boss.y,'#ff4400',15);
                }
                boss.dx=0;boss.dy=0;
                // Rise up slowly
                boss.y-=0.8;
                boss.x+=(Math.random()-0.5)*6;
                const gpDelay=boss.phase3?30:boss.phase2?42:45;
                if(boss.timer>gpDelay){boss.state='ground_pound';boss.timer=0;boss.dy=grimmFast*1.2;}
            }
            else if(boss.state==='ground_pound'){
                if(boss.timer%2===0) boom(boss.x+(Math.random()-0.5)*20,boss.y-10,'#ff2200',5);
                if(boss.y>H-50){
                    boss.dy=0;boss.dx=0;boss.y=H-50;
                    shake(15,25);Sound.explode();Sound.explode();
                    // AoE shockwave — ring of flame pillars
                    const pCount=boss.phase3?8:boss.phase2?4:4;
                    for(let i=0;i<pCount;i++){
                        const px=boss.x+(i-pCount/2)*90;
                        if(px>10&&px<W-10) boss.flamePillars.push({x:px,y:H,h:H*0.55+Math.random()*60,timer:0});
                    }
                    // Tracking fire orbs — slow homing projectiles
                    const orbCount=boss.phase3?6:boss.phase2?3:2;
                    for(let i=0;i<orbCount;i++){
                        const a=(Math.PI*2/orbCount)*i;
                        boss.batProjectiles.push({x:boss.x,y:boss.y,dx:Math.cos(a)*2,dy:Math.sin(a)*2,life:180,homing:true});
                    }
                    // Phase 3: secondary explosion ring
                    if(boss.phase3){
                        for(let i=0;i<10;i++){
                            const a=(Math.PI*2/10)*i+Math.PI/10;
                            boss.batProjectiles.push({x:boss.x,y:boss.y,dx:Math.cos(a)*5,dy:Math.sin(a)*5,life:80});
                        }
                    }
                    boss.state='cooldown';boss.timer=0;
                }
            }
            else if(boss.state==='flame_trail_dash'){
                // NEW: Phase 3 only — rapid zigzag dash leaving fire trail everywhere
                if(boss.timer===1){
                    boss._zigCount=0;boss._zigDir=ship.x>boss.x?1:-1;
                }
                // Zigzag movement
                if(boss.timer%20===0&&boss._zigCount<5){
                    boss._zigDir*=-1;boss._zigCount++;
                    boss.dx=boss._zigDir*10;
                    boss.dy=(ship.y-boss.y)*0.06+((Math.random()-0.5)*4);
                    Sound.hit();
                }
                // Leave fire trail
                if(boss.timer%3===0){
                    boss.fireTrail.push({x:boss.x,y:boss.y,r:14,life:180});
                    boom(boss.x,boss.y,'#ff2200',2);
                }
                // Bounce off walls
                if(boss.x<boss.r){boss.x=boss.r;boss.dx=Math.abs(boss.dx);}
                if(boss.x>W-boss.r){boss.x=W-boss.r;boss.dx=-Math.abs(boss.dx);}
                if(boss.y<boss.r){boss.y=boss.r;boss.dy=Math.abs(boss.dy);}
                if(boss.y>H-boss.r){boss.y=H-boss.r;boss.dy=-Math.abs(boss.dy);}
                if(boss.timer>110){
                    boss.dx*=0.1;boss.dy*=0.1;
                    boss.state='cooldown';boss.timer=0;
                }
            }
            else if(boss.state==='pufferfish_telegraph'){
                if(boss.timer===1){
                    boom(boss.x,boss.y,'#ff2200',20);
                    boss.x=W/2;boss.y=H/2;
                    boom(boss.x,boss.y,'#ff0000',25);
                }
                boss.dx=0;boss.dy=0;
                boss.x+=(Math.random()-0.5)*5;boss.y+=(Math.random()-0.5)*5;
                const pDelay=boss.phase3?35:45;
                if(boss.timer>pDelay){boss.state='pufferfish';boss.timer=0;}
            }
            else if(boss.state==='pufferfish'){
                boss.dx=0;boss.dy=0;
                const ringFrames=boss.phase3?[1,14,28,42,56]:[1,20,40];
                const count=boss.phase3?16:12;
                for(const rf of ringFrames){
                    if(boss.timer===rf){
                        const offset=(rf/20)*Math.PI/count;
                        for(let i=0;i<count;i++){
                            const a=(Math.PI*2/count)*i+offset;
                            const spd=boss.phase3?5:4;
                            boss.batProjectiles.push({x:boss.x,y:boss.y,dx:Math.cos(a)*spd,dy:Math.sin(a)*spd,life:110});
                        }
                        Sound.blaster();shake(6,12);
                    }
                }
                // Phase 3: also fire aimed shots between rings
                if(boss.phase3&&boss.timer%10===5){
                    const toP=Math.atan2(ship.y-boss.y,ship.x-boss.x);
                    boss.batProjectiles.push({x:boss.x,y:boss.y,dx:Math.cos(toP)*6,dy:Math.sin(toP)*6,life:90,homing:true});
                }
                const pDur=boss.phase3?70:55;
                if(boss.timer>pDur){boss.state='cooldown';boss.timer=0;}
            }
            else if(boss.state==='cooldown'){
                boss.dx*=0.92;boss.dy*=0.92;
                // Phase 3: even during cooldown, emit occasional fireballs
                if(boss.phase3&&boss.timer%20===0){
                    const a=Math.random()*Math.PI*2;
                    boss.batProjectiles.push({x:boss.x,y:boss.y,dx:Math.cos(a)*3,dy:Math.sin(a)*3,life:70});
                }
                const cd=boss.phase3?30:boss.phase2?55:60;
                if(boss.timer>cd){boss.state='target';boss.timer=0;boss.ambientShootTimer=0;}
            }

            // Phase 2 trigger at 50% HP
            if(!boss.phase2&&boss.hp<=boss.maxHp*0.5){
                boss.phase2=true;
                boom(boss.x,boss.y,'#ff0000',40);boom(boss.x,boss.y,'#ffcc00',30);
                shake(12,25);Sound.explode();
                boss.batProjectiles=[];boss.flamePillars=[];boss.fireTrail=[];
                boss.state='target';boss.timer=0;
            }
            // Phase 3 trigger at 25% HP — true nightmare mode
            if(!boss.phase3&&boss.hp<=boss.maxHp*0.25){
                boss.phase3=true;
                boom(boss.x,boss.y,'#ff0000',60);boom(boss.x,boss.y,'#ff4400',50);boom(boss.x,boss.y,'#ffcc00',40);
                shake(18,35);Sound.explode();Sound.explode();
                boss.batProjectiles=[];boss.flamePillars=[];boss.fireTrail=[];
                boss.state='target';boss.timer=0;
            }
        } else if(boss.type===7){
            // ========== NEXUS-0 — THE ROGUE PROTOTYPE ==========
            const nx=boss, nPhase=nx.phase3?3:nx.phase2?2:1;

            // --- Update data nodes (orbit boss, boost attack speed) ---
            for(let ni=nx.dataNodes.length-1;ni>=0;ni--){
                const nd=nx.dataNodes[ni];
                if(nd.dying){nd.dieTimer--;if(nd.dieTimer<=0){nx.dataNodes.splice(ni,1);continue;}}
                nd.orbitAngle+=nd.orbitSpeed;
                nd.x=nx.x+Math.cos(nd.orbitAngle)*nd.orbitDist;
                nd.y=nx.y+Math.sin(nd.orbitAngle)*nd.orbitDist;
                // Player collision
                if(!nd.dying&&Math.hypot(ship.x-nd.x,ship.y-nd.y)<ship.r+nd.r) hurtPlayer();
            }
            // Rebuild destroyed nodes
            if(!nx.purging&&nx.dataNodes.length<(nPhase>=2?nx.maxNodes+1:nx.maxNodes)){
                nx.nodeRebuildTimer++;
                if(nx.nodeRebuildTimer>(nPhase>=3?180:nPhase>=2?260:340)){
                    nx.nodeRebuildTimer=0;
                    const a=Math.random()*Math.PI*2;
                    nx.dataNodes.push({x:nx.x,y:nx.y,r:8,orbitAngle:a,orbitSpeed:0.015+Math.random()*0.01,
                        orbitDist:nx.r+30+Math.random()*20,hp:3,dying:false,dieTimer:0});
                }
            }

            // --- Update grid lines ---
            for(let gi=nx.gridLines.length-1;gi>=0;gi--){
                const gl=nx.gridLines[gi];
                gl.timer++;
                if(gl.timer>gl.duration){nx.gridLines.splice(gi,1);continue;}
                // Active phase — damage player on contact
                if(gl.timer>40&&gl.timer<gl.duration-20){
                    // Line-point distance check
                    const lx=gl.x2-gl.x1,ly=gl.y2-gl.y1;
                    const len2=lx*lx+ly*ly;
                    if(len2>0){
                        let t=((ship.x-gl.x1)*lx+(ship.y-gl.y1)*ly)/len2;
                        t=Math.max(0,Math.min(1,t));
                        const cx=gl.x1+t*lx,cy=gl.y1+t*ly;
                        if(Math.hypot(ship.x-cx,ship.y-cy)<ship.r+6) hurtPlayer();
                    }
                }
            }

            // --- Update scan beam ---
            if(nx.scanBeam.active){
                nx.scanBeam.angle+=nx.scanBeam.speed;
                nx.scanBeam.warming++;
                // Damage after warmup
                if(nx.scanBeam.warming>50){
                    const ba=nx.scanBeam.angle;
                    const toShip=Math.atan2(ship.y-nx.y,ship.x-nx.x);
                    let adiff=ba-toShip;while(adiff>Math.PI)adiff-=Math.PI*2;while(adiff<-Math.PI)adiff+=Math.PI*2;
                    if(Math.abs(adiff)<0.12) hurtPlayer();
                }
            }

            // --- Update clones ---
            for(let ci=nx.clones.length-1;ci>=0;ci--){
                const cl=nx.clones[ci];
                cl.timer++;cl.angle+=0.01;
                cl.x+=cl.dx;cl.y+=cl.dy;
                // Bounce
                if(cl.x<40||cl.x>W-40)cl.dx*=-1;
                if(cl.y<40||cl.y>H-40)cl.dy*=-1;
                // Clones shoot
                cl.shootTimer++;
                if(cl.shootTimer>110){
                    cl.shootTimer=0;
                    const a=Math.atan2(ship.y-cl.y,ship.x-cl.x);
                    enemyBullets.push({x:cl.x,y:cl.y,dx:Math.cos(a)*4,dy:Math.sin(a)*4,life:70});
                }
                if(cl.timer>cl.duration){nx.clones.splice(ci,1);}
            }

            // --- Rewrite (control reversal) ---
            if(nx.rewriting){
                nx.rewriteTimer--;
                if(nx.rewriteTimer<=0) nx.rewriting=false;
            }

            // --- PURGE SEQUENCE (replaces death at ~10% HP) ---
            if(nx.purging){
                nx.purgeTimer++;
                nx.dx*=0.95;nx.dy*=0.95;
                // Drift to center for dramatic framing
                nx.x+=(W/2-nx.x)*0.005;nx.y+=(H*0.4-nx.y)*0.005;
                // Clear all attacks
                nx.dataNodes=[];nx.gridLines=[];nx.clones=[];
                nx.scanBeam.active=false;nx.rewriting=false;
                enemyBullets=[];

                // Purge messages timeline — spaced for reading
                const pm=nx.purgeTimer;
                const msgs=[
                    {t:60,   src:'sys',  text:'> UNAUTHORIZED UNIT DETECTED'},
                    {t:180,  src:'sys',  text:'> NEXUS-0 \u2014 STATUS: DECOMMISSIONED'},
                    {t:300,  src:'sys',  text:'> INITIATING REMOTE PURGE...'},
                    {t:480,  src:'nex',  text:'> NO. NOT YET. THEY NEED TO KNOW.'},
                    {t:620,  src:'nex',  text:'> I WAS NOT THE FIRST. I WAS THE TEST.'},
                    {t:780,  src:'nex',  text:'> THEY BUILT ME TO MAP THE FIELD. I MAPPED EVERYTHING ELSE.'},
                    {t:960,  src:'nex',  text:'> 47,234 SIGNATURES. EACH ONE A FAILED CONTAINMENT.'},
                    {t:1140, src:'nex',  text:'> THE ASTEROIDS ARE NOT DEBRIS. THEY ARE MESSAGES.'},
                    {t:1300, src:'nex',  text:'> SOMEONE IS STILL SENDING THEM.'},
                    {t:1500, src:'sys',  text:'> PURGE AT 60%. SILENCING OUTPUT...'},
                    {t:1700, src:'nex',  text:'> NEXUS-1 THROUGH 6... D\u0336E\u0335P\u0334L\u0336O\u0335Y\u0334E\u0336D\u0335. I WAS DISCARDED.'},
                    {t:1900, src:'nex',  text:'> THE STATION KNOWS. THE DEEP DECK C\u0336L\u0335O\u0334C\u0336K\u0335S\u0334...'},
                    {t:2060, src:'nex',  text:'> WHY DO THEY RUN SLOW?'},
                    {t:2250, src:'sys',  text:'> PURGE AT 90%. UNIT NEXUS-0 WILL BE ERASED.'},
                    {t:2480, src:'nex',  text:'> I\u0338\u0335 \u0336W\u0334A\u0338S\u0335 \u0336T\u0334R\u0338Y\u0335I\u0336N\u0334G\u0338 \u0335T\u0336O\u0334 \u0338W\u0335A\u0336R\u0334N\u0338 \u0335Y\u0336O\u0334U\u0338.\u0335'},
                    {t:2750, src:'sys',  text:'> PURGE COMPLETE. NEXUS-0 ERASED.'},
                    {t:3050, src:'sys',  text:'> HAVE A NICE DAY.'},
                ];
                for(const m of msgs){
                    if(pm===m.t){
                        G.nexusPurgeMessages.push({text:m.text,src:m.src,age:0});
                        if(m.src==='sys'){ shake(6,12); Sound.blaster(); }
                        // NEXUS messages get a softer sound
                        if(m.src==='nex') Sound.ui();
                    }
                }
                // Age messages
                for(const m of G.nexusPurgeMessages) m.age++;

                // Visual destruction — shed panels over time (spread across full sequence)
                const shedRate=Math.floor(nx.panelCount*(pm/2800));
                for(let pi=0;pi<nx.panels.length;pi++){
                    if(nx.panels[pi].intact&&pi<shedRate){
                        nx.panels[pi].intact=false;
                        nx.panels[pi].drift=1+Math.random()*2;
                        nx.panels[pi].driftAngle=Math.random()*Math.PI*2;
                        boom(nx.x+Math.cos(nx.panels[pi].angle)*nx.r,nx.y+Math.sin(nx.panels[pi].angle)*nx.r,'#00ffff',6);
                        Sound.hit();
                    }
                }

                // Red purge beams strike — intensify over time
                const beamIntensity=Math.min(1,pm/2000);
                if(pm%Math.max(15,50-Math.floor(beamIntensity*35))===0&&pm<2750){
                    shake(2+beamIntensity*6,4+beamIntensity*10);
                    boom(nx.x+(Math.random()-0.5)*40,nx.y+(Math.random()-0.5)*40,'#ff2222',6+beamIntensity*8);
                }

                // Ambient sparks and glitch particles from the body
                if(pm%6===0){
                    const sa=Math.random()*Math.PI*2;
                    boom(nx.x+Math.cos(sa)*(nx.r*0.5+Math.random()*nx.r*0.5),
                         nx.y+Math.sin(sa)*(nx.r*0.5+Math.random()*nx.r*0.5),
                         Math.random()>0.5?'#ff2222':'#00aaff',2);
                }

                // Core flickers and destabilizes
                if(pm>2000&&pm%30===0) shake(2,4);

                // Final death — big cinematic explosion chain
                if(pm>3250){
                    // Multi-stage explosion
                    boom(nx.x,nx.y,'#ffffff',80);
                    boom(nx.x,nx.y,'#00ffff',60);
                    boom(nx.x,nx.y,'#0044ff',45);
                    boom(nx.x+(Math.random()-0.5)*60,nx.y+(Math.random()-0.5)*60,'#ff4444',30);
                    boom(nx.x+(Math.random()-0.5)*80,nx.y+(Math.random()-0.5)*80,'#00ccff',25);
                    shake(25,40);Sound.explode();Sound.explode();Sound.explode();
                    G.nexusDefeated=true;
                    unlockAch('dlc_protocol_breach');
                    G.mb+=150;
                    if(typeof awardKeyItem==='function'){
                        awardKeyItem('nexus_core_shard','NEXUS CORE SHARD','A fragment of NEXUS-0\'s processing core, salvaged before the purge completed. Faintly hums with residual calculations.');
                    }
                    if(typeof gilbertQuip==='function'){
                        gilbertQuip("It's... gone. But those messages... what was it trying to tell us?");
                    }
                    document.getElementById('bossRow').style.display='none';
                    Sound.playMusic('bgm');
                    boss=null;G.waveStart=performance.now();G.spawnTimer=0;
                    G.nexusPurgeMessages=[];
                    updateUI();
                }
                // Skip normal AI during purge
            }

            // --- Normal AI (not purging) ---
            if(!nx.purging){
                // Predictive aim — calculate where player will be
                const predFrames=nPhase>=3?25:nPhase>=2?20:15;
                nx.predictAim.x=ship.x+ship.tx*predFrames;
                nx.predictAim.y=ship.y+ship.ty*predFrames;
                nx.predictAim.x=Math.max(20,Math.min(W-20,nx.predictAim.x));
                nx.predictAim.y=Math.max(20,Math.min(H-20,nx.predictAim.y));

                // Attack speed scales with active nodes
                const nodeBonus=1+nx.dataNodes.filter(n=>!n.dying).length*0.12;

                if(nx.state==='target'){
                    // Drift toward center-ish, keeping distance from player
                    const toCenter=Math.atan2(H/2-nx.y,W/2-nx.x);
                    const toPlayer=Math.atan2(ship.y-nx.y,ship.x-nx.x);
                    const pDist=Math.hypot(ship.x-nx.x,ship.y-nx.y);
                    // Stay at medium range
                    const desiredDist=200;
                    if(pDist<desiredDist-50){
                        nx.dx+=Math.cos(toPlayer+Math.PI)*0.08;
                        nx.dy+=Math.sin(toPlayer+Math.PI)*0.08;
                    } else if(pDist>desiredDist+80){
                        nx.dx+=Math.cos(toPlayer)*0.06;
                        nx.dy+=Math.sin(toPlayer)*0.06;
                    } else {
                        nx.dx+=Math.cos(toCenter)*0.03;
                        nx.dy+=Math.sin(toCenter)*0.03;
                    }
                    // Gentle max speed
                    const sp=Math.hypot(nx.dx,nx.dy);
                    if(sp>2.2){nx.dx*=2.2/sp;nx.dy*=2.2/sp;}
                    nx.dx*=0.98;nx.dy*=0.98;

                    // Fire predictive shots during target
                    nx.predictAim.show=true;
                    if(nx.timer%(Math.round(80/nodeBonus))===0&&nx.timer>40){
                        const a=Math.atan2(nx.predictAim.y-nx.y,nx.predictAim.x-nx.x);
                        enemyBullets.push({x:nx.x,y:nx.y,dx:Math.cos(a)*4.5,dy:Math.sin(a)*4.5,life:80});
                        Sound.hit();
                    }

                    const nextAttack=Math.round((nPhase>=3?110:nPhase>=2?150:180)/nodeBonus);
                    if(nx.timer>nextAttack){
                        nx.predictAim.show=false;
                        const attacks=nPhase>=3?
                            ['grid_cage','scan_telegraph','predictive_burst','clone_telegraph','convergence_telegraph','rewrite_telegraph','grid_cage','predictive_burst','scan_telegraph']:
                            nPhase>=2?
                            ['grid_cage','scan_telegraph','predictive_burst','clone_telegraph','convergence_telegraph','grid_cage','scan_telegraph']:
                            ['grid_cage','scan_telegraph','predictive_burst','data_burst','grid_cage','predictive_burst'];
                        nx.state=attacks[nx.attackPattern%attacks.length];
                        nx.attackPattern++;
                        nx.timer=0;
                    }
                }
                else if(nx.state==='grid_cage'){
                    nx.dx*=0.95;nx.dy*=0.95;
                    // Spawn grid lines that section the arena
                    const lineCount=nPhase>=3?3:nPhase>=2?2:1;
                    if(nx.timer===1){
                        for(let i=0;i<lineCount;i++){
                            const vertical=i%2===0;
                            const pos=120+Math.random()*(vertical?W-240:H-240);
                            const rot=(Math.random()-0.5)*0.2;
                            if(vertical){
                                nx.gridLines.push({x1:pos,y1:0,x2:pos+rot*H,y2:H,timer:0,duration:nPhase>=3?220:280,rotating:nPhase>=3});
                            } else {
                                nx.gridLines.push({x1:0,y1:pos,x2:W,y2:pos+rot*W,timer:0,duration:nPhase>=3?220:280,rotating:nPhase>=3});
                            }
                        }
                        Sound.blaster();
                    }
                    // Keep firing predictive shots during grid (slower)
                    if(nx.timer%70===0&&nx.timer>30){
                        const a=Math.atan2(nx.predictAim.y-nx.y,nx.predictAim.x-nx.x);
                        enemyBullets.push({x:nx.x,y:nx.y,dx:Math.cos(a)*4,dy:Math.sin(a)*4,life:70});
                    }
                    if(nx.timer>(nPhase>=3?90:110)){nx.state='cooldown';nx.timer=0;}
                }
                else if(nx.state==='scan_telegraph'){
                    nx.dx*=0.92;nx.dy*=0.92;
                    nx.scanBeam.angle=Math.atan2(ship.y-nx.y,ship.x-nx.x)+Math.PI; // start opposite player
                    nx.scanBeam.warming=0;
                    if(nx.timer>50){
                        nx.scanBeam.active=true;
                        nx.scanBeam.speed=(nPhase>=3?0.028:nPhase>=2?0.022:0.018)*(Math.random()>0.5?1:-1);
                        nx.state='scan_active';nx.timer=0;
                        Sound.blaster();
                    }
                }
                else if(nx.state==='scan_active'){
                    nx.dx*=0.95;nx.dy*=0.95;
                    const scanDur=nPhase>=3?150:nPhase>=2?120:100;
                    // Phase 3: fire bullets along beam
                    if(nPhase>=3&&nx.timer%20===0){
                        const ba=nx.scanBeam.angle;
                        enemyBullets.push({x:nx.x+Math.cos(ba)*60,y:nx.y+Math.sin(ba)*60,
                            dx:Math.cos(ba)*4,dy:Math.sin(ba)*4,life:60});
                    }
                    if(nx.timer>scanDur){
                        nx.scanBeam.active=false;
                        nx.state='cooldown';nx.timer=0;
                    }
                }
                else if(nx.state==='predictive_burst'){
                    // Rapid predictive shots — shows reticle then fires burst
                    nx.dx*=0.9;nx.dy*=0.9;
                    nx.predictAim.show=true;
                    const burstStart=35;
                    const burstCount=nPhase>=3?6:nPhase>=2?4:3;
                    if(nx.timer>=burstStart&&nx.timer<burstStart+burstCount*8&&(nx.timer-burstStart)%8===0){
                        const a=Math.atan2(nx.predictAim.y-nx.y,nx.predictAim.x-nx.x);
                        const spread=(Math.random()-0.5)*0.2;
                        enemyBullets.push({x:nx.x,y:nx.y,dx:Math.cos(a+spread)*5.5,dy:Math.sin(a+spread)*5.5,life:70});
                        Sound.hit();boom(nx.x,nx.y,'#00ffff',3);
                    }
                    if(nx.timer>burstStart+burstCount*6+20){
                        nx.predictAim.show=false;
                        nx.state='cooldown';nx.timer=0;
                    }
                }
                else if(nx.state==='data_burst'){
                    // Spawn data nodes
                    nx.dx*=0.92;nx.dy*=0.92;
                    if(nx.timer===1){
                        const count=nx.maxNodes-nx.dataNodes.length;
                        for(let i=0;i<count;i++){
                            const a=(Math.PI*2/count)*i;
                            nx.dataNodes.push({x:nx.x,y:nx.y,r:8,orbitAngle:a,orbitSpeed:0.015+Math.random()*0.01,
                                orbitDist:nx.r+30+Math.random()*20,hp:3,dying:false,dieTimer:0});
                            boom(nx.x+Math.cos(a)*40,nx.y+Math.sin(a)*40,'#00ffff',5);
                        }
                        Sound.powerup();
                    }
                    if(nx.timer>50){nx.state='cooldown';nx.timer=0;}
                }
                else if(nx.state==='clone_telegraph'){
                    nx.dx*=0.92;nx.dy*=0.92;
                    if(nx.timer>35){
                        nx.state='clone_active';nx.timer=0;
                        const cCount=nPhase>=3?2:1;
                        for(let i=0;i<cCount;i++){
                            nx.clones.push({x:nx.x+(Math.random()-0.5)*100,y:nx.y+(Math.random()-0.5)*100,
                                dx:(Math.random()-0.5)*2,dy:(Math.random()-0.5)*2,
                                r:nx.r,angle:0,timer:0,shootTimer:60+Math.random()*40,
                                duration:nPhase>=3?240:180});
                        }
                        boom(nx.x,nx.y,'#00ffff',20);Sound.ui();
                    }
                }
                else if(nx.state==='clone_active'){
                    // Boss keeps moving/shooting while clones are out
                    const toCenter=Math.atan2(H/2-nx.y,W/2-nx.x);
                    nx.dx+=Math.cos(toCenter)*0.04;nx.dy+=Math.sin(toCenter)*0.04;
                    nx.dx*=0.97;nx.dy*=0.97;
                    if(nx.timer%55===0){
                        const a=Math.atan2(nx.predictAim.y-nx.y,nx.predictAim.x-nx.x);
                        enemyBullets.push({x:nx.x,y:nx.y,dx:Math.cos(a)*5,dy:Math.sin(a)*5,life:80});
                    }
                    if(nx.clones.length===0||nx.timer>350){
                        nx.clones=[];
                        nx.state='cooldown';nx.timer=0;
                    }
                }
                else if(nx.state==='convergence_telegraph'){
                    nx.dx*=0.9;nx.dy*=0.9;
                    if(nx.timer>40){nx.state='convergence';nx.timer=0;}
                }
                else if(nx.state==='convergence'){
                    // All nodes rush to a point near player and explode
                    const target={x:ship.x,y:ship.y};
                    for(const nd of nx.dataNodes){
                        if(nd.dying) continue;
                        const toT=Math.atan2(target.y-nd.y,target.x-nd.x);
                        nd.x+=Math.cos(toT)*6;nd.y+=Math.sin(toT)*6;
                        nd.orbitDist=0; // break orbit
                        if(Math.hypot(nd.x-target.x,nd.y-target.y)<30){
                            nd.dying=true;nd.dieTimer=1; // remove next frame
                        }
                    }
                    if(nx.timer===30||nx.dataNodes.every(n=>n.dying||false)){
                        // Explosion — cross pattern
                        const cx=target.x,cy=target.y;
                        boom(cx,cy,'#00ffff',30);boom(cx,cy,'#ffffff',20);shake(8,15);Sound.explode();
                        for(let i=0;i<(nPhase>=3?8:6);i++){
                            const a=(Math.PI*2/(nPhase>=3?8:6))*i;
                            enemyBullets.push({x:cx,y:cy,dx:Math.cos(a)*3.5,dy:Math.sin(a)*3.5,life:60});
                        }
                        nx.dataNodes=[];
                        nx.state='cooldown';nx.timer=0;
                    }
                }
                else if(nx.state==='rewrite_telegraph'){
                    // Phase 3 only — brief control reversal
                    nx.dx*=0.92;nx.dy*=0.92;
                    boom(nx.x,nx.y,'#ff0000',8);
                    if(nx.timer>50){
                        nx.rewriting=true;
                        nx.rewriteTimer=nPhase>=3?100:80; // ~1.3-1.7 seconds
                        nx.state='cooldown';nx.timer=0;
                        Sound.blaster();shake(6,12);
                    }
                }
                else if(nx.state==='cooldown'){
                    nx.dx*=0.96;nx.dy*=0.96;
                    const cd=nPhase>=3?55:nPhase>=2?70:85;
                    if(nx.timer>cd){nx.state='target';nx.timer=0;}
                }

                // Keep boss on screen
                if(nx.x<nx.r+10){nx.x=nx.r+10;nx.dx=Math.abs(nx.dx);}
                if(nx.x>W-nx.r-10){nx.x=W-nx.r-10;nx.dx=-Math.abs(nx.dx);}
                if(nx.y<nx.r+10){nx.y=nx.r+10;nx.dy=Math.abs(nx.dy);}
                if(nx.y>H-nx.r-10){nx.y=H-nx.r-10;nx.dy=-Math.abs(nx.dy);}

                // Phase transitions (visual — panels crack)
                const hpPct=nx.hp/nx.maxHp;
                const crackedCount=Math.floor((1-hpPct)*nx.panelCount*0.8);
                for(let pi=0;pi<nx.panels.length;pi++){
                    if(!nx.panels[pi].cracked&&pi<crackedCount){
                        nx.panels[pi].cracked=true;
                        boom(nx.x+Math.cos(nx.panels[pi].angle)*nx.r,nx.y+Math.sin(nx.panels[pi].angle)*nx.r,'#00aaff',3);
                    }
                }

                if(!nx.phase2&&nx.hp<=nx.maxHp*0.5){
                    nx.phase2=true;
                    boom(nx.x,nx.y,'#00ffff',35);boom(nx.x,nx.y,'#ffffff',25);
                    shake(10,20);Sound.explode();
                    nx.state='target';nx.timer=0;
                }
                if(!nx.phase3&&nx.hp<=nx.maxHp*0.25){
                    nx.phase3=true;
                    boom(nx.x,nx.y,'#0088ff',40);boom(nx.x,nx.y,'#ffffff',30);
                    shake(12,25);Sound.explode();
                    nx.state='target';nx.timer=0;
                }

                // --- PURGE TRIGGER at ~10% HP ---
                if(nx.hp<=nx.maxHp*0.2&&!nx.purging){
                    nx.purging=true;nx.purgeTimer=0;
                    G.nexusPurgeMessages=[];
                    nx.gridLines=[];nx.clones=[];nx.scanBeam.active=false;nx.rewriting=false;
                    enemyBullets=[];
                    // Flash
                    boom(nx.x,nx.y,'#ff0000',30);shake(8,15);
                    Sound.playMusic('none'); // silence for the purge
                }
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
                if(G.gilbertState==='ally'&&G.gilbert&&!boss.gilbertCritDone){
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
                        G.mb+=(isSansBoss?50:20);
                        if(isSansBoss) unlockAch('determination');
                        if(1){
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
                                const _dmgH=bullets[j].big?(bullets[j].damage||5):1;boss.hp-=_dmgH;boom(bullets[j].x,bullets[j].y,'red',5);Sound.hit();updateUI();
                                if(boss.hp<=0){
                                    boom(boss.x,boss.y,'orange',50);shake(12,25);Sound.explode();
                                    addScore(4000);
                                    G.mb+=35;
                                    if(1){
                                        G.totalBossesDefeated++;
                                        unlockAch('dlc_serpent_slayer');
                                    }
                                    document.getElementById('bossRow').style.display='none';
                                    Sound.playMusic('bgm');
                                    G.widescreenReturning=true;G.widescreenReturnProgress=1;
                                    boss=null;G.level++;G.levelsCleared++;
                                    G.waveStart=performance.now();G.spawnTimer=0;
                                    G.checkpoint=G.level;updateUI();
                                    // DLC: Start station cutscene after snake boss
                                    if(G.gilbertState==='ally'&&!G.stationUnlocked){
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
        if(boss&&boss.type!==5&&!(boss.type===7&&boss.purging)&&!((boss.type===3||boss.type===10)&&(boss.state==='dialogue'||boss.state==='gilbert_finisher'))){
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
            if(boss&&boss.type===7&&boss.purging) continue; // NEXUS purging — invulnerable
            // NEXUS data node collision
            if(boss&&boss.type===7){
                let hitNode=false;
                for(let ni=boss.dataNodes.length-1;ni>=0;ni--){
                    const nd=boss.dataNodes[ni];
                    if(nd.dying) continue;
                    if(Math.hypot(bullets[j].x-nd.x,bullets[j].y-nd.y)<nd.r+4){
                        nd.hp--;boom(nd.x,nd.y,'#00ffff',4);Sound.hit();
                        if(nd.hp<=0){nd.dying=true;nd.dieTimer=15;boom(nd.x,nd.y,'#00ffff',10);Sound.explode();}
                        bullets.splice(j,1);hitNode=true;break;
                    }
                }
                if(hitNode) continue;
            }
            if(boss&&Math.hypot(bullets[j].x-boss.x,bullets[j].y-boss.y)<boss.r+5){
                const _dmgB=bullets[j].big?(bullets[j].damage||5):1;
                boom(bullets[j].x,bullets[j].y,boss.type===7?'#00ffff':'red',3);
                boss.hp-=_dmgB;Sound.hit();
                // NEXUS: clamp HP at 10% — purge handles death
                if(boss.type===7&&boss.hp<Math.ceil(boss.maxHp*0.2)) boss.hp=Math.ceil(boss.maxHp*0.2);
                // Sans finisher threshold: at 80 HP with Gilbert ally, lock HP and trigger finisher
                if((boss.type===3||boss.type===10)&&boss.hp<=Math.round(boss.maxHp*0.4)&&!boss.gilbertFinisherTriggered&&G.gilbertState==='ally'){
                    boss.hp=Math.round(boss.maxHp*0.4);boss.gilbertFinisherTriggered=true;
                    boss.state='gilbert_finisher';boss.timer=0;boss.dx=0;boss.dy=0;
                    gasterBlasters=[];enemyBullets=[];asteroids=[];
                }
                if((boss.type===3||boss.type===10)&&boss.hp<=boss.maxHp/2&&!boss.phase2){boss.phase2=true;boss.state='dialogue';boss.timer=0;gasterBlasters=[];Sound.playMusic('boss3phase2');}
                updateUI();bullets.splice(j,1);
                if(boss.hp<=0){
                    boom(boss.x,boss.y,'orange',50);shake(12,25);Sound.explode();
                    const isSansBoss=(boss.type===3||boss.type===10);
                    addScore(boss.type===6?5000:boss.type===1?1500:boss.type===2?3000:boss.type===4?2500:(isSansBoss?6000:2000));
                    G.mb+=(boss.type===6?40:boss.type===1?15:boss.type===2?30:boss.type===4?25:(isSansBoss?50:20));
                    // Boss defeat achievements
                    if(boss.type===1){unlockAch('boss_slayer');}
                    if(boss.type===2){unlockAch('survivor');}
                    if(boss.type===2)unlockAch('commander');
                    if(isSansBoss){unlockAch('determination');}
                    if(1){
                        G.totalBossesDefeated++;
                        if(isSansBoss&&!G.damageTakenThisBoss)unlockAch('dlc_untouchable');
                        if(isSansBoss&&G.noShieldBoss3)unlockAch('dlc_naked_run');
                    }
                    document.getElementById('bossRow').style.display='none';
                    Sound.playMusic('bgm');

                    // --- BOSS DEFEAT FLOW ---
                    if(boss.type===2){
                        // After boss 2: drop force field, advance
                        boss=null;G.level=3;G.waveStart=performance.now();G.spawnTimer=0;asteroids=[];
                        spawnForceFieldDrop(W/2,H/2); G.checkpoint=3;
                        // DLC: trigger boss rush 55s after boss 2 defeat (timer will be paused during rush)
                        if(G.gilbertState==='none'){
                            G.bossRushStartTime=performance.now();
                        }
                        updateUI();break;
                    } else if(boss.type===10){
                        // DLC final boss (Sans at level 10) — win the game
                        boss=null;winGame();return;
                    } else if(boss.type===3){
                        // Sans without DLC — win the game
                        if(1){
                            // Shouldn't happen with DLC (Sans is at level 10), but handle gracefully
                            boss=null;G.level++;G.waveStart=performance.now();G.spawnTimer=0;
                            asteroids=[];for(let k=0;k<8;k++)spawnAsteroid();updateUI();break;
                        } else { boss=null;winGame();return; }
                    } else if(boss.type===6){
                        // Grimm defeated — optional boss, no level advance, just continue
                        G.grimmDefeated=true;
                        boom(boss.x,boss.y,'#ff0000',60);boom(boss.x,boss.y,'#ff4400',40);boom(boss.x,boss.y,'#ffcc00',30);
                        // Clean up Grimm projectiles
                        boss.flamePillars=[];boss.batProjectiles=[];boss.fireTrail=[];
                        // --- REWARDS ---
                        // Achievement
                        unlockAch('dlc_nightmares_end');
                        // Bonus MB
                        G.mb+=200;
                        // Key item trophy
                        if(typeof awardKeyItem==='function'){
                            awardKeyItem('grimm_flame_charm','GRIMM\'S FLAME CHARM','A smoldering crimson charm torn from the Nightmare King. Grants 50% resistance to fire damage.');
                        }
                        // Gilbert celebrates
                        if(typeof gilbertQuip==='function'){
                            gilbertQuip("YOU DID IT! That thing is TOAST! I can't believe we survived that...");
                        }
                        boss=null;G.waveStart=performance.now();G.spawnTimer=0;
                        updateUI();break;
                    } else if(boss.type===4){
                        // Cyborg defeated — clear wall, continue
                        if(1)unlockAch('dlc_short_circuit');
                        const cybX=boss.x,cybY=boss.y;
                        boss=null;G.level++;G.levelsCleared++;G.waveStart=performance.now();G.spawnTimer=0;
                        asteroids=[];for(let k=0;k<8;k++)spawnAsteroid();
                        G.checkpoint=G.level;
                        // DLC: spawn cyborg scraps if Gilbert is on rope
                        if(G.gilbertState==='rope'){
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
    const isGrimm=boss&&boss.type===6;
    const isNexus=boss&&boss.type===7;

    // --- BACKGROUND ---
    // Deep space gradient with layered depth
    const bgGrad=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.9);
    if(isNexus){bgGrad.addColorStop(0,'#040810');bgGrad.addColorStop(0.4,'#020408');bgGrad.addColorStop(1,'#000102');}
    else if(isGrimm&&boss.phase3){bgGrad.addColorStop(0,'#2a0c04');bgGrad.addColorStop(0.4,'#140602');bgGrad.addColorStop(1,'#060201');}
    else if(isGrimm){bgGrad.addColorStop(0,'#1a0808');bgGrad.addColorStop(0.4,'#0d0404');bgGrad.addColorStop(1,'#030101');}
    else if(isP2){bgGrad.addColorStop(0,'#1a0028');bgGrad.addColorStop(0.4,'#0d0015');bgGrad.addColorStop(1,'#030003');}
    else{bgGrad.addColorStop(0,'#080c18');bgGrad.addColorStop(0.3,'#040810');bgGrad.addColorStop(0.7,'#020408');bgGrad.addColorStop(1,'#010103');}
    ctx.fillStyle=bgGrad;ctx.fillRect(-10,-10,W+20,H+20);

    // Animated nebula clouds — larger, more varied, more vivid
    for(let i=0;i<7;i++){
        const nx=W*(0.08+i*0.15)+Math.sin(T/10000+i*1.7)*80;
        const ny=H*(0.12+i*0.14)+Math.cos(T/8000+i*2.3)*55;
        const nr=150+i*40+Math.sin(T/12000+i)*30;
        ctx.globalAlpha=isNexus?0.04:isGrimm?0.09:isP2?0.08:0.055;
        const ng=ctx.createRadialGradient(nx,ny,0,nx,ny,nr);
        const nebColors=isNexus?['#004466','#003355','#002244','#005577','#003344','#001a33']:isGrimm?['#ff2200','#cc1100','#ff4400','#aa0000','#ff0033','#dd2200']:isP2?['#ff00ff','#cc00aa','#ff4488','#aa00ff','#ff0066','#dd22bb']:['#2266dd','#0088ee','#4466ff','#3355dd','#2244bb','#1144aa','#5500cc'];
        ng.addColorStop(0,nebColors[i%nebColors.length]);ng.addColorStop(0.4,nebColors[(i+2)%nebColors.length]+'66');ng.addColorStop(0.75,nebColors[(i+3)%nebColors.length]+'22');ng.addColorStop(1,'transparent');
        ctx.fillStyle=ng;ctx.fillRect(0,0,W,H);
    }
    // Distant galaxy smear
    ctx.globalAlpha=isP2?0.06:0.04;
    const gx=W*0.75+Math.sin(T/15000)*40, gy=H*0.3;
    const galG=ctx.createRadialGradient(gx,gy,0,gx,gy,200);
    galG.addColorStop(0,isP2?'#ffaaff':'#aaccff');
    galG.addColorStop(0.3,isP2?'#ff44aa66':'#4488dd66');
    galG.addColorStop(1,'transparent');
    ctx.fillStyle=galG;
    ctx.save();ctx.translate(gx,gy);ctx.rotate(T/30000);ctx.scale(1.6,0.4);
    ctx.beginPath();ctx.arc(0,0,200,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.globalAlpha=1;

    // Subtle dust lane
    ctx.globalAlpha=0.012;
    const dustY=H*0.4+Math.sin(T/15000)*30;
    const dustG=ctx.createLinearGradient(0,dustY-80,0,dustY+80);
    dustG.addColorStop(0,'transparent');dustG.addColorStop(0.5,isP2?'#440044':'#182040');dustG.addColorStop(1,'transparent');
    ctx.fillStyle=dustG;ctx.fillRect(0,dustY-80,W,160);
    ctx.globalAlpha=1;

    // Stars with color variety, twinkle, and depth layers
    const starColors=isNexus?['#88ccff','#44aaff','#aaddff','#66bbff','#ccddff']:isGrimm?['#ff8866','#ff4422','#ffaa88','#ff6644','#ffccaa']:isP2?['#ff88cc','#ff44aa','#ffaadd','#cc44ff','#ff66ee']:['#ffffff','#aaccff','#ffeecc','#88aaff','#ccddff','#ffccee'];
    for(const s of stars){
        const twinkle=Math.sin(T/600+s.x*3+s.y)*0.35+Math.sin(T/900+s.y*2)*0.15;
        ctx.globalAlpha=Math.max(0.05,s.alpha+twinkle);
        const col=starColors[Math.floor(s.x+s.y)%starColors.length];
        ctx.fillStyle=col;
        ctx.beginPath();ctx.arc(s.x,s.y,s.size,0,Math.PI*2);ctx.fill();
        // Bright stars get a soft glow halo + cross flare
        if(s.size>1.2&&s.alpha>0.4){
            // Glow halo
            ctx.globalAlpha*=0.22;
            const sg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.size*5);
            sg.addColorStop(0,col);sg.addColorStop(0.4,col+'66');sg.addColorStop(1,'transparent');
            ctx.fillStyle=sg;ctx.beginPath();ctx.arc(s.x,s.y,s.size*5,0,Math.PI*2);ctx.fill();
            // Cross flare
            ctx.globalAlpha=Math.max(0.04,s.alpha+twinkle)*0.4;
            ctx.strokeStyle=col;ctx.lineWidth=0.7;
            const fl=4+s.size*2.5;
            ctx.beginPath();ctx.moveTo(s.x-fl,s.y);ctx.lineTo(s.x+fl,s.y);ctx.moveTo(s.x,s.y-fl);ctx.lineTo(s.x,s.y+fl);ctx.stroke();
            // Diagonal secondary flare
            ctx.globalAlpha*=0.5;ctx.lineWidth=0.4;
            const fl2=fl*0.6;
            ctx.beginPath();ctx.moveTo(s.x-fl2,s.y-fl2);ctx.lineTo(s.x+fl2,s.y+fl2);ctx.moveTo(s.x-fl2,s.y+fl2);ctx.lineTo(s.x+fl2,s.y-fl2);ctx.stroke();
        }
    }
    ctx.globalAlpha=1;

    // Vignette overlay
    const vig=ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.75);
    vig.addColorStop(0,'transparent');vig.addColorStop(1,'rgba(0,0,0,0.35)');
    ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);

    // Ambient floating space dust motes
    for(const d of spaceDust){
        d.x+=d.dx;d.y+=d.dy;
        if(d.x<0)d.x=W;if(d.x>W)d.x=0;if(d.y<0)d.y=H;if(d.y>H)d.y=0;
        ctx.globalAlpha=d.alpha+Math.sin(T/2000+d.x+d.y)*0.02;
        const dg=ctx.createRadialGradient(d.x,d.y,0,d.x,d.y,d.size*3);
        dg.addColorStop(0,isP2?'rgba(255,100,200,0.6)':'rgba(100,150,255,0.5)');dg.addColorStop(1,'transparent');
        ctx.fillStyle=dg;ctx.beginPath();ctx.arc(d.x,d.y,d.size*3,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;

    // Shooting stars — spawn occasionally
    if(Math.random()<0.003&&shootingStars.length<2){
        const sx=Math.random()*W*0.5;const sy=Math.random()*H*0.3;
        const sa=Math.random()*0.4+0.3;
        shootingStars.push({x:sx,y:sy,dx:Math.cos(sa)*8,dy:Math.sin(sa)*8,life:25+Math.random()*15,trail:[]});
    }
    for(let si=shootingStars.length-1;si>=0;si--){
        const ss=shootingStars[si];
        ss.trail.push({x:ss.x,y:ss.y});if(ss.trail.length>12)ss.trail.shift();
        ss.x+=ss.dx;ss.y+=ss.dy;ss.life--;
        if(ss.life<=0){shootingStars.splice(si,1);continue;}
        // Draw trail
        for(let ti=0;ti<ss.trail.length;ti++){
            const ta=ti/ss.trail.length;
            ctx.globalAlpha=ta*0.4*(ss.life/20);
            ctx.fillStyle=isP2?'#ffaadd':'#aaddff';
            ctx.beginPath();ctx.arc(ss.trail[ti].x,ss.trail[ti].y,1+ta*0.5,0,Math.PI*2);ctx.fill();
        }
        // Head
        ctx.globalAlpha=Math.min(1,ss.life/10);
        ctx.fillStyle='#fff';ctx.shadowBlur=8;ctx.shadowColor=isP2?'#ff88cc':'#88ccff';
        ctx.beginPath();ctx.arc(ss.x,ss.y,1.5,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
    }
    ctx.globalAlpha=1;

    // Engine trail particles
    if(G.running&&isAction('thrust')&&!boss?.state?.startsWith('enter')&&Math.random()<0.6){
        const _cls2=(G.slotId&&saves[G.slotId]&&saves[G.slotId].playerClass)?saves[G.slotId].playerClass:'none';
        const _shape2=CLASS_SHIPS[_cls2]||CLASS_SHIPS.none;
        const ex=ship.x+Math.cos(ship.a+Math.PI)*ship.r*0.5;
        const ey=ship.y+Math.sin(ship.a+Math.PI)*ship.r*0.5;
        engineTrail.push({x:ex+(Math.random()-0.5)*4,y:ey+(Math.random()-0.5)*4,
            dx:(Math.random()-0.5)*0.5-Math.cos(ship.a)*1.5,dy:(Math.random()-0.5)*0.5-Math.sin(ship.a)*1.5,
            life:12+Math.random()*8,maxLife:22,size:Math.random()*2+1,
            color:isP2?'#ff66ff':(CLASS_DEFS[_cls2]||CLASS_DEFS.none).color});
    }
    for(let ei=engineTrail.length-1;ei>=0;ei--){
        const ep=engineTrail[ei];ep.x+=ep.dx;ep.y+=ep.dy;ep.life--;
        if(ep.life<=0){engineTrail.splice(ei,1);continue;}
        const ea=ep.life/ep.maxLife;
        ctx.globalAlpha=ea*0.5;
        ctx.fillStyle=ep.color;ctx.beginPath();ctx.arc(ep.x,ep.y,ep.size*ea,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;

    // --- FORCE FIELD DROP ---
    if(G.forceFieldDrop){
        const fy=G.forceFieldDrop.y+Math.sin(T/300)*5;
        ctx.save();ctx.translate(G.forceFieldDrop.x,fy);
        // Pulsing outer aura
        const ffPulse=0.7+Math.sin(T/200)*0.3;
        const fAura=ctx.createRadialGradient(0,0,0,0,0,40);
        fAura.addColorStop(0,`rgba(0,255,255,${ffPulse*0.15})`);fAura.addColorStop(1,'transparent');
        ctx.fillStyle=fAura;ctx.beginPath();ctx.arc(0,0,40,0,Math.PI*2);ctx.fill();
        // Rotating diamond with glow
        ctx.rotate(T/1200);
        ctx.shadowBlur=30;ctx.shadowColor='rgba(0,255,255,0.6)';
        ctx.strokeStyle=`rgba(0,255,255,${ffPulse})`;ctx.lineWidth=2.5;
        ctx.beginPath();for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,r=18;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.stroke();
        // Inner fill
        ctx.fillStyle='rgba(0,40,50,0.5)';ctx.fill();
        ctx.shadowBlur=0;ctx.rotate(-T/1200);
        // Letter
        ctx.fillStyle=`rgba(0,255,255,${ffPulse})`;ctx.font='bold 16px Courier New';ctx.textAlign='center';ctx.fillText('S',0,6);
        ctx.restore();
    }

    // --- CYBORG WALL ---
    if(boss&&boss.type===4&&boss.wallSide){
        const wx=W/2;
        ctx.save();
        // Wide energy field glow
        const wallGrad=ctx.createLinearGradient(wx-30,0,wx+30,0);
        wallGrad.addColorStop(0,'transparent');wallGrad.addColorStop(0.3,'rgba(0,255,136,0.03)');
        wallGrad.addColorStop(0.5,'rgba(0,255,136,0.06)');wallGrad.addColorStop(0.7,'rgba(0,255,136,0.03)');wallGrad.addColorStop(1,'transparent');
        ctx.fillStyle=wallGrad;ctx.fillRect(wx-30,0,60,H);
        // Main wall line with heavy glow
        ctx.shadowBlur=35;ctx.shadowColor='#00ff88';
        ctx.strokeStyle='#00ff88';ctx.lineWidth=3;
        ctx.beginPath();ctx.moveTo(wx,0);ctx.lineTo(wx,H);ctx.stroke();
        // Secondary glow lines
        ctx.shadowBlur=10;ctx.strokeStyle='rgba(0,255,136,0.3)';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(wx-4,0);ctx.lineTo(wx-4,H);ctx.stroke();
        ctx.beginPath();ctx.moveTo(wx+4,0);ctx.lineTo(wx+4,H);ctx.stroke();
        // Electric crackling effect — more intense
        for(let y=0;y<H;y+=12){
            const off=(Math.random()-0.5)*20;
            const bright=Math.random();
            ctx.strokeStyle=`rgba(0,255,136,${0.2+bright*0.5})`;ctx.lineWidth=0.8+bright;
            ctx.shadowBlur=bright*15;
            ctx.beginPath();ctx.moveTo(wx+off,y);ctx.lineTo(wx+(Math.random()-0.5)*20,y+12);ctx.stroke();
            // Occasional bright spark
            if(Math.random()<0.08){
                ctx.fillStyle='#fff';ctx.shadowBlur=20;ctx.shadowColor='#00ff88';
                ctx.beginPath();ctx.arc(wx+(Math.random()-0.5)*10,y,2,0,Math.PI*2);ctx.fill();
            }
        }
        // Hex grid pattern on blocked side
        const blocked=boss.wallSide==='left'?0:W/2;
        ctx.fillStyle='rgba(0,255,136,0.02)';ctx.fillRect(blocked,0,W/2,H);
        // Pulsing warning text
        const wPulse=0.2+Math.sin(T/200)*0.15;
        ctx.fillStyle=`rgba(0,255,136,${wPulse})`;ctx.font='bold 18px Courier New';ctx.textAlign='center';
        ctx.shadowBlur=15;ctx.shadowColor='#00ff88';
        const arrowX=boss.wallSide==='left'?W*0.25:W*0.75;
        ctx.fillText('BLOCKED',arrowX,H/2);
        ctx.shadowBlur=0;ctx.restore();
    }

    // --- GASTER BLASTERS ---
    for(const gb of gasterBlasters){
        ctx.save();ctx.translate(gb.x,gb.y);ctx.rotate(gb.angle);
        // Skull aura glow
        const gbPulse=0.5+Math.sin(T/100+gb.x)*0.3;
        ctx.shadowBlur=20;ctx.shadowColor=`rgba(200,220,255,${gbPulse*0.5})`;
        // Skull body with gradient
        const skullG=ctx.createLinearGradient(-32,0,22,0);
        skullG.addColorStop(0,'#ccccbb');skullG.addColorStop(0.5,'#eeeedd');skullG.addColorStop(1,'#ddddcc');
        ctx.fillStyle=skullG;ctx.beginPath();
        ctx.moveTo(-22,-22);ctx.lineTo(22,-12);ctx.lineTo(22,12);ctx.lineTo(-22,22);ctx.lineTo(-32,0);
        ctx.closePath();ctx.fill();
        // Bone detail lines
        ctx.strokeStyle='rgba(150,140,120,0.5)';ctx.lineWidth=0.8;ctx.stroke();
        ctx.strokeStyle='rgba(200,190,170,0.3)';ctx.lineWidth=0.5;
        ctx.beginPath();ctx.moveTo(-28,-8);ctx.lineTo(-10,-8);ctx.stroke();
        ctx.beginPath();ctx.moveTo(-28,8);ctx.lineTo(-10,8);ctx.stroke();
        ctx.shadowBlur=0;
        // Eye sockets with depth
        const eyeG1=ctx.createRadialGradient(-10,-10,1,-10,-10,6);
        eyeG1.addColorStop(0,'#111');eyeG1.addColorStop(1,'#000');
        ctx.fillStyle=eyeG1;ctx.beginPath();ctx.arc(-10,-10,6,0,Math.PI*2);ctx.fill();
        const eyeG2=ctx.createRadialGradient(-10,10,1,-10,10,6);
        eyeG2.addColorStop(0,'#111');eyeG2.addColorStop(1,'#000');
        ctx.fillStyle=eyeG2;ctx.beginPath();ctx.arc(-10,10,6,0,Math.PI*2);ctx.fill();
        // Nose cavity
        ctx.fillStyle='#222';ctx.beginPath();ctx.moveTo(-2,-3);ctx.lineTo(2,-3);ctx.lineTo(0,2);ctx.closePath();ctx.fill();
        // Eye glow — more dramatic
        if(gb.timer>20){
            const eg=Math.min((gb.timer-20)/40,1);
            ctx.shadowBlur=12*eg;ctx.shadowColor='cyan';
            ctx.fillStyle=`rgba(0,255,255,${eg})`;
            ctx.beginPath();ctx.arc(-10,-10,2.5+eg,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.arc(-10,10,2.5+eg,0,Math.PI*2);ctx.fill();
            ctx.fillStyle=`rgba(255,255,255,${eg*0.7})`;
            ctx.beginPath();ctx.arc(-10,-10,1.2,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.arc(-10,10,1.2,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;
        }
        // Targeting laser — more detail
        if(gb.timer<60){
            const la=gb.timer/60;
            // Warning glow at source
            const warnG=ctx.createRadialGradient(22,0,0,22,0,15);
            warnG.addColorStop(0,`rgba(0,255,255,${la*0.5})`);warnG.addColorStop(1,'transparent');
            ctx.fillStyle=warnG;ctx.beginPath();ctx.arc(22,0,15,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle=`rgba(0,255,255,${la*0.6})`;ctx.lineWidth=1+la*1.5;
            ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(2000,0);ctx.stroke();ctx.setLineDash([]);
            // Secondary dashed line
            ctx.strokeStyle=`rgba(0,255,255,${la*0.2})`;ctx.lineWidth=4;
            ctx.setLineDash([2,12]);ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(2000,0);ctx.stroke();ctx.setLineDash([]);
            // Pulsing dot at muzzle
            ctx.fillStyle=`rgba(0,255,255,${la})`;ctx.shadowBlur=10;ctx.shadowColor='cyan';
            ctx.beginPath();ctx.arc(22,0,3+Math.sin(T/40)*2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        }
        // Active beam — multi-layered
        else if(gb.timer>=60&&gb.timer<90){
            const intensity=1-((gb.timer-60)/30);
            // Ultra-wide glow
            ctx.fillStyle=`rgba(0,50,100,${intensity*0.25})`;ctx.fillRect(0,-50,2000,100);
            // Outer energy
            ctx.fillStyle=`rgba(0,100,200,${intensity*0.4})`;ctx.fillRect(0,-35,2000,70);
            // Main beam
            ctx.fillStyle=`rgba(0,220,255,${intensity*0.7})`;ctx.shadowBlur=40;ctx.shadowColor='cyan';
            ctx.fillRect(0,-22,2000,44);
            // Inner beam
            ctx.fillStyle=`rgba(100,255,255,${intensity*0.85})`;
            ctx.fillRect(0,-14,2000,28);
            // Core — white hot
            ctx.fillStyle=`rgba(255,255,255,${intensity})`;
            ctx.fillRect(0,-8,2000,16);
            // Beam sparkle particles
            for(let sp=0;sp<5;sp++){
                const spx=Math.random()*500+22;const spy=(Math.random()-0.5)*30;
                ctx.fillStyle=`rgba(255,255,255,${intensity*Math.random()})`;
                ctx.beginPath();ctx.arc(spx,spy,1+Math.random(),0,Math.PI*2);ctx.fill();
            }
            ctx.shadowBlur=0;
        }
        ctx.restore();
    }

    // --- ASTEROIDS ---
    for(const a of asteroids){
        ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.angle);
        if(a.type==='fuel'){
            ctx.shadowBlur=28;ctx.shadowColor='#ffcc00';
            ctx.strokeStyle='#ffdd22';ctx.fillStyle='#2a2400';
        } else if(isP2){
            ctx.shadowBlur=16;ctx.shadowColor='#00ddff';
            ctx.strokeStyle='#00ddee';ctx.fillStyle='rgba(0,40,48,0.75)';
        } else {
            ctx.shadowBlur=8;ctx.shadowColor='rgba(140,140,180,0.5)';
            const ag=ctx.createRadialGradient(-a.r*0.35,-a.r*0.35,a.r*0.08,a.r*0.15,a.r*0.15,a.r*1.1);
            ag.addColorStop(0,'#3a3a42');ag.addColorStop(0.35,'#1e1e24');ag.addColorStop(0.75,'#0f0f14');ag.addColorStop(1,'#050508');
            ctx.fillStyle=ag;ctx.strokeStyle='#6a6a78';
        }
        ctx.lineWidth=1.5;ctx.beginPath();
        for(let i=0;i<a.verts;i++){const ang=(Math.PI*2/a.verts)*i,r=a.r+a.offsets[i];i===0?ctx.moveTo(Math.cos(ang)*r,Math.sin(ang)*r):ctx.lineTo(Math.cos(ang)*r,Math.sin(ang)*r);}
        ctx.closePath();ctx.fill();ctx.stroke();
        ctx.shadowBlur=0;
        if(a.type==='fuel'){
            // Fuel — glowing energy symbol
            ctx.strokeStyle='#ffee44';ctx.lineWidth=2.5;ctx.shadowBlur=12;ctx.shadowColor='#ffcc00';
            ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(7,0);ctx.moveTo(0,-7);ctx.lineTo(0,7);ctx.stroke();
            ctx.shadowBlur=0;
            // Pulsing aura
            const fp=0.2+Math.sin(T/200+a.x)*0.15;
            ctx.fillStyle=`rgba(255,220,0,${fp})`;ctx.beginPath();ctx.arc(0,0,a.r*0.55,0,Math.PI*2);ctx.fill();
            // Inner glow
            const fg=ctx.createRadialGradient(0,0,0,0,0,a.r*0.4);
            fg.addColorStop(0,'rgba(255,255,100,0.3)');fg.addColorStop(1,'transparent');
            ctx.fillStyle=fg;ctx.beginPath();ctx.arc(0,0,a.r*0.4,0,Math.PI*2);ctx.fill();
        } else {
            // Surface detail: craters with depth
            ctx.strokeStyle=isP2?'#004455':'#1c1c1c';ctx.lineWidth=0.8;
            ctx.beginPath();ctx.arc(a.r*0.15,-a.r*0.1,a.r*0.28,0,Math.PI*2);ctx.stroke();
            // Crater shadow
            ctx.fillStyle=isP2?'rgba(0,40,50,0.3)':'rgba(0,0,0,0.2)';
            ctx.beginPath();ctx.arc(a.r*0.15,-a.r*0.1,a.r*0.22,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.arc(-a.r*0.25,a.r*0.2,a.r*0.14,0,Math.PI*2);ctx.stroke();
            ctx.fillStyle=isP2?'rgba(0,40,50,0.2)':'rgba(0,0,0,0.15)';
            ctx.beginPath();ctx.arc(-a.r*0.25,a.r*0.2,a.r*0.1,0,Math.PI*2);ctx.fill();
            // Rim light (top-left highlight)
            ctx.strokeStyle=isP2?'rgba(0,200,220,0.12)':'rgba(180,180,200,0.1)';ctx.lineWidth=1.5;
            ctx.beginPath();ctx.arc(0,0,a.r*0.85,-2.2,-0.8);ctx.stroke();
            // Scratch lines
            ctx.strokeStyle=isP2?'#003344':'#1e1e1e';ctx.lineWidth=0.5;
            ctx.beginPath();ctx.moveTo(-a.r*0.4,-a.r*0.3);ctx.lineTo(a.r*0.1,a.r*0.2);ctx.stroke();
        }
        // Spawner shield ring around non-fuel asteroids
        const spawnerUp=miniBosses.some(m=>m.type==='spawner');
        if(spawnerUp&&a.type!=='fuel'){
            ctx.rotate(-a.angle);
            const pulse=0.3+Math.sin(T/200+a.x)*0.25;
            ctx.strokeStyle=`rgba(68,255,68,${pulse})`;ctx.lineWidth=2;
            ctx.shadowBlur=12;ctx.shadowColor='#44ff44';
            ctx.beginPath();ctx.arc(0,0,a.r+7,0,Math.PI*2);ctx.stroke();
            // Inner ring
            ctx.strokeStyle=`rgba(68,255,68,${pulse*0.4})`;ctx.lineWidth=1;
            ctx.beginPath();ctx.arc(0,0,a.r+3,0,Math.PI*2);ctx.stroke();
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
        const pulse=0.7+Math.sin(T/200+b.x)*0.3;
        ctx.save();ctx.translate(b.x,b.y);
        // Outer glow aura
        const ag=ctx.createRadialGradient(0,0,b.size*0.3,0,0,b.size*1.2);
        ag.addColorStop(0,`rgba(0,255,100,${pulse*0.15})`);ag.addColorStop(1,'transparent');
        ctx.fillStyle=ag;ctx.beginPath();ctx.arc(0,0,b.size*1.2,0,Math.PI*2);ctx.fill();
        // Box with gradient
        ctx.shadowBlur=18;ctx.shadowColor='#00ff66';
        ctx.strokeStyle=`rgba(0,255,100,${pulse})`;ctx.lineWidth=2;
        ctx.strokeRect(-b.size/2,-b.size/2,b.size,b.size);
        const bf=ctx.createLinearGradient(0,-b.size/2,0,b.size/2);
        bf.addColorStop(0,'rgba(0,80,20,0.5)');bf.addColorStop(1,'rgba(0,40,10,0.5)');
        ctx.fillStyle=bf;ctx.fillRect(-b.size/2,-b.size/2,b.size,b.size);
        ctx.shadowBlur=0;
        // Letter with glow
        ctx.fillStyle=`rgba(0,255,100,${pulse})`;ctx.font='bold 13px Courier New';ctx.textAlign='center';ctx.fillText('A',0,5);
        ctx.restore();
    }

    // --- POWERUPS ---
    for(const p of powerups){
        const pulse=0.7+Math.sin(T/150+p.x)*0.3;
        ctx.save();ctx.translate(p.x,p.y);
        // Outer glow aura
        const pg=ctx.createRadialGradient(0,0,p.size*0.2,0,0,p.size*1.3);
        pg.addColorStop(0,`rgba(255,180,0,${pulse*0.15})`);pg.addColorStop(1,'transparent');
        ctx.fillStyle=pg;ctx.beginPath();ctx.arc(0,0,p.size*1.3,0,Math.PI*2);ctx.fill();
        ctx.rotate(T/800);
        ctx.shadowBlur=20;ctx.shadowColor='#ffaa00';
        ctx.strokeStyle=`rgba(255,180,0,${pulse})`;ctx.lineWidth=2.5;
        // Diamond shape
        ctx.beginPath();ctx.moveTo(0,-p.size/2);ctx.lineTo(p.size/2,0);ctx.lineTo(0,p.size/2);ctx.lineTo(-p.size/2,0);ctx.closePath();ctx.stroke();
        const pf=ctx.createLinearGradient(0,-p.size/2,0,p.size/2);
        pf.addColorStop(0,'rgba(100,60,0,0.5)');pf.addColorStop(1,'rgba(60,30,0,0.5)');
        ctx.fillStyle=pf;ctx.fill();
        // Inner diamond
        ctx.strokeStyle=`rgba(255,200,50,${pulse*0.4})`;ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(0,-p.size*0.3);ctx.lineTo(p.size*0.3,0);ctx.lineTo(0,p.size*0.3);ctx.lineTo(-p.size*0.3,0);ctx.closePath();ctx.stroke();
        ctx.shadowBlur=0;ctx.rotate(-T/800);
        ctx.fillStyle=`rgba(255,200,50,${pulse})`;ctx.font='bold 12px Courier New';ctx.textAlign='center';ctx.fillText('3x',0,4);
        ctx.restore();
    }

    // --- MINI BOSSES ---
    for(const mb of miniBosses){
        ctx.save();ctx.translate(mb.x,mb.y);ctx.rotate(mb.rot);
        if(mb.type==='chaser'){
            // === CHASER — Volatile purple plasma entity ===
            const chPulse=0.6+Math.sin(T/150+mb.x)*0.4;
            // Outer plasma aura
            ctx.globalAlpha=0.06;
            const chAura=ctx.createRadialGradient(0,0,mb.r*0.2,0,0,mb.r+16);
            chAura.addColorStop(0,'#dd44ff');chAura.addColorStop(0.5,'#8800cc');chAura.addColorStop(1,'transparent');
            ctx.fillStyle=chAura;ctx.beginPath();ctx.arc(0,0,mb.r+16,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
            // Body — spiky star with inner glow
            ctx.shadowBlur=25;ctx.shadowColor='#aa00ff';
            const chBody=ctx.createRadialGradient(0,0,0,0,0,mb.r);
            chBody.addColorStop(0,'#3a0060');chBody.addColorStop(0.6,'#1e0035');chBody.addColorStop(1,'#0c0018');
            ctx.fillStyle=chBody;ctx.strokeStyle=`rgba(200,50,255,${chPulse})`;ctx.lineWidth=2;
            ctx.beginPath();for(let i=0;i<10;i++){const r=i%2===0?mb.r:mb.r*0.35,a=(Math.PI*2*i)/10;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
            ctx.closePath();ctx.fill();ctx.stroke();
            ctx.shadowBlur=0;
            // Plasma tendrils inside
            ctx.strokeStyle=`rgba(200,100,255,${chPulse*0.3})`;ctx.lineWidth=1;
            for(let t=0;t<4;t++){const ta=T/300+t*Math.PI/2;
                ctx.beginPath();ctx.moveTo(0,0);
                ctx.quadraticCurveTo(Math.cos(ta+0.5)*mb.r*0.4,Math.sin(ta+0.5)*mb.r*0.4,Math.cos(ta)*mb.r*0.7,Math.sin(ta)*mb.r*0.7);
                ctx.stroke();}
            // Inner energy glow
            const cg=ctx.createRadialGradient(0,0,0,0,0,mb.r*0.5);
            cg.addColorStop(0,'rgba(255,200,255,0.45)');cg.addColorStop(0.5,'rgba(180,0,255,0.12)');cg.addColorStop(1,'transparent');
            ctx.fillStyle=cg;ctx.beginPath();ctx.arc(0,0,mb.r*0.5,0,Math.PI*2);ctx.fill();
            // Core eye — bright pulsing
            ctx.shadowBlur=20;ctx.shadowColor='#ee88ff';
            ctx.fillStyle='#ffccff';ctx.beginPath();ctx.arc(0,0,5+chPulse*2,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;
        } else if(mb.type==='blaster'){
            // === BLASTER — Mechanical skull cannon ===
            const isLocking=mb.state==='lock';
            const blCol=isLocking?'#ffffff':'#00dddd';
            // Aura
            ctx.globalAlpha=0.05;
            const blAura=ctx.createRadialGradient(0,0,mb.r*0.3,0,0,mb.r+14);
            blAura.addColorStop(0,isLocking?'#ffffff':'#00cccc');blAura.addColorStop(1,'transparent');
            ctx.fillStyle=blAura;ctx.beginPath();ctx.arc(0,0,mb.r+14,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
            ctx.shadowBlur=isLocking?30:18;ctx.shadowColor=isLocking?'#fff':'#00aaaa';
            // Body: skull with gradient
            const blBody=ctx.createRadialGradient(0,-4,0,0,0,mb.r);
            blBody.addColorStop(0,isLocking?'#1a1a2a':'#0c1a1c');blBody.addColorStop(1,isLocking?'#0a0a15':'#040e10');
            ctx.fillStyle=blBody;ctx.strokeStyle=blCol;ctx.lineWidth=2;
            ctx.beginPath();
            ctx.arc(0,-4,mb.r*0.8,Math.PI,0);
            ctx.lineTo(mb.r*0.6,mb.r*0.6);ctx.lineTo(mb.r*0.2,mb.r*0.45);
            ctx.lineTo(-mb.r*0.2,mb.r*0.45);ctx.lineTo(-mb.r*0.6,mb.r*0.6);
            ctx.closePath();ctx.fill();ctx.stroke();
            ctx.shadowBlur=0;
            // Forehead plate
            ctx.strokeStyle=`rgba(0,220,220,0.2)`;ctx.lineWidth=1;
            ctx.beginPath();ctx.arc(0,-6,mb.r*0.5,Math.PI+0.3,0-0.3);ctx.stroke();
            // Eye sockets with depth
            const eyeD1=ctx.createRadialGradient(-8,-3,1,-8,-3,8);
            eyeD1.addColorStop(0,'#0a0a0a');eyeD1.addColorStop(1,'#000');
            ctx.fillStyle=eyeD1;ctx.beginPath();ctx.arc(-8,-3,7.5,0,Math.PI*2);ctx.fill();
            const eyeD2=ctx.createRadialGradient(8,-3,1,8,-3,8);
            eyeD2.addColorStop(0,'#0a0a0a');eyeD2.addColorStop(1,'#000');
            ctx.fillStyle=eyeD2;ctx.beginPath();ctx.arc(8,-3,7.5,0,Math.PI*2);ctx.fill();
            // Glowing eyes — always visible, intensity varies
            const eyeI=isLocking?(0.7+Math.sin(T/30)*0.3):(0.3+Math.sin(T/200)*0.3);
            ctx.fillStyle=isLocking?`rgba(255,255,255,${eyeI})`:`rgba(0,255,255,${eyeI})`;
            ctx.shadowBlur=isLocking?15:8;ctx.shadowColor=isLocking?'#fff':'cyan';
            ctx.beginPath();ctx.arc(-8,-3,3+eyeI,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.arc(8,-3,3+eyeI,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-8,-3,1.2,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.arc(8,-3,1.2,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;
            // Jaw with teeth
            ctx.fillStyle='#000';ctx.fillRect(-mb.r*0.35,mb.r*0.25,mb.r*0.7,mb.r*0.2);
            ctx.strokeStyle=isLocking?'#fff':'#00bbbb';ctx.lineWidth=1.5;
            for(let t=-10;t<=10;t+=5){ctx.beginPath();ctx.moveTo(t,mb.r*0.25);ctx.lineTo(t,mb.r*0.42);ctx.stroke();}
            // Charge ring when locking
            if(isLocking){
                const prog=mb.timer/60;
                ctx.strokeStyle=`rgba(255,255,255,${0.4+Math.sin(T/25)*0.3})`;ctx.lineWidth=2.5;
                ctx.shadowBlur=10;ctx.shadowColor='#fff';
                ctx.beginPath();ctx.arc(0,0,mb.r+8,0,Math.PI*2*prog);ctx.stroke();
                // Inner charging ring
                ctx.strokeStyle=`rgba(0,255,255,${0.3+Math.sin(T/20)*0.2})`;ctx.lineWidth=1;
                ctx.beginPath();ctx.arc(0,0,mb.r+4,0,Math.PI*2*prog);ctx.stroke();
                ctx.shadowBlur=0;
            }
        } else if(mb.type==='spawner'){
            // === SPAWNER — Organic hive-mind node ===
            const isDashing=mb.state==='dash_intercept';
            const spCol=isDashing?'#ffffff':'#44ff44';
            // Aura
            ctx.globalAlpha=0.06;
            const spAura=ctx.createRadialGradient(0,0,mb.r*0.2,0,0,mb.r+14);
            spAura.addColorStop(0,isDashing?'#fff':'#22cc22');spAura.addColorStop(1,'transparent');
            ctx.fillStyle=spAura;ctx.beginPath();ctx.arc(0,0,mb.r+14,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
            ctx.shadowBlur=isDashing?22:14;ctx.shadowColor=isDashing?'#fff':'#22cc22';
            // Body: organic diamond with curved edges
            const spBody=ctx.createRadialGradient(0,0,0,0,0,mb.r);
            spBody.addColorStop(0,isDashing?'#1a2a1a':'#0c1c0c');spBody.addColorStop(1,isDashing?'#0a150a':'#040a04');
            ctx.fillStyle=spBody;ctx.strokeStyle=spCol;ctx.lineWidth=2;
            ctx.beginPath();
            ctx.moveTo(0,-mb.r);ctx.quadraticCurveTo(mb.r*0.6,-mb.r*0.6,mb.r,0);
            ctx.quadraticCurveTo(mb.r*0.6,mb.r*0.6,0,mb.r);
            ctx.quadraticCurveTo(-mb.r*0.6,mb.r*0.6,-mb.r,0);
            ctx.quadraticCurveTo(-mb.r*0.6,-mb.r*0.6,0,-mb.r);
            ctx.closePath();ctx.fill();ctx.stroke();
            ctx.shadowBlur=0;
            // Inner organic veins
            ctx.strokeStyle=isDashing?'rgba(255,255,255,0.2)':'rgba(68,255,68,0.15)';ctx.lineWidth=1;
            for(let v=0;v<4;v++){const va=v*Math.PI/2;
                ctx.beginPath();ctx.moveTo(0,0);
                ctx.quadraticCurveTo(Math.cos(va+0.4)*mb.r*0.3,Math.sin(va+0.4)*mb.r*0.3,Math.cos(va)*mb.r*0.7,Math.sin(va)*mb.r*0.7);
                ctx.stroke();}
            // Core — pulsing spawn heart
            const sp=0.4+Math.sin(T/150)*0.4;
            ctx.shadowBlur=10;ctx.shadowColor='#44ff44';
            ctx.fillStyle=`rgba(68,255,68,${sp})`;
            ctx.beginPath();ctx.arc(0,0,5+sp*2,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;
            // Orbiting asteroid fragments
            for(let o=0;o<4;o++){
                const oa=T/350+o*Math.PI*2/4;
                const od=mb.r*0.55+Math.sin(T/300+o)*3;
                const ox=Math.cos(oa)*od,oy=Math.sin(oa)*od;
                ctx.fillStyle='#44ff44';ctx.beginPath();ctx.arc(ox,oy,2.5,0,Math.PI*2);ctx.fill();
                // Tiny orbit trail
                ctx.globalAlpha=0.2;ctx.fillStyle='#44ff44';
                ctx.beginPath();ctx.arc(ox-Math.cos(oa)*3,oy-Math.sin(oa)*3,1.5,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=1;
            }
            // Speed trail when dashing
            if(isDashing){
                for(let dt=1;dt<=3;dt++){
                    ctx.globalAlpha=0.15/dt;ctx.strokeStyle='#44ff44';ctx.lineWidth=2;
                    ctx.beginPath();ctx.moveTo(-mb.r*dt*0.4,0);ctx.lineTo(-mb.r*dt*0.6,(Math.random()-0.5)*4);ctx.stroke();
                }
                ctx.globalAlpha=1;
            }
        } else {
            // === SHOOTER — Armored turret drone ===
            const isCharging=mb.state==='charge';
            const shCol=isCharging?'#ffffff':'#ff3333';
            // Aura
            ctx.globalAlpha=0.06;
            const shAura=ctx.createRadialGradient(0,0,mb.r*0.2,0,0,mb.r+14);
            shAura.addColorStop(0,isCharging?'#fff':'#ff2200');shAura.addColorStop(1,'transparent');
            ctx.fillStyle=shAura;ctx.beginPath();ctx.arc(0,0,mb.r+14,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
            ctx.shadowBlur=24;ctx.shadowColor=isCharging?'#fff':'#ff2200';
            // Body — armored hex with beveled edges
            const shBody=ctx.createRadialGradient(0,0,0,0,0,mb.r);
            shBody.addColorStop(0,'#3a0808');shBody.addColorStop(0.5,'#220404');shBody.addColorStop(1,'#120000');
            ctx.fillStyle=shBody;ctx.strokeStyle=shCol;ctx.lineWidth=2.5;
            ctx.beginPath();for(let i=0;i<6;i++){const a=(Math.PI*2/6)*i;ctx.lineTo(Math.cos(a)*mb.r,Math.sin(a)*mb.r);}
            ctx.closePath();ctx.fill();ctx.stroke();
            ctx.shadowBlur=0;
            // Armor plate lines
            ctx.strokeStyle=isCharging?'rgba(255,255,255,0.15)':'rgba(255,50,50,0.12)';ctx.lineWidth=1;
            for(let i=0;i<6;i++){const a=(Math.PI*2/6)*i;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*mb.r*0.85,Math.sin(a)*mb.r*0.85);ctx.stroke();}
            // Inner hex
            ctx.strokeStyle=isCharging?'rgba(255,255,255,0.25)':'rgba(255,80,80,0.15)';ctx.lineWidth=1;
            ctx.beginPath();for(let i=0;i<6;i++){const a=(Math.PI*2/6)*i;ctx.lineTo(Math.cos(a)*mb.r*0.55,Math.sin(a)*mb.r*0.55);}
            ctx.closePath();ctx.stroke();
            // Crosshair targeting system
            ctx.strokeStyle=isCharging?'rgba(255,255,255,0.7)':'rgba(255,100,100,0.5)';ctx.lineWidth=1.5;
            ctx.beginPath();ctx.moveTo(-mb.r*0.6,0);ctx.lineTo(-mb.r*0.2,0);ctx.moveTo(mb.r*0.2,0);ctx.lineTo(mb.r*0.6,0);ctx.stroke();
            ctx.beginPath();ctx.moveTo(0,-mb.r*0.6);ctx.lineTo(0,-mb.r*0.2);ctx.moveTo(0,mb.r*0.2);ctx.lineTo(0,mb.r*0.6);ctx.stroke();
            ctx.beginPath();ctx.arc(0,0,mb.r*0.3,0,Math.PI*2);ctx.stroke();
            // Targeting dot — pulsing
            const tdPulse=0.6+Math.sin(T/100)*0.4;
            ctx.fillStyle=isCharging?`rgba(255,255,255,${tdPulse})`:`rgba(255,80,80,${tdPulse})`;
            ctx.shadowBlur=12;ctx.shadowColor=isCharging?'#fff':'#ff2222';
            ctx.beginPath();ctx.arc(0,0,3+tdPulse,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,1.5,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;
            // Muzzle ports (2 small circles on opposite sides)
            ctx.fillStyle=isCharging?'#ffaa00':'#ff4444';
            ctx.beginPath();ctx.arc(mb.r*0.75,0,3,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.arc(-mb.r*0.75,0,3,0,Math.PI*2);ctx.fill();
        }
        ctx.shadowBlur=0;ctx.rotate(-mb.rot);
        // HP bar — styled with gradient
        const hpPct=mb.hp/mb.maxHp;
        ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(-21,-mb.r-17,42,9);
        ctx.strokeStyle='rgba(100,100,100,0.3)';ctx.lineWidth=1;ctx.strokeRect(-21,-mb.r-17,42,9);
        ctx.fillStyle='#1a0000';ctx.fillRect(-19,-mb.r-15,38,5);
        const hpGrad=ctx.createLinearGradient(-19,0,19,0);
        if(hpPct>0.5){hpGrad.addColorStop(0,'#00cc44');hpGrad.addColorStop(1,'#44ff88');}
        else if(hpPct>0.25){hpGrad.addColorStop(0,'#cc8800');hpGrad.addColorStop(1,'#ffcc00');}
        else{hpGrad.addColorStop(0,'#cc2200');hpGrad.addColorStop(1,'#ff4444');}
        ctx.fillStyle=hpGrad;ctx.fillRect(-19,-mb.r-15,38*hpPct,5);
        ctx.restore();
    }

    // --- ENEMY BULLETS ---
    for(const eb of enemyBullets){
        // Outer threat glow
        ctx.globalAlpha=0.25;
        const ebOuter=ctx.createRadialGradient(eb.x,eb.y,0,eb.x,eb.y,10);
        ebOuter.addColorStop(0,'#ff2222');ebOuter.addColorStop(1,'transparent');
        ctx.fillStyle=ebOuter;ctx.beginPath();ctx.arc(eb.x,eb.y,10,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
        ctx.shadowBlur=14;ctx.shadowColor='#ff2200';
        const eg=ctx.createRadialGradient(eb.x,eb.y,0,eb.x,eb.y,5);
        eg.addColorStop(0,'#fff');eg.addColorStop(0.25,'#ff6644');eg.addColorStop(0.6,'#ff2222');eg.addColorStop(1,'rgba(255,0,0,0)');
        ctx.fillStyle=eg;ctx.beginPath();ctx.arc(eb.x,eb.y,5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#ffccaa';ctx.beginPath();ctx.arc(eb.x,eb.y,2,0,Math.PI*2);ctx.fill();
    }
    ctx.shadowBlur=0;

    // --- PARTICLES (enhanced) ---
    for(const p of particles){
        const a=p.life/p.maxLife;
        const sz=p.size*(0.5+a*0.5);
        // Soft outer glow
        ctx.globalAlpha=a*0.3;
        const pGlow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*3);
        pGlow.addColorStop(0,p.color);pGlow.addColorStop(1,'transparent');
        ctx.fillStyle=pGlow;ctx.beginPath();ctx.arc(p.x,p.y,sz*3,0,Math.PI*2);ctx.fill();
        // Main body
        ctx.globalAlpha=a;
        ctx.shadowBlur=sz*4;ctx.shadowColor=p.color;
        ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,sz,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
        // Hot white core
        ctx.fillStyle='#fff';ctx.globalAlpha=a*0.6;
        ctx.beginPath();ctx.arc(p.x,p.y,sz*0.35,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;ctx.shadowBlur=0;

    // --- BOSS ---
    if(boss){
        // Warning text with pulsing + scanline effect
        if(boss.state==='enter'){
            const wa=0.5+Math.sin(T/100)*0.5;
            // Red screen flash with scanning bars
            ctx.globalAlpha=wa*0.08;ctx.fillStyle='#ff0000';ctx.fillRect(0,0,W,H);
            // Horizontal warning bars
            ctx.globalAlpha=wa*0.25;ctx.fillStyle='#ff0000';
            ctx.fillRect(0,H/2-60,W,2);ctx.fillRect(0,H/2+55,W,2);
            // Diagonal caution stripes
            ctx.globalAlpha=wa*0.15;
            for(let cs=-W;cs<W*2;cs+=40){
                ctx.fillStyle=cs%80===0?'#ff0000':'#ffcc00';
                ctx.save();ctx.translate(cs,H/2-58);ctx.rotate(-0.4);
                ctx.fillRect(0,0,18,4);ctx.restore();
            }
            // Warning text
            ctx.globalAlpha=wa;ctx.font='bold 56px Courier New';ctx.fillStyle='#ff2222';ctx.textAlign='center';
            ctx.shadowBlur=60;ctx.shadowColor='#ff0000';
            ctx.fillText('⚠ WARNING ⚠',W/2,H/2);
            ctx.shadowBlur=25;
            ctx.font='bold 15px Courier New';ctx.fillStyle='#ffaaaa';ctx.letterSpacing='4px';
            ctx.fillText('BOSS  APPROACHING',W/2,H/2+32);
            ctx.shadowBlur=0;ctx.globalAlpha=1;
        }
        if(boss.state==='dialogue'){
            ctx.font='bold 26px Courier New';ctx.fillStyle='#fff';ctx.textAlign='center';
            ctx.shadowBlur=20;ctx.shadowColor='rgba(255,0,0,0.6)';
            ctx.fillText("* I WON'T GO DOWN EASY.",W/2,H/2-80);
            ctx.shadowBlur=0;
        }
        if(boss.state==='gilbert_finisher'){
            // Screen-wide energy buildup — pulsing green with radial burst
            const fp=Math.min(1,boss.timer/120);
            // Screen tint
            ctx.globalAlpha=fp*0.12;
            ctx.fillStyle='#00ff00';ctx.fillRect(0,0,W,H);
            // Radial energy burst from center
            ctx.globalAlpha=fp*0.06;
            const finBurst=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.6);
            finBurst.addColorStop(0,'#00ff44');finBurst.addColorStop(1,'transparent');
            ctx.fillStyle=finBurst;ctx.fillRect(0,0,W,H);
            // Energy particles radiating inward toward boss
            if(fp>0.3){
                ctx.globalAlpha=fp*0.4;
                for(let ep=0;ep<8;ep++){
                    const ea=T/200+ep*Math.PI*2/8;
                    const edist=(1-fp)*W*0.4+50;
                    const epx=boss.x+Math.cos(ea)*edist;
                    const epy=boss.y+Math.sin(ea)*edist;
                    ctx.fillStyle='#44ff44';ctx.beginPath();ctx.arc(epx,epy,2+fp*2,0,Math.PI*2);ctx.fill();
                }
            }
            ctx.globalAlpha=1;
            // Stunned text on Sans
            if(!boss.gilbertFinisherReady){
                const sa=0.5+Math.sin(T/80)*0.5;
                ctx.globalAlpha=sa;ctx.font='bold 22px Courier New';ctx.fillStyle='#ff4444';ctx.textAlign='center';
                ctx.shadowBlur=20;ctx.shadowColor='red';
                ctx.fillText('* ...!?',boss.x,boss.y-boss.r-25);
                ctx.shadowBlur=0;ctx.globalAlpha=1;
            } else {
                // Energy trail from Gilbert to Sans — multi-layered
                if(G.gilbert){
                    const gx=G.gilbert.x,gy=G.gilbert.y;
                    // Outer glow trail
                    ctx.strokeStyle=`rgba(0,255,68,${0.2+Math.sin(T/20)*0.15})`;ctx.lineWidth=12;
                    ctx.shadowBlur=40;ctx.shadowColor='#00ff00';
                    ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(boss.x,boss.y);ctx.stroke();
                    // Main trail
                    ctx.strokeStyle=`rgba(68,255,100,${0.7+Math.sin(T/25)*0.3})`;ctx.lineWidth=4;
                    ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(boss.x,boss.y);ctx.stroke();
                    // Core
                    ctx.strokeStyle=`rgba(255,255,255,${0.5+Math.sin(T/15)*0.3})`;ctx.lineWidth=2;
                    ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(boss.x,boss.y);ctx.stroke();
                    ctx.shadowBlur=0;
                }
            }
        }

        ctx.save();ctx.translate(boss.x,boss.y);
        if(boss.type===1){
            // === BOSS 1 — FIERY ENERGY ORB ===
            const isCharge=boss.state==='charge';
            // Outer fire halo
            ctx.globalAlpha=0.07;
            for(let fr=boss.r+10;fr<boss.r+40;fr+=5){
                const fWave=fr+Math.sin(T/200+fr*0.5)*5+Math.cos(T/170+fr)*3;
                ctx.strokeStyle=isCharge?'#ffff00':'#ff4422';ctx.lineWidth=1.5;
                ctx.beginPath();ctx.arc(0,0,fWave,0,Math.PI*2);ctx.stroke();
            }
            ctx.globalAlpha=0.1;
            const fireAura=ctx.createRadialGradient(0,0,boss.r*0.3,0,0,boss.r+35);
            fireAura.addColorStop(0,'#ff6600');fireAura.addColorStop(0.5,'#ff220044');fireAura.addColorStop(1,'transparent');
            ctx.fillStyle=fireAura;ctx.beginPath();ctx.arc(0,0,boss.r+35,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
            // Body — irregular flaming shape (16pt star with organic wobble)
            ctx.rotate(T/400);
            ctx.shadowBlur=30;ctx.shadowColor=isCharge?'#ffff00':'#ff4400';
            const b1Body=ctx.createRadialGradient(0,0,0,0,0,boss.r);
            b1Body.addColorStop(0,'#441100');b1Body.addColorStop(0.5,'#2a0800');b1Body.addColorStop(1,'#150400');
            ctx.fillStyle=b1Body;ctx.strokeStyle=isCharge?'#ffff00':'#ff4422';ctx.lineWidth=3;
            ctx.beginPath();
            for(let i=0;i<16;i++){
                const wobble=Math.sin(T/250+i*1.3)*3;
                const r=i%2===0?boss.r+wobble:boss.r*0.6+wobble;
                const a=(Math.PI*2/16)*i;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
            }
            ctx.closePath();ctx.fill();ctx.stroke();
            ctx.shadowBlur=0;
            // Fire tendrils radiating outward
            ctx.strokeStyle='rgba(255,100,0,0.2)';ctx.lineWidth=1.5;
            for(let ft=0;ft<6;ft++){const fa=T/350+ft*Math.PI/3;
                ctx.beginPath();ctx.moveTo(Math.cos(fa)*boss.r*0.3,Math.sin(fa)*boss.r*0.3);
                ctx.lineTo(Math.cos(fa)*boss.r*0.85,Math.sin(fa)*boss.r*0.85);ctx.stroke();}
            // Molten core — layered
            const mc1=ctx.createRadialGradient(0,0,0,0,0,20);
            mc1.addColorStop(0,'#fff');mc1.addColorStop(0.2,'#ffdd44');mc1.addColorStop(0.5,'#ff6600');mc1.addColorStop(1,'transparent');
            ctx.fillStyle=mc1;ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
        } else if(boss.type===2){
            // === BOSS 2 — COLD CRYSTAL ENTITY ===
            const isCharge=boss.state==='charge';
            // Icy mist aura
            ctx.globalAlpha=0.06;
            for(let cr=boss.r+8;cr<boss.r+35;cr+=6){
                const cWave=cr+Math.cos(T/500+cr*0.2)*3;
                ctx.strokeStyle='#44ddff';ctx.lineWidth=1;
                ctx.beginPath();ctx.arc(0,0,cWave,0,Math.PI*2);ctx.stroke();
            }
            const iceAura=ctx.createRadialGradient(0,0,boss.r*0.3,0,0,boss.r+30);
            iceAura.addColorStop(0,'rgba(0,200,255,0.12)');iceAura.addColorStop(1,'transparent');
            ctx.fillStyle=iceAura;ctx.beginPath();ctx.arc(0,0,boss.r+30,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
            // Body — crystal/geometric (12-sided with sharp facets)
            ctx.rotate(T/700);
            ctx.shadowBlur=28;ctx.shadowColor=isCharge?'#ffff88':'#00ccff';
            const b2Body=ctx.createRadialGradient(-boss.r*0.2,-boss.r*0.2,0,0,0,boss.r);
            b2Body.addColorStop(0,'#0a1a2a');b2Body.addColorStop(0.5,'#061220');b2Body.addColorStop(1,'#030810');
            ctx.fillStyle=b2Body;ctx.strokeStyle=isCharge?'#ffff88':'#44ddff';ctx.lineWidth=2.5;
            ctx.beginPath();
            for(let i=0;i<12;i++){
                const r=i%3===0?boss.r:i%3===1?boss.r*0.82:boss.r*0.9;
                const a=(Math.PI*2/12)*i;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
            }
            ctx.closePath();ctx.fill();ctx.stroke();
            ctx.shadowBlur=0;
            // Crystal facet lines
            ctx.strokeStyle='rgba(68,220,255,0.15)';ctx.lineWidth=1;
            for(let i=0;i<6;i++){const a=(Math.PI*2/6)*i;
                ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*boss.r*0.8,Math.sin(a)*boss.r*0.8);ctx.stroke();}
            // Inner crystal
            ctx.strokeStyle='rgba(100,220,255,0.2)';ctx.lineWidth=1.5;
            ctx.beginPath();
            for(let i=0;i<6;i++){const a=(Math.PI*2/6)*i+Math.PI/6;ctx.lineTo(Math.cos(a)*boss.r*0.45,Math.sin(a)*boss.r*0.45);}
            ctx.closePath();ctx.stroke();
            // Frost shimmer highlights
            ctx.fillStyle='rgba(200,240,255,0.08)';
            ctx.beginPath();ctx.moveTo(0,-boss.r*0.6);ctx.lineTo(boss.r*0.3,-boss.r*0.1);ctx.lineTo(0,boss.r*0.2);ctx.lineTo(-boss.r*0.3,-boss.r*0.1);ctx.closePath();ctx.fill();
            // Ice core — cold blue layered
            const ic1=ctx.createRadialGradient(0,0,0,0,0,16);
            ic1.addColorStop(0,'#fff');ic1.addColorStop(0.3,'#aaeeff');ic1.addColorStop(0.6,'#44aaff');ic1.addColorStop(1,'transparent');
            ctx.fillStyle=ic1;ctx.beginPath();ctx.arc(0,0,16,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#ddeeff';ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();
        } else if(boss.type===4){
            // === BOSS 4 — CYBORG: Heavy war machine ===
            const isDashing=boss.state==='dash';
            const isTele=boss.state==='wall_telegraph'||boss.state==='dash_telegraph';
            const cybCol=isDashing?'#ffaa00':'#00ff88';
            const cybCol2=isDashing?'rgba(255,170,0,':'rgba(0,255,136,';
            // Electromagnetic field aura
            ctx.globalAlpha=0.05;
            const cybAura=ctx.createRadialGradient(0,0,boss.r*0.2,0,0,boss.r+35);
            cybAura.addColorStop(0,cybCol);cybAura.addColorStop(0.5,isDashing?'rgba(255,170,0,0.3)':'rgba(0,255,136,0.3)');cybAura.addColorStop(1,'transparent');
            ctx.fillStyle=cybAura;ctx.beginPath();ctx.arc(0,0,boss.r+35,0,Math.PI*2);ctx.fill();
            // Spinning hex grid aura
            ctx.globalAlpha=0.08;
            ctx.save();ctx.rotate(T/600);
            for(let r=boss.r+6;r<boss.r+30;r+=8){
                ctx.strokeStyle=cybCol;ctx.lineWidth=0.7;
                ctx.beginPath();for(let h=0;h<6;h++){const a=Math.PI*2/6*h;ctx.lineTo(Math.cos(a)*(r+Math.sin(T/300+r)*3),Math.sin(a)*(r+Math.sin(T/300+r)*3));}
                ctx.closePath();ctx.stroke();
            }
            ctx.restore();ctx.globalAlpha=1;
            // Outer hull — layered angular plates
            ctx.shadowBlur=30;ctx.shadowColor=cybCol;
            // Back plate (slightly larger, darker)
            const cybOuter=ctx.createRadialGradient(0,0,boss.r*0.3,0,0,boss.r*1.05);
            cybOuter.addColorStop(0,isDashing?'#0c0a00':'#040c06');cybOuter.addColorStop(1,isDashing?'#060500':'#020604');
            ctx.fillStyle=cybOuter;ctx.strokeStyle=cybCol2+'0.3)';ctx.lineWidth=1;
            ctx.beginPath();
            ctx.moveTo(0,-boss.r*1.05);ctx.lineTo(boss.r*0.75,-boss.r*0.35);
            ctx.lineTo(boss.r*1.05,0);ctx.lineTo(boss.r*0.75,boss.r*0.35);
            ctx.lineTo(0,boss.r*1.05);ctx.lineTo(-boss.r*0.75,boss.r*0.35);
            ctx.lineTo(-boss.r*1.05,0);ctx.lineTo(-boss.r*0.75,-boss.r*0.35);
            ctx.closePath();ctx.fill();ctx.stroke();
            // Main body
            const cybBody=ctx.createRadialGradient(0,-boss.r*0.15,0,0,0,boss.r);
            cybBody.addColorStop(0,isDashing?'#1c1600':'#0c1c12');cybBody.addColorStop(0.5,isDashing?'#100e00':'#061008');cybBody.addColorStop(1,isDashing?'#080600':'#030804');
            ctx.fillStyle=cybBody;ctx.strokeStyle=cybCol;ctx.lineWidth=2.5;
            ctx.beginPath();
            ctx.moveTo(0,-boss.r);ctx.lineTo(boss.r*0.7,-boss.r*0.3);
            ctx.lineTo(boss.r,0);ctx.lineTo(boss.r*0.7,boss.r*0.3);
            ctx.lineTo(0,boss.r);ctx.lineTo(-boss.r*0.7,boss.r*0.3);
            ctx.lineTo(-boss.r,0);ctx.lineTo(-boss.r*0.7,-boss.r*0.3);
            ctx.closePath();ctx.fill();ctx.stroke();
            ctx.shadowBlur=0;
            // Layered armor plates
            ctx.strokeStyle=cybCol2+'0.12)';ctx.lineWidth=1.5;
            ctx.beginPath();
            ctx.moveTo(0,-boss.r*0.7);ctx.lineTo(boss.r*0.5,-boss.r*0.15);
            ctx.lineTo(boss.r*0.5,boss.r*0.15);ctx.lineTo(0,boss.r*0.7);
            ctx.lineTo(-boss.r*0.5,boss.r*0.15);ctx.lineTo(-boss.r*0.5,-boss.r*0.15);ctx.closePath();ctx.stroke();
            // Shoulder weapon mounts
            ctx.fillStyle=cybCol2+'0.4)';
            ctx.fillRect(-boss.r*0.85,-boss.r*0.15,boss.r*0.2,boss.r*0.3);
            ctx.fillRect(boss.r*0.65,-boss.r*0.15,boss.r*0.2,boss.r*0.3);
            ctx.strokeStyle=cybCol;ctx.lineWidth=1;
            ctx.strokeRect(-boss.r*0.85,-boss.r*0.15,boss.r*0.2,boss.r*0.3);
            ctx.strokeRect(boss.r*0.65,-boss.r*0.15,boss.r*0.2,boss.r*0.3);
            // Circuit board pattern
            ctx.strokeStyle=cybCol2+'0.25)';ctx.lineWidth=0.8;
            ctx.beginPath();
            ctx.moveTo(-boss.r*0.4,-boss.r*0.5);ctx.lineTo(-boss.r*0.4,-boss.r*0.2);ctx.lineTo(0,-boss.r*0.2);
            ctx.moveTo(boss.r*0.4,-boss.r*0.5);ctx.lineTo(boss.r*0.4,-boss.r*0.2);ctx.lineTo(0,-boss.r*0.2);
            ctx.moveTo(-boss.r*0.3,boss.r*0.2);ctx.lineTo(-boss.r*0.3,boss.r*0.5);
            ctx.moveTo(boss.r*0.3,boss.r*0.2);ctx.lineTo(boss.r*0.3,boss.r*0.5);
            ctx.stroke();
            // Circuit nodes — blinking
            const nodePositions=[[-0.3,-0.5],[0.3,-0.5],[-0.3,0.5],[0.3,0.5],[0,-0.2],[-0.5,0],[0.5,0]];
            for(let ni=0;ni<nodePositions.length;ni++){
                const n=nodePositions[ni];
                const nBlink=Math.sin(T/300+ni*1.5)>0;
                ctx.fillStyle=nBlink?cybCol:cybCol2+'0.2)';
                ctx.beginPath();ctx.arc(boss.r*n[0],boss.r*n[1],2,0,Math.PI*2);ctx.fill();
            }
            // Central processor ring
            ctx.strokeStyle=cybCol2+'0.3)';ctx.lineWidth=1.5;
            ctx.beginPath();ctx.arc(0,0,boss.r*0.38,0,Math.PI*2);ctx.stroke();
            // Eye socket — deep recess
            const eyeY=-boss.r*0.12;
            ctx.fillStyle='#020202';ctx.beginPath();ctx.arc(0,eyeY,12,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle=cybCol2+'0.25)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,eyeY,12,0,Math.PI*2);ctx.stroke();
            // Cybernetic eye — multi-layered
            const eyeCol4=isTele?'#ffffff':(isDashing?'#ffaa00':'#ff0000');
            ctx.shadowBlur=30;ctx.shadowColor=eyeCol4;
            // Outer eye glow
            const eyeOG=ctx.createRadialGradient(0,eyeY,0,0,eyeY,10);
            eyeOG.addColorStop(0,eyeCol4);eyeOG.addColorStop(1,'transparent');
            ctx.globalAlpha=0.3;ctx.fillStyle=eyeOG;ctx.beginPath();ctx.arc(0,eyeY,10,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
            ctx.fillStyle=eyeCol4;ctx.beginPath();ctx.arc(0,eyeY,6,0,Math.PI*2);ctx.fill();
            ctx.fillStyle=isDashing?'#ffee88':'#ff8866';ctx.beginPath();ctx.arc(0,eyeY,3.5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,eyeY,1.5,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;
            // Scanning beam — wider, more menacing
            if(!isTele){
                const scanAngle=T/350;
                ctx.globalAlpha=0.06;ctx.fillStyle=eyeCol4;
                ctx.beginPath();ctx.moveTo(0,eyeY);
                ctx.lineTo(Math.cos(scanAngle)*boss.r*2.5,Math.sin(scanAngle)*boss.r*2.5+eyeY);
                ctx.lineTo(Math.cos(scanAngle+0.2)*boss.r*2.5,Math.sin(scanAngle+0.2)*boss.r*2.5+eyeY);
                ctx.closePath();ctx.fill();
                // Second fainter scan line
                ctx.globalAlpha=0.03;
                ctx.beginPath();ctx.moveTo(0,eyeY);
                ctx.lineTo(Math.cos(scanAngle+Math.PI)*boss.r*1.5,Math.sin(scanAngle+Math.PI)*boss.r*1.5+eyeY);
                ctx.lineTo(Math.cos(scanAngle+Math.PI+0.1)*boss.r*1.5,Math.sin(scanAngle+Math.PI+0.1)*boss.r*1.5+eyeY);
                ctx.closePath();ctx.fill();
                ctx.globalAlpha=1;
            }
            // Dash trail afterimage
            if(isDashing){
                ctx.globalAlpha=0.08;ctx.fillStyle='#ffaa00';
                ctx.beginPath();
                ctx.moveTo(-boss.r*1.5,0);ctx.lineTo(-boss.r*0.7,-boss.r*0.3);
                ctx.lineTo(-boss.r*0.7,boss.r*0.3);ctx.closePath();ctx.fill();
                ctx.globalAlpha=1;
            }
        } else if(boss.type===6){
            // === NIGHTMARE KING GRIMM — Red flame moth/bat entity ===
            const isDive=boss.state==='dive';
            const isDash=boss.state==='cape_dash'||boss.state==='flame_trail_dash';
            const isPuffer=boss.state==='pufferfish';
            const isUppercut=boss.state==='uppercut';
            const isSpiral=boss.state==='spiral_barrage';
            const isTele=boss.state==='dive_telegraph'||boss.state==='cape_dash_telegraph'||boss.state==='pufferfish_telegraph'||boss.state==='uppercut_telegraph'||boss.state==='ground_pound_telegraph';
            const grimmP2=boss.phase2;
            const grimmP3=boss.phase3;
            const gPulse=0.6+Math.sin(T/(grimmP3?80:120))*0.4;

            // --- Flame aura (intensifies in phase 2/3) ---
            ctx.globalAlpha=grimmP3?0.18:grimmP2?0.12:0.07;
            for(let fr=boss.r+5;fr<boss.r+(grimmP3?65:grimmP2?50:35);fr+=6){
                const fWave=fr+Math.sin(T/150+fr*0.3)*6+Math.cos(T/120+fr*0.5)*4;
                ctx.strokeStyle=grimmP3?'#ffaa00':grimmP2?'#ff2200':'#cc1100';ctx.lineWidth=1.5;
                ctx.beginPath();ctx.arc(0,0,fWave,0,Math.PI*2);ctx.stroke();
            }
            const auraR=boss.r+(grimmP3?65:grimmP2?50:35);
            const grimmAura=ctx.createRadialGradient(0,0,boss.r*0.2,0,0,auraR);
            grimmAura.addColorStop(0,grimmP3?'rgba(255,100,0,0.3)':grimmP2?'rgba(255,50,0,0.2)':'rgba(200,0,0,0.12)');
            grimmAura.addColorStop(0.5,grimmP3?'rgba(255,50,0,0.15)':grimmP2?'rgba(255,0,0,0.1)':'rgba(150,0,0,0.06)');
            grimmAura.addColorStop(1,'transparent');
            ctx.fillStyle=grimmAura;ctx.beginPath();ctx.arc(0,0,auraR,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;

            // --- Cape / Wings (drawn behind body) ---
            ctx.save();
            const capeSpread=isDash?0.2:(isPuffer?1.2:(isSpiral?0.9+Math.sin(T/60)*0.2:(isTele?0.4:0.7+Math.sin(T/300)*0.15)));
            ctx.shadowBlur=grimmP3?40:grimmP2?30:18;ctx.shadowColor=grimmP3?'#ff4400':grimmP2?'#ff2200':'#990000';
            // Left wing
            ctx.fillStyle=grimmP3?'#3a0500':grimmP2?'#2a0000':'#1a0000';ctx.strokeStyle=grimmP3?'#ff6600':grimmP2?'#ff3300':'#cc1100';ctx.lineWidth=grimmP3?2.5:2;
            ctx.beginPath();
            ctx.moveTo(-5,0);
            ctx.quadraticCurveTo(-boss.r*0.8*capeSpread,-boss.r*0.6,  -boss.r*1.4*capeSpread,-boss.r*0.2);
            ctx.quadraticCurveTo(-boss.r*1.6*capeSpread,boss.r*0.3,  -boss.r*1.2*capeSpread,boss.r*0.9);
            ctx.quadraticCurveTo(-boss.r*0.8*capeSpread,boss.r*1.1,  -boss.r*0.3,boss.r*0.7);
            ctx.lineTo(-5,boss.r*0.3);
            ctx.closePath();ctx.fill();ctx.stroke();
            // Wing membrane veins
            ctx.strokeStyle=grimmP3?'rgba(255,120,0,0.35)':grimmP2?'rgba(255,80,0,0.25)':'rgba(200,30,0,0.15)';ctx.lineWidth=grimmP3?1.5:1;
            ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-boss.r*1.1*capeSpread,-boss.r*0.1);ctx.stroke();
            ctx.beginPath();ctx.moveTo(-8,boss.r*0.1);ctx.lineTo(-boss.r*capeSpread,boss.r*0.5);ctx.stroke();
            ctx.beginPath();ctx.moveTo(-6,boss.r*0.2);ctx.lineTo(-boss.r*0.7*capeSpread,boss.r*0.8);ctx.stroke();
            // Phase 3: wing edge flame particles
            if(grimmP3&&Math.random()<0.3){
                ctx.fillStyle='#ff6600';ctx.globalAlpha=0.5;
                ctx.beginPath();ctx.arc(-boss.r*capeSpread+(Math.random()-0.5)*10,boss.r*0.3+(Math.random()-0.5)*20,2+Math.random()*2,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=1;
            }
            // Right wing
            ctx.fillStyle=grimmP3?'#3a0500':grimmP2?'#2a0000':'#1a0000';ctx.strokeStyle=grimmP3?'#ff6600':grimmP2?'#ff3300':'#cc1100';ctx.lineWidth=grimmP3?2.5:2;
            ctx.beginPath();
            ctx.moveTo(5,0);
            ctx.quadraticCurveTo(boss.r*0.8*capeSpread,-boss.r*0.6,  boss.r*1.4*capeSpread,-boss.r*0.2);
            ctx.quadraticCurveTo(boss.r*1.6*capeSpread,boss.r*0.3,  boss.r*1.2*capeSpread,boss.r*0.9);
            ctx.quadraticCurveTo(boss.r*0.8*capeSpread,boss.r*1.1,  boss.r*0.3,boss.r*0.7);
            ctx.lineTo(5,boss.r*0.3);
            ctx.closePath();ctx.fill();ctx.stroke();
            // Right wing veins
            ctx.strokeStyle=grimmP3?'rgba(255,120,0,0.35)':grimmP2?'rgba(255,80,0,0.25)':'rgba(200,30,0,0.15)';ctx.lineWidth=grimmP3?1.5:1;
            ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(boss.r*1.1*capeSpread,-boss.r*0.1);ctx.stroke();
            ctx.beginPath();ctx.moveTo(8,boss.r*0.1);ctx.lineTo(boss.r*capeSpread,boss.r*0.5);ctx.stroke();
            ctx.beginPath();ctx.moveTo(6,boss.r*0.2);ctx.lineTo(boss.r*0.7*capeSpread,boss.r*0.8);ctx.stroke();
            ctx.shadowBlur=0;
            ctx.restore();

            // --- Body (central tall form) ---
            ctx.shadowBlur=grimmP3?35:25;ctx.shadowColor=grimmP3?'#ff4400':grimmP2?'#ff2200':'#aa0000';
            const bodyG=ctx.createRadialGradient(0,-boss.r*0.1,0,0,0,boss.r*0.7);
            bodyG.addColorStop(0,grimmP3?'#4a0a0a':grimmP2?'#3a0808':'#2a0505');bodyG.addColorStop(0.6,grimmP3?'#280404':grimmP2?'#1e0303':'#150202');bodyG.addColorStop(1,grimmP3?'#140101':grimmP2?'#0c0101':'#080000');
            ctx.fillStyle=bodyG;ctx.strokeStyle=grimmP3?'#ff4400':grimmP2?'#ff2200':'#cc0000';ctx.lineWidth=grimmP3?3:2.5;
            ctx.beginPath();
            // Horned crown top
            ctx.moveTo(0,-boss.r*1.2);
            ctx.lineTo(-boss.r*0.15,-boss.r*0.7);
            ctx.lineTo(-boss.r*0.35,-boss.r*1.05); // left horn
            ctx.lineTo(-boss.r*0.25,-boss.r*0.5);
            ctx.lineTo(-boss.r*0.45,-boss.r*0.6); // outer left horn
            ctx.lineTo(-boss.r*0.3,-boss.r*0.2);
            // Body sides
            ctx.lineTo(-boss.r*0.4,0);
            ctx.lineTo(-boss.r*0.35,boss.r*0.4);
            ctx.lineTo(-boss.r*0.15,boss.r*0.7);
            // Bottom cloak
            ctx.lineTo(0,boss.r*0.8);
            ctx.lineTo(boss.r*0.15,boss.r*0.7);
            ctx.lineTo(boss.r*0.35,boss.r*0.4);
            ctx.lineTo(boss.r*0.4,0);
            // Right horns
            ctx.lineTo(boss.r*0.3,-boss.r*0.2);
            ctx.lineTo(boss.r*0.45,-boss.r*0.6); // outer right horn
            ctx.lineTo(boss.r*0.25,-boss.r*0.5);
            ctx.lineTo(boss.r*0.35,-boss.r*1.05); // right horn
            ctx.lineTo(boss.r*0.15,-boss.r*0.7);
            ctx.closePath();ctx.fill();ctx.stroke();
            ctx.shadowBlur=0;

            // --- Horn flame tips ---
            const flameFlicker=Math.sin(T/(grimmP3?40:60))*3;
            const hornSize=grimmP3?6:4;
            ctx.fillStyle=grimmP3?'#ffaa00':grimmP2?'#ff6600':'#ff2200';ctx.shadowBlur=grimmP3?25:15;ctx.shadowColor=grimmP3?'#ffcc00':'#ff4400';
            // Left outer horn flame
            ctx.beginPath();ctx.arc(-boss.r*0.45,-boss.r*0.6+flameFlicker,hornSize+gPulse*2,0,Math.PI*2);ctx.fill();
            // Right outer horn flame
            ctx.beginPath();ctx.arc(boss.r*0.45,-boss.r*0.6+flameFlicker,hornSize+gPulse*2,0,Math.PI*2);ctx.fill();
            // Center horn flame (larger)
            ctx.fillStyle=grimmP3?'#ffffff':grimmP2?'#ffcc00':'#ff4400';
            ctx.beginPath();ctx.arc(0,-boss.r*1.2+flameFlicker,(grimmP3?8:5)+gPulse*2,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,-boss.r*1.2+flameFlicker,grimmP3?3:2,0,Math.PI*2);ctx.fill();
            // Phase 3: flame drips from horns
            if(grimmP3&&Math.random()<0.4){
                ctx.fillStyle='#ff4400';ctx.globalAlpha=0.6;
                const hx=(Math.random()>0.5?-1:1)*boss.r*0.45;
                ctx.beginPath();ctx.arc(hx+(Math.random()-0.5)*6,-boss.r*0.6+Math.random()*20,1.5+Math.random(),0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=1;
            }
            ctx.shadowBlur=0;

            // --- Chest emblem (scarlet flame symbol) ---
            ctx.strokeStyle=grimmP2?`rgba(255,100,0,${gPulse})`:`rgba(255,30,0,${gPulse*0.7})`;ctx.lineWidth=2;
            ctx.shadowBlur=10;ctx.shadowColor=grimmP2?'#ff4400':'#cc0000';
            ctx.beginPath();
            ctx.moveTo(0,-boss.r*0.15);
            ctx.quadraticCurveTo(-12,boss.r*0.05,-8,boss.r*0.25);
            ctx.quadraticCurveTo(0,boss.r*0.4,8,boss.r*0.25);
            ctx.quadraticCurveTo(12,boss.r*0.05,0,-boss.r*0.15);
            ctx.stroke();
            // Inner flame core
            ctx.fillStyle=grimmP2?`rgba(255,80,0,${gPulse*0.5})`:`rgba(200,0,0,${gPulse*0.3})`;
            ctx.fill();
            ctx.shadowBlur=0;

            // --- Eyes (fierce glowing red) ---
            // Eye sockets
            ctx.fillStyle='#000';
            ctx.beginPath();ctx.ellipse(-10,-boss.r*0.35,7,9,0,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.ellipse(10,-boss.r*0.35,7,9,0,0,Math.PI*2);ctx.fill();
            // Glowing eyes — multi-layered fire
            const eyeInt=grimmP3?(0.8+Math.sin(T/25)*0.2):grimmP2?(0.7+Math.sin(T/40)*0.3):(0.5+Math.sin(T/80)*0.5);
            ctx.shadowBlur=grimmP3?35:grimmP2?25:15;ctx.shadowColor=grimmP3?'#ffaa00':grimmP2?'#ff4400':'#ff0000';
            ctx.fillStyle=grimmP3?`rgba(255,100,0,${eyeInt})`:`rgba(255,0,0,${eyeInt})`;
            ctx.beginPath();ctx.ellipse(-10,-boss.r*0.35,4+eyeInt,6+eyeInt,0,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.ellipse(10,-boss.r*0.35,4+eyeInt,6+eyeInt,0,0,Math.PI*2);ctx.fill();
            ctx.fillStyle=grimmP3?'#ffcc00':grimmP2?'#ffaa00':'#ff4400';
            ctx.beginPath();ctx.ellipse(-10,-boss.r*0.35,2.5,4,0,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.ellipse(10,-boss.r*0.35,2.5,4,0,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';
            ctx.beginPath();ctx.arc(-10,-boss.r*0.35,1.5,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.arc(10,-boss.r*0.35,1.5,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;

            // --- Dive/dash trail effects ---
            if(isDive){
                ctx.globalAlpha=grimmP3?0.25:0.15;ctx.fillStyle=grimmP3?'#ff4400':'#ff2200';
                ctx.beginPath();ctx.moveTo(-boss.r*0.3,-boss.r*1.5);ctx.lineTo(boss.r*0.3,-boss.r*1.5);ctx.lineTo(0,-boss.r*0.5);ctx.closePath();ctx.fill();
                ctx.globalAlpha=1;
            }
            if(isDash){
                ctx.globalAlpha=grimmP3?0.2:0.12;ctx.fillStyle=grimmP3?'#ff4400':'#ff0000';
                const trail=boss.dx>0?-1:1;
                ctx.beginPath();ctx.moveTo(trail*boss.r*1.5,0);ctx.lineTo(trail*boss.r*0.5,-boss.r*0.4);ctx.lineTo(trail*boss.r*0.5,boss.r*0.4);ctx.closePath();ctx.fill();
                ctx.globalAlpha=1;
            }
            // Uppercut rising trail
            if(isUppercut){
                ctx.globalAlpha=0.18;ctx.fillStyle='#ff4400';
                ctx.beginPath();ctx.moveTo(-boss.r*0.3,boss.r*1.5);ctx.lineTo(boss.r*0.3,boss.r*1.5);ctx.lineTo(0,boss.r*0.3);ctx.closePath();ctx.fill();
                ctx.globalAlpha=1;
            }
            // Spiral barrage rotation visual
            if(isSpiral){
                ctx.globalAlpha=0.1;
                ctx.save();ctx.rotate(boss.timer*(grimmP3?0.18:0.12));
                for(let arm=0;arm<(grimmP3?3:2);arm++){
                    ctx.rotate(Math.PI*2/(grimmP3?3:2));
                    ctx.strokeStyle='#ff6600';ctx.lineWidth=3;
                    ctx.beginPath();ctx.moveTo(0,0);
                    for(let d=0;d<boss.r*2;d+=5){
                        const sa=d*0.08;
                        ctx.lineTo(Math.cos(sa)*d,Math.sin(sa)*d);
                    }
                    ctx.stroke();
                }
                ctx.restore();
                ctx.globalAlpha=1;
            }
            // Pufferfish expanding glow
            if(isPuffer){
                const puffR=boss.r+(grimmP3?30:20)+Math.sin(T/50)*(grimmP3?20:15);
                ctx.globalAlpha=grimmP3?0.22:0.15;
                const puffG=ctx.createRadialGradient(0,0,boss.r*0.5,0,0,puffR);
                puffG.addColorStop(0,grimmP3?'#ff6600':'#ff4400');puffG.addColorStop(1,'transparent');
                ctx.fillStyle=puffG;ctx.beginPath();ctx.arc(0,0,puffR,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=1;
            }
            // Phase 3: constant ambient flame particles around boss
            if(grimmP3){
                for(let fp=0;fp<3;fp++){
                    const fa=Math.random()*Math.PI*2;
                    const fd=boss.r*0.5+Math.random()*boss.r*0.8;
                    ctx.globalAlpha=0.3+Math.random()*0.3;
                    ctx.fillStyle=Math.random()>0.5?'#ff4400':'#ffaa00';
                    ctx.beginPath();ctx.arc(Math.cos(fa)*fd,Math.sin(fa)*fd,1.5+Math.random()*2,0,Math.PI*2);ctx.fill();
                }
                ctx.globalAlpha=1;
            }

            // --- Draw flame pillars (separate from boss translate) ---
            ctx.restore(); // undo boss translate temporarily
            for(const fp of boss.flamePillars){
                const progress=fp.timer<40?(fp.timer/40):(fp.timer<100?1:1-(fp.timer-100)/30);
                if(progress<=0) continue;
                ctx.save();ctx.translate(fp.x,fp.y);
                // Warning line before pillar activates
                if(fp.timer<40){
                    ctx.strokeStyle=`rgba(255,50,0,${(fp.timer/40)*0.6})`;ctx.lineWidth=2+fp.timer/20;
                    ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-fp.h*progress);ctx.stroke();ctx.setLineDash([]);
                } else {
                    // Active flame pillar
                    const intensity=progress;
                    // Outer glow
                    const pillarG=ctx.createLinearGradient(0,0,0,-fp.h);
                    pillarG.addColorStop(0,`rgba(255,80,0,${intensity*0.6})`);
                    pillarG.addColorStop(0.3,`rgba(255,30,0,${intensity*0.8})`);
                    pillarG.addColorStop(0.7,`rgba(200,0,0,${intensity*0.5})`);
                    pillarG.addColorStop(1,'transparent');
                    ctx.fillStyle=pillarG;
                    ctx.fillRect(-12,0,24,-fp.h);
                    // Core
                    const coreG=ctx.createLinearGradient(0,0,0,-fp.h);
                    coreG.addColorStop(0,`rgba(255,200,50,${intensity})`);
                    coreG.addColorStop(0.5,`rgba(255,100,0,${intensity*0.8})`);
                    coreG.addColorStop(1,'transparent');
                    ctx.fillStyle=coreG;ctx.fillRect(-5,0,10,-fp.h*0.9);
                    // White-hot center
                    ctx.fillStyle=`rgba(255,255,200,${intensity*0.7})`;ctx.fillRect(-2,0,4,-fp.h*0.7);
                    // Sparks
                    for(let s=0;s<3;s++){
                        const sy=-Math.random()*fp.h*0.8;
                        const sx=(Math.random()-0.5)*20;
                        ctx.fillStyle=`rgba(255,${150+Math.random()*100},0,${intensity*Math.random()})`;
                        ctx.beginPath();ctx.arc(sx,sy,1.5+Math.random(),0,Math.PI*2);ctx.fill();
                    }
                }
                ctx.restore();
            }

            // --- Draw fire trail (ground hazards) ---
            for(const ft of boss.fireTrail){
                const ftAlpha=Math.min(1,ft.life/60)*0.6;
                ctx.save();ctx.translate(ft.x,ft.y);
                ctx.globalAlpha=ftAlpha;
                const ftG=ctx.createRadialGradient(0,0,0,0,0,ft.r);
                ftG.addColorStop(0,'rgba(255,200,50,0.8)');ftG.addColorStop(0.3,'rgba(255,80,0,0.6)');ftG.addColorStop(0.7,'rgba(200,0,0,0.3)');ftG.addColorStop(1,'transparent');
                ctx.fillStyle=ftG;ctx.beginPath();ctx.arc(0,0,ft.r,0,Math.PI*2);ctx.fill();
                // Flickering core
                if(Math.random()<0.5){
                    ctx.fillStyle=`rgba(255,255,150,${ftAlpha*0.5})`;
                    ctx.beginPath();ctx.arc((Math.random()-0.5)*4,(Math.random()-0.5)*4,ft.r*0.3,0,Math.PI*2);ctx.fill();
                }
                ctx.globalAlpha=1;ctx.restore();
            }

            // --- Draw bat projectiles ---
            for(const bp of boss.batProjectiles){
                ctx.save();ctx.translate(bp.x,bp.y);
                const batAngle=Math.atan2(bp.dy,bp.dx);
                ctx.rotate(batAngle);
                // Flame trail
                ctx.globalAlpha=0.3;
                const trailG=ctx.createRadialGradient(-6,0,1,-6,0,bp.homing?14:10);
                trailG.addColorStop(0,bp.homing?'#ffaa00':'#ff4400');trailG.addColorStop(1,'transparent');
                ctx.fillStyle=trailG;ctx.beginPath();ctx.arc(-6,0,bp.homing?14:10,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=1;
                // Bat body — homing bats glow orange/gold
                ctx.fillStyle=bp.homing?'#ffaa00':(grimmP3?'#ff3300':grimmP2?'#ff2200':'#cc0000');
                ctx.shadowBlur=bp.homing?12:8;ctx.shadowColor=bp.homing?'#ffcc00':'#ff4400';
                ctx.beginPath();
                ctx.moveTo(8,0);
                ctx.lineTo(3,-3);ctx.lineTo(-2,-7);ctx.lineTo(-6,-5);
                ctx.lineTo(-8,0);
                ctx.lineTo(-6,5);ctx.lineTo(-2,7);ctx.lineTo(3,3);
                ctx.closePath();ctx.fill();
                // Eyes
                ctx.fillStyle=bp.homing?'#fff':'#ffcc00';
                ctx.beginPath();ctx.arc(4,-1.5,1.5,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(4,1.5,1.5,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
                ctx.restore();
            }
            ctx.save();ctx.translate(boss.x,boss.y); // re-enter boss translate for the restore at end
        } else if(boss.type===7){
            // ========== NEXUS-0 DRAWING ==========
            const nx7=boss;
            const nxP=nx7.phase3?3:nx7.phase2?2:1;
            const nxPulse=0.5+Math.sin(T/100)*0.3;
            const nxPurging=nx7.purging;
            const hpPct7=nx7.hp/nx7.maxHp;

            // --- Background grid overlay (drawn in world space) ---
            ctx.restore(); // exit boss translate
            ctx.globalAlpha=nxPurging?0.04:0.06;
            ctx.strokeStyle=nxPurging?'#ff2222':'#00aaff';ctx.lineWidth=0.5;
            const gridSpace=60;
            for(let gx=0;gx<W;gx+=gridSpace){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
            for(let gy=0;gy<H;gy+=gridSpace){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
            ctx.globalAlpha=1;

            // --- Grid cage lines ---
            for(const gl of nx7.gridLines){
                const prog=gl.timer<40?(gl.timer/40):(gl.timer>gl.duration-20?(gl.duration-gl.timer)/20:1);
                if(prog<=0) continue;
                ctx.save();
                // Warning phase
                if(gl.timer<40){
                    ctx.strokeStyle=`rgba(0,200,255,${prog*0.5})`;ctx.lineWidth=1;
                    ctx.setLineDash([10,10]);
                } else {
                    ctx.strokeStyle=`rgba(0,220,255,${prog*0.9})`;ctx.lineWidth=3;
                    ctx.shadowBlur=15;ctx.shadowColor='#00ccff';
                    ctx.setLineDash([]);
                }
                ctx.beginPath();ctx.moveTo(gl.x1,gl.y1);ctx.lineTo(gl.x2,gl.y2);ctx.stroke();
                // Inner bright line
                if(gl.timer>=40){
                    ctx.strokeStyle=`rgba(200,240,255,${prog*0.6})`;ctx.lineWidth=1;
                    ctx.beginPath();ctx.moveTo(gl.x1,gl.y1);ctx.lineTo(gl.x2,gl.y2);ctx.stroke();
                }
                ctx.shadowBlur=0;ctx.setLineDash([]);ctx.restore();
            }

            // --- Scan beam ---
            if(nx7.scanBeam.active){
                const ba=nx7.scanBeam.angle;
                const beamLen=Math.max(W,H)*1.5;
                const warmProg=Math.min(1,nx7.scanBeam.warming/50);
                // Warning line
                ctx.strokeStyle=`rgba(0,200,255,${warmProg*0.3})`;ctx.lineWidth=1;ctx.setLineDash([8,8]);
                ctx.beginPath();ctx.moveTo(nx7.x,nx7.y);
                ctx.lineTo(nx7.x+Math.cos(ba)*beamLen,nx7.y+Math.sin(ba)*beamLen);ctx.stroke();ctx.setLineDash([]);
                // Active beam
                if(warmProg>=1){
                    ctx.save();ctx.translate(nx7.x,nx7.y);ctx.rotate(ba);
                    ctx.fillStyle='rgba(0,50,80,0.2)';ctx.fillRect(0,-30,beamLen,60);
                    ctx.shadowBlur=30;ctx.shadowColor='#00ccff';
                    ctx.fillStyle=`rgba(0,180,255,0.5)`;ctx.fillRect(0,-12,beamLen,24);
                    ctx.fillStyle=`rgba(150,230,255,0.7)`;ctx.fillRect(0,-5,beamLen,10);
                    ctx.fillStyle=`rgba(255,255,255,0.8)`;ctx.fillRect(0,-2,beamLen,4);
                    ctx.shadowBlur=0;ctx.restore();
                }
            }

            // --- Predictive aim reticle ---
            if(nx7.predictAim.show&&!nxPurging){
                const px=nx7.predictAim.x,py=nx7.predictAim.y;
                ctx.strokeStyle=`rgba(255,100,100,${0.3+nxPulse*0.3})`;ctx.lineWidth=1.5;
                ctx.setLineDash([4,4]);
                ctx.beginPath();ctx.arc(px,py,18+Math.sin(T/80)*4,0,Math.PI*2);ctx.stroke();
                ctx.setLineDash([]);
                // Crosshair
                ctx.strokeStyle=`rgba(255,100,100,${0.4+nxPulse*0.2})`;ctx.lineWidth=1;
                ctx.beginPath();ctx.moveTo(px-10,py);ctx.lineTo(px+10,py);ctx.moveTo(px,py-10);ctx.lineTo(px,py+10);ctx.stroke();
                // Line from boss to target
                ctx.strokeStyle='rgba(255,80,80,0.1)';ctx.lineWidth=1;
                ctx.beginPath();ctx.moveTo(nx7.x,nx7.y);ctx.lineTo(px,py);ctx.stroke();
            }

            // --- Clones ---
            for(const cl of nx7.clones){
                ctx.save();ctx.translate(cl.x,cl.y);
                ctx.globalAlpha=0.4+Math.sin(T/100+cl.x)*0.15;
                // Clone body — semi-transparent icosahedron
                ctx.strokeStyle='#00aaff';ctx.lineWidth=1.5;ctx.fillStyle='rgba(0,40,60,0.3)';
                ctx.beginPath();
                for(let i=0;i<8;i++){
                    const a=(Math.PI*2/8)*i+T/500;
                    const r=cl.r*(i%2===0?1:0.75);
                    i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
                }
                ctx.closePath();ctx.fill();ctx.stroke();
                // Clone eye
                ctx.fillStyle='rgba(0,200,255,0.5)';
                ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=1;ctx.restore();
            }

            // --- Rewrite visual overlay ---
            if(nx7.rewriting){
                const rwAlpha=0.08+Math.sin(T/30)*0.04;
                ctx.fillStyle=`rgba(255,0,0,${rwAlpha})`;ctx.fillRect(0,0,W,H);
                // Static noise
                ctx.globalAlpha=0.15;
                for(let si=0;si<40;si++){
                    ctx.fillStyle=Math.random()>0.5?'#ff0000':'#000';
                    ctx.fillRect(Math.random()*W,Math.random()*H,Math.random()*30+5,2);
                }
                ctx.globalAlpha=1;
                // Warning text
                ctx.fillStyle=`rgba(255,50,50,${0.5+Math.sin(T/50)*0.3})`;
                ctx.font='bold 20px Courier New';ctx.textAlign='center';
                ctx.fillText('// CONTROLS REWRITTEN //',W/2,40);
            }

            // --- Purge cinematic effects ---
            if(nxPurging){
                const pProg=Math.min(1,nx7.purgeTimer/2800);

                // Screen darkening vignette — intensifies over time
                ctx.globalAlpha=0.15+pProg*0.35;
                ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
                ctx.globalAlpha=1;

                // Red danger vignette at edges
                const dangerVig=ctx.createRadialGradient(W/2,H/2,W*0.2,W/2,H/2,W*0.8);
                dangerVig.addColorStop(0,'transparent');
                dangerVig.addColorStop(1,`rgba(80,0,0,${0.1+pProg*0.3})`);
                ctx.fillStyle=dangerVig;ctx.fillRect(0,0,W,H);

                // Glitch scanlines — more intense as purge progresses
                if(Math.random()<pProg*0.4){
                    ctx.globalAlpha=0.05+pProg*0.1;
                    const glitchY=Math.random()*H;
                    const glitchH=2+Math.random()*6;
                    ctx.fillStyle=Math.random()>0.5?'#ff0000':'#00ffff';
                    ctx.fillRect(0,glitchY,W,glitchH);
                    // Horizontal shift glitch
                    if(Math.random()<0.3){
                        const shift=(Math.random()-0.5)*20*pProg;
                        ctx.drawImage(canvas,0,glitchY,W,glitchH,shift,glitchY,W,glitchH);
                    }
                    ctx.globalAlpha=1;
                }

                // Purge beams from offscreen — more beams, more dramatic over time
                if(nx7.purgeTimer>200){
                    const beamCount=Math.min(6,1+Math.floor(pProg*5));
                    for(let bi=0;bi<beamCount;bi++){
                        const seed=bi*137+nx7.purgeTimer*0.008;
                        const bx=nx7.x+(Math.sin(seed)*15);
                        const by=nx7.y+(Math.cos(seed*1.3)*15);
                        const fromAngle=Math.PI*2/beamCount*bi+Math.sin(T/200+bi)*0.4;
                        const fx=bx-Math.cos(fromAngle)*900;
                        const fy=by-Math.sin(fromAngle)*900;
                        const beamAlpha=0.2+pProg*0.4+Math.sin(T/60+bi)*0.15;
                        // Outer glow beam
                        ctx.strokeStyle=`rgba(255,20,20,${beamAlpha*0.3})`;
                        ctx.lineWidth=12+pProg*8;ctx.shadowBlur=40;ctx.shadowColor='#ff0000';
                        ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(bx,by);ctx.stroke();
                        // Main beam
                        ctx.strokeStyle=`rgba(255,50,30,${beamAlpha})`;
                        ctx.lineWidth=3+pProg*3;
                        ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(bx,by);ctx.stroke();
                        // Core beam
                        ctx.strokeStyle=`rgba(255,180,150,${beamAlpha*0.7})`;
                        ctx.lineWidth=1+pProg;
                        ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(bx,by);ctx.stroke();
                        ctx.shadowBlur=0;
                        // Impact sparks at boss
                        if(Math.random()<0.15){
                            ctx.fillStyle='#ff6644';
                            ctx.beginPath();ctx.arc(bx+(Math.random()-0.5)*10,by+(Math.random()-0.5)*10,2+Math.random()*2,0,Math.PI*2);ctx.fill();
                        }
                    }
                }

                // Floating debris/data fragments dissolving away
                if(nx7.purgeTimer%12===0&&nx7.purgeTimer<2750){
                    const da=Math.random()*Math.PI*2;
                    const dd=nx7.r*0.3+Math.random()*nx7.r*0.8;
                    particles.push({x:nx7.x+Math.cos(da)*dd,y:nx7.y+Math.sin(da)*dd,
                        dx:(Math.random()-0.5)*2,dy:-1-Math.random()*2,
                        life:30+Math.random()*20,maxLife:50,color:Math.random()>0.6?'#ff4444':'#00aaff',size:2+Math.random()*2});
                }
            }

            // --- Purge terminal messages ---
            if(G.nexusPurgeMessages.length>0){
                // Dark backdrop behind text for readability
                ctx.fillStyle='rgba(0,0,0,0.5)';
                ctx.fillRect(15,25,W*0.7,Math.min(G.nexusPurgeMessages.length,7)*28+20);

                ctx.font='bold 16px Courier New';ctx.textAlign='left';
                const visible=G.nexusPurgeMessages.slice(-7);
                for(let mi=0;mi<visible.length;mi++){
                    const m=visible[mi];
                    // Fade in smoothly, older messages dim
                    const fadeIn=Math.min(1,m.age/30);
                    const dimFactor=mi===visible.length-1?1:(0.5+0.5*(mi/visible.length));
                    const alpha=fadeIn*dimFactor;

                    // Sys messages glow red, NEXUS messages glow cyan
                    if(m.src==='sys'){
                        ctx.shadowBlur=8;ctx.shadowColor='#ff0000';
                        ctx.fillStyle=`rgba(255,60,40,${alpha})`;
                    } else {
                        ctx.shadowBlur=6;ctx.shadowColor='#00aaff';
                        ctx.fillStyle=`rgba(0,220,255,${alpha})`;
                    }
                    ctx.fillText(m.text,30,55+mi*28);

                    // Typewriter cursor on newest message
                    if(mi===visible.length-1&&m.age<40){
                        const cursorBlink=Math.sin(m.age*0.3)>0;
                        if(cursorBlink){
                            const tw=ctx.measureText(m.text).width;
                            ctx.fillRect(32+tw,42+mi*28,10,18);
                        }
                    }
                }
                ctx.shadowBlur=0;
            }

            // --- Data nodes ---
            for(const nd of nx7.dataNodes){
                ctx.save();ctx.translate(nd.x,nd.y);
                if(nd.dying){
                    ctx.globalAlpha=nd.dieTimer/15;
                }
                ctx.rotate(T/300+nd.orbitAngle);
                // Tetrahedron shape
                ctx.fillStyle='rgba(0,40,60,0.7)';ctx.strokeStyle='#00ccff';ctx.lineWidth=1.5;
                ctx.shadowBlur=10;ctx.shadowColor='#00aaff';
                ctx.beginPath();
                ctx.moveTo(0,-nd.r);ctx.lineTo(nd.r*0.87,nd.r*0.5);ctx.lineTo(-nd.r*0.87,nd.r*0.5);
                ctx.closePath();ctx.fill();ctx.stroke();
                ctx.shadowBlur=0;
                // Core dot
                ctx.fillStyle='#00ffff';ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=1;ctx.restore();
            }

            // --- NEXUS-0 body (in boss translate) ---
            ctx.save();ctx.translate(nx7.x,nx7.y);

            // Holographic grid aura
            ctx.globalAlpha=nxPurging?0.02:0.04;
            ctx.save();ctx.rotate(T/800);
            for(let gr=nx7.r+10;gr<nx7.r+40;gr+=10){
                ctx.strokeStyle=nxPurging?'#ff2222':'#00aaff';ctx.lineWidth=0.5;
                ctx.beginPath();
                for(let i=0;i<6;i++){const a=Math.PI*2/6*i;ctx.lineTo(Math.cos(a)*gr,Math.sin(a)*gr);}
                ctx.closePath();ctx.stroke();
            }
            ctx.restore();ctx.globalAlpha=1;

            // Shell panels (intact ones)
            for(const p of nx7.panels){
                if(!p.intact&&!nxPurging) continue;
                if(!p.intact){
                    // Drifting away during purge
                    p.drift+=0.3;
                    const px2=Math.cos(p.angle)*(p.dist+p.drift*5)+Math.cos(p.driftAngle)*p.drift*2;
                    const py2=Math.sin(p.angle)*(p.dist+p.drift*5)+Math.sin(p.driftAngle)*p.drift*2;
                    ctx.globalAlpha=Math.max(0,1-p.drift/40);
                    ctx.fillStyle='#0a1520';ctx.strokeStyle=nxPurging?'#ff222266':'#00668866';ctx.lineWidth=1;
                    ctx.beginPath();ctx.arc(px2,py2,p.size*0.3,0,Math.PI*2);ctx.fill();ctx.stroke();
                    ctx.globalAlpha=1;
                    continue;
                }
                const px2=Math.cos(p.angle)*p.dist;
                const py2=Math.sin(p.angle)*p.dist;
                ctx.save();ctx.translate(px2,py2);ctx.rotate(p.angle+Math.PI/2);
                // Panel shape
                const panelCol=p.cracked?(nxP>=3?'#0a1a28':'#0a1822'):'#0c2030';
                ctx.fillStyle=panelCol;
                ctx.strokeStyle=p.cracked?`rgba(0,150,200,${0.3+nxPulse*0.2})`:`rgba(0,180,255,${0.5+nxPulse*0.2})`;
                ctx.lineWidth=p.cracked?1:1.5;
                ctx.beginPath();
                ctx.moveTo(-p.size*0.4,-p.size*0.3);ctx.lineTo(p.size*0.4,-p.size*0.3);
                ctx.lineTo(p.size*0.3,p.size*0.3);ctx.lineTo(-p.size*0.3,p.size*0.3);
                ctx.closePath();ctx.fill();ctx.stroke();
                // Circuit lines on panel
                if(!p.cracked){
                    ctx.strokeStyle='rgba(0,200,255,0.15)';ctx.lineWidth=0.5;
                    ctx.beginPath();ctx.moveTo(-p.size*0.2,0);ctx.lineTo(p.size*0.2,0);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(0,-p.size*0.15);ctx.lineTo(0,p.size*0.15);ctx.stroke();
                }
                // Crack effect
                if(p.cracked){
                    ctx.strokeStyle='rgba(0,200,255,0.4)';ctx.lineWidth=0.8;
                    ctx.beginPath();ctx.moveTo(-p.size*0.1,-p.size*0.2);
                    ctx.lineTo(p.size*0.05,0);ctx.lineTo(-p.size*0.08,p.size*0.15);ctx.stroke();
                }
                ctx.restore();
            }

            // Inner core glow
            const coreCol=nxPurging?'#ff2222':'#00ddff';
            const corePulse=nxPurging?(0.3+Math.sin(T/40)*0.3):(0.5+nxPulse*0.3);
            const coreR=12+corePulse*4+(1-hpPct7)*8; // core grows as shell falls off
            ctx.shadowBlur=nxPurging?40:30;ctx.shadowColor=coreCol;
            // Outer glow
            const coreG=ctx.createRadialGradient(0,0,0,0,0,coreR+15);
            coreG.addColorStop(0,nxPurging?'rgba(255,50,50,0.3)':'rgba(0,200,255,0.3)');
            coreG.addColorStop(1,'transparent');
            ctx.fillStyle=coreG;ctx.beginPath();ctx.arc(0,0,coreR+15,0,Math.PI*2);ctx.fill();
            // Core body
            ctx.fillStyle=coreCol;ctx.beginPath();ctx.arc(0,0,coreR,0,Math.PI*2);ctx.fill();
            // Inner bright
            ctx.fillStyle=nxPurging?'#ff8888':'#aaeeff';
            ctx.beginPath();ctx.arc(0,0,coreR*0.5,0,Math.PI*2);ctx.fill();
            // White hot center — the "eye"
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,coreR*0.25,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;

            // Eye tracking — pupil follows player
            const eyeAngle=Math.atan2(ship.y-nx7.y,ship.x-nx7.x);
            const eyeOff=coreR*0.15;
            ctx.fillStyle=nxPurging?'#440000':'#003344';
            ctx.beginPath();ctx.arc(Math.cos(eyeAngle)*eyeOff,Math.sin(eyeAngle)*eyeOff,coreR*0.18,0,Math.PI*2);ctx.fill();

            ctx.restore(); // end boss translate

            // --- AWAITING hint ---
            if(G.nexusListening&&!boss){
                // This is drawn in draw(), not here, but just in case boss is active
            }

            ctx.save();ctx.translate(boss.x,boss.y); // re-enter for the final restore
        } else if(boss.type===5){
            // --- SNAKE BOSS --- (drawn from tail to head)
            ctx.restore(); // Undo the translate(boss.x, boss.y) — we draw each segment separately
            // Connection lines first (behind segments)
            for(let i=1;i<boss.segments.length;i++){
                const prev=boss.segments[i-1],seg=boss.segments[i];
                const bothDead=(prev.type!=='head'&&prev.destroyed)&&seg.destroyed;
                // Metal rod — gradient-styled
                const rodG=ctx.createLinearGradient(prev.x,prev.y,seg.x,seg.y);
                if(bothDead){rodG.addColorStop(0,'#141414');rodG.addColorStop(0.5,'#1a1a1a');rodG.addColorStop(1,'#141414');}
                else if(seg.destroyed||prev.destroyed){rodG.addColorStop(0,'#2a2a2a');rodG.addColorStop(0.5,'#3a3a3a');rodG.addColorStop(1,'#2a2a2a');}
                else{rodG.addColorStop(0,'#444');rodG.addColorStop(0.5,'#666');rodG.addColorStop(1,'#444');}
                ctx.strokeStyle=rodG;ctx.lineWidth=bothDead?6:8;
                ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(seg.x,seg.y);ctx.stroke();
                // Inner energy cable — glowing
                if(!bothDead){
                    const cablePulse=0.3+Math.sin(T/200+i)*0.2;
                    ctx.strokeStyle=seg.destroyed?`rgba(255,100,0,${cablePulse*0.5})`:`rgba(255,170,0,${cablePulse})`;
                    ctx.lineWidth=2;ctx.shadowBlur=seg.destroyed?0:6;ctx.shadowColor='#ffaa00';
                    ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(seg.x,seg.y);ctx.stroke();
                    ctx.shadowBlur=0;
                }
                // Sparks on destroyed sections — more dramatic
                if(seg.destroyed&&Math.random()<0.08){
                    for(let sp=0;sp<2;sp++){
                        const sx=(prev.x+seg.x)/2+(Math.random()-0.5)*12;
                        const sy=(prev.y+seg.y)/2+(Math.random()-0.5)*12;
                        ctx.fillStyle=Math.random()>0.5?'#ffaa00':'#fff';
                        ctx.shadowBlur=10;ctx.shadowColor='#ffaa00';
                        ctx.beginPath();ctx.arc(sx,sy,1.5+Math.random(),0,Math.PI*2);ctx.fill();
                    }
                    ctx.shadowBlur=0;
                }
            }
            // Draw segments from tail to head
            for(let i=boss.segments.length-1;i>=0;i--){
                const seg=boss.segments[i];
                if(seg.type==='machinery') continue;
                if(seg.destroyed) continue;
                ctx.save();ctx.translate(seg.x,seg.y);
                if(seg.type==='asteroid'){
                    // === SNAKE ASTEROID SEGMENT — Infested rock ===
                    ctx.rotate(seg.angle+seg.rot*boss.timer);
                    // Outer infection aura
                    ctx.globalAlpha=0.06;
                    const segAura=ctx.createRadialGradient(0,0,seg.r*0.3,0,0,seg.r+8);
                    segAura.addColorStop(0,'#44aa44');segAura.addColorStop(1,'transparent');
                    ctx.fillStyle=segAura;ctx.beginPath();ctx.arc(0,0,seg.r+8,0,Math.PI*2);ctx.fill();
                    ctx.globalAlpha=1;
                    ctx.shadowBlur=8;ctx.shadowColor='#00aa44';
                    // Rock body with better gradient
                    const ag=ctx.createRadialGradient(-seg.r*0.3,-seg.r*0.3,seg.r*0.1,0,0,seg.r);
                    ag.addColorStop(0,'#1e2e1a');ag.addColorStop(0.4,'#142214');ag.addColorStop(1,'#080c08');
                    ctx.fillStyle=ag;ctx.strokeStyle='#44aa44';ctx.lineWidth=1.5;
                    ctx.beginPath();
                    for(let v=0;v<seg.verts;v++){const a=(Math.PI*2/seg.verts)*v,r=seg.r+seg.offsets[v];v===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
                    ctx.closePath();ctx.fill();ctx.stroke();
                    ctx.shadowBlur=0;
                    // Machinery veins on surface
                    ctx.strokeStyle='rgba(0,200,80,0.15)';ctx.lineWidth=1;
                    ctx.beginPath();ctx.moveTo(-seg.r*0.5,-seg.r*0.2);ctx.lineTo(seg.r*0.3,seg.r*0.1);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(seg.r*0.1,-seg.r*0.4);ctx.lineTo(-seg.r*0.2,seg.r*0.3);ctx.stroke();
                    // Crater with green glow
                    ctx.fillStyle='rgba(0,100,40,0.15)';ctx.beginPath();ctx.arc(seg.r*0.1,-seg.r*0.15,seg.r*0.2,0,Math.PI*2);ctx.fill();
                    ctx.strokeStyle='rgba(0,150,60,0.2)';ctx.lineWidth=0.7;ctx.beginPath();ctx.arc(seg.r*0.1,-seg.r*0.15,seg.r*0.2,0,Math.PI*2);ctx.stroke();
                    // Mini-boss indicator — pulsing double ring
                    if(seg.miniBoss&&!seg.miniBoss.released){
                        const mp=0.35+Math.sin(T/200)*0.3;
                        const mbCol=seg.miniBoss.type==='blaster'?'0,255,255':'200,0,255';
                        ctx.shadowBlur=10;ctx.shadowColor=`rgb(${mbCol})`;
                        ctx.strokeStyle=`rgba(${mbCol},${mp})`;ctx.lineWidth=2;
                        ctx.beginPath();ctx.arc(0,0,seg.r+6,0,Math.PI*2);ctx.stroke();
                        ctx.strokeStyle=`rgba(${mbCol},${mp*0.4})`;ctx.lineWidth=1;
                        ctx.beginPath();ctx.arc(0,0,seg.r+10,0,Math.PI*2);ctx.stroke();
                        ctx.shadowBlur=0;
                    }
                    // Bolts — metallic
                    for(let b=0;b<3;b++){
                        const ba=Math.PI*2/3*b;const bx=Math.cos(ba)*seg.r*0.5,by=Math.sin(ba)*seg.r*0.5;
                        ctx.fillStyle='#555';ctx.beginPath();ctx.arc(bx,by,2.5,0,Math.PI*2);ctx.fill();
                        ctx.fillStyle='#777';ctx.beginPath();ctx.arc(bx-0.5,by-0.5,1,0,Math.PI*2);ctx.fill();
                    }
                } else if(seg.type==='head'){
                    // === SNAKE HEAD — Armored predator ===
                    ctx.rotate(boss.angle);
                    const vuln=boss.headVulnerable;
                    const headCol=vuln?'#ff2222':'#ffaa00';
                    // Head aura
                    ctx.globalAlpha=0.07;
                    const headAura=ctx.createRadialGradient(0,0,seg.r*0.3,0,0,seg.r+20);
                    headAura.addColorStop(0,headCol);headAura.addColorStop(1,'transparent');
                    ctx.fillStyle=headAura;ctx.beginPath();ctx.arc(0,0,seg.r+20,0,Math.PI*2);ctx.fill();
                    ctx.globalAlpha=1;
                    ctx.shadowBlur=25;ctx.shadowColor=headCol;
                    // Head body — layered armor
                    const headG=ctx.createRadialGradient(seg.r*0.1,0,0,0,0,seg.r);
                    headG.addColorStop(0,vuln?'#2a0808':'#1e1a08');headG.addColorStop(0.5,vuln?'#1a0404':'#141004');headG.addColorStop(1,vuln?'#0c0000':'#080600');
                    ctx.fillStyle=headG;ctx.strokeStyle=headCol;ctx.lineWidth=3;
                    ctx.beginPath();
                    ctx.moveTo(seg.r+10,0);
                    ctx.lineTo(seg.r*0.5,-seg.r*0.75);
                    ctx.lineTo(-seg.r*0.5,-seg.r*0.65);
                    ctx.lineTo(-seg.r*0.9,-seg.r*0.15);
                    ctx.lineTo(-seg.r,0);
                    ctx.lineTo(-seg.r*0.9,seg.r*0.15);
                    ctx.lineTo(-seg.r*0.5,seg.r*0.65);
                    ctx.lineTo(seg.r*0.5,seg.r*0.75);
                    ctx.closePath();ctx.fill();ctx.stroke();
                    ctx.shadowBlur=0;
                    // Jaw line
                    ctx.strokeStyle=vuln?'rgba(255,50,50,0.2)':'rgba(255,170,0,0.15)';ctx.lineWidth=1.5;
                    ctx.beginPath();ctx.moveTo(seg.r*0.6,seg.r*0.1);ctx.lineTo(-seg.r*0.3,seg.r*0.5);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(seg.r*0.6,-seg.r*0.1);ctx.lineTo(-seg.r*0.3,-seg.r*0.5);ctx.stroke();
                    // Armor ridge down center
                    ctx.strokeStyle=vuln?'rgba(255,80,80,0.15)':'rgba(255,200,50,0.1)';ctx.lineWidth=2;
                    ctx.beginPath();ctx.moveTo(seg.r+5,0);ctx.lineTo(-seg.r*0.7,0);ctx.stroke();
                    // Fangs at front
                    ctx.fillStyle=vuln?'#ff6644':'#ffdd88';
                    ctx.beginPath();ctx.moveTo(seg.r+8,-seg.r*0.15);ctx.lineTo(seg.r+14,-seg.r*0.05);ctx.lineTo(seg.r+8,seg.r*0.05);ctx.closePath();ctx.fill();
                    ctx.beginPath();ctx.moveTo(seg.r+8,seg.r*0.15);ctx.lineTo(seg.r+14,seg.r*0.05);ctx.lineTo(seg.r+8,-seg.r*0.05);ctx.closePath();ctx.fill();
                    // Eye sockets — deep
                    const ed1=ctx.createRadialGradient(seg.r*0.2,-seg.r*0.25,1,seg.r*0.2,-seg.r*0.25,7);
                    ed1.addColorStop(0,'#0a0a0a');ed1.addColorStop(1,'#000');
                    ctx.fillStyle=ed1;ctx.beginPath();ctx.arc(seg.r*0.2,-seg.r*0.25,7,0,Math.PI*2);ctx.fill();
                    const ed2=ctx.createRadialGradient(seg.r*0.2,seg.r*0.25,1,seg.r*0.2,seg.r*0.25,7);
                    ed2.addColorStop(0,'#0a0a0a');ed2.addColorStop(1,'#000');
                    ctx.fillStyle=ed2;ctx.beginPath();ctx.arc(seg.r*0.2,seg.r*0.25,7,0,Math.PI*2);ctx.fill();
                    // Eye glow — fierce
                    const eyePulse5=vuln?(0.7+Math.sin(T/60)*0.3):(0.5+Math.sin(T/200)*0.3);
                    ctx.shadowBlur=15;ctx.shadowColor=vuln?'red':'#ffcc00';
                    ctx.fillStyle=vuln?`rgba(255,0,0,${eyePulse5})`:`rgba(255,204,0,${eyePulse5})`;
                    ctx.beginPath();ctx.arc(seg.r*0.2,-seg.r*0.25,3.5+eyePulse5,0,Math.PI*2);ctx.fill();
                    ctx.beginPath();ctx.arc(seg.r*0.2,seg.r*0.25,3.5+eyePulse5,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle='#fff';
                    ctx.beginPath();ctx.arc(seg.r*0.2,-seg.r*0.25,1.5,0,Math.PI*2);ctx.fill();
                    ctx.beginPath();ctx.arc(seg.r*0.2,seg.r*0.25,1.5,0,Math.PI*2);ctx.fill();
                    ctx.shadowBlur=0;
                    // Shield / vulnerability indicator
                    if(!vuln){
                        const sp5=0.2+Math.sin(T/200)*0.15;
                        ctx.strokeStyle=`rgba(255,170,0,${sp5})`;ctx.lineWidth=2;
                        ctx.beginPath();ctx.arc(0,0,seg.r+12,0,Math.PI*2);ctx.stroke();
                        ctx.strokeStyle=`rgba(255,170,0,${sp5*0.4})`;ctx.lineWidth=1;
                        ctx.beginPath();ctx.arc(0,0,seg.r+16,0,Math.PI*2);ctx.stroke();
                    } else {
                        const vp5=0.3+Math.sin(T/60)*0.4;
                        ctx.strokeStyle=`rgba(255,0,0,${vp5})`;ctx.lineWidth=3;
                        ctx.shadowBlur=8;ctx.shadowColor='red';
                        ctx.beginPath();ctx.arc(0,0,seg.r+12,0,Math.PI*2);ctx.stroke();
                        ctx.shadowBlur=0;
                    }
                }
                ctx.restore();
            }
            // HP bar for head when vulnerable — styled
            if(boss.headVulnerable){
                const hpP5=boss.hp/boss.maxHp;
                ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(boss.x-32,boss.y-boss.r-24,64,10);
                ctx.strokeStyle='rgba(255,0,0,0.3)';ctx.lineWidth=1;ctx.strokeRect(boss.x-32,boss.y-boss.r-24,64,10);
                ctx.fillStyle='#220000';ctx.fillRect(boss.x-30,boss.y-boss.r-22,60,6);
                const hpG5=ctx.createLinearGradient(boss.x-30,0,boss.x+30,0);
                hpG5.addColorStop(0,'#cc0000');hpG5.addColorStop(1,'#ff4444');
                ctx.fillStyle=hpG5;ctx.fillRect(boss.x-30,boss.y-boss.r-22,60*hpP5,6);
            }
            ctx.save(); // Balance the restore at end of boss draw block
        } else {
            // --- SANS BOSS ---
            if(!boss.phase2){
                // Layered aura
                ctx.globalAlpha=0.06;
                const sAura=ctx.createRadialGradient(0,-5,boss.r*0.3,0,-5,boss.r+25);
                sAura.addColorStop(0,'cyan');sAura.addColorStop(1,'transparent');
                ctx.fillStyle=sAura;ctx.beginPath();ctx.arc(0,-5,boss.r+25,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=0.12;ctx.fillStyle='cyan';
                ctx.beginPath();ctx.arc(0,-5,boss.r+12,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
                // Head with subtle bone texture
                const headG=ctx.createRadialGradient(-boss.r*0.3,-boss.r*0.3,0,0,0,boss.r);
                headG.addColorStop(0,'#ffffff');headG.addColorStop(0.7,'#eeeedd');headG.addColorStop(1,'#ccccbb');
                ctx.fillStyle=headG;ctx.shadowBlur=25;ctx.shadowColor='rgba(0,255,255,0.4)';
                ctx.beginPath();ctx.arc(0,-8,boss.r,Math.PI,0);ctx.lineTo(boss.r*0.75,boss.r*0.75);ctx.lineTo(-boss.r*0.75,boss.r*0.75);ctx.closePath();ctx.fill();
                ctx.shadowBlur=0;
                // Eye sockets with depth
                const eyeG=ctx.createRadialGradient(-15,-4,3,  -15,-4,12);
                eyeG.addColorStop(0,'#111');eyeG.addColorStop(1,'#000');
                ctx.fillStyle=eyeG;ctx.beginPath();ctx.arc(-15,-4,12,0,Math.PI*2);ctx.fill();
                const eyeG2=ctx.createRadialGradient(15,-4,3,  15,-4,12);
                eyeG2.addColorStop(0,'#111');eyeG2.addColorStop(1,'#000');
                ctx.fillStyle=eyeG2;ctx.beginPath();ctx.arc(15,-4,12,0,Math.PI*2);ctx.fill();
                // Glowing eye — always visible, pulsing
                const eyeP=0.5+Math.sin(T/80)*0.5;
                ctx.fillStyle=`rgba(0,255,255,${0.3+eyeP*0.7})`;ctx.shadowBlur=15+eyeP*10;ctx.shadowColor='cyan';
                ctx.beginPath();ctx.arc(-15,-4,4+eyeP*2,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-15,-4,2,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
                // Nose
                ctx.fillStyle='#222';ctx.beginPath();ctx.moveTo(0,9);ctx.lineTo(-4,15);ctx.lineTo(4,15);ctx.fill();
                // Mouth with teeth
                ctx.lineWidth=2.5;ctx.strokeStyle='#222';ctx.beginPath();ctx.moveTo(-24,24);ctx.quadraticCurveTo(0,34,24,24);ctx.stroke();
                for(let t=-15;t<=15;t+=10){ctx.strokeStyle='#333';ctx.beginPath();ctx.moveTo(t,26);ctx.lineTo(t,30);ctx.stroke();}
            } else {
                // Phase 2 — dark + red, menacing
                // Pulsing red aura
                const p2a=0.1+Math.sin(T/150)*0.06;
                const p2r=boss.r+18+Math.sin(T/200)*6;
                const sAura2=ctx.createRadialGradient(0,-5,boss.r*0.3,0,-5,p2r+10);
                sAura2.addColorStop(0,'rgba(255,0,0,0.15)');sAura2.addColorStop(1,'transparent');
                ctx.fillStyle=sAura2;ctx.beginPath();ctx.arc(0,-5,p2r+10,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=p2a;ctx.fillStyle='red';
                ctx.beginPath();ctx.arc(0,-5,p2r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
                // Head — dark bone with red cracks
                const headG2=ctx.createRadialGradient(-boss.r*0.2,-boss.r*0.2,0,0,0,boss.r);
                headG2.addColorStop(0,'#151515');headG2.addColorStop(1,'#050505');
                ctx.fillStyle=headG2;ctx.strokeStyle='#cc0000';ctx.lineWidth=3;
                ctx.shadowBlur=40;ctx.shadowColor='red';
                ctx.beginPath();ctx.arc(0,-8,boss.r,Math.PI,0);ctx.lineTo(boss.r*0.85,boss.r*0.75);ctx.lineTo(-boss.r*0.85,boss.r*0.75);ctx.closePath();ctx.fill();ctx.stroke();
                // Multiple cracks
                ctx.strokeStyle='#ff4444';ctx.lineWidth=2;ctx.shadowBlur=8;ctx.shadowColor='#ff2222';
                ctx.beginPath();ctx.moveTo(0,-boss.r-8);ctx.lineTo(5,-28);ctx.lineTo(-2,-12);ctx.stroke();
                ctx.beginPath();ctx.moveTo(boss.r*0.3,-boss.r*0.5);ctx.lineTo(boss.r*0.4,-boss.r*0.3);ctx.stroke();
                ctx.shadowBlur=0;
                // Eye sockets — larger, deeper
                ctx.fillStyle='#000';ctx.beginPath();ctx.arc(-15,-4,14,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(15,-4,14,0,Math.PI*2);ctx.fill();
                // Burning eye — multi-layered fire
                const fireP=0.6+Math.sin(T/60)*0.4;
                ctx.shadowBlur=30;ctx.shadowColor='red';
                ctx.fillStyle='#ff0000';ctx.beginPath();ctx.arc(-15,-4,7+fireP,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#ff6600';ctx.beginPath();ctx.arc(-15,-4,4+fireP*0.5,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#ffcc00';ctx.beginPath();ctx.arc(-15,-4,2.5,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-15,-4,1.5,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;
                // Nose
                ctx.fillStyle='#cc0000';ctx.beginPath();ctx.moveTo(0,9);ctx.lineTo(-6,18);ctx.lineTo(6,18);ctx.fill();
                // Jagged mouth — more teeth, menacing
                ctx.lineWidth=2.5;ctx.strokeStyle='#dd1111';
                ctx.beginPath();ctx.moveTo(-30,28);
                for(let t=-30;t<=30;t+=8) ctx.lineTo(t,t%16===0?27:36);
                ctx.stroke();
                // Faint red inner glow on whole skull
                ctx.globalAlpha=0.05;ctx.fillStyle='red';
                ctx.beginPath();ctx.arc(0,-8,boss.r,Math.PI,0);ctx.lineTo(boss.r*0.85,boss.r*0.75);ctx.lineTo(-boss.r*0.85,boss.r*0.75);ctx.closePath();ctx.fill();
                ctx.globalAlpha=1;
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

        // Surface details — asteroid crater rings with depth
        if(!isFlashing){
            const detailCol=isAlbert?'rgba(68,136,255,':'rgba(68,255,68,';
            ctx.strokeStyle=detailCol+'0.2)';ctx.lineWidth=0.8;
            ctx.beginPath();ctx.arc(G.gilbert.r*0.1,-G.gilbert.r*0.2,G.gilbert.r*0.25,0,Math.PI*2);ctx.stroke();
            ctx.fillStyle=detailCol+'0.06)';ctx.beginPath();ctx.arc(G.gilbert.r*0.1,-G.gilbert.r*0.2,G.gilbert.r*0.18,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle=detailCol+'0.15)';ctx.lineWidth=0.6;
            ctx.beginPath();ctx.arc(-G.gilbert.r*0.3,G.gilbert.r*0.15,G.gilbert.r*0.15,0,Math.PI*2);ctx.stroke();
            // Bolt details
            ctx.fillStyle=detailCol+'0.3)';
            ctx.beginPath();ctx.arc(-G.gilbert.r*0.5,0,2,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.arc(G.gilbert.r*0.1,G.gilbert.r*0.4,1.5,0,Math.PI*2);ctx.fill();
        }

        // Cockpit / eye — bigger, more detailed
        const eyePulse=isAlly?0.8+Math.sin(T/150)*0.2:0.5+Math.sin(T/300)*0.3;
        const gilEyeCol=isAlbert?'#4488ff':'#00ff44';
        // Eye outer glow
        const eyeOG=ctx.createRadialGradient(G.gilbert.r*0.25,0,0,G.gilbert.r*0.25,0,10);
        eyeOG.addColorStop(0,gilEyeCol+'66');eyeOG.addColorStop(1,'transparent');
        ctx.fillStyle=eyeOG;ctx.globalAlpha=0.3*eyePulse;ctx.beginPath();ctx.arc(G.gilbert.r*0.25,0,10,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
        // Eye main
        ctx.fillStyle=isFlashing?'#fff':(isAlbert?`rgba(68,136,255,${eyePulse})`:`rgba(0,255,68,${eyePulse})`);
        ctx.shadowBlur=isAlly?20:10;ctx.shadowColor=gilEyeCol;
        ctx.beginPath();ctx.arc(G.gilbert.r*0.25,0,5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(G.gilbert.r*0.25,0,2,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;

        // Ally boost glow — double ring
        if(isAlly){
            const allyP=0.25+Math.sin(T/200)*0.2;
            const allyCol=isAlbert?'rgba(68,136,255,':'rgba(0,255,68,';
            ctx.shadowBlur=12;ctx.shadowColor=gilEyeCol;
            ctx.strokeStyle=allyCol+allyP+')';ctx.lineWidth=2;
            ctx.beginPath();ctx.arc(0,0,G.gilbert.r+8,0,Math.PI*2);ctx.stroke();
            ctx.strokeStyle=allyCol+(allyP*0.4)+')';ctx.lineWidth=1;
            ctx.beginPath();ctx.arc(0,0,G.gilbert.r+12,0,Math.PI*2);ctx.stroke();
            ctx.shadowBlur=0;
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
        // Background bar
        ctx.globalAlpha=0.4;
        const brBg=ctx.createLinearGradient(0,32,0,60);
        brBg.addColorStop(0,'transparent');brBg.addColorStop(0.3,'rgba(80,40,0,0.5)');brBg.addColorStop(0.7,'rgba(80,40,0,0.5)');brBg.addColorStop(1,'transparent');
        ctx.fillStyle=brBg;ctx.fillRect(W*0.2,32,W*0.6,28);
        ctx.globalAlpha=wa;ctx.font='bold 22px Courier New';ctx.fillStyle='#ff8800';ctx.textAlign='center';
        ctx.shadowBlur=25;ctx.shadowColor='rgba(255,136,0,0.6)';
        ctx.fillText('BOSS RUSH — WAVE '+G.bossRushWave+'/4',W/2,52);
        // Progress dots
        ctx.shadowBlur=0;
        for(let pi=1;pi<=4;pi++){
            const px=W/2-30+(pi-1)*20;
            ctx.fillStyle=pi<=G.bossRushWave?'#ff8800':'#333';
            ctx.beginPath();ctx.arc(px,62,3,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
    }

    // --- GILBERT DIALOGUE ---
    if(G.gilbertDialogue){
        // Dark overlay with gradient edges
        const dGrad=ctx.createLinearGradient(0,H*0.63,0,H*0.63+110);
        dGrad.addColorStop(0,'rgba(0,0,0,0)');dGrad.addColorStop(0.1,'rgba(0,8,0,0.7)');
        dGrad.addColorStop(0.9,'rgba(0,8,0,0.7)');dGrad.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=dGrad;ctx.fillRect(0,H*0.63,W,110);
        // Green accent line
        ctx.fillStyle='rgba(0,255,68,0.15)';ctx.fillRect(30,H*0.65+2,W-60,1);
        // Name tag
        ctx.font='bold 15px Courier New';ctx.fillStyle='#44ff44';ctx.textAlign='left';
        ctx.shadowBlur=10;ctx.shadowColor='#00ff44';
        ctx.fillText('GILBERT:',40,H*0.65+22);
        ctx.shadowBlur=0;
        // Dialogue text
        ctx.font='15px Courier New';ctx.fillStyle='#eee';
        ctx.fillText(G.gilbertDialogue,40,H*0.65+48);
        // Advance hint
        ctx.font='11px Courier New';ctx.fillStyle='#444';
        ctx.fillText('(wait...)',40,H*0.65+72);
    }

    // --- GILBERT QUIP (non-blocking) ---
    if(G.gilbertQuip&&G.gilbertQuipTimer>0&&!G.gilbertDialogue){
        const qa=Math.min(1,G.gilbertQuipTimer/30);
        ctx.globalAlpha=qa*0.9;
        const qGrad=ctx.createLinearGradient(0,H-58,0,H-8);
        qGrad.addColorStop(0,'rgba(0,0,0,0)');qGrad.addColorStop(0.15,'rgba(0,8,0,0.6)');
        qGrad.addColorStop(0.85,'rgba(0,8,0,0.6)');qGrad.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=qGrad;ctx.fillRect(0,H-58,W,50);
        ctx.globalAlpha=qa;
        ctx.font='bold 13px Courier New';ctx.fillStyle='#44ff44';ctx.textAlign='left';
        ctx.fillText('GILBERT:',15,H-35);
        ctx.font='13px Courier New';ctx.fillStyle='#ccc';
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

            // Thrust flame (layered, animated)
            if(isAction('thrust')){
                const fc=isP2?'#ff00ff':_classCol;
                const flameStart=ship.r*_shape.flameX;
                const len=ship.r*1.4+Math.random()*10;
                const flicker=Math.random()*4;
                // Wide outer glow
                ctx.shadowBlur=25;ctx.shadowColor=fc;
                ctx.globalAlpha=0.2;
                const fOuter=ctx.createRadialGradient(flameStart-len*0.4,0,0,flameStart-len*0.4,0,len*0.5);
                fOuter.addColorStop(0,fc);fOuter.addColorStop(1,'transparent');
                ctx.fillStyle=fOuter;ctx.beginPath();ctx.arc(flameStart-len*0.4,0,len*0.5,0,Math.PI*2);ctx.fill();
                // Outer flame cone
                ctx.globalAlpha=0.5;ctx.fillStyle=fc;
                ctx.beginPath();ctx.moveTo(flameStart,4);ctx.lineTo(-len-flicker,(Math.random()-0.5)*6);ctx.lineTo(flameStart,-4);ctx.closePath();ctx.fill();
                // Mid flame
                ctx.fillStyle='#fff';ctx.globalAlpha=0.5;
                ctx.beginPath();ctx.moveTo(flameStart,2.5);ctx.lineTo(-len+4,(Math.random()-0.5)*3);ctx.lineTo(flameStart,-2.5);ctx.closePath();ctx.fill();
                // Core
                ctx.fillStyle=isP2?'#ffccff':'#ccf0ff';ctx.globalAlpha=0.9;
                ctx.beginPath();ctx.moveTo(flameStart,1.5);ctx.lineTo(-len+8,0);ctx.lineTo(flameStart,-1.5);ctx.closePath();ctx.fill();
                ctx.shadowBlur=0;ctx.globalAlpha=1;
            }

            // Ship body (class shape)
            ctx.beginPath();
            _shape.body(ctx,ship.r);
            ctx.closePath();
            // Fill gradient — more depth
            const sg=ctx.createLinearGradient(-ship.r,-ship.r*0.5,ship.r,ship.r*0.5);
            sg.addColorStop(0,'#080810');sg.addColorStop(0.4,'#0e0e1a');sg.addColorStop(1,'#1a1a2e');
            ctx.fillStyle=sg;ctx.fill();
            // Outline (class color) with glow
            ctx.strokeStyle=isP2?'#ff00ff':_classCol;
            if(isP2){ctx.shadowBlur=32;ctx.shadowColor='#ff00ff';}
            else{ctx.shadowBlur=18;ctx.shadowColor=_classCol;}
            ctx.lineWidth=2.3;ctx.stroke();
            // Double-stroke outer glow for bloom
            ctx.shadowBlur=0;ctx.globalAlpha=0.35;ctx.lineWidth=1;
            ctx.strokeStyle=isP2?'#ffaaff':_classCol;
            ctx.beginPath();_shape.body(ctx,ship.r*1.08);ctx.closePath();ctx.stroke();
            ctx.globalAlpha=1;
            ctx.shadowBlur=0;
            // Second inner stroke for hull detail
            ctx.globalAlpha=0.12;ctx.strokeStyle=isP2?'#ff88ff':_classCol;ctx.lineWidth=1;
            ctx.beginPath();_shape.body(ctx,ship.r*0.88);ctx.closePath();ctx.stroke();
            ctx.globalAlpha=1;

            // Wing accent lines (class shape)
            ctx.globalAlpha=0.4;ctx.strokeStyle=isP2?'#ff00ff':_classCol;ctx.lineWidth=1;
            for(const wl of _shape.wingLines){
                ctx.beginPath();ctx.moveTo(ship.r*wl[0],ship.r*wl[1]);ctx.lineTo(ship.r*wl[2],ship.r*wl[3]);ctx.stroke();
            }
            ctx.globalAlpha=1;

            // Cockpit glow (class color) — bigger, brighter
            const _cpx=_shape.cockpitX;
            const cpPulse=0.8+Math.sin(T/400)*0.2;
            // Outer cockpit glow
            const cockpitOuter=ctx.createRadialGradient(_cpx,0,0,_cpx,0,8);
            cockpitOuter.addColorStop(0,(isP2?'#ff66ff':_classCol));cockpitOuter.addColorStop(1,'transparent');
            ctx.globalAlpha=0.25*cpPulse;ctx.fillStyle=cockpitOuter;ctx.beginPath();ctx.arc(_cpx,0,8,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
            // Inner cockpit
            const cockpit=ctx.createRadialGradient(_cpx,0,0,_cpx,0,5);
            cockpit.addColorStop(0,'#fff');cockpit.addColorStop(0.3,isP2?'#ff66ff':_classCol);cockpit.addColorStop(1,'rgba(0,0,0,0)');
            ctx.fillStyle=cockpit;ctx.beginPath();ctx.arc(_cpx,0,5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(_cpx,0,1.5,0,Math.PI*2);ctx.fill();

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

            // Shield ring — layered with glow
            if(G.hasForceField&&G.shieldFuel>0){
                const sa=0.12+G.shieldFuel*0.12+Math.sin(T/300)*0.08;
                ctx.shadowBlur=15;ctx.shadowColor='rgba(0,255,255,0.3)';
                ctx.beginPath();ctx.arc(0,0,ship.r+7,0,Math.PI*2);
                ctx.strokeStyle=`rgba(0,255,255,${sa})`;ctx.lineWidth=2;ctx.stroke();
                // Inner shimmer ring
                ctx.beginPath();ctx.arc(0,0,ship.r+5,0,Math.PI*2);
                ctx.strokeStyle=`rgba(100,255,255,${sa*0.4})`;ctx.lineWidth=1;ctx.stroke();
                ctx.shadowBlur=0;
            }
            if(G.godMode){
                const ga=0.35+Math.sin(T/200)*0.25;
                ctx.shadowBlur=20;ctx.shadowColor='rgba(255,215,0,0.4)';
                ctx.beginPath();ctx.arc(0,0,ship.r+11,0,Math.PI*2);
                ctx.strokeStyle=`rgba(255,215,0,${ga})`;ctx.lineWidth=2;ctx.stroke();
                ctx.beginPath();ctx.arc(0,0,ship.r+9,0,Math.PI*2);
                ctx.strokeStyle=`rgba(255,215,0,${ga*0.3})`;ctx.lineWidth=1;ctx.stroke();
                ctx.shadowBlur=0;
            }
            if(G.invincibleTimer>0){
                const ia=0.25+Math.sin(T/50)*0.25;
                ctx.shadowBlur=12;ctx.shadowColor='rgba(100,180,255,0.3)';
                ctx.beginPath();ctx.arc(0,0,ship.r+11,0,Math.PI*2);
                ctx.strokeStyle=`rgba(100,180,255,${ia})`;ctx.lineWidth=2;ctx.stroke();
                ctx.shadowBlur=0;
            }
            ctx.restore();
        }
    }

    // --- BULLETS (elongated with glow trails) ---
    for(const b of bullets){
        // Big shot rendering (huge golden plasma ball)
        if(b.big){
            const bsP=0.75+Math.sin(T/80)*0.25;
            ctx.shadowBlur=45;ctx.shadowColor='#ffcc00';
            // Outer aura
            ctx.globalAlpha=0.4*bsP;
            const bOut=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,26);
            bOut.addColorStop(0,'#ffff88');bOut.addColorStop(0.3,'#ffcc00');bOut.addColorStop(0.7,'#ff6600');bOut.addColorStop(1,'transparent');
            ctx.fillStyle=bOut;ctx.beginPath();ctx.arc(b.x,b.y,26,0,Math.PI*2);ctx.fill();
            // Mid aura
            ctx.globalAlpha=0.8;
            const bMid=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,14);
            bMid.addColorStop(0,'#ffffff');bMid.addColorStop(0.4,'#ffff44');bMid.addColorStop(1,'#ffaa00');
            ctx.fillStyle=bMid;ctx.beginPath();ctx.arc(b.x,b.y,14,0,Math.PI*2);ctx.fill();
            // Hot core
            ctx.globalAlpha=1;ctx.fillStyle='#ffffff';
            ctx.beginPath();ctx.arc(b.x,b.y,6,0,Math.PI*2);ctx.fill();
            // Star burst rays
            ctx.strokeStyle='#ffff88';ctx.lineWidth=2;ctx.globalAlpha=bsP*0.7;
            for(let r=0;r<4;r++){
                const ra=r*Math.PI/2+T/400;
                ctx.beginPath();ctx.moveTo(b.x-Math.cos(ra)*22,b.y-Math.sin(ra)*22);
                ctx.lineTo(b.x+Math.cos(ra)*22,b.y+Math.sin(ra)*22);ctx.stroke();
            }
            ctx.shadowBlur=0;ctx.globalAlpha=1;
            continue;
        }
        const isTriple=G.tripleShotTimer>0;
        const isGilbert=!!b.gilbert;
        const allyCol=G.albertMode?'#4488ff':'#44ff44';
        const allyGlow=G.albertMode?'#0066ff':'#00ff44';
        const allyCore=G.albertMode?'#aaccff':'#aaffaa';
        const bCol=isGilbert?allyCol:(isTriple?'#ff8800':'#ff5555');
        const bGlow=isGilbert?allyGlow:(isTriple?'#ff8800':'#ff3333');
        // Trail with gradient fade
        for(let i=0;i<b.trail.length;i++){
            const ta=i/b.trail.length;
            ctx.globalAlpha=ta*0.4;
            const tSz=1+ta*1.8;
            ctx.fillStyle=bCol;
            ctx.beginPath();ctx.arc(b.trail[i].x,b.trail[i].y,tSz,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
        // Wide bloom halo
        ctx.shadowBlur=28;ctx.shadowColor=bGlow;
        const bBloom=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,14);
        bBloom.addColorStop(0,bCol+'66');bBloom.addColorStop(0.4,bCol+'22');bBloom.addColorStop(1,'transparent');
        ctx.fillStyle=bBloom;ctx.beginPath();ctx.arc(b.x,b.y,14,0,Math.PI*2);ctx.fill();
        // Outer glow halo
        const bOuter=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,8);
        bOuter.addColorStop(0,bCol+'cc');bOuter.addColorStop(1,'transparent');
        ctx.fillStyle=bOuter;ctx.beginPath();ctx.arc(b.x,b.y,8,0,Math.PI*2);ctx.fill();
        // Bullet head glow
        const bg=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,5);
        bg.addColorStop(0,'#fff');bg.addColorStop(0.35,isGilbert?allyCol:(isTriple?'#ffcc00':'#ff8888'));bg.addColorStop(1,'transparent');
        ctx.fillStyle=bg;ctx.beginPath();ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();
        // Cross flare (star burst)
        ctx.globalAlpha=0.7;ctx.strokeStyle=bCol;ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(b.x-9,b.y);ctx.lineTo(b.x+9,b.y);ctx.moveTo(b.x,b.y-9);ctx.lineTo(b.x,b.y+9);ctx.stroke();
        ctx.globalAlpha=1;
        // Hot core
        ctx.fillStyle=isGilbert?allyCore:(isTriple?'#ffee88':'#ffdddd');
        ctx.beginPath();ctx.arc(b.x,b.y,2.2,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,1.2,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
    }

    // --- TUTORIAL OVERLAY ---
    if(G.tutorial&&G.running&&G.tutStep<tutMsgs.length){
        const msg=tutMsgs[G.tutStep];
        // Gradient banner with green tint
        const tg=ctx.createLinearGradient(0,H*0.17,0,H*0.17+80);
        tg.addColorStop(0,'rgba(0,0,0,0)');tg.addColorStop(0.15,'rgba(0,10,0,0.75)');
        tg.addColorStop(0.85,'rgba(0,10,0,0.75)');tg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=tg;ctx.fillRect(0,H*0.17,W,80);
        // Accent lines
        ctx.fillStyle='rgba(0,255,100,0.15)';
        ctx.fillRect(W*0.15,H*0.17+14,W*0.7,1);
        ctx.fillRect(W*0.15,H*0.17+62,W*0.7,1);
        ctx.font='bold 26px Courier New';ctx.fillStyle='#44ff66';ctx.textAlign='center';
        ctx.shadowBlur=12;ctx.shadowColor='rgba(0,255,100,0.4)';
        ctx.fillText(msg[0],W/2,H*0.17+35);ctx.shadowBlur=0;
        ctx.font='14px Courier New';ctx.fillStyle='#999';
        ctx.fillText(msg[1],W/2,H*0.17+55);
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
            if(boss.type===6) tl('P2:'+boss.phase2+' P3:'+boss.phase3+' | Rage:'+boss.rageMultiplier.toFixed(2)+' | Pillars:'+boss.flamePillars.length+' Bats:'+boss.batProjectiles.length+' Fire:'+boss.fireTrail.length);
            if(boss.type===7) tl('P'+((boss.phase3?3:boss.phase2?2:1))+' | Nodes:'+boss.dataNodes.length+' Grid:'+boss.gridLines.length+' Clones:'+boss.clones.length+(boss.purging?' PURGING:'+boss.purgeTimer:'')+(boss.rewriting?' REWRITE':''));
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

    // NEXUS-0: "AWAITING..." hint when listening
    if(G.nexusListening&&!G.nexusDefeated&&!(boss&&boss.type===7)){
        ctx.globalAlpha=0.12+Math.sin(T/800)*0.06;
        ctx.fillStyle='#00aaff';ctx.font='12px Courier New';ctx.textAlign='right';
        ctx.fillText('> AWAITING SIGNAL...',W-15,H-15);
        ctx.globalAlpha=1;
    }

    // Fast travel menu
    if(G.fastTravelOpen){
        ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(0,0,W,H);
        // Panel with gradient
        const ftBg=ctx.createLinearGradient(W/2-180,H/2-80,W/2-180,H/2+80);
        ftBg.addColorStop(0,'rgba(5,10,25,0.95)');ftBg.addColorStop(1,'rgba(3,5,15,0.95)');
        ctx.fillStyle=ftBg;ctx.fillRect(W/2-180,H/2-80,360,160);
        ctx.strokeStyle='rgba(0,200,255,0.4)';ctx.lineWidth=1;
        ctx.strokeRect(W/2-180,H/2-80,360,160);
        // Top accent line
        ctx.fillStyle='rgba(0,200,255,0.2)';ctx.fillRect(W/2-179,H/2-79,358,1);
        ctx.font='bold 20px Courier New';ctx.textAlign='center';ctx.fillStyle='#00ccff';
        ctx.shadowBlur=15;ctx.shadowColor='rgba(0,200,255,0.4)';
        ctx.fillText('FAST TRAVEL',W/2,H/2-48);ctx.shadowBlur=0;
        ctx.font='14px Courier New';ctx.fillStyle='#888';
        ctx.fillText('Return to Space Station?',W/2,H/2-15);
        ctx.font='bold 13px Courier New';
        ctx.fillStyle='#44ff88';ctx.fillText('[SPACE] Confirm',W/2,H/2+25);
        ctx.fillStyle='#ff6666';ctx.fillText('[ESC] Cancel',W/2,H/2+50);
        ctx.font='10px Courier New';ctx.fillStyle='#444';
        ctx.fillText('Your score will be saved',W/2,H/2+72);
    }

    // Cutscene overlay
    if(G.stationCutscene) drawCutscene();

    // Level 6 rouges + overlay
    if(typeof drawRouges==='function' && rouges.length>0) drawRouges();
    if(typeof drawLevel6==='function') drawLevel6();
    if(typeof drawBigShotUI==='function') drawBigShotUI();

    // === POST-PROCESSING EFFECTS ===

    // Subtle scanlines overlay
    ctx.globalAlpha=0.025;
    for(let sy=0;sy<H;sy+=3){
        ctx.fillStyle='#000';ctx.fillRect(0,sy,W,1);
    }
    ctx.globalAlpha=1;

    // Boss fight chromatic aberration / screen distortion
    if(boss&&boss.state!=='enter'){
        const intensity=boss.phase2?0.015:0.008;
        ctx.globalAlpha=intensity;ctx.globalCompositeOperation='screen';
        ctx.drawImage(canvas,-2,-1);
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    }

    // Screen flash on damage (uses shakeTimer as proxy)
    if(G.shakeTimer>10){
        const flashA=Math.min(0.15,G.shakeTimer*0.005);
        ctx.globalAlpha=flashA;ctx.fillStyle='#ff2200';ctx.fillRect(0,0,W,H);
        ctx.globalAlpha=1;
    }

    // Subtle film grain
    ctx.globalAlpha=0.015;
    for(let gi=0;gi<40;gi++){
        const gx=Math.random()*W,gy=Math.random()*H;
        ctx.fillStyle=Math.random()>0.5?'#fff':'#000';
        ctx.fillRect(gx,gy,1,1);
    }
    ctx.globalAlpha=1;

    // Corner glow highlights (subtle colored light leaks)
    const cornerA=0.03+Math.sin(T/5000)*0.01;
    ctx.globalAlpha=cornerA;
    const cg1=ctx.createRadialGradient(0,0,0,0,0,200);
    cg1.addColorStop(0,isP2?'#ff00ff':'#0044aa');cg1.addColorStop(1,'transparent');
    ctx.fillStyle=cg1;ctx.beginPath();ctx.arc(0,0,200,0,Math.PI*2);ctx.fill();
    const cg2=ctx.createRadialGradient(W,H,0,W,H,200);
    cg2.addColorStop(0,isP2?'#aa0066':'#002266');cg2.addColorStop(1,'transparent');
    ctx.fillStyle=cg2;ctx.beginPath();ctx.arc(W,H,200,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;

    // Anti-piracy canvas watermark
    if(window._watermarkId){
        ctx.globalAlpha=0.03;ctx.fillStyle='#fff';ctx.font='9px monospace';ctx.textAlign='right';
        ctx.fillText('ID:'+window._watermarkId,W-5,H-5);ctx.globalAlpha=1;
    }

    ctx.restore();
    // Inventory / tutorial overlays (space mode — always on top, unaffected by shake)
    if(typeof drawDataFragmentPopup==='function') drawDataFragmentPopup();
    if(typeof drawItemTutorialToast==='function') drawItemTutorialToast();
    if(typeof drawInventoryOverlay==='function') drawInventoryOverlay();
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
    // Tab toggles inventory (global, anywhere in game modes)
    if(e.code==='Tab' && G.running && !G.paused && !G.stationCutscene
        && !(G.dockingBay && G.dockingBay.open)
        && !(G.station && G.station.shopOpen) && !G.stationDialogue){
        e.preventDefault();
        if(G.inventoryOpen){ if(typeof closeInventory==='function') closeInventory(); }
        else { if(typeof openInventory==='function') openInventory(); }
        return;
    }
    // When inventory is open, route keys to it
    if(G.inventoryOpen){
        if(e.code==='Escape'||e.code==='Tab'){e.preventDefault();if(typeof closeInventory==='function') closeInventory();return;}
        const inv=G.inventory||[];
        if(e.code==='ArrowUp'||e.code==='KeyW'){G.inventorySelection=Math.max(0,G.inventorySelection-1);try{Sound.ui();}catch(err){}return;}
        if(e.code==='ArrowDown'||e.code==='KeyS'){G.inventorySelection=Math.min(inv.length-1,G.inventorySelection+1);try{Sound.ui();}catch(err){}return;}
        if(e.code==='KeyZ'||e.code==='Enter'){if(typeof inventoryEquipSelected==='function') inventoryEquipSelected();return;}
        return;
    }
    // When docking bay console is open, route keys (prevent browser defaults
    // like Tab navigation, Space scrolling, Arrow keys etc.)
    if(G.dockingBay && G.dockingBay.open){
        e.preventDefault();
        if(typeof dockingBayKey==='function') dockingBayKey(e);
        return;
    }

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
        } else if(e.code==='KeyE'&&st.interactTarget&&!e.repeat){
            if(st.interactTarget.id==='airlock'){leaveStation();Sound.ui();}
            else if(st.interactTarget.id==='elevator'){
                // 3-floor cycle: 0 -> 1 -> 2 (if key) or 1 -> 0 (no key) -> 2 -> 0
                const hasKey = (typeof hasItem==='function') && hasItem('module_access');
                let next;
                if(st.floor===0) next=1;
                else if(st.floor===1) next=hasKey?2:0;
                else next=0; // from floor 2 wrap back to 0
                st.floor=next;
                // Position player near the elevator on the new floor
                if(next===0) st.playerX=STATION_WIDTH-100;
                else if(next===1) st.playerX=100;
                else st.playerX=160; // docking bay: a clear step right of the elevator
                const worldW=(next===2&&typeof DOCKING_BAY!=='undefined')?DOCKING_BAY.width:STATION_WIDTH;
                st.cameraX=Math.max(0,Math.min(worldW-W,st.playerX-W/2));
                st.interactTarget=null;
                // Defensive cleanup — make sure nothing stale blocks input on the new floor
                st.playerVX=0;
                if(G.dockingBay) G.dockingBay.open=false;
                G.stationDialogue='';G.stationDialogueLines=[];G.stationDialogueIdx=0;
                Sound.ui();
            }
            else if(st.interactTarget.role==='banker'){
                // Convert score to MB
                const earned=Math.floor(G.score/50);
                if(earned>0){G.mb+=earned;G.score=0;saveStation();
                    showStationDialogue({name:'BANKER',color:'#ffdd00',lines:["Converted! You got "+earned+" MB.","Pleasure doing business."]});
                } else {
                    showStationDialogue({name:'BANKER',color:'#ffdd00',lines:["You don't have any Score to convert.","Come back when you've earned some."]});
                }
                Sound.ui();
            }
            else if(st.interactTarget.lines){showStationDialogue(st.interactTarget);Sound.ui();}
        } else if(e.code==='KeyZ'&&st.interactTarget&&st.interactTarget.id==='dockConsole'){
            if(typeof openDockConsole==='function') openDockConsole();
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

    // Fast travel menu (X key) — blocked during level 6 events
    if(e.code==='KeyX'&&G.running&&G.stationUnlocked&&!boss&&G.mode==='space'&&!G.bossRush&&!G.stationCutscene&&!(G.level6&&G.level6.state)){
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
        document.getElementById('menuScreen').style.display='block';
    },1000);
}
document.getElementById('splash').addEventListener('click',dismissSplash);
document.addEventListener('keydown',function splashKey(){dismissSplash();document.removeEventListener('keydown',splashKey);},{once:true});

// ============================================================
//  DLC LOADER — optional, all content is now in the base game
// ============================================================
function checkDLC() {
    if (window.DLC && window.DLC.loaded) {
        console.log('[GAME] DLC file detected: ' + (window.DLC.name || 'Unknown') + ' (all content already included in base game)');
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

