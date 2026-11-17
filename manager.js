(function () {
  "use strict";

  const STORAGE_KEY = "kickru-manager-save-v1";

  const POS_LIST = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];
  const POS_GROUP = {
    GK: "GK",
    CB: "DEF",
    LB: "DEF",
    RB: "DEF",
    CDM: "MID",
    CM: "MID",
    CAM: "MID",
    LW: "ATT",
    RW: "ATT",
    ST: "ATT",
  };

  const FORMATIONS = {
    "4-3-3": { label: "4-3-3", slots: ["GK", "LB", "CB", "CB", "RB", "CDM", "CM", "CM", "LW", "ST", "RW"] },
    "4-2-3-1": { label: "4-2-3-1", slots: ["GK", "LB", "CB", "CB", "RB", "CDM", "CDM", "CAM", "LW", "RW", "ST"] },
    "4-4-2": { label: "4-4-2", slots: ["GK", "LB", "CB", "CB", "RB", "LW", "CM", "CM", "RW", "ST", "ST"] },
    "3-5-2": { label: "3-5-2", slots: ["GK", "CB", "CB", "CB", "CDM", "CM", "CM", "CAM", "LW", "ST", "ST"] },
    "3-4-3": { label: "3-4-3", slots: ["GK", "CB", "CB", "CB", "CDM", "CM", "LB", "RB", "LW", "ST", "RW"] },
    "5-3-2": { label: "5-3-2", slots: ["GK", "LB", "CB", "CB", "CB", "RB", "CM", "CM", "CAM", "ST", "ST"] },
  };

  // Normalized 2D pitch coords (x: 0.06 -> 0.48 attacking left-to-right, y: 0.1 -> 0.9)
  const FORMATION_COORDS = {
    "4-3-3": [
      [0.06, 0.5],
      [0.21, 0.16], [0.18, 0.38], [0.18, 0.62], [0.21, 0.84],
      [0.31, 0.5], [0.37, 0.3], [0.37, 0.7],
      [0.46, 0.18], [0.48, 0.5], [0.46, 0.82],
    ],
    "4-2-3-1": [
      [0.06, 0.5],
      [0.21, 0.16], [0.18, 0.38], [0.18, 0.62], [0.21, 0.84],
      [0.30, 0.37], [0.30, 0.63],
      [0.40, 0.5], [0.42, 0.18], [0.42, 0.82], [0.48, 0.5],
    ],
    "4-4-2": [
      [0.06, 0.5],
      [0.20, 0.16], [0.18, 0.38], [0.18, 0.62], [0.20, 0.84],
      [0.35, 0.16], [0.33, 0.39], [0.33, 0.61], [0.35, 0.84],
      [0.47, 0.37], [0.47, 0.63],
    ],
    "3-5-2": [
      [0.06, 0.5],
      [0.19, 0.25], [0.18, 0.5], [0.19, 0.75],
      [0.29, 0.5], [0.35, 0.32], [0.35, 0.68], [0.40, 0.5],
      [0.37, 0.14], [0.47, 0.38], [0.47, 0.62],
    ],
    "3-4-3": [
      [0.06, 0.5],
      [0.19, 0.25], [0.18, 0.5], [0.19, 0.75],
      [0.33, 0.37], [0.33, 0.63], [0.35, 0.15], [0.35, 0.85],
      [0.46, 0.18], [0.48, 0.5], [0.46, 0.82],
    ],
    "5-3-2": [
      [0.06, 0.5],
      [0.22, 0.14], [0.18, 0.33], [0.17, 0.5], [0.18, 0.67], [0.22, 0.86],
      [0.33, 0.32], [0.33, 0.68], [0.38, 0.5],
      [0.47, 0.37], [0.47, 0.63],
    ],
  };

  const SHOUTS = {
    demand: { label: "🔥 몰아붙여라", attMod: 3.2, defMod: -0.5, staminaMult: 1.25, msg: "감독이 터치라인에서 강하게 전방 압박과 공격을 주문합니다!" },
    encourage: { label: "👏 격려", attMod: 1.8, defMod: 1.5, staminaMult: 1.0, msg: "감독이 박수를 치며 선수들에게 자신감을 불어넣습니다." },
    calm: { label: "🧘 침착", attMod: 0.4, defMod: 2.8, staminaMult: 0.9, msg: "감독이 흥분한 선수들을 진정시키며 차분한 빌드업을 지시합니다." },
    attackAll: { label: "⚡ 전원공격", attMod: 5.0, defMod: -3.2, staminaMult: 1.3, msg: "감독이 라인을 극단적으로 끌어올리며 총공격을 지시합니다!" },
    parkBus: { label: "🚌 전원수비", attMod: -3.0, defMod: 4.8, staminaMult: 0.85, msg: "감독이 수비 블록을 두텁게 세워 골문을 걸어 잠급니다!" },
  };

  const TACTICS = {
    balanced: { label: "균형 전술", desc: "공수 밸런스를 유지하며 안정적으로 경기를 운영합니다." },
    gegenpress: { label: "게겐프레싱", desc: "전방 압박으로 득점 기회↑ (+2.5 공격), 체력 소모가 큽니다." },
    tikitaka: { label: "티키타카", desc: "중원 점유율을 장악해 안정적인 경기력과 패스 지배를 만듭니다." },
    counter: { label: "선수비 후역습", desc: "강팀을 상대로 수비 후 한 방 역습 시 큰 보너스(+3.5)를 얻습니다." },
    wingplay: { label: "측면 윙플레이", desc: "측면 돌파와 크로스로 공격수 득점력을 극대화합니다." },
  };

  const TRAININGS = {
    balanced: { label: "균형 훈련", desc: "전 포지션 능력치를 고르게 육성합니다." },
    attack: { label: "공격 결정력", desc: "공격수·미드필더 성장 보너스" },
    defense: { label: "수비 조직력", desc: "수비수·골키퍼 성장 및 실점 억제" },
    youth: { label: "유망주 집중", desc: "23세 이하 유망주 성장 속도 대폭 증가" },
    recovery: { label: "회복 & 컨디션", desc: "매 경기 후 선수단 체력·사기 회복량 증가" },
  };

  const TRAITS = [
    { id: "tactician", name: "🧠 전술가", desc: "경기 시 팀 전력 +3 OVR 전술 시너지 보너스" },
    { id: "developer", name: "🌱 육성가", desc: "시즌 결산 시 선수단·유망주 성장 속도 +35%" },
    { id: "motivator", name: "🔥 동기부여가", desc: "선수단 사기 유지 및 컵대회/결승전 승률 보너스" },
    { id: "tycoon", name: "💼 경영가", desc: "입장·스폰서 수익 +25% 및 이적료 협상 15% 할인" },
  ];

  const FACILITY_INFO = [
    { key: "stadium", name: "🏟️ 홈 경기장", desc: "홈 승률 보너스 & 매 경기 입장·스폰서 수익 증가" },
    { key: "training", name: "🏋️ 훈련 센터", desc: "시즌 종료 시 전체 선수단 능력치 성장량 증가" },
    { key: "youth", name: "🌱 유스 아카데미", desc: "유스 콜업 선수의 초기 OVR 및 잠재력 상승" },
    { key: "medical", name: "🏥 메디컬 센터", desc: "경기당 체력 소모 감소 및 회복량 증가" },
    { key: "scouting", name: "🔍 스카우팅 네트워크", desc: "이적시장 매물 수준 향상 & 영입 이적료 할인" },
  ];

  const NAME_POOLS = {
    kr: {
      first: ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "홍", "양"],
      last: ["민재", "강인", "흥민", "규성", "재성", "희찬", "승호", "영권", "인범", "태환", "현우", "준호", "지성", "주영", "도훈", "시우", "서준", "하준", "유준", "건우"],
    },
    jp: {
      first: ["사토", "스즈키", "다카하시", "다나카", "와타나베", "이토", "야마모토", "나카무라", "고바야시", "가토", "미토마", "구보", "도안"],
      last: ["겐타", "다케후사", "가오루", "리쓰", "와타루", "다쿠미", "소타", "유토", "하루토", "렌", "아오이", "슈토"],
    },
    en: {
      first: ["Harry", "Jude", "Bukayo", "Phil", "Declan", "Cole", "Trent", "Marcus", "Jack", "Ollie", "Mason", "Luke", "James", "Ben"],
      last: ["Kane", "Bellingham", "Saka", "Foden", "Rice", "Palmer", "Walker", "Rashford", "Grealish", "Watkins", "Mount", "Shaw", "Ward", "White"],
    },
    es: {
      first: ["Carlos", "Pablo", "Lamine", "Pedri", "Gavi", "Dani", "Nico", "Alvaro", "Ferran", "Marco", "Hugo", "Lucas", "Mateo"],
      last: ["Garcia", "Lopez", "Martinez", "Sanchez", "Torres", "Ruiz", "Navarro", "Morata", "Olmo", "Williams", "Gomez", "Diaz"],
    },
    br: {
      first: ["Vinicius", "Rodrygo", "Lucas", "Gabriel", "Bruno", "Matheus", "Joao", "Pedro", "Rafael", "Thiago", "Endrick", "Estevao"],
      last: ["Silva", "Santos", "Oliveira", "Pereira", "Costa", "Almeida", "Lima", "Jesus", "Martinelli", "Guimaraes", "Paqueta"],
    },
    intl: {
      first: ["Luka", "Kevin", "Kylian", "Erling", "Florian", "Jamal", "Victor", "Martin", "Federico", "Rafael", "Theo", "Alessandro", "Nico"],
      last: ["Modric", "De Bruyne", "Mbappe", "Haaland", "Wirtz", "Musiala", "Osimhen", "Odegaard", "Valverde", "Leao", "Hernandez", "Bastoni"],
    },
  };

  let state = null;
  let activeNav = "home"; // home | squad | market | facilities | league | editor
  let setupDraft = {
    managerName: "박감독",
    nationality: "kr",
    trait: "tactician",
    clubId: "kr-fc-seoul",
    countryFilter: "all",
    clubQuery: "",
  };
  let marketQuery = "";
  let moveClubQuery = "";
  let editingPlayerId = null;
  let liveMatch = null;
  let liveRafId = null;
  let liveTickTimer = null;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function getBridge() {
    return window.__KICKRU_BRIDGE__ || null;
  }

  function formatMoney(krw) {
    const v = Math.round(Number(krw) || 0);
    const abs = Math.abs(v);
    const sign = v < 0 ? "-" : "";
    if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}조 원`;
    if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(1)}억 원`;
    if (abs >= 1e4) return `${sign}${Math.round(abs / 1e4).toLocaleString("ko-KR")}만 원`;
    return `${sign}${abs.toLocaleString("ko-KR")}원`;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(msg) {
    let el = document.getElementById("gm-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "gm-toast";
      el.className = "gm-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("is-show"), 2600);
  }

  function clubLogoHtml(clubId, small = false) {
    const bridge = getBridge();
    const club = bridge?.r6?.clubMap?.[clubId];
    const label = club?.localName || clubId || "FC";
    const initials = (club?.name || label)
      .replace(/\b(FC|CF|SC|AC)\b/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    const cls = small ? "gm-logo-sm" : "gm-logo-box";
    const size = small ? 20 : 44;
    const base = window.__KICKRU_BASE__ || "/";
    const idEnc = escapeHtml(clubId);
    return `<span class="${cls}"><img src="${base}club-logos/${idEnc}.png" width="${size}" height="${size}" alt="" data-fb-initials="${escapeHtml(initials || "FC")}" data-club-id="${idEnc}" onerror="if(!this.dataset.r){this.dataset.r='1';this.referrerPolicy='no-referrer';this.src='https://kickru.com/club-logos/'+this.dataset.clubId+'.png';}else{this.replaceWith(document.createTextNode(this.dataset.fbInitials||'FC'));}" /></span>`;
  }

  function genName(country) {
    const pool =
      country === "kr"
        ? NAME_POOLS.kr
        : country === "jp"
        ? NAME_POOLS.jp
        : ["en", "sco", "us", "au"].includes(country)
        ? NAME_POOLS.en
        : ["es", "ar", "mx", "co", "cl", "uy"].includes(country)
        ? NAME_POOLS.es
        : ["br", "pt"].includes(country)
        ? NAME_POOLS.br
        : NAME_POOLS.intl;
    if (country === "kr") return pick(pool.first) + pick(pool.last);
    return `${pick(pool.first)} ${pick(pool.last)}`;
  }

  function estimatePlayerValue(ovr, age, pot) {
    const base = Math.pow(Math.max(1, ovr - 40), 2.35) * 3500000;
    const ageMult = age <= 21 ? 1.45 : age <= 25 ? 1.25 : age <= 28 ? 1.0 : age <= 31 ? 0.65 : 0.3;
    const potBonus = pot > ovr ? 1 + (pot - ovr) * 0.04 : 1;
    return Math.max(50000000, Math.round((base * ageMult * potBonus) / 10000000) * 10000000);
  }

  function estimatePlayerWage(ovr) {
    return Math.max(20000000, Math.round((Math.pow(Math.max(1, ovr - 42), 2.15) * 140000) / 1000000) * 1000000);
  }

  function makePlayer(pos, baseStrength, country, opts = {}) {
    const age = opts.age ?? randInt(17, 32);
    const ovr = clamp(opts.ovr ?? baseStrength + randInt(-5, 5), 42, 99);
    const pot = clamp(opts.pot ?? Math.max(ovr, age <= 22 ? ovr + randInt(4, 18) : ovr + randInt(0, 5)), ovr, 99);
    const nat = opts.nationality || (Math.random() < 0.72 ? country : pick(["kr", "jp", "en", "es", "br", "fr", "de", "it", "ar", "pt"]));
    return {
      id: "p_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36),
      name: opts.name || genName(nat),
      pos,
      age,
      ovr,
      pot,
      nationality: nat,
      stamina: 100,
      morale: 85,
      contract: opts.contract ?? randInt(2, 5),
      wage: opts.wage ?? estimatePlayerWage(ovr),
      value: opts.value ?? estimatePlayerValue(ovr, age, pot),
      starter: !!opts.starter,
      goals: 0,
      assists: 0,
      apps: 0,
      ratingSum: 0,
    };
  }

  function generateSquadForClub(club) {
    const s = club.strength || 65;
    const template = [
      "GK", "GK",
      "LB", "LB", "CB", "CB", "CB", "CB", "RB", "RB",
      "CDM", "CDM", "CM", "CM", "CM", "CAM",
      "LW", "LW", "RW", "ST", "ST",
    ];
    const squad = template.map((pos, idx) =>
      makePlayer(pos, s, club.country, {
        age: idx % 5 === 0 ? randInt(18, 21) : randInt(21, 32),
        ovr: clamp(s + (idx % 3 === 0 ? randInt(-1, 5) : randInt(-6, 2)), 45, 95),
      })
    );
    autoPickStarters(squad, "4-3-3");
    return squad;
  }

  function autoPickStarters(squad, formationKey) {
    const slots = (FORMATIONS[formationKey] || FORMATIONS["4-3-3"]).slots;
    for (const p of squad) p.starter = false;
    const used = new Set();

    // First pass: exact position match
    for (const slot of slots) {
      let best = null;
      let bestScore = -999;
      for (const p of squad) {
        if (used.has(p.id)) continue;
        if (p.pos !== slot) continue;
        const score = p.ovr * (0.6 + 0.4 * (p.stamina / 100));
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
      if (best) {
        best.starter = true;
        used.add(best.id);
      }
    }

    // Second pass: group match or best available for unfilled slots
    const remainingSlotsCount = slots.length - used.size;
    for (let i = 0; i < remainingSlotsCount; i++) {
      let best = null;
      let bestScore = -999;
      for (const p of squad) {
        if (used.has(p.id)) continue;
        const score = p.ovr * (0.6 + 0.4 * (p.stamina / 100));
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
      if (best) {
        best.starter = true;
        used.add(best.id);
      }
    }
  }

  function generateSchedule(teamIds) {
    const list = [...teamIds];
    if (list.length % 2 === 1) list.push(null); // BYE slot for odd number of teams
    const n = list.length;
    const firstHalf = [];
    const arr = [...list];
    for (let r = 0; r < n - 1; r++) {
      const round = [];
      for (let i = 0; i < n / 2; i++) {
        const t1 = arr[i];
        const t2 = arr[n - 1 - i];
        if (t1 && t2) {
          round.push(r % 2 === 0 ? { home: t1, away: t2 } : { home: t2, away: t1 });
        }
      }
      firstHalf.push(round);
      arr.splice(1, 0, arr.pop());
    }
    const secondHalf = firstHalf.map((round) => round.map((m) => ({ home: m.away, away: m.home })));
    return [...firstHalf, ...secondHalf];
  }

  function createEmptyTable(teamIds) {
    return teamIds.map((id) => ({
      clubId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      points: 0,
    }));
  }

  function sortTable(table) {
    return [...table].sort(
      (a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || a.clubId.localeCompare(b.clubId)
    );
  }

  function computeTeamStats(mgrState) {
    const starters = mgrState.squad.filter((p) => p.starter);
    const active = starters.length ? starters : mgrState.squad.slice(0, 11);
    const slots = (FORMATIONS[mgrState.formation] || FORMATIONS["4-3-3"]).slots;

    // Count slot match quality
    const slotCopy = [...slots];
    let fitSum = 0;
    for (const p of active) {
      const exactIdx = slotCopy.indexOf(p.pos);
      if (exactIdx >= 0) {
        slotCopy.splice(exactIdx, 1);
        fitSum += 1;
      } else {
        const grpIdx = slotCopy.findIndex((s) => POS_GROUP[s] === POS_GROUP[p.pos]);
        if (grpIdx >= 0) {
          slotCopy.splice(grpIdx, 1);
          fitSum += 0.94;
        } else {
          fitSum += 0.85;
        }
      }
    }
    const avgFit = active.length ? fitSum / active.length : 1;
    const rawOvr = active.reduce((acc, p) => acc + p.ovr * (0.75 + 0.25 * (p.stamina / 100)), 0) / Math.max(1, active.length);
    const traitBonus = mgrState.manager.trait === "tactician" ? 3 : 0;
    const moraleBonus = (mgrState.teamMorale - 70) * 0.05;
    const totalOvr = Math.round((rawOvr * avgFit + traitBonus + moraleBonus) * 10) / 10;

    const byGroup = (grp) => {
      const grpPlayers = active.filter((p) => POS_GROUP[p.pos] === grp);
      if (!grpPlayers.length) return Math.round(rawOvr - 4);
      return Math.round(grpPlayers.reduce((a, b) => a + b.ovr, 0) / grpPlayers.length);
    };

    return {
      total: Math.round(totalOvr),
      att: byGroup("ATT"),
      mid: byGroup("MID"),
      def: byGroup("DEF"),
      gk: byGroup("GK"),
      startersCount: starters.length,
    };
  }

  function generateMarketPool(mgrState, count = 12) {
    const bridge = getBridge();
    const league = bridge?.r6?.leagueMap?.[mgrState.leagueId];
    const club = bridge?.r6?.clubMap?.[mgrState.clubId];
    const scoutLv = mgrState.facilities.scouting || 1;
    const baseStr = Math.max(club?.strength || 65, computeTeamStats(mgrState).total);
    const tierFactor = league ? Math.max(0, 4 - league.tier) * 2 : 2;
    const discount = 1 - (scoutLv - 1) * 0.03 - (mgrState.manager.trait === "tycoon" ? 0.15 : 0);

    const list = [];
    for (let i = 0; i < count; i++) {
      const pos = POS_LIST[i % POS_LIST.length];
      const age = i % 4 === 0 ? randInt(17, 21) : randInt(20, 31);
      const ovrBoost = Math.round(scoutLv * 1.4) + randInt(-4, 6) + (i === 0 ? 4 : 0);
      const ovr = clamp(baseStr + tierFactor + ovrBoost - 3, 52, 95);
      const pot = clamp(Math.max(ovr, age <= 22 ? ovr + randInt(5, 18) : ovr + randInt(0, 4)), ovr, 99);
      const isFree = i % 5 === 4;
      const rawVal = estimatePlayerValue(ovr, age, pot);
      const price = isFree ? 0 : Math.max(50000000, Math.round((rawVal * Math.max(0.55, discount)) / 10000000) * 10000000);
      const p = makePlayer(pos, ovr, club?.country || "kr", { age, ovr, pot, value: rawVal });
      p.price = price;
      p.isFreeAgent = isFree;
      p.fromClub = isFree ? "자유계약 (FA)" : pick(bridge.r6.clubs).localName;
      list.push(p);
    }
    return list.sort((a, b) => b.ovr - a.ovr);
  }

  function createCup(mgrState) {
    const bridge = getBridge();
    const club = bridge.r6.clubMap[mgrState.clubId];
    const domesticClubs = bridge.r6.clubs
      .filter((c) => c.country === club.country)
      .sort((a, b) => (b.strength || 60) - (a.strength || 60));
    const pool = [mgrState.clubId, ...domesticClubs.filter((c) => c.id !== mgrState.clubId).map((c) => c.id)].slice(0, 32);
    // Ensure power of 2 (32, 16, 8, 4)
    let size = 4;
    if (pool.length >= 32) size = 32;
    else if (pool.length >= 16) size = 16;
    else if (pool.length >= 8) size = 8;
    const teams = pool.slice(0, size).sort(() => Math.random() - 0.5);
    return {
      name: `${bridge.r6.countryMap[club.country]?.name || ""} FA컵`,
      teams,
      alive: true,
      roundIdx: 0,
      winner: null,
      resultText: `${teams.length}강 진출`,
    };
  }

  function createContinentalCup(mgrState, qualified) {
    const bridge = getBridge();
    const club = bridge.r6.clubMap[mgrState.clubId];
    const confed = bridge.r6.countryMap[club.country]?.confederation || "UEFA";
    const name =
      confed === "UEFA"
        ? "UEFA 챔피언스리그"
        : confed === "AFC"
        ? "AFC 챔피언스리그 엘리트"
        : confed === "CONMEBOL"
        ? "코파 리베르타도레스"
        : "대륙 챔피언스컵";

    const eligible = bridge.r6.clubs
      .filter((c) => bridge.r6.countryMap[c.country]?.confederation === confed && bridge.r6.leagueMap[c.league]?.tier === 1)
      .sort((a, b) => (b.strength || 60) - (a.strength || 60))
      .slice(0, 16)
      .map((c) => c.id);

    if (!qualified) {
      return { name, qualified: false, teams: eligible, alive: false, roundIdx: 0, winner: null, resultText: "미참가 (1부 상위권 필요)" };
    }
    const teams = eligible.includes(mgrState.clubId) ? eligible : [mgrState.clubId, ...eligible.slice(0, 15)];
    return {
      name,
      qualified: true,
      teams: teams.sort(() => Math.random() - 0.5),
      alive: true,
      roundIdx: 0,
      winner: null,
      resultText: "16강 조편성 완료",
    };
  }

  function buildNewCareer(opts) {
    const bridge = getBridge();
    const club = bridge.r6.clubMap[opts.clubId] || bridge.r6.clubs[0];
    const league = bridge.r6.leagueMap[club.league];

    // Initialize world leagues map for promotion/relegation
    const sameCountryLeagues = bridge.r6.leagues.filter((l) => l.country === club.country);
    const worldLeagues = {};
    for (const l of sameCountryLeagues) {
      worldLeagues[l.id] = [...l.clubIds];
    }
    if (!worldLeagues[league.id]) {
      worldLeagues[league.id] = [...league.clubIds];
    }

    const baseBudget = Math.max(
      1500000000,
      Math.round(Math.pow(Math.max(10, (club.strength || 60) - 35), 2.5) * 4000000)
    );
    const facLevel = clamp(Math.floor(((club.strength || 60) - 45) / 8) + 1, 1, 7);

    const newState = {
      version: 1,
      year: 2026,
      manager: {
        name: (opts.managerName || "박감독").trim().slice(0, 24) || "박감독",
        nationality: opts.nationality || "kr",
        trait: opts.trait || "tactician",
        wins: 0,
        draws: 0,
        losses: 0,
      },
      clubId: club.id,
      leagueId: league.id,
      worldLeagues,
      budget: baseBudget,
      boardTrust: 75,
      fanSupport: 72,
      teamMorale: 80,
      formation: "4-3-3",
      tactic: "balanced",
      training: "balanced",
      facilities: {
        stadium: facLevel,
        training: facLevel,
        youth: facLevel,
        medical: facLevel,
        scouting: facLevel,
      },
      squad: generateSquadForClub(club),
      round: 0,
      schedule: [],
      table: [],
      cup: null,
      continental: null,
      market: [],
      youthPullsRemaining: 2,
      lastMatch: null,
      news: [`${opts.managerName || "박감독"} 감독이 ${club.localName}의 신임 사령탑으로 부임했습니다!`],
      trophies: [],
      history: [],
      seasonOver: false,
      managerOffers: [],
    };

    setupSeasonCompetitions(newState, league.tier === 1 && (club.strength || 60) >= 75);
    newState.market = generateMarketPool(newState);
    return newState;
  }

  function setupSeasonCompetitions(s, continentalQualified) {
    const teamIds = s.worldLeagues[s.leagueId] || getBridge().r6.leagueMap[s.leagueId].clubIds;
    s.schedule = generateSchedule(teamIds);
    s.table = createEmptyTable(teamIds);
    s.round = 0;
    s.seasonOver = false;
    s.youthPullsRemaining = 2 + Math.floor((s.facilities.youth || 1) / 4);
    s.cup = createCup(s);
    s.continental = createContinentalCup(s, continentalQualified);
    s.managerOffers = [];
    for (const p of s.squad) {
      p.goals = 0;
      p.assists = 0;
      p.apps = 0;
      p.ratingSum = 0;
      p.stamina = 100;
    }
  }

  function getClubStrength(s, clubId) {
    if (clubId === s.clubId) {
      return computeTeamStats(s).total;
    }
    const bridge = getBridge();
    return bridge.r6.clubMap[clubId]?.strength || 65;
  }

  function simulateMatchScore(homeStr, awayStr, mySide, s, isCup = false) {
    let h = homeStr + 2.2; // Home advantage
    let a = awayStr;

    if (mySide) {
      const tac = s.tactic;
      const facStad = (s.facilities.stadium - 1) * 0.3;
      if (mySide === "home") h += facStad;
      if (tac === "gegenpress") {
        if (mySide === "home") h += 1.6;
        else a += 1.6;
      } else if (tac === "tikitaka") {
        if (mySide === "home") h += 1.2;
        else a += 1.2;
      } else if (tac === "counter") {
        const diff = mySide === "home" ? awayStr - homeStr : homeStr - awayStr;
        if (diff >= 3) {
          if (mySide === "home") h += 3.5;
          else a += 3.5;
        }
      } else if (tac === "wingplay") {
        if (mySide === "home") h += 1.4;
        else a += 1.4;
      }
      if (isCup && s.manager.trait === "motivator") {
        if (mySide === "home") h += 2.5;
        else a += 2.5;
      }
    }

    const diff = clamp((h - a) / 14, -1.6, 1.6);
    const expHome = clamp(1.35 + diff * 0.78, 0.25, 4.2);
    const expAway = clamp(1.15 - diff * 0.72, 0.2, 3.9);

    const samplePoisson = (lam) => {
      let L = Math.exp(-lam);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= Math.random();
      } while (p > L && k < 9);
      return k - 1;
    };

    return [samplePoisson(expHome), samplePoisson(expAway)];
  }

  function recordMatchStats(s, myGoals, oppGoals, oppName, isHome, compName) {
    const starters = s.squad.filter((p) => p.starter);
    const active = starters.length ? starters : s.squad.slice(0, 11);

    const scorers = [];
    const attackers = active.filter((p) => ["ST", "LW", "RW", "CAM"].includes(p.pos));
    const mids = active.filter((p) => ["CM", "CDM", "CAM", "LW", "RW"].includes(p.pos));
    const goalPool = attackers.length ? [...attackers, ...attackers, ...mids] : active;
    const assistPool = mids.length ? [...mids, ...mids, ...active] : active;

    for (let g = 0; g < myGoals; g++) {
      const sc = pick(goalPool);
      sc.goals++;
      scorers.push(sc.name);
      if (Math.random() < 0.75 && assistPool.length > 1) {
        const as = pick(assistPool.filter((x) => x.id !== sc.id)) || pick(assistPool);
        as.assists++;
      }
    }

    const staminaDrain =
      (s.tactic === "gegenpress" ? 13 : 8) -
      (s.facilities.medical - 1) * 0.6 -
      (s.training === "recovery" ? 2.5 : 0);

    for (const p of s.squad) {
      if (p.starter) {
        p.apps++;
        const baseR = myGoals > oppGoals ? 7.3 : myGoals === oppGoals ? 6.7 : 6.1;
        p.ratingSum += clamp(baseR + (Math.random() - 0.4) * 1.2, 5.0, 9.8);
        p.stamina = clamp(Math.round(p.stamina - Math.max(2, staminaDrain) + 4), 25, 100);
      } else {
        p.stamina = clamp(p.stamina + 16, 40, 100);
      }
    }

    if (myGoals > oppGoals) {
      s.manager.wins++;
      s.teamMorale = clamp(s.teamMorale + 3, 20, 100);
      s.boardTrust = clamp(s.boardTrust + 1, 10, 100);
      s.fanSupport = clamp(s.fanSupport + 1, 10, 100);
    } else if (myGoals === oppGoals) {
      s.manager.draws++;
    } else {
      s.manager.losses++;
      s.teamMorale = clamp(s.teamMorale - 3, 20, 100);
      s.boardTrust = clamp(s.boardTrust - 1, 10, 100);
    }

    // Gate receipts on home match
    if (isHome) {
      const traitMult = s.manager.trait === "tycoon" ? 1.25 : 1;
      const gate = Math.round((80000000 + s.facilities.stadium * 95000000) * traitMult);
      s.budget += gate;
    }

    // Weekly wage expense (approx /38)
    const totalAnnualWages = s.squad.reduce((acc, p) => acc + (p.wage || 0), 0);
    s.budget = Math.max(0, s.budget - Math.round(totalAnnualWages / 42));

    s.lastMatch = {
      comp: compName,
      home: isHome ? getBridge().r6.clubMap[s.clubId].localName : oppName,
      away: isHome ? oppName : getBridge().r6.clubMap[s.clubId].localName,
      hg: isHome ? myGoals : oppGoals,
      ag: isHome ? oppGoals : myGoals,
      scorers,
      isWin: myGoals > oppGoals,
      isDraw: myGoals === oppGoals,
    };
  }

  function advanceCupRound(s, cupObj, compLabel) {
    if (!cupObj || cupObj.winner || !cupObj.teams || cupObj.teams.length < 2) return;
    const bridge = getBridge();
    const nextTeams = [];
    const curCount = cupObj.teams.length;
    const stageName = curCount === 2 ? "결승" : `${curCount}강`;

    for (let i = 0; i < curCount; i += 2) {
      const t1 = cupObj.teams[i];
      const t2 = cupObj.teams[i + 1];
      if (!t2) {
        nextTeams.push(t1);
        continue;
      }
      const mySide = t1 === s.clubId ? "home" : t2 === s.clubId ? "away" : null;
      let [g1, g2] = simulateMatchScore(getClubStrength(s, t1), getClubStrength(s, t2), mySide, s, true);
      if (g1 === g2) {
        // Penalty shootout
        if (Math.random() < (mySide ? 0.58 : 0.5)) g1++;
        else g2++;
      }
      const winner = g1 > g2 ? t1 : t2;
      nextTeams.push(winner);

      if (mySide) {
        const oppId = mySide === "home" ? t2 : t1;
        const oppName = bridge.r6.clubMap[oppId]?.localName || oppId;
        const myG = mySide === "home" ? g1 : g2;
        const oppG = mySide === "home" ? g2 : g1;
        recordMatchStats(s, myG, oppG, oppName, mySide === "home", `${compLabel} ${stageName}`);
        if (winner === s.clubId) {
          if (curCount === 2) {
            cupObj.winner = s.clubId;
            cupObj.alive = true;
            cupObj.resultText = "🏆 우승";
            const prize = compLabel.includes("챔피언스") || compLabel.includes("리베르타") ? 80000000000 : 12000000000;
            s.budget += prize;
            s.trophies.push({ year: s.year, name: compLabel, club: bridge.r6.clubMap[s.clubId].localName });
            s.news.unshift(`🏆 ${s.year} ${compLabel} 우승! 상금 ${formatMoney(prize)} 획득!`);
          } else {
            cupObj.resultText = `${curCount / 2 === 1 ? "결승" : curCount / 2 + "강"} 진출`;
          }
        } else {
          cupObj.alive = false;
          cupObj.resultText = `${stageName === "결승" ? "준우승" : stageName + " 탈락"}`;
          s.news.unshift(`${compLabel} ${stageName}에서 ${oppName}에 패배해 아쉽게 탈락했습니다.`);
        }
      }
    }
    cupObj.teams = nextTeams;
    if (nextTeams.length === 1 && !cupObj.winner) {
      cupObj.winner = nextTeams[0];
    }
  }

  function applyRoundOutcome(s, customMyMatch = null) {
    if (s.seasonOver) return;
    const bridge = getBridge();
    if (s.round >= s.schedule.length) {
      finishSeason(s);
      return;
    }

    const roundMatches = s.schedule[s.round];
    for (const m of roundMatches) {
      const mySide = m.home === s.clubId ? "home" : m.away === s.clubId ? "away" : null;
      let hg, ag;
      if (mySide && customMyMatch) {
        hg = customMyMatch.hg;
        ag = customMyMatch.ag;
      } else {
        [hg, ag] = simulateMatchScore(getClubStrength(s, m.home), getClubStrength(s, m.away), mySide, s, false);
      }

      const hRow = s.table.find((r) => r.clubId === m.home);
      const aRow = s.table.find((r) => r.clubId === m.away);
      if (hRow && aRow) {
        hRow.played++;
        aRow.played++;
        hRow.gf += hg;
        hRow.ga += ag;
        aRow.gf += ag;
        aRow.ga += hg;
        if (hg > ag) {
          hRow.won++;
          hRow.points += 3;
          aRow.lost++;
        } else if (hg === ag) {
          hRow.drawn++;
          hRow.points++;
          aRow.drawn++;
          aRow.points++;
        } else {
          aRow.won++;
          aRow.points += 3;
          hRow.lost++;
        }
      }

      if (mySide) {
        const oppId = mySide === "home" ? m.away : m.home;
        const oppName = bridge.r6.clubMap[oppId]?.localName || oppId;
        const myG = mySide === "home" ? hg : ag;
        const oppG = mySide === "home" ? ag : hg;
        if (customMyMatch) {
          // Record live stats without overwriting already-applied squad goals/stamina
          if (myG > oppG) {
            s.manager.wins++;
            s.teamMorale = clamp(s.teamMorale + 3, 20, 100);
            s.boardTrust = clamp(s.boardTrust + 1, 10, 100);
            s.fanSupport = clamp(s.fanSupport + 1, 10, 100);
          } else if (myG === oppG) {
            s.manager.draws++;
          } else {
            s.manager.losses++;
            s.teamMorale = clamp(s.teamMorale - 3, 20, 100);
            s.boardTrust = clamp(s.boardTrust - 1, 10, 100);
          }
          if (mySide === "home") {
            const traitMult = s.manager.trait === "tycoon" ? 1.25 : 1;
            const gate = Math.round((80000000 + s.facilities.stadium * 95000000) * traitMult);
            s.budget += gate;
          }
          const totalAnnualWages = s.squad.reduce((acc, p) => acc + (p.wage || 0), 0);
          s.budget = Math.max(0, s.budget - Math.round(totalAnnualWages / 42));
          s.lastMatch = {
            comp: `${bridge.r6.leagueMap[s.leagueId].name} ${s.round + 1}R (실황)`,
            home: mySide === "home" ? bridge.r6.clubMap[s.clubId].localName : oppName,
            away: mySide === "home" ? oppName : bridge.r6.clubMap[s.clubId].localName,
            hg,
            ag,
            scorers: customMyMatch.myScorers || [],
            isWin: myG > oppG,
            isDraw: myG === oppG,
          };
        } else {
          recordMatchStats(s, myG, oppG, oppName, mySide === "home", `${bridge.r6.leagueMap[s.leagueId].name} ${s.round + 1}R`);
        }
      }
    }

    // Advance cup / continental on milestone rounds
    const totalR = Math.max(1, s.schedule.length);
    const cupCheckpoints = [Math.floor(totalR * 0.2), Math.floor(totalR * 0.4), Math.floor(totalR * 0.6), Math.floor(totalR * 0.8), totalR - 1];
    if (cupCheckpoints.includes(s.round) && s.cup && !s.cup.winner) {
      advanceCupRound(s, s.cup, s.cup.name);
    }
    const contCheckpoints = [Math.floor(totalR * 0.25), Math.floor(totalR * 0.5), Math.floor(totalR * 0.75), totalR - 1];
    if (contCheckpoints.includes(s.round) && s.continental?.qualified && !s.continental.winner) {
      advanceCupRound(s, s.continental, s.continental.name);
    }

    s.round++;
    if (s.round >= s.schedule.length) {
      finishSeason(s);
    }
    s.news = s.news.slice(0, 40);
  }

  function playOneRound(s) {
    applyRoundOutcome(s, null);
  }

  function finishSeason(s) {
    if (s.seasonOver) return;
    const bridge = getBridge();
    s.seasonOver = true;

    const sorted = sortTable(s.table);
    const rank = sorted.findIndex((r) => r.clubId === s.clubId) + 1;
    const league = bridge.r6.leagueMap[s.leagueId];
    const myRow = sorted[rank - 1] || { won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };

    // League Champion & Prize
    const tierPrizeBase = [0, 35000000000, 12000000000, 4000000000, 1500000000][league.tier] || 2000000000;
    const rankFactor = clamp((sorted.length - rank + 2) / sorted.length, 0.25, 1.3);
    const sponsorBonus = (1 + (s.facilities.stadium - 1) * 0.14) * (s.manager.trait === "tycoon" ? 1.25 : 1);
    const prize = Math.round(tierPrizeBase * rankFactor * sponsorBonus);
    s.budget += prize;

    if (rank === 1) {
      s.trophies.push({ year: s.year, name: league.name, club: bridge.r6.clubMap[s.clubId].localName });
      s.news.unshift(`🏆 ${s.year} ${league.name} 우승!! 구단 역사에 길이 남을 시즌입니다!`);
      s.boardTrust = clamp(s.boardTrust + 15, 0, 100);
      s.fanSupport = clamp(s.fanSupport + 15, 0, 100);
    } else {
      s.news.unshift(`${s.year} ${league.name} 최종 ${rank}위 (${myRow.points}점) · 시즌 상금 ${formatMoney(prize)}`);
    }

    // Player development & aging
    const trainLv = s.facilities.training || 1;
    const devMult = s.manager.trait === "developer" ? 1.35 : 1;
    const retirees = [];

    for (const p of s.squad) {
      p.age++;
      p.contract = Math.max(0, p.contract - 1);
      if (p.age <= 23) {
        const room = Math.max(0, p.pot - p.ovr);
        const yBoost = s.training === "youth" ? 1.4 : 1;
        const posBoost =
          (s.training === "attack" && POS_GROUP[p.pos] === "ATT") ||
          (s.training === "defense" && ["DEF", "GK"].includes(POS_GROUP[p.pos]))
            ? 1.25
            : 1;
        const gain = Math.min(room, Math.round((1 + trainLv * 0.32 + (p.apps > 10 ? 1 : 0)) * devMult * yBoost * posBoost));
        p.ovr = clamp(p.ovr + gain, 40, 99);
      } else if (p.age <= 29) {
        if (p.ovr < p.pot && Math.random() < 0.45 + trainLv * 0.04) {
          p.ovr = clamp(p.ovr + 1, 40, 99);
        }
      } else if (p.age >= 32) {
        const decline = p.age >= 35 ? randInt(1, 3) : Math.random() < 0.65 ? 1 : 0;
        p.ovr = clamp(p.ovr - decline, 40, 99);
      }
      if (p.age >= 37 && Math.random() < 0.7) {
        retirees.push(p);
      } else {
        p.value = estimatePlayerValue(p.ovr, p.age, p.pot);
      }
    }

    if (retirees.length) {
      const retireeIds = new Set(retirees.map((x) => x.id));
      s.squad = s.squad.filter((p) => !retireeIds.has(p.id));
      for (const r of retirees) {
        const youthRep = makePlayer(r.pos, clamp(58 + s.facilities.youth * 2, 55, 82), bridge.r6.clubMap[s.clubId].country, {
          age: 17,
          pot: clamp(75 + s.facilities.youth * 2 + randInt(0, 8), 75, 99),
        });
        s.squad.push(youthRep);
        s.news.unshift(`${r.name} 선수가 은퇴하고 유스 ${youthRep.name}(17세)가 합류했습니다.`);
      }
    }

    // Promotion / Relegation check within country
    const sameCountry = bridge.r6.leagues.filter((l) => l.country === league.country);
    const upperLeague = sameCountry.find((l) => l.tier === league.tier - 1);
    const lowerLeague = sameCountry.find((l) => l.tier === league.tier + 1);
    let movedToLeagueId = s.leagueId;
    let moveNote = "잔류";

    if (upperLeague && rank <= 2) {
      const upperTable = s.worldLeagues[upperLeague.id] || [...upperLeague.clubIds];
      const relegatedFromUpper = upperTable.slice(-2);
      const promotedFromCur = sorted.slice(0, 2).map((r) => r.clubId);
      s.worldLeagues[upperLeague.id] = [...upperTable.filter((id) => !relegatedFromUpper.includes(id)), ...promotedFromCur];
      s.worldLeagues[s.leagueId] = [...sorted.map((r) => r.clubId).filter((id) => !promotedFromCur.includes(id)), ...relegatedFromUpper];
      movedToLeagueId = upperLeague.id;
      moveNote = `${upperLeague.name} 승격!`;
      s.news.unshift(`🎉 ${upperLeague.name}으로 승격했습니다!!`);
    } else if (lowerLeague && rank >= sorted.length - 1) {
      const lowerTable = s.worldLeagues[lowerLeague.id] || [...lowerLeague.clubIds];
      const promotedFromLower = lowerTable.slice(0, 2);
      const relegatedFromCur = sorted.slice(-2).map((r) => r.clubId);
      s.worldLeagues[lowerLeague.id] = [...lowerTable.filter((id) => !promotedFromLower.includes(id)), ...relegatedFromCur];
      s.worldLeagues[s.leagueId] = [...sorted.map((r) => r.clubId).filter((id) => !relegatedFromCur.includes(id)), ...promotedFromLower];
      movedToLeagueId = lowerLeague.id;
      moveNote = `${lowerLeague.name} 강등`;
      s.news.unshift(`😞 ${lowerLeague.name}으로 강등되었습니다.`);
    }

    s.history.unshift({
      year: s.year,
      clubId: s.clubId,
      clubName: bridge.r6.clubMap[s.clubId].localName,
      leagueName: league.name,
      rank,
      points: myRow.points,
      record: `${myRow.won}승 ${myRow.drawn}무 ${myRow.lost}패`,
      cupResult: s.cup?.resultText || "-",
      contResult: s.continental?.qualified ? s.continental.resultText : "-",
      moveNote,
    });

    s.nextLeagueId = movedToLeagueId;
    s.nextContinentalQualified = bridge.r6.leagueMap[movedToLeagueId].tier === 1 && (rank <= 4 || s.leagueId !== movedToLeagueId && rank <= 2);

    // Generate manager offers from stronger clubs if performing well
    if (rank <= 4 || s.cup?.winner === s.clubId) {
      const myClubStr = bridge.r6.clubMap[s.clubId]?.strength || 65;
      const candidates = bridge.r6.clubs
        .filter((c) => c.id !== s.clubId && (c.strength || 60) >= myClubStr - 2 && (c.strength || 60) <= myClubStr + 14)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      s.managerOffers = candidates.map((c) => ({
        clubId: c.id,
        clubName: c.localName,
        leagueName: bridge.r6.leagueMap[c.league]?.name || c.league,
        strength: c.strength || 70,
      }));
    }
  }

  function startNextSeason(s, newClubId = null) {
    const bridge = getBridge();
    s.year++;
    if (newClubId && bridge.r6.clubMap[newClubId]) {
      const club = bridge.r6.clubMap[newClubId];
      s.clubId = club.id;
      s.leagueId = Object.keys(s.worldLeagues).find((lid) => s.worldLeagues[lid].includes(club.id)) || club.league;
      if (!s.worldLeagues[s.leagueId]) {
        const sameCountry = bridge.r6.leagues.filter((l) => l.country === club.country);
        for (const l of sameCountry) s.worldLeagues[l.id] = [...l.clubIds];
      }
      s.squad = generateSquadForClub(club);
      s.budget = Math.max(2000000000, Math.round(Math.pow(Math.max(10, (club.strength || 60) - 35), 2.5) * 4000000));
      const facLv = clamp(Math.floor(((club.strength || 60) - 45) / 8) + 1, 1, 7);
      s.facilities = { stadium: facLv, training: facLv, youth: facLv, medical: facLv, scouting: facLv };
      s.boardTrust = 75;
      s.fanSupport = 75;
      s.news.unshift(`새 구단 ${club.localName}의 감독으로 부임하여 ${s.year} 시즌을 시작합니다!`);
      setupSeasonCompetitions(s, bridge.r6.leagueMap[s.leagueId].tier === 1 && (club.strength || 60) >= 75);
    } else {
      s.leagueId = s.nextLeagueId || s.leagueId;
      autoPickStarters(s.squad, s.formation);
      setupSeasonCompetitions(s, !!s.nextContinentalQualified);
    }
    s.market = generateMarketPool(s);
  }

  function saveState() {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent("kickru-manager-save", { detail: { state } }));
    } catch {}
  }

  function loadCareerState(nextState) {
    if (!nextState || !nextState.clubId || !Array.isArray(nextState.squad)) return false;
    stopLiveTimers();
    liveMatch = null;
    state = nextState;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
    document.body.classList.add("is-manager-mode");
    ensureManagerDOM();
    activeNav = "home";
    render();
    showToast("저장된 구단 감독 커리어를 불러왔습니다!");
    return true;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function render() {
    const root = ensureManagerDOM();
    if (!root) return;

    if (!state) {
      stopLiveTimers();
      liveMatch = null;
      renderSetup(root);
      return;
    }

    if (liveMatch) {
      renderLiveMatchView(root);
      return;
    }

    const bridge = getBridge();
    const club = bridge.r6.clubMap[state.clubId];
    const league = bridge.r6.leagueMap[state.leagueId];
    const teamStats = computeTeamStats(state);

    root.innerHTML = `
      <div class="gm-shell">
        <header class="gm-appbar">
          <div class="gm-appbar-left">
            ${clubLogoHtml(state.clubId, true)}
            <div>
              <h1>${escapeHtml(club?.localName || state.clubId)}</h1>
              <div style="font-size:11px;color:var(--gm-muted);">${state.year} 시즌 · ${escapeHtml(league?.name || "")} (${league?.tier || 1}부)</div>
            </div>
          </div>
          <div class="gm-appbar-actions">
            <span class="gm-badge">OVR ${teamStats.total}</span>
            <button type="button" class="gm-btn-sm" id="gm-save-mgr-btn">💾 저장·불러오기</button>
            <button type="button" class="gm-btn-sm" id="gm-new-career">새 구단</button>
            <button type="button" class="gm-btn-sm is-primary" id="gm-to-player">⚽ 선수 모드</button>
          </div>
        </header>

        <main class="gm-main" id="gm-main"></main>

        <nav class="gm-bottom-nav">
          <button type="button" class="gm-nav-btn ${activeNav === "home" ? "is-active" : ""}" data-nav="home"><span class="gm-nav-ico">🏠</span>홈·경기</button>
          <button type="button" class="gm-nav-btn ${activeNav === "squad" ? "is-active" : ""}" data-nav="squad"><span class="gm-nav-ico">📋</span>선수·전술</button>
          <button type="button" class="gm-nav-btn ${activeNav === "market" ? "is-active" : ""}" data-nav="market"><span class="gm-nav-ico">🔁</span>이적·유스</button>
          <button type="button" class="gm-nav-btn ${activeNav === "facilities" ? "is-active" : ""}" data-nav="facilities"><span class="gm-nav-ico">🏟️</span>시설·재정</button>
          <button type="button" class="gm-nav-btn ${activeNav === "league" ? "is-active" : ""}" data-nav="league"><span class="gm-nav-ico">🏆</span>순위·기록</button>
          <button type="button" class="gm-nav-btn ${activeNav === "editor" ? "is-active" : ""}" data-nav="editor"><span class="gm-nav-ico">⚡</span>구단치트</button>
        </nav>
      </div>
    `;

    document.getElementById("gm-to-player").addEventListener("click", exitManagerMode);
    document.getElementById("gm-save-mgr-btn").addEventListener("click", () => {
      if (window.__KICKRU_SAVE__) window.__KICKRU_SAVE__.open("all");
    });
    document.getElementById("gm-new-career").addEventListener("click", () => {
      if (confirm("새 감독 커리어를 시작하시겠습니까? (현재 감독 커리어는 초기화됩니다)")) {
        state = null;
        localStorage.removeItem(STORAGE_KEY);
        render();
      }
    });
    root.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeNav = btn.dataset.nav;
        render();
      });
    });

    const main = document.getElementById("gm-main");
    if (activeNav === "home") renderHomeTab(main, teamStats);
    else if (activeNav === "squad") renderSquadTab(main, teamStats);
    else if (activeNav === "market") renderMarketTab(main);
    else if (activeNav === "facilities") renderFacilitiesTab(main);
    else if (activeNav === "league") renderLeagueTab(main);
    else if (activeNav === "editor") renderEditorTab(main);
  }

  function renderSetup(root) {
    const bridge = getBridge();
    const clubs = bridge?.r6?.clubs || [];
    const countries = bridge?.r6?.countries || [];
    const leagueMap = bridge?.r6?.leagueMap || {};

    const q = setupDraft.clubQuery.trim().toLowerCase();
    const filteredClubs = clubs
      .filter((c) => {
        if (setupDraft.countryFilter !== "all" && c.country !== setupDraft.countryFilter) return false;
        if (!q) return true;
        return (
          c.localName?.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q) ||
          leagueMap[c.league]?.name?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.strength || 60) - (b.strength || 60));

    // Show top/weak or matching clubs (limit 40)
    const displayClubs = q || setupDraft.countryFilter !== "all" ? filteredClubs.slice(0, 40) : [...clubs].sort((a, b) => (b.strength || 0) - (a.strength || 0)).slice(0, 30);

    const countryOpts = [
      `<option value="all">전체 국가 (${clubs.length}개 구단)</option>`,
      ...countries.map((c) => `<option value="${c.code}" ${setupDraft.countryFilter === c.code ? "selected" : ""}>${escapeHtml(c.name)}</option>`),
    ].join("");

    const natOpts = countries
      .map((c) => `<option value="${c.code}" ${setupDraft.nationality === c.code ? "selected" : ""}>${escapeHtml(c.name)}</option>`)
      .join("");

    root.innerHTML = `
      <div class="gm-shell">
        <header class="gm-appbar">
          <div class="gm-appbar-left">
            <h1>👔 감독 모드 : 구단 키우기</h1>
            <span class="gm-badge is-blue">새 커리어</span>
          </div>
          <div class="gm-appbar-actions">
            <button type="button" class="gm-btn-sm" id="gm-setup-save-btn">💾 저장·불러오기</button>
            <button type="button" class="gm-btn-sm is-primary" id="gm-to-player">⚽ 선수 모드로 돌아가기</button>
          </div>
        </header>

        <main class="gm-main">
          <section class="gm-card">
            <div class="gm-card-head">
              <h2>1. 감독 프로필 & 성향</h2>
            </div>
            <div class="gm-grid-2">
              <div class="gm-field">
                <label>감독 이름</label>
                <input type="text" class="gm-input" id="gm-set-name" maxlength="24" value="${escapeHtml(setupDraft.managerName)}" />
              </div>
              <div class="gm-field">
                <label>감독 국적</label>
                <select class="gm-select" id="gm-set-nat">${natOpts}</select>
              </div>
            </div>
            <div class="gm-trait-grid">
              ${TRAITS.map(
                (tr) => `
                  <button type="button" class="gm-trait-card ${setupDraft.trait === tr.id ? "is-selected" : ""}" data-trait="${tr.id}">
                    <strong>${tr.name}</strong>
                    <span>${tr.desc}</span>
                  </button>
                `
              ).join("")}
            </div>
          </section>

          <section class="gm-card">
            <div class="gm-card-head">
              <h2>2. 부임할 구단 선택 (2,155개 실존 구단)</h2>
              <span class="gm-badge">현재 선택: ${escapeHtml(bridge?.r6?.clubMap?.[setupDraft.clubId]?.localName || setupDraft.clubId)}</span>
            </div>
            <div class="gm-grid-2">
              <div class="gm-field">
                <label>국가 필터</label>
                <select class="gm-select" id="gm-set-country">${countryOpts}</select>
              </div>
              <div class="gm-field">
                <label>구단 / 리그 검색</label>
                <input type="search" class="gm-input" id="gm-set-query" placeholder="예: 서울, 전북, 아스널, 4부리그..." value="${escapeHtml(setupDraft.clubQuery)}" />
              </div>
            </div>
            <div class="gm-list" style="max-height:280px;overflow-y:auto;">
              ${displayClubs
                .map((c) => {
                  const lg = leagueMap[c.league];
                  const selected = setupDraft.clubId === c.id;
                  return `
                    <div class="gm-list-item ${selected ? "is-starter" : ""}">
                      <div class="gm-player-main">
                        ${clubLogoHtml(c.id, true)}
                        <div class="gm-player-info">
                          <div class="gm-player-name">${escapeHtml(c.localName)} <span class="gm-badge">${lg?.tier || 1}부 · 전력 ${c.strength || 60}</span></div>
                          <div class="gm-player-sub">${escapeHtml(lg?.name || c.league)} · ${escapeHtml(c.name)}</div>
                        </div>
                      </div>
                      <button type="button" class="gm-mini-btn ${selected ? "is-active" : ""}" data-pick-club="${c.id}">${selected ? "선택됨" : "선택"}</button>
                    </div>
                  `;
                })
                .join("")}
            </div>
            <button type="button" class="gm-btn is-primary" id="gm-start-btn" style="margin-top:4px;">🚀 ${escapeHtml(bridge?.r6?.clubMap?.[setupDraft.clubId]?.localName || "구단")} 감독 부임하기</button>
          </section>
        </main>
      </div>
    `;

    document.getElementById("gm-to-player").addEventListener("click", exitManagerMode);
    document.getElementById("gm-setup-save-btn").addEventListener("click", () => {
      if (window.__KICKRU_SAVE__) window.__KICKRU_SAVE__.open("all");
    });
    document.getElementById("gm-set-name").addEventListener("input", (e) => {
      setupDraft.managerName = e.target.value;
    });
    document.getElementById("gm-set-nat").addEventListener("change", (e) => {
      setupDraft.nationality = e.target.value;
    });
    root.querySelectorAll("[data-trait]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setupDraft.trait = btn.dataset.trait;
        render();
      });
    });
    document.getElementById("gm-set-country").addEventListener("change", (e) => {
      setupDraft.countryFilter = e.target.value;
      render();
    });
    document.getElementById("gm-set-query").addEventListener("input", (e) => {
      setupDraft.clubQuery = e.target.value;
      render();
      const inp = document.getElementById("gm-set-query");
      if (inp) {
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    });
    root.querySelectorAll("[data-pick-club]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setupDraft.clubId = btn.dataset.pickClub;
        render();
      });
    });
    document.getElementById("gm-start-btn").addEventListener("click", () => {
      state = buildNewCareer(setupDraft);
      saveState();
      activeNav = "home";
      render();
      showToast("구단 감독으로 부임했습니다!");
    });
  }

  function renderHomeTab(main, teamStats) {
    const bridge = getBridge();
    const club = bridge.r6.clubMap[state.clubId];
    const league = bridge.r6.leagueMap[state.leagueId];
    const sorted = sortTable(state.table);
    const rank = sorted.findIndex((r) => r.clubId === state.clubId) + 1;
    const totalRounds = state.schedule.length;
    const nextMatch = state.schedule[state.round]?.find((m) => m.home === state.clubId || m.away === state.clubId);
    const nextOppId = nextMatch ? (nextMatch.home === state.clubId ? nextMatch.away : nextMatch.home) : null;
    const nextOppName = nextOppId ? bridge.r6.clubMap[nextOppId]?.localName : null;

    main.innerHTML = `
      <section class="gm-card">
        <div class="gm-club-hero">
          ${clubLogoHtml(state.clubId, false)}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <strong style="font-size:18px;">${escapeHtml(club?.localName || state.clubId)}</strong>
              <span class="gm-badge is-blue">${rank}위 / ${sorted.length}팀</span>
              <span class="gm-badge is-gold">🏆 ${state.trophies.length}회</span>
            </div>
            <div style="font-size:12px;color:var(--gm-sub);margin-top:4px;">
              감독: <b>${escapeHtml(state.manager.name)}</b> · 전술: <b>${FORMATIONS[state.formation]?.label}</b> (${TACTICS[state.tactic]?.label})
            </div>
          </div>
        </div>

        <div class="gm-kpi-grid">
          <div class="gm-kpi"><small>팀 종합 OVR</small><strong>${teamStats.total}</strong><small style="font-size:10px;">공${teamStats.att} 중${teamStats.mid} 수${teamStats.def}</small></div>
          <div class="gm-kpi"><small>구단 예산</small><strong style="font-size:14px;">${formatMoney(state.budget)}</strong><small style="font-size:10px;">선수 ${state.squad.length}명</small></div>
          <div class="gm-kpi"><small>보드진 신뢰</small><strong>${state.boardTrust}%</strong><small style="font-size:10px;">팬 지지 ${state.fanSupport}%</small></div>
          <div class="gm-kpi"><small>시즌 진행</small><strong>${state.round}/${totalRounds}R</strong><small style="font-size:10px;">사기 ${state.teamMorale}%</small></div>
        </div>

        ${
          state.seasonOver
            ? `
              <div class="gm-match-box" style="background:var(--gm-accent-soft);border-color:var(--gm-accent);">
                <div style="font-size:14px;font-weight:850;">🎉 ${state.year} 시즌이 종료되었습니다!</div>
                <div style="font-size:12px;color:var(--gm-sub);">
                  최종 순위: <b>${rank}위</b> · 컵대회: <b>${state.cup?.resultText || "-"}</b> · 대륙전: <b>${state.continental?.resultText || "-"}</b>
                </div>
                <button type="button" class="gm-btn is-primary" id="gm-next-season-btn">➡️ ${state.year + 1} 새 시즌 시작하기</button>
                ${
                  state.managerOffers?.length
                    ? `<div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">
                        <small style="font-weight:800;">📩 타 구단 감독 영입 제의</small>
                        ${state.managerOffers
                          .map(
                            (o) => `
                              <div class="gm-list-item">
                                <div class="gm-player-main">
                                  ${clubLogoHtml(o.clubId, true)}
                                  <div class="gm-player-info">
                                    <div class="gm-player-name">${escapeHtml(o.clubName)} (전력 ${o.strength})</div>
                                    <div class="gm-player-sub">${escapeHtml(o.leagueName)}</div>
                                  </div>
                                </div>
                                <button type="button" class="gm-mini-btn is-active" data-accept-offer="${o.clubId}">부임 수락</button>
                              </div>
                            `
                          )
                          .join("")}
                      </div>`
                    : ""
                }
              </div>
            `
            : `
              <div class="gm-match-box">
                <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gm-sub);">
                  <span>다음 경기 · ${escapeHtml(league?.name)} ${state.round + 1}R</span>
                  <span>${nextMatch ? (nextMatch.home === state.clubId ? "🏠 홈" : "✈️ 원정") : "휴식 라운드"}</span>
                </div>
                <div style="font-size:15px;font-weight:850;">
                  ${nextOppName ? `vs ${escapeHtml(nextOppName)} (전력 ${getClubStrength(state, nextOppId)})` : "이번 라운드는 부전승(휴식)입니다"}
                </div>
                <div class="gm-btn-row" style="margin-bottom:6px;">
                  <button type="button" class="gm-btn is-primary" id="gm-live-start" style="min-height:48px;font-size:14px;">
                    ${nextOppName ? "📺 FM 실황 경기 입장 (2D 라이브)" : "⏩ 휴식 라운드 진행하기"}
                  </button>
                </div>
                <div class="gm-btn-row">
                  <button type="button" class="gm-btn" id="gm-play-1">⚡ 빠른 결과 (1경기)</button>
                  <button type="button" class="gm-btn is-blue" id="gm-play-5">⏩ 5경기 진행</button>
                  <button type="button" class="gm-btn" id="gm-play-all">🚀 시즌 끝까지</button>
                </div>
              </div>
            `
        }
      </section>

      ${
        state.lastMatch
          ? `<section class="gm-card">
              <div class="gm-card-head">
                <h3>최근 경기 결과</h3>
                <span class="gm-badge ${state.lastMatch.isWin ? "" : state.lastMatch.isDraw ? "is-gold" : "is-danger"}">${state.lastMatch.isWin ? "승리" : state.lastMatch.isDraw ? "무승부" : "패배"}</span>
              </div>
              <div class="gm-match-box">
                <div style="text-align:center;font-size:11px;color:var(--gm-muted);">${escapeHtml(state.lastMatch.comp)}</div>
                <div class="gm-scoreboard">
                  <div class="gm-score-team">${escapeHtml(state.lastMatch.home)}</div>
                  <div class="gm-score-num">${state.lastMatch.hg} : ${state.lastMatch.ag}</div>
                  <div class="gm-score-team">${escapeHtml(state.lastMatch.away)}</div>
                </div>
                <div class="gm-match-events">
                  ${state.lastMatch.scorers.length ? "⚽ 득점: " + state.lastMatch.scorers.map(escapeHtml).join(", ") : "우리 팀 득점 없음"}
                </div>
              </div>
            </section>`
          : ""
      }

      <section class="gm-card">
        <div class="gm-card-head"><h3>대회 현황 & 구단 소식</h3></div>
        <div class="gm-grid-2">
          <div class="gm-kpi"><small>${escapeHtml(state.cup?.name || "국내 컵")}</small><strong style="font-size:14px;">${escapeHtml(state.cup?.resultText || "-")}</strong></div>
          <div class="gm-kpi"><small>${escapeHtml(state.continental?.name || "대륙 대항전")}</small><strong style="font-size:14px;">${escapeHtml(state.continental?.resultText || "-")}</strong></div>
        </div>
        <div class="gm-list">
          ${state.news
            .slice(0, 6)
            .map((txt) => `<div style="font-size:12px;color:var(--gm-sub);padding:4px 0;border-bottom:1px solid var(--gm-border);">${escapeHtml(txt)}</div>`)
            .join("")}
        </div>
      </section>
    `;

    document.getElementById("gm-live-start")?.addEventListener("click", () => {
      startLiveMatch(state);
    });
    document.getElementById("gm-play-1")?.addEventListener("click", () => {
      playOneRound(state);
      saveState();
      render();
    });
    document.getElementById("gm-play-5")?.addEventListener("click", () => {
      for (let i = 0; i < 5 && !state.seasonOver; i++) playOneRound(state);
      saveState();
      render();
    });
    document.getElementById("gm-play-all")?.addEventListener("click", () => {
      while (!state.seasonOver) playOneRound(state);
      saveState();
      render();
    });
    document.getElementById("gm-next-season-btn")?.addEventListener("click", () => {
      startNextSeason(state);
      saveState();
      render();
      showToast(`${state.year} 새 시즌이 시작되었습니다!`);
    });
    main.querySelectorAll("[data-accept-offer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        startNextSeason(state, btn.dataset.acceptOffer);
        saveState();
        render();
        showToast("새 구단 감독으로 부임했습니다!");
      });
    });
  }

  function renderSquadTab(main, teamStats) {
    const sortedSquad = [...state.squad].sort((a, b) => Number(b.starter) - Number(a.starter) || b.ovr - a.ovr);

    main.innerHTML = `
      <section class="gm-card">
        <div class="gm-card-head">
          <h2>전술 & 훈련 설정</h2>
          <button type="button" class="gm-btn-sm is-primary" id="gm-auto-11">✨ 베스트 11 자동 배치</button>
        </div>
        <div class="gm-grid-3">
          <div class="gm-field">
            <label>포메이션</label>
            <select class="gm-select" id="gm-formation">
              ${Object.entries(FORMATIONS)
                .map(([k, v]) => `<option value="${k}" ${state.formation === k ? "selected" : ""}>${v.label}</option>`)
                .join("")}
            </select>
          </div>
          <div class="gm-field">
            <label>전술 철학</label>
            <select class="gm-select" id="gm-tactic">
              ${Object.entries(TACTICS)
                .map(([k, v]) => `<option value="${k}" ${state.tactic === k ? "selected" : ""}>${v.label}</option>`)
                .join("")}
            </select>
          </div>
          <div class="gm-field">
            <label>훈련 중점</label>
            <select class="gm-select" id="gm-training">
              ${Object.entries(TRAININGS)
                .map(([k, v]) => `<option value="${k}" ${state.training === k ? "selected" : ""}>${v.label}</option>`)
                .join("")}
            </select>
          </div>
        </div>
        <div style="font-size:12px;color:var(--gm-sub);">
          선택된 전술: <b>${TACTICS[state.tactic]?.desc}</b> (현재 선발: ${teamStats.startersCount}/11명)
        </div>
      </section>

      <section class="gm-card">
        <div class="gm-card-head">
          <h3>선수단 (${state.squad.length}명)</h3>
          <span class="gm-badge">주급 합계 ${formatMoney(state.squad.reduce((a, p) => a + p.wage, 0))}/년</span>
        </div>
        <div class="gm-list">
          ${sortedSquad
            .map((p) => {
              const grp = POS_GROUP[p.pos];
              const posCls = grp === "GK" ? "is-gk" : grp === "DEF" ? "is-def" : grp === "ATT" ? "is-att" : "";
              return `
                <div class="gm-list-item ${p.starter ? "is-starter" : ""}">
                  <div class="gm-player-main">
                    <span class="gm-pos-tag ${posCls}">${p.pos}</span>
                    <div class="gm-ovr-pill">${p.ovr}</div>
                    <div class="gm-player-info">
                      <div class="gm-player-name">${escapeHtml(p.name)} <span style="font-size:11px;color:var(--gm-muted);font-weight:600;">${p.age}세 · POT ${p.pot}</span></div>
                      <div class="gm-player-sub">체력 ${p.stamina}% · ${p.goals}골 ${p.assists}도움 · 계약 ${p.contract}년 · 가치 ${formatMoney(p.value)}</div>
                    </div>
                  </div>
                  <div class="gm-actions-mini">
                    <button type="button" class="gm-mini-btn ${p.starter ? "is-active" : ""}" data-toggle-start="${p.id}">${p.starter ? "선발" : "후보"}</button>
                    <button type="button" class="gm-mini-btn" data-edit-player="${p.id}">✏️</button>
                    <button type="button" class="gm-mini-btn is-danger" data-sell-player="${p.id}">판매</button>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>
    `;

    document.getElementById("gm-formation").addEventListener("change", (e) => {
      state.formation = e.target.value;
      autoPickStarters(state.squad, state.formation);
      saveState();
      render();
    });
    document.getElementById("gm-tactic").addEventListener("change", (e) => {
      state.tactic = e.target.value;
      saveState();
      render();
    });
    document.getElementById("gm-training").addEventListener("change", (e) => {
      state.training = e.target.value;
      saveState();
      render();
    });
    document.getElementById("gm-auto-11").addEventListener("click", () => {
      autoPickStarters(state.squad, state.formation);
      saveState();
      render();
      showToast("포메이션에 맞춰 베스트 11을 자동 배치했어요!");
    });
    main.querySelectorAll("[data-toggle-start]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = state.squad.find((x) => x.id === btn.dataset.toggleStart);
        if (!target) return;
        if (!target.starter && state.squad.filter((x) => x.starter).length >= 11) {
          showToast("선발은 최대 11명까지만 선택할 수 있습니다.");
          return;
        }
        target.starter = !target.starter;
        saveState();
        render();
      });
    });
    main.querySelectorAll("[data-sell-player]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.squad.length <= 13) {
          showToast("최소 13명의 선수가 필요합니다.");
          return;
        }
        const idx = state.squad.findIndex((x) => x.id === btn.dataset.sellPlayer);
        if (idx < 0) return;
        const p = state.squad[idx];
        const fee = Math.round(p.value * 0.85);
        state.squad.splice(idx, 1);
        state.budget += fee;
        state.news.unshift(`${p.name} 선수를 ${formatMoney(fee)}에 매각했습니다.`);
        saveState();
        render();
        showToast(`${p.name} 매각 (+${formatMoney(fee)})`);
      });
    });
    main.querySelectorAll("[data-edit-player]").forEach((btn) => {
      btn.addEventListener("click", () => openPlayerEditModal(btn.dataset.editPlayer));
    });
  }

  function renderMarketTab(main) {
    const bridge = getBridge();
    const clubs = bridge.r6.clubs;
    const q = marketQuery.trim().toLowerCase();
    const searchedClubs = q
      ? clubs.filter((c) => c.localName?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q)).slice(0, 12)
      : [];

    main.innerHTML = `
      <section class="gm-card">
        <div class="gm-card-head">
          <h2>🌱 유스 아카데미 콜업</h2>
          <span class="gm-badge">남은 콜업: ${state.youthPullsRemaining}회 (유스 Lv.${state.facilities.youth})</span>
        </div>
        <p style="margin:0;font-size:12px;color:var(--gm-sub);">유스 아카데미 레벨이 높을수록 더 높은 초기 OVR과 잠재력(최대 99)을 가진 유망주가 발굴됩니다.</p>
        <button type="button" class="gm-btn is-primary" id="gm-pull-youth" ${state.youthPullsRemaining <= 0 ? "disabled" : ""}>🌱 유망주 1군 콜업하기 (무료)</button>
      </section>

      <section class="gm-card">
        <div class="gm-card-head">
          <h2>🔁 이적시장 매물 (스카우팅 Lv.${state.facilities.scouting})</h2>
          <button type="button" class="gm-btn-sm" id="gm-refresh-market">🔄 스카우트 새로고침</button>
        </div>
        <div class="gm-list">
          ${state.market
            .map((p) => {
              const grp = POS_GROUP[p.pos];
              const posCls = grp === "GK" ? "is-gk" : grp === "DEF" ? "is-def" : grp === "ATT" ? "is-att" : "";
              const canAfford = state.budget >= p.price;
              return `
                <div class="gm-list-item">
                  <div class="gm-player-main">
                    <span class="gm-pos-tag ${posCls}">${p.pos}</span>
                    <div class="gm-ovr-pill">${p.ovr}</div>
                    <div class="gm-player-info">
                      <div class="gm-player-name">${escapeHtml(p.name)} <span style="font-size:11px;color:var(--gm-muted);">${p.age}세 · POT ${p.pot}</span></div>
                      <div class="gm-player-sub">${escapeHtml(p.fromClub)} · 연봉 ${formatMoney(p.wage)}</div>
                    </div>
                  </div>
                  <button type="button" class="gm-mini-btn is-active" data-buy-player="${p.id}" ${!canAfford ? "disabled" : ""}>
                    ${p.isFreeAgent ? "FA 영입" : formatMoney(p.price)}
                  </button>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>

      <section class="gm-card">
        <div class="gm-card-head">
          <h3>🔍 타 구단 에이스 특별 스카우트</h3>
        </div>
        <input type="search" class="gm-input" id="gm-scout-search" placeholder="구단 검색 (예: 레알 마드리드, 맨시티, 전북...)" value="${escapeHtml(marketQuery)}" />
        ${
          searchedClubs.length
            ? `<div class="gm-list">
                ${searchedClubs
                  .map((c) => {
                    const estOvr = clamp((c.strength || 70) + 4, 58, 94);
                    const estPrice = estimatePlayerValue(estOvr, 24, estOvr + 3);
                    return `
                      <div class="gm-list-item">
                        <div class="gm-player-main">
                          ${clubLogoHtml(c.id, true)}
                          <div class="gm-player-info">
                            <div class="gm-player-name">${escapeHtml(c.localName)} 에이스 영입 (OVR ${estOvr})</div>
                            <div class="gm-player-sub">예상 이적료 ${formatMoney(estPrice)}</div>
                          </div>
                        </div>
                        <button type="button" class="gm-mini-btn is-active" data-poach-club="${c.id}" ${state.budget < estPrice ? "disabled" : ""}>영입</button>
                      </div>
                    `;
                  })
                  .join("")}
              </div>`
            : `<div style="font-size:12px;color:var(--gm-muted);">구단 이름을 입력하면 해당 구단의 핵심 선수를 즉시 영입할 수 있습니다.</div>`
        }
      </section>
    `;

    document.getElementById("gm-pull-youth").addEventListener("click", () => {
      if (state.youthPullsRemaining <= 0) return;
      state.youthPullsRemaining--;
      const yLv = state.facilities.youth || 1;
      const ovr = clamp(54 + yLv * 2 + randInt(-2, 5), 52, 85);
      const pot = clamp(76 + yLv * 2 + randInt(0, 12), ovr + 5, 99);
      const country = bridge.r6.clubMap[state.clubId]?.country || "kr";
      const youth = makePlayer(pick(POS_LIST), ovr, country, { age: randInt(16, 18), ovr, pot });
      state.squad.push(youth);
      state.news.unshift(`🌱 유스 아카데미에서 ${youth.name}(${youth.pos}, OVR ${youth.ovr}/POT ${youth.pot})를 콜업했습니다!`);
      saveState();
      render();
      showToast(`유망주 ${youth.name} (POT ${youth.pot}) 콜업 완료!`);
    });

    document.getElementById("gm-refresh-market").addEventListener("click", () => {
      state.market = generateMarketPool(state);
      saveState();
      render();
      showToast("새 이적시장 매물 리스트를 받아왔습니다.");
    });

    main.querySelectorAll("[data-buy-player]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = state.market.findIndex((x) => x.id === btn.dataset.buyPlayer);
        if (idx < 0) return;
        const p = state.market[idx];
        if (state.budget < p.price) {
          showToast("구단 예산이 부족합니다.");
          return;
        }
        state.budget -= p.price;
        delete p.price;
        delete p.isFreeAgent;
        delete p.fromClub;
        state.squad.push(p);
        state.market.splice(idx, 1);
        state.news.unshift(`${p.name}(${p.pos}, OVR ${p.ovr}) 선수를 영입했습니다!`);
        saveState();
        render();
        showToast(`${p.name} 영입 완료!`);
      });
    });

    document.getElementById("gm-scout-search").addEventListener("input", (e) => {
      marketQuery = e.target.value;
      render();
      const inp = document.getElementById("gm-scout-search");
      if (inp) {
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    });

    main.querySelectorAll("[data-poach-club]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const c = bridge.r6.clubMap[btn.dataset.poachClub];
        if (!c) return;
        const estOvr = clamp((c.strength || 70) + 4, 58, 94);
        const estPrice = estimatePlayerValue(estOvr, 24, estOvr + 3);
        if (state.budget < estPrice) {
          showToast("구단 예산이 부족합니다.");
          return;
        }
        state.budget -= estPrice;
        const ace = makePlayer(pick(["ST", "LW", "CAM", "CM", "CB"]), estOvr, c.country, {
          age: randInt(21, 27),
          ovr: estOvr,
          pot: clamp(estOvr + 3, estOvr, 99),
        });
        state.squad.push(ace);
        state.news.unshift(`💎 ${c.localName}의 에이스 ${ace.name}(OVR ${ace.ovr})을 ${formatMoney(estPrice)}에 영입했습니다!`);
        saveState();
        render();
        showToast(`${c.localName} 에이스 ${ace.name} 영입!`);
      });
    });
  }

  function renderFacilitiesTab(main) {
    const annualWages = state.squad.reduce((a, p) => a + p.wage, 0);

    main.innerHTML = `
      <section class="gm-card">
        <div class="gm-card-head">
          <h2>구단 재정 현황</h2>
          <span class="gm-badge is-blue">${formatMoney(state.budget)}</span>
        </div>
        <div class="gm-grid-2">
          <div class="gm-kpi"><small>선수단 총 연간 주급</small><strong>${formatMoney(annualWages)}</strong></div>
          <div class="gm-kpi"><small>경기당 홈 입장 수익</small><strong>${formatMoney((80000000 + state.facilities.stadium * 95000000) * (state.manager.trait === "tycoon" ? 1.25 : 1))}</strong></div>
        </div>
      </section>

      <section class="gm-card">
        <div class="gm-card-head">
          <h2>🏟️ 구단 시설 투자 (Lv.1 ~ Lv.10)</h2>
        </div>
        <div class="gm-list">
          ${FACILITY_INFO.map((f) => {
            const lv = state.facilities[f.key] || 1;
            const cost = lv >= 10 ? 0 : Math.round(Math.pow(lv, 2.2) * 800000000);
            return `
              <div class="gm-list-item">
                <div class="gm-player-info">
                  <div class="gm-player-name">${f.name} <span class="gm-badge">Lv.${lv} / 10</span></div>
                  <div class="gm-player-sub">${f.desc}</div>
                </div>
                <button type="button" class="gm-mini-btn is-active" data-upgrade-fac="${f.key}" ${lv >= 10 || state.budget < cost ? "disabled" : ""}>
                  ${lv >= 10 ? "MAX" : formatMoney(cost)}
                </button>
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;

    main.querySelectorAll("[data-upgrade-fac]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.upgradeFac;
        const lv = state.facilities[key] || 1;
        if (lv >= 10) return;
        const cost = Math.round(Math.pow(lv, 2.2) * 800000000);
        if (state.budget < cost) {
          showToast("예산이 부족합니다.");
          return;
        }
        state.budget -= cost;
        state.facilities[key] = lv + 1;
        state.news.unshift(`구단 시설 업그레이드! Lv.${lv + 1} 달성.`);
        saveState();
        render();
        showToast(`시설 레벨 Lv.${lv + 1} 업그레이드 완료!`);
      });
    });
  }

  function renderLeagueTab(main) {
    const bridge = getBridge();
    const league = bridge.r6.leagueMap[state.leagueId];
    const sorted = sortTable(state.table);
    const totalGames = state.manager.wins + state.manager.draws + state.manager.losses;
    const winRate = totalGames ? ((state.manager.wins / totalGames) * 100).toFixed(1) : "0.0";

    main.innerHTML = `
      <section class="gm-card">
        <div class="gm-card-head">
          <h2>${escapeHtml(league?.name || "리그 순위표")} (${league?.tier || 1}부)</h2>
          <span class="gm-badge">상위 2팀 승격 / 하위 2팀 강등</span>
        </div>
        <div class="gm-table-wrap">
          <table class="gm-table">
            <thead>
              <tr><th>#</th><th style="text-align:left;">구단</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득실</th><th>승점</th></tr>
            </thead>
            <tbody>
              ${sorted
                .map((row, idx) => {
                  const pos = idx + 1;
                  const c = bridge.r6.clubMap[row.clubId];
                  const isMe = row.clubId === state.clubId;
                  const zoneCls = pos <= 2 ? "is-zone-up" : pos >= sorted.length - 1 ? "is-zone-down" : "";
                  return `
                    <tr class="${isMe ? "is-my-club" : ""} ${zoneCls}">
                      <td><b>${pos}</b></td>
                      <td class="is-team">${clubLogoHtml(row.clubId, true)}<span>${escapeHtml(c?.localName || row.clubId)}</span></td>
                      <td>${row.played}</td>
                      <td>${row.won}</td>
                      <td>${row.drawn}</td>
                      <td>${row.lost}</td>
                      <td>${row.gf - row.ga}</td>
                      <td><b>${row.points}</b></td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="gm-card">
        <div class="gm-card-head">
          <h3>감독 통산 기록 & 트로피 진열장</h3>
          <span class="gm-badge is-gold">승률 ${winRate}% (${state.manager.wins}승 ${state.manager.draws}무 ${state.manager.losses}패)</span>
        </div>
        ${
          state.trophies.length
            ? `<div class="gm-list">
                ${state.trophies.map((t) => `<div class="gm-list-item"><span>🏆 <b>${t.year} ${escapeHtml(t.name)}</b></span><span class="gm-badge">${escapeHtml(t.club)}</span></div>`).join("")}
              </div>`
            : `<div style="font-size:12px;color:var(--gm-muted);">아직 획득한 우승 트로피가 없습니다.</div>`
        }
        ${
          state.history.length
            ? `<div class="gm-list" style="margin-top:6px;">
                ${state.history
                  .map(
                    (h) => `
                      <div class="gm-list-item">
                        <div>
                          <div style="font-size:13px;font-weight:800;">${h.year} · ${escapeHtml(h.clubName)} (${h.rank}위, ${h.points}점)</div>
                          <div style="font-size:11px;color:var(--gm-muted);">${escapeHtml(h.leagueName)} · ${h.record} · 컵:${escapeHtml(h.cupResult)} · 대륙:${escapeHtml(h.contResult)}</div>
                        </div>
                        <span class="gm-badge is-blue">${escapeHtml(h.moveNote)}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>`
            : ""
        }
      </section>
    `;
  }

  function renderEditorTab(main) {
    const bridge = getBridge();
    const clubs = bridge.r6.clubs;
    const q = moveClubQuery.trim().toLowerCase();
    const moveTargets = q
      ? clubs.filter((c) => c.localName?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q)).slice(0, 15)
      : [...clubs].sort((a, b) => (b.strength || 0) - (a.strength || 0)).slice(0, 10);

    main.innerHTML = `
      <section class="gm-card">
        <div class="gm-card-head">
          <h2>⚡ 구단 · 선수단 치트 & 에디터</h2>
          <span class="gm-badge">즉시 반영</span>
        </div>
        <div class="gm-btn-row">
          <button type="button" class="gm-btn is-primary" id="gm-ch-money-100b">💰 예산 +1,000억</button>
          <button type="button" class="gm-btn is-blue" id="gm-ch-money-1t">💎 예산 +1조</button>
          <button type="button" class="gm-btn is-gold" id="gm-ch-fac-max">🏟️ 전 시설 Lv.10 MAX</button>
        </div>
        <div class="gm-btn-row">
          <button type="button" class="gm-btn is-primary" id="gm-ch-squad-99">🔥 우리팀 전 선수 OVR 99</button>
          <button type="button" class="gm-btn" id="gm-ch-heal">💊 전 선수 체력·사기·신뢰 100%</button>
          <button type="button" class="gm-btn" id="gm-ch-youth-reset">🌱 유스 콜업 5회 충전</button>
        </div>
        <div class="gm-grid-2">
          <div class="gm-field">
            <label>구단 예산 직접 수정 (원)</label>
            <input type="number" class="gm-input" id="gm-ch-budget-inp" value="${Math.round(state.budget)}" />
          </div>
          <div class="gm-field" style="justify-content:flex-end;">
            <button type="button" class="gm-btn is-primary" id="gm-ch-budget-apply">예산 적용</button>
          </div>
        </div>
      </section>

      <section class="gm-card">
        <div class="gm-card-head"><h3>➕ 커스텀 슈퍼스타 선수 직접 생성 추가</h3></div>
        <div class="gm-grid-3">
          <div class="gm-field">
            <label>선수 이름</label>
            <input type="text" class="gm-input" id="gm-newp-name" value="커스텀 에이스" />
          </div>
          <div class="gm-field">
            <label>포지션</label>
            <select class="gm-select" id="gm-newp-pos">${POS_LIST.map((p) => `<option value="${p}">${p}</option>`).join("")}</select>
          </div>
          <div class="gm-field">
            <label>나이 (16~40)</label>
            <input type="number" class="gm-input" id="gm-newp-age" min="16" max="40" value="19" />
          </div>
          <div class="gm-field">
            <label>OVR (40~99)</label>
            <input type="number" class="gm-input" id="gm-newp-ovr" min="40" max="99" value="92" />
          </div>
          <div class="gm-field">
            <label>잠재력 POT (40~99)</label>
            <input type="number" class="gm-input" id="gm-newp-pot" min="40" max="99" value="99" />
          </div>
          <div class="gm-field" style="justify-content:flex-end;">
            <button type="button" class="gm-btn is-primary" id="gm-newp-add">선수단에 추가</button>
          </div>
        </div>
      </section>

      <section class="gm-card">
        <div class="gm-card-head"><h3>✈️ 감독 구단 즉시 부임 / 이동</h3></div>
        <input type="search" class="gm-input" id="gm-move-search" placeholder="부임할 구단 검색..." value="${escapeHtml(moveClubQuery)}" />
        <div class="gm-list" style="max-height:220px;overflow-y:auto;">
          ${moveTargets
            .map(
              (c) => `
                <div class="gm-list-item">
                  <div class="gm-player-main">
                    ${clubLogoHtml(c.id, true)}
                    <div class="gm-player-info">
                      <div class="gm-player-name">${escapeHtml(c.localName)} (전력 ${c.strength || 60})</div>
                      <div class="gm-player-sub">${escapeHtml(bridge.r6.leagueMap[c.league]?.name || c.league)}</div>
                    </div>
                  </div>
                  <button type="button" class="gm-mini-btn is-active" data-move-club="${c.id}">즉시 부임</button>
                </div>
              `
            )
            .join("")}
        </div>
      </section>
    `;

    document.getElementById("gm-ch-money-100b").addEventListener("click", () => {
      state.budget += 100000000000;
      saveState();
      render();
      showToast("예산 +1,000억 추가!");
    });
    document.getElementById("gm-ch-money-1t").addEventListener("click", () => {
      state.budget += 1000000000000;
      saveState();
      render();
      showToast("예산 +1조 추가!");
    });
    document.getElementById("gm-ch-fac-max").addEventListener("click", () => {
      for (const f of FACILITY_INFO) state.facilities[f.key] = 10;
      saveState();
      render();
      showToast("구단 5대 시설 모두 Lv.10 MAX 달성!");
    });
    document.getElementById("gm-ch-squad-99").addEventListener("click", () => {
      for (const p of state.squad) {
        p.ovr = 99;
        p.pot = 99;
        p.stamina = 100;
        p.morale = 100;
        p.value = estimatePlayerValue(99, p.age, 99);
      }
      saveState();
      render();
      showToast("우리 팀 전 선수 OVR 99 / POT 99 적용!");
    });
    document.getElementById("gm-ch-heal").addEventListener("click", () => {
      for (const p of state.squad) {
        p.stamina = 100;
        p.morale = 100;
      }
      state.teamMorale = 100;
      state.boardTrust = 100;
      state.fanSupport = 100;
      saveState();
      render();
      showToast("선수단 체력·사기 & 보드진·팬 신뢰도 100%!");
    });
    document.getElementById("gm-ch-youth-reset").addEventListener("click", () => {
      state.youthPullsRemaining += 5;
      saveState();
      render();
      showToast("유스 콜업 횟수 +5회 충전!");
    });
    document.getElementById("gm-ch-budget-apply").addEventListener("click", () => {
      state.budget = Math.max(0, Math.round(Number(document.getElementById("gm-ch-budget-inp").value || 0)));
      saveState();
      render();
      showToast("구단 예산을 적용했어요!");
    });
    document.getElementById("gm-newp-add").addEventListener("click", () => {
      const name = (document.getElementById("gm-newp-name").value || "커스텀 선수").trim();
      const pos = document.getElementById("gm-newp-pos").value;
      const age = clamp(Math.round(Number(document.getElementById("gm-newp-age").value || 19)), 16, 40);
      const ovr = clamp(Math.round(Number(document.getElementById("gm-newp-ovr").value || 90)), 40, 99);
      const pot = clamp(Math.round(Number(document.getElementById("gm-newp-pot").value || 99)), ovr, 99);
      const np = makePlayer(pos, ovr, bridge.r6.clubMap[state.clubId]?.country || "kr", { name, age, ovr, pot });
      state.squad.push(np);
      saveState();
      render();
      showToast(`${np.name}(${pos}, OVR ${ovr}) 선수단에 추가!`);
    });
    document.getElementById("gm-move-search").addEventListener("input", (e) => {
      moveClubQuery = e.target.value;
      render();
      const inp = document.getElementById("gm-move-search");
      if (inp) {
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    });
    main.querySelectorAll("[data-move-club]").forEach((btn) => {
      btn.addEventListener("click", () => {
        startNextSeason(state, btn.dataset.moveClub);
        activeNav = "home";
        saveState();
        render();
        showToast("새 구단 감독으로 부임했습니다!");
      });
    });
  }

  function openPlayerEditModal(playerId) {
    const p = state?.squad.find((x) => x.id === playerId);
    if (!p) return;
    editingPlayerId = playerId;

    const modal = document.createElement("div");
    modal.id = "gm-player-modal";
    modal.className = "gm-modal-backdrop";
    modal.innerHTML = `
      <div class="gm-modal-box">
        <div class="gm-card-head">
          <h3>✏️ 선수 능력치 & 정보 수정</h3>
          <button type="button" class="gm-btn-sm" id="gm-pm-close">닫기</button>
        </div>
        <div class="gm-grid-2">
          <div class="gm-field">
            <label>이름</label>
            <input type="text" class="gm-input" id="gm-pm-name" value="${escapeHtml(p.name)}" />
          </div>
          <div class="gm-field">
            <label>포지션</label>
            <select class="gm-select" id="gm-pm-pos">${POS_LIST.map((pos) => `<option value="${pos}" ${p.pos === pos ? "selected" : ""}>${pos}</option>`).join("")}</select>
          </div>
          <div class="gm-field">
            <label>나이 (16~45)</label>
            <input type="number" class="gm-input" id="gm-pm-age" min="16" max="45" value="${p.age}" />
          </div>
          <div class="gm-field">
            <label>현재 OVR (40~99)</label>
            <input type="number" class="gm-input" id="gm-pm-ovr" min="40" max="99" value="${p.ovr}" />
          </div>
          <div class="gm-field">
            <label>잠재력 POT (40~99)</label>
            <input type="number" class="gm-input" id="gm-pm-pot" min="40" max="99" value="${p.pot}" />
          </div>
          <div class="gm-field">
            <label>체력 / 남은 계약(년)</label>
            <div class="gm-grid-2">
              <input type="number" class="gm-input" id="gm-pm-stam" min="1" max="100" value="${p.stamina}" />
              <input type="number" class="gm-input" id="gm-pm-cont" min="0" max="10" value="${p.contract}" />
            </div>
          </div>
        </div>
        <button type="button" class="gm-btn is-primary" id="gm-pm-save">✅ 저장하기</button>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    document.getElementById("gm-pm-close").addEventListener("click", close);
    document.getElementById("gm-pm-save").addEventListener("click", () => {
      p.name = (document.getElementById("gm-pm-name").value || p.name).trim();
      p.pos = document.getElementById("gm-pm-pos").value;
      p.age = clamp(Math.round(Number(document.getElementById("gm-pm-age").value || p.age)), 16, 45);
      p.ovr = clamp(Math.round(Number(document.getElementById("gm-pm-ovr").value || p.ovr)), 40, 99);
      p.pot = clamp(Math.round(Number(document.getElementById("gm-pm-pot").value || p.pot)), p.ovr, 99);
      p.stamina = clamp(Math.round(Number(document.getElementById("gm-pm-stam").value || 100)), 1, 100);
      p.contract = clamp(Math.round(Number(document.getElementById("gm-pm-cont").value || 3)), 0, 10);
      p.value = estimatePlayerValue(p.ovr, p.age, p.pot);
      saveState();
      close();
      render();
      showToast(`${p.name} 선수 정보를 수정했어요!`);
    });
  }

  function stopLiveTimers() {
    if (liveTickTimer) {
      clearInterval(liveTickTimer);
      liveTickTimer = null;
    }
    if (liveRafId && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(liveRafId);
      liveRafId = null;
    }
  }

  function startLiveTimers() {
    stopLiveTimers();
    if (!liveMatch || liveMatch.finished) return;

    const msPerMin = liveMatch.speed === 4 ? 75 : liveMatch.speed === 2 ? 170 : 340;
    if (!liveMatch.paused && !liveMatch.halftimeWaiting) {
      liveTickTimer = setInterval(() => {
        tickLiveMinute();
      }, msPerMin);
    }

    if (typeof requestAnimationFrame === "function") {
      const loop = () => {
        if (!liveMatch) return;
        stepPitchPhysics();
        drawPitchFrame();
        if (!liveMatch.finished) {
          liveRafId = requestAnimationFrame(loop);
        }
      };
      liveRafId = requestAnimationFrame(loop);
    }
  }

  function getFormationCoords(formationKey) {
    return FORMATION_COORDS[formationKey] || FORMATION_COORDS["4-3-3"];
  }

  function startLiveMatch(s) {
    if (!s || s.seasonOver || s.round >= s.schedule.length) return;
    const bridge = getBridge();
    const roundMatches = s.schedule[s.round] || [];
    const match = roundMatches.find((m) => m.home === s.clubId || m.away === s.clubId);

    if (!match) {
      showToast("이번 라운드는 부전승(휴식)입니다. 타 팀 경기를 진행합니다.");
      playOneRound(s);
      saveState();
      render();
      return;
    }

    let starters = s.squad.filter((p) => p.starter);
    if (starters.length !== 11) {
      autoPickStarters(s.squad, s.formation);
      starters = s.squad.filter((p) => p.starter);
    }

    const mySide = match.home === s.clubId ? "home" : "away";
    const oppId = mySide === "home" ? match.away : match.home;
    const myClub = bridge.r6.clubMap[s.clubId];
    const oppClub = bridge.r6.clubMap[oppId] || { id: oppId, localName: oppId, strength: 65, country: "intl" };
    const league = bridge.r6.leagueMap[s.leagueId];

    // Align our 11 starters to formation slots
    const slots = (FORMATIONS[s.formation] || FORMATIONS["4-3-3"]).slots;
    const myCoords = getFormationCoords(s.formation);
    const remaining = [...starters];
    const orderedMy = slots.map((slot, idx) => {
      let pickIdx = remaining.findIndex((p) => p.pos === slot);
      if (pickIdx < 0) pickIdx = remaining.findIndex((p) => POS_GROUP[p.pos] === POS_GROUP[slot]);
      if (pickIdx < 0) pickIdx = 0;
      const pl = remaining.splice(pickIdx, 1)[0];
      const base = myCoords[idx] || [0.3, 0.5];
      const x = mySide === "home" ? base[0] : 1 - base[0];
      const y = base[1];
      return {
        playerId: pl.id,
        name: pl.name,
        pos: pl.pos,
        ovr: pl.ovr,
        stamina: pl.stamina,
        goals: 0,
        assists: 0,
        rating: 6.5,
        slotIdx: idx,
        x,
        y,
        tx: x,
        ty: y,
      };
    });

    // Generate 11 opponent players
    const oppSlots = FORMATIONS["4-3-3"].slots;
    const oppCoords = getFormationCoords("4-3-3");
    const oppLineup = oppSlots.map((slot, idx) => {
      const base = oppCoords[idx] || [0.3, 0.5];
      const x = mySide === "home" ? 1 - base[0] : base[0];
      const y = base[1];
      return {
        name: genName(oppClub.country || "intl"),
        pos: slot,
        ovr: clamp((oppClub.strength || 65) + randInt(-3, 3), 45, 95),
        slotIdx: idx,
        x,
        y,
        tx: x,
        ty: y,
      };
    });

    liveMatch = {
      roundIndex: s.round,
      mySide,
      homeClubId: match.home,
      awayClubId: match.away,
      homeName: bridge.r6.clubMap[match.home]?.localName || match.home,
      awayName: bridge.r6.clubMap[match.away]?.localName || match.away,
      oppStrength: oppClub.strength || 65,
      compName: `${league?.name || ""} ${s.round + 1}R`,
      hg: 0,
      ag: 0,
      minute: 0,
      speed: 1,
      paused: false,
      halftimeDone: false,
      halftimeWaiting: false,
      finished: false,
      cameraMode: "tv3d",
      cam: { x: 0, y: -64, z: 36, lx: 0, ly: 0, lz: 0 },
      ball: { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, z: 0, vz: 0, trail: [], ownerTeam: mySide, ownerIdx: 9, phase: "kickoff" },
      stats: { possHome: 1, possAway: 1, shotsHome: 0, shotsAway: 0, onTargetHome: 0, onTargetAway: 0, xgHome: 0, xgAway: 0 },
      shoutCooldown: 0,
      activeShout: null,
      htBoost: { att: 0, def: 0 },
      subsUsed: 0,
      maxSubs: 5,
      subbedOutIds: [],
      subbedHistory: [],
      myLineup: orderedMy,
      oppLineup,
      myScorers: [],
      goalBanner: null,
      goalBannerTicks: 0,
      logs: [{ min: 0, text: `주심의 휘슬! ${myClub?.localName} vs ${oppClub.localName} 경기가 시작됩니다!`, type: "info" }],
    };

    render();
    startLiveTimers();
  }

  function computeLivePowers(s, lm) {
    const avgOvr = lm.myLineup.reduce((a, p) => a + p.ovr * (0.75 + 0.25 * (p.stamina / 100)), 0) / Math.max(1, lm.myLineup.length);
    const traitBonus = s.manager.trait === "tactician" ? 3 : 0;
    const facStad = lm.mySide === "home" ? (s.facilities.stadium - 1) * 0.3 : 0;
    let attMod = traitBonus + facStad + lm.htBoost.att;
    let defMod = traitBonus + facStad + lm.htBoost.def;

    if (s.tactic === "gegenpress") { attMod += 2.2; defMod -= 0.4; }
    else if (s.tactic === "tikitaka") { attMod += 1.4; defMod += 1.2; }
    else if (s.tactic === "counter") {
      if (lm.oppStrength - avgOvr >= 3) attMod += 3.5;
      defMod += 1.6;
    } else if (s.tactic === "wingplay") { attMod += 1.8; }

    if (lm.activeShout && SHOUTS[lm.activeShout]) {
      attMod += SHOUTS[lm.activeShout].attMod;
      defMod += SHOUTS[lm.activeShout].defMod;
    }

    return {
      myAtt: avgOvr + attMod + (lm.mySide === "home" ? 2.0 : 0),
      myDef: avgOvr + defMod + (lm.mySide === "home" ? 2.0 : 0),
      oppAtt: lm.oppStrength + (lm.mySide === "away" ? 2.2 : 0),
      oppDef: lm.oppStrength + (lm.mySide === "away" ? 2.2 : 0),
    };
  }

  function pickMyPlayerWeighted(lineup, weightsByPos) {
    const pool = [];
    for (const p of lineup) {
      const w = weightsByPos[p.pos] || 1;
      for (let i = 0; i < w; i++) pool.push(p);
    }
    return pick(pool) || pick(lineup);
  }

  function tickLiveMinute(silent = false) {
    if (!liveMatch || liveMatch.finished) return;
    if (!silent && (liveMatch.paused || liveMatch.halftimeWaiting)) return;

    const lm = liveMatch;
    lm.minute++;

    if (lm.goalBannerTicks > 0) {
      lm.goalBannerTicks--;
      if (lm.goalBannerTicks === 0) lm.goalBanner = null;
    }

    if (lm.shoutCooldown > 0) {
      lm.shoutCooldown--;
      if (lm.shoutCooldown === 0) lm.activeShout = null;
    }

    // Halftime pause at 45' (only when playing interactively)
    if (!silent && lm.minute === 45 && !lm.halftimeDone) {
      lm.halftimeDone = true;
      lm.halftimeWaiting = true;
      lm.paused = true;
      stopLiveTimers();
      lm.logs.unshift({ min: 45, text: "전반전이 종료되었습니다. 하프타임 라커룸 대화를 선택하세요.", type: "info" });
      updateLiveMatchDOM();
      drawPitchFrame();
      return;
    }

    // Stamina drain per minute
    const shoutMult = lm.activeShout && SHOUTS[lm.activeShout] ? SHOUTS[lm.activeShout].staminaMult : 1;
    const medReduce = (state.facilities.medical - 1) * 0.02;
    const tacDrain = state.tactic === "gegenpress" ? 0.42 : 0.27;
    const drain = Math.max(0.12, (tacDrain - medReduce) * shoutMult);
    for (const mp of lm.myLineup) {
      mp.stamina = clamp(mp.stamina - drain, 20, 100);
    }

    const pw = computeLivePowers(state, lm);
    const myPossProb = clamp(0.5 + (pw.myAtt + pw.myDef - pw.oppAtt - pw.oppDef) * 0.012, 0.25, 0.78);
    const myHasBall = Math.random() < myPossProb;
    const possSide = myHasBall ? lm.mySide : lm.mySide === "home" ? "away" : "home";

    if (possSide === "home") lm.stats.possHome++;
    else lm.stats.possAway++;

    // Update ball target & owner on pitch
    const activeLineup = myHasBall ? lm.myLineup : lm.oppLineup;
    const zoneRoll = Math.random();
    const ownerIdx = zoneRoll < 0.2 ? randInt(1, 4) : zoneRoll < 0.65 ? randInt(5, 7) : randInt(8, 10);
    const owner = activeLineup[ownerIdx] || activeLineup[9];
    lm.ball.ownerTeam = possSide;
    lm.ball.ownerIdx = ownerIdx;
    lm.ball.tx = clamp(owner.tx + (possSide === "home" ? 0.06 : -0.06), 0.05, 0.95);
    lm.ball.ty = clamp(owner.ty + (Math.random() - 0.5) * 0.12, 0.1, 0.9);
    lm.ball.vz = Math.max(lm.ball.vz || 0, 0.08 + Math.random() * 0.12);
    lm.ball.phase = "play";

    // Chance & Shot generation (~19% per minute -> ~17 total shots per 90')
    const eventRoll = Math.random();
    if (eventRoll < 0.19) {
      const shooter = myHasBall
        ? pickMyPlayerWeighted(lm.myLineup, { ST: 6, LW: 4, RW: 4, CAM: 4, CM: 2, CDM: 1 })
        : pick(lm.oppLineup.slice(5));
      const assister = myHasBall
        ? pickMyPlayerWeighted(lm.myLineup.filter((x) => x.playerId !== shooter.playerId), { CAM: 5, CM: 4, LW: 4, RW: 4, LB: 2, RB: 2, ST: 2 })
        : null;

      const attEdge = myHasBall ? pw.myAtt - pw.oppDef : pw.oppAtt - pw.myDef;
      const xg = clamp(0.09 + attEdge * 0.004 + Math.random() * 0.14, 0.03, 0.38);
      if (possSide === "home") {
        lm.stats.shotsHome++;
        lm.stats.xgHome += xg;
      } else {
        lm.stats.shotsAway++;
        lm.stats.xgAway += xg;
      }

      // Move ball toward goal with arc
      lm.ball.tx = possSide === "home" ? 0.96 : 0.04;
      lm.ball.ty = 0.5 + (Math.random() - 0.5) * 0.14;
      lm.ball.vz = 0.26 + Math.random() * 0.16;
      lm.ball.phase = "shot";

      const onTargetProb = clamp(0.38 + attEdge * 0.008, 0.22, 0.58);
      if (Math.random() < onTargetProb) {
        if (possSide === "home") lm.stats.onTargetHome++;
        else lm.stats.onTargetAway++;

        const goalProb = clamp(0.21 + attEdge * 0.008, 0.08, 0.36);
        if (Math.random() < goalProb) {
          if (possSide === "home") lm.hg++;
          else lm.ag++;

          if (myHasBall) {
            shooter.goals++;
            shooter.rating = clamp(shooter.rating + 1.0, 5.0, 10.0);
            lm.myScorers.push(shooter.name);
            if (assister) {
              assister.assists++;
              assister.rating = clamp(assister.rating + 0.5, 5.0, 10.0);
            }
            lm.goalBanner = { team: myClubName(state), scorer: shooter.name, isMyGoal: true };
            lm.goalBannerTicks = 4;
            lm.logs.unshift({
              min: lm.minute,
              text: `⚽ GOAL!! ${shooter.name}${assister ? ` (도움: ${assister.name})` : ""}의 환상적인 마무리! (${lm.hg}:${lm.ag})`,
              type: "goal",
            });
          } else {
            const oppName = lm.mySide === "home" ? lm.awayName : lm.homeName;
            lm.goalBanner = { team: oppName, scorer: shooter.name, isMyGoal: false };
            lm.goalBannerTicks = 4;
            lm.logs.unshift({
              min: lm.minute,
              text: `🚨 실점... ${oppName} ${shooter.name}의 득점. (${lm.hg}:${lm.ag})`,
              type: "opp-goal",
            });
          }
        } else {
          // Saved by GK
          if (!myHasBall) {
            const myGk = lm.myLineup[0];
            if (myGk) myGk.rating = clamp(myGk.rating + 0.25, 5.0, 10.0);
          }
          lm.logs.unshift({
            min: lm.minute,
            text: `🧤 ${shooter.name}의 날카로운 유효슈팅! 골키퍼가 몸을 날려 선방합니다!`,
            type: "info",
          });
        }
      } else if (eventRoll < 0.09) {
        lm.logs.unshift({
          min: lm.minute,
          text: `💨 ${shooter.name}의 슈팅이 아쉽게 골대를 살짝 벗어납니다.`,
          type: "info",
        });
      }
    } else if (eventRoll > 0.94) {
      // Midfield highlight commentary
      lm.logs.unshift({
        min: lm.minute,
        text: myHasBall
          ? `🔄 ${owner.name} 중심으로 ${TACTICS[state.tactic]?.label} 패스 전개가 이어집니다.`
          : `🛡️ 상대 공세를 수비진이 차분하게 차단합니다.`,
        type: "info",
      });
    }

    lm.logs = lm.logs.slice(0, 60);

    if (lm.minute >= 90) {
      lm.finished = true;
      lm.paused = true;
      lm.halftimeWaiting = false;
      stopLiveTimers();
      lm.logs.unshift({ min: 90, text: `⏱️ 경기 종료! 최종 스코어 ${lm.homeName} ${lm.hg} : ${lm.ag} ${lm.awayName}`, type: "info" });
    }

    if (!silent) {
      updateLiveMatchDOM();
    }
  }

  function myClubName(s) {
    return getBridge()?.r6?.clubMap?.[s.clubId]?.localName || s.clubId;
  }

  function skipLiveToEnd() {
    if (!liveMatch || liveMatch.finished) return;
    stopLiveTimers();
    liveMatch.halftimeDone = true;
    liveMatch.halftimeWaiting = false;
    liveMatch.paused = false;
    while (liveMatch.minute < 90 && !liveMatch.finished) {
      tickLiveMinute(true);
    }
    liveMatch.goalBanner = null;
    updateLiveMatchDOM();
    drawPitchFrame();
  }

  function applyShout(shoutKey) {
    if (!liveMatch || liveMatch.finished) return;
    if (liveMatch.shoutCooldown > 0) {
      showToast(`지시 쿨타임이 ${liveMatch.shoutCooldown}분 남았습니다.`);
      return;
    }
    const sh = SHOUTS[shoutKey];
    if (!sh) return;
    liveMatch.activeShout = shoutKey;
    liveMatch.shoutCooldown = 8;
    liveMatch.logs.unshift({ min: liveMatch.minute, text: `📣 [${sh.label}] ${sh.msg}`, type: "shout" });
    updateLiveMatchDOM();
  }

  function applyHalftimeTalk(mode) {
    if (!liveMatch || !liveMatch.halftimeWaiting) return;
    if (mode === "praise") {
      liveMatch.htBoost = { att: 1.8, def: 1.8 };
      liveMatch.logs.unshift({ min: 45, text: "👏 라커룸 대화: 감독의 따뜻한 격려에 선수들이 힘을 얻었습니다!", type: "shout" });
    } else if (mode === "tactics") {
      liveMatch.htBoost = { att: 2.2, def: 2.2 };
      liveMatch.logs.unshift({ min: 45, text: "📋 라커룸 대화: 세부 전술 지시가 선수들에게 명확히 전달되었습니다.", type: "shout" });
    } else {
      liveMatch.htBoost = { att: 3.4, def: -0.5 };
      liveMatch.logs.unshift({ min: 45, text: "🔥 라커룸 대화: 감독의 불호령! 후반전 공격에 불을 붙입니다!", type: "shout" });
    }
    for (const mp of liveMatch.myLineup) {
      mp.stamina = clamp(mp.stamina + 8, 25, 100);
    }
    liveMatch.halftimeWaiting = false;
    liveMatch.paused = false;
    updateLiveMatchDOM();
    startLiveTimers();
  }

  function makeSubstitution(outPlayerId, inPlayerId) {
    if (!liveMatch || liveMatch.finished) return false;
    if (liveMatch.subsUsed >= liveMatch.maxSubs) {
      showToast("교체 카드(5장)를 모두 사용했습니다.");
      return false;
    }
    const lineIdx = liveMatch.myLineup.findIndex((p) => p.playerId === outPlayerId);
    const outSquad = state.squad.find((p) => p.id === outPlayerId);
    const inSquad = state.squad.find((p) => p.id === inPlayerId);
    if (lineIdx < 0 || !outSquad || !inSquad) return false;

    const prev = liveMatch.myLineup[lineIdx];
    outSquad.starter = false;
    outSquad.stamina = Math.round(prev.stamina);
    inSquad.starter = true;

    liveMatch.subbedHistory.push({
      playerId: prev.playerId,
      goals: prev.goals,
      assists: prev.assists,
      rating: prev.rating,
      stamina: Math.round(prev.stamina),
    });
    liveMatch.subbedOutIds.push(outPlayerId);
    liveMatch.subsUsed++;

    liveMatch.myLineup[lineIdx] = {
      playerId: inSquad.id,
      name: inSquad.name,
      pos: inSquad.pos,
      ovr: inSquad.ovr,
      stamina: inSquad.stamina,
      goals: 0,
      assists: 0,
      rating: 6.5,
      slotIdx: prev.slotIdx,
      x: prev.x,
      y: prev.y,
      tx: prev.tx,
      ty: prev.ty,
    };

    liveMatch.logs.unshift({
      min: liveMatch.minute,
      text: `🔄 선수 교체 (${liveMatch.subsUsed}/5): ${prev.name} OUT ↔ ${inSquad.name} (${inSquad.pos}, OVR ${inSquad.ovr}) IN`,
      type: "shout",
    });
    updateLiveMatchDOM();
    return true;
  }

  function finalizeLiveMatch() {
    if (!liveMatch) return;
    if (!liveMatch.finished) {
      skipLiveToEnd();
    }
    const lm = liveMatch;

    // Commit live player stats back to state.squad
    for (const mp of lm.myLineup) {
      const sp = state.squad.find((x) => x.id === mp.playerId);
      if (sp) {
        sp.apps++;
        sp.goals += mp.goals;
        sp.assists += mp.assists;
        sp.ratingSum += mp.rating;
        sp.stamina = clamp(Math.round(mp.stamina + 6), 25, 100);
      }
    }
    for (const subOut of lm.subbedHistory) {
      const sp = state.squad.find((x) => x.id === subOut.playerId);
      if (sp) {
        sp.apps++;
        sp.goals += subOut.goals;
        sp.assists += subOut.assists;
        sp.ratingSum += subOut.rating;
        sp.stamina = clamp(Math.round(subOut.stamina + 12), 30, 100);
      }
    }
    for (const sp of state.squad) {
      if (!sp.starter && !lm.subbedOutIds.includes(sp.id)) {
        sp.stamina = clamp(sp.stamina + 16, 40, 100);
      }
    }

    applyRoundOutcome(state, {
      hg: lm.hg,
      ag: lm.ag,
      myScorers: lm.myScorers,
    });

    stopLiveTimers();
    liveMatch = null;
    saveState();
    render();
    showToast("실황 경기 결과가 리그에 반영되었습니다!");
  }

  function stepPitchPhysics() {
    if (!liveMatch || liveMatch.paused || liveMatch.halftimeWaiting) return;
    const lm = liveMatch;
    const now = Date.now() * 0.004;

    // Smooth ball movement + 3D parabolic arc physics
    lm.ball.x += (lm.ball.tx - lm.ball.x) * 0.16;
    lm.ball.y += (lm.ball.ty - lm.ball.y) * 0.16;
    lm.ball.z = (lm.ball.z || 0) + (lm.ball.vz || 0);
    lm.ball.vz = (lm.ball.vz || 0) - 0.016;
    if (lm.ball.z <= 0) {
      lm.ball.z = 0;
      lm.ball.vz = Math.abs(lm.ball.vz) > 0.04 ? Math.abs(lm.ball.vz) * 0.42 : 0;
    }

    lm.ball.trail = lm.ball.trail || [];
    lm.ball.trail.push({ x: lm.ball.x, y: lm.ball.y, z: lm.ball.z });
    if (lm.ball.trail.length > 7) lm.ball.trail.shift();

    // Update smooth 3D camera position
    const bwx = (lm.ball.x - 0.5) * 105;
    const bwy = (lm.ball.y - 0.5) * 68;
    let tCam = { x: bwx * 0.42, y: -64, z: 36, lx: bwx * 0.62, ly: bwy * 0.25, lz: 0 };
    if (lm.cameraMode === "zoom3d") {
      tCam = { x: bwx * 0.72, y: bwy * 0.28 - 38, z: 20, lx: bwx * 0.9, ly: bwy * 0.65, lz: 0.9 };
    } else if (lm.cameraMode === "end3d") {
      const dir = lm.mySide === "home" ? 1 : -1;
      tCam = { x: -dir * 74, y: bwy * 0.35, z: 25, lx: bwx * 0.35 + dir * 12, ly: bwy * 0.5, lz: 0.6 };
    }
    if (!lm.cam) lm.cam = { ...tCam };
    for (const k of ["x", "y", "z", "lx", "ly", "lz"]) {
      lm.cam[k] += (tCam[k] - lm.cam[k]) * 0.08;
    }

    const myCoords = getFormationCoords(state.formation);
    const oppCoords = getFormationCoords("4-3-3");
    const ballShift = (lm.ball.x - 0.5) * 0.24;
    const shoutPush = lm.activeShout === "attackAll" ? 0.08 : lm.activeShout === "parkBus" ? -0.08 : 0;

    lm.myLineup.forEach((p, idx) => {
      const base = myCoords[idx] || [0.3, 0.5];
      let targetX = lm.mySide === "home" ? base[0] : 1 - base[0];
      if (idx > 0) {
        targetX += ballShift + (lm.mySide === "home" ? shoutPush : -shoutPush);
      }
      p.tx = clamp(targetX, 0.04, 0.94);
      p.ty = clamp(base[1] + Math.sin(now + idx * 1.7) * 0.025 + (lm.ball.y - 0.5) * (idx === 0 ? 0.05 : 0.14), 0.08, 0.92);
      const nx = p.x + (p.tx - p.x) * 0.1;
      const ny = p.y + (p.ty - p.y) * 0.1;
      p.vx = nx - p.x;
      p.vy = ny - p.y;
      p.x = nx;
      p.y = ny;
    });

    lm.oppLineup.forEach((p, idx) => {
      const base = oppCoords[idx] || [0.3, 0.5];
      let targetX = lm.mySide === "home" ? 1 - base[0] : base[0];
      if (idx > 0) {
        targetX += ballShift;
      }
      p.tx = clamp(targetX, 0.04, 0.94);
      p.ty = clamp(base[1] + Math.cos(now + idx * 1.9) * 0.025 + (lm.ball.y - 0.5) * (idx === 0 ? 0.05 : 0.14), 0.08, 0.92);
      const nx = p.x + (p.tx - p.x) * 0.1;
      const ny = p.y + (p.ty - p.y) * 0.1;
      p.vx = nx - p.x;
      p.vy = ny - p.y;
      p.x = nx;
      p.y = ny;
    });
  }

  function createProjector3D(lm, W, H) {
    const cam = lm.cam || { x: 0, y: -64, z: 36, lx: 0, ly: 0, lz: 0 };
    const norm = (v) => {
      const len = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / len, v[1] / len, v[2] / len];
    };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const fwd = norm([cam.lx - cam.x, cam.ly - cam.y, cam.lz - cam.z]);
    const right = norm(cross(fwd, [0, 0, 1]));
    const up = cross(right, fwd);
    const fov = W * (lm.cameraMode === "zoom3d" ? 1.05 : lm.cameraMode === "end3d" ? 0.88 : 0.92);

    return (wx, wy, wz = 0) => {
      const dx = wx - cam.x;
      const dy = wy - cam.y;
      const dz = wz - cam.z;
      const cx = dx * right[0] + dy * right[1] + dz * right[2];
      const cy = dx * up[0] + dy * up[1] + dz * up[2];
      const cz = dx * fwd[0] + dy * fwd[1] + dz * fwd[2];
      const depth = Math.max(5, cz);
      return {
        sx: W / 2 + (cx / depth) * fov,
        sy: H / 2 - (cy / depth) * fov,
        scale: fov / depth,
        depth: cz,
      };
    };
  }

  function drawPitchFrame() {
    const canvas = document.getElementById("gm-pitch-canvas");
    if (!canvas || !liveMatch) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (liveMatch.cameraMode === "classic2d") {
      drawPitch2D(ctx, canvas.width, canvas.height);
    } else {
      drawPitch3D(ctx, canvas.width, canvas.height);
    }
  }

  function drawPitch3D(ctx, W, H) {
    const lm = liveMatch;
    const proj = createProjector3D(lm, W, H);
    const poly = (pts, fill, stroke, lw = 1.5) => {
      const p2 = pts.map(([x, y, z = 0]) => proj(x, y, z));
      ctx.beginPath();
      p2.forEach((p, i) => (i === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    };
    const line3D = (a, b, stroke = "rgba(255,255,255,0.84)", lw = 1.6) => {
      const pa = proj(a[0], a[1], a[2] || 0);
      const pb = proj(b[0], b[1], b[2] || 0);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
      ctx.stroke();
    };

    // 1. Night stadium sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#090f1d");
    sky.addColorStop(0.45, "#15233c");
    sky.addColorStop(1, "#0d1f16");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stadium floodlight glow
    for (const fx of [W * 0.18, W * 0.82]) {
      const g = ctx.createRadialGradient(fx, 18, 2, fx, 18, 120);
      g.addColorStop(0, "rgba(255,255,235,0.38)");
      g.addColorStop(1, "rgba(255,255,235,0)");
      ctx.fillStyle = g;
      ctx.fillRect(fx - 120, 0, 240, 140);
    }

    // 2. Far-side stadium stand & LED advertising boards
    poly([[-64, 38, 0], [64, 38, 0], [68, 55, 16], [-68, 55, 16]], "#1e293b", "#334155", 1);
    poly([[-56, 36.2, 0], [56, 36.2, 0], [56, 36.2, 2.2], [-56, 36.2, 2.2]], "#0f172a", "#38bdf8", 1.2);
    // Crowd dots on far stand
    for (let i = 0; i < 90; i++) {
      const cx = -60 + ((i * 19.7) % 120);
      const cy = 40 + ((i * 5.3) % 13);
      const cz = 2 + ((cy - 40) * 0.9);
      const cp = proj(cx, cy, cz);
      ctx.fillStyle = i % 3 === 0 ? "#10b981" : i % 3 === 1 ? "#f8fafc" : "#64748b";
      ctx.fillRect(cp.sx - 1.5, cp.sy - 1.5, 3, 2.5);
    }
    // Side stands
    poly([[-64, -38, 0], [-64, 38, 0], [-78, 44, 15], [-78, -44, 15]], "#172030", "#334155", 1);
    poly([[64, -38, 0], [64, 38, 0], [78, 44, 15], [78, -44, 15]], "#172030", "#334155", 1);

    // 3. Outer grass apron & striped pitch
    poly([[-58, -38, 0], [58, -38, 0], [58, 38, 0], [-58, 38, 0]], "#14532d", null);
    const stripes = 12;
    const sw = 105 / stripes;
    for (let i = 0; i < stripes; i++) {
      const x0 = -52.5 + i * sw;
      const x1 = x0 + sw;
      poly([[x0, -34, 0], [x1, -34, 0], [x1, 34, 0], [x0, 34, 0]], i % 2 === 0 ? "#1d6f3b" : "#227e43", null);
    }

    // LED text along far touchline (hidden in end3d so it doesn't overlap midfield)
    const ledMid = proj(0, 36.2, 1.1);
    if (lm.cameraMode !== "end3d" && ledMid.depth > 5) {
      ctx.fillStyle = "#38bdf8";
      ctx.font = `bold ${Math.max(8, Math.round(ledMid.scale * 1.1))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`KICKRU 3D LIVE  •  ${lm.homeName} vs ${lm.awayName}  •  ${lm.compName}`, ledMid.sx, ledMid.sy);
    }

    // 4. Pitch markings (3D projected)
    poly([[-52.5, -34, 0.02], [52.5, -34, 0.02], [52.5, 34, 0.02], [-52.5, 34, 0.02]], null, "rgba(255,255,255,0.86)", 2);
    line3D([0, -34, 0.02], [0, 34, 0.02], "rgba(255,255,255,0.82)", 1.8);

    // Center circle
    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const ang = (i / 28) * Math.PI * 2;
      const p = proj(Math.cos(ang) * 9.15, Math.sin(ang) * 9.15, 0.02);
      if (i === 0) ctx.moveTo(p.sx, p.sy);
      else ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();

    // Penalty boxes & 6-yard boxes
    poly([[-52.5, -20.16, 0.02], [-36, -20.16, 0.02], [-36, 20.16, 0.02], [-52.5, 20.16, 0.02]], null, "rgba(255,255,255,0.82)", 1.6);
    poly([[52.5, -20.16, 0.02], [36, -20.16, 0.02], [36, 20.16, 0.02], [52.5, 20.16, 0.02]], null, "rgba(255,255,255,0.82)", 1.6);
    poly([[-52.5, -9.16, 0.02], [-47, -9.16, 0.02], [-47, 9.16, 0.02], [-52.5, 9.16, 0.02]], null, "rgba(255,255,255,0.75)", 1.3);
    poly([[52.5, -9.16, 0.02], [47, -9.16, 0.02], [47, 9.16, 0.02], [52.5, 9.16, 0.02]], null, "rgba(255,255,255,0.75)", 1.3);

    // 5. 3D Goals helper
    const drawGoal3D = (side) => {
      const gx = side * 52.5;
      const bx = side * 55.2;
      const gw = 4.2;
      const gh = 3.1;
      // Netting sides & roof & back
      poly([[gx, -gw, 0], [bx, -gw, 0], [bx, -gw, gh], [gx, -gw, gh]], "rgba(255,255,255,0.14)", "rgba(255,255,255,0.4)", 1);
      poly([[gx, gw, 0], [bx, gw, 0], [bx, gw, gh], [gx, gw, gh]], "rgba(255,255,255,0.14)", "rgba(255,255,255,0.4)", 1);
      poly([[bx, -gw, 0], [bx, gw, 0], [bx, gw, gh], [bx, -gw, gh]], "rgba(255,255,255,0.18)", "rgba(255,255,255,0.45)", 1);
      poly([[gx, -gw, gh], [bx, -gw, gh], [bx, gw, gh], [gx, gw, gh]], "rgba(255,255,255,0.12)", "rgba(255,255,255,0.35)", 1);
      // Posts & Crossbar
      line3D([gx, -gw, 0], [gx, -gw, gh], "#ffffff", 2.6);
      line3D([gx, gw, 0], [gx, gw, gh], "#ffffff", 2.6);
      line3D([gx, -gw, gh], [gx, gw, gh], "#ffffff", 2.8);
    };

    drawGoal3D(-1);
    drawGoal3D(1);

    // 6. Collect all 22 players + ball & Z-sort (back to front)
    const nowPhase = Date.now() * 0.015;
    const entities = [];
    const pushTeam = (players, isMine) => {
      const teamKey = isMine ? lm.mySide : lm.mySide === "home" ? "away" : "home";
      players.forEach((p, idx) => {
        const wx = (p.x - 0.5) * 105;
        const wy = (p.y - 0.5) * 68;
        const pr = proj(wx, wy, 0);
        entities.push({
          kind: "player",
          p,
          idx,
          isMine,
          isOwner: lm.ball.ownerTeam === teamKey && lm.ball.ownerIdx === idx,
          wx,
          wy,
          pr,
        });
      });
    };
    pushTeam(lm.oppLineup, false);
    pushTeam(lm.myLineup, true);

    const bwx = (lm.ball.x - 0.5) * 105;
    const bwy = (lm.ball.y - 0.5) * 68;
    const bwz = (lm.ball.z || 0) * 12;
    const bGround = proj(bwx, bwy, 0);
    const bAir = proj(bwx, bwy, bwz);
    entities.push({ kind: "ball", bwx, bwy, bwz, bGround, bAir, pr: bAir });

    entities.sort((a, b) => b.pr.depth - a.pr.depth);

    // Ball motion trail
    if (lm.ball.trail && lm.ball.trail.length > 1) {
      ctx.beginPath();
      lm.ball.trail.forEach((pt, idx) => {
        const tp = proj((pt.x - 0.5) * 105, (pt.y - 0.5) * 68, (pt.z || 0) * 12);
        if (idx === 0) ctx.moveTo(tp.sx, tp.sy);
        else ctx.lineTo(tp.sx, tp.sy);
      });
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    for (const item of entities) {
      if (item.pr.depth < 3) continue;
      if (item.kind === "ball") {
        // Ball ground shadow
        const shR = clamp(0.42 * item.bGround.scale, 2.5, 9);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.ellipse(item.bGround.sx, item.bGround.sy, shR * 1.15, shR * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D ball in air
        const r = clamp(0.45 * item.bAir.scale, 3.2, 10);
        const grad = ctx.createRadialGradient(item.bAir.sx - r * 0.3, item.bAir.sy - r * 0.3, r * 0.1, item.bAir.sx, item.bAir.sy, r);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(1, "#cbd5e1");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(item.bAir.sx, item.bAir.sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        const { p, idx, isMine, isOwner, pr } = item;
        const h = clamp(2.85 * pr.scale, 13, 44);
        const w = h * 0.44;
        const sx = pr.sx;
        const sy = pr.sy;

        // Ground shadow
        ctx.fillStyle = "rgba(0,0,0,0.34)";
        ctx.beginPath();
        ctx.ellipse(sx, sy, w * 0.82, w * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();

        // Owner / Stamina ring on grass
        if (isOwner) {
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(sx, sy, w * 1.05, w * 0.46, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (isMine && typeof p.stamina === "number") {
          ctx.strokeStyle = p.stamina > 60 ? "rgba(110,231,183,0.75)" : p.stamina > 40 ? "#fbbf24" : "#f87171";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(sx, sy, w * 0.92, w * 0.4, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.stamina / 100));
          ctx.stroke();
        }

        // Running stride animation
        const spd = Math.min(1, Math.hypot(p.vx || 0, p.vy || 0) * 140);
        const stride = lm.paused ? 0 : Math.sin(nowPhase + idx * 1.3) * (w * 0.38) * Math.max(0.25, spd);

        const kit = idx === 0 ? (isMine ? "#f59e0b" : "#9333ea") : isMine ? "#10b981" : "#ef4444";
        const shorts = isMine ? "#064e3b" : "#7f1d1d";

        // Legs (left & right)
        ctx.strokeStyle = "#f1c27d";
        ctx.lineWidth = Math.max(1.8, w * 0.24);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sx - w * 0.18, sy - h * 0.32);
        ctx.lineTo(sx - w * 0.18 + stride, sy - 1);
        ctx.moveTo(sx + w * 0.18, sy - h * 0.32);
        ctx.lineTo(sx + w * 0.18 - stride, sy - 1);
        ctx.stroke();

        // Shorts
        ctx.fillStyle = idx === 0 ? "#1e293b" : shorts;
        ctx.fillRect(sx - w * 0.38, sy - h * 0.44, w * 0.76, h * 0.16);

        // Arms
        ctx.strokeStyle = kit;
        ctx.lineWidth = Math.max(1.6, w * 0.22);
        ctx.beginPath();
        ctx.moveTo(sx - w * 0.42, sy - h * 0.72);
        ctx.lineTo(sx - w * 0.56, sy - h * 0.48 - stride * 0.6);
        ctx.moveTo(sx + w * 0.42, sy - h * 0.72);
        ctx.lineTo(sx + w * 0.56, sy - h * 0.48 + stride * 0.6);
        ctx.stroke();

        // Jersey Torso
        ctx.fillStyle = kit;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(sx - w * 0.42, sy - h * 0.78, w * 0.84, h * 0.36, 3) : ctx.rect(sx - w * 0.42, sy - h * 0.78, w * 0.84, h * 0.36);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Head + Hair
        const headR = Math.max(2.6, h * 0.13);
        ctx.fillStyle = "#f1c27d";
        ctx.beginPath();
        ctx.arc(sx, sy - h * 0.9, headR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(sx, sy - h * 0.93, headR, Math.PI, Math.PI * 2);
        ctx.fill();

        // Shirt number
        if (h >= 16) {
          ctx.fillStyle = "#fff";
          ctx.font = `bold ${Math.max(8, Math.round(h * 0.25))}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(idx + 1), sx, sy - h * 0.59);
        }

        // Nameplate for ball owner or scorers
        if (isOwner || (isMine && p.goals > 0)) {
          const label = p.name.slice(0, 6) + (p.goals > 0 ? ` ⚽${p.goals}` : "");
          ctx.fillStyle = "rgba(15,23,42,0.82)";
          ctx.fillRect(sx - 26, sy - h - 16, 52, 13);
          ctx.fillStyle = isOwner ? "#fde047" : "#ffffff";
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, sx, sy - h - 9.5);
        }
      }
    }
  }

  function drawPitch2D(ctx, W, H) {
    const pad = 16;
    const pw = W - pad * 2;
    const ph = H - pad * 2;

    const stripes = 10;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#1f6a3a" : "#247641";
      ctx.fillRect((W / stripes) * i, 0, W / stripes + 1, H);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, pw, ph);

    ctx.beginPath();
    ctx.moveTo(W / 2, pad);
    ctx.lineTo(W / 2, H - pad);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(W / 2, H / 2, ph * 0.17, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    const boxW = pw * 0.15;
    const boxH = ph * 0.52;
    const goalW = pw * 0.055;
    const goalH = ph * 0.26;
    ctx.strokeRect(pad, H / 2 - boxH / 2, boxW, boxH);
    ctx.strokeRect(W - pad - boxW, H / 2 - boxH / 2, boxW, boxH);
    ctx.strokeRect(pad, H / 2 - goalH / 2, goalW, goalH);
    ctx.strokeRect(W - pad - goalW, H / 2 - goalH / 2, goalW, goalH);

    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(pad - 6, H / 2 - 26, 6, 52);
    ctx.fillRect(W - pad, H / 2 - 26, 6, 52);

    const drawTeam = (players, isMine) => {
      const color = isMine ? "#10b981" : "#ef4444";
      const gkColor = isMine ? "#f59e0b" : "#9333ea";
      const teamKey = isMine ? liveMatch.mySide : liveMatch.mySide === "home" ? "away" : "home";

      players.forEach((p, idx) => {
        const px = pad + p.x * pw;
        const py = pad + p.y * ph;
        const isOwner = liveMatch.ball.ownerTeam === teamKey && liveMatch.ball.ownerIdx === idx;

        if (isOwner) {
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(px, py, 14, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (isMine && typeof p.stamina === "number") {
          ctx.strokeStyle = p.stamina > 60 ? "#6ee7b7" : p.stamina > 40 ? "#fbbf24" : "#f87171";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, 11.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.stamina / 100));
          ctx.stroke();
        }
        ctx.fillStyle = idx === 0 ? gkColor : color;
        ctx.beginPath();
        ctx.arc(px, py, 9.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(idx + 1), px, py + 0.5);

        if (isOwner || (isMine && p.goals > 0)) {
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          const label = p.name.slice(0, 6) + (p.goals > 0 ? ` ⚽${p.goals}` : "");
          ctx.fillRect(px - 24, py + 12, 48, 12);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 9px sans-serif";
          ctx.fillText(label, px, py + 18);
        }
      });
    };

    drawTeam(liveMatch.oppLineup, false);
    drawTeam(liveMatch.myLineup, true);

    const bx = pad + liveMatch.ball.x * pw;
    const by = pad + liveMatch.ball.y * ph - (liveMatch.ball.z || 0) * 18;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(bx + 2, pad + liveMatch.ball.y * ph + 2, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function renderLiveMatchView(root) {
    const lm = liveMatch;
    const bench = state.squad.filter((p) => !p.starter && !lm.subbedOutIds.includes(p.id));

    root.innerHTML = `
      <div class="gm-shell" style="padding-bottom:24px;">
        <header class="gm-appbar">
          <div class="gm-appbar-left">
            <h1>📺 FM 실황 매치 센터</h1>
            <span class="gm-badge">${escapeHtml(lm.compName)}</span>
          </div>
          <div class="gm-appbar-actions">
            <button type="button" class="gm-btn-sm is-primary" id="gm-live-exit">✅ ${lm.finished ? "경기장 나가기 (결과 반영)" : "스킵 후 결과 반영"}</button>
          </div>
        </header>

        <main class="gm-main">
          <div class="gm-live-header">
            <div class="gm-live-side">
              ${clubLogoHtml(lm.homeClubId, true)}
              <div>
                <b>${escapeHtml(lm.homeName)}</b>
                <div style="font-size:10px;opacity:0.75;">${lm.mySide === "home" ? "🟢 우리 팀 (홈)" : "🔴 상대 팀 (홈)"}</div>
              </div>
            </div>
            <div class="gm-live-center">
              <span class="gm-live-clock" id="gm-lv-clock">${lm.minute}'</span>
              <div class="gm-live-score" id="gm-lv-score">${lm.hg} : ${lm.ag}</div>
            </div>
            <div class="gm-live-side is-away">
              <div>
                <b>${escapeHtml(lm.awayName)}</b>
                <div style="font-size:10px;opacity:0.75;">${lm.mySide === "away" ? "🟢 우리 팀 (원정)" : "🔴 상대 팀 (원정)"}</div>
              </div>
              ${clubLogoHtml(lm.awayClubId, true)}
            </div>
          </div>

          <div class="gm-cam-bar">
            <div class="gm-cam-group">
              <button type="button" class="gm-cam-btn ${lm.cameraMode === "tv3d" ? "is-active" : ""}" data-cam="tv3d">🎥 3D TV 중계</button>
              <button type="button" class="gm-cam-btn ${lm.cameraMode === "zoom3d" ? "is-active" : ""}" data-cam="zoom3d">🦅 3D 다이내믹 줌</button>
              <button type="button" class="gm-cam-btn ${lm.cameraMode === "end3d" ? "is-active" : ""}" data-cam="end3d">🏟️ 3D 골대 뒤</button>
              <button type="button" class="gm-cam-btn ${lm.cameraMode === "classic2d" ? "is-active" : ""}" data-cam="classic2d">📋 2D 전술판</button>
            </div>
            <span class="gm-badge is-blue" id="gm-cam-label">3D 스타디움 엔진</span>
          </div>

          <div class="gm-pitch-wrap">
            <canvas id="gm-pitch-canvas" width="640" height="400"></canvas>
            <div class="gm-goal-banner" id="gm-goal-banner">
              <strong id="gm-gb-title">GOAL!!</strong>
              <span id="gm-gb-sub"></span>
            </div>
            <div class="gm-ht-overlay" id="gm-ht-overlay" style="display:${lm.halftimeWaiting ? "flex" : "none"};">
              <h3>⏸️ 하프타임 라커룸 대화 (45')</h3>
              <p>후반전을 앞두고 선수들에게 어떤 메시지를 전할까요?</p>
              <div class="gm-ht-choices">
                <button type="button" class="gm-btn-sm is-primary" data-ht-talk="praise">👏 전반 잘했다 (안정/사기↑)</button>
                <button type="button" class="gm-btn-sm" style="background:#3182f6;color:#fff;border-color:#3182f6;" data-ht-talk="tactics">📋 전술에 집중하자 (균형↑)</button>
                <button type="button" class="gm-btn-sm" style="background:#e11d48;color:#fff;border-color:#e11d48;" data-ht-talk="thrash">🔥 정신 차려라! (공격력 급상승)</button>
              </div>
            </div>
          </div>

          <div class="gm-live-ticker" id="gm-lv-ticker">
            <span>🎙️</span>
            <span id="gm-lv-ticker-text">${escapeHtml(lm.logs[0]?.text || "")}</span>
          </div>

          <section class="gm-card">
            <div class="gm-speed-bar">
              <div class="gm-speed-group">
                <button type="button" class="gm-mini-btn" id="gm-spd-pause">${lm.paused ? "▶️ 재개" : "⏸ 일시정지"}</button>
                <button type="button" class="gm-mini-btn ${lm.speed === 1 ? "is-active" : ""}" data-speed="1">1x</button>
                <button type="button" class="gm-mini-btn ${lm.speed === 2 ? "is-active" : ""}" data-speed="2">2x</button>
                <button type="button" class="gm-mini-btn ${lm.speed === 4 ? "is-active" : ""}" data-speed="4">4x</button>
                <button type="button" class="gm-mini-btn is-danger" id="gm-spd-skip">⏭ 즉시 종료</button>
              </div>
              <span class="gm-badge" id="gm-lv-shout-cd">${lm.shoutCooldown > 0 ? `지시 대기 ${lm.shoutCooldown}분` : "터치라인 지시 가능"}</span>
            </div>

            <div class="gm-shout-grid">
              ${Object.entries(SHOUTS)
                .map(([k, v]) => `<button type="button" class="gm-mini-btn ${lm.activeShout === k ? "is-active" : ""}" data-shout="${k}">${v.label}</button>`)
                .join("")}
            </div>

            <div class="gm-grid-2">
              <div class="gm-field">
                <label>실시간 포메이션 변경</label>
                <select class="gm-select" id="gm-lv-form">
                  ${Object.entries(FORMATIONS)
                    .map(([k, v]) => `<option value="${k}" ${state.formation === k ? "selected" : ""}>${v.label}</option>`)
                    .join("")}
                </select>
              </div>
              <div class="gm-field">
                <label>실시간 전술 철학 변경</label>
                <select class="gm-select" id="gm-lv-tac">
                  ${Object.entries(TACTICS)
                    .map(([k, v]) => `<option value="${k}" ${state.tactic === k ? "selected" : ""}>${v.label}</option>`)
                    .join("")}
                </select>
              </div>
            </div>
          </section>

          <section class="gm-card">
            <div class="gm-card-head">
              <h3>🔄 실시간 선수 교체 (<span id="gm-lv-sub-count">${lm.subsUsed}</span>/5)</h3>
            </div>
            <div class="gm-grid-3" id="gm-sub-controls">
              <div class="gm-field">
                <label>나갈 선수 (선발)</label>
                <select class="gm-select" id="gm-sub-out">
                  ${lm.myLineup.map((p) => `<option value="${p.playerId}">${escapeHtml(p.name)} (${p.pos} · 체력 ${Math.round(p.stamina)}%)</option>`).join("")}
                </select>
              </div>
              <div class="gm-field">
                <label>들어갈 선수 (벤치)</label>
                <select class="gm-select" id="gm-sub-in">
                  ${bench.length ? bench.map((p) => `<option value="${p.id}">${escapeHtml(p.name)} (${p.pos} · OVR ${p.ovr} · 체력 ${p.stamina}%)</option>`).join("") : `<option value="">교체 가능 선수 없음</option>`}
                </select>
              </div>
              <div class="gm-field" style="justify-content:flex-end;">
                <button type="button" class="gm-btn is-primary" id="gm-sub-exec" style="min-height:38px;" ${bench.length === 0 || lm.subsUsed >= 5 ? "disabled" : ""}>🔄 교체 실행</button>
              </div>
            </div>
          </section>

          <section class="gm-card">
            <div class="gm-card-head"><h3>📊 실시간 경기 기록 & 문자 중계</h3></div>
            <div class="gm-stat-bars" id="gm-lv-stats"></div>
            <div class="gm-commentary-log" id="gm-lv-logs"></div>
          </section>

          <section class="gm-card">
            <div class="gm-card-head"><h3>🟢 우리 팀 출전 선수 실시간 컨디션</h3></div>
            <div class="gm-list" id="gm-lv-lineup"></div>
          </section>
        </main>
      </div>
    `;

    document.getElementById("gm-live-exit").addEventListener("click", finalizeLiveMatch);
    document.getElementById("gm-spd-pause").addEventListener("click", () => {
      if (liveMatch.finished || liveMatch.halftimeWaiting) return;
      liveMatch.paused = !liveMatch.paused;
      updateLiveMatchDOM();
      startLiveTimers();
    });
    root.querySelectorAll("[data-speed]").forEach((btn) => {
      btn.addEventListener("click", () => {
        liveMatch.speed = Number(btn.dataset.speed);
        liveMatch.paused = false;
        updateLiveMatchDOM();
        startLiveTimers();
      });
    });
    document.getElementById("gm-spd-skip").addEventListener("click", skipLiveToEnd);

    root.querySelectorAll("[data-cam]").forEach((btn) => {
      btn.addEventListener("click", () => {
        liveMatch.cameraMode = btn.dataset.cam;
        const bwx = (liveMatch.ball.x - 0.5) * 105;
        const bwy = (liveMatch.ball.y - 0.5) * 68;
        if (liveMatch.cameraMode === "zoom3d") {
          liveMatch.cam = { x: bwx * 0.72, y: bwy * 0.28 - 38, z: 20, lx: bwx * 0.9, ly: bwy * 0.65, lz: 0.9 };
        } else if (liveMatch.cameraMode === "end3d") {
          const dir = liveMatch.mySide === "home" ? 1 : -1;
          liveMatch.cam = { x: -dir * 74, y: bwy * 0.35, z: 25, lx: bwx * 0.35 + dir * 12, ly: bwy * 0.5, lz: 0.6 };
        } else {
          liveMatch.cam = { x: bwx * 0.42, y: -64, z: 36, lx: bwx * 0.62, ly: bwy * 0.25, lz: 0 };
        }
        updateLiveMatchDOM();
        drawPitchFrame();
      });
    });

    root.querySelectorAll("[data-shout]").forEach((btn) => {
      btn.addEventListener("click", () => applyShout(btn.dataset.shout));
    });
    root.querySelectorAll("[data-ht-talk]").forEach((btn) => {
      btn.addEventListener("click", () => applyHalftimeTalk(btn.dataset.htTalk));
    });
    document.getElementById("gm-lv-form").addEventListener("change", (e) => {
      state.formation = e.target.value;
      liveMatch.logs.unshift({ min: liveMatch.minute, text: `📐 포메이션을 ${FORMATIONS[state.formation]?.label}(으)로 변경했습니다.`, type: "shout" });
      updateLiveMatchDOM();
    });
    document.getElementById("gm-lv-tac").addEventListener("change", (e) => {
      state.tactic = e.target.value;
      liveMatch.logs.unshift({ min: liveMatch.minute, text: `🧠 전술을 ${TACTICS[state.tactic]?.label}(으)로 변경했습니다.`, type: "shout" });
      updateLiveMatchDOM();
    });
    document.getElementById("gm-sub-exec").addEventListener("click", () => {
      const outId = document.getElementById("gm-sub-out")?.value;
      const inId = document.getElementById("gm-sub-in")?.value;
      if (outId && inId) makeSubstitution(outId, inId);
    });

    updateLiveMatchDOM();
    drawPitchFrame();
  }

  function updateLiveMatchDOM() {
    const lm = liveMatch;
    if (!lm) return;

    const clockEl = document.getElementById("gm-lv-clock");
    const scoreEl = document.getElementById("gm-lv-score");
    const tickerEl = document.getElementById("gm-lv-ticker-text");
    const exitBtn = document.getElementById("gm-live-exit");
    const pauseBtn = document.getElementById("gm-spd-pause");
    const shoutCdEl = document.getElementById("gm-lv-shout-cd");
    const htOverlay = document.getElementById("gm-ht-overlay");
    const goalBanner = document.getElementById("gm-goal-banner");

    if (clockEl) clockEl.textContent = lm.finished ? "FT (90')" : lm.halftimeWaiting ? "HT (45')" : `${lm.minute}'`;
    if (scoreEl) scoreEl.textContent = `${lm.hg} : ${lm.ag}`;
    if (tickerEl) tickerEl.textContent = lm.logs[0]?.text || "";
    if (exitBtn) exitBtn.textContent = lm.finished ? "✅ 경기장 나가기 (결과 반영)" : "⏭️ 스킵 후 결과 반영";
    if (pauseBtn) pauseBtn.textContent = lm.paused ? "▶️ 재개" : "⏸ 일시정지";
    if (shoutCdEl) shoutCdEl.textContent = lm.shoutCooldown > 0 ? `지시 대기 ${lm.shoutCooldown}분` : "터치라인 지시 가능";
    if (htOverlay) htOverlay.style.display = lm.halftimeWaiting ? "flex" : "none";

    if (goalBanner) {
      if (lm.goalBanner) {
        goalBanner.classList.add("is-show");
        document.getElementById("gm-gb-title").textContent = lm.goalBanner.isMyGoal ? "⚽ GOAL!!" : "🚨 실점";
        document.getElementById("gm-gb-sub").textContent = `${lm.goalBanner.team} · ${lm.goalBanner.scorer}`;
      } else {
        goalBanner.classList.remove("is-show");
      }
    }

    document.querySelectorAll("[data-cam]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.cam === lm.cameraMode);
    });
    const camLbl = document.getElementById("gm-cam-label");
    if (camLbl) {
      camLbl.textContent = lm.cameraMode === "classic2d" ? "2D 클래식 전술판" : "3D 스타디움 엔진";
    }
    document.querySelectorAll("[data-speed]").forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.dataset.speed) === lm.speed);
    });
    document.querySelectorAll("[data-shout]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.shout === lm.activeShout);
    });

    // Stats bars
    const statsEl = document.getElementById("gm-lv-stats");
    if (statsEl) {
      const totPoss = Math.max(1, lm.stats.possHome + lm.stats.possAway);
      const pHome = Math.round((lm.stats.possHome / totPoss) * 100);
      const pAway = 100 - pHome;
      const totShots = Math.max(1, lm.stats.shotsHome + lm.stats.shotsAway);
      const sHomePct = Math.round((lm.stats.shotsHome / totShots) * 100);
      const totXg = Math.max(0.01, lm.stats.xgHome + lm.stats.xgAway);
      const xHomePct = Math.round((lm.stats.xgHome / totXg) * 100);

      statsEl.innerHTML = `
        <div class="gm-stat-bar-row">
          <div class="gm-stat-bar-nums"><span>${pHome}%</span><span>점유율</span><span>${pAway}%</span></div>
          <div class="gm-stat-bar-track"><div class="gm-stat-bar-home" style="width:${pHome}%"></div><div class="gm-stat-bar-away" style="width:${pAway}%"></div></div>
        </div>
        <div class="gm-stat-bar-row">
          <div class="gm-stat-bar-nums"><span>${lm.stats.shotsHome} (${lm.stats.onTargetHome})</span><span>슈팅 (유효)</span><span>${lm.stats.shotsAway} (${lm.stats.onTargetAway})</span></div>
          <div class="gm-stat-bar-track"><div class="gm-stat-bar-home" style="width:${sHomePct}%"></div><div class="gm-stat-bar-away" style="width:${100 - sHomePct}%"></div></div>
        </div>
        <div class="gm-stat-bar-row">
          <div class="gm-stat-bar-nums"><span>${lm.stats.xgHome.toFixed(2)}</span><span>기대 득점 (xG)</span><span>${lm.stats.xgAway.toFixed(2)}</span></div>
          <div class="gm-stat-bar-track"><div class="gm-stat-bar-home" style="width:${xHomePct}%"></div><div class="gm-stat-bar-away" style="width:${100 - xHomePct}%"></div></div>
        </div>
      `;
    }

    // Logs
    const logsEl = document.getElementById("gm-lv-logs");
    if (logsEl) {
      logsEl.innerHTML = lm.logs
        .map((l) => {
          const cls = l.type === "goal" ? "is-goal" : l.type === "opp-goal" ? "is-opp-goal" : l.type === "shout" ? "is-shout" : "";
          return `<div class="gm-comm-item ${cls}"><b>${l.min}'</b> ${escapeHtml(l.text)}</div>`;
        })
        .join("");
    }

    // Substitution dropdown refresh
    const subCntEl = document.getElementById("gm-lv-sub-count");
    if (subCntEl) subCntEl.textContent = String(lm.subsUsed);
    const subOutSel = document.getElementById("gm-sub-out");
    const subInSel = document.getElementById("gm-sub-in");
    const subExecBtn = document.getElementById("gm-sub-exec");
    if (subOutSel && subInSel && subExecBtn) {
      const prevOut = subOutSel.value;
      const prevIn = subInSel.value;
      const bench = state.squad.filter((p) => !p.starter && !lm.subbedOutIds.includes(p.id));
      subOutSel.innerHTML = lm.myLineup
        .map((p) => `<option value="${p.playerId}">${escapeHtml(p.name)} (${p.pos} · 체력 ${Math.round(p.stamina)}%)</option>`)
        .join("");
      if (lm.myLineup.some((p) => p.playerId === prevOut)) subOutSel.value = prevOut;
      subInSel.innerHTML = bench.length
        ? bench.map((p) => `<option value="${p.id}">${escapeHtml(p.name)} (${p.pos} · OVR ${p.ovr} · 체력 ${p.stamina}%)</option>`).join("")
        : `<option value="">교체 가능 선수 없음</option>`;
      if (bench.some((p) => p.id === prevIn)) subInSel.value = prevIn;
      subExecBtn.disabled = bench.length === 0 || lm.subsUsed >= lm.maxSubs || lm.finished;
    }

    // Lineup list
    const lineupEl = document.getElementById("gm-lv-lineup");
    if (lineupEl) {
      lineupEl.innerHTML = lm.myLineup
        .map((p) => {
          const grp = POS_GROUP[p.pos];
          const posCls = grp === "GK" ? "is-gk" : grp === "DEF" ? "is-def" : grp === "ATT" ? "is-att" : "";
          return `
            <div class="gm-list-item is-starter">
              <div class="gm-player-main">
                <span class="gm-pos-tag ${posCls}">${p.pos}</span>
                <div class="gm-ovr-pill">${p.ovr}</div>
                <div class="gm-player-info">
                  <div class="gm-player-name">${escapeHtml(p.name)} ${p.goals ? `<span class="gm-badge">⚽ ${p.goals}</span>` : ""} ${p.assists ? `<span class="gm-badge is-blue">🅰️ ${p.assists}</span>` : ""}</div>
                  <div class="gm-player-sub">체력 ${Math.round(p.stamina)}% · 실시간 평점 ${p.rating.toFixed(1)}</div>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    }
  }

  function ensureManagerDOM() {
    if (!document.body) return null;
    let gmRoot = document.getElementById("gm-root");
    if (!gmRoot) {
      gmRoot = document.createElement("div");
      gmRoot.id = "gm-root";
      document.body.appendChild(gmRoot);
    }

    let fab = document.getElementById("gm-fab-mode");
    if (!fab) {
      fab = document.createElement("button");
      fab.type = "button";
      fab.id = "gm-fab-mode";
      fab.className = "gm-fab-mode";
      fab.textContent = "👔 감독 모드";
      fab.title = "내가 감독이 되어 구단 육성하기";
      fab.addEventListener("click", enterManagerMode);
      document.body.appendChild(fab);
    }
    fab.style.display = document.body.classList.contains("is-manager-mode") ? "none" : "inline-flex";
    return gmRoot;
  }

  function enterManagerMode() {
    if (!getBridge()?.r6) {
      alert("구단 데이터를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (!state) state = loadState();
    document.body.classList.add("is-manager-mode");
    ensureManagerDOM();
    render();
    if (liveMatch && !liveMatch.finished && !liveMatch.paused) {
      startLiveTimers();
    }
  }

  function exitManagerMode() {
    stopLiveTimers();
    document.body.classList.remove("is-manager-mode");
    ensureManagerDOM();
  }

  function mountModeButtons() {
    const actions = document.querySelector(".t-appbar-actions");
    if (actions && !document.getElementById("gm-topbar-btn")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "gm-topbar-btn";
      btn.className = "gm-mode-btn";
      btn.textContent = "👔 감독 모드";
      btn.title = "구단 감독 모드로 전환";
      btn.addEventListener("click", enterManagerMode);
      actions.insertBefore(btn, actions.firstChild);
    }
  }

  function mountAllAfterHydration() {
    ensureManagerDOM();
    mountModeButtons();
    if (!mountAllAfterHydration._observing) {
      mountAllAfterHydration._observing = true;
      const observer = new MutationObserver(() => {
        ensureManagerDOM();
        mountModeButtons();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function init() {
    window.__KICKRU_MANAGER__ = {
      enter: enterManagerMode,
      exit: exitManagerMode,
      getState: () => state,
      loadCareerState,
      saveState,
      getLiveMatch: () => liveMatch,
      startLiveMatch,
      skipLiveToEnd,
      finalizeLiveMatch,
      buildNewCareer,
      playOneRound,
      finishSeason,
      startNextSeason,
      generateMarketPool,
      computeTeamStats,
    };

    const tryMount = () => {
      if (window.__KICKRU_BRIDGE__ && document.querySelector(".t-appbar-actions")) {
        // Wait one animation frame after React mounts to avoid hydration mismatch
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(() => mountAllAfterHydration());
        } else {
          mountAllAfterHydration();
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
        mountAllAfterHydration();
      }, 4000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
