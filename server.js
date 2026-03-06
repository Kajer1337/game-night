const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const axios = require("axios")
const cors = require("cors")

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static("client"))

const server = http.createServer(app)
const io = new Server(server)

let admin = null
let players = []
let gamePool = []

// Endpoint do wyszukiwania gier w RAWG
app.get("/search", async (req, res) => {
  const query = req.query.q
  try {
    const response = await axios.get(
      `https://api.rawg.io/api/games?search=${query}&key=96402d7dbb174f8988935db1217ca773`
    )
    if (response.data.results.length > 0) {
      const game = response.data.results[0]
      // zwracamy tylko potrzebne dane
      res.json({
        name: game.name,
        background_image: game.background_image,
        genres: game.genres.map(g => g.name),
        description: game.description_raw || "",
        released: game.released || ""
      })
    } else {
      res.json({ error: "Nie znaleziono gry" })
    }
  } catch (err) {
    console.error(err)
    res.json({ error: "Błąd RAWG API" })
  }
})

io.on("connection", (socket) => {
  console.log("Nowe połączenie: ", socket.id)

  socket.on("join", (name) => {
    players.push({ id: socket.id, name })
    if (name === "Kajer") {
      admin = socket.id
      socket.emit("admin") // tylko Kajer zobaczy panel
    }
    io.emit("players", players.map(p => p.name))
    socket.emit("gamePool", gamePool) // wyślij aktualną pulę
  })

  socket.on("addGame", (game) => {
    if (socket.id !== admin) return
    gamePool.push(game)
    io.emit("gamePool", gamePool)
  })
})

server.listen(3000, () => {
  console.log("Server running: http://localhost:3000")
})