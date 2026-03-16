import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { db } from "./firebase.js";

function startClock() {
  const el = document.getElementById("relogio");
  if (!el) return;
  const tick = () => (el.innerText = new Date().toLocaleTimeString());
  tick();
  setInterval(tick, 1000);
}

function toLocalDateTimeISO(dateStr, timeStr) {
  // dateStr: YYYY-MM-DD, timeStr: HH:MM
  // Interpreta como horário local do navegador.
  return `${dateStr}T${timeStr}:00`;
}

function renderEventoDiv(e, agora) {
  const startAt =
    e.startAt && typeof e.startAt.toDate === "function"
      ? e.startAt.toDate()
      : new Date(toLocalDateTimeISO(e.data, e.hora));

  const diffMin = (startAt - agora) / 60000;

  // Esconde eventos muito antigos (se não repetir)
  if (diffMin < -60 && e.repetir === "nao") return null;

  const div = document.createElement("div");
  div.className = "evento";

  if (diffMin <= 5 && diffMin > 0) {
    div.classList.add("proximo");
    const alerta = document.getElementById("alerta");
    if (alerta && typeof alerta.play === "function") alerta.play();
  }

  if (diffMin <= 0 && diffMin >= -60) {
    div.classList.add("agora");
  }

  div.innerHTML = `
    <div>${e.hora ?? ""}</div>
    <div>${e.sala ?? ""}</div>
    <div>${e.evento ?? ""}</div>
    <div>${e.solicitante ?? ""}</div>
  `;

  return div;
}

function fallbackFetchJson() {
  const agenda = document.getElementById("agenda");
  if (!agenda) return;

  fetch("eventos.json")
    .then((r) => r.json())
    .then((eventos) => {
      agenda.innerHTML = "";
      const agora = new Date();
      eventos.forEach((e) => {
        const div = renderEventoDiv(e, agora);
        if (div) agenda.appendChild(div);
      });
    })
    .catch(() => {
      agenda.innerHTML =
        '<div style="color:#AAB6D6;padding:10px 2px">Não foi possível carregar os eventos.</div>';
    });
}

function startRealtimeAgenda() {
  const agenda = document.getElementById("agenda");
  if (!agenda) return;

  // Firestore: coleção "eventos" ordenada por startAt
  const eventosRef = collection(db, "eventos");
  const q = query(eventosRef, orderBy("startAt", "asc"));

  onSnapshot(
    q,
    (snap) => {
      agenda.innerHTML = "";
      const agora = new Date();
      snap.forEach((doc) => {
        const e = doc.data();
        const div = renderEventoDiv(e, agora);
        if (div) agenda.appendChild(div);
      });
    },
    () => {
      // Se regras / rede impedir Firestore, ao menos mantém o painel funcionando.
      fallbackFetchJson();
    }
  );
}

startClock();
startRealtimeAgenda();

