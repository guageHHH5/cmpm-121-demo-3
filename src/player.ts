import leaflet from "leaflet";
import { Coin } from "./board.ts";

// Player class
export class Player{
    private readonly coins: Coin[];
    private location: leaflet.LatLng;
    private marker: leaflet.Marker;
    private observer: (()=>void)[] = [];

    private movementHistory: leaflet.LatLng[] = [];
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

    public getCoinInventory(){
      return this.coins;
    }

    public getPlayer(): leaflet.Marker{
      return this.marker;
    }

    public getMovementHistory(): leaflet.LatLng[]{
      return this.movementHistory;
    }

    public getPlayerLocation(): leaflet.LatLng{
      return this.location;
    }
    
    public setLocation(location:leaflet.LatLng): void{
      this.location = location;
      this.marker.setLatLng(this.location);
      this.notifyObserver();
    }

    public moveByLatLng(latOffset: number, lngOffset: number): void{
      const nLat = this.location.lat + latOffset;
      const nLng = this.location.lng + lngOffset;
      const nLoc = leaflet.latLng(nLat, nLng);
      this.setLocation(nLoc);    
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
      this.moveByLatLng(this.MOVE_OFFEST, 0);
    }

    public moveDown(): void{
      this.moveByLatLng(-this.MOVE_OFFEST, 0);
    }

    public moveLeft(): void{
      this.moveByLatLng(0, -this.MOVE_OFFEST);
    }

    public moveRight(): void{
      this.moveByLatLng(0, this.MOVE_OFFEST);
    }

    public createObserver(observers: () => void): void {
      this.observer.push(observers);
    }

    public notifyObserver(): void {
      for (const observers of this.observer){
        observers();
      }
    }

    public resetCoins(): void {
      this.coins.length = 0;
    }

    serializePlayer(): string {
      return JSON.stringify({
        location: this.location,
        coins: this.coins.map((coin) => ({
          spawnLoc: coin.spawnLocation,
          serial: coin.serial,
        })),
      });
    }

    static deserializePlayer(data: string, map: leaflet.Map): Player {
      console.log("Deserializing player...");
      const parsed = JSON.parse(data);
      console.log("object returned by JSON parse: ", parsed);
      const player = new Player(
        leaflet.latLng(parsed.location.lat, parsed.location.lng),
        map,
      );
      parsed.coins.forEach((coin: Coin) => {
        player.addCoin(new Coin(coin.spawnLocation, coin.serial));
      });
      return player;
    }
  }