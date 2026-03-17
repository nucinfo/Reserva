async function carregarEventos() {

    try {

        let resposta = await fetch("eventos.json?nocache=" + Date.now())
        let eventos = await resposta.json()

        let agenda = document.getElementById("agenda")
        agenda.innerHTML = ""

        let agora = new Date()

        let hoje = new Date()
        hoje.setHours(0,0,0,0)

        let amanha = new Date(hoje)
        amanha.setDate(amanha.getDate() + 1)

        let depois = new Date(amanha)
        depois.setDate(depois.getDate() + 1)

        let grupos = {
            hoje: [],
            amanha: [],
            proximos: []
        }

        eventos.sort((a, b) => {
            return new Date(a.data + "T" + a.hora) - new Date(b.data + "T" + b.hora)
        })

        eventos.forEach(e => {

            if (!e.data || !e.hora) return

            let dataHora = new Date(e.data + "T" + e.hora)
            if (isNaN(dataHora)) return

            let diff = (dataHora - agora) / 60000

            // remover antigos
            if (diff < -60 && e.repetir === "nao") return

            let dataEvento = new Date(e.data + "T00:00")

            if (dataEvento.getTime() === hoje.getTime()) {
                grupos.hoje.push(e)
            } else if (dataEvento.getTime() === amanha.getTime()) {
                grupos.amanha.push(e)
            } else if (dataEvento > amanha) {
                grupos.proximos.push(e)
            }

        })

        function criarGrupo(titulo, lista) {

            if (lista.length === 0) return

            let divGrupo = document.createElement("div")
            divGrupo.className = "grupo"

            divGrupo.innerHTML = `<div class="titulo-grupo">${titulo}</div>`

            let cab = document.createElement("div")
            cab.className = "linha cabecalho"
            cab.innerHTML = `
<div>DATA</div>
<div>HORA</div>
<div>SALA</div>
<div>EVENTO</div>
<div>SOLICITANTE</div>
`
            divGrupo.appendChild(cab)

            lista.forEach(e => {

                let dataHora = new Date(e.data + "T" + e.hora)
                let diff = (dataHora - agora) / 60000

                let linha = document.createElement("div")
                linha.className = "linha"

                if (diff <= 5 && diff > 0) {
                    linha.classList.add("proximo")

                    let audio = document.getElementById("alerta")
                    if (audio) audio.play().catch(()=>{})
                }

                if (diff <= 0 && diff >= -60) {
                    linha.classList.add("agora")
                }

                let dataFormatada = new Date(e.data + "T00:00")
                    .toLocaleDateString("pt-BR")

                linha.innerHTML = `
<div>${dataFormatada}</div>
<div>${e.hora}</div>
<div>${e.sala}</div>
<div>${e.evento}</div>
<div>${e.solicitante}</div>
`

                divGrupo.appendChild(linha)

            })

            agenda.appendChild(divGrupo)
        }

        criarGrupo("HOJE", grupos.hoje)
        criarGrupo("AMANHÃ", grupos.amanha)
        criarGrupo("PRÓXIMOS", grupos.proximos)

    } catch (erro) {
        console.error("Erro:", erro)
    }
}

// atualizar
setInterval(carregarEventos, 10000)
carregarEventos()


// relógio
function atualizarRelogio() {
    document.getElementById("relogio").innerText =
        new Date().toLocaleTimeString()
}

setInterval(atualizarRelogio, 1000)
atualizarRelogio()
