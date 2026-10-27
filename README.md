# A spasso per il mondo 🗺️❤️

La mappa dei posti che abbiamo visitato insieme. Tocca un posto per vedere le foto e ascoltare la nostra canzone.

Funziona su **Android** e **iPhone** come un'app vera, senza passare dagli store.

## Aprirla e installarla

Link: **https://pako1989.github.io/aspassoperilmondo/**

- **Android (Chrome):** apri il link, menu ⋮ → *Installa app* (o *Aggiungi a schermata Home*).
- **iPhone (Safari):** apri il link, tasto Condividi ⬆️ → *Aggiungi alla schermata Home*.

## Attivare GitHub Pages (una volta sola)

1. Su GitHub apri il repo → **Settings** → **Pages**.
2. In *Build and deployment* scegli **Source: Deploy from a branch**, ramo **main**, cartella **/ (root)**, poi **Save**.
3. Dopo un paio di minuti il link sopra è attivo.

## Aggiungere o modificare un posto

Tutto si trova in [`posti.js`](posti.js): nome, emoji, coordinate, data, nota, foto e musica.
Si può modificare anche direttamente da GitHub (icona della matita ✏️).

### Musica
Per ogni posto, una di queste:
```js
musica: { spotify: "https://open.spotify.com/track/..." }
musica: { youtube: "https://www.youtube.com/watch?v=..." }
musica: { file: "musica/ostuni.mp3", titolo: "Nome canzone" }
```

### Foto
Le foto restano in un album condiviso (Google Foto, iCloud, ecc.), non nel repo.
Crea un album per il posto, copia il link di condivisione e incollalo così:
```js
album: "https://photos.app.goo.gl/..."
```
Nella scheda del posto compare il tasto **Apri l'album delle foto**.

⚠️ Il repo è **pubblico**: non caricare qui foto private. Il link dell'album è visibile a chi apre il repo,
quindi chi lo trova può vedere quelle foto.

## Com'è fatta
Pagina statica (HTML, CSS, JavaScript) con [Leaflet](https://leafletjs.com) e mappe [OpenStreetMap](https://www.openstreetmap.org).
È una PWA: `manifest.webmanifest` la rende installabile e `sw.js` la fa funzionare anche offline.
Quando modifichi i file, aumenta il numero in `versione.js`: compare in basso a sinistra nell'app e fa scaricare subito la versione nuova ai telefoni. Il tasto ⟳ in alto forza l'aggiornamento.
