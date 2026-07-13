// ============================================================
//  INTRO CUTSCENE — "Abandoned Ship Upload"  (cinematic cut)
//  Grassy field at night, bunker door, wires transfer pilot
//  data into a dead ship that powers to life and blasts off.
//  ~25 seconds, skippable with E.
// ============================================================

let introCutscene = null;
const INTRO_FPS   = 60;
const INTRO_DURATION = 25;

/* ─────────────────── helpers ─────────────────── */
function _lerpColor(a, b, t) {
    const pr = s => parseInt(s.slice(1,3),16), pg = s => parseInt(s.slice(3,5),16), pb = s => parseInt(s.slice(5,7),16);
    let ar=pr(a),ag=pg(a),ab=pb(a), br2,bg2,bb2;
    if(b[0]==='#'&&b.length>=7){br2=pr(b);bg2=pg(b);bb2=pb(b);}else{br2=0;bg2=200;bb2=255;}
    return `rgb(${Math.round(ar+(br2-ar)*t)},${Math.round(ag+(bg2-ag)*t)},${Math.round(ab+(bb2-ab)*t)})`;
}
function _ptOnWire(wire,frac){
    const idx=frac*(wire.pts.length-1), i0=Math.floor(idx), f=idx-i0;
    if(i0>=wire.pts.length-1) return{x:wire.pts[wire.pts.length-1].x,y:wire.pts[wire.pts.length-1].y};
    return{x:wire.pts[i0].x+(wire.pts[i0+1].x-wire.pts[i0].x)*f, y:wire.pts[i0].y+(wire.pts[i0+1].y-wire.pts[i0].y)*f};
}

/* ─────────────────── START ─────────────────── */
function startIntroCutscene(callback) {
    $ui.style.display = 'none';
    G.running = false;

    // --- Layout ---
    const groundY  = 470;
    const bunkerX  = 155, bunkerY = groundY - 28;
    const shipX    = 590, shipY   = groundY - 32;
    const shipScale= 3.0;

    // --- Hills (parallax silhouettes) ---
    const hills = [];
    for(let layer=0;layer<3;layer++){
        const pts=[];
        const segs=12+layer*4;
        const baseH=40+layer*30;
        for(let s=0;s<=segs;s++){
            pts.push({x:s/segs*W, y:groundY-baseH-Math.random()*25*(3-layer)+Math.sin(s*0.7)*15});
        }
        hills.push({pts, color:`hsl(${140+layer*15},${15-layer*4}%,${6+layer*2}%)`});
    }

    // --- Moon ---
    const moonX = 730, moonY = 85, moonR = 30;

    // --- Background trees (distant forest silhouette) ---
    const bgTrees = [];
    for(let i=0;i<40;i++){
        const tx=i*(W/40)+Math.random()*15-7;
        const th=25+Math.random()*35;
        bgTrees.push({x:tx, h:th, w:8+Math.random()*14, type:Math.random()<0.7?'pine':'round'});
    }

    // --- Distant structures ---
    const bgStructures = [
        // Radio tower
        {type:'tower', x:80, h:90, w:8},
        // Distant power line poles
        {type:'pole', x:350, h:40, w:4},
        {type:'pole', x:450, h:38, w:4},
        // Ruined wall segment
        {type:'ruin', x:780, h:28, w:35}
    ];

    // --- Aurora / nebula bands in sky ---
    const auroraBands = [];
    for(let i=0;i<4;i++){
        const pts=[];
        for(let s=0;s<=8;s++) pts.push({x:s/8*W, y:60+i*35+Math.random()*20});
        auroraBands.push({pts, hue:120+i*30, alpha:0.015+Math.random()*0.01, speed:0.1+i*0.05, width:20+Math.random()*15});
    }

    // --- Clouds (wispy layers) ---
    const clouds = [];
    for(let i=0;i<8;i++){
        clouds.push({
            x: Math.random()*W*1.3-W*0.15,
            y: 50+Math.random()*180,
            w: 80+Math.random()*160,
            h: 15+Math.random()*20,
            speed: 0.08+Math.random()*0.12,
            alpha: 0.03+Math.random()*0.04
        });
    }

    // --- Grass ---
    const grass = [];
    for(let i=0;i<500;i++){
        const gx=Math.random()*960-30;
        grass.push({
            x:gx, h:6+Math.random()*22, w:0.8+Math.random()*1.8,
            hue:85+Math.random()*45, sat:35+Math.random()*35, lit:12+Math.random()*22,
            sway:Math.random()*Math.PI*2, swaySpeed:0.25+Math.random()*0.6,
            layer: gx > shipX-50 && gx < shipX+50 ? 1 : 0 // grass near ship is foreground
        });
    }

    // --- Wild flowers ---
    const flowers = [];
    for(let i=0;i<18;i++){
        flowers.push({
            x:Math.random()*900, y:groundY-2-Math.random()*5,
            size:2+Math.random()*2.5,
            color:`hsl(${Math.random()*360},70%,${50+Math.random()*20}%)`,
            sway:Math.random()*Math.PI*2
        });
    }

    // --- Rocks / debris around ship ---
    const rocks = [];
    for(let i=0;i<12;i++){
        const rx=shipX-80+Math.random()*160;
        rocks.push({
            x:rx, y:groundY-2+Math.random()*6,
            w:5+Math.random()*12, h:3+Math.random()*7,
            color:`hsl(${30+Math.random()*20},${10+Math.random()*10}%,${18+Math.random()*12}%)`,
            rot:Math.random()*0.3-0.15
        });
    }
    // A couple around bunker
    for(let i=0;i<4;i++){
        rocks.push({
            x:bunkerX-50+Math.random()*100, y:groundY-1+Math.random()*5,
            w:4+Math.random()*8, h:2+Math.random()*5,
            color:`hsl(0,0%,${22+Math.random()*10}%)`, rot:Math.random()*0.2
        });
    }

    // --- Puddles (reflecting moonlight) ---
    const puddles = [];
    for(let i=0;i<3;i++){
        puddles.push({
            x:200+Math.random()*500, y:groundY+4+Math.random()*15,
            w:20+Math.random()*30, h:3+Math.random()*4
        });
    }

    // --- Weeds on ship ---
    const weeds = [];
    for(let i=0;i<14;i++){
        weeds.push({
            x:shipX-35+Math.random()*70, y:shipY+2+Math.random()*18,
            h:5+Math.random()*14,
            color:`hsl(${90+Math.random()*30},${30+Math.random()*20}%,${15+Math.random()*15}%)`,
            sway:Math.random()*Math.PI*2, hasFlower:Math.random()<0.3,
            flowerColor:`hsl(${Math.random()*60+280},60%,60%)`
        });
    }

    // --- Vines on bunker ---
    const vines = [];
    for(let i=0;i<6;i++){
        const startX = bunkerX-35+Math.random()*70;
        const pts=[];
        let vx=startX, vy=bunkerY-55;
        for(let s=0;s<6;s++){
            pts.push({x:vx,y:vy});
            vx+=(Math.random()-0.5)*8;
            vy+=8+Math.random()*6;
        }
        vines.push({pts, width:1+Math.random(), color:`hsl(${100+Math.random()*30},40%,${18+Math.random()*10}%)`});
    }

    // --- Wire connection points (physical hardware) ---
    // Bunker junction box: right side of bunker wall
    const bunkerPortX = bunkerX + 38;  // right edge of bunker
    const bunkerPortBaseY = bunkerY - 35; // mid-height of bunker wall
    // Ship port panel: left underside of ship hull
    const shipPortX = shipX - 28;  // left side of ship
    const shipPortBaseY = shipY + 8; // underside of hull

    // --- Wires (physically connected bunker→ship) ---
    const wires = [];
    for(let i=0;i<6;i++){
        const pts=[];
        const segs=10+Math.floor(Math.random()*5);
        const portSpacing = 7;
        // Start: exit from bunker junction box port
        const startX = bunkerPortX;
        const startY = bunkerPortBaseY + (i - 2.5) * portSpacing;
        // End: plug into ship hull port panel
        const endX = shipPortX;
        const endY = shipPortBaseY + (i - 2.5) * portSpacing;
        for(let s=0;s<=segs;s++){
            const frac=s/segs;
            const bx = startX + (endX - startX) * frac;
            // Wires exit horizontal, droop to ground, then rise back to ship
            const droop = Math.sin(frac * Math.PI) * (25 + Math.random() * 12);
            // Hang close to ground in the middle section
            const groundPull = Math.sin(frac * Math.PI) * (groundY - 10 - (startY + (endY - startY) * frac));
            const sagAmount = Math.min(droop, groundPull * 0.7);
            const jitter = (s > 0 && s < segs) ? (Math.random() - 0.5) * 4 : 0;
            pts.push({x: bx + jitter, y: startY + (endY - startY) * frac + sagAmount + jitter * 0.5});
        }
        wires.push({
            pts, width:2.5+Math.random()*2.5,
            baseColor:`hsl(${200+i*12},15%,20%)`,
            glowColor:`hsl(${170+i*12},100%,${55+Math.random()*15}%)`,
            pulseOffset:Math.random(), pulseSpeed:0.3+Math.random()*0.35,
            sparkTimer:0,
            startX, startY, endX, endY // store for port drawing
        });
    }

    // --- Data particles ---
    const dataParticles = [];
    for(let i=0;i<90;i++){
        dataParticles.push({
            wire:Math.floor(Math.random()*wires.length),
            t:-Math.random()*0.5, speed:0.005+Math.random()*0.012,
            size:1.5+Math.random()*3, alpha:0.5+Math.random()*0.5
        });
    }

    // --- Stars ---
    const cStars = [];
    for(let i=0;i<120;i++){
        cStars.push({
            x:Math.random()*W, y:Math.random()*(groundY-80),
            size:0.2+Math.random()*1.8,
            twinkle:Math.random()*Math.PI*2,
            speed:0.4+Math.random()*2.5,
            color: Math.random()<0.1 ? '#aaccff' : Math.random()<0.05 ? '#ffccaa' : '#ffffff'
        });
    }

    // --- Shooting stars ---
    const shootingStarsCut = [];

    // --- Fireflies ---
    const fireflies = [];
    for(let i=0;i<20;i++){
        fireflies.push({
            x:30+Math.random()*840, y:groundY-30-Math.random()*150,
            dx:(Math.random()-0.5)*0.35, dy:(Math.random()-0.5)*0.25,
            phase:Math.random()*Math.PI*2, size:1+Math.random()*2
        });
    }

    // --- Mist layers ---
    const mist = [];
    for(let i=0;i<5;i++){
        mist.push({
            x:Math.random()*W*1.5-W*0.25, y:groundY-20-i*15+Math.random()*10,
            w:150+Math.random()*200, h:10+Math.random()*12,
            speed:0.05+Math.random()*0.08, alpha:0.04+Math.random()*0.04
        });
    }

    // --- Ship panel lights (power on sequentially) ---
    const panelLights = [];
    for(let i=0;i<8;i++){
        const a=(i/8)*Math.PI*2;
        panelLights.push({
            angle:a, dist:0.5+Math.random()*0.3,
            on:false, onTime:0.3+i*0.08+Math.random()*0.05, // staggered
            color: i%3===0 ? '#ff4444' : i%3===1 ? '#00ff88' : '#ffaa00',
            size:1.2+Math.random()*0.8
        });
    }

    // --- Sparks pool ---
    const sparks = [];

    // --- Exhaust heat rings ---
    const heatRings = [];

    // --- Camera state ---
    const cam = {x:0, y:0, zoom:1, targetZoom:1, targetX:0, targetY:0};

    introCutscene = {
        timer:0, phase:'fadein', callback,
        groundY, bunkerX, bunkerY, shipX, shipY, shipScale,
        bunkerPortX, bunkerPortBaseY, shipPortX, shipPortBaseY,
        hills, moonX, moonY, moonR, clouds,
        bgTrees, bgStructures, auroraBands,
        grass, flowers, rocks, puddles, weeds, vines, mist,
        wires, dataParticles, cStars, shootingStarsCut, fireflies,
        panelLights, sparks, heatRings, cam,
        fadeAlpha:0, bunkerGlow:0,
        bunkerDoorOpen:0, // 0-1 how open the doors are
        wireProgress:0, shipPower:0, shipPulse:0,
        cockpitFlicker:0, engineFlame:0, engineSputter:0,
        shipLiftY:0, shipLiftSpeed:0, shipAngle:0,
        screenFlash:0, dustKick:[], shipShake:0,
        letterbox:0, // 0-1 letterbox bar size
        windStrength:0, // extra wind during liftoff
        sonicBoom:null // {x,y,r,alpha} ring
    };
}

/* ─────────────────── UPDATE ────��────────────── */
function updateIntroCutscene() {
    if(!introCutscene) return;
    const ic = introCutscene;
    ic.timer++;
    const t = ic.timer / INTRO_FPS;

    if(keys['e']||keys['E']){endIntroCutscene();return;}

    // --- Ambient updates (always) ---
    for(const ff of ic.fireflies){
        ff.x+=ff.dx; ff.y+=ff.dy; ff.phase+=0.03;
        if(ff.x<10||ff.x>W-10)ff.dx*=-1;
        if(ff.y<ic.groundY-190||ff.y>ic.groundY-15)ff.dy*=-1;
    }
    for(const c of ic.clouds) c.x+=c.speed;
    for(const m of ic.mist) m.x+=m.speed;

    // Occasional shooting star
    if(Math.random()<0.004 && ic.shootingStarsCut.length<2){
        ic.shootingStarsCut.push({
            x:Math.random()*W*0.6+W*0.2, y:Math.random()*150+20,
            dx:3+Math.random()*4, dy:1+Math.random()*2,
            life:25+Math.random()*20, maxLife:45, size:1.5
        });
    }
    for(let i=ic.shootingStarsCut.length-1;i>=0;i--){
        const s=ic.shootingStarsCut[i];
        s.x+=s.dx; s.y+=s.dy; s.life--;
        if(s.life<=0) ic.shootingStarsCut.splice(i,1);
    }

    // --- Camera ---
    const cam = ic.cam;
    cam.x += (cam.targetX - cam.x) * 0.02;
    cam.y += (cam.targetY - cam.y) * 0.02;
    cam.zoom += (cam.targetZoom - cam.zoom) * 0.015;

    // ============== PHASE LOGIC ==============
    if(t < 2.5){
        // Fade in — letterbox slides in, camera wide
        ic.phase='fadein';
        ic.fadeAlpha = Math.min(1, t/2.0);
        ic.letterbox = Math.min(1, t/1.5);
        cam.targetZoom = 1.0;
        cam.targetX = 0;
        cam.targetY = 0;

    } else if(t < 5.5){
        // Slow zoom toward bunker, bunker activates
        ic.phase='bunker_activate';
        ic.fadeAlpha=1;
        const bt = (t-2.5)/3.0;
        ic.bunkerGlow = Math.min(1, bt/0.8);
        // Door cracks open
        ic.bunkerDoorOpen = Math.min(0.3, bt*0.4);
        // Camera drifts toward bunker
        cam.targetZoom = 1.08;
        cam.targetX = -60;
        cam.targetY = 15;
        // Sparks from bunker activation
        if(t>3.0 && Math.random()<0.15){
            _spawnSparks(ic, ic.bunkerX, ic.bunkerY-20, 3, '#00ff88');
        }

    } else if(t < 8.0){
        // Camera pans along wires toward ship. Wires start glowing.
        ic.phase='wire_start';
        ic.bunkerGlow=1;
        ic.bunkerDoorOpen=0.3;
        const wt=(t-5.5)/2.5;
        ic.wireProgress = Math.min(0.5, wt*0.6);
        // Camera pans right following the energy
        cam.targetZoom = 1.05;
        cam.targetX = -60 + wt * 80;
        cam.targetY = 10;
        // Data particles start
        for(const dp of ic.dataParticles){
            if(ic.wireProgress>0.05){dp.t+=dp.speed; if(dp.t>1.1)dp.t=-Math.random()*0.3;}
        }
        // Sparks at wire-bunker connection
        if(Math.random()<0.08) _spawnSparks(ic, ic.bunkerX+40, ic.groundY-5, 2, '#00ffaa');

    } else if(t < 14.0){
        // Full transfer — ship starts receiving data, powers on panel by panel
        ic.phase='transfer';
        ic.bunkerGlow=1;
        ic.bunkerDoorOpen=0.3;
        const tt=(t-8.0)/6.0;
        ic.wireProgress = 0.5+tt*0.5;
        // Camera settles on ship
        cam.targetZoom = 1.12;
        cam.targetX = 50;
        cam.targetY = 20;
        // Data particles
        for(const dp of ic.dataParticles){dp.t+=dp.speed; if(dp.t>1.1)dp.t=-Math.random()*0.25;}
        // Ship power builds
        ic.shipPower = Math.min(1, tt*1.3);
        ic.shipPulse += 0.03 + ic.shipPower*0.05;
        // Panel lights turn on sequentially
        for(const pl of ic.panelLights){
            if(!pl.on && tt>=pl.onTime) pl.on=true;
        }
        // Cockpit flicker
        if(t>9.5 && t<11.0) ic.cockpitFlicker = Math.random()<0.35?1:0;
        else if(t>=11.0) ic.cockpitFlicker=1;
        // Sparks at wire-ship connection as data arrives
        if(Math.random()<0.06*ic.wireProgress) _spawnSparks(ic, ic.shipX-35, ic.shipY+10, 2, '#00ccff');

    } else if(t < 17.5){
        // Ship fully powered — engine ignition sequence
        ic.phase='ignition';
        ic.shipPower=1; ic.cockpitFlicker=1;
        ic.shipPulse+=0.08;
        const it=(t-14.0)/3.5;
        // Camera pulls back slightly for drama
        cam.targetZoom = 1.0;
        cam.targetX = 20;
        cam.targetY = 0;
        // Engine sputter then catch
        if(it<0.3){
            // Sputter
            ic.engineSputter = Math.random()<0.4 ? 0.3+Math.random()*0.3 : 0;
            ic.engineFlame = ic.engineSputter;
            if(ic.engineSputter>0.2) _spawnSparks(ic, ic.shipX-25, ic.shipY, 2, '#ffaa00');
        } else if(it<0.6){
            // Catch — flame grows unevenly
            ic.engineFlame = 0.3 + (it-0.3)/0.3 * 0.4 + Math.random()*0.15;
            ic.engineSputter = 0;
        } else {
            // Full power
            ic.engineFlame = Math.min(1, 0.7 + (it-0.6)*0.8);
        }
        ic.shipShake = ic.engineFlame * 2.5;
        ic.windStrength = ic.engineFlame * 0.6;
        // Ship tilts up gradually
        ic.shipAngle = -Math.PI/2 * Math.min(1, Math.max(0, (it-0.5)*2.0));
        // Wire data still flowing
        for(const dp of ic.dataParticles){dp.t+=dp.speed; if(dp.t>1.1)dp.t=-Math.random()*0.2;}
        // Heat rings under ship
        if(ic.engineFlame>0.5 && ic.timer%8===0){
            ic.heatRings.push({x:ic.shipX, y:ic.groundY, r:5, maxR:60+Math.random()*30, alpha:0.15});
        }

    } else if(t < 22.0){
        // LIFTOFF
        ic.phase='liftoff';
        ic.engineFlame=1; ic.cockpitFlicker=1;
        ic.shipAngle=-Math.PI/2;
        const lt=(t-17.5)/4.5;
        // Accelerate upward (ease-in)
        ic.shipLiftSpeed += 0.18 + lt*0.3;
        ic.shipLiftY += ic.shipLiftSpeed;
        ic.shipShake = Math.max(0, 3.5 - lt*5);
        ic.windStrength = Math.max(0, 1.0 - lt*0.5);
        // Camera follows ship up then lets it go
        cam.targetY = Math.min(0, -ic.shipLiftY*0.15);
        cam.targetZoom = 1.0 - lt*0.08;
        // Massive dust/debris kick
        if(t<19.0 && ic.timer%2===0){
            for(let i=0;i<5;i++){
                ic.dustKick.push({
                    x:ic.shipX+(Math.random()-0.5)*60, y:ic.groundY-3,
                    dx:(Math.random()-0.5)*4.5, dy:-Math.random()*2.5-0.5,
                    life:50+Math.random()*40, maxLife:90,
                    size:2+Math.random()*7, color: Math.random()<0.3 ? '#6a7a4a':'#8a7a5a'
                });
            }
        }
        // Wires snap
        if(ic.shipLiftY>20) ic.wireProgress=Math.max(0,ic.wireProgress-0.03);
        // Sonic boom ring at moment of blast
        if(!ic.sonicBoom && ic.shipLiftSpeed > 5){
            ic.sonicBoom = {x:ic.shipX, y:ic.shipY-ic.shipLiftY+50, r:10, maxR:250, alpha:0.7};
        }
        // Heat rings
        if(ic.timer%4===0 && ic.shipLiftY<300){
            ic.heatRings.push({x:ic.shipX, y:ic.shipY-ic.shipLiftY+25, r:3, maxR:40, alpha:0.1});
        }
        // Grass fire/scorch near ship
        for(const g of ic.grass){
            if(Math.abs(g.x-ic.shipX)<60 && ic.shipLiftY<80){
                g.lit = Math.min(50, g.lit+0.3);
                g.hue = Math.max(30, g.hue-0.5);
            }
        }

    } else if(t < INTRO_DURATION){
        // Flash out
        ic.phase='flash';
        ic.screenFlash = Math.min(1,(t-22.0)/0.8);
        ic.letterbox = Math.max(0, 1-(t-22.5)*2);
    } else {
        endIntroCutscene(); return;
    }

    // --- Update sparks ---
    for(let i=ic.sparks.length-1;i>=0;i--){
        const s=ic.sparks[i];
        s.x+=s.dx; s.y+=s.dy; s.dy+=0.15; s.life--;
        if(s.life<=0)ic.sparks.splice(i,1);
    }
    // --- Update dust ---
    for(let i=ic.dustKick.length-1;i>=0;i--){
        const d=ic.dustKick[i];
        d.x+=d.dx; d.y+=d.dy; d.dy+=0.02; d.dx*=0.98; d.life--;
        if(d.life<=0)ic.dustKick.splice(i,1);
    }
    // --- Update heat rings ---
    for(let i=ic.heatRings.length-1;i>=0;i--){
        const h=ic.heatRings[i];
        h.r+= 1.5; h.alpha*=0.96;
        if(h.r>=h.maxR||h.alpha<0.005)ic.heatRings.splice(i,1);
    }
    // --- Update sonic boom ---
    if(ic.sonicBoom){
        ic.sonicBoom.r+=6; ic.sonicBoom.alpha*=0.94;
        if(ic.sonicBoom.alpha<0.01) ic.sonicBoom=null;
    }
}

function _spawnSparks(ic,x,y,count,color){
    for(let i=0;i<count;i++){
        ic.sparks.push({
            x, y, dx:(Math.random()-0.5)*4, dy:-Math.random()*3-1,
            life:10+Math.random()*15, maxLife:25,
            size:1+Math.random()*1.5, color
        });
    }
}

function endIntroCutscene(){
    const cb=introCutscene?introCutscene.callback:null;
    introCutscene=null;
    if(cb)cb();
}

/* ─────────────────── DRAW ─────────────────── */
function drawIntroCutscene(){
    if(!introCutscene) return;
    const ic=introCutscene, t=ic.timer/INTRO_FPS;
    const cam=ic.cam;

    // Clear
    ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);

    // Letterbox bars
    const barH = ic.letterbox * 45;

    ctx.save();
    ctx.globalAlpha=ic.fadeAlpha;

    // Camera transform
    ctx.translate(W/2, H/2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-W/2+cam.x, -H/2+cam.y);

    // ══════════ SKY ══════════
    const skyGrad=ctx.createLinearGradient(0,0,0,ic.groundY);
    skyGrad.addColorStop(0,'#030610');
    skyGrad.addColorStop(0.3,'#081428');
    skyGrad.addColorStop(0.6,'#0c1e30');
    skyGrad.addColorStop(1,'#122418');
    ctx.fillStyle=skyGrad; ctx.fillRect(-50,-50,W+100,ic.groundY+50);

    // Stars
    for(const s of ic.cStars){
        const tw=0.2+0.8*Math.abs(Math.sin(t*s.speed+s.twinkle));
        ctx.globalAlpha=ic.fadeAlpha*tw;
        ctx.fillStyle=s.color;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.size,0,Math.PI*2); ctx.fill();
    }

    // Shooting stars
    for(const s of ic.shootingStarsCut){
        ctx.globalAlpha=ic.fadeAlpha*(s.life/s.maxLife)*0.8;
        ctx.strokeStyle='#ffffff';
        ctx.lineWidth=s.size;
        ctx.shadowBlur=6; ctx.shadowColor='#ffffff';
        ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(s.x-s.dx*5,s.y-s.dy*5); ctx.stroke();
        ctx.shadowBlur=0;
    }

    // Aurora / nebula
    for(const ab of ic.auroraBands){
        ctx.globalAlpha=ic.fadeAlpha*ab.alpha;
        ctx.fillStyle=`hsl(${ab.hue},60%,50%)`;
        ctx.beginPath();
        ctx.moveTo(ab.pts[0].x, ab.pts[0].y+Math.sin(t*ab.speed)*8);
        for(let i=1;i<ab.pts.length;i++){
            const prev=ab.pts[i-1], cur=ab.pts[i];
            const sway=Math.sin(t*ab.speed+i*0.8)*10;
            ctx.quadraticCurveTo((prev.x+cur.x)/2, (prev.y+cur.y)/2+sway, cur.x, cur.y+sway);
        }
        // Close bottom
        for(let i=ab.pts.length-1;i>=0;i--){
            const sway=Math.sin(t*ab.speed+i*0.8+1)*8;
            ctx.lineTo(ab.pts[i].x, ab.pts[i].y+ab.width+sway);
        }
        ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha=ic.fadeAlpha;

    // Moon
    ctx.globalAlpha=ic.fadeAlpha;
    _drawMoon(ic,t);

    // Clouds
    for(const c of ic.clouds){
        ctx.globalAlpha=ic.fadeAlpha*c.alpha;
        ctx.fillStyle='#8899aa';
        const cx=((c.x+t*c.speed*60)%(W+c.w*2))-c.w;
        ctx.beginPath();
        ctx.ellipse(cx,c.y,c.w/2,c.h/2,0,0,Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha=ic.fadeAlpha;

    // ══════════ HILLS ══════════
    for(const hill of ic.hills){
        ctx.fillStyle=hill.color;
        ctx.beginPath();
        ctx.moveTo(-20,ic.groundY);
        for(const p of hill.pts) ctx.lineTo(p.x,p.y);
        ctx.lineTo(W+20,ic.groundY);
        ctx.closePath();
        ctx.fill();
    }

    // ══════════ DISTANT TREES (forest silhouette) ══════════
    ctx.globalAlpha=ic.fadeAlpha*0.7;
    for(const tr of ic.bgTrees){
        ctx.fillStyle='#0a1a0a';
        if(tr.type==='pine'){
            // Pine tree silhouette
            ctx.beginPath();
            ctx.moveTo(tr.x, ic.groundY);
            ctx.lineTo(tr.x-tr.w/2, ic.groundY);
            ctx.lineTo(tr.x-tr.w*0.1, ic.groundY-tr.h*0.4);
            ctx.lineTo(tr.x-tr.w*0.4, ic.groundY-tr.h*0.4);
            ctx.lineTo(tr.x, ic.groundY-tr.h);
            ctx.lineTo(tr.x+tr.w*0.4, ic.groundY-tr.h*0.4);
            ctx.lineTo(tr.x+tr.w*0.1, ic.groundY-tr.h*0.4);
            ctx.lineTo(tr.x+tr.w/2, ic.groundY);
            ctx.closePath(); ctx.fill();
        } else {
            // Round tree silhouette
            ctx.fillRect(tr.x-2,ic.groundY-tr.h*0.5,4,tr.h*0.5);
            ctx.beginPath(); ctx.arc(tr.x,ic.groundY-tr.h*0.65,tr.w*0.5,0,Math.PI*2); ctx.fill();
        }
    }

    // ══════════ DISTANT STRUCTURES ══════════
    ctx.globalAlpha=ic.fadeAlpha*0.5;
    for(const st of ic.bgStructures){
        ctx.fillStyle='#111a11';
        if(st.type==='tower'){
            // Radio tower — lattice shape
            ctx.lineWidth=1.5; ctx.strokeStyle='#111a11';
            ctx.beginPath(); ctx.moveTo(st.x-st.w/2,ic.groundY); ctx.lineTo(st.x,ic.groundY-st.h); ctx.lineTo(st.x+st.w/2,ic.groundY); ctx.stroke();
            // Cross braces
            for(let b=0;b<4;b++){
                const by=ic.groundY-st.h*((b+1)/5);
                const bw=st.w/2*(1-(b+1)/5);
                ctx.beginPath(); ctx.moveTo(st.x-bw,by); ctx.lineTo(st.x+bw,by); ctx.stroke();
            }
            // Blinking red light on top
            ctx.fillStyle=(Math.sin(t*2)>0)?'#ff2222':'#441111';
            ctx.shadowBlur=(Math.sin(t*2)>0)?8:0; ctx.shadowColor='#ff2222';
            ctx.beginPath(); ctx.arc(st.x,ic.groundY-st.h-3,2,0,Math.PI*2); ctx.fill();
            ctx.shadowBlur=0;
        } else if(st.type==='pole'){
            // Power line pole
            ctx.fillRect(st.x-st.w/2,ic.groundY-st.h,st.w,st.h);
            ctx.fillRect(st.x-12,ic.groundY-st.h-2,24,3);
        } else if(st.type==='ruin'){
            // Ruined wall
            ctx.fillRect(st.x-st.w/2,ic.groundY-st.h,st.w,st.h);
            // Broken top edge
            ctx.fillRect(st.x-st.w/2,ic.groundY-st.h-5,st.w*0.3,5);
            ctx.fillRect(st.x+st.w*0.1,ic.groundY-st.h-8,st.w*0.2,8);
        }
    }
    ctx.globalAlpha=ic.fadeAlpha;

    // ══════════ GROUND ══════════
    const gndGrad=ctx.createLinearGradient(0,ic.groundY,0,H+50);
    gndGrad.addColorStop(0,'#1a3318'); gndGrad.addColorStop(0.15,'#162e14');
    gndGrad.addColorStop(0.5,'#102410'); gndGrad.addColorStop(1,'#081808');
    ctx.fillStyle=gndGrad; ctx.fillRect(-50,ic.groundY,W+100,H-ic.groundY+50);

    // Dirt patches
    ctx.globalAlpha=ic.fadeAlpha*0.15;
    ctx.fillStyle='#3a2e1a';
    ctx.beginPath(); ctx.ellipse(ic.shipX,ic.groundY+5,55,8,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(320,ic.groundY+8,30,5,0.2,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=ic.fadeAlpha;

    // Puddles
    for(const p of ic.puddles){
        ctx.globalAlpha=ic.fadeAlpha*0.12;
        ctx.fillStyle='#334466';
        ctx.beginPath(); ctx.ellipse(p.x,p.y,p.w/2,p.h/2,0,0,Math.PI*2); ctx.fill();
        // Moon reflection in puddle
        ctx.globalAlpha=ic.fadeAlpha*0.04;
        ctx.fillStyle='#aabbcc';
        ctx.beginPath(); ctx.ellipse(p.x+3,p.y,4,1.5,0,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=ic.fadeAlpha;

    // Ground line
    ctx.strokeStyle='#2a4a22'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-50,ic.groundY); ctx.lineTo(W+50,ic.groundY); ctx.stroke();

    // ══════════ GRASS (back layer) ════���═════
    const windExtra = ic.windStrength||0;
    for(const g of ic.grass){
        if(g.layer===1) continue;
        const windBias = (g.x>ic.shipX-80&&g.x<ic.shipX+80) ? windExtra*6 : windExtra*2;
        const sway=Math.sin(t*g.swaySpeed+g.sway)*3 + windBias;
        ctx.strokeStyle=`hsl(${g.hue},${g.sat}%,${g.lit}%)`;
        ctx.lineWidth=g.w;
        ctx.beginPath(); ctx.moveTo(g.x,ic.groundY);
        ctx.quadraticCurveTo(g.x+sway*0.4, ic.groundY-g.h*0.6, g.x+sway, ic.groundY-g.h);
        ctx.stroke();
    }

    // Flowers
    for(const f of ic.flowers){
        const sway=Math.sin(t*0.6+f.sway)*2+windExtra*3;
        ctx.fillStyle=f.color; ctx.globalAlpha=ic.fadeAlpha*0.7;
        ctx.beginPath(); ctx.arc(f.x+sway, f.y-8-f.size, f.size, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle='#2a4a1a'; ctx.lineWidth=0.8; ctx.globalAlpha=ic.fadeAlpha*0.5;
        ctx.beginPath(); ctx.moveTo(f.x,f.y); ctx.lineTo(f.x+sway,f.y-8); ctx.stroke();
    }
    ctx.globalAlpha=ic.fadeAlpha;

    // ══════════ MIST ══════════
    for(const m of ic.mist){
        ctx.globalAlpha=ic.fadeAlpha*m.alpha;
        ctx.fillStyle='#aaccaa';
        const mx=((m.x+t*m.speed*60)%(W+m.w*2))-m.w;
        ctx.beginPath(); ctx.ellipse(mx,m.y,m.w/2,m.h/2,0,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=ic.fadeAlpha;

    // Fireflies
    for(const ff of ic.fireflies){
        const glow=0.2+0.8*Math.abs(Math.sin(ff.phase));
        ctx.globalAlpha=ic.fadeAlpha*glow*0.55;
        ctx.fillStyle='#aaff44'; ctx.shadowBlur=14; ctx.shadowColor='#aaff44';
        ctx.beginPath(); ctx.arc(ff.x,ff.y,ff.size,0,Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur=0; ctx.globalAlpha=ic.fadeAlpha;

    // ══════════ ROCKS ══════════
    for(const rk of ic.rocks){
        ctx.save(); ctx.translate(rk.x,rk.y); ctx.rotate(rk.rot);
        ctx.fillStyle=rk.color;
        ctx.beginPath();
        ctx.moveTo(-rk.w/2, 0);
        ctx.lineTo(-rk.w*0.3, -rk.h);
        ctx.lineTo(rk.w*0.3, -rk.h*0.8);
        ctx.lineTo(rk.w/2, 0);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    // ══════════ BUNKER ══════════
    _drawBunker(ic,t);

    // ══════════ WIRES ═���════════
    _drawWires(ic,t);

    // ══════════ HEAT RINGS (behind ship) ══���═══════
    for(const h of ic.heatRings){
        ctx.globalAlpha=ic.fadeAlpha*h.alpha;
        ctx.strokeStyle='rgba(255,200,100,0.3)';
        ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI*2); ctx.stroke();
    }
    ctx.globalAlpha=ic.fadeAlpha;

    // ══════════ SHIP ══════════
    _drawShip(ic,t);

    // ══════════ WEEDS ON SHIP ══════════
    if(ic.shipPower<0.9){
        ctx.globalAlpha=ic.fadeAlpha*(1-ic.shipPower*1.1);
        for(const w of ic.weeds){
            const sway=Math.sin(t*0.7+w.sway)*2.5+windExtra*4;
            ctx.strokeStyle=w.color; ctx.lineWidth=1.2;
            ctx.beginPath(); ctx.moveTo(w.x,w.y-ic.shipLiftY);
            ctx.quadraticCurveTo(w.x+sway*0.5,w.y-w.h*0.5-ic.shipLiftY, w.x+sway,w.y-w.h-ic.shipLiftY);
            ctx.stroke();
            if(w.hasFlower){
                ctx.fillStyle=w.flowerColor;
                ctx.beginPath(); ctx.arc(w.x+sway,w.y-w.h-ic.shipLiftY,1.8,0,Math.PI*2); ctx.fill();
            }
        }
        ctx.globalAlpha=ic.fadeAlpha;
    }

    // ══════════ GRASS (front layer — over ship base) ══════════
    for(const g of ic.grass){
        if(g.layer!==1) continue;
        const windBias=windExtra*8;
        const sway=Math.sin(t*g.swaySpeed+g.sway)*3+windBias;
        ctx.strokeStyle=`hsl(${g.hue},${g.sat}%,${g.lit}%)`;
        ctx.lineWidth=g.w;
        ctx.beginPath(); ctx.moveTo(g.x,ic.groundY);
        ctx.quadraticCurveTo(g.x+sway*0.4,ic.groundY-g.h*0.6,g.x+sway,ic.groundY-g.h);
        ctx.stroke();
    }

    // ══════════ DUST PARTICLES ══════════
    for(const d of ic.dustKick){
        ctx.globalAlpha=ic.fadeAlpha*(d.life/d.maxLife)*0.6;
        ctx.fillStyle=d.color||'#8a7a5a';
        ctx.beginPath(); ctx.arc(d.x,d.y,d.size,0,Math.PI*2); ctx.fill();
    }

    // ══════════ SPARKS ══════════
    ctx.shadowBlur=6;
    for(const s of ic.sparks){
        ctx.globalAlpha=ic.fadeAlpha*(s.life/s.maxLife);
        ctx.fillStyle=s.color; ctx.shadowColor=s.color;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.size,0,Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur=0;

    // ══════════ SONIC BOOM ══════════
    if(ic.sonicBoom){
        const sb=ic.sonicBoom;
        ctx.globalAlpha=ic.fadeAlpha*sb.alpha;
        ctx.strokeStyle='rgba(255,255,255,0.6)';
        ctx.lineWidth=3;
        ctx.shadowBlur=15; ctx.shadowColor='#ffffff';
        ctx.beginPath(); ctx.arc(sb.x,sb.y,sb.r,0,Math.PI*2); ctx.stroke();
        ctx.shadowBlur=0;
    }

    ctx.restore(); // camera transform

    // ══════════ LETTERBOX BARS ══════════
    if(barH>0.5){
        ctx.fillStyle='#000';
        ctx.fillRect(0,0,W,barH);
        ctx.fillRect(0,H-barH,W,barH);
    }

    // ══════════ SKIP HINT ══════════
    ctx.globalAlpha=0.25;
    ctx.font='11px Courier New'; ctx.textAlign='right'; ctx.fillStyle='#777';
    ctx.fillText('Press E to skip', W-15, H-barH-8);
    ctx.globalAlpha=1;

    // ══════════ SCREEN FLASH ══════════
    if(ic.screenFlash>0){
        ctx.globalAlpha=ic.screenFlash;
        ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
        ctx.globalAlpha=1;
    }
}

/* ─────────── MOON ─────────── */
function _drawMoon(ic,t){
    const mx=ic.moonX, my=ic.moonY, mr=ic.moonR;
    // Outer glow
    ctx.globalAlpha=ic.fadeAlpha*0.08;
    const mg=ctx.createRadialGradient(mx,my,mr*0.5,mx,my,mr*4);
    mg.addColorStop(0,'#aabbcc'); mg.addColorStop(1,'transparent');
    ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(mx,my,mr*4,0,Math.PI*2); ctx.fill();
    // Moon body
    ctx.globalAlpha=ic.fadeAlpha*0.9;
    ctx.fillStyle='#c8ccd4';
    ctx.beginPath(); ctx.arc(mx,my,mr,0,Math.PI*2); ctx.fill();
    // Craters
    ctx.globalAlpha=ic.fadeAlpha*0.12;
    ctx.fillStyle='#8a8e96';
    ctx.beginPath(); ctx.arc(mx-8,my-5,6,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx+10,my+8,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx-3,my+10,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx+6,my-9,2.5,0,Math.PI*2); ctx.fill();
    // Highlight
    ctx.globalAlpha=ic.fadeAlpha*0.15;
    ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.arc(mx-6,my-8,mr*0.6,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=ic.fadeAlpha;
}

/* ─────────── BUNKER ─────────── */
function _drawBunker(ic,t){
    const bx=ic.bunkerX, by=ic.bunkerY;
    ctx.save();

    // Foundation / half-buried
    ctx.fillStyle='#2e2e2e'; ctx.fillRect(bx-42,by-2,84,18);
    // Main concrete body
    ctx.fillStyle='#3a3a3a'; ctx.fillRect(bx-38,by-55,76,58);
    // Top slab overhang
    ctx.fillStyle='#434343'; ctx.fillRect(bx-44,by-60,88,8);
    // Side pillars
    ctx.fillStyle='#333'; ctx.fillRect(bx-38,by-55,6,58); ctx.fillRect(bx+32,by-55,6,58);

    // Concrete texture (cracks)
    ctx.strokeStyle='#2a2a2a'; ctx.lineWidth=0.5; ctx.globalAlpha=ic.fadeAlpha*0.4;
    ctx.beginPath(); ctx.moveTo(bx-20,by-55); ctx.lineTo(bx-25,by-30); ctx.lineTo(bx-18,by-10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx+15,by-52); ctx.lineTo(bx+20,by-35); ctx.stroke();
    ctx.globalAlpha=ic.fadeAlpha;

    // Door recess
    ctx.fillStyle='#1a1a1a'; ctx.fillRect(bx-26,by-48,52,50);
    // Door panels
    const doorGap = ic.bunkerDoorOpen * 12;
    ctx.fillStyle='#252525';
    ctx.fillRect(bx-25, by-47, 24-doorGap, 48); // left door
    ctx.fillRect(bx+1+doorGap, by-47, 24-doorGap, 48); // right door
    // Door frame
    ctx.strokeStyle='#4a4a4a'; ctx.lineWidth=2; ctx.strokeRect(bx-26,by-48,52,50);
    // Door rivets
    ctx.fillStyle='#555'; ctx.globalAlpha=ic.fadeAlpha*0.6;
    for(let ry=0;ry<4;ry++){
        ctx.beginPath(); ctx.arc(bx-23,by-42+ry*12,1.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx+23,by-42+ry*12,1.5,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=ic.fadeAlpha;

    // Warning stripes (bottom)
    for(let i=0;i<6;i++){
        ctx.fillStyle=i%2===0?'#554400':'#333';
        ctx.fillRect(bx-25+i*9,by-1,8,4);
    }

    // Vent slats on top
    ctx.fillStyle='#2a2a2a';
    for(let i=0;i<3;i++) ctx.fillRect(bx-12+i*10,by-58,6,2);

    // Vines
    for(const v of ic.vines){
        ctx.strokeStyle=v.color; ctx.lineWidth=v.width; ctx.globalAlpha=ic.fadeAlpha*0.6;
        ctx.beginPath(); ctx.moveTo(v.pts[0].x,v.pts[0].y);
        for(let i=1;i<v.pts.length;i++){
            const sway=Math.sin(t*0.3+i)*1.5;
            ctx.lineTo(v.pts[i].x+sway,v.pts[i].y);
        }
        ctx.stroke();
        // Tiny leaves
        for(let i=1;i<v.pts.length;i+=2){
            ctx.fillStyle=`hsl(${105+Math.random()*20},35%,22%)`;
            ctx.beginPath(); ctx.ellipse(v.pts[i].x+2,v.pts[i].y,3,1.5,0.5,0,Math.PI*2); ctx.fill();
        }
    }
    ctx.globalAlpha=ic.fadeAlpha;

    // Moss patches
    ctx.globalAlpha=ic.fadeAlpha*0.3; ctx.fillStyle='#2a3a1a';
    ctx.fillRect(bx-38,by-5,20,7);
    ctx.fillRect(bx+18,by-57,16,6);
    ctx.beginPath(); ctx.ellipse(bx+25,by-3,10,4,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=ic.fadeAlpha;

    // Activation glow (from inside)
    if(ic.bunkerGlow>0){
        ctx.globalAlpha=ic.fadeAlpha*ic.bunkerGlow;
        // Light through door gap
        const gapW = Math.max(2, doorGap*2);
        ctx.shadowBlur=30; ctx.shadowColor='#00ff88';
        ctx.fillStyle='#00ff88';
        ctx.fillRect(bx-gapW/2,by-46,gapW,46);
        // Light spill on ground
        ctx.globalAlpha=ic.fadeAlpha*ic.bunkerGlow*0.2;
        const groundGlow=ctx.createRadialGradient(bx,by+5,0,bx,by+5,80);
        groundGlow.addColorStop(0,'#00ff88'); groundGlow.addColorStop(1,'transparent');
        ctx.fillStyle=groundGlow;
        ctx.fillRect(bx-80,by,160,30);
        // Volumetric light cone
        ctx.globalAlpha=ic.fadeAlpha*ic.bunkerGlow*0.06;
        ctx.fillStyle='#00ff88';
        ctx.beginPath(); ctx.moveTo(bx-3,by-46); ctx.lineTo(bx-35,by-100); ctx.lineTo(bx+35,by-100); ctx.lineTo(bx+3,by-46); ctx.closePath(); ctx.fill();
        // Status lights
        ctx.globalAlpha=ic.fadeAlpha*ic.bunkerGlow;
        ctx.shadowBlur=8;
        ctx.fillStyle='#00ff88'; ctx.shadowColor='#00ff88';
        ctx.beginPath(); ctx.arc(bx+25,by-40,2.5,0,Math.PI*2); ctx.fill();
        // Second light blinks
        ctx.fillStyle= Math.sin(t*4)>0 ? '#ffaa00':'#553300'; ctx.shadowColor='#ffaa00';
        ctx.beginPath(); ctx.arc(bx+25,by-33,2,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0; ctx.globalAlpha=ic.fadeAlpha;
    }

    // Dead status light (before activation)
    if(ic.bunkerGlow<=0){
        ctx.fillStyle='#331111'; ctx.globalAlpha=ic.fadeAlpha*0.5;
        ctx.beginPath(); ctx.arc(bx+25,by-40,2.5,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=ic.fadeAlpha;
    }

    ctx.restore();
}

/* ─────────── WIRES ─────────���─ */
function _drawWires(ic,t){
    ctx.save();
    for(const wire of ic.wires){
        // Cable shadow
        ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=wire.width+2;
        ctx.globalAlpha=ic.fadeAlpha*0.3;
        ctx.beginPath(); ctx.moveTo(wire.pts[0].x,wire.pts[0].y+3);
        for(let i=1;i<wire.pts.length;i++){
            const prev=wire.pts[i-1],cur=wire.pts[i];
            ctx.quadraticCurveTo(prev.x,prev.y+3,(prev.x+cur.x)/2,(prev.y+cur.y)/2+3);
        }
        ctx.lineTo(wire.pts[wire.pts.length-1].x,wire.pts[wire.pts.length-1].y+3); ctx.stroke();

        // Cable body
        ctx.strokeStyle=wire.baseColor; ctx.lineWidth=wire.width;
        ctx.globalAlpha=ic.fadeAlpha*0.85;
        ctx.beginPath(); ctx.moveTo(wire.pts[0].x,wire.pts[0].y);
        for(let i=1;i<wire.pts.length;i++){
            const prev=wire.pts[i-1],cur=wire.pts[i];
            ctx.quadraticCurveTo(prev.x,prev.y,(prev.x+cur.x)/2,(prev.y+cur.y)/2);
        }
        const last=wire.pts[wire.pts.length-1];
        ctx.lineTo(last.x,last.y); ctx.stroke();

        // Cable highlight (top edge)
        ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
        ctx.globalAlpha=ic.fadeAlpha*0.5;
        ctx.beginPath(); ctx.moveTo(wire.pts[0].x,wire.pts[0].y-wire.width/2);
        for(let i=1;i<wire.pts.length;i++){
            const prev=wire.pts[i-1],cur=wire.pts[i];
            ctx.quadraticCurveTo(prev.x,prev.y-wire.width/2,(prev.x+cur.x)/2,(prev.y+cur.y)/2-wire.width/2);
        }
        ctx.stroke();

        // Glow when active
        if(ic.wireProgress>0){
            ctx.strokeStyle=wire.glowColor; ctx.lineWidth=wire.width+3;
            ctx.globalAlpha=ic.fadeAlpha*ic.wireProgress*0.35;
            ctx.shadowBlur=15; ctx.shadowColor=wire.glowColor;
            ctx.beginPath(); ctx.moveTo(wire.pts[0].x,wire.pts[0].y);
            for(let i=1;i<wire.pts.length;i++){
                const prev=wire.pts[i-1],cur=wire.pts[i];
                ctx.quadraticCurveTo(prev.x,prev.y,(prev.x+cur.x)/2,(prev.y+cur.y)/2);
            }
            ctx.lineTo(last.x,last.y); ctx.stroke();
            ctx.shadowBlur=0;

            // Multiple energy pulses per wire
            for(let p=0;p<3;p++){
                const pulseT=((t*wire.pulseSpeed+wire.pulseOffset+p*0.33)%1);
                const pt=_ptOnWire(wire,pulseT);
                ctx.globalAlpha=ic.fadeAlpha*ic.wireProgress*0.85;
                ctx.fillStyle='#ffffff'; ctx.shadowBlur=20; ctx.shadowColor=wire.glowColor;
                ctx.beginPath(); ctx.arc(pt.x,pt.y,3.5,0,Math.PI*2); ctx.fill();
                ctx.shadowBlur=0;
            }
        }
    }

    // ── BUNKER JUNCTION BOX (wires exit here) ──
    ctx.globalAlpha=ic.fadeAlpha;
    const jbx=ic.bunkerPortX, jby=ic.bunkerPortBaseY;
    // Metal box bolted to bunker wall
    ctx.fillStyle='#2e2e2e';
    ctx.fillRect(jbx-4, jby-25, 14, 50);
    ctx.strokeStyle='#4a4a4a'; ctx.lineWidth=1.5;
    ctx.strokeRect(jbx-4, jby-25, 14, 50);
    // Bolts
    ctx.fillStyle='#555';
    ctx.beginPath(); ctx.arc(jbx+1,jby-22,1.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(jbx+7,jby-22,1.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(jbx+1,jby+22,1.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(jbx+7,jby+22,1.5,0,Math.PI*2); ctx.fill();
    // Individual ports with rings
    for(let i=0;i<ic.wires.length;i++){
        const w=ic.wires[i];
        const py=w.startY;
        // Port socket ring
        ctx.strokeStyle=ic.wireProgress>0?w.glowColor:'#444'; ctx.lineWidth=1.5;
        ctx.fillStyle=ic.wireProgress>0?'#1a1a1a':'#181818';
        ctx.beginPath(); ctx.arc(jbx+5, py, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // Port center (glows when active)
        ctx.fillStyle=ic.wireProgress>0?w.glowColor:'#222';
        if(ic.wireProgress>0){ ctx.shadowBlur=6; ctx.shadowColor=w.glowColor; }
        ctx.beginPath(); ctx.arc(jbx+5, py, 2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
    }
    // Label on junction box
    ctx.font='6px Courier New'; ctx.textAlign='center';
    ctx.fillStyle='#666'; ctx.globalAlpha=ic.fadeAlpha*0.5;
    ctx.fillText('DATA', jbx+5, jby-27);
    ctx.fillText('OUT', jbx+5, jby+30);

    // ── SHIP PORT PANEL (wires plug in here) ──
    ctx.globalAlpha=ic.fadeAlpha;
    const spx=ic.shipPortX, spy=ic.shipPortBaseY;
    // Metal access panel on ship hull (moves with ship)
    const sLiftY=ic.shipLiftY||0;
    const sShk=ic.shipShake||0;
    const panelX=spx+(sShk>0?(Math.random()-0.5)*sShk:0);
    const panelY=spy-sLiftY+(sShk>0?(Math.random()-0.5)*sShk:0);
    // Panel backing
    ctx.fillStyle=ic.shipPower>0.3?'#2a2a2a':'#222';
    ctx.fillRect(panelX-5, panelY-25, 12, 50);
    ctx.strokeStyle=ic.shipPower>0.3?(_lerpColor('#444444',ic.wires[0].glowColor,ic.shipPower*0.3)):'#3a3a3a';
    ctx.lineWidth=1; ctx.strokeRect(panelX-5, panelY-25, 12, 50);
    // Individual ship ports
    for(let i=0;i<ic.wires.length;i++){
        const w=ic.wires[i];
        const py=w.endY - sLiftY + (sShk>0?(Math.random()-0.5)*sShk:0);
        ctx.strokeStyle=ic.shipPower>0.1?w.glowColor:'#3a3a3a'; ctx.lineWidth=1.5;
        ctx.fillStyle=ic.shipPower>0.1?'#1a1a1a':'#161616';
        ctx.beginPath(); ctx.arc(panelX+1, py, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle=ic.shipPower>0.1?w.glowColor:'#1e1e1e';
        if(ic.shipPower>0.1){ ctx.shadowBlur=5; ctx.shadowColor=w.glowColor; }
        ctx.beginPath(); ctx.arc(panelX+1, py, 2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
    }

    // Data characters
    if(ic.wireProgress>0.1){
        ctx.font='8px Courier New';
        for(const dp of ic.dataParticles){
            if(dp.t<0||dp.t>1) continue;
            const pt=_ptOnWire(ic.wires[dp.wire],dp.t);
            ctx.globalAlpha=ic.fadeAlpha*dp.alpha*ic.wireProgress*0.6;
            ctx.fillStyle='#00ffaa'; ctx.shadowBlur=5; ctx.shadowColor='#00ffaa';
            ctx.fillText(String.fromCharCode(0x30+(Math.floor(dp.t*100+dp.wire*7)%42)),pt.x-3,pt.y+3);
        }
        ctx.shadowBlur=0;
    }
    ctx.restore();
}

/* ��────────── SHIP ─────────── */
function _drawShip(ic,t){
    const shk=ic.shipShake||0;
    const sx=ic.shipX + (shk>0?(Math.random()-0.5)*shk:0);
    const sy=ic.shipY - ic.shipLiftY + (shk>0?(Math.random()-0.5)*shk:0);

    ctx.save(); ctx.translate(sx,sy);

    const _cls=(G.slotId&&saves[G.slotId]&&saves[G.slotId].playerClass)?saves[G.slotId].playerClass:'none';
    const _shape=CLASS_SHIPS[_cls]||CLASS_SHIPS.none;
    const _clsDef=(typeof CLASS_DEFS!=='undefined'&&CLASS_DEFS[_cls])?CLASS_DEFS[_cls]:{color:'#00ccff'};
    const shipCol=_clsDef.color||'#00ccff';

    ctx.rotate(ic.shipAngle||0);
    const r=14*ic.shipScale/2;

    // ── Landing struts (before liftoff) ──
    if(ic.shipLiftY<5){
        ctx.globalAlpha=ic.fadeAlpha*0.7;
        ctx.strokeStyle='#444'; ctx.lineWidth=2;
        // Left strut
        ctx.beginPath(); ctx.moveTo(-r*0.5,r*0.3); ctx.lineTo(-r*0.7,r*0.9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r*0.7,r*0.9); ctx.lineTo(-r*0.9,r*0.9); ctx.stroke();
        // Right strut
        ctx.beginPath(); ctx.moveTo(r*0.3,r*0.3); ctx.lineTo(r*0.5,r*0.9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r*0.5,r*0.9); ctx.lineTo(r*0.3,r*0.9); ctx.stroke();
        ctx.globalAlpha=ic.fadeAlpha;
    }

    // ── Glow aura ──
    if(ic.shipPower>0){
        for(let ring=3;ring>=0;ring--){
            const rr=r+8+ic.shipPower*(20+ring*10)+Math.sin(ic.shipPulse+ring)*4;
            ctx.globalAlpha=ic.fadeAlpha*ic.shipPower*0.05*(4-ring)/4;
            const grd=ctx.createRadialGradient(0,0,r*0.3,0,0,rr);
            grd.addColorStop(0,shipCol); grd.addColorStop(0.5,shipCol+'33'); grd.addColorStop(1,'transparent');
            ctx.fillStyle=grd;
            ctx.beginPath(); ctx.arc(0,0,rr,0,Math.PI*2); ctx.fill();
        }
    }

    // ── Engine flame ──
    const flame = ic.engineFlame||0;
    if(flame>0){
        ctx.globalAlpha=ic.fadeAlpha*flame;
        const fs=r*(_shape.flameX||-0.4);
        const fLen=r*1.5+Math.random()*r*flame*1.2;
        const fW=r*0.45;
        // Outer glow
        ctx.shadowBlur=30; ctx.shadowColor=shipCol;
        ctx.fillStyle=shipCol;
        ctx.beginPath();
        ctx.moveTo(fs,-fW);
        ctx.quadraticCurveTo(fs-fLen*0.6, -fW*0.8-Math.random()*3, fs-fLen, -fW*0.15-Math.random()*2);
        ctx.quadraticCurveTo(fs-fLen*0.7, 0, fs-fLen, fW*0.15+Math.random()*2);
        ctx.quadraticCurveTo(fs-fLen*0.6, fW*0.8+Math.random()*3, fs, fW);
        ctx.closePath(); ctx.fill();
        // Mid flame
        ctx.fillStyle=_lerpColor(shipCol,'#ffffff',0.5);
        ctx.globalAlpha=ic.fadeAlpha*flame*0.7;
        const mLen=fLen*0.6;
        ctx.beginPath();
        ctx.moveTo(fs,-fW*0.5);
        ctx.quadraticCurveTo(fs-mLen*0.6,-fW*0.3,fs-mLen,0);
        ctx.quadraticCurveTo(fs-mLen*0.6,fW*0.3,fs,fW*0.5);
        ctx.closePath(); ctx.fill();
        // Core (white hot)
        ctx.fillStyle='#ffffff'; ctx.globalAlpha=ic.fadeAlpha*flame*0.8;
        const cLen=fLen*0.3;
        ctx.beginPath();
        ctx.moveTo(fs,-fW*0.2); ctx.lineTo(fs-cLen,0); ctx.lineTo(fs,fW*0.2);
        ctx.closePath(); ctx.fill();
        // Ember particles near flame
        if(flame>0.3){
            ctx.globalAlpha=ic.fadeAlpha*flame*0.5;
            for(let i=0;i<3;i++){
                const ex=fs-fLen*(0.3+Math.random()*0.7);
                const ey=(Math.random()-0.5)*fW*1.5;
                ctx.fillStyle=Math.random()<0.5?'#ffcc44':shipCol;
                ctx.beginPath(); ctx.arc(ex,ey,0.5+Math.random()*1.5,0,Math.PI*2); ctx.fill();
            }
        }
        ctx.shadowBlur=0;
    }

    // ── Ship shadow on ground ──
    if(ic.shipLiftY<200){
        ctx.save();
        ctx.rotate(-(ic.shipAngle||0)); // undo rotation for shadow
        ctx.translate(0, ic.shipLiftY); // shadow stays on ground
        ctx.globalAlpha=ic.fadeAlpha*0.15*Math.max(0,1-ic.shipLiftY/200);
        ctx.fillStyle='#000';
        const sw=r*1.5*(1-ic.shipLiftY/400); // shrinks with height
        ctx.beginPath(); ctx.ellipse(0,r*0.8,sw,4,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }

    // ── Hull body ──
    ctx.globalAlpha=ic.fadeAlpha;
    ctx.beginPath(); _shape.body(ctx,r); ctx.closePath();
    if(ic.shipPower>0){
        const sg=ctx.createLinearGradient(-r,-r*0.5,r,r*0.5);
        sg.addColorStop(0,_lerpColor('#2e2e2e',shipCol,ic.shipPower*0.8));
        sg.addColorStop(0.5,_lerpColor('#222222',shipCol,ic.shipPower*0.5));
        sg.addColorStop(1,_lerpColor('#1a1a1a',shipCol,ic.shipPower*0.3));
        ctx.fillStyle=sg;
        ctx.shadowBlur=ic.shipPower*18; ctx.shadowColor=shipCol;
    } else {
        // Dead ship — dark gray with rust tint
        const dg=ctx.createLinearGradient(-r,-r*0.5,r,r*0.5);
        dg.addColorStop(0,'#2e2a28'); dg.addColorStop(0.5,'#242220'); dg.addColorStop(1,'#1c1a18');
        ctx.fillStyle=dg; ctx.shadowBlur=0;
    }
    ctx.fill(); ctx.shadowBlur=0;

    // Hull outline
    ctx.strokeStyle=ic.shipPower>0.3?shipCol:'#3e3a38';
    ctx.lineWidth=1.8; ctx.globalAlpha=ic.fadeAlpha*(0.5+ic.shipPower*0.5);
    ctx.beginPath(); _shape.body(ctx,r*1.06); ctx.closePath(); ctx.stroke();

    // Inner hull line
    ctx.globalAlpha=ic.fadeAlpha*0.25;
    ctx.strokeStyle=ic.shipPower>0.3?shipCol:'#2a2826'; ctx.lineWidth=0.6;
    ctx.beginPath(); _shape.body(ctx,r*0.85); ctx.closePath(); ctx.stroke();

    // Wing lines
    if(_shape.wingLines){
        ctx.globalAlpha=ic.fadeAlpha*(0.25+ic.shipPower*0.45);
        ctx.strokeStyle=ic.shipPower>0.3?shipCol:'#3a3836'; ctx.lineWidth=1;
        for(const wl of _shape.wingLines){
            ctx.beginPath(); ctx.moveTo(r*wl[0],r*wl[1]); ctx.lineTo(r*wl[2],r*wl[3]); ctx.stroke();
        }
    }

    // ── Rust/damage marks (fade with power) ──
    if(ic.shipPower<0.7){
        ctx.globalAlpha=ic.fadeAlpha*(1-ic.shipPower*1.4)*0.25;
        ctx.fillStyle='#5a3a2a';
        ctx.fillRect(r*0.1,-r*0.3,r*0.3,r*0.15);
        ctx.fillRect(-r*0.5,r*0.1,r*0.25,r*0.1);
        ctx.strokeStyle='#4a3020'; ctx.lineWidth=0.8;
        ctx.beginPath(); ctx.moveTo(r*0.3,-r*0.1); ctx.lineTo(r*0.1,r*0.15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r*0.2,-r*0.35); ctx.lineTo(-r*0.4,-r*0.2); ctx.lineTo(-r*0.3,-r*0.1); ctx.stroke();
    }

    // ── Panel lights (power on sequentially) ──
    for(const pl of ic.panelLights){
        const px=Math.cos(pl.angle)*r*pl.dist;
        const py=Math.sin(pl.angle)*r*pl.dist;
        if(pl.on){
            ctx.globalAlpha=ic.fadeAlpha*(0.6+0.4*Math.sin(t*3+pl.angle));
            ctx.fillStyle=pl.color; ctx.shadowBlur=6; ctx.shadowColor=pl.color;
        } else {
            ctx.globalAlpha=ic.fadeAlpha*0.15;
            ctx.fillStyle='#222'; ctx.shadowBlur=0;
        }
        ctx.beginPath(); ctx.arc(px,py,pl.size,0,Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur=0;

    // ── Cockpit ──
    ctx.globalAlpha=ic.fadeAlpha;
    const cpx=(_shape.cockpitX||2)*(r/14);
    if(ic.cockpitFlicker>0){
        // Cockpit glass reflection
        ctx.fillStyle='#ffffff';
        ctx.shadowBlur=12+ic.shipPower*10; ctx.shadowColor='#ffffff';
        ctx.globalAlpha=ic.fadeAlpha*ic.cockpitFlicker*(0.4+ic.shipPower*0.6);
        ctx.beginPath(); ctx.arc(cpx,0,2.5+ic.shipPower*2,0,Math.PI*2); ctx.fill();
        // Inner glow ring
        ctx.strokeStyle=shipCol; ctx.lineWidth=0.8;
        ctx.globalAlpha=ic.fadeAlpha*ic.cockpitFlicker*0.4;
        ctx.beginPath(); ctx.arc(cpx,0,4+ic.shipPower*2,0,Math.PI*2); ctx.stroke();
    } else {
        ctx.fillStyle='#1a1a1a'; ctx.shadowBlur=0;
        ctx.globalAlpha=ic.fadeAlpha*0.4;
        ctx.beginPath(); ctx.arc(cpx,0,2.5,0,Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur=0;

    // ── Circuit glow lines (when powering up) ─���
    if(ic.shipPower>0.35){
        const ci=Math.min(1,(ic.shipPower-0.35)*1.8);
        ctx.globalAlpha=ic.fadeAlpha*ci*0.7;
        ctx.strokeStyle=shipCol; ctx.lineWidth=0.7;
        ctx.shadowBlur=5; ctx.shadowColor=shipCol;
        for(let i=0;i<8;i++){
            const a=(i/8)*Math.PI*2+ic.shipPulse*0.35;
            const ir=r*0.25, or=r*(0.55+Math.sin(ic.shipPulse*0.8+i*0.7)*0.1);
            ctx.beginPath();
            ctx.moveTo(Math.cos(a)*ir, Math.sin(a)*ir);
            ctx.lineTo(Math.cos(a)*or, Math.sin(a)*or);
            const ta=a+0.35;
            ctx.lineTo(Math.cos(ta)*(or+r*0.12), Math.sin(ta)*(or+r*0.12));
            ctx.stroke();
        }
        ctx.shadowBlur=0;
    }

    ctx.restore();

    // ── Ground light from ship ─���
    if(ic.shipPower>0.2 && ic.shipLiftY<250){
        ctx.save();
        const la=ic.shipPower*0.2*Math.max(0,1-ic.shipLiftY/250);
        ctx.globalAlpha=ic.fadeAlpha*la;
        const grd=ctx.createRadialGradient(ic.shipX,ic.groundY,0,ic.shipX,ic.groundY,90+ic.shipPower*30);
        grd.addColorStop(0,shipCol); grd.addColorStop(1,'transparent');
        ctx.fillStyle=grd; ctx.fillRect(ic.shipX-120,ic.groundY-3,240,35);
        ctx.restore();
    }
}
