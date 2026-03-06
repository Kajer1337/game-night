const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const fetch = require("node-fetch")
const cors = require("cors")

const app = express()
app.use(cors())
app.use(express.static("client"))

const server = http.createServer(app)
const io = new Server(server)

const RAWG_KEY = "96402d7dbb174f8988935db1217ca773"

let players = []
let admin = null
let roundGames = []
let nextRoundGames = []
let currentGameIndex = 0
let votes = {}
let readyForNext = new Set()

app.get("/searchGames", async (req, res) => {
  const q = req.query.q
  if (!q) return res.json([])
  const response = await fetch(`https://api.rawg.io/api/games?search=${q}&page_size=5&key=${RAWG_KEY}`)
  const data = await response.json()
  const games = data.results.map(g => ({
    name: g.name,
    image: g.background_image,
    genres: g.genres.map(x => x.name).join(", "),
    released: g.released,
    rating: g.rating,
    description: g.description_raw
  }))
  res.json(games)
})

io.on("connection", (socket) => {

  socket.on("join", (name) => {
    players.push({ id: socket.id, name })
    if (name === "Kajer") {
      admin = socket.id
      socket.emit("admin")
    }
    io.emit("players", players.map(p => p.name))
  })

  socket.on("addGame", async ({ name }) => {
    if (socket.id !== admin) return
    const response = await fetch(`https://api.rawg.io/api/games?search=${name}&key=${RAWG_KEY}`)
    const data = await response.json()
    if (!data.results.length) return
    const g = data.results[0]
    const game = {
      name: g.name,
      image: g.background_image,
      genres: g.genres.map(x => x.name).join(", "),
      released: g.released,
      rating: g.rating,
      description: g.description_raw
    }
    roundGames.push(game)
    io.emit("gamePool", roundGames)
  })

  socket.on("startGame", () => {
    if (socket.id !== admin || !roundGames.length) return
    currentGameIndex = 0
    nextRoundGames = []
    votes = {}
    startNextGame()
  })

  function startNextGame() {
    votes = {}
    const game = roundGames[currentGameIndex]
    io.emit("newGameRound", {
      game,
      round: currentGameIndex + 1,
      total: roundGames.length,
      stack: roundGames.slice(currentGameIndex + 1)
    })
  }

  socket.on("vote", (vote) => {
    if (votes[socket.id]) return
    votes[socket.id] = vote
    io.emit("voteUpdate", Object.keys(votes).length)

    if (Object.keys(votes).length === players.length) {
      const yesVotes = Object.values(votes).filter(v => v === "yes").length
      const majority = Math.ceil(players.length / 2)
      if (yesVotes >= majority) nextRoundGames.push(roundGames[currentGameIndex])

      currentGameIndex++
      if (currentGameIndex < roundGames.length) {
        startNextGame()
      } else {
        if (nextRoundGames.length === 1) {
          io.emit("gameWinner", nextRoundGames[0])
          roundGames = []
          nextRoundGames = []
          votes = {}
        } else {
          roundGames = [...nextRoundGames]
          nextRoundGames = []
          currentGameIndex = 0
          startNextGame()
        }
      }
    }
  })

  socket.on("nextRound", () => {
    readyForNext.add(socket.id)
    if (readyForNext.size === players.length) {
      roundGames = []
      nextRoundGames = []
      currentGameIndex = 0
      votes = {}
      readyForNext.clear()
      io.emit("resetGame")
    }
  })

  socket.on("disconnect", () => {
    players = players.filter(p => p.id !== socket.id)
    io.emit("players", players.map(p => p.name))
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log("Server działa na porcie " + PORT))