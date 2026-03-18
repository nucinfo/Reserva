import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { db } from "./firebase.js";

const HIDE_PAST_MINUTES = -2 * 60; // esconde eventos não semanais 2h após o início
const FUTURE_DAYS = 30; // janela para materializar eventos semanais

// Ordem crescente para que possamos escolher o alerta mais próximo do momento atual
const ALERT_THRESHOLDS = [3, 5, 10, 15, 30];

function getPlayedAlerts(key) {
  const stored = localStorage.getItem('playedAlerts');
  const all = stored ? JSON.parse(stored) : {};
  return new Set(all[key] || []);
}

function setPlayedAlerts(key, played) {
  const stored = localStorage.getItem('playedAlerts');
  const all = stored ? JSON.parse(stored) : {};
  all[key] = Array.from(played);
  localStorage.setItem('playedAlerts', JSON.stringify(all));
}

function showAlertModal(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('alertModal');
    const messageEl = document.getElementById('alertMessage');
    const cancelBtn = document.getElementById('alertCancel');
    const disableBtn = document.getElementById('alertDisable');

    if (!modal || !messageEl) return resolve(false);

    const AUTO_CLOSE_TIME = 45; // segundos
    let timeRemaining = AUTO_CLOSE_TIME;

    const updateMessage = () => {
      messageEl.innerHTML = `${message}<div style="margin-top: 12px; font-size: 13px; color: var(--muted);">Fechará automaticamente em <strong>${timeRemaining}s</strong></div>`;
    };

    updateMessage();

    const timerInterval = setInterval(() => {
      timeRemaining--;
      updateMessage();
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        handleCancel();
      }
    }, 1000);

    const handleCancel = () => {
      clearInterval(timerInterval);
      modal.classList.remove('show');
      cancelBtn.removeEventListener('click', handleCancel);
      disableBtn.removeEventListener('click', handleDisable);
      resolve(false);
    };

    const handleDisable = () => {
      clearInterval(timerInterval);
      modal.classList.remove('show');
      cancelBtn.removeEventListener('click', handleCancel);
      disableBtn.removeEventListener('click', handleDisable);
      resolve(true);
    };

    cancelBtn.addEventListener('click', handleCancel);
    disableBtn.addEventListener('click', handleDisable);

    modal.classList.add('show');
  });
}

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

function getEventStartAt(e) {
  if (e.startAt && typeof e.startAt.toDate === "function") {
    return e.startAt.toDate();
  }
  if (e.data instanceof Timestamp) {
    return e.data.toDate();
  }
  return new Date(e.data);
}

function sectionLabelForDate(date, now) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.getTime() === today.getTime()) return "HOJE";
  if (d.getTime() === tomorrow.getTime()) return "AMANHÃ";
  return "PRÓXIMOS";
}

function renderSectionTitle(label) {
  const el = document.createElement("div");
  el.className = "section-title";
  el.innerText = label;
  return el;
}

function getEventKey(e) {
  const id = e.__docId ?? "";
  const startAt = getEventStartAt(e);
  return `${id}:${startAt.toISOString()}`;
}

function maybePlayAlert(e, diffMin) {
  const key = getEventKey(e);
  let played = getPlayedAlerts(key);

  if (diffMin > 0) {
    // Encontra o menor threshold que ainda é maior que o tempo restante.
    // Isso evita tocar o alerta "30" quando já estamos a 2 minutos do evento.
    const threshold = ALERT_THRESHOLDS.find((t) => diffMin <= t);
    if (threshold && !played.has(threshold)) {
      played.add(threshold);
      const alerta = document.getElementById("alerta");
      if (alerta && typeof alerta.play === "function") {
        alerta.play();
        // Mostrar notificação para desabilitar próximos alertas (não-bloqueante)
        showAlertModal(`Alerta tocado para ${threshold} minutos antes do evento "${e.titulo}". Desabilitar próximos alertas?`).then((disable) => {
          if (disable) {
            // Adicionar todos os thresholds menores ao played (próximos alertas)
            ALERT_THRESHOLDS.filter(t => t < threshold).forEach(t => played.add(t));
            setPlayedAlerts(key, played);
            // Re-renderizar para atualizar o badge imediatamente
            const agenda = document.getElementById("agenda");
            if (agenda && latestItems.length) {
              renderItems(agenda, latestItems, new Date());
            }
          }
        });
        setPlayedAlerts(key, played);
      }
    }
  }
}

function areAllAlertsDisabled(e) {
  const key = getEventKey(e);
  const played = getPlayedAlerts(key);
  return ALERT_THRESHOLDS.every(threshold => played.has(threshold));
}

function renderEventoDiv(e, agora) {
  const startAt = getEventStartAt(e);

  const diffMin = (startAt - agora) / 60000;

  const div = document.createElement("div");
  div.className = "evento";

  // Adiciona classe se os alertas foram desabilitados
  if (areAllAlertsDisabled(e)) {
    div.classList.add("alertas-desabilitados");
  }

  // Evento quando faltam 30-25 minutos
  if (diffMin > 0 && diffMin <= 30) {
    div.classList.add("proximo-30");
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
  const alertBadge = areAllAlertsDisabled(e) ? '<span class="alert-badge">🔇 Alertas Desabilitados</span>' : '';
  div.innerHTML = `
    <div>${primeiraColuna}</div>
    <div>${e.hora ?? ""}</div>
    <div>${e.sala ?? ""}</div>
    <div>${e.titulo ?? ""} ${alertBadge}</div>
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
      let currentSection;
      eventos.forEach((e) => {
        const div = renderEventoDiv(e, agora);
        if (!div) return;

        const startAt = getEventStartAt(e);
        const section = sectionLabelForDate(startAt, agora);
        if (section !== currentSection) {
          currentSection = section;
          agenda.appendChild(renderSectionTitle(section));
        }

        agenda.appendChild(div);
      });
    })
    .catch(() => {
      agenda.innerHTML =
        '<div style="color:#AAB6D6;padding:10px 2px">Não foi possível carregar os eventos.</div>';
    });
}

let latestItems = [];

function checkAlerts() {
  const agora = new Date();
  for (const e of latestItems) {
    const startAt = getEventStartAt(e);
    const diffMin = (startAt - agora) / 60000;
    maybePlayAlert(e, diffMin);
  }
}

function renderItems(agenda, items, agora) {
  agenda.innerHTML = "";
  let currentSection;

  // Remove itens antigos (por data) e re-renderiza o restante.
  for (let i = 0; i < items.length; ) {
    const e = items[i];
    const startAt = getEventStartAt(e);
    const diffMin = (startAt - agora) / 60000;
    const isSemanal = e.semanal === true;

    // Remove eventos por data logo após a virada do dia (00:00 do dia seguinte)
    if (!isSemanal) {
      const eventDay = new Date(startAt);
      eventDay.setHours(0, 0, 0, 0);
      const deleteAt = addDays(eventDay, 1); // próximo dia às 00:00
      if (agora >= deleteAt) {
        if (e.__docId) {
          deleteDoc(doc(db, "eventos", e.__docId)).catch(() => {
            // ignore failures (ex: permissões)
          });
        }
        items.splice(i, 1);
        continue; // não incrementa i
      }
    }

    const div = renderEventoDiv(e, agora);
    if (!div) {
      i++;
      continue;
    }

    const section = sectionLabelForDate(startAt, agora);
    if (section !== currentSection) {
      currentSection = section;
      agenda.appendChild(renderSectionTitle(section));
    }

    agenda.appendChild(div);
    i++;
  }
}

function cleanOldAlerts(now) {
  const stored = localStorage.getItem('playedAlerts');
  if (!stored) return;
  const all = JSON.parse(stored);
  const keysToRemove = [];
  for (const key in all) {
    const parts = key.split(':');
    if (parts.length === 2) {
      const startAtStr = parts[1];
      const startAt = new Date(startAtStr);
      if (startAt < addDays(now, -1)) {
        keysToRemove.push(key);
      }
    }
  }
  keysToRemove.forEach(k => delete all[k]);
  localStorage.setItem('playedAlerts', JSON.stringify(all));
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
      const agora = new Date();

      const items = [];
      snap.forEach((docSnap) => {
        const e = docSnap.data();
        const item = { ...e, __docId: docSnap.id };
        if (e?.semanal === true) {
          items.push(...weeklyOccurrences(item, agora));
        } else {
          items.push(item);
        }
      });

      items.sort((a, b) => {
        const da = getEventStartAt(a);
        const db = getEventStartAt(b);
        return da - db;
      });

      latestItems = items;
      renderItems(agenda, latestItems, agora);
      cleanOldAlerts(agora);
    },
    () => {
      // Se regras / rede impedir Firestore, ao menos mantém o painel funcionando.
      fallbackFetchJson();
    }
  );

  // Re-render periodically so that events are removed automatically when they expire
  setInterval(() => {
    const agora = new Date();
    if (latestItems.length) {
      renderItems(agenda, latestItems, agora);
    }
  }, 30_000);

  // Verifica o alarme a cada segundo (sem precisar re-renderizar toda a lista)
  setInterval(() => {
    if (latestItems.length) {
      checkAlerts();
    }
  }, 1000);
}

startClock();
startRealtimeAgenda();

