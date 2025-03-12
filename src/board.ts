// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

interface Cell {
  i: number;
  j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly titleVisRad: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisRad: number) {
    this.tileWidth = tileWidth;
    this.titleVisRad = tileVisRad;
    this.knownCells = new Map<string, Cell>();
  }

  private getCanonCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const cell: Cell = { i: point.lat, j: point.lng };
    return this.getCanonCell(cell);
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { i, j } = cell;
    const S = i - this.tileWidth / 2;
    const N = i + this.tileWidth / 2;
    const W = j - this.tileWidth / 2;
    const E = j + this.tileWidth / 2;
    return leaflet.latLngBounds(
      leaflet.latLng(S, W),
      leaflet.latLng(N, E),
    );
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const result: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (let a = -this.titleVisRad; a <= this.titleVisRad; a++) {
      for (let b = -this.titleVisRad; b <= this.titleVisRad; b++) {
        if (
          this.knownCells.get(
            [originCell.i + a, originCell.j + b].toString(),
          ) != null
        ) {
          result.push(
            this.knownCells.get(
              [originCell.i + a, originCell.j + b].toString(),
            )!,
          );
        }
      }
    }
    return result;
  }

  addCell(i: number, j: number): void {
    const key = [i, j].toString();
    if (this.knownCells.get(key) == null) {
      this.knownCells.set(key, { i, j });
    }
  }
}
