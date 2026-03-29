/**
 * ASTEROIDS REMASTERED — DLC MODULE
 * Expansion Pack 1
 *
 * Drop this file into the game folder to enable DLC content.
 * Adds 10 new achievements and extends gameplay beyond Boss 3.
 */

(function() {
    if (typeof window.DLC === 'undefined') window.DLC = {};

    window.DLC.loaded = true;
    window.DLC.name = 'Expansion Pack 1';
    window.DLC.version = '1.0';

    // 10 DLC Achievements — injected into ACH_DEFS on init
    window.DLC.achievements = [
        { id:'dlc_beyond',         icon:'🚀', name:'Beyond',          desc:'Reach Level 5 (DLC)' },
        { id:'dlc_endless',        icon:'♾️', name:'Endless Voyager', desc:'Reach Level 7 (DLC)' },
        { id:'dlc_galactic_hero',  icon:'🌌', name:'Galactic Hero',   desc:'Score 100,000 points (DLC)' },
        { id:'dlc_trigger_happy',  icon:'🔫', name:'Trigger Happy',   desc:'Fire 500 shots in one game (DLC)' },
        { id:'dlc_chain_reaction', icon:'⛓️', name:'Chain Reaction',  desc:'Destroy 10 enemies without breaking combo (DLC)' },
        { id:'dlc_mass_destroyer', icon:'☄️', name:'Mass Destroyer',  desc:'Destroy 250 asteroids in one game (DLC)' },
        { id:'dlc_untouchable',    icon:'👻', name:'Untouchable',     desc:'Beat Sans without taking any damage (DLC)' },
        { id:'dlc_naked_run',      icon:'🔥', name:'Naked Run',       desc:'Beat Sans without using the shield (DLC)' },
        { id:'dlc_hoarder',        icon:'🐿️', name:'Hoarder',        desc:'Have 200+ ammo at once (DLC)' },
        { id:'dlc_exterminator',   icon:'🗡️', name:'Exterminator',   desc:'Defeat 10 mini bosses in one game (DLC)' },
        { id:'dlc_short_circuit',  icon:'🤖', name:'Short Circuit',  desc:'Defeat the Cyborg boss (DLC)' },
        { id:'dlc_gilberts_friend', icon:'💚', name:"Gilbert's Friend", desc:'Rescue and repair Gilbert (DLC)' },
        { id:'dlc_serpent_slayer', icon:'🐍', name:'Serpent Slayer', desc:'Defeat the Snake boss (DLC)' }
    ];

    window.DLC.init = function() {
        // Inject DLC achievements into the main achievement list
        if (typeof ACH_DEFS !== 'undefined') {
            for (const ach of window.DLC.achievements) {
                // Avoid duplicates on hot-reload
                if (!ACH_DEFS.find(a => a.id === ach.id)) {
                    ACH_DEFS.push(ach);
                }
            }
            console.log('[DLC] Injected ' + window.DLC.achievements.length + ' new achievements. Total: ' + ACH_DEFS.length);
        }
    };

    console.log('[DLC] Module detected: ' + window.DLC.name + ' v' + window.DLC.version);
})();
