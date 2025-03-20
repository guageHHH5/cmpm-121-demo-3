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
  private readonly knownCacheMomentos: Map<Cell, string>;

  constructor(tileWidth: number, tileVisRad: number) {
    this.tileWidth = tileWidth;
    this.titleVisRad = tileVisRad;
    this.knownCells = new Map();
    this.knownCacheMomentos = new Map();
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

  getCellCenter(cell: Cell): leaflet.LatLng {
    const {i, j} = cell;
    return leaflet.latLng(
      (i + 0.5) * this.tileWidth,
      (j + 0.5) * this.tileWidth,
    );
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
  private cacheToMomentos(cache: Cache): string{
    return JSON.stringify(cache);
  }

  private momentosToCache(unparsed: string): Cache{
    return JSON.parse(unparsed);
  }

  getCacheForCell(cell: Cell): Cache | null {
    if (this.calculateLuckiness(cell) < CACHE_SPAWN_PROBABILITY) {
      if(!this.knownCacheMomentos.has(cell)){
        const coins = this.calculateNumCoins(cell);
        this.initCache(cell, coins);
      }
      const getCache = this.knownCacheMomentos.get(cell)!;
      return this.momentosToCache(getCache);
    }
    return null;
  }

  setCacheForCell(cell: Cell, cache: Cache): void{
    const unparsed = this.cacheToMomentos(cache);
    this.knownCacheMomentos.set(cell, unparsed);
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

    const newUnparsed = this.cacheToMomentos(nCache);

    this.knownCacheMomentos.set(cell, newUnparsed);
  }

  serializeBoard(): string {
    const serialized = {
      tileWidth: this.tileWidth,
      tileVisRad: this.titleVisRad,
      knownCells: Array.from(this.knownCells.entries()),
      cacheMomentos: Array.from(this.knownCacheMomentos.entries(),)
      .map(([cell, momento]) => ({
        cell: {i: cell.i, j: cell.j},
        momento,
      }),
    )
    };
    return JSON.stringify(serialized);
  }

  static deserializeBoard(data: string): Board {
    const parsed = JSON.parse(data);
    const board = new Board(parsed.tileWidth, parsed.tileVisRad);

    // Deserialize knownCells
    for(const [key, cell] of parsed.knownCells){
      board.knownCells.set(key, cell);
    }

    // Deserialize momentos
    for (const items of parsed.cacheMomentos){
      const cell = {i: items.cell.i, j: items.cell.j};
      const cache = board.momentosToCache(items.momento);
      board.setCacheForCell(cell, cache);
    }

    return board;
  }
}
