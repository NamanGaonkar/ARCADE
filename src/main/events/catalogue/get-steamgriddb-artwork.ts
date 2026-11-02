import { registerEvent } from "../register-event";
import { SteamGridDBService } from "@main/services/steamgriddb";

registerEvent(
  "getSteamGridDBArtwork",
  async (_event, title: string, steamAppId?: string | number) => {
    return SteamGridDBService.fetchArtwork(title, steamAppId);
  }
);
