/**
 * E-Waste Intelligence Graph Engine
 * Renders an interactive spatial node graph linking:
 * Collector -> Material -> Price -> Lot -> Recycler -> Transaction -> Handover -> Recovery
 */

const IntelligenceGraph = {
  canvas: null,
  ctx: null,
  nodes: [],
  selectedNode: null,

  init(containerId = "intelligence-graph-canvas") {
    const canvas = document.getElementById(containerId);
    if (!canvas) return;

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    const w = canvas.parentElement.clientWidth || 800;
    const h = canvas.parentElement.clientHeight || 420;
    canvas.width = w;
    canvas.height = h;

    this.buildGraphNodes(w, h);
    this.setupEventListeners();
    this.render();
  },

  buildGraphNodes(w, h) {
    const cx = w / 2;
    const cy = h / 2;

    this.nodes = [
      { id: "collector", label: "Collector", sub: "Munna Bhai (Dharavi)", x: cx - 280, y: cy - 70, r: 28, color: "#10b981", icon: "👤" },
      { id: "material", label: "Material", sub: "Server PCB (18kg)", x: cx - 140, y: cy - 130, r: 28, color: "#38bdf8", icon: "💻" },
      { id: "price", label: "Fair Price", sub: "₹680/kg (₹12,240)", x: cx, y: cy - 150, r: 30, color: "#f59e0b", icon: "💰" },
      { id: "lot", label: "Digital Lot", sub: "EW-2026-004821", x: cx - 80, y: cy + 40, r: 32, color: "#a855f7", icon: "📦" },
      { id: "recycler", label: "Recycler", sub: "EcoGreen (94.5 Trust)", x: cx + 110, y: cy - 40, r: 30, color: "#3b82f6", icon: "🏭" },
      { id: "handover", label: "Handover", sub: "Scale: 17.6kg Verified", x: cx + 180, y: cy + 90, r: 28, color: "#ec4899", icon: "⚖️" },
      { id: "payment", label: "Payment", sub: "Instant Cash/UPI", x: cx + 40, y: cy + 140, r: 28, color: "#10b981", icon: "💵" },
      { id: "recovery", label: "Mineral Recovery", sub: "Au: 533g | Cu: 1067kg", x: cx + 290, y: cy - 110, r: 32, color: "#14b8a6", icon: "💎" }
    ];

    this.edges = [
      { from: "collector", to: "material" },
      { from: "material", to: "price" },
      { from: "material", to: "lot" },
      { from: "price", to: "lot" },
      { from: "lot", to: "recycler" },
      { from: "recycler", to: "handover" },
      { from: "handover", to: "payment" },
      { from: "handover", to: "recovery" }
    ];
  },

  setupEventListeners() {
    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let found = null;
      for (const node of this.nodes) {
        const dist = Math.hypot(node.x - x, node.y - y);
        if (dist <= node.r) {
          found = node;
          break;
        }
      }
      this.selectedNode = found;
      this.render();

      const detailEl = document.getElementById("graph-node-detail");
      if (detailEl && found) {
        detailEl.innerHTML = `
          <div class="p-3 bg-slate-900 border border-slate-700 rounded-xl">
            <strong class="text-white text-sm block">${found.icon} ${found.label} Node</strong>
            <span class="text-xs text-emerald-400 block">${found.sub}</span>
            <p class="text-[11px] text-slate-400 mt-1">Directly correlated in the E-Waste Intelligence Graph to maintain formal traceability from informal waste pickers to hydrometallurgical smelting.</p>
          </div>
        `;
      }
    });
  },

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Edges with glowing gradient
    this.edges.forEach((edge) => {
      const n1 = this.nodes.find((n) => n.id === edge.from);
      const n2 = this.nodes.find((n) => n.id === edge.to);
      if (!n1 || !n2) return;

      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw Nodes
    this.nodes.forEach((node) => {
      const isSelected = this.selectedNode && this.selectedNode.id === node.id;

      // Glow Halo
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r + (isSelected ? 8 : 4), 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "rgba(16, 185, 129, 0.4)" : "rgba(30, 41, 59, 0.5)";
      ctx.fill();

      // Node Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
      ctx.strokeStyle = node.color;
      ctx.lineWidth = isSelected ? 3.5 : 2;
      ctx.stroke();

      // Icon & Label
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.icon, node.x, node.y - 2);

      ctx.font = "bold 11px Plus Jakarta Sans, sans-serif";
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(node.label, node.x, node.y + node.r + 14);

      ctx.font = "9px Plus Jakarta Sans, sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(node.sub.split(" ")[0], node.x, node.y + node.r + 26);
    });
  }
};

window.IntelligenceGraph = IntelligenceGraph;
