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
  const segnapostiTappe = posti.map((posto, i) =>
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
  $("conteggio").textContent = posti.length;
  const lista = $("lista-posti");
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
  $("btn-elenco").addEventListener("click", () => {
    chiudi("scheda");
    $("elenco").hidden ? apri("elenco") : chiudi("elenco");
  });

  // --- Scheda del posto ----------------------------------------------------
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
    $("scheda-tappe-box").hidden = !tappe.length;

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
})();
