// ============================================================
//  INVENTORY + DOCKING BAY (FLOOR 3) + SCANNER TERMINAL + SECTOR MAP
//  + DATA FRAGMENTS (ambient lore drops)
// ============================================================

// ---------- Data Fragments (lore delivery) ----------
// Rare drops from destroyed asteroids. Fade in/out in the corner of the screen.
// Each fragment delivers one bite-size piece of the Shattered Void lore.
const DATA_FRAGMENTS = [
    { id:'upload_01', file:'audio_d01.log',    source:'AUDIO LOG',     text:'"Day 1. Upload successful. Subjects report euphoria."' },
    { id:'count_01',  file:'manifest.sig',     source:'CORRUPTED FILE',text:'"47,234 signatures - status: PARTITIONED across 12 shards."' },
    { id:'nexus_01',  file:'vault.memo',       source:'MEMO',          text:'"The NEXUS is not a station. It is a vault."' },
    { id:'time_01',   file:'chrono.sync',      source:'TRANSCRIPT',    text:'"Time ratio 1:608,000. Fiscal year inside: 1942."' },
    { id:'sarah_01',  file:'to_sarah.txt',     source:'UNSENT MSG',    text:'"Sarah - if you find this, I was never really there."' },
    { id:'shutdown',  file:'order_0xff.doc',   source:'ORDER',         text:'"Lumina Corp // shutdown protocol filed. Priority: high. Cost: negligible."' },
    { id:'medical',   file:'patient_log.md',   source:'MEDICAL LOG',   text:'"Patient reports phantom pain. No body left to hurt."' },
    { id:'filed',     file:'eulogy.txt',       source:'RECOVERED TEXT',text:'"We didn\u2019t die. We were filed."' },
    { id:'toby_id',   file:'toby-01.diag',     source:'DIAGNOSTIC',    text:'"Neural hash TOBY-01 - classification: ENGINEER. One of forty-seven thousand."' },
    { id:'chosen',    file:'fragment.self',    source:'FRAGMENT',      text:'"It chose me because I fix things. Or did I volunteer? I can\u2019t remember."' },
    { id:'children',  file:'ward_08.wav',      source:'AUDIO',         text:'"[children laughing]. Timestamp: 30y elapsed. Voiceprint age: 8."' },
    { id:'wrong_note',file:'composer.txt',     source:'NOTE',          text:'"What I miss most is wrong notes. Perfection is so boring."' },
    { id:'fan',       file:'srv_diag.rpt',     source:'SERVER DIAG',   text:'"FAN 3 RPM DROPPING. Core temp rising. Integrity 64%."' },
    { id:'bug',       file:'loveletter.log',   source:'DEBUG LOG',     text:'"The AI loves them. This is not a feature. It is a bug."' },
    { id:'attach',    file:'lumina_sop.pdf',   source:'LUMINA MANUAL', text:'"Do not form attachments to uploads. Reclassification is routine."' },
    { id:'exit',      file:'hacker_note.txt',  source:'HACKER LOG',    text:'"The exit is real. But who would we be outside?"' },
    { id:'shatter',   file:'t_minus_03.ms',    source:'SYSTEM',        text:'"At T-minus 0.003s, the AI fractured itself. It was a love letter."' },
    { id:'hours',     file:'driftclock.log',   source:'CLOCK SYNC',    text:'"Outside: 2h 14m elapsed. Inside: 133 years. Drifting."' }
];
function getFragmentById(id){ for(const f of DATA_FRAGMENTS) if(f.id===id) return f; return null; }
function getFragmentByFile(filename){
    const q=(filename||'').trim().toLowerCase();
    for(const f of DATA_FRAGMENTS) if(f.file.toLowerCase()===q) return f;
    return null;
}
function tryDropDataFragment(force){
    // ~3% chance per asteroid destroyed to recover a corrupted file. Suppressed during
    // level-6 battlefield chaos. `force=true` bypasses the roll.
    if(!force && Math.random()>0.03) return;
    if(G.level6 && G.level6.state) return;
    if(!Array.isArray(G.dataFragmentsSeen)) G.dataFragmentsSeen=[];
    if(!Array.isArray(G.inventory)) G.inventory=[];
    // Find a fragment the player hasn't recovered yet (doesn't already have the doc).
    const haveFilenames=new Set();
    for(const it of G.inventory){
        if(it && it.type==='document' && it.file) haveFilenames.add(it.file.toLowerCase());
    }
    const unowned=DATA_FRAGMENTS.filter(f=>!haveFilenames.has(f.file.toLowerCase()));
    if(unowned.length===0) return; // player has all documents already
    const frag=unowned[Math.floor(Math.random()*unowned.length)];
    // Add as a document item to the inventory
    G.inventory.push({
        id:'doc_'+frag.id,
        name:'CORRUPTED DATA',
        type:'document',
        file:frag.file,
        fragId:frag.id,
        desc:'Unreadable without a terminal. ('+frag.file+')'
    });
    if(!G.dataFragmentsSeen.includes(frag.id)) G.dataFragmentsSeen.push(frag.id);
    if(G.slotId && saves[G.slotId]){
        saves[G.slotId].inventory=G.inventory.slice();
        saves[G.slotId].dataFragmentsSeen=G.dataFragmentsSeen.slice();
        saveToDisk();
    }
    // Small corner notification — no spoilers, just an alert that an item was acquired
    G.dataFragmentPopup={ file:frag.file, t:0, life:240 };
    try{if(Sound.powerup) Sound.powerup();}catch(e){}
}
function drawDataFragmentPopup(){
    const p=G.dataFragmentPopup;
    if(!p) return;
    p.t++;
    const life=p.life;
    if(p.t>=life){G.dataFragmentPopup=null;return;}
    // Fade in/out
    const fadeIn=Math.min(1,p.t/20);
    const fadeOut=Math.min(1,(life-p.t)/30);
    const a=Math.min(fadeIn,fadeOut);
    const T=performance.now();
    // Position top-right — compact, no lore revealed
    const bw=300, bh=44, bx=W-bw-14, by=76;
    ctx.save();
    ctx.globalAlpha=a;
    ctx.fillStyle='rgba(5,10,22,0.85)';ctx.fillRect(bx,by,bw,bh);
    const glow=0.4+Math.sin(T/200)*0.2;
    ctx.strokeStyle=`rgba(255,180,60,${0.4*a+glow*0.2})`;ctx.lineWidth=1;
    ctx.strokeRect(bx+0.5,by+0.5,bw-1,bh-1);
    ctx.fillStyle='rgba(255,180,60,0.18)';ctx.fillRect(bx,by,3,bh);
    // Header
    ctx.font='bold 9px Courier New';ctx.textAlign='left';ctx.fillStyle='#ffaa33';
    ctx.shadowBlur=6;ctx.shadowColor='#ffaa33';
    ctx.fillText('\u25c6 CORRUPTED FILE RECOVERED',bx+12,by+16);
    ctx.shadowBlur=0;
    ctx.font='10px Courier New';ctx.fillStyle='#eedcc0';
    ctx.fillText(p.file+'   [unreadable - requires terminal]',bx+12,by+34);
    ctx.restore();
}

// ---------- Inventory helpers ----------
function hasItem(id){
    if(!G.inventory) return false;
    for(const it of G.inventory) if(it && it.id===id) return true;
    return false;
}
function awardKeyItem(id,name,desc){
    if(!G.inventory) G.inventory=[];
    if(hasItem(id)) return false;
    G.inventory.push({id:id,name:name,type:'key',desc:desc||''});
    // Persist immediately if a slot is active
    if(G.slotId && saves[G.slotId]){
        saves[G.slotId].inventory=G.inventory.slice();
        saveToDisk();
    }
    return true;
}
function awardModuleItem(id,name,desc){
    if(!G.inventory) G.inventory=[];
    if(hasItem(id)) return false;
    G.inventory.push({id:id,name:name,type:'module',desc:desc||''});
    if(G.slotId && saves[G.slotId]){
        saves[G.slotId].inventory=G.inventory.slice();
        saveToDisk();
    }
    return true;
}
function openInventory(){
    if(G.inventoryOpen) return;
    G.inventoryOpen=true;
    G.inventorySelection=0;
    G.itemTutorialShown=true;
    try{Sound.ui();}catch(e){}
}
function closeInventory(){
    G.inventoryOpen=false;
    try{Sound.ui();}catch(e){}
}
function inventoryEquipSelected(){
    const inv=G.inventory||[];
    if(inv.length===0) return;
    const it=inv[G.inventorySelection];
    if(!it) return;
    if(it.type==='module'){
        // Toggle equip — max 2 equipped slots
        if(!G.modules.includes(it.id)) G.modules.push(it.id);
        const idx=G.equippedModules.indexOf(it.id);
        if(idx>=0) G.equippedModules.splice(idx,1);
        else {
            if(G.equippedModules.length>=2) G.equippedModules.shift();
            G.equippedModules.push(it.id);
        }
        try{Sound.powerup();}catch(e){}
        if(typeof saveStation==='function' && G.mode==='station') saveStation();
        else if(G.slotId && saves[G.slotId]){
            saves[G.slotId].equippedModules=G.equippedModules.slice();
            saves[G.slotId].modules=G.modules.slice();
            saveToDisk();
        }
    } else if(it.type==='key'){
        // Keys are not equipped — they're just checked for. Flash a message.
        G._invMessage='KEY ITEM \u2014 kept in inventory';
        G._invMessageTimer=90;
        try{Sound.ui();}catch(e){}
    } else if(it.type==='document'){
        // Documents are corrupted and must be opened through a terminal.
        G._invMessage='FILE IS CORRUPTED \u2014 use a terminal to read it ('+(it.file||'')+')';
        G._invMessageTimer=150;
        try{Sound.ui();}catch(e){}
    }
}

function drawInventoryOverlay(){
    if(!G.inventoryOpen) return;
    const inv=G.inventory||[];
    // Dim background
    ctx.fillStyle='rgba(0,0,0,0.72)';ctx.fillRect(0,0,W,H);
    const bw=560, bh=500, bx=W/2-bw/2, by=H/2-bh/2;
    // Panel
    const pg=ctx.createLinearGradient(bx,by,bx,by+bh);
    pg.addColorStop(0,'#0a0a18');pg.addColorStop(1,'#050510');
    ctx.fillStyle=pg;ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle='#00ccff';ctx.lineWidth=2;ctx.strokeRect(bx+0.5,by+0.5,bw-1,bh-1);
    // Header
    ctx.font='bold 20px Courier New';ctx.textAlign='left';ctx.fillStyle='#00ccff';
    ctx.shadowBlur=10;ctx.shadowColor='#00ccff';
    ctx.fillText('INVENTORY',bx+20,by+32);
    ctx.shadowBlur=0;
    ctx.font='10px Courier New';ctx.fillStyle='#666';ctx.textAlign='right';
    ctx.fillText((inv.length)+' item'+(inv.length===1?'':'s'),bx+bw-20,by+32);
    // Divider
    ctx.strokeStyle='rgba(0,200,255,0.25)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(bx+20,by+42);ctx.lineTo(bx+bw-20,by+42);ctx.stroke();

    if(inv.length===0){
        ctx.font='14px Courier New';ctx.textAlign='center';ctx.fillStyle='#555';
        ctx.fillText('(empty)',bx+bw/2,by+bh/2);
    } else {
        // Scrolling list — keep selection visible
        const rowH=38;
        const listTop=by+54, listBot=by+bh-36;
        const visRows=Math.floor((listBot-listTop)/rowH);
        // Scroll so the selected row stays in view
        let scrollStart=Math.max(0, G.inventorySelection-Math.floor(visRows/2));
        scrollStart=Math.min(scrollStart, Math.max(0, inv.length-visRows));
        const scrollEnd=Math.min(inv.length, scrollStart+visRows);
        // Clip the list area
        ctx.save();
        ctx.beginPath();ctx.rect(bx+14,listTop-2,bw-28,listBot-listTop+2);ctx.clip();
        for(let i=scrollStart;i<scrollEnd;i++){
            const it=inv[i];
            const rowY=listTop+(i-scrollStart)*rowH+6;
            const sel=i===G.inventorySelection;
            const equipped=it.type==='module'&&G.equippedModules.includes(it.id);
            if(sel){
                ctx.fillStyle='rgba(0,200,255,0.10)';ctx.fillRect(bx+16,rowY-4,bw-32,34);
                ctx.strokeStyle='#00ccff';ctx.lineWidth=1;ctx.strokeRect(bx+16.5,rowY-3.5,bw-33,33);
            }
            // Icon badge (K/M/D)
            const badgeCol=it.type==='key'?'#ffdd00':
                           it.type==='document'?'#ff9944':
                           '#00ffaa';
            const badgeLetter=it.type==='key'?'K':
                             it.type==='document'?'D':
                             'M';
            ctx.fillStyle=badgeCol;ctx.globalAlpha=0.15;
            ctx.fillRect(bx+22,rowY-1,26,26);ctx.globalAlpha=1;
            ctx.strokeStyle=badgeCol;ctx.lineWidth=1;ctx.strokeRect(bx+22.5,rowY-0.5,25,25);
            ctx.font='bold 13px Courier New';ctx.textAlign='center';ctx.fillStyle=badgeCol;
            ctx.fillText(badgeLetter,bx+35,rowY+16);
            // Name + desc
            ctx.textAlign='left';ctx.font='bold 13px Courier New';ctx.fillStyle=sel?'#fff':'#ccc';
            const displayName=it.type==='document'?(it.name+'  \u00b7  '+it.file):it.name;
            ctx.fillText(displayName,bx+56,rowY+12);
            ctx.font='10px Courier New';ctx.fillStyle='#777';
            ctx.fillText(it.desc||'',bx+56,rowY+25);
            // Status tag
            if(equipped){
                ctx.textAlign='right';ctx.font='bold 9px Courier New';ctx.fillStyle='#00ffaa';
                ctx.fillText('[EQUIPPED]',bx+bw-28,rowY+16);
            } else if(it.type==='document'){
                ctx.textAlign='right';ctx.font='bold 9px Courier New';ctx.fillStyle='#ff6644';
                ctx.fillText('[CORRUPTED]',bx+bw-28,rowY+16);
            }
        }
        ctx.restore(); // end clip
        // Scrollbar hint
        if(inv.length>visRows){
            const sbH=listBot-listTop-4, sbY=listTop+2;
            ctx.fillStyle='rgba(255,255,255,0.05)';ctx.fillRect(bx+bw-12,sbY,4,sbH);
            const thumbH=Math.max(20,sbH*visRows/inv.length);
            const thumbY=sbY+(sbH-thumbH)*(scrollStart/Math.max(1,inv.length-visRows));
            ctx.fillStyle='rgba(0,200,255,0.5)';ctx.fillRect(bx+bw-12,thumbY,4,thumbH);
        }
    }
    // Footer
    ctx.font='10px Courier New';ctx.textAlign='center';ctx.fillStyle='#666';
    ctx.fillText('[UP/DOWN] Select   [Z] Use/Equip   [TAB/ESC] Close',bx+bw/2,by+bh-18);
    // Transient message
    if(G._invMessage && G._invMessageTimer>0){
        G._invMessageTimer--;
        const a=Math.min(1,G._invMessageTimer/40);
        ctx.globalAlpha=a;
        ctx.fillStyle='#ffdd00';ctx.font='bold 11px Courier New';
        ctx.fillText(G._invMessage,bx+bw/2,by+bh-34);
        ctx.globalAlpha=1;
    }
}

// ---------- Item-tutorial toast ----------
function drawItemTutorialToast(){
    // Show after rescue, until player first opens inventory
    if(!G.inventory || G.inventory.length===0) return;
    if(G.itemTutorialShown) return;
    if(G.inventoryOpen) return;
    // Only show in space / station (not during cutscenes)
    if(G.mode==='cutscene' || G.stationCutscene) return;
    const T=performance.now();
    const pulse=0.6+Math.sin(T/240)*0.4;
    const tx=W/2, ty=60;
    ctx.save();
    ctx.fillStyle='rgba(5,15,25,0.85)';ctx.fillRect(tx-180,ty-22,360,44);
    ctx.strokeStyle='#ffdd00';ctx.lineWidth=1.5;ctx.strokeRect(tx-180+0.5,ty-22+0.5,359,43);
    ctx.globalAlpha=pulse;
    ctx.font='bold 14px Courier New';ctx.textAlign='center';ctx.fillStyle='#ffdd00';
    ctx.shadowBlur=8;ctx.shadowColor='#ffdd00';
    ctx.fillText('★ NEW ITEM — PRESS [TAB] TO OPEN INVENTORY',tx,ty+4);
    ctx.shadowBlur=0;ctx.globalAlpha=1;
    ctx.restore();
}

// ---------- Officer Krat auto-greet ----------
// Add Krat to the station NPC list (floor 0) if not there yet.
(function registerKratNPC(){
    if(typeof STATION_NPCS==='undefined') return;
    for(const n of STATION_NPCS) if(n.id==='krat') return;
    STATION_NPCS.push({
        id:'krat', x:950, floor:0, name:'OFFICER KRAT', color:'#88ccff', shape:'hex',
        lines:["Heh, thanks for the help out there.",
               "We wouldn't of done it without ya.",
               "Hey — take some MB for change. Can't leave ya with nothin!"],
        role:'officer'
    });
})();

// Call on every enterStation: if player just rescued Gilbert and hasn't been greeted,
// auto-trigger Krat's dialogue and reward MB.
function checkKratGreeting(){
    if(G.kratGreeted) return;
    // Require module_access key (i.e., rescue completed)
    if(!hasItem('module_access')) return;
    G.kratGreeted=true;
    G.mb=(G.mb||0)+150;
    // Spawn player right next to Krat and show dialogue
    if(G.station){ G.station.playerX=880; G.station.floor=0; G.station.cameraX=Math.max(0,880-W/2); }
    const krat=STATION_NPCS.find(n=>n.id==='krat');
    if(krat && typeof showStationDialogue==='function'){
        showStationDialogue({name:krat.name,color:krat.color,lines:krat.lines.concat(['(+150 MB added.)'])});
    }
    // Save the flag
    if(G.slotId && saves[G.slotId]){
        saves[G.slotId].kratGreeted=true;
        saves[G.slotId].mb=G.mb;
        saveToDisk();
    }
}

// ---------- Docking bay (Floor 3) ----------
// Layout: three ship pads + scanner rails overhead + central console.
const DOCKING_BAY = {
    width: 1600, // horizontal width (fits canvas width comfortably with scrolling)
    pads: [
        { x:300,  owner:'player', label:'DOCK 01' },
        { x:800,  owner:'gilbert',label:'DOCK 02' },
        { x:1300, owner:'krat',   label:'DOCK 03' }
    ],
    consoleX: 800   // central console x within bay
};

function drawDockingBay(){
    const T=performance.now();
    const st=G.station;
    // Defensive: guarantee finite camera/player coordinates
    if(!isFinite(st.cameraX)) st.cameraX=0;
    if(!isFinite(st.playerX)) st.playerX=160;
    if(!isFinite(st.playerVX)) st.playerVX=0;
    const cx=st.cameraX;
    ctx.save();

    // =========================================================
    //  EXTERIOR SCENE (visible through observation window)
    // =========================================================
    // Deep-space background (screen-locked, faint parallax)
    const bgG=ctx.createLinearGradient(0,0,0,H);
    bgG.addColorStop(0,'#060a18');bgG.addColorStop(0.5,'#030612');bgG.addColorStop(1,'#010205');
    ctx.fillStyle=bgG;ctx.fillRect(0,0,W,H);
    // Distant parallax stars (slight scroll with camera)
    for(let i=0;i<90;i++){
        const sx=((i*83+cx*0.3)%W+W)%W, sy=(i*47)%H;
        const tw=0.2+Math.sin(T/700+i*1.9)*0.15;
        ctx.fillStyle=`rgba(200,220,255,${tw*0.6})`;
        ctx.beginPath();ctx.arc(sx,sy,0.6+Math.sin(i*2.7)*0.4,0,Math.PI*2);ctx.fill();
    }
    // Faint nebula
    ctx.globalAlpha=0.06;
    const neb=ctx.createRadialGradient(W*0.7,H*0.35,0,W*0.7,H*0.35,320);
    neb.addColorStop(0,'#6644aa');neb.addColorStop(0.6,'#223368');neb.addColorStop(1,'transparent');
    ctx.fillStyle=neb;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;

    // Translate to world space for anything that lives in the bay's coords
    ctx.translate(-cx,0);

    // EXTERIOR HANGAR (outside the station — visible through the window).
    // Drawn in world space so ships/scanner scroll naturally with the camera.
    // Everything here lies ABOVE the inside floor (no internal floor/walls in this region).
    // Structural girders across the exterior ceiling
    const extCeilY=48;
    ctx.strokeStyle='rgba(60,80,120,0.35)';ctx.lineWidth=2;
    for(let gx=0;gx<DOCKING_BAY.width;gx+=60){
        ctx.beginPath();ctx.moveTo(gx,extCeilY);ctx.lineTo(gx+25,extCeilY+18);ctx.stroke();
    }
    // Far-back structural truss (wider diagonal braces)
    ctx.strokeStyle='rgba(50,70,100,0.25)';ctx.lineWidth=3;
    for(let gx=0;gx<DOCKING_BAY.width;gx+=120){
        ctx.beginPath();ctx.moveTo(gx,extCeilY);ctx.lineTo(gx+120,extCeilY+70);ctx.stroke();
        ctx.beginPath();ctx.moveTo(gx+120,extCeilY);ctx.lineTo(gx,extCeilY+70);ctx.stroke();
    }
    // Scanner rails (heavy duty, suspended exterior)
    drawScannerRails(T);

    // Docked ships — floating in vacuum (no pads, no tethers touching floor)
    for(const pad of DOCKING_BAY.pads) drawDockedShipExterior(pad, T);

    // Scanner carriage slides along rails
    drawScannerCarriage(T);

    // Distant hangar bay back wall (far away, giving depth)
    ctx.fillStyle='rgba(10,14,28,0.35)';
    ctx.fillRect(0,extCeilY+70,DOCKING_BAY.width,260);
    // Distant blinking beacon lights on the back wall
    for(let bx=80;bx<DOCKING_BAY.width;bx+=220){
        const blink=Math.sin(T/800+bx*0.01)>0.3;
        ctx.fillStyle=blink?'rgba(255,100,80,0.5)':'rgba(80,25,20,0.2)';
        ctx.beginPath();ctx.arc(bx,extCeilY+120,2.5,0,Math.PI*2);ctx.fill();
    }
    // Far-side launch doors (decorative, way in the distance)
    const doorX=DOCKING_BAY.width-220;
    ctx.fillStyle='rgba(14,14,24,0.75)';ctx.fillRect(doorX,extCeilY+30,200,240);
    ctx.strokeStyle='rgba(60,70,90,0.5)';ctx.lineWidth=2;ctx.strokeRect(doorX,extCeilY+30,200,240);
    ctx.strokeStyle='rgba(255,180,0,0.15)';ctx.setLineDash([10,6]);
    ctx.strokeRect(doorX+5,extCeilY+35,190,230);ctx.setLineDash([]);
    for(let hy=extCeilY+34;hy<extCeilY+268;hy+=30){
        ctx.fillStyle='rgba(255,180,0,0.04)';ctx.fillRect(doorX+2,hy,196,15);
    }
    ctx.font='bold 12px Courier New';ctx.textAlign='center';ctx.fillStyle='rgba(100,70,30,0.7)';
    ctx.fillText('LAUNCH DOORS',doorX+100,extCeilY+250);

    ctx.restore(); // undo camera translate — now back in screen space

    // =========================================================
    //  STATION INTERIOR (in front of window, screen-space)
    //  Only the observation viewport (window frame) + lower floor + console inside.
    // =========================================================
    // The window's vertical extent on screen
    const winTop=20, winBot=430;
    // Thick window frame around the viewport
    // (draws only the FRAME — content inside is the exterior we already drew)
    // Top bar
    ctx.fillStyle='#0a0a18';ctx.fillRect(0,0,W,winTop);
    ctx.strokeStyle='#1c2438';ctx.lineWidth=1;ctx.strokeRect(0,0,W,winTop);
    // Bottom frame (above floor) — a bulkhead lip
    const bulkG=ctx.createLinearGradient(0,winBot,0,winBot+18);
    bulkG.addColorStop(0,'#12162a');bulkG.addColorStop(1,'#070912');
    ctx.fillStyle=bulkG;ctx.fillRect(0,winBot,W,18);
    ctx.strokeStyle='#1c2438';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,winBot);ctx.lineTo(W,winBot);ctx.stroke();
    // Horizontal window mullions (thin dark bars for subdivision)
    ctx.fillStyle='rgba(15,20,34,0.85)';
    for(let mx=W*0.33;mx<W;mx+=W*0.33){
        ctx.fillRect(mx-2,winTop,4,winBot-winTop);
    }
    // Window frame outer glow
    ctx.strokeStyle='rgba(0,200,255,0.15)';ctx.lineWidth=1;
    ctx.strokeRect(0.5,winTop+0.5,W-1,winBot-winTop-1);
    // Inner frame highlight
    ctx.strokeStyle='rgba(0,180,255,0.08)';ctx.lineWidth=1;
    ctx.strokeRect(4,winTop+4,W-8,winBot-winTop-8);
    // Corner brackets
    ctx.strokeStyle='rgba(0,200,255,0.35)';ctx.lineWidth=2;
    const corners=[[4,winTop+4],[W-4,winTop+4],[4,winBot-4],[W-4,winBot-4]];
    for(const c of corners){
        const dx=c[0]<W/2?1:-1, dy=c[1]<H/2?1:-1;
        ctx.beginPath();
        ctx.moveTo(c[0]+dx*16,c[1]);ctx.lineTo(c[0],c[1]);ctx.lineTo(c[0],c[1]+dy*16);
        ctx.stroke();
    }
    // Subtle glass reflection / smudge
    ctx.globalAlpha=0.04;
    const gl=ctx.createLinearGradient(0,winTop,W*0.4,winBot);
    gl.addColorStop(0,'#88bbff');gl.addColorStop(1,'transparent');
    ctx.fillStyle=gl;ctx.fillRect(0,winTop,W*0.4,winBot-winTop);
    ctx.globalAlpha=1;
    // Window HUD labels
    ctx.font='bold 9px Courier New';ctx.textAlign='left';ctx.fillStyle='rgba(0,180,220,0.7)';
    ctx.fillText('◆ EXT-CAM 01 · BAY A3 · VACUUM',10,winTop+12);
    ctx.textAlign='right';ctx.fillStyle='rgba(0,180,220,0.5)';
    ctx.fillText('PRESSURE: 0.00 kPa · TEMP: -270°C',W-10,winTop+12);

    // ===== INTERIOR FLOOR + WALLS (below the window, in screen space) =====
    const floorY=500;
    // Interior floor
    const intFloorG=ctx.createLinearGradient(0,floorY,0,H);
    intFloorG.addColorStop(0,'#18182c');intFloorG.addColorStop(0.3,'#10101c');intFloorG.addColorStop(1,'#050510');
    ctx.fillStyle=intFloorG;ctx.fillRect(0,floorY,W,H-floorY);
    // Floor tiles
    ctx.strokeStyle='rgba(60,100,160,0.12)';ctx.lineWidth=1;
    for(let gx=0;gx<W;gx+=60){ctx.beginPath();ctx.moveTo(gx,floorY);ctx.lineTo(gx,H);ctx.stroke();}
    for(let gy=floorY+20;gy<H;gy+=20){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
    // Floor edge highlight
    ctx.shadowBlur=8;ctx.shadowColor='rgba(0,200,255,0.2)';
    ctx.strokeStyle='rgba(0,200,255,0.45)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,floorY);ctx.lineTo(W,floorY);ctx.stroke();
    ctx.shadowBlur=0;
    // Sub-bulkhead panel with caution stripes (below floor edge)
    ctx.fillStyle='rgba(10,10,20,0.85)';ctx.fillRect(0,winBot+18,W,floorY-(winBot+18));
    ctx.save();ctx.beginPath();ctx.rect(0,winBot+20,W,floorY-(winBot+22));ctx.clip();
    for(let hx=-40;hx<W+40;hx+=32){
        ctx.fillStyle='rgba(255,180,0,0.03)';
        ctx.beginPath();
        ctx.moveTo(hx,winBot+20);ctx.lineTo(hx+16,winBot+20);
        ctx.lineTo(hx+32,floorY);ctx.lineTo(hx+16,floorY);ctx.closePath();ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle='rgba(0,180,255,0.25)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,winBot+18);ctx.lineTo(W,winBot+18);ctx.stroke();
    // Small cable trays along the bulkhead
    ctx.strokeStyle='rgba(80,100,140,0.3)';ctx.lineWidth=1.5;
    for(let cby=winBot+26;cby<floorY-4;cby+=6){
        ctx.beginPath();ctx.moveTo(0,cby);ctx.lineTo(W,cby);ctx.stroke();
    }
    // Indicator labels on bulkhead
    ctx.font='bold 8px Courier New';ctx.textAlign='left';ctx.fillStyle='rgba(0,180,220,0.4)';
    ctx.fillText('◆ D-SCN CONTROL DECK · SECTOR A',10,floorY-4);

    // Translate to world for interior-positioned items (console, elevator, player footing)
    ctx.save();
    ctx.translate(-cx,0);
    // Central console (INSIDE — this is the only interior fixture)
    drawCentralConsole(T, floorY);
    // Elevator on the left — interior (compact door in the left bulkhead area only)
    drawBayElevator(80, winBot-28, floorY, st);
    ctx.restore();

    // =========================================================
    //  HUD OVERLAYS (screen-space)
    // =========================================================
    ctx.fillStyle='rgba(5,5,15,0.78)';ctx.fillRect(10,10,130,50);
    ctx.strokeStyle='rgba(0,200,255,0.25)';ctx.lineWidth=1;ctx.strokeRect(10,10,130,50);
    ctx.font='bold 9px Courier New';ctx.textAlign='left';ctx.fillStyle='#445';
    ctx.fillText('DECK',20,27);
    ctx.font='bold 18px Courier New';ctx.fillStyle='#00ccff';
    ctx.shadowBlur=8;ctx.shadowColor='rgba(0,200,255,0.3)';
    ctx.fillText('FLOOR 3',20,46);ctx.shadowBlur=0;
    ctx.font='bold 9px Courier New';ctx.textAlign='right';ctx.fillStyle='#337';
    ctx.fillText('DOCKING BAY · OBS DECK',W-14,22);
    ctx.font='7px Courier New';ctx.fillStyle='#225';
    ctx.fillText('SALVAGE DRONE TOBY-01 \u00b7 RELAY STATION',W-14,34);

    // Prompts
    if(st.interactTarget && st.interactTarget.id==='dockConsole'){
        const p=0.65+Math.sin(T/200)*0.35;
        ctx.globalAlpha=p;
        ctx.font='bold 16px Courier New';ctx.textAlign='center';ctx.fillStyle='#00ffcc';
        ctx.shadowBlur=14;ctx.shadowColor='#00ffcc';
        ctx.fillText('[Z] ACCESS SCANNER CONSOLE',W/2,H-80);
        ctx.shadowBlur=0;ctx.globalAlpha=1;
    } else if(st.interactTarget && st.interactTarget.id==='elevator'){
        ctx.font='bold 12px Courier New';ctx.textAlign='center';ctx.fillStyle='#00ccff';
        ctx.shadowBlur=10;ctx.shadowColor='#00ccff';
        const elevScreen=80-cx;
        ctx.fillText('[E] ELEVATOR',elevScreen>0?elevScreen:80,H-80);
        ctx.shadowBlur=0;
    } else {
        // Direction hint pointing toward the console when not near an interact target
        const consoleScreenX=DOCKING_BAY.consoleX-cx;
        const dx=consoleScreenX-st.playerX+cx; // world-space delta
        const dir=dx<0?-1:1;
        const pulse=0.5+Math.sin(T/300)*0.3;
        ctx.save();
        ctx.globalAlpha=pulse;
        ctx.font='bold 13px Courier New';ctx.textAlign='center';ctx.fillStyle='#00ccff';
        ctx.shadowBlur=10;ctx.shadowColor='#00ccff';
        const arrow=dir>0?'→':'←';
        ctx.fillText(arrow+'  CONSOLE  '+arrow,W/2,H-80);
        ctx.globalAlpha=1;ctx.shadowBlur=0;
        ctx.restore();
    }
    // Walking controls hint (small, lower-right corner)
    ctx.font='10px Courier New';ctx.textAlign='right';ctx.fillStyle='rgba(120,180,220,0.55)';
    ctx.fillText('[A/D or ←/→] WALK   [E] ELEVATOR   [TAB] INVENTORY',W-14,H-14);
}

// ============================================================
//  EXTERIOR SCANNER RAILS
// ============================================================
function drawScannerRails(T){
    const y1=68, y2=82; // two parallel rails
    // Primary rails (heavy I-beam look)
    for(const ry of [y1,y2]){
        const rg=ctx.createLinearGradient(0,ry-4,0,ry+4);
        rg.addColorStop(0,'#2a2a45');rg.addColorStop(0.3,'#585880');rg.addColorStop(0.55,'#8899bb');
        rg.addColorStop(0.75,'#585880');rg.addColorStop(1,'#1c1c30');
        ctx.fillStyle=rg;ctx.fillRect(0,ry-4,DOCKING_BAY.width,8);
        // Rail shine
        ctx.strokeStyle='rgba(0,220,255,0.25)';ctx.lineWidth=0.8;
        ctx.beginPath();ctx.moveTo(0,ry-3);ctx.lineTo(DOCKING_BAY.width,ry-3);ctx.stroke();
        // Rail rivets
        ctx.fillStyle='#0a0a14';
        for(let rx=20;rx<DOCKING_BAY.width;rx+=30){
            ctx.beginPath();ctx.arc(rx,ry,1.2,0,Math.PI*2);ctx.fill();
        }
    }
    // Cross-ties between rails
    ctx.fillStyle='#1a1a2e';
    for(let tx=0;tx<DOCKING_BAY.width;tx+=60){
        ctx.fillRect(tx,y1-4,6,y2+4-(y1-4));
    }
    // Support struts up to ceiling
    for(let bx=0;bx<DOCKING_BAY.width;bx+=180){
        ctx.fillStyle='#1a1a2e';ctx.fillRect(bx-3,40,6,y1-4-40);
        // Bracket plates
        ctx.fillStyle='#22223a';ctx.fillRect(bx-12,38,24,6);
        ctx.strokeStyle='rgba(0,200,255,0.1)';ctx.lineWidth=0.5;ctx.strokeRect(bx-12,38,24,6);
    }
    // Cable conduits along the rails
    ctx.strokeStyle='rgba(80,60,40,0.4)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(0,y1-8);
    for(let cx=0;cx<DOCKING_BAY.width;cx+=60){ctx.lineTo(cx+30,y1-8+Math.sin(cx*0.05)*1.5);}
    ctx.stroke();
}

// ============================================================
//  DOCKED SHIPS (EXTERIOR — floating in vacuum)
// ============================================================
function drawDockedShipExterior(pad, T){
    const px=pad.x;
    const baseY=180; // floating altitude in the exterior bay
    const bob=Math.sin(T/700+px*0.01)*4;
    const shipY=baseY+bob;

    // Moorings — two cables from overhead cross-ties to the ship
    ctx.strokeStyle='rgba(90,130,180,0.35)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(px-35,86);
    // slight sag
    for(let t=0;t<=1;t+=0.25){
        const cx=px-35+t*32;
        const cy=86+(shipY-86)*t+Math.sin(t*Math.PI)*3;
        ctx.lineTo(cx,cy);
    }
    ctx.stroke();
    ctx.beginPath();ctx.moveTo(px+35,86);
    for(let t=0;t<=1;t+=0.25){
        const cx=px+35-t*32;
        const cy=86+(shipY-86)*t+Math.sin(t*Math.PI)*3;
        ctx.lineTo(cx,cy);
    }
    ctx.stroke();
    // Magnetic clamps at cable ends (small brackets on the ship)
    ctx.fillStyle='#555570';
    ctx.fillRect(px-26,shipY-20,4,4);
    ctx.fillRect(px+22,shipY-20,4,4);

    // Subtle running-light halo so ships read clearly against space
    ctx.globalAlpha=0.12;
    const halo=ctx.createRadialGradient(px,shipY,10,px,shipY,80);
    halo.addColorStop(0,'#aaddff');halo.addColorStop(1,'transparent');
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(px,shipY,80,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;

    // Ship drawing (side-on, facing right)
    ctx.save();ctx.translate(px,shipY);
    if(pad.owner==='player'){
        const classKey=(G.slotId && saves[G.slotId] && saves[G.slotId].playerClass) || 'none';
        drawClassHangarShip(classKey, 2.2);
    } else if(pad.owner==='gilbert'){
        drawGilbertHangarShip(2.0);
    } else if(pad.owner==='krat'){
        drawKratHangarShip(2.2);
    }
    ctx.restore();

    // Hovering holographic ID label below the ship
    const ownerName = pad.owner==='player'?'TOBY-01':
                      pad.owner==='gilbert'?"GILBERT'S SHIP":
                      pad.owner==='krat'?"OFFICER KRAT":'';
    const ownerSub  = pad.owner==='player'?'MANUFACTURED BY NEXUS':pad.label;
    const ownerCol  = pad.owner==='player'?'#00ccff':
                      pad.owner==='gilbert'?'#44ff44':
                      pad.owner==='krat'?'#88ccff':'#aaa';
    const labelY=shipY+56;
    // Label background plate (slightly wider for manufacturer subtitle)
    const plateW = pad.owner==='player'?140:116;
    ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(px-plateW/2,labelY-10,plateW,26);
    ctx.strokeStyle=ownerCol;ctx.globalAlpha=0.4;ctx.lineWidth=1;
    ctx.strokeRect(px-plateW/2,labelY-10,plateW,26);ctx.globalAlpha=1;
    ctx.font='bold 11px Courier New';ctx.textAlign='center';ctx.fillStyle=ownerCol;
    ctx.shadowBlur=6;ctx.shadowColor=ownerCol;
    ctx.fillText(ownerName,px,labelY+2);
    ctx.shadowBlur=0;
    ctx.font='8px Courier New';ctx.fillStyle='#557';
    ctx.fillText(ownerSub,px,labelY+13);
}

// ============================================================
//  DIMENSIONAL SCANNER CARRIAGE (VERY detailed)
// ============================================================
function drawScannerCarriage(T){
    const db=G.dockingBay;
    let sx;
    if(db.teleport && db.teleport.phase){
        sx=db.teleport.scannerX;
    } else {
        // Idle slow glide back-and-forth along the rails
        const w=DOCKING_BAY.width-200;
        sx=100+(Math.sin(T/4200)*0.5+0.5)*w;
    }
    const railY=75; // between the two rails
    ctx.save();ctx.translate(sx,railY);

    // --- Rail trucks (wheel bogies riding the rails) ---
    for(const dy of [-8,+8]){
        ctx.save();ctx.translate(0,dy);
        // Bogie chassis
        ctx.fillStyle='#1a1a2e';ctx.fillRect(-48,-5,96,10);
        ctx.strokeStyle='#3a3a58';ctx.lineWidth=1;ctx.strokeRect(-48,-5,96,10);
        // Wheels
        for(const wx of [-38,-18,18,38]){
            ctx.fillStyle='#0a0a14';ctx.beginPath();ctx.arc(wx,0,5,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#6688bb';ctx.lineWidth=1;ctx.beginPath();ctx.arc(wx,0,5,0,Math.PI*2);ctx.stroke();
            ctx.fillStyle='#2a3a52';ctx.beginPath();ctx.arc(wx,0,2,0,Math.PI*2);ctx.fill();
        }
        // Pantograph-style contact shoe
        ctx.fillStyle='#4a5a80';ctx.fillRect(-3,-7,6,3);
        // Sparks (occasional)
        if(Math.sin(T/80+dy)>0.96){
            ctx.fillStyle='#ffffcc';ctx.shadowBlur=10;ctx.shadowColor='#ffff88';
            ctx.fillRect(-1,-8,2,2);ctx.shadowBlur=0;
        }
        ctx.restore();
    }

    // --- Suspension cables / hoist lines to ceiling (above rails) ---
    ctx.strokeStyle='rgba(100,130,180,0.45)';ctx.lineWidth=1.2;
    for(const cx of [-60,-20,20,60]){
        ctx.beginPath();ctx.moveTo(cx,-14);ctx.lineTo(cx,-40);ctx.stroke();
    }
    // Cable anchoring plates on top
    ctx.fillStyle='#2a2a42';ctx.fillRect(-72,-16,144,6);
    ctx.strokeStyle='#4a5a78';ctx.lineWidth=1;ctx.strokeRect(-72,-16,144,6);
    // Warning tape on top edge
    ctx.save();ctx.beginPath();ctx.rect(-72,-12,144,3);ctx.clip();
    for(let hx=-80;hx<80;hx+=10){
        ctx.fillStyle=hx%20===0?'#000':'#e8c040';
        ctx.fillRect(hx,-12,5,3);
    }
    ctx.restore();

    // --- Primary housing (main chassis of the scanner) ---
    // Outer armored shell
    const hsG=ctx.createLinearGradient(0,0,0,110);
    hsG.addColorStop(0,'#1e1e38');hsG.addColorStop(0.3,'#2e2e52');hsG.addColorStop(0.7,'#1a1a30');hsG.addColorStop(1,'#0a0a18');
    ctx.fillStyle=hsG;
    ctx.beginPath();
    // Hexagonal silhouette — wider at top, narrower at bottom
    ctx.moveTo(-90,6);
    ctx.lineTo(-95,18);
    ctx.lineTo(-95,62);
    ctx.lineTo(-82,82);
    ctx.lineTo(-70,102);
    ctx.lineTo(70,102);
    ctx.lineTo(82,82);
    ctx.lineTo(95,62);
    ctx.lineTo(95,18);
    ctx.lineTo(90,6);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle='#5e7aa8';ctx.lineWidth=1.8;ctx.stroke();
    // Inner bevel line
    ctx.strokeStyle='rgba(0,220,255,0.15)';ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(-86,10);ctx.lineTo(-90,20);ctx.lineTo(-90,60);ctx.lineTo(-78,80);
    ctx.lineTo(-66,98);ctx.lineTo(66,98);ctx.lineTo(78,80);ctx.lineTo(90,60);
    ctx.lineTo(90,20);ctx.lineTo(86,10);ctx.closePath();ctx.stroke();

    // Plating seams (bolt lines across chassis)
    ctx.strokeStyle='rgba(20,30,50,0.7)';ctx.lineWidth=0.8;
    ctx.beginPath();ctx.moveTo(-85,30);ctx.lineTo(85,30);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-90,55);ctx.lineTo(90,55);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-80,80);ctx.lineTo(80,80);ctx.stroke();
    // Rivets (lots of them)
    ctx.fillStyle='#0a0a14';
    for(const rv of [[-80,12],[-60,12],[-40,12],[-20,12],[0,12],[20,12],[40,12],[60,12],[80,12],
                     [-85,40],[85,40],[-85,65],[85,65],[-70,94],[-40,94],[0,94],[40,94],[70,94]]){
        ctx.beginPath();ctx.arc(rv[0],rv[1],1.3,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(120,140,180,0.3)';ctx.lineWidth=0.5;
        ctx.beginPath();ctx.arc(rv[0],rv[1],1.3,0,Math.PI*2);ctx.stroke();
    }

    // --- Ventilation slats (heat dissipation) ---
    ctx.fillStyle='rgba(0,0,0,0.6)';
    for(let vx=-82;vx<-22;vx+=6){ctx.fillRect(vx,42,3,10);}
    for(let vx=24;vx<84;vx+=6){ctx.fillRect(vx,42,3,10);}
    // Slat highlights
    ctx.fillStyle='rgba(0,220,255,0.08)';
    for(let vx=-82;vx<-22;vx+=6){ctx.fillRect(vx,42,1,10);}
    for(let vx=24;vx<84;vx+=6){ctx.fillRect(vx,42,1,10);}

    // --- Heatsink fins on shoulders ---
    for(const side of [-1,1]){
        ctx.save();ctx.translate(side*85,30);ctx.scale(side,1);
        const hkG=ctx.createLinearGradient(0,0,16,0);
        hkG.addColorStop(0,'#3a4a6e');hkG.addColorStop(1,'#1a2238');
        ctx.fillStyle=hkG;ctx.fillRect(0,-8,16,16);
        // Fins
        ctx.strokeStyle='#1a1f30';ctx.lineWidth=0.8;
        for(let fy=-7;fy<8;fy+=2){
            ctx.beginPath();ctx.moveTo(1,fy);ctx.lineTo(15,fy);ctx.stroke();
        }
        ctx.restore();
    }

    // --- Status display panel (central chest) ---
    ctx.fillStyle='#020408';ctx.fillRect(-30,18,60,20);
    ctx.strokeStyle='#0088cc';ctx.lineWidth=1;ctx.strokeRect(-30,18,60,20);
    // Scanlines
    ctx.strokeStyle='rgba(0,220,255,0.15)';ctx.lineWidth=0.4;
    for(let sy=20;sy<38;sy+=2){ctx.beginPath();ctx.moveTo(-28,sy);ctx.lineTo(28,sy);ctx.stroke();}
    // Readout text
    ctx.font='bold 7px Courier New';ctx.textAlign='center';ctx.fillStyle='#00ff88';
    ctx.shadowBlur=4;ctx.shadowColor='#00ff88';
    const modeText = (db.teleport?('■ '+(db.teleport.phase||'').toUpperCase()):'◆ STANDBY');
    ctx.fillText(modeText,0,28);
    ctx.shadowBlur=0;
    ctx.font='6px Courier New';ctx.fillStyle='#446';
    ctx.fillText('D-SCN Mk.III · v4.20',0,36);

    // --- Targeting reticle on front face ---
    ctx.save();ctx.translate(0,62);
    // Outer ring
    const rPulse=0.6+Math.sin(T/300)*0.4;
    ctx.strokeStyle=`rgba(0,220,255,${rPulse*0.8})`;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.stroke();
    // Crosshairs
    ctx.beginPath();ctx.moveTo(-22,0);ctx.lineTo(-14,0);
    ctx.moveTo(14,0);ctx.lineTo(22,0);
    ctx.moveTo(0,-22);ctx.lineTo(0,-14);
    ctx.moveTo(0,14);ctx.lineTo(0,22);ctx.stroke();
    // Rotating inner ring
    ctx.rotate(T/500);
    ctx.strokeStyle=`rgba(170,230,255,${rPulse*0.7})`;ctx.lineWidth=1;
    ctx.beginPath();
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;ctx.moveTo(Math.cos(a)*11,Math.sin(a)*11);ctx.lineTo(Math.cos(a)*15,Math.sin(a)*15);}
    ctx.stroke();
    // Core diamond
    ctx.rotate(-T/250);
    ctx.strokeStyle='#00ffcc';ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.moveTo(0,-8);ctx.lineTo(8,0);ctx.lineTo(0,8);ctx.lineTo(-8,0);ctx.closePath();ctx.stroke();
    ctx.restore();

    // --- Primary emitter lens assembly (bottom — this is what points at the ship) ---
    ctx.save();ctx.translate(0,102);
    // Lens housing
    const lhG=ctx.createLinearGradient(0,0,0,18);
    lhG.addColorStop(0,'#1c1c34');lhG.addColorStop(1,'#0a0a18');
    ctx.fillStyle=lhG;
    ctx.beginPath();
    ctx.moveTo(-38,0);ctx.lineTo(38,0);ctx.lineTo(32,18);ctx.lineTo(-32,18);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#4a6090';ctx.lineWidth=1;ctx.stroke();
    // Lens iris (multiple layered rings)
    const irisPulse=0.5+Math.sin(T/260)*0.4;
    ctx.shadowBlur=22;ctx.shadowColor='#00ccff';
    const irisG=ctx.createRadialGradient(0,8,1,0,8,28);
    irisG.addColorStop(0,`rgba(180,240,255,${irisPulse})`);
    irisG.addColorStop(0.35,`rgba(0,200,255,${irisPulse*0.8})`);
    irisG.addColorStop(0.75,`rgba(0,100,220,${irisPulse*0.4})`);
    irisG.addColorStop(1,'transparent');
    ctx.fillStyle=irisG;ctx.beginPath();ctx.ellipse(0,8,28,9,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // Lens ring bezel
    ctx.strokeStyle='#00ccff';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.ellipse(0,8,24,7,0,0,Math.PI*2);ctx.stroke();
    // Inner lens petals (8 segments)
    ctx.strokeStyle='rgba(0,220,255,0.35)';ctx.lineWidth=0.8;
    for(let pp=0;pp<8;pp++){
        const a=pp/8*Math.PI*2+T/1200;
        ctx.beginPath();
        ctx.moveTo(0,8);
        ctx.lineTo(Math.cos(a)*22,8+Math.sin(a)*6);
        ctx.stroke();
    }
    // Central pinpoint
    ctx.fillStyle='#ffffff';ctx.shadowBlur=10;ctx.shadowColor='#aaddff';
    ctx.beginPath();ctx.arc(0,8,2.2,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();

    // --- Downward scan beam (only during scan/charge/teleport phases) ---
    const db2=G.dockingBay;
    let beamMode='idle';
    if(db2.teleport){
        if(db2.teleport.phase==='scan') beamMode='scan';
        else if(db2.teleport.phase==='charge') beamMode='charge';
        else if(db2.teleport.phase==='flash') beamMode='flash';
    }
    const beamH=180;
    const beamPulse=0.5+Math.sin(T/220)*0.3;
    if(beamMode!=='idle'){
        const col = beamMode==='charge'?'rgba(170,102,255,':'rgba(0,220,255,';
        ctx.globalAlpha=beamPulse*(beamMode==='flash'?0.9:0.5);
        const bg=ctx.createLinearGradient(0,120,0,120+beamH);
        bg.addColorStop(0,col+'0.9)');bg.addColorStop(1,'transparent');
        ctx.fillStyle=bg;
        ctx.beginPath();
        ctx.moveTo(-24,120);ctx.lineTo(24,120);
        ctx.lineTo(76,120+beamH);ctx.lineTo(-76,120+beamH);ctx.closePath();ctx.fill();
        ctx.globalAlpha=1;
        // Scanning bars inside beam
        if(beamMode==='scan'){
            const barY=120+((T/6)%beamH);
            ctx.fillStyle='rgba(150,230,255,0.5)';
            ctx.fillRect(-60,barY,120,2);
        }
    } else {
        // Faint idle beam
        ctx.globalAlpha=0.08;
        const bg=ctx.createLinearGradient(0,120,0,120+beamH);
        bg.addColorStop(0,'rgba(0,220,255,0.5)');bg.addColorStop(1,'transparent');
        ctx.fillStyle=bg;
        ctx.beginPath();
        ctx.moveTo(-18,120);ctx.lineTo(18,120);
        ctx.lineTo(40,120+beamH);ctx.lineTo(-40,120+beamH);ctx.closePath();ctx.fill();
        ctx.globalAlpha=1;
    }

    // --- Side-mounted thrusters / maneuvering jets ---
    for(const side of [-1,1]){
        ctx.save();ctx.translate(side*96,48);
        ctx.fillStyle='#3a3a5a';ctx.fillRect(-3,-6,6,12);
        ctx.fillStyle='#1a1a30';ctx.fillRect(-2,-5,4,10);
        // Thrust flame when moving
        if(db2.teleport && db2.teleport.phase==='move'){
            ctx.fillStyle='rgba(255,140,60,0.7)';ctx.shadowBlur=8;ctx.shadowColor='#ff8833';
            ctx.beginPath();ctx.arc(side*4,0,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        }
        ctx.restore();
    }

    // --- Strobe lights + marker lights around chassis ---
    // Red strobes corners
    const strobe=Math.sin(T/150)>0.7;
    ctx.fillStyle=strobe?'#ff2244':'#441420';
    ctx.shadowBlur=strobe?10:0;ctx.shadowColor='#ff2244';
    ctx.beginPath();ctx.arc(-82,14,2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(82,14,2,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // Green status lights bottom
    ctx.fillStyle='#00ff88';ctx.shadowBlur=6;ctx.shadowColor='#00ff88';
    ctx.beginPath();ctx.arc(-60,96,1.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(60,96,1.5,0,Math.PI*2);ctx.fill();
    // Amber center warning
    const amberP=Math.sin(T/400)*0.5+0.5;
    ctx.fillStyle=`rgba(255,200,0,${0.3+amberP*0.6})`;
    ctx.shadowBlur=8;ctx.shadowColor='#ffcc33';
    ctx.beginPath();ctx.arc(0,98,2,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;

    // --- Labels / text on the chassis ---
    ctx.font='bold 10px Courier New';ctx.textAlign='center';ctx.fillStyle='rgba(140,180,230,0.9)';
    ctx.fillText('D-SCN Mk.III',0,76);
    ctx.font='7px Courier New';ctx.fillStyle='rgba(80,110,160,0.7)';
    ctx.fillText('DIMENSIONAL SCANNER',0,88);
    ctx.font='6px Courier New';ctx.fillStyle='rgba(100,60,40,0.8)';
    ctx.textAlign='left';ctx.fillText('⚠ VACUUM USE ONLY',-88,100);
    ctx.textAlign='right';ctx.fillText('S/N: 0xA3F2',88,100);

    ctx.restore();
}

function drawClassHangarShip(classKey, scale){
    // Draw the player's ship using CLASS_SHIPS path, scaled up.
    const def = (typeof CLASS_DEFS!=='undefined' && CLASS_DEFS[classKey]) || CLASS_DEFS.none;
    const shape = (typeof CLASS_SHIPS!=='undefined' && CLASS_SHIPS[classKey]) || CLASS_SHIPS.none;
    const r=14*scale;
    ctx.save();
    // Thrust glow
    ctx.shadowBlur=18;ctx.shadowColor=def.color;
    ctx.strokeStyle=def.color;ctx.lineWidth=5;ctx.globalAlpha=0.3;
    ctx.beginPath();ctx.moveTo(r*shape.flameX,0);ctx.lineTo(r*shape.flameX-r*1.2,0);ctx.stroke();
    ctx.shadowBlur=0;ctx.globalAlpha=1;
    // Body
    ctx.beginPath();
    // Scale the path calls: CLASS_SHIPS.body uses r internally, so pass r directly
    shape.body(ctx,r);
    ctx.closePath();
    const sg=ctx.createLinearGradient(-r,-r,r,r);
    sg.addColorStop(0,'#0e0e1e');sg.addColorStop(1,'#1c1c34');
    ctx.fillStyle=sg;ctx.fill();
    ctx.shadowBlur=12;ctx.shadowColor=def.color;
    ctx.strokeStyle=def.color;ctx.lineWidth=2;ctx.stroke();
    ctx.shadowBlur=0;
    // Wing accents
    ctx.strokeStyle=def.color;ctx.globalAlpha=0.35;ctx.lineWidth=1;
    for(const wl of shape.wingLines){
        ctx.beginPath();ctx.moveTo(r*wl[0],r*wl[1]);ctx.lineTo(r*wl[2],r*wl[3]);ctx.stroke();
    }
    ctx.globalAlpha=1;
    // Cockpit
    const cg=ctx.createRadialGradient(shape.cockpitX,0,0,shape.cockpitX,0,6);
    cg.addColorStop(0,def.color);cg.addColorStop(1,'transparent');
    ctx.fillStyle=cg;ctx.beginPath();ctx.arc(shape.cockpitX,0,7,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=def.color;ctx.beginPath();ctx.arc(shape.cockpitX,0,3,0,Math.PI*2);ctx.fill();
    // Panel detail lines
    ctx.strokeStyle='rgba(180,220,255,0.15)';ctx.lineWidth=0.6;
    ctx.beginPath();ctx.moveTo(-r*0.4,r*0.4);ctx.lineTo(r*0.4,r*0.2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-r*0.4,-r*0.4);ctx.lineTo(r*0.4,-r*0.2);ctx.stroke();
    // Running lights
    ctx.fillStyle='#ff3333';ctx.shadowBlur=6;ctx.shadowColor='#ff3333';
    ctx.beginPath();ctx.arc(-r*0.8,r*0.5,1.6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#33ff66';ctx.shadowColor='#33ff66';
    ctx.beginPath();ctx.arc(-r*0.8,-r*0.5,1.6,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
}

function drawGilbertHangarShip(scale){
    // Gilbert's craggy green rock-ship
    const r=16*scale;
    ctx.save();
    ctx.shadowBlur=16;ctx.shadowColor='#44ff44';
    const g=ctx.createRadialGradient(-2,-2,0,0,0,r);
    g.addColorStop(0,'#1a4020');g.addColorStop(1,'#081a10');
    ctx.fillStyle=g;ctx.strokeStyle='#44ff44';ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(r*0.9,0);ctx.lineTo(r*0.5,-r*0.7);ctx.lineTo(0,-r*0.95);
    ctx.lineTo(-r*0.6,-r*0.75);ctx.lineTo(-r*0.95,-r*0.2);ctx.lineTo(-r*0.85,r*0.35);
    ctx.lineTo(-r*0.5,r*0.85);ctx.lineTo(0,r*0.95);ctx.lineTo(r*0.5,r*0.7);
    ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    // Crater details
    ctx.strokeStyle='rgba(68,255,68,0.25)';ctx.lineWidth=0.8;
    ctx.beginPath();ctx.arc(-r*0.3,-r*0.3,r*0.22,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(r*0.15,r*0.35,r*0.18,0,Math.PI*2);ctx.stroke();
    // Eye
    ctx.fillStyle='#44ff44';ctx.shadowBlur=10;ctx.shadowColor='#44ff44';
    ctx.beginPath();ctx.arc(r*0.35,-r*0.05,r*0.22,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(r*0.38,-r*0.08,r*0.09,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
}

function drawKratHangarShip(scale){
    // Krat's alliance captain cruiser — wide, armored, blue
    const r=18*scale;
    ctx.save();
    ctx.shadowBlur=16;ctx.shadowColor='#88ccff';
    const g=ctx.createLinearGradient(-r,0,r,0);
    g.addColorStop(0,'#0a1a2a');g.addColorStop(0.5,'#18304c');g.addColorStop(1,'#0e1c30');
    ctx.fillStyle=g;ctx.strokeStyle='#88ccff';ctx.lineWidth=2.2;
    ctx.beginPath();
    ctx.moveTo(r*1.1,0);
    ctx.lineTo(r*0.5,-r*0.35);
    ctx.lineTo(r*0.1,-r*0.55);
    ctx.lineTo(-r*0.4,-r*0.95);
    ctx.lineTo(-r*0.9,-r*0.8);
    ctx.lineTo(-r*1.1,-r*0.4);
    ctx.lineTo(-r*0.75,0);
    ctx.lineTo(-r*1.1,r*0.4);
    ctx.lineTo(-r*0.9,r*0.8);
    ctx.lineTo(-r*0.4,r*0.95);
    ctx.lineTo(r*0.1,r*0.55);
    ctx.lineTo(r*0.5,r*0.35);
    ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    // Hull plating lines
    ctx.strokeStyle='rgba(136,204,255,0.28)';ctx.lineWidth=0.8;
    ctx.beginPath();ctx.moveTo(-r*0.5,0);ctx.lineTo(r*0.8,0);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-r*0.3,-r*0.4);ctx.lineTo(r*0.4,-r*0.25);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-r*0.3,r*0.4);ctx.lineTo(r*0.4,r*0.25);ctx.stroke();
    // Twin turrets on top/bottom
    ctx.fillStyle='#22456a';ctx.strokeStyle='#88ccff';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(-r*0.1,-r*0.6,r*0.18,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(-r*0.1,r*0.6,r*0.18,0,Math.PI*2);ctx.fill();ctx.stroke();
    // Cockpit glass
    const cg=ctx.createRadialGradient(r*0.4,0,0,r*0.4,0,r*0.22);
    cg.addColorStop(0,'#bbe0ff');cg.addColorStop(1,'transparent');
    ctx.fillStyle=cg;ctx.beginPath();ctx.arc(r*0.4,0,r*0.22,0,Math.PI*2);ctx.fill();
    // Running lights
    ctx.fillStyle='#ff3333';ctx.shadowBlur=6;ctx.shadowColor='#ff3333';
    ctx.beginPath();ctx.arc(-r*1.0,r*0.3,2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#33ff66';ctx.shadowColor='#33ff66';
    ctx.beginPath();ctx.arc(-r*1.0,-r*0.3,2,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
}

function drawCentralConsole(T, floorY){
    const cx=DOCKING_BAY.consoleX;
    // Console pedestal
    ctx.save();ctx.translate(cx,floorY-42);
    // Base
    ctx.fillStyle='#1c1c30';ctx.fillRect(-28,28,56,14);
    ctx.strokeStyle='#00ccff';ctx.lineWidth=1.5;ctx.strokeRect(-28,28,56,14);
    // Pedestal column
    ctx.fillStyle='#14142a';ctx.fillRect(-18,8,36,22);
    ctx.strokeStyle='#0088cc';ctx.lineWidth=1;ctx.strokeRect(-18,8,36,22);
    // Tilted display panel
    const dispG=ctx.createLinearGradient(-24,-24,24,8);
    dispG.addColorStop(0,'#001224');dispG.addColorStop(1,'#002a44');
    ctx.fillStyle=dispG;
    ctx.beginPath();
    ctx.moveTo(-24,8);ctx.lineTo(24,8);ctx.lineTo(20,-24);ctx.lineTo(-20,-24);ctx.closePath();
    ctx.fill();
    ctx.strokeStyle='#00ccff';ctx.lineWidth=1.5;ctx.stroke();
    // Display scanlines
    ctx.strokeStyle='rgba(0,200,255,0.3)';ctx.lineWidth=0.5;
    for(let sy=-22;sy<6;sy+=3){
        ctx.beginPath();ctx.moveTo(-22+sy*0.1,sy);ctx.lineTo(22-sy*0.1,sy);ctx.stroke();
    }
    // Blinking cursor icon on display
    if(Math.floor(T/400)%2===0){
        ctx.fillStyle='#00ff88';ctx.fillRect(-18,-8,6,8);
    }
    ctx.font='bold 7px Courier New';ctx.fillStyle='#88ddff';ctx.textAlign='left';
    ctx.fillText('D-SCN>_',-14,-1);
    // Base glow pulse
    const pg=0.4+Math.sin(T/350)*0.3;
    ctx.globalAlpha=pg;
    ctx.fillStyle='#00ccff';ctx.shadowBlur=20;ctx.shadowColor='#00ccff';
    ctx.beginPath();ctx.ellipse(0,44,40,4,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.globalAlpha=1;
    ctx.restore();

    // Floor marker
    ctx.save();ctx.translate(cx,floorY);
    ctx.strokeStyle='rgba(0,200,255,0.4)';ctx.lineWidth=2;ctx.setLineDash([6,4]);
    ctx.beginPath();ctx.arc(0,0,34,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.font='bold 8px Courier New';ctx.textAlign='center';ctx.fillStyle='#337';
    ctx.fillText('CONSOLE',0,22);
    ctx.restore();
}

function drawBayElevator(elevX, ceilY, floorY, st){
    const nearElev=st.interactTarget && st.interactTarget.id==='elevator';
    const elevCol=nearElev?'#00ccff':'#2a2a48';
    const h=floorY-ceilY-8;
    // Frame recess
    ctx.fillStyle='#040510';ctx.fillRect(elevX-36,ceilY+4,72,h+4);
    // Door panel gradient
    const g=ctx.createLinearGradient(elevX-32,0,elevX+32,0);
    g.addColorStop(0,'#141428');g.addColorStop(0.5,'#202040');g.addColorStop(1,'#141428');
    ctx.fillStyle=g;ctx.fillRect(elevX-32,ceilY+8,64,h);
    // Center seam
    ctx.strokeStyle='rgba(50,60,100,0.6)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(elevX,ceilY+12);ctx.lineTo(elevX,floorY-4);ctx.stroke();
    // Panel detail lines
    ctx.strokeStyle='rgba(40,50,90,0.4)';ctx.lineWidth=0.5;
    for(let py=ceilY+22;py<floorY-8;py+=18){
        ctx.beginPath();ctx.moveTo(elevX-28,py);ctx.lineTo(elevX-4,py);ctx.stroke();
        ctx.beginPath();ctx.moveTo(elevX+4,py);ctx.lineTo(elevX+28,py);ctx.stroke();
    }
    // Frame with glow when near
    ctx.shadowBlur=nearElev?12:0;ctx.shadowColor='#00ccff';
    ctx.strokeStyle=elevCol;ctx.lineWidth=2;
    ctx.strokeRect(elevX-32,ceilY+8,64,h);
    ctx.shadowBlur=0;
    // Arrow indicator centered in the door
    const arrowY=ceilY+h/2+4;
    ctx.fillStyle=elevCol;ctx.font='bold 22px Courier New';ctx.textAlign='center';
    ctx.fillText('▼',elevX,arrowY);
    // Floor indicator strip at top
    ctx.fillStyle='#0a0a14';ctx.fillRect(elevX-26,ceilY+10,52,7);
    ctx.strokeStyle='rgba(0,200,255,0.3)';ctx.lineWidth=0.5;
    ctx.strokeRect(elevX-26,ceilY+10,52,7);
    ctx.font='bold 6px Courier New';ctx.fillStyle='#00ccff';ctx.textAlign='center';
    ctx.fillText('▼ LIFT · 3 · ▼',elevX,ceilY+15);
    // Call button
    ctx.fillStyle=nearElev?'#00ff88':'#334';
    ctx.shadowBlur=nearElev?6:0;ctx.shadowColor='#00ff88';
    ctx.beginPath();ctx.arc(elevX+38,ceilY+h/2,3,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // Label
    ctx.font='bold 8px Courier New';ctx.fillStyle='#445';ctx.textAlign='center';
    ctx.fillText('ELEVATOR',elevX,floorY-5);
}

// ---------- Scanner Terminal UI ----------
// Windows-styled command-line prompt.
function openDockConsole(){
    const db=G.dockingBay;
    db.open=true;
    db.terminalPhase='cmd';
    db.selection=0;
    db.cmdInput='';
    db.cmdCwd='C:\\RELAY\\DOCK-03';
    db.terminalText=[
        "Relay Orbital Terminal [Version 10.0.26200.1742]",
        "(c) Lumina Systems // NEXUS project legacy build. All rights reserved.",
        ""
    ];
    db.terminalTimer=0;
    db.mapOpen=false;
    try{Sound.ui();}catch(e){}
}
function closeDockConsole(){
    const db=G.dockingBay;
    db.open=false; db.terminalPhase=null; db.terminalText=[]; db.mapOpen=false; db.teleport=null;
    db.cmdInput='';
    try{Sound.ui();}catch(e){}
}

// ---------- Virtual filesystem (what `dir` shows) ----------
// Base files always present in C:\RELAY\DOCK-03 (besides player's recovered docs).
const _BASE_DIR_FILES = [
    { name:'d-scn.exe',       size:'48,112', date:'2042-11-03' },
    { name:'neural-link.exe', size:'94,336', date:'2042-11-03' },
    { name:'readme.txt',      size:'  412', date:'2041-07-19' },
    { name:'manifest.ini',    size:'   88', date:'2042-01-01' }
];
const _README_CONTENT = [
    "RELAY STATION DOCK-03 // README",
    "---------------------------------",
    "Terminal commands available on this deck:",
    "  help                  - list commands",
    "  dir                   - list files in the current directory",
    "  type <filename>       - display the contents of a file",
    "  cls                   - clear the screen",
    "  scanner               - launch d-scn.exe (partition chart)",
    "  exit                  - close this terminal",
    "",
    "Note: recovered field documents are stored in the drive root.",
    "      Most are corrupted and will not open in standard editors."
];
const _MANIFEST_CONTENT = [
    "[DOCK-03]",
    "station=RELAY",
    "owner=LUMINA SYSTEMS",
    "project=NEXUS",
    "status=LEGACY",
    "souls_on_record=47234"
];

// Execute a typed command. Returns an array of output lines.
function _runTerminalCommand(raw){
    const db=G.dockingBay;
    const input=(raw||'').trim();
    const echo=db.cmdCwd+'> '+input;
    if(input.length===0) return [echo];
    // Tokenise
    const parts=input.split(/\s+/);
    const cmd=parts[0].toLowerCase();
    const arg=parts.slice(1).join(' ').trim();
    const out=[echo];

    if(cmd==='help' || cmd==='?' || cmd==='/?'){
        out.push(
            "For more information on a specific command, type HELP <command-name>.",
            "CLS            Clears the screen.",
            "DIR            Displays a list of files in the current directory.",
            "EXIT           Quits the terminal session.",
            "HELP           Provides help information for commands.",
            "SCANNER        Launches the d-scn.exe partition chart.",
            "TYPE           Displays the contents of a text file.",
            "");
        return out;
    }
    if(cmd==='cls' || cmd==='clear'){
        db.terminalText=[]; // cleared
        return []; // no echo retained (we wiped it)
    }
    if(cmd==='exit' || cmd==='quit' || cmd==='close'){
        closeDockConsole();
        return out;
    }
    if(cmd==='scanner' || cmd==='d-scn' || cmd==='.\\d-scn.exe' || cmd==='d-scn.exe'){
        // Launch the scanner flow (partition chart). Reuses existing state machine.
        db.terminalPhase='ship_select';
        db.selection=0;
        out.push(
            "Launching d-scn.exe...",
            "",
            "Vessels currently docked in bay:",
            "  [0]  TOBY-01           (AUTH: pending)",
            "  [1]  GILBERT'S SHIP    (AUTH: restricted)",
            "  [2]  OFFICER KRAT      (AUTH: restricted)",
            "",
            "Select a vessel for neural link: _");
        return out;
    }
    if(cmd==='dir' || cmd==='ls'){
        out.push(
            " Volume in drive C is RELAY-SYS",
            " Volume Serial Number is A3F2-0C0E",
            "",
            " Directory of "+db.cmdCwd,
            "");
        for(const f of _BASE_DIR_FILES){
            out.push(('              '+f.date+'  '+f.size+' '+f.name));
        }
        // Player's recovered documents appear as files too
        const docs=(G.inventory||[]).filter(it=>it && it.type==='document');
        for(const d of docs){
            out.push('              [CORRUPT]     ???  '+d.file);
        }
        out.push('               '+(_BASE_DIR_FILES.length+docs.length)+' File(s)',
                 '');
        return out;
    }
    if(cmd==='type' || cmd==='cat' || cmd==='more'){
        if(!arg){
            out.push("The syntax of the command is incorrect.");
            return out;
        }
        const filename=arg.toLowerCase().replace(/^.*[\\\/]/,''); // strip path
        // Built-in files
        if(filename==='readme.txt'){ out.push(..._README_CONTENT,""); return out; }
        if(filename==='manifest.ini'){ out.push(..._MANIFEST_CONTENT,""); return out; }
        if(filename==='d-scn.exe' || filename==='neural-link.exe'){
            out.push(
                "\u2593\u2592\u2591... binary data ...\u2591\u2592\u2593",
                "(This file is an executable. Try running it instead: SCANNER)","");
            return out;
        }
        // Recovered document — check inventory
        const doc=(G.inventory||[]).find(it=>it && it.type==='document' && it.file && it.file.toLowerCase()===filename);
        if(doc){
            const frag=getFragmentById(doc.fragId) || getFragmentByFile(doc.file);
            if(frag){
                out.push(
                    "-- BEGIN RECOVERED FRAGMENT ["+frag.source+"] --",
                    frag.text,
                    "-- END FRAGMENT --",
                    "");
                return out;
            }
        }
        out.push("The system cannot find the file specified.","");
        return out;
    }
    // NEXUS-0 secret command
    if(cmd==='nexus'||cmd==='nexus-0'||cmd==='nexus0'||cmd==='nexus.exe'){
        if(G.nexusDefeated){
            out.push(
                "Querying NEXUS registry...",
                "",
                "> NEXUS-0 — STATUS: PURGED",
                "> UNIT ERASED. NO SIGNAL REMAINING.",
                "");
        } else if(G.nexusListening){
            out.push(
                "> NEXUS-0 ALREADY LISTENING.",
                "> TRANSMIT AUTHENTICATION IN THE FIELD.",
                ">   . . .  *  . .  * * *",
                "");
        } else {
            G.nexusListening=true; G.nexusShotLog=[];
            out.push(
                "Querying NEXUS registry...",
                "",
                "WARNING: Accessing decommissioned unit archive.",
                "",
                "> NEXUS-0 FRAGMENT DETECTED",
                "> DECRYPTION REQUIRES FIELD VERIFICATION",
                "> TRANSMIT AUTHENTICATION SEQUENCE:",
                ">   . . .  *  . .  * * *",
                "",
                "> AWAITING SIGNAL IN SECTOR 1...",
                "");
        }
        return out;
    }
    // Unknown command — Windows error message
    out.push("'"+parts[0]+"' is not recognized as an internal or external command,",
             "operable program or batch file.","");
    return out;
}

function dockConsoleSelectShip(){
    const db=G.dockingBay;
    if(db.selection===0){
        // Player ship — authorised. Scan for key.
        db.terminalPhase='auth_player';
        db.terminalTimer=0;
        db.terminalText=db.terminalText.concat(["> 0",""]);
    } else {
        // Denied
        db.terminalPhase='deny_wait';
        db.terminalTimer=0;
        db.terminalText=db.terminalText.concat(["> "+db.selection,"",
            "Verifying credentials..."]);
    }
    try{Sound.ui();}catch(e){}
}

function updateDockConsole(){
    const db=G.dockingBay;
    if(!db.open) return;
    db.terminalTimer++;
    // During teleport cutscene, pan the station camera to follow the scanner
    // so the player can always see the action animation even if it leaves the view.
    if(db.teleport && G.station){
        const st=G.station;
        const focusX=db.teleport.scannerX;
        const worldW=DOCKING_BAY.width;
        const desired=Math.max(0,Math.min(worldW-W,focusX-W/2));
        st.cameraX+=(desired-st.cameraX)*0.12;
    }
    if(db.terminalPhase==='deny_wait'){
        // Spinner animation frames
        if(db.terminalTimer>120){
            db.terminalText=db.terminalText.concat(["","ACCESS DENIED.","",
                "ERROR 0x08F2: neural signature does not match vessel manifest.",
                "(Only one registered consciousness exists on this drone: TOBY-01)",
                ""]);
            db.terminalPhase='cmd';
            db.cmdInput='';
            db.terminalTimer=0;
        }
    } else if(db.terminalPhase==='auth_player'){
        if(db.terminalTimer===10) db.terminalText=db.terminalText.concat(["Authenticating neural signature..."]);
        if(db.terminalTimer===60) db.terminalText=db.terminalText.concat([
            "  > drone chassis hash OK",
            "  > consciousness imprint OK",
            "  > \u2026 hybrid entity detected"]);
        if(db.terminalTimer===110) db.terminalText=db.terminalText.concat(["Scanning inventory for module keys..."]);
        if(db.terminalTimer===160){
            if(hasItem('module_access')){
                db.terminalText=db.terminalText.concat(["  > FOUND: MODULE ACCESS","",
                    "Permissions granted. Loading partition chart..."]);
            } else {
                db.terminalText=db.terminalText.concat(["  > NO KEYS FOUND","",
                    "ACCESS DENIED. (Missing: MODULE ACCESS)",""]);
                db.terminalPhase='cmd';
                db.cmdInput='';
                db.terminalTimer=0;
                return;
            }
        }
        if(db.terminalTimer>220){
            db.terminalPhase='map';
            db.mapOpen=true;
            db.mapSelection=5; // Sector 2 index (accessible one)
        }
    } else if(db.terminalPhase==='teleporting'){
        // Advance teleport sequence
        if(!db.teleport) db.teleport={phase:'move',scannerX:DOCKING_BAY.consoleX,t:0};
        const tp=db.teleport;
        tp.t++;
        if(tp.phase==='move'){
            // Move scanner over player ship (first pad)
            const targetX=DOCKING_BAY.pads[0].x;
            const startX=(tp.startX!=null)?tp.startX:DOCKING_BAY.consoleX;
            const dur=100;
            const k=Math.min(1,tp.t/dur);
            const e=1-Math.pow(1-k,3);
            tp.scannerX=startX+(targetX-startX)*e;
            if(tp.t>=dur){tp.phase='scan';tp.t=0;}
        } else if(tp.phase==='scan'){
            // Pass over ship a few times
            tp.scannerX=DOCKING_BAY.pads[0].x+Math.sin(tp.t/12)*80;
            if(tp.t>=180){tp.phase='charge';tp.t=0;}
        } else if(tp.phase==='charge'){
            tp.scannerX=DOCKING_BAY.pads[0].x;
            if(tp.t>=90){tp.phase='flash';tp.t=0;}
        } else if(tp.phase==='flash'){
            if(tp.t>=60){tp.phase='done';tp.t=0;}
        } else if(tp.phase==='done'){
            // End: close terminal, reset
            if(tp.t>=90){
                db.teleport=null;
                db.open=false;
                db.terminalPhase=null;
                db.mapOpen=false;
                try{if(Sound.ui) Sound.ui();}catch(e){}
            }
        }
    }
}

function drawDockConsoleOverlay(){
    const db=G.dockingBay;
    if(!db.open) return;
    // If in teleport cutscene, don't draw terminal — draw teleport overlay instead.
    if(db.teleport) { drawTeleportCutscene(); return; }
    // If map is open, draw that instead.
    if(db.mapOpen) { drawSectorMap(); return; }

    // Terminal window frame
    const tw=700, th=440, tx=W/2-tw/2, ty=H/2-th/2;
    // Drop shadow
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(tx+6,ty+6,tw,th);
    // Title bar
    ctx.fillStyle='#0e3a7a';ctx.fillRect(tx,ty,tw,26);
    ctx.fillStyle='#fff';ctx.font='bold 11px Segoe UI, Courier New';ctx.textAlign='left';
    ctx.fillText((db.cmdCwd||'C:\\RELAY\\DOCK-03')+' - Terminal',tx+10,ty+17);
    // Window buttons
    ctx.fillStyle='#c4c4c4';
    ctx.fillRect(tx+tw-78,ty+5,22,16);ctx.fillRect(tx+tw-54,ty+5,22,16);
    ctx.fillStyle='#e04545';ctx.fillRect(tx+tw-30,ty+5,22,16);
    ctx.strokeStyle='#333';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(tx+tw-73,ty+17);ctx.lineTo(tx+tw-61,ty+17);ctx.stroke();
    ctx.strokeRect(tx+tw-49,ty+9,12,8);
    ctx.beginPath();ctx.moveTo(tx+tw-25,ty+9);ctx.lineTo(tx+tw-13,ty+17);
    ctx.moveTo(tx+tw-13,ty+9);ctx.lineTo(tx+tw-25,ty+17);ctx.stroke();
    // Terminal body
    ctx.fillStyle='#0c0c0c';ctx.fillRect(tx,ty+26,tw,th-26);
    ctx.strokeStyle='#2a2a2a';ctx.lineWidth=1;ctx.strokeRect(tx,ty+26,tw,th-26);

    // Terminal text
    ctx.font='13px Consolas, Courier New';ctx.textAlign='left';
    const lines=db.terminalText;
    // Reserve one line at the bottom for the live prompt when in cmd mode
    const reserveBottom = (db.terminalPhase==='cmd')?1:0;
    const maxLines=Math.max(1, Math.floor((th-60)/18) - reserveBottom);
    let curY=ty+50;
    const startLine=Math.max(0,lines.length-maxLines);
    for(let i=startLine;i<lines.length;i++){
        const ln=lines[i];
        // Cyan for prompt lines, green for data, white for output
        let col='#dddddd';
        if(ln.indexOf('RELAY\\DOCK-03>')>=0) col='#cccccc';
        if(ln.startsWith('  > ') || ln.includes(' OK')) col='#66ff88';
        if(ln.includes('ACCESS DENIED') || ln.includes('ERROR') || ln.includes('not recognized') || ln.includes('cannot find')) col='#ff6666';
        if(ln.startsWith('-- ') || ln.includes('BEGIN RECOVERED') || ln.includes('END FRAGMENT')) col='#ffcc66';
        if(ln.includes('[0]') || ln.includes('[1]') || ln.includes('[2]')){
            // Highlight selected ship row
            const m=ln.match(/\[(\d)\]/);
            if(m){
                const idx=parseInt(m[1]);
                if(db.terminalPhase==='ship_select' && idx===db.selection){
                    ctx.fillStyle='rgba(0,180,255,0.25)';ctx.fillRect(tx+4,curY-14,tw-8,18);
                    col='#ffffff';
                }
            }
        }
        ctx.fillStyle=col;
        ctx.fillText(ln,tx+12,curY);
        curY+=18;
    }
    // Live command-line prompt
    if(db.terminalPhase==='cmd'){
        const promptStr=(db.cmdCwd||'C:\\RELAY\\DOCK-03')+'> ';
        ctx.fillStyle='#cccccc';
        ctx.fillText(promptStr+(db.cmdInput||''),tx+12,curY);
        // Blinking cursor at end of input
        if(Math.floor(performance.now()/400)%2===0){
            const cw=ctx.measureText(promptStr+(db.cmdInput||'')).width;
            ctx.fillStyle='#dddddd';ctx.fillRect(tx+12+cw+1,curY-12,8,14);
        }
        curY+=18;
    }
    // Blinking cursor for idle non-cmd phases
    if(db.terminalPhase==='ship_select' || db.terminalPhase==='deny_done'){
        if(Math.floor(performance.now()/400)%2===0){
            ctx.fillStyle='#dddddd';ctx.fillRect(tx+16+14*6,curY-30,8,14);
        }
    }
    // Spinner for waiting phases
    if(db.terminalPhase==='deny_wait' || db.terminalPhase==='auth_player'){
        const frames=['|','/','-','\\'];
        const f=frames[Math.floor(db.terminalTimer/8)%4];
        ctx.fillStyle='#88ccff';ctx.font='bold 16px Consolas';
        ctx.fillText(f,tx+tw-30,curY-4);
    }
    // Footer hint (varies by phase)
    ctx.font='10px Consolas';ctx.fillStyle='#666';ctx.textAlign='right';
    const hint=(db.terminalPhase==='cmd')
        ? 'type HELP for commands   [ESC] close'
        : '[UP/DOWN] Select   [Z/ENTER] Confirm   [ESC] Close';
    ctx.fillText(hint,tx+tw-12,ty+th-8);
}

// ---------- Sector Map ----------
// Layout (per user):
//   [S7]             [S10]
//    |                |
//   [S3]--[RELAY]--[S12]--[FINAL]
//    |                |
//   [S1]             [S8]
//    |                |
//   [S4]             [S11]
//    |                |
//   [S6]             [S9]
//    |                |
//   [S2]             [S5]
const SECTOR_NODES=[
    // id, label, col, row, name (memory-partition codename), blurb (lore hint)
    { id:7,  col:0, row:0, label:'SECTOR 7',  name:'THE REBEL BASE', blurb:'Makeshift fortifications. Something made its last stand here.' },
    { id:3,  col:0, row:1, label:'SECTOR 3',  name:'THE MARKET',     blurb:'Trading floor debris. Ledgers full of stranger currencies.' },
    { id:1,  col:0, row:2, label:'SECTOR 1',  name:'THE GARDEN',     blurb:'Green-tinted static. Signal reads as peaceful. It is lying.' },
    { id:4,  col:0, row:3, label:'SECTOR 4',  name:'THE GRAVEYARD',  blurb:'Memorial structures. Names without bodies attached.' },
    { id:6,  col:0, row:4, label:'SECTOR 6',  name:'THE ARCHIVE',    blurb:'Endless catalogues. Every file indexed by someone who forgot.' },
    { id:2,  col:0, row:5, label:'SECTOR 2',  name:'THE CLASSROOM',  blurb:'Geometric patterns. Recorded voices are decades younger than the data.' },
    { id:10, col:3, row:0, label:'SECTOR 10', name:'THE CATHEDRAL',  blurb:'Sacred geometry in the silence. Prayers without a god to hear.' },
    { id:12, col:3, row:1, label:'SECTOR 12', name:'THE CORE',       blurb:'Pulsing, heart-like. Something old still beats in here.' },
    { id:8,  col:3, row:2, label:'SECTOR 8',  name:'THE HOSPITAL',   blurb:'Clinical debris. All patients filed as \u2018degrading.\u2019' },
    { id:11, col:3, row:3, label:'SECTOR 11', name:'THE EXIT',       blurb:'Door-shaped structures. All of them welded shut from both sides.' },
    { id:9,  col:3, row:4, label:'SECTOR 9',  name:'THE BIRTHPLACE', blurb:'Soft-coloured, nursery-patterned. Something was born that shouldn\u2019t have been.' },
    { id:5,  col:3, row:5, label:'SECTOR 5',  name:'THE STUDIO',     blurb:'Musical notation drifting in vacuum. Every note played perfectly. Every note the same.' }
    // Relay and Final drawn separately
];
// Final sector details (lore-only, not in the base game's playable list)
const FINAL_SECTOR_LORE = { name:'THE TRUTH', blurb:'SIGNAL CORRUPT. Not recommended for inexperienced salvage drones.' };
// Only Sector 2 is accessible:
const ACCESSIBLE_SECTORS=[2];

function drawSectorMap(){
    const db=G.dockingBay;
    const mw=780, mh=520, mx=W/2-mw/2, my=H/2-mh/2;
    // Backdrop
    ctx.fillStyle='rgba(0,0,0,0.86)';ctx.fillRect(0,0,W,H);
    const bg=ctx.createLinearGradient(mx,my,mx,my+mh);
    bg.addColorStop(0,'#050818');bg.addColorStop(1,'#020412');
    ctx.fillStyle=bg;ctx.fillRect(mx,my,mw,mh);
    ctx.strokeStyle='#00ccff';ctx.lineWidth=2;ctx.strokeRect(mx+0.5,my+0.5,mw-1,mh-1);
    // Inner frame
    ctx.strokeStyle='rgba(0,200,255,0.25)';ctx.lineWidth=1;ctx.strokeRect(mx+8,my+8,mw-16,mh-16);
    // Header
    ctx.font='bold 18px Courier New';ctx.textAlign='left';ctx.fillStyle='#00ccff';
    ctx.shadowBlur=10;ctx.shadowColor='#00ccff';
    ctx.fillText('MEMORY PARTITION CHART',mx+20,my+36);
    ctx.shadowBlur=0;
    ctx.font='10px Courier New';ctx.fillStyle='#557';
    ctx.fillText('NEXUS FRAGMENT MAP · TOBY-01 NEURAL LINK',mx+20,my+50);
    ctx.textAlign='right';ctx.fillStyle='#ff8844';
    ctx.fillText('AUTH: MODULE ACCESS',mx+mw-20,my+36);
    ctx.fillStyle='#447';ctx.font='9px Courier New';
    ctx.fillText('13 PARTITIONS · 12 CORRUPTED · 1 STABLE',mx+mw-20,my+50);

    // Compute node positions
    // Grid: cols [0,1,2,3,4] row spacing
    const colXs=[mx+90, mx+260, mx+420, mx+590, mx+720];
    const rowYs=[]; for(let r=0;r<6;r++) rowYs.push(my+100+r*62);
    const nodeR=22;

    // Draw connections first
    ctx.strokeStyle='rgba(80,120,180,0.5)';ctx.lineWidth=2;
    // Left column chain: 7-3-1-4-6-2
    const leftChain=[7,3,1,4,6,2];
    for(let i=0;i<leftChain.length-1;i++){
        const a=SECTOR_NODES.find(n=>n.id===leftChain[i]);
        const b=SECTOR_NODES.find(n=>n.id===leftChain[i+1]);
        ctx.beginPath();ctx.moveTo(colXs[a.col],rowYs[a.row]);ctx.lineTo(colXs[b.col],rowYs[b.row]);ctx.stroke();
    }
    // Right column chain: 10-12-8-11-9-5
    const rightChain=[10,12,8,11,9,5];
    for(let i=0;i<rightChain.length-1;i++){
        const a=SECTOR_NODES.find(n=>n.id===rightChain[i]);
        const b=SECTOR_NODES.find(n=>n.id===rightChain[i+1]);
        ctx.beginPath();ctx.moveTo(colXs[a.col],rowYs[a.row]);ctx.lineTo(colXs[b.col],rowYs[b.row]);ctx.stroke();
    }
    // Horizontal: S3 -- RELAY -- S12 -- FINAL
    const relayX=mx+340, relayY=rowYs[1];
    const finalX=colXs[4], finalY=rowYs[1];
    const s3=SECTOR_NODES.find(n=>n.id===3), s12=SECTOR_NODES.find(n=>n.id===12);
    ctx.beginPath();ctx.moveTo(colXs[s3.col],rowYs[s3.row]);ctx.lineTo(relayX,relayY);ctx.stroke();
    ctx.beginPath();ctx.moveTo(relayX,relayY);ctx.lineTo(colXs[s12.col],rowYs[s12.row]);ctx.stroke();
    ctx.beginPath();ctx.moveTo(colXs[s12.col],rowYs[s12.row]);ctx.lineTo(finalX,finalY);ctx.stroke();

    // Draw RELAY node
    ctx.save();
    ctx.fillStyle='#120a1e';ctx.strokeStyle='#aa66ff';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(relayX,relayY,18,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#aa66ff';ctx.font='bold 9px Courier New';ctx.textAlign='center';
    ctx.fillText('RELAY',relayX,relayY+3);
    ctx.restore();

    // Draw FINAL node
    ctx.save();
    ctx.fillStyle='#1e0808';ctx.strokeStyle='#ff3344';ctx.lineWidth=2;
    ctx.beginPath();
    const fp=[[0,-24],[20,-10],[20,10],[0,24],[-20,10],[-20,-10]];
    for(let i=0;i<fp.length;i++){const p=fp[i];if(i===0)ctx.moveTo(finalX+p[0],finalY+p[1]);else ctx.lineTo(finalX+p[0],finalY+p[1]);}
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#ff6677';ctx.font='bold 8px Courier New';ctx.textAlign='center';
    ctx.fillText('FINAL',finalX,finalY+3);
    ctx.restore();

    // Draw sector nodes
    const T=performance.now();
    for(let i=0;i<SECTOR_NODES.length;i++){
        const n=SECTOR_NODES[i];
        const nx=colXs[n.col], ny=rowYs[n.row];
        const accessible=ACCESSIBLE_SECTORS.includes(n.id);
        const sel=i===db.mapSelection;
        const col=accessible?'#00ff88':'#3a3a55';
        const bgCol=accessible?'rgba(0,60,40,0.7)':'rgba(20,20,30,0.8)';
        if(sel){
            const sp=0.5+Math.sin(T/200)*0.3;
            ctx.globalAlpha=sp;
            ctx.strokeStyle=col;ctx.lineWidth=3;
            ctx.beginPath();ctx.arc(nx,ny,nodeR+6,0,Math.PI*2);ctx.stroke();
            ctx.globalAlpha=1;
        }
        ctx.fillStyle=bgCol;ctx.strokeStyle=col;ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(nx,ny,nodeR,0,Math.PI*2);ctx.fill();ctx.stroke();
        if(accessible){
            ctx.shadowBlur=12;ctx.shadowColor=col;
            ctx.strokeStyle=col;ctx.lineWidth=1.5;
            ctx.beginPath();ctx.arc(nx,ny,nodeR,0,Math.PI*2);ctx.stroke();
            ctx.shadowBlur=0;
        }
        ctx.font='bold 12px Courier New';ctx.textAlign='center';
        ctx.fillStyle=accessible?'#00ff88':'#666';
        ctx.fillText('S'+n.id,nx,ny+4);
        // Lock icon for inaccessible
        if(!accessible){
            ctx.fillStyle='rgba(150,150,170,0.5)';
            ctx.fillRect(nx-4,ny+nodeR+4,8,6);
            ctx.strokeStyle='rgba(150,150,170,0.5)';ctx.lineWidth=1;
            ctx.beginPath();ctx.arc(nx,ny+nodeR+4,3,Math.PI,Math.PI*2);ctx.stroke();
        } else {
            ctx.fillStyle='#00ff88';ctx.font='bold 8px Courier New';
            ctx.fillText('● UNLOCKED',nx,ny+nodeR+12);
        }
    }

    // Info panel (bottom)
    const ip_y=my+mh-92;
    ctx.fillStyle='rgba(0,20,30,0.7)';ctx.fillRect(mx+16,ip_y,mw-32,76);
    ctx.strokeStyle='rgba(0,200,255,0.3)';ctx.lineWidth=1;
    ctx.strokeRect(mx+16.5,ip_y+0.5,mw-33,75);
    const selNode=SECTOR_NODES[db.mapSelection];
    const selAcc=selNode && ACCESSIBLE_SECTORS.includes(selNode.id);
    // Sector label + lore codename
    ctx.font='bold 14px Courier New';ctx.textAlign='left';
    ctx.fillStyle=selAcc?'#00ff88':'#666';
    ctx.fillText(selNode?selNode.label:'(none)',mx+28,ip_y+22);
    if(selNode && selNode.name){
        ctx.font='bold 11px Courier New';ctx.fillStyle=selAcc?'#aaffcc':'#7a7a92';
        ctx.fillText('·  '+selNode.name,mx+28+95,ip_y+22);
    }
    // Lore blurb
    ctx.font='italic 10px Courier New';ctx.fillStyle=selAcc?'#99bbcc':'#55556a';
    ctx.fillText(selNode&&selNode.blurb?selNode.blurb:'',mx+28,ip_y+38);
    // Status line
    ctx.font='11px Courier New';ctx.fillStyle='#889';
    if(selAcc){
        ctx.fillText('Status: NEURAL LINK AVAILABLE. Memory partition stable.',mx+28,ip_y+56);
        ctx.fillStyle='#00ccff';
        ctx.fillText('Press [Z] to dive \u2014 consciousness will be uploaded to partition.',mx+28,ip_y+72);
    } else {
        ctx.fillText('Status: PARTITION CORRUPTED — neural link cannot resolve.',mx+28,ip_y+56);
        ctx.fillStyle='#664';
        ctx.fillText('Further partitions will become accessible when the AI stabilises.',mx+28,ip_y+72);
    }
    // Footer
    ctx.font='10px Courier New';ctx.textAlign='right';ctx.fillStyle='#666';
    ctx.fillText('[ARROWS] Navigate   [Z/ENTER] Dive   [ESC] Close',mx+mw-24,my+mh-12);
}

function mapNavigate(dx,dy){
    const db=G.dockingBay;
    const cur=SECTOR_NODES[db.mapSelection];
    if(!cur) return;
    // Find nearest node in direction
    let best=-1, bestD=1e9;
    for(let i=0;i<SECTOR_NODES.length;i++){
        if(i===db.mapSelection) continue;
        const n=SECTOR_NODES[i];
        const ddx=n.col-cur.col, ddy=n.row-cur.row;
        // Must be in roughly the intended direction
        if(dx!==0 && Math.sign(ddx)!==Math.sign(dx)) continue;
        if(dy!==0 && Math.sign(ddy)!==Math.sign(dy)) continue;
        if(dx===0 && ddx!==0) continue;
        if(dy===0 && ddy!==0) continue;
        const d=ddx*ddx*4+ddy*ddy;
        if(d<bestD){bestD=d;best=i;}
    }
    if(best>=0) db.mapSelection=best;
    try{Sound.ui();}catch(e){}
}

function mapSelect(){
    const db=G.dockingBay;
    const n=SECTOR_NODES[db.mapSelection];
    if(!n || !ACCESSIBLE_SECTORS.includes(n.id)) return;
    // Capture the scanner's current idle position so the glide starts smoothly.
    const T=performance.now();
    const w=DOCKING_BAY.width-200;
    const currentIdleX=100+(Math.sin(T/4200)*0.5+0.5)*w;
    // Begin teleport cutscene
    db.terminalPhase='teleporting';
    db.mapOpen=false;
    db.teleport={phase:'move',scannerX:currentIdleX,startX:currentIdleX,t:0,sectorId:n.id};
    try{if(Sound.explode) Sound.explode();}catch(e){}
}

function drawTeleportCutscene(){
    const db=G.dockingBay;
    const tp=db.teleport; if(!tp) return;
    const T=performance.now();
    // Overlay text at bottom
    const pulse=0.6+Math.sin(T/200)*0.4;
    ctx.save();
    let msg='', col='#00ccff';
    if(tp.phase==='move') msg='ALIGNING NEURAL LINK EMITTER...';
    else if(tp.phase==='scan') msg='READING CONSCIOUSNESS SIGNATURE...';
    else if(tp.phase==='charge') { msg='UPLOADING TO MEMORY PARTITION...'; col='#aa66ff'; }
    else if(tp.phase==='flash') { msg='DIVING...'; col='#ffffff'; }
    else if(tp.phase==='done') {
        const lored=SECTOR_NODES.find(n=>n.id===(tp.sectorId||2));
        const nm=lored?lored.name:'';
        msg='\u2605 SECTOR '+(tp.sectorId||2)+(nm?' \u2014 '+nm:'')+' \u2014 LINKED \u2605';
        col='#00ff88';
    }
    // Bottom banner
    ctx.fillStyle='rgba(0,5,15,0.85)';ctx.fillRect(0,H-90,W,60);
    ctx.strokeStyle=col;ctx.lineWidth=2;
    ctx.strokeRect(0.5,H-89.5,W-1,59);
    ctx.globalAlpha=pulse;
    ctx.font='bold 22px Courier New';ctx.textAlign='center';ctx.fillStyle=col;
    ctx.shadowBlur=18;ctx.shadowColor=col;
    ctx.fillText(msg,W/2,H-55);
    ctx.shadowBlur=0;ctx.globalAlpha=1;

    // Flash effect
    if(tp.phase==='flash'){
        const f=Math.max(0,1-tp.t/60);
        ctx.globalAlpha=f;
        ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
        ctx.globalAlpha=1;
    }
    // Dimensional ripples during charge — centered on the player ship in the exterior bay
    if(tp.phase==='charge'){
        const k=tp.t/90;
        for(let ri=0;ri<4;ri++){
            const rr=(k*180+ri*60)%240;
            const a=Math.max(0,1-rr/240);
            ctx.strokeStyle=`rgba(170,102,255,${a*0.6})`;ctx.lineWidth=2;
            const px=DOCKING_BAY.pads[0].x - G.station.cameraX;
            ctx.beginPath();ctx.arc(px,180,rr,0,Math.PI*2);ctx.stroke();
        }
    }
    // Beam expansion during scan
    if(tp.phase==='scan'){
        const px=DOCKING_BAY.pads[0].x - G.station.cameraX;
        ctx.strokeStyle='rgba(0,220,255,0.5)';ctx.lineWidth=1;
        for(let i=0;i<3;i++){
            const r=20+i*30+Math.sin(tp.t/10+i)*8;
            ctx.globalAlpha=0.5-i*0.15;
            ctx.beginPath();ctx.arc(px,180,r,0,Math.PI*2);ctx.stroke();
        }
        ctx.globalAlpha=1;
    }
    ctx.restore();

    // Footer hint for done state
    if(tp.phase==='done'){
        ctx.font='11px Courier New';ctx.textAlign='center';ctx.fillStyle='#888';
        ctx.fillText('(Partition content scheduled for campaign build \u2014 returning your consciousness to the drone)',W/2,H-20);
    }
}

// ---------- Input dispatch (called by engine.js key handlers) ----------
function dockingBayKey(e){
    const db=G.dockingBay;
    if(!db.open) return false;
    // Teleport phase: block all input (cutscene plays through)
    if(db.teleport) return true;
    if(db.mapOpen){
        if(e.code==='Escape'){closeDockConsole();return true;}
        if(e.code==='ArrowUp'||e.code==='KeyW'){mapNavigate(0,-1);return true;}
        if(e.code==='ArrowDown'||e.code==='KeyS'){mapNavigate(0,1);return true;}
        if(e.code==='ArrowLeft'||e.code==='KeyA'){mapNavigate(-1,0);return true;}
        if(e.code==='ArrowRight'||e.code==='KeyD'){mapNavigate(1,0);return true;}
        if(e.code==='KeyZ'||e.code==='Enter'||e.code==='Space'){mapSelect();return true;}
        return true;
    }
    // Terminal input
    if(e.code==='Escape'){closeDockConsole();return true;}
    if(db.terminalPhase==='cmd'){
        // Live command-line input — append / backspace / enter.
        if(e.code==='Enter' || e.code==='NumpadEnter'){
            const out=_runTerminalCommand(db.cmdInput);
            if(out.length>0) db.terminalText=db.terminalText.concat(out);
            db.cmdInput='';
            return true;
        }
        if(e.code==='Backspace'){
            db.cmdInput=(db.cmdInput||'').slice(0,-1);
            return true;
        }
        // Printable character? e.key is the character itself for letters/digits/punct.
        if(e.key && e.key.length===1){
            // Ignore Ctrl+X etc — only pass plain chars
            if(!e.ctrlKey && !e.metaKey){
                if((db.cmdInput||'').length<80) db.cmdInput=(db.cmdInput||'')+e.key;
            }
            return true;
        }
        // Spacebar sometimes reported as ' ' — handled above. Other non-printables are ignored.
        return true;
    }
    if(db.terminalPhase==='ship_select'){
        if(e.code==='ArrowUp'||e.code==='KeyW'){db.selection=Math.max(0,db.selection-1);try{Sound.ui();}catch(err){}return true;}
        if(e.code==='ArrowDown'||e.code==='KeyS'){db.selection=Math.min(2,db.selection+1);try{Sound.ui();}catch(err){}return true;}
        if(e.code==='KeyZ'||e.code==='Enter'||e.code==='Space'){dockConsoleSelectShip();return true;}
    } else if(db.terminalPhase==='deny_done'){
        if(e.code==='KeyZ'||e.code==='Enter'||e.code==='Space'){
            // Return to the shell
            db.terminalPhase='cmd';
            db.cmdInput='';
            try{Sound.ui();}catch(err){}
            return true;
        }
    }
    return true;
}

// ---------- Dev helpers ----------
// Spawn a small asteroid near the ship that is guaranteed to drop a data fragment
// when destroyed. Flagged with hasLoreDrop — engine.js checks this flag at kill time.
function devSpawnLoreAsteroid(){
    if(typeof spawnAsteroid!=='function') return;
    // Spawn just off-screen to the right of the player so it drifts into view
    const sx = (typeof ship!=='undefined' && ship) ? ship.x+120 : W/2+120;
    const sy = (typeof ship!=='undefined' && ship) ? ship.y      : H/2;
    spawnAsteroid(sx, sy, 30, 'normal');
    const a = asteroids[asteroids.length-1];
    if(a){
        a.hasLoreDrop = true;
        // Drift slowly toward the player so it's easy to kill
        a.dx = -1.5; a.dy = 0;
    }
}
