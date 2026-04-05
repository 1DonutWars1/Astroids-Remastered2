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
        lines:["Need to convert your Score?","50 Score = 1 MB.","I'll handle the exchange."],role:'banker'},
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
    // If player somehow entered station during an active level 6 battle, clean up
    if(G.level6 && G.level6.state){
        G.level6.state=null;
        if(typeof rouges!=='undefined') rouges.length=0;
        if(typeof battleBots!=='undefined') battleBots.length=0;
        if(typeof battleBullets!=='undefined') battleBullets.length=0;
        if(typeof battleDebris!=='undefined') battleDebris.length=0;
        // Restore canvas size if it was expanded
        if(G.level6.savedCanvasW){
            canvas.width=G.level6.savedCanvasW; canvas.height=G.level6.savedCanvasH;
            W=canvas.width; H=canvas.height;
            G.level6.savedCanvasW=null; G.level6.savedCanvasH=null;
        }
        G.level6.camera.x=0; G.level6.camera.y=0;
    }
    // Save
    if(G.slotId){
        const s=saves[G.slotId];
        if(G.score>s.high)s.high=G.score;
        s.mb=G.mb;s.upgrades=Object.assign({},G.upgrades);
        s.gilbertUpgrades=Object.assign({},G.gilbertUpgrades);
        s.modules=G.modules.slice();s.equippedModules=G.equippedModules.slice();
        s.stationUnlocked=true;s.checkpoint=G.checkpoint||G.level;s.maxLvl=Math.max(s.maxLvl,G.level);
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
    // Trigger level 6 rouge war only the first time — persist across reloads via save
    const saveRec=G.slotId?saves[G.slotId]:null;
    const alreadyTriggered=saveRec&&saveRec.level6Triggered;
    if(window.DLC&&window.DLC.loaded&&G.level>=6&&G.level<7
        &&typeof startLevel6==='function'
        &&!G.level6.state&&!G.level6.bigShotUnlocked
        &&!alreadyTriggered){
        startLevel6();
        // Mark triggered so reloads don't restart the fight
        if(saveRec){saveRec.level6Triggered=true;saveToDisk();}
    }
    updateUI();
}
function saveStation(){
    if(!G.slotId) return;
    const s=saves[G.slotId];
    s.mb=G.mb;s.upgrades=Object.assign({},G.upgrades);
    s.gilbertUpgrades=Object.assign({},G.gilbertUpgrades);
    s.modules=G.modules.slice();s.equippedModules=G.equippedModules.slice();
    s.stationUnlocked=true;s.checkpoint=G.level;s.maxLvl=Math.max(s.maxLvl||1,G.level);
    // Persist level 6 progress
    if(G.level6){
        if(G.level6.bigShotUnlocked) s.bigShotUnlocked=true;
    }
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
    const bgG=ctx.createRadialGradient(W/2,H*0.3,0,W/2,H*0.3,W);
    bgG.addColorStop(0,'#0a0e22');bgG.addColorStop(0.3,'#080c1e');bgG.addColorStop(0.7,'#050818');bgG.addColorStop(1,'#030410');
    ctx.fillStyle=bgG;ctx.fillRect(0,0,W,H);
    // Distant stars through windows — more varied
    const stColorsS=['#ffffff','#aaccff','#ffeecc','#88aaff'];
    for(let i=0;i<60;i++){
        const sx=(i*73+flr*200)%W,sy=(i*47)%200+30;
        const twk=0.15+Math.sin(T/800+i*2.7)*0.15;
        ctx.fillStyle=stColorsS[i%stColorsS.length].replace(')',`,${twk})`).replace('rgb','rgba').replace('#','');
        ctx.globalAlpha=twk;ctx.fillStyle=stColorsS[i%stColorsS.length];
        ctx.beginPath();ctx.arc(sx,sy,0.8+Math.sin(i)*0.5,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    // Subtle nebula in background
    ctx.globalAlpha=0.015;
    const sNeb=ctx.createRadialGradient(W*0.3,100,0,W*0.3,100,180);
    sNeb.addColorStop(0,'#2244cc');sNeb.addColorStop(1,'transparent');
    ctx.fillStyle=sNeb;ctx.fillRect(0,0,W,250);
    ctx.globalAlpha=1;

    ctx.translate(-cx,0);

    // === FLOOR — metallic plating with hex pattern ===
    const floorY=500;
    const floorG=ctx.createLinearGradient(0,floorY,0,H);
    floorG.addColorStop(0,'#1a1a2a');floorG.addColorStop(0.05,'#14141f');floorG.addColorStop(0.5,'#0e0e18');floorG.addColorStop(1,'#080810');
    ctx.fillStyle=floorG;ctx.fillRect(0,floorY,STATION_WIDTH,150);
    // Hex tile pattern — with subtle fill
    for(let x=0;x<STATION_WIDTH;x+=30){for(let y=floorY+5;y<H;y+=20){
        const ox=(Math.floor(y/20)%2)*15;
        ctx.strokeStyle='rgba(30,30,50,0.6)';ctx.lineWidth=0.5;
        ctx.beginPath();for(let h=0;h<6;h++){const a=Math.PI*2/6*h;ctx.lineTo(x+ox+Math.cos(a)*10,y+Math.sin(a)*10);}ctx.closePath();ctx.stroke();
    }}
    // Floor edge highlight — layered
    ctx.strokeStyle='#2a2a44';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,floorY);ctx.lineTo(STATION_WIDTH,floorY);ctx.stroke();
    // Glowing edge line
    ctx.shadowBlur=8;ctx.shadowColor='rgba(0,200,255,0.15)';
    ctx.strokeStyle='rgba(0,200,255,0.2)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,floorY+1);ctx.lineTo(STATION_WIDTH,floorY+1);ctx.stroke();
    ctx.shadowBlur=0;
    // Floor reflection streaks
    ctx.globalAlpha=0.02;
    for(let rx=50;rx<STATION_WIDTH;rx+=150){
        const rg=ctx.createLinearGradient(rx-30,floorY,rx+30,floorY);
        rg.addColorStop(0,'transparent');rg.addColorStop(0.5,'#8899ff');rg.addColorStop(1,'transparent');
        ctx.fillStyle=rg;ctx.fillRect(rx-30,floorY+2,60,80);
    }
    ctx.globalAlpha=1;

    // === CEILING — panels with recessed lighting ===
    const ceilY=70;
    const ceilG=ctx.createLinearGradient(0,0,0,ceilY);
    ceilG.addColorStop(0,'#080814');ceilG.addColorStop(1,'#0e0e1c');
    ctx.fillStyle=ceilG;ctx.fillRect(0,0,STATION_WIDTH,ceilY);
    // Ceiling panel lines
    ctx.strokeStyle='rgba(30,30,50,0.5)';ctx.lineWidth=0.5;
    for(let cx=0;cx<STATION_WIDTH;cx+=100){ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,ceilY);ctx.stroke();}
    ctx.strokeStyle='#1a1a30';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,ceilY);ctx.lineTo(STATION_WIDTH,ceilY);ctx.stroke();
    // Light strips — enhanced
    for(let x=60;x<STATION_WIDTH;x+=150){
        const pulse=0.5+Math.sin(T/2000+x*0.01)*0.25;
        // Recessed light fixture with depth
        ctx.fillStyle='#0a0a18';ctx.fillRect(x-22,ceilY-14,44,14);
        ctx.fillStyle='#111122';ctx.fillRect(x-20,ceilY-12,40,12);
        // Light bulb with gradient
        const lightG=ctx.createLinearGradient(x-15,ceilY-8,x+15,ceilY-8);
        lightG.addColorStop(0,`rgba(80,120,255,${pulse*0.8})`);lightG.addColorStop(0.5,`rgba(140,180,255,${pulse})`);lightG.addColorStop(1,`rgba(80,120,255,${pulse*0.8})`);
        ctx.fillStyle=lightG;ctx.fillRect(x-15,ceilY-8,30,6);
        ctx.shadowBlur=35;ctx.shadowColor=`rgba(100,150,255,${pulse*0.5})`;
        ctx.fillRect(x-15,ceilY-8,30,6);ctx.shadowBlur=0;
        // Light cone on floor — more visible
        ctx.globalAlpha=pulse*0.05;
        const coneG=ctx.createLinearGradient(0,ceilY,0,floorY);
        coneG.addColorStop(0,'rgba(120,160,255,0.3)');coneG.addColorStop(1,'transparent');
        ctx.fillStyle=coneG;
        ctx.beginPath();ctx.moveTo(x-10,ceilY);ctx.lineTo(x+10,ceilY);
        ctx.lineTo(x+70,floorY);ctx.lineTo(x-70,floorY);ctx.closePath();ctx.fill();
        ctx.globalAlpha=1;
    }

    // === WALLS — layered depth with panels, pipes, and windows ===
    // Back wall base with gradient
    const wallG=ctx.createLinearGradient(0,ceilY,0,floorY);
    wallG.addColorStop(0,'#0c0c1a');wallG.addColorStop(0.3,'#0e0e1e');wallG.addColorStop(0.7,'#0d0d1c');wallG.addColorStop(1,'#0a0a16');
    ctx.fillStyle=wallG;ctx.fillRect(0,ceilY,STATION_WIDTH,floorY-ceilY);
    // Wall panels with gradient fills
    for(let x=0;x<STATION_WIDTH;x+=200){
        const panelG=ctx.createLinearGradient(x+5,ceilY+5,x+5,floorY-5);
        panelG.addColorStop(0,'rgba(25,25,45,0.4)');panelG.addColorStop(0.5,'rgba(15,15,30,0.3)');panelG.addColorStop(1,'rgba(20,20,35,0.4)');
        ctx.fillStyle=panelG;ctx.fillRect(x+5,ceilY+5,190,floorY-ceilY-10);
        ctx.strokeStyle='rgba(30,30,55,0.6)';ctx.lineWidth=1;
        ctx.strokeRect(x+5,ceilY+5,190,floorY-ceilY-10);
        // Rivets with metallic highlight
        const rivets=[[x+10,ceilY+10],[x+190,ceilY+10],[x+10,floorY-10],[x+190,floorY-10]];
        for(const rv of rivets){
            ctx.fillStyle='#333345';ctx.beginPath();ctx.arc(rv[0],rv[1],2.5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#444458';ctx.beginPath();ctx.arc(rv[0]-0.5,rv[1]-0.5,1,0,Math.PI*2);ctx.fill();
        }
        // Horizontal support beam
        const beamY=ceilY+(floorY-ceilY)*0.6;
        ctx.fillStyle='rgba(20,20,35,0.5)';ctx.fillRect(x+8,beamY-3,184,6);
        ctx.strokeStyle='rgba(40,40,65,0.4)';ctx.lineWidth=0.5;
        ctx.strokeRect(x+8,beamY-3,184,6);
    }
    // Conduit pipes along top of wall
    ctx.strokeStyle='rgba(40,40,60,0.5)';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(0,ceilY+18);ctx.lineTo(STATION_WIDTH,ceilY+18);ctx.stroke();
    ctx.strokeStyle='rgba(50,50,70,0.3)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,ceilY+25);ctx.lineTo(STATION_WIDTH,ceilY+25);ctx.stroke();
    // Pipe junction boxes
    for(let px=100;px<STATION_WIDTH;px+=300){
        ctx.fillStyle='rgba(30,30,50,0.7)';ctx.fillRect(px-8,ceilY+12,16,18);
        ctx.strokeStyle='rgba(50,50,75,0.5)';ctx.lineWidth=1;ctx.strokeRect(px-8,ceilY+12,16,18);
        // Status LED
        const ledC=Math.sin(T/1500+px)>0?'#00ff88':'#334';
        ctx.fillStyle=ledC;ctx.beginPath();ctx.arc(px,ceilY+21,2,0,Math.PI*2);ctx.fill();
    }
    // Windows — much bigger and more detailed
    for(let x=200;x<STATION_WIDTH;x+=400){
        const winX=x+50,winY=ceilY+35,winW=100,winH=140;
        // Window recess (depth)
        ctx.fillStyle='#030308';ctx.fillRect(winX-3,winY-3,winW+6,winH+6);
        // Space view through window
        const spaceG=ctx.createRadialGradient(winX+winW/2,winY+winH/2,10,winX+winW/2,winY+winH/2,winH*0.7);
        spaceG.addColorStop(0,'#0a0e20');spaceG.addColorStop(1,'#020308');
        ctx.fillStyle=spaceG;ctx.fillRect(winX,winY,winW,winH);
        // Stars through window — more, with twinkle
        for(let s=0;s<12;s++){
            const wx=winX+5+((s*37+x)%90),wy=winY+5+((s*53)%130);
            const twk=0.2+Math.sin(T/700+s*3+x)*0.2;
            const cols=['#ffffff','#aaccff','#ffeecc'];
            ctx.fillStyle=cols[s%3];ctx.globalAlpha=twk;
            ctx.beginPath();ctx.arc(wx,wy,0.6+Math.sin(s)*0.4,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
        // Distant planet/nebula in one window
        if(x<600){
            ctx.globalAlpha=0.15;
            const plG=ctx.createRadialGradient(winX+60,winY+50,0,winX+60,winY+50,25);
            plG.addColorStop(0,'#4466cc');plG.addColorStop(0.5,'#223366');plG.addColorStop(1,'transparent');
            ctx.fillStyle=plG;ctx.beginPath();ctx.arc(winX+60,winY+50,25,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
        }
        // Window frame — layered
        ctx.strokeStyle='#2a2a48';ctx.lineWidth=3;ctx.strokeRect(winX,winY,winW,winH);
        ctx.strokeStyle='#3a3a58';ctx.lineWidth=1;ctx.strokeRect(winX+1,winY+1,winW-2,winH-2);
        // Cross bars
        ctx.strokeStyle='#2a2a44';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(winX+winW/2,winY);ctx.lineTo(winX+winW/2,winY+winH);ctx.stroke();
        ctx.beginPath();ctx.moveTo(winX,winY+winH/2);ctx.lineTo(winX+winW,winY+winH/2);ctx.stroke();
        // Window glow — subtle light from space
        ctx.globalAlpha=0.03;
        const winGlow=ctx.createRadialGradient(winX+winW/2,winY+winH/2,0,winX+winW/2,winY+winH/2,120);
        winGlow.addColorStop(0,'#6688cc');winGlow.addColorStop(1,'transparent');
        ctx.fillStyle=winGlow;ctx.beginPath();ctx.arc(winX+winW/2,winY+winH/2,120,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
    }

    // === FLOOR INDICATOR ===
    ctx.font='bold 11px Courier New';ctx.textAlign='left';ctx.fillStyle='#3a3a55';
    ctx.fillText('FLOOR '+(flr+1),10,ceilY+20);

    // === AIRLOCK (floor 0 only) — heavy blast door ===
    if(flr===0){
        const nearAirlock=st.playerX<80;
        const lockCol=nearAirlock?'#00ff88':'#ff4444';
        const lockColDim=nearAirlock?'rgba(0,255,136,':'rgba(255,68,68,';
        // Outer recess
        ctx.fillStyle='#060610';ctx.fillRect(12,ceilY+16,96,floorY-ceilY-16);
        // Door panels (two halves)
        const doorOpen=nearAirlock?Math.min(22,((T/50)%40)):0;
        const doorG=ctx.createLinearGradient(18,0,58,0);
        doorG.addColorStop(0,'#181828');doorG.addColorStop(0.5,'#222238');doorG.addColorStop(1,'#181828');
        ctx.fillStyle=doorG;
        ctx.fillRect(18,ceilY+25,40-doorOpen,floorY-ceilY-30);
        ctx.fillRect(62+doorOpen,ceilY+25,40-doorOpen,floorY-ceilY-30);
        // Door panel detail lines
        ctx.strokeStyle='rgba(40,40,60,0.5)';ctx.lineWidth=0.5;
        for(let dy=ceilY+50;dy<floorY-30;dy+=40){
            ctx.beginPath();ctx.moveTo(20,dy);ctx.lineTo(56-doorOpen,dy);ctx.stroke();
            ctx.beginPath();ctx.moveTo(64+doorOpen,dy);ctx.lineTo(98,dy);ctx.stroke();
        }
        // Door frame with glow
        ctx.shadowBlur=nearAirlock?15:5;ctx.shadowColor=lockCol;
        ctx.strokeStyle=lockCol;ctx.lineWidth=2;
        ctx.strokeRect(15,ceilY+20,90,floorY-ceilY-20);
        ctx.shadowBlur=0;
        // Inner frame line
        ctx.strokeStyle=lockColDim+'0.3)';ctx.lineWidth=1;
        ctx.strokeRect(17,ceilY+22,86,floorY-ceilY-24);
        // Hazard stripes — diagonal
        ctx.save();ctx.beginPath();ctx.rect(16,ceilY+22,88,floorY-ceilY-24);ctx.clip();
        ctx.globalAlpha=nearAirlock?0.08:0.04;ctx.fillStyle=lockCol;
        for(let hy=ceilY;hy<floorY;hy+=24){
            ctx.beginPath();ctx.moveTo(16,hy);ctx.lineTo(104,hy);ctx.lineTo(104,hy+12);ctx.lineTo(16,hy+12);ctx.closePath();ctx.fill();
        }
        ctx.globalAlpha=1;ctx.restore();
        // Status lights (multiple)
        for(let li=0;li<3;li++){
            const lx=45+li*15;
            ctx.fillStyle=lockCol;ctx.shadowBlur=8;ctx.shadowColor=lockCol;
            ctx.beginPath();ctx.arc(lx,ceilY+15,3,0,Math.PI*2);ctx.fill();
        }
        ctx.shadowBlur=0;
        // Label
        ctx.font='bold 9px Courier New';ctx.textAlign='center';ctx.fillStyle='#445';
        ctx.fillText('AIRLOCK',60,floorY-5);
        if(nearAirlock){
            ctx.font='bold 14px Courier New';ctx.fillStyle='#00ff88';
            ctx.shadowBlur=12;ctx.shadowColor='#00ff88';
            ctx.fillText('[E] LAUNCH',60,ceilY+8);ctx.shadowBlur=0;
        }
    }

    // === ELEVATOR — sci-fi lift shaft ===
    const elevX=flr===0?STATION_WIDTH-100:100;
    const nearElev=st.interactTarget&&st.interactTarget.id==='elevator';
    const elevCol=nearElev?'#00ccff':'#2a2a48';
    // Shaft recess
    ctx.fillStyle='#080810';ctx.fillRect(elevX-33,ceilY+8,66,floorY-ceilY-8);
    // Door with gradient
    const elevDoorG=ctx.createLinearGradient(elevX-30,0,elevX+30,0);
    elevDoorG.addColorStop(0,'#141428');elevDoorG.addColorStop(0.5,'#1c1c35');elevDoorG.addColorStop(1,'#141428');
    ctx.fillStyle=elevDoorG;ctx.fillRect(elevX-30,ceilY+10,60,floorY-ceilY-10);
    // Center seam
    ctx.strokeStyle='rgba(50,50,80,0.6)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(elevX,ceilY+15);ctx.lineTo(elevX,floorY-5);ctx.stroke();
    // Frame with glow
    ctx.shadowBlur=nearElev?12:0;ctx.shadowColor='#00ccff';
    ctx.strokeStyle=elevCol;ctx.lineWidth=2;
    ctx.strokeRect(elevX-30,ceilY+10,60,floorY-ceilY-10);
    ctx.shadowBlur=0;
    // Arrow indicator — animated when near
    const arrowY=nearElev?300+Math.sin(T/300)*5:300;
    ctx.fillStyle=elevCol;ctx.font='bold 18px Courier New';ctx.textAlign='center';
    ctx.fillText(flr===0?'▲':'▼',elevX,arrowY);
    // Floor indicator lights
    ctx.fillStyle=flr===0?'#334':'#00ccff';ctx.beginPath();ctx.arc(elevX-15,ceilY+20,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=flr===1?'#334':'#00ccff';ctx.beginPath();ctx.arc(elevX+15,ceilY+20,3,0,Math.PI*2);ctx.fill();
    ctx.font='bold 7px Courier New';ctx.fillStyle='#334';
    ctx.fillText('1',elevX-15,ceilY+30);ctx.fillText('2',elevX+15,ceilY+30);
    // Label
    ctx.font='bold 8px Courier New';ctx.fillStyle='#445';
    ctx.fillText('ELEVATOR',elevX,floorY-5);
    if(nearElev){
        ctx.font='bold 12px Courier New';ctx.fillStyle='#00ccff';
        ctx.shadowBlur=10;ctx.shadowColor='#00ccff';
        ctx.fillText('[E] FLOOR '+(flr===0?'2':'1'),elevX,ceilY+3);ctx.shadowBlur=0;
    }

    // === SHOP STANDS ===
    for(const npc of STATION_NPCS){
        if(npc.floor!==flr) continue;
        if(npc.role&&(npc.role.startsWith('shop')||npc.role==='banker')){
            // Counter body with gradient
            const shopBodyG=ctx.createLinearGradient(npc.x-35,floorY-55,npc.x-35,floorY);
            shopBodyG.addColorStop(0,'#18182e');shopBodyG.addColorStop(0.5,'#121225');shopBodyG.addColorStop(1,'#0e0e1c');
            ctx.fillStyle=shopBodyG;ctx.fillRect(npc.x-35,floorY-55,70,55);
            // Counter frame with subtle glow
            ctx.shadowBlur=6;ctx.shadowColor=npc.color;
            ctx.strokeStyle=npc.color;ctx.lineWidth=1.5;
            ctx.strokeRect(npc.x-35,floorY-55,70,55);
            ctx.shadowBlur=0;
            // Inner frame line
            ctx.strokeStyle=npc.color.replace(')',',0.2)').replace('rgb','rgba');
            ctx.globalAlpha=0.2;ctx.strokeStyle=npc.color;ctx.lineWidth=0.5;
            ctx.strokeRect(npc.x-32,floorY-52,64,49);
            ctx.globalAlpha=1;
            // Counter top surface — glowing edge
            const ctG=ctx.createLinearGradient(npc.x-36,floorY-60,npc.x-36,floorY-50);
            ctG.addColorStop(0,npc.color);ctG.addColorStop(1,'rgba(0,0,0,0)');
            ctx.fillStyle=ctG;ctx.globalAlpha=0.35;ctx.fillRect(npc.x-36,floorY-58,72,10);ctx.globalAlpha=1;
            // Holographic sign
            const signPulse=0.7+Math.sin(T/1500+npc.x)*0.3;
            ctx.fillStyle='#060610';ctx.fillRect(npc.x-28,floorY-48,56,18);
            ctx.strokeStyle=npc.color;ctx.lineWidth=1;ctx.strokeRect(npc.x-28,floorY-48,56,18);
            ctx.globalAlpha=signPulse;
            ctx.font='bold 8px Courier New';ctx.textAlign='center';ctx.fillStyle=npc.color;
            ctx.shadowBlur=6;ctx.shadowColor=npc.color;
            const signText=npc.role==='shop_upgrades'?'UPGRADES':npc.role==='shop_modules'?'MODULES':npc.role==='shop_gilbert'?'GILBERT':npc.role==='banker'?'EXCHANGE':'SHOP';
            ctx.fillText(signText,npc.x,floorY-35);
            ctx.shadowBlur=0;ctx.globalAlpha=1;
            // Items on counter — glowing objects
            ctx.shadowBlur=4;ctx.shadowColor=npc.color;
            ctx.fillStyle=npc.color;ctx.globalAlpha=0.4;
            ctx.beginPath();ctx.arc(npc.x-16,floorY-20,4,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.arc(npc.x+10,floorY-19,3,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;ctx.shadowBlur=0;
        }
    }

    // === NPCs ===
    for(const npc of STATION_NPCS){
        if(npc.floor!==flr) continue;
        const isNear=st.interactTarget&&st.interactTarget.id===npc.id;
        const npcY=floorY-70;
        ctx.save();ctx.translate(npc.x,npcY);
        const npcPulse=0.6+Math.sin(T/400+npc.x*0.1)*0.2;

        // Ground shadow
        ctx.globalAlpha=0.15;ctx.fillStyle='#000';
        ctx.beginPath();ctx.ellipse(0,30,18,5,0,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;

        // Ambient aura glow
        if(isNear){
            ctx.globalAlpha=0.06;
            const npcAura=ctx.createRadialGradient(0,0,5,0,0,35);
            npcAura.addColorStop(0,npc.color);npcAura.addColorStop(1,'transparent');
            ctx.fillStyle=npcAura;ctx.beginPath();ctx.arc(0,0,35,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
        }

        ctx.shadowBlur=isNear?22:10;ctx.shadowColor=npc.color;

        if(npc.shape==='gilbert'){
            // Gilbert's unique shape — small version with detail
            const gilBodyG=ctx.createRadialGradient(-2,-2,0,0,0,14);
            gilBodyG.addColorStop(0,'#0a2a0a');gilBodyG.addColorStop(1,'#061806');
            ctx.fillStyle=gilBodyG;ctx.strokeStyle='#44ff44';ctx.lineWidth=isNear?2.5:1.5;
            ctx.beginPath();
            ctx.moveTo(14,0);ctx.lineTo(8,-10);ctx.lineTo(2,-14);ctx.lineTo(-6,-12);
            ctx.lineTo(-12,-8);ctx.lineTo(-14,0);ctx.lineTo(-12,8);ctx.lineTo(-6,12);
            ctx.lineTo(2,14);ctx.lineTo(8,10);ctx.closePath();ctx.fill();ctx.stroke();
            // Crater detail
            ctx.strokeStyle='rgba(68,255,68,0.15)';ctx.lineWidth=0.5;
            ctx.beginPath();ctx.arc(-4,-4,5,0,Math.PI*2);ctx.stroke();
            // Eye with glow
            ctx.fillStyle=`rgba(68,255,68,${npcPulse})`;ctx.shadowBlur=12;ctx.shadowColor='#44ff44';
            ctx.beginPath();ctx.arc(6,0,3.5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(6,0,1.5,0,Math.PI*2);ctx.fill();
        } else if(npc.shape==='diamond'){
            const dBodyG=ctx.createRadialGradient(0,-2,0,0,0,18);
            dBodyG.addColorStop(0,'rgba(30,25,45,0.9)');dBodyG.addColorStop(1,'rgba(15,12,25,0.9)');
            ctx.fillStyle=dBodyG;ctx.strokeStyle=npc.color;ctx.lineWidth=isNear?2.5:1.5;
            ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(14,0);ctx.lineTo(0,18);ctx.lineTo(-14,0);ctx.closePath();
            ctx.fill();ctx.stroke();
            // Inner diamond detail
            ctx.strokeStyle=npc.color;ctx.globalAlpha=0.15;ctx.lineWidth=0.8;
            ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(8,0);ctx.lineTo(0,10);ctx.lineTo(-8,0);ctx.closePath();ctx.stroke();
            ctx.globalAlpha=1;
            // Eye with layered glow
            ctx.fillStyle=npc.color;ctx.globalAlpha=npcPulse;
            ctx.beginPath();ctx.arc(0,-4,4.5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.globalAlpha=npcPulse*0.7;
            ctx.beginPath();ctx.arc(0,-4,2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
        } else if(npc.shape==='square'){
            const sBodyG=ctx.createLinearGradient(-14,-14,14,14);
            sBodyG.addColorStop(0,'rgba(30,25,40,0.9)');sBodyG.addColorStop(1,'rgba(15,12,22,0.9)');
            ctx.fillStyle=sBodyG;ctx.strokeStyle=npc.color;ctx.lineWidth=isNear?2.5:1.5;
            ctx.fillRect(-14,-14,28,28);ctx.strokeRect(-14,-14,28,28);
            // Inner detail — circuit-like
            ctx.strokeStyle=npc.color;ctx.globalAlpha=0.2;ctx.lineWidth=0.5;
            ctx.strokeRect(-9,-9,18,18);
            ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(-5,0);ctx.moveTo(5,0);ctx.lineTo(9,0);ctx.stroke();
            ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(0,-5);ctx.moveTo(0,5);ctx.lineTo(0,9);ctx.stroke();
            ctx.globalAlpha=1;
            // Eye
            ctx.fillStyle=npc.color;ctx.globalAlpha=npcPulse;
            ctx.beginPath();ctx.arc(0,-2,4.5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.globalAlpha=npcPulse*0.7;
            ctx.beginPath();ctx.arc(0,-2,2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
        } else {
            // Hex body (default) — with gradient and inner detail
            const hBodyG=ctx.createRadialGradient(0,-3,0,0,0,16);
            hBodyG.addColorStop(0,'rgba(28,25,42,0.9)');hBodyG.addColorStop(1,'rgba(12,10,22,0.9)');
            ctx.fillStyle=hBodyG;ctx.strokeStyle=npc.color;ctx.lineWidth=isNear?2.5:1.5;
            ctx.beginPath();
            for(let i=0;i<6;i++){const a=Math.PI*2/6*i-Math.PI/2;ctx.lineTo(Math.cos(a)*16,Math.sin(a)*16);}
            ctx.closePath();ctx.fill();ctx.stroke();
            // Inner hex
            ctx.strokeStyle=npc.color;ctx.globalAlpha=0.12;ctx.lineWidth=0.8;
            ctx.beginPath();
            for(let i=0;i<6;i++){const a=Math.PI*2/6*i-Math.PI/2;ctx.lineTo(Math.cos(a)*9,Math.sin(a)*9);}
            ctx.closePath();ctx.stroke();ctx.globalAlpha=1;
            // Eye with layered glow
            ctx.fillStyle=npc.color;ctx.globalAlpha=npcPulse;
            ctx.beginPath();ctx.arc(0,-4,4.5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.globalAlpha=npcPulse*0.7;
            ctx.beginPath();ctx.arc(0,-4,2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
        }
        ctx.shadowBlur=0;
        // Hover glow ring — double ring
        if(isNear){
            const rPulse=0.25+Math.sin(T/200)*0.15;
            ctx.strokeStyle=npc.color;ctx.globalAlpha=rPulse;ctx.lineWidth=1.5;
            ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.stroke();
            ctx.globalAlpha=rPulse*0.5;ctx.lineWidth=1;
            ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.stroke();
            ctx.globalAlpha=1;
        }
        // Name plate — glass style
        ctx.fillStyle='rgba(0,0,10,0.7)';
        ctx.fillRect(-32,-40,64,16);
        ctx.strokeStyle=npc.color;ctx.globalAlpha=0.2;ctx.lineWidth=0.5;
        ctx.strokeRect(-32,-40,64,16);ctx.globalAlpha=1;
        ctx.font='bold 9px Courier New';ctx.textAlign='center';ctx.fillStyle=npc.color;
        ctx.shadowBlur=4;ctx.shadowColor=npc.color;
        ctx.fillText(npc.name,0,-28);ctx.shadowBlur=0;
        if(isNear){
            ctx.fillStyle='#fff';ctx.font='bold 10px Courier New';
            ctx.shadowBlur=6;ctx.shadowColor='#fff';
            ctx.fillText('[E] TALK',0,34);ctx.shadowBlur=0;
        }
        ctx.restore();
    }

    // === PLAYER HOLOGRAM ROBOT ===
    ctx.save();ctx.translate(st.playerX,floorY-30);

    // --- PROJECTOR BEAM (ground up-cast) ---
    const beamG=ctx.createLinearGradient(0,22,0,-50);
    beamG.addColorStop(0,'rgba(0,220,255,0.22)');
    beamG.addColorStop(0.5,'rgba(0,180,255,0.08)');
    beamG.addColorStop(1,'transparent');
    ctx.fillStyle=beamG;
    ctx.beginPath();
    ctx.moveTo(-22,22);ctx.lineTo(22,22);ctx.lineTo(14,-46);ctx.lineTo(-14,-46);
    ctx.closePath();ctx.fill();

    // --- GROUND PROJECTOR DISC ---
    const discPulse=0.7+Math.sin(T/280)*0.3;
    const discG=ctx.createRadialGradient(0,22,0,0,22,26);
    discG.addColorStop(0,`rgba(0,240,255,${discPulse*0.55})`);
    discG.addColorStop(0.6,`rgba(0,150,255,${discPulse*0.18})`);
    discG.addColorStop(1,'transparent');
    ctx.fillStyle=discG;
    ctx.beginPath();ctx.ellipse(0,22,26,6,0,0,Math.PI*2);ctx.fill();
    // Disc ring
    ctx.strokeStyle=`rgba(0,240,255,${discPulse*0.8})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(0,22,22,5,0,0,Math.PI*2);ctx.stroke();

    const facing=st.playerFacing;
    ctx.scale(facing,1);
    const walking=Math.abs(st.playerVX)>0.3;
    const walkPhase=walking?T/150:0;
    const legSwing=Math.sin(walkPhase)*6;
    const armSwing=Math.sin(walkPhase)*4;
    const bodyBob=walking?Math.abs(Math.sin(walkPhase*2))*2:Math.sin(T/600)*0.8;
    // Idle float when not walking
    const idleFloat=walking?0:Math.sin(T/800)*1.5;
    const totalBob=bodyBob+idleFloat;

    // Flicker state (random drop-outs)
    const flickerOn=Math.random()>0.015;
    const glitchShift=Math.random()<0.025?(Math.random()-0.5)*3:0;

    // Master hologram alpha with subtle modulation
    const baseAlpha=(0.78+Math.sin(T/300)*0.08)*(flickerOn?1:0.4);

    // --- DRAW ROBOT FIGURE (as a function so we can render 3 chromatic layers) ---
    const drawFig=(off,col,alpha)=>{
        ctx.save();ctx.translate(off,0);
        ctx.globalAlpha=alpha;
        ctx.shadowBlur=18;ctx.shadowColor=col;
        // Head
        ctx.fillStyle=col;
        ctx.beginPath();ctx.arc(0,-28+totalBob,8,0,Math.PI*2);ctx.fill();
        // Visor
        ctx.fillStyle='rgba(255,255,255,0.9)';
        ctx.fillRect(2,-30+totalBob,5,3);
        // Antenna
        ctx.strokeStyle=col;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(0,-36+totalBob);ctx.lineTo(0,-40+totalBob);ctx.stroke();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,-40+totalBob,1.6,0,Math.PI*2);ctx.fill();
        // Torso
        ctx.fillStyle=col;
        ctx.beginPath();
        ctx.moveTo(-7,-20+totalBob);ctx.lineTo(7,-20+totalBob);
        ctx.lineTo(6,6+totalBob);ctx.lineTo(-6,6+totalBob);
        ctx.closePath();ctx.fill();
        // Arms
        ctx.save();ctx.translate(-8,-16+totalBob);ctx.rotate((-armSwing)*Math.PI/60);
        ctx.fillRect(-2,0,4,14);ctx.restore();
        ctx.save();ctx.translate(8,-16+totalBob);ctx.rotate((armSwing)*Math.PI/60);
        ctx.fillRect(-2,0,4,14);ctx.restore();
        // Legs
        ctx.save();ctx.translate(-3,6+totalBob);ctx.rotate((legSwing)*Math.PI/80);
        ctx.fillRect(-2,0,4,14);ctx.fillRect(-3,13,5,3);ctx.restore();
        ctx.save();ctx.translate(3,6+totalBob);ctx.rotate((-legSwing)*Math.PI/80);
        ctx.fillRect(-2,0,4,14);ctx.fillRect(-3,13,5,3);ctx.restore();
        ctx.shadowBlur=0;
        ctx.restore();
    };

    // Chromatic aberration: R offset +1, G normal, B offset -1
    drawFig(1+glitchShift,'rgba(255,80,140,0.55)',baseAlpha*0.65);
    drawFig(-1-glitchShift,'rgba(0,220,255,0.65)',baseAlpha*0.75);
    drawFig(0,'#00ddee',baseAlpha);

    // --- HOLOGRAM SCAN BANDS (multiple horizontal lines continuously sweeping) ---
    ctx.save();
    ctx.beginPath();ctx.rect(-14,-44,28,64);ctx.clip();
    for(let sb=0;sb<4;sb++){
        const sy=((T/20+sb*17)%64)-44+totalBob;
        const alpha=0.08+0.06*Math.sin(T/400+sb);
        ctx.globalAlpha=alpha;
        const sbg=ctx.createLinearGradient(0,sy-1,0,sy+2);
        sbg.addColorStop(0,'transparent');sbg.addColorStop(0.5,'#aaeeff');sbg.addColorStop(1,'transparent');
        ctx.fillStyle=sbg;ctx.fillRect(-14,sy-1,28,3);
    }
    // Bright sweep band
    const bigY=((T/12)%90)-44+totalBob;
    ctx.globalAlpha=0.28;
    const bbg=ctx.createLinearGradient(0,bigY-3,0,bigY+4);
    bbg.addColorStop(0,'transparent');bbg.addColorStop(0.5,'#ffffff');bbg.addColorStop(1,'transparent');
    ctx.fillStyle=bbg;ctx.fillRect(-14,bigY-3,28,7);
    // Fine static noise
    ctx.globalAlpha=0.08;ctx.fillStyle='#aaeeff';
    for(let n=0;n<6;n++){
        const nx=(Math.random()-0.5)*28;
        const ny=(Math.random()-0.5)*64-12;
        ctx.fillRect(nx,ny,1+Math.random()*3,1);
    }
    ctx.restore();

    // Rare glitch block (horizontal displacement)
    if(Math.random()<0.02){
        const gy=-40+Math.random()*60;
        const gh=2+Math.random()*4;
        const gdx=(Math.random()-0.5)*6;
        ctx.globalAlpha=0.35;ctx.fillStyle='#ff44aa';
        ctx.fillRect(-14+gdx,gy+totalBob,28,gh);
        ctx.globalAlpha=0.25;ctx.fillStyle='#00ffff';
        ctx.fillRect(-14-gdx,gy+totalBob,28,gh);
    }

    ctx.globalAlpha=1;ctx.shadowBlur=0;
    ctx.restore();

    ctx.restore(); // undo camera translate

    // === HUD (fixed position) ===
    // Floor indicator — glass panel style
    ctx.fillStyle='rgba(5,5,15,0.7)';ctx.fillRect(10,10,110,40);
    ctx.strokeStyle='rgba(0,200,255,0.15)';ctx.lineWidth=1;ctx.strokeRect(10,10,110,40);
    // Top accent
    ctx.fillStyle='rgba(0,200,255,0.1)';ctx.fillRect(11,11,108,1);
    ctx.font='bold 9px Courier New';ctx.textAlign='left';ctx.fillStyle='#445';
    ctx.fillText('DECK',20,27);
    ctx.font='bold 18px Courier New';ctx.fillStyle='#00ccff';
    ctx.shadowBlur=8;ctx.shadowColor='rgba(0,200,255,0.3)';
    ctx.fillText('FLOOR '+(flr+1),20,46);ctx.shadowBlur=0;
    // MB display — glass panel
    ctx.fillStyle='rgba(5,5,15,0.7)';ctx.fillRect(W-130,10,120,40);
    ctx.strokeStyle='rgba(255,215,0,0.12)';ctx.lineWidth=1;ctx.strokeRect(W-130,10,120,40);
    ctx.fillStyle='rgba(255,215,0,0.08)';ctx.fillRect(W-129,11,118,1);
    ctx.font='bold 9px Courier New';ctx.textAlign='right';ctx.fillStyle='#554';
    ctx.fillText('CURRENCY',W-18,27);
    ctx.font='bold 18px Courier New';ctx.fillStyle='#ffdd00';
    ctx.shadowBlur=8;ctx.shadowColor='rgba(255,215,0,0.3)';
    ctx.fillText(G.mb+' MB',W-18,46);ctx.shadowBlur=0;
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
    // Target X for approach (stored so easing can use it consistently)
    G.npcShip={
        x:W+80, y:H/2, angle:Math.PI,
        targetX:W*0.62, targetY:H/2,
        startX:W+80, startY:H/2,
        vx:0, vy:0, bobOffset:0, thrustLevel:0,
        warpTrail:1, trail:[]
    };
    asteroids=[];miniBosses=[];enemyBullets=[];gasterBlasters=[];
}
// Cubic ease-out
function _easeOut(t){return 1-Math.pow(1-t,3);}
function _easeInOut(t){return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
function updateCutscene(){
    G.stationCutsceneTimer++;
    const n=G.npcShip;
    if(G.stationCutscene==='clearing'){
        if(G.stationCutsceneTimer===1) gilbertQuip("Huh... the asteroids stopped. That's... new.");
        if(G.stationCutsceneTimer>120) {G.stationCutscene='approach';G.stationCutsceneTimer=0;}
    } else if(G.stationCutscene==='approach'){
        // Smooth deceleration: eased position from startX to targetX over 140 frames
        const dur=140;
        const t=Math.min(1,G.stationCutsceneTimer/dur);
        const e=_easeOut(t);
        const prevX=n.x;
        n.x=n.startX+(n.targetX-n.startX)*e;
        // Bob fades IN as ship slows down (not right when warp-in happens)
        const bobAmp=30*e*(1-0.5*e); // peaks mid-approach, less at end
        n.bobOffset=Math.sin(G.stationCutsceneTimer*0.04)*bobAmp;
        n.y=n.targetY+n.bobOffset;
        // Derive velocity for engine thrust intensity
        n.vx=n.x-prevX;
        // Warp trail decays from 1 to 0 over the first 50 frames
        n.warpTrail=Math.max(0,1-G.stationCutsceneTimer/50);
        // Thrust intensity: high while decelerating hard, drops off
        n.thrustLevel=Math.max(0.25,Math.min(1,Math.abs(n.vx)/4));
        if(G.stationCutsceneTimer>dur+20){G.stationCutscene='choice';G.stationCutsceneTimer=0;G.dialogueChoiceIndex=0;}
    } else if(G.stationCutscene==='choice'){
        // Gentle idle float
        n.bobOffset=Math.sin(G.stationCutsceneTimer*0.03)*12;
        n.y=n.targetY+n.bobOffset;
        n.thrustLevel=0.25+Math.sin(G.stationCutsceneTimer*0.08)*0.05;
        n.vx=0;
    } else if(G.stationCutscene==='who_response'){
        n.bobOffset=Math.sin(G.stationCutsceneTimer*0.03)*12;
        n.y=n.targetY+n.bobOffset;
        n.thrustLevel=0.25;
        if(G.stationCutsceneTimer>240){G.stationCutscene='gilbert_defend';G.stationCutsceneTimer=0;}
    } else if(G.stationCutscene==='gilbert_defend'){
        n.bobOffset=Math.sin(G.stationCutsceneTimer*0.03)*12;
        n.y=n.targetY+n.bobOffset;
        n.thrustLevel=0.25;
        if(G.gilbert){
            const tx=(ship.x+n.x)/2,ty=(ship.y+n.y)/2;
            G.gilbert.x+=(tx-G.gilbert.x)*0.05;G.gilbert.y+=(ty-G.gilbert.y)*0.05;
        }
        if(G.stationCutsceneTimer>300){G.stationCutscene='follow';G.stationCutsceneTimer=0;}
    } else if(G.stationCutscene==='help_response'){
        n.bobOffset=Math.sin(G.stationCutsceneTimer*0.03)*12;
        n.y=n.targetY+n.bobOffset;
        n.thrustLevel=0.25;
        if(G.stationCutsceneTimer>180){G.stationCutscene='follow';G.stationCutsceneTimer=0;}
    } else if(G.stationCutscene==='follow'){
        // Smooth acceleration using ease-in curve
        const dur=180;
        const t=Math.min(1,G.stationCutsceneTimer/dur);
        const spd=8*(t*t); // ease-in quadratic speed
        n.x+=spd; n.vx=spd;
        // Slight up-bank as ship flies off
        n.bobOffset*=0.92;
        n.y=n.targetY+n.bobOffset-t*20;
        n.thrustLevel=0.4+t*0.6;
        // Player ship follows with same smooth acceleration
        const shipSpd=5*(t*t);
        ship.tx=shipSpd; ship.x+=ship.tx;
        if(G.gilbert){G.gilbert.x+=shipSpd*0.9;}
        if(G.stationCutsceneTimer>=dur){
            G.stationCutscene=null;
            enterStation();
        }
    }

    // Update engine trail for NPC ship (all phases)
    if(n){
        n.trail=n.trail||[];
        // Add trail point at engine (ship is angle=PI so engine is at local -radius along -x world)
        const engX=n.x-Math.cos(n.angle)*-14; // world engine position
        const engY=n.y;
        const intensity=n.thrustLevel||0.3;
        if(G.stationCutsceneTimer%2===0 || intensity>0.5){
            n.trail.push({
                x:engX+(Math.random()-0.5)*2,
                y:engY+(Math.random()-0.5)*2,
                life:20+Math.random()*10, maxLife:30,
                size:2+Math.random()*2,
                intensity:intensity
            });
        }
        for(let i=n.trail.length-1;i>=0;i--){
            n.trail[i].life--;
            if(n.trail[i].life<=0) n.trail.splice(i,1);
        }
        if(n.trail.length>80) n.trail.splice(0,n.trail.length-80);
    }
}
function drawCutscene(){
    const T=performance.now();
    const n=G.npcShip;
    // NPC ship
    if(n){
        // --- ENGINE TRAIL (draw first, behind ship) ---
        for(const p of n.trail){
            const a=p.life/p.maxLife;
            const sz=p.size*(0.4+a*0.6);
            // Outer glow
            ctx.globalAlpha=a*0.35*p.intensity;
            const tg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*3);
            tg.addColorStop(0,'#88aaff');tg.addColorStop(0.4,'#4466cc');tg.addColorStop(1,'transparent');
            ctx.fillStyle=tg;ctx.beginPath();ctx.arc(p.x,p.y,sz*3,0,Math.PI*2);ctx.fill();
            // Core
            ctx.globalAlpha=a*0.9*p.intensity;
            ctx.fillStyle='#ccddff';
            ctx.beginPath();ctx.arc(p.x,p.y,sz*0.7,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;

        // --- WARP STREAKS (fade out as ship arrives) ---
        if(n.warpTrail>0.01){
            ctx.globalAlpha=n.warpTrail*0.7;
            ctx.strokeStyle='#aaccff';ctx.lineWidth=1.5;
            ctx.shadowBlur=15;ctx.shadowColor='#88aaff';
            for(let s=0;s<8;s++){
                const sy=n.y+(s-4)*6+Math.sin(T/100+s)*2;
                const len=120*n.warpTrail+Math.random()*40;
                ctx.globalAlpha=n.warpTrail*0.4*(1-Math.abs(s-3.5)/4);
                ctx.beginPath();ctx.moveTo(n.x+15,sy);ctx.lineTo(n.x+15+len,sy);ctx.stroke();
            }
            ctx.shadowBlur=0;ctx.globalAlpha=1;
        }

        // --- NPC SHIP BODY (detailed cruiser) ---
        ctx.save();ctx.translate(n.x,n.y);ctx.rotate(n.angle);
        const thrust=n.thrustLevel||0.3;
        // Thrust flame out the back
        const flLen=18+thrust*18+Math.random()*4;
        ctx.shadowBlur=20;ctx.shadowColor='#88aaff';
        // Outer flame cone
        ctx.globalAlpha=0.45;
        const flg=ctx.createLinearGradient(-10,0,-10-flLen,0);
        flg.addColorStop(0,'#aaccff');flg.addColorStop(0.5,'#4477dd');flg.addColorStop(1,'transparent');
        ctx.fillStyle=flg;
        ctx.beginPath();ctx.moveTo(-10,5);ctx.lineTo(-10-flLen,(Math.random()-0.5)*3);ctx.lineTo(-10,-5);ctx.closePath();ctx.fill();
        // Inner flame
        ctx.globalAlpha=0.85;ctx.fillStyle='#fff';
        ctx.beginPath();ctx.moveTo(-10,2);ctx.lineTo(-10-flLen*0.7,0);ctx.lineTo(-10,-2);ctx.closePath();ctx.fill();
        ctx.shadowBlur=0;ctx.globalAlpha=1;

        // --- HULL (larger, more detailed cruiser shape) ---
        // Outer glow
        ctx.shadowBlur=18;ctx.shadowColor='#8899ff';
        // Main hull - angular cruiser
        ctx.beginPath();
        ctx.moveTo(22,0);           // nose
        ctx.lineTo(12,-6);          // upper nose
        ctx.lineTo(4,-9);           // upper wing attach
        ctx.lineTo(-4,-13);         // upper wingtip back
        ctx.lineTo(-14,-10);        // back upper
        ctx.lineTo(-10,-4);         // engine shoulder
        ctx.lineTo(-10,4);          // engine shoulder bottom
        ctx.lineTo(-14,10);         // back lower
        ctx.lineTo(-4,13);          // lower wingtip back
        ctx.lineTo(4,9);            // lower wing attach
        ctx.lineTo(12,6);           // lower nose
        ctx.closePath();
        // Gradient hull fill
        const hg=ctx.createLinearGradient(0,-13,0,13);
        hg.addColorStop(0,'#2a2a44');hg.addColorStop(0.5,'#1a1a2e');hg.addColorStop(1,'#0f0f1c');
        ctx.fillStyle=hg;ctx.fill();
        ctx.strokeStyle='#aaccff';ctx.lineWidth=1.8;ctx.stroke();
        ctx.shadowBlur=0;

        // Hull panel lines
        ctx.strokeStyle='rgba(170,200,255,0.3)';ctx.lineWidth=0.8;
        ctx.beginPath();ctx.moveTo(14,-5);ctx.lineTo(-6,-5);ctx.stroke();
        ctx.beginPath();ctx.moveTo(14,5);ctx.lineTo(-6,5);ctx.stroke();
        ctx.beginPath();ctx.moveTo(4,-9);ctx.lineTo(4,9);ctx.stroke();

        // Cockpit (pulsing)
        const cpPulse=0.8+Math.sin(T/500)*0.2;
        const cpg=ctx.createRadialGradient(8,0,0,8,0,5);
        cpg.addColorStop(0,'#ffffff');cpg.addColorStop(0.4,'#88bbff');cpg.addColorStop(1,'transparent');
        ctx.globalAlpha=cpPulse;ctx.fillStyle=cpg;
        ctx.beginPath();ctx.arc(8,0,5,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
        // Cockpit core
        ctx.fillStyle='#ccddff';
        ctx.beginPath();ctx.arc(8,0,1.8,0,Math.PI*2);ctx.fill();

        // Wing navigation lights (blinking)
        const blink=Math.floor(T/600)%2===0;
        if(blink){
            ctx.shadowBlur=12;ctx.shadowColor='#ff3333';
            ctx.fillStyle='#ff5555';ctx.beginPath();ctx.arc(-4,-13,1.5,0,Math.PI*2);ctx.fill();
            ctx.shadowColor='#33ff33';
            ctx.fillStyle='#55ff55';ctx.beginPath();ctx.arc(-4,13,1.5,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;
        }

        // Engine ports (glow)
        ctx.shadowBlur=15*thrust;ctx.shadowColor='#88aaff';
        ctx.fillStyle='#aaccff';
        ctx.fillRect(-11,-4,2,3);
        ctx.fillRect(-11,1,2,3);
        ctx.shadowBlur=0;

        ctx.restore();
    }

    // Cinematic letterbox bars during all cutscene phases (smooth fade in)
    // Bottom bar is thinner so it doesn't cover Gilbert's quip/dialogue box (which lives at H-58)
    const barT=Math.min(1,G.stationCutsceneTimer/30);
    const topH=Math.floor(40*_easeOut(barT));
    const botH=Math.floor(24*_easeOut(barT));
    ctx.fillStyle='rgba(0,0,0,0.85)';
    ctx.fillRect(0,0,W,topH);
    ctx.fillRect(0,H-botH,W,botH);

    // Dialogue box helper (consistent styling)
    const drawDialogueBox=(x,y,w,h,accent)=>{
        // Shadow
        ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(x+3,y+3,w,h);
        // Glass background
        const bg=ctx.createLinearGradient(0,y,0,y+h);
        bg.addColorStop(0,'rgba(8,10,20,0.92)');bg.addColorStop(1,'rgba(3,3,8,0.95)');
        ctx.fillStyle=bg;ctx.fillRect(x,y,w,h);
        // Top accent bar
        const accg=ctx.createLinearGradient(x,y,x+w,y);
        accg.addColorStop(0,'transparent');accg.addColorStop(0.5,accent);accg.addColorStop(1,'transparent');
        ctx.fillStyle=accg;ctx.fillRect(x,y,w,2);
        // Border
        ctx.strokeStyle=accent+'80';ctx.lineWidth=1;ctx.strokeRect(x+0.5,y+0.5,w-1,h-1);
        // Inner highlight
        ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.strokeRect(x+2.5,y+2.5,w-5,h-5);
    };

    // Dialogue choice
    if(G.stationCutscene==='choice'){
        const boxT=Math.min(1,G.stationCutsceneTimer/20);
        const eT=_easeOut(boxT);
        ctx.save();ctx.globalAlpha=eT;
        const bw=420,bh=130;
        const bx=W/2-bw/2, by=H/2-bh/2-5+(1-eT)*10;
        drawDialogueBox(bx,by,bw,bh,'#aaccff');
        ctx.font='bold 14px Courier New';ctx.textAlign='left';
        ctx.shadowBlur=8;ctx.shadowColor='rgba(170,200,255,0.4)';
        ctx.fillStyle='#aaccff';
        ctx.fillText('"Woah, you\'re one of them, aren\'t ya!?"',bx+18,by+30);
        ctx.shadowBlur=0;
        ctx.font='13px Courier New';
        const c0=G.dialogueChoiceIndex===0;const c1=G.dialogueChoiceIndex===1;
        // Selection pulse
        const selPulse=0.7+Math.sin(T/200)*0.3;
        if(c0){ctx.fillStyle=`rgba(0,220,255,${0.15*selPulse})`;ctx.fillRect(bx+10,by+50,bw-20,22);}
        if(c1){ctx.fillStyle=`rgba(0,220,255,${0.15*selPulse})`;ctx.fillRect(bx+10,by+76,bw-20,22);}
        ctx.fillStyle=c0?'#fff':'#777';
        if(c0){ctx.shadowBlur=10;ctx.shadowColor='#88ccff';}
        ctx.fillText((c0?'▶ ':'  ')+'"Who are you?!"',bx+18,by+66);
        ctx.shadowBlur=0;
        ctx.fillStyle=c1?'#fff':'#777';
        if(c1){ctx.shadowBlur=10;ctx.shadowColor='#88ccff';}
        ctx.fillText((c1?'▶ ':'  ')+'"Can you help us?"',bx+18,by+92);
        ctx.shadowBlur=0;
        ctx.font='10px Courier New';ctx.fillStyle='#556';
        ctx.fillText('[↑/↓] Select    [SPACE] Confirm',bx+18,by+118);
        ctx.restore();
    }
    // Response boxes (bottom caption style)
    const drawCaption=(phaseT,speaker,speakerCol,lines)=>{
        const eT=_easeOut(Math.min(1,phaseT/20));
        ctx.save();ctx.globalAlpha=eT;
        const bh=lines.length>1?90:70;
        const by=H*0.72+(1-eT)*15;
        drawDialogueBox(20,by,W-40,bh,speakerCol);
        ctx.font='bold 13px Courier New';ctx.textAlign='left';
        ctx.shadowBlur=10;ctx.shadowColor=speakerCol+'66';
        ctx.fillStyle=speakerCol;
        ctx.fillText(speaker,40,by+26);
        ctx.shadowBlur=0;
        ctx.font='12px Courier New';ctx.fillStyle='#ddd';
        lines.forEach((line,i)=>ctx.fillText(line,40,by+48+i*18));
        ctx.restore();
    };
    if(G.stationCutscene==='who_response'){
        drawCaption(G.stationCutsceneTimer,'SECTOR A','#aaccff',
            ["We're Sector A enforcement. NOW why don't you tell me who YOU are?"]);
    }
    if(G.stationCutscene==='gilbert_defend'){
        drawCaption(G.stationCutsceneTimer,'GILBERT','#44ff66',
            ["FINE, he IS one of them. But you saw what we did to that snake,",
             "now why don't you just help us before something happens?"]);
    }
    if(G.stationCutscene==='help_response'){
        drawCaption(G.stationCutsceneTimer,'SECTOR A','#aaccff',
            ["Well, you did neutralize that threat, why not?",
             "Welcome to the station!"]);
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

