/*
 * I NOSTRI POSTI
 * ==============
 * Questo è l'unico file da modificare per aggiungere o cambiare un posto.
 *
 * Per ogni posto:
 *   nome     – il nome che appare sulla mappa
 *   emoji    – l'icona del segnaposto
 *   lat, lng – coordinate (su Google Maps: tieni premuto sul punto e copia i due numeri)
 *   data     – facoltativa, es. "Agosto 2024"
 *   nota     – facoltativa, un ricordo o una frase
 *   foto     – elenco di immagini, es. ["foto/ostuni/1.jpg", "https://..."]
 *   musica   – facoltativa, UNA di queste forme:
 *                { spotify: "https://open.spotify.com/track/..." }
 *                { youtube: "https://www.youtube.com/watch?v=..." }
 *                { file: "musica/ostuni.mp3", titolo: "Nome canzone" }
 *
 * Per aggiungere un posto copia un blocco { ... }, incollalo prima della
 * parentesi ] finale e cambia i valori. Ricorda la virgola tra un blocco e l'altro.
 */
window.POSTI = [
  { nome: "Ostuni",           emoji: "🤍", lat: 40.7290, lng: 17.5770, data: "", nota: "", foto: [], musica: null },
  { nome: "Porto Empedocle",  emoji: "🌙", lat: 37.2925, lng: 13.5260, data: "", nota: "", foto: [], musica: null },
  { nome: "Peschici",         emoji: "🔐", lat: 41.9450, lng: 16.0170, data: "", nota: "", foto: [], musica: null },
  { nome: "Crecchio",         emoji: "🏰", lat: 42.2970, lng: 14.3270, data: "", nota: "", foto: [], musica: null },
  { nome: "Gradara",          emoji: "❤️", lat: 43.9390, lng: 12.7700, data: "", nota: "", foto: [], musica: null },
  { nome: "Vasto",            emoji: "🔐", lat: 42.1120, lng: 14.7080, data: "", nota: "", foto: [], musica: null },
  { nome: "Fano",             emoji: "🪨", lat: 43.8440, lng: 13.0190, data: "", nota: "", foto: [], musica: null },
  { nome: "Rodi Garganico",   emoji: "🎡", lat: 41.9290, lng: 15.8830, data: "", nota: "", foto: [], musica: null },
  { nome: "Pienza",           emoji: "🏰", lat: 43.0770, lng: 11.6790, data: "", nota: "", foto: [], musica: null },
  { nome: "San Gimignano",    emoji: "♜",  lat: 43.4677, lng: 11.0431, data: "", nota: "", foto: [], musica: null },
  { nome: "Certaldo",         emoji: "📖", lat: 43.5480, lng: 11.0410, data: "", nota: "", foto: [], musica: null },
  { nome: "Monteriggioni",    emoji: "🏰", lat: 43.3900, lng: 11.2230, data: "", nota: "", foto: [], musica: null },
  { nome: "Diamante",         emoji: "💎", lat: 39.6790, lng: 15.8190, data: "", nota: "", foto: [], musica: null },
  { nome: "Siviglia",         emoji: "⛪", lat: 37.3891, lng: -5.9845, data: "", nota: "", foto: [], musica: null },
  { nome: "Marina di Ragusa", emoji: "🌊", lat: 36.7840, lng: 14.5480, data: "", nota: "", foto: [], musica: null }
];
