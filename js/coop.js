// ============================================================
//  CO-OP  (peer-to-peer, no server — "connect code" pairing)
//  -----------
//  Two players link up directly, device-to-device, with NO server and
//  nothing else running. It uses WebRTC data channels; the only thing a
//  browser page can't do by itself is the initial introduction, so the
//  two players trade a pair of codes by hand (copy/paste over text, chat,
//  etc.). After that the link is direct over the local network.
//
//  THE HANDSHAKE (why there are two codes)
//  ---------------------------------------
//    Host  : "Host co-op"  -> gets an INVITE code, sends it to a friend.
//    Friend: "Pair"        -> pastes the invite code, gets a REPLY code,
//                             sends it back to the host.
//    Host  : pastes the reply code -> connected.
//
//  USERNAMES
//  ---------
//  The first time someone uses co-op we ask for a username and remember
//  it (localStorage). That's the name shown to the other player in the
//  party. There is intentionally NO "start match" button yet — this layer
//  is pairing + party only.
// ============================================================

(function () {
    'use strict';

    const MAX_PLAYERS = 2;                       // host + 1 friend
    const USERNAME_KEY = 'ast_rem_coop_username';
    const RTC_CONFIG = { iceServers: [] };       // no STUN/TURN — stay purely on the LAN, no external server
    const CONNECT_TIMEOUT_MS = 25000;

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
    function ui() { try { Sound.ui(); } catch (e) {} }
    function b64enc(s) { return btoa(unescape(encodeURIComponent(s))); }
    function b64dec(s) { return decodeURIComponent(escape(atob(s))); }
    function encodeDesc(d) { return b64enc(JSON.stringify({ type: d.type, sdp: d.sdp })); }
    function decodeDesc(str) { const o = JSON.parse(b64dec(String(str).trim())); if (!o || !o.type || !o.sdp) throw new Error('bad code'); return o; }

    // Wait until ICE candidate gathering finishes so a single code carries
    // everything the other side needs (no live "trickle" channel exists here).
    function waitForIce(pc) {
        return new Promise(resolve => {
            if (pc.iceGatheringState === 'complete') return resolve();
            const done = () => { pc.removeEventListener('icegatheringstatechange', check); resolve(); };
            function check() { if (pc.iceGatheringState === 'complete') done(); }
            pc.addEventListener('icegatheringstatechange', check);
            setTimeout(done, 2500);   // LAN gathering is fast; fall back so we never hang
        });
    }

    const Net = {
        state: 'idle',     // idle | username | host_offer | host_connecting | join_paste | join_answer | in_party | error
        selfName: '',
        peerName: '',
        isHost: false,
        suggestedName: '',
        pc: null, dc: null,
        offerCode: '', answerCode: '',
        errorMsg: '',
        pendingAction: null,
        _connectTimer: null,

        _closeConn() {
            try { if (this.dc) { this.dc.onopen = this.dc.onmessage = this.dc.onclose = null; this.dc.close(); } } catch (e) {}
            try { if (this.pc) { this.pc.onconnectionstatechange = null; this.pc.ondatachannel = null; this.pc.close(); } } catch (e) {}
            this.dc = null; this.pc = null;
        },
        _clearTimer() { if (this._connectTimer) { clearTimeout(this._connectTimer); this._connectTimer = null; } },
        _armTimer() {
            this._clearTimer();
            this._connectTimer = setTimeout(() => {
                if (this.state === 'host_connecting' || this.state === 'join_answer') {
                    this._fail('Couldn’t connect. Make sure you’re both on the same Wi-Fi and that each code was copied in full, then try again.');
                }
            }, CONNECT_TIMEOUT_MS);
        },
        reset() {
            this._clearTimer();
            this._closeConn();
            this.isHost = false; this.peerName = '';
            this.offerCode = ''; this.answerCode = '';
            this.errorMsg = '';
            this.state = 'idle';
        },

        // ---------- HOST ----------
        async startHost() {
            this.reset();
            this.isHost = true;
            this.state = 'host_offer';
            render();
            try {
                const pc = this.pc = new RTCPeerConnection(RTC_CONFIG);
                this._wirePc(pc);
                this._wireChannel(this.dc = pc.createDataChannel('coop'));
                await pc.setLocalDescription(await pc.createOffer());
                await waitForIce(pc);
                this.offerCode = encodeDesc(pc.localDescription);
                render();
            } catch (e) { this._fail('Could not start hosting: ' + (e && e.message || e)); }
        },
        async submitAnswer(str) {
            if (this.state !== 'host_offer' || !this.pc) return;
            let desc;
            try { desc = decodeDesc(str); }
            catch (e) { this.errorMsg = 'That reply code didn’t look right — make sure you pasted the whole thing.'; render(); return; }
            try {
                await this.pc.setRemoteDescription(desc);
                this.state = 'host_connecting'; this.errorMsg = ''; this._armTimer(); render();
            } catch (e) { this.errorMsg = 'That reply code didn’t work. Copy the full code your friend sent back.'; render(); }
        },

        // ---------- JOIN ----------
        startJoin() {
            this.reset();
            this.isHost = false;
            this.state = 'join_paste';
            render();
        },
        async submitOffer(str) {
            if (this.state !== 'join_paste') return;
            let desc;
            try { desc = decodeDesc(str); }
            catch (e) { this.errorMsg = 'That invite code didn’t look right — make sure you copied the whole thing.'; render(); return; }
            try {
                const pc = this.pc = new RTCPeerConnection(RTC_CONFIG);
                this._wirePc(pc);
                pc.ondatachannel = ev => this._wireChannel(this.dc = ev.channel);
                await pc.setRemoteDescription(desc);
                await pc.setLocalDescription(await pc.createAnswer());
                await waitForIce(pc);
                this.answerCode = encodeDesc(pc.localDescription);
                this.state = 'join_answer'; this.errorMsg = ''; this._armTimer(); render();
            } catch (e) { this.errorMsg = 'Couldn’t read that invite code. Paste the full code from the host.'; render(); }
        },

        // ---------- connection plumbing ----------
        _wirePc(pc) {
            pc.onconnectionstatechange = () => {
                const s = pc.connectionState;
                if (s === 'failed') this._fail('Connection failed. Make sure you’re both on the same Wi-Fi, then try again.');
                else if (s === 'closed') { if (this.state === 'in_party') this._peerLost(); }
            };
        },
        _wireChannel(dc) {
            dc.onopen = () => this._connected();
            dc.onmessage = ev => { try { this._onData(JSON.parse(ev.data)); } catch (e) {} };
            dc.onclose = () => { if (this.state === 'in_party') this._peerLost(); };
        },
        _send(obj) { try { if (this.dc && this.dc.readyState === 'open') this.dc.send(JSON.stringify(obj)); } catch (e) {} },
        _connected() {
            this._clearTimer();
            this.state = 'in_party';
            this._send({ t: 'hello', name: this.selfName });
            render();
        },
        _onData(m) {
            if (!m) return;
            if (m.t === 'hello') { this.peerName = m.name || 'Player'; if (this.state === 'in_party') render(); }
            else if (m.t === 'bye') { this._peerLost(); }
        },
        _peerLost() {
            this.reset();
            this.errorMsg = 'Your partner disconnected.';
            this.state = 'error';
            render();
        },
        _fail(msg) {
            this._clearTimer(); this._closeConn();
            this.errorMsg = msg; this.state = 'error';
            render();
        },
        leave() {
            this._send({ t: 'bye' });
            this.reset();
        }
    };

    // ---- username ------------------------------------------------------
    function getUsername() { const u = (localStorage.getItem(USERNAME_KEY) || '').trim(); return u || null; }
    function requireUsernameThen(action) {
        const u = getUsername();
        if (u) { Net.selfName = u; action(); }
        else { Net.pendingAction = action; Net.errorMsg = ''; Net.state = 'username'; render(); }
    }

    // ---- UI ------------------------------------------------------------
    function partyBlock(players) {
        let h = '<div class="coop-party">';
        for (let i = 0; i < MAX_PLAYERS; i++) {
            const p = players[i];
            if (p) {
                const tag = p.host ? '<span class="coop-tag" style="color:#ffd700;">HOST</span>' : '<span class="coop-tag" style="color:#66ff99;">READY</span>';
                const me = p.me ? ' <span style="color:#888;font-size:11px;">(you)</span>' : '';
                h += `<div class="coop-slot filled"><span class="coop-name">${esc(p.name)}${me}</span>${tag}</div>`;
            } else {
                h += `<div class="coop-slot"><span class="coop-empty">OPEN SLOT</span></div>`;
            }
        }
        return h + '</div>';
    }

    function render() {
        const b = document.getElementById('coopInner'); if (!b) return;
        const N = Net; let h = '';

        if (N.state === 'username') {
            const prefill = getUsername() || N.suggestedName || '';
            h += `<h1 class="coop-h1">CHOOSE A USERNAME</h1>`;
            h += `<div class="coop-sub">This is the name other players see when you join a party.</div>`;
            h += `<input id="coopUserInput" class="coop-input" maxlength="16" placeholder="Enter a username" value="${esc(prefill)}">`;
            if (N.errorMsg) h += `<div class="coop-error">${esc(N.errorMsg)}</div>`;
            h += `<button class="coop-btn coop-join" onclick="coopSetUsername()">CONFIRM</button>`;
            h += `<button class="cs-back" onclick="coopClose()">BACK</button>`;
        }
        else if (N.state === 'host_offer') {
            h += `<h1 class="coop-h1">HOST CO-OP</h1>`;
            if (!N.offerCode) {
                h += `<div class="coop-sub"><span class="coop-spin"></span>Creating your invite code…</div>`;
            } else {
                h += `<div class="coop-hint">Send the invite code to your friend. They paste it on their PAIR screen, then send you a reply code to finish connecting.</div>`;
                h += `<div class="coop-step">STEP 1 &mdash; Send this invite code to your friend</div>`;
                h += `<textarea id="coopOfferOut" class="coop-code" readonly rows="3">${esc(N.offerCode)}</textarea>`;
                h += `<button id="coopOfferOut_btn" class="coop-btn coop-copy" onclick="coopCopy('coopOfferOut')">COPY INVITE CODE</button>`;
                h += `<div class="coop-step">STEP 2 &mdash; Paste the reply code they send back</div>`;
                h += `<textarea id="coopAnswerIn" class="coop-input" rows="3" placeholder="Paste your friend’s reply code here"></textarea>`;
                if (N.errorMsg) h += `<div class="coop-error">${esc(N.errorMsg)}</div>`;
                h += `<button class="coop-btn coop-join" onclick="coopSubmitAnswer()">CONNECT</button>`;
            }
            h += `<button class="cs-back" onclick="coopClose()">CANCEL</button>`;
        }
        else if (N.state === 'host_connecting') {
            h += `<h1 class="coop-h1">HOST CO-OP</h1>`;
            h += `<div class="coop-sub"><span class="coop-spin"></span>Connecting…</div>`;
            h += `<button class="cs-back" onclick="coopClose()">CANCEL</button>`;
        }
        else if (N.state === 'join_paste') {
            h += `<h1 class="coop-h1">JOIN CO-OP</h1>`;
            h += `<div class="coop-hint">Ask the host for their invite code and paste it below. You’ll then get a reply code to send back to them.</div>`;
            h += `<div class="coop-step">STEP 1 &mdash; Paste the host’s invite code</div>`;
            h += `<textarea id="coopOfferIn" class="coop-input" rows="3" placeholder="Paste the host’s invite code here"></textarea>`;
            if (N.errorMsg) h += `<div class="coop-error">${esc(N.errorMsg)}</div>`;
            h += `<button class="coop-btn coop-join" onclick="coopSubmitOffer()">CONTINUE</button>`;
            h += `<button class="cs-back" onclick="coopClose()">BACK</button>`;
        }
        else if (N.state === 'join_answer') {
            h += `<h1 class="coop-h1">JOIN CO-OP</h1>`;
            h += `<div class="coop-step">STEP 2 &mdash; Send this reply code back to the host</div>`;
            h += `<textarea id="coopAnswerOut" class="coop-code" readonly rows="3">${esc(N.answerCode)}</textarea>`;
            h += `<button id="coopAnswerOut_btn" class="coop-btn coop-copy" onclick="coopCopy('coopAnswerOut')">COPY REPLY CODE</button>`;
            h += `<div class="coop-sub"><span class="coop-spin"></span>Waiting for the host to connect…</div>`;
            h += `<button class="cs-back" onclick="coopClose()">CANCEL</button>`;
        }
        else if (N.state === 'in_party') {
            const players = [];
            if (N.isHost) { players.push({ name: N.selfName, host: true, me: true }); if (N.peerName) players.push({ name: N.peerName, host: false }); }
            else { if (N.peerName) players.push({ name: N.peerName, host: true }); players.push({ name: N.selfName, host: false, me: true }); }
            h += `<h1 class="coop-h1">CO-OP PARTY</h1>`;
            h += `<div class="coop-sub">You’re connected!</div>`;
            h += partyBlock(players);
            h += `<div class="coop-count">${players.length} / ${MAX_PLAYERS} PLAYERS</div>`;
            h += `<div class="coop-hint">You’re in a party. Actually starting a match together is coming in a later update.</div>`;
            h += `<button class="cs-back" onclick="coopClose()">LEAVE PARTY</button>`;
        }
        else { // idle / error
            h += `<h1 class="coop-h1">CO-OP</h1>`;
            h += `<div class="coop-error">${esc(N.errorMsg || 'Disconnected.')}</div>`;
            h += `<button class="cs-back" onclick="coopClose()">BACK</button>`;
        }

        b.innerHTML = h;

        if (N.state === 'username') {
            const i = document.getElementById('coopUserInput');
            if (i) { i.focus(); i.select(); i.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); window.coopSetUsername(); } }; }
        }
    }

    function showLobby() {
        const m = document.getElementById('menuScreen'); if (m) m.style.display = 'none';
        const dd = document.getElementById('moreDropdown'); if (dd) dd.style.display = 'none';
        const e = document.getElementById('coopLobby'); if (e) e.style.display = 'block';
        render();
    }
    function closeLobby() {
        ui();
        Net.leave();
        Net.errorMsg = '';
        const e = document.getElementById('coopLobby'); if (e) e.style.display = 'none';
        const m = document.getElementById('menuScreen'); if (m) m.style.display = 'block';
    }

    // ---- public entry points -------------------------------------------
    window.hostCoopGame = function (suggestedName) { ui(); Net.suggestedName = suggestedName || ''; showLobby(); requireUsernameThen(() => Net.startHost()); };
    window.openCoopPair = function () { ui(); Net.suggestedName = ''; showLobby(); requireUsernameThen(() => Net.startJoin()); };
    window.coopSetUsername = function () {
        const inp = document.getElementById('coopUserInput'); if (!inp) return;
        const v = (inp.value || '').trim().slice(0, 16);
        if (!v) { Net.errorMsg = 'Please enter a username.'; render(); return; }
        localStorage.setItem(USERNAME_KEY, v);
        Net.selfName = v; Net.errorMsg = '';
        ui();
        const act = Net.pendingAction; Net.pendingAction = null;
        if (act) act(); else closeLobby();
    };
    window.coopSubmitOffer = function () { const t = document.getElementById('coopOfferIn'); if (t) Net.submitOffer(t.value); };
    window.coopSubmitAnswer = function () { const t = document.getElementById('coopAnswerIn'); if (t) Net.submitAnswer(t.value); };
    window.coopCopy = function (id) {
        const el = document.getElementById(id); if (!el) return;
        try { el.focus(); el.select(); document.execCommand('copy'); } catch (e) {}
        if (navigator.clipboard && navigator.clipboard.writeText) { try { navigator.clipboard.writeText(el.value); } catch (e) {} }
        const btn = document.getElementById(id + '_btn');
        if (btn) { const o = btn.textContent; btn.textContent = 'COPIED!'; setTimeout(() => { if (btn) btn.textContent = o; }, 1200); }
    };
    window.coopClose = closeLobby;
    window.CoopNet = Net;   // exposed for the later "start a match together" phase

    window.addEventListener('beforeunload', function () { try { Net.leave(); } catch (e) {} });
})();
