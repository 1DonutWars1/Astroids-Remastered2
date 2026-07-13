// ============================================================
//  SECTOR 2 — RUINED SPACE STATION
//  A drifting space station encountered ~90s into sector 2.
//  Player and Gilbert dock their ships onto it and drive it
//  together. Slow fire rate, slow movement, immune to asteroids,
//  survives 3 mini-boss hits. Repair requires 3 fuel transfers.
// ============================================================

const SECTOR_STATION_SPAWN_TIME = 90; // seconds into sector 2
const SECTOR_STATION_MAX_HP     = 3;
const SECTOR_STATION_FIRE_CD    = 110;
const SECTOR_STATION_DRIVE      = 0.75;

function initSectorStation(){
    G.sectorStation = {
        active:false, spawned:false, phase:null, // null|drifting|approaching|connected|destroyed
        x:0, y:0, vx:0, vy:0, r:110, rot:0,
        hp:SECTOR_STATION_MAX_HP, maxHp:SECTOR_STATION_MAX_HP,
        fireCd:0, told:false, consoleOpen:false, repairFuel:0,
        destroyedTimer:0
    };
}

function spawnSectorStation(nearShip){
    if(!G.sectorStation) initSectorStation();
    const st=G.sectorStation;
    st.active=true; st.spawned=true; st.phase='drifting';
    st.hp=st.maxHp; st.rot=0; st.fireCd=0;
    st.consoleOpen=false; st.repairFuel=0;
    st.told=false; st.destroyedTimer=0;
    if(nearShip && typeof ship!=='undefined'){
        st.x = ship.x + 220;
        st.y = ship.y;
    } else {
        st.x = -240;
        st.y = H/2 + (Math.random()*120-60);
    }
    st.vx = 0.5; st.vy = (Math.random()-0.5)*0.2;
}

function _sectorStationTalk(text, long){
    // Non-blocking quip (no Gilbert ally required)
    G.gilbertQuip = text;
    G.gilbertQuipTimer = long?360:220;
}

function updateSectorStation(){
    const st=G.sectorStation;
    if(!st) return;

    // --- Time-based checkpoint spawn (sector 2 only, once per visit) ---
    if(G.currentSector===2 && !st.spawned && G.mode==='space' && !boss){
        const elapsed=(performance.now()-G.waveStart)/1000;
        if(elapsed>SECTOR_STATION_SPAWN_TIME){
            spawnSectorStation(false);
        }
    }

    if(!st.active) return;

    if(st.phase==='drifting' || st.phase==='approaching'){
        st.x += st.vx; st.y += st.vy;
        st.rot += 0.002;
        if(st.y<st.r) st.vy=Math.abs(st.vy);
        if(st.y>H-st.r) st.vy=-Math.abs(st.vy);

        const d=Math.hypot(ship.x-st.x, ship.y-st.y);
        if(!st.told && d<380){
            st.told=true;
            _sectorStationTalk("That ruined hulk — wait, that's part of an old space station! I think it's still functional. Dock onto it and we can drive it together!", true);
        }
        if(st.phase==='drifting' && st.told) st.phase='approaching';

        // Dock on contact
        if(st.phase==='approaching' && d < st.r + 18){
            connectToSectorStation();
        }
        // Drift off-screen = despawn (until next call)
        if(st.x > W+400){
            st.active=false;
        }
    }
    else if(st.phase==='connected'){
        // --- Drive with player input ---
        let ax=0, ay=0;
        if(typeof isAction==='function'){
            if(isAction('left'))   ax-=1;
            if(isAction('right'))  ax+=1;
            if(isAction('thrust')) ay-=1;
        }
        if(keys && (keys['KeyS']||keys['ArrowDown'])) ay+=1;
        const mag=Math.hypot(ax,ay);
        if(mag>0){ ax/=mag; ay/=mag; }
        st.vx = st.vx*0.94 + ax*SECTOR_STATION_DRIVE*0.12;
        st.vy = st.vy*0.94 + ay*SECTOR_STATION_DRIVE*0.12;
        st.x += st.vx*4.5;
        st.y += st.vy*4.5;
        // Wrap
        if(st.x<-st.r) st.x=W+st.r;
        if(st.x>W+st.r) st.x=-st.r;
        if(st.y<-st.r) st.y=H+st.r;
        if(st.y>H+st.r) st.y=-st.r;
        st.rot += 0.004;

        // Attach ship to front port
        ship.x = st.x + Math.cos(ship.a)*0;
        ship.y = st.y - st.r*0.5;
        ship.tx = 0; ship.ty = 0;
        G.invincibleTimer = Math.max(G.invincibleTimer, 4);

        // Fire
        if(st.fireCd>0) st.fireCd--;
        if(typeof isAction==='function' && isAction('fire') && st.fireCd<=0 && !st.consoleOpen){
            _sectorStationFire();
            st.fireCd = SECTOR_STATION_FIRE_CD;
        }

        // Asteroids bounce off / vaporize without damage
        for(let i=asteroids.length-1;i>=0;i--){
            const a=asteroids[i];
            if(a.type==='fuel') continue;
            if(Math.hypot(a.x-st.x,a.y-st.y) < st.r + a.r){
                boom(a.x,a.y,a.fire?'#ff6622':'#888',6);
                asteroids.splice(i,1);
            }
        }
        // Mini boss hits
        for(const mb of miniBosses){
            if(mb._stationHitCd>0){ mb._stationHitCd--; continue; }
            const d=Math.hypot(mb.x-st.x, mb.y-st.y);
            if(d < st.r + mb.r*0.9){
                _sectorStationTakeHit();
                mb._stationHitCd = 120;
                if(st.phase!=='connected') return;
            }
        }
    }
    else if(st.phase==='destroyed'){
        st.x += st.vx;
        st.y += st.vy;
        st.vx *= 0.992; st.vy *= 0.992;
        st.rot += 0.006;
        st.destroyedTimer++;
        if(st.repairFuel>=3){
            st.phase='drifting';
            st.hp=st.maxHp;
            st.repairFuel=0;
            boom(st.x,st.y,'#44ff88',50);
            if(typeof Sound!=='undefined'&&Sound.powerup) Sound.powerup();
            _sectorStationTalk("Station's back online! Let's dock again!",false);
        }
    }
}

function _sectorStationFire(){
    const st=G.sectorStation;
    const a=ship.a;
    const sx=st.x+Math.cos(a)*(st.r+6);
    const sy=st.y+Math.sin(a)*(st.r+6);
    bullets.push({x:sx,y:sy,dx:Math.cos(a)*9,dy:Math.sin(a)*9,trail:[],big:true,damage:3});
    if(typeof Sound!=='undefined' && Sound.shoot) Sound.shoot();
    if(typeof shake==='function') shake(3,6);
}

function connectToSectorStation(){
    const st=G.sectorStation;
    st.phase='connected';
    st.vx=0; st.vy=0;
    st.fireCd=30;
    if(typeof Sound!=='undefined' && Sound.powerup) Sound.powerup();
    _sectorStationTalk("We're docked! Aim and shoot to fire the main gun. Press E to open the station console!", true);
}

function _sectorStationTakeHit(){
    const st=G.sectorStation;
    st.hp--;
    boom(st.x,st.y,'#ff4400',22);
    boom(st.x,st.y,'#ffaa00',14);
    if(typeof Sound!=='undefined'&&Sound.explode) Sound.explode();
    if(typeof shake==='function') shake(14,18);
    if(st.hp<=0) _destroySectorStation();
}

function _destroySectorStation(){
    const st=G.sectorStation;
    const wasConnected = st.phase==='connected';
    st.phase='destroyed';
    st.consoleOpen=false;
    st.destroyedTimer=0;
    st.vx=(Math.random()-0.5)*0.6;
    st.vy=(Math.random()-0.5)*0.6;
    if(wasConnected){
        // Eject player + Gilbert out the side
        ship.x = st.x + st.r + 24;
        ship.y = st.y;
        ship.tx = 3.5; ship.ty = (Math.random()-0.5)*2;
        G.invincibleTimer = 150;
        if(G.gilbert){
            G.gilbert.x = st.x - st.r - 24;
            G.gilbert.y = st.y;
            G.gilbert.dx = -2; G.gilbert.dy = 0;
        }
    }
    boom(st.x,st.y,'#ff6622',70);
    boom(st.x,st.y,'#ffaa00',50);
    boom(st.x,st.y,'#ffffff',30);
    if(typeof Sound!=='undefined'&&Sound.explode) Sound.explode();
    if(typeof shake==='function') shake(22,30);
    _sectorStationTalk("Station's blown! Bring 3 fuel pops back to the wreck to repair it!", true);
}

// Called from engine.js fuel-asteroid-shot handler.
// Returns true if the fuel was consumed by the station repair.
function trySectorStationFuelTransfer(sx, sy){
    const st=G.sectorStation;
    if(!st||!st.active||st.phase!=='destroyed') return false;
    if(Math.hypot(sx-st.x, sy-st.y) < st.r + 220){
        st.repairFuel=Math.min(3, st.repairFuel+1);
        _sectorStationTalk('Fuel transferred to station: '+st.repairFuel+'/3', false);
        boom(st.x,st.y,'#ffff66',18);
        return true;
    }
    return false;
}

// --- Console (E key while connected) ---
function toggleSectorStationConsole(){
    const st=G.sectorStation;
    if(!st||st.phase!=='connected') return false;
    if(st.consoleOpen){
        st.consoleOpen=false;
        st.cmdInput='';
        st.terminalText=[];
    } else {
        st.consoleOpen=true;
        st.cmdInput='';
        st.terminalText=[
            "Station Terminal [Firmware 2.71-DEGRADED]",
            "(c) Lumina Systems // NEXUS deep-space relay node.",
            "WARNING: Hull breach detected. Systems running in safe mode.",
            "",
        ];
    }
    if(typeof Sound!=='undefined'&&Sound.ui) Sound.ui();
    return true;
}

// Virtual filesystem for the ruined station terminal
const _STATION_DIR_FILES = [
    { name:'sys-diag.exe',    size:'32,768', date:'2041-04-12' },
    { name:'nav-warp.exe',    size:'61,440', date:'2042-11-03' },
    { name:'readme.txt',      size:'  384',  date:'2040-09-01' },
    { name:'damage_log.txt',  size:'1,204',  date:'2043-02-17' },
    { name:'crew_manifest.db',size:'    0',  date:'2041-11-30' },
];
const _STATION_README = [
    "NEXUS RELAY NODE RS-07 // README",
    "---------------------------------",
    "Terminal commands available:",
    "  help                  - list commands",
    "  dir                   - list files",
    "  type <filename>       - display file contents",
    "  cls                   - clear the screen",
    "  status                - hull and system diagnostics",
    "  teleport              - warp to Sector 1 docking bay",
    "  detach                - detach from station",
    "  exit                  - close terminal",
    "",
    "Note: most subsystems are offline due to hull damage.",
];
const _STATION_DAMAGE_LOG = [
    "[2043-02-17 03:41:12] CRITICAL: Main reactor offline.",
    "[2043-02-17 03:41:14] Hull breach detected — sections 2, 5, 7.",
    "[2043-02-17 03:41:15] Life support FAILED. Evacuation order issued.",
    "[2043-02-17 03:42:01] Distress beacon activated.",
    "[2043-02-17 03:44:33] Last crew pod launched.",
    "[2043-02-17 03:44:34] Station AI entering hibernation...",
    "",
    "... no further entries ...",
];

function _runStationCommand(raw){
    const st=G.sectorStation;
    const input=(raw||'').trim();
    const echo='RS-07:\\> '+input;
    if(input.length===0) return [echo];
    const parts=input.split(/\s+/);
    const cmd=parts[0].toLowerCase();
    const arg=parts.slice(1).join(' ').trim();
    const out=[echo];

    if(cmd==='help'||cmd==='?'||cmd==='/?'){
        out.push(
            "Available commands:",
            "  CLS            Clears the screen.",
            "  DIR            Displays a list of files.",
            "  DETACH         Detach ship from station.",
            "  EXIT           Closes the terminal session.",
            "  HELP           Provides help information.",
            "  STATUS         Hull and system diagnostics.",
            "  TELEPORT       Warp to Sector 1 docking bay.",
            "  TYPE           Displays the contents of a text file.",
            "");
        return out;
    }
    if(cmd==='cls'||cmd==='clear'){
        st.terminalText=[];
        return [];
    }
    if(cmd==='exit'||cmd==='quit'||cmd==='close'){
        st.consoleOpen=false;st.cmdInput='';st.terminalText=[];
        return out;
    }
    if(cmd==='dir'||cmd==='ls'){
        out.push(
            " Volume in drive C is RS-07",
            " Directory of C:\\RS-07\\CORE",
            "");
        for(const f of _STATION_DIR_FILES){
            out.push('  '+f.date+'    '+f.size.padStart(8)+' '+f.name);
        }
        out.push("","         "+_STATION_DIR_FILES.length+" File(s)","");
        return out;
    }
    if(cmd==='type'||cmd==='cat'){
        const fn=arg.toLowerCase();
        if(!fn){ out.push("The syntax of the command is incorrect."); return out; }
        if(fn==='readme.txt'){ out.push(..._STATION_README); return out; }
        if(fn==='damage_log.txt'){ out.push(..._STATION_DAMAGE_LOG); return out; }
        if(fn==='crew_manifest.db'){ out.push("[ERROR] File is empty — 0 bytes.","All records purged during evacuation.",""); return out; }
        if(fn==='sys-diag.exe'||fn==='nav-warp.exe'){ out.push("'"+arg+"' is not a text file. Use the corresponding command instead."); return out; }
        out.push("The system cannot find the file specified.");
        return out;
    }
    if(cmd==='status'||cmd==='sys-diag'||cmd==='sys-diag.exe'||cmd==='.\\sys-diag.exe'||cmd==='diagnostics'){
        const pct=Math.round((st.hp/st.maxHp)*100);
        const bar='['+'#'.repeat(st.hp)+'_'.repeat(st.maxHp-st.hp)+']';
        out.push(
            "=== SYSTEM DIAGNOSTICS ===",
            "  Hull integrity:   "+bar+" "+pct+"%  ("+st.hp+"/"+st.maxHp+")",
            "  Main reactor:     "+(st.hp>=st.maxHp?"ONLINE":"OFFLINE — auxiliary power"),
            "  Life support:     OFFLINE",
            "  Weapons:          "+(st.phase==='connected'?"ONLINE (linked to pilot)":"OFFLINE"),
            "  Navigation:       DEGRADED",
            "  Comms array:      OFFLINE",
            "  Repair fuel:      "+st.repairFuel+"/3",
            "==========================","");
        return out;
    }
    if(cmd==='teleport'||cmd==='warp'||cmd==='nav-warp'||cmd==='nav-warp.exe'||cmd==='.\\nav-warp.exe'){
        out.push("Initializing nav-warp.exe...","Destination: SECTOR 1, DOCKING BAY","Warping...");
        // Defer actual teleport so the user sees the output briefly
        setTimeout(()=>_sectorStationTeleportToFloor3(),400);
        return out;
    }
    if(cmd==='detach'||cmd==='undock'||cmd==='disconnect'){
        out.push("Detaching from station hull...");
        setTimeout(()=>_sectorStationDetach(),300);
        return out;
    }
    out.push("'"+cmd+"' is not recognized as an internal or external command.");
    return out;
}

function sectorStationConsoleKey(e){
    const st=G.sectorStation;
    if(!st||!st.consoleOpen) return false;
    const code=e.code||'';
    if(code==='Escape'){
        st.consoleOpen=false;st.cmdInput='';st.terminalText=[];
        if(typeof Sound!=='undefined'&&Sound.ui) Sound.ui();
        return true;
    }
    if(code==='Enter'||code==='NumpadEnter'){
        const lines=_runStationCommand(st.cmdInput);
        if(!st.terminalText) st.terminalText=[];
        st.terminalText.push(...lines);
        // Keep scrollback manageable
        if(st.terminalText.length>80) st.terminalText=st.terminalText.slice(-60);
        st.cmdInput='';
        if(typeof Sound!=='undefined'&&Sound.ui) Sound.ui();
        return true;
    }
    if(code==='Backspace'){
        st.cmdInput=(st.cmdInput||'').slice(0,-1);
        return true;
    }
    // Printable character — e.key is the typed character for letters/digits/punct
    if(e.key && e.key.length===1){
        if(!e.ctrlKey && !e.metaKey){
            if((st.cmdInput||'').length<80) st.cmdInput=(st.cmdInput||'')+e.key;
        }
        return true;
    }
    return true; // swallow all other keys
}

function _sectorStationDetach(){
    const st=G.sectorStation;
    st.consoleOpen=false;
    st.phase='drifting';
    ship.x = st.x + st.r + 40;
    ship.y = st.y;
    ship.tx = 2.5; ship.ty = 0;
    G.invincibleTimer = 60;
    if(typeof Sound!=='undefined'&&Sound.ui) Sound.ui();
}

function _sectorStationTeleportToFloor3(){
    const st=G.sectorStation;
    st.consoleOpen=false;
    st.active=false; st.spawned=false; st.phase=null;
    // Return to sector 1 station, floor 2 (the 3rd floor = docking bay)
    G.currentSector=1;
    if(G.slotId && saves[G.slotId]){ saves[G.slotId].lastSector=1; saveToDisk(); }
    if(typeof sector2Wrecks!=='undefined') sector2Wrecks=[];
    if(typeof enterStation==='function') enterStation();
    if(G.station){
        G.station.floor=2;
        G.station.playerX=160;
        G.station.playerVX=0;
        const worldW=(typeof DOCKING_BAY!=='undefined')?DOCKING_BAY.width:1600;
        G.station.cameraX=Math.max(0,Math.min(worldW-W, G.station.playerX-W/2));
    }
}

// Fast travel call (X key in sector 2)
function callSectorStation(){
    const st=G.sectorStation;
    if(!st) initSectorStation();
    if(G.sectorStation.active && G.sectorStation.phase!=='destroyed'){
        // Already out there — warp it next to the ship
        G.sectorStation.x = ship.x + 240;
        G.sectorStation.y = ship.y;
        G.sectorStation.phase='approaching';
        G.sectorStation.told=true;
    } else {
        spawnSectorStation(true);
        G.sectorStation.told=true;
        G.sectorStation.phase='approaching';
    }
    _sectorStationTalk("Station incoming — dock up!", false);
    if(typeof Sound!=='undefined'&&Sound.powerup) Sound.powerup();
}

// --- Draw ---
function drawSectorStation(){
    const st=G.sectorStation;
    if(!st||!st.active) return;
    const T=performance.now();
    const dmgFrac = st.hp/st.maxHp;
    const destroyed = st.phase==='destroyed';
    const R=st.r; // base radius
    // This station is ALWAYS ruined — base damage level even at full HP
    // dmgFrac only controls how MUCH worse it looks as HP drops
    const ruinLevel = destroyed ? 1.0 : 0.4 + (1-dmgFrac)*0.5; // 0.4 at full HP, 0.9 at 1HP, 1.0 destroyed

    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(st.rot);

    // === Ambient glow behind the whole station ===
    if(!destroyed){
        const ambG=ctx.createRadialGradient(0,0,R*0.2,0,0,R*1.6);
        // Always has a warm damaged tint mixed with the functional color
        const funcCol = st.phase==='connected'?'rgba(40,255,120,0.06)':'rgba(80,140,255,0.05)';
        ambG.addColorStop(0, funcCol);
        ambG.addColorStop(0.5,'rgba(255,80,20,0.02)');
        ambG.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=ambG;
        ctx.beginPath();ctx.arc(0,0,R*1.6,0,Math.PI*2);ctx.fill();
    } else {
        const ambG=ctx.createRadialGradient(0,0,R*0.1,0,0,R*1.5);
        ambG.addColorStop(0,'rgba(255,60,10,0.12)');
        ambG.addColorStop(0.5,'rgba(180,40,0,0.04)');
        ambG.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=ambG;
        ctx.beginPath();ctx.arc(0,0,R*1.5,0,Math.PI*2);ctx.fill();
    }

    // === Docking struts (6 arms) — drawn FIRST so hull overlaps their bases ===
    // 2 arms are always broken (this is a ruin), more break as HP drops
    const brokenArms = [1, 4]; // always broken
    for(let i=0;i<6;i++){
        const armAngle=(Math.PI*2/6)*i;
        const alwaysBroken = brokenArms.includes(i);
        const hpBroken = !alwaysBroken && (dmgFrac<1 && i >= Math.ceil(dmgFrac*6)+2);
        const broken = destroyed || alwaysBroken || hpBroken;
        // Full arm extends well past the hull; broken ones are short stubs
        const fullLen = R*0.65;
        const armLen = broken ? R*0.15+Math.sin(i*3.7)*R*0.12 : fullLen;
        const armStart = R*0.7; // starts at hull edge so struts are clearly visible outside

        ctx.save();
        ctx.rotate(armAngle);

        // Strut body — tapered trapezoid, wider at base
        const baseW = 16, tipW = broken ? 10 : 10;
        ctx.fillStyle=destroyed?'#1a0a04':'#3a3a4c';
        ctx.strokeStyle=destroyed?'#442010':'#5a6880';
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(armStart, -baseW);
        ctx.lineTo(armStart+armLen, -tipW);
        ctx.lineTo(armStart+armLen, tipW);
        ctx.lineTo(armStart, baseW);
        ctx.closePath();
        ctx.fill();ctx.stroke();

        // Panel detail lines along strut
        ctx.strokeStyle=destroyed?'rgba(80,30,10,0.5)':'rgba(120,150,190,0.35)';
        ctx.lineWidth=1;
        // Longitudinal center line
        ctx.beginPath();ctx.moveTo(armStart+4,0);ctx.lineTo(armStart+armLen-2,0);ctx.stroke();
        // Cross ribs
        for(let r=0;r<3;r++){
            const rx=armStart+armLen*((r+1)/4);
            const ribW=baseW - (baseW-tipW)*((r+1)/4);
            ctx.beginPath();ctx.moveTo(rx,-ribW+2);ctx.lineTo(rx,ribW-2);ctx.stroke();
        }

        if(!broken){
            // Tip node — docking clamp (clearly visible outside hull)
            const nodeX=armStart+fullLen;
            ctx.fillStyle=destroyed?'#180a02':'#3e3e55';
            ctx.strokeStyle=destroyed?'#442010':'#6688aa';
            ctx.lineWidth=2.5;
            ctx.beginPath();ctx.arc(nodeX,0,12,0,Math.PI*2);ctx.fill();ctx.stroke();
            // Inner ring on node
            ctx.strokeStyle=destroyed?'#331408':'#556677';
            ctx.lineWidth=1;
            ctx.beginPath();ctx.arc(nodeX,0,7,0,Math.PI*2);ctx.stroke();
            // Node light
            const nodeCol = st.phase==='connected'?'rgba(60,255,140,0.7)':'rgba(80,140,255,0.35)';
            ctx.fillStyle=destroyed?'rgba(255,50,10,0.3)':nodeCol;
            ctx.beginPath();ctx.arc(nodeX,0,4,0,Math.PI*2);ctx.fill();
        } else {
            // Broken stub — jagged torn metal edge
            const ex=armStart+armLen;
            // Torn metal fill
            ctx.fillStyle=destroyed?'#1a0804':'#2a2a38';
            ctx.strokeStyle='#ff4400';
            ctx.lineWidth=2;
            ctx.beginPath();
            ctx.moveTo(ex,-tipW);
            ctx.lineTo(ex+10,-tipW+4);
            ctx.lineTo(ex+4,-3);
            ctx.lineTo(ex+14,0);
            ctx.lineTo(ex+6,4);
            ctx.lineTo(ex+12,tipW-2);
            ctx.lineTo(ex,tipW);
            ctx.closePath();
            ctx.fill();ctx.stroke();

            // Exposed wiring / glowing internals at break point
            ctx.strokeStyle='rgba(255,150,50,0.6)';
            ctx.lineWidth=1;
            ctx.beginPath();
            ctx.moveTo(ex+2,-5);ctx.lineTo(ex+8,-7);
            ctx.moveTo(ex+3,3);ctx.lineTo(ex+10,6);
            ctx.stroke();

            // Sparks at broken tip — intermittent
            const sparkPhase = Math.sin(T/100+i*2.3);
            if(sparkPhase>0){
                ctx.fillStyle=`rgba(255,220,80,${0.5+sparkPhase*0.4})`;
                ctx.beginPath();ctx.arc(ex+8,Math.sin(T/50+i)*3,2+sparkPhase*2,0,Math.PI*2);ctx.fill();
                // Spark trail
                ctx.fillStyle=`rgba(255,160,30,${0.3*sparkPhase})`;
                ctx.beginPath();ctx.arc(ex+12,Math.sin(T/70+i)*5,1.5,0,Math.PI*2);ctx.fill();
            }
        }
        ctx.restore();
    }

    // === Outer hull ring ===
    const hullGrad = ctx.createRadialGradient(0,0,R*0.5,0,0,R);
    if(destroyed){
        hullGrad.addColorStop(0,'#2a1508');
        hullGrad.addColorStop(0.5,'#1a0c04');
        hullGrad.addColorStop(1,'#0d0603');
    } else {
        hullGrad.addColorStop(0,'#4a4a55');
        hullGrad.addColorStop(0.5,'#2d2d38');
        hullGrad.addColorStop(1,'#161620');
    }
    ctx.fillStyle=hullGrad;
    ctx.beginPath();ctx.arc(0,0,R,0,Math.PI*2);ctx.fill();

    // Hull plating segments (paneled look — some panels missing/scorched)
    for(let i=0;i<12;i++){
        const a1=(Math.PI*2/12)*i;
        const a2=(Math.PI*2/12)*(i+1);
        // Some panels are scorched/missing (always — this is a ruin)
        const panelMissing = (i===2 || i===7 || (destroyed && (i===5||i===10)));
        const panelScorched = (i===4 || i===9 || dmgFrac<0.7);
        if(panelMissing){
            // Exposed interior — dark void with orange glow
            ctx.fillStyle='#08040a';
            ctx.beginPath();
            ctx.moveTo(Math.cos(a1)*R*0.68,Math.sin(a1)*R*0.68);
            ctx.lineTo(Math.cos(a1)*R*0.95,Math.sin(a1)*R*0.95);
            ctx.arc(0,0,R*0.95,a1,a2);
            ctx.lineTo(Math.cos(a2)*R*0.68,Math.sin(a2)*R*0.68);
            ctx.arc(0,0,R*0.68,a2,a1,true);
            ctx.fill();
            // Glowing edge where panel was torn off
            const edgeGlow=0.3+Math.sin(T/250+i)*0.2;
            ctx.strokeStyle=`rgba(255,80,20,${edgeGlow})`;
            ctx.lineWidth=2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a1)*R*0.68,Math.sin(a1)*R*0.68);
            ctx.lineTo(Math.cos(a1)*R*0.95,Math.sin(a1)*R*0.95);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(Math.cos(a2)*R*0.68,Math.sin(a2)*R*0.68);
            ctx.lineTo(Math.cos(a2)*R*0.95,Math.sin(a2)*R*0.95);
            ctx.stroke();
        } else {
            const shade = panelScorched
                ? (destroyed?'#1a0a04':'#2a2530')
                : (i%2===0?(destroyed?'#1e0e06':'#353540'):(destroyed?'#251209':'#2a2a35'));
            ctx.fillStyle=shade;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a1)*R*0.68,Math.sin(a1)*R*0.68);
            ctx.lineTo(Math.cos(a1)*R*0.95,Math.sin(a1)*R*0.95);
            ctx.arc(0,0,R*0.95,a1,a2);
            ctx.lineTo(Math.cos(a2)*R*0.68,Math.sin(a2)*R*0.68);
            ctx.arc(0,0,R*0.68,a2,a1,true);
            ctx.fill();
            // Scorch marks on damaged panels
            if(panelScorched){
                const mid=(a1+a2)/2;
                const smx=Math.cos(mid)*R*0.82, smy=Math.sin(mid)*R*0.82;
                ctx.fillStyle='rgba(40,15,5,0.6)';
                ctx.beginPath();ctx.arc(smx,smy,R*0.06,0,Math.PI*2);ctx.fill();
            }
        }
        // Panel edge line
        ctx.strokeStyle=destroyed?'rgba(80,30,10,0.6)':'rgba(100,130,170,0.35)';
        ctx.lineWidth=1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a1)*R*0.68,Math.sin(a1)*R*0.68);
        ctx.lineTo(Math.cos(a1)*R*0.95,Math.sin(a1)*R*0.95);
        ctx.stroke();
    }

    // Outer hull border (partial — broken arcs for ruin look)
    ctx.lineWidth=2.5;
    // Draw hull border in segments, skipping gaps at missing panels
    const gapPanels = [2,7];
    for(let i=0;i<12;i++){
        if(gapPanels.includes(i)&&!destroyed) continue;
        if(destroyed && (i===2||i===5||i===7||i===10)) continue;
        const a1=(Math.PI*2/12)*i+0.02;
        const a2=(Math.PI*2/12)*(i+1)-0.02;
        ctx.strokeStyle=destroyed?'#552211':'#6688aa';
        ctx.beginPath();ctx.arc(0,0,R,a1,a2);ctx.stroke();
    }
    // Inner hull border
    ctx.strokeStyle=destroyed?'#331108':'#556680';
    ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(0,0,R*0.68,0,Math.PI*2);ctx.stroke();

    // === Hull breach holes — ALWAYS present (this is a ruin) ===
    {
        // Base breaches always visible + more as HP drops + most when destroyed
        const baseBreach=3;
        const extraBreach=destroyed?4:Math.floor((1-dmgFrac)*3);
        const breaches=baseBreach+extraBreach;
        for(let i=0;i<breaches;i++){
            const ba=i*1.47+0.8;
            const br=R*0.8+Math.sin(i*2.1)*R*0.08;
            const bx=Math.cos(ba)*br, by=Math.sin(ba)*br;
            const bSize=8+i*2.5+(destroyed?5:0);
            // Dark void
            ctx.fillStyle='#030108';
            ctx.beginPath();ctx.arc(bx,by,bSize,0,Math.PI*2);ctx.fill();
            // Jagged edge around the hole (torn metal)
            ctx.strokeStyle=destroyed?'#662211':'#555568';
            ctx.lineWidth=2;
            const teeth=8;
            ctx.beginPath();
            for(let t=0;t<=teeth;t++){
                const ta=Math.PI*2/teeth*t;
                const tr=bSize+(t%2===0?3:-1)+Math.sin(t*1.7)*2;
                const tx2=bx+Math.cos(ta)*tr, ty2=by+Math.sin(ta)*tr;
                if(t===0) ctx.moveTo(tx2,ty2); else ctx.lineTo(tx2,ty2);
            }
            ctx.closePath();ctx.stroke();
            // Glowing hot edge — pulsing orange/red
            const edgeFlick=0.5+Math.sin(T/180+i*2.7)*0.35;
            ctx.strokeStyle=`rgba(255,70,15,${edgeFlick})`;
            ctx.lineWidth=2.5;
            ctx.beginPath();ctx.arc(bx,by,bSize+1,ba-1.0,ba+1.4);ctx.stroke();
            // Inner ember glow
            const emberFlick=0.2+Math.sin(T/130+i*4)*0.15;
            ctx.fillStyle=`rgba(255,50,10,${emberFlick})`;
            ctx.beginPath();ctx.arc(bx,by,bSize*0.5,0,Math.PI*2);ctx.fill();
            // Occasional bright spark inside breach
            if(Math.sin(T/80+i*5.3)>0.6){
                ctx.fillStyle=`rgba(255,220,100,${0.6+Math.sin(T/40+i)*0.3})`;
                ctx.beginPath();ctx.arc(bx+Math.sin(T/90+i)*3,by+Math.cos(T/110+i)*2,1.5,0,Math.PI*2);ctx.fill();
            }
        }
    }

    // === Crack lines — ALWAYS present, more as damage increases ===
    {
        const baseCracks=4; // always has cracks — it's ruined
        const extraCracks=destroyed?8:Math.floor((1-dmgFrac)*6);
        const numCracks=baseCracks+extraCracks;
        for(let i=0;i<numCracks;i++){
            const ca=i*0.82+0.15;
            const flick=0.35+Math.sin(T/280+i*1.9)*0.25;
            // Cracks glow orange near damage, dull grey when stable
            const isHot = i>=baseCracks || destroyed;
            const r=isHot?255:180, g=isHot?(destroyed?30:80):160, b=isHot?10:140;
            ctx.strokeStyle=`rgba(${r},${g},${b},${isHot?flick:0.3})`;
            ctx.lineWidth=isHot?2:1.5;
            const startR=R*0.25+Math.sin(i*1.7)*R*0.1;
            const endR=R*0.92+Math.sin(i*2.3)*R*0.06;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ca)*startR,Math.sin(ca)*startR);
            // Jagged crack — 3 segments with offsets
            const s1R=startR+(endR-startR)*0.3;
            const s2R=startR+(endR-startR)*0.6;
            ctx.lineTo(Math.cos(ca+0.12)*s1R,Math.sin(ca+0.12)*s1R);
            ctx.lineTo(Math.cos(ca-0.08)*s2R,Math.sin(ca-0.08)*s2R);
            ctx.lineTo(Math.cos(ca+0.05)*endR,Math.sin(ca+0.05)*endR);
            ctx.stroke();
            // Branching sub-crack
            if(i%2===0){
                ctx.lineWidth=1;
                ctx.strokeStyle=`rgba(${r},${g},${b},${(isHot?flick:0.2)*0.6})`;
                ctx.beginPath();
                ctx.moveTo(Math.cos(ca+0.12)*s1R,Math.sin(ca+0.12)*s1R);
                ctx.lineTo(Math.cos(ca+0.3)*s1R*1.15,Math.sin(ca+0.3)*s1R*1.15);
                ctx.stroke();
            }
        }
    }

    // === Inner ring (structural core) ===
    ctx.strokeStyle = st.phase==='connected'?'#44ff88':(destroyed?'#441108':'#6688aa');
    ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,0,R*0.42,0,Math.PI*2);ctx.stroke();
    // Second inner ring
    ctx.strokeStyle = st.phase==='connected'?'rgba(68,255,136,0.3)':(destroyed?'rgba(68,17,8,0.4)':'rgba(100,130,170,0.25)');
    ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(0,0,R*0.52,0,Math.PI*2);ctx.stroke();

    // === Core reactor ===
    if(!destroyed){
        // Reactor glow — slightly unstable (flickering)
        const coreG = ctx.createRadialGradient(0,0,0,0,0,R*0.35);
        const coreFlicker = 0.85+Math.sin(T/150)*0.1; // subtle instability
        if(st.phase==='connected'){
            coreG.addColorStop(0,`rgba(80,255,160,${coreFlicker})`);
            coreG.addColorStop(0.4,'rgba(40,200,100,0.4)');
            coreG.addColorStop(1,'rgba(0,0,0,0)');
        } else {
            coreG.addColorStop(0,`rgba(100,160,255,${coreFlicker*0.7})`);
            coreG.addColorStop(0.4,'rgba(60,100,200,0.25)');
            coreG.addColorStop(1,'rgba(0,0,0,0)');
        }
        ctx.fillStyle=coreG;
        ctx.beginPath();ctx.arc(0,0,R*0.35,0,Math.PI*2);ctx.fill();
        // Core center dot
        ctx.fillStyle=st.phase==='connected'?'rgba(150,255,200,0.9)':'rgba(150,190,255,0.7)';
        ctx.beginPath();ctx.arc(0,0,R*0.08,0,Math.PI*2);ctx.fill();
        // Pulsing ring
        const pulse=0.3+Math.sin(T/400)*0.15;
        ctx.strokeStyle=st.phase==='connected'?`rgba(80,255,160,${pulse})`:`rgba(100,160,255,${pulse})`;
        ctx.lineWidth=1.5;
        const pulseR=R*0.2+Math.sin(T/600)*R*0.05;
        ctx.beginPath();ctx.arc(0,0,pulseR,0,Math.PI*2);ctx.stroke();
    } else {
        // Dead reactor — flickering embers and smoke
        const emberG=ctx.createRadialGradient(0,0,0,0,0,R*0.3);
        emberG.addColorStop(0,`rgba(255,80,20,${0.45+Math.sin(T/90)*0.2})`);
        emberG.addColorStop(0.5,`rgba(180,30,5,${0.2+Math.sin(T/120)*0.1})`);
        emberG.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=emberG;
        ctx.beginPath();ctx.arc(0,0,R*0.3,0,Math.PI*2);ctx.fill();
        // Smoke wisps
        for(let s=0;s<5;s++){
            const sa=s*1.26+T/1800;
            const sr=R*0.15+Math.sin(T/700+s*2)*R*0.1;
            const sx=Math.cos(sa)*sr, sy=Math.sin(sa)*sr;
            ctx.fillStyle=`rgba(60,40,30,${0.18+Math.sin(T/250+s)*0.1})`;
            ctx.beginPath();ctx.arc(sx,sy,R*0.1,0,Math.PI*2);ctx.fill();
        }
    }

    // === Window lights along hull (most are dead — it's a ruin) ===
    for(let i=0;i<18;i++){
        const wa=(Math.PI*2/18)*i;
        const wx=Math.cos(wa)*R*0.82, wy=Math.sin(wa)*R*0.82;
        // Most windows are dead. Only a few flicker on (ruined station with partial power)
        const windowAlive = !destroyed && (i%5===0 || (i%3===0 && dmgFrac>0.5));
        if(!windowAlive){
            // Dead/shattered window
            ctx.fillStyle=destroyed?'rgba(20,8,3,0.7)':'rgba(15,10,20,0.6)';
            ctx.beginPath();ctx.arc(wx,wy,2.5,0,Math.PI*2);ctx.fill();
            // Cracked glass effect on some
            if(i%3===0){
                ctx.strokeStyle='rgba(80,60,50,0.3)';
                ctx.lineWidth=0.5;
                ctx.beginPath();ctx.moveTo(wx-3,wy);ctx.lineTo(wx+3,wy);
                ctx.moveTo(wx,wy-2);ctx.lineTo(wx+1,wy+3);ctx.stroke();
            }
        } else {
            // Surviving window — flickers unstably
            const wFlick=0.3+Math.sin(T/200+i*1.3)*0.25+Math.sin(T/70+i*5)*0.1;
            ctx.fillStyle=st.phase==='connected'?`rgba(80,255,160,${wFlick})`:`rgba(120,180,255,${wFlick})`;
            ctx.beginPath();ctx.arc(wx,wy,2.5,0,Math.PI*2);ctx.fill();
            // Small glow halo
            ctx.fillStyle=st.phase==='connected'?`rgba(80,255,160,${wFlick*0.2})`:`rgba(120,180,255,${wFlick*0.15})`;
            ctx.beginPath();ctx.arc(wx,wy,5,0,Math.PI*2);ctx.fill();
        }
    }

    // === Floating debris field (always some, more when destroyed) ===
    {
        const debrisCount = destroyed ? 12 : 5;
        for(let d=0;d<debrisCount;d++){
            const da=d*0.62+T/(destroyed?3000:5000);
            const dr=R*1.15+Math.sin(T/2000+d*2.7)*R*0.25+d*4;
            const dx=Math.cos(da)*dr, dy=Math.sin(da)*dr;
            ctx.fillStyle=destroyed?'#1a0a06':'#222233';
            ctx.strokeStyle=destroyed?'#3a1a10':'#444455';
            ctx.lineWidth=1;
            ctx.save();
            ctx.translate(dx,dy);
            ctx.rotate(T/3000+d*1.3);
            ctx.beginPath();
            const ds=2+d%4*2;
            ctx.moveTo(-ds,-ds*0.6);ctx.lineTo(ds*0.4,-ds);ctx.lineTo(ds,ds*0.2);
            ctx.lineTo(ds*0.3,ds*0.8);ctx.lineTo(-ds*0.5,ds*0.4);ctx.closePath();
            ctx.fill();ctx.stroke();
            ctx.restore();
        }
    }

    ctx.restore();

    // === HP bar (outside rotation) ===
    if(st.phase==='connected'){
        const barW=st.maxHp*18+4;
        const barX=st.x-barW/2;
        const barY=st.y-R-28;
        ctx.fillStyle='rgba(0,0,0,0.5)';
        ctx.fillRect(barX-2,barY-2,barW+4,12);
        for(let i=0;i<st.maxHp;i++){
            ctx.fillStyle = i<st.hp?'#44ff88':'#552222';
            ctx.strokeStyle='#223';
            ctx.lineWidth=1;
            ctx.fillRect(barX+i*18+2,barY,14,8);
            ctx.strokeRect(barX+i*18+2,barY,14,8);
        }
    }
    if(st.phase==='destroyed'){
        ctx.fillStyle='#ffaa22';
        ctx.font='bold 14px Courier New';
        ctx.textAlign='center';
        ctx.shadowBlur=6;ctx.shadowColor='#ff6600';
        ctx.fillText('REPAIR: '+st.repairFuel+'/3 FUEL', st.x, st.y-R-16);
        ctx.shadowBlur=0;
    }
    // "Press to dock" hint
    if(st.phase==='approaching'){
        const d=Math.hypot(ship.x-st.x,ship.y-st.y);
        if(d<260 && d>R+18){
            const hintPulse=0.6+Math.sin(T/300)*0.4;
            ctx.fillStyle=`rgba(68,204,255,${hintPulse})`;
            ctx.font='bold 12px Courier New';
            ctx.textAlign='center';
            ctx.fillText('FLY INTO HULL TO DOCK', st.x, st.y-R-16);
        }
    }
}

function drawSectorStationConsole(){
    const st=G.sectorStation;
    if(!st||!st.consoleOpen) return;
    ctx.fillStyle='rgba(0,0,0,0.88)';
    ctx.fillRect(0,0,W,H);
    // Terminal window
    const tw=560, th=380;
    const tx=W/2-tw/2, ty=H/2-th/2;
    // Title bar
    ctx.fillStyle='#1a3328';
    ctx.fillRect(tx,ty,tw,22);
    ctx.fillStyle='#44ff88';
    ctx.font='bold 12px Consolas';
    ctx.textAlign='left';
    ctx.fillText('RS-07 Station Terminal',tx+8,ty+15);
    // Terminal body
    const bgG=ctx.createLinearGradient(tx,ty+22,tx,ty+th);
    bgG.addColorStop(0,'rgba(5,15,10,0.98)');
    bgG.addColorStop(1,'rgba(2,8,4,0.98)');
    ctx.fillStyle=bgG;
    ctx.fillRect(tx,ty+22,tw,th-22);
    ctx.strokeStyle='#33aa66';
    ctx.lineWidth=2;
    ctx.strokeRect(tx,ty,tw,th);
    ctx.strokeRect(tx,ty,tw,22);
    // Scrollback text
    ctx.font='13px Consolas';
    ctx.textAlign='left';
    const lines=st.terminalText||[];
    const lineH=16;
    const maxVisible=Math.floor((th-60)/lineH);
    const start=Math.max(0,lines.length-maxVisible);
    let curY=ty+40;
    for(let i=start;i<lines.length;i++){
        ctx.fillStyle='#88ddaa';
        ctx.fillText(lines[i],tx+12,curY);
        curY+=lineH;
    }
    // Command prompt + blinking cursor
    const promptStr='RS-07:\\> ';
    ctx.fillStyle='#cccccc';
    ctx.fillText(promptStr+(st.cmdInput||''),tx+12,curY);
    if(Math.floor(performance.now()/400)%2===0){
        const cw=ctx.measureText(promptStr+(st.cmdInput||'')).width;
        ctx.fillStyle='#dddddd';ctx.fillRect(tx+12+cw+1,curY-12,8,14);
    }
    // Footer hint
    ctx.font='10px Consolas';ctx.fillStyle='#555';ctx.textAlign='right';
    ctx.fillText('type HELP for commands   [ESC] close',tx+tw-12,ty+th-8);
}

// Dev
function devSpawnSectorStation(){
    const prev=G.currentSector;
    G.currentSector=2;
    spawnSectorStation(true);
    G.sectorStation.told=true;
    G.sectorStation.phase='approaching';
    G.currentSector=prev;
}
