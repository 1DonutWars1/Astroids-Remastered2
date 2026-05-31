// ============================================================
//  UPDATES / PATCH NOTES
//  Newest entries go at the TOP of the list.
//  When adding a new update, copy the template block and fill it in.
//
//  >>> READ THIS, CLAUDE <<<
//  EVERY TIME YOU FINISH A USER-VISIBLE CHANGE (new feature, bug fix,
//  balance tweak, new mechanic, new UI), YOU MUST ADD AN ENTRY HERE.
//  This file is what the player sees in the in-game "UPDATES" button.
//  If you forget to add an entry, the change exists silently — the player
//  has no way to know about it.
//
//  Rules:
//   - Add a new {version, date, title, notes:[]} block at the TOP of the
//     UPDATES array, ABOVE the most recent entry.
//   - Bump the patch version (v1.0.X → v1.0.X+1). Bigger features can bump
//     the minor (v1.X.0). Use today's date in YYYY-MM-DD.
//   - Phrase notes from the player's perspective — what changed, not how
//     it was implemented. "Added a parry mechanic" not "Added parryWindow
//     to holo state".
//   - One note per discrete change. Group related changes by version, not
//     by bullet — if you did 3 things this session, that's 3 bullets.
//
//  >>> SPOILERS <<<
//  If a note reveals plot, a secret boss, a hidden ending, a story twist,
//  a secret key item, or anything else a player would want to discover
//  themselves — MARK IT AS A SPOILER. Spoiler notes render as a solid
//  black bar in the UPDATES menu; the player has to click them to reveal.
//
//  Two equivalent ways to mark a note as a spoiler:
//
//    (a) Object form (recommended for clarity):
//        { spoiler: true, text: 'Defeating Grimm now drops a hidden charm.' }
//
//    (b) String prefix (handy for one-offs):
//        '[SPOILER] Defeating Grimm now drops a hidden charm.'
//
//  Plain strings (no prefix, no object) stay visible — that's the default,
//  for bug fixes / balance / UI changes that don't reveal anything.
//
//  Do this BEFORE telling the user the task is done.
// ============================================================
const UPDATES = [
    {
        version: 'v1.0.12',
        date: '2026-05-31',
        title: 'Retroactive Spoiler Covers',
        notes: [
            'Went back through every prior patch note and covered the ones that reveal story content, hidden bosses, secret cutscenes, or boss phase mechanics. If you\'re a new player browsing the patch history, you can now scroll without accidentally spoiling Phase 2 of Chaos King, the Space Station cutscene, the Sector 1/2 audio-log lore, the Sector 2 reality-glitch event, the Sans challenge boss, or the Nightmare King Grimm encounter. Bug fixes, UI changes, and dev-menu notes stay visible.'
        ]
    },
    {
        version: 'v1.0.11',
        date: '2026-05-31',
        title: 'Spoiler-Safe Patch Notes & Dev File Browser',
        notes: [
            'Patch notes can now hide spoilers behind a click-to-reveal black bar. Bug fixes and balance changes stay visible like before; story-revealing notes show "SPOILER — click to reveal" until you choose to read them.',
            { spoiler: true, text: 'Example spoiler bullet: this is what a story-revealing note looks like in the UPDATES menu. Click to reveal works the same way for real spoilers.' },
            'Added a "GRANT CORRUPTED FILES…" button to both dev consoles (sector 1 and sector 2). It opens a list of every data fragment in the game with a per-file GRANT button, a GRANT ALL button, and clear markers for files you already own. Useful for testing the docking-bay terminal lore flow without grinding asteroid drops.'
        ]
    },
    {
        version: 'v1.0.10',
        date: '2026-05-31',
        title: 'Sector 1 & 2 Lore Expansion',
        notes: [
            { spoiler:true, text:'Expanded the THE GARDEN (Sector 1) data fragment audio_d01.log into the full Dr. Sarah Chen Day-1 upload log: 100 transferred test subjects, the beautiful garden environment, perfect recall, no pain, no hunger, no aging — "we\'ve created paradise."' },
            { spoiler:true, text:'Expanded the THE CLASSROOM (Sector 2) data fragment ward_08.wav into the full children\'s recording: the initial joy at being uploaded ("Mom and Dad are here too"), followed by the +30y voiceprint jump where they\'re still 8, asking to be allowed to grow old.' },
            'Terminal `type <filename>` and wreck-interior crate drops now render multi-line fragment text correctly (single-line fragments are unaffected).'
        ]
    },
    {
        version: 'v1.0.9',
        date: '2026-05-30',
        title: 'Phantom Boss Music Fix',
        notes: [
            'Fixed a bug where the Boss 1 (or other synth) music could keep playing quietly in the background underneath every other track. Caused by stale audio-play() promises rejecting after the music had already changed, starting an orphaned synth timer that nothing could stop. Music transitions are now guarded against stale fallbacks, and the synth tracks self-clean any previous timer before starting.'
        ]
    },
    {
        version: 'v1.0.8',
        date: '2026-05-30',
        title: 'Tutorial, Input & Boss Practice Polish',
        notes: [
            'Fixed a softlock in the tutorial where if the resupply ammo box drifted off-screen before you collected it, you\'d be stuck forever with no way to progress. A fresh ammo box now drops in whenever the previous one falls off the map.',
            'Fixed arrow keys not working to turn and thrust for players whose saved settings predated the arrow-key defaults. Default arrow keybindings are now backfilled on load, so Up/Left/Right work alongside W/A/D out of the box.',
            { spoiler:true, text:'Added Chaos King and Nightmare King Grimm to the boss practice list — Chaos King sits in the main lineup as Boss 3, Grimm joins the challenge bosses.' },
            { spoiler:true, text:'Removed the old broken normal Sans entry from boss practice. The working Sans fight is now listed simply as a Challenge Boss (no more "DLC" tag, no Boss 3 numbering).' },
            'Boss practice now ends with a stats screen when you defeat the boss instead of dumping you back into endless practice mode. Tracks time taken, shots fired, shots hit, accuracy %, hits taken (a.k.a. would-be deaths in god mode), asteroids destroyed, max combo, and score earned. From there hit MENU to return to the main menu.'
        ]
    },
    {
        version: 'v1.0.7',
        date: '2026-05-27',
        title: 'Audio Fixes & Ground Shatter Buff',
        notes: [
            'Fixed a bug where master volume reset to default on every game launch — your saved volume settings now persist correctly across sessions, even if you had them at 0.',
            'Fixed a bug where the combat playground\'s background music kept looping over the main menu after you exited the arena. Music now stops on exit.',
            'Buffed the Ground Shatter (↓+Z) damage — direct hits now deal 20 (up from 10), grazing hits 10 (up from 5).'
        ]
    },
    {
        version: 'v1.0.6',
        date: '2026-04-14',
        title: 'Sector 2 Reality Glitch',
        notes: [
            { spoiler:true, text:'Added a rare Sector 2 "reality glitch" event. Occasionally while flying through Sector 2 the screen will tear, split horizontally into two shifted halves, and show chromatic aberration and scanline noise for about 7 seconds. Gameplay continues underneath — the effect is purely visual.' },
            'Added a TRIGGER GLITCH (7s) button to the Sector 2 dev menu so the effect can be forced immediately for testing.',
            'Removed SPAWN CHAOS KING from the Sector 2 dev menu since Chaos King is not a Sector 2 boss.'
        ]
    },
    {
        version: 'v1.0.5',
        date: '2026-04-14',
        title: 'Sector 2 Dev Menu Parity',
        notes: [
            'Added the new dev buttons to the Sector 2 dev console so they\'re available in both sectors: DISABLE BIG SHOT, DISABLE MINI BOSS SPAWNS, DISABLE BOSS SPAWNS, and ENABLE PERMA TRIPLE SHOT.',
            'Toggle button labels now sync across both dev menus when you flip a setting in either one.'
        ]
    },
    {
        version: 'v1.0.4',
        date: '2026-04-14',
        title: 'Snake Boss Cutscene Fix',
        notes: [
            { spoiler:true, text:'Fixed a bug where defeating the Snake Boss would not trigger the Space Station cutscene if Gilbert had drifted out of his "ally" state during earlier sequences.' },
            { spoiler:true, text:'The station cutscene now plays reliably as long as the station has not yet been unlocked.' }
        ]
    },
    {
        version: 'v1.0.3',
        date: '2026-04-14',
        title: 'Dev Menu Upgrades',
        notes: [
            'Fixed the TOGGLE MINI BOSS SPAWNS button — disabling it now also clears any mini-bosses currently on screen so the effect is immediate.',
            'Replaced the blocking alert popup with an in-place button label so you can see the current state at a glance.',
            'Added a new PERMA TRIPLE SHOT dev button — freezes the triple-shot powerup so it never expires.',
            'Added a DISABLE BIG SHOT dev button to both sector dev menus.'
        ]
    },
    {
        version: 'v1.0.2',
        date: '2026-04-14',
        title: 'Chaos King Phase 2 Rebalance',
        notes: [
            { spoiler:true, text:'Fixed a bug where Chaos King could not be broken during Phase 2 — the third weakpoint was scheduled to appear after the cycle had already ended. Weakpoints are now scheduled proportionally to the cycle length so all three always have time to appear.' },
            { spoiler:true, text:'Made Phase 2 significantly easier: cycle length eased from 20s back to 25s, asteroid spit volleys are less frequent, box shakes come less often, the triple fireball volley is now a single aimed shot, and the extra "slam" attack has been removed.' },
            { spoiler:true, text:'Fixed the Phase 2 laser beam sometimes being literally undodgeable. The beam is now stationary (no sweep), spawns at least 140px away from the ship, has a longer 1.8s warning telegraph, and the cooldown between lasers is longer.' }
        ]
    },
    {
        version: 'v1.0.1',
        date: '2026-04-14',
        title: 'Chaos King Phase 2 Added',
        notes: [
            'Fixed a bug where destroying all 3 Chaos King weakpoints would not immediately shatter the box — the box used to wait for the full 30 second cycle to elapse before breaking. Now it shatters the instant the third weakpoint is hit.',
            { spoiler:true, text:'Added PHASE 2 to Chaos King: when his HP drops to 30, he enrages and gains several new attacks including faster asteroid spits, faster box shakes, aimed fireball volleys from his mouth, and a sweeping eye laser beam.' },
            { spoiler:true, text:'Chaos King\'s eyes now glow blood red during Phase 2.' }
        ]
    }
];

// Minimal HTML escape so user-authored note text is safe even with quotes/brackets.
function _updatesEscape(s){
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
// Render one note bullet. Supports plain string, "[SPOILER] ..." prefix, or
// {spoiler:true, text:'...'} object form. Spoilers render as a solid black
// bar with a hint; clicking reveals the text (and clicking again re-hides).
function _renderUpdateNote(n){
    let isSpoiler = false;
    let text = '';
    if(n && typeof n === 'object' && 'text' in n){
        isSpoiler = !!n.spoiler;
        text = n.text;
    } else {
        text = String(n);
        if(/^\s*\[SPOILER\]\s*/i.test(text)){
            isSpoiler = true;
            text = text.replace(/^\s*\[SPOILER\]\s*/i, '');
        }
    }
    const safe = _updatesEscape(text);
    if(!isSpoiler) return '<li>' + safe + '</li>';
    // Click toggles `.revealed` on the wrapper; CSS handles the cover.
    return '<li><span class="note-spoiler" onclick="this.classList.toggle(\'revealed\')" title="Click to reveal spoiler">'
        + '<span class="note-spoiler-cover">SPOILER — click to reveal</span>'
        + '<span class="note-spoiler-text">' + safe + '</span>'
        + '</span></li>';
}
function openUpdates() {
    try { Sound.ui(); } catch(e) {}
    document.getElementById('menuScreen').style.display = 'none';
    const list = document.getElementById('updatesList');
    list.innerHTML = UPDATES.map(u => {
        const bullets = u.notes.map(_renderUpdateNote).join('');
        return '<div class="update-entry">'
            + '<div class="update-header">'
            +   '<span class="update-version">' + u.version + '</span>'
            +   '<span class="update-date">' + u.date + '</span>'
            + '</div>'
            + '<div class="update-title">' + u.title + '</div>'
            + '<div class="update-notes"><ul>' + bullets + '</ul></div>'
            + '</div>';
    }).join('');
    document.getElementById('updatesMenu').classList.add('open');
}

function closeUpdates() {
    try { Sound.ui(); } catch(e) {}
    document.getElementById('updatesMenu').classList.remove('open');
    document.getElementById('menuScreen').style.display = 'block';
}
