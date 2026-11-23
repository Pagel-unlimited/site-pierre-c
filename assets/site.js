/* Pierre C — DJ. Menu, apparitions, galerie et formulaire. */

/* Une fois en ligne sur Vercel, le formulaire envoie la demande à api/contact.js.
   En local (aperçu), il ouvre la messagerie avec le message déjà rédigé. */
const EN_LOCAL = location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
const ENVOI_FORMULAIRE = EN_LOCAL ? "" : "/api/contact";
const MAIL_CONTACT = "contact@djpierre-c.fr";

document.documentElement.classList.add("js");

/* Vidéo d'ouverture de l'accueil : choisie selon l'écran et la connexion.
   Pas de lecture si le visiteur a demandé moins d'animations : seule l'image fixe reste. */
const fondVideo = document.getElementById("fond-video");
if (fondVideo) {
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const economie = navigator.connection && navigator.connection.saveData;
  if (reduit || economie) {
    fondVideo.removeAttribute("autoplay");
    fondVideo.preload = "none";
  } else {
    const petit = matchMedia("(max-width: 760px)").matches;
    fondVideo.src = petit ? fondVideo.dataset.sd : fondVideo.dataset.hd;
    fondVideo.muted = true;
    const lancer = () => fondVideo.play().catch(() => {});
    lancer();
    document.addEventListener("visibilitychange", () => { document.hidden ? fondVideo.pause() : lancer(); });
  }
}

/* Menu mobile */
const bascule = document.querySelector(".bascule");
const menu = document.querySelector(".menu");
if (bascule && menu) {
  bascule.addEventListener("click", () => {
    const ouvert = menu.classList.toggle("ouvert");
    bascule.setAttribute("aria-expanded", String(ouvert));
    bascule.textContent = ouvert ? "Fermer" : "Menu";
  });
}

/* Apparitions au défilement */
const aAnimer = document.querySelectorAll(".apparait");
if ("IntersectionObserver" in window) {
  const obs = new IntersectionObserver((entrees) => {
    entrees.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("vu"); obs.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  aAnimer.forEach((el) => obs.observe(el));
} else {
  aAnimer.forEach((el) => el.classList.add("vu"));
}

/* Galerie en plein écran */
const vue = document.querySelector("dialog.vue");
if (vue) {
  const boutons = [...document.querySelectorAll(".galerie button")];
  const image = vue.querySelector("img");
  let courant = 0;
  const montrer = (i) => {
    courant = (i + boutons.length) % boutons.length;
    const b = boutons[courant];
    image.src = b.dataset.grande;
    image.alt = b.querySelector("img").alt;
  };
  boutons.forEach((b, i) => b.addEventListener("click", () => { montrer(i); vue.showModal(); }));
  vue.querySelector(".fermer").addEventListener("click", () => vue.close());
  vue.querySelector(".prec").addEventListener("click", () => montrer(courant - 1));
  vue.querySelector(".suiv").addEventListener("click", () => montrer(courant + 1));
  vue.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") montrer(courant - 1);
    if (e.key === "ArrowRight") montrer(courant + 1);
  });
  vue.addEventListener("click", (e) => { if (e.target === vue) vue.close(); });
}

/* Formulaire de contact */
const formulaire = document.querySelector("form.formulaire");
if (formulaire) {
  const statut = formulaire.querySelector(".statut");
  const params = new URLSearchParams(location.search);

  const appliquerType = () => {
    const entreprise = formulaire.elements.evenement.value === "Entreprise";
    formulaire.querySelector('[for="nom"]').firstChild.textContent = entreprise ? "Votre nom et votre entreprise" : "Vos prénoms";
    formulaire.querySelector('[for="invites"]').firstChild.textContent = entreprise ? "Nombre de participants " : "Nombre d’invités ";
    formulaire.querySelector('[for="date"]').firstChild.textContent = entreprise ? "Date de l’événement " : "Date du mariage ";
  };

  if (params.get("type") === "entreprise") formulaire.elements.evenement.value = "Entreprise";
  appliquerType();
  formulaire.querySelectorAll('[name="evenement"]').forEach((r) => r.addEventListener("change", appliquerType));

  const lireDemande = () => {
    const d = new FormData(formulaire);
    d.delete("site_web");
    const lignes = [...d.entries()].filter(([, v]) => String(v).trim()).map(([k, v]) => `${formulaire.querySelector(`[name="${k}"]`).dataset.libelle} : ${v}`);
    return { d, lignes, sujet: `${d.get("demande")} (${d.get("evenement")}) : ${d.get("nom")}` };
  };
  window.lireDemande = lireDemande;

  formulaire.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (formulaire.elements.site_web.value) return; // piège à robots
    const { d, lignes, sujet } = lireDemande();

    if (!ENVOI_FORMULAIRE) {
      location.href = `mailto:${MAIL_CONTACT}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(lignes.join("\n"))}`;
      statut.textContent = "Votre messagerie s’ouvre avec votre demande déjà rédigée : il ne reste qu’à l’envoyer.";
      return;
    }
    const bouton = formulaire.querySelector("[type=submit]");
    bouton.disabled = true;
    statut.textContent = "Envoi en cours…";
    try {
      const r = await fetch(ENVOI_FORMULAIRE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(d)) });
      if (!r.ok) throw new Error(r.status);
      formulaire.reset();
      appliquerType();
      statut.textContent = "Merci, votre demande est bien envoyée.";
    } catch {
      statut.innerHTML = `L’envoi n’a pas abouti. Écrivez-moi à <a href="mailto:${MAIL_CONTACT}">${MAIL_CONTACT}</a> ou appelez le 06 17 34 14 71.`;
    } finally {
      bouton.disabled = false;
    }
  });
}

/* Avis Mariages.net : carrousel et fenêtre de détail */
const defil = document.querySelector(".avis-defil");
if (defil) {
  const piste = defil.querySelector(".avis-piste");
  const cartes = [...piste.querySelectorAll(".carte-avis")];
  const prec = defil.querySelector(".avis-fleche.prec");
  const suiv = defil.querySelector(".avis-fleche.suiv");
  const compteur = defil.querySelector(".avis-compteur");
  const pas = () => cartes[0].getBoundingClientRect().width + parseFloat(getComputedStyle(piste).columnGap || 24);
  const majEtat = () => {
    const max = piste.scrollWidth - piste.clientWidth - 2;
    prec.disabled = piste.scrollLeft <= 2;
    suiv.disabled = piste.scrollLeft >= max;
    const visibles = Math.max(1, Math.round(piste.clientWidth / pas()));
    const premier = Math.min(cartes.length - visibles + 1, Math.round(piste.scrollLeft / pas()) + 1);
    const dernier = Math.min(cartes.length, premier + visibles - 1);
    compteur.textContent = visibles >= cartes.length ? "" : (visibles === 1 ? `Avis ${premier} sur ${cartes.length}` : `Avis ${premier} à ${dernier} sur ${cartes.length}`);
  };
  prec.addEventListener("click", () => piste.scrollBy({ left: -pas() * Math.max(1, Math.round(piste.clientWidth / pas())) }));
  suiv.addEventListener("click", () => piste.scrollBy({ left: pas() * Math.max(1, Math.round(piste.clientWidth / pas())) }));
  piste.addEventListener("scroll", () => requestAnimationFrame(majEtat), { passive: true });
  addEventListener("resize", majEtat);
  piste.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); suiv.click(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prec.click(); }
  });
  majEtat();

  const fenetre = document.querySelector("dialog.avis-vue");
  const contenu = fenetre.querySelector(".contenu-avis");
  cartes.forEach((c) => c.querySelector(".plus").addEventListener("click", () => {
    contenu.innerHTML = c.querySelector(".detail").innerHTML;
    fenetre.scrollTop = 0;
    fenetre.showModal();
  }));
  fenetre.querySelector(".fermer-avis").addEventListener("click", () => fenetre.close());
  fenetre.addEventListener("click", (e) => { if (e.target === fenetre) fenetre.close(); });
}
