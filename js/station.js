// ============================================================
//  SPACE STATION SYSTEM (DLC)
// ============================================================
const UPGRADE_DEFS={
    speed:{name:'Speed',desc:'+Thrust power',maxLv:5,costs:[50,100,200,400,800]},
    agility:{name:'Agility',desc:'+Turn speed',maxLv:5,costs:[50,100,200,400,800]},
    hull:{name:'Hull',desc:'+Extra shield pips',maxLv:2,costs:[80,160]},
    ammoCap:{name:'Ammo Capacity',desc:'+15 starting ammo',maxLv:3,costs:[40,80,160]},
    reload:{name:'Reload Speed',desc:'-Shot cooldown',maxLv:3,costs:[60,120,240]},
};
const GILBERT_UPG_DEFS={
    fireRate:{name:'Fire Rate',desc:'Faster shooting',maxLv:3,costs:[80,160,320]},
    range:{name:'Range',desc:'+Target range',maxLv:3,costs:[60,120,240]},
    damage:{name:'Damage',desc:'+Bullet damage',maxLv:3,costs:[100,200,400]},
};
const MODULE_DEFS={
    dash:{name:'DASH MODULE',cost:500,desc:'Press E to dash forward. 3s cooldown.'},
    shield_regen:{name:'SHIELD REGEN',cost:800,desc:'Slowly regenerate shield fuel.'},
    magnet:{name:'AMMO MAGNET',cost:300,desc:'Ammo boxes are attracted to your ship.'},
    rear_gun:{name:'REAR TURRET',cost:1000,desc:'Auto-fires backward at enemies.'},
};
const STATION_NPCS=[
    // Floor 1 (floor:0)
    {id:'banker',x:350,floor:0,name:'BANKER',color:'#ffdd00',shape:'square',
        lines:["Need to convert your Score?","100 Score = 1 MB.","I'll handle the exchange."],role:'banker'},
    {id:'mechanic',x:700,floor:0,name:'MECHANIC',color:'#ff8800',shape:'hex',
        lines:["Welcome to my stand.","I can tune up your ship.","What do you need?"],role:'shop_upgrades'},
    {id:'engineer',x:1100,floor:0,name:'ENGINEER',color:'#00ffaa',shape:'diamond',
        lines:["Looking for modules?","These'll give you an edge out there."],role:'shop_modules'},
    {id:'pilot',x:1500,floor:0,name:'PILOT VERA',color:'#ff44aa',shape:'hex',
        lines:["I used to fly out there too.","Watch your back past level 6.","The deeper you go, the weirder it gets."]},
    // Floor 2 (floor:1)
    {id:'gilbert_npc',x:400,floor:1,name:'GILBERT',color:'#44ff44',shape:'gilbert',
        lines:["This place is pretty nice!","Talk to the Banker to convert Score to MB.","Then buy upgrades for both of us!"],role:'shop_gilbert'},
    {id:'scientist',x:800,floor:1,name:'DR. NOVA',color:'#cc66ff',shape:'diamond',
        lines:["Fascinating... a Fragment, here.","The asteroids aren't natural, you know.","Something is sending them."]},
    {id:'commander',x:1200,floor:1,name:'COMMANDER',color:'#ffdd00',shape:'hex',
        lines:["This is the command center.","Your progress is saved when you dock.","Stay sharp out there, Fragment."]},
];
const STATION_WIDTH=1800;
const STATION_FLOORS=2; // 0=ground, 1=upper

function enterStation(){
    G.mode='station';
    G.station.playerX=350;G.station.playerY=480;G.station.playerVX=0;
    G.station.cameraX=0;G.station.shopOpen=false;G.station.interactTarget=null;
    // Keep score intact — player converts manually at the Banker NPC
    G.stationUnlocked=true;
    // Save
    if(G.slotId){
        const s=saves[G.slotId];
        if(G.score>s.high)s.high=G.score;
        s.mb=G.mb;s.upgrades=Object.assign({},G.upgrades);
        s.gilbertUpgrades=Object.assign({},G.gilbertUpgrades);
        s.modules=G.modules.slice();s.equippedModules=G.equippedModules.slice();
        s.stationUnlocked=true;s.maxLvl=Math.max(s.maxLvl,G.level);
        saveToDisk();
    }
    canvas.width=900;W=900;
    Sound.playMusic('bgm');
    updateUI();
}
function leaveStation(){
    G.mode='space';
    G.waveStart=performance.now();G.spawnTimer=0;
    asteroids=[];for(let k=0;k<6;k++)spawnAsteroid();
    G.invincibleTimer=90;
    updateUI();
}
function saveStation(){
    if(!G.slotId) return;
    const s=saves[G.slotId];
    s.mb=G.mb;s.upgrades=Object.assign({},G.upgrades);
    s.gilbertUpgrades=Object.assign({},G.gilbertUpgrades);
    s.modules=G.modules.slice();s.equippedModules=G.equippedModules.slice();
    s.stationUnlocked=true;s.checkpoint=G.level;s.maxLvl=Math.max(s.maxLvl||1,G.level);
    saveToDisk();
}
function buyUpgrade(key){
    const def=UPGRADE_DEFS[key];if(!def) return;
    const lv=G.upgrades[key]||0;
    if(lv>=def.maxLv) return;
    const cost=def.costs[lv];
    if(G.mb<cost) return;
    G.mb-=cost;G.upgrades[key]=lv+1;
    // Apply immediately
    THRUST=BASE_THRUST+(G.upgrades.speed||0)*0.06;
    TURN=BASE_TURN+(G.upgrades.agility||0)*0.02;
    SHOT_CD=Math.max(6,BASE_SHOT_CD-(G.upgrades.reload||0)*2);
    // Hull upgrade: increase shield capacity
    if(key==='hull'&&G.hasForceField){
        G.shieldFuel=3+(G.upgrades.hull||0);
        updateShieldUI();
    }
    Sound.powerup();saveStation();
}
function buyGilbertUpgrade(key){
    const def=GILBERT_UPG_DEFS[key];if(!def) return;
    const lv=G.gilbertUpgrades[key]||0;
    if(lv>=def.maxLv) return;
    const cost=def.costs[lv];
    if(G.mb<cost) return;
    G.mb-=cost;G.gilbertUpgrades[key]=lv+1;
    Sound.powerup();saveStation();
}
function buyModule(key){
    if(G.modules.includes(key)) return;
    const def=MODULE_DEFS[key];if(!def) return;
    if(G.mb<def.cost) return;
    G.mb-=def.cost;G.modules.push(key);
    if(G.equippedModules.length<2) G.equippedModules.push(key);
    Sound.powerup();saveStation();
}

function updateStation(){
    if(!G.running||G.paused) return;
    const st=G.station;
    if(st.shopOpen) return;

    // Walking
    if(isAction('left')){st.playerVX-=0.5;st.playerFacing=-1;}
    if(isAction('right')){st.playerVX+=0.5;st.playerFacing=1;}
    st.playerVX*=0.85;
    st.playerX+=st.playerVX;
    st.playerX=Math.max(30,Math.min(STATION_WIDTH-30,st.playerX));

    // Camera follow
    const targetCam=st.playerX-W/2;
    st.cameraX+=(Math.max(0,Math.min(STATION_WIDTH-W,targetCam))-st.cameraX)*0.1;

    // NPC proximity (only on current floor)
    st.interactTarget=null;
    for(const npc of STATION_NPCS){
        if(npc.floor===st.floor&&Math.abs(st.playerX-npc.x)<60){st.interactTarget=npc;break;}
    }
    // Airlock proximity (floor 0 only, left side)
    if(st.floor===0&&st.playerX<80) st.interactTarget={id:'airlock',name:'AIRLOCK',role:'airlock'};
    // Elevator proximity (at x~1700 on floor 0, x~100 on floor 1)
    const elevX=st.floor===0?STATION_WIDTH-100:100;
    if(Math.abs(st.playerX-elevX)<50&&!st.interactTarget) st.interactTarget={id:'elevator',name:'ELEVATOR',role:'elevator'};
}

function drawStation(){
    const T=performance.now();
    const st=G.station;
    const cx=st.cameraX;
    const flr=st.floor;
    ctx.save();

    // === BACKGROUND — deep space visible through windows ===
    const bgG=ctx.createLinearGradient(0,0,0,H);
    bgG.addColorStop(0,'#060818');bgG.addColorStop(0.3,'#0a0c22');bgG.addColorStop(1,'#04040c');
    ctx.fillStyle=bgG;ctx.fillRect(0,0,W,H);
    // Distant stars through windows
    for(let i=0;i<40;i++){
        const sx=(i*73+flr*200)%W,sy=(i*47)%200+30;
        ctx.fillStyle=`rgba(255,255,255,${0.2+Math.sin(T/800+i)*0.15})`;
        ctx.fillRect(sx,sy,1.5,1.5);
    }

    ctx.translate(-cx,0);

    // === FLOOR — metallic plating with hex pattern ===
    const floorY=500;
    const floorG=ctx.createLinearGradient(0,floorY,0,H);
    floorG.addColorStop(0,'#181825');floorG.addColorStop(0.1,'#12121e');floorG.addColorStop(1,'#0a0a14');
    ctx.fillStyle=floorG;ctx.fillRect(0,floorY,STATION_WIDTH,150);
    // Hex tile pattern
    ctx.strokeStyle='#1e1e30';ctx.lineWidth=0.5;
    for(let x=0;x<STATION_WIDTH;x+=30){for(let y=floorY;y<H;y+=20){
        const ox=(Math.floor(y/20)%2)*15;
        ctx.beginPath();ctx.arc(x+ox,y,10,0,Math.PI*2);ctx.stroke();
    }}
    // Floor edge highlight
    ctx.strokeStyle='#2a2a44';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,floorY);ctx.lineTo(STATION_WIDTH,floorY);ctx.stroke();
    ctx.strokeStyle='#00ccff';ctx.lineWidth=1;ctx.globalAlpha=0.15;
    ctx.beginPath();ctx.moveTo(0,floorY+1);ctx.lineTo(STATION_WIDTH,floorY+1);ctx.stroke();
    ctx.globalAlpha=1;

    // === CEILING — panels with recessed lighting ===
    const ceilY=70;
    ctx.fillStyle='#0c0c18';ctx.fillRect(0,0,STATION_WIDTH,ceilY);
    ctx.strokeStyle='#1a1a2e';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,ceilY);ctx.lineTo(STATION_WIDTH,ceilY);ctx.stroke();
    // Light strips
    for(let x=60;x<STATION_WIDTH;x+=150){
        const pulse=0.5+Math.sin(T/2000+x*0.01)*0.2;
        // Recessed light fixture
        ctx.fillStyle='#111120';ctx.fillRect(x-20,ceilY-12,40,12);
        ctx.fillStyle=`rgba(120,160,255,${pulse})`;ctx.fillRect(x-15,ceilY-8,30,6);
        ctx.shadowBlur=30;ctx.shadowColor=`rgba(100,140,255,${pulse*0.4})`;
        ctx.fillRect(x-15,ceilY-8,30,6);ctx.shadowBlur=0;
        // Light cone on floor
        ctx.globalAlpha=pulse*0.04;
        ctx.fillStyle='#8899ff';
        ctx.beginPath();ctx.moveTo(x-10,ceilY);ctx.lineTo(x+10,ceilY);
        ctx.lineTo(x+60,floorY);ctx.lineTo(x-60,floorY);ctx.closePath();ctx.fill();
        ctx.globalAlpha=1;
    }

    // === WALLS — paneled with rivets and window sections ===
    ctx.fillStyle='#0e0e1a';ctx.fillRect(0,ceilY,STATION_WIDTH,floorY-ceilY);
    // Back wall panels
    for(let x=0;x<STATION_WIDTH;x+=200){
        ctx.strokeStyle='#1a1a2e';ctx.lineWidth=1;
        ctx.strokeRect(x+5,ceilY+5,190,floorY-ceilY-10);
        // Rivets
        ctx.fillStyle='#2a2a3a';
        ctx.beginPath();ctx.arc(x+10,ceilY+10,2,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(x+190,ceilY+10,2,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(x+10,floorY-10,2,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(x+190,floorY-10,2,0,Math.PI*2);ctx.fill();
    }
    // Windows (every 400px, show stars)
    for(let x=200;x<STATION_WIDTH;x+=400){
        ctx.fillStyle='#040410';ctx.fillRect(x+60,ceilY+40,80,120);
        ctx.strokeStyle='#2a2a44';ctx.lineWidth=2;ctx.strokeRect(x+60,ceilY+40,80,120);
        // Stars through window
        for(let s=0;s<6;s++){
            const wx=x+65+Math.sin(s*7+T/5000)*70,wy=ceilY+50+Math.cos(s*11)*100;
            ctx.fillStyle=`rgba(255,255,255,${0.3+Math.sin(T/600+s)*0.2})`;
            ctx.fillRect(wx,Math.max(ceilY+42,Math.min(ceilY+158,wy)),1.5,1.5);
        }
        // Window frame glow
        ctx.strokeStyle='rgba(100,140,255,0.1)';ctx.lineWidth=4;ctx.strokeRect(x+58,ceilY+38,84,124);
    }

    // === FLOOR INDICATOR ===
    ctx.font='bold 11px Courier New';ctx.textAlign='left';ctx.fillStyle='#3a3a55';
    ctx.fillText('FLOOR '+(flr+1),10,ceilY+20);

    // === AIRLOCK (floor 0 only) — proper airlock door ===
    if(flr===0){
        const nearAirlock=st.playerX<80;
        // Outer frame
        ctx.fillStyle='#0a0a14';ctx.fillRect(15,ceilY+20,90,floorY-ceilY-20);
        // Door panels (two halves)
        const doorOpen=nearAirlock?Math.min(20,((T/50)%40)):0;
        ctx.fillStyle='#1a1a28';
        ctx.fillRect(18,ceilY+25,40-doorOpen,floorY-ceilY-30);
        ctx.fillRect(62+doorOpen,ceilY+25,40-doorOpen,floorY-ceilY-30);
        // Door frame
        ctx.strokeStyle=nearAirlock?'#00ff88':'#ff4444';ctx.lineWidth=2;
        ctx.strokeRect(15,ceilY+20,90,floorY-ceilY-20);
        // Hazard stripes
        ctx.fillStyle=nearAirlock?'rgba(0,255,136,0.15)':'rgba(255,68,68,0.1)';
        for(let y=ceilY+30;y<floorY-20;y+=20){ctx.fillRect(16,y,88,8);}
        // Status light
        ctx.fillStyle=nearAirlock?'#00ff88':'#ff4444';ctx.shadowBlur=10;ctx.shadowColor=ctx.fillStyle;
        ctx.beginPath();ctx.arc(60,ceilY+15,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        // Label
        ctx.font='bold 9px Courier New';ctx.textAlign='center';ctx.fillStyle='#555';
        ctx.fillText('AIRLOCK',60,floorY-5);
        if(nearAirlock){
            ctx.font='bold 14px Courier New';ctx.fillStyle='#00ff88';
            ctx.shadowBlur=10;ctx.shadowColor='#00ff88';
            ctx.fillText('[E] LAUNCH',60,ceilY+10);ctx.shadowBlur=0;
        }
    }

    // === ELEVATOR ===
    const elevX=flr===0?STATION_WIDTH-100:100;
    const nearElev=st.interactTarget&&st.interactTarget.id==='elevator';
    ctx.fillStyle='#111120';ctx.fillRect(elevX-30,ceilY+10,60,floorY-ceilY-10);
    ctx.strokeStyle=nearElev?'#00ccff':'#2a2a44';ctx.lineWidth=2;
    ctx.strokeRect(elevX-30,ceilY+10,60,floorY-ceilY-10);
    // Elevator arrows
    ctx.fillStyle=nearElev?'#00ccff':'#3a3a55';ctx.font='bold 16px Courier New';ctx.textAlign='center';
    ctx.fillText(flr===0?'▲':'▼',elevX,300);
    ctx.font='bold 9px Courier New';ctx.fillStyle='#555';
    ctx.fillText('ELEVATOR',elevX,floorY-5);
    if(nearElev){
        ctx.font='bold 12px Courier New';ctx.fillStyle='#00ccff';
        ctx.shadowBlur=8;ctx.shadowColor='#00ccff';
        ctx.fillText('[E] FLOOR '+(flr===0?'2':'1'),elevX,ceilY+5);ctx.shadowBlur=0;
    }

    // === SHOP STANDS ===
    for(const npc of STATION_NPCS){
        if(npc.floor!==flr) continue;
        if(npc.role&&(npc.role.startsWith('shop')||npc.role==='banker')){
            // Draw stand/counter
            ctx.fillStyle='#14142a';
            ctx.fillRect(npc.x-35,floorY-55,70,55);
            ctx.strokeStyle=npc.color;ctx.lineWidth=1.5;
            ctx.strokeRect(npc.x-35,floorY-55,70,55);
            // Counter top
            const ctG=ctx.createLinearGradient(npc.x-35,floorY-58,npc.x-35,floorY-50);
            ctG.addColorStop(0,npc.color);ctG.addColorStop(1,'rgba(0,0,0,0)');
            ctx.fillStyle=ctG;ctx.globalAlpha=0.3;ctx.fillRect(npc.x-36,floorY-58,72,8);ctx.globalAlpha=1;
            // Sign
            ctx.fillStyle='#0a0a16';ctx.fillRect(npc.x-28,floorY-48,56,18);
            ctx.strokeStyle=npc.color;ctx.lineWidth=1;ctx.strokeRect(npc.x-28,floorY-48,56,18);
            ctx.font='bold 8px Courier New';ctx.textAlign='center';ctx.fillStyle=npc.color;
            const signText=npc.role==='shop_upgrades'?'UPGRADES':npc.role==='shop_modules'?'MODULES':npc.role==='shop_gilbert'?'GILBERT':npc.role==='banker'?'EXCHANGE':'SHOP';
            ctx.fillText(signText,npc.x,floorY-35);
            // Items on counter (small decorative)
            ctx.fillStyle=npc.color;ctx.globalAlpha=0.3;
            ctx.fillRect(npc.x-20,floorY-24,8,6);ctx.fillRect(npc.x+5,floorY-22,10,4);
            ctx.globalAlpha=1;
        }
    }

    // === NPCs ===
    for(const npc of STATION_NPCS){
        if(npc.floor!==flr) continue;
        const isNear=st.interactTarget&&st.interactTarget.id===npc.id;
        const npcY=floorY-70;
        ctx.save();ctx.translate(npc.x,npcY);

        ctx.shadowBlur=isNear?18:8;ctx.shadowColor=npc.color;

        if(npc.shape==='gilbert'){
            // Gilbert's unique shape — small version
            ctx.fillStyle='#0a200a';ctx.strokeStyle='#44ff44';ctx.lineWidth=isNear?2.5:1.5;
            ctx.beginPath();
            ctx.moveTo(14,0);ctx.lineTo(8,-10);ctx.lineTo(2,-14);ctx.lineTo(-6,-12);
            ctx.lineTo(-12,-8);ctx.lineTo(-14,0);ctx.lineTo(-12,8);ctx.lineTo(-6,12);
            ctx.lineTo(2,14);ctx.lineTo(8,10);ctx.closePath();ctx.fill();ctx.stroke();
            ctx.fillStyle='#44ff44';ctx.beginPath();ctx.arc(6,0,3,0,Math.PI*2);ctx.fill();
        } else if(npc.shape==='diamond'){
            ctx.fillStyle='rgba(20,20,30,0.8)';ctx.strokeStyle=npc.color;ctx.lineWidth=isNear?2.5:1.5;
            ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(14,0);ctx.lineTo(0,18);ctx.lineTo(-14,0);ctx.closePath();
            ctx.fill();ctx.stroke();
            ctx.fillStyle=npc.color;ctx.globalAlpha=0.6+Math.sin(T/300+npc.x)*0.2;
            ctx.beginPath();ctx.arc(0,-4,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
        } else if(npc.shape==='square'){
            ctx.fillStyle='rgba(20,20,30,0.8)';ctx.strokeStyle=npc.color;ctx.lineWidth=isNear?2.5:1.5;
            ctx.fillRect(-14,-14,28,28);ctx.strokeRect(-14,-14,28,28);
            // Inner detail
            ctx.strokeStyle=npc.color;ctx.globalAlpha=0.3;ctx.strokeRect(-8,-8,16,16);ctx.globalAlpha=1;
            ctx.fillStyle=npc.color;ctx.beginPath();ctx.arc(0,-2,4,0,Math.PI*2);ctx.fill();
        } else {
            // Hex body (default)
            ctx.fillStyle='rgba(20,20,30,0.8)';ctx.strokeStyle=npc.color;ctx.lineWidth=isNear?2.5:1.5;
            ctx.beginPath();
            for(let i=0;i<6;i++){const a=Math.PI*2/6*i-Math.PI/2;ctx.lineTo(Math.cos(a)*16,Math.sin(a)*16);}
            ctx.closePath();ctx.fill();ctx.stroke();
            // Eye
            ctx.fillStyle=npc.color;ctx.globalAlpha=0.6+Math.sin(T/300+npc.x)*0.2;
            ctx.beginPath();ctx.arc(0,-4,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
        }
        ctx.shadowBlur=0;
        // Hover glow ring
        if(isNear){
            ctx.strokeStyle=npc.color;ctx.globalAlpha=0.3+Math.sin(T/200)*0.15;ctx.lineWidth=1.5;
            ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
        }
        // Name plate
        ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(-30,-38,60,14);
        ctx.font='bold 9px Courier New';ctx.textAlign='center';ctx.fillStyle=npc.color;
        ctx.fillText(npc.name,0,-28);
        if(isNear){ctx.fillStyle='#fff';ctx.font='bold 10px Courier New';ctx.fillText('[E] TALK',0,32);}
        ctx.restore();
    }

    // === PLAYER HOLOGRAM ROBOT ===
    ctx.save();ctx.translate(st.playerX,floorY-30);
    const facing=st.playerFacing;
    ctx.scale(facing,1);
    const walking=Math.abs(st.playerVX)>0.3;
    // Smooth sine-based walk phase
    const walkPhase=walking?T/150:0;
    const legSwing=Math.sin(walkPhase)*6;  // legs swing ±6px
    const armSwing=Math.sin(walkPhase)*4;  // arms swing ±4px (opposite legs)
    const bodyBob=walking?Math.abs(Math.sin(walkPhase*2))*2:0; // subtle up/down bob
    // Hologram glow
    ctx.shadowBlur=12;ctx.shadowColor='#00ccff';
    ctx.globalAlpha=0.8+Math.sin(T/300)*0.05;
    // -- Head --
    ctx.fillStyle='#00ddee';
    ctx.beginPath();ctx.arc(0,-28+bodyBob,8,0,Math.PI*2);ctx.fill();
    // Visor (always faces right in local coords)
    ctx.fillStyle='rgba(255,255,255,0.85)';
    ctx.fillRect(2,-30+bodyBob,5,3);
    // Antenna
    ctx.strokeStyle='#00aacc';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,-36+bodyBob);ctx.lineTo(0,-40+bodyBob);ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,-40+bodyBob,1.5,0,Math.PI*2);ctx.fill();
    // -- Torso --
    ctx.fillStyle='#00bbdd';
    ctx.beginPath();
    ctx.moveTo(-7,-20+bodyBob);ctx.lineTo(7,-20+bodyBob);
    ctx.lineTo(6,6+bodyBob);ctx.lineTo(-6,6+bodyBob);
    ctx.closePath();ctx.fill();
    // Chest detail
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-4,-14+bodyBob);ctx.lineTo(4,-14+bodyBob);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-3,-10+bodyBob);ctx.lineTo(3,-10+bodyBob);ctx.stroke();
    // -- Arms (swing opposite to legs) --
    ctx.fillStyle='#009dbb';
    // Left arm
    ctx.save();ctx.translate(-8,-16+bodyBob);ctx.rotate((-armSwing)*Math.PI/60);
    ctx.fillRect(-2,0,4,14);ctx.restore();
    // Right arm
    ctx.save();ctx.translate(8,-16+bodyBob);ctx.rotate((armSwing)*Math.PI/60);
    ctx.fillRect(-2,0,4,14);ctx.restore();
    // -- Legs (swing with walk) --
    ctx.fillStyle='#0088aa';
    // Left leg
    ctx.save();ctx.translate(-3,6+bodyBob);ctx.rotate((legSwing)*Math.PI/80);
    ctx.fillRect(-2,0,4,14);
    ctx.fillStyle='#00aacc';ctx.fillRect(-3,13,5,3); // foot
    ctx.restore();
    // Right leg
    ctx.save();ctx.translate(3,6+bodyBob);ctx.rotate((-legSwing)*Math.PI/80);
    ctx.fillStyle='#0088aa';ctx.fillRect(-2,0,4,14);
    ctx.fillStyle='#00aacc';ctx.fillRect(-3,13,5,3); // foot
    ctx.restore();
    // -- Hologram scan line (single, sweeps down) --
    const scanY=((T/15)%70)-35;
    ctx.globalAlpha=0.1;ctx.fillStyle='#aaeeff';ctx.fillRect(-12,scanY+bodyBob,24,2);
    ctx.globalAlpha=0.8+Math.sin(T/300)*0.05;
    // -- Hologram flicker (rare) --
    if(Math.random()<0.02){ctx.globalAlpha=0.3;ctx.fillStyle='#00eeff';ctx.fillRect(-10,-38,20,60);}
    ctx.globalAlpha=1;ctx.shadowBlur=0;
    ctx.restore();

    ctx.restore(); // undo camera translate

    // === HUD (fixed position) ===
    // Floor indicator
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(10,10,110,40);
    ctx.strokeStyle='#2a2a44';ctx.lineWidth=1;ctx.strokeRect(10,10,110,40);
    ctx.font='bold 10px Courier New';ctx.textAlign='left';ctx.fillStyle='#555';
    ctx.fillText('DECK',20,28);
    ctx.font='bold 18px Courier New';ctx.fillStyle='#00ccff';
    ctx.fillText('FLOOR '+(flr+1),20,46);
    // MB display
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(W-130,10,120,40);
    ctx.strokeStyle='#2a2a44';ctx.lineWidth=1;ctx.strokeRect(W-130,10,120,40);
    ctx.font='bold 10px Courier New';ctx.textAlign='right';ctx.fillStyle='#555';
    ctx.fillText('CURRENCY',W-18,28);
    ctx.font='bold 18px Courier New';ctx.fillStyle='#ffdd00';
    ctx.fillText(G.mb+' MB',W-18,46);
    // Score (for banker conversion)
    if(G.score>0){
        ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(W-130,55,120,25);
        ctx.strokeStyle='#2a2a44';ctx.lineWidth=1;ctx.strokeRect(W-130,55,120,25);
        ctx.font='bold 11px Courier New';ctx.fillStyle='#888';
        ctx.fillText('Score: '+G.score,W-18,73);
    }

    // Shop overlay
    if(st.shopOpen) drawShop();

    // NPC dialogue overlay
    if(G.stationDialogue){
        ctx.fillStyle='rgba(0,0,0,0.75)';
        ctx.fillRect(20,H-110,W-40,100);
        ctx.strokeStyle=G.stationDialogueColor||'#444';ctx.lineWidth=1.5;
        ctx.strokeRect(20,H-110,W-40,100);
        // Name plate
        ctx.fillStyle=G.stationDialogueColor||'#fff';
        ctx.font='bold 14px Courier New';ctx.textAlign='left';
        ctx.fillText(G.stationDialogueName,40,H-88);
        // Line under name
        ctx.strokeStyle=G.stationDialogueColor||'#444';ctx.lineWidth=1;ctx.globalAlpha=0.3;
        ctx.beginPath();ctx.moveTo(40,H-82);ctx.lineTo(W-60,H-82);ctx.stroke();ctx.globalAlpha=1;
        // Dialogue text
        ctx.font='13px Courier New';ctx.fillStyle='#ddd';
        ctx.fillText(G.stationDialogue,40,H-60);
        // Continue prompt
        ctx.font='10px Courier New';ctx.fillStyle='#555';ctx.textAlign='right';
        ctx.fillText('[SPACE] Continue',W-40,H-20);
    }
}

function drawShop(){
    const st=G.station;
    ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(W/2-250,50,500,H-100);
    ctx.strokeStyle='#00ccff';ctx.lineWidth=2;ctx.strokeRect(W/2-250,50,500,H-100);
    ctx.font='bold 18px Courier New';ctx.textAlign='center';ctx.fillStyle='#00ccff';
    const catName=st.shopCategory==='upgrades'?'SHIP UPGRADES':st.shopCategory==='modules'?'SHIP MODULES':'GILBERT UPGRADES';
    ctx.fillText(catName,W/2,80);
    ctx.font='12px Courier New';ctx.fillStyle='#888';
    ctx.fillText('MB: '+G.mb,W/2,100);

    let items=[];
    if(st.shopCategory==='upgrades'){
        for(const k in UPGRADE_DEFS){
            const d=UPGRADE_DEFS[k],lv=G.upgrades[k]||0;
            const maxed=lv>=d.maxLv;
            items.push({key:k,name:d.name+' Lv'+(lv+1),desc:d.desc,cost:maxed?'MAX':d.costs[lv]+' MB',
                canBuy:!maxed&&G.mb>=d.costs[lv],maxed,action:()=>buyUpgrade(k)});
        }
    } else if(st.shopCategory==='modules'){
        for(const k in MODULE_DEFS){
            const d=MODULE_DEFS[k],owned=G.modules.includes(k);
            items.push({key:k,name:d.name,desc:d.desc,cost:owned?'OWNED':d.cost+' MB',
                canBuy:!owned&&G.mb>=d.cost,maxed:owned,action:()=>buyModule(k)});
        }
    } else if(st.shopCategory==='gilbert'){
        for(const k in GILBERT_UPG_DEFS){
            const d=GILBERT_UPG_DEFS[k],lv=G.gilbertUpgrades[k]||0;
            const maxed=lv>=d.maxLv;
            items.push({key:k,name:d.name+' Lv'+(lv+1),desc:d.desc,cost:maxed?'MAX':d.costs[lv]+' MB',
                canBuy:!maxed&&G.mb>=d.costs[lv],maxed,action:()=>buyGilbertUpgrade(k)});
        }
    }
    G._shopItems=items;
    st.shopSelection=Math.max(0,Math.min(st.shopSelection,items.length-1));

    for(let i=0;i<items.length;i++){
        const it=items[i],y=130+i*55,sel=i===st.shopSelection;
        ctx.fillStyle=sel?'rgba(0,200,255,0.1)':'transparent';
        ctx.fillRect(W/2-230,y-5,460,50);
        if(sel){ctx.strokeStyle='#00ccff';ctx.lineWidth=1;ctx.strokeRect(W/2-230,y-5,460,50);}
        ctx.font='bold 14px Courier New';ctx.textAlign='left';
        ctx.fillStyle=it.maxed?'#555':(it.canBuy?'#fff':'#664444');
        ctx.fillText((sel?'> ':'')+it.name,W/2-220,y+14);
        ctx.font='11px Courier New';ctx.fillStyle='#888';
        ctx.fillText(it.desc,W/2-220,y+30);
        ctx.textAlign='right';ctx.fillStyle=it.maxed?'#555':(it.canBuy?'#00ff00':'#ff4444');
        ctx.font='bold 13px Courier New';
        ctx.fillText(it.cost,W/2+220,y+14);
    }
    ctx.textAlign='center';ctx.font='11px Courier New';ctx.fillStyle='#666';
    ctx.fillText('[UP/DOWN] Select  [SPACE] Buy  [ESC] Close',W/2,H-65);
}

// Cutscene: post-boss-5
function startStationCutscene(){
    G.stationCutscene='clearing';G.stationCutsceneTimer=0;
    G.npcShip={x:W+60,y:H/2,angle:Math.PI};
    asteroids=[];miniBosses=[];enemyBullets=[];gasterBlasters=[];
}
function updateCutscene(){
    G.stationCutsceneTimer++;
    if(G.stationCutscene==='clearing'){
        if(G.stationCutsceneTimer===1) gilbertQuip("Huh... the asteroids stopped. That's... new.");
        if(G.stationCutsceneTimer>120) {G.stationCutscene='approach';G.stationCutsceneTimer=0;}
    } else if(G.stationCutscene==='approach'){
        G.npcShip.x+=(W*0.6-G.npcShip.x)*0.03;
        G.npcShip.y=H/2+Math.sin(G.stationCutsceneTimer*0.03)*30;
        if(G.stationCutsceneTimer>120){G.stationCutscene='choice';G.stationCutsceneTimer=0;G.dialogueChoiceIndex=0;}
    } else if(G.stationCutscene==='choice'){
        // Waiting for player input (handled in keydown)
    } else if(G.stationCutscene==='who_response'){
        if(G.stationCutsceneTimer>240){G.stationCutscene='gilbert_defend';G.stationCutsceneTimer=0;}
    } else if(G.stationCutscene==='gilbert_defend'){
        // Move Gilbert between ships
        if(G.gilbert){
            const tx=(ship.x+G.npcShip.x)/2,ty=(ship.y+G.npcShip.y)/2;
            G.gilbert.x+=(tx-G.gilbert.x)*0.05;G.gilbert.y+=(ty-G.gilbert.y)*0.05;
        }
        if(G.stationCutsceneTimer>300){G.stationCutscene='follow';G.stationCutsceneTimer=0;}
    } else if(G.stationCutscene==='help_response'){
        if(G.stationCutsceneTimer>180){G.stationCutscene='follow';G.stationCutsceneTimer=0;}
    } else if(G.stationCutscene==='follow'){
        G.npcShip.x+=3;
        ship.tx+=0.15;ship.x+=ship.tx;
        if(G.gilbert){G.gilbert.x+=2.5;}
        if(G.stationCutsceneTimer>180){
            G.stationCutscene=null;
            enterStation();
        }
    }
}
function drawCutscene(){
    const T=performance.now();
    // NPC ship
    if(G.npcShip){
        ctx.save();ctx.translate(G.npcShip.x,G.npcShip.y);ctx.rotate(G.npcShip.angle);
        ctx.fillStyle='#1a1a2a';ctx.strokeStyle='#aaaaff';ctx.lineWidth=2;
        ctx.shadowBlur=10;ctx.shadowColor='#8888ff';
        ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-12,10);ctx.lineTo(-6,0);ctx.lineTo(-12,-10);ctx.closePath();
        ctx.fill();ctx.stroke();ctx.shadowBlur=0;
        ctx.fillStyle='#8888ff';ctx.beginPath();ctx.arc(4,0,3,0,Math.PI*2);ctx.fill();
        ctx.restore();
    }
    // Dialogue choice
    if(G.stationCutscene==='choice'){
        ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(W/2-200,H/2-60,400,120);
        ctx.strokeStyle='#aaaaff';ctx.lineWidth=2;ctx.strokeRect(W/2-200,H/2-60,400,120);
        ctx.font='bold 14px Courier New';ctx.textAlign='left';ctx.fillStyle='#aaaaff';
        ctx.fillText('"Woah, you\'re one of them, aren\'t ya!?"',W/2-185,H/2-35);
        ctx.font='13px Courier New';
        const c0=G.dialogueChoiceIndex===0;const c1=G.dialogueChoiceIndex===1;
        ctx.fillStyle=c0?'#fff':'#666';ctx.fillText((c0?'> ':'  ')+'"Who are you?!"',W/2-185,H/2+5);
        ctx.fillStyle=c1?'#fff':'#666';ctx.fillText((c1?'> ':'  ')+'"Can you help us?"',W/2-185,H/2+30);
        ctx.font='10px Courier New';ctx.fillStyle='#555';ctx.fillText('[UP/DOWN] Select  [SPACE] Confirm',W/2-185,H/2+52);
    }
    // Response text
    if(G.stationCutscene==='who_response'){
        ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,H*0.65,W,100);
        ctx.font='bold 13px Courier New';ctx.textAlign='left';ctx.fillStyle='#aaaaff';
        ctx.fillText('SECTOR A:',40,H*0.65+25);
        ctx.font='12px Courier New';ctx.fillStyle='#ddd';
        ctx.fillText("We're Sector A enforcement. NOW why don't you tell me who YOU are?",40,H*0.65+50);
    }
    if(G.stationCutscene==='gilbert_defend'){
        ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,H*0.65,W,100);
        ctx.font='bold 13px Courier New';ctx.textAlign='left';ctx.fillStyle='#44ff44';
        ctx.fillText('GILBERT:',40,H*0.65+25);
        ctx.font='12px Courier New';ctx.fillStyle='#ddd';
        ctx.fillText("FINE, he IS one of them. But you saw what we did to that snake,",40,H*0.65+45);
        ctx.fillText("now why don't you just help us before something happens?",40,H*0.65+62);
    }
    if(G.stationCutscene==='help_response'){
        ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,H*0.65,W,100);
        ctx.font='bold 13px Courier New';ctx.textAlign='left';ctx.fillStyle='#aaaaff';
        ctx.fillText('SECTOR A:',40,H*0.65+25);
        ctx.font='12px Courier New';ctx.fillStyle='#ddd';
        ctx.fillText("Well, you did neutralize that threat, why not?",40,H*0.65+45);
        ctx.fillText("Welcome to the station!",40,H*0.65+62);
    }
}

// Station dialogue (NPC talk)
G.stationDialogue='';G.stationDialogueName='';G.stationDialogueColor='';G.stationDialogueLines=[];G.stationDialogueIdx=0;
function showStationDialogue(npc){
    G.stationDialogueLines=npc.lines.slice();
    G.stationDialogueIdx=0;
    G.stationDialogue=G.stationDialogueLines[0];
    G.stationDialogueName=npc.name;
    G.stationDialogueColor=npc.color;
}
function advanceStationDialogue(){
    G.stationDialogueIdx++;
    if(G.stationDialogueIdx>=G.stationDialogueLines.length){
        G.stationDialogue='';
        return false;
    }
    G.stationDialogue=G.stationDialogueLines[G.stationDialogueIdx];
    return true;
}

