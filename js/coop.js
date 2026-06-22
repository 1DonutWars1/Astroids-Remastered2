// ============================================================
//  CO-OP LOBBY  (pairing / party system)
//  -----------
//  This is the lobby + party layer ONLY. It lets a player HOST a co-op
//  game (advertised to everyone on the same network) and lets other
//  players PAIR — discover open games, request to join, and — once the
//  host accepts — sit together in a party of up to 4.
//
//  There is intentionally NO "start game" button yet. How the actual
//  in-game multiplayer plays out is a separate, later piece of work.
//
//  TRANSPORT
//  ---------
//  A browser can't scan a Wi-Fi network by itself, so discovery rides on
//  a swappable transport. The default transport here is BroadcastChannel,
//  which reaches every tab/window of the game open in the SAME browser —
//  enough to build and exercise the entire flow today (open the game in
//  two tabs: host in one, pair in the other).
//
//  To make discovery work across SEPARATE devices on the same Wi-Fi, add
//  a WebSocket-relay transport with the same { send, close } shape that
//  forwards messages through a small server on the LAN, and have
//  makeTransport() return it. Nothing else in this file has to change —
//  the lobby state machine below is transport-agnostic.
// ============================================================

(function () {
    'use strict';

    const CHANNEL = 'ast_rem_coop';
    const MAX_PLAYERS = 2;      // host + 1 joiner
    const ANNOUNCE_MS = 1500;   // how often a host re-advertises / a searcher re-queries
    const STALE_MS = 4000;      // drop a discovered game we haven't heard from in this long

    function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
    function ui() { try { Sound.ui(); } catch (e) {} }

    // ---- Transport ------------------------------------------------------
    //  Auto-selected:
    //   - Served over http(s) (i.e. via server.js on the LAN) → HTTP relay,
    //     which reaches every device on the same Wi-Fi. This is real co-op.
    //   - Opened as a file:// page → BroadcastChannel, which only reaches
    //     other tabs of the SAME browser on the SAME machine (local testing).
    function makeTransport(onmessage) {
        const proto = (location.protocol || '').toLowerCase();
        if (proto === 'http:' || proto === 'https:') return makeRelayTransport(onmessage);
        return makeBroadcastTransport(onmessage);
    }

    // Cross-device: post outgoing messages to the relay, poll for incoming.
    function makeRelayTransport(onmessage) {
        let lastSeq = 0, alive = true;
        function poll() {
            if (!alive) return;
            fetch('/coop/poll?since=' + lastSeq, { cache: 'no-store' })
                .then(r => r.json())
                .then(d => {
                    lastSeq = d.seq;
                    if (d.msgs) for (const m of d.msgs) { try { onmessage(m); } catch (e) {} }
                    if (alive) setTimeout(poll, 700);
                })
                .catch(() => { if (alive) setTimeout(poll, 1500); });
        }
        // Sync to the current head first so we don't replay old chatter, then poll.
        fetch('/coop/poll', { cache: 'no-store' })
            .then(r => r.json()).then(d => { lastSeq = d.seq; poll(); })
            .catch(() => poll());
        return {
            ok: true,
            send(obj) {
                fetch('/coop/send', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(obj), keepalive: true
                }).catch(() => {});
            },
            close() { alive = false; }
        };
    }

    // Same-machine fallback (file://): every tab of this browser shares a channel.
    function makeBroadcastTransport(onmessage) {
        if (typeof BroadcastChannel === 'undefined') {
            console.warn('[coop] BroadcastChannel unavailable — co-op discovery disabled in this browser.');
            return { ok: false, send() {}, close() {} };
        }
        const bc = new BroadcastChannel(CHANNEL);
        bc.onmessage = ev => { try { onmessage(ev.data); } catch (e) { console.warn('[coop] bad message', e); } };
        return {
            ok: true,
            send(obj) { try { bc.postMessage(obj); } catch (e) {} },
            close() { try { bc.close(); } catch (e) {} }
        };
    }

    // ---- Lobby / party state machine ------------------------------------
    const Net = {
        state: 'idle',        // idle | hosting | searching | joining | in_party
        selfId: uid(),
        selfName: '',
        transport: null,

        // host side
        game: null,           // {id, hostId, hostName, players:[{id,name,host}], max}
        requests: [],         // [{id,name,t}]  pending join requests (host)

        // search / join side
        found: [],            // [{id,hostId,hostName,count,max,open,t}]
        joiningId: null,
        joiningName: null,
        rejectMsg: null,
        disbandMsg: null,

        _announceTimer: null,
        _pruneTimer: null,

        ensureTransport() {
            if (!this.transport) this.transport = makeTransport(this._onMessage.bind(this));
            return this.transport;
        },
        _send(obj) { obj.from = this.selfId; this.ensureTransport().send(obj); },
        _clearTimers() {
            if (this._announceTimer) { clearInterval(this._announceTimer); this._announceTimer = null; }
            if (this._pruneTimer) { clearInterval(this._pruneTimer); this._pruneTimer = null; }
        },
        _resetState() {
            this.state = 'idle'; this.game = null; this.requests = [];
            this.found = []; this.joiningId = null; this.joiningName = null;
            this._clearTimers();
        },

        // ---------- HOST ----------
        host(name) {
            this._resetState();
            this.selfName = name || this.selfName || ('Pilot-' + this.selfId.slice(0, 4));
            this.state = 'hosting';
            this.game = {
                id: uid(), hostId: this.selfId, hostName: this.selfName,
                players: [{ id: this.selfId, name: this.selfName, host: true }],
                max: MAX_PLAYERS
            };
            this._announce();
            this._announceTimer = setInterval(() => this._announce(), ANNOUNCE_MS);
            render();
        },
        _announce() {
            if (this.state !== 'hosting' || !this.game) return;
            this._send({
                t: 'announce', game: {
                    id: this.game.id, hostId: this.game.hostId, hostName: this.game.hostName,
                    count: this.game.players.length, max: this.game.max,
                    open: this.game.players.length < this.game.max
                }
            });
        },
        _party() { return this.game.players.map(p => ({ id: p.id, name: p.name, host: p.host })); },
        acceptRequest(reqId) {
            if (this.state !== 'hosting' || !this.game) return;
            const idx = this.requests.findIndex(r => r.id === reqId);
            if (idx < 0) return;
            const req = this.requests.splice(idx, 1)[0];
            if (this.game.players.length >= this.game.max) {
                this._send({ t: 'reject', gameId: this.game.id, to: req.id, reason: 'full' });
                render(); return;
            }
            if (!this.game.players.some(p => p.id === req.id)) {
                this.game.players.push({ id: req.id, name: req.name, host: false });
            }
            ui();
            this._send({ t: 'accept', gameId: this.game.id, to: req.id, hostName: this.game.hostName, party: this._party() });
            this._send({ t: 'party', gameId: this.game.id, party: this._party() });
            this._announce();
            render();
        },
        rejectRequest(reqId) {
            if (this.state !== 'hosting' || !this.game) return;
            const idx = this.requests.findIndex(r => r.id === reqId);
            if (idx < 0) return;
            const req = this.requests.splice(idx, 1)[0];
            this._send({ t: 'reject', gameId: this.game.id, to: req.id, reason: 'declined' });
            ui(); render();
        },

        // ---------- SEARCH / JOIN ----------
        search(name) {
            this._resetState();
            this.selfName = name || this.selfName || ('Pilot-' + this.selfId.slice(0, 4));
            this.state = 'searching';
            this.rejectMsg = null;
            this._send({ t: 'query' });
            this._announceTimer = setInterval(() => { if (this.state === 'searching') this._send({ t: 'query' }); }, ANNOUNCE_MS);
            this._pruneTimer = setInterval(() => this._prune(), 1000);
            render();
        },
        _prune() {
            if (this.state !== 'searching') return;
            const now = Date.now();
            const before = this.found.length;
            this.found = this.found.filter(g => now - g.t < STALE_MS);
            if (this.found.length !== before) render();
        },
        requestJoin(gameId) {
            if (this.state !== 'searching') return;
            const g = this.found.find(x => x.id === gameId);
            if (!g) return;
            if (!g.open || g.count >= g.max) { this.rejectMsg = 'That party is full.'; render(); return; }
            this.state = 'joining';
            this.joiningId = gameId;
            this.joiningName = g.hostName;
            this._send({ t: 'join', gameId: gameId, to: g.hostId, name: this.selfName });
            ui(); render();
        },
        cancelJoin() {
            if (this.state !== 'joining') return;
            this.state = 'searching';
            this.joiningId = null;
            this._send({ t: 'query' });
            ui(); render();
        },

        // ---------- shared ----------
        leave() {
            if (this.state === 'hosting' && this.game) this._send({ t: 'closed', gameId: this.game.id });
            else if (this.state === 'in_party' && this.game) this._send({ t: 'leave', gameId: this.game.id });
            this._resetState();
        },

        _onMessage(m) {
            if (!m || m.from === this.selfId) return;   // ignore our own echoes
            switch (m.t) {
                case 'query':
                    if (this.state === 'hosting') this._announce();
                    break;
                case 'announce':
                    if (this.state === 'searching' && m.game) {
                        const g = m.game, ex = this.found.find(x => x.id === g.id);
                        if (ex) { ex.count = g.count; ex.max = g.max; ex.open = g.open; ex.hostName = g.hostName; ex.t = Date.now(); }
                        else this.found.push({ id: g.id, hostId: g.hostId, hostName: g.hostName, count: g.count, max: g.max, open: g.open, t: Date.now() });
                        render();
                    }
                    break;
                case 'join':
                    if (this.state === 'hosting' && this.game && m.to === this.selfId && m.gameId === this.game.id) {
                        if (this.game.players.some(p => p.id === m.from)) break;   // already in party
                        if (this.requests.some(r => r.id === m.from)) break;       // already pending
                        if (this.game.players.length >= this.game.max) {
                            this._send({ t: 'reject', gameId: this.game.id, to: m.from, reason: 'full' });
                            break;
                        }
                        this.requests.push({ id: m.from, name: m.name || 'Pilot', t: Date.now() });
                        ui(); render();
                    }
                    break;
                case 'accept':
                    if (this.state === 'joining' && m.to === this.selfId && m.gameId === this.joiningId) {
                        this.state = 'in_party';
                        this.game = { id: m.gameId, hostId: m.from, hostName: m.hostName || this.joiningName, players: m.party || [], max: MAX_PLAYERS };
                        ui(); render();
                    }
                    break;
                case 'reject':
                    if ((this.state === 'joining' || this.state === 'searching') && m.to === this.selfId) {
                        this.state = 'searching';
                        this.joiningId = null;
                        this.rejectMsg = m.reason === 'full' ? 'That party is full.' : 'The host declined your request.';
                        this._send({ t: 'query' });
                        render();
                    }
                    break;
                case 'party':
                    if (this.state === 'in_party' && this.game && m.gameId === this.game.id) {
                        this.game.players = m.party || this.game.players;
                        render();
                    }
                    break;
                case 'leave':
                    if (this.state === 'hosting' && this.game && m.gameId === this.game.id) {
                        const i = this.game.players.findIndex(p => p.id === m.from);
                        if (i >= 0) {
                            this.game.players.splice(i, 1);
                            this._send({ t: 'party', gameId: this.game.id, party: this._party() });
                            this._announce(); render();
                        }
                    }
                    break;
                case 'closed':
                    if (this.state === 'in_party' && this.game && m.gameId === this.game.id) {
                        this._resetState();
                        this.disbandMsg = 'The host closed the party.';
                        render();
                    } else if (this.state === 'searching') {
                        const i = this.found.findIndex(x => x.id === m.gameId);
                        if (i >= 0) { this.found.splice(i, 1); render(); }
                    }
                    break;
            }
        }
    };

    // ---- UI -------------------------------------------------------------
    function box() { return document.getElementById('coopInner'); }

    function slotFilled(p) {
        const tag = p.host
            ? '<span class="coop-tag" style="color:#ffd700;">HOST</span>'
            : '<span class="coop-tag" style="color:#66ff99;">READY</span>';
        return `<div class="coop-slot filled"><span class="coop-name">${esc(p.name)}</span>${tag}</div>`;
    }
    function slotEmpty() { return `<div class="coop-slot"><span class="coop-empty">OPEN SLOT</span></div>`; }
    function partyBlock(game) {
        let h = '<div class="coop-party">';
        for (let i = 0; i < game.max; i++) h += game.players[i] ? slotFilled(game.players[i]) : slotEmpty();
        return h + '</div>';
    }

    function render() {
        const b = box(); if (!b) return;
        const N = Net;
        let h = '';

        if (N.state === 'hosting') {
            h += `<h1 class="coop-h1">CO-OP PARTY</h1>`;
            h += `<div class="coop-sub"><span class="coop-spin"></span>Searching for players on your Wi-Fi…</div>`;
            h += partyBlock(N.game);
            h += `<div class="coop-count">${N.game.players.length} / ${N.game.max} PLAYERS</div>`;
            if (N.requests.length) {
                h += `<div class="coop-section">JOIN REQUESTS</div>`;
                for (const r of N.requests) {
                    h += `<div class="coop-req"><span class="coop-name">${esc(r.name)}</span>` +
                        `<span class="coop-req-btns">` +
                        `<button class="coop-btn coop-accept" onclick="coopAccept('${r.id}')">ACCEPT</button>` +
                        `<button class="coop-btn coop-reject" onclick="coopReject('${r.id}')">DECLINE</button>` +
                        `</span></div>`;
                }
            } else {
                h += `<div class="coop-hint">When someone pairs with your game and asks to join, their request appears here for you to accept.</div>`;
            }
            h += `<button class="cs-back" onclick="coopClose()">DISBAND PARTY</button>`;
        }
        else if (N.state === 'searching') {
            h += `<h1 class="coop-h1">PAIR</h1>`;
            h += `<div class="coop-sub"><span class="coop-spin"></span>Searching for co-op games on your Wi-Fi…</div>`;
            if (N.rejectMsg) h += `<div class="coop-error">${esc(N.rejectMsg)}</div>`;
            if (N.found.length) {
                h += `<div class="coop-list">`;
                for (const g of N.found) {
                    const full = !g.open || g.count >= g.max;
                    h += `<div class="coop-game"><div class="coop-game-info">` +
                        `<div class="coop-name">${esc(g.hostName)}'s game</div>` +
                        `<div class="coop-meta">${g.count} / ${g.max} players${full ? ' • FULL' : ''}</div></div>` +
                        (full
                            ? `<button class="coop-btn" disabled style="opacity:.35;cursor:default;">FULL</button>`
                            : `<button class="coop-btn coop-join" onclick="coopJoin('${g.id}')">REQUEST TO JOIN</button>`) +
                        `</div>`;
                }
                h += `</div>`;
            } else {
                h += `<div class="coop-hint">No open games found yet. Have a friend on the same Wi-Fi host a co-op game from a new save, then it'll show up here.</div>`;
            }
            h += `<button class="cs-back" onclick="coopClose()">BACK</button>`;
        }
        else if (N.state === 'joining') {
            h += `<h1 class="coop-h1">REQUEST SENT</h1>`;
            h += `<div class="coop-sub"><span class="coop-spin"></span>Waiting for ${esc(N.joiningName || 'the host')} to accept…</div>`;
            h += `<button class="cs-back" onclick="coopCancelJoin()">CANCEL</button>`;
        }
        else if (N.state === 'in_party') {
            h += `<h1 class="coop-h1">CO-OP PARTY</h1>`;
            h += `<div class="coop-sub">You're in ${esc(N.game.hostName)}'s party</div>`;
            h += partyBlock(N.game);
            h += `<div class="coop-count">${N.game.players.length} / ${N.game.max} PLAYERS</div>`;
            h += `<div class="coop-hint">You're in! Waiting on the host. How the match actually starts is coming in a later update.</div>`;
            h += `<button class="cs-back" onclick="coopClose()">LEAVE PARTY</button>`;
        }
        else { // idle — e.g. the host disbanded the party we were in
            h += `<h1 class="coop-h1">CO-OP</h1>`;
            h += `<div class="coop-error">${esc(N.disbandMsg || 'Party ended.')}</div>`;
            h += `<button class="cs-back" onclick="coopClose()">BACK</button>`;
        }
        b.innerHTML = h;
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
        Net.disbandMsg = null; Net.rejectMsg = null;
        const e = document.getElementById('coopLobby'); if (e) e.style.display = 'none';
        const m = document.getElementById('menuScreen'); if (m) m.style.display = 'block';
    }

    function coopDisplayName() {
        let n = localStorage.getItem('ast_rem_coop_name');
        if (!n) { n = 'Pilot-' + Net.selfId.slice(0, 4); localStorage.setItem('ast_rem_coop_name', n); }
        return n;
    }

    // ---- Public entry points (called from menu / new-save flow) ---------
    window.hostCoopGame = function (name) { ui(); Net.host(name || coopDisplayName()); showLobby(); };
    window.openCoopPair = function () { ui(); Net.search(coopDisplayName()); showLobby(); };
    window.coopAccept = function (id) { Net.acceptRequest(id); };
    window.coopReject = function (id) { Net.rejectRequest(id); };
    window.coopJoin = function (id) { Net.requestJoin(id); };
    window.coopCancelJoin = function () { Net.cancelJoin(); };
    window.coopClose = closeLobby;
    window.CoopNet = Net;   // exposed for the later in-game multiplayer phase

    // Tidy up if the page is closed mid-lobby so we don't leave a ghost host/party.
    window.addEventListener('beforeunload', function () { try { Net.leave(); } catch (e) {} });
})();
