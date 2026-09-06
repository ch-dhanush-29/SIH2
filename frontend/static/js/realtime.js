/**
 * E-Waste Saathi Realtime Stream Client
 * Connects to FastAPI WebSocket endpoint and updates live price tickers,
 * incoming lot notifications, and handover alerts.
 */

const RealtimeStream = {
  socket: null,
  reconnectInterval: 3000,

  init(onEventCallback) {
    this.connect(onEventCallback);
  },

  connect(onEventCallback) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live-stream`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log("⚡ Connected to E-Waste Saathi Realtime Stream");
        this.updateLiveIndicator(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingEvent(msg);
          if (onEventCallback) onEventCallback(msg);
        } catch (e) {
          console.warn("WS Parse error:", e);
        }
      };

      this.socket.onclose = () => {
        this.updateLiveIndicator(false);
        setTimeout(() => this.connect(onEventCallback), this.reconnectInterval);
      };

      this.socket.onerror = (err) => {
        console.warn("WebSocket error:", err);
      };
    } catch (e) {
      console.warn("WS init failed:", e);
    }
  },

  updateLiveIndicator(isActive) {
    const el = document.getElementById("realtime-pulse-dot");
    if (el) {
      el.className = isActive 
        ? "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" 
        : "w-2.5 h-2.5 rounded-full bg-amber-400";
    }
  },

  handleIncomingEvent(msg) {
    const ticker = document.getElementById("realtime-ticker-text");
    if (!ticker) return;

    if (msg.event_type === "PRICE_TICK") {
      ticker.innerHTML = `<span class="text-amber-400 font-bold">📈 Live Ticker:</span> ${msg.data.name} @ <strong>₹${msg.data.price}/kg</strong> (${msg.data.change})`;
    } else if (msg.event_type === "NEW_LOT_BROADCAST") {
      ticker.innerHTML = `<span class="text-blue-400 font-bold">📦 New Lot:</span> ${msg.data.lot_code} in <strong>${msg.data.city}</strong> (${msg.data.weight_kg}kg ${msg.data.material})`;
      this.playChime(440, 0.1);
    } else if (msg.event_type === "HANDOVER_VERIFIED") {
      ticker.innerHTML = `<span class="text-emerald-400 font-bold">✓ Scale Verified:</span> ${msg.data.verified_weight_kg}kg settled for <strong>₹${msg.data.payout_inr}</strong> by ${msg.data.recycler}`;
      this.playChime(660, 0.15);
    } else if (msg.event_type === "MINERAL_RECOVERED") {
      ticker.innerHTML = `<span class="text-teal-300 font-bold">💎 Critical Recovery:</span> <strong>${msg.data.gold_grams}g Gold</strong> + <strong>${msg.data.copper_kg}kg Copper</strong> formally extracted.`;
    }
  },

  playChime(freq = 520, duration = 0.1) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }
};

window.RealtimeStream = RealtimeStream;
document.addEventListener('DOMContentLoaded', () => RealtimeStream.init());
