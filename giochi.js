/*
 * I GIOCHI
 * ========
 *  GIOCHI.puzzle(foto, titolo)         – puzzle: tocca due pezzi per scambiarli
 *  GIOCHI.ritmo(audio, titolo, raw)    – ritmo: le note vengono ricavate dal file audio,
 *                                        tocca la corsia giusta quando la nota arriva sulla linea
 */
(function () {
  "use strict";

  function nuovoSchermo(titolo) {
    const ov = document.createElement("div");
    ov.className = "gioco";
    ov.innerHTML = `<div class="gioco-testa"><h2></h2><button class="btn-chiudi" aria-label="Chiudi">✕</button></div><div class="gioco-corpo"></div>`;
    ov.querySelector("h2").textContent = titolo;
    document.body.appendChild(ov);
    const api = { ov, corpo: ov.querySelector(".gioco-corpo"), allaChiusura: null };
    api.chiudi = () => {
      if (api.allaChiusura) api.allaChiusura();
      ov.remove();
    };
    ov.querySelector(".btn-chiudi").addEventListener("click", api.chiudi);
    return api;
  }

  function bottone(testo, classe, fn) {
    const b = document.createElement("button");
    b.className = classe || "btn-secondario";
    b.textContent = testo;
    b.addEventListener("click", fn);
    return b;
  }

  // ===================== PUZZLE =====================
  function puzzle(src, titolo) {
    const s = nuovoSchermo(`🧩 ${titolo}`);
    let n = 3;
    let img = null;

    function costruisci() {
      s.corpo.innerHTML = "";
      const info = document.createElement("p");
      const griglia = document.createElement("div");
      griglia.className = "puzzle";
      const comandi = document.createElement("div");
      comandi.className = "gioco-riga";
      s.corpo.append(info, griglia, comandi);

      // il tavolo prende la forma della foto, senza deformarla
      const maxL = Math.min(window.innerWidth - 24, 560);
      const maxA = window.innerHeight - 230;
      const k = Math.min(maxL / img.naturalWidth, maxA / img.naturalHeight);
      const L = Math.floor((img.naturalWidth * k) / n) * n;
      const A = Math.floor((img.naturalHeight * k) / n) * n;
      griglia.style.width = L + "px";
      griglia.style.height = A + "px";
      griglia.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
      griglia.style.gridTemplateRows = `repeat(${n}, 1fr)`;

      const tot = n * n;
      let ordine = [...Array(tot).keys()];
      do {
        for (let i = tot - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ordine[i], ordine[j]] = [ordine[j], ordine[i]];
        }
      } while (ordine.every((v, i) => v === i));

      let scelto = -1;
      let mosse = 0;
      let finito = false;
      const t0 = Date.now();
      const pezzi = [];

      function stile(el, id) {
        const r = Math.floor(id / n), c = id % n;
        el.style.backgroundImage = `url("${img.src}")`;
        el.style.backgroundSize = `${n * 100}% ${n * 100}%`;
        el.style.backgroundPosition = `${(c / (n - 1)) * 100}% ${(r / (n - 1)) * 100}%`;
      }
      for (let pos = 0; pos < tot; pos++) {
        const el = document.createElement("div");
        el.addEventListener("click", () => tocca(pos));
        griglia.appendChild(el);
        pezzi.push(el);
      }
      function disegna() {
        pezzi.forEach((el, pos) => {
          stile(el, ordine[pos]);
          el.classList.toggle("scelto", pos === scelto);
        });
        info.textContent = finito ? "" : `Tocca due pezzi per scambiarli · Mosse: ${mosse}`;
      }
      function tocca(pos) {
        if (finito) return;
        if (scelto < 0) { scelto = pos; disegna(); return; }
        if (scelto !== pos) {
          [ordine[scelto], ordine[pos]] = [ordine[pos], ordine[scelto]];
          mosse++;
        }
        scelto = -1;
        disegna();
        if (ordine.every((v, i) => v === i)) vinto();
      }
      function vinto() {
        finito = true;
        griglia.classList.add("finito");
        const sec = Math.round((Date.now() - t0) / 1000);
        info.className = "gioco-grande";
        info.textContent = `Fatto! 🎉 ${mosse} mosse in ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
      }

      [3, 4, 5].forEach((m) => {
        const b = bottone(`${m}×${m}`, "btn-secondario", () => { n = m; costruisci(); });
        if (m === n) b.style.outline = "2px solid #ffd23f";
        comandi.appendChild(b);
      });
      comandi.appendChild(bottone("Rimescola", "btn-secondario", costruisci));
      disegna();
    }

    s.corpo.textContent = "Preparo il puzzle…";
    img = new Image();
    img.onload = costruisci;
    img.onerror = () => { s.corpo.textContent = "Non riesco ad aprire la foto 😕 (se l'hai appena caricata, riprova tra un minuto)"; };
    img.src = src;
  }

  // ===================== RITMO =====================
  const CORSIE = 3;
  const COLORI = ["#ff6b6b", "#ffd23f", "#4ecdc4"];
  const CADUTA = 1.7; // secondi che una nota impiega a scendere
  const PARTENZA = 2;  // secondi di attesa prima che parta il brano

  // Cerca i colpi del brano: dove l'energia sale di colpo. Bassi a sinistra, acuti a destra.
  function analizza(buf) {
    const sr = buf.sampleRate;
    const c0 = buf.getChannelData(0);
    const c1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
    const hop = Math.round(sr * 0.0116);
    const frames = Math.floor(c0.length / hop);
    const alfa = 1 - Math.exp((-2 * Math.PI * 200) / sr);
    const basso = new Float32Array(frames);
    const alto = new Float32Array(frames);
    let lp = 0;
    for (let f = 0; f < frames; f++) {
      let eb = 0, ea = 0;
      for (let i = f * hop, fine = i + hop; i < fine; i++) {
        const x = c1 ? (c0[i] + c1[i]) / 2 : c0[i];
        lp += alfa * (x - lp);
        const h = x - lp;
        eb += lp * lp;
        ea += h * h;
      }
      basso[f] = Math.sqrt(eb / hop);
      alto[f] = Math.sqrt(ea / hop);
    }
    const flusso = (e) => {
      const o = new Float32Array(frames);
      for (let f = 1; f < frames; f++) o[f] = Math.max(0, e[f] - e[f - 1]);
      return o;
    };
    const fb = flusso(basso), fa = flusso(alto);
    const media = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1) + 1e-9;
    const mb = media(fb), ma = media(fa);
    const o = new Float32Array(frames);
    for (let f = 0; f < frames; f++) o[f] = fb[f] / mb + fa[f] / ma;

    // media mobile su circa mezzo secondo
    const W = 43;
    const somma = new Float64Array(frames + 1);
    for (let f = 0; f < frames; f++) somma[f + 1] = somma[f] + o[f];
    const locale = (f) => {
      const a = Math.max(0, f - W), b = Math.min(frames, f + W + 1);
      return (somma[b] - somma[a]) / (b - a);
    };

    const minDist = Math.ceil(0.28 / (hop / sr));
    let note = [];
    for (const soglia of [1.5, 1.25, 1.05, 0.9]) {
      note = [];
      let ultimo = -1e9;
      for (let f = 4; f < frames - 4; f++) {
        if (o[f] < locale(f) * soglia + 0.4) continue;
        let massimo = true;
        for (let d = -4; d <= 4; d++) if (o[f + d] > o[f]) { massimo = false; break; }
        if (!massimo || f - ultimo < minDist) continue;
        ultimo = f;
        const rb = fb[f] / mb, ra = fa[f] / ma;
        const r = rb / (rb + ra + 1e-9);
        note.push({ t: (f * hop) / sr, corsia: r > 0.62 ? 0 : r < 0.38 ? 2 : 1, preso: false, perso: false });
      }
      if (note.length >= buf.duration / 3) break;
    }
    // evita lunghe file sulla stessa corsia
    let serie = 0;
    note.forEach((nt, i) => {
      serie = i && nt.corsia === note[i - 1].corsia ? serie + 1 : 0;
      if (serie >= 3) { nt.corsia = (nt.corsia + 1) % CORSIE; serie = 0; }
    });
    return note;
  }

  async function ritmo(src, titolo, raw) {
    const s = nuovoSchermo(`🥁 ${titolo}`);
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { s.corpo.textContent = "Questo telefono non supporta l'audio del gioco 😕"; return; }
    const ctx = new AC();
    let sorgente = null;
    let anim = 0;
    let chiuso = false;
    s.allaChiusura = () => {
      chiuso = true;
      cancelAnimationFrame(anim);
      document.removeEventListener("keydown", tasto);
      try { if (sorgente) sorgente.stop(); } catch (e) { /* già fermo */ }
      try { ctx.close(); } catch (e) { /* già chiuso */ }
    };

    s.corpo.textContent = "Ascolto la canzone per trovare il ritmo…";
    let buf;
    try {
      // il tasto è stato toccato adesso: sblocca l'audio sui telefoni
      if (ctx.state === "suspended") ctx.resume();
      let r = await fetch(src);
      if (!r.ok && raw && !/^https?:/.test(src)) r = await fetch(raw + src);
      if (!r.ok) throw new Error("file");
      const dati = await r.arrayBuffer();
      buf = await new Promise((ok, no) => ctx.decodeAudioData(dati, ok, no));
    } catch (e) {
      if (!chiuso) s.corpo.textContent = "Non riesco a leggere l'audio 😕 (se l'hai appena caricato, riprova tra un minuto)";
      return;
    }
    if (chiuso) return;
    const note = analizza(buf);
    if (note.length < 8) {
      s.corpo.textContent = "In questa canzone non ho trovato abbastanza colpi per giocare 😕";
      return;
    }

    let punti = 0, serie = 0, bestSerie = 0, presi = 0, messaggio = "", messaggioFino = 0, t0 = 0;
    let lampo = [0, 0, 0];
    let tela, g, L, A, lineaY;

    function pronto() {
      s.corpo.innerHTML = "";
      const p = document.createElement("p");
      p.className = "gioco-grande";
      p.textContent = `${note.length} note da prendere`;
      const q = document.createElement("p");
      q.textContent = "Tocca la corsia quando la nota arriva sulla linea (da tastiera: A S D).";
      s.corpo.append(p, q, bottone("Via! ▶", "btn-primario", parti));
    }

    function parti() {
      note.forEach((nt) => { nt.preso = false; nt.perso = false; });
      punti = 0; serie = 0; bestSerie = 0; presi = 0; messaggio = "";
      s.corpo.innerHTML = "";
      s.corpo.style.padding = "0";
      s.corpo.style.gap = "0";
      tela = document.createElement("canvas");
      tela.id = "ritmo-tela";
      s.corpo.appendChild(tela);
      const dpr = window.devicePixelRatio || 1;
      L = tela.clientWidth; A = tela.clientHeight;
      tela.width = L * dpr; tela.height = A * dpr;
      g = tela.getContext("2d");
      g.scale(dpr, dpr);
      lineaY = A * 0.82;

      ctx.resume();
      sorgente = ctx.createBufferSource();
      sorgente.buffer = buf;
      sorgente.connect(ctx.destination);
      t0 = ctx.currentTime + PARTENZA;
      sorgente.start(t0);

      tela.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const r = tela.getBoundingClientRect();
        colpo(Math.min(CORSIE - 1, Math.floor(((e.clientX - r.left) / r.width) * CORSIE)));
      });
      document.addEventListener("keydown", tasto);
      anim = requestAnimationFrame(ciclo);
    }

    function tasto(e) {
      const i = ["a", "s", "d", "ArrowLeft", "ArrowDown", "ArrowRight"].indexOf(e.key);
      if (i >= 0 && tela) colpo(i % 3);
    }

    const ora = () => ctx.currentTime - t0;

    function dico(t, ms) { messaggio = t; messaggioFino = performance.now() + ms; }

    function colpo(corsia) {
      lampo[corsia] = performance.now();
      const adesso = ora();
      let meglio = null;
      for (const nt of note) {
        if (nt.corsia !== corsia || nt.preso || nt.perso) continue;
        const d = Math.abs(nt.t - adesso);
        if (d < 0.2 && (!meglio || d < Math.abs(meglio.t - adesso))) meglio = nt;
      }
      if (!meglio) return;
      const d = Math.abs(meglio.t - adesso);
      meglio.preso = true;
      presi++;
      serie++;
      bestSerie = Math.max(bestSerie, serie);
      if (d < 0.08) { punti += 300 + serie * 5; dico("Perfetto! ✨", 400); }
      else { punti += 100 + serie * 2; dico("Bene", 400); }
    }

    function ciclo() {
      if (chiuso) return;
      const adesso = ora();
      note.forEach((nt) => {
        if (!nt.preso && !nt.perso && adesso - nt.t > 0.2) { nt.perso = true; serie = 0; }
      });

      g.clearRect(0, 0, L, A);
      const sfondo = g.createLinearGradient(0, 0, 0, A);
      sfondo.addColorStop(0, "#10253d");
      sfondo.addColorStop(1, "#2a1f3d");
      g.fillStyle = sfondo;
      g.fillRect(0, 0, L, A);

      const larg = L / CORSIE;
      for (let c = 0; c < CORSIE; c++) {
        const attivo = Math.max(0, 1 - (performance.now() - lampo[c]) / 200);
        g.fillStyle = `rgba(255,255,255,${0.04 + attivo * 0.2})`;
        g.fillRect(c * larg + 2, 0, larg - 4, A);
        g.fillStyle = COLORI[c] + "55";
        g.beginPath();
        g.arc(c * larg + larg / 2, lineaY, larg * 0.3, 0, 7);
        g.fill();
      }
      g.strokeStyle = "rgba(255,255,255,0.5)";
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, lineaY); g.lineTo(L, lineaY); g.stroke();

      const velocita = (lineaY * 1.0) / CADUTA;
      note.forEach((nt) => {
        if (nt.preso) return;
        const y = lineaY - (nt.t - adesso) * velocita;
        if (y < -40 || y > A + 40) return;
        g.globalAlpha = nt.perso ? 0.25 : 1;
        g.fillStyle = COLORI[nt.corsia];
        g.beginPath();
        g.arc(nt.corsia * larg + larg / 2, y, larg * 0.26, 0, 7);
        g.fill();
        g.globalAlpha = 1;
      });

      g.fillStyle = "#fff";
      g.font = "700 18px -apple-system, sans-serif";
      g.textAlign = "left";
      g.fillText(`${punti}`, 14, 28);
      g.textAlign = "right";
      g.fillText(serie > 1 ? `${serie} di fila 🔥` : "", L - 14, 28);
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.fillRect(0, 0, L * Math.max(0, Math.min(1, adesso / buf.duration)), 4);
      if (performance.now() < messaggioFino) {
        g.fillStyle = "#fff";
        g.textAlign = "center";
        g.font = "700 26px -apple-system, sans-serif";
        g.fillText(messaggio, L / 2, lineaY - 70);
      }
      if (adesso < 0) {
        g.fillStyle = "#fff";
        g.textAlign = "center";
        g.font = "700 40px -apple-system, sans-serif";
        g.fillText(String(Math.ceil(-adesso)), L / 2, A / 2);
      }

      if (adesso > buf.duration + 0.5) { fine(); return; }
      anim = requestAnimationFrame(ciclo);
    }

    function fine() {
      document.removeEventListener("keydown", tasto);
      const perc = Math.round((presi / note.length) * 100);
      const stelle = perc >= 90 ? "⭐⭐⭐" : perc >= 70 ? "⭐⭐" : perc >= 40 ? "⭐" : "";
      s.corpo.style.padding = "";
      s.corpo.style.gap = "";
      s.corpo.innerHTML = "";
      const a = document.createElement("p");
      a.className = "gioco-grande";
      a.textContent = `${perc}% ${stelle}`;
      const b = document.createElement("p");
      b.textContent = `${presi} note su ${note.length} · ${punti} punti · serie migliore ${bestSerie}`;
      const riga = document.createElement("div");
      riga.className = "gioco-riga";
      riga.append(
        bottone("Ancora", "btn-primario", () => { try { sorgente.stop(); } catch (e) { /* già fermo */ } sorgente = null; parti(); }),
        bottone("Chiudi", "btn-secondario", s.chiudi)
      );
      s.corpo.append(a, b, riga);
    }

    pronto();
  }

  window.GIOCHI = { puzzle, ritmo };
})();
