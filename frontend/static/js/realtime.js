/**
 * E-Waste Saathi — Unified Real-Time WebSocket Client
 * Canonical Endpoint: /ws/live
 * Provides connection state monitoring, automatic exponential reconnect,
 * heartbeat keepalive, event deduplication, and initial history hydration.
 */

const RealtimeStream = {
  socket: null,
  reconnectAttempts: 0,
  maxReconnectDelay: 10000,
  reconnectTimer: null,
  heartbeatTimer: null,
  listeners: {}, // eventName -> Array<callback>
  categoryListeners: {}, // categoryName -> Array<callback>
  allListeners: [], // Array<callback>
  seenEventIds: new Set(),
  status: 'OFFLINE', // LIVE, RECONNECTING, OFFLINE

  init() {
    this.connect();
    this.hydrateEventHistory();
  },

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live`;

    this.setStatus('RECONNECTING');

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('LIVE');
        this.startHeartbeat();
        console.log("⚡ RealtimeStream: Connected to canonical /ws/live");
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.processEvent(msg);
        } catch (e) {
          console.warn("RealtimeStream: JSON parse error", e);
        }
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        this.setStatus('OFFLINE');
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn("RealtimeStream: WebSocket error", err);
      };
    } catch (e) {
      this.setStatus('OFFLINE');
      this.scheduleReconnect();
    }
  },

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  },

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ action: "PING" }));
      }
    }, 15000);
  },

  stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  },

  setStatus(newStatus) {
    this.status = newStatus;
    
    // Update any UI badge elements
    document.querySelectorAll('.realtime-status-badge').forEach(badge => {
      if (newStatus === 'LIVE') {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> LIVE`;
        badge.className = "realtime-status-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200";
      } else if (newStatus === 'RECONNECTING') {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> RECONNECTING`;
        badge.className = "realtime-status-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200";
      } else {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span> OFFLINE`;
        badge.className = "realtime-status-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200";
      }
    });

    const pulseDot = document.getElementById("realtime-pulse-dot");
    if (pulseDot) {
      pulseDot.className = newStatus === 'LIVE' 
        ? "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" 
        : (newStatus === 'RECONNECTING' ? "w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" : "w-2.5 h-2.5 rounded-full bg-slate-400");
    }
  },

  processEvent(msg) {
    // Normalization adapter for legacy event_type
    const eventName = msg.event || msg.event_type;
    if (!eventName) return;
    msg.event = eventName;

    // Deduplication check
    const eventId = msg.event_id || `${msg.event}_${msg.timestamp}_${(msg.data && msg.data.lot_id) || ''}`;
    if (this.seenEventIds.has(eventId)) return;
    this.seenEventIds.add(eventId);

    // Limit seen cache size
    if (this.seenEventIds.size > 500) {
      const it = this.seenEventIds.values();
      for (let i = 0; i < 100; i++) this.seenEventIds.delete(it.next().value);
    }

    // Update global ticker text if present
    this.updateTickers(msg);

    // Dispatch to registered listeners
    this.allListeners.forEach(fn => fn(msg));

    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(fn => fn(msg));
    }

    if (msg.category && this.categoryListeners[msg.category]) {
      this.categoryListeners[msg.category].forEach(fn => fn(msg));
    }
  },

  updateTickers(msg) {
    const summaryText = msg.summary || (msg.data && (msg.data.initial_notes || msg.data.reason)) || msg.event;
    
    const tickerMessage = document.getElementById("tickerMessage");
    if (tickerMessage) {
      tickerMessage.innerHTML = `<span class="text-brandDark font-semibold">● STREAM:</span> ${summaryText}`;
    }

    const realtimeTicker = document.getElementById("realtime-ticker-text");
    if (realtimeTicker) {
      if (msg.event === "PRICE_TICK" || msg.event === "PRICE_CALCULATED") {
        realtimeTicker.innerHTML = `<span class="text-amber-500 font-bold">₹ PRICE:</span> ${summaryText}`;
      } else if (msg.event === "LOT_CREATED" || msg.event === "NEW_LOT_BROADCAST") {
        realtimeTicker.innerHTML = `<span class="text-blue-500 font-bold">📦 LOT:</span> ${summaryText}`;
      } else if (msg.event === "HANDOVER_VERIFIED") {
        realtimeTicker.innerHTML = `<span class="text-emerald-500 font-bold">✓ VERIFIED:</span> ${summaryText}`;
      } else if (msg.event === "ANOMALY_DETECTED") {
        realtimeTicker.innerHTML = `<span class="text-rose-500 font-bold">⚠️ ALERT:</span> ${summaryText}`;
      } else {
        realtimeTicker.innerHTML = `<span class="text-slate-600 font-bold">● STREAM:</span> ${summaryText}`;
      }
    }
  },

  on(eventName, callback) {
    if (!this.listeners[eventName]) this.listeners[eventName] = [];
    this.listeners[eventName].push(callback);
    return () => {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    };
  },

  onCategory(categoryName, callback) {
    if (!this.categoryListeners[categoryName]) this.categoryListeners[categoryName] = [];
    this.categoryListeners[categoryName].push(callback);
    return () => {
      this.categoryListeners[categoryName] = this.categoryListeners[categoryName].filter(cb => cb !== callback);
    };
  },

  onAny(callback) {
    this.allListeners.push(callback);
    return () => {
      this.allListeners = this.allListeners.filter(cb => cb !== callback);
    };
  },

  async hydrateEventHistory() {
    try {
      const res = await fetch('/api/v1/events/history?limit=30');
      if (res.ok) {
        const json = await res.json();
        if (json.events && Array.isArray(json.events)) {
          json.events.forEach(evt => this.processEvent(evt));
        }
      }
    } catch (e) {
      console.warn("RealtimeStream: Could not fetch initial event history", e);
    }
  }
};

window.RealtimeStream = RealtimeStream;
document.addEventListener('DOMContentLoaded', () => RealtimeStream.init());
