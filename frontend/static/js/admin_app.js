const AdminApp = {
  activeTab: 'anomalies',

  async init() {
    await this.loadOverviewMetrics();
    await this.loadAnomalies();
    await this.loadFieldResearch();
    await this.loadAIModels();
    this.runEconomicsSimulation();
  },

  switchTab(tabId) {
    const tabs = ['anomalies', 'impact', 'economics', 'field', 'models'];
    tabs.forEach(t => {
      const el = document.getElementById(`tab-${t}`);
      const btn = document.getElementById(`tab-btn-${t}`);
      if (el) el.classList.add('hidden');
      if (btn) {
        btn.className = "px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 font-bold text-xs rounded-xl";
      }
    });

    const targetEl = document.getElementById(`tab-${tabId}`);
    const targetBtn = document.getElementById(`tab-btn-${tabId}`);
    if (targetEl) targetEl.classList.remove('hidden');
    if (targetBtn) {
      targetBtn.className = "px-4 py-2 bg-slate-800 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/30";
    }
    this.activeTab = tabId;
  },

  async loadOverviewMetrics() {
    try {
      const res = await fetch('/api/v1/admin/metrics');
      if (res.ok) {
        const m = await res.json();
        document.getElementById('stat-collectors').innerText = m.active_collectors.toLocaleString();
        document.getElementById('stat-recyclers').innerText = `${m.active_recyclers} Hubs`;
        document.getElementById('stat-diverted').innerText = `${m.total_diverted_ewaste_kg} kg`;
        document.getElementById('stat-txval').innerText = `₹${(m.total_transaction_value_inr / 100000).toFixed(2)} Lakh`;
        document.getElementById('stat-anomalies').innerText = `${m.active_anomalies_pending_review} Alerts`;
      }
    } catch (e) {
      console.warn("Metrics load error:", e);
    }
  },

  async loadAnomalies() {
    try {
      const res = await fetch('/api/v1/anomalies');
      if (res.ok) {
        const list = await res.json();
        const container = document.getElementById('anomaly-list-container');
        if (!container) return;
        container.innerHTML = '';

        list.forEach(a => {
          const card = document.createElement('div');
          card.className = "bg-slate-900 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4";
          card.innerHTML = `
            <div class="space-y-1 text-xs">
              <div class="flex items-center space-x-2">
                <span class="font-bold text-amber-400 font-mono">${a.anomaly_code}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-950 text-amber-300 border border-amber-800">${a.anomaly_type}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${a.severity === 'HIGH' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'}">${a.severity}</span>
              </div>
              <p class="text-sm font-semibold text-slate-200 mt-1">${a.explanation}</p>
              <div class="text-slate-400">Deviation: <strong class="text-rose-400">${a.deviation_percentage}%</strong> &bull; Benchmark: ₹${a.expected_benchmark_value} vs Observed: ₹${a.observed_value}</div>
            </div>
            <div>
              ${!a.is_resolved ? `
                <button onclick="AdminApp.resolveAnomaly(${a.id})" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-600 transition">
                  <i class="fa-solid fa-check mr-1 text-emerald-400"></i> Mark Reviewed
                </button>
              ` : `
                <span class="text-xs text-emerald-400 font-bold"><i class="fa-solid fa-check-double mr-1"></i> Resolved</span>
              `}
            </div>
          `;
          container.appendChild(card);
        });
      }
    } catch (e) {
      console.warn("Anomalies load error:", e);
    }
  },

  async resolveAnomaly(id) {
    try {
      const res = await fetch(`/api/v1/anomalies/${id}/resolve`, { method: 'POST' });
      if (res.ok) {
        alert("Alert marked reviewed.");
        await this.loadAnomalies();
      }
    } catch (e) {
      console.error("Resolve error:", e);
    }
  },

  async runEconomicsSimulation() {
    const kg = parseFloat(document.getElementById('input-kg').value) || 25;
    const infRate = parseFloat(document.getElementById('input-inf-rate').value) || 85;
    const forRate = parseFloat(document.getElementById('input-for-rate').value) || 120;

    document.getElementById('val-kg').innerText = `${kg} kg`;
    document.getElementById('val-inf-rate').innerText = `₹${infRate}/kg`;
    document.getElementById('val-for-rate').innerText = `₹${forRate}/kg`;

    try {
      const res = await fetch('/api/v1/admin/unit-economics/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daily_collection_kg: kg,
          informal_middleman_rate_per_kg: infRate,
          formal_recycler_rate_per_kg: forRate,
          collector_transport_cost_informal: 150.0,
          collector_transport_cost_formal: 0.0,
          informal_loss_sorting_pct: 12.0,
          formal_loss_pct: 0.0
        })
      });

      if (res.ok) {
        const data = await res.json();
        document.getElementById('econ-pct-badge').innerText = `+${data.percentage_income_increase}% Income Increase`;
        document.getElementById('econ-inf-net').innerText = `₹${Math.round(data.daily_informal_net_earnings_inr * 26).toLocaleString()}`;
        document.getElementById('econ-for-net').innerText = `₹${Math.round(data.daily_formal_net_earnings_inr * 26).toLocaleString()}`;
      }
    } catch (e) {
      console.warn("Economics simulation error:", e);
    }
  },

  async loadFieldResearch() {
    try {
      const res = await fetch('/api/v1/field-research');
      if (res.ok) {
        const records = await res.json();
        const container = document.getElementById('field-research-container');
        if (!container) return;
        container.innerHTML = '';

        records.forEach(r => {
          const card = document.createElement('div');
          card.className = "bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs";
          card.innerHTML = `
            <div class="flex items-center justify-between">
              <strong class="text-sm font-bold text-white">${r.informal_collector_pseudonym}</strong>
              <span class="text-slate-400">📍 ${r.location_hub}</span>
            </div>
            <div class="text-slate-300"><strong>Observed Material:</strong> ${r.observed_material} (${r.observed_daily_volume_kg} kg/day @ ₹${r.current_informal_rate_inr}/kg)</div>
            <div class="text-rose-300"><strong>Health Hazards Noted:</strong> ${r.reported_health_hazards}</div>
            <div class="text-amber-300"><strong>Barriers to Formalization:</strong> ${r.barriers_to_formal_recycling}</div>
          `;
          container.appendChild(card);
        });
      }
    } catch (e) {
      console.warn("Field research load error:", e);
    }
  },

  async loadAIModels() {
    try {
      const res = await fetch('/api/v1/admin/ai-models');
      if (res.ok) {
        const models = await res.json();
        const container = document.getElementById('ai-models-table');
        if (!container) return;
        container.innerHTML = '';

        models.forEach(m => {
          const card = document.createElement('div');
          card.className = "bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs";
          card.innerHTML = `
            <div>
              <div class="font-bold text-white">${m.model_name} <span class="text-slate-400 font-mono text-[10px]">${m.version}</span></div>
              <div class="text-[10px] text-slate-400">${m.notes}</div>
            </div>
            <div class="text-right">
              <span class="font-mono text-emerald-400 font-bold">F1: ${m.evaluation_f1_score}</span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 ml-2">${m.deployment_status}</span>
            </div>
          `;
          container.appendChild(card);
        });
      }
    } catch (e) {
      console.warn("AI models load error:", e);
    }
  }
};

window.AdminApp = AdminApp;
document.addEventListener('DOMContentLoaded', () => AdminApp.init());
