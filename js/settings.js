// ============================================================
//  SETTINGS SYSTEM
// ============================================================
const settings = {
    masterVol: 80, musicVol: 80, sfxVol: 80,
    shake: 'full', particles: 'full', starCount: 120,
    timer: 'on', bosshp: 'fraction',
    keybinds: {
        thrust: ['KeyW','ArrowUp'],
        left:   ['KeyA','ArrowLeft'],
        right:  ['KeyD','ArrowRight'],
        fire:   ['Space']
    }
};
const DEFAULT_KEYBINDS = {
    thrust: ['KeyW','ArrowUp'],
    left:   ['KeyA','ArrowLeft'],
    right:  ['KeyD','ArrowRight'],
    fire:   ['Space']
};
let listeningForBind = null; // which action we're rebinding

function loadSettings() {
    const s = localStorage.getItem('ast_rem_settings');
    if (s) Object.assign(settings, JSON.parse(s));
    // Apply to UI inputs
    document.getElementById('set_masterVol').value = settings.masterVol;
    document.getElementById('set_musicVol').value = settings.musicVol;
    document.getElementById('set_sfxVol').value = settings.sfxVol;
    document.getElementById('set_shake').value = settings.shake;
    document.getElementById('set_particles').value = settings.particles;
    document.getElementById('set_stars').value = settings.starCount;
    document.getElementById('set_timer').value = settings.timer;
    document.getElementById('set_bosshp').value = settings.bosshp;
    if(!settings.keybinds) settings.keybinds=JSON.parse(JSON.stringify(DEFAULT_KEYBINDS));
    updateKeybindUI();
    applySettings();
}
function saveSettings() {
    localStorage.setItem('ast_rem_settings', JSON.stringify(settings));
}
function applySettings() {
    settings.masterVol = parseInt(document.getElementById('set_masterVol').value);
    settings.musicVol = parseInt(document.getElementById('set_musicVol').value);
    settings.sfxVol = parseInt(document.getElementById('set_sfxVol').value);
    settings.shake = document.getElementById('set_shake').value;
    settings.particles = document.getElementById('set_particles').value;
    settings.starCount = parseInt(document.getElementById('set_stars').value);
    settings.timer = document.getElementById('set_timer').value;
    settings.bosshp = document.getElementById('set_bosshp').value;

    // Update display values
    document.getElementById('set_masterVol_val').innerText = settings.masterVol;
    document.getElementById('set_musicVol_val').innerText = settings.musicVol;
    document.getElementById('set_sfxVol_val').innerText = settings.sfxVol;
    document.getElementById('set_stars_val').innerText = settings.starCount;

    // Apply audio volumes
    if (Sound.master) Sound.master.gain.value = (settings.masterVol / 100) * (settings.sfxVol / 100) * 0.6;
    const mv = settings.musicVol / 100 * (settings.masterVol / 100) * 0.8;
    if (Sound.bgmAudio) Sound.bgmAudio.volume = Sound.muted ? 0 : mv;
    if (Sound.boss3Audio) Sound.boss3Audio.volume = Sound.muted ? 0 : mv;
    if (Sound.boss3P2Audio) Sound.boss3P2Audio.volume = Sound.muted ? 0 : mv;
    if (Sound.boss5Audio) Sound.boss5Audio.volume = Sound.muted ? 0 : mv;

    // Apply star density
    while (stars.length > settings.starCount) stars.pop();
    while (stars.length < settings.starCount) stars.push({ x: Math.random()*W, y: Math.random()*H, size: Math.random()*1.8+0.2, speed: Math.random()*0.3+0.1, alpha: Math.random()*0.6+0.2 });

    // Timer display
    document.getElementById('timeRow').style.display = settings.timer === 'on' ? 'block' : 'none';

    saveSettings();
}
function openSettings() {
    try { Sound.ui(); } catch(e) {}
    document.getElementById('menuScreen').style.display = 'none';
    document.getElementById('settingsMenu').style.display = 'block';
}
function closeSettings() {
    try { Sound.ui(); } catch(e) {}
    document.getElementById('settingsMenu').style.display = 'none';
    document.getElementById('menuScreen').style.display = 'block';
}
function resetSettings() {
    Sound.ui();
    settings.masterVol=80; settings.musicVol=80; settings.sfxVol=80;
    settings.shake='full'; settings.particles='full'; settings.starCount=120;
    settings.timer='on'; settings.bosshp='fraction';
    settings.keybinds=JSON.parse(JSON.stringify(DEFAULT_KEYBINDS));
    document.getElementById('set_masterVol').value=80;
    document.getElementById('set_musicVol').value=80;
    document.getElementById('set_sfxVol').value=80;
    document.getElementById('set_shake').value='full';
    document.getElementById('set_particles').value='full';
    document.getElementById('set_stars').value=120;
    document.getElementById('set_timer').value='on';
    document.getElementById('set_bosshp').value='fraction';
    updateKeybindUI();
    applySettings();
}

// --- KEYBIND SYSTEM ---
function codeToLabel(code) {
    const map={
        'KeyA':'A','KeyB':'B','KeyC':'C','KeyD':'D','KeyE':'E','KeyF':'F','KeyG':'G','KeyH':'H',
        'KeyI':'I','KeyJ':'J','KeyK':'K','KeyL':'L','KeyM':'M','KeyN':'N','KeyO':'O','KeyP':'P',
        'KeyQ':'Q','KeyR':'R','KeyS':'S','KeyT':'T','KeyU':'U','KeyV':'V','KeyW':'W','KeyX':'X',
        'KeyY':'Y','KeyZ':'Z',
        'ArrowUp':'Up','ArrowDown':'Down','ArrowLeft':'Left','ArrowRight':'Right',
        'Space':'Space','ShiftLeft':'L-Shift','ShiftRight':'R-Shift',
        'ControlLeft':'L-Ctrl','ControlRight':'R-Ctrl',
        'Digit0':'0','Digit1':'1','Digit2':'2','Digit3':'3','Digit4':'4',
        'Digit5':'5','Digit6':'6','Digit7':'7','Digit8':'8','Digit9':'9',
        'Comma':',','Period':'.','Slash':'/','Semicolon':';','Quote':"'",
        'BracketLeft':'[','BracketRight':']','Backslash':'\\','Minus':'-','Equal':'=',
        'Backquote':'`','Tab':'Tab','Enter':'Enter'
    };
    return map[code]||code;
}
function updateKeybindUI() {
    for(const action of ['thrust','left','right','fire']){
        const btn=document.getElementById('kb_'+action);
        if(btn) btn.innerText=settings.keybinds[action].map(codeToLabel).join(' / ');
    }
}
function listenForKey(action) {
    if(listeningForBind) {
        // Cancel previous listen
        const prev=document.getElementById('kb_'+listeningForBind);
        if(prev) prev.classList.remove('listening');
    }
    listeningForBind=action;
    const btn=document.getElementById('kb_'+action);
    btn.classList.add('listening');
    btn.innerText='PRESS KEY...';
}
function handleKeybindCapture(e) {
    if(!listeningForBind) return;
    e.preventDefault();e.stopPropagation();
    const code=e.code;
    if(code==='Escape'){
        // Cancel rebind
        const btn=document.getElementById('kb_'+listeningForBind);
        btn.classList.remove('listening');
        updateKeybindUI();
        listeningForBind=null;
        return;
    }
    settings.keybinds[listeningForBind]=[code];
    const btn=document.getElementById('kb_'+listeningForBind);
    btn.classList.remove('listening');
    listeningForBind=null;
    updateKeybindUI();
    saveSettings();
}

// Helper: check if an action's keys are pressed
function isAction(action) {
    return settings.keybinds[action].some(code=>keys[code]);
}

loadSettings();

