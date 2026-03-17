async function carregarEventos() {
  const resp = await fetch("eventos.json");
  const eventos = await resp.json();

  const agenda = document.getElementById("agenda");
  if (!agenda) return;
  agenda.innerHTML = "";

  const agora = new Date();

  eventos.forEach((e) => {
    let dataHora;
    if (e.semanal === true && typeof e.dia === "number") {
      // Evento semanal: calcular próxima ocorrência
      const hoje = agora;
      const diaSemanaHoje = hoje.getDay();
      const delta = (e.dia - diaSemanaHoje + 7) % 7;
      const proxData = new Date(hoje);
      proxData.setDate(hoje.getDate() + delta);
      proxData.setHours(Number(e.hora.split(":")[0]), Number(e.hora.split(":")[1]), 0, 0);
      dataHora = proxData;
    } else {
      // Evento por data
      dataHora = e.data instanceof Object && typeof e.data.toDate === "function"
        ? e.data.toDate()
        : new Date(e.data);
      if (e.hora) {
        const [h, m] = e.hora.split(":");
        dataHora.setHours(Number(h), Number(m), 0, 0);
      }
    }

    const diff = (dataHora - agora) / 60000;

    if (diff < -60 && e.semanal !== true) return;

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

    div.innerHTML = `
      <div>${e.hora}</div>
      <div>${e.sala}</div>
      <div>${e.titulo ?? ""}</div>
      <div>${e.solicitante ?? ""}</div>
    `;

    agenda.appendChild(div);
  });
}

setInterval(carregarEventos, 30000);
carregarEventos();
