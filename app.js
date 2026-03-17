async function carregarEventos() {

    try {

        let resposta = await fetch("eventos.json?nocache=" + Date.now())
        let eventos = await resposta.json()

        let agenda = document.getElementById("agenda")
        agenda.innerHTML = ""

        let agora = new Date()

        // ordenar por data + hora
        eventos.sort((a, b) => {

            let da = new Date(a.data + "T" + a.hora)
            let db = new Date(b.data + "T" + b.hora)

            return da - db

        })

        eventos.forEach(e => {

            if (!e.data || !e.hora) return

            let dataHora = new Date(e.data + "T" + e.hora)

            if (isNaN(dataHora.getTime())) return

            let diff = (dataHora - agora) / 60000

            // remover evento antigo
            if (diff < -60 && e.repetir === "nao") {
                return
            }

            let div = document.createElement("div")
            div.className = "evento"

            // evento próximo
            if (diff <= 5 && diff > 0) {

                div.classList.add("proximo")

                let audio = document.getElementById("alerta")
                if (audio) {
                    audio.play().catch(() => { })
                }
            }

            // evento acontecendo
            if (diff <= 0 && diff >= -60) {
                div.classList.add("agora")
            }

            // formatar data para BR
            let dataFormatada = new Date(e.data + "T00:00")
                .toLocaleDateString("pt-BR")

            div.innerHTML = `
<div>${dataFormatada} ${e.hora}</div>
<div>${e.sala}</div>
<div>${e.evento}</div>
<div>${e.solicitante}</div>
`

            agenda.appendChild(div)

        })

    } catch (erro) {
        console.error("Erro ao carregar eventos:", erro)
    }
}

// atualizar
setInterval(carregarEventos, 10000)
carregarEventos()


// relógio
function atualizarRelogio() {

    let agora = new Date()

    document.getElementById("relogio").innerText =
        agora.toLocaleTimeString()

}

setInterval(atualizarRelogio, 1000)
atualizarRelogio()
