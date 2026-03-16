async function carregarEventos(){

let res = await fetch("eventos.json")
let eventos = await res.json()

let agenda = document.getElementById("agenda")
agenda.innerHTML=""

let agora = new Date()

eventos.forEach(e=>{

let horaEvento = new Date(e.data+" "+e.hora)

let div = document.createElement("div")
div.className="evento"

let diff = (horaEvento-agora)/60000

if(diff <=5 && diff >0){
div.classList.add("proximo")
document.getElementById("alerta").play()
}

if(diff <=0 && diff >=-60){
div.classList.add("agora")
}

if(diff<-60 && e.repetir=="nao"){
return
}

div.innerHTML=
`
${e.hora} | ${e.sala} <br>
${e.evento}<br>
Solicitante: ${e.solicitante}
`

agenda.appendChild(div)

})

}

setInterval(carregarEventos,30000)
carregarEventos()