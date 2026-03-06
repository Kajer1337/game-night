// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fetch = require("node-fetch"); // npm install node-fetch@2

const RAWG_API_KEY = "96402d7dbb174f8988935db1217ca773";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + "/client"));

const server = http.createServer(app);
const io = new Server(server);

let admin = null;
let players = [];
let gamePool = [];
let currentIndex = 0;
let votes = {};
let gameStarted = false;

io.on("connection", (socket) => {
  console.log("Nowe połączenie:", socket.id);

  socket.on("join", (name) => {
    players.push({ id: socket.id, name });
    if (name === "Kajer") {
      admin = socket.id;
      socket.emit("admin");
    }
    socket.emit("gameStatus", { started: gameStarted, isAdmin: socket.id === admin });
    io.emit("players", players.map(p => p.name));
  });

  socket.on("addGame", async ({ name }) => {
    if (socket.id !== admin) return;
    try {
      const res = await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(name)}&key=${RAWG_API_KEY}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const g = data.results[0];
        const game = {
          name: g.name,
          image: g.background_image || "",
          description: g.released ? `Released: ${g.released}` : ""
        };
        gamePool.push(game);
        io.emit("gamePool", gamePool);
      }
    } catch (err) {
      console.error("Błąd pobierania gry:", err);
    }
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

    const nonAdminPlayers = players.filter(p => p.id !== admin);

    if (votes[game.name] >= nonAdminPlayers.length) {
      currentIndex++;
      votes = {};
      if (currentIndex < gamePool.length) {
        io.emit("newGameRound", gamePool[currentIndex]);
      } else {
        let maxVotes = -1;
        let winner = gamePool[0];
        gamePool.forEach(g => {
          const v = votes[g.name] || 0;
          if (v > maxVotes) {
            maxVotes = v;
            winner = g;
          }
        });
        io.emit("gameWinner", winner);
        gameStarted = false;
        gamePool = [];
      }
    }
  });

  socket.on("disconnect", () => {
    players = players.filter(p => p.id !== socket.id);
    io.emit("players", players.map(p => p.name));
    if (socket.id === admin) {
      admin = null;
      gamePool = [];
      gameStarted = false;
      io.emit("gameStatus", { started: false });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));