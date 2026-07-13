// ============================================================
//  ACHIEVEMENT SYSTEM
// ============================================================
const ACH_DEFS = [
    { id:'first_blood',    icon:'💥', name:'First Blood',     desc:'Destroy your first asteroid' },
    { id:'sharpshooter',   icon:'🎯', name:'Sharpshooter',    desc:'Reach a 5x combo' },
    { id:'combo_king',     icon:'👑', name:'Combo King',      desc:'Hit the maximum 8x combo' },
    { id:'graduate',       icon:'🎓', name:'Graduate',        desc:'Complete the tutorial' },
    { id:'boss_slayer',    icon:'⚔️', name:'Boss Slayer',     desc:'Defeat Boss 1' },
    { id:'commander',      icon:'🛡️', name:'Commander',       desc:'Defeat Boss 2' },
    { id:'determination',  icon:'💀', name:'Determination',   desc:'Defeat Sans (Boss 3)' },
    { id:'survivor',       icon:'✨', name:'Survivor',        desc:'Reach Level 3 in a single run' },
    { id:'shield_up',      icon:'🔵', name:'Shield Up',       desc:'Pick up the force field' },
    { id:'fuel_collector', icon:'⛽', name:'Fuel Collector',  desc:'Collect 5 fuel pickups in one game' },
    { id:'stockpile',      icon:'📦', name:'Stockpile',       desc:'Have 100+ ammo at once' },
    { id:'triple_threat',  icon:'🔱', name:'Triple Threat',   desc:'Destroy an enemy with triple shot' },
    { id:'speed_demon',    icon:'⚡', name:'Speed Demon',     desc:'Beat the game in under 8 minutes' },
    { id:'marksman',       icon:'🏅', name:'Marksman',        desc:'Reach 10,000 points' },
    { id:'high_roller',    icon:'🏆', name:'High Roller',     desc:'Reach 25,000 points' },
    { id:'legend',         icon:'🌟', name:'Legend',           desc:'Reach 50,000 points' },
    { id:'rock_crusher',   icon:'🪨', name:'Rock Crusher',    desc:'Destroy 100 asteroids in one game' },
    { id:'bounty_hunter',  icon:'🎪', name:'Bounty Hunter',   desc:'Defeat 5 mini bosses in one game' },
    { id:'last_stand',     icon:'💎', name:'Last Stand',       desc:'Survive a hit with only 1 shield pip left' },
    { id:'perfectionist',  icon:'🏅', name:'Perfectionist',   desc:'Unlock all other achievements' },
    { id:'dlc_beyond',         icon:'🚀', name:'Beyond',          desc:'Reach Level 5' },
    { id:'dlc_endless',        icon:'♾️', name:'Endless Voyager', desc:'Reach Level 7' },
    { id:'dlc_galactic_hero',  icon:'🌌', name:'Galactic Hero',   desc:'Score 100,000 points' },
    { id:'dlc_trigger_happy',  icon:'🔫', name:'Trigger Happy',   desc:'Fire 500 shots in one game' },
    { id:'dlc_chain_reaction', icon:'⛓️', name:'Chain Reaction',  desc:'Destroy 10 enemies without breaking combo' },
    { id:'dlc_mass_destroyer', icon:'☄️', name:'Mass Destroyer',  desc:'Destroy 250 asteroids in one game' },
    { id:'dlc_untouchable',    icon:'👻', name:'Untouchable',     desc:'Beat Sans without taking any damage' },
    { id:'dlc_naked_run',      icon:'🔥', name:'Naked Run',       desc:'Beat Sans without using the shield' },
    { id:'dlc_hoarder',        icon:'🐿️', name:'Hoarder',        desc:'Have 200+ ammo at once' },
    { id:'dlc_exterminator',   icon:'🗡️', name:'Exterminator',   desc:'Defeat 10 mini bosses in one game' },
    { id:'dlc_short_circuit',  icon:'🤖', name:'Short Circuit',  desc:'Defeat the Cyborg boss' },
    { id:'dlc_gilberts_friend', icon:'💚', name:"Gilbert's Friend", desc:'Rescue and repair Gilbert' },
    { id:'dlc_serpent_slayer', icon:'🐍', name:'Serpent Slayer', desc:'Defeat the Snake boss' },
    { id:'dlc_nightmares_end', icon:'🔥', name:"Nightmare's End", desc:'Defeat the Nightmare King Grimm' },
    { id:'dlc_protocol_breach', icon:'👁️', name:'Protocol Breach', desc:'Witness the deletion of NEXUS-0' }
];

let achUnlocked = {};
let achNotifyQueue = [];
let achNotifyTimer = 0;

function loadAchievements() {
    const s = localStorage.getItem('ast_rem_ach');
    if (s) achUnlocked = JSON.parse(s);
}
function saveAchievements() {
    localStorage.setItem('ast_rem_ach', JSON.stringify(achUnlocked));
}
function unlockAch(id) {
    if (achUnlocked[id]) return; // already unlocked
    if (id === 'perfectionist') return; // handled separately
    achUnlocked[id] = Date.now();
    saveAchievements();
    achNotifyQueue.push(id);
    // Check perfectionist
    const nonPerfect = ACH_DEFS.filter(a => a.id !== 'perfectionist');
    if (nonPerfect.every(a => achUnlocked[a.id])) {
        achUnlocked['perfectionist'] = Date.now();
        saveAchievements();
        achNotifyQueue.push('perfectionist');
    }
}
function updateAchNotify() {
    if (achNotifyTimer > 0) { achNotifyTimer--; return; }
    const el = document.getElementById('achNotify');
    if (el.classList.contains('show')) {
        el.classList.remove('show');
        achNotifyTimer = 30; // brief gap between notifications
        return;
    }
    if (achNotifyQueue.length > 0) {
        const id = achNotifyQueue.shift();
        if(id==='_daily_'){
            document.getElementById('achNotifyIcon').innerText='📋';
            document.getElementById('achNotifyName').innerText='Daily Mission Complete!';
            document.getElementById('achNotifyDesc').innerText='+3000 Score';
            el.classList.add('show');
            achNotifyTimer=180;
            try{Sound.powerup();}catch(e){}
        } else {
            const def = ACH_DEFS.find(a => a.id === id);
            if (def) {
                document.getElementById('achNotifyIcon').innerText = def.icon;
                document.getElementById('achNotifyName').innerText = def.name;
                document.getElementById('achNotifyDesc').innerText = def.desc;
                el.classList.add('show');
                achNotifyTimer = 180;
                try { Sound.powerup(); } catch(e) {}
            }
        }
    }
}
function openAchievements() {
    try { Sound.ui(); } catch(e) {}
    document.getElementById('menuScreen').style.display = 'none';
    // Daily mission
    const dm=getDailyMission();
    const done=isDailyComplete();
    document.getElementById('dailyMissionDesc').innerText=dm.desc;
    const statusEl=document.getElementById('dailyMissionStatus');
    if(done){
        statusEl.style.color='#00ff00';statusEl.innerText='✓ COMPLETED — +3000 Score earned!';
    } else {
        statusEl.style.color='#ffaa00';statusEl.innerText='○ In Progress — Play a game to complete!';
    }
    // Achievements
    const grid = document.getElementById('achGrid');
    const unlockCount = ACH_DEFS.filter(a => achUnlocked[a.id]).length;
    document.getElementById('achProgress').innerText = unlockCount + ' / ' + ACH_DEFS.length + ' UNLOCKED';
    grid.innerHTML = '';
    for (const a of ACH_DEFS) {
        const unlocked = !!achUnlocked[a.id];
        const card = document.createElement('div');
        card.className = 'ach-card' + (unlocked ? ' unlocked' : '');
        card.innerHTML = `<span class="card-icon">${a.icon}</span><div class="card-info"><div class="card-name">${unlocked ? a.name : '???'}</div><div class="card-desc">${a.desc}</div></div>`;
        grid.appendChild(card);
    }
    document.getElementById('achScreen').style.display = 'block';
}
function closeAchievements() {
    try { Sound.ui(); } catch(e) {}
    document.getElementById('achScreen').style.display = 'none';
    document.getElementById('menuScreen').style.display = 'block';
}
loadAchievements();

// ============================================================
//  DAILY MISSION
// ============================================================
const DAILY_MISSIONS = [
    { id:'dm_asteroids_50',  desc:'Destroy 50 asteroids in one game',    check:()=>G.asteroidsDestroyed>=50 },
    { id:'dm_asteroids_100', desc:'Destroy 100 asteroids in one game',   check:()=>G.asteroidsDestroyed>=100 },
    { id:'dm_score_5k',      desc:'Score 5,000 points in one game',      check:()=>G.score>=5000 },
    { id:'dm_score_15k',     desc:'Score 15,000 points in one game',     check:()=>G.score>=15000 },
    { id:'dm_score_30k',     desc:'Score 30,000 points in one game',     check:()=>G.score>=30000 },
    { id:'dm_combo_5',       desc:'Reach a 5x combo',                    check:()=>G.combo>=15 },
    { id:'dm_combo_8',       desc:'Reach the max 8x combo',             check:()=>G.combo>=24 },
    { id:'dm_miniboss_3',    desc:'Defeat 3 mini-bosses in one game',    check:()=>G.miniBossKills>=3 },
    { id:'dm_miniboss_5',    desc:'Defeat 5 mini-bosses in one game',    check:()=>G.miniBossKills>=5 },
    { id:'dm_boss1',         desc:'Defeat Boss 1',                       check:()=>G.totalBossesDefeated>=1 },
    { id:'dm_boss2',         desc:'Defeat Boss 2',                       check:()=>G.totalBossesDefeated>=2 },
    { id:'dm_no_damage_b1',  desc:'Defeat Boss 1 without taking damage', check:()=>G.totalBossesDefeated>=1&&!G.damageTakenThisBoss },
    { id:'dm_ammo_150',      desc:'Have 150+ ammo at once',              check:()=>G.peakAmmo>=150 },
    { id:'dm_fuel_3',        desc:'Collect 3 shield fuel pickups',       check:()=>G.fuelCollected>=3 },
    { id:'dm_shots_200',     desc:'Fire 200 shots in one game',          check:()=>G.shotsFired>=200 },
    { id:'dm_level_3',       desc:'Reach Level 3',                       check:()=>G.level>=3 },
    { id:'dm_survive_2min',  desc:'Survive for 2 minutes',               check:()=>(performance.now()-G.gameStartTime)/1000>=120 },
    { id:'dm_asteroids_30_nodmg', desc:'Destroy 30 asteroids without taking damage', check:()=>G.asteroidsDestroyed>=30&&!G.damageTakenThisBoss },
];

function getDailyMission(){
    // Seed from today's date so everyone gets the same mission
    const today=new Date();
    const seed=today.getFullYear()*10000+(today.getMonth()+1)*100+today.getDate();
    const idx=seed%DAILY_MISSIONS.length;
    return DAILY_MISSIONS[idx];
}
function getDailyKey(){
    const today=new Date();
    return 'ast_daily_'+today.getFullYear()+'_'+(today.getMonth()+1)+'_'+today.getDate();
}
function isDailyComplete(){
    return !!localStorage.getItem(getDailyKey());
}
function completeDailyMission(){
    if(isDailyComplete()) return;
    localStorage.setItem(getDailyKey(),'1');
    G.score+=3000;
    // Show as achievement-style notification
    achNotifyQueue.push('_daily_');
    updateUI();
}
let dailyMissionChecked=false; // prevent multiple completions per frame

// ============================================================
//  SHIELD UI
// ============================================================
function getMaxShieldFuel() { return 3+(G.upgrades.hull||0); }
function updateShieldUI() {
    const show = G.hasForceField;
    document.getElementById('shieldRow').style.display = show ? 'block' : 'none';
    const maxPips = getMaxShieldFuel();
    const container = document.getElementById('shieldPips');
    // Rebuild pips if count changed
    while(container.children.length < maxPips){
        const span = document.createElement('span');
        span.className = 'pip';
        span.id = 'pip'+container.children.length;
        container.appendChild(span);
    }
    while(container.children.length > maxPips) container.removeChild(container.lastChild);
    for (let i=0;i<maxPips;i++) {
        document.getElementById('pip'+i).className = 'pip' + (i < G.shieldFuel ? ' on' : '');
    }
}

