const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// **SERWUJEMY KLIENTA**
// Ważne: folder 'client' musi znajdować się w tym samym katalogu co server.js
app.use(express.static(__dirname + "/client"));

const server = http.createServer(app);
const io = new Server(server);

let admin = null;
let players = [];
let gamePool = [];
let currentIndex = 0;
let votes = {};
let gameStarted = false;

// Twój RAWG API key
const RAWG_KEY = "96402d7dbb174f8988935db1217ca773";

// Endpoint do wyszukiwania gier
app.get("/search", async (req, res) => {
  const query = req.query.q;
  try {
    const response = await axios.get(
      `https://api.rawg.io/api/games?search=${query}&key=${RAWG_KEY}`
    );
    if (response.data.results.length > 0) {
      const game = response.data.results[0];
      res.json({
        name: game.name,
        background_image: game.background_image,
        genres: game.genres.map((g) => g.name),
        description: game.description_raw || "",
        released: game.released || "",
      });
    } else {
      res.json({ error: "Nie znaleziono gry" });
    }
  } catch (err) {
    console.error(err);
    res.json({ error: "Błąd RAWG API" });
  }
});

// **SOCKET.IO**
io.on("connection", (socket) => {
  console.log("Nowe połączenie:", socket.id);

  socket.on("join", (name) => {
    players.push({ id: socket.id, name });
    if (name === "Kajer") {
      admin = socket.id;
      socket.emit("admin");
    }
    socket.emit("gameStatus", { started: gameStarted });
    io.emit("players", players.map((p) => p.name));
  });

  socket.on("addGame", (game) => {
    if (socket.id !== admin) return;
    gamePool.push(game);
    io.emit("gamePool", gamePool);
  });

  socket.on("startGame", () => {
    if (socket.id !== admin) return;
    if (gamePool.length === 0) return;
    gameStarted = true;
    currentIndex = 0;
    votes = {};
    io.emit("gameStatus", { started: true });
    io.emit("newGameRound", gamePool[currentIndex]);
  });

  socket.on("vote", (vote) => {
    const game = gamePool[currentIndex];
    if (!votes[game.name]) votes[game.name] = 0;
    if (vote === "yes") votes[game.name]++;
    // Jeśli wszyscy gracze zagłosowali
    if (votes[game.name] >= players.length) {
      currentIndex++;
      votes = {};
      if (currentIndex < gamePool.length) {
        io.emit("newGameRound", gamePool[currentIndex]);
      } else {
        // Koniec gry
        const winner = gamePool.reduce((prev, curr) =>
          (votes[prev.name] || 0) >= (votes[curr.name] || 0) ? prev : curr
        );
        io.emit("gameWinner", winner);
        gameStarted = false;
        gamePool = [];
      }
    }
  });
});

// **DYNAMICZNY PORT DLA RENDER**
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});