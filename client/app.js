const socket = io()
let currentGame = null

function join() {
  const name = document.getElementById("name").value
  if (!name) return alert("Wpisz nick!")
  socket.emit("join", name)
}

// Panel admina
socket.on("admin", () => {
  document.getElementById("adminPanel").style.display = "block"
})

// Dodawanie gry przez admina
async function addGame() {
  const title = document.getElementById("gameInput").value
  if (!title) return alert("Wpisz tytuł gry!")
  try {
    const res = await fetch("/search?q=" + encodeURIComponent(title))
    const game = await res.json()
    if (game.error) return alert(game.error)
    socket.emit("addGame", game)
    document.getElementById("gameInput").value = ""
  } catch (err) {
    console.error(err)
    alert("Błąd podczas dodawania gry")
  }
}

// Aktualizacja listy graczy
socket.on("players", (players) => {
  const ul = document.getElementById("playersList")
  ul.innerHTML = ""
  players.forEach(p => {
    const li = document.createElement("li")
    li.innerText = p
    ul.appendChild(li)
  })
})

// Pokazujemy pierwszą grę w puli
socket.on("gamePool", (games) => {
  if (games.length === 0) return
  currentGame = games[0]
  document.getElementById("card").innerHTML = `
    <img src="${currentGame.background_image}">
    <h2>${currentGame.name}</h2>
    <p>Gatunki: ${currentGame.genres.join(", ")}</p>
    <p>Premiera: ${currentGame.released}</p>
    <button onclick="vote('yes')">👍</button>
    <button onclick="vote('no')">👎</button>
  `
})

// Tymczasowa funkcja głosowania
function vote(v) {
  alert("Twój głos: " + v)
}