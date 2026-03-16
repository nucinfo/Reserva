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

function setMode(mode) {
  const weeklyFields = document.getElementById("weekly-fields");
  const labelData = document.getElementById("label-data");
  const inputData = document.getElementById("data");
  const diaSemanaSelect = document.getElementById("diaSemana");

  const isSemanal = mode === "semanal";
  if (weeklyFields) weeklyFields.hidden = !isSemanal;

  if (labelData) labelData.innerText = isSemanal ? "Repetir até" : "Data";
  if (inputData) inputData.value = "";
  if (diaSemanaSelect) diaSemanaSelect.disabled = !isSemanal;
}

function getMode() {
  const checked = document.querySelector('input[name="tipoCadastro"]:checked');
  return checked?.value ?? "data";
}

document
  .querySelectorAll('input[name="tipoCadastro"]')
  .forEach((el) => el.addEventListener("change", () => setMode(getMode())));

setMode(getMode());

const form = document.getElementById("form");
if (form) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const mode = getMode();
    const data = document.getElementById("data")?.value?.trim();
    const hora = document.getElementById("hora")?.value?.trim();
    const sala = document.getElementById("sala")?.value?.trim();
    const evento = document.getElementById("evento")?.value?.trim();
    const solicitante = document.getElementById("solicitante")?.value?.trim();
    const diaSemanaStr = document.getElementById("diaSemana")?.value;
    const diaSemana = diaSemanaStr != null ? Number(diaSemanaStr) : null;

    if (!data || !hora || !sala || !evento || !solicitante) return;
    if (mode === "semanal" && (diaSemana == null || Number.isNaN(diaSemana))) return;

    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.innerText = "Salvando...";
    }

    try {
      if (mode === "data") {
        await addDoc(collection(db, "eventos"), {
          tipo: "data",
          data,
          hora,
          sala,
          evento,
          solicitante,
          repetir: "nao",
          startAt: toStartAt(data, hora),
          createdAt: serverTimestamp(),
        });
      } else {
        // semanal: "data" é o limite (até quando se repete)
        await addDoc(collection(db, "eventos"), {
          tipo: "semanal",
          repetirAte: data,
          diaSemana, // 0=Dom ... 6=Sáb (mesmo padrão do JS)
          hora,
          sala,
          evento,
          solicitante,
          repetir: "sim",
          createdAt: serverTimestamp(),
        });
      }

      form.reset();
      setMode(getMode());
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

