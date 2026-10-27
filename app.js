(function () {
  "use strict";

  const posti = window.POSTI || [];
  const $ = (id) => document.getElementById(id);

  // --- Mappa ---------------------------------------------------------------
  const mappa = L.map("mappa", { zoomControl: false, attributionControl: true });
  L.control.zoom({ position: "bottomright" }).addTo(mappa);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mappa);

  const segnaposti = posti.map((posto, i) => {
    const icona = L.divIcon({
      className: "segnaposto",
      html: `<span>${posto.emoji || "📍"}</span>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    return L.marker([posto.lat, posto.lng], { icon: icona, title: posto.nome })
      .addTo(mappa)
      .on("click", () => apriScheda(i));
  });

  // Tappe: puntini piccoli, visibili solo quando la mappa è abbastanza vicina
  const ZOOM_TAPPE = 8;
  const livelloTappe = L.layerGroup();
  let segnapostiTappe = [];
  function disegnaTappe() {
    livelloTappe.clearLayers();
    segnapostiTappe = posti.map((posto, i) =>
      (posto.tappe || []).map((t) =>
        L.marker([t.lat, t.lng], {
          icon: L.divIcon({ className: "segnaposto-tappa", iconSize: [16, 16], iconAnchor: [8, 8] }),
          title: t.nome
        })
          .bindTooltip(t.nome, { direction: "top", offset: [0, -8] })
          .on("click", () => apriScheda(i))
          .addTo(livelloTappe)
      )
    );
  }
  disegnaTappe();
  function aggiornaTappe() {
    if (mappa.getZoom() >= ZOOM_TAPPE) livelloTappe.addTo(mappa);
    else livelloTappe.remove();
  }
  mappa.on("zoomend", aggiornaTappe);

  // All'apertura inquadra il gruppo principale di posti; quelli molto lontani
  // (es. Siviglia) si raggiungono dall'elenco, così su telefono le icone non si sovrappongono.
  function inquadraTutti() {
    if (!segnaposti.length) return mappa.setView([42.5, 12.5], 6);
    const mediana = (v) => v.sort((a, b) => a - b)[Math.floor(v.length / 2)];
    const centro = L.latLng(mediana(posti.map((p) => p.lat)), mediana(posti.map((p) => p.lng)));
    const vicini = segnaposti.filter((m) => m.getLatLng().distanceTo(centro) < 1000e3);
    mappa.fitBounds(L.featureGroup(vicini.length ? vicini : segnaposti).getBounds(), {
      paddingTopLeft: [30, 90],
      paddingBottomRight: [30, 30]
    });
  }
  inquadraTutti();
  aggiornaTappe();

  // --- Pannelli ------------------------------------------------------------
  function apri(id) { $(id).hidden = false; }
  function chiudi(id) {
    $(id).hidden = true;
    if (id === "scheda") $("scheda-musica").innerHTML = ""; // ferma la musica
  }
  document.querySelectorAll("[data-chiudi]").forEach((btn) =>
    btn.addEventListener("click", () => chiudi(btn.dataset.chiudi))
  );

  // --- Elenco --------------------------------------------------------------
  function disegnaElenco() {
    $("conteggio").textContent = posti.length;
    const lista = $("lista-posti");
    lista.innerHTML = "";
    posti
      .map((p, i) => ({ p, i }))
      .sort((a, b) => a.p.nome.localeCompare(b.p.nome, "it"))
      .forEach(({ p, i }) => {
        const li = document.createElement("li");
        const altre = (p.tappe || []).map((t) => testo(t.nome)).join(" · ");
        li.innerHTML = `<span class="emoji">${p.emoji || "📍"}</span>
          <span>${testo(p.nome)}${altre ? `<small>${altre}</small>` : ""}</span>`;
        li.addEventListener("click", () => {
          chiudi("elenco");
          apriScheda(i, true);
        });
        lista.appendChild(li);
      });
  }
  disegnaElenco();
  $("btn-elenco").addEventListener("click", () => {
    chiudi("scheda");
    $("elenco").hidden ? apri("elenco") : chiudi("elenco");
  });

  // --- Scheda del posto ----------------------------------------------------
  let postoAperto = null;
  function apriScheda(i, vola) {
    const p = posti[i];
    chiudi("elenco");
    $("scheda-emoji").textContent = p.emoji || "📍";
    $("scheda-nome").textContent = p.nome;
    $("scheda-data").textContent = p.data || "";
    $("scheda-nota").textContent = p.nota || "";

    const galleria = $("scheda-foto");
    galleria.innerHTML = "";
    if (p.foto && p.foto.length) {
      p.foto.forEach((src) => {
        const img = document.createElement("img");
        img.src = src;
        img.loading = "lazy";
        img.alt = p.nome;
        img.addEventListener("click", () => apriVisore(src));
        galleria.appendChild(img);
      });
    }
    if (p.album) {
      const link = document.createElement("a");
      link.className = "btn-album";
      link.href = p.album;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Apri l'album delle foto 📷";
      galleria.appendChild(link);
    }
    if (!galleria.children.length) {
      galleria.innerHTML = '<p class="vuoto">Nessuna foto ancora. Le aggiungeremo presto 💛</p>';
    }

    const tappe = p.tappe || [];
    const listaTappe = $("scheda-tappe");
    listaTappe.innerHTML = "";
    tappe.forEach((t, k) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${testo(t.nome)}</span>${t.nota ? `<small>${testo(t.nota)}</small>` : ""}`;
      li.addEventListener("click", () => {
        chiudi("scheda");
        mappa.flyTo([t.lat, t.lng], 13, { duration: 1.2 });
        mappa.once("moveend", () => segnapostiTappe[i][k].openTooltip());
      });
      listaTappe.appendChild(li);
    });
    if (!tappe.length) listaTappe.innerHTML = '<li class="vuoto">Nessuna tappa ancora</li>';
    postoAperto = i;

    $("scheda-musica").innerHTML = htmlMusica(p.musica);
    apri("scheda");
    $("scheda").scrollTop = 0;

    if (vola) {
      // con le tappe inquadra tutta la vacanza, altrimenti solo il posto
      if (tappe.length) {
        const zona = L.latLngBounds([[p.lat, p.lng], ...tappe.map((t) => [t.lat, t.lng])]);
        mappa.flyToBounds(zona, { padding: [40, 40], duration: 1.2 });
      } else {
        mappa.flyTo([p.lat, p.lng], 11, { duration: 1.2 });
      }
    }
  }

  function htmlMusica(m) {
    if (!m) return '<p class="vuoto">Nessuna canzone ancora 🎶</p>';
    if (m.spotify) {
      const u = new URL(m.spotify);
      const percorso = u.pathname.replace(/^\/intl-[a-z]+/, "");
      return `<iframe class="spotify" src="https://open.spotify.com/embed${percorso}" loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
    }
    if (m.youtube) {
      const id = idYoutube(m.youtube);
      if (id) {
        return `<iframe class="youtube" src="https://www.youtube-nocookie.com/embed/${id}" loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
      }
    }
    if (m.file) {
      return `${m.titolo ? `<p>${testo(m.titolo)}</p>` : ""}<audio controls preload="none" src="${testo(m.file)}"></audio>`;
    }
    return '<p class="vuoto">Nessuna canzone ancora 🎶</p>';
  }

  function idYoutube(url) {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    return u.searchParams.get("v") || u.pathname.split("/").pop();
  }

  function testo(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // --- Tappe aggiunte dall'app ---------------------------------------------
  // Le tappe aggiunte dal telefono vengono salvate su GitHub nel file
  // tappe-aggiunte.json (serve il codice d'accesso, una volta per telefono)
  // e unite a quelle di posti.js all'apertura.
  const REPO = "pako1989/aspassoperilmondo";
  const FILE_AGGIUNTE = "tappe-aggiunte.json";
  const API = `https://api.github.com/repos/${REPO}/contents/${FILE_AGGIUNTE}`;

  function leggiChiave() {
    try { return localStorage.getItem("chiave-github") || ""; } catch (e) { return ""; }
  }
  function intestazioni() {
    const h = { Accept: "application/vnd.github+json" };
    const chiave = leggiChiave();
    if (chiave) h.Authorization = `Bearer ${chiave}`;
    return h;
  }
  const daBase64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
  const inBase64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

  async function scaricaAggiunte() {
    const r = await fetch(`${API}?ref=main&t=${Date.now()}`, { headers: intestazioni(), cache: "no-store" });
    if (r.status === 404) return { dati: {}, sha: null };
    if (!r.ok) throw new Error(`GitHub ha risposto ${r.status}`);
    const j = await r.json();
    return { dati: JSON.parse(daBase64(j.content)), sha: j.sha };
  }

  function uniscAggiunte(dati) {
    posti.forEach((p) => {
      const extra = (dati[p.nome] || []).map((t) => ({ ...t, aggiunta: true }));
      p.tappe = (p.tappe || []).filter((t) => !t.aggiunta).concat(extra);
    });
    disegnaTappe();
    disegnaElenco();
    if (postoAperto !== null && !$("scheda").hidden) apriScheda(postoAperto);
  }

  scaricaAggiunte()
    .then(({ dati }) => uniscAggiunte(dati))
    .catch(() => {
      // senza GitHub (offline o troppe richieste) prova la copia pubblicata sul sito
      fetch(FILE_AGGIUNTE).then((r) => (r.ok ? r.json() : {})).then(uniscAggiunte).catch(() => {});
    });

  async function salvaTappa(nomePosto, tappa) {
    for (let tentativo = 0; tentativo < 2; tentativo++) {
      const { dati, sha } = await scaricaAggiunte();
      dati[nomePosto] = (dati[nomePosto] || []).concat(tappa);
      const r = await fetch(API, {
        method: "PUT",
        headers: { ...intestazioni(), "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Nuova tappa: ${tappa.nome} (${nomePosto})`,
          content: inBase64(JSON.stringify(dati, null, 2) + "\n"),
          branch: "main",
          ...(sha ? { sha } : {})
        })
      });
      if (r.ok) return dati;
      if (r.status === 401 || r.status === 403) throw new Error("chiave");
      if (r.status !== 409 && r.status !== 422) throw new Error(`GitHub ha risposto ${r.status}`);
      // 409/422: qualcun altro ha salvato nel frattempo, riprova con i dati nuovi
    }
    throw new Error("Salvataggio non riuscito, riprova");
  }

  // Pannello "Nuova tappa": nome, posizione (cerca o tocca la mappa), nota
  let puntoScelto = null;
  const segnoNuovo = L.marker([0, 0], {
    icon: L.divIcon({ className: "segnaposto-tappa nuova", iconSize: [20, 20], iconAnchor: [10, 10] })
  });

  function scegliPunto(latlng, testoStato) {
    puntoScelto = latlng;
    segnoNuovo.setLatLng(latlng).addTo(mappa);
    $("nt-stato").textContent = testoStato || "📍 Posizione scelta";
    $("nt-salva").disabled = !$("nt-nome").value.trim();
  }

  $("btn-aggiungi-tappa").addEventListener("click", () => {
    const p = posti[postoAperto];
    chiudi("scheda");
    $("nt-titolo").textContent = `Nuova tappa · ${p.nome}`;
    $("nt-nome").value = "";
    $("nt-nota").value = "";
    $("nt-stato").textContent = "Scrivi il nome e tocca 🔍, oppure tocca la mappa";
    $("nt-errore").textContent = "";
    $("nt-salva").disabled = true;
    puntoScelto = null;
    segnoNuovo.remove();
    mappa.flyTo([p.lat, p.lng], 10, { duration: 1 });
    apri("nuova-tappa");
    $("nt-nome").focus();
  });

  mappa.on("click", (e) => {
    if (!$("nuova-tappa").hidden) scegliPunto(e.latlng);
  });
  $("nt-nome").addEventListener("input", () => {
    $("nt-salva").disabled = !($("nt-nome").value.trim() && puntoScelto);
  });

  $("nt-cerca").addEventListener("click", async () => {
    const nome = $("nt-nome").value.trim();
    if (!nome) return;
    const p = posti[postoAperto];
    $("nt-stato").textContent = "Cerco…";
    try {
      const zona = [p.lng - 1.5, p.lat + 1.5, p.lng + 1.5, p.lat - 1.5].join(",");
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=it&viewbox=${zona}&q=${encodeURIComponent(nome)}`
      );
      const [trovato] = await r.json();
      if (!trovato) {
        $("nt-stato").textContent = "Non trovato: tocca il punto sulla mappa";
        return;
      }
      const ll = L.latLng(+trovato.lat, +trovato.lon);
      mappa.flyTo(ll, 13, { duration: 1 });
      scegliPunto(ll, `📍 ${trovato.display_name.split(",").slice(0, 2).join(",")} — se non è giusto tocca la mappa`);
    } catch (e) {
      $("nt-stato").textContent = "Ricerca non riuscita: tocca il punto sulla mappa";
    }
  });

  function chiudiNuovaTappa() {
    chiudi("nuova-tappa");
    segnoNuovo.remove();
  }
  $("nt-annulla").addEventListener("click", () => {
    chiudiNuovaTappa();
    apriScheda(postoAperto);
  });

  $("nt-salva").addEventListener("click", async () => {
    if (!leggiChiave()) {
      apri("chiave");
      return;
    }
    const p = posti[postoAperto];
    const tappa = {
      nome: $("nt-nome").value.trim(),
      lat: +puntoScelto.lat.toFixed(5),
      lng: +puntoScelto.lng.toFixed(5)
    };
    const nota = $("nt-nota").value.trim();
    if (nota) tappa.nota = nota;
    $("nt-salva").disabled = true;
    $("nt-errore").textContent = "";
    $("nt-stato").textContent = "Salvo…";
    try {
      const dati = await salvaTappa(p.nome, tappa);
      uniscAggiunte(dati);
      chiudiNuovaTappa();
      apriScheda(postoAperto);
    } catch (e) {
      $("nt-salva").disabled = false;
      $("nt-stato").textContent = "";
      if (e.message === "chiave") {
        $("nt-errore").textContent = "Codice d'accesso non valido o scaduto: inseriscilo di nuovo.";
        apri("chiave");
      } else {
        $("nt-errore").textContent = e.message;
      }
    }
  });

  // Codice d'accesso GitHub, salvato solo su questo telefono
  $("ch-salva").addEventListener("click", () => {
    try { localStorage.setItem("chiave-github", $("ch-valore").value.trim()); } catch (e) {}
    $("ch-valore").value = "";
    chiudi("chiave");
    $("nt-salva").click();
  });

  // --- Foto a schermo intero ----------------------------------------------
  const visore = $("visore");
  function apriVisore(src) {
    visore.querySelector("img").src = src;
    visore.hidden = false;
  }
  visore.addEventListener("click", () => (visore.hidden = true));

  // --- Funzionamento offline / installazione ------------------------------
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }

  $("versione").textContent = window.VERSIONE || "";

  // Tasto ⟳: butta via le copie salvate e ricarica tutto dal sito
  $("btn-aggiorna").addEventListener("click", async () => {
    $("btn-aggiorna").classList.add("gira");
    try {
      const chiavi = await caches.keys();
      await Promise.all(chiavi.map((k) => caches.delete(k)));
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) await reg.update();
    } finally {
      location.reload();
    }
  });
})();
