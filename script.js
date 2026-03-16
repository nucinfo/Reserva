async function carregarEventos() {
  const resp = await fetch("eventos.json");
  const eventos = await resp.json();

  const agenda = document.getElementById("agenda");
  if (!agenda) return;
  agenda.innerHTML = "";

  const agora = new Date();

  eventos.forEach((e) => {
    const dataHora = new Date(e.data + " " + e.hora);
    const diff = (dataHora - agora) / 60000;

    if (diff < -60 && e.repetir === "nao") return;

    const div = document.createElement("div");
    div.className = "evento";

    if (diff <= 5 && diff > 0) {
      div.classList.add("proximo");
      const alerta = document.getElementById("alerta");
      if (alerta && typeof alerta.play === "function") alerta.play();
    }

    if (diff <= 0 && diff >= -60) {
      div.classList.add("agora");
    }

    // Mantém compatível com o CSS atual (4 colunas) e com versões antigas (texto simples)
    div.innerHTML = `
      <div>${e.hora}</div>
      <div>${e.sala}</div>
      <div>${e.evento}</div>
      <div>${e.solicitante ?? ""}</div>
    `;

    agenda.appendChild(div);
  });
}

setInterval(carregarEventos, 30000);
carregarEventos();
