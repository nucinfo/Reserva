async function carregarEventos(){

let resposta = await fetch("eventos.json")
let eventos = await resposta.json()

let agenda = document.getElementById("agenda")
agenda.innerHTML=""

let agora = new Date()

// ordenar eventos por data/hora
eventos.sort((a,b)=>{

let da = new Date(a.data+"T"+a.hora)
let db = new Date(b.data+"T"+b.hora)

return da-db

})

eventos.forEach(e=>{

let dataHora = new Date(e.data+"T"+e.hora)

let diff = (dataHora - agora) / 60000

// remover evento antigo
if(diff < -60 && e.repetir === "nao"){
return
}

let div = document.createElement("div")
div.className="evento"

// evento próximo
if(diff <=5 && diff >0){

div.classList.add("proximo")

document.getElementById("alerta").play().catch(()=>{})

}

// evento acontecendo
if(diff <=0 && diff >=-60){

div.classList.add("agora")

}

div.innerHTML = `
<div>${e.hora}</div>
<div>${e.sala}</div>
<div>${e.evento}</div>
<div>${e.solicitante}</div>
`

agenda.appendChild(div)

})

}

// atualizar agenda
setInterval(carregarEventos,30000)

carregarEventos()

// relógio
function atualizarRelogio(){

let agora = new Date()

let hora = agora.toLocaleTimeString()

document.getElementById("relogio").innerText = hora

}

setInterval(atualizarRelogio,1000)

atualizarRelogio()
