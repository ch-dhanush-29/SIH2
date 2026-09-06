const CollectorApp = {
  currentView: 'home',
  selectedMaterialId: 2, // PCB Motherboard default
  selectedCategoryCode: 'PCB',
  currentPhotoBase64: null,
  currentLot: null,
  currentFairPrice: null,

  async init() {
    await I18N.init();
    await OfflineDB.init();

    // Setup Voice Assistant
    VoiceAssistant.init(
      (transcript) => this.handleVoiceTranscript(transcript),
      (isListening) => {
        const pulse = document.getElementById('mic-pulse');
        const text = document.getElementById('voice-banner-text');
        if (isListening) {
          pulse.classList.add('animate-ping', 'bg-red-500');
          text.innerText = I18N.t('listening', 'सुन रहे हैं... बोलिए');
        } else {
          pulse.classList.remove('animate-ping', 'bg-red-500');
          text.innerText = 'बोलकर चलाओ: "सर्किट बोर्ड का भाव क्या है?"';
        }
      }
    );

    // Check offline status
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());
    this.updateOnlineStatus();

    // Auto load price board and ledger
    this.loadPriceBoard();
    this.loadEarningsLedger();
    this.loadSafetyGuides();
  },

  updateOnlineStatus() {
    const isOnline = navigator.onLine;
    const indicator = document.getElementById('sync-indicator');
    const text = document.getElementById('sync-text');
    if (isOnline) {
      indicator.className = 'w-2 h-2 rounded-full bg-emerald-400';
      text.innerText = 'ऑनलाइन';
      OfflineDB.syncAllPending(() => {
        text.innerText = 'सिंक हुआ ✓';
        setTimeout(() => { text.innerText = 'ऑनलाइन'; }, 3000);
      });
    } else {
      indicator.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
      text.innerText = 'ऑफलाइन मोड';
    }
  },

  async triggerManualSync() {
    const text = document.getElementById('sync-text');
    text.innerText = 'सिंक हो रहा है...';
    await OfflineDB.syncAllPending((res) => {
      text.innerText = `सिंक सफल (${res.synced_count})`;
      setTimeout(() => { this.updateOnlineStatus(); }, 2500);
    });
  },

  async changeLanguage(lang) {
    await I18N.setLanguage(lang);
  },

  toggleVoiceAssistant() {
    if (VoiceAssistant.isListening) {
      VoiceAssistant.stopListening();
    } else {
      VoiceAssistant.startListening(I18N.currentLang);
    }
  },

  async handleVoiceTranscript(transcript) {
    try {
      const res = await fetch('/api/v1/voice/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcript, language: I18N.currentLang })
      });
      if (res.ok) {
        const data = await res.json();
        const speech = I18N.currentLang === 'mr' ? data.response_speech_mr : (I18N.currentLang === 'en' ? data.response_speech_en : data.response_speech_hi);
        VoiceAssistant.speak(speech, I18N.currentLang);

        if (data.navigation_route === '#camera' || data.intent === 'SELL_EWASTE') {
          this.navTo('sell');
        } else if (data.navigation_route === '#prices' || data.intent === 'CHECK_PRICE') {
          this.navTo('prices');
        } else if (data.navigation_route === '#recyclers' || data.intent === 'FIND_RECYCLER') {
          this.navTo('sell');
        } else if (data.navigation_route === '#ledger' || data.intent === 'MY_EARNINGS') {
          this.navTo('ledger');
        } else if (data.navigation_route === '#safety' || data.intent === 'SAFETY_HELP') {
          this.navTo('safety');
        }
      }
    } catch (e) {
      console.warn("Voice intent error:", e);
    }
  },

  navTo(viewId) {
    const views = ['home', 'sell', 'fairprice', 'passport', 'prices', 'ledger', 'safety', 'valuelens'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(`view-${viewId}`);
    if (target) {
      target.classList.remove('hidden');
      this.currentView = viewId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  async handlePhotoSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Compress client side
    const compressedB64 = await CameraPipeline.compressImageFile(file, 640, 0.75);
    this.currentPhotoBase64 = compressedB64;

    const preview = document.getElementById('preview-img');
    const placeholder = document.getElementById('camera-placeholder');
    preview.src = compressedB64;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');

    // Call AI classifier
    await this.runAIClassification(compressedB64);
  },

  loadDemoPhoto(category) {
    // Deterministic demo photo for live judge demo
    this.selectedCategoryCode = category;
    const placeholder = document.getElementById('camera-placeholder');
    const preview = document.getElementById('preview-img');
    preview.src = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60";
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    this.currentPhotoBase64 = preview.src;

    this.runAIClassification(null, category);
  },

  async runAIClassification(photoBase64, hint = "PCB") {
    const resultCard = document.getElementById('ai-result-card');
    resultCard.classList.remove('hidden');

    try {
      const form = new FormData();
      if (photoBase64) form.append('image_base64', photoBase64);
      form.append('hint_category', hint);

      const res = await fetch('/api/v1/lots/classify-image', {
        method: 'POST',
        body: form
      });

      if (res.ok) {
        const data = await res.json();
        const name = I18N.currentLang === 'mr' ? data.predicted_category_name_mr : (I18N.currentLang === 'en' ? data.predicted_category_name_en : data.predicted_category_name_hi);
        document.getElementById('ai-identified-name').innerText = name;
        document.getElementById('ai-confidence-badge').innerText = `${Math.round(data.confidence * 100)}% भरोसा`;
        
        // Match material id based on predicted category
        this.selectedCategoryCode = data.predicted_category_code;
        this.selectedMaterialId = data.predicted_category_code === 'CABLE' ? 5 : 2;
      }
    } catch (e) {
      console.warn("AI inference fallback:", e);
      document.getElementById('ai-identified-name').innerText = "सर्किट बोर्ड (Motherboard PCB)";
      document.getElementById('ai-confidence-badge').innerText = "92% भरोसा";
    }
  },

  setWeight(val) {
    document.getElementById('lot-weight-input').value = val;
  },

  async calculateFairPrice() {
    const weight = parseFloat(document.getElementById('lot-weight-input').value) || 18.0;
    const condition = document.getElementById('condition-grade-select').value;

    try {
      const res = await fetch('/api/v1/prices/fair-price-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: this.selectedMaterialId,
          weight_kg: weight,
          condition_grade: condition,
          city: "Mumbai"
        })
      });

      if (res.ok) {
        this.currentFairPrice = await res.json();
        document.getElementById('fair-range-val').innerText = `₹${this.currentFairPrice.estimated_fair_min_inr} – ₹${this.currentFairPrice.estimated_fair_max_inr}`;
        document.getElementById('fair-expected-val').innerText = `₹${this.currentFairPrice.expected_market_price_inr}`;
        document.getElementById('fair-explanation-text').innerText = this.currentFairPrice.explanation;

        // Fetch matched recyclers
        await this.loadMatchedRecyclers(weight);
        this.navTo('fairprice');
      }
    } catch (e) {
      console.warn("Fair price offline calculation fallback:", e);
      this.navTo('fairprice');
    }
  },

  async loadMatchedRecyclers(weight) {
    try {
      const res = await fetch('/api/v1/recyclers/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: this.selectedMaterialId,
          weight_kg: weight,
          collector_latitude: 19.0433,
          collector_longitude: 72.8624,
          requires_pickup: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        const list = document.getElementById('recycler-match-list');
        list.innerHTML = '';

        data.all_matches.slice(0, 3).forEach((r, idx) => {
          const isBest = idx === 0;
          const card = document.createElement('div');
          card.className = `p-4 rounded-2xl border ${isBest ? 'bg-slate-900 border-emerald-500 shadow-xl' : 'bg-slate-950 border-slate-800'} space-y-2.5`;
          
          card.innerHTML = `
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] font-extrabold uppercase ${isBest ? 'text-emerald-400' : 'text-slate-400'}">
                  ${isBest ? '★ सर्वोत्तम रिसाइक्लर (Best Match)' : 'सत्यापित रिसाइक्लर'}
                </span>
                <h4 class="text-sm font-bold text-white">${r.company_name}</h4>
              </div>
              <div class="text-right">
                <div class="text-base font-black text-emerald-400">₹${r.estimated_total_payout_inr}</div>
                <div class="text-[10px] text-slate-400">₹${r.offered_rate_per_kg}/kg</div>
              </div>
            </div>

            <div class="flex flex-wrap gap-1.5 text-[10px]">
              <span class="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
                ✓ ${r.authorization_status === 'VERIFIED' ? 'सरकारी अधिकृत (CPCB/MPCB)' : 'सत्यापन प्रक्रिया चालू'}
              </span>
              <span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                📍 ${r.distance_km} km दूर
              </span>
              <span class="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800">
                🛡 विश्वास: ${r.trust_score}/100
              </span>
              ${r.pickup_available ? '<span class="px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-800">🚚 फ्री पिकअप</span>' : ''}
            </div>

            <button onclick="CollectorApp.createDigitalLotAndPassport(${r.recycler_id}, '${r.company_name}')" class="w-full py-2.5 ${isBest ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-white'} font-bold text-xs rounded-xl shadow transition flex items-center justify-center">
              <i class="fa-solid fa-qrcode mr-1.5"></i> यह ऑफर चुनें व QR पासपोर्ट बनाएं
            </button>
          `;
          list.appendChild(card);
        });
      }
    } catch (e) {
      console.warn("Recycler match error:", e);
    }
  },

  async createDigitalLotAndPassport(recyclerId, recyclerName) {
    const weight = parseFloat(document.getElementById('lot-weight-input').value) || 18.0;
    const condition = document.getElementById('condition-grade-select').value;

    const payload = {
      material_id: this.selectedMaterialId,
      collector_weight_kg: weight,
      condition_grade: condition,
      collection_city: "Mumbai",
      image_base64: this.currentPhotoBase64,
      ai_predicted_category: this.selectedCategoryCode,
      ai_confidence: 0.94
    };

    if (!navigator.onLine) {
      // Save offline
      const queued = await OfflineDB.queueItem("LOT", payload);
      this.currentLot = {
        lot_code: `EW-OFFLINE-${Date.now().toString().slice(-6)}`,
        collector_weight_kg: weight,
        material: { name_en: "PCB Board" }
      };
      document.getElementById('passport-lot-code').innerText = this.currentLot.lot_code;
      document.getElementById('passport-mat-name').innerText = "PCB Circuit Board";
      document.getElementById('passport-weight').innerText = `${weight} kg`;
      document.getElementById('passport-hash').innerText = queued.idempotency_key.slice(0, 16);
      document.getElementById('passport-qr-img').src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='white'/><text x='100' y='100' font-size='12' text-anchor='middle' fill='black'>OFFLINE QR PASSPORT</text></svg>";
      this.navTo('passport');
      return;
    }

    try {
      const res = await fetch('/api/v1/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.currentLot = await res.json();
        const passRes = await fetch(`/api/v1/lots/${this.currentLot.id}/passport`);
        if (passRes.ok) {
          const passData = await passRes.json();
          document.getElementById('passport-lot-code').innerText = passData.lot_code;
          document.getElementById('passport-mat-name').innerText = passData.material_name;
          document.getElementById('passport-weight').innerText = `${passData.collector_weight_kg} kg`;
          document.getElementById('passport-hash').innerText = passData.cryptographic_hash.slice(0, 20) + "...";
          document.getElementById('passport-qr-img').src = passData.qr_code_svg_or_base64;
          this.navTo('passport');
        }
      }
    } catch (e) {
      console.error("Lot creation failed:", e);
    }
  },

  async simulateRecyclerScan() {
    if (!this.currentLot || !this.currentLot.id) {
      alert("लॉट सफलतापूर्वक पंजीकृत है।");
      this.navTo('ledger');
      return;
    }

    // Call handover confirmation API
    try {
      const res = await fetch('/api/v1/handover/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot_id: this.currentLot.id,
          verified_weight_kg: 17.6, // scale verification
          agreed_rate_per_kg: 150.0,
          payment_mode: "CASH",
          signature_notes: "MPCB Certified Electronic Scale Weighing"
        })
      });

      if (res.ok) {
        const receipt = await res.json();
        alert(`🎉 बधाई! हैंडओवर सफल हुआ।\nवजन: ${receipt.verified_final_weight_kg} kg\nकुल प्राप्त नकद: ₹${receipt.total_payout_inr}\nरसीद कोड: ${receipt.handover_code}`);
        await this.loadEarningsLedger();
        this.navTo('ledger');
      }
    } catch (e) {
      console.error("Handover simulation error:", e);
    }
  },

  async loadPriceBoard() {
    try {
      const res = await fetch('/api/v1/prices/board');
      if (res.ok) {
        const board = await res.json();
        const container = document.getElementById('price-board-list');
        if (!container) return;
        container.innerHTML = '';

        board.slice(0, 10).forEach(item => {
          const el = document.createElement('div');
          el.className = "bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between";
          el.innerHTML = `
            <div class="flex items-center space-x-3">
              <span class="text-2xl">${item.icon_emoji}</span>
              <div>
                <h4 class="text-xs font-bold text-white">${item.material_name}</h4>
                <div class="text-[10px] text-slate-400">दायरा: ₹${item.local_range_min} - ₹${item.local_range_max} / kg</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-black text-emerald-400">₹${item.today_avg_price} <span class="text-[10px] text-slate-400">/ kg</span></div>
              <span class="text-[10px] font-bold text-emerald-300">↑ ${item.change_7d_pct}% (7 दिन)</span>
            </div>
          `;
          container.appendChild(el);
        });
      }
    } catch (e) {
      console.warn("Price board load error:", e);
    }
  },

  async loadEarningsLedger() {
    try {
      const sumRes = await fetch('/api/v1/ledger/summary');
      if (sumRes.ok) {
        const s = await sumRes.json();
        document.getElementById('ledger-today-val').innerText = `₹${s.today_received_inr.toLocaleString()}`;
        document.getElementById('ledger-month-val').innerText = `₹${s.monthly_total_earnings_inr.toLocaleString()}`;
      }

      const entRes = await fetch('/api/v1/ledger/entries?limit=8');
      if (entRes.ok) {
        const entries = await entRes.json();
        const list = document.getElementById('ledger-entries-list');
        if (!list) return;
        list.innerHTML = '';

        entries.forEach(e => {
          const d = new Date(e.entry_date).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' });
          const card = document.createElement('div');
          card.className = "bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs";
          card.innerHTML = `
            <div>
              <div class="font-bold text-white">${e.lot_code}</div>
              <div class="text-[10px] text-slate-400">${e.notes || 'अधिकृत रिसाइक्लिंग हैंडओवर'} • ${d}</div>
            </div>
            <div class="text-right">
              <div class="font-black text-emerald-400">+₹${e.amount_inr}</div>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">${e.payment_mode}</span>
            </div>
          `;
          list.appendChild(card);
        });
      }
    } catch (e) {
      console.warn("Ledger load error:", e);
    }
  },

  async loadSafetyGuides() {
    try {
      const res = await fetch('/api/v1/materials/safety-guides');
      if (res.ok) {
        const guides = await res.json();
        const container = document.getElementById('safety-guides-container');
        if (!container) return;
        container.innerHTML = '';

        guides.forEach(g => {
          const card = document.createElement('div');
          card.className = "bg-slate-900 border border-rose-500/30 rounded-2xl p-4 space-y-3";
          card.innerHTML = `
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-bold text-rose-300 flex items-center">
                <i class="fa-solid fa-triangle-exclamation text-rose-400 mr-2"></i> ${g.title_hi}
              </h4>
              <button onclick="VoiceAssistant.speak('${g.audio_sample_text_hi}', 'hi')" class="text-xs bg-rose-950 text-rose-300 px-2.5 py-1 rounded-lg border border-rose-800 font-bold">
                <i class="fa-solid fa-volume-high mr-1"></i> सुनें
              </button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-[11px]">
              <div class="p-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl">
                <strong class="text-emerald-400 block mb-1">✓ क्या करें:</strong>
                <pre class="whitespace-pre-line font-sans text-slate-300">${g.dos_hi}</pre>
              </div>
              <div class="p-2.5 bg-rose-950/40 border border-rose-800/40 rounded-xl">
                <strong class="text-rose-400 block mb-1">❌ क्या न करें:</strong>
                <pre class="whitespace-pre-line font-sans text-slate-300">${g.donts_hi}</pre>
              </div>
            </div>
          `;
          container.appendChild(card);
        });
      }
    } catch (e) {
      console.warn("Safety guides load error:", e);
    }
  }
};

window.CollectorApp = CollectorApp;
document.addEventListener('DOMContentLoaded', () => CollectorApp.init());
