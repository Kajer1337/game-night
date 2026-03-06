const socket = io();

const loginDiv = document.getElementById("login");
const nicknameInput = document.getElementById("nickname");
const joinBtn = document.getElementById("joinBtn");

const lobbyDiv = document.getElementById("lobby");
const playerList = document.getElementById("playerList");
const waitingDiv = document.getElementById("waiting");
const adminPanel = document.getElementById("adminPanel");
const gameInput = document.getElementById("gameInput");
const addGameBtn = document.getElementById("addGameBtn");
const gamePoolList = document.getElementById("gamePool");
const startGameBtn = document.getElementById("startGameBtn");

const gameDiv = document.getElementById("game");
const gameCard = document.getElementById("gameCard");
const gameTitle = document.getElementById("gameTitle");
const gameImg = document.getElementById("gameImg");
const gameDesc = document.getElementById("gameDesc");
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");

const winnerDiv = document.getElementById("winner");
const winnerTitle = document.getElementById("winnerTitle");
const winnerImg = document.getElementById("winnerImg");
const winnerDesc = document.getElementById("winnerDesc");

let isAdmin = false;

joinBtn.addEventListener("click", () => {
  const nick = nicknameInput.value.trim();
  if(!nick) return alert("Wpisz nick!");
  socket.emit("join", nick);
  loginDiv.style.display = "none";
  lobbyDiv.style.display = "block";
});

socket.on("admin", () => { isAdmin = true; adminPanel.style.display="block"; waitingDiv.style.display="none"; });

socket.on("players", (players) => { 
  playerList.innerHTML=""; 
  players.forEach(p => { const li=document.createElement("li"); li.textContent=p; playerList.appendChild(li); });
});

addGameBtn.addEventListener("click", () => {
  const title = gameInput.value.trim();
  if(!title) return;
  socket.emit("addGame",{name:title});
  gameInput.value="";
});

socket.on("gamePool",(pool)=>{ 
  gamePoolList.innerHTML="";
  pool.forEach(g=>{const li=document.createElement("li"); li.textContent=g.name; gamePoolList.appendChild(li);});
});

startGameBtn.addEventListener("click",()=>{ socket.emit("startGame"); });

socket.on("gameStatus",(status)=>{ waitingDiv.style.display = (!status.started && !isAdmin)?"block":"none"; });

socket.on("newGameRound",(game)=>{
  lobbyDiv.style.display="none"; winnerDiv.style.display="none"; gameDiv.style.display="block";
  gameTitle.textContent=game.name; gameImg.src=game.image||""; gameDesc.textContent=game.description||"";

  gameCard.style.transform="translate(0,0) rotate(0deg)"; gameCard.style.transition="none";

  let offsetX=0, offsetY=0, startX=0, startY=0;
  function startDrag(e){ startX=e.type.includes("touch")?e.touches[0].clientX:e.clientX; startY=e.type.includes("touch")?e.touches[0].clientY:e.clientY; gameCard.classList.add("dragging"); document.addEventListener("mousemove",drag); document.addEventListener("mouseup",endDrag); document.addEventListener("touchmove",drag); document.addEventListener("touchend",endDrag);}
  function drag(e){ const x=e.type.includes("touch")?e.touches[0].clientX:e.clientX; const y=e.type.includes("touch")?e.touches[0].clientY:e.clientY; offsetX=x-startX; offsetY=y-startY; gameCard.style.transform=`translate(${offsetX}px,${offsetY}px) rotate(${offsetX*0.1}deg)`; }
  function endDrag(){ gameCard.classList.remove("dragging"); if(offsetX>150){socket.emit("vote","yes"); gameCard.style.transition="transform 0.5s ease"; gameCard.style.transform="translateX(1000px) rotate(20deg)"; setTimeout(()=>gameDiv.style.display="none",500);}
  else if(offsetX<-150){socket.emit("vote","no"); gameCard.style.transition="transform 0.5s ease"; gameCard.style.transform="translateX(-1000px) rotate(-20deg)"; setTimeout(()=>gameDiv.style.display="none",500);}
  else{ gameCard.style.transition="transform 0.3s ease"; gameCard.style.transform="translate(0,0) rotate(0deg)"; }
  document.removeEventListener("mousemove",drag); document.removeEventListener("mouseup",endDrag); document.removeEventListener("touchmove",drag); document.removeEventListener("touchend",endDrag); }

  gameCard.addEventListener("mousedown",startDrag); gameCard.addEventListener("touchstart",startDrag);

  yesBtn.onclick=()=>{socket.emit("vote","yes"); gameCard.style.transition="transform 0.5s ease"; gameCard.style.transform="translateX(1000px) rotate(20deg)"; setTimeout(()=>gameDiv.style.display="none",500);}
  noBtn.onclick=()=>{socket.emit("vote","no"); gameCard.style.transition="transform 0.5s ease"; gameCard.style.transform="translateX(-1000px) rotate(-20deg)"; setTimeout(()=>gameDiv.style.display="none",500);}
});

socket.on("gameWinner",(winner)=>{
  gameDiv.style.display="none"; winnerDiv.style.display="block"; winnerTitle.textContent=winner.name; winnerImg.src=winner.image||""; winnerDesc.textContent=winner.description||"";
});