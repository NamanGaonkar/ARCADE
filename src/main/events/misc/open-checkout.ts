import { registerEvent } from "../register-event";
import type { OpenCheckoutOptions } from "@types";

const openCheckout = async (
  _event: Electron.IpcMainInvokeEvent,
  _options?: OpenCheckoutOptions
) => {
  return;
};

registerEvent("openCheckout", openCheckout);
