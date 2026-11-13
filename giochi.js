/*
 * I GIOCHI
 * ========
 *  GIOCHI.puzzle(foto, titolo)         – puzzle: tocca due pezzi per scambiarli
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

  window.GIOCHI = { puzzle };
})();
