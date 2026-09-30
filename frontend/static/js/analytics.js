/**
 * E-Waste Saathi — Real-Time Analytics Controller
 * Handles live Chart.js rendering, incremental state updates via /ws/live,
 * and automated data fetching from /api/v1/analytics/*
 */

let collectionChart = null;
let materialChart = null;
let currentTrendInterval = '24h';
let liveEventsBuffer = [];
let analyticsInitialized = false;
let telemetryTimer = null;

// Metric Trackers
let liveState = {
  totalWeight: 0,
  totalValue: 0,
  activeLots: 0,
  handovers: 0,
  anomalies: 0,
  recoveryRate: 0
};

async function initAnalytics() {
  await Promise.all([
    fetchSummary(),
    fetchCollectionTrend(currentTrendInterval),
    fetchMaterialsMix(),
    fetchPricingMatrix(),
    fetchAnomalyAnalytics(),
    fetchImpactAnalytics(),
    fetchFunnelAnalytics(),
    fetchSystemTelemetry()
  ]);

  if (!analyticsInitialized) {
    analyticsInitialized = true;
    // Subscribe to RealtimeStream once
    if (window.RealtimeStream) {
      window.RealtimeStream.onAny((evt) => handleRealtimeAnalyticsEvent(evt));
    }
  }

  // Periodic telemetry refresh
  if (telemetryTimer) clearInterval(telemetryTimer);
  telemetryTimer = setInterval(fetchSystemTelemetry, 15000);
}

async function refreshAllAnalytics() {
  await Promise.all([
    fetchSummary(),
    fetchCollectionTrend(currentTrendInterval),
    fetchMaterialsMix(),
    fetchPricingMatrix(),
    fetchAnomalyAnalytics(),
    fetchImpactAnalytics(),
    fetchFunnelAnalytics(),
    fetchSystemTelemetry()
  ]);
}

async function fetchSummary() {
  try {
    const res = await fetch('/api/v1/analytics/summary');
    if (res.ok) {
      const data = await res.json();
      liveState.activeLots = data.active_lots || 0;
      liveState.totalWeight = data.total_weight_kg || 0;
      liveState.totalValue = data.total_value_inr || 0;
      liveState.handovers = data.verified_handovers || 0;
      liveState.anomalies = data.active_anomalies || 0;
      liveState.recoveryRate = data.recovery_rate_pct || 0;

      renderSummaryKPIs();

      // Simulation mode indicator tag
      const modeTag = document.getElementById('simModeTag');
      if (modeTag) {
        if (data.simulation_state === 'ACTIVE') {
          modeTag.className = "px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold";
          modeTag.innerText = "● DEMO SIMULATION ACTIVE";
        } else {
          modeTag.className = "px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold";
          modeTag.innerText = "● LIVE APPLICATION DATA";
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch analytics summary:", err);
  }
}

function renderSummaryKPIs() {
  const elWeight = document.getElementById('statTotalWeight');
  const elValue = document.getElementById('statTotalValue');
  const elLots = document.getElementById('statActiveLots');
  const elHandovers = document.getElementById('statHandovers');
  const elAnomalies = document.getElementById('statAnomalies');
  const elRecovery = document.getElementById('statRecoveryRate');

  if (elWeight) elWeight.innerText = `${Math.round(liveState.totalWeight).toLocaleString()} kg`;
  if (elValue) {
    if (liveState.totalValue >= 100000) {
      elValue.innerText = `₹${(liveState.totalValue / 100000).toFixed(2)} L`;
    } else {
      elValue.innerText = `₹${Math.round(liveState.totalValue).toLocaleString()}`;
    }
  }
  if (elLots) elLots.innerText = liveState.activeLots;
  if (elHandovers) elHandovers.innerText = liveState.handovers;
  if (elAnomalies) elAnomalies.innerText = liveState.anomalies;
  if (elRecovery) elRecovery.innerText = `${liveState.recoveryRate}%`;
}

async function fetchCollectionTrend(interval = '24h') {
  try {
    const res = await fetch(`/api/v1/analytics/collection?interval=${interval}`);
    if (res.ok) {
      const data = await res.json();
      renderCollectionChart(data.points || []);
      const updateEl = document.getElementById('collectionLastUpdated');
      if (updateEl) updateEl.innerText = `Updated: ${new Date().toLocaleTimeString()}`;
    }
  } catch (err) {
    console.warn("Could not fetch collection trend:", err);
  }
}

function renderCollectionChart(points) {
  const ctx = document.getElementById('collectionTrendChart');
  if (!ctx) return;

  const labels = points.map(p => p.label);
  const weights = points.map(p => p.weight_kg);

  if (collectionChart) {
    collectionChart.data.labels = labels;
    collectionChart.data.datasets[0].data = weights;
    collectionChart.update();
    return;
  }

  collectionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Collected Weight (kg)',
        data: weights,
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#047857',
        pointRadius: 3,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (item) => ` ${item.parsed.y} kg`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'IBM Plex Mono', size: 10 }, color: '#667085' }
        },
        y: {
          grid: { color: '#F1F5F9' },
          ticks: { font: { family: 'IBM Plex Mono', size: 10 }, color: '#667085' }
        }
      }
    }
  });
}

function switchTrendInterval(interval, btn) {
  currentTrendInterval = interval;
  document.querySelectorAll('.trend-btn').forEach(b => {
    b.className = "trend-btn px-2 py-1 rounded-lg bg-slate-100 text-brandDark hover:bg-slate-200 text-xs font-mono";
  });
  if (btn) {
    btn.className = "trend-btn active px-2.5 py-1 rounded-lg bg-brandDark text-white font-bold text-xs font-mono";
  }
  fetchCollectionTrend(interval);
}

async function fetchMaterialsMix() {
  try {
    const res = await fetch('/api/v1/analytics/materials');
    if (res.ok) {
      const data = await res.json();
      renderMaterialsMix(data.materials || []);
    }
  } catch (err) {
    console.warn("Could not fetch materials mix:", err);
  }
}

function renderMaterialsMix(materials) {
  const ctx = document.getElementById('materialMixChart');
  const listEl = document.getElementById('materialMixList');
  if (!ctx || !listEl) return;

  const labels = materials.map(m => m.name);
  const weights = materials.map(m => m.weight_kg);
  const colors = ['#2563EB', '#059669', '#D89B1D', '#F59E0B', '#64748B', '#9333EA', '#DC2626'];

  if (materialChart) {
    materialChart.data.labels = labels;
    materialChart.data.datasets[0].data = weights;
    materialChart.update();
  } else {
    materialChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: weights,
          backgroundColor: colors.slice(0, materials.length),
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });
  }

  listEl.innerHTML = materials.slice(0, 4).map((m, idx) => `
    <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-brandBorder">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${colors[idx % colors.length]}"></span>
        <span class="text-brandDark font-medium">${m.icon} ${m.name}</span>
      </div>
      <div class="text-right">
        <span class="font-bold text-brandDark">${m.weight_kg} kg</span>
        <span class="text-[10px] text-brandSecondary ml-1">(${m.share_pct}%)</span>
      </div>
    </div>
  `).join('');
}

async function fetchPricingMatrix() {
  try {
    const res = await fetch('/api/v1/analytics/pricing');
    if (res.ok) {
      const data = await res.json();
      const tbody = document.getElementById('pricingTableBody');
      if (tbody && data.pricing_matrix) {
        tbody.innerHTML = data.pricing_matrix.slice(0, 5).map(p => `
          <tr class="hover:bg-slate-50">
            <td class="py-2.5 font-medium text-brandDark">${p.material_name}</td>
            <td class="py-2.5 text-right text-brandSecondary">₹${p.informal_rate_inr}/${p.unit}</td>
            <td class="py-2.5 text-right font-bold text-brandBlue">₹${p.fair_price_inr}/${p.unit}</td>
            <td class="py-2.5 text-right font-bold text-brandGreen">+${p.collector_uplift_pct}%</td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.warn("Could not fetch pricing matrix:", err);
  }
}

async function fetchAnomalyAnalytics() {
  try {
    const res = await fetch('/api/v1/analytics/anomalies');
    if (res.ok) {
      const data = await res.json();
      const elTotal = document.getElementById('statAnomTotal');
      const elRes = document.getElementById('statAnomResolved');
      const listEl = document.getElementById('anomalyDistributionList');

      if (elTotal) elTotal.innerText = data.total_anomalies_detected || 0;
      if (elRes) elRes.innerText = data.resolved_anomalies || 0;

      if (listEl && data.distribution) {
        listEl.innerHTML = data.distribution.map(d => `
          <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-brandBorder">
            <span class="text-brandDark font-sans">${d.label}</span>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${d.severity === 'CRITICAL' ? 'bg-red-50 text-brandDanger border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}">${d.severity}</span>
              <span class="font-bold text-brandDark">${d.count}</span>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.warn("Could not fetch anomaly analytics:", err);
  }
}

async function fetchImpactAnalytics() {
  try {
    const res = await fetch('/api/v1/analytics/impact');
    if (res.ok) {
      const data = await res.json();
      const grid = document.getElementById('impactMetricsGrid');
      if (grid && data.metrics) {
        const m = data.metrics;
        grid.innerHTML = `
          <div class="p-3 rounded-2xl bg-slate-50 border border-brandBorder">
            <div class="text-[10px] text-brandSecondary font-sans">E-Waste Diverted</div>
            <div class="text-base font-bold text-brandGreen mt-0.5">${m.ewaste_diverted_kg.value} kg</div>
            <div class="text-[9px] text-brandSecondary mt-1">${m.ewaste_diverted_kg.tag}</div>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 border border-brandBorder">
            <div class="text-[10px] text-brandSecondary font-sans">CO₂ Avoided</div>
            <div class="text-base font-bold text-brandBlue mt-0.5">${m.co2_avoided_kg.value} kg</div>
            <div class="text-[9px] text-brandSecondary mt-1">${m.co2_avoided_kg.tag}</div>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 border border-brandBorder">
            <div class="text-[10px] text-brandSecondary font-sans">Water Saved</div>
            <div class="text-base font-bold text-brandDark mt-0.5">${m.water_saved_liters.value} L</div>
            <div class="text-[9px] text-brandSecondary mt-1">${m.water_saved_liters.tag}</div>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 border border-brandBorder">
            <div class="text-[10px] text-brandSecondary font-sans">Copper Yield</div>
            <div class="text-base font-bold text-brandGold mt-0.5">${m.copper_recovered_kg.value} kg</div>
            <div class="text-[9px] text-brandSecondary mt-1">${m.copper_recovered_kg.tag}</div>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 border border-brandBorder">
            <div class="text-[10px] text-brandSecondary font-sans">Gold Recovered</div>
            <div class="text-base font-bold text-brandGold mt-0.5">${m.gold_recovered_grams.value} g</div>
            <div class="text-[9px] text-brandSecondary mt-1">${m.gold_recovered_grams.tag}</div>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 border border-brandBorder">
            <div class="text-[10px] text-brandSecondary font-sans">Lithium Yield</div>
            <div class="text-base font-bold text-brandGreen mt-0.5">${m.lithium_recovered_kg.value} kg</div>
            <div class="text-[9px] text-brandSecondary mt-1">${m.lithium_recovered_kg.tag}</div>
          </div>
        `;
      }
    }
  } catch (err) {
    console.warn("Could not fetch impact analytics:", err);
  }
}

async function fetchFunnelAnalytics() {
  try {
    const res = await fetch('/api/v1/analytics/funnel');
    if (res.ok) {
      const data = await res.json();
      const container = document.getElementById('funnelStagesContainer');
      if (container && data.stages) {
        container.innerHTML = data.stages.map((s, idx) => `
          <div class="p-3 rounded-2xl ${idx === data.stages.length - 1 ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-brandBorder'}">
            <div class="text-[10px] ${idx === data.stages.length - 1 ? 'text-emerald-800 font-bold' : 'text-brandSecondary'} font-sans">${s.stage}</div>
            <div class="text-sm font-bold ${idx === data.stages.length - 1 ? 'text-brandGreen' : 'text-brandDark'} mt-1">${s.pct}%</div>
            <div class="text-[9px] text-brandSecondary mt-0.5">${s.count} lots</div>
          </div>
        `).join('');
      }

      if (data.turnaround_velocity) {
        const vel = data.turnaround_velocity;
        const elHandover = document.getElementById('velHandover');
        const elAi = document.getElementById('velAi');
        const elPayout = document.getElementById('velPayout');
        if (elHandover) elHandover.innerText = `${vel.avg_handover_hours} hours`;
        if (elAi) elAi.innerText = `${vel.ai_classification_ms} ms`;
        if (elPayout) elPayout.innerText = `${vel.escrow_payout_seconds} seconds`;
      }
    }
  } catch (err) {
    console.warn("Could not fetch funnel analytics:", err);
  }
}

async function fetchSystemTelemetry() {
  try {
    const res = await fetch('/api/v1/analytics/system');
    if (res.ok) {
      const data = await res.json();
      const elCpu = document.getElementById('telemetryCpu');
      const elMem = document.getElementById('telemetryMem');
      const elUptime = document.getElementById('telemetryUptime');

      if (elCpu) elCpu.innerText = `${data.cpu_usage_pct}%`;
      if (elMem) elMem.innerText = `${data.memory_usage_mb} MB`;
      if (elUptime) elUptime.innerText = data.uptime_formatted;
    }
  } catch (err) {
    console.warn("Could not fetch system telemetry:", err);
  }
}

function handleRealtimeAnalyticsEvent(evt) {
  liveEventsBuffer.unshift(evt);
  if (liveEventsBuffer.length > 50) liveEventsBuffer.pop();

  renderMiniEventStream();

  // Incremental KPI updates from event payload
  if (evt.event === 'LOT_CREATED') {
    liveState.activeLots++;
    renderSummaryKPIs();
  } else if (evt.event === 'WEIGHT_CAPTURED') {
    const w = parseFloat(evt.data?.weight_kg || evt.data?.certified_weight_kg || 0);
    if (w > 0) {
      liveState.totalWeight += w;
      renderSummaryKPIs();
      if (collectionChart && collectionChart.data.datasets[0].data.length > 0) {
        const lastIdx = collectionChart.data.datasets[0].data.length - 1;
        collectionChart.data.datasets[0].data[lastIdx] += w;
        collectionChart.update('none');
      }
    }
  } else if (evt.event === 'PAYMENT_COMPLETED') {
    const amt = parseFloat(evt.data?.amount_inr || evt.data?.final_amount_inr || 0);
    if (amt > 0) {
      liveState.totalValue += amt;
      renderSummaryKPIs();
    }
  } else if (evt.event === 'HANDOVER_VERIFIED') {
    liveState.handovers++;
    renderSummaryKPIs();
  } else if (evt.event === 'ANOMALY_DETECTED') {
    liveState.anomalies++;
    renderSummaryKPIs();
  }
}

function renderMiniEventStream() {
  const listEl = document.getElementById('analyticsEventList');
  if (!listEl) return;

  listEl.innerHTML = liveEventsBuffer.slice(0, 5).map(e => {
    const time = e.timestamp ? e.timestamp.substring(11, 19) : new Date().toLocaleTimeString();
    return `
      <div class="p-2 rounded-xl bg-slate-50 border border-brandBorder flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full ${e.severity === 'alert' ? 'bg-red-500' : (e.severity === 'success' ? 'bg-emerald-500' : 'bg-blue-500')}"></span>
          <span class="font-bold text-brandDark">${e.event}</span>
        </div>
        <span class="text-brandSecondary font-mono text-[10px]">${time}</span>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  initAnalytics();
});
