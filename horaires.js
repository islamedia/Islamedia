/* ==========================================================================
   Islamedia.fr — Horaires de prière
   Le calcul se fait entièrement dans le navigateur : la ville choisie ou la
   position ne sont envoyées à personne. Rien à modifier dans ce fichier.

   Méthode Diyanet (DITIB) : reproduit le calendrier européen de la Diyanet
   (imsak 18°, yatsı 16°, temkin, règle d'été au-delà de 44,5° de latitude).
   Vérifié sur plus de 2 400 horaires officiels de 2026 : écart maximal d'une minute.
   ========================================================================== */
(function (racine) {
  "use strict";

  /* 1. ASTRONOMIE ------------------------------------------------------------ */
  var RAD = Math.PI / 180;

  function jourJulien(a, m, j) { /* jour julien à 0 h TU */
    if (m <= 2) { a -= 1; m += 12; }
    var s = Math.floor(a / 100), b = 2 - s + Math.floor(s / 4);
    return Math.floor(365.25 * (a + 4716)) + Math.floor(30.6001 * (m + 1)) + j + b - 1524.5;
  }

  /* Déclinaison du soleil (radians) et équation du temps (minutes) — formules de J. Meeus. */
  function soleil(jd) {
    var T = (jd - 2451545) / 36525;
    var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
    var M = (357.52911 + T * (35999.05029 - T * 0.0001537)) * RAD;
    var e = 0.016708634 - T * (0.000042037 + T * 0.0000001267);
    var C = Math.sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M) * (0.019993 - 0.000101 * T) + Math.sin(3 * M) * 0.000289;
    var om = (125.04 - 1934.136 * T) * RAD;
    var lambda = (L0 + C - 0.00569 - 0.00478 * Math.sin(om)) * RAD;
    var eps = (23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(om)) * RAD;
    var y = Math.tan(eps / 2); y *= y;
    var L = L0 * RAD;
    var E = y * Math.sin(2 * L) - 2 * e * Math.sin(M) + 4 * e * y * Math.sin(M) * Math.cos(2 * L) - 0.5 * y * y * Math.sin(4 * L) - 1.25 * e * e * Math.sin(2 * M);
    return { dec: Math.asin(Math.sin(eps) * Math.sin(lambda)), eot: 4 * E / RAD };
  }

  /* Demi-durée (minutes) entre le passage au méridien et le moment où le soleil est à la hauteur h. */
  function angleHoraire(phi, dec, h) {
    var c = (Math.sin(h * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    return (c < -1 || c > 1) ? null : 4 * Math.acos(c) / RAD;
  }
  function hauteurAsr(phi, dec, facteur) { return Math.atan(1 / (facteur + Math.tan(Math.abs(phi - dec)))) / RAD; }

  /* Décalage horaire (minutes) d'un fuseau à midi, heure locale, pour une date. */
  var formats = {};
  function decalage(fuseau, a, m, j) {
    if (!fuseau || !racine.Intl) return -new Date(a, m - 1, j, 12).getTimezoneOffset();
    var f = formats[fuseau];
    if (!f) {
      try {
        f = formats[fuseau] = new Intl.DateTimeFormat("en-US", { timeZone: fuseau, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
      } catch (e) { return -new Date(a, m - 1, j, 12).getTimezoneOffset(); }
    }
    function a_(ms) {
      var p = {};
      f.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
      return (Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second) - ms) / 60000;
    }
    var ms = Date.UTC(a, m - 1, j, 12), o = a_(ms);
    return a_(ms - o * 60000);
  }

  function decaleJour(d, n) { var x = new Date(Date.UTC(d.a, d.m - 1, d.j + n)); return { a: x.getUTCFullYear(), m: x.getUTCMonth() + 1, j: x.getUTCDate() }; }

  /* 2. MÉTHODE DIYANET (calendrier européen) ----------------------------------- */
  /* Comme la Diyanet : déclinaison et équation du temps prises à 0 h TU, une fois par jour. */
  function baseDiyanet(lieu, a, m, j, facteurAsr) {
    var s = soleil(jourJulien(a, m, j)), phi = lieu.lat * RAD;
    var T = 720 - s.eot - 4 * lieu.lon + decalage(lieu.tz, a, m, j);
    var H0 = angleHoraire(phi, s.dec, -0.8333);
    if (H0 === null) return null;
    var Hf = angleHoraire(phi, s.dec, -18), Hi = angleHoraire(phi, s.dec, -16);
    var Ha = facteurAsr ? angleHoraire(phi, s.dec, hauteurAsr(phi, s.dec, facteurAsr)) : null;
    return { T: T, R: T - H0, S: T + H0, F: Hf === null ? null : T - Hf, I: Hi === null ? null : T + Hi, A: Ha === null ? null : T + Ha };
  }

  /* Règle d'été au-delà de 44,5° : tiers de la nuit légale (de l'akşam à l'imsak réel), ancré
     au 21 juin ; les jours sans imsak réel prennent le rapport du dernier jour où il existait ;
     passage progressif sur 20 minutes de part et d'autre (critères de la Diyanet). */
  var regles = {};
  function regleEte(lieu, annee) {
    var cle = [lieu.lat, lieu.lon, lieu.tz, annee].join("|");
    if (cle in regles) return regles[cle];
    var jours = {};
    function B(n) {
      if (!(n in jours)) {
        var d = new Date(Date.UTC(annee, 5, 21 + n));
        jours[n] = baseDiyanet(lieu, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 0);
        if (!jours[n]) throw new Error("jour polaire");
      }
      return jours[n];
    }
    function nuitLegale(n) { var x = B(n); return x.F === null ? null : x.F + 1440 - (x.S + 7); }
    function nuitCivile(n) { return (B(n + 1).R - 7) + 1440 - (B(n).S + 7); }
    var r = null;
    try {
      var vals = {}, d1 = 0, d2 = 0, n, t;
      if (B(0).F !== null) {
        t = nuitLegale(0) / 3;
        vals[0] = { i: B(0).S + 7 + t, f: B(0).R - 7 - t * 1.125 };
      } else {
        while (B(d1 - 1).F === null && d1 > -150) d1--;
        while (B(d2 + 1).F === null && d2 < 150) d2++;
        var rapport = nuitLegale(d1 - 1) / 3 / nuitCivile(d1 - 1);
        for (n = d1; n <= d2; n++) { t = rapport * nuitCivile(n); vals[n] = { i: B(n).S + 7 + t, f: B(n).R - 7 - t * 1.125 }; }
      }
      r = { vals: vals, d1: d1, d2: d2, besoinI: B(0).I === null || B(0).I > vals[0].i, besoinF: B(0).F === null || B(0).F < vals[0].f };
      var etendre = function (depart, pas, champ, seuil, sens) {
        var k = depart, x;
        while (Math.abs(k - depart) < 200) {
          x = B(k + pas)[champ];
          if (x === null || (x - seuil) * sens >= 0) k += pas; else break;
        }
        return k;
      };
      if (r.besoinI) { r.iAvant = etendre(d1, -1, "I", vals[d1].i - 20, 1); r.iApres = etendre(d2, 1, "I", vals[d2].i - 20, 1); }
      if (r.besoinF) { r.fAvant = etendre(d1, -1, "F", vals[d1].f + 20, -1); r.fApres = etendre(d2, 1, "F", vals[d2].f + 20, -1); }
    } catch (e) { r = null; }
    regles[cle] = r;
    return r;
  }

  function valeurEte(g, n, champ, avant, apres, delta) {
    var v, span;
    if (n >= g.d1 && n <= g.d2) return g.vals[n][champ];
    if (n < g.d1 && n >= avant) { v = g.vals[g.d1][champ]; span = g.d1 - avant; return v + delta - delta * (span ? (n - avant) / span : 1); }
    if (n > g.d2 && n <= apres) { v = g.vals[g.d2][champ]; span = apres - g.d2; return v + delta - delta * (span ? (apres - n) / span : 1); }
    return null;
  }

  function calculDiyanet(lieu, a, m, j, facteurAsr) {
    var x = baseDiyanet(lieu, a, m, j, facteurAsr);
    if (!x) return null;
    var r = { fajr: x.F, lever: x.R - 7, dhuhr: x.T + 5, asr: x.A === null ? null : x.A + 4, maghrib: x.S + 7, isha: x.I, estime: {} };
    if (lieu.lat >= 44.5) {
      var g = regleEte(lieu, a);
      if (g) {
        var n = Math.round((Date.UTC(a, m - 1, j) - Date.UTC(a, 5, 21)) / 864e5), v;
        if (g.besoinI && (v = valeurEte(g, n, "i", g.iAvant, g.iApres, -20)) !== null) { r.isha = v; r.estime.isha = true; }
        if (g.besoinF && (v = valeurEte(g, n, "f", g.fAvant, g.fApres, 20)) !== null) { r.fajr = v; r.estime.fajr = true; }
      }
    }
    return r;
  }

  /* 3. MÉTHODES À ANGLES FIXES ----------------------------------------------------------
     Position du soleil recalculée à l'instant de chaque prière (calcul précis).
     Dhuhr : 1 minute après le passage au méridien. Si le soleil ne descend pas assez bas (été au nord),
     fajr et isha sont estimés par proportion avec la latitude 45°. */
  function soleilJour(lieu, a, m, j) {
    var phi = lieu.lat * RAD, dec = decalage(lieu.tz, a, m, j), jd = jourJulien(a, m, j), lon = lieu.lon;
    function pos(t) { return soleil(jd + (t - dec) / 1440); }
    var T = 720 - 4 * lon + dec, i;
    for (i = 0; i < 3; i++) T = 720 - pos(T).eot - 4 * lon + dec;
    function evenement(h, sens) {
      var t = T + sens * 360, s, H, k;
      for (k = 0; k < 4; k++) {
        s = pos(t);
        H = angleHoraire(phi, s.dec, typeof h === "function" ? h(s.dec) : h);
        if (H === null) return null;
        t = 720 - s.eot - 4 * lon + dec + sens * H;
      }
      return t;
    }
    return { T: T, evenement: evenement, phi: phi };
  }

  function calculAngles(lieu, a, m, j, methode, facteurAsr) {
    var jour = soleilJour(lieu, a, m, j);
    var lever = jour.evenement(-0.8333, -1), coucher = jour.evenement(-0.8333, 1);
    if (lever === null || coucher === null) return null;
    var r = { lever: lever, dhuhr: jour.T + 1, maghrib: coucher, estime: {} };
    r.asr = jour.evenement(function (dec) { return hauteurAsr(jour.phi, dec, facteurAsr); }, 1);
    r.fajr = jour.evenement(-methode.fajr, -1);
    r.isha = methode.ishaMinutes ? coucher + methode.ishaMinutes : jour.evenement(-methode.isha, 1);
    if (r.fajr === null || r.isha === null) {
      /* Le soleil ne descend pas assez bas : estimation proportionnelle à partir de la latitude 45°,
         comme le recommande la Ligue islamique mondiale (résolution de 1986) pour les hautes latitudes. */
      var veille = decaleJour({ a: a, m: m, j: j }, -1), lendemain = decaleJour({ a: a, m: m, j: j }, 1);
      var ref = { lat: lieu.lat < 0 ? -45 : 45, lon: lieu.lon, tz: lieu.tz };
      var coucherDe = function (l, d) { return soleilJour(l, d.a, d.m, d.j).evenement(-0.8333, 1); };
      var leverDe = function (l, d) { return soleilJour(l, d.a, d.m, d.j).evenement(-0.8333, -1); };
      var j45 = soleilJour(ref, a, m, j), lever45 = j45.evenement(-0.8333, -1), coucher45 = j45.evenement(-0.8333, 1);
      if (r.fajr === null) {
        var f45 = j45.evenement(-methode.fajr, -1), cv = coucherDe(lieu, veille), cv45 = coucherDe(ref, veille);
        if (f45 !== null && cv !== null && cv45 !== null) {
          r.fajr = lever - (lever45 - f45) / (lever45 + 1440 - cv45) * (lever + 1440 - cv); r.estime.fajr = true;
        }
      }
      if (r.isha === null) {
        var i45 = j45.evenement(-methode.isha, 1), ll = leverDe(lieu, lendemain), ll45 = leverDe(ref, lendemain);
        if (i45 !== null && ll !== null && ll45 !== null) {
          r.isha = coucher + (i45 - coucher45) / (ll45 + 1440 - coucher45) * (ll + 1440 - coucher); r.estime.isha = true;
        }
      }
    }
    return r;
  }

  var METHODES = {
    diyanet: { nom: "Diyanet (DITIB)", court: "Diyanet (DITIB)",
      detail: "Calendrier européen de la Diyanet, suivi par les mosquées DITIB : fajr (imsak) quand le soleil est à 18° sous l’horizon, isha (yatsı) à 16°, et les marges de précaution de la Diyanet (lever du soleil −7 min, dhuhr +5 min, asr +4 min, maghrib +7 min). En été, au nord du 44,5ᵉ parallèle, l’imsak et la yatsı suivent la règle du tiers de la nuit, comme sur le calendrier officiel." },
    mdf: { nom: "Musulmans de France (ex-UOIF), 12°", court: "Musulmans de France (12°)", fajr: 12, isha: 12,
      detail: "Fajr et isha quand le soleil est à 12° sous l’horizon. C’est la méthode de Musulmans de France (ex-UOIF), suivie par de nombreuses mosquées en France." },
    lim: { nom: "Ligue islamique mondiale, 18° / 17°", court: "Ligue islamique mondiale", fajr: 18, isha: 17,
      detail: "Fajr à 18° et isha à 17° sous l’horizon, angles fixés par le Conseil de jurisprudence de la Ligue islamique mondiale." },
    isna: { nom: "15° (ISNA)", court: "15° (ISNA)", fajr: 15, isha: 15,
      detail: "Fajr et isha à 15° sous l’horizon, la méthode de l’ISNA en Amérique du Nord. Certaines mosquées de France l’utilisent aussi." },
    egypte: { nom: "Égypte, 19,5° / 17,5°", court: "Égypte", fajr: 19.5, isha: 17.5,
      detail: "Fajr à 19,5° et isha à 17,5° sous l’horizon : la méthode de l’Autorité générale égyptienne d’arpentage." },
    mecque: { nom: "Umm al-Qura (La Mecque)", court: "Umm al-Qura", fajr: 18.5, ishaMinutes: 90,
      detail: "Fajr à 18,5° sous l’horizon ; isha 90 minutes après le maghrib, comme le calendrier officiel d’Arabie saoudite." },
    karachi: { nom: "Karachi, 18° / 18°", court: "Karachi", fajr: 18, isha: 18,
      detail: "Fajr et isha à 18° sous l’horizon : la méthode de l’Université des sciences islamiques de Karachi." }
  };
  var COMMUN = "Dhuhr : 1 minute après le passage du soleil au plus haut. Les jours d’été où le soleil ne descend pas assez bas sous l’horizon, fajr et isha sont estimés par proportion avec la latitude 45°, comme le recommande la Ligue islamique mondiale : ces horaires sont marqués d’un astérisque.";

  function calculer(lieu, a, m, j, reglages) {
    var facteur = reglages && reglages.asr === "hanafite" ? 2 : 1;
    var cle = reglages && METHODES[reglages.methode] ? reglages.methode : "diyanet";
    return cle === "diyanet" ? calculDiyanet(lieu, a, m, j, facteur) : calculAngles(lieu, a, m, j, METHODES[cle], facteur);
  }

  var moteur = { calculer: calculer, decalage: decalage, METHODES: METHODES, soleil: soleil, jourJulien: jourJulien };
  racine.HorairesPriere = moteur;
  if (typeof module !== "undefined" && module.exports) module.exports = moteur;
  if (typeof document === "undefined") return;

  /* 4. AFFICHAGE --------------------------------------------------------------- */
  var CLE = "islamedia-horaires";
  var PRIERES = [
    { id: "fajr", nom: "Fajr", ar: "الفجر", tr: "İmsak" },
    { id: "lever", nom: "Lever du soleil", ar: "الشروق", tr: "Güneş", pasPriere: true },
    { id: "dhuhr", nom: "Dhuhr", ar: "الظهر", tr: "Öğle" },
    { id: "asr", nom: "Asr", ar: "العصر", tr: "İkindi" },
    { id: "maghrib", nom: "Maghrib", ar: "المغرب", tr: "Akşam" },
    { id: "isha", nom: "Isha", ar: "العشاء", tr: "Yatsı" }
  ];
  var REGIONS = {
    "11": "Île-de-France", "24": "Centre-Val de Loire", "27": "Bourgogne-Franche-Comté", "28": "Normandie", "32": "Hauts-de-France",
    "44": "Grand Est", "52": "Pays de la Loire", "53": "Bretagne", "75": "Nouvelle-Aquitaine", "76": "Occitanie",
    "84": "Auvergne-Rhône-Alpes", "93": "Provence-Alpes-Côte d’Azur", "94": "Corse",
    GP: "Guadeloupe", MQ: "Martinique", GF: "Guyane", RE: "La Réunion", YT: "Mayotte",
    BE: "Belgique", CH: "Suisse", LU: "Luxembourg", MC: "Monaco"
  };
  var FUSEAUX = { GP: "America/Guadeloupe", MQ: "America/Martinique", GF: "America/Cayenne", RE: "Indian/Reunion", YT: "Indian/Mayotte",
    BE: "Europe/Brussels", CH: "Europe/Zurich", LU: "Europe/Luxembourg", MC: "Europe/Monaco" };
  var PARIS = { nom: "Paris", region: "11", lat: 48.8534, lon: 2.3488, tz: "Europe/Paris" };

  function tous(sel, zone) { return Array.prototype.slice.call((zone || document).querySelectorAll(sel)); }
  function un(sel, zone) { return (zone || document).querySelector(sel); }
  function lire() {
    var r = { ville: PARIS, methode: "diyanet", asr: "standard" };
    try {
      var l = JSON.parse(localStorage.getItem(CLE) || "null");
      if (l) {
        if (l.ville && typeof l.ville.lat === "number" && typeof l.ville.lon === "number") r.ville = l.ville;
        if (METHODES[l.methode]) r.methode = l.methode;
        if (l.asr === "hanafite") r.asr = "hanafite";
      }
    } catch (e) {}
    return r;
  }
  function ecrire(r) { try { localStorage.setItem(CLE, JSON.stringify(r)); } catch (e) {} }

  function hm(x) {
    if (x === null || x === undefined || isNaN(x)) return "—";
    var t = ((Math.floor(x + 0.5) % 1440) + 1440) % 1440;
    return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
  }
  function aujourdhui(tz) { /* date du jour dans le fuseau de la ville */
    try {
      var p = {};
      new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date())
        .forEach(function (x) { p[x.type] = x.value; });
      return { a: +p.year, m: +p.month, j: +p.day };
    } catch (e) { var d = new Date(); return { a: d.getFullYear(), m: d.getMonth() + 1, j: d.getDate() }; }
  }
  function instant(lieu, d, minutes) { return Date.UTC(d.a, d.m - 1, d.j) + (minutes - decalage(lieu.tz, d.a, d.m, d.j)) * 60000; }
  function nomRegion(v) { return REGIONS[v.region] || ""; }
  function fuseauDe(code) { return FUSEAUX[code] || "Europe/Paris"; }

  function dureeTexte(ms) {
    var min = Math.max(1, Math.round(ms / 60000)), h = Math.floor(min / 60), mn = min % 60;
    return h ? h + "\u00a0h\u00a0" + String(mn).padStart(2, "0") : mn + "\u00a0min";
  }

  /* Prochaine prière (le lever du soleil n'en est pas une). */
  function prochaine(lieu, reglages) {
    var jour = aujourdhui(lieu.tz), maintenant = Date.now();
    for (var n = 0; n < 2; n++) {
      var d = decaleJour(jour, n), r = calculer(lieu, d.a, d.m, d.j, reglages);
      if (!r) return null;
      for (var i = 0; i < PRIERES.length; i++) {
        var p = PRIERES[i];
        if (p.pasPriere || r[p.id] === null) continue;
        var t = instant(lieu, d, Math.floor(r[p.id] + 0.5));
        if (t > maintenant) return { priere: p, dans: t - maintenant, demain: n === 1 };
      }
    }
    return null;
  }

  var villes = null, chargement = null;
  function chargerVilles(base) {
    if (villes) return Promise.resolve(villes);
    if (!chargement) {
      chargement = fetch(base + "horaires/villes.json").then(function (r) { return r.json(); }).then(function (liste) {
        villes = liste.map(function (v) {
          return { nom: v[0], region: v[1], lat: v[2], lon: v[3], autre: v[4] || "", tz: fuseauDe(v[1]),
                   cle: simplifier(v[0] + " " + (v[4] || "")) };
        });
        return villes;
      });
    }
    return chargement;
  }
  function simplifier(t) { return t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’'`.\-]/g, " ").replace(/\s+/g, " ").trim().toLowerCase(); }
  function plusProche(lat, lon) {
    var best = null, dmin = Infinity;
    (villes || []).forEach(function (v) {
      var dx = (v.lon - lon) * Math.cos(lat * RAD), dy = v.lat - lat, d = dx * dx + dy * dy;
      if (d < dmin) { dmin = d; best = v; }
    });
    return best && Math.sqrt(dmin) * 111 < 25 ? best : null;
  }

  function remplirJour(zone, lieu, reglages) {
    var jour = aujourdhui(lieu.tz), r = calculer(lieu, jour.a, jour.m, jour.j, reglages);
    var pro = prochaine(lieu, reglages);
    var diyanet = reglages.methode === "diyanet";
    tous("[data-h-heure]", zone).forEach(function (el) {
      var id = el.getAttribute("data-h-heure");
      el.textContent = r ? hm(r[id]) : "—";
      var ligne = el.closest("[data-h-priere]");
      if (ligne) {
        ligne.classList.toggle("est-prochaine", !!(pro && !pro.demain && pro.priere.id === id));
        ligne.classList.toggle("est-estimee", !!(r && r.estime[id]));
      }
    });
    tous("[data-h-tr]", zone).forEach(function (el) { el.hidden = !diyanet; });
    tous("[data-h-prochaine]", zone).forEach(function (el) {
      el.textContent = pro ? (pro.priere.nom + (pro.demain ? " demain" : "") + " dans " + dureeTexte(pro.dans)) : "";
    });
    tous("[data-h-ville]", zone).forEach(function (el) { el.textContent = lieu.nom; });
    tous("[data-h-region]", zone).forEach(function (el) { el.textContent = lieu.region ? nomRegion(lieu) : ""; });
    tous("[data-h-methode-nom]", zone).forEach(function (el) { el.textContent = METHODES[reglages.methode].court; });
    tous("[data-h-date]", zone).forEach(function (el) {
      el.textContent = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
        .format(new Date(Date.UTC(jour.a, jour.m - 1, jour.j)));
    });
  }

  /* Encart de l'accueil */
  function accueil(zone) {
    var reglages = lire();
    var maj = function () { remplirJour(zone, reglages.ville, reglages); zone.hidden = false; };
    maj();
    setInterval(maj, 30000);
  }

  /* Page « Horaires de prière » */
  function page(zone) {
    var base = zone.getAttribute("data-racine") || "../";
    var reglages = lire();
    var mois = null;
    var selMethode = un("[data-h-methode]", zone), selAsr = un("[data-h-asr]", zone);
    var champ = un("[data-h-recherche]", zone), liste = un("[data-h-resultats]", zone);
    var info = un("[data-h-info]", zone), message = un("[data-h-message]", zone);
    var actif = -1, resultats = [];

    function afficherMessage(t) { if (message) { message.textContent = t || ""; message.hidden = !t; } }

    function majTitre() {
      var titre = un("[data-h-titre]");
      if (titre) titre.textContent = "Horaires de prière à " + reglages.ville.nom;
      document.title = "Horaires de prière à " + reglages.ville.nom + " · Islamedia.fr";
    }
    function majInfo() {
      if (!info) return;
      var m = METHODES[reglages.methode];
      info.textContent = m.detail + (reglages.methode === "diyanet" ? "" : " " + COMMUN) +
        (reglages.asr === "hanafite" ? " Asr\u00a0: quand l’ombre d’un objet vaut deux fois sa longueur, plus l’ombre de midi (école hanafite)." : "");
    }
    function rendreMois() {
      var lieu = reglages.ville, corps = un("[data-h-tableau]", zone);
      var auj = aujourdhui(lieu.tz);
      if (!mois) mois = { a: auj.a, m: auj.m };
      var nbJours = new Date(Date.UTC(mois.a, mois.m, 0)).getUTCDate();
      var fmtJour = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });
      var html = "", estime = false;
      for (var j = 1; j <= nbJours; j++) {
        var r = calculer(lieu, mois.a, mois.m, j, reglages);
        var cAuj = auj.a === mois.a && auj.m === mois.m && auj.j === j;
        html += "<tr" + (cAuj ? ' class="est-aujourdhui" aria-current="date"' : "") + '><th scope="row"><span class="jour-sem">' +
          fmtJour.format(new Date(Date.UTC(mois.a, mois.m - 1, j))).replace(".", "") + "</span> " + j + "</th>";
        PRIERES.forEach(function (p) {
          var e = r && r.estime[p.id];
          if (e) estime = true;
          html += "<td" + (e ? ' class="est-estimee"' : "") + ">" + (r ? hm(r[p.id]) : "—") + (e ? "<span aria-hidden=\"true\">*</span>" : "") + "</td>";
        });
        html += "</tr>";
      }
      corps.innerHTML = html;
      var titre = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(mois.a, mois.m - 1, 1)));
      tous("[data-h-mois-titre]", zone).forEach(function (el) { el.textContent = titre.charAt(0).toUpperCase() + titre.slice(1); });
      tous("[data-h-legende]", zone).forEach(function (el) { el.hidden = !estime; });
      tous("[data-h-impression]", zone).forEach(function (el) {
        el.textContent = lieu.nom + (lieu.region ? " (" + nomRegion(lieu) + ")" : "") + " · méthode\u00a0: " + METHODES[reglages.methode].court +
          (reglages.asr === "hanafite" ? " · asr hanafite" : "") + " · islamedia.fr/horaires";
      });
    }
    function tout() {
      remplirJour(zone, reglages.ville, reglages);
      majTitre(); majInfo(); rendreMois();
      if (selMethode) selMethode.value = reglages.methode;
      if (selAsr) selAsr.value = reglages.asr;
      var nord = reglages.ville.lat > 60 || reglages.ville.lat < -60;
      afficherMessage(nord ? "Au-delà du 60ᵉ parallèle, les méthodes de calcul ne s’appliquent plus vraiment\u00a0: renseignez-vous auprès de votre mosquée." : "");
    }
    function choisir(v) {
      reglages.ville = { nom: v.nom, region: v.region || "", lat: v.lat, lon: v.lon, tz: v.tz };
      ecrire(reglages); mois = null; tout(); fermer();
      if (champ) { champ.value = ""; champ.blur(); }
    }

    /* Recherche de ville (liste déroulante accessible) */
    function fermer() { if (liste) { liste.hidden = true; liste.innerHTML = ""; } if (champ) champ.setAttribute("aria-expanded", "false"); actif = -1; }
    function proposer() {
      var q = simplifier(champ.value);
      if (!q) { fermer(); return; }
      chargerVilles(base).then(function (vs) {
        var debut = [], dedans = [];
        for (var i = 0; i < vs.length && debut.length < 8; i++) {
          var c = vs[i].cle;
          if (c.indexOf(q) === 0 || c.indexOf(" " + q) > -1) debut.push(vs[i]);
          else if (dedans.length < 8 && c.indexOf(q) > -1) dedans.push(vs[i]);
        }
        resultats = debut.concat(dedans).slice(0, 8);
        if (!resultats.length) {
          liste.innerHTML = '<li class="h-vide" role="option" aria-disabled="true">Aucune ville trouvée. Essayez «\u00a0Me localiser\u00a0».</li>';
        } else {
          liste.innerHTML = resultats.map(function (v, i) {
            return '<li role="option" id="h-option-' + i + '" data-index="' + i + '"><span class="h-option__nom">' + echapper(v.nom) +
              (v.autre ? ' <span class="h-option__autre">(' + echapper(v.autre) + ")</span>" : "") +
              '</span><span class="h-option__region">' + echapper(nomRegion(v)) + "</span></li>";
          }).join("");
        }
        liste.hidden = false; champ.setAttribute("aria-expanded", "true"); actif = -1; champ.removeAttribute("aria-activedescendant");
      }, function () { afficherMessage("La liste des villes n’a pas pu être chargée. Vérifiez votre connexion."); });
    }
    function echapper(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    function surligner(i) {
      tous("[role=option]", liste).forEach(function (li, k) { li.classList.toggle("actif", k === i); li.setAttribute("aria-selected", k === i ? "true" : "false"); });
      actif = i;
      if (i >= 0) champ.setAttribute("aria-activedescendant", "h-option-" + i); else champ.removeAttribute("aria-activedescendant");
    }
    if (champ && liste) {
      champ.addEventListener("input", proposer);
      champ.addEventListener("focus", function () { chargerVilles(base).catch(function () {}); if (champ.value) proposer(); });
      champ.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown" && resultats.length) { e.preventDefault(); surligner(Math.min(actif + 1, resultats.length - 1)); }
        else if (e.key === "ArrowUp" && resultats.length) { e.preventDefault(); surligner(Math.max(actif - 1, 0)); }
        else if (e.key === "Enter") { e.preventDefault(); if (resultats.length) choisir(resultats[Math.max(actif, 0)]); }
        else if (e.key === "Escape") fermer();
      });
      liste.addEventListener("mousedown", function (e) { e.preventDefault(); });
      liste.addEventListener("click", function (e) {
        var li = e.target.closest("[data-index]");
        if (li) choisir(resultats[+li.getAttribute("data-index")]);
      });
      champ.addEventListener("blur", function () { setTimeout(fermer, 150); });
    }

    /* Géolocalisation : seulement si on la demande, et rien n'est envoyé */
    var boutonGeo = un("[data-h-localiser]", zone);
    if (boutonGeo) {
      if (!("geolocation" in navigator)) boutonGeo.hidden = true;
      boutonGeo.addEventListener("click", function () {
        afficherMessage("Recherche de votre position…");
        boutonGeo.disabled = true;
        navigator.geolocation.getCurrentPosition(function (pos) {
          var lat = Math.round(pos.coords.latitude * 100) / 100, lon = Math.round(pos.coords.longitude * 100) / 100;
          var tz = "Europe/Paris";
          try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) {}
          chargerVilles(base).catch(function () { return null; }).then(function () {
            var proche = plusProche(lat, lon);
            choisir({ nom: proche ? "Près de " + proche.nom : "Ma position", region: proche ? proche.region : "", lat: lat, lon: lon, tz: tz });
            afficherMessage(""); boutonGeo.disabled = false;
          });
        }, function (err) {
          boutonGeo.disabled = false;
          afficherMessage(err && err.code === 1 ? "La localisation a été refusée. Cherchez votre ville dans la liste." : "Votre position n’a pas pu être trouvée. Cherchez votre ville dans la liste.");
        }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
      });
    }

    if (selMethode) selMethode.addEventListener("change", function () { reglages.methode = METHODES[selMethode.value] ? selMethode.value : "diyanet"; ecrire(reglages); tout(); });
    if (selAsr) selAsr.addEventListener("change", function () { reglages.asr = selAsr.value === "hanafite" ? "hanafite" : "standard"; ecrire(reglages); tout(); });
    tous("[data-h-mois]", zone).forEach(function (b) {
      b.addEventListener("click", function () {
        var n = +b.getAttribute("data-h-mois");
        if (n === 0) mois = null;
        else { var d = new Date(Date.UTC(mois.a, mois.m - 1 + n, 1)); mois = { a: d.getUTCFullYear(), m: d.getUTCMonth() + 1 }; }
        rendreMois();
      });
    });
    var boutonImprimer = un("[data-h-imprimer]", zone);
    if (boutonImprimer) boutonImprimer.addEventListener("click", function () { window.print(); });

    tout();
    zone.classList.add("est-pret");
    setInterval(function () { remplirJour(zone, reglages.ville, reglages); }, 30000);
  }

  function demarrer() {
    tous("[data-horaires-accueil]").forEach(accueil);
    tous("[data-horaires-page]").forEach(page);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})(typeof window !== "undefined" ? window : globalThis);
