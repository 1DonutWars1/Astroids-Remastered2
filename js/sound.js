// ============================================================
//  SOUND
// ============================================================
const Sound = {
    ctx: null, master: null, muted: false,
    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.6;
        this.master.connect(this.ctx.destination);
        this.initTracks();
        // Audio nodes only exist after this point. loadSettings() ran at page
        // load and called applySettings(), but at that moment master/bgmAudio
        // were still null — so the bail-out checks skipped the user's saved
        // volumes. Re-apply now so saved settings beat the init defaults.
        if (typeof applySettings === 'function') {
            try { applySettings(); } catch(e) {}
        }
    },
    bgmAudio: null, boss3Audio: null, boss3P2Audio: null, boss4Audio: null, boss5Audio: null, rougeAudio: null, grimmAudio: null, nexusAudio: null, sector2Audio: null, currentTrack: 'none',
    initTracks() {
        this.bgmAudio = document.getElementById('bgmTrack');
        this.boss3Audio = document.getElementById('boss3Track');
        this.boss3P2Audio = document.getElementById('boss3Phase2Track');
        this.boss4Audio = document.getElementById('boss4Track');
        this.boss5Audio = document.getElementById('boss5Track');
        this.rougeAudio = document.getElementById('rougeTrack');
        this.grimmAudio = document.getElementById('grimmTrack');
        this.nexusAudio = document.getElementById('nexusTrack');
        this.sector2Audio = document.getElementById('sector2Track');
        this.chaosKingAudio = document.getElementById('chaosKingTrack');
        if(this.bgmAudio) this.bgmAudio.volume = 0.8;
        if(this.boss3Audio) this.boss3Audio.volume = 0.8;
        if(this.boss3P2Audio) this.boss3P2Audio.volume = 0.8;
        if(this.boss4Audio) this.boss4Audio.volume = 0.8;
        if(this.boss5Audio) this.boss5Audio.volume = 0.8;
        if(this.rougeAudio) this.rougeAudio.volume = 0.8;
        if(this.grimmAudio) this.grimmAudio.volume = 0.8;
        if(this.nexusAudio) this.nexusAudio.volume = 0.8;
        if(this.sector2Audio) this.sector2Audio.volume = 0.8;
        if(this.chaosKingAudio) this.chaosKingAudio.volume = 0.85;
    },
    toggleMute() {
        this.muted = !this.muted;
        if (this.master) this.master.gain.value = this.muted ? 0 : 0.6;
        const vol = this.muted ? 0 : 0.8;
        if(this.bgmAudio) this.bgmAudio.volume = vol;
        if(this.boss3Audio) this.boss3Audio.volume = vol;
        if(this.boss3P2Audio) this.boss3P2Audio.volume = vol;
        if(this.boss4Audio) this.boss4Audio.volume = vol;
        if(this.boss5Audio) this.boss5Audio.volume = vol;
        if(this.rougeAudio) this.rougeAudio.volume = vol;
        if(this.grimmAudio) this.grimmAudio.volume = vol;
        if(this.nexusAudio) this.nexusAudio.volume = vol;
        if(this.sector2Audio) this.sector2Audio.volume = vol;
        if(this.chaosKingAudio) this.chaosKingAudio.volume = vol;
    },
    tone(freq, dur, type, vol, slide) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(slide, 1), t + dur);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
    },
    shoot() { this.tone(900, 0.12, 'sawtooth', 0.4, 80); },
    explode() { this.tone(80, 0.35, 'sawtooth', 0.7, 10); },
    powerup() { this.tone(400, 0.3, 'square', 0.2, 1200); },
    hit() { this.tone(200, 0.15, 'square', 0.3, 50); },
    ui() { this.tone(1200, 0.04, 'sine', 0.1); },
    shieldSfx() { this.tone(300, 0.2, 'sine', 0.25, 800); },
    bossWarn() { this.tone(100, 0.5, 'sawtooth', 0.5, 50); },
    blaster() { this.tone(200, 0.6, 'sawtooth', 0.8, 10); },
    portal() {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        // Rising whoosh: sine sweep + sawtooth layer + noise burst
        const o1 = this.ctx.createOscillator(), g1 = this.ctx.createGain();
        o1.type = 'sine'; o1.frequency.setValueAtTime(120, t);
        o1.frequency.exponentialRampToValueAtTime(1800, t + 1.8);
        g1.gain.setValueAtTime(0.0001, t);
        g1.gain.exponentialRampToValueAtTime(0.35, t + 0.3);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
        o1.connect(g1); g1.connect(this.master); o1.start(t); o1.stop(t + 2.05);
        const o2 = this.ctx.createOscillator(), g2 = this.ctx.createGain();
        o2.type = 'sawtooth'; o2.frequency.setValueAtTime(60, t);
        o2.frequency.exponentialRampToValueAtTime(900, t + 1.8);
        g2.gain.setValueAtTime(0.0001, t);
        g2.gain.exponentialRampToValueAtTime(0.18, t + 0.4);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
        o2.connect(g2); g2.connect(this.master); o2.start(t); o2.stop(t + 2.05);
        // Noise whoosh via buffer
        try {
            const bufLen = Math.floor(this.ctx.sampleRate * 1.8);
            const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
            const src = this.ctx.createBufferSource(); src.buffer = buf;
            const gn = this.ctx.createGain();
            gn.gain.setValueAtTime(0.0001, t);
            gn.gain.exponentialRampToValueAtTime(0.25, t + 0.4);
            gn.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
            const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass';
            bp.frequency.setValueAtTime(400, t);
            bp.frequency.exponentialRampToValueAtTime(3000, t + 1.8);
            src.connect(bp); bp.connect(gn); gn.connect(this.master);
            src.start(t); src.stop(t + 1.85);
        } catch (e) {}
    },

    // --- MUSIC SYSTEM: MP3 with synth fallback ---
    _musicTimer: null, _step: 0,

    _stopAllAudio() {
        if(this._musicTimer){clearInterval(this._musicTimer);this._musicTimer=null;}
        if(this.bgmAudio){this.bgmAudio.pause();this.bgmAudio.currentTime=0;}
        if(this.boss3Audio){this.boss3Audio.pause();this.boss3Audio.currentTime=0;}
        if(this.boss3P2Audio){this.boss3P2Audio.pause();this.boss3P2Audio.currentTime=0;}
        if(this.boss4Audio){this.boss4Audio.pause();this.boss4Audio.currentTime=0;}
        if(this.boss5Audio){this.boss5Audio.pause();this.boss5Audio.currentTime=0;}
        if(this.rougeAudio){this.rougeAudio.pause();this.rougeAudio.currentTime=0;}
        if(this.grimmAudio){this.grimmAudio.pause();this.grimmAudio.currentTime=0;}
        if(this.nexusAudio){this.nexusAudio.pause();this.nexusAudio.currentTime=0;}
        if(this.sector2Audio){this.sector2Audio.pause();this.sector2Audio.currentTime=0;}
        if(this.chaosKingAudio){this.chaosKingAudio.pause();this.chaosKingAudio.currentTime=0;}
    },

    // Synth fallbacks
    _synthBGM() {
        if(this._musicTimer){clearInterval(this._musicTimer);this._musicTimer=null;}
        this._step=0;
        this._musicTimer=setInterval(()=>{
            if(!G.running||this.muted)return;
            const roots=[45,45,41,43],root=roots[Math.floor(this._step/16)%4];
            if(this._step%2===0)this.tone(440*Math.pow(2,(root-69)/12)/2,0.18,'sawtooth',0.12);
            if(this._step%4===0&&this._step>32){const n=root+12+[0,3,7,10][this._step%4];this.tone(440*Math.pow(2,(n-69)/12),0.08,'triangle',0.06);}
            this._step++;
        },140);
    },
    _synthBoss1() {
        if(this._musicTimer){clearInterval(this._musicTimer);this._musicTimer=null;}
        this._step=0;
        this._musicTimer=setInterval(()=>{
            if(!G.running||this.muted)return;
            const chords=[[36,39,43],[32,36,39],[34,38,41],[31,34,38]],chord=chords[Math.floor(this._step/16)%4];
            const f=m=>440*Math.pow(2,(m-69)/12);
            if(this._step%4===0)this.tone(f(30),0.15,'sawtooth',0.3,f(20)); // kick
            this.tone(f(chord[0]-12),0.1,'sawtooth',0.25,f(chord[0]-12)*0.5);
            if(this._step%2===0&&this._step>16){const mel=[0,3,7,10,7,3,0,-2];this.tone(f(chord[0]+12+mel[(this._step/2)%mel.length]),0.12,'square',0.12);}
            this._step++;
        },100);
    },
    _synthBoss2() {
        if(this._musicTimer){clearInterval(this._musicTimer);this._musicTimer=null;}
        this._step=0;
        this._musicTimer=setInterval(()=>{
            if(!G.running||this.muted)return;
            const chords=[[38,42,45],[35,38,42],[31,35,38],[33,37,40]],chord=chords[Math.floor(this._step/16)%4];
            const f=m=>440*Math.pow(2,(m-69)/12);
            if(this._step%8===0)chord.forEach(n=>{this.tone(f(n-12),0.6,'sawtooth',0.2);});
            this.tone(f(chord[0]-24),0.3,'square',0.25);
            if(this._step%4===0&&this._step>16){const mel=[12,14,16,14,12,9,7,9];this.tone(f(chord[0]+mel[(this._step/4)%8]),0.25,'sawtooth',0.15);}
            this._step++;
        },187);
    },
    _synthNexus() {
        if(this._musicTimer){clearInterval(this._musicTimer);this._musicTimer=null;}
        this._step=0;
        this._musicTimer=setInterval(()=>{
            if(!G.running||this.muted)return;
            const f=m=>440*Math.pow(2,(m-69)/12);
            // Cold digital pulse — low drone + metallic pings
            const beat=this._step%32;
            // Bass drone — alternating tritone
            if(beat%8===0){
                const bass=[28,28,34,28][Math.floor(this._step/32)%4];
                this.tone(f(bass),0.4,'sawtooth',0.15);
            }
            // Metallic ping arpeggio
            if(beat%4===0&&beat>8){
                const pings=[72,75,79,84,79,75,72,68];
                this.tone(f(pings[(this._step/4)%pings.length]),0.08,'sine',0.1);
            }
            // Glitch hit
            if(beat===0||beat===12||beat===22){
                this.tone(f(40+Math.random()*30),0.04,'square',0.2);
            }
            // High eerie whistle
            if(this._step%16===0){
                this.tone(f(90+Math.sin(this._step*0.1)*5),0.3,'sine',0.04);
            }
            this._step++;
        },110);
    },
    _synthBoss3(phase2) {
        if(this._musicTimer){clearInterval(this._musicTimer);this._musicTimer=null;}
        this._step=0;
        this._musicTimer=setInterval(()=>{
            if(!G.running||this.muted)return;
            const notes=[62,62,74,69,68,67,65,62,65,67];
            const n=notes[this._step%notes.length];
            const f=440*Math.pow(2,(n-69)/12);
            this.tone(f,0.1,phase2?'sawtooth':'square',0.25);
            this._step++;
        },phase2?90:120);
    },

    playMusic(track) {
        if(!this.ctx) return;
        // In sector 2, the idle-space BGM is replaced by the hellish sector theme
        // so existing playMusic('bgm') calls (respawn, boss-death cleanup, etc.)
        // stay musically consistent without touching every call site.
        if(track==='bgm' && typeof G!=='undefined' && G.currentSector===2) track='sector2';
        if(this.currentTrack===track) return;
        this._stopAllAudio();
        this.currentTrack=track;
        if(track==='none') return;

        // Helper: only run the synth fallback if the track we were trying to
        // play is still the active one. Without this guard, a play() promise
        // that rejects asynchronously (e.g. because _stopAllAudio paused the
        // element) starts a synth timer for music the user no longer wants,
        // and that timer can outlive every future _stopAllAudio call.
        const _fallback = (forTrack, fn) => () => { if(this.currentTrack===forTrack) fn(); };
        if(track==='bgm'){
            if(this.bgmAudio&&!this.muted){
                this.bgmAudio.play().catch(_fallback('bgm',()=>this._synthBGM()));
            } else this._synthBGM();
        }
        else if(track==='boss1') this._synthBoss1();
        else if(track==='boss2') this._synthBoss2();
        else if(track==='boss3'){
            if(this.boss3Audio&&!this.muted){
                this.boss3Audio.play().catch(_fallback('boss3',()=>this._synthBoss3(false)));
            } else this._synthBoss3(false);
        }
        else if(track==='boss3phase2'){
            if(this.boss3P2Audio&&!this.muted){
                this.boss3P2Audio.play().catch(_fallback('boss3phase2',()=>this._synthBoss3(true)));
            } else this._synthBoss3(true);
        }
        else if(track==='boss4'){
            if(this.boss4Audio&&!this.muted){
                this.boss4Audio.play().catch(_fallback('boss4',()=>this._synthBoss2()));
            } else this._synthBoss2(); // fallback to synth boss2 music
        }
        else if(track==='boss5'){
            if(this.boss5Audio&&!this.muted){
                this.boss5Audio.play().catch(_fallback('boss5',()=>this._synthBoss2()));
            } else this._synthBoss2();
        }
        else if(track==='rouge'){
            if(this.rougeAudio&&!this.muted){
                this.rougeAudio.play().catch(_fallback('rouge',()=>this._synthBoss1()));
            } else this._synthBoss1();
        }
        else if(track==='nexus'){
            if(this.nexusAudio&&!this.muted){
                this.nexusAudio.play().catch(_fallback('nexus',()=>this._synthNexus()));
            } else this._synthNexus();
        }
        else if(track==='grimm'){
            if(this.grimmAudio&&!this.muted){
                this.grimmAudio.play().catch(_fallback('grimm',()=>this._synthBoss1()));
            } else this._synthBoss1();
        }
        else if(track==='sector2'){
            if(this.sector2Audio&&!this.muted){
                this.sector2Audio.loop=true;
                this.sector2Audio.play().catch(_fallback('sector2',()=>this._synthBGM()));
            } else this._synthBGM();
        }
        else if(track==='chaosking'){
            if(this.chaosKingAudio&&!this.muted){
                this.chaosKingAudio.loop=true;
                this.chaosKingAudio.play().catch(_fallback('chaosking',()=>this._synthBoss2()));
            } else this._synthBoss2();
        }
    },

    // Convenience aliases
    startBGM() { this.playMusic('bgm'); },
    stopBGM() { /* handled by playMusic */ },
    startBossBGM() { /* handled by playMusic */ },
    stopBossBGM() { /* handled by playMusic */ }
};

