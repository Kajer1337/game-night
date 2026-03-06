const socket = io()

// --- ELEMENTY DOM ---
const loginDiv = document.getElementById("login")
const nicknameInput = document.getElementById("nickname")
const joinBtn = document.getElementById("joinBtn")
const lobbyDiv = document.getElementById("lobby")
const playerList = document.getElementById("playerList")
const waitingDiv = document.getElementById("waiting")
const adminPanel = document.getElementById("adminPanel")
const gameInput = document.getElementById("gameInput")
const searchResults = document.getElementById("searchResults")
const addGameBtn = document.getElementById("addGameBtn")
const startGameBtn = document.getElementById("startGameBtn")
const gamePool = document.getElementById("gamePool")
const gameDiv = document.getElementById("game")
const cardStack = document.getElementById("cardStack")
const roundCounter = document.getElementById("roundCounter")
const voteCounter = document.getElementById("voteCounter")
const winnerDiv = document.getElementById("winner")
const winnerTitle = document.getElementById("winnerTitle")
const winnerImg = document.getElementById("winnerImg")
const winnerDesc = document.getElementById("winnerDesc")
const nextRoundBtn = document.getElementById("nextRoundBtn")

let selectedGame = null
let voted = false
let isDragging = false
let dragCard = null
let players = []

// --- LOGIN ---
joinBtn.onclick = () => {
  const nick = nicknameInput.value.trim()
  if (!nick) return
  socket.emit("join", nick)
  loginDiv.style.display = "none"
  lobbyDiv.style.display = "block"
}

socket.on("admin", () => {
  adminPanel.style.display = "block"
  waitingDiv.style.display = "none"
})

socket.on("players", (pl) => {
  players = pl
  playerList.innerHTML = ""
  pl.forEach(p => {
    const li = document.createElement("li")
    li.textContent = p
    playerList.appendChild(li)
  })
})

// --- WYSZUKIWANIE GIER ---
gameInput.addEventListener("input", async () => {
  const q = gameInput.value
  if (q.length < 2) return (searchResults.innerHTML = "")
  const res = await fetch(`/searchGames?q=${q}`)
  const games = await res.json()
  searchResults.innerHTML = ""
  games.forEach(g => {
    const div = document.createElement("div")
    div.className = "searchItem"
    div.innerHTML = `<img src="${g.image}" width="60"> ${g.name}`
    div.onclick = () => { selectedGame = g; gameInput.value = g.name; searchResults.innerHTML = "" }
    searchResults.appendChild(div)
  })
})

addGameBtn.onclick = () => {
  if (!selectedGame) return
  socket.emit("addGame", { name: selectedGame.name })
  selectedGame = null
  gameInput.value = ""
}

socket.on("gamePool", (pool) => {
  gamePool.innerHTML = ""
  pool.forEach(g => {
    const li = document.createElement("li")
    li.textContent = g.name
    gamePool.appendChild(li)
  })
})

startGameBtn.onclick = () => { socket.emit("startGame") }

// --- GAME ROUND ---
socket.on("newGameRound", (data) => {
  voted = false
  gameDiv.style.display = "block"
  lobbyDiv.style.display = "none"
  cardStack.innerHTML = ""
  roundCounter.textContent = `Runda ${data.round}/${data.total}`
  voteCounter.textContent = `Oddano głosów: 0/${players.length}`

  const cards = [data.game, ...data.stack]
  cards.forEach((game, i) => {
    const card = document.createElement("div")
    card.className = "card"
    card.style.zIndex = cards.length - i
    card.innerHTML = `<h2>${game.name.toUpperCase()}</h2>
                      <img src="${game.image}">
                      <p><b>Gatunek:</b> ${game.genres}<br>
                         <b>Premiera:</b> ${game.released}<br>
                         <b>Ocena:</b> ⭐ ${game.rating}<br>
                         <i>${game.description?game.description:"Brak opisu"}</i></p>
                      <div class="overlay"></div>`
    cardStack.appendChild(card)
  })
  attachSwipe(cardStack.firstChild)
})

// --- SWIPE ---
function attachSwipe(card) {
  if (!card) return
  let startX = 0, startY = 0
  let overlay = card.querySelector(".overlay")

  const startDrag = e => {
    e.preventDefault()
    isDragging = true
    dragCard = card
    startX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX
    startY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY
    card.style.transition = "none"
  }

  const moveDrag = e => {
    if (!isDragging || dragCard !== card) return
    const x = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX
    const dx = x - startX
    card.style.transform = `translate(${dx}px,0) rotate(${dx/10}deg)`
    overlay.style.opacity = Math.min(Math.abs(dx)/150,1)
    overlay.textContent = dx>0?"LIKE 👍":"NO ❌"
  }

  const endDrag = e => {
    if (!isDragging || dragCard !== card) return
    isDragging = false
    const x = e.type.startsWith("touch") ? e.changedTouches[0].clientX : e.clientX
    const dx = x - startX
    if (Math.abs(dx) < 50) {
      card.style.transition = "transform 0.3s"
      card.style.transform = "translate(0,0) rotate(0)"
      overlay.style.opacity = 0
      dragCard = null
      return
    }
    voted = true
    socket.emit("vote", dx>0?"yes":"no")
    card.style.transition = "all 0.5s cubic-bezier(.5,1.5,.5,1)"
    card.style.transform = `translateX(${dx>0?window.innerWidth:-window.innerWidth}px) rotate(${dx>0?30:-30}deg)`
    overlay.style.opacity = 0
    setTimeout(()=>{
      card.remove()
      attachSwipe(cardStack.firstChild)
      dragCard = null
    },500)
  }

  card.addEventListener("mousedown", startDrag)
  card.addEventListener("mousemove", moveDrag)
  card.addEventListener("mouseup", endDrag)
  card.addEventListener("mouseleave", endDrag)
  card.addEventListener("touchstart", startDrag)
  card.addEventListener("touchmove", moveDrag)
  card.addEventListener("touchend", endDrag)
}

// --- VOTES & WINNER ---
socket.on("voteUpdate", v => voteCounter.textContent = `Oddano głosów: ${v}/${players.length}`)

socket.on("gameWinner", game => {
  gameDiv.style.display="none"
  winnerDiv.style.display="block"
  winnerTitle.textContent=game.name
  winnerImg.src=game.image
  winnerDesc.innerHTML=`<b>Gatunek:</b> ${game.genres}<br><b>Premiera:</b> ${game.released}<br>⭐ ${game.rating}<br><i>${game.description?game.description:"Brak opisu"}</i>`
  startConfetti()
})

nextRoundBtn.onclick = () => {
  socket.emit("nextRound")
}

socket.on("resetGame", () => {
  winnerDiv.style.display = "none"
  lobbyDiv.style.display = "block"
  gamePool.innerHTML = ""
})

// --- KONFETTI ---
function startConfetti() {
  const canvas=document.getElementById("confetti")
  const ctx=canvas.getContext("2d")
  canvas.width=window.innerWidth
  canvas.height=window.innerHeight
  let pieces=[]
  for(let i=0;i<200;i++)pieces.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,size:5+Math.random()*5,speed:2+Math.random()*3})
  function update(){
    ctx.clearRect(0,0,canvas.width,canvas.height)
    pieces.forEach(p=>{
      p.y+=p.speed
      if(p.y>canvas.height)p.y=0
      ctx.fillStyle="gold"
      ctx.fillRect(p.x,p.y,p.size,p.size)
    })
    requestAnimationFrame(update)
  }
  update()
}