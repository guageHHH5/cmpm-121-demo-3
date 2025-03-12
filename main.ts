// todo
// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import { Board, Cell } from "./board.ts";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
export const CACHE_SPAWN_PROBABILITY = 0.1;



// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Add title
const title = document.querySelector<HTMLDivElement>("#title")!;
title.innerHTML = "Geocoin Carrier";
title.style.marginLeft = "10px";
title.style.font = "bold 54px sans-serif";

const origin = OAKES_CLASSROOM;

// Display player points
const status = document.querySelector<HTMLDivElement>("#statusPanel")!;
status.innerHTML = "No coins available";
status.style.font = "bold 24px sans-serif";

interface Coin {
  i: number;
  j: number;
  serial: number;
}

// numerical representation of position
function roundNumber(value: number): number {
  return Math.floor(value * 10000);
}

function generateLatLong(x: number, y: number) {
  return [
    roundNumber(origin.lat + x * TILE_DEGREES),
    roundNumber(origin.lng + y * TILE_DEGREES),
  ];
}

function regenPopText(
  coins: Coin[],
  popDiv: HTMLDivElement,
  i: number,
  j: number,
) {
  const [lat, lng] = generateLatLong(i, j);
  let text = `<div><b>Cache ${lat}:${lng}</b></div>
							<br></br>
							<div>Coins: 
									<ul>`;
  for (let k = 0; k < coins.length; k++) {
    text += `<li>Coin ${coins[k].i}:${coins[k].j} #${coins[k].serial}</li>`;
  }
  text += `       </ul>
							</div>
					<button id="take">Take Coin</button>
					<button id="deposit">Deposit Coin</button>`;

  popDiv.innerHTML = text;
}

function generateCoin(i: number, j: number) {
  const [lat, lng] = generateLatLong(i, j);

  const points = Math.floor(
    luck([i, j, "initialValue"].toString()) * 100,
  );

  const coins: Coin[] = [];
  for (let k = 0; k < 3; k++) {
    if (points > k * 33) {
      coins.push({ i: lat, j: lng, serial: k + 1 });
    }
  }
  if (coinCache.get([lat, lng].toString()) == null) {
    coinCache.set([lat, lng].toString(), coins);
  }
}

const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

const playerCoins: Coin[] = [];

const coinCache: Map<string, Coin[]> = new Map<string, Coin[]>();

function regenerateCoinTxt() {
  status.innerHTML = `${playerCoins.length} coins accumulated
          <ul>`;
  for (let i = 0; i < playerCoins.length; i++) {
    status.innerHTML += `<li> Coin ${playerCoins[i].i}:${playerCoins[i].j} 
    #${playerCoins[i].serial} </li>`;
  }
  status.innerHTML += `</ul>`;
}

function cacheSpawn(i: number, j: number) {
  const [lat, lng] = generateLatLong(i, j);
  const bound = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // create coin
  generateCoin(i, j);

  const rectangle = leaflet.rectangle(bound);
  rectangle.addTo(map);
  console.log(`Adding rectangle at (${lat}, ${lng})`);

  // interaction with cache
  rectangle.bindPopup(() => {
    const popDiv = document.createElement("div");
    regenPopText(coinCache.get([lat, lng].toString())!, popDiv, i, j);

    // decrement on click
    popDiv
      .querySelector<HTMLButtonElement>(`#take`)!
      .addEventListener("click", () => {
        if (coinCache.get([lat, lng].toString())!.length > 0) {
          console.log(coinCache.get([lat, lng].toString())!);
          playerCoins.push(
            coinCache.get(
              [lat, lng].toString(),
            )![coinCache.get([lat, lng].toString())!.length - 1],
          );
          coinCache.get([lat, lng].toString())!.pop();
          regenerateCoinTxt();
          rectangle.closePopup();
        }
      });

    popDiv
      .querySelector<HTMLButtonElement>(`#deposit`)!
      .addEventListener("click", () => {
        if (playerCoins.length > 0) {
          coinCache.get([lat, lng].toString())!.push(
            playerCoins[playerCoins.length - 1],
          );
          playerCoins.pop();
          regenerateCoinTxt();
          rectangle.closePopup();
        }
      });

    return popDiv;
  });
}

let isTracking = false;
let location: number | null = null;

function makeButtons() {
  const north = document.querySelector<HTMLButtonElement>("#north")!;
  const east = document.querySelector<HTMLButtonElement>("#east")!;
  const south = document.querySelector<HTMLButtonElement>("#south")!;
  const west = document.querySelector<HTMLButtonElement>("#west")!;
  const sensor = document.querySelector<HTMLButtonElement>("#sensor")!;
  const reset = document.querySelector<HTMLButtonElement>("#reset")!;
  const buttons = [north, east, south, west];

  const changes = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener("click", () => {
      playerMarker.setLatLng(
        new leaflet.LatLng(
          playerMarker.getLatLng().lat + changes[i][0] * TILE_DEGREES,
          playerMarker.getLatLng().lng + changes[i][1] * TILE_DEGREES,
        ),
      );
    });
  }

  sensor.addEventListener("click", () => {
    if (isTracking) {
      if (location !== null) {
        navigator.geolocation.clearWatch(location);
        location = null;
      }
      isTracking = false;
    } else {
      if (navigator.geolocation) {
        location = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const newPos = leaflet.latLng(latitude, longitude);

            playerMarker.setLatLng(newPos);
            map.setView(newPos);
          },
        );
        isTracking = true;
      }
    }
  });

  reset.addEventListener("click", () => {
    playerMarker.setLatLng(OAKES_CLASSROOM);
  });
}

export function stringifyCell(cell: Cell): string {
  const { i, j } = cell;
  return `${i}:${j}`;
}

function generateCache() {
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {  
        board.addCell(i, j);
        cacheSpawn(i, j);
      }
      //console.log(`Forcing cache spawn at (${i}, ${j})`); // Debugging log
    }
  }
}

makeButtons();
generateCache();
