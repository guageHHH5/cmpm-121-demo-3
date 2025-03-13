// todo
// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import { Board, Cell, Coin } from "./board.ts";
import { Player } from "./player.ts";
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
export const CACHE_SPAWN_PROBABILITY = 0.1;





const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

//let playerPoints = 0;
//const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
//statusPanel.innerHTML = "No points yet...";




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

// map panel div.
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
statusPanel.innerHTML = `You don't have any coins! Collect some from caches.`;

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


// new player
const player = new Player(OAKES_CLASSROOM, map);

// background layer for map
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

function updateStatus(coinMSG: string){
  statusPanel.innerHTML = `${coinMSG}<br>Player has ${player.getCoinCount()} coins.`;
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
      if(cache.coins.length > 0) {
        const coin = cache.coins.pop()!;
        const coinMsg = `Received coin ${decodeCoin(coin)}.`;
        player.addCoin(coin);

        popupText.innerText = `You found a cache! ${cache.coins.length} coins here.`;
        updateStatus(coinMsg);
      }
    });
    bDeposit.addEventListener("click", () => {
      if(player.getCoinCount() > 0){
        const coin = player.getCoin()!;
        const coinMsg = `Left coin ${decodeCoin(coin)}.`;
        cache.coins.push(coin);

        popupText.innerText = `You found a cache! ${cache.coins.length} coins here.`;
        updateStatus(coinMsg);
      }
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

function updateMapView(){
  const playerLoc = player.getLocation();
  map.setView(playerLoc, GAMEPLAY_ZOOM_LEVEL);
}

updateMapView();
generateCache();
