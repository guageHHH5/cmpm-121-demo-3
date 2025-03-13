import leaflet from "leaflet";
import { Coin } from "./board.ts";

// Player class
export class Player{
    private readonly coins: Coin[];
    private location: leaflet.LatLng;
    private marker: leaflet.Marker;
  
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
  }