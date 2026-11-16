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
  function tous(sel, zone) { return Array.prototype.slice.call((zone || document).querySelectorAll(sel)); }
  function propre(cle) { return String(REGLAGES[cle] || "").trim(); }

  /* 1. Thème clair / sombre ------------------------------------------------- */
  var boutonTheme = document.querySelector("[data-theme-bascule]");
  function appliquerTheme(theme, memoriser) {
    racine.setAttribute("data-theme", theme);
    if (boutonTheme) {
      boutonTheme.setAttribute("aria-pressed", theme === "sombre" ? "true" : "false");
      boutonTheme.setAttribute("aria-label", theme === "sombre" ? "Passer en mode clair" : "Passer en mode sombre");
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
    burger.setAttribute("aria-label", ouvrir ? "Fermer le menu" : "Ouvrir le menu");
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
    var seuil = hero ? hero.offsetHeight * 0.55 : 10;
    entete.classList.toggle("est-defile", window.scrollY > seuil);
  }
  if (hero) { window.addEventListener("scroll", majEntete, { passive: true }); majEntete(); }

  /* 4. Ciel étoilé ------------------------------------------------------------ */
  var ciel = document.querySelector(".ciel");
  if (ciel) {
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
  }

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
    var format = new Intl.NumberFormat("fr-FR");
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
      zoneFr.textContent = v.fr;
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
})();
