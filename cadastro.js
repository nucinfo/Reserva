import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { db } from "./firebase.js";

const listEl = document.getElementById("eventosList");
const form = document.getElementById("form");
const formTitle = document.getElementById("formTitle");
const btnSave = document.getElementById("saveBtn");
const btnCancel = document.getElementById("cancelBtn");

const weeklyFields = document.getElementById("weekly-fields");
const labelData = document.getElementById("label-data");
const inputData = document.getElementById("data");
const diaSemanaSelect = document.getElementById("diaSemana");

let currentDocId = null;

function getMode() {
  const checked = document.querySelector('input[name="tipoCadastro"]:checked');
  return checked?.value ?? "data";
}

function setMode(mode) {
  const isSemanal = mode === "semanal";
  if (weeklyFields) weeklyFields.hidden = !isSemanal;
  if (labelData) labelData.innerText = isSemanal ? "Data limite" : "Data";
  if (inputData) inputData.value = "";
  if (diaSemanaSelect) diaSemanaSelect.disabled = !isSemanal;

  if (formTitle) {
    formTitle.innerText = currentDocId ? "Editar evento" : "Novo Evento";
  }
}

function resetForm() {
  currentDocId = null;
  form.reset();
  setMode(getMode());
  if (formTitle) formTitle.innerText = "Novo Evento";
}

function formatDate(date) {
  if (!date) return "";
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function renderEventoDiv(e, id) {
  const div = document.createElement("div");
  div.className = "evento evento-gerenciar";

  const tipo = e.semanal ? "Semanal" : "Por data";
  const dataLabel = e.semanal ? ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][e.dia] : formatDate(e.data);

  div.innerHTML = `
    <div>${tipo}</div>
    <div>${dataLabel ?? ""}</div>
    <div>${e.hora ?? ""}</div>
    <div>${e.sala ?? ""}</div>
    <div>${e.titulo ?? ""}</div>
    <div>${e.solicitante ?? ""}</div>
    <div style="display:flex; justify-content:flex-end; gap:8px;">
      <button class="btn btn-primary" data-action="edit">Editar</button>
      <button class="btn" data-action="delete" style="background:rgba(255,59,59,.18); color:var(--text);">Excluir</button>
    </div>
  `;

  const btnEdit = div.querySelector('button[data-action="edit"]');
  const btnDelete = div.querySelector('button[data-action="delete"]');

  if (btnEdit) {
    btnEdit.addEventListener("click", () => {
      currentDocId = id;
      if (formTitle) formTitle.innerText = "Editar evento";
      const mode = e.semanal ? "semanal" : "data";
      document.querySelectorAll('input[name="tipoCadastro"]').forEach((el) => {
        if (el.value === mode) el.checked = true;
      });
      setMode(mode);

      const dataObj = e.data
        ? typeof e.data.toDate === "function"
          ? e.data.toDate()
          : new Date(e.data)
        : null;
      if (dataObj && !Number.isNaN(dataObj.getTime())) {
        inputData.value = dataObj.toISOString().slice(0, 10);
      } else {
        inputData.value = "";
      }

      if (diaSemanaSelect) diaSemanaSelect.value = String(e.dia ?? "1");
      document.getElementById("hora").value = e.hora ?? "";
      document.getElementById("sala").value = e.sala ?? "";
      document.getElementById("evento").value = e.titulo ?? "";
      document.getElementById("solicitante").value = e.solicitante ?? "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (btnDelete) {
    btnDelete.addEventListener("click", async () => {
      const ok = confirm("Tem certeza que deseja excluir este evento?");
      if (!ok) return;
      try {
        await deleteDoc(doc(db, "eventos", id));
        if (currentDocId === id) {
          resetForm();
        }
      } catch (err) {
        console.error(err);
        alert("Não foi possível excluir o evento. Verifique as permissões do Firestore.");
      }
    });
  }

  return div;
}

function loadEventos() {
  if (!listEl) return;
  const eventosRef = collection(db, "eventos");
  const q = query(eventosRef, orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    if (!listEl) return;
    listEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const e = docSnap.data();
      const div = renderEventoDiv(e, docSnap.id);
      listEl.appendChild(div);
    });
  });
}

function toStartAt(dateStr, timeStr) {
  // Interpreta como horário local do navegador.
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return Timestamp.fromDate(d);
}

if (form) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const mode = getMode();
    const data = inputData?.value?.trim();
    const hora = document.getElementById("hora")?.value?.trim();
    const sala = document.getElementById("sala")?.value?.trim();
    const titulo = document.getElementById("evento")?.value?.trim();
    const solicitante = document.getElementById("solicitante")?.value?.trim();
    const diaStr = diaSemanaSelect?.value;
    const dia = diaStr != null ? Number(diaStr) : null;

    if (!data || !hora || !sala || !titulo || !solicitante) return;
    if (mode === "semanal" && (dia == null || Number.isNaN(dia))) return;

    if (btnSave) {
      btnSave.disabled = true;
      btnSave.innerText = currentDocId ? "Atualizando..." : "Salvando...";
    }

    try {
      const payload = {
        titulo,
        solicitante,
        sala,
        hora,
        semanal: mode === "semanal",
        updatedAt: serverTimestamp(),
      };

      if (mode === "data") {
        payload.data = toStartAt(data, hora);
        payload.dia = null;
      } else {
        payload.data = Timestamp.fromDate(new Date(`${data}T23:59:59`));
        payload.dia = dia;
      }

      if (currentDocId) {
        await updateDoc(doc(db, "eventos", currentDocId), payload);
        alert("Evento atualizado com sucesso!");
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "eventos"), payload);
        alert("Evento criado com sucesso!");
      }

      resetForm();
    } catch (e) {
      console.error(e);
      alert(
        "Não consegui salvar no Firestore. Verifique as Rules do Firestore (read/write) e tente novamente."
      );
    } finally {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.innerText = "Salvar";
      }
    }
  });
}

if (btnCancel) {
  btnCancel.addEventListener("click", () => {
    resetForm();
  });
}

document
  .querySelectorAll('input[name="tipoCadastro"]')
  .forEach((el) => el.addEventListener("change", () => setMode(getMode())));

setMode(getMode());
loadEventos();

