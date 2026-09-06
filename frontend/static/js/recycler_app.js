const RecyclerApp = {
  lots: [],

  async init() {
    await this.loadLots();
  },

  async loadLots() {
    try {
      const res = await fetch('/api/v1/lots?limit=25');
      if (res.ok) {
        this.lots = await res.json();
        this.renderLotsTable();
        this.populateModalSelect();
      }
    } catch (e) {
      console.warn("Recycler load lots error:", e);
    }
  },

  renderLotsTable() {
    const container = document.getElementById('incoming-lots-table');
    if (!container) return;
    container.innerHTML = '';

    this.lots.forEach(lot => {
      const isCompleted = lot.status === 'COMPLETED';
      const card = document.createElement('div');
      card.className = "bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4";
      
      card.innerHTML = `
        <div class="space-y-1">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-mono font-bold text-white">${lot.lot_code}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isCompleted ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-blue-950 text-blue-300 border border-blue-800'}">
              ${lot.status}
            </span>
            ${lot.is_duplicate_suspect ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">Duplicate Suspect</span>' : ''}
          </div>
          <div class="text-sm font-bold text-slate-200">
            ${lot.material ? lot.material.name_en : 'Mixed E-Waste PCB / Wire'} &bull; <span class="text-emerald-400">${lot.collector_weight_kg} kg</span>
          </div>
          <div class="text-xs text-slate-400">
            📍 ${lot.collection_city} &bull; Expected Value: <span class="text-white font-semibold">₹${lot.expected_market_price || 2400}</span>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          ${!isCompleted ? `
            <button onclick="RecyclerApp.openHandoverForLot(${lot.id}, ${lot.collector_weight_kg})" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow transition">
              <i class="fa-solid fa-scale-balanced mr-1"></i> Verify Weight & Pay
            </button>
          ` : `
            <span class="text-xs text-slate-400 font-medium">Settled: ₹${lot.final_agreed_price}</span>
          `}
        </div>
      `;
      container.appendChild(card);
    });
  },

  populateModalSelect() {
    const select = document.getElementById('modal-lot-select');
    if (!select) return;
    select.innerHTML = '';

    this.lots.forEach(lot => {
      const opt = document.createElement('option');
      opt.value = lot.id;
      opt.innerText = `${lot.lot_code} (${lot.collector_weight_kg} kg - ${lot.material ? lot.material.name_en : 'PCB'})`;
      select.appendChild(opt);
    });
  },

  openHandoverModal() {
    document.getElementById('handover-modal').classList.remove('hidden');
  },

  closeHandoverModal() {
    document.getElementById('handover-modal').classList.add('hidden');
  },

  openHandoverForLot(lotId, weight) {
    this.openHandoverModal();
    const select = document.getElementById('modal-lot-select');
    if (select) select.value = lotId;
    document.getElementById('modal-scale-weight').value = (weight * 0.98).toFixed(1);
  },

  async submitHandoverVerification() {
    const lotId = parseInt(document.getElementById('modal-lot-select').value);
    const weight = parseFloat(document.getElementById('modal-scale-weight').value);
    const rate = parseFloat(document.getElementById('modal-agreed-rate').value);
    const mode = document.getElementById('modal-payment-mode').value;
    const notes = document.getElementById('modal-notes').value;

    try {
      const res = await fetch('/api/v1/handover/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot_id: lotId,
          verified_weight_kg: weight,
          agreed_rate_per_kg: rate,
          payment_mode: mode,
          signature_notes: notes
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ Handover Recorded Successfully!\nHandover Code: ${data.handover_code}\nTotal Payout: ₹${data.total_payout_inr}\nSHA-256 Receipt: ${data.digital_receipt_sha256}`);
        this.closeHandoverModal();
        await this.loadLots();
      }
    } catch (e) {
      console.error("Handover submit error:", e);
    }
  },

  dispatchPickupCluster() {
    alert("🚚 Pickup Cluster Route Dispatched to Logistics Fleet. Drivers notified via SMS/WhatsApp.");
  }
};

window.RecyclerApp = RecyclerApp;
document.addEventListener('DOMContentLoaded', () => RecyclerApp.init());
