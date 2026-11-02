import { registerEvent } from "../register-event";

interface HydraApiCallPayload {
  method:
    | "get"
    | "getResponse"
    | "post"
    | "postResponse"
    | "put"
    | "patch"
    | "delete";
  url: string;
  data?: unknown;
  params?: unknown;
}

const hydraApiCall = async (
  _event: Electron.IpcMainInvokeEvent,
  payload: HydraApiCallPayload
) => {
  // ArcadeX is 100% local-first and does not communicate with Hydra servers.
  throw new Error(
    `ArcadeX local-only mode: Hydra remote API endpoint '${payload.url}' is disabled.`
  );
};

registerEvent("hydraApiCall", hydraApiCall);
