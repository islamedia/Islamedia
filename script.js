/* ==========================================================================
   ISLAMEDIA.FR — Script du site (animations et réglages)
   ==========================================================================

   ✏️  RÉGLAGES : c'est la SEULE partie à modifier.
   Colle tes liens entre les guillemets. Laisse "" tant que le compte
   n'existe pas : le bouton correspondant restera caché automatiquement.
   -------------------------------------------------------------------------- */
const REGLAGES = {
  tiktok:    "",   // ex. : "https://www.tiktok.com/@ton_compte"
  instagram: "",   // ex. : "https://www.instagram.com/ton_compte"
  youtube:   "",   // ex. : "https://www.youtube.com/@ton_compte"
  email:     "",   // ex. : "contact@islamedia.fr"
  editeur:   "",   // ton prénom et ton nom (affichés dans les mentions légales)
};
/* ===== Fin des réglages : ne modifie rien en dessous de cette ligne ===== */

(function () {
  "use strict";

  var racine = document.documentElement;
  var reduit = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Langue de la page : français par défaut, turc sur les pages tr/ du site */
  var TR = racine.lang === "tr";
  var TEXTES = TR ? {
    clair: "Açık moda geç", sombre: "Koyu moda geç", ouvrir: "Menüyü aç", fermer: "Menüyü kapat", nombres: "tr-TR",
    copie: function (ref) { return ref + (ref.indexOf("–") > -1 ? " ayetlerinin" : " ayetinin") + " bağlantısı kopyalandı"; },
    verset: function (nom, v) { return nom + " Suresi, " + v + ". ayet"; }, aller: "Ayete git",
    trop: function (nom, nb) { return nom + " Suresi " + nb + " ayettir."; }, sourates: "Kur’an’da 114 sure vardır."
  } : {
    clair: "Passer en mode clair", sombre: "Passer en mode sombre", ouvrir: "Ouvrir le menu", fermer: "Fermer le menu", nombres: "fr-FR",
    copie: function (ref) { return (ref.indexOf("–") > -1 ? "Lien des versets " : "Lien du verset ") + ref + " copié"; },
    verset: function (nom, v) { return "Sourate " + nom + ", verset " + v; }, aller: "Aller au verset",
    trop: function (nom, nb) { return "La sourate " + nom + " compte " + nb + " versets."; }, sourates: "Le Coran compte 114 sourates."
  };
  function tous(sel, zone) { return Array.prototype.slice.call((zone || document).querySelectorAll(sel)); }
  function propre(cle) { return String(REGLAGES[cle] || "").trim(); }

  /* 1. Thème clair / sombre ------------------------------------------------- */
  var boutonTheme = document.querySelector("[data-theme-bascule]");
  function appliquerTheme(theme, memoriser) {
    racine.setAttribute("data-theme", theme);
    if (boutonTheme) {
      boutonTheme.setAttribute("aria-pressed", theme === "sombre" ? "true" : "false");
      boutonTheme.setAttribute("aria-label", theme === "sombre" ? TEXTES.clair : TEXTES.sombre);
    }
    if (memoriser) { try { localStorage.setItem("islamedia-theme", theme); } catch (e) {} }
  }
  appliquerTheme(racine.getAttribute("data-theme") === "sombre" ? "sombre" : "clair", false);
  if (boutonTheme) {
    boutonTheme.addEventListener("click", function () {
      appliquerTheme(racine.getAttribute("data-theme") === "sombre" ? "clair" : "sombre", true);
    });
  }

  /* 2. Menu sur téléphone ---------------------------------------------------- */
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");
  function basculerMenu(ouvrir) {
    if (!burger || !menu) return;
    burger.setAttribute("aria-expanded", ouvrir ? "true" : "false");
    burger.setAttribute("aria-label", ouvrir ? TEXTES.fermer : TEXTES.ouvrir);
    menu.classList.toggle("ouvert", ouvrir);
    document.body.classList.toggle("menu-ouvert", ouvrir);
  }
  if (burger) burger.addEventListener("click", function () { basculerMenu(burger.getAttribute("aria-expanded") !== "true"); });
  tous("#menu a").forEach(function (lien) { lien.addEventListener("click", function () { basculerMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") basculerMenu(false); });

  /* 3. En-tête : devient opaque quand on quitte l'accueil -------------------- */
  var entete = document.querySelector(".entete");
  var hero = document.querySelector(".hero");
  function majEntete() {
    if (!entete) return;
    var contenu = hero && hero.querySelector(".hero__contenu");
    var seuil = hero ? Math.max(10, Math.min(hero.offsetHeight * 0.55, (contenu ? contenu.offsetTop : hero.offsetHeight) - entete.offsetHeight)) : 10;
    entete.classList.toggle("est-defile", window.scrollY > seuil);
  }
  if (hero) { window.addEventListener("scroll", majEntete, { passive: true }); majEntete(); }

  /* 4. Ciel étoilé (ou poussière dorée avec le fond « moucharabieh ») ------------ */
  tous(".ciel").forEach(function (ciel) {
    var nombre = Math.round(Math.min(110, Math.max(45, (window.innerWidth * window.innerHeight) / 9000)));
    var lot = document.createDocumentFragment();
    for (var n = 0; n < nombre; n++) {
      var etoile = document.createElement("span");
      etoile.className = "etoile" + (Math.random() < 0.18 ? " etoile--or" : "");
      etoile.style.left = (Math.random() * 100).toFixed(2) + "%";
      etoile.style.top = (Math.random() * 100).toFixed(2) + "%";
      etoile.style.setProperty("--t", (Math.random() * 1.8 + 0.6).toFixed(2) + "px");
      etoile.style.setProperty("--d", (Math.random() * 4 + 2.5).toFixed(2) + "s");
      etoile.style.setProperty("--r", (-Math.random() * 6).toFixed(2) + "s");
      lot.appendChild(etoile);
    }
    ciel.appendChild(lot);
  });

  /* 5. Logo : les lettres apparaissent une par une ----------------------------- */
  tous("[data-lettres]").forEach(function (el) {
    var texte = el.textContent;
    el.textContent = "";
    Array.prototype.forEach.call(texte, function (car, i) {
      var s = document.createElement("span");
      s.className = "lettre";
      s.style.setProperty("--i", i);
      s.textContent = car;
      el.appendChild(s);
    });
  });

  /* 6. Léger effet de profondeur quand on bouge la souris sur l'accueil -------- */
  if (hero && !reduit && window.matchMedia && matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty("--px", (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
      hero.style.setProperty("--py", (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
    });
  }

  /* 7. Apparitions au défilement + compteurs ----------------------------------- */
  function compter(el) {
    var cible = parseInt(el.getAttribute("data-compteur"), 10) || 0;
    var format = new Intl.NumberFormat(TEXTES.nombres);
    if (reduit) { el.textContent = format.format(cible); return; }
    var debut = null, duree = 1700;
    function pas(t) {
      if (debut === null) debut = t;
      var p = Math.min(1, (t - debut) / duree);
      el.textContent = format.format(Math.round(cible * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(pas);
    }
    requestAnimationFrame(pas);
  }
  var observateur = "IntersectionObserver" in window ? new IntersectionObserver(function (entrees) {
    entrees.forEach(function (entree) {
      if (!entree.isIntersecting) return;
      entree.target.classList.add("visible");
      tous("[data-compteur]", entree.target).forEach(compter);
      observateur.unobserve(entree.target);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }) : null;
  tous("[data-reveal]").forEach(function (el) {
    if (observateur) observateur.observe(el);
    else el.classList.add("visible");
  });

  /* 8. Verset du jour (un verset différent chaque jour) ------------------------ */
  var donnees = [];
  try { donnees = JSON.parse((document.getElementById("donnees-versets") || {}).textContent || "[]"); } catch (e) {}
  var cadre = document.querySelector("[data-verset]");
  if (cadre && donnees.length) {
    var zoneAr = cadre.querySelector(".verset__ar");
    var zoneFr = cadre.querySelector(".verset__fr");
    var zoneRef = cadre.querySelector(".verset__ref");
    var nav = document.querySelector("[data-verset-nav]");
    var points = nav ? nav.querySelector(".points") : null;
    var indice = Math.floor(Date.now() / 86400000) % donnees.length;

    if (points) {
      donnees.forEach(function () { points.appendChild(document.createElement("span")); });
    }
    function remplir() {
      var v = donnees[indice];
      zoneAr.textContent = "";
      v.ar.split(" ").forEach(function (mot, k) {
        var s = document.createElement("span");
        s.className = "mot";
        s.style.setProperty("--k", k);
        s.textContent = mot;
        zoneAr.appendChild(s);
        zoneAr.appendChild(document.createTextNode(" "));
      });
      zoneFr.textContent = v.t;
      zoneRef.textContent = v.ref;
      if (points) tous("span", points).forEach(function (p, i) { p.classList.toggle("actif", i === indice); });
    }
    function afficher(nouvel) {
      indice = (nouvel + donnees.length) % donnees.length;
      cadre.classList.add("deja-vu");
      if (reduit) { remplir(); return; }
      cadre.classList.add("change");
      setTimeout(function () { remplir(); cadre.classList.remove("change"); }, 320);
    }
    remplir();
    if (nav) {
      nav.hidden = false;
      nav.querySelector("[data-precedent]").addEventListener("click", function () { afficher(indice - 1); });
      nav.querySelector("[data-suivant]").addEventListener("click", function () { afficher(indice + 1); });
    }
  }

  /* 9. Liens des réseaux, e-mail et nom de l'éditeur (bloc RÉGLAGES) ---------- */
  tous("[data-lien]").forEach(function (a) {
    var cle = a.getAttribute("data-lien");
    var valeur = propre(cle);
    if (!valeur) { if (!a.hasAttribute("data-garder")) a.hidden = true; return; }
    a.href = cle === "email" ? "mailto:" + valeur : valeur;
    if (cle !== "email") { a.target = "_blank"; a.rel = "noopener"; }
    a.hidden = false;
  });
  tous("[data-texte]").forEach(function (el) {
    var valeur = propre(el.getAttribute("data-texte"));
    if (valeur) { el.textContent = valeur; el.classList.remove("a-completer"); }
  });
  var aucunReseau = !propre("tiktok") && !propre("instagram") && !propre("youtube");
  tous("[data-si-aucun-reseau]").forEach(function (el) { el.hidden = !aucunReseau; });

  /* 10. Année du pied de page -------------------------------------------------- */
  tous("[data-annee]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  /* 11. Le Coran : réglages de lecture, lien d'un verset, recherche de sourate --- */
  var barresCoran = tous("[data-reglages-coran]");
  if (barresCoran.length) {
    var racineDoc = document.documentElement, cleCoran = "islamedia-coran";
    var reglages = { ar: true, fr: true, tr: true, taille: 2 };
    try {
      var lus = JSON.parse(localStorage.getItem(cleCoran) || "null");
      if (lus) Object.keys(reglages).forEach(function (k) { if (k in lus) reglages[k] = lus[k]; });
    } catch (e) {}
    var appliquer = function (memoriser) {
      var presentes = tous("[data-langue]").map(function (x) { return x.getAttribute("data-langue"); });
      if (presentes.length && !presentes.some(function (x) { return reglages[x]; })) presentes.forEach(function (x) { reglages[x] = true; });
      ["ar", "fr", "tr"].forEach(function (l) {
        racineDoc.classList.toggle("sans-" + l, !reglages[l]);
        tous('[data-langue="' + l + '"]').forEach(function (b) { b.setAttribute("aria-pressed", reglages[l] ? "true" : "false"); });
      });
      racineDoc.style.setProperty("--taille-ar", reglages.taille);
      if (memoriser) { try { localStorage.setItem(cleCoran, JSON.stringify(reglages)); } catch (e) {} }
    };
    tous("[data-langue]").forEach(function (b) {
      b.addEventListener("click", function () {
        var l = b.getAttribute("data-langue");
        reglages[l] = !reglages[l];
        var presentes = tous("[data-langue]").map(function (x) { return x.getAttribute("data-langue"); });
        if (!presentes.some(function (x) { return reglages[x]; })) reglages[l] = true; /* au moins une langue visible */
        appliquer(true);
      });
    });
    tous("[data-taille]").forEach(function (b) {
      b.addEventListener("click", function () {
        reglages.taille = Math.max(0, Math.min(5, reglages.taille + Number(b.getAttribute("data-taille"))));
        appliquer(true);
      });
    });
    var aller = document.querySelector("[data-aller-sourate]");
    if (aller) aller.addEventListener("change", function () { window.location.href = "../" + aller.value + "/"; });
    appliquer(false);
  }

  var toast = document.querySelector(".toast"), minuteur = null;
  var annoncer = function (message) {
    if (!toast) return;
    toast.textContent = message; toast.hidden = false;
    clearTimeout(minuteur); minuteur = setTimeout(function () { toast.hidden = true; }, 2400);
  };
  tous("[data-copier-verset]").forEach(function (lien) {
    lien.addEventListener("click", function (ev) {
      var ancre = lien.getAttribute("href");
      var adresse = window.location.origin + window.location.pathname + ancre;
      if (!navigator.clipboard || !window.isSecureContext) return; /* simple saut au verset */
      ev.preventDefault();
      if (history.replaceState) history.replaceState(null, "", ancre);
      navigator.clipboard.writeText(adresse).then(function () {
        annoncer(TEXTES.copie(lien.getAttribute("data-copier-verset")));
      }, function () { window.location.hash = ancre; });
    });
  });

  /* Recherche d'une sourate (nom ou numéro) ou d'un verset (« 3:13 », « 3/13 », « Baqara 255 ») */
  var champSourate = document.querySelector("[data-recherche-sourate]");
  if (champSourate) {
    var simplifier = function (t) {
      return t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[‘’ʿʾ'`\-\s.:\/,]/g, "").toLowerCase();
    };
    /* nom sans l'article (« An-Nas » → « nas ») */
    var nomCourt = function (li) { return simplifier((li.getAttribute("data-nom") || "").replace(/^(?:adh|ash|a[dlnrstz])[\s\-‘’]+/i, "")); };
    var lignes = tous("[data-liste-sourates] li"), vide = document.querySelector("[data-liste-vide]");
    var zoneVerset = document.querySelector("[data-resultat-verset]"), cibleVerset = null;
    lignes.forEach(function (li) { li.cle = simplifier(li.getAttribute("data-recherche") || ""); });
    var ligneDe = function (n) { return lignes.filter(function (li) { return +li.getAttribute("data-sourate") === n; })[0] || null; };
    /* Référence de verset : { s: sourate, v: verset, li } ou null */
    var reference = function (brut) {
      var t = brut.trim().replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); });
      var m = t.match(/^(\d{1,3})\s*[:.\/,\s]\s*(\d{1,3})(?:\s*[-–]\s*\d{1,3})?$/);
      if (m) return { s: +m[1], v: +m[2], li: ligneDe(+m[1]) };
      m = t.match(/^(.*\D)\s*(\d{1,3})(?:\s*[-–]\s*\d{1,3})?$/);
      if (m) {
        var q = simplifier(m[1].replace(/[:\/,]+\s*$/, ""));
        if (q.length < 2 || /^\d/.test(q)) return null;
        var trouvees = lignes.filter(function (li) { return li.cle.indexOf(q) !== -1; });
        if (trouvees.length > 1) trouvees = trouvees.filter(function (li) { return nomCourt(li) === q || simplifier(li.getAttribute("data-nom") || "") === q; });
        if (trouvees.length === 1) return { s: +trouvees[0].getAttribute("data-sourate"), v: +m[2], li: trouvees[0] };
      }
      return null;
    };
    var montrerVerset = function (r) {
      cibleVerset = null;
      if (!zoneVerset) return;
      zoneVerset.textContent = "";
      zoneVerset.hidden = !r;
      if (!r) return;
      if (!r.li) { zoneVerset.textContent = TEXTES.sourates; return; }
      var nom = r.li.getAttribute("data-nom"), nb = +r.li.getAttribute("data-versets");
      if (r.v < 1 || r.v > nb) { zoneVerset.textContent = TEXTES.trop(nom, nb); return; }
      var lien = document.createElement("a");
      lien.href = r.s + "/#v" + r.v;
      var fort = document.createElement("strong"), action = document.createElement("span");
      fort.textContent = TEXTES.verset(nom, r.v) + " (" + r.s + ":" + r.v + ")";
      action.textContent = TEXTES.aller + " →";
      lien.appendChild(fort); lien.appendChild(action);
      zoneVerset.appendChild(lien);
      cibleVerset = lien.href;
    };
    champSourate.addEventListener("input", function () {
      var r = reference(champSourate.value), q = simplifier(champSourate.value), visibles = 0;
      montrerVerset(r);
      lignes.forEach(function (li) {
        var ok = r ? li === r.li : (!q || li.cle.indexOf(q) !== -1);
        if (!r && /^\d+$/.test(q)) ok = li.cle.indexOf(q) === 0;
        li.hidden = !ok; if (ok) visibles++;
      });
      if (vide) vide.hidden = visibles > 0 || !!r;
    });
    champSourate.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter") return;
      var visibles = lignes.filter(function (li) { return !li.hidden; });
      var cible = cibleVerset || (champSourate.value.trim() && visibles.length === 1 ? visibles[0].querySelector("a").href : null);
      if (cible) { ev.preventDefault(); window.location.href = cible; }
    });
  }

  /* Bouton de langue : garder le verset affiché (#v13) en changeant de langue */
  tous("[data-lien-langue]").forEach(function (a) {
    a.addEventListener("click", function () {
      if (/^#v\d+$/.test(window.location.hash)) a.href = a.href.split("#")[0] + window.location.hash;
    });
  });
})();
