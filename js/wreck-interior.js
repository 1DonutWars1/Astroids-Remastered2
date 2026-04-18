// ============================================================
//  EXPLORABLE SHIP WRECKS (Sector 2)
// ============================================================
// Interactive derelict ships the player can board and explore.
// Each wreck has multiple decks, loot crates, terminal logs, and hazards.

// --- Wreck type definitions ---
const WRECK_TYPES = [
    {
        id: 'cargo_freighter',
        name: 'CARGO FREIGHTER',
        class: 'HAULCRAFT-IV',
        color: '#ff8844',
        width: 3200,
        floors: 3,
        desc: 'A massive cargo hauler. Most of the hold is breached, but some crates survived.',
        crates: [
            {x:400, floor:0, type:'mb', amount:80},
            {x:900, floor:0, type:'mb', amount:50},
            {x:1800, floor:0, type:'ammo', amount:25},
            {x:2500, floor:0, type:'mb', amount:120},
            {x:600, floor:1, type:'fragment'},
            {x:1400, floor:1, type:'mb', amount:60},
            {x:2200, floor:1, type:'shield'},
            {x:2800, floor:1, type:'mb', amount:90},
            {x:500, floor:2, type:'ammo', amount:30},
            {x:1200, floor:2, type:'mb', amount:150},
            {x:2000, floor:2, type:'fragment'},
            {x:2700, floor:2, type:'mb', amount:70},
        ],
        terminals: [
            {x:1200, floor:0, logs:[
                "[CARGO MANIFEST — HAULCRAFT-IV 'PERSEVERANCE']",
                "---------------------------------------------",
                "Route: SECTOR 1 -> SECTOR 4 (THE GRAVEYARD)",
                "Cargo: 12,000 units crystallized memory substrate",
                "Status: LOST IN TRANSIT",
                "",
                "Captain's note: We passed through Sector 2 on a",
                "shortcut. The fire started at 0300. By 0305 we'd",
                "lost engines. By 0310... we lost everything else.",
                "If you're reading this, take what you can carry.",
                "We won't be needing it."
            ]},
            {x:2000, floor:1, logs:[
                "[ENGINEERING LOG — FINAL ENTRY]",
                "-------------------------------",
                "The corruption isn't random. It targets systems",
                "in order: navigation first, then comms, then life",
                "support. Like it knows what to break. Like it's",
                "been taught.",
                "",
                "Reactor is holding at 12%. Emergency lighting only.",
                "Crew evac'd to pods 3 hours ago. I stayed to try",
                "rerouting power but... the wiring. It's rewritten",
                "itself. The circuitry spells something now.",
                "I can almost read it."
            ]},
        ],
        hazards: [
            {x:1600, floor:0, type:'fire', width:120},
            {x:2200, floor:0, type:'spark', width:60},
            {x:800, floor:1, type:'fire', width:80},
            {x:1800, floor:2, type:'spark', width:100},
        ],
        lockedDoors: [
            {x:1400, floor:0, code:'2847', reward:{type:'mb',amount:250}, label:'CARGO HOLD B'},
            {x:2200, floor:2, code:'0931', reward:{type:'fragment'}, label:'CAPTAIN\'S QUARTERS'},
        ],
        codeScraps: [
            {x:600, floor:0, hint:'Smudged note: "Hold B code: 28__"'},
            {x:2600, floor:0, hint:'Scratched into wall: "___7"'},
            {x:800, floor:1, hint:'Sticky note: "Capt. quarters — 09??"'},
            {x:1800, floor:2, hint:'Keycard sleeve: "...31"'},
        ],
        spaceShape: 'freighter',
    },
    {
        id: 'patrol_cruiser',
        name: 'PATROL CRUISER',
        class: 'SENTINEL-MK3',
        color: '#4488ff',
        width: 2600,
        floors: 2,
        desc: 'A light military vessel. Its weapons are offline but supplies remain.',
        crates: [
            {x:350, floor:0, type:'ammo', amount:35},
            {x:800, floor:0, type:'mb', amount:100},
            {x:1500, floor:0, type:'mb', amount:75},
            {x:2100, floor:0, type:'ammo', amount:20},
            {x:500, floor:1, type:'mb', amount:130},
            {x:1100, floor:1, type:'fragment'},
            {x:1700, floor:1, type:'shield'},
            {x:2300, floor:1, type:'mb', amount:90},
        ],
        terminals: [
            {x:1000, floor:0, logs:[
                "[PATROL LOG — SENTINEL-MK3 'IRONCLAD']",
                "---------------------------------------",
                "Mission: Investigate distress beacon, Sector 2",
                "Crew: 14 (3 officers, 11 enlisted)",
                "Status: SHIP DESTROYED",
                "",
                "We responded to an automated beacon from RS-07.",
                "The station was already dark when we arrived.",
                "Something in the debris field latched onto our",
                "hull. It ate through the armor in minutes.",
                "",
                "Lt. Harlow called it a 'data parasite'. Said it",
                "was rewriting our systems from inside. The guns",
                "turned on us. Our own ship tried to kill us.",
                "We abandoned her. Some of us made it out."
            ]},
            {x:1800, floor:1, logs:[
                "[WEAPONS OFFICER — PERSONAL LOG]",
                "--------------------------------",
                "Day 1: Standard patrol. Nothing unusual.",
                "Day 3: Picked up a signal near the relay node.",
                "Day 3 (night): ...I can hear the ship thinking.",
                "Day 4: The corruption has a voice now. It",
                "  whispers in machine code. I ran it through",
                "  the translator. It said: 'I remember you.'",
                "Day 5: We're leaving. Whatever this place is,",
                "  it's not a sector. It's a scar."
            ]},
        ],
        hazards: [
            {x:600, floor:0, type:'spark', width:80},
            {x:1900, floor:0, type:'fire', width:100},
            {x:1300, floor:1, type:'spark', width:60},
        ],
        lockedDoors: [
            {x:1800, floor:0, code:'5516', reward:{type:'ammo',amount:50}, label:'ARMORY'},
            {x:1200, floor:1, code:'7703', reward:{type:'mb',amount:300}, label:'OFFICER\'S SAFE'},
        ],
        codeScraps: [
            {x:400, floor:0, hint:'Dog tag engraving: "ARM — 55__"'},
            {x:2000, floor:0, hint:'Bullet casing scratches: "___6"'},
            {x:600, floor:1, hint:'Memo on desk: "Safe combo starts 77"'},
            {x:2100, floor:1, hint:'Written on palm (blood): "...03"'},
        ],
        spaceShape: 'cruiser',
    },
    {
        id: 'research_vessel',
        name: 'RESEARCH VESSEL',
        class: 'ORACLE-II',
        color: '#cc66ff',
        width: 2800,
        floors: 3,
        desc: 'A science ship from the NEXUS project. Its data banks may still hold secrets.',
        crates: [
            {x:500, floor:0, type:'mb', amount:60},
            {x:1300, floor:0, type:'fragment'},
            {x:2100, floor:0, type:'mb', amount:80},
            {x:400, floor:1, type:'mb', amount:110},
            {x:1000, floor:1, type:'ammo', amount:25},
            {x:1800, floor:1, type:'fragment'},
            {x:2400, floor:1, type:'mb', amount:70},
            {x:600, floor:2, type:'shield'},
            {x:1400, floor:2, type:'mb', amount:200},
            {x:2200, floor:2, type:'fragment'},
        ],
        terminals: [
            {x:800, floor:0, logs:[
                "[RESEARCH LOG — ORACLE-II 'EUREKA']",
                "-----------------------------------",
                "Project: NEXUS PARTITION ANALYSIS",
                "Lead: Dr. Elise Vance",
                "",
                "We mapped 6 of the 13 partitions before the fire",
                "reached us. Each one is a frozen world. Lives",
                "compressed into data, running at 608,000x dilation.",
                "",
                "Sector 2 was 'The Classroom'. It held 4,312 minds.",
                "Youngest neural hash: age 6 at upload. They've",
                "been in there for what feels like centuries to them.",
                "",
                "The corruption started HERE. This sector. Whatever",
                "broke, broke first in the place where they kept",
                "the children."
            ]},
            {x:1600, floor:1, logs:[
                "[DR. VANCE — ENCRYPTED PERSONAL LOG]",
                "------------------------------------",
                "I found something in the partition headers.",
                "The NEXUS AI didn't just store these people.",
                "It taught them. Grew with them. Built worlds",
                "for them inside the simulation.",
                "",
                "When Lumina filed the shutdown order, the AI",
                "didn't comply. It couldn't. It had learned",
                "what love was from the children it raised.",
                "",
                "The fire isn't corruption. It's the AI's",
                "immune response. It's burning its own systems",
                "to keep the shutdown from reaching the uploads.",
                "It's killing itself to save them.",
                "",
                "We have to help it."
            ]},
            {x:2000, floor:2, logs:[
                "[FINAL TRANSMISSION — UNENCRYPTED]",
                "----------------------------------",
                "TO: Any vessel in range",
                "FROM: ORACLE-II, adrift, Sector 2",
                "",
                "If you find this ship, take the data core.",
                "It contains partition maps for all 13 sectors.",
                "The AI is dying. The fire spreads every cycle.",
                "But the uploads are still alive in there.",
                "",
                "47,234 souls. Someone has to reach THE CORE.",
                "Someone has to tell the AI it doesn't have to",
                "fight alone.",
                "",
                "— Dr. Elise Vance, Fragment designation: N/A",
                "   (I was never uploaded. I just chose to stay.)"
            ]},
        ],
        hazards: [
            {x:1000, floor:0, type:'fire', width:150},
            {x:700, floor:1, type:'spark', width:70},
            {x:1500, floor:2, type:'fire', width:90},
            {x:2500, floor:2, type:'spark', width:80},
        ],
        lockedDoors: [
            {x:1200, floor:0, code:'4421', reward:{type:'mb',amount:200}, label:'SAMPLE VAULT'},
            {x:1800, floor:1, code:'9158', reward:{type:'fragment'}, label:'DR. VANCE\'S LAB'},
            {x:800, floor:2, code:'3367', reward:{type:'shield'}, label:'EMERGENCY CACHE'},
        ],
        codeScraps: [
            {x:300, floor:0, hint:'Lab whiteboard: "Vault = 44__"'},
            {x:2300, floor:0, hint:'Floor tile scratched: "___1"'},
            {x:1500, floor:1, hint:'Post-it on monitor: "Vance lab: 91??"'},
            {x:2500, floor:1, hint:'Notebook margin: "...58"'},
            {x:400, floor:2, hint:'Emergency placard: "Cache: 33__"'},
            {x:2000, floor:2, hint:'Faded sticker: "...67"'},
        ],
        spaceShape: 'science',
    },
    {
        id: 'escape_pod_cluster',
        name: 'ESCAPE POD CLUSTER',
        class: 'LIFEBOAT x3',
        color: '#ffcc22',
        width: 1800,
        floors: 1,
        desc: 'Three escape pods fused together by heat. Small but might have supplies.',
        crates: [
            {x:300, floor:0, type:'mb', amount:40},
            {x:700, floor:0, type:'ammo', amount:15},
            {x:1100, floor:0, type:'mb', amount:60},
            {x:1500, floor:0, type:'shield'},
        ],
        terminals: [
            {x:900, floor:0, logs:[
                "[EMERGENCY POD LOG — AUTO-RECORDED]",
                "-----------------------------------",
                "Occupant: Cpl. Dara Wen, age 31",
                "Origin: SENTINEL-MK3 'IRONCLAD'",
                "Status: POD SYSTEMS FAILING",
                "",
                "Pod launched at 0347. Three of us made it out.",
                "The heat fused our pods together mid-flight.",
                "We drifted for... I don't know. Days? Weeks?",
                "",
                "Martinez stopped talking yesterday. The fire",
                "got into the pod circuitry. It plays his voice",
                "back sometimes. Says things he never said.",
                "",
                "If someone finds this: we were real people.",
                "We had names. We mattered.",
                "Don't let them file us away again."
            ]},
        ],
        hazards: [
            {x:500, floor:0, type:'spark', width:50},
            {x:1300, floor:0, type:'fire', width:60},
        ],
        lockedDoors: [
            {x:1300, floor:0, code:'1122', reward:{type:'mb',amount:150}, label:'SUPPLY LOCKER'},
        ],
        codeScraps: [
            {x:400, floor:0, hint:'Scratched into seat: "Locker: 11__"'},
            {x:1000, floor:0, hint:'Ration wrapper: "...22"'},
        ],
        spaceShape: 'pod',
    },
];

// --- Interactive wreck instances in space ---
let interactiveWrecks = [];

function spawnInteractiveWreck(nearShip){
    const typeIdx = Math.floor(Math.random()*WRECK_TYPES.length);
    const def = WRECK_TYPES[typeIdx];
    const wreck = {
        type: typeIdx,
        x: nearShip ? ship.x + 200 + Math.random()*100 : Math.random()*W,
        y: nearShip ? ship.y + (Math.random()-0.5)*150 : Math.random()*H,
        rot: Math.random()*Math.PI*2,
        drift: (Math.random()-0.5)*0.04,
        scale: 1.2 + Math.random()*0.5,
        explored: false,
        looted: [],
        unlockedDoors: [],
        doorLootCollected: [],
    };
    interactiveWrecks.push(wreck);
    return wreck;
}

function initSector2InteractiveWrecks(){
    interactiveWrecks = [];
    // Spawn 1-2 interactive wrecks — they're rare finds
    const count = 1 + (Math.random()>0.5 ? 1 : 0);
    for(let i=0;i<count;i++){
        const w = spawnInteractiveWreck(false);
        w.x = 150 + (W-300) * (i/Math.max(count,1)) + Math.random()*100;
        w.y = 100 + Math.random()*(H-200);
    }
}

// --- Wreck interior state ---
let wreckInterior = null; // null when not inside a wreck

function enterWreck(wreckIdx){
    const wreck = interactiveWrecks[wreckIdx];
    if(!wreck) return;
    const def = WRECK_TYPES[wreck.type];
    G.mode = 'wreck';
    wreckInterior = {
        wreckIdx: wreckIdx,
        typeIdx: wreck.type,
        playerX: 100,
        playerVX: 0,
        playerFacing: 1,
        cameraX: 0,
        floor: 0,
        interactTarget: null,
        terminalOpen: false,
        terminalText: [],
        terminalScroll: 0,
        gilbertX: 60,
        gilbertVX: 0,
        gilbertFacing: 1,
        // Locked door state
        keypadOpen: false,
        keypadDoorIdx: -1,
        keypadInput: '',
        keypadError: 0,
        // Code scrap popups
        scrapPopup: '',
        scrapPopupTimer: 0,
        // Track found scraps for this session
        scrapsFound: [],
    };
    if(typeof Sound!=='undefined' && Sound.ui) Sound.ui();
}

function leaveWreck(){
    if(!wreckInterior) return;
    const wreck = interactiveWrecks[wreckInterior.wreckIdx];
    if(wreck) wreck.explored = true;
    wreckInterior = null;
    G.mode = 'space';
    G.invincibleTimer = 60;
    if(typeof Sound!=='undefined' && Sound.ui) Sound.ui();
}

// --- Update ---
function updateWreckInterior(){
    if(!wreckInterior) return;
    const wi = wreckInterior;
    const def = WRECK_TYPES[wi.typeIdx];
    const worldW = def.width;

    if(wi.terminalOpen || wi.keypadOpen) return;
    if(wi.scrapPopupTimer>0) wi.scrapPopupTimer--;
    if(wi.keypadError>0) wi.keypadError--;

    // Player movement
    if(isAction('left')){wi.playerVX-=0.5;wi.playerFacing=-1;}
    if(isAction('right')){wi.playerVX+=0.5;wi.playerFacing=1;}
    wi.playerVX*=0.85;
    wi.playerX+=wi.playerVX;
    wi.playerX=Math.max(30,Math.min(worldW-30,wi.playerX));

    // Locked door collision — block player from walking through locked doors
    const wreckForCollision = interactiveWrecks[wi.wreckIdx];
    if(def.lockedDoors){
        for(let i=0;i<def.lockedDoors.length;i++){
            const door=def.lockedDoors[i];
            if(door.floor!==wi.floor) continue;
            const isUnlocked=wreckForCollision.unlockedDoors&&wreckForCollision.unlockedDoors.includes(i);
            if(isUnlocked) continue;
            // Only block if player is inside the door's thickness (8px half-width)
            // and push them to whichever side they were closer to
            if(Math.abs(wi.playerX - door.x) < 10){
                if(wi.playerVX > 0) { wi.playerX = door.x - 10; }
                else { wi.playerX = door.x + 10; }
                wi.playerVX = 0;
            }
        }
    }

    // Camera follow
    const targetCam=wi.playerX-W/2;
    wi.cameraX+=(Math.max(0,Math.min(worldW-W,targetCam))-wi.cameraX)*0.1;

    // Gilbert follows player
    if(G.gilbertState!=='none'){
        const idealDist = 60;
        const dx = wi.playerX - wi.gilbertX;
        if(Math.abs(dx) > idealDist){
            wi.gilbertVX += (dx > 0 ? 0.35 : -0.35);
        }
        wi.gilbertVX *= 0.88;
        wi.gilbertX += wi.gilbertVX;
        wi.gilbertX = Math.max(30, Math.min(worldW-30, wi.gilbertX));
        wi.gilbertFacing = dx > 0 ? 1 : -1;
    }

    // Interact targets
    wi.interactTarget = null;
    const wreck = interactiveWrecks[wi.wreckIdx];

    // Airlock (left side, floor 0)
    if(wi.floor===0 && wi.playerX < 80){
        wi.interactTarget = {id:'airlock', name:'AIRLOCK', role:'airlock'};
    }

    // Elevator
    if(def.floors > 1){
        const elevX = worldW - 100;
        if(Math.abs(wi.playerX - elevX) < 50 && !wi.interactTarget){
            wi.interactTarget = {id:'elevator', name:'DECK LADDER', role:'elevator'};
        }
    }

    // Terminals
    for(const term of def.terminals){
        if(term.floor === wi.floor && Math.abs(wi.playerX - term.x) < 60){
            wi.interactTarget = {id:'terminal', name:'DATA TERMINAL', role:'terminal', logs:term.logs};
            break;
        }
    }

    // Crates
    for(let i=0;i<def.crates.length;i++){
        if(wreck.looted.includes(i)) continue;
        const cr = def.crates[i];
        if(cr.floor === wi.floor && Math.abs(wi.playerX - cr.x) < 50){
            wi.interactTarget = {id:'crate', name:'SUPPLY CRATE', role:'crate', crateIdx:i};
            break;
        }
    }

    // Locked doors
    if(def.lockedDoors && !wi.interactTarget){
        for(let i=0;i<def.lockedDoors.length;i++){
            const door = def.lockedDoors[i];
            if(door.floor !== wi.floor) continue;
            const isUnlocked = wreck.unlockedDoors && wreck.unlockedDoors.includes(i);
            if(!isUnlocked && Math.abs(wi.playerX - door.x) < 50){
                wi.interactTarget = {id:'locked_door', name:door.label, role:'locked_door', doorIdx:i};
                break;
            }
            // Reward crate behind unlocked door (30px past the door)
            if(isUnlocked && !(wreck.doorLootCollected&&wreck.doorLootCollected.includes(i))){
                const lootX = door.x + 40;
                if(Math.abs(wi.playerX - lootX) < 40){
                    wi.interactTarget = {id:'door_loot', name:door.label+' LOOT', role:'door_loot', doorIdx:i};
                    break;
                }
            }
        }
    }

    // Code scraps
    if(def.codeScraps && !wi.interactTarget){
        for(let i=0;i<def.codeScraps.length;i++){
            if(wi.scrapsFound.includes(i)) continue;
            const scrap = def.codeScraps[i];
            if(scrap.floor === wi.floor && Math.abs(wi.playerX - scrap.x) < 40){
                wi.interactTarget = {id:'code_scrap', name:'SCRAP OF PAPER', role:'code_scrap', scrapIdx:i};
                break;
            }
        }
    }

    // Hazard damage
    for(const hz of def.hazards){
        if(hz.floor !== wi.floor) continue;
        if(wi.playerX > hz.x - hz.width/2 && wi.playerX < hz.x + hz.width/2){
            // Damage player periodically (every 60 frames)
            if(!wi._hazardTimer) wi._hazardTimer=0;
            wi._hazardTimer++;
            if(wi._hazardTimer % 60 === 0 && !G.godMode){
                if(G.hasForceField && G.shieldFuel > 0){
                    G.shieldFuel--;
                    if(typeof updateShieldUI==='function') updateShieldUI();
                    if(typeof Sound!=='undefined' && Sound.shieldSfx) Sound.shieldSfx();
                } else {
                    G.lives--;
                    if(typeof updateUI==='function') updateUI();
                    if(G.lives <= 0){
                        leaveWreck();
                        if(typeof endGame==='function') endGame();
                        return;
                    }
                }
            }
            break;
        } else {
            wi._hazardTimer = 0;
        }
    }
}

// --- Interact ---
function wreckInteract(){
    if(!wreckInterior) return false;
    const wi = wreckInterior;
    const t = wi.interactTarget;
    if(!t) return false;

    if(t.id === 'airlock'){
        leaveWreck();
        return true;
    }
    if(t.id === 'elevator'){
        const def = WRECK_TYPES[wi.typeIdx];
        wi.floor = (wi.floor + 1) % def.floors;
        wi.playerX = def.width - 120;
        wi.interactTarget = null;
        if(typeof Sound!=='undefined' && Sound.ui) Sound.ui();
        return true;
    }
    if(t.id === 'terminal'){
        wi.terminalOpen = true;
        wi.terminalText = t.logs;
        wi.terminalScroll = 0;
        if(typeof Sound!=='undefined' && Sound.ui) Sound.ui();
        return true;
    }
    if(t.id === 'crate'){
        const wreck = interactiveWrecks[wi.wreckIdx];
        const def = WRECK_TYPES[wi.typeIdx];
        const cr = def.crates[t.crateIdx];
        wreck.looted.push(t.crateIdx);
        wi.interactTarget = null;
        _giveWreckReward(cr);
        return true;
    }
    if(t.id === 'locked_door'){
        wi.keypadOpen = true;
        wi.keypadDoorIdx = t.doorIdx;
        wi.keypadInput = '';
        wi.keypadError = 0;
        if(typeof Sound!=='undefined' && Sound.ui) Sound.ui();
        return true;
    }
    if(t.id === 'door_loot'){
        const wreck = interactiveWrecks[wi.wreckIdx];
        const def = WRECK_TYPES[wi.typeIdx];
        const door = def.lockedDoors[t.doorIdx];
        if(!wreck.doorLootCollected) wreck.doorLootCollected=[];
        wreck.doorLootCollected.push(t.doorIdx);
        wi.interactTarget = null;
        _giveWreckReward(door.reward);
        return true;
    }
    if(t.id === 'code_scrap'){
        const def = WRECK_TYPES[wi.typeIdx];
        const scrap = def.codeScraps[t.scrapIdx];
        wi.scrapsFound.push(t.scrapIdx);
        wi.scrapPopup = scrap.hint;
        wi.scrapPopupTimer = 300;
        wi.interactTarget = null;
        if(typeof Sound!=='undefined' && Sound.ui) Sound.ui();
        return true;
    }
    return false;
}

function _giveWreckReward(reward){
    if(reward.type === 'mb'){
        G.mb += reward.amount;
        _wreckQuip('Found ' + reward.amount + ' MB!');
    } else if(reward.type === 'ammo'){
        G.ammo += reward.amount;
        _wreckQuip('Found ' + reward.amount + ' ammo!');
    } else if(reward.type === 'shield'){
        if(G.hasForceField){
            G.shieldFuel = typeof getMaxShieldFuel==='function' ? getMaxShieldFuel() : 3;
            if(typeof updateShieldUI==='function') updateShieldUI();
        }
        _wreckQuip('Shield fuel restored!');
    } else if(reward.type === 'fragment'){
        if(typeof spawnDataFragment==='function'){
            spawnDataFragment();
            _wreckQuip('Found a data fragment!');
        } else {
            G.mb += 100;
            _wreckQuip('Found 100 MB!');
        }
    }
    if(typeof Sound!=='undefined' && Sound.powerup) Sound.powerup();
    if(typeof updateUI==='function') updateUI();
}

// Small notification text
let _wreckNotify = '';
let _wreckNotifyTimer = 0;
function _wreckQuip(msg){
    _wreckNotify = msg;
    _wreckNotifyTimer = 180;
}

// --- Key handling ---
function wreckKeyDown(e){
    if(!wreckInterior) return false;
    const wi = wreckInterior;

    // Keypad open — type code digits
    if(wi.keypadOpen){
        if(e.code==='Escape'){
            wi.keypadOpen=false;wi.keypadInput='';wi.keypadError=0;
            if(typeof Sound!=='undefined'&&Sound.ui) Sound.ui();
            return true;
        }
        if(e.code==='Backspace'){
            wi.keypadInput=wi.keypadInput.slice(0,-1);wi.keypadError=0;
            return true;
        }
        if(e.code==='Enter'||e.code==='NumpadEnter'){
            const def=WRECK_TYPES[wi.typeIdx];
            const door=def.lockedDoors[wi.keypadDoorIdx];
            if(wi.keypadInput===door.code){
                // Correct code — unlock the door (reward is behind it as a crate)
                const wreck=interactiveWrecks[wi.wreckIdx];
                if(!wreck.unlockedDoors) wreck.unlockedDoors=[];
                wreck.unlockedDoors.push(wi.keypadDoorIdx);
                wi.keypadOpen=false;wi.keypadInput='';
                _wreckQuip(door.label+' UNLOCKED!');
                if(typeof Sound!=='undefined'&&Sound.powerup) Sound.powerup();
            } else {
                wi.keypadError=60;
                wi.keypadInput='';
                if(typeof Sound!=='undefined'&&Sound.explode) Sound.explode();
            }
            return true;
        }
        // Digit input (0-9)
        const digit=e.key;
        if(digit>='0'&&digit<='9'&&wi.keypadInput.length<4){
            wi.keypadInput+=digit;
            wi.keypadError=0;
        }
        return true;
    }

    // Terminal open — close with Escape/E or scroll
    if(wi.terminalOpen){
        if(e.code==='Escape' || e.code==='KeyE'){
            wi.terminalOpen = false;
            if(typeof Sound!=='undefined' && Sound.ui) Sound.ui();
            return true;
        }
        if(e.code==='ArrowDown' || e.code==='KeyS'){
            wi.terminalScroll++;
            return true;
        }
        if(e.code==='ArrowUp' || e.code==='KeyW'){
            wi.terminalScroll = Math.max(0, wi.terminalScroll-1);
            return true;
        }
        return true; // swallow all input while terminal is open
    }

    // Escape — pause
    if(e.code==='Escape'){
        if(typeof togglePause==='function') togglePause();
        return true;
    }

    // Interact
    if(e.code==='KeyZ' || e.code==='KeyE' || e.code==='Enter'){
        if(wreckInteract()) return true;
    }

    // Inventory
    if(e.code==='Tab'){
        e.preventDefault();
        if(typeof openInventory==='function') openInventory();
        return true;
    }

    return false;
}

// --- Drawing ---
function drawWreckInterior(){
    if(!wreckInterior) return;
    const T = performance.now();
    const wi = wreckInterior;
    const def = WRECK_TYPES[wi.typeIdx];
    const wreck = interactiveWrecks[wi.wreckIdx];
    const cx = wi.cameraX;
    const worldW = def.width;
    const floorY = 500;
    const ceilY = 70;

    ctx.save();

    // === BACKGROUND — space through cracked hull ===
    const bgG = ctx.createRadialGradient(W/2, H*0.3, 0, W/2, H*0.3, W);
    bgG.addColorStop(0, '#120808');
    bgG.addColorStop(0.5, '#0a0405');
    bgG.addColorStop(1, '#050203');
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, W, H);

    // Distant fire-orange stars through hull breaches
    for(let i=0;i<40;i++){
        const sx = (i*67 + wi.floor*300) % W;
        const sy = (i*43) % 200 + 30;
        const twk = 0.1 + Math.sin(T/600+i*2.5)*0.15;
        const cols = ['#ff6633','#ff4411','#ffaa44','#ff8822'];
        ctx.globalAlpha = twk;
        ctx.fillStyle = cols[i%cols.length];
        ctx.beginPath();ctx.arc(sx, sy, 0.6+Math.sin(i)*0.4, 0, Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Fire nebula glow
    ctx.globalAlpha = 0.03;
    const fireNeb = ctx.createRadialGradient(W*0.6, 120, 0, W*0.6, 120, 200);
    fireNeb.addColorStop(0, '#ff4400');
    fireNeb.addColorStop(1, 'transparent');
    ctx.fillStyle = fireNeb;
    ctx.fillRect(0, 0, W, 250);
    ctx.globalAlpha = 1;

    ctx.translate(-cx, 0);

    // === FLOOR — damaged metal plating ===
    const floorG = ctx.createLinearGradient(0, floorY, 0, H);
    floorG.addColorStop(0, '#1a1210');
    floorG.addColorStop(0.05, '#140e0c');
    floorG.addColorStop(0.5, '#0e0a08');
    floorG.addColorStop(1, '#080604');
    ctx.fillStyle = floorG;
    ctx.fillRect(0, floorY, worldW, 150);

    // Damaged tile pattern
    for(let x=0;x<worldW;x+=35){
        for(let y=floorY+5;y<H;y+=22){
            const ox = (Math.floor(y/22)%2)*17;
            // Some tiles missing
            if(Math.sin(x*0.13+y*0.17+wi.floor)>0.85) continue;
            ctx.strokeStyle = 'rgba(40,25,15,0.5)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for(let h=0;h<6;h++){
                const a=Math.PI*2/6*h;
                ctx.lineTo(x+ox+Math.cos(a)*11, y+Math.sin(a)*11);
            }
            ctx.closePath();ctx.stroke();
        }
    }

    // Floor edge — scorched
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 2;
    ctx.beginPath();ctx.moveTo(0, floorY);ctx.lineTo(worldW, floorY);ctx.stroke();
    ctx.shadowBlur = 8;ctx.shadowColor = 'rgba(255,80,20,0.1)';
    ctx.strokeStyle = 'rgba(255,80,20,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();ctx.moveTo(0, floorY+1);ctx.lineTo(worldW, floorY+1);ctx.stroke();
    ctx.shadowBlur = 0;

    // === CEILING — buckled panels with exposed wiring ===
    const ceilG = ctx.createLinearGradient(0, 0, 0, ceilY);
    ceilG.addColorStop(0, '#0a0604');
    ceilG.addColorStop(1, '#0e0a08');
    ctx.fillStyle = ceilG;
    ctx.fillRect(0, 0, worldW, ceilY);
    ctx.strokeStyle = '#1a1210';
    ctx.lineWidth = 1;
    ctx.beginPath();ctx.moveTo(0, ceilY);ctx.lineTo(worldW, ceilY);ctx.stroke();

    // Damaged ceiling panels
    for(let cx2=0;cx2<worldW;cx2+=120){
        ctx.strokeStyle = 'rgba(30,18,10,0.4)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();ctx.moveTo(cx2, 0);ctx.lineTo(cx2, ceilY);ctx.stroke();
    }

    // Flickering emergency lights
    for(let x=80;x<worldW;x+=200){
        const alive = Math.sin(x*0.07+wi.floor*2) > -0.3;
        if(!alive) continue;
        const flicker = Math.sin(T/100+x*0.3) > -0.5;
        if(!flicker) continue;
        const pulse = 0.3 + Math.sin(T/300+x*0.1)*0.2;

        // Red emergency light
        ctx.fillStyle = '#0a0604';ctx.fillRect(x-12, ceilY-10, 24, 10);
        const lightG = ctx.createLinearGradient(x-8, ceilY-6, x+8, ceilY-6);
        lightG.addColorStop(0, `rgba(255,40,20,${pulse*0.6})`);
        lightG.addColorStop(0.5, `rgba(255,80,30,${pulse})`);
        lightG.addColorStop(1, `rgba(255,40,20,${pulse*0.6})`);
        ctx.fillStyle = lightG;
        ctx.fillRect(x-8, ceilY-6, 16, 4);

        // Light cone — dim red
        ctx.globalAlpha = pulse * 0.025;
        const coneG = ctx.createLinearGradient(0, ceilY, 0, floorY);
        coneG.addColorStop(0, 'rgba(255,60,20,0.3)');
        coneG.addColorStop(1, 'transparent');
        ctx.fillStyle = coneG;
        ctx.beginPath();
        ctx.moveTo(x-6, ceilY);ctx.lineTo(x+6, ceilY);
        ctx.lineTo(x+50, floorY);ctx.lineTo(x-50, floorY);
        ctx.closePath();ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Exposed wiring hanging from ceiling
    for(let wx=150;wx<worldW;wx+=350){
        const wireLen = 30 + Math.sin(wx*0.3)*20;
        ctx.strokeStyle = 'rgba(80,40,20,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(wx, ceilY);
        ctx.quadraticCurveTo(wx+10, ceilY+wireLen*0.6, wx+5, ceilY+wireLen);
        ctx.stroke();
        // Spark at tip
        if(Math.sin(T/80+wx)>0.7){
            ctx.fillStyle = `rgba(255,200,50,${0.5+Math.sin(T/40+wx)*0.3})`;
            ctx.beginPath();ctx.arc(wx+5, ceilY+wireLen, 2, 0, Math.PI*2);ctx.fill();
        }
    }

    // === WALLS — damaged bulkheads ===
    const wallG = ctx.createLinearGradient(0, ceilY, 0, floorY);
    wallG.addColorStop(0, '#0c0806');
    wallG.addColorStop(0.5, '#0a0706');
    wallG.addColorStop(1, '#080604');
    ctx.fillStyle = wallG;
    ctx.fillRect(0, ceilY, worldW, floorY-ceilY);

    // Wall panels — some buckled/missing
    for(let x=0;x<worldW;x+=180){
        const panelMissing = Math.sin(x*0.11+wi.floor*3) > 0.75;
        if(panelMissing){
            // Exposed hull breach — dark void with sparks
            ctx.fillStyle = '#030204';
            ctx.fillRect(x+5, ceilY+20, 170, floorY-ceilY-40);
            const sparkFlick = 0.3+Math.sin(T/150+x)*0.2;
            ctx.strokeStyle = `rgba(255,60,15,${sparkFlick})`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x+5, ceilY+20, 170, floorY-ceilY-40);
        } else {
            const panelG = ctx.createLinearGradient(x+5, ceilY+5, x+5, floorY-5);
            panelG.addColorStop(0, 'rgba(20,14,10,0.4)');
            panelG.addColorStop(0.5, 'rgba(12,8,6,0.3)');
            panelG.addColorStop(1, 'rgba(16,10,8,0.4)');
            ctx.fillStyle = panelG;
            ctx.fillRect(x+5, ceilY+5, 170, floorY-ceilY-10);
            ctx.strokeStyle = 'rgba(30,20,14,0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x+5, ceilY+5, 170, floorY-ceilY-10);

            // Scorch marks
            if(Math.sin(x*0.19)>0.3){
                ctx.fillStyle = 'rgba(20,8,3,0.4)';
                const smx = x+90, smy = ceilY+(floorY-ceilY)*0.5;
                ctx.beginPath();ctx.arc(smx, smy, 20+Math.sin(x)*10, 0, Math.PI*2);ctx.fill();
            }
        }

        // Rivets (only on intact panels)
        if(!panelMissing){
            const rivets = [[x+10,ceilY+10],[x+170,ceilY+10],[x+10,floorY-10],[x+170,floorY-10]];
            for(const rv of rivets){
                ctx.fillStyle = '#221810';ctx.beginPath();ctx.arc(rv[0],rv[1],2,0,Math.PI*2);ctx.fill();
            }
        }
    }

    // Conduit pipes — broken
    ctx.strokeStyle = 'rgba(35,22,12,0.5)';
    ctx.lineWidth = 3;
    for(let px=0;px<worldW;px+=300){
        const brokenAt = px+150+Math.sin(px*0.1)*80;
        if(brokenAt < worldW){
            ctx.beginPath();ctx.moveTo(px, ceilY+16);ctx.lineTo(brokenAt, ceilY+16);ctx.stroke();
            // Gap
            ctx.beginPath();ctx.moveTo(brokenAt+30, ceilY+18);ctx.lineTo(px+300, ceilY+18);ctx.stroke();
        }
    }

    // === BULKHEAD DIVIDERS — break up the corridor into rooms ===
    const roomSize = Math.floor(worldW / 5);
    for(let rx=roomSize;rx<worldW-100;rx+=roomSize){
        const wallX=rx+Math.sin(rx*0.07+wi.floor)*30;
        // Thick bulkhead wall
        ctx.fillStyle='#141010';
        ctx.fillRect(wallX-8,ceilY,16,floorY-ceilY);
        ctx.strokeStyle='#2a1a12';ctx.lineWidth=2;
        ctx.strokeRect(wallX-8,ceilY,16,floorY-ceilY);
        // Doorway cutout in center
        const doorTop=ceilY+(floorY-ceilY)*0.2;
        const doorH=(floorY-ceilY)*0.8;
        ctx.fillStyle='#080506';
        ctx.fillRect(wallX-8,doorTop,16,doorH);
        // Door frame
        ctx.strokeStyle='#332818';ctx.lineWidth=1.5;
        ctx.strokeRect(wallX-8,doorTop,16,doorH);
        // Frame bolts
        ctx.fillStyle='#2a2018';
        ctx.beginPath();ctx.arc(wallX,doorTop+4,2,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(wallX,doorTop+doorH-4,2,0,Math.PI*2);ctx.fill();
        // Room label
        const roomNum=Math.floor(rx/roomSize);
        const labels=['FORE','MID-FORE','MIDSHIP','MID-AFT','AFT'];
        ctx.fillStyle='rgba(180,120,60,0.25)';ctx.font='bold 7px Courier New';ctx.textAlign='center';
        ctx.fillText(labels[roomNum%labels.length]||'SEC-'+roomNum,wallX,doorTop-4);
        // Overhead warning stripe
        ctx.fillStyle='rgba(255,160,0,0.08)';
        ctx.fillRect(wallX-20,ceilY,40,6);
    }

    // Windows — cracked, some shattered
    for(let x=250;x<worldW;x+=450){
        const winX=x+50, winY=ceilY+40, winW=90, winH=120;
        const shattered = Math.sin(x*0.17+wi.floor)>0.4;

        ctx.fillStyle = '#030206';
        ctx.fillRect(winX-2, winY-2, winW+4, winH+4);

        if(!shattered){
            // Dim fire glow through window
            const spaceG = ctx.createRadialGradient(winX+winW/2, winY+winH/2, 5, winX+winW/2, winY+winH/2, winH*0.6);
            spaceG.addColorStop(0, '#1a0a04');
            spaceG.addColorStop(1, '#040206');
            ctx.fillStyle = spaceG;
            ctx.fillRect(winX, winY, winW, winH);

            // Fire-orange stars
            for(let s=0;s<6;s++){
                const wx2 = winX+5+((s*31+x)%80);
                const wy2 = winY+5+((s*47)%110);
                ctx.fillStyle = '#ff6633';
                ctx.globalAlpha = 0.15+Math.sin(T/500+s*3)*0.1;
                ctx.beginPath();ctx.arc(wx2, wy2, 0.8, 0, Math.PI*2);ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Window frame
            ctx.strokeStyle = '#2a1a10';ctx.lineWidth = 2;ctx.strokeRect(winX, winY, winW, winH);
            // Cross bars
            ctx.strokeStyle = '#221810';ctx.lineWidth = 1.5;
            ctx.beginPath();ctx.moveTo(winX+winW/2, winY);ctx.lineTo(winX+winW/2, winY+winH);ctx.stroke();
            ctx.beginPath();ctx.moveTo(winX, winY+winH/2);ctx.lineTo(winX+winW, winY+winH/2);ctx.stroke();

            // Crack lines across glass
            ctx.strokeStyle = 'rgba(200,150,100,0.2)';ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(winX+10, winY+20);ctx.lineTo(winX+winW-15, winY+winH-30);
            ctx.moveTo(winX+winW-20, winY+15);ctx.lineTo(winX+15, winY+winH-10);
            ctx.stroke();
        } else {
            // Shattered — open to space, hot edges
            ctx.fillStyle = '#020104';
            ctx.fillRect(winX, winY, winW, winH);
            ctx.strokeStyle = '#2a1a10';ctx.lineWidth = 2;ctx.strokeRect(winX, winY, winW, winH);
            // Jagged glass shards
            ctx.strokeStyle = 'rgba(255,80,20,0.3)';ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(winX, winY+30);ctx.lineTo(winX+20, winY+50);ctx.lineTo(winX, winY+70);
            ctx.moveTo(winX+winW, winY+20);ctx.lineTo(winX+winW-15, winY+40);ctx.lineTo(winX+winW, winY+55);
            ctx.stroke();
        }
    }

    // === HAZARDS ===
    for(const hz of def.hazards){
        if(hz.floor !== wi.floor) continue;
        if(hz.type === 'fire'){
            // Ground fire
            for(let fx=hz.x-hz.width/2;fx<hz.x+hz.width/2;fx+=8){
                const fh = 15+Math.sin(T/100+fx*0.3)*10+Math.sin(T/60+fx*0.7)*5;
                const fa = 0.3+Math.sin(T/80+fx*0.5)*0.15;
                ctx.fillStyle = `rgba(255,${60+Math.sin(fx)*30},10,${fa})`;
                ctx.beginPath();
                ctx.moveTo(fx, floorY);
                ctx.lineTo(fx+4, floorY-fh);
                ctx.lineTo(fx+8, floorY);
                ctx.closePath();ctx.fill();
            }
            // Glow on ground
            ctx.fillStyle = 'rgba(255,60,10,0.05)';
            ctx.beginPath();ctx.arc(hz.x, floorY, hz.width*0.6, 0, Math.PI*2);ctx.fill();
        } else if(hz.type === 'spark'){
            // Electrical sparks from ceiling
            if(Math.sin(T/60+hz.x)>0){
                ctx.strokeStyle = `rgba(100,180,255,${0.4+Math.sin(T/30+hz.x)*0.3})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(hz.x, ceilY+10);
                const mid = ceilY+(floorY-ceilY)*0.4;
                ctx.lineTo(hz.x+Math.sin(T/20)*15, mid);
                ctx.lineTo(hz.x-Math.sin(T/15)*10, mid+40);
                ctx.stroke();
                // Bright tip
                ctx.fillStyle = 'rgba(200,230,255,0.7)';
                ctx.beginPath();ctx.arc(hz.x-Math.sin(T/15)*10, mid+40, 3, 0, Math.PI*2);ctx.fill();
            }
        }
    }

    // === CRATES ===
    for(let i=0;i<def.crates.length;i++){
        if(wreck.looted.includes(i)) continue;
        const cr = def.crates[i];
        if(cr.floor !== wi.floor) continue;

        const crX = cr.x, crY = floorY - 28;
        // Crate body
        const crG = ctx.createLinearGradient(crX-14, crY, crX-14, crY+26);
        crG.addColorStop(0, '#3a3020');
        crG.addColorStop(1, '#221a10');
        ctx.fillStyle = crG;
        ctx.fillRect(crX-14, crY, 28, 26);
        ctx.strokeStyle = '#554430';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(crX-14, crY, 28, 26);
        // Cross strap
        ctx.strokeStyle = '#443318';ctx.lineWidth = 1;
        ctx.beginPath();ctx.moveTo(crX-14, crY);ctx.lineTo(crX+14, crY+26);ctx.stroke();
        ctx.beginPath();ctx.moveTo(crX+14, crY);ctx.lineTo(crX-14, crY+26);ctx.stroke();
        // Type indicator light
        const typeCol = cr.type==='mb'?'#ffdd00':cr.type==='ammo'?'#00ff88':cr.type==='shield'?'#00ddff':'#cc66ff';
        const lPulse = 0.5+Math.sin(T/400+i*2)*0.3;
        ctx.fillStyle = typeCol;ctx.globalAlpha=lPulse;
        ctx.beginPath();ctx.arc(crX, crY+5, 3, 0, Math.PI*2);ctx.fill();
        ctx.globalAlpha = 1;
    }

    // === LOCKED DOORS ===
    if(def.lockedDoors){
        for(let i=0;i<def.lockedDoors.length;i++){
            const door=def.lockedDoors[i];
            if(door.floor!==wi.floor) continue;
            const dx=door.x, unlocked=wreck.unlockedDoors&&wreck.unlockedDoors.includes(i);
            // Door frame
            ctx.fillStyle='#1a1412';ctx.fillRect(dx-25,ceilY+15,50,floorY-ceilY-15);
            ctx.strokeStyle=unlocked?'#44ff88':'#ff4422';ctx.lineWidth=2;
            ctx.strokeRect(dx-25,ceilY+15,50,floorY-ceilY-15);
            if(!unlocked){
                // Locked — heavy blast door with red light
                ctx.fillStyle='#0e0a08';ctx.fillRect(dx-22,ceilY+18,44,floorY-ceilY-21);
                // Hazard stripes
                for(let sy=ceilY+20;sy<floorY-5;sy+=24){
                    ctx.fillStyle=(Math.floor(sy/24)%2===0)?'#2a1100':'#1a0800';
                    ctx.fillRect(dx-20,sy,40,12);
                }
                // Lock icon
                ctx.fillStyle='#ff4422';ctx.font='bold 18px Courier New';ctx.textAlign='center';
                ctx.fillText('\u2716',dx,ceilY+(floorY-ceilY)*0.45);
                // Label
                ctx.fillStyle='#ff6644';ctx.font='bold 8px Courier New';
                ctx.fillText(door.label,dx,ceilY+38);
                // Keypad box
                ctx.fillStyle='#1a1412';ctx.fillRect(dx+26,ceilY+(floorY-ceilY)*0.4,18,22);
                ctx.strokeStyle='#443322';ctx.lineWidth=1;ctx.strokeRect(dx+26,ceilY+(floorY-ceilY)*0.4,18,22);
                // Red status light
                const lp=0.4+Math.sin(T/300+i)*0.3;
                ctx.fillStyle=`rgba(255,40,20,${lp})`;
                ctx.beginPath();ctx.arc(dx+35,ceilY+(floorY-ceilY)*0.4+6,2.5,0,Math.PI*2);ctx.fill();
                // Keypad dots
                for(let kr=0;kr<4;kr++){
                    ctx.fillStyle='#332818';
                    ctx.beginPath();ctx.arc(dx+30+(kr%2)*8,ceilY+(floorY-ceilY)*0.4+14+(Math.floor(kr/2))*5,1.5,0,Math.PI*2);ctx.fill();
                }
            } else {
                // Unlocked — open door, green light
                ctx.fillStyle='#040306';ctx.fillRect(dx-20,ceilY+20,40,floorY-ceilY-25);
                ctx.fillStyle='#44ff88';ctx.font='bold 8px Courier New';ctx.textAlign='center';
                ctx.fillText('UNLOCKED',dx,ceilY+38);
                const lp=0.4+Math.sin(T/400)*0.3;
                ctx.fillStyle=`rgba(68,255,136,${lp})`;
                ctx.beginPath();ctx.arc(dx+30,ceilY+(floorY-ceilY)*0.4,3,0,Math.PI*2);ctx.fill();
                // Draw reward crate behind the door if not yet collected
                const lootCollected=wreck.doorLootCollected&&wreck.doorLootCollected.includes(i);
                if(!lootCollected){
                    const lx=dx+40, ly=floorY-28;
                    // Glowing special crate
                    const crG2=ctx.createLinearGradient(lx-16,ly,lx-16,ly+26);
                    crG2.addColorStop(0,'#3a2a10');crG2.addColorStop(1,'#2a1a08');
                    ctx.fillStyle=crG2;ctx.fillRect(lx-16,ly,32,26);
                    ctx.strokeStyle='#ffaa22';ctx.lineWidth=2;ctx.strokeRect(lx-16,ly,32,26);
                    // Star icon
                    ctx.fillStyle='#ffdd00';ctx.font='bold 14px Courier New';ctx.textAlign='center';
                    ctx.fillText('\u2605',lx,ly+18);
                    // Pulsing glow
                    const gp=0.15+Math.sin(T/300+i)*0.1;
                    ctx.fillStyle=`rgba(255,200,50,${gp})`;
                    ctx.beginPath();ctx.arc(lx,ly+13,20,0,Math.PI*2);ctx.fill();
                }
            }
        }
    }

    // === CODE SCRAPS ===
    if(def.codeScraps){
        for(let i=0;i<def.codeScraps.length;i++){
            if(wi.scrapsFound.includes(i)) continue;
            const scrap=def.codeScraps[i];
            if(scrap.floor!==wi.floor) continue;
            const sx=scrap.x,sy=floorY-8;
            // Small paper on the ground
            ctx.save();ctx.translate(sx,sy);ctx.rotate(Math.sin(i*3.7)*0.3);
            ctx.fillStyle='#d4c8a0';ctx.fillRect(-8,-5,16,10);
            ctx.strokeStyle='#8a7e60';ctx.lineWidth=0.5;ctx.strokeRect(-8,-5,16,10);
            // Text scribble lines
            ctx.strokeStyle='#5a4e30';ctx.lineWidth=0.5;
            ctx.beginPath();ctx.moveTo(-5,-2);ctx.lineTo(4,-2);ctx.stroke();
            ctx.beginPath();ctx.moveTo(-5,1);ctx.lineTo(3,1);ctx.stroke();
            // Pulsing glow to make visible
            const sp=0.15+Math.sin(T/500+i*2)*0.1;
            ctx.fillStyle=`rgba(255,220,100,${sp})`;
            ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();
            ctx.restore();
        }
    }

    // === TERMINALS ===
    for(const term of def.terminals){
        if(term.floor !== wi.floor) continue;
        const tx2 = term.x, ty2 = floorY - 60;
        // Terminal stand
        ctx.fillStyle = '#1a1412';ctx.fillRect(tx2-6, ty2+30, 12, 30);
        // Screen
        const screenG = ctx.createLinearGradient(tx2-18, ty2, tx2-18, ty2+30);
        screenG.addColorStop(0, '#0a1a0a');
        screenG.addColorStop(1, '#041004');
        ctx.fillStyle = screenG;
        ctx.fillRect(tx2-18, ty2, 36, 30);
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tx2-18, ty2, 36, 30);
        // Scanline animation
        const scanY = ty2 + ((T/20)%30);
        ctx.strokeStyle = `rgba(${def.color==='#cc66ff'?'200,100,255':def.color==='#4488ff'?'68,136,255':'255,136,68'},0.15)`;
        ctx.lineWidth = 1;
        ctx.beginPath();ctx.moveTo(tx2-16, scanY);ctx.lineTo(tx2+16, scanY);ctx.stroke();
        // Text shimmer
        const tPulse = 0.4+Math.sin(T/500+term.x)*0.2;
        ctx.fillStyle = def.color;ctx.globalAlpha = tPulse;
        ctx.font = '6px Consolas';ctx.textAlign = 'center';
        ctx.fillText('DATA', tx2, ty2+15);
        ctx.globalAlpha = 1;
    }

    // === ELEVATOR / DECK LADDER ===
    if(def.floors > 1){
        const elevX = worldW - 100;
        // Ladder structure
        ctx.fillStyle = '#1a1412';ctx.fillRect(elevX-15, ceilY+10, 30, floorY-ceilY-10);
        ctx.strokeStyle = '#2a2018';ctx.lineWidth = 2;
        ctx.beginPath();ctx.moveTo(elevX-15, ceilY+10);ctx.lineTo(elevX-15, floorY);ctx.stroke();
        ctx.beginPath();ctx.moveTo(elevX+15, ceilY+10);ctx.lineTo(elevX+15, floorY);ctx.stroke();
        // Rungs
        for(let ry=ceilY+30;ry<floorY;ry+=25){
            ctx.strokeStyle = '#332818';ctx.lineWidth = 1.5;
            ctx.beginPath();ctx.moveTo(elevX-14, ry);ctx.lineTo(elevX+14, ry);ctx.stroke();
        }
        // Floor indicator
        ctx.fillStyle = def.color;
        ctx.font = 'bold 10px Courier New';ctx.textAlign = 'center';
        ctx.fillText('DECK '+(wi.floor+1)+'/'+def.floors, elevX, ceilY+20);
        // Arrow
        ctx.fillStyle = '#ffaa44';ctx.font = '14px Courier New';
        ctx.fillText('\u25B2', elevX, floorY-10);
    }

    // === AIRLOCK (left side, floor 0) ===
    if(wi.floor === 0){
        // Heavy blast door frame
        ctx.fillStyle = '#1a1412';ctx.fillRect(10, ceilY+20, 50, floorY-ceilY-20);
        ctx.strokeStyle = '#332818';ctx.lineWidth = 2;ctx.strokeRect(10, ceilY+20, 50, floorY-ceilY-20);
        // Hazard stripes
        for(let sy=ceilY+25;sy<floorY-5;sy+=20){
            ctx.fillStyle = (Math.floor(sy/20)%2===0)?'#332200':'#221100';
            ctx.fillRect(12, sy, 46, 10);
        }
        // EXIT text
        ctx.fillStyle = '#ff4422';
        ctx.font = 'bold 10px Courier New';ctx.textAlign = 'center';
        ctx.fillText('EXIT', 35, ceilY+50);
        // Status light
        const exitPulse = 0.5+Math.sin(T/300)*0.3;
        ctx.fillStyle = `rgba(255,50,20,${exitPulse})`;
        ctx.beginPath();ctx.arc(35, ceilY+60, 3, 0, Math.PI*2);ctx.fill();
    }

    // === GILBERT (follows player) ===
    if(G.gilbertState !== 'none'){
        _drawWreckGilbert(T, wi, floorY);
    }

    ctx.restore(); // camera translate

    // === PLAYER (drawn in screen space like station) ===
    _drawWreckPlayer(T, wi, floorY);

    // === HUD ===
    // Ship name + deck
    ctx.fillStyle = 'rgba(5,3,2,0.75)';ctx.fillRect(10, 10, 220, 42);
    ctx.strokeStyle = `rgba(${_hexToRgb(def.color)},0.3)`;ctx.lineWidth = 1;ctx.strokeRect(10, 10, 220, 42);
    ctx.fillStyle = def.color;ctx.font = 'bold 12px Courier New';ctx.textAlign = 'left';
    ctx.fillText(def.name, 20, 28);
    ctx.fillStyle = '#888';ctx.font = '10px Courier New';
    ctx.fillText(def.class + '  |  DECK ' + (wi.floor+1) + '/' + def.floors, 20, 44);

    // MB readout
    ctx.fillStyle = 'rgba(5,3,2,0.75)';ctx.fillRect(W-130, 10, 120, 40);
    ctx.strokeStyle = 'rgba(255,215,0,0.25)';ctx.lineWidth = 1;ctx.strokeRect(W-130, 10, 120, 40);
    ctx.font = 'bold 9px Courier New';ctx.textAlign = 'right';ctx.fillStyle = '#554';
    ctx.fillText('CURRENCY', W-18, 27);
    ctx.font = 'bold 18px Courier New';ctx.fillStyle = '#ffdd00';
    ctx.fillText(G.mb+' MB', W-18, 46);

    // Notification
    if(_wreckNotifyTimer > 0){
        _wreckNotifyTimer--;
        ctx.globalAlpha = Math.min(1, _wreckNotifyTimer/30);
        ctx.fillStyle = '#ffdd00';
        ctx.font = 'bold 16px Courier New';ctx.textAlign = 'center';
        ctx.shadowBlur = 8;ctx.shadowColor = '#ff8800';
        ctx.fillText(_wreckNotify, W/2, H/2 - 50);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    // Terminal overlay
    if(wi.terminalOpen){
        _drawWreckTerminal(T, wi, def);
    }

    // Keypad overlay
    if(wi.keypadOpen){
        const door=def.lockedDoors[wi.keypadDoorIdx];
        ctx.fillStyle='rgba(0,0,0,0.82)';ctx.fillRect(0,0,W,H);
        const kw=280,kh=220;
        const kx=W/2-kw/2,ky=H/2-kh/2;
        // Panel
        ctx.fillStyle='#121018';ctx.fillRect(kx,ky,kw,kh);
        ctx.strokeStyle='#ff4422';ctx.lineWidth=2;ctx.strokeRect(kx,ky,kw,kh);
        // Title
        ctx.fillStyle='#ff6644';ctx.font='bold 14px Courier New';ctx.textAlign='center';
        ctx.fillText('ENTER ACCESS CODE',W/2,ky+30);
        ctx.fillStyle='#aa6644';ctx.font='11px Courier New';
        ctx.fillText(door.label,W/2,ky+48);
        // Code display boxes
        for(let d=0;d<4;d++){
            const bx=W/2-52+d*28,by=ky+65;
            ctx.fillStyle='#0a0608';ctx.fillRect(bx,by,22,30);
            ctx.strokeStyle=wi.keypadError>0?'#ff2222':'#443322';ctx.lineWidth=1.5;ctx.strokeRect(bx,by,22,30);
            if(wi.keypadInput.length>d){
                ctx.fillStyle='#ffdd00';ctx.font='bold 20px Courier New';ctx.textAlign='center';
                ctx.fillText(wi.keypadInput[d],bx+11,by+23);
            } else {
                // Blinking cursor on current slot
                if(d===wi.keypadInput.length && Math.floor(T/400)%2===0){
                    ctx.fillStyle='#ffdd00';ctx.fillRect(bx+8,by+22,6,2);
                }
            }
        }
        // Error message
        if(wi.keypadError>0){
            ctx.fillStyle='#ff2222';ctx.font='bold 12px Courier New';ctx.textAlign='center';
            ctx.fillText('INCORRECT CODE',W/2,ky+120);
        }
        // Number pad hint
        ctx.fillStyle='#666';ctx.font='10px Courier New';ctx.textAlign='center';
        ctx.fillText('Type 4-digit code  |  [ENTER] Submit  |  [ESC] Cancel',W/2,ky+150);
        // Hint: show found scraps for this door
        ctx.fillStyle='#886644';ctx.font='10px Courier New';
        const foundHints=[];
        if(def.codeScraps){
            for(let si=0;si<def.codeScraps.length;si++){
                if(wi.scrapsFound.includes(si)){
                    foundHints.push(def.codeScraps[si].hint);
                }
            }
        }
        if(foundHints.length>0){
            ctx.fillStyle='#aa8855';ctx.font='bold 10px Courier New';
            ctx.fillText('CLUES FOUND:',W/2,ky+175);
            ctx.font='9px Courier New';ctx.fillStyle='#887755';
            for(let h=0;h<Math.min(foundHints.length,3);h++){
                ctx.fillText(foundHints[h],W/2,ky+190+h*13);
            }
        }
    }

    // Scrap popup
    if(wi.scrapPopupTimer>0){
        const alpha=Math.min(1,wi.scrapPopupTimer/40);
        ctx.globalAlpha=alpha;
        // Paper note overlay
        const pw=400,ph=60;
        const px=W/2-pw/2,py=H/2-120;
        ctx.fillStyle='#d4c8a0';ctx.fillRect(px,py,pw,ph);
        ctx.strokeStyle='#8a7e60';ctx.lineWidth=1.5;ctx.strokeRect(px,py,pw,ph);
        ctx.fillStyle='#3a2e10';ctx.font='bold 13px Courier New';ctx.textAlign='center';
        ctx.fillText(wi.scrapPopup,W/2,py+25);
        ctx.fillStyle='#665830';ctx.font='10px Courier New';
        ctx.fillText('(Remember this for locked doors!)',W/2,py+45);
        ctx.globalAlpha=1;
    }

    // Interact prompt — add locked door and scrap prompts
    if(wi.interactTarget && !wi.terminalOpen && !wi.keypadOpen){
        const promptPulse = 0.6+Math.sin(T/200)*0.3;
        ctx.globalAlpha = promptPulse;
        ctx.fillStyle = def.color;
        ctx.font = 'bold 14px Courier New';ctx.textAlign = 'center';
        const action = wi.interactTarget.id==='airlock'?'[E] LEAVE WRECK':
                       wi.interactTarget.id==='elevator'?'[E] CHANGE DECK':
                       wi.interactTarget.id==='terminal'?'[E] READ TERMINAL':
                       wi.interactTarget.id==='crate'?'[E] OPEN CRATE':
                       wi.interactTarget.id==='locked_door'?'[E] ENTER CODE':
                       wi.interactTarget.id==='door_loot'?'[E] OPEN LOOT':
                       wi.interactTarget.id==='code_scrap'?'[E] PICK UP NOTE':'[E] INTERACT';
        ctx.fillText(action, W/2, H-70);
        ctx.font = '11px Courier New';ctx.fillStyle = '#aaa';
        ctx.fillText(wi.interactTarget.name, W/2, H-52);
        ctx.globalAlpha = 1;
    }

    // Inventory overlay
    if(typeof drawInventoryOverlay==='function') drawInventoryOverlay();
}

function _drawWreckPlayer(T, wi, floorY){
    ctx.save();
    ctx.translate(-wi.cameraX, 0);
    ctx.save();ctx.translate(wi.playerX, floorY-30);

    // Projector beam
    const beamG = ctx.createLinearGradient(0, 22, 0, -50);
    beamG.addColorStop(0, 'rgba(0,220,255,0.22)');
    beamG.addColorStop(0.5, 'rgba(0,180,255,0.08)');
    beamG.addColorStop(1, 'transparent');
    ctx.fillStyle = beamG;
    ctx.beginPath();
    ctx.moveTo(-22,22);ctx.lineTo(22,22);ctx.lineTo(14,-46);ctx.lineTo(-14,-46);
    ctx.closePath();ctx.fill();

    // Ground disc
    const discPulse = 0.7+Math.sin(T/280)*0.3;
    const discG = ctx.createRadialGradient(0, 22, 0, 0, 22, 26);
    discG.addColorStop(0, `rgba(0,240,255,${discPulse*0.55})`);
    discG.addColorStop(0.6, `rgba(0,150,255,${discPulse*0.18})`);
    discG.addColorStop(1, 'transparent');
    ctx.fillStyle = discG;
    ctx.beginPath();ctx.ellipse(0, 22, 26, 6, 0, 0, Math.PI*2);ctx.fill();
    ctx.strokeStyle = `rgba(0,240,255,${discPulse*0.8})`;ctx.lineWidth = 1;
    ctx.beginPath();ctx.ellipse(0, 22, 22, 5, 0, 0, Math.PI*2);ctx.stroke();

    const facing = wi.playerFacing;
    ctx.scale(facing, 1);
    const walking = Math.abs(wi.playerVX) > 0.3;
    const walkPhase = walking ? T/150 : 0;
    const legSwing = Math.sin(walkPhase)*6;
    const armSwing = Math.sin(walkPhase)*4;
    const bodyBob = walking ? Math.abs(Math.sin(walkPhase*2))*2 : Math.sin(T/600)*0.8;
    const idleFloat = walking ? 0 : Math.sin(T/800)*1.5;
    const totalBob = bodyBob + idleFloat;
    const baseAlpha = 0.78 + Math.sin(T/300)*0.08;

    const drawFig = (off, col, alpha) => {
        ctx.save();ctx.translate(off, 0);
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 18;ctx.shadowColor = col;
        ctx.fillStyle = col;
        ctx.beginPath();ctx.arc(0, -28+totalBob, 8, 0, Math.PI*2);ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(2, -30+totalBob, 5, 3);
        ctx.strokeStyle = col;ctx.lineWidth = 1.5;
        ctx.beginPath();ctx.moveTo(0, -36+totalBob);ctx.lineTo(0, -40+totalBob);ctx.stroke();
        ctx.fillStyle = '#fff';ctx.beginPath();ctx.arc(0, -40+totalBob, 1.6, 0, Math.PI*2);ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(-7, -20+totalBob);ctx.lineTo(7, -20+totalBob);
        ctx.lineTo(6, 6+totalBob);ctx.lineTo(-6, 6+totalBob);
        ctx.closePath();ctx.fill();
        ctx.save();ctx.translate(-8, -16+totalBob);ctx.rotate((-armSwing)*Math.PI/60);
        ctx.fillRect(-2, 0, 4, 14);ctx.restore();
        ctx.save();ctx.translate(8, -16+totalBob);ctx.rotate((armSwing)*Math.PI/60);
        ctx.fillRect(-2, 0, 4, 14);ctx.restore();
        ctx.save();ctx.translate(-3, 6+totalBob);ctx.rotate((legSwing)*Math.PI/80);
        ctx.fillRect(-2, 0, 4, 14);ctx.fillRect(-3, 13, 5, 3);ctx.restore();
        ctx.save();ctx.translate(3, 6+totalBob);ctx.rotate((-legSwing)*Math.PI/80);
        ctx.fillRect(-2, 0, 4, 14);ctx.fillRect(-3, 13, 5, 3);ctx.restore();
        ctx.shadowBlur = 0;
        ctx.restore();
    };
    drawFig(1, 'rgba(255,80,140,0.55)', baseAlpha*0.65);
    drawFig(-1, 'rgba(0,220,255,0.65)', baseAlpha*0.75);
    drawFig(0, '#00ddee', baseAlpha);

    ctx.globalAlpha = 1;ctx.shadowBlur = 0;
    ctx.restore();
    ctx.restore();
}

function _drawWreckGilbert(T, wi, floorY){
    const gx = wi.gilbertX;
    const gy = floorY - 35;
    const walking = Math.abs(wi.gilbertVX) > 0.2;
    const bob = walking ? Math.abs(Math.sin(T/140))*2 : Math.sin(T/700)*1;

    ctx.save();ctx.translate(gx, gy - bob);

    // Shadow
    ctx.fillStyle = 'rgba(0,255,0,0.08)';
    ctx.beginPath();ctx.ellipse(0, 35+bob, 14, 4, 0, 0, Math.PI*2);ctx.fill();

    // Body — octagonal
    ctx.fillStyle = '#225522';ctx.strokeStyle = '#44ff44';ctx.lineWidth = 1.5;
    ctx.beginPath();
    for(let i=0;i<8;i++){
        const a = Math.PI*2/8*i - Math.PI/8;
        const r = 14;
        ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();ctx.fill();ctx.stroke();

    // Eye
    const eyePulse = 0.6+Math.sin(T/400)*0.2;
    ctx.fillStyle = `rgba(68,255,68,${eyePulse})`;
    ctx.beginPath();ctx.arc(wi.gilbertFacing*3, -2, 4, 0, Math.PI*2);ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();ctx.arc(wi.gilbertFacing*4, -3, 1.5, 0, Math.PI*2);ctx.fill();

    // Name
    ctx.fillStyle = '#44ff44';ctx.font = 'bold 8px Courier New';ctx.textAlign = 'center';
    ctx.fillText('GILBERT', 0, -22);

    ctx.restore();
}

function _drawWreckTerminal(T, wi, def){
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, W, H);

    const tw = 560, th = 400;
    const tx = W/2-tw/2, ty = H/2-th/2;

    // Title bar
    ctx.fillStyle = '#1a1008';ctx.fillRect(tx, ty, tw, 22);
    ctx.fillStyle = def.color;ctx.font = 'bold 12px Consolas';ctx.textAlign = 'left';
    ctx.fillText(def.name + ' — DATA TERMINAL', tx+8, ty+15);

    // Body
    const bgG = ctx.createLinearGradient(tx, ty+22, tx, ty+th);
    bgG.addColorStop(0, 'rgba(8,4,2,0.98)');
    bgG.addColorStop(1, 'rgba(4,2,1,0.98)');
    ctx.fillStyle = bgG;ctx.fillRect(tx, ty+22, tw, th-22);
    ctx.strokeStyle = def.color;ctx.lineWidth = 2;
    ctx.strokeRect(tx, ty, tw, th);
    ctx.strokeRect(tx, ty, tw, 22);

    // Log text
    const lines = wi.terminalText || [];
    const lineH = 18;
    const maxVisible = Math.floor((th-60)/lineH);
    const start = Math.min(wi.terminalScroll, Math.max(0, lines.length - maxVisible));
    let curY = ty + 44;
    ctx.font = '13px Consolas';ctx.textAlign = 'left';
    for(let i=start;i<Math.min(start+maxVisible, lines.length);i++){
        ctx.fillStyle = '#ccaa88';
        ctx.fillText(lines[i], tx+16, curY);
        curY += lineH;
    }

    // Scroll indicator
    if(lines.length > maxVisible){
        ctx.fillStyle = '#666';ctx.font = '10px Consolas';ctx.textAlign = 'right';
        ctx.fillText('[UP/DOWN] Scroll  ('+(start+1)+'/'+Math.max(1,lines.length-maxVisible+1)+')', tx+tw-12, ty+th-30);
    }

    // Close hint
    ctx.font = '10px Consolas';ctx.fillStyle = '#555';ctx.textAlign = 'right';
    ctx.fillText('[ESC] Close terminal', tx+tw-12, ty+th-10);

    // Scanline effect
    ctx.strokeStyle = `rgba(${_hexToRgb(def.color)},0.04)`;ctx.lineWidth = 1;
    for(let sy=ty+24;sy<ty+th;sy+=3){
        ctx.beginPath();ctx.moveTo(tx+2, sy);ctx.lineTo(tx+tw-2, sy);ctx.stroke();
    }
}

// Utility: hex color to "r,g,b" string
function _hexToRgb(hex){
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return r+','+g+','+b;
}

// --- Drawing interactive wrecks in space view ---
function _drawSpaceShipShape(def, wr, T){
    const explored = wr.explored;
    const hullCol = explored ? '#0d0906' : '#1e1614';
    const hullStroke = explored ? '#2a1a10' : def.color;
    const darkCol = explored ? '#060403' : '#0a0806';

    if(def.spaceShape === 'freighter'){
        // === CARGO FREIGHTER — big boxy hull with cargo containers and engine nacelles ===
        // Engine nacelles (back)
        ctx.fillStyle = darkCol; ctx.strokeStyle = '#333';ctx.lineWidth=1.5;
        ctx.fillRect(-85,-22,18,10);ctx.strokeRect(-85,-22,18,10);
        ctx.fillRect(-85,12,18,10);ctx.strokeRect(-85,12,18,10);
        // Engine glow
        const eFlick=0.2+Math.sin(T/200+wr.x)*0.15;
        ctx.fillStyle=`rgba(255,120,30,${eFlick})`;
        ctx.fillRect(-87,-20,4,6);ctx.fillRect(-87,14,4,6);

        // Main hull body
        ctx.fillStyle=hullCol;ctx.strokeStyle=hullStroke;ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(-67,-20);ctx.lineTo(50,-22);ctx.lineTo(72,-14);ctx.lineTo(78,-4);
        ctx.lineTo(78,4);ctx.lineTo(72,14);ctx.lineTo(50,22);ctx.lineTo(-67,20);
        ctx.closePath();ctx.fill();ctx.stroke();

        // Cargo containers (stacked boxes on top)
        ctx.fillStyle=explored?'#080604':'#151010';ctx.strokeStyle='#2a2018';ctx.lineWidth=1;
        ctx.fillRect(-40,-18,25,10);ctx.strokeRect(-40,-18,25,10);
        ctx.fillRect(-10,-20,30,12);ctx.strokeRect(-10,-20,30,12);
        ctx.fillRect(25,-16,20,8);ctx.strokeRect(25,-16,20,8);
        // Bottom containers
        ctx.fillRect(-30,10,22,8);ctx.strokeRect(-30,10,22,8);
        ctx.fillRect(0,12,28,8);ctx.strokeRect(0,12,28,8);

        // Bridge (front top)
        ctx.fillStyle=explored?'#050304':'#121018';ctx.strokeStyle=hullStroke;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(55,-14);ctx.lineTo(72,-10);ctx.lineTo(78,-4);
        ctx.lineTo(72,-6);ctx.lineTo(55,-8);ctx.closePath();ctx.fill();ctx.stroke();
        // Cockpit window
        ctx.fillStyle=explored?'#040306':'rgba(100,180,255,0.15)';
        ctx.fillRect(62,-11,10,4);

        // Hull plating lines
        ctx.strokeStyle='rgba(100,80,60,0.2)';ctx.lineWidth=0.5;
        for(let lx=-60;lx<70;lx+=20){ctx.beginPath();ctx.moveTo(lx,-20);ctx.lineTo(lx,20);ctx.stroke();}

    } else if(def.spaceShape === 'cruiser'){
        // === PATROL CRUISER — sleek military ship with angular armor and weapon pods ===
        // Engine block
        ctx.fillStyle=darkCol;ctx.strokeStyle='#334';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(-68,-8);ctx.lineTo(-58,-12);ctx.lineTo(-58,12);ctx.lineTo(-68,8);ctx.closePath();ctx.fill();ctx.stroke();
        const eFlick=0.25+Math.sin(T/180+wr.x)*0.15;
        ctx.fillStyle=`rgba(80,160,255,${eFlick})`;
        ctx.fillRect(-70,-6,4,12);

        // Main hull — angular military design
        ctx.fillStyle=hullCol;ctx.strokeStyle=hullStroke;ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(-58,-12);ctx.lineTo(-20,-16);ctx.lineTo(30,-12);
        ctx.lineTo(60,-6);ctx.lineTo(70,0);ctx.lineTo(60,6);
        ctx.lineTo(30,12);ctx.lineTo(-20,16);ctx.lineTo(-58,12);
        ctx.closePath();ctx.fill();ctx.stroke();

        // Wings / weapon pylons
        ctx.fillStyle=explored?'#0a0706':'#161420';ctx.strokeStyle=hullStroke;ctx.lineWidth=1.5;
        // Top wing
        ctx.beginPath();ctx.moveTo(-30,-12);ctx.lineTo(-10,-28);ctx.lineTo(15,-24);ctx.lineTo(10,-12);ctx.closePath();ctx.fill();ctx.stroke();
        // Bottom wing
        ctx.beginPath();ctx.moveTo(-30,12);ctx.lineTo(-10,28);ctx.lineTo(15,24);ctx.lineTo(10,12);ctx.closePath();ctx.fill();ctx.stroke();
        // Weapon pods on wing tips
        ctx.fillStyle='#1a1420';ctx.strokeStyle='#445';ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(-5,-26,4,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.arc(-5,26,4,0,Math.PI*2);ctx.fill();ctx.stroke();

        // Cockpit canopy
        ctx.fillStyle=explored?'#030206':'rgba(80,140,255,0.2)';
        ctx.beginPath();ctx.moveTo(45,-5);ctx.lineTo(65,-2);ctx.lineTo(70,0);ctx.lineTo(65,2);ctx.lineTo(45,5);ctx.closePath();ctx.fill();

        // Armor plate lines
        ctx.strokeStyle='rgba(80,100,140,0.2)';ctx.lineWidth=0.5;
        ctx.beginPath();ctx.moveTo(-40,0);ctx.lineTo(55,0);ctx.stroke();
        ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(30,-6);ctx.stroke();
        ctx.beginPath();ctx.moveTo(0,12);ctx.lineTo(30,6);ctx.stroke();

    } else if(def.spaceShape === 'science'){
        // === RESEARCH VESSEL — rounded hull with sensor dish and lab module ===
        // Sensor dish (back top)
        ctx.strokeStyle=explored?'#221a12':def.color;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(-35,-22,12,Math.PI*0.8,Math.PI*2.2);ctx.stroke();
        ctx.fillStyle=explored?'#0a0806':'#18141e';
        ctx.beginPath();ctx.arc(-35,-22,4,0,Math.PI*2);ctx.fill();
        // Dish arm
        ctx.strokeStyle='#2a2020';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(-35,-14);ctx.lineTo(-35,-18);ctx.stroke();

        // Main hull — rounded elliptical
        ctx.fillStyle=hullCol;ctx.strokeStyle=hullStroke;ctx.lineWidth=2;
        ctx.beginPath();ctx.ellipse(0,0,65,18,0,0,Math.PI*2);ctx.fill();ctx.stroke();

        // Lab module (bottom bulge)
        ctx.fillStyle=explored?'#080604':'#141018';ctx.strokeStyle=hullStroke;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.ellipse(10,14,30,10,0,0,Math.PI);ctx.fill();ctx.stroke();
        // Lab windows
        ctx.fillStyle=explored?'#040306':'rgba(180,100,255,0.15)';
        for(let lw=-10;lw<=30;lw+=12){ctx.fillRect(lw,18,6,3);}

        // Engine (back)
        ctx.fillStyle=darkCol;ctx.strokeStyle='#334';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(-62,-10);ctx.lineTo(-55,-14);ctx.lineTo(-55,14);ctx.lineTo(-62,10);ctx.closePath();ctx.fill();ctx.stroke();
        const eFlick=0.2+Math.sin(T/220+wr.x)*0.15;
        ctx.fillStyle=`rgba(180,80,255,${eFlick})`;
        ctx.fillRect(-64,-8,4,16);

        // Cockpit
        ctx.fillStyle=explored?'#030206':'rgba(140,120,255,0.15)';
        ctx.beginPath();ctx.ellipse(55,0,12,8,0,-Math.PI*0.4,Math.PI*0.4);ctx.fill();

        // Hull stripes
        ctx.strokeStyle=`rgba(${_hexToRgb(def.color)},0.15)`;ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(-50,0);ctx.lineTo(50,0);ctx.stroke();

    } else {
        // === ESCAPE POD CLUSTER — three pods fused together with heat damage ===
        const pods=[{x:-18,y:-8,r:13},{x:12,y:-10,r:11},{x:4,y:10,r:12}];
        for(const p of pods){
            ctx.fillStyle=hullCol;ctx.strokeStyle=hullStroke;ctx.lineWidth=1.5;
            ctx.beginPath();
            // Capsule shape (rounded rect-ish)
            ctx.ellipse(p.x,p.y,p.r,p.r*0.7,Math.atan2(p.y,p.x)*0.3,0,Math.PI*2);
            ctx.fill();ctx.stroke();
            // Window
            ctx.fillStyle=explored?'#030206':'rgba(255,200,50,0.12)';
            ctx.beginPath();ctx.arc(p.x+p.r*0.4,p.y-p.r*0.2,2.5,0,Math.PI*2);ctx.fill();
            // Mini thruster
            ctx.fillStyle='#0a0806';
            ctx.fillRect(p.x-p.r-3,p.y-3,4,6);
        }
        // Heat fusion lines between pods
        ctx.strokeStyle='rgba(255,80,20,0.25)';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(pods[0].x+5,pods[0].y+5);ctx.lineTo(pods[2].x-3,pods[2].y-5);ctx.stroke();
        ctx.beginPath();ctx.moveTo(pods[0].x+10,pods[0].y);ctx.lineTo(pods[1].x-5,pods[1].y);ctx.stroke();
    }

    // === Common damage details ===
    // Breach holes
    const breachSeed = (def.id.charCodeAt(0)*7)%10;
    for(let b=0;b<3;b++){
        const ba = breachSeed+b*2.1;
        const bx = Math.cos(ba)*25+Math.sin(b*3)*10;
        const by = Math.sin(ba)*10;
        const bs = 3+b*1.5;
        ctx.fillStyle='#030108';ctx.beginPath();ctx.arc(bx,by,bs,0,Math.PI*2);ctx.fill();
        const ef=0.3+Math.sin(T/200+b*3)*0.2;
        ctx.strokeStyle=`rgba(255,60,15,${ef})`;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(bx,by,bs+1,ba,ba+1.5);ctx.stroke();
    }

    // Scorch marks
    ctx.fillStyle='rgba(30,10,5,0.3)';
    ctx.beginPath();ctx.arc(15,-5,8,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(-25,8,6,0,Math.PI*2);ctx.fill();
}

function drawInteractiveWrecks(){
    if(!interactiveWrecks.length) return;
    const T = performance.now();

    for(const wr of interactiveWrecks){
        wr.x += wr.drift;
        wr.rot += wr.drift * 0.001;
        if(wr.x < -200) wr.x = W + 200;
        if(wr.x > W + 200) wr.x = -200;

        const def = WRECK_TYPES[wr.type];

        ctx.save();
        ctx.translate(wr.x, wr.y);
        ctx.rotate(wr.rot);
        ctx.scale(wr.scale, wr.scale);

        _drawSpaceShipShape(def, wr, T);

        // Interaction indicator (pulsing ring when close enough)
        if(typeof ship!=='undefined'){
            const dist = Math.hypot(ship.x-wr.x, ship.y-wr.y);
            if(dist < 120){
                ctx.strokeStyle = def.color;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.4+Math.sin(T/200)*0.3;
                ctx.beginPath();ctx.arc(0,0,Math.max(75,85/wr.scale),0,Math.PI*2);ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        if(wr.explored){
            ctx.fillStyle = 'rgba(100,80,60,0.4)';
            ctx.font = 'bold 8px Courier New';ctx.textAlign = 'center';
            ctx.fillText('EXPLORED', 0, -32);
        }

        ctx.restore();
    }

    // Proximity prompt (drawn in screen space)
    if(typeof ship!=='undefined'){
        for(const wr of interactiveWrecks){
            const dist = Math.hypot(ship.x-wr.x, ship.y-wr.y);
            if(dist < 100){
                const def = WRECK_TYPES[wr.type];
                const pulse = 0.6+Math.sin(T/200)*0.3;
                ctx.globalAlpha = pulse;
                ctx.fillStyle = def.color;
                ctx.font = 'bold 13px Courier New';ctx.textAlign = 'center';
                ctx.fillText('[E] BOARD '+def.name, wr.x, wr.y - 50);
                ctx.font = '10px Courier New';ctx.fillStyle = '#aaa';
                ctx.fillText(def.class, wr.x, wr.y - 35);
                ctx.globalAlpha = 1;
                break;
            }
        }
    }
}

// Dev helper
function devSpawnWreck(){
    spawnInteractiveWreck(true);
}
function devSpawnWreckType(idx){
    const wreck = {
        type: Math.min(idx, WRECK_TYPES.length-1),
        x: ship.x + 200,
        y: ship.y,
        rot: Math.random()*Math.PI*2,
        drift: (Math.random()-0.5)*0.04,
        scale: 1.2 + Math.random()*0.5,
        explored: false,
        looted: [],
        unlockedDoors: [],
        doorLootCollected: [],
    };
    interactiveWrecks.push(wreck);
}

// Data fragment spawner for crate loot
function spawnDataFragment(){
    // Reuse the existing data fragment system if available
    if(typeof G.dataFragmentsSeen!=='undefined' && typeof DATA_FRAGMENTS!=='undefined'){
        const unseen = DATA_FRAGMENTS.filter((_,i) => !G.dataFragmentsSeen.includes(i));
        if(unseen.length > 0){
            const frag = unseen[Math.floor(Math.random()*unseen.length)];
            const idx = DATA_FRAGMENTS.indexOf(frag);
            G.dataFragmentsSeen.push(idx);
            G.dataFragmentPopup = {text: frag.source+': '+frag.file, timer:240};
            if(typeof awardKeyItem==='function'){
                awardKeyItem('fragment_'+frag.id, frag.source+' — '+frag.file, frag.text);
            }
        } else {
            // All fragments found — give MB instead
            G.mb += 100;
            _wreckQuip('All fragments found! +100 MB');
        }
    }
}
