import leaflet from "leaflet";
import { Coin } from "./board.ts";

// Player class
export class Player{
    private readonly coins: Coin[];
    private location: leaflet.LatLng;
    private marker: leaflet.Marker;
    private observer: (()=>void)[] = [];
  
    private MOVE_OFFEST = 0.00001;

    constructor(location: leaflet.LatLng, map: leaflet.Map){
      this.coins = [];
      this.location = location;
      this.marker = leaflet.marker(location);
      this.marker.bindTooltip("This is you!");
      this.marker.addTo(map);
    }
  
    public getLocation(): leaflet.LatLng{
      return this.location;
    }
  
    public setLocation(location:leaflet.LatLng): void{
      this.location = location;
    }
  
    public addCoin(coin: Coin): void{
      this.coins.push(coin);
    }
  
    public getCoin(): Coin | undefined{
      return this.coins.pop();
    }
  
    public getCoinCount(): number{
      return this.coins.length;
    }

    public moveUp(): void{
      const lat = this.location.lat + this.MOVE_OFFEST;
      this.move(lat, this.location.lng);
    }

    public moveDown(): void{
      const lat = this.location.lat - this.MOVE_OFFEST;
      this.move(lat, this.location.lng);
    }

    public moveLeft(): void{
      const lng = this.location.lng - this.MOVE_OFFEST;
      this.move(this.location.lat, lng);
    }

    public moveRight(): void{
      const lng = this.location.lng + this.MOVE_OFFEST;
      this.move(this.location.lat, lng);
    }

    public move(lat: number, lng: number): void {
      this.location = leaflet.latLng(lat, lng);
      this.marker.setLatLng(this.location);
      this.notifyObserver();
    }

    public createObserver(observers: () => void): void {
      this.observer.push(observers);
    }

    public notifyObserver(): void {
      for (const observers of this.observer){
        observers();
      }
    }
  }