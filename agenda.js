import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { db } from "./firebase.js";

const HIDE_PAST_MINUTES = -24 * 60; // mostra até 24h no passado
const FUTURE_DAYS = 30; // janela para materializar eventos semanais

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

function yyyyMmDd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function weeklyOccurrences(e, now) {
  // e: { dia, hora, data, semanal, ... }
  const end = new Date(e.data instanceof Timestamp ? e.data.toDate() : e.data);
  const windowStart = addDays(now, Math.floor(HIDE_PAST_MINUTES / (60 * 24)));
  const windowEnd = addDays(now, FUTURE_DAYS);

  const start = windowStart > new Date(0) ? windowStart : now;
  const until = end < windowEnd ? end : windowEnd;
  if (!(until instanceof Date) || Number.isNaN(until.getTime())) return [];

  const targetDow = Number(e.dia);
  if (Number.isNaN(targetDow)) return [];

  // achar a próxima ocorrência a partir de windowStart
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const delta = (targetDow - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + delta);

  const out = [];
  for (let guard = 0; guard < 400; guard++) {
    const dayStr = yyyyMmDd(cursor);
    const startAt = new Date(toLocalDateTimeISO(dayStr, e.hora));
    if (startAt > until) break;
    if (startAt >= addDays(now, -2)) {
      out.push({
        ...e,
        data: Timestamp.fromDate(startAt),
        startAt: Timestamp.fromDate(startAt),
      });
    }
    cursor.setDate(cursor.getDate() + 7);
  }

  return out;
}

function renderEventoDiv(e, agora) {
  const startAt =
    e.startAt && typeof e.startAt.toDate === "function"
      ? e.startAt.toDate()
      : e.data instanceof Timestamp
        ? e.data.toDate()
        : new Date(e.data);

  const diffMin = (startAt - agora) / 60000;

  // Esconde só eventos MUITO antigos (evita poluir a tela)
  if (diffMin < HIDE_PAST_MINUTES && e.repetir === "nao") return null;

  const div = document.createElement("div");
  div.className = "evento";

  if (diffMin <= 30 && diffMin > 0) {
    div.classList.add("proximo");
    const alerta = document.getElementById("alerta");
    if (alerta && typeof alerta.play === "function") alerta.play();
  }

  if (diffMin <= 0 && diffMin >= -60) {
    div.classList.add("agora");
  }

  if (diffMin < -60) {
    div.classList.add("passado");
  }

  let primeiraColuna = "";
  if (e.semanal === true && typeof e.dia === "number") {
    // Evento semanal: mostrar nome do dia
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    primeiraColuna = diasSemana[e.dia] ?? "";
  } else {
    // Evento por data: mostrar data
    const dataObj = startAt;
    primeiraColuna = `${dataObj.getDate().toString().padStart(2, "0")}/${(dataObj.getMonth()+1).toString().padStart(2, "0")}/${dataObj.getFullYear()}`;
  }
  div.innerHTML = `
    <div>${primeiraColuna}</div>
    <div>${e.hora ?? ""}</div>
    <div>${e.sala ?? ""}</div>
    <div>${e.titulo ?? ""}</div>
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
  // Não dá para ordenar semanal e data no mesmo campo, então busca e ordena no cliente.
  const q = query(eventosRef);

  onSnapshot(
    q,
    (snap) => {
      agenda.innerHTML = "";
      const agora = new Date();

      const items = [];
      snap.forEach((doc) => {
        const e = doc.data();
        if (e?.semanal === true) {
          items.push(...weeklyOccurrences(e, agora));
        } else {
          items.push(e);
        }
      });

      items.sort((a, b) => {
        const da =
          a.startAt && typeof a.startAt.toDate === "function"
            ? a.startAt.toDate()
            : a.data instanceof Timestamp
              ? a.data.toDate()
              : new Date(a.data);
        const db =
          b.startAt && typeof b.startAt.toDate === "function"
            ? b.startAt.toDate()
            : b.data instanceof Timestamp
              ? b.data.toDate()
              : new Date(b.data);
        return da - db;
      });

      items.forEach((e) => {
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

