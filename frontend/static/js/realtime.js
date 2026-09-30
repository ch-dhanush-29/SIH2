/**
 * E-Waste Saathi — Unified Real-Time WebSocket Client
 * Canonical Endpoint: /ws/live
 * Provides connection state monitoring, automatic exponential reconnect,
 * heartbeat keepalive, Set/Map duplicate listener protection, and initial history hydration.
 */

const RealtimeStream = {
  socket: null,
  reconnectAttempts: 0,
  maxReconnectDelay: 10000,
  reconnectTimer: null,
  heartbeatTimer: null,
  anyListeners: new Set(),
  eventListeners: new Map(), // eventName -> Set<callback>
  categoryListeners: new Map(), // categoryName -> Set<callback>
  seenEventIds: new Set(),
  status: 'OFFLINE', // LIVE, CONNECTING, RECONNECTING, OFFLINE
  isManualDisconnect: false,
  lastEventTimestamp: null,

  init() {
    this.isManualDisconnect = false;
    this.connect();
    this.hydrateEventHistory();
  },

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isManualDisconnect = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live`;

    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

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
          this.handleMessage(msg);
        } catch (e) {
          console.warn("RealtimeStream: JSON parse error", e);
        }
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        this.setStatus('OFFLINE');
        if (!this.isManualDisconnect) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (err) => {
        console.warn("RealtimeStream: WebSocket error", err);
      };
    } catch (e) {
      this.setStatus('OFFLINE');
      if (!this.isManualDisconnect) {
        this.scheduleReconnect();
      }
    }
  },

  disconnect() {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('OFFLINE');
    console.log("🔌 RealtimeStream: Disconnected manually");
  },

  reconnect() {
    this.disconnect();
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;
    this.connect();
  },

  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      this.socket.send(payload);
    } else {
      console.warn("RealtimeStream: Cannot send, socket not open");
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
        this.send({ action: "PING" });
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
      } else if (newStatus === 'CONNECTING' || newStatus === 'RECONNECTING') {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> ${newStatus}`;
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
        : (newStatus === 'CONNECTING' || newStatus === 'RECONNECTING' ? "w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" : "w-2.5 h-2.5 rounded-full bg-slate-400");
    }
  },

  normalizeRealtimeEvent(msg) {
    if (!msg || typeof msg !== 'object') return null;
    const eventName = msg.event || msg.event_type;
    if (!eventName) return null;

    return {
      event_id: msg.event_id || `${eventName}_${msg.timestamp || Date.now()}_${(msg.data && msg.data.lot_id) || ''}`,
      event: eventName,
      category: msg.category || "general",
      timestamp: msg.timestamp || new Date().toISOString(),
      data: msg.data || {},
      summary: msg.summary || "",
      severity: msg.severity || "info"
    };
  },

  handleMessage(rawMsg) {
    const normMsg = this.normalizeRealtimeEvent(rawMsg);
    if (!normMsg) return;

    // Deduplication check
    if (this.seenEventIds.has(normMsg.event_id)) return;
    this.seenEventIds.add(normMsg.event_id);

    // Limit seen cache size
    if (this.seenEventIds.size > 500) {
      const it = this.seenEventIds.values();
      for (let i = 0; i < 100; i++) this.seenEventIds.delete(it.next().value);
    }

    this.lastEventTimestamp = Date.now();
    this.dispatchEvent(normMsg);
  },

  dispatchEvent(msg) {
    // Update global ticker text
    this.updateTickers(msg);

    // 1. Dispatch to onAny listeners
    this.anyListeners.forEach(fn => {
      try { fn(msg); } catch (err) { console.error("Realtime onAny listener error:", err); }
    });

    // 2. Dispatch to event-specific listeners
    if (this.eventListeners.has(msg.event)) {
      this.eventListeners.get(msg.event).forEach(fn => {
        try { fn(msg); } catch (err) { console.error("Realtime event listener error:", err); }
      });
    }

    // 3. Dispatch to category-specific listeners
    if (msg.category && this.categoryListeners.has(msg.category)) {
      this.categoryListeners.get(msg.category).forEach(fn => {
        try { fn(msg); } catch (err) { console.error("Realtime category listener error:", err); }
      });
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

  onAny(callback) {
    if (typeof callback === 'function') {
      this.anyListeners.add(callback);
    }
    return () => this.offAny(callback);
  },

  offAny(callback) {
    if (callback) {
      this.anyListeners.delete(callback);
    } else {
      this.anyListeners.clear();
    }
  },

  subscribe(eventName, callback) {
    if (typeof callback !== 'function') return () => {};
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName).add(callback);
    return () => this.unsubscribe(eventName, callback);
  },

  unsubscribe(eventName, callback) {
    if (!this.eventListeners.has(eventName)) return;
    if (callback) {
      this.eventListeners.get(eventName).delete(callback);
    } else {
      this.eventListeners.delete(eventName);
    }
  },

  on(eventName, callback) {
    return this.subscribe(eventName, callback);
  },

  off(eventName, callback) {
    return this.unsubscribe(eventName, callback);
  },

  onCategory(categoryName, callback) {
    if (typeof callback !== 'function') return () => {};
    if (!this.categoryListeners.has(categoryName)) {
      this.categoryListeners.set(categoryName, new Set());
    }
    this.categoryListeners.get(categoryName).add(callback);
    return () => {
      if (this.categoryListeners.has(categoryName)) {
        this.categoryListeners.get(categoryName).delete(callback);
      }
    };
  },

  async hydrateEventHistory(limit = 50) {
    try {
      const res = await fetch(`/api/v1/events/history?limit=${limit}`);
      if (res.ok) {
        const json = await res.json();
        if (json.events && Array.isArray(json.events)) {
          json.events.forEach(evt => this.handleMessage(evt));
        }
      }
    } catch (e) {
      console.warn("RealtimeStream: Could not fetch initial event history", e);
    }
  }
};

window.RealtimeStream = RealtimeStream;
document.addEventListener('DOMContentLoaded', () => RealtimeStream.init());
