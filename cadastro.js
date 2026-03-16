import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { db } from "./firebase.js";

function toStartAt(dateStr, timeStr) {
  // Interpreta como horário local do navegador.
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return Timestamp.fromDate(d);
}

const form = document.getElementById("form");
if (form) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const data = document.getElementById("data")?.value?.trim();
    const hora = document.getElementById("hora")?.value?.trim();
    const sala = document.getElementById("sala")?.value?.trim();
    const evento = document.getElementById("evento")?.value?.trim();
    const solicitante = document.getElementById("solicitante")?.value?.trim();
    const repetir = document.getElementById("repetir")?.value ?? "nao";

    if (!data || !hora || !sala || !evento || !solicitante) return;

    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.innerText = "Salvando...";
    }

    try {
      await addDoc(collection(db, "eventos"), {
        data,
        hora,
        sala,
        evento,
        solicitante,
        repetir,
        startAt: toStartAt(data, hora),
        createdAt: serverTimestamp(),
      });

      form.reset();
      alert("Evento salvo! Já deve aparecer na agenda.");
    } catch (e) {
      console.error(e);
      alert(
        "Não consegui salvar no Firestore. Verifique as Rules do Firestore (read/write) e tente novamente."
      );
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Salvar";
      }
    }
  });
}

