const OfflineDB = {
  dbName: "EWasteSaathiOfflineDB",
  version: 1,
  db: null,

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("sync_queue")) {
          db.createObjectStore("sync_queue", { keyPath: "idempotency_key" });
        }
        if (!db.objectStoreNames.contains("cached_prices")) {
          db.createObjectStore("cached_prices", { keyPath: "material_id" });
        }
        if (!db.objectStoreNames.contains("cached_lots")) {
          db.createObjectStore("cached_lots", { keyPath: "idempotency_key" });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };
    });
  },

  async queueItem(entityType, payload) {
    const key = `OFFLINE_${entityType}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const item = {
      local_id: key,
      idempotency_key: key,
      entity_type: entityType,
      device_id: localStorage.getItem("device_id") || "BROWSER_DEVICE_001",
      payload: payload,
      created_at_client: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["sync_queue", "cached_lots"], "readwrite");
      tx.objectStore("sync_queue").put(item);
      if (entityType === "LOT") {
        tx.objectStore("cached_lots").put(item);
      }
      tx.oncomplete = () => resolve(item);
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async getQueue() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["sync_queue"], "readonly");
      const store = tx.objectStore("sync_queue");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async clearQueueItem(idempotencyKey) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["sync_queue"], "readwrite");
      tx.objectStore("sync_queue").delete(idempotencyKey);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async syncAllPending(onSuccessCallback) {
    const items = await this.getQueue();
    if (!items || items.length === 0) return { total: 0, synced: 0 };

    try {
      const res = await fetch("/api/v1/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: localStorage.getItem("device_id") || "BROWSER_DEVICE_001",
          items: items
        })
      });

      if (res.ok) {
        const data = await res.json();
        for (const item of items) {
          await this.clearQueueItem(item.idempotency_key);
        }
        if (onSuccessCallback) onSuccessCallback(data);
        return data;
      }
    } catch (e) {
      console.warn("Network sync failed, will retry next online interval:", e);
    }
  }
};

window.OfflineDB = OfflineDB;
