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
  const TIPI = [["🏨", "Hotel"], ["🏡", "Casa o villa"], ["✈️", "Volo"], ["🚆", "Treno"], ["🚗", "Auto"], ["🎟️", "Altro"]];

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
  }
  function ricarica() {
    A.scaricaJson(FILE)
      .then(({ dati: d }) => unisci(d))
      .catch(() => fetch(FILE).then((r) => (r.ok ? r.json() : {})).then(unisci).catch(() => {}));
  }

  function errore(testo) { $("viaggi-stato").textContent = testo || ""; }

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
      const emoji = (TIPI.find((x) => x[1] === p.tipo) || TIPI[5])[0];
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
      <label>Note<input id="v-note" type="text" placeholder="es. colazione inclusa" value="${t(p.note || "")}" autocomplete="off"></label>
      <p class="data">⚠️ Il repo è pubblico: non scrivere codici di prenotazione, password o dati personali.</p>`;
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
  function elencoDaVisitare() {
    const corpo = $("viaggi-corpo");
    const riga = el("div", "riga");
    riga.innerHTML = `<input id="dv-nome" type="text" placeholder="Posto da visitare" autocomplete="off"><button id="dv-aggiungi" class="btn-primario stretto">+</button>`;
    corpo.appendChild(riga);
    const aggiungi = () => {
      const nome = $("dv-nome").value.trim();
      if (!nome) return;
      conChiave(() => salva(`Da visitare: ${nome}`, (d) => d.daVisitare.push({ id: nuovoId(), nome, fatto: false })));
    };
    $("dv-aggiungi").addEventListener("click", aggiungi);
    $("dv-nome").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); aggiungi(); } });

    const ordinati = [...dati.daVisitare].sort((a, b) => Number(!!a.fatto) - Number(!!b.fatto));
    const fatti = ordinati.filter((x) => x.fatto).length;
    corpo.appendChild(el("p", "riepilogo", `${dati.daVisitare.length - fatti} da visitare · ${fatti} visitati`));
    ordinati.forEach((x) => {
      const r = el("div", "voce visita" + (x.fatto ? " fatto" : ""));
      r.innerHTML = `<label class="spunta"><input type="checkbox" ${x.fatto ? "checked" : ""}> <span>${t(x.nome)}</span></label><button class="btn-chiudi" aria-label="Elimina">✕</button>`;
      r.querySelector("input").addEventListener("change", () => conChiave(() => salva(`${x.fatto ? "Da rivisitare" : "Visitato"}: ${x.nome}`, (d) => {
        const y = d.daVisitare.find((z) => z.id === x.id);
        if (y) y.fatto = !y.fatto;
      })));
      r.querySelector("button").addEventListener("click", () => {
        if (confirm(`Togliere ${x.nome} dalla lista?`)) conChiave(() => salva(`Tolto: ${x.nome}`, (d) => { d.daVisitare = d.daVisitare.filter((z) => z.id !== x.id); }));
      });
      corpo.appendChild(r);
    });
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
    if (!$("viaggi").hidden) { A.chiudi("viaggi"); return; }
    inModifica = null;
    errore("");
    disegna();
    A.apri("viaggi");
    ricarica();
  });

  ricarica();
  window.VIAGGI = { ricarica };
})();
