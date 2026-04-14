// ============================================================
//  UPDATES / PATCH NOTES
//  Newest entries go at the TOP of the list.
//  When adding a new update, copy the template block and fill it in.
// ============================================================
const UPDATES = [
    {
        version: 'v1.0.6',
        date: '2026-04-14',
        title: 'Sector 2 Reality Glitch',
        notes: [
            'Added a rare Sector 2 "reality glitch" event. Occasionally while flying through Sector 2 the screen will tear, split horizontally into two shifted halves, and show chromatic aberration and scanline noise for about 7 seconds. Gameplay continues underneath — the effect is purely visual.',
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
            'Fixed a bug where defeating the Snake Boss would not trigger the Space Station cutscene if Gilbert had drifted out of his "ally" state during earlier sequences.',
            'The station cutscene now plays reliably as long as the station has not yet been unlocked.'
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
            'Fixed a bug where Chaos King could not be broken during Phase 2 — the third weakpoint was scheduled to appear after the cycle had already ended. Weakpoints are now scheduled proportionally to the cycle length so all three always have time to appear.',
            'Made Phase 2 significantly easier: cycle length eased from 20s back to 25s, asteroid spit volleys are less frequent, box shakes come less often, the triple fireball volley is now a single aimed shot, and the extra "slam" attack has been removed.',
            'Fixed the Phase 2 laser beam sometimes being literally undodgeable. The beam is now stationary (no sweep), spawns at least 140px away from the ship, has a longer 1.8s warning telegraph, and the cooldown between lasers is longer.'
        ]
    },
    {
        version: 'v1.0.1',
        date: '2026-04-14',
        title: 'Chaos King Phase 2 Added',
        notes: [
            'Fixed a bug where destroying all 3 Chaos King weakpoints would not immediately shatter the box — the box used to wait for the full 30 second cycle to elapse before breaking. Now it shatters the instant the third weakpoint is hit.',
            'Added PHASE 2 to Chaos King: when his HP drops to 30, he enrages and gains several new attacks including faster asteroid spits, faster box shakes, aimed fireball volleys from his mouth, and a sweeping eye laser beam.',
            'Chaos King\'s eyes now glow blood red during Phase 2.'
        ]
    }
];

function openUpdates() {
    try { Sound.ui(); } catch(e) {}
    document.getElementById('menuScreen').style.display = 'none';
    const list = document.getElementById('updatesList');
    list.innerHTML = UPDATES.map(u => {
        const bullets = u.notes.map(n => '<li>' + n + '</li>').join('');
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
