import { downloadSourcesSublevel } from "@main/level";
import { registerEvent } from "../register-event";
import { orderBy } from "lodash-es";

const getDownloadSources = async (_event: Electron.IpcMainInvokeEvent) => {
  const allSources = await downloadSourcesSublevel.values().all();
  // Deduplicate by normalized name
  const seen = new Map<string, typeof allSources[0]>();
  for (const source of allSources) {
    const key = (source.name || "").toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, source);
    } else {
      const existing = seen.get(key)!;
      // Prefer source with higher downloadCount or matched status
      if ((source.downloadCount || 0) > (existing.downloadCount || 0)) {
        seen.set(key, source);
      }
    }
  }

  return orderBy(Array.from(seen.values()), "createdAt", "desc");
};

registerEvent("getDownloadSources", getDownloadSources);
