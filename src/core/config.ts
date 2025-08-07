import { FilamentConfig } from "./services/filament_client.js";


export const filamentConfig: FilamentConfig | any = {
  baseUrl: process.env.BASE_URL,
  privateKey: process.env.PRIVATE_KEY || ""
}