(function () {
  "use strict";

  const AUTOSAVE_PREF_KEY = "kickru-autosave-local-v1";
  const IDB_NAME = "kickru-fs-handle-db";
  const IDB_STORE = "handles";
  const IDB_KEY = "savesDir";

  let isOpen = false;
  let activeFilter = "all"; // all | player | manager | bundle
  let serverOnline = false;
  let serverFolderPath = "";
  let serverFiles = [];
  let pcDirHandle = null;
  let pcFiles = [];
  let customSlotName = "";
  let deferredInstallPrompt = null;
  let playerAutoTimer = null;
  let managerAutoTimer = null;

  function getBase() {
    return window.__KICKRU_BASE__ || "/";
  }

  function getBridge() {
    return window.__KICKRU_BRIDGE__ || null;
  }

  function isAutosaveEnabled() {
    try {
      return localStorage.getItem(AUTOSAVE_PREF_KEY) !== "0";
    } catch {
      return true;
    }
  }

  function setAutosaveEnabled(val) {
    try {
      localStorage.setItem(AUTOSAVE_PREF_KEY, val ? "1" : "0");
    } catch {}
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(msg) {
    let el = document.getElementById("ks-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "ks-toast";
      el.className = "ks-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("is-show"), 2800);
  }

  function ensureStyle() {
    if (document.head && !document.querySelector('link[rel="manifest"]')) {
      const m = document.createElement("link");
      m.rel = "manifest";
      m.href = getBase() + "manifest.webmanifest";
      document.head.appendChild(m);
      const a = document.createElement("link");
      a.rel = "apple-touch-icon";
      a.href = getBase() + "icons/icon-192.png";
      document.head.appendChild(a);
    }
    if (document.getElementById("ks-style")) return;
    const style = document.createElement("style");
    style.id = "ks-style";
    style.textContent = `
      .ks-topbar-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 32px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid #d1d9e0;
        background: #ecfdf5;
        color: #15803d;
        font-family: inherit;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s ease;
      }
      .ks-topbar-btn:hover { background: #15803d; border-color: #15803d; color: #fff; }
      .ks-install-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 32px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid #bfdbfe;
        background: #eff6ff;
        color: #1d4ed8;
        font-family: inherit;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        white-space: nowrap;
      }
      .ks-install-btn:hover { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
      html[data-theme="dark"] .ks-topbar-btn { background: rgba(21, 128, 61, 0.22); border-color: #166534; color: #4ade80; }
      html[data-theme="dark"] .ks-install-btn { background: rgba(29, 78, 216, 0.22); border-color: #1e40af; color: #93c5fd; }

      .ks-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 10050;
        background: rgba(8, 13, 24, 0.65);
        backdrop-filter: blur(5px);
        align-items: center;
        justify-content: center;
        padding: 14px;
      }
      .ks-backdrop.is-open { display: flex; }
      .ks-modal {
        width: 100%;
        max-width: 680px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        border-radius: 18px;
        overflow: hidden;
        background: var(--gm-card, #ffffff);
        color: var(--gm-text, #111827);
        border: 1px solid var(--gm-border, #e5e7eb);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
        font-family: inherit;
      }
      html[data-theme="dark"] .ks-modal {
        background: #181c23;
        color: #f3f4f6;
        border-color: #2c3340;
      }
      @media (prefers-color-scheme: dark) {
        html:not([data-theme="light"]) .ks-modal {
          background: #181c23;
          color: #f3f4f6;
          border-color: #2c3340;
        }
      }
      .ks-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 14px 18px;
        border-bottom: 1px solid var(--gm-border, #e5e7eb);
      }
      .ks-header h2 { margin: 0; font-size: 16px; font-weight: 900; }
      .ks-header-sub { font-size: 11px; color: var(--gm-muted, #6b7280); margin-top: 2px; word-break: break-all; }
      .ks-close-btn {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        border: 1px solid var(--gm-border, #e5e7eb);
        background: transparent;
        color: inherit;
        font-size: 18px;
        font-weight: 800;
        cursor: pointer;
      }
      .ks-body {
        flex: 1;
        overflow-y: auto;
        padding: 14px 18px 18px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .ks-card {
        border: 1px solid var(--gm-border, #e5e7eb);
        border-radius: 14px;
        padding: 13px;
        background: rgba(128, 128, 128, 0.04);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .ks-card-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 13px;
        font-weight: 850;
      }
      .ks-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .ks-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 9px 13px;
        border-radius: 10px;
        border: 1px solid var(--gm-border, #d1d5db);
        background: var(--gm-card, #ffffff);
        color: inherit;
        font-family: inherit;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.12s ease;
      }
      html[data-theme="dark"] .ks-btn { background: #232833; border-color: #374151; }
      .ks-btn:hover:not(:disabled) { transform: translateY(-1px); border-color: #22c55e; }
      .ks-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      .ks-btn.is-primary { background: #16a34a; border-color: #16a34a; color: #fff; }
      .ks-btn.is-blue { background: #2563eb; border-color: #2563eb; color: #fff; }
      .ks-btn.is-gold { background: #d97706; border-color: #d97706; color: #fff; }
      .ks-btn.is-danger { color: #dc2626; border-color: #fecaca; }
      .ks-btn.is-sm { padding: 6px 10px; font-size: 11px; border-radius: 8px; }
      .ks-input {
        flex: 1;
        min-width: 150px;
        padding: 8px 11px;
        border-radius: 10px;
        border: 1px solid var(--gm-border, #d1d5db);
        background: var(--gm-card, #ffffff);
        color: inherit;
        font-family: inherit;
        font-size: 12px;
      }
      html[data-theme="dark"] .ks-input { background: #11151c; border-color: #374151; }
      .ks-tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .ks-tab {
        padding: 6px 11px;
        border-radius: 999px;
        border: 1px solid var(--gm-border, #d1d5db);
        background: transparent;
        color: inherit;
        font-family: inherit;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
      }
      .ks-tab.is-active { background: #16a34a; border-color: #16a34a; color: #fff; }
      .ks-list { display: flex; flex-direction: column; gap: 8px; }
      .ks-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid var(--gm-border, #e5e7eb);
        background: var(--gm-card, #ffffff);
      }
      html[data-theme="dark"] .ks-item { background: #1f242d; border-color: #2f3744; }
      .ks-item-main { min-width: 0; flex: 1; }
      .ks-item-title { font-size: 13px; font-weight: 850; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .ks-item-sub { font-size: 11px; color: var(--gm-muted, #6b7280); margin-top: 2px; word-break: break-all; }
      .ks-pill {
        display: inline-flex;
        align-items: center;
        padding: 2px 7px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 850;
        background: #dcfce7;
        color: #15803d;
      }
      .ks-pill.is-blue { background: #dbeafe; color: #1d4ed8; }
      .ks-pill.is-gold { background: #fef3c7; color: #b45309; }
      .ks-pill.is-gray { background: #e5e7eb; color: #374151; }
      html[data-theme="dark"] .ks-pill { background: rgba(34, 197, 94, 0.2); color: #86efac; }
      html[data-theme="dark"] .ks-pill.is-blue { background: rgba(59, 130, 246, 0.22); color: #93c5fd; }
      html[data-theme="dark"] .ks-pill.is-gold { background: rgba(245, 158, 11, 0.22); color: #fcd34d; }
      html[data-theme="dark"] .ks-pill.is-gray { background: rgba(156, 163, 175, 0.2); color: #d1d5db; }
      .ks-toast {
        position: fixed;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%) translateY(20px);
        opacity: 0;
        pointer-events: none;
        z-index: 10100;
        padding: 10px 16px;
        border-radius: 999px;
        background: #111827;
        color: #fff;
        font-size: 12px;
        font-weight: 800;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
      }
      .ks-toast.is-show { opacity: 1; transform: translateX(-50%) translateY(0); }
    `;
    document.head.appendChild(style);
  }

  // IndexedDB persistence for user-selected PC folder handle (File System Access API)
  function openHandleDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("IndexedDB unavailable"));
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function loadStoredDirHandle() {
    try {
      const db = await openHandleDb();
      return await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async function saveStoredDirHandle(handle) {
    try {
      const db = await openHandleDb();
      await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {}
  }

  function buildPlayerMeta(life, isAuto = false) {
    const p = life?.core?.player || {};
    const bridge = getBridge();
    const clubName = bridge?.r6?.clubMap?.[life?.core?.clubId]?.localName || life?.core?.clubId || "";
    const ovr = window.__KICKRU_EDITOR__?.calcOvr ? window.__KICKRU_EDITOR__.calcOvr(p) : Math.round(p.ovr || 50);
    return {
      kind: "player",
      title: `${p.name || "선수"} (${p.age || 17}세 · ${p.position || "ST"})`,
      subtitle: `${life?.core?.year || 2026}시즌 · ${clubName} · OVR ${ovr}`,
      year: Number(life?.core?.year) || 2026,
      ovr,
      isAuto,
      data: life,
    };
  }

  function buildManagerMeta(st, isAuto = false) {
    const bridge = getBridge();
    const club = window.__KICKRU_MANAGER__?.getClub ? window.__KICKRU_MANAGER__.getClub(st?.clubId) : bridge?.r6?.clubMap?.[st?.clubId];
    const league = window.__KICKRU_MANAGER__?.getLeague ? window.__KICKRU_MANAGER__.getLeague(st?.leagueId) : bridge?.r6?.leagueMap?.[st?.leagueId];
    const stats = window.__KICKRU_MANAGER__?.computeTeamStats
      ? window.__KICKRU_MANAGER__.computeTeamStats(st)
      : { total: club?.strength || 70 };
    return {
      kind: "manager",
      title: `${club?.localName || st.clubId} (감독: ${st?.manager?.name || "감독"})`,
      subtitle: `${st.year}시즌 ${st.round}/${st.schedule?.length || 0}R · ${league?.name || st.leagueId || ""} · OVR ${stats.total}`,
      year: Number(st.year) || 2026,
      ovr: Number(stats.total) || 70,
      isAuto,
      data: st,
    };
  }

  function normalizeIncomingSave(obj, fallbackName = "imported.json") {
    if (!obj || typeof obj !== "object") throw new Error("올바른 JSON 형식이 아닙니다.");
    if (obj.format === "kickru-local-save-v1" && obj.data) {
      return obj;
    }
    if (obj.core && obj.core.player) {
      return { format: "kickru-local-save-v1", ...buildPlayerMeta(obj, false), savedAt: new Date().toISOString() };
    }
    if (obj.clubId && Array.isArray(obj.squad)) {
      return { format: "kickru-local-save-v1", ...buildManagerMeta(obj, false), savedAt: new Date().toISOString() };
    }
    if (obj.playerLife || obj.managerState) {
      return {
        format: "kickru-local-save-v1",
        kind: "bundle",
        title: obj.title || fallbackName.replace(/\.json$/i, ""),
        subtitle: "선수 + 구단 통합 백업",
        year: obj.year || 2026,
        ovr: obj.ovr || 0,
        savedAt: new Date().toISOString(),
        data: obj,
      };
    }
    throw new Error("킥루 선수 또는 감독 세이브 파일이 아닙니다.");
  }

  function safeSlug(text) {
    return String(text || "save")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1f\s]+/g, "_")
      .slice(0, 48);
  }

  function getTimestampTag() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  async function refreshServerSaves() {
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 2000) : null;
      const res = await fetch(getBase() + "api/local-saves", {
        cache: "no-store",
        signal: controller?.signal,
      });
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      if (json && json.ok) {
        serverOnline = true;
        serverFolderPath = json.folderPath || "";
        serverFiles = (json.files || []).map((f) => ({ ...f, source: "server" }));
        return true;
      }
    } catch {
      serverOnline = false;
      serverFiles = [];
    }
    return false;
  }

  async function refreshPcFolderSaves(requestPermission = false) {
    if (!pcDirHandle) pcDirHandle = await loadStoredDirHandle();
    if (!pcDirHandle) {
      pcFiles = [];
      return false;
    }
    try {
      let perm = await pcDirHandle.queryPermission({ mode: "readwrite" });
      if (perm !== "granted" && requestPermission) {
        perm = await pcDirHandle.requestPermission({ mode: "readwrite" });
      }
      if (perm !== "granted") {
        pcFiles = [];
        return false;
      }
      const list = [];
      for await (const [name, handle] of pcDirHandle.entries()) {
        if (handle.kind !== "file" || !name.toLowerCase().endsWith(".json")) continue;
        try {
          const file = await handle.getFile();
          const obj = JSON.parse(await file.text());
          const norm = normalizeIncomingSave(obj, name);
          list.push({
            filename: name,
            kind: norm.kind,
            title: norm.title,
            subtitle: norm.subtitle,
            year: norm.year,
            ovr: norm.ovr,
            isAuto: !!norm.isAuto || name.startsWith("autosave_"),
            savedAt: norm.savedAt || new Date(file.lastModified).toISOString(),
            size: file.size,
            source: "pc",
            fileHandle: handle,
          });
        } catch {}
      }
      list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      pcFiles = list;
      return true;
    } catch {
      pcFiles = [];
      return false;
    }
  }

  async function writeSaveToPcDir(filename, payload, silent = false) {
    if (!pcDirHandle) pcDirHandle = await loadStoredDirHandle();
    if (!pcDirHandle) return false;
    try {
      const perm = await pcDirHandle.queryPermission({ mode: "readwrite" });
      if (perm !== "granted") return false;
      const fileHandle = await pcDirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();
      return true;
    } catch (err) {
      if (!silent) showToast("PC 폴더 저장 실패: " + (err?.message || err));
      return false;
    }
  }

  function downloadJsonFile(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function persistSave(meta, filename, silent = false) {
    const payload = {
      format: "kickru-local-save-v1",
      ...meta,
      savedAt: new Date().toISOString(),
    };
    let savedPlaces = [];

    if (serverOnline || (await refreshServerSaves())) {
      try {
        const res = await fetch(getBase() + "api/local-saves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, filename }),
        });
        const json = await res.json();
        if (json?.ok) savedPlaces.push("앱 saves 폴더");
      } catch {}
    }

    if (await writeSaveToPcDir(filename, payload, silent)) {
      savedPlaces.push("연결된 내 PC 폴더");
    }

    if (!silent && !savedPlaces.length) {
      downloadJsonFile(filename, payload);
      savedPlaces.push("브라우저 다운로드 폴더");
    }

    if (!silent) {
      showToast(`저장 완료! (${savedPlaces.join(" + ")})`);
      await refreshAllAndRender();
    }
    return savedPlaces.length > 0;
  }

  async function saveCurrentPlayer(customName = "", isAuto = false) {
    const life = getBridge()?.life;
    if (!life) {
      if (!isAuto) showToast("현재 진행 중인 선수 커리어가 없습니다.");
      return false;
    }
    const cleanLife = window.__KICKRU_EDITOR__?.sanitizeLife ? window.__KICKRU_EDITOR__.sanitizeLife(life) : life;
    const meta = buildPlayerMeta(cleanLife, isAuto);
    const slot = safeSlug(customName || cleanLife.core.player.name || "player");
    const filename = isAuto ? `autosave_player_${slot}.json` : `player_${slot}_${getTimestampTag()}.json`;
    return persistSave(meta, filename, isAuto);
  }

  async function saveCurrentManager(customName = "", isAuto = false) {
    const st = window.__KICKRU_MANAGER__?.getState ? window.__KICKRU_MANAGER__.getState() : null;
    if (!st) {
      if (!isAuto) showToast("현재 진행 중인 감독(구단) 커리어가 없습니다.");
      return false;
    }
    const meta = buildManagerMeta(st, isAuto);
    const bridge = getBridge();
    const clubObj = window.__KICKRU_MANAGER__?.getClub ? window.__KICKRU_MANAGER__.getClub(st.clubId) : bridge?.r6?.clubMap?.[st.clubId];
    const clubLabel = (clubObj?.localName || st.clubId).replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "").trim();
    const slot = safeSlug(customName || clubLabel || "club");
    const filename = isAuto ? `autosave_manager_${safeSlug(st.clubId)}.json` : `manager_${slot}_${getTimestampTag()}.json`;
    return persistSave(meta, filename, isAuto);
  }

  async function saveBundle(customName = "") {
    const life = getBridge()?.life || null;
    const st = window.__KICKRU_MANAGER__?.getState ? window.__KICKRU_MANAGER__.getState() : null;
    if (!life && !st) {
      showToast("저장할 선수나 구단 데이터가 없습니다.");
      return false;
    }
    const cleanLife = life && window.__KICKRU_EDITOR__?.sanitizeLife ? window.__KICKRU_EDITOR__.sanitizeLife(life) : life;
    const parts = [];
    if (cleanLife) parts.push(`선수:${cleanLife.core.player.name}`);
    if (st) {
      const mClub = window.__KICKRU_MANAGER__?.getClub ? window.__KICKRU_MANAGER__.getClub(st.clubId) : getBridge()?.r6?.clubMap?.[st.clubId];
      parts.push(`팀:${mClub?.localName || st.clubId}`);
    }
    const meta = {
      kind: "bundle",
      title: customName || parts.join(" + ") || "통합 백업",
      subtitle: "선수 & 구단 전체 세이브",
      year: st?.year || cleanLife?.core?.year || 2026,
      ovr: cleanLife?.core?.player?.attributes ? 99 : 0,
      isAuto: false,
      data: { playerLife: cleanLife, managerState: st },
    };
    const filename = `bundle_${safeSlug(customName || "kickru")}_${getTimestampTag()}.json`;
    return persistSave(meta, filename, false);
  }

  async function applyLoadedSave(rawObj, fallbackName = "") {
    const save = normalizeIncomingSave(rawObj, fallbackName);
    const bridge = getBridge();

    if (save.kind === "player") {
      if (!bridge?.startCustomCareer) throw new Error("게임 엔진이 준비되지 않았습니다.");
      window.__KICKRU_MANAGER__?.exit?.();
      const life = window.__KICKRU_EDITOR__?.sanitizeLife ? window.__KICKRU_EDITOR__.sanitizeLife(save.data) : save.data;
      bridge.startCustomCareer(life);
      bridge.notify?.(`📂 ${life.core.player.name} 선수 커리어를 불러왔습니다!`);
      showToast(`선수 커리어 불러오기 완료 (${life.core.player.name})`);
      closeModal();
      return;
    }

    if (save.kind === "manager") {
      if (!window.__KICKRU_MANAGER__?.loadCareerState) throw new Error("감독 모드 엔진이 준비되지 않았습니다.");
      const ok = window.__KICKRU_MANAGER__.loadCareerState(save.data);
      if (!ok) throw new Error("올바른 구단 감독 데이터가 아닙니다.");
      closeModal();
      return;
    }

    if (save.kind === "bundle") {
      const { playerLife, managerState } = save.data || {};
      if (playerLife && bridge?.startCustomCareer) {
        const life = window.__KICKRU_EDITOR__?.sanitizeLife ? window.__KICKRU_EDITOR__.sanitizeLife(playerLife) : playerLife;
        bridge.startCustomCareer(life);
      }
      if (managerState && window.__KICKRU_MANAGER__?.loadCareerState) {
        if (!playerLife || document.body.classList.contains("is-manager-mode")) {
          window.__KICKRU_MANAGER__.loadCareerState(managerState);
        } else {
          try {
            localStorage.setItem("kickru-manager-save-v1", JSON.stringify(managerState));
          } catch {}
        }
      }
      showToast("통합 백업 데이터를 불러왔습니다!");
      closeModal();
    }
  }

  async function readEntrySave(item) {
    if (item.source === "server") {
      const res = await fetch(getBase() + "api/local-saves/file?name=" + encodeURIComponent(item.filename), { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok || !json.save) throw new Error(json?.error || "파일을 읽을 수 없습니다.");
      return json.save;
    }
    if (item.source === "pc" && item.fileHandle) {
      const file = await item.fileHandle.getFile();
      return JSON.parse(await file.text());
    }
    throw new Error("알 수 없는 저장 위치");
  }

  async function deleteEntrySave(item) {
    if (item.source === "server") {
      await fetch(getBase() + "api/local-saves/file?name=" + encodeURIComponent(item.filename), { method: "DELETE" });
    } else if (item.source === "pc" && pcDirHandle) {
      await pcDirHandle.removeEntry(item.filename);
    }
    showToast(`삭제 완료: ${item.filename}`);
    await refreshAllAndRender();
  }

  async function refreshAllAndRender() {
    await Promise.all([refreshServerSaves(), refreshPcFolderSaves(false)]);
    if (isOpen) renderBody();
  }

  function createModalDOM() {
    ensureStyle();
    if (!document.body || document.getElementById("ks-backdrop")) return;
    const backdrop = document.createElement("div");
    backdrop.id = "ks-backdrop";
    backdrop.className = "ks-backdrop";
    backdrop.innerHTML = `
      <div class="ks-modal" role="dialog" aria-modal="true" aria-label="로컬 폴더 저장 및 불러오기">
        <div class="ks-header">
          <div>
            <h2>💾 로컬 폴더 저장 · 불러오기 (선수 & 구단)</h2>
            <div class="ks-header-sub" id="ks-folder-status">저장 위치 확인 중...</div>
          </div>
          <div class="ks-row">
            <button type="button" class="ks-btn is-sm is-blue" id="ks-modal-install">📲 앱 설치</button>
            <button type="button" class="ks-close-btn" id="ks-close-btn" aria-label="닫기">×</button>
          </div>
        </div>
        <div class="ks-body" id="ks-body"></div>
      </div>
    `;
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
    document.getElementById("ks-close-btn").addEventListener("click", closeModal);
    document.getElementById("ks-modal-install").addEventListener("click", triggerInstall);
  }

  function renderBody() {
    const body = document.getElementById("ks-body");
    const statusEl = document.getElementById("ks-folder-status");
    if (!body) return;

    const statusParts = [];
    if (serverOnline) statusParts.push(`📁 앱 폴더: ${serverFolderPath}`);
    if (pcDirHandle && pcFiles) statusParts.push(`💻 연결된 PC 폴더: ${pcDirHandle.name}`);
    if (!statusParts.length) statusParts.push("웹 모드 (PC 폴더 연결 또는 .json 파일 저장/불러오기 사용 가능)");
    if (statusEl) statusEl.textContent = statusParts.join("  |  ");

    const life = getBridge()?.life;
    const mgrState = window.__KICKRU_MANAGER__?.getState ? window.__KICKRU_MANAGER__.getState() : null;
    const allItems = [...serverFiles, ...pcFiles];
    const filtered = allItems.filter((it) => activeFilter === "all" || it.kind === activeFilter);

    const playerLabel = life ? `${life.core.player.name} (${life.core.player.age}세)` : "없음";
    const clubObj = mgrState
      ? window.__KICKRU_MANAGER__?.getClub
        ? window.__KICKRU_MANAGER__.getClub(mgrState.clubId)
        : getBridge()?.r6?.clubMap?.[mgrState.clubId]
      : null;
    const clubLabel = mgrState ? clubObj?.localName || mgrState.clubId : "없음";

    body.innerHTML = `
      <div class="ks-card">
        <div class="ks-card-title">
          <span>1. 현재 진행 중인 커리어 로컬 저장</span>
          <label style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;cursor:pointer;">
            <input type="checkbox" id="ks-autosave-chk" ${isAutosaveEnabled() ? "checked" : ""} style="accent-color:#16a34a;" />
            매 턴 자동 로컬 저장
          </label>
        </div>
        <div class="ks-row">
          <input type="text" class="ks-input" id="ks-slot-name" placeholder="세이브 이름 (비워두면 선수/구단명+날짜)" value="${escapeHtml(customSlotName)}" />
        </div>
        <div class="ks-row">
          <button type="button" class="ks-btn is-primary" id="ks-save-player" ${!life ? "disabled" : ""}>⚽ 선수 저장 (${escapeHtml(playerLabel)})</button>
          <button type="button" class="ks-btn is-blue" id="ks-save-manager" ${!mgrState ? "disabled" : ""}>👔 감독·구단 저장 (${escapeHtml(clubLabel)})</button>
          <button type="button" class="ks-btn is-gold" id="ks-save-bundle" ${!life && !mgrState ? "disabled" : ""}>📦 통합 백업</button>
        </div>
      </div>

      <div class="ks-card">
        <div class="ks-card-title">
          <span>2. 저장 폴더 · .json 파일 불러오기</span>
        </div>
        <div class="ks-row">
          ${serverOnline ? `<button type="button" class="ks-btn" id="ks-open-explorer">📂 앱 saves 폴더 열기 (탐색기)</button>` : ""}
          ${typeof window.showDirectoryPicker === "function" ? `<button type="button" class="ks-btn is-blue" id="ks-pick-pc-dir">💻 ${pcDirHandle ? "다른 PC 폴더 연결" : "내 PC 저장 폴더 연결"}</button>` : ""}
          <button type="button" class="ks-btn" id="ks-import-file">📤 .json 파일 열기</button>
          <button type="button" class="ks-btn" id="ks-refresh-list">🔄 목록 새로고침</button>
          <input type="file" id="ks-file-input" accept=".json,application/json" style="display:none" />
        </div>
      </div>

      <div class="ks-card">
        <div class="ks-card-title">
          <span>3. 저장된 커리어 목록 (${filtered.length}개)</span>
          <div class="ks-tabs">
            <button type="button" class="ks-tab ${activeFilter === "all" ? "is-active" : ""}" data-ks-filter="all">전체</button>
            <button type="button" class="ks-tab ${activeFilter === "player" ? "is-active" : ""}" data-ks-filter="player">⚽ 선수</button>
            <button type="button" class="ks-tab ${activeFilter === "manager" ? "is-active" : ""}" data-ks-filter="manager">👔 구단</button>
            <button type="button" class="ks-tab ${activeFilter === "bundle" ? "is-active" : ""}" data-ks-filter="bundle">📦 통합</button>
          </div>
        </div>
        <div class="ks-list">
          ${
            filtered.length
              ? filtered
                  .map((it, idx) => {
                    const kindLabel = it.kind === "manager" ? "👔 구단" : it.kind === "bundle" ? "📦 통합" : "⚽ 선수";
                    const kindCls = it.kind === "manager" ? "is-blue" : it.kind === "bundle" ? "is-gold" : "";
                    const srcLabel = it.source === "server" ? "앱saves" : "PC폴더";
                    const dateStr = new Date(it.savedAt).toLocaleString("ko-KR", { hour12: false });
                    return `
                      <div class="ks-item">
                        <div class="ks-item-main">
                          <div class="ks-item-title">
                            <span class="ks-pill ${kindCls}">${kindLabel}</span>
                            ${it.isAuto ? `<span class="ks-pill is-gray">자동저장</span>` : ""}
                            <span>${escapeHtml(it.title)}</span>
                          </div>
                          <div class="ks-item-sub">${escapeHtml(it.subtitle)} · ${dateStr} · [${srcLabel}: ${escapeHtml(it.filename)}]</div>
                        </div>
                        <div class="ks-row" style="flex-shrink:0;">
                          <button type="button" class="ks-btn is-sm is-primary" data-ks-load="${idx}">▶️ 이어하기</button>
                          <button type="button" class="ks-btn is-sm" data-ks-dl="${idx}" title=".json 파일 다운로드">📥</button>
                          <button type="button" class="ks-btn is-sm is-danger" data-ks-del="${idx}" title="삭제">🗑️</button>
                        </div>
                      </div>
                    `;
                  })
                  .join("")
              : `<div style="padding:18px;text-align:center;font-size:12px;color:var(--gm-muted,#6b7280);">아직 로컬 폴더에 저장된 세이브 파일이 없습니다.<br/>위 버튼으로 선수나 구단을 저장해 보세요!</div>`
          }
        </div>
      </div>
    `;

    document.getElementById("ks-autosave-chk").addEventListener("change", (e) => {
      setAutosaveEnabled(e.target.checked);
      showToast(e.target.checked ? "자동 로컬 저장을 켰습니다." : "자동 로컬 저장을 껐습니다.");
    });
    document.getElementById("ks-slot-name").addEventListener("input", (e) => {
      customSlotName = e.target.value;
    });
    document.getElementById("ks-save-player").addEventListener("click", () => saveCurrentPlayer(customSlotName, false));
    document.getElementById("ks-save-manager").addEventListener("click", () => saveCurrentManager(customSlotName, false));
    document.getElementById("ks-save-bundle").addEventListener("click", () => saveBundle(customSlotName));
    document.getElementById("ks-refresh-list").addEventListener("click", refreshAllAndRender);

    document.getElementById("ks-open-explorer")?.addEventListener("click", async () => {
      await fetch(getBase() + "api/local-saves/open-folder", { method: "POST" });
      showToast("탐색기에서 saves 폴더를 열었습니다!");
    });

    document.getElementById("ks-pick-pc-dir")?.addEventListener("click", async () => {
      try {
        pcDirHandle = await window.showDirectoryPicker({ id: "kickru-saves", mode: "readwrite" });
        await saveStoredDirHandle(pcDirHandle);
        await refreshPcFolderSaves(true);
        renderBody();
        showToast(`PC 폴더 연결 완료: ${pcDirHandle.name}`);
      } catch {}
    });

    const fileInp = document.getElementById("ks-file-input");
    document.getElementById("ks-import-file").addEventListener("click", () => fileInp.click());
    fileInp.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const obj = JSON.parse(await file.text());
        await applyLoadedSave(obj, file.name);
      } catch (err) {
        alert("파일 불러오기 오류: " + (err?.message || err));
      }
      fileInp.value = "";
    });

    body.querySelectorAll("[data-ks-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeFilter = btn.dataset.ksFilter;
        renderBody();
      });
    });

    body.querySelectorAll("[data-ks-load]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const item = filtered[Number(btn.dataset.ksLoad)];
        if (!item) return;
        try {
          const save = await readEntrySave(item);
          await applyLoadedSave(save, item.filename);
        } catch (err) {
          alert("불러오기 실패: " + (err?.message || err));
        }
      });
    });

    body.querySelectorAll("[data-ks-dl]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const item = filtered[Number(btn.dataset.ksDl)];
        if (!item) return;
        try {
          const save = await readEntrySave(item);
          downloadJsonFile(item.filename, save);
        } catch (err) {
          alert("다운로드 실패: " + (err?.message || err));
        }
      });
    });

    body.querySelectorAll("[data-ks-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const item = filtered[Number(btn.dataset.ksDel)];
        if (!item) return;
        if (confirm(`'${item.title}' (${item.filename}) 저장 파일을 삭제하시겠습니까?`)) {
          await deleteEntrySave(item);
        }
      });
    });
  }

  async function openModal(defaultFilter = "all") {
    createModalDOM();
    if (["all", "player", "manager", "bundle"].includes(defaultFilter)) {
      activeFilter = defaultFilter;
    }
    isOpen = true;
    document.getElementById("ks-backdrop").classList.add("is-open");
    renderBody();
    await refreshAllAndRender();
  }

  function closeModal() {
    isOpen = false;
    document.getElementById("ks-backdrop")?.classList.remove("is-open");
  }

  async function triggerInstall() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      try {
        await deferredInstallPrompt.userChoice;
      } catch {}
      deferredInstallPrompt = null;
      mountButtons();
      return;
    }
    alert(
      "📲 앱으로 설치하는 방법:\n\n" +
        "1) 웹 브라우저(Edge/Chrome): 주소창 오른쪽의 '앱 설치(⊕)' 아이콘 또는 메뉴(⋯) -> '앱' -> '이 사이트를 앱으로 설치' 클릭\n" +
        "2) Windows 로컬 PC 설치형: kickru 폴더의 '설치하기_바탕화면_바로가기.bat'를 실행하면 바탕화면에 단독 앱 바로가기가 설치됩니다!"
    );
  }

  function mountButtons() {
    const actions = document.querySelector(".t-appbar-actions");
    if (!actions) return;
    ensureStyle();

    if (!document.getElementById("ks-topbar-btn")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "ks-topbar-btn";
      btn.className = "ks-topbar-btn";
      btn.textContent = "💾 저장·불러오기";
      btn.title = "로컬 폴더 저장 및 불러오기 (Alt+S)";
      btn.addEventListener("click", () => openModal("all"));
      actions.insertBefore(btn, actions.firstChild);
    }

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const existingInstall = document.getElementById("ks-install-topbar");
    if (!isStandalone && deferredInstallPrompt && !existingInstall) {
      const ibtn = document.createElement("button");
      ibtn.type = "button";
      ibtn.id = "ks-install-topbar";
      ibtn.className = "ks-install-btn";
      ibtn.textContent = "📲 앱 설치";
      ibtn.title = "데스크톱/모바일 앱으로 설치";
      ibtn.addEventListener("click", triggerInstall);
      actions.insertBefore(ibtn, actions.firstChild);
    } else if ((!deferredInstallPrompt || isStandalone) && existingInstall) {
      existingInstall.remove();
    }
  }

  function init() {
    window.__KICKRU_SAVE__ = {
      open: openModal,
      close: closeModal,
      saveCurrentPlayer,
      saveCurrentManager,
      saveBundle,
      applyLoadedSave,
      refresh: refreshAllAndRender,
    };

    // Register PWA Service Worker
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
      navigator.serviceWorker.register(getBase() + "sw.js", { scope: getBase() }).catch(() => {});
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      mountButtons();
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      mountButtons();
      showToast("킥루 앱이 설치되었습니다!");
    });

    // Silent auto-save to local saves/ folder on career updates
    window.addEventListener("kickru-state-change", () => {
      if (!isAutosaveEnabled()) return;
      clearTimeout(playerAutoTimer);
      playerAutoTimer = setTimeout(() => {
        if (getBridge()?.life) saveCurrentPlayer("", true);
      }, 1200);
    });

    window.addEventListener("kickru-manager-save", () => {
      if (!isAutosaveEnabled()) return;
      clearTimeout(managerAutoTimer);
      managerAutoTimer = setTimeout(() => {
        if (window.__KICKRU_MANAGER__?.getState?.()) saveCurrentManager("", true);
      }, 1200);
    });

    const tryMount = () => {
      if (window.__KICKRU_BRIDGE__ && document.querySelector(".t-appbar-actions")) {
        const doMount = () => {
          mountButtons();
          if (!mountButtons._observing && document.body) {
            mountButtons._observing = true;
            new MutationObserver(() => mountButtons()).observe(document.body, { childList: true, subtree: true });
          }
        };
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(doMount);
        else doMount();
        return true;
      }
      return false;
    };

    if (!tryMount()) {
      const t = setInterval(() => {
        if (tryMount()) clearInterval(t);
      }, 80);
      setTimeout(() => {
        clearInterval(t);
        mountButtons();
      }, 4000);
    }

    window.addEventListener("keydown", (e) => {
      if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (isOpen) closeModal();
        else openModal("all");
      } else if (e.key === "Escape" && isOpen) {
        closeModal();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
