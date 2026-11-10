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
  let tappaScelta = -1; // -1 = foto e canzone del posto, altrimenti la tappa scelta
  let datiMedia = {};
  const SEP = " › ";
  const corrente = () => {
    const p = posti[postoAperto];
    return tappaScelta >= 0 && p.tappe && p.tappe[tappaScelta] ? p.tappe[tappaScelta] : p;
  };

  // Dà a ogni posto e a ogni tappa la sua chiave e le sue foto/audio caricati
  function applicaMedia() {
    posti.forEach((p) => {
      p.chiave = p.nome;
      const m = datiMedia[p.chiave] || {};
      p.fotoAggiunte = m.foto || [];
      p.audioAggiunto = m.audio || null;
      (p.tappe || []).forEach((t) => {
        t.chiave = p.nome + SEP + t.nome;
        t.padre = p;
        const mt = datiMedia[t.chiave] || {};
        t.fotoAggiunte = mt.foto || [];
        t.audioAggiunto = mt.audio || null;
      });
    });
  }

  // aggiorna = true: ridisegna la scheda già aperta senza tornare in cima e senza perdere la tappa scelta
  function apriScheda(i, vola, aggiorna) {
    const p = posti[i];
    if (!aggiorna || postoAperto !== i) tappaScelta = -1;
    postoAperto = i;
    applicaMedia();
    const scorrimento = aggiorna ? $("scheda").scrollTop : 0;
    const tappe = p.tappe || [];
    if (tappaScelta >= tappe.length) tappaScelta = -1;
    const b = corrente();
    const scelta = b !== p;

    chiudi("elenco");
    $("scheda-emoji").textContent = p.emoji || "📍";
    $("scheda-nome").textContent = p.nome;
    $("scheda-data").textContent = p.data || "";
    $("scheda-nota").textContent = p.nota || "";
    if (!aggiorna) $("media-stato").textContent = "";

    // Tappe: tocca per scegliere (poi foto e audio sono di quella tappa), 🗺 per vederla sulla mappa
    const listaTappe = $("scheda-tappe");
    listaTappe.innerHTML = "";
    tappe.forEach((t, k) => {
      const li = document.createElement("li");
      if (k === tappaScelta) li.className = "scelta";
      li.innerHTML = `<span>${testo(t.nome)}</span>${t.nota ? `<small>${testo(t.nota)}</small>` : ""}<button class="vai-mappa" aria-label="Vedi ${testo(t.nome)} sulla mappa">🗺</button>`;
      li.addEventListener("click", () => {
        tappaScelta = tappaScelta === k ? -1 : k;
        $("media-stato").textContent = "";
        apriScheda(postoAperto, false, true);
        if (tappaScelta >= 0) $("titolo-foto").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      li.querySelector(".vai-mappa").addEventListener("click", (e) => {
        e.stopPropagation();
        chiudi("scheda");
        mappa.flyTo([t.lat, t.lng], 13, { duration: 1.2 });
        mappa.once("moveend", () => segnapostiTappe[i][k].openTooltip());
      });
      listaTappe.appendChild(li);
    });
    if (!tappe.length) listaTappe.innerHTML = '<li class="vuoto">Nessuna tappa ancora</li>';

    // Titoli con il nome di cosa stai guardando (il posto o la tappa scelta)
    const nomeScelto = scelta ? ` · ${b.nome}` : "";
    $("titolo-foto").textContent = "📷 Foto" + nomeScelto;
    $("titolo-musica").textContent = "🎵 " + (scelta ? "Canzone" : "La nostra canzone") + nomeScelto;
    $("titolo-giochi").textContent = "🎮 Giochi" + nomeScelto;
    $("btn-torna-posto").hidden = !scelta;
    $("btn-torna-posto").textContent = `← Foto e canzone di ${p.nome}`;

    const galleria = $("scheda-foto");
    galleria.innerHTML = "";
    tutteFoto(b).forEach((src) => {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = b.nome;
      conFallback(img, src);
      img.addEventListener("click", () => apriVisore(b, [...galleria.querySelectorAll("img")].indexOf(img)));
      galleria.appendChild(img);
    });
    if (b.album) {
      const link = document.createElement("a");
      link.className = "btn-album";
      link.href = b.album;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Apri l'album delle foto 📷";
      galleria.appendChild(link);
    }
    if (!galleria.children.length) {
      galleria.innerHTML = `<p class="vuoto">Nessuna foto${scelta ? ` di ${testo(b.nome)}` : ""} ancora. Le aggiungeremo presto 💛</p>`;
    }

    $("scheda-musica").innerHTML = htmlMusica(b.musica);
    if (b.audioAggiunto) {
      const blocco = document.createElement("div");
      blocco.innerHTML = `${b.audioAggiunto.titolo ? `<p>${testo(b.audioAggiunto.titolo)}</p>` : ""}<audio controls preload="none"></audio><button class="btn-secondario largo" style="margin-top:8px">🗑 Elimina audio caricato</button>`;
      conFallback(blocco.querySelector("audio"), b.audioAggiunto.file);
      blocco.querySelector("button").addEventListener("click", () => {
        if (confirm("Eliminare questo audio?")) conChiave(() => elimina(b, "audio", b.audioAggiunto.file));
      });
      $("scheda-musica").appendChild(blocco);
    }
    const fileAudio = audioDi(b);
    $("btn-puzzle").disabled = !tutteFoto(b).length;
    $("btn-ritmo").disabled = !fileAudio;
    $("giochi-info").textContent =
      !tutteFoto(b).length && !fileAudio ? "Carica una foto per il puzzle e un audio per il ritmo."
      : !tutteFoto(b).length ? "Carica una foto per giocare al puzzle."
      : !fileAudio ? "Carica un file audio per giocare al ritmo."
      : "";
    apri("scheda");
    $("scheda").scrollTop = scorrimento;

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
  $("btn-torna-posto").addEventListener("click", () => {
    tappaScelta = -1;
    $("media-stato").textContent = "";
    apriScheda(postoAperto, false, true);
  });

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
  const FILE_MEDIA = "media-aggiunti.json";
  const api = (file) => `https://api.github.com/repos/${REPO}/contents/${file}`;

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

  async function scaricaAggiunte(file = FILE_AGGIUNTE) {
    const r = await fetch(`${api(file)}?ref=main&t=${Date.now()}`, { headers: intestazioni(), cache: "no-store" });
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
    if (postoAperto !== null && !$("scheda").hidden) apriScheda(postoAperto, false, true);
  }

  function caricaTappe() {
    scaricaAggiunte()
      .then(({ dati }) => uniscAggiunte(dati))
      .catch(() => {
        // senza GitHub (offline o troppe richieste) prova la copia pubblicata sul sito
        fetch(FILE_AGGIUNTE).then((r) => (r.ok ? r.json() : {})).then(uniscAggiunte).catch(() => {});
      });
  }
  caricaTappe();

  async function salvaTappa(nomePosto, tappa) {
    for (let tentativo = 0; tentativo < 2; tentativo++) {
      const { dati, sha } = await scaricaAggiunte();
      dati[nomePosto] = (dati[nomePosto] || []).concat(tappa);
      const r = await fetch(api(FILE_AGGIUNTE), {
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
    apriScheda(postoAperto, false, true);
  });

  $("nt-salva").addEventListener("click", async () => {
    if (!leggiChiave()) {
      dopoChiave = () => $("nt-salva").click();
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
      apriScheda(postoAperto, false, true);
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
  let dopoChiave = null;
  $("ch-salva").addEventListener("click", () => {
    try { localStorage.setItem("chiave-github", $("ch-valore").value.trim()); } catch (e) {}
    $("ch-valore").value = "";
    chiudi("chiave");
    const azione = dopoChiave;
    dopoChiave = null;
    if (azione) azione();
  });


  // --- Foto e audio caricati dall'app ---------------------------------------
  // I file vanno su GitHub nella cartella media/ (il repo è pubblico: li può vedere chiunque
  // abbia il link). L'elenco sta in media-aggiunti.json, unito a quello di posti.js all'apertura.
  const RAW = `https://raw.githubusercontent.com/${REPO}/main/`;
  const MAX_AUDIO = 25 * 1024 * 1024;

  // Prima il file pubblicato sul sito; se non c'è ancora (Pages ci mette un minuto) prova GitHub
  function conFallback(el, src) {
    if (/^(https?:|data:|blob:)/.test(src)) { el.src = src; return; }
    el.addEventListener("error", function riprova() {
      el.removeEventListener("error", riprova);
      el.src = RAW + src;
    });
    el.src = src;
  }
  const tutteFoto = (p) => (p.foto || []).concat(p.fotoAggiunte || []);
  const audioDi = (p) => (p.audioAggiunto && p.audioAggiunto.file) || (p.musica && p.musica.file) || "";

  function uniscMedia(dati) {
    datiMedia = dati;
    applicaMedia();
    if (postoAperto !== null && !$("scheda").hidden) apriScheda(postoAperto, false, true);
  }
  function caricaMedia() {
    scaricaAggiunte(FILE_MEDIA)
      .then(({ dati }) => uniscMedia(dati))
      .catch(() => {
        fetch(FILE_MEDIA).then((r) => (r.ok ? r.json() : {})).then(uniscMedia).catch(() => {});
      });
  }
  caricaMedia();

  // Quando riapri l'app (o torni su di lei) prende le novità che l'altro telefono ha salvato su GitHub
  let ultimoAggiornamento = Date.now();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || Date.now() - ultimoAggiornamento < 20000) return;
    ultimoAggiornamento = Date.now();
    caricaTappe();
    caricaMedia();
  });

  const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "posto";
  const estensione = (nome) => ((nome.match(/\.([a-z0-9]{2,4})$/i) || [])[1] || "mp3").toLowerCase();

  function inBase64Blob(blob) {
    return new Promise((ok, no) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).split(",")[1]);
      r.onerror = () => no(new Error("Non riesco a leggere il file"));
      r.readAsDataURL(blob);
    });
  }

  // Le foto del telefono pesano molto: le riduco a 1600 px prima di caricarle
  async function ridimensiona(file) {
    let img;
    try {
      img = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (e) {
      img = await new Promise((ok, no) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => no(new Error("Questa foto non si apre"));
        i.src = URL.createObjectURL(file);
      });
    }
    const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
    const k = Math.min(1, 1600 / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("Foto non convertita"))), "image/jpeg", 0.82));
  }

  async function mettiFile(path, blob, messaggio) {
    const r = await fetch(api(path), {
      method: "PUT",
      headers: { ...intestazioni(), "Content-Type": "application/json" },
      body: JSON.stringify({ message: messaggio, content: await inBase64Blob(blob), branch: "main" })
    });
    if (r.status === 401 || r.status === 403) throw new Error("chiave");
    if (!r.ok) throw new Error(`GitHub ha risposto ${r.status}`);
  }

  async function modificaMedia(messaggio, modifica) {
    for (let tentativo = 0; tentativo < 3; tentativo++) {
      const { dati, sha } = await scaricaAggiunte(FILE_MEDIA);
      modifica(dati);
      const r = await fetch(api(FILE_MEDIA), {
        method: "PUT",
        headers: { ...intestazioni(), "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messaggio,
          content: inBase64(JSON.stringify(dati, null, 2) + "\n"),
          branch: "main",
          ...(sha ? { sha } : {})
        })
      });
      if (r.ok) return dati;
      if (r.status === 401 || r.status === 403) throw new Error("chiave");
      if (r.status !== 409 && r.status !== 422) throw new Error(`GitHub ha risposto ${r.status}`);
    }
    throw new Error("Salvataggio non riuscito, riprova");
  }

  function erroreMedia(e) {
    if (e.message === "chiave") {
      $("media-stato").textContent = "Codice d'accesso non valido o scaduto: inseriscilo di nuovo.";
      apri("chiave");
    } else {
      $("media-stato").textContent = "⚠️ " + e.message;
    }
  }

  function conChiave(azione) {
    if (!leggiChiave()) { dopoChiave = azione; apri("chiave"); return; }
    azione();
  }
  async function eliminaFile(path) {
    const r = await fetch(`${api(path)}?ref=main&t=${Date.now()}`, { headers: intestazioni(), cache: "no-store" });
    if (r.status === 404) return;
    if (r.status === 401 || r.status === 403) throw new Error("chiave");
    if (!r.ok) throw new Error(`GitHub ha risposto ${r.status}`);
    const { sha } = await r.json();
    const d = await fetch(api(path), {
      method: "DELETE",
      headers: { ...intestazioni(), "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Elimina ${path}`, sha, branch: "main" })
    });
    if (!d.ok && d.status !== 404) throw new Error(`GitHub ha risposto ${d.status}`);
  }

  // Toglie dall'elenco e poi cancella il file dal repo
  async function elimina(p, tipo, path) {
    const stato = $("media-stato");
    stato.textContent = "Elimino…";
    try {
      const dati = await modificaMedia(`Elimina ${tipo}: ${p.chiave}`, (d) => {
        const m = d[p.chiave];
        if (!m) return;
        if (tipo === "foto") m.foto = (m.foto || []).filter((f) => f !== path);
        else if (m.audio && m.audio.file === path) delete m.audio;
      });
      await eliminaFile(path);
      uniscMedia(dati);
      stato.textContent = tipo === "foto" ? "Foto eliminata ✅" : "Audio eliminato ✅";
    } catch (err) {
      erroreMedia(err);
    }
  }

  $("btn-foto").addEventListener("click", () => conChiave(() => $("in-foto").click()));
  $("btn-audio").addEventListener("click", () => conChiave(() => $("in-audio").click()));

  $("in-foto").addEventListener("change", async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (!files.length) return;
    const p = corrente();
    const stato = $("media-stato");
    const nuove = [];
    try {
      for (let k = 0; k < files.length; k++) {
        stato.textContent = `Carico la foto ${k + 1} di ${files.length}…`;
        const blob = await ridimensiona(files[k]);
        const path = `media/${slug(p.chiave)}/foto-${Date.now()}-${k}.jpg`;
        await mettiFile(path, blob, `Foto: ${p.chiave}`);
        nuove.push(path);
      }
      stato.textContent = "Salvo…";
      const dati = await modificaMedia(`Foto: ${p.chiave}`, (d) => {
        const m = (d[p.chiave] = d[p.chiave] || {});
        m.foto = (m.foto || []).concat(nuove);
      });
      uniscMedia(dati);
      stato.textContent = nuove.length > 1 ? "Foto caricate ✅" : "Foto caricata ✅";
    } catch (err) {
      erroreMedia(err);
    }
  });

  $("in-audio").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const p = corrente();
    const stato = $("media-stato");
    if (file.size > MAX_AUDIO) {
      stato.textContent = "⚠️ Il file pesa troppo (massimo 25 MB).";
      return;
    }
    try {
      stato.textContent = "Carico l'audio… (può volerci un po')";
      const path = `media/${slug(p.chiave)}/canzone-${Date.now()}.${estensione(file.name)}`;
      await mettiFile(path, file, `Audio: ${p.chiave}`);
      stato.textContent = "Salvo…";
      const titolo = file.name.replace(/\.[a-z0-9]{2,4}$/i, "");
      const dati = await modificaMedia(`Audio: ${p.chiave}`, (d) => {
        const m = (d[p.chiave] = d[p.chiave] || {});
        m.audio = { file: path, titolo };
      });
      uniscMedia(dati);
      stato.textContent = "Audio caricato ✅";
    } catch (err) {
      erroreMedia(err);
    }
  });

  // --- Giochi ----------------------------------------------------------------
  $("btn-puzzle").addEventListener("click", () => {
    const p = corrente();
    const lista = tutteFoto(p);
    const src = lista[Math.floor(Math.random() * lista.length)];
    window.GIOCHI.puzzle(src, p.nome, RAW);
  });
  $("btn-ritmo").addEventListener("click", () => {
    const p = corrente();
    window.GIOCHI.ritmo(audioDi(p), (p.audioAggiunto && p.audioAggiunto.titolo) || (p.musica && p.musica.titolo) || p.nome, RAW);
  });

  // --- Foto a schermo intero ----------------------------------------------
  const visore = $("visore");
  let fotoVisore = null;
  let visorePosto = null, visoreIndice = 0;
  // Mostra la foto come una cartolina: cornice, nastro adesivo, nome del posto e francobollo
  function mostraCartolina() {
    const p = visorePosto;
    const lista = tutteFoto(p);
    const src = lista[visoreIndice];
    const img = visore.querySelector("img");
    conFallback(img, src);
    const fig = visore.querySelector(".cartolina");
    fig.style.setProperty("--inclina", (visoreIndice % 2 ? 1.2 : -1.2) + "deg");
    fig.classList.remove("entra");
    void fig.offsetWidth;
    fig.classList.add("entra");
    $("cart-nome").textContent = p.nome;
    $("cart-data").textContent = p.padre ? p.padre.nome : p.data || "";
    $("cart-emoji").textContent = (p.padre || p).emoji || "📍";
    const caricata = (p.fotoAggiunte || []).includes(src);
    fotoVisore = caricata ? { posto: p, path: src } : null;
    $("visore-elimina").hidden = !fotoVisore;
    $("visore-prec").hidden = $("visore-succ").hidden = lista.length < 2;
  }
  function apriVisore(p, indice) {
    visorePosto = p;
    visoreIndice = Math.max(0, indice);
    mostraCartolina();
    visore.hidden = false;
  }
  function altraFoto(passo) {
    const n = tutteFoto(visorePosto).length;
    visoreIndice = (visoreIndice + passo + n) % n;
    mostraCartolina();
  }
  $("visore-prec").addEventListener("click", (e) => { e.stopPropagation(); altraFoto(-1); });
  $("visore-succ").addEventListener("click", (e) => { e.stopPropagation(); altraFoto(1); });
  // scorri col dito per cambiare foto
  let inizioX = null;
  visore.addEventListener("touchstart", (e) => { inizioX = e.touches[0].clientX; }, { passive: true });
  visore.addEventListener("touchend", (e) => {
    if (inizioX === null || tutteFoto(visorePosto).length < 2) return;
    const dx = e.changedTouches[0].clientX - inizioX;
    inizioX = null;
    if (Math.abs(dx) > 50) { visore.dataset.scorso = "1"; altraFoto(dx < 0 ? 1 : -1); }
  });
  visore.addEventListener("click", () => {
    if (visore.dataset.scorso) { delete visore.dataset.scorso; return; } // era uno scorrimento, non un tocco
    visore.hidden = true;
  });
  $("visore-elimina").addEventListener("click", (e) => {
    e.stopPropagation();
    if (!fotoVisore || !confirm("Eliminare questa foto?")) return;
    const { posto, path } = fotoVisore;
    visore.hidden = true;
    conChiave(() => elimina(posto, "foto", path));
  });

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
