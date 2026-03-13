async function carregar(){

let resp = await fetch("eventos.json")
let eventos = await resp.json()

let agora = new Date()

let agenda = document.getElementById("agenda")
agenda.innerHTML=""

eventos.forEach(e=>{

let dataHora = new Date(e.data+" "+e.hora)

let diff = (dataHora-agora)/60000

if(diff<-60 && e.repetir==="nao"){
return
}

let div = document.createElement("div")
div.className="evento"

if(diff<=5 && diff>0){
div.classList.add("proximo")
document.getElementById("alerta").play()
}

if(diff<=0 && diff>=-60){
div.classList.add("agora")
}

div.innerHTML=`

<div>${e.hora}</div>
<div>${e.sala}</div>
<div>${e.evento}</div>
<div>${e.solicitante}</div>

`

agenda.appendChild(div)

})

}

setInterval(carregar,30000)

carregar()

function relogio(){

let agora = new Date()

let hora = agora.toLocaleTimeString()

document.getElementById("relogio").innerText=hora

}

setInterval(relogio,1000)
