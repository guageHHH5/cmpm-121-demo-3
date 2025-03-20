// todo
// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import { Board, Cell, Coin } from "./board.ts";
import { Player } from "./player.ts";
import { buttonElement, createCloseButtonDiv, createCoinButton, createCoinContainerDiv, createInventoryPanel } from "./control.ts";
// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const NULL_SPACE = leaflet.latLng(0, 0);
// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const GEOLOCATION_UPDATE_INTERVAL = 1000;
export const CACHE_SPAWN_PROBABILITY = 0.1;

//const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
let locationActivated = false;

let player: Player;
let board: Board;
let movePolyL: leaflet.Polyline;
let movementHistory: leaflet.LatLng[] = [];


const PAN_STOP_TIME = 5000;
let isPannable = true;

// ----------------------------
// UI Stuff
// ----------------------------

const app = document.getElementById("app")!;
// control panel div
const controlPanel = document.createElement("div");
app.appendChild(controlPanel);
controlPanel.style.width = "100%";
controlPanel.style.height = "50px";
controlPanel.style.position = "absolute";
controlPanel.style.top = "0";
controlPanel.style.left = "0";
controlPanel.style.backgroundColor = "rgba(0,0,0,0.2)";

// button creation
const up = buttonElement("⬆️");
const down = buttonElement("⬇️");
const left = buttonElement("⬅️");
const right = buttonElement("➡️");

const geo = buttonElement("🌐");
geo.addEventListener("click", ()=>{
  // toggle direction button on/off
  up.hidden = !up.hidden;
  down.hidden = !down.hidden;
  left.hidden = !left.hidden;
  right.hidden = !right.hidden;

  locationActivated = !locationActivated;
  console.log("Geolocation Activated: ", locationActivated);
});

controlPanel.appendChild(geo);


function panCamera(coin: Coin){
  map.setView(board.getCellCenter(coin.spawnLocation), GAMEPLAY_ZOOM_LEVEL);

  //new marker at coin location
  const marker = leaflet.marker(board.getCellCenter(coin.spawnLocation));
  marker.bindTooltip("You found this coin here!<br>" + decodeCoin(coin));
  marker.addTo(map);

  // disable autopan
  isPannable = false;

  // re-enable autopan
  setTimeout(() => {
    isPannable = true;
    map.removeLayer(marker);
    updateMapView();
  }, PAN_STOP_TIME);
}

function moveListener(moveFunction: ()=> void){
  const oldLoc = player.getLocation();
  moveFunction();
  const newLoc = player.getLocation();
  if(checkCellBoundary(oldLoc, newLoc)){
    refreshCache();
  }
  updateDrawMoveHistory();
  saveGame();
}

up.addEventListener("click", ()=> {moveListener(()=>player.moveUp());});
down.addEventListener("click", ()=>{moveListener(()=>player.moveDown());});
left.addEventListener("click", ()=>{moveListener(()=>player.moveLeft());});
right.addEventListener("click", ()=>{moveListener(()=>player.moveRight());});


// reset button
const resetButton = buttonElement("🚮");
resetButton.addEventListener("click", () => {
  const response = prompt("Are you sure you want to reset your game? Yes/No",);
  if(response?.toLowerCase() == "yes"){
    resetGame();
  } else {
    console.log("Reset Failed.");
  }
});

// create inventory
const inventoryButton = buttonElement("Inventory");
inventoryButton.addEventListener("click", () => {
  console.log("opened inventory");

  const inventory = player.getCoinInventory();
  const popupDiv = createInventoryPanel();
  const coinContainerDiv = createCoinContainerDiv();
  const closeButtonDiv = createCloseButtonDiv();
  popupDiv.appendChild(coinContainerDiv);
  popupDiv.appendChild(closeButtonDiv);
  for(const coin of inventory){
    const coinButton = createCoinButton(decodeCoin(coin));
    coinButton.addEventListener("click", ()=>{
      panCamera(coin);
      app.removeChild(popupDiv);
    });
    coinContainerDiv.appendChild(coinButton);
  }

  const closeButton = document.createElement("button");
  closeButton.innerText = "Close";
  closeButton.style.backgroundColor = "#666666";
  closeButton.style.color = "black";
  closeButtonDiv.appendChild(closeButton);

  app.appendChild(popupDiv);

  closeButton.addEventListener("click", () => {
    app.removeChild(popupDiv);
  });
});

controlPanel.appendChild(up);
controlPanel.appendChild(down);
controlPanel.appendChild(left);
controlPanel.appendChild(right);
controlPanel.appendChild(resetButton);
controlPanel.appendChild(inventoryButton);

// map panel div
const mapPanel = document.createElement("div");
app.appendChild(mapPanel);
mapPanel.style.width = "100%";
mapPanel.style.height = "calc(100% - 100px)";
mapPanel.style.position = "absolute";
mapPanel.style.top = "50px";
mapPanel.style.left = "0";
mapPanel.id = "map";

// status panel div.
const statusPanel = document.createElement("div");
app.appendChild(statusPanel);
statusPanel.style.width = "100%";
statusPanel.style.height = "50px";
statusPanel.style.position = "absolute";
statusPanel.style.bottom = "0";
statusPanel.style.left = "0";
statusPanel.style.backgroundColor = "rgba(0,0,0,0.2)";
let statusText = "You don't have any coins! Collect some from caches.";
statusPanel.innerHTML = statusText;

// main game 

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: NULL_SPACE,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

function generateCache() {
  const location = player.getLocation();

  for(const n of board.getCellsNearPoint(location)){
    if(board.calculateLuckiness(n) < CACHE_SPAWN_PROBABILITY){
      spawnCache(n);
    }
  }
}

function refreshCache(){
  map.eachLayer((layer) => {
    if(layer instanceof leaflet.Rectangle){
      map.removeLayer(layer);
    }
  });
  generateCache();
}

function updateMapView(){
  if(isPannable){
    map.setView(player.getLocation(), GAMEPLAY_ZOOM_LEVEL);
  }
}


function updateStatus(){
  statusPanel.innerHTML = statusText
}

function loadGame(){
  const boardval = localStorage.getItem("board");
  const playerval = localStorage.getItem("player");
  const moveval = localStorage.getItem("movementHistory");

  // check if data exists, if exist, deserialize
  if(boardval && playerval && moveval){
    board = Board.deserializeBoard(boardval);
    player = Player.deserializePlayer(playerval, map);
    movementHistory = JSON.parse(moveval);
    updateDrawMoveHistory();
    statusText = `You have ${player.getCoinCount()} coins.`;
  } else {
    board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
    player = new Player(OAKES_CLASSROOM, map);
    movementHistory = [];
  }

  player.createObserver(updateMapView);
  player.createObserver(updateStatus);
}

function saveGame() {
  // clear all data
  localStorage.removeItem("board");
  localStorage.removeItem("player");
  localStorage.removeItem("movementHistory");

  localStorage.setItem("board", board.serializeBoard());
  localStorage.setItem("player", player.serializePlayer());
  localStorage.setItem("movementHistory", JSON.stringify(movementHistory));
}

function resetGame() {
  map.removeLayer(player.getPlayer());
  // remove polyline
  if(movePolyL){
    map.removeLayer(movePolyL);
  }
  // clear local storage
  localStorage.removeItem("board");
  localStorage.removeItem("player");
  board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
  player = new Player(OAKES_CLASSROOM, map);
  // moved add observer to the function
  player.createObserver(updateMapView);
  player.createObserver(updateStatus);
  movementHistory = [];
  statusText = "You don't have any coins! Collect some from caches.";
  updateMapView();
  updateStatus();
  refreshCache();
}

// redefine spawnCache() reusing variables like popupDiv
function spawnCache(spawnCell: Cell) {
  if(!(board.calculateLuckiness(spawnCell) < CACHE_SPAWN_PROBABILITY)){
    console.log("attempt to call spawnCache() in non-cache cell");
    return;
  }
  // Convert cell numbers into lat/lng bounds
  const bounds = board.getCellBounds(spawnCell);
  const cache = board.getCacheForCell(spawnCell)!;

  // creating rectangle
  const rect = leaflet.rectangle(bounds, {color: "blue", weight: 1});
  rect.addTo(map);
  rect.bindTooltip(stringifyCell(spawnCell));

  rect.bindPopup(() => {
    // create deposit and withdraw buttons
    const popupDiv = document.createElement("div");
    const popupText = document.createElement("div");
    popupText.innerText = `You found a cache! ${cache.coins.length} coins here.`;
    popupDiv.appendChild(popupText);

    const bWithdraw = document.createElement("button");
    bWithdraw.innerText = "Collect";
    bWithdraw.style.backgroundColor = "#aaffaa";
    bWithdraw.style.color = "black";
    popupDiv.appendChild(bWithdraw);

    const bDeposit = document.createElement("button");
    bDeposit.innerText = "Deposit";
    bDeposit.style.backgroundColor = "#aaaaff";
    bDeposit.style.color = "black";
    popupDiv.appendChild(bDeposit);

    bWithdraw.addEventListener("click", () => {
      event?.stopPropagation();

      if(cache.coins.length > 0) {
        const coin = cache.coins.pop()!;
        player.addCoin(coin);

        board.setCacheForCell(spawnCell, cache);

        statusText = `You picked up coin ${decodeCoin(coin)}.<br>Player has ${player.getCoinCount()} coins.`;
        popupText.innerText = `You found a cache! ${cache.coins.length} coins here.`;

        player.notifyObserver();
        saveGame();
      }

      return false;
    });
    bDeposit.addEventListener("click", () => {
      if(player.getCoinCount() > 0){
        const coin = player.getCoin()!;
        cache.coins.push(coin);

        board.setCacheForCell(spawnCell, cache);
        
        statusText = `You left behind coin ${decodeCoin(coin)}.<br>Player has ${player.getCoinCount()} coins.`;
        popupText.innerText = `You found a cache! ${cache.coins.length} coins here.`;

        player.notifyObserver();
        saveGame();
      }
      return false;
    });
    return popupDiv;
  });
}

export function decodeCoin(coin: Coin): string {
  return `${coin.spawnLocation.i}:${coin.spawnLocation.j}#${coin.serial}`;
}
export function stringifyCell(cell: Cell): string {
  const { i, j } = cell;
  return `${i}:${j}`;
}

function drawPolyLine() {
  if(movePolyL){
    map.removeLayer(movePolyL);
  }
  movePolyL = leaflet.polyline(movementHistory, {
    color: "magenta",
  }).addTo(map);
}

function checkCellBoundary(oldLoc: leaflet.LatLng, newLoc: leaflet.LatLng,):boolean {
  const oldCell = board.getCellForPoint(oldLoc);
  const newCell = board.getCellForPoint(newLoc);
  if(oldCell.i !== newCell.i || oldCell.j !== newCell.j){
    console.log("crossed Cell Boundary: ", oldCell, newCell);
    return true;
  }
  return false;
}

function updateDrawMoveHistory(){
  if(checkLocation()){
    return;
  }
  movementHistory.push(player.getLocation());
  drawPolyLine();
}

function checkLocation(){
  if(movementHistory.length == 0){
    return false;
  }
  if(movementHistory[movementHistory.length - 1] == player.getLocation()){
    return true;
  }
  return false;
}

function getPromiseCurrentLocation(): Promise<GeolocationPosition>{
  return new Promise((resolve, reject)=>{
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(resolve,reject);
    }else{
      reject(new Error("Geolocation is not supported by the current browser"));
    }
  });
}


function updateLocation(){
  if(locationActivated){
    console.log("attempting to update geolocation...");

    const oldLoc = player.getLocation();

    getPromiseCurrentLocation().then((newLoc) => {
      if(newLoc) {
        const { latitude, longitude } = newLoc.coords;
        const newLeafletVar = leaflet.latLng(latitude, longitude);
        player.setLocation(newLeafletVar);
        if(checkCellBoundary(oldLoc, newLeafletVar)){
          console.log("crossed Cell Boundary, refreshing caches...");
          refreshCache();
        }
        player.notifyObserver();
        updateDrawMoveHistory();
        saveGame();
      } else {
        console.log("null geolocation.");
      }
    }).catch((error) =>{
      console.error("Error getting geolocation: ", error);
    });
  }
  setTimeout(updateLocation, GEOLOCATION_UPDATE_INTERVAL);
}

loadGame();
updateMapView();
updateLocation();
updateMapView();
refreshCache();

globalThis.addEventListener("beforeunload", saveGame);