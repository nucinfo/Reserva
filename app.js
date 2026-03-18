async function carregarEventos() {

    let resposta = await fetch("eventos.json")
    let eventos = await resposta.json()

    let agenda = document.getElementById("agenda")
    agenda.innerHTML = ""

    let agora = new Date()

    // ordenar eventos por data/hora
    eventos.sort((a, b) => {
        let da = a.data instanceof Object && typeof a.data.toDate === "function"
            ? a.data.toDate()
            : new Date(a.data);
        if (a.hora) {
            const [h, m] = a.hora.split(":");
            da.setHours(Number(h), Number(m), 0, 0);
        }
        let db = b.data instanceof Object && typeof b.data.toDate === "function"
            ? b.data.toDate()
            : new Date(b.data);
        if (b.hora) {
            const [h, m] = b.hora.split(":");
            db.setHours(Number(h), Number(m), 0, 0);
        }
        return da - db;
    });

    eventos.forEach(e => {
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
            dataHora = e.data instanceof Object && typeof e.data.toDate === "function"
                ? e.data.toDate()
                : new Date(e.data);
            if (e.hora) {
                const [h, m] = e.hora.split(":");
                dataHora.setHours(Number(h), Number(m), 0, 0);
            }
        }

        let diff = (dataHora - agora) / 60000;

        // remover evento antigo
        if (diff < -60 && e.semanal !== true) {
            return;
        }

        let div = document.createElement("div");
        div.className = "evento";

        // evento próximo
        if (diff <= 5 && diff > 0) {
            div.classList.add("proximo");
          
        }

        // evento acontecendo
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

// atualizar agenda
setInterval(carregarEventos, 30000)

carregarEventos()

// relógio
function atualizarRelogio() {

    let agora = new Date()

    let hora = agora.toLocaleTimeString()

    document.getElementById("relogio").innerText = hora

}

setInterval(atualizarRelogio, 1000)

atualizarRelogio()
