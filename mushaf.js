/* Islamedia.fr — lecture du Coran page par page (604 pages du Mushaf de Médine).
   Les pages sont lues dans coran/page/donnees/1.json … 31.json (20 pages par fichier). */
(function () {
  "use strict";
  var zone = document.querySelector("[data-mushaf]");
  var metaEl = document.getElementById("mushaf-meta");
  if (!zone || !metaEl) return;
  var META = JSON.parse(metaEl.textContent);
  var NB = META.pages;
  var TR = document.documentElement.lang === "tr";
  var T = TR ? {
    page: "Sayfa", juz: "Cüz",
    verset: function (s, a) { return s + ":" + a + " ayetinin mealini oku"; },
    erreur: "Bu sayfa yüklenemedi. Bağlantınızı kontrol edin.",
    debut: "Bu, ilk sayfa.", fin: "Bu, son sayfa."
  } : {
    page: "Page", juz: "Juz’",
    verset: function (s, a) { return "Verset " + s + ":" + a + ", lire la traduction"; },
    erreur: "Cette page n’a pas pu être chargée. Vérifiez votre connexion.",
    debut: "C’est la première page.", fin: "C’est la dernière page."
  };
  var CLE = "islamedia-mushaf";
  var base = (zone.getAttribute("data-racine") || "../../") + "coran/page/donnees/";
  var corps = zone.querySelector("[data-mushaf-corps]"), article = zone.querySelector("[data-mushaf-page]");
  var teteSourate = zone.querySelector("[data-mushaf-tete-sourate]"), teteJuz = zone.querySelector("[data-mushaf-tete-juz]");
  var pied = zone.querySelector("[data-mushaf-pied]"), champ = zone.querySelector("[data-mushaf-champ]");
  var reduit = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cache = {}, actuelle = 0, demande = 0;

  function tous(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function arNum(n) { return String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".charAt(+d); }); }
  function borne(p) { return Math.max(1, Math.min(NB, p | 0)); }
  function fichier(p) { return Math.ceil(p / META.parFichier); }
  function charger(k) {
    if (!cache[k]) {
      cache[k] = fetch(base + k + ".json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
      cache[k].catch(function () { delete cache[k]; });
    }
    return cache[k];
  }
  function cadre(nom) {
    return '<div class="cartouche-sourate mushaf-sourate"><svg class="cartouche-sourate__cadre" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M30 4 H570 L596 60 L570 116 H30 L4 60 Z"/><path d="M38 12 H562 L584 60 L562 108 H38 L16 60 Z"/></svg>' +
      '<p class="cartouche-sourate__ar">سورة ' + esc(nom) + "</p></div>";
  }
  function rendre(page) {
    var html = "", ouvert = false;
    page.v.forEach(function (v) {
      var s = v[0], a = v[1];
      if (a === 1) {
        if (ouvert) { html += "</p>"; ouvert = false; }
        html += cadre(META.sourates[s - 1][0]);
        if (v[3]) html += '<p class="mushaf-basmala">' + esc(v[3]) + "</p>";
      }
      if (!ouvert) { html += '<p class="mushaf-texte">'; ouvert = true; }
      html += '<span class="mushaf-v">' + esc(v[2]) + ' <a class="fin-ayah" href="../' + s + "/#v" + a + '" aria-label="' + esc(T.verset(s, a)) + '">۝' + arNum(a) + "</a></span> ";
    });
    if (ouvert) html += "</p>";
    return html;
  }
  function nomsSourates(page) {
    var premiere = page.v[0][0], derniere = page.v[page.v.length - 1][0];
    return [premiere, derniere].filter(function (s, i, l) { return l.indexOf(s) === i; });
  }
  function afficher(p, sens) {
    p = borne(p);
    var numero = ++demande;
    return charger(fichier(p)).then(function (d) {
      if (numero !== demande) return;
      var page = d.pages[p - d.debut];
      var sourates = nomsSourates(page);
      teteSourate.textContent = sourates.map(function (s) { return META.sourates[s - 1][0]; }).join(" – ");
      teteJuz.textContent = "الجزء " + (page.j[0] === page.j[1] ? arNum(page.j[0]) : arNum(page.j[0]) + " – " + arNum(page.j[1]));
      corps.innerHTML = rendre(page);
      pied.textContent = arNum(p);
      actuelle = p;
      var infos = sourates.map(function (s) { return META.sourates[s - 1][1]; }).join(" · ") + " · " + T.juz + " " +
        (page.j[0] === page.j[1] ? page.j[0] : page.j[0] + "–" + page.j[1]);
      tous("[data-mushaf-num]").forEach(function (el) {
        el.innerHTML = "<strong>" + T.page + " " + p + "</strong> / " + NB + "<span>" + esc(infos) + "</span>";
      });
      tous("[data-mushaf-aller]").forEach(function (b) {
        var n = +b.getAttribute("data-mushaf-aller");
        b.disabled = (n > 0 && p >= NB) || (n < 0 && p <= 1);
      });
      if (champ && document.activeElement !== champ) champ.value = p;
      try { history.replaceState(null, "", "#" + p); } catch (e) { location.hash = "#" + p; }
      try { localStorage.setItem(CLE, JSON.stringify({ page: p })); } catch (e) {}
      if (sens && !reduit) {
        article.classList.remove("tourne-suiv", "tourne-prec");
        void article.offsetWidth;
        article.classList.add(sens > 0 ? "tourne-suiv" : "tourne-prec");
      }
      if (sens) {
        var haut = article.getBoundingClientRect().top;
        if (haut < 0 || haut > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + haut - 90, behavior: reduit ? "auto" : "smooth" });
      }
      if (p < NB) charger(fichier(p + 1));
      if (p > 1) charger(fichier(p - 1));
    }, function () {
      if (numero !== demande) return;
      corps.innerHTML = '<p class="mushaf-erreur" lang="' + (TR ? "tr" : "fr") + '" dir="ltr">' + esc(T.erreur) + "</p>";
    });
  }
  function tourner(n) { var p = borne(actuelle + n); if (p !== actuelle) afficher(p, n); }

  /* Boutons, champ de page, choix de sourate et de juz' */
  tous("[data-mushaf-aller]").forEach(function (b) {
    b.addEventListener("click", function () { tourner(+b.getAttribute("data-mushaf-aller")); });
  });
  if (champ) {
    var allerChamp = function () { var p = parseInt(champ.value, 10); if (p >= 1) afficher(p, p > actuelle ? 1 : -1); };
    champ.addEventListener("change", allerChamp);
    champ.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); allerChamp(); champ.blur(); } });
  }
  tous("[data-mushaf-sourate], [data-mushaf-juz]").forEach(function (sel) {
    sel.addEventListener("change", function () {
      var p = parseInt(sel.value, 10);
      if (p >= 1) afficher(p, p > actuelle ? 1 : -1);
      sel.value = "";
    });
  });
  /* Clavier : comme dans un Mushaf, la page suivante est à gauche */
  document.addEventListener("keydown", function (e) {
    var cible = e.target && e.target.tagName;
    if (cible === "INPUT" || cible === "SELECT" || cible === "TEXTAREA" || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); tourner(1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); tourner(-1); }
  });
  /* Balayage : le doigt vers la droite tourne la page suivante (sens de l'arabe) */
  var x0 = null, y0 = 0, t0 = 0;
  article.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
  }, { passive: true });
  article.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 1.6 * Math.abs(dy) && Date.now() - t0 < 900) tourner(dx > 0 ? 1 : -1);
  }, { passive: true });
  window.addEventListener("hashchange", function () {
    var m = location.hash.match(/^#(\d{1,3})$/);
    if (m && +m[1] !== actuelle) afficher(+m[1], +m[1] > actuelle ? 1 : -1);
  });

  /* Page de départ : celle de l'adresse (#42), sinon la dernière lue, sinon la première */
  var depart = 1, m = location.hash.match(/^#(\d{1,3})$/);
  if (m) depart = +m[1];
  else { try { var l = JSON.parse(localStorage.getItem(CLE) || "null"); if (l && l.page) depart = l.page; } catch (e) {} }
  afficher(depart, 0);
})();
