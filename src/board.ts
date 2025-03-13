// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import { CACHE_SPAWN_PROBABILITY, stringifyCell } from "./main.ts";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export interface Cache {
  coins: Coin[];
  cSerial: number;
  readonly location: Cell;
}

export class Coin {
  readonly spawnLocation: Cell;
  readonly serial: number;
  constructor(spawnLocation: Cell, serial: number) {
    this.spawnLocation = spawnLocation;
    this.serial = serial;
  }
}

export class Board {
  readonly tileWidth: number;
  readonly titleVisRad: number;

  private readonly knownCells: Map<string, Cell>;
  private readonly knownCaches: Map<Cell, Cache>;

  constructor(tileWidth: number, tileVisRad: number) {
    this.tileWidth = tileWidth;
    this.titleVisRad = tileVisRad;
    this.knownCells = new Map();
    this.knownCaches = new Map();
  }

  private getCanonCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = `${i}:${j}`;
    if(!this.knownCells.has(key)){
      this.knownCells.set(key, {i, j})!;
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonCell({
      i: Math.floor(point.lat / this.tileWidth),
      j: Math.floor(point.lng / this.tileWidth),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { i, j } = cell;
    return leaflet.latLngBounds(
      [i * this.tileWidth, j * this.tileWidth],
      [(i + 1) * this.tileWidth, (j + 1) * this.tileWidth],
    );
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const result: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (let i = -this.titleVisRad; i <= this.titleVisRad; i++) {
      for (let j = -this.titleVisRad; j <= this.titleVisRad; j++) {
        result.push(
          this.getCanonCell({
            i: originCell.i + i,
            j: originCell.j + j,
        }));
      }
    }
    return result;
  }

  getCacheForCell(cell: Cell): Cache | null {
    if (this.calculateLuckiness(cell) < CACHE_SPAWN_PROBABILITY) {
      if(!this.knownCaches.has(cell)){
        const coins = this.calculateNumCoins(cell);
        this.initCache(cell, coins);
      }
      return this.knownCaches.get(cell)!;
    }
    return null;
  }
  
  calculateNumCoins(cell: Cell): number{
    const luckprob = this.calculateLuckiness(cell);
    return Math.floor(luckprob * 100);
  }

  calculateLuckiness(cell: Cell): number {
    const key = stringifyCell(cell);
    return luck(key);
  }

  initCache(cell: Cell, numCoins: number): void{
    const nCache: Cache = {
      coins: [],
      cSerial: 0,
      location: cell,
    };

    for(let i = 0; i  < numCoins; i++){
      nCache.coins.push(new Coin(cell, nCache.cSerial++));
    }

    this.knownCaches.set(cell, nCache);
  }
}
