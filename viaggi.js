/*
 * VIAGGI · prenotazioni e posti da visitare
 * Tre schede: Prenotati, Da prenotare, Da visitare.
 * I dati stanno in viaggi.json sul repo (come le tappe): chi apre l'app li vede,
 * per aggiungere o cambiare serve il codice d'accesso GitHub.
 */
(function () {
  "use strict";
  const A = window.APP;
  const $ = (id) => document.getElementById(id);
  const FILE = "viaggi.json";
  const TIPI = [["🏨", "Hotel"], ["🏡", "Casa o villa"], ["🌾", "Agriturismo"], ["✈️", "Volo"], ["🚆", "Treno"], ["🚗", "Auto"], ["🎟️", "Altro"]];

  let dati = { prenotazioni: [], daVisitare: [] };
  let scheda = "prenotati"; // prenotati | daprenotare | davisitare
  let inModifica = null;    // null = elenco, oggetto = modulo aperto

  const nuovoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const euro = (n) => (Number(n) || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
  const giorno = (iso, conAnno) => {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("it-IT", { day: "numeric", month: "short", ...(conAnno ? { year: "numeric" } : {}) });
  };
  const periodo = (p) => {
    if (p.dal && p.al) return `${giorno(p.dal)} → ${giorno(p.al, true)}`;
    return p.dal ? giorno(p.dal, true) : "";
  };

  function unisci(d) {
    dati = { prenotazioni: d.prenotazioni || [], daVisitare: d.daVisitare || [] };
    if (!$("viaggi").hidden && !inModifica) disegna();
    aggiornaMappa();
    if (!$("luogo").hidden) disegnaLuogo();
  }
  function ricarica() {
    A.scaricaJson(FILE)
      .then(({ dati: d }) => unisci(d))
      .catch(() => fetch(FILE).then((r) => (r.ok ? r.json() : {})).then(unisci).catch(() => {}));
  }

  function errore(testo) {
    $("viaggi-stato").textContent = testo || "";
    $("luogo-stato").textContent = testo || "";
  }

  // Salva su GitHub: modifica il file e ridisegna
  async function salva(messaggio, modifica) {
    errore("Salvo…");
    try {
      const d = await A.modificaJson(FILE, messaggio, (x) => {
        x.prenotazioni = x.prenotazioni || [];
        x.daVisitare = x.daVisitare || [];
        modifica(x);
      });
      inModifica = null;
      errore("");
      unisci(d);
      disegna();
      return true;
    } catch (e) {
      if (e.message === "chiave") {
        errore("Codice d'accesso non valido o scaduto: inseriscilo di nuovo.");
        A.apri("chiave");
      } else {
        errore("⚠️ " + e.message);
      }
      return false;
    }
  }
  const conChiave = (azione) => A.conChiave(azione);

  function el(tag, classe, html) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  const t = A.testo;

  // --- Elenco prenotazioni -------------------------------------------------
  function elencoPrenotazioni(stato) {
    const corpo = $("viaggi-corpo");
    const lista = dati.prenotazioni
      .filter((p) => (p.stato || "prenotato") === (stato === "prenotati" ? "prenotato" : "daprenotare"))
      .sort((a, b) => (a.dal || "9999").localeCompare(b.dal || "9999"));

    if (stato === "prenotati") {
      const totale = lista.reduce((s, p) => s + (Number(p.prezzo) || 0), 0);
      const daPagare = lista.filter((p) => !p.pagato).reduce((s, p) => s + (Number(p.prezzo) || 0), 0);
      if (lista.length) corpo.appendChild(el("p", "riepilogo", `Totale <b>${euro(totale)}</b> · ancora da pagare <b>${euro(daPagare)}</b>`));
    }
    lista.forEach((p) => {
      const emoji = (TIPI.find((x) => x[1] === p.tipo) || TIPI[TIPI.length - 1])[0];
      const riga = el("div", "voce");
      riga.innerHTML = `<span class="voce-emoji">${emoji}</span>
        <span class="voce-testo"><b>${t(p.nome || "Senza nome")}</b>
          ${periodo(p) ? `<small>${t(periodo(p))}</small>` : ""}
          ${p.note ? `<small>${t(p.note)}</small>` : ""}
          ${p.scadenza && !p.pagato ? `<small class="scade">Da pagare entro ${t(giorno(p.scadenza, true))}</small>` : ""}</span>
        <span class="voce-lato">${p.prezzo ? `<b>${euro(p.prezzo)}</b>` : ""}${stato === "prenotati" ? (p.pagato ? '<small class="pagato">pagato ✓</small>' : '<small class="scade">da pagare</small>') : ""}</span>`;
      riga.addEventListener("click", () => { inModifica = p; disegna(); });
      corpo.appendChild(riga);
      if (stato === "daprenotare") {
        const b = el("button", "btn-secondario largo", "✅ Fatto: segna come prenotato");
        b.style.marginBottom = "10px";
        b.addEventListener("click", () => conChiave(() => salva(`Prenotato: ${p.nome}`, (d) => {
          const x = d.prenotazioni.find((y) => y.id === p.id);
          if (x) x.stato = "prenotato";
        })));
        corpo.appendChild(b);
      }
    });
    if (!lista.length) corpo.appendChild(el("p", "vuoto", stato === "prenotati" ? "Nessuna prenotazione ancora." : "Niente da prenotare per ora 🎉"));
    const nuova = el("button", "btn-primario largo", "+ Nuova " + (stato === "prenotati" ? "prenotazione" : "da prenotare"));
    nuova.style.marginTop = "12px";
    nuova.addEventListener("click", () => { inModifica = { id: "", stato: stato === "prenotati" ? "prenotato" : "daprenotare", tipo: "Hotel" }; disegna(); });
    corpo.appendChild(nuova);
  }

  // --- Modulo ----------------------------------------------------------------
  function modulo(p) {
    const corpo = $("viaggi-corpo");
    const nuovo = !p.id;
    const f = el("form", "modulo");
    f.innerHTML = `
      <label>Cosa<select id="v-tipo">${TIPI.map((x) => `<option ${x[1] === p.tipo ? "selected" : ""}>${x[1]}</option>`).join("")}</select></label>
      <label>Nome<input id="v-nome" type="text" placeholder="es. Hotel Aroiste" value="${t(p.nome || "")}" autocomplete="off"></label>
      <div class="riga"><label>Dal<input id="v-dal" type="date" value="${t(p.dal || "")}"></label><label>Al<input id="v-al" type="date" value="${t(p.al || "")}"></label></div>
      <label>Stato<select id="v-stato"><option value="prenotato" ${p.stato !== "daprenotare" ? "selected" : ""}>Prenotato</option><option value="daprenotare" ${p.stato === "daprenotare" ? "selected" : ""}>Da prenotare</option></select></label>
      <label>Prezzo (€)<input id="v-prezzo" type="number" inputmode="decimal" step="0.01" min="0" value="${p.prezzo || ""}"></label>
      <label class="spunta"><input id="v-pagato" type="checkbox" ${p.pagato ? "checked" : ""}> Già pagato</label>
      <label>Da pagare entro<input id="v-scadenza" type="date" value="${t(p.scadenza || "")}"></label>
      <label>Link (Booking, ecc.)<input id="v-link" type="url" placeholder="https://…" value="${t(p.link || "")}"></label>
      <label>Note<input id="v-note" type="text" placeholder="es. colazione inclusa" value="${t(p.note || "")}" autocomplete="off"></label>`;
    corpo.appendChild(f);
    if (p.link) {
      const a = el("a", "btn-secondario largo", "Apri il link ↗");
      a.href = p.link; a.target = "_blank"; a.rel = "noopener";
      a.style.display = "block"; a.style.textAlign = "center"; a.style.textDecoration = "none"; a.style.margin = "10px 0";
      corpo.appendChild(a);
    }
    const riga = el("div", "riga");
    const annulla = el("button", "btn-secondario", "Annulla");
    annulla.type = "button";
    annulla.addEventListener("click", () => { inModifica = null; errore(""); disegna(); });
    const salvaB = el("button", "btn-primario", "Salva");
    salvaB.type = "button";
    salvaB.addEventListener("click", () => {
      const v = (id) => $(id).value.trim();
      const voce = {
        id: p.id || nuovoId(),
        stato: v("v-stato"),
        tipo: v("v-tipo"),
        nome: v("v-nome"),
        dal: v("v-dal"), al: v("v-al"),
        prezzo: v("v-prezzo") ? Number(v("v-prezzo")) : "",
        pagato: $("v-pagato").checked,
        scadenza: v("v-scadenza"),
        link: v("v-link"),
        note: v("v-note")
      };
      if (!voce.nome) { errore("Scrivi almeno il nome."); return; }
      conChiave(() => salva(`${nuovo ? "Nuova prenotazione" : "Prenotazione"}: ${voce.nome}`, (d) => {
        const i = d.prenotazioni.findIndex((y) => y.id === voce.id);
        if (i >= 0) d.prenotazioni[i] = voce; else d.prenotazioni.push(voce);
      }));
    });
    riga.append(annulla, salvaB);
    corpo.appendChild(riga);
    if (!nuovo) {
      const del = el("button", "btn-secondario largo", "🗑 Elimina");
      del.type = "button";
      del.addEventListener("click", () => {
        if (!confirm("Eliminare questa prenotazione?")) return;
        conChiave(() => salva(`Elimina prenotazione: ${p.nome}`, (d) => {
          d.prenotazioni = d.prenotazioni.filter((y) => y.id !== p.id);
        }));
      });
      corpo.appendChild(del);
    }
  }

  // --- Da visitare -----------------------------------------------------------
  const LUOGHI = () => window.LUOGHI || {};
  const coord = (x) => {
    const g = LUOGHI()[x.nome] || {};
    const lat = x.lat != null ? x.lat : g.lat, lng = x.lng != null ? x.lng : g.lng;
    return lat != null && lng != null ? { lat, lng } : null;
  };
  async function geocoda(nome) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=it&q=${encodeURIComponent(nome)}`);
      const [x] = await r.json();
      return x ? { lat: +(+x.lat).toFixed(5), lng: +(+x.lon).toFixed(5) } : null;
    } catch (e) { return null; }
  }
  const mostraSuMappa = () => { try { return localStorage.getItem("mostra-davisitare") !== "0"; } catch (e) { return true; } };

  // Puntini grigi sulla mappa per i posti ancora da visitare
  const livelloVisitare = L.layerGroup();
  function aggiornaMappa() {
    livelloVisitare.clearLayers();
    if (!mostraSuMappa()) { A.mappa.removeLayer(livelloVisitare); return; }
    dati.daVisitare.filter((x) => !x.fatto).forEach((x) => {
      const c = coord(x);
      if (!c) return;
      L.marker([c.lat, c.lng], {
        icon: L.divIcon({ className: "segnaposto segnaposto-grigio", html: "<span>🧭</span>", iconSize: [30, 30], iconAnchor: [15, 15] }),
        title: x.nome
      }).on("click", () => apriLuogo(x.id)).addTo(livelloVisitare);
    });
    livelloVisitare.addTo(A.mappa);
  }

  function elencoDaVisitare() {
    const corpo = $("viaggi-corpo");
    const riga = el("div", "riga");
    riga.innerHTML = `<input id="dv-nome" type="text" placeholder="Posto da visitare" autocomplete="off"><button id="dv-aggiungi" class="btn-primario stretto">+</button>`;
    corpo.appendChild(riga);
    const aggiungi = () => {
      const nome = $("dv-nome").value.trim();
      if (!nome) return;
      conChiave(async () => {
        errore("Cerco il posto sulla mappa…");
        const c = await geocoda(nome);
        salva(`Da visitare: ${nome}`, (d) => d.daVisitare.push({ id: nuovoId(), nome, fatto: false, ...(c || {}) }));
      });
    };
    $("dv-aggiungi").addEventListener("click", aggiungi);
    $("dv-nome").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); aggiungi(); } });

    const mappaRiga = el("label", "spunta", `<input type="checkbox" ${mostraSuMappa() ? "checked" : ""}> <span>Mostra sulla mappa i posti da visitare</span>`);
    mappaRiga.style.margin = "8px 0";
    mappaRiga.querySelector("input").addEventListener("change", (e) => {
      try { localStorage.setItem("mostra-davisitare", e.target.checked ? "1" : "0"); } catch (err) { /* ok */ }
      aggiornaMappa();
    });
    corpo.appendChild(mappaRiga);

    const ordinati = [...dati.daVisitare].sort((a, b) => Number(!!a.fatto) - Number(!!b.fatto));
    const fatti = ordinati.filter((x) => x.fatto).length;
    corpo.appendChild(el("p", "riepilogo", `${dati.daVisitare.length - fatti} da visitare · ${fatti} visitati · tocca un nome per la scheda`));
    ordinati.forEach((x) => {
      const r = el("div", "voce visita" + (x.fatto ? " fatto" : ""));
      r.innerHTML = `<input type="checkbox" class="cb" aria-label="Visitato" ${x.fatto ? "checked" : ""}><span class="nome-luogo">${t(x.nome)}${coord(x) ? "" : " <small>(senza posizione)</small>"}</span><button class="btn-chiudi" aria-label="Elimina">✕</button>`;
      r.querySelector("input").addEventListener("change", () => conChiave(() => salva(`${x.fatto ? "Da rivisitare" : "Visitato"}: ${x.nome}`, (d) => {
        const y = d.daVisitare.find((z) => z.id === x.id);
        if (y) y.fatto = !y.fatto;
      })));
      r.querySelector(".nome-luogo").addEventListener("click", () => apriLuogo(x.id));
      r.querySelector("button").addEventListener("click", () => {
        if (confirm(`Togliere ${x.nome} dalla lista?`)) conChiave(() => salva(`Tolto: ${x.nome}`, (d) => { d.daVisitare = d.daVisitare.filter((z) => z.id !== x.id); }));
      });
      corpo.appendChild(r);
    });
  }

  // --- Scheda di un posto da visitare -----------------------------------------
  let luogoId = null;
  const cerca = (q) => "https://www.google.com/search?q=" + encodeURIComponent(q);
  function link(testo, url) {
    const a = el("a", "btn-secondario largo", testo);
    a.href = url; a.target = "_blank"; a.rel = "noopener";
    a.style.display = "block"; a.style.textAlign = "center"; a.style.textDecoration = "none";
    return a;
  }
  const modificaLuogo = (msg, fn) => conChiave(() => salva(msg, (d) => {
    const y = d.daVisitare.find((z) => z.id === luogoId);
    if (y) fn(y);
  }));

  function apriLuogo(id) {
    luogoId = id;
    A.chiudi("elenco"); A.chiudi("scheda"); A.chiudi("viaggi");
    errore("");
    disegnaLuogo();
    A.apri("luogo");
    $("luogo").scrollTop = 0;
  }

  function lista(titolo, voci) {
    const box = el("div", "guida");
    box.appendChild(el("h3", "", titolo));
    const ul = el("ul");
    voci.forEach((v) => ul.appendChild(el("li", "", t(v))));
    box.appendChild(ul);
    return box;
  }

  function disegnaLuogo() {
    const x = dati.daVisitare.find((y) => y.id === luogoId);
    if (!x) { A.chiudi("luogo"); return; }
    const scorrimento = $("luogo").scrollTop;
    const g = LUOGHI()[x.nome] || {};
    const c = coord(x);
    $("luogo-titolo").textContent = (x.fatto ? "✅ " : "🧭 ") + x.nome;
    const corpo = $("luogo-corpo");
    corpo.innerHTML = "";

    // azioni
    const az = el("div", "riga");
    const vis = el("button", "btn-secondario largo", x.fatto ? "↩ Da rivisitare" : "✅ Visitato");
    vis.addEventListener("click", () => modificaLuogo(`${x.fatto ? "Da rivisitare" : "Visitato"}: ${x.nome}`, (y) => { y.fatto = !y.fatto; }));
    az.appendChild(vis);
    const mp = el("button", "btn-secondario largo", c ? "🗺 Sulla mappa" : "📍 Trova sulla mappa");
    mp.addEventListener("click", () => {
      if (c) {
        A.chiudi("luogo");
        A.mappa.flyTo([c.lat, c.lng], 11, { duration: 1.2 });
      } else {
        conChiave(async () => {
          errore("Cerco il posto sulla mappa…");
          const r = await geocoda(x.nome);
          if (!r) { errore("Non lo trovo: prova a scrivere il nome con la regione (es. Gubbio Umbria)."); return; }
          salva(`Posizione: ${x.nome}`, (d) => { const y = d.daVisitare.find((z) => z.id === x.id); if (y) Object.assign(y, r); });
        });
      }
    });
    az.appendChild(mp);
    corpo.appendChild(az);

    // quando + eventi
    corpo.appendChild(el("h3", "", "📅 Quando e eventi"));
    const qd = el("div", "riga");
    qd.innerHTML = `<label class="campo">Dal<input id="lg-dal" type="date" value="${t(x.dal || "")}"></label><label class="campo">Al<input id="lg-al" type="date" value="${t(x.al || "")}"></label>`;
    corpo.appendChild(qd);
    const rd = el("div", "riga");
    const salvaD = el("button", "btn-secondario largo", "Salva date");
    salvaD.addEventListener("click", () => modificaLuogo(`Date: ${x.nome}`, (y) => { y.dal = $("lg-dal").value; y.al = $("lg-al").value; }));
    const ev = el("button", "btn-secondario largo", "🎉 Eventi in quelle date");
    ev.addEventListener("click", () => {
      const dal = $("lg-dal").value, al = $("lg-al").value;
      const quando = dal && al ? ` dal ${giorno(dal)} al ${giorno(al, true)}` : dal ? ` il ${giorno(dal, true)}` : "";
      window.open(cerca(`eventi sagre concerti a ${x.nome}${quando}`), "_blank", "noopener");
    });
    rd.append(salvaD, ev);
    corpo.appendChild(rd);

    // guida
    corpo.appendChild(el("h3", "", "👀 Cosa vedere e mangiare"));
    const vivoV = el("div", "riassunto"), vivoP = el("div", "riassunto");
    const boxRis = el("div", "riassunto");
    const box = boxRis;
    const nomePulito = x.nome.replace(/ \(.*\)$/, "");
    const KEY = {
      vedere: /cosa vedere|da vedere|monument|luoghi d.interesse|attrazion|architetture|patrimonio|siti d/i,
      piatti: /a tavola|mangiare|cucina|gastronomia|prodotti tipici|piatti|enogastronom|specialit/i,
    };
    const CUCINE = { "Toscana": "Cucina toscana", "Sicilia": "Cucina siciliana", "Calabria": "Cucina calabrese", "Campania": "Cucina campana", "Puglia": "Cucina pugliese", "Abruzzo": "Cucina abruzzese", "Marche": "Cucina marchigiana", "Umbria": "Cucina umbra", "Lazio": "Cucina laziale", "Veneto": "Cucina veneta", "Friuli": "Cucina friulana", "Lombardia": "Cucina lombarda", "Liguria": "Cucina ligure", "Piemonte": "Cucina piemontese", "Emilia": "Cucina emiliana", "Romagna": "Cucina romagnola", "Sardegna": "Cucina sarda", "Basilicata": "Cucina lucana", "Molise": "Cucina molisana", "Trentino": "Cucina trentina", "Alto Adige": "Cucina altoatesina", "Valle d'Aosta": "Cucina valdostana" };
    const imgDi = {};
    const imgHtml = (u, cls) => (u ? `<img class="${cls}" src="${t(u)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "");
    async function testoWiki(host) {
      const u = `https://${host}/w/api.php?action=query&prop=extracts%7Cpageimages&pithumbsize=400&explaintext=1&redirects=1&format=json&origin=*&titles=${encodeURIComponent(nomePulito)}`;
      const r = await fetch(u);
      if (!r.ok) return "";
      const j = await r.json();
      const p = Object.values((j.query && j.query.pages) || {})[0];
      if (p && p.thumbnail) imgDi[host] = p.thumbnail.source;
      return p && p.extract ? p.extract : "";
    }
    function sezione(testo, re) {
      const parti = testo.split(/\n== *([^=\n]+?) *==\n/);
      let out = "";
      for (let i = 1; i < parti.length; i += 2) {
        if (re.test(parti[i]) && parti[i + 1] && parti[i + 1].trim().length > 40) out += parti[i + 1].trim() + "\n";
        if (out.length > 1800) break;
      }
      return out.trim();
    }
    function taglia(txt, max) {
      txt = txt.replace(/\n==+ *([^=\n]+?) *==+/g, "\n$1:").replace(/\n{3,}/g, "\n\n");
      if (txt.length <= max) return txt;
      const c = txt.slice(0, max);
      const p = Math.max(c.lastIndexOf(". "), c.lastIndexOf("\n"));
      return (p > max / 2 ? c.slice(0, p + 1) : c) + " …";
    }
    async function daInternet(tipo, etichetta, box = boxRis) {
      box.textContent = "Cerco su Wikivoyage e Wikipedia…";
      try {
        let testo = "", fonte = "", titolo = nomePulito;
        const fulls = {};
        for (const host of ["it.wikivoyage.org", "it.wikipedia.org"]) {
          const full = await testoWiki(host).catch(() => "");
          fulls[host] = full;
          const sez = full ? sezione(full, KEY[tipo]) : "";
          if (sez) { testo = sez; fonte = host; break; }
        }
        if (!testo) {
          // 2° tentativo: i paragrafi della pagina che parlano dell'argomento
          const RE = tipo === "piatti"
            ? /piatti|cucina|gastronom|specialit|prodott[oi] tipic|vino|olio|dolci|ricett/i
            : /chiesa|palazzo|museo|castello|torre|monument|santuario|abbazia|piazza|parco|spiaggia|rocca|fortezza|borgo|riserva/i;
          for (const host of ["it.wikipedia.org", "it.wikivoyage.org"]) {
            const full = fulls[host];
            if (!full) continue;
            const par = full.split(/\n+/).filter((r) => r.length > 60 && !/^=/.test(r) && RE.test(r)).slice(0, 4);
            if (par.length) { testo = par.join("\n\n"); fonte = host; break; }
          }
        }
        if (!testo && tipo === "piatti") {
          // 3° tentativo: la cucina della regione, ricavata dalla pagina del posto
          const pagina = (fulls["it.wikipedia.org"] || "").slice(0, 4000);
          const reg = Object.keys(CUCINE).find((k) => new RegExp(`\\b${k}\\b`, "i").test(pagina));
          if (reg) {
            const cu = await fetch(`https://it.wikipedia.org/w/api.php?action=query&prop=extracts%7Cpageimages&pithumbsize=400&exintro=1&explaintext=1&redirects=1&format=json&origin=*&titles=${encodeURIComponent(CUCINE[reg])}`).then((r) => r.json()).catch(() => null);
            const pg = cu && Object.values((cu.query && cu.query.pages) || {})[0];
            if (pg && pg.extract) { testo = pg.extract; fonte = "it.wikipedia.org"; titolo = CUCINE[reg]; imgDi["it.wikipedia.org"] = pg.thumbnail ? pg.thumbnail.source : ""; }
          }
        }
        if (!testo) throw new Error("no");
        const wv = fonte === "it.wikivoyage.org";
        const url = `https://${fonte}/wiki/${encodeURIComponent(titolo.replace(/ /g, "_"))}`;
        box.innerHTML = `${imgHtml(imgDi[fonte], "foto-guida")}<h4>${t(etichetta)}${titolo !== nomePulito ? ` (${t(titolo)})` : ""}</h4><p style="white-space:pre-line">${t(taglia(testo, 1600))}</p><p><a href="${t(url)}" target="_blank" rel="noopener">Continua su ${wv ? "Wikivoyage" : "Wikipedia"} ↗</a></p>`;
      } catch (e) {
        box.textContent = "Non ho trovato nulla di scritto per questo posto: riprova con i tasti di ricerca qui sotto.";
      }
    }
    function chiaveForm() {
      const f = el("div", "campo-chiave");
      f.innerHTML = `<p class="data">Per i luoghi più popolari: incolla la tua chiave gratuita di <a href="https://opentripmap.io/product" target="_blank" rel="noopener">OpenTripMap</a>.</p><div class="riga"><input type="text" placeholder="Chiave OpenTripMap" autocomplete="off"><button class="btn-secondario stretto">Salva</button></div>`;
      f.querySelector("button").addEventListener("click", () => {
        const v = f.querySelector("input").value.trim();
        if (!v) return;
        try { localStorage.setItem("chiave-otm", v); } catch (e) {}
        vicini();
      });
      vivoV.appendChild(f);
    }
    async function vicini() {
      const c = coord(x);
      if (!c) { vivoV.textContent = ""; return; }
      vivoV.textContent = "Cerco cosa c'è da vedere qui vicino…";
      try {
        const API = "https://it.wikipedia.org/w/api.php?format=json&origin=*&action=query";
        const chiaveOtm = (() => { try { return localStorage.getItem("chiave-otm") || ""; } catch (e) { return ""; } })();
        let top = [], daOtm = false;
        if (chiaveOtm) {
          // OpenTripMap: luoghi turistici con punteggio di popolarità
          try {
            const jo = await fetch(`https://api.opentripmap.com/0.1/en/places/radius?radius=10000&lon=${c.lng}&lat=${c.lat}&rate=2&format=json&limit=60&apikey=${encodeURIComponent(chiaveOtm)}`).then((r) => r.json());
            top = (Array.isArray(jo) ? jo : [])
              .filter((p) => p.name && p.name !== nomePulito)
              .sort((p, q) => parseInt(q.rate, 10) - parseInt(p.rate, 10) || (/h$/.test(String(q.rate)) ? 1 : 0) - (/h$/.test(String(p.rate)) ? 1 : 0))
              .slice(0, 12)
              .map((p) => ({ title: p.name }));
            daOtm = top.length > 0;
          } catch (e) { top = []; }
        }
        if (!top.length) {
          // Wikipedia: i posti nel raggio di 10 km, ordinati per visite (i più famosi per primi)
          const j1 = await fetch(`${API}&generator=geosearch&ggscoord=${c.lat}%7C${c.lng}&ggsradius=10000&ggslimit=50&prop=pageviews&pvipdays=60`).then((r) => r.json());
          const SCARTA = /^(Via|Viale|Piazza della Stazione|Stazione|Linea|Diocesi|Arcidiocesi|Provincia|Comune|Frazioni|Elenco|Lista)\b/i;
          const viste = (p) => Object.values(p.pageviews || {}).reduce((n, v) => n + (v || 0), 0);
          top = Object.values((j1.query && j1.query.pages) || {})
            .filter((p) => p.title !== nomePulito && !SCARTA.test(p.title))
            .sort((p, q) => viste(q) - viste(p))
            .slice(0, 12);
        }
        if (!top.length) throw new Error("no");
        // breve descrizione e miniatura di ciascuno da Wikipedia
        const j2 = await fetch(`${API}&redirects=1&prop=extracts%7Cpageimages&pithumbsize=200&exintro=1&explaintext=1&exsentences=1&exlimit=max&titles=${encodeURIComponent(top.map((p) => p.title).join("|"))}`).then((r) => r.json());
        const dettagli = {};
        const q2 = j2.query || {};
        const rinom = {};
        (q2.redirects || []).forEach((r) => { rinom[r.from] = r.to; });
        (q2.normalized || []).forEach((r) => { rinom[r.from] = r.to; });
        Object.values(q2.pages || {}).forEach((p) => { dettagli[p.title] = p; });
        const pgs = top
          .map((p) => dettagli[rinom[p.title] || p.title] || (daOtm ? { title: p.title, extract: "" } : null))
          .filter((p) => p && (daOtm || (p.extract && p.extract.length > 30)));
        if (!pgs.length) throw new Error("no");
        vivoV.innerHTML = `<h4>Cosa vedere qui vicino</h4><ul>${pgs.slice(0, 10).map((p) => `<li>${imgHtml(p.thumbnail && p.thumbnail.source, "foto-lista")}<b><a href="https://it.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}" target="_blank" rel="noopener">${t(p.title)}</a></b>${p.extract ? `: ${t(p.extract)}` : ""}</li>`).join("")}</ul><p class="data">${daOtm ? "Da OpenTripMap e Wikipedia, in tempo reale." : "Da Wikipedia, in tempo reale."}</p>`;
        if (!daOtm) chiaveForm();
      } catch (e) {
        vivoV.textContent = "";
        daInternet("vedere", "Cosa vedere", vivoV);
      }
    }
    vicini();
    daInternet("piatti", "Piatti tipici", vivoP).then(() => {
      if (/^Non ho trovato/.test(vivoP.textContent)) vivoP.textContent = "";
    });
    const rs = el("button", "btn-secondario largo", "📖 Riassunto da Wikipedia");
    rs.addEventListener("click", async () => {
      box.textContent = "Cerco…";
      try {
        const r = await fetch(`https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(nomePulito)}?redirect=true`);
        const j = r.ok ? await r.json() : null;
        if (!j || j.type === "disambiguation" || !j.extract) throw new Error("no");
        box.innerHTML = `<p>${t(j.extract)}</p>${j.content_urls ? `<p><a href="${t(j.content_urls.desktop.page)}" target="_blank" rel="noopener">Leggi su Wikipedia ↗</a></p>` : ""}`;
      } catch (e) {
        box.textContent = "Nessun riassunto trovato: usa i tasti qui sotto per cercare online.";
      }
    });
    corpo.appendChild(rs);
    const cl = el("div", "riga");
    cl.append(link("Cosa vedere ↗", cerca(`cosa vedere a ${x.nome}`)), link("Piatti tipici ↗", cerca(`piatti tipici ${x.nome} cosa mangiare`)));
    corpo.appendChild(cl);
    corpo.appendChild(link("Guida di viaggio (Wikivoyage) ↗", `https://it.wikivoyage.org/wiki/${encodeURIComponent(nomePulito.replace(/ /g, "_"))}`));
    corpo.appendChild(box);
    [["🔎 Cosa vedere", vivoV], ["🍝 Cosa mangiare", vivoP]].forEach(([tit, cont]) => {
      const d = document.createElement("details");
      d.className = "a-comparsa";
      d.appendChild(el("summary", "", tit));
      d.appendChild(cont);
      corpo.appendChild(d);
    });

    // consigli dell'IA (Gemini, con chiave gratuita di Google AI Studio)
    const ia = document.createElement("details");
    ia.className = "a-comparsa";
    ia.appendChild(el("summary", "", "✨ Consigli dell'IA"));
    const iaBox = el("div", "riassunto");
    ia.appendChild(iaBox);
    corpo.appendChild(ia);
    const lsGet = (k) => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
    function iaDisegna(d, daCache) {
      const voci = (arr) => (arr || []).map((v) => `<li><b>${t(v.nome || "")}</b>${v.descrizione ? `: ${t(v.descrizione)}` : ""}</li>`).join("");
      iaBox.innerHTML = `<h4>Cosa vedere</h4><ul>${voci(d.vedere)}</ul><h4>Piatti tipici</h4><ul>${voci(d.piatti)}</ul><p class="data">Scritto da un'IA: può sbagliare, controlla orari e aperture.${daCache ? " (risposta salvata)" : ""}</p>`;
      const nuova = el("button", "btn-secondario", "Rifai la domanda");
      nuova.addEventListener("click", () => iaChiedi(true));
      iaBox.appendChild(nuova);
    }
    async function iaChiedi(forza) {
      const chiave = lsGet("chiave-gemini");
      if (!chiave) { iaChiave(); return; }
      const cacheKey = `ia-${nomePulito}`;
      if (!forza) {
        try { const c = JSON.parse(lsGet(cacheKey) || "null"); if (c && c.vedere) { iaDisegna(c, true); return; } } catch (e) {}
      }
      iaBox.textContent = "Chiedo all'IA…";
      try {
        const prompt = `Sono in vacanza a ${x.nome} (Italia). Dammi in italiano i luoghi più importanti da visitare lì e nei dintorni e i piatti tipici da mangiare. Rispondi SOLO con JSON: {"vedere":[{"nome":"...","descrizione":"una frase"}],"piatti":[{"nome":"...","descrizione":"una frase"}]} con 6 luoghi e 5 piatti.`;
        let sec = 0;
        const timer = setInterval(() => { sec++; iaBox.textContent = `Chiedo all'IA… ${sec}s`; }, 1000);
        let j = null, ultimoErrore = "";
        try {
          // prima il modello più veloce senza "ragionamento"; se non lo accetta, provo gli altri
          const tentativi = [["gemini-flash-latest", true], ["gemini-flash-latest", false], ["gemini-2.5-flash", true], ["gemini-2.5-flash-lite", false], ["gemini-2.0-flash", false]];
          for (const [modello, senzaPensiero] of tentativi) {
            const ctrl = new AbortController();
            const stop = setTimeout(() => ctrl.abort(), 40000);
            const gc = { responseMimeType: "application/json" };
            if (senzaPensiero) gc.thinkingConfig = { thinkingBudget: 0 };
            let r;
            try {
              r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modello}:generateContent?key=${encodeURIComponent(chiave)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: gc }),
                signal: ctrl.signal,
              });
            } catch (e) {
              throw new Error(e.name === "AbortError" ? "nessuna risposta in 40 secondi" : "connessione fallita");
            } finally { clearTimeout(stop); }
            const jj = await r.json().catch(() => ({}));
            if (r.ok) { j = jj; break; }
            ultimoErrore = `${r.status}: ${(jj.error && jj.error.message) || "errore"}`;
            if (r.status === 401 || r.status === 403) break; // chiave sbagliata: inutile riprovare. Con modello sovraccarico (503), quota (429) o non accettato provo il prossimo
          }
        } finally { clearInterval(timer); }
        if (!j) throw new Error(ultimoErrore || "errore");
        const testo = j.candidates[0].content.parts.map((p) => p.text || "").join("");
        const d = JSON.parse(testo.replace(/^```json|```$/g, "").trim());
        lsSet(cacheKey, JSON.stringify(d));
        iaDisegna(d, false);
      } catch (e) {
        iaBox.innerHTML = `<p class="errore">L'IA non ha risposto (${t(String(e.message || e).slice(0, 200))}). Controlla la chiave o riprova tra poco.</p>`;
        const cambia = el("button", "btn-secondario", "Cambia chiave");
        cambia.addEventListener("click", iaChiave);
        iaBox.appendChild(cambia);
      }
    }
    function iaChiave() {
      iaBox.innerHTML = `<p class="data">Incolla la tua chiave gratuita di <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a> (resta solo su questo telefono).</p><div class="riga"><input type="text" placeholder="Chiave Gemini" autocomplete="off"><button class="btn-secondario stretto">Salva</button></div>`;
      iaBox.querySelector("button").addEventListener("click", () => {
        const v = iaBox.querySelector("input").value.trim();
        if (!v) return;
        lsSet("chiave-gemini", v);
        iaChiedi(false);
      });
    }
    const iaBtn = el("button", "btn-secondario largo", "✨ Chiedi all'IA cosa vedere e mangiare");
    iaBtn.addEventListener("click", () => { ia.open = true; iaChiedi(false); });
    corpo.insertBefore(iaBtn, ia);
    if (lsGet("chiave-gemini") && lsGet(`ia-${nomePulito}`)) { ia.open = true; iaChiedi(false); }

    // appunti
    corpo.appendChild(el("h3", "", "📝 Appunti"));
    const ta = el("textarea");
    ta.id = "lg-appunti"; ta.rows = 4; ta.placeholder = "Scrivi qui cosa vi interessa, orari, idee…"; ta.value = x.appunti || "";
    corpo.appendChild(ta);
    const sa = el("button", "btn-secondario largo", "Salva appunti");
    sa.addEventListener("click", () => modificaLuogo(`Appunti: ${x.nome}`, (y) => { y.appunti = ta.value.trim(); }));
    corpo.appendChild(sa);

    // cose da fare
    corpo.appendChild(el("h3", "", "✅ Cose da fare"));
    (x.cose || []).forEach((k) => {
      const r = el("div", "voce visita" + (k.fatto ? " fatto" : ""));
      r.innerHTML = `<input type="checkbox" class="cb" ${k.fatto ? "checked" : ""}><span class="nome-luogo">${t(k.testo)}</span><button class="btn-chiudi" aria-label="Elimina">✕</button>`;
      r.querySelector("input").addEventListener("change", () => modificaLuogo(`Cosa da fare: ${k.testo}`, (y) => { const q = (y.cose || []).find((z) => z.id === k.id); if (q) q.fatto = !q.fatto; }));
      r.querySelector("button").addEventListener("click", () => modificaLuogo(`Tolta: ${k.testo}`, (y) => { y.cose = (y.cose || []).filter((z) => z.id !== k.id); }));
      corpo.appendChild(r);
    });
    const nc = el("div", "riga");
    nc.innerHTML = `<input id="lg-cosa" type="text" placeholder="Es. centro storico" autocomplete="off"><button class="btn-primario stretto">+</button>`;
    const aggCosa = () => {
      const tx = nc.querySelector("input").value.trim();
      if (tx) modificaLuogo(`Cosa da fare: ${tx}`, (y) => { (y.cose = y.cose || []).push({ id: nuovoId(), testo: tx, fatto: false }); });
    };
    nc.querySelector("button").addEventListener("click", aggCosa);
    nc.querySelector("input").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); aggCosa(); } });
    corpo.appendChild(nc);

    // dove dormire
    corpo.appendChild(el("h3", "", "🛏 Dove dormire"));
    (x.dormire || []).forEach((h) => {
      const r = el("div", "voce");
      r.style.cursor = "default";
      r.innerHTML = `<span class="voce-testo"><b>${t(h.nome)}</b>${h.link ? `<small><a href="${t(h.link)}" target="_blank" rel="noopener">Apri il link ↗</a></small>` : ""}</span><span class="voce-lato">${h.prezzo ? `<b>${euro(h.prezzo)}</b>` : ""}</span>`;
      corpo.appendChild(r);
      const rb = el("div", "riga");
      const pren = el("button", "btn-secondario largo", "Da prenotare →");
      pren.addEventListener("click", () => conChiave(() => salva(`Da prenotare: ${h.nome}`, (d) => {
        d.prenotazioni.push({ id: nuovoId(), stato: "daprenotare", tipo: "Hotel", nome: `${h.nome} (${x.nome})`, dal: x.dal || "", al: x.al || "", prezzo: h.prezzo || "", pagato: false, scadenza: "", link: h.link || "", note: "" });
        const y = d.daVisitare.find((z) => z.id === x.id);
        if (y) y.dormire = (y.dormire || []).filter((z) => z.id !== h.id);
      })));
      const tg = el("button", "btn-secondario", "✕");
      tg.addEventListener("click", () => modificaLuogo(`Tolto: ${h.nome}`, (y) => { y.dormire = (y.dormire || []).filter((z) => z.id !== h.id); }));
      rb.append(pren, tg);
      corpo.appendChild(rb);
    });
    const nd = el("div", "modulo");
    nd.innerHTML = `<input id="lg-hn" type="text" placeholder="Nome (es. Agriturismo Le Querce)" autocomplete="off"><div class="riga"><input id="lg-hp" type="number" inputmode="decimal" step="0.01" min="0" placeholder="Prezzo €"><input id="lg-hl" type="url" placeholder="Link"></div>`;
    corpo.appendChild(nd);
    const adb = el("button", "btn-secondario largo", "+ Aggiungi alloggio");
    adb.addEventListener("click", () => {
      const nome = $("lg-hn").value.trim();
      if (!nome) { errore("Scrivi il nome dell'alloggio."); return; }
      const h = { id: nuovoId(), nome, prezzo: $("lg-hp").value ? Number($("lg-hp").value) : "", link: $("lg-hl").value.trim() };
      modificaLuogo(`Alloggio: ${nome}`, (y) => { (y.dormire = y.dormire || []).push(h); });
    });
    corpo.appendChild(adb);

    $("luogo").scrollTop = scorrimento;
  }

  function disegna() {
    const corpo = $("viaggi-corpo");
    corpo.innerHTML = "";
    document.querySelectorAll("#viaggi .schede button").forEach((b) => b.classList.toggle("on", b.dataset.scheda === scheda));
    $("viaggi").querySelector(".schede").hidden = !!inModifica;
    if (inModifica) { modulo(inModifica); return; }
    if (scheda === "davisitare") elencoDaVisitare(); else elencoPrenotazioni(scheda);
  }

  document.querySelectorAll("#viaggi .schede button").forEach((b) =>
    b.addEventListener("click", () => { scheda = b.dataset.scheda; errore(""); disegna(); })
  );
  $("btn-viaggi").addEventListener("click", () => {
    A.chiudi("elenco");
    A.chiudi("scheda");
    A.chiudi("luogo");
    if (!$("viaggi").hidden) { A.chiudi("viaggi"); return; }
    inModifica = null;
    errore("");
    disegna();
    A.apri("viaggi");
    ricarica();
  });

  ricarica();
  window.VIAGGI = { ricarica };
  aggiornaMappa();
})();
