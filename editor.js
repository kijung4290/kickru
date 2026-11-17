(function () {
  "use strict";

  const ATTR_LIST = [
    { key: "pace", label: "스피드", group: "outfield" },
    { key: "shooting", label: "슈팅", group: "outfield" },
    { key: "passing", label: "패스", group: "both" },
    { key: "dribbling", label: "드리블", group: "outfield" },
    { key: "defending", label: "수비", group: "outfield" },
    { key: "physical", label: "피지컬", group: "both" },
    { key: "positioning", label: "위치 선정", group: "both" },
    { key: "reflexes", label: "반사 신경", group: "gk" },
    { key: "handling", label: "볼 처리", group: "gk" },
    { key: "kicking", label: "골킥", group: "gk" },
  ];

  const OVR_WEIGHTS = {
    ST: { shooting: 0.4, pace: 0.15, physical: 0.15, dribbling: 0.15, positioning: 0.15 },
    LW: { pace: 0.25, dribbling: 0.3, shooting: 0.2, passing: 0.25 },
    RW: { pace: 0.25, dribbling: 0.3, shooting: 0.2, passing: 0.25 },
    CAM: { passing: 0.35, dribbling: 0.3, shooting: 0.2, positioning: 0.15 },
    CM: { passing: 0.4, dribbling: 0.15, physical: 0.2, defending: 0.15, positioning: 0.1 },
    CDM: { defending: 0.35, passing: 0.25, physical: 0.25, positioning: 0.15 },
    LB: { pace: 0.25, defending: 0.3, passing: 0.2, physical: 0.25 },
    RB: { pace: 0.25, defending: 0.3, passing: 0.2, physical: 0.25 },
    CB: { defending: 0.4, physical: 0.3, positioning: 0.3 },
    GK: { reflexes: 0.35, handling: 0.3, positioning: 0.25, kicking: 0.1 },
  };

  const POSITIONS = [
    { id: "ST", label: "ST (스트라이커)" },
    { id: "LW", label: "LW (왼쪽 윙어)" },
    { id: "RW", label: "RW (오른쪽 윙어)" },
    { id: "CAM", label: "CAM (공격형 미드필더)" },
    { id: "CM", label: "CM (중앙 미드필더)" },
    { id: "CDM", label: "CDM (수비형 미드필더)" },
    { id: "LB", label: "LB (왼쪽 풀백)" },
    { id: "CB", label: "CB (센터백)" },
    { id: "RB", label: "RB (오른쪽 풀백)" },
    { id: "GK", label: "GK (골키퍼)" },
  ];

  const POTENTIAL_GRADES = [
    { id: "squad", label: "스쿼드 자원 (70~77)" },
    { id: "regular", label: "리그 주전 (78~84)" },
    { id: "rising", label: "라이징 스타 (85~89)" },
    { id: "elite", label: "엘리트 (90~94)" },
    { id: "legend", label: "레전드 (95~98)" },
    { id: "generational", label: "세기의 재능 (99)" },
  ];

  const CURVES = [
    { id: "early", label: "조숙형 (early)" },
    { id: "normal", label: "일반형 (normal)" },
    { id: "late", label: "대기만성형 (late)" },
    { id: "long", label: "롱런형 (long)" },
    { id: "step", label: "계단형 (step)" },
    { id: "burst", label: "폭발형 (burst)" },
    { id: "bloom", label: "늦게 피는 꽃 (bloom)" },
  ];

  const ROLES = [
    { id: "key", label: "핵심 주전 (key)" },
    { id: "starter", label: "주전 (starter)" },
    { id: "rotation", label: "로테이션 (rotation)" },
    { id: "backup", label: "백업 (backup)" },
    { id: "reserve", label: "2군 (reserve)" },
  ];

  const MILITARY_STATUSES = [
    { id: "exempt", label: "🎖️ 병역 면제 (exempt)" },
    { id: "completed", label: "복무 완료 (completed)" },
    { id: "notRequired", label: "해당 없음 (notRequired)" },
    { id: "pending", label: "미필 / 대기 (pending)" },
  ];

  const NEXT_PLANS = [
    { id: "", label: "없음 (기본)" },
    { id: "compete", label: "주전 경쟁 (+출전 보너스)" },
    { id: "rotation", label: "로테이션 수락" },
    { id: "weakFootPlan", label: "약발 집중 훈련" },
    { id: "captain", label: "주장 역할 수행" },
    { id: "adapt", label: "팀 전술 적응" },
    { id: "steady", label: "꾸준한 폼 유지" },
    { id: "veteranCompete", label: "베테랑 경쟁" },
    { id: "mentor", label: "후배 멘토링" },
  ];

  const PATH_OPTIONS = [
    { id: "school", label: "고등학교 (school)" },
    { id: "university", label: "대학교 (university)" },
    { id: "academy", label: "유스 아카데미 (academy)" },
    { id: "professional", label: "프로 1군 (professional)" },
  ];

  const AVATARS = Array.from({ length: 25 }, (_, i) => `pixel-${i + 1}`);

  const PRESET_STORAGE_KEY = "kickru-custom-preset-v1";
  const DEFAULT_PRESET = {
    enabled: true,
    skipFirstSim: true,
    age: 16,
    year: 2026,
    path: "default", // default | school | academy | professional
    schoolYear: 1,
    statLevel: "default", // default | 70 | 80 | 90 | 99
    potential: 95,
    useCustomPotential: false,
    generational: false,
    curve: "default",
    durability: 1.0,
    foot: "default", // default | 오른발 | 왼발 | 양발
    weakFoot: 50,
    useCustomWeakFoot: false,
    height: 178,
    weight: 72,
    earnings: 0,
    exemptMilitary: false,
    // Quick custom creator fields
    quickName: "김킥루",
    quickNumber: 7,
    quickNationality: "kr",
    quickPosition: "ST",
    quickClubId: "en-arsenal",
    quickClubQuery: "",
  };

  function loadPreset() {
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PRESET };
      return { ...DEFAULT_PRESET, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_PRESET };
    }
  }

  function savePreset() {
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(preset));
    } catch {}
    window.__KICKRU_SKIP_FIRST_SIM__ = !!(preset.enabled && preset.skipFirstSim);
  }

  let preset = loadPreset();
  let activeTab = "attrs";
  let isOpen = false;
  let isApplying = false;
  let draft = null;
  let clubQuery = "";

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

  function getBridge() {
    return window.__KICKRU_BRIDGE__ || null;
  }

  function calcOvr(player) {
    const bridge = getBridge();
    if (bridge?.r5?.overall) {
      try {
        return bridge.r5.overall(player);
      } catch {}
    }
    const w = OVR_WEIGHTS[player.position] || OVR_WEIGHTS.ST;
    let sum = 0;
    for (const [k, weight] of Object.entries(w)) {
      sum += (player.attributes?.[k] ?? 50) * weight;
    }
    return Math.round(sum);
  }

  function formatMoney(krw) {
    const v = Math.round(num(krw, 0));
    if (v >= 1e12) return `${(v / 1e12).toFixed(2)}조 원`;
    if (v >= 1e8) return `${(v / 1e8).toFixed(1)}억 원`;
    if (v >= 1e4) return `${Math.round(v / 1e4).toLocaleString("ko-KR")}만 원`;
    return `${v.toLocaleString("ko-KR")}원`;
  }

  function cloneLife(life) {
    return typeof structuredClone === "function"
      ? structuredClone(life)
      : JSON.parse(JSON.stringify(life));
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function findClubLeagueId(life, clubId, fallbackLeague) {
    if (life?.core?.world) {
      for (const [lid, ids] of Object.entries(life.core.world)) {
        if (Array.isArray(ids) && ids.includes(clubId)) return lid;
      }
    }
    return fallbackLeague;
  }

  function promoteLifeToPro(life, clubId) {
    const bridge = getBridge();
    const club = bridge?.r6?.clubMap?.[clubId];
    if (!club) return life;
    const targetLeagueId = findClubLeagueId(life, clubId, club.league);
    const p = life.core.player;

    p.wage = Math.max(p.wage || 0, Math.round(Math.max(50, club.strength || 75) * 10000000));
    p.contract = Math.max(1, p.contract || 4);
    life.path = "professional";
    life.professionalContractsSigned = Math.max(1, life.professionalContractsSigned || 1);
    life.parentClubId = clubId;
    life.semiProClubId = null;
    life.developmentClub = undefined;
    life.loan = null;
    life.phase = "ready";
    life.flowStage = "ready";
    life.ageAdvanced = false;
    life.choices = [];

    if (bridge?.r5?.prepareCareerSeason) {
      const savedAge = p.age;
      const savedYear = life.core.year;
      life.core = bridge.r5.prepareCareerSeason(life.core, clubId, false, false);
      life.core.player.age = savedAge;
      life.core.year = savedYear;
    } else {
      life.core.clubId = clubId;
    }
    life.core.clubId = clubId;
    life.core.leagueId = targetLeagueId;
    life.core.youth = false;
    if (bridge?.cS?.createSquad) {
      life.core.player.squad = bridge.cS.createSquad(clubId, "key");
    }
    life.message = `${club.localName} 1군에서 새 시즌을 준비합니다.`;
    return life;
  }

  function sanitizeLife(life) {
    const bridge = getBridge();
    const p = life.core.player;

    // 1. Attributes 0~100
    for (const a of ATTR_LIST) {
      p.attributes[a.key] = clamp(num(p.attributes[a.key], 50), 0, 100);
      if (!life.seasonStartAttributes) life.seasonStartAttributes = {};
      if (!Number.isFinite(life.seasonStartAttributes[a.key])) {
        life.seasonStartAttributes[a.key] = p.attributes[a.key];
      }
    }

    // 2. Basic ranges
    p.energy = clamp(num(p.energy, 100), 0, 100);
    p.morale = clamp(num(p.morale, 80), 0, 100);
    p.reputation = clamp(num(p.reputation, 10), 0, 100);
    p.potential = clamp(Math.round(num(p.potential, 80)), 45, 99);
    p.age = clamp(Math.round(num(p.age, 18)), 16, 45);
    p.number = clamp(Math.round(num(p.number, 7)), 1, 99);
    p.name = String(p.name || "선수").trim().slice(0, 32) || "선수";
    p.injury = clamp(Math.round(num(p.injury, 0)), 0, 99);
    p.suspension = clamp(Math.round(num(p.suspension, 0)), 0, 99);
    p.yellow = clamp(Math.round(num(p.yellow, 0)), 0, 99);
    p.wage = Math.max(0, Math.round(num(p.wage, 0)));
    p.contract = clamp(Math.round(num(p.contract, 0)), 0, 10);
    p.earnings = Math.max(0, Math.round(num(p.earnings, 0)));

    life.core.year = clamp(Math.round(num(life.core.year, 2026)), 2025, 2100);

    if (life.shop && Number.isFinite(life.shop.spent)) {
      p.earnings = Math.max(p.earnings, Math.ceil(life.shop.spent));
    }

    // Nationality & Avatar
    if (bridge?.r6?.countryMap && !bridge.r6.countryMap[p.nationality]) {
      p.nationality = "kr";
    }
    if (!AVATARS.includes(life.avatarId)) {
      life.avatarId = "pixel-1";
    }

    // 3. Body validation (160~205cm, 50~105kg integers)
    if (p.body && typeof p.body === "object") {
      p.body = {
        height: clamp(Math.round(num(p.body.height, 178)), 160, 205),
        weight: clamp(Math.round(num(p.body.weight, 72)), 50, 105),
      };
    }

    // 4. Weak foot & Preferred foot
    life.weakFoot = clamp(Math.round(num(life.weakFoot, 30)), 0, 100);
    if (p.foot === "왼발") {
      life.preferredFoot = "왼발";
    } else if (p.foot === "오른발") {
      life.preferredFoot = "오른발";
    } else {
      p.foot = "양발";
      if (!["오른발", "왼발"].includes(life.preferredFoot)) {
        life.preferredFoot = "오른발";
      }
      life.weakFoot = Math.max(85, life.weakFoot);
    }
    p.weakFoot = life.weakFoot;

    // 5. Position & Styles & Training Targets
    if (!OVR_WEIGHTS[p.position]) p.position = "ST";
    if (bridge?.r2?.validStyle) {
      if (!bridge.r2.validStyle(p.position, life.developmentStyle || "balanced")) {
        life.developmentStyle = "balanced";
      }
      if (!bridge.r2.validStyle(p.position, life.playingStyle || "balanced")) {
        life.playingStyle = "balanced";
      }
    } else if (p.position === "GK") {
      life.developmentStyle = "balanced";
      life.playingStyle = "balanced";
    }

    const visibleAttrs =
      bridge?.r5?.visibleAttributes?.(p.position) ||
      (p.position === "GK"
        ? ["reflexes", "handling", "positioning", "kicking", "physical", "passing"]
        : ["pace", "shooting", "passing", "dribbling", "defending", "physical"]);
    if (
      !Array.isArray(life.trainingTargets) ||
      life.trainingTargets.length < 1 ||
      life.trainingTargets.length > 2 ||
      new Set(life.trainingTargets).size !== life.trainingTargets.length ||
      life.trainingTargets.some((t) => !visibleAttrs.includes(t))
    ) {
      life.trainingTargets = visibleAttrs.slice(0, 2);
    }

    // 6. Path & School/University consistency
    if (!["school", "university", "academy", "professional", "freeAgent"].includes(life.path)) {
      life.path = "professional";
    }
    if (life.path === "school") {
      life.schoolYear = clamp(Math.round(num(life.schoolYear, 1)), 1, 3);
      if (!life.schoolId || !bridge?.rP?.schoolMap?.[life.schoolId]) {
        life.schoolId = bridge?.rP?.SCHOOLS?.[0]?.id || "school-0";
      }
      life.core.youth = true;
    } else if (life.path === "university") {
      life.studyYear = clamp(Math.round(num(life.studyYear, 1)), 1, 4);
      if (!bridge?.rP?.isUniversity?.(life.university)) {
        life.university = bridge?.rP?.UNIVERSITIES?.[0] || "연세대학교";
      }
      life.core.youth = true;
    } else if (life.path === "academy") {
      life.schoolYear = clamp(Math.round(num(life.schoolYear, 0)), 0, 3);
      life.core.youth = true;
    } else if (life.path === "professional") {
      life.core.youth = false;
      life.professionalContractsSigned = Math.max(1, Math.round(num(life.professionalContractsSigned, 1)));
      life.parentClubId = life.parentClubId || life.core.clubId;
      life.developmentClub = undefined;
    }

    // 7. Growth curve & Development profile
    const validCurves = CURVES.map((c) => c.id);
    if (!validCurves.includes(life.hiddenCurve)) life.hiddenCurve = "normal";
    life.hiddenDurability = clamp(num(life.hiddenDurability, 1), 0.5, 2.5);

    if (life.generationalTalent) {
      life.potentialGrade = "generational";
      p.potential = 99;
    } else if (!POTENTIAL_GRADES.some((g) => g.id === life.potentialGrade)) {
      life.potentialGrade = "rising";
    }

    if (life.developmentProfile && typeof life.developmentProfile === "object") {
      life.developmentProfile.potential = clamp(Math.round(p.potential), 45, 99);
      life.developmentProfile.curve = life.hiddenCurve;
      life.developmentProfile.speed = clamp(num(life.developmentProfile.speed, 1), 0.5, 1.6);
    }

    // Clear developmentYear cache if age/year changed so growth engine won't conflict
    if (
      life.developmentYear &&
      (life.developmentYear.year !== life.core.year || life.developmentYear.age !== p.age)
    ) {
      delete life.developmentYear;
    }

    // NextPlan validation
    const validPlans = NEXT_PLANS.map((x) => x.id).filter(Boolean);
    if (life.nextPlan && !validPlans.includes(life.nextPlan)) {
      life.nextPlan = null;
    }

    // 8. Squad
    if (p.squad && typeof p.squad === "object") {
      const validRoles = ROLES.map((r) => r.id);
      if (!validRoles.includes(p.squad.current)) p.squad.current = "starter";
      if (!validRoles.includes(p.squad.promised)) p.squad.promised = p.squad.current;
      p.squad.trust = clamp(Math.round(num(p.squad.trust, 70)), 0, 100);
    }

    // 9. Military
    if (life.military && typeof life.military === "object") {
      const validMil = ["notRequired", "pending", "sangmu", "active", "completed", "exempt"];
      if (!validMil.includes(life.military.status)) life.military.status = "exempt";
      if (["exempt", "completed", "notRequired"].includes(life.military.status)) {
        life.military.monthsRemaining = 0;
      }
    }

    // 10. Stats & International
    const s = life.core.stats;
    if (s) {
      for (const k of [
        "apps",
        "starts",
        "minutes",
        "goals",
        "assists",
        "shots",
        "onTarget",
        "xg",
        "passes",
        "completed",
        "tackles",
        "dribbles",
        "dribblesWon",
        "saves",
        "conceded",
        "cleanSheets",
        "yellow",
        "red",
        "ratingSum",
      ]) {
        s[k] = Math.max(0, num(s[k], 0));
      }
      if (s.starts > s.apps) s.apps = s.starts;
    }

    if (!life.core.international) {
      life.core.international = { caps: 0, goals: 0, trophies: 0 };
    }
    life.core.international.caps = Math.max(0, Math.round(num(life.core.international.caps, 0)));
    life.core.international.goals = Math.max(0, Math.round(num(life.core.international.goals, 0)));
    life.core.international.trophies = Math.max(
      0,
      Math.round(num(life.core.international.trophies, 0))
    );

    return life;
  }

  function applyCreationPreset(life, opts = preset) {
    if (!life || !opts.enabled) return life;
    const next = cloneLife(life);
    const p = next.core.player;

    p.age = clamp(Math.round(num(opts.age, 16)), 16, 45);
    next.core.year = clamp(Math.round(num(opts.year, 2026)), 2025, 2050);
    next.focusSince = next.core.year;

    if (opts.statLevel !== "default") {
      const lvl = clamp(Number(opts.statLevel), 0, 100);
      for (const a of ATTR_LIST) {
        p.attributes[a.key] = lvl;
        next.seasonStartAttributes[a.key] = lvl;
      }
    }

    if (opts.useCustomPotential) {
      p.potential = clamp(Math.round(num(opts.potential, 95)), 45, 99);
    }
    if (opts.generational) {
      next.generationalTalent = true;
      next.potentialGrade = "generational";
      p.potential = 99;
    }
    if (opts.curve !== "default") {
      next.hiddenCurve = opts.curve;
    }
    next.hiddenDurability = clamp(num(opts.durability, 1.0), 0.5, 2.5);

    if (opts.foot !== "default") {
      p.foot = opts.foot;
      if (opts.foot === "왼발") next.preferredFoot = "왼발";
      else if (opts.foot === "오른발") next.preferredFoot = "오른발";
      else {
        next.preferredFoot = "오른발";
        next.weakFoot = Math.max(85, num(next.weakFoot, 85));
      }
    }
    if (opts.useCustomWeakFoot) {
      next.weakFoot = clamp(Math.round(num(opts.weakFoot, 50)), 0, 100);
      p.weakFoot = next.weakFoot;
    }

    p.body = {
      height: clamp(Math.round(num(opts.height, 178)), 160, 205),
      weight: clamp(Math.round(num(opts.weight, 72)), 50, 105),
    };

    if (num(opts.earnings, 0) > 0) {
      p.earnings = Math.round(num(opts.earnings, 0));
    }
    if (opts.exemptMilitary && next.military) {
      next.military.status = "exempt";
      next.military.monthsRemaining = 0;
      next.military.note = "초기 설정 병역 면제";
    }

    if (opts.path === "professional") {
      promoteLifeToPro(next, next.core.clubId);
    } else if (opts.path === "school") {
      next.path = "school";
      next.schoolYear = clamp(Math.round(num(opts.schoolYear, 1)), 1, 3);
      next.core.youth = true;
    } else if (opts.path === "academy") {
      next.path = "academy";
      next.core.youth = true;
    }

    return sanitizeLife(next);
  }

  window.__KICKRU_SKIP_FIRST_SIM__ = !!(preset.enabled && preset.skipFirstSim);
  window.__KICKRU_ON_CREATE__ = function (createdLife) {
    if (!preset.enabled) return createdLife;
    return applyCreationPreset(createdLife, preset);
  };

  function applyDraft(message) {
    const bridge = getBridge();
    if (!bridge || !draft) return false;
    isApplying = true;
    try {
      const cleaned = sanitizeLife(cloneLife(draft));
      const next = bridge.setLife(cleaned);
      draft = cloneLife(next);
      if (message && bridge.notify) bridge.notify(message);
      renderBody();
      updateHeaderBadge();
      return true;
    } catch (err) {
      alert("적용 중 오류가 발생했습니다: " + (err?.message || String(err)));
      return false;
    } finally {
      isApplying = false;
    }
  }

  function updateHeaderBadge() {
    const ovrEl = document.getElementById("ke-header-ovr");
    const metaEl = document.getElementById("ke-header-meta");
    if (!ovrEl || !metaEl) return;
    if (!draft) {
      ovrEl.textContent = preset.statLevel === "default" ? "43" : String(preset.statLevel);
      metaEl.textContent = `초기 세팅 모드 · 시작 나이 ${preset.age}세 · ${preset.year}년`;
      return;
    }
    const p = draft.core.player;
    const bridge = getBridge();
    const clubName = bridge?.r6?.clubMap?.[draft.core.clubId]?.localName || draft.core.clubId;
    ovrEl.textContent = String(calcOvr(p));
    metaEl.textContent = `${p.name} · ${p.age}세 · ${p.position} · ${draft.core.year}년 · ${clubName}`;
  }

  function createModalDOM() {
    if (!document.body) return;
    if (!document.getElementById("ke-fab")) {
      const fab = document.createElement("button");
      fab.type = "button";
      fab.id = "ke-fab";
      fab.className = "ke-fab";
      fab.innerHTML = "⚡ 스탯 · 세팅";
      fab.title = "스탯, 나이 및 커리어 세팅 조절 (F2 / Alt+E)";
      fab.addEventListener("click", openEditor);
      document.body.appendChild(fab);
    }

    if (!document.getElementById("ke-backdrop")) {
      const backdrop = document.createElement("div");
      backdrop.id = "ke-backdrop";
      backdrop.className = "ke-backdrop";
      backdrop.innerHTML = `
      <div class="ke-modal" role="dialog" aria-modal="true" aria-label="스탯 & 커리어 에디터">
        <div class="ke-header">
          <div class="ke-title-wrap">
            <div class="ke-ovr-badge">
              <small>OVR</small>
              <strong id="ke-header-ovr">--</strong>
            </div>
            <div style="min-width:0">
              <h2>⚡ 스탯 · 나이 · 커리어 세팅</h2>
              <div class="ke-player-meta" id="ke-header-meta">불러오는 중...</div>
            </div>
          </div>
          <button type="button" class="ke-close-btn" id="ke-close-btn" aria-label="닫기">×</button>
        </div>
        <div class="ke-tabs" id="ke-tabs">
          <button type="button" class="ke-tab is-active" data-tab="attrs">⚡ 능력치·핵심세팅</button>
          <button type="button" class="ke-tab" data-tab="status">🏃 프로필·진로·전술</button>
          <button type="button" class="ke-tab" data-tab="finance">💰 재정·계약·병역</button>
          <button type="button" class="ke-tab" data-tab="career">🏆 기록·국대·이적</button>
        </div>
        <div class="ke-body" id="ke-body"></div>
        <div class="ke-footer" id="ke-footer">
          <span class="ke-footer-hint">단축키: F2 (에디터) · Alt+S (저장·불러오기)</span>
          <div class="ke-footer-actions" id="ke-footer-actions">
            <button type="button" class="ke-btn" id="ke-open-saves">💾 로컬 저장·불러오기</button>
            <button type="button" class="ke-btn" id="ke-reset-btn">되돌리기</button>
            <button type="button" class="ke-btn ke-btn-primary" id="ke-apply-btn">✅ 적용 & 닫기</button>
          </div>
        </div>
      </div>
    `;
      document.body.appendChild(backdrop);

      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) closeEditor();
      });
      document.getElementById("ke-close-btn").addEventListener("click", closeEditor);
      document.getElementById("ke-open-saves").addEventListener("click", () => {
        closeEditor();
        if (window.__KICKRU_SAVE__) window.__KICKRU_SAVE__.open("all");
      });
      document.getElementById("ke-reset-btn").addEventListener("click", () => {
        const bridge = getBridge();
        if (bridge?.life) {
          draft = cloneLife(bridge.life);
        } else {
          preset = { ...DEFAULT_PRESET };
          savePreset();
        }
        renderBody();
        updateHeaderBadge();
      });
      document.getElementById("ke-apply-btn").addEventListener("click", () => {
        if (!draft) {
          savePreset();
          getBridge()?.notify?.("초기 세팅이 저장되었어요. 새 선수 생성 시 자동 적용됩니다!");
          closeEditor();
          return;
        }
        if (applyDraft("스탯과 커리어 세팅을 적용했어요!")) {
          closeEditor();
        }
      });

      document.getElementById("ke-tabs").addEventListener("click", (e) => {
        const btn = e.target.closest(".ke-tab");
        if (!btn) return;
        activeTab = btn.dataset.tab;
        document.querySelectorAll(".ke-tab").forEach((el) => {
          el.classList.toggle("is-active", el.dataset.tab === activeTab);
        });
        renderBody();
      });
    }
  }

  function mountTopbarButton() {
    const actions = document.querySelector(".t-appbar-actions");
    if (!actions || document.getElementById("ke-topbar-btn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "ke-topbar-btn";
    btn.className = "ke-topbar-btn";
    btn.textContent = "⚡ 스탯 · 세팅";
    btn.title = "스탯, 나이 및 커리어 세팅 조절 (F2)";
    btn.addEventListener("click", openEditor);
    actions.insertBefore(btn, actions.firstChild);
  }

  function openEditor() {
    createModalDOM();
    const bridge = getBridge();
    draft = bridge?.life ? cloneLife(bridge.life) : null;
    isOpen = true;
    document.getElementById("ke-backdrop").classList.add("is-open");
    document.getElementById("ke-tabs").style.display = draft ? "grid" : "none";
    document.getElementById("ke-reset-btn").textContent = draft ? "되돌리기" : "기본값 초기화";
    document.getElementById("ke-apply-btn").textContent = draft ? "✅ 적용 & 닫기" : "💾 세팅 저장 & 닫기";
    updateHeaderBadge();
    renderBody();
  }

  function closeEditor() {
    isOpen = false;
    const el = document.getElementById("ke-backdrop");
    if (el) el.classList.remove("is-open");
  }

  function renderBody() {
    const body = document.getElementById("ke-body");
    if (!body) return;
    document.getElementById("ke-tabs").style.display = draft ? "grid" : "none";
    document.getElementById("ke-reset-btn").textContent = draft ? "되돌리기" : "기본값 초기화";
    document.getElementById("ke-apply-btn").textContent = draft ? "✅ 적용 & 닫기" : "💾 세팅 저장 & 닫기";

    if (!draft) {
      renderPreCreateView(body);
      return;
    }

    if (activeTab === "attrs") renderAttrsTab(body);
    else if (activeTab === "status") renderStatusTab(body);
    else if (activeTab === "finance") renderFinanceTab(body);
    else if (activeTab === "career") renderCareerTab(body);
  }

  function renderPreCreateView(body) {
    const bridge = getBridge();
    const countries = bridge?.r6?.countries || [{ code: "kr", name: "대한민국" }];
    const clubs = bridge?.r6?.clubs || [];
    const leagueMap = bridge?.r6?.leagueMap || {};

    const countryOptions = countries
      .map((c) => `<option value="${c.code}" ${preset.quickNationality === c.code ? "selected" : ""}>${escapeHtml(c.name)}</option>`)
      .join("");
    const posOptions = POSITIONS.map(
      (p) => `<option value="${p.id}" ${preset.quickPosition === p.id ? "selected" : ""}>${p.label}</option>`
    ).join("");
    const curveOptions = [
      `<option value="default" ${preset.curve === "default" ? "selected" : ""}>랜덤 / 기본</option>`,
      ...CURVES.map((c) => `<option value="${c.id}" ${preset.curve === c.id ? "selected" : ""}>${c.label}</option>`),
    ].join("");

    const q = (preset.quickClubQuery || "").trim().toLowerCase();
    const clubList = (
      q
        ? clubs.filter(
            (c) =>
              c.localName?.toLowerCase().includes(q) ||
              c.name?.toLowerCase().includes(q) ||
              leagueMap[c.league]?.name?.toLowerCase().includes(q)
          )
        : [...clubs].sort((a, b) => (b.strength || 0) - (a.strength || 0))
    ).slice(0, 40);

    if (clubList.length && !clubs.some((c) => c.id === preset.quickClubId)) {
      preset.quickClubId = clubList[0].id;
    }
    const clubOptions = clubList
      .map(
        (c) =>
          `<option value="${c.id}" ${preset.quickClubId === c.id ? "selected" : ""}>${escapeHtml(c.localName)} (${c.strength ?? "-"}) · ${escapeHtml(leagueMap[c.league]?.name || c.league)}</option>`
      )
      .join("");

    body.innerHTML = `
      <div class="ke-banner">
        <strong>초기 세팅 모드:</strong> 아래 설정을 켜두면 기본 <strong>새 커리어 시작하기</strong>로 선수를 만들 때도 나이·스탯·진로가 자동 적용되며, 하단 버튼으로 여기서 바로 커스텀 선수를 생성할 수도 있습니다!
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">1. 기본 생성 시 자동 적용 세팅</h3>
        </div>
        <label class="ke-toggle-row" style="cursor:pointer;">
          <div>
            <span>새 커리어 시작 시 아래 초기 세팅 자동 적용</span>
            <small>게임의 4단계 생성을 완료하는 즉시 아래 값들로 덮어씁니다</small>
          </div>
          <input type="checkbox" id="kp-enabled" ${preset.enabled ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--ke-accent);" />
        </label>
        <label class="ke-toggle-row" style="cursor:pointer;">
          <div>
            <span>첫 시즌 자동 시뮬레이션 건너뛰기 (추천)</span>
            <small>생성 직후 1시즌을 바로 보내지 않고 시즌 준비(Ready) 화면에서 멈춥니다</small>
          </div>
          <input type="checkbox" id="kp-skip-sim" ${preset.skipFirstSim ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--ke-accent);" />
        </label>

        <div class="ke-grid-2">
          <div class="ke-field">
            <label>시작 나이 (16 ~ 45세)</label>
            <div class="ke-stepper">
              <button type="button" class="ke-step-btn" data-kp-age="-1">-1</button>
              <input type="number" class="ke-input" id="kp-age" min="16" max="45" value="${preset.age}" />
              <button type="button" class="ke-step-btn" data-kp-age="1">+1</button>
            </div>
          </div>
          <div class="ke-field">
            <label>시작 시즌 연도 (2025 ~ 2050)</label>
            <input type="number" class="ke-input" id="kp-year" min="2025" max="2050" value="${preset.year}" />
          </div>
          <div class="ke-field">
            <label>시작 무대 / 진로</label>
            <select class="ke-select" id="kp-path">
              <option value="default" ${preset.path === "default" ? "selected" : ""}>기본 유지 (고교 / 유스)</option>
              <option value="professional" ${preset.path === "professional" ? "selected" : ""}>프로 1군 즉시 데뷔</option>
              <option value="school" ${preset.path === "school" ? "selected" : ""}>고등학교 (학년 지정)</option>
              <option value="academy" ${preset.path === "academy" ? "selected" : ""}>유스 아카데미</option>
            </select>
          </div>
          <div class="ke-field">
            <label>시작 능력치 일괄 세팅</label>
            <select class="ke-select" id="kp-stat-level">
              <option value="default" ${preset.statLevel === "default" ? "selected" : ""}>기본 능력치 유지 (OVR 43)</option>
              <option value="70" ${String(preset.statLevel) === "70" ? "selected" : ""}>유망주 (올 70)</option>
              <option value="80" ${String(preset.statLevel) === "80" ? "selected" : ""}>주전급 (올 80)</option>
              <option value="90" ${String(preset.statLevel) === "90" ? "selected" : ""}>월드클래스 (올 90)</option>
              <option value="99" ${String(preset.statLevel) === "99" ? "selected" : ""}>만렙 신계 (올 99)</option>
            </select>
          </div>
          <div class="ke-field">
            <label>키 (160 ~ 205 cm) / 몸무게 (50 ~ 105 kg)</label>
            <div class="ke-grid-2">
              <input type="number" class="ke-input" id="kp-height" min="160" max="205" value="${preset.height}" />
              <input type="number" class="ke-input" id="kp-weight" min="50" max="105" value="${preset.weight}" />
            </div>
          </div>
          <div class="ke-field">
            <label>주발 / 약발 고정</label>
            <div class="ke-grid-2">
              <select class="ke-select" id="kp-foot">
                <option value="default" ${preset.foot === "default" ? "selected" : ""}>기본 유지</option>
                <option value="오른발" ${preset.foot === "오른발" ? "selected" : ""}>오른발</option>
                <option value="왼발" ${preset.foot === "왼발" ? "selected" : ""}>왼발</option>
                <option value="양발" ${preset.foot === "양발" ? "selected" : ""}>양발</option>
              </select>
              <input type="number" class="ke-input" id="kp-weakfoot" min="0" max="100" title="약발 숙련도" value="${preset.weakFoot}" />
            </div>
          </div>
          <div class="ke-field">
            <label>잠재력 (체크 시 고정: ${preset.potential})</label>
            <div class="ke-stepper">
              <input type="checkbox" id="kp-use-pot" ${preset.useCustomPotential ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--ke-accent);" />
              <input type="number" class="ke-input" id="kp-pot" min="45" max="99" value="${preset.potential}" />
            </div>
          </div>
          <div class="ke-field">
            <label>성장 곡선 / 내구성</label>
            <div class="ke-grid-2">
              <select class="ke-select" id="kp-curve">${curveOptions}</select>
              <input type="number" class="ke-input" id="kp-durability" min="0.5" max="2.5" step="0.1" value="${preset.durability}" />
            </div>
          </div>
          <div class="ke-field">
            <label>시작 보유 자금</label>
            <select class="ke-select" id="kp-earnings">
              <option value="0" ${Number(preset.earnings) === 0 ? "selected" : ""}>0원 (기본)</option>
              <option value="10000000000" ${Number(preset.earnings) === 10000000000 ? "selected" : ""}>100억 원</option>
              <option value="100000000000" ${Number(preset.earnings) === 100000000000 ? "selected" : ""}>1,000억 원</option>
              <option value="1000000000000" ${Number(preset.earnings) === 1000000000000 ? "selected" : ""}>1조 원</option>
            </select>
          </div>
          <div class="ke-field" style="justify-content:flex-end;">
            <label class="ke-toggle-row" style="cursor:pointer;">
              <div>
                <span>세기의 재능 · 병역 면제</span>
              </div>
              <div style="display:flex;gap:10px;align-items:center;">
                <label style="font-size:11px;display:flex;align-items:center;gap:4px;"><input type="checkbox" id="kp-gen" ${preset.generational ? "checked" : ""} />재능99</label>
                <label style="font-size:11px;display:flex;align-items:center;gap:4px;"><input type="checkbox" id="kp-mil" ${preset.exemptMilitary ? "checked" : ""} />면제</label>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">2. ⚡ 원클릭 커스텀 선수 즉시 생성 & 게임 시작</h3>
          <span class="ke-section-sub">4단계 건너뛰고 바로 시작</span>
        </div>
        <div class="ke-grid-2">
          <div class="ke-field">
            <label>선수 이름</label>
            <input type="text" class="ke-input" id="kp-q-name" maxlength="32" value="${escapeHtml(preset.quickName)}" />
          </div>
          <div class="ke-field">
            <label>등번호 (1 ~ 99)</label>
            <input type="number" class="ke-input" id="kp-q-num" min="1" max="99" value="${preset.quickNumber}" />
          </div>
          <div class="ke-field">
            <label>국적</label>
            <select class="ke-select" id="kp-q-nat">${countryOptions}</select>
          </div>
          <div class="ke-field">
            <label>포지션</label>
            <select class="ke-select" id="kp-q-pos">${posOptions}</select>
          </div>
        </div>
        <div class="ke-field">
          <label>시작 구단 검색 & 선택</label>
          <input type="search" class="ke-input" id="kp-q-club-search" placeholder="구단 검색 (예: 아스널, 레알, 전북, 바르셀로나...)" value="${escapeHtml(preset.quickClubQuery || "")}" />
          <select class="ke-select" id="kp-q-club">${clubOptions}</select>
        </div>
        <button type="button" class="ke-btn ke-btn-primary" id="kp-quick-start" style="width:100%;margin-top:4px;">🚀 이 세팅으로 바로 커리어 시작하기</button>
      </div>
    `;

    const bind = (id, fn, ev = "change") => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(ev, () => { fn(el); savePreset(); updateHeaderBadge(); });
    };

    bind("kp-enabled", (el) => (preset.enabled = el.checked));
    bind("kp-skip-sim", (el) => (preset.skipFirstSim = el.checked));
    bind("kp-age", (el) => (preset.age = clamp(Math.round(Number(el.value || 16)), 16, 45)), "input");
    body.querySelectorAll("[data-kp-age]").forEach((btn) => {
      btn.addEventListener("click", () => {
        preset.age = clamp(preset.age + Number(btn.dataset.kpAge), 16, 45);
        document.getElementById("kp-age").value = String(preset.age);
        savePreset();
        updateHeaderBadge();
      });
    });
    bind("kp-year", (el) => (preset.year = clamp(Math.round(Number(el.value || 2026)), 2025, 2050)), "input");
    bind("kp-path", (el) => (preset.path = el.value));
    bind("kp-stat-level", (el) => (preset.statLevel = el.value));
    bind("kp-height", (el) => (preset.height = clamp(Math.round(Number(el.value || 178)), 160, 205)));
    bind("kp-weight", (el) => (preset.weight = clamp(Math.round(Number(el.value || 72)), 50, 105)));
    bind("kp-foot", (el) => (preset.foot = el.value));
    bind("kp-weakfoot", (el) => {
      preset.weakFoot = clamp(Math.round(Number(el.value || 50)), 0, 100);
      preset.useCustomWeakFoot = true;
    });
    bind("kp-use-pot", (el) => (preset.useCustomPotential = el.checked));
    bind("kp-pot", (el) => {
      preset.potential = clamp(Math.round(Number(el.value || 95)), 45, 99);
      preset.useCustomPotential = true;
      document.getElementById("kp-use-pot").checked = true;
    });
    bind("kp-curve", (el) => (preset.curve = el.value));
    bind("kp-durability", (el) => (preset.durability = clamp(Number(el.value || 1), 0.5, 2.5)));
    bind("kp-earnings", (el) => (preset.earnings = Number(el.value || 0)));
    bind("kp-gen", (el) => (preset.generational = el.checked));
    bind("kp-mil", (el) => (preset.exemptMilitary = el.checked));

    bind("kp-q-name", (el) => (preset.quickName = el.value), "input");
    bind("kp-q-num", (el) => (preset.quickNumber = clamp(Math.round(Number(el.value || 7)), 1, 99)), "input");
    bind("kp-q-nat", (el) => (preset.quickNationality = el.value));
    bind("kp-q-pos", (el) => (preset.quickPosition = el.value));
    bind("kp-q-club", (el) => (preset.quickClubId = el.value));

    document.getElementById("kp-q-club-search").addEventListener("input", (e) => {
      preset.quickClubQuery = e.target.value;
      savePreset();
      renderPreCreateView(body);
      const searchEl = document.getElementById("kp-q-club-search");
      if (searchEl) {
        searchEl.focus();
        searchEl.setSelectionRange(searchEl.value.length, searchEl.value.length);
      }
    });

    document.getElementById("kp-quick-start").addEventListener("click", () => {
      if (!bridge?.r4?.createLife || !bridge?.startCustomCareer) {
        alert("게임 엔진을 아직 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      try {
        const club = bridge.r6.clubMap[preset.quickClubId] || bridge.r6.clubs[0];
        const rules = bridge.iz?.CAREER_RULES || 7;
        const krSchool = bridge.rP?.SCHOOLS?.find((s) => s.parentClubId === club.id) || bridge.rP?.SCHOOLS?.[0];
        const createOpts = {
          name: (preset.quickName || "김킥루").trim().slice(0, 32) || "김킥루",
          number: clamp(Math.round(num(preset.quickNumber, 7)), 1, 99),
          nationality: preset.quickNationality || "kr",
          country: club.country === "kr" ? "kr" : club.country,
          position: preset.quickPosition || "ST",
          foot: preset.foot === "왼발" ? "왼발" : "오른발",
          developmentStyle: "balanced",
          body: {
            height: clamp(Math.round(num(preset.height, 178)), 160, 205),
            weight: clamp(Math.round(num(preset.weight, 72)), 50, 105),
          },
          rules,
          seed: Date.now() >>> 0,
        };
        if (club.country === "kr") {
          createOpts.schoolId = krSchool.id;
        } else {
          createOpts.clubId = club.id;
        }

        let life = bridge.r4.createLife(createOpts);
        life = applyCreationPreset(life, { ...preset, enabled: true });

        // If user specifically chose a KR club and wants pro or that club, ensure club matches
        if (club.country === "kr" && (preset.path === "professional" || life.core.clubId !== club.id)) {
          if (preset.path === "professional" || !krSchool || krSchool.parentClubId !== club.id) {
            promoteLifeToPro(life, club.id);
          }
        }
        life = sanitizeLife(life);
        bridge.startCustomCareer(life);
        bridge.notify?.(`${life.core.player.name} (${life.core.player.age}세) 커리어를 시작합니다!`);
        closeEditor();
      } catch (err) {
        alert("커리어 생성 중 오류가 발생했습니다: " + (err?.message || String(err)));
      }
    });
  }

  function renderAttrsTab(body) {
    const p = draft.core.player;
    const weights = OVR_WEIGHTS[p.position] || OVR_WEIGHTS.ST;

    const posOptions = POSITIONS.map(
      (pos) => `<option value="${pos.id}" ${p.position === pos.id ? "selected" : ""}>${pos.label}</option>`
    ).join("");
    const footOptions = ["오른발", "왼발", "양발"]
      .map((f) => `<option value="${f}" ${p.foot === f ? "selected" : ""}>${f}</option>`)
      .join("");
    const pathOptions = PATH_OPTIONS.map(
      (opt) => `<option value="${opt.id}" ${draft.path === opt.id ? "selected" : ""}>${opt.label}</option>`
    ).join("");

    const attrRowsHtml = ATTR_LIST.map((attr) => {
      const val = Math.round(num(p.attributes[attr.key], 50) * 10) / 10;
      const w = weights[attr.key];
      const weightBadge = w ? `<span class="ke-weight-tag">${Math.round(w * 100)}%</span>` : "";
      return `
        <div class="ke-stat-row ${w ? "is-primary-attr" : ""}">
          <div class="ke-stat-top">
            <span class="ke-stat-label">${attr.label}${weightBadge}</span>
            <input type="number" class="ke-num-input" data-attr-num="${attr.key}" min="0" max="100" step="1" value="${Math.round(val)}" />
          </div>
          <input type="range" class="ke-range" data-attr-range="${attr.key}" min="0" max="100" step="1" value="${Math.round(val)}" />
        </div>
      `;
    }).join("");

    const gradeOptions = POTENTIAL_GRADES.map(
      (g) => `<option value="${g.id}" ${draft.potentialGrade === g.id ? "selected" : ""}>${g.label}</option>`
    ).join("");
    const curveOptions = CURVES.map(
      (c) => `<option value="${c.id}" ${draft.hiddenCurve === c.id ? "selected" : ""}>${c.label}</option>`
    ).join("");

    body.innerHTML = `
      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">👤 핵심 세팅 빠른 조절 (나이 · 연도 · 무대 · 신체)</h3>
          <span class="ke-section-sub">자세한 진로/국적은 2번째 탭</span>
        </div>
        <div class="ke-grid-3">
          <div class="ke-field">
            <label>나이 (16 ~ 45세)</label>
            <div class="ke-stepper">
              <button type="button" class="ke-step-btn" data-age-step="-1">-1</button>
              <input type="number" class="ke-input" id="ke-quick-age" min="16" max="45" value="${Math.round(p.age)}" />
              <button type="button" class="ke-step-btn" data-age-step="1">+1</button>
            </div>
          </div>
          <div class="ke-field">
            <label>시즌 연도 (2025 ~ 2100)</label>
            <input type="number" class="ke-input" id="ke-quick-year" min="2025" max="2100" value="${Math.round(draft.core.year)}" />
          </div>
          <div class="ke-field">
            <label>현재 무대 (Path)</label>
            <select class="ke-select" id="ke-quick-path">${pathOptions}</select>
          </div>
          <div class="ke-field">
            <label>포지션</label>
            <select class="ke-select" id="ke-quick-pos">${posOptions}</select>
          </div>
          <div class="ke-field">
            <label>주발</label>
            <select class="ke-select" id="ke-quick-foot">${footOptions}</select>
          </div>
          <div class="ke-field">
            <label>키(160~205) / 몸무게(50~105)</label>
            <div class="ke-grid-2">
              <input type="number" class="ke-input" id="ke-quick-height" min="160" max="205" value="${p.body?.height ?? 178}" />
              <input type="number" class="ke-input" id="ke-quick-weight" min="50" max="105" value="${p.body?.weight ?? 72}" />
            </div>
          </div>
        </div>
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">원클릭 능력치 프리셋</h3>
          <span class="ke-section-sub">포지션 핵심 능력치는 초록 테두리로 표시됩니다</span>
        </div>
        <div class="ke-preset-grid">
          <button type="button" class="ke-chip-btn is-primary" data-preset="99">🔥 올 99 (MAX)</button>
          <button type="button" class="ke-chip-btn is-blue" data-preset="90">⭐ 월드클래스 (90)</button>
          <button type="button" class="ke-chip-btn" data-preset="80">💎 유망주 각성 (80)</button>
          <button type="button" class="ke-chip-btn" data-delta="5">📈 전체 +5</button>
          <button type="button" class="ke-chip-btn" data-delta="10">📈 전체 +10</button>
          <button type="button" class="ke-chip-btn" data-delta="-5">📉 전체 -5</button>
        </div>
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">세부 능력치 (0 ~ 100)</h3>
          <span class="ke-section-sub">현재 포지션: ${p.position} · OVR ${calcOvr(p)}</span>
        </div>
        <div class="ke-stat-list">${attrRowsHtml}</div>
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">잠재력 · 약발 · 성장 히든 스탯</h3>
        </div>
        <div class="ke-grid-2">
          <div class="ke-field">
            <label>잠재력 (45 ~ 99)</label>
            <input type="number" class="ke-input" id="ke-potential" min="45" max="99" value="${Math.round(num(p.potential, 80))}" />
          </div>
          <div class="ke-field">
            <label>약발 숙련도 (0 ~ 100)</label>
            <input type="number" class="ke-input" id="ke-weakfoot" min="0" max="100" value="${Math.round(num(draft.weakFoot, 30))}" />
          </div>
          <div class="ke-field">
            <label>잠재력 등급</label>
            <select class="ke-select" id="ke-pot-grade">${gradeOptions}</select>
          </div>
          <div class="ke-field">
            <label>성장 곡선 (Hidden Curve)</label>
            <select class="ke-select" id="ke-curve">${curveOptions}</select>
          </div>
          <div class="ke-field">
            <label>부상 내구성 (0.5 ~ 2.5, 높을수록 강철몸)</label>
            <input type="number" class="ke-input" id="ke-durability" min="0.5" max="2.5" step="0.05" value="${num(draft.hiddenDurability, 1).toFixed(2)}" />
          </div>
          <div class="ke-field" style="justify-content:flex-end;">
            <label class="ke-toggle-row" style="cursor:pointer;">
              <div>
                <span>세기의 재능 (Generational)</span>
                <small>활성화 시 잠재력 99 고정</small>
              </div>
              <input type="checkbox" id="ke-generational" ${draft.generationalTalent ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--ke-accent);" />
            </label>
          </div>
        </div>
      </div>
    `;

    // Quick settings bindings
    document.getElementById("ke-quick-age").addEventListener("input", (e) => {
      p.age = clamp(Math.round(Number(e.target.value || 16)), 16, 45);
      updateHeaderBadge();
    });
    body.querySelectorAll("[data-age-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        p.age = clamp(Math.round(p.age) + Number(btn.dataset.ageStep), 16, 45);
        document.getElementById("ke-quick-age").value = String(p.age);
        updateHeaderBadge();
      });
    });
    document.getElementById("ke-quick-year").addEventListener("input", (e) => {
      draft.core.year = clamp(Math.round(Number(e.target.value || 2026)), 2025, 2100);
      updateHeaderBadge();
    });
    document.getElementById("ke-quick-path").addEventListener("change", (e) => {
      const nextPath = e.target.value;
      if (nextPath === "professional") {
        promoteLifeToPro(draft, draft.core.clubId);
      } else {
        draft.path = nextPath;
        draft.core.youth = true;
      }
      updateHeaderBadge();
    });
    document.getElementById("ke-quick-pos").addEventListener("change", (e) => {
      p.position = e.target.value;
      updateHeaderBadge();
      renderBody();
    });
    document.getElementById("ke-quick-foot").addEventListener("change", (e) => {
      p.foot = e.target.value;
      if (p.foot === "양발") {
        draft.weakFoot = Math.max(85, draft.weakFoot);
        p.weakFoot = draft.weakFoot;
        document.getElementById("ke-weakfoot").value = String(draft.weakFoot);
      }
    });
    const updateQuickBody = () => {
      const h = clamp(Math.round(Number(document.getElementById("ke-quick-height").value || 178)), 160, 205);
      const w = clamp(Math.round(Number(document.getElementById("ke-quick-weight").value || 72)), 50, 105);
      p.body = { height: h, weight: w };
    };
    document.getElementById("ke-quick-height").addEventListener("change", updateQuickBody);
    document.getElementById("ke-quick-weight").addEventListener("change", updateQuickBody);

    // Presets
    body.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = Number(btn.dataset.preset);
        for (const a of ATTR_LIST) {
          p.attributes[a.key] = val;
        }
        if (val >= 90) {
          p.potential = Math.max(p.potential, 99);
          draft.generationalTalent = true;
          draft.potentialGrade = "generational";
        }
        updateHeaderBadge();
        renderBody();
      });
    });

    body.querySelectorAll("[data-delta]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const d = Number(btn.dataset.delta);
        for (const a of ATTR_LIST) {
          p.attributes[a.key] = clamp(Math.round(num(p.attributes[a.key], 50) + d), 0, 100);
        }
        updateHeaderBadge();
        renderBody();
      });
    });

    body.querySelectorAll("[data-attr-range]").forEach((range) => {
      range.addEventListener("input", (e) => {
        const key = e.target.dataset.attrRange;
        const val = clamp(Number(e.target.value), 0, 100);
        p.attributes[key] = val;
        const numInput = body.querySelector(`[data-attr-num="${key}"]`);
        if (numInput) numInput.value = String(val);
        updateHeaderBadge();
      });
    });
    body.querySelectorAll("[data-attr-num]").forEach((input) => {
      input.addEventListener("input", (e) => {
        const key = e.target.dataset.attrNum;
        const val = clamp(Number(e.target.value || 0), 0, 100);
        p.attributes[key] = val;
        const range = body.querySelector(`[data-attr-range="${key}"]`);
        if (range) range.value = String(val);
        updateHeaderBadge();
      });
    });

    document.getElementById("ke-potential").addEventListener("input", (e) => {
      p.potential = clamp(Math.round(Number(e.target.value || 45)), 45, 99);
    });
    document.getElementById("ke-weakfoot").addEventListener("input", (e) => {
      const val = clamp(Math.round(Number(e.target.value || 0)), 0, 100);
      draft.weakFoot = val;
      p.weakFoot = val;
    });
    document.getElementById("ke-pot-grade").addEventListener("change", (e) => {
      draft.potentialGrade = e.target.value;
      if (e.target.value === "generational") {
        draft.generationalTalent = true;
        p.potential = 99;
        document.getElementById("ke-generational").checked = true;
        document.getElementById("ke-potential").value = "99";
      } else {
        draft.generationalTalent = false;
        document.getElementById("ke-generational").checked = false;
      }
    });
    document.getElementById("ke-curve").addEventListener("change", (e) => {
      draft.hiddenCurve = e.target.value;
    });
    document.getElementById("ke-durability").addEventListener("input", (e) => {
      draft.hiddenDurability = clamp(Number(e.target.value || 1), 0.5, 2.5);
    });
    document.getElementById("ke-generational").addEventListener("change", (e) => {
      draft.generationalTalent = e.target.checked;
      if (e.target.checked) {
        draft.potentialGrade = "generational";
        p.potential = 99;
        document.getElementById("ke-pot-grade").value = "generational";
        document.getElementById("ke-potential").value = "99";
      } else if (draft.potentialGrade === "generational") {
        draft.potentialGrade = "legend";
        document.getElementById("ke-pot-grade").value = "legend";
      }
    });
  }

  function renderStatusTab(body) {
    const bridge = getBridge();
    const p = draft.core.player;
    const squad = p.squad;

    const countries = bridge?.r6?.countries || [{ code: "kr", name: "대한민국" }];
    const natOptions = countries
      .map((c) => `<option value="${c.code}" ${p.nationality === c.code ? "selected" : ""}>${escapeHtml(c.name)}</option>`)
      .join("");
    const avatarOptions = AVATARS.map(
      (av, idx) => `<option value="${av}" ${draft.avatarId === av ? "selected" : ""}>도트 아바타 #${idx + 1} (${av})</option>`
    ).join("");
    const posOptions = POSITIONS.map(
      (pos) => `<option value="${pos.id}" ${p.position === pos.id ? "selected" : ""}>${pos.label}</option>`
    ).join("");
    const footOptions = ["오른발", "왼발", "양발"]
      .map((f) => `<option value="${f}" ${p.foot === f ? "selected" : ""}>${f}</option>`)
      .join("");
    const roleOptions = (cur) =>
      ROLES.map((r) => `<option value="${r.id}" ${cur === r.id ? "selected" : ""}>${r.label}</option>`).join("");

    const pathOptions = PATH_OPTIONS.map(
      (opt) => `<option value="${opt.id}" ${draft.path === opt.id ? "selected" : ""}>${opt.label}</option>`
    ).join("");

    const schools = [...(bridge?.rP?.SCHOOLS || []), ...(bridge?.rP?.JP_SCHOOLS || [])];
    const schoolOptions = schools
      .map((s) => `<option value="${s.id}" ${draft.schoolId === s.id ? "selected" : ""}>${escapeHtml(s.name)}</option>`)
      .join("");

    const univs = [...(bridge?.rP?.UNIVERSITIES || []), ...(bridge?.rP?.JP_UNIVERSITIES || [])];
    const univOptions = univs
      .map((u) => `<option value="${escapeHtml(u)}" ${draft.university === u ? "selected" : ""}>${escapeHtml(u)}</option>`)
      .join("");

    const styles = bridge?.r2?.stylesFor ? bridge.r2.stylesFor(p.position) : [{ id: "balanced", name: "균형형" }];
    const devStyleOptions = styles
      .map((st) => `<option value="${st.id}" ${draft.developmentStyle === st.id ? "selected" : ""}>${escapeHtml(st.name)}</option>`)
      .join("");
    const playStyleOptions = styles
      .map((st) => `<option value="${st.id}" ${draft.playingStyle === st.id ? "selected" : ""}>${escapeHtml(st.name)}</option>`)
      .join("");

    const visibleAttrs =
      bridge?.r5?.visibleAttributes?.(p.position) ||
      (p.position === "GK"
        ? ["reflexes", "handling", "positioning", "kicking", "physical", "passing"]
        : ["pace", "shooting", "passing", "dribbling", "defending", "physical"]);
    const targetChips = visibleAttrs
      .map((key) => {
        const label = ATTR_LIST.find((a) => a.key === key)?.label || key;
        const selected = (draft.trainingTargets || []).includes(key);
        return `<button type="button" class="ke-target-chip ${selected ? "is-selected" : ""}" data-target-attr="${key}">${label}</button>`;
      })
      .join("");

    const planOptions = NEXT_PLANS.map(
      (pl) => `<option value="${pl.id}" ${(draft.nextPlan || "") === pl.id ? "selected" : ""}>${pl.label}</option>`
    ).join("");

    const isCaptain = draft.captainClubId && draft.captainClubId === draft.core.clubId;

    body.innerHTML = `
      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">선수 기본 프로필</h3>
        </div>
        <div class="ke-grid-2">
          <div class="ke-field">
            <label>선수 이름 (최대 32자)</label>
            <input type="text" class="ke-input" id="ke-name" maxlength="32" value="${escapeHtml(p.name)}" />
          </div>
          <div class="ke-field">
            <label>등번호 (1 ~ 99)</label>
            <input type="number" class="ke-input" id="ke-number" min="1" max="99" value="${Math.round(p.number)}" />
          </div>
          <div class="ke-field">
            <label>나이 (16 ~ 45세)</label>
            <input type="number" class="ke-input" id="ke-age" min="16" max="45" value="${Math.round(p.age)}" />
          </div>
          <div class="ke-field">
            <label>국적 (국가대표 팀)</label>
            <select class="ke-select" id="ke-nat">${natOptions}</select>
          </div>
          <div class="ke-field">
            <label>도트 아바타</label>
            <select class="ke-select" id="ke-avatar">${avatarOptions}</select>
          </div>
          <div class="ke-field">
            <label>포지션 / 주발</label>
            <div class="ke-grid-2">
              <select class="ke-select" id="ke-pos">${posOptions}</select>
              <select class="ke-select" id="ke-foot">${footOptions}</select>
            </div>
          </div>
          <div class="ke-field">
            <label>키 (160 ~ 205 cm) / 몸무게 (50 ~ 105 kg)</label>
            <div class="ke-grid-2">
              <input type="number" class="ke-input" id="ke-height" min="160" max="205" value="${p.body?.height ?? 178}" />
              <input type="number" class="ke-input" id="ke-weight" min="50" max="105" value="${p.body?.weight ?? 72}" />
            </div>
          </div>
          <div class="ke-field">
            <label>현재 시즌 연도</label>
            <input type="number" class="ke-input" id="ke-year" min="2025" max="2100" value="${Math.round(draft.core.year)}" />
          </div>
        </div>
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">진로 · 학교 · 소속 무대</h3>
          <button type="button" class="ke-chip-btn is-primary" id="ke-promote-pro">🚀 프로 1군 즉시 승격</button>
        </div>
        <div class="ke-grid-2">
          <div class="ke-field">
            <label>현재 무대 (Path)</label>
            <select class="ke-select" id="ke-path">${pathOptions}</select>
          </div>
          <div class="ke-field">
            <label>${draft.path === "university" ? "대학교 학년 (1~4)" : "고등학교 학년 (1~3)"}</label>
            <input type="number" class="ke-input" id="ke-grade-year" min="1" max="${draft.path === "university" ? 4 : 3}" value="${draft.path === "university" ? Math.max(1, draft.studyYear || 1) : Math.max(1, draft.schoolYear || 1)}" />
          </div>
          ${
            schools.length
              ? `<div class="ke-field">
                  <label>소속 고등학교 (고교 무대용)</label>
                  <select class="ke-select" id="ke-school-id">${schoolOptions}</select>
                </div>`
              : ""
          }
          ${
            univs.length
              ? `<div class="ke-field">
                  <label>소속 대학교 (대학 무대용)</label>
                  <select class="ke-select" id="ke-univ-id">${univOptions}</select>
                </div>`
              : ""
          }
        </div>
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">전술 · 육성 · 주장 완장</h3>
        </div>
        <div class="ke-grid-2">
          <div class="ke-field">
            <label>육성 스타일 (Development Style)</label>
            <select class="ke-select" id="ke-dev-style">${devStyleOptions}</select>
          </div>
          <div class="ke-field">
            <label>플레이 스타일 (Playing Style)</label>
            <select class="ke-select" id="ke-play-style">${playStyleOptions}</select>
          </div>
          <div class="ke-field">
            <label>다음 시즌 계획 (Next Plan)</label>
            <select class="ke-select" id="ke-next-plan">${planOptions}</select>
          </div>
          <div class="ke-field" style="justify-content:flex-end;">
            <label class="ke-toggle-row" style="cursor:pointer;">
              <div>
                <span>소속팀 주장 완장</span>
                <small>현재 소속 구단의 주장으로 지정</small>
              </div>
              <input type="checkbox" id="ke-captain" ${isCaptain ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--ke-accent);" />
            </label>
          </div>
        </div>
        <div class="ke-field">
          <label>집중 육성 능력치 (최대 2개 선택)</label>
          <div class="ke-target-grid">${targetChips}</div>
        </div>
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">컨디션 & 팀 내 입지</h3>
          <button type="button" class="ke-chip-btn is-primary" id="ke-heal-all">💊 부상·징계 완치 & 100%</button>
        </div>
        <div class="ke-grid-2">
          <div class="ke-stat-row">
            <div class="ke-stat-top">
              <span class="ke-stat-label">체력 (Energy)</span>
              <input type="number" class="ke-num-input" id="ke-energy-num" min="0" max="100" value="${Math.round(p.energy)}" />
            </div>
            <input type="range" class="ke-range" id="ke-energy-range" min="0" max="100" value="${Math.round(p.energy)}" />
          </div>
          <div class="ke-stat-row">
            <div class="ke-stat-top">
              <span class="ke-stat-label">사기 (Morale)</span>
              <input type="number" class="ke-num-input" id="ke-morale-num" min="0" max="100" value="${Math.round(p.morale)}" />
            </div>
            <input type="range" class="ke-range" id="ke-morale-range" min="0" max="100" value="${Math.round(p.morale)}" />
          </div>
          <div class="ke-stat-row">
            <div class="ke-stat-top">
              <span class="ke-stat-label">명성 (Reputation)</span>
              <input type="number" class="ke-num-input" id="ke-rep-num" min="0" max="100" value="${Math.round(p.reputation)}" />
            </div>
            <input type="range" class="ke-range" id="ke-rep-range" min="0" max="100" value="${Math.round(p.reputation)}" />
          </div>
          ${
            squad
              ? `<div class="ke-stat-row">
                  <div class="ke-stat-top">
                    <span class="ke-stat-label">감독 신뢰도 (Trust)</span>
                    <input type="number" class="ke-num-input" id="ke-trust-num" min="0" max="100" value="${Math.round(squad.trust)}" />
                  </div>
                  <input type="range" class="ke-range" id="ke-trust-range" min="0" max="100" value="${Math.round(squad.trust)}" />
                </div>`
              : ""
          }
        </div>
        ${
          squad
            ? `<div class="ke-grid-2">
                <div class="ke-field">
                  <label>현재 입지 (Current)</label>
                  <select class="ke-select" id="ke-squad-cur">${roleOptions(squad.current)}</select>
                </div>
                <div class="ke-field">
                  <label>약속된 입지 (Promised)</label>
                  <select class="ke-select" id="ke-squad-prom">${roleOptions(squad.promised)}</select>
                </div>
              </div>`
            : ""
        }
      </div>
    `;

    // Profile bindings
    document.getElementById("ke-name").addEventListener("input", (e) => {
      p.name = e.target.value;
      updateHeaderBadge();
    });
    document.getElementById("ke-number").addEventListener("input", (e) => {
      p.number = clamp(Math.round(Number(e.target.value || 1)), 1, 99);
    });
    document.getElementById("ke-age").addEventListener("input", (e) => {
      p.age = clamp(Math.round(Number(e.target.value || 16)), 16, 45);
      updateHeaderBadge();
    });
    document.getElementById("ke-nat").addEventListener("change", (e) => {
      p.nationality = e.target.value;
    });
    document.getElementById("ke-avatar").addEventListener("change", (e) => {
      draft.avatarId = e.target.value;
    });
    document.getElementById("ke-pos").addEventListener("change", (e) => {
      p.position = e.target.value;
      updateHeaderBadge();
      renderBody();
    });
    document.getElementById("ke-foot").addEventListener("change", (e) => {
      p.foot = e.target.value;
      if (p.foot === "양발") {
        draft.weakFoot = Math.max(85, draft.weakFoot);
        p.weakFoot = draft.weakFoot;
      }
    });
    const updateBody = () => {
      const h = clamp(Math.round(Number(document.getElementById("ke-height").value || 178)), 160, 205);
      const w = clamp(Math.round(Number(document.getElementById("ke-weight").value || 72)), 50, 105);
      p.body = { height: h, weight: w };
    };
    document.getElementById("ke-height").addEventListener("change", updateBody);
    document.getElementById("ke-weight").addEventListener("change", updateBody);
    document.getElementById("ke-year").addEventListener("input", (e) => {
      draft.core.year = clamp(Math.round(Number(e.target.value || 2026)), 2025, 2100);
      updateHeaderBadge();
    });

    // Path & School/Univ bindings
    document.getElementById("ke-path").addEventListener("change", (e) => {
      const nextPath = e.target.value;
      if (nextPath === "professional") {
        promoteLifeToPro(draft, draft.core.clubId);
      } else {
        draft.path = nextPath;
        draft.core.youth = true;
        if (nextPath === "school") {
          draft.schoolYear = Math.max(1, draft.schoolYear || 1);
          if (!draft.schoolId && schools.length) draft.schoolId = schools[0].id;
        } else if (nextPath === "university") {
          draft.studyYear = Math.max(1, draft.studyYear || 1);
          if (!draft.university && univs.length) draft.university = univs[0];
        }
      }
      renderBody();
    });
    document.getElementById("ke-promote-pro").addEventListener("click", () => {
      promoteLifeToPro(draft, draft.core.clubId);
      applyDraft("프로 1군으로 승격했어요!");
    });
    document.getElementById("ke-grade-year").addEventListener("input", (e) => {
      if (draft.path === "university") {
        draft.studyYear = clamp(Math.round(Number(e.target.value || 1)), 1, 4);
      } else {
        draft.schoolYear = clamp(Math.round(Number(e.target.value || 1)), 1, 3);
      }
    });
    const schoolSel = document.getElementById("ke-school-id");
    if (schoolSel) {
      schoolSel.addEventListener("change", (e) => {
        draft.schoolId = e.target.value;
      });
    }
    const univSel = document.getElementById("ke-univ-id");
    if (univSel) {
      univSel.addEventListener("change", (e) => {
        draft.university = e.target.value;
      });
    }

    // Tactics / styles / training targets / captain
    document.getElementById("ke-dev-style").addEventListener("change", (e) => {
      draft.developmentStyle = e.target.value;
    });
    document.getElementById("ke-play-style").addEventListener("change", (e) => {
      draft.playingStyle = e.target.value;
    });
    document.getElementById("ke-next-plan").addEventListener("change", (e) => {
      draft.nextPlan = e.target.value || null;
    });
    document.getElementById("ke-captain").addEventListener("change", (e) => {
      if (e.target.checked) {
        draft.captainClubId = draft.core.clubId;
      } else {
        delete draft.captainClubId;
      }
    });

    body.querySelectorAll("[data-target-attr]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const key = chip.dataset.targetAttr;
        let cur = [...(draft.trainingTargets || [])];
        if (cur.includes(key)) {
          if (cur.length > 1) cur = cur.filter((x) => x !== key);
        } else if (cur.length >= 2) {
          cur = [cur[1], key];
        } else {
          cur.push(key);
        }
        draft.trainingTargets = cur;
        renderBody();
      });
    });

    // Condition & Squad
    document.getElementById("ke-heal-all").addEventListener("click", () => {
      p.injury = 0;
      p.suspension = 0;
      p.yellow = 0;
      p.energy = 100;
      p.morale = 100;
      if (Array.isArray(draft.events)) {
        for (const ev of draft.events) {
          if (ev && (ev.kind === "injury" || ev.kind === "illness")) {
            ev.remainingWeeks = 0;
            ev.resolved = true;
          }
        }
      }
      renderBody();
    });

    const bindPair = (rangeId, numId, setter) => {
      const r = document.getElementById(rangeId);
      const n = document.getElementById(numId);
      if (!r || !n) return;
      r.addEventListener("input", () => {
        const v = clamp(Number(r.value), 0, 100);
        setter(v);
        n.value = String(v);
      });
      n.addEventListener("input", () => {
        const v = clamp(Number(n.value || 0), 0, 100);
        setter(v);
        r.value = String(v);
      });
    };

    bindPair("ke-energy-range", "ke-energy-num", (v) => (p.energy = v));
    bindPair("ke-morale-range", "ke-morale-num", (v) => (p.morale = v));
    bindPair("ke-rep-range", "ke-rep-num", (v) => (p.reputation = v));
    if (squad) {
      bindPair("ke-trust-range", "ke-trust-num", (v) => (squad.trust = v));
      document.getElementById("ke-squad-cur").addEventListener("change", (e) => {
        squad.current = e.target.value;
      });
      document.getElementById("ke-squad-prom").addEventListener("change", (e) => {
        squad.promised = e.target.value;
      });
    }
  }

  function renderFinanceTab(body) {
    const bridge = getBridge();
    const p = draft.core.player;
    const milOptions = MILITARY_STATUSES.map(
      (m) => `<option value="${m.id}" ${draft.military?.status === m.id ? "selected" : ""}>${m.label}</option>`
    ).join("");
    const ownedShopCount = draft.shop?.owned?.length || 0;
    const allShopItems = bridge?.nZ?.shopItems || Object.values(bridge?.nZ?.shopItemMap || {});

    body.innerHTML = `
      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">보유 자산 / 누적 수익</h3>
          <span class="ke-section-sub" id="ke-earnings-hint">${formatMoney(p.earnings)}</span>
        </div>
        <div class="ke-preset-grid">
          <button type="button" class="ke-chip-btn" data-add-money="1000000000">+10억</button>
          <button type="button" class="ke-chip-btn" data-add-money="10000000000">+100억</button>
          <button type="button" class="ke-chip-btn is-blue" data-add-money="100000000000">+1,000억</button>
          <button type="button" class="ke-chip-btn is-primary" data-add-money="1000000000000">+1조</button>
        </div>
        <div class="ke-field">
          <label>보유 자산 (원 단위)</label>
          <input type="number" class="ke-input" id="ke-earnings" min="0" step="1000000" value="${Math.round(num(p.earnings, 0))}" />
        </div>
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">🛍️ 상점 아이템 관리 (구매 제한 해제됨)</h3>
          <span class="ke-section-sub">현재 보유: ${ownedShopCount}개</span>
        </div>
        <div class="ke-preset-grid">
          <button type="button" class="ke-chip-btn is-primary" id="ke-shop-all">🛒 전 상품 34종 한번에 모두 보유 (무료)</button>
          <button type="button" class="ke-chip-btn" id="ke-shop-clear">🧹 상점 보유 내역 초기화</button>
        </div>
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">연봉 & 계약 기간</h3>
          <span class="ke-section-sub" id="ke-wage-hint">${formatMoney(p.wage)} / 년</span>
        </div>
        <div class="ke-grid-2">
          <div class="ke-field">
            <label>연봉 (원 단위)</label>
            <input type="number" class="ke-input" id="ke-wage" min="0" step="1000000" value="${Math.round(num(p.wage, 0))}" />
          </div>
          <div class="ke-field">
            <label>남은 계약 기간 (년, 0 ~ 10)</label>
            <input type="number" class="ke-input" id="ke-contract" min="0" max="10" value="${Math.round(num(p.contract, 0))}" />
          </div>
        </div>
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">병역 상태</h3>
          <button type="button" class="ke-chip-btn is-primary" id="ke-mil-exempt">🎖️ 즉시 병역 면제</button>
        </div>
        <div class="ke-field">
          <label>병역 상태 변경</label>
          <select class="ke-select" id="ke-mil-status">${milOptions}</select>
        </div>
      </div>
    `;

    body.querySelectorAll("[data-add-money]").forEach((btn) => {
      btn.addEventListener("click", () => {
        p.earnings = Math.max(0, Math.round(num(p.earnings, 0)) + Number(btn.dataset.addMoney));
        document.getElementById("ke-earnings").value = String(p.earnings);
        document.getElementById("ke-earnings-hint").textContent = formatMoney(p.earnings);
      });
    });

    document.getElementById("ke-earnings").addEventListener("input", (e) => {
      p.earnings = Math.max(0, Math.round(Number(e.target.value || 0)));
      document.getElementById("ke-earnings-hint").textContent = formatMoney(p.earnings);
    });

    document.getElementById("ke-shop-all").addEventListener("click", () => {
      if (!allShopItems.length) {
        alert("상점 데이터를 불러오지 못했습니다.");
        return;
      }
      const existing = draft.shop?.owned || [];
      const toAdd = allShopItems.map((it) => it.id).filter((id) => !existing.includes(id));
      draft.shop = {
        owned: [...existing, ...toAdd],
        spent: draft.shop?.spent || 0,
        season: draft.history?.length || 0,
        thisSeason: draft.shop?.thisSeason || [],
        boosted: true,
      };
      if (toAdd.length && bridge?.nZ?.applyShopPoints && bridge?.nZ?.shopPoints) {
        bridge.nZ.applyShopPoints(p, bridge.nZ.shopPoints(toAdd, p.position));
      }
      applyDraft(`상점 전 상품 ${allShopItems.length}종을 모두 획득했어요!`);
    });

    document.getElementById("ke-shop-clear").addEventListener("click", () => {
      delete draft.shop;
      applyDraft("상점 보유 내역을 초기화했어요!");
    });
    document.getElementById("ke-wage").addEventListener("input", (e) => {
      p.wage = Math.max(0, Math.round(Number(e.target.value || 0)));
      document.getElementById("ke-wage-hint").textContent = formatMoney(p.wage) + " / 년";
    });
    document.getElementById("ke-contract").addEventListener("input", (e) => {
      p.contract = clamp(Math.round(Number(e.target.value || 0)), 0, 10);
    });
    document.getElementById("ke-mil-status").addEventListener("change", (e) => {
      draft.military.status = e.target.value;
      if (["exempt", "completed", "notRequired"].includes(e.target.value)) {
        draft.military.monthsRemaining = 0;
      }
    });
    document.getElementById("ke-mil-exempt").addEventListener("click", () => {
      draft.military.status = "exempt";
      draft.military.monthsRemaining = 0;
      draft.military.note = "병역 면제 혜택 적용";
      document.getElementById("ke-mil-status").value = "exempt";
    });
  }

  function renderCareerTab(body) {
    const s = draft.core.stats;
    const intl = draft.core.international || (draft.core.international = { caps: 0, goals: 0, trophies: 0 });
    const avgRating = s.apps > 0 ? (s.ratingSum / s.apps).toFixed(2) : "0.00";

    body.innerHTML = `
      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">이번 시즌 기록</h3>
          <span class="ke-section-sub">현재 평균 평점: <strong id="ke-avg-rating">${avgRating}</strong></span>
        </div>
        <div class="ke-preset-grid">
          <button type="button" class="ke-chip-btn" data-add-goal="10">+10골</button>
          <button type="button" class="ke-chip-btn" data-add-goal="30">+30골</button>
          <button type="button" class="ke-chip-btn" data-add-goal="50">+50골</button>
          <button type="button" class="ke-chip-btn" data-add-assist="10">+10도움</button>
          <button type="button" class="ke-chip-btn" data-add-assist="20">+20도움</button>
          <button type="button" class="ke-chip-btn is-primary" id="ke-rating-95">⭐ 평점 9.5점 세팅</button>
        </div>
        <div class="ke-grid-3">
          <div class="ke-field">
            <label>출전 경기 (apps)</label>
            <input type="number" class="ke-input" data-stat="apps" min="0" value="${Math.round(s.apps)}" />
          </div>
          <div class="ke-field">
            <label>선발 출전 (starts)</label>
            <input type="number" class="ke-input" data-stat="starts" min="0" value="${Math.round(s.starts)}" />
          </div>
          <div class="ke-field">
            <label>출전 시간 (분)</label>
            <input type="number" class="ke-input" data-stat="minutes" min="0" value="${Math.round(s.minutes)}" />
          </div>
          <div class="ke-field">
            <label>득점 (goals)</label>
            <input type="number" class="ke-input" data-stat="goals" min="0" value="${Math.round(s.goals)}" />
          </div>
          <div class="ke-field">
            <label>도움 (assists)</label>
            <input type="number" class="ke-input" data-stat="assists" min="0" value="${Math.round(s.assists)}" />
          </div>
          <div class="ke-field">
            <label>클린시트 / 선방</label>
            <div class="ke-grid-2">
              <input type="number" class="ke-input" data-stat="cleanSheets" min="0" title="클린시트" value="${Math.round(s.cleanSheets)}" />
              <input type="number" class="ke-input" data-stat="saves" min="0" title="선방" value="${Math.round(s.saves)}" />
            </div>
          </div>
        </div>
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">국가대표 통산 기록</h3>
        </div>
        <div class="ke-grid-3">
          <div class="ke-field">
            <label>A매치 출전 (caps)</label>
            <input type="number" class="ke-input" id="ke-intl-caps" min="0" value="${Math.round(intl.caps)}" />
          </div>
          <div class="ke-field">
            <label>A매치 득점 (goals)</label>
            <input type="number" class="ke-input" id="ke-intl-goals" min="0" value="${Math.round(intl.goals)}" />
          </div>
          <div class="ke-field">
            <label>대표팀 우승 (trophies)</label>
            <input type="number" class="ke-input" id="ke-intl-trophies" min="0" value="${Math.round(intl.trophies)}" />
          </div>
        </div>
      </div>

      <div class="ke-section">
        <div class="ke-section-head">
          <h3 class="ke-section-title">원하는 구단 영입 오퍼 즉시 생성기</h3>
          <span class="ke-section-sub">오퍼 추가 또는 즉시 이적 가능</span>
        </div>
        <div class="ke-field">
          <input type="search" class="ke-input" id="ke-club-search" placeholder="구단명 검색 (예: 아스널, 레알, 바르셀로나, 전북, 울산, 토트넘...)" value="${escapeHtml(clubQuery)}" />
        </div>
        <div class="ke-club-list" id="ke-club-list"></div>
      </div>
    `;

    body.querySelectorAll("[data-add-goal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        s.goals += Number(btn.dataset.addGoal);
        s.shots = Math.max(s.shots, s.goals * 3);
        s.onTarget = Math.max(s.onTarget, Math.round(s.goals * 1.5));
        if (s.apps === 0) {
          s.apps = 10;
          s.starts = 10;
          s.minutes = 900;
          s.ratingSum = 85;
        }
        renderBody();
      });
    });

    body.querySelectorAll("[data-add-assist]").forEach((btn) => {
      btn.addEventListener("click", () => {
        s.assists += Number(btn.dataset.addAssist);
        if (s.apps === 0) {
          s.apps = 10;
          s.starts = 10;
          s.minutes = 900;
          s.ratingSum = 85;
        }
        renderBody();
      });
    });

    document.getElementById("ke-rating-95").addEventListener("click", () => {
      if (s.apps < 1) {
        s.apps = 20;
        s.starts = 20;
        s.minutes = 1800;
      }
      s.ratingSum = Number((s.apps * 9.5).toFixed(2));
      renderBody();
    });

    body.querySelectorAll("[data-stat]").forEach((input) => {
      input.addEventListener("input", (e) => {
        const k = e.target.dataset.stat;
        const prevApps = s.apps || 1;
        const prevAvg = s.apps > 0 ? s.ratingSum / prevApps : 7.0;
        s[k] = Math.max(0, Math.round(Number(e.target.value || 0)));
        if (k === "apps") {
          s.ratingSum = Number((s.apps * prevAvg).toFixed(2));
          document.getElementById("ke-avg-rating").textContent = s.apps > 0 ? (s.ratingSum / s.apps).toFixed(2) : "0.00";
        }
      });
    });

    document.getElementById("ke-intl-caps").addEventListener("input", (e) => {
      intl.caps = Math.max(0, Math.round(Number(e.target.value || 0)));
    });
    document.getElementById("ke-intl-goals").addEventListener("input", (e) => {
      intl.goals = Math.max(0, Math.round(Number(e.target.value || 0)));
    });
    document.getElementById("ke-intl-trophies").addEventListener("input", (e) => {
      intl.trophies = Math.max(0, Math.round(Number(e.target.value || 0)));
    });

    const searchInput = document.getElementById("ke-club-search");
    searchInput.addEventListener("input", (e) => {
      clubQuery = e.target.value;
      renderClubList();
    });
    renderClubList();
  }

  function renderClubList() {
    const container = document.getElementById("ke-club-list");
    if (!container) return;
    const bridge = getBridge();
    const clubs = bridge?.r6?.clubs || [];
    const leagueMap = bridge?.r6?.leagueMap || {};
    const countryMap = bridge?.r6?.countryMap || {};

    const q = clubQuery.trim().toLowerCase();
    const filtered = (
      q
        ? clubs.filter(
            (c) =>
              c.localName?.toLowerCase().includes(q) ||
              c.name?.toLowerCase().includes(q) ||
              leagueMap[c.league]?.name?.toLowerCase().includes(q) ||
              countryMap[c.country]?.name?.toLowerCase().includes(q)
          )
        : [...clubs].sort((a, b) => (b.strength || 0) - (a.strength || 0))
    ).slice(0, 30);

    if (!filtered.length) {
      container.innerHTML = `<div style="padding:14px;text-align:center;font-size:12px;color:var(--ke-text-muted);">검색 결과가 없습니다.</div>`;
      return;
    }

    container.innerHTML = filtered
      .map((c) => {
        const lg = leagueMap[c.league]?.name || c.league;
        return `
          <div class="ke-club-item">
            <div class="ke-club-info">
              <div class="ke-club-name">${escapeHtml(c.localName)} <span style="font-weight:600;color:var(--ke-text-muted);">(${c.strength ?? "-"})</span></div>
              <div class="ke-club-sub">${escapeHtml(lg)} · ${escapeHtml(c.name)}</div>
            </div>
            <div class="ke-club-actions">
              <button type="button" class="ke-chip-btn is-blue" data-offer-club="${c.id}">📩 오퍼 추가</button>
              <button type="button" class="ke-chip-btn is-primary" data-join-club="${c.id}">🚀 즉시 이적</button>
            </div>
          </div>
        `;
      })
      .join("");

    container.querySelectorAll("[data-offer-club]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const clubId = btn.dataset.offerClub;
        const club = bridge.r6.clubMap[clubId];
        if (!club || !draft) return;

        const p = draft.core.player;
        const fee = bridge.r4?.transferFee ? Math.max(0, Math.round(bridge.r4.transferFee(draft, clubId))) : 5000000000;
        const estWage = Math.max(p.wage || 0, Math.round(Math.max(50, club.strength || 75) * 10000000));
        const kind = draft.path === "school" && draft.term === 0 && club.country !== "kr" ? "abroad" : "transfer";
        const offer = {
          id: `${kind}:${clubId}`,
          kind,
          clubId,
          title: club.localName,
          description: "에디터 특별 영입 오퍼 · 1군 핵심 주전 보장",
          entrySquad: "first",
          role: "key",
          fee,
          wage: estWage,
          years: 4,
        };

        draft.choices = [offer, ...(draft.choices || []).filter((x) => x.id !== offer.id)];
        if (draft.phase === "ready") {
          draft.phase = "decision";
          draft.flowStage = "contract";
          if (!draft.choices.some((x) => x.kind === "stay") && p.contract > 0) {
            draft.choices.push({
              id: "stay",
              kind: "stay",
              title: "소속팀에 남기",
              description: `계약이 ${p.contract}년 남아 있습니다.`,
              fee: 0,
              wage: p.wage || 0,
              years: p.contract,
            });
          }
        } else if (!["path", "contract", "retirementMarket"].includes(draft.flowStage)) {
          draft.flowStage = "contract";
        }
        applyDraft(`${club.localName}의 1군 핵심 주전 오퍼를 도착한 제안에 추가했어요!`);
      });
    });

    container.querySelectorAll("[data-join-club]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const clubId = btn.dataset.joinClub;
        const club = bridge.r6.clubMap[clubId];
        if (!club || !draft) return;

        promoteLifeToPro(draft, clubId);
        draft.core.player.contract = 4;
        draft.core.news.unshift({
          year: draft.core.year,
          text: `${draft.core.player.name}, ${club.localName} 전격 이적! 4년 계약 체결.`,
        });

        applyDraft(`${club.localName}로 즉시 이적했어요!`);
      });
    });
  }

  function mountEditorUI() {
    createModalDOM();
    mountTopbarButton();
    if (!mountEditorUI._observing && document.body) {
      mountEditorUI._observing = true;
      const observer = new MutationObserver(() => {
        createModalDOM();
        mountTopbarButton();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function init() {
    window.__KICKRU_EDITOR__ = {
      open: openEditor,
      close: closeEditor,
      sanitizeLife,
      calcOvr,
    };

    const tryMount = () => {
      if (window.__KICKRU_BRIDGE__ && document.querySelector(".t-appbar-actions")) {
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(() => mountEditorUI());
        } else {
          mountEditorUI();
        }
        return true;
      }
      return false;
    };

    if (!tryMount()) {
      const timer = setInterval(() => {
        if (tryMount()) clearInterval(timer);
      }, 60);
      setTimeout(() => {
        clearInterval(timer);
        mountEditorUI();
      }, 4000);
    }

    window.addEventListener("kickru-state-change", () => {
      if (isOpen && !isApplying && !draft) {
        const bridge = getBridge();
        if (bridge?.life) {
          draft = cloneLife(bridge.life);
          updateHeaderBadge();
          renderBody();
        }
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "F2" || (e.altKey && (e.key === "e" || e.key === "E"))) {
        e.preventDefault();
        if (isOpen) closeEditor();
        else openEditor();
      } else if (e.key === "Escape" && isOpen) {
        closeEditor();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
