import { useContext, useEffect, useState } from "react";
import { Button, Badge } from "@renderer/components";
import { useTranslation } from "react-i18next";
import type { DownloadSource } from "@types";
import { SyncIcon, CheckCircleIcon, PlusCircleIcon } from "@primer/octicons-react";
import { useAppDispatch, useToast } from "@renderer/hooks";
import { useFormat } from "@renderer/hooks/use-format";
import { DownloadSourceStatus } from "@shared";
import { useNavigate } from "react-router-dom";
import { setFilters, clearFilters } from "@renderer/features";
import { levelDBService } from "@renderer/services/leveldb.service";
import { settingsContext } from "@renderer/context";
import { AddDownloadSourceModal } from "./add-download-source-modal";
import { orderBy } from "lodash-es";
import "./settings-download-sources.scss";
import { logger } from "@renderer/logger";

export function SettingsDownloadSources() {
  const [downloadSources, setDownloadSources] = useState<DownloadSource[]>([]);
  const [hasLoadedDownloadSources, setHasLoadedDownloadSources] = useState(false);
  const [isSyncingDownloadSources, setIsSyncingDownloadSources] = useState(false);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);

  const { sourceUrl, clearSourceUrl } = useContext(settingsContext);

  const { t } = useTranslation("settings");
  const { showSuccessToast } = useToast();
  const { numberFormatter } = useFormat();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const deduplicateSources = (sources: DownloadSource[]): DownloadSource[] => {
    const map = new Map<string, DownloadSource>();
    for (const source of sources) {
      const key = (source.name || "").toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, source);
      } else {
        const existing = map.get(key)!;
        if ((source.downloadCount || 0) > (existing.downloadCount || 0)) {
          // Clean up stale duplicate from LevelDB
          levelDBService.del("downloadSources", existing.id).catch(() => {});
          map.set(key, source);
        } else {
          levelDBService.del("downloadSources", source.id).catch(() => {});
        }
      }
    }
    return orderBy(Array.from(map.values()), "createdAt", "desc");
  };

  useEffect(() => {
    const fetchDownloadSources = async () => {
      const sources = (await levelDBService.values(
        "downloadSources"
      )) as DownloadSource[];
      const deduped = deduplicateSources(sources);
      setDownloadSources(deduped);
      setHasLoadedDownloadSources(true);
    };

    fetchDownloadSources();
  }, []);

  useEffect(() => {
    if (sourceUrl) {
      setShowAddSourceModal(true);
    }
  }, [sourceUrl]);

  useEffect(() => {
    const hasPendingOrMatchingSource = downloadSources.some(
      (source) =>
        source.status === DownloadSourceStatus.PendingMatching ||
        source.status === DownloadSourceStatus.Matching
    );

    if (!hasPendingOrMatchingSource || !downloadSources.length) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        await window.electron.syncDownloadSources();
        const sources = (await levelDBService.values(
          "downloadSources"
        )) as DownloadSource[];
        const deduped = deduplicateSources(sources);
        setDownloadSources(deduped);
      } catch (error) {
        logger.error("Failed to fetch download sources:", error);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [downloadSources]);

  const syncDownloadSources = async () => {
    setIsSyncingDownloadSources(true);

    try {
      await window.electron.syncDownloadSources();
      const sources = (await levelDBService.values(
        "downloadSources"
      )) as DownloadSource[];
      const deduped = deduplicateSources(sources);
      setDownloadSources(deduped);

      showSuccessToast(t("download_sources_synced_successfully"));
    } finally {
      setIsSyncingDownloadSources(false);
    }
  };

  const statusTitle = {
    [DownloadSourceStatus.PendingMatching]: t(
      "download_source_pending_matching"
    ),
    [DownloadSourceStatus.Matched]: t("download_source_matched"),
    [DownloadSourceStatus.Matching]: t("download_source_matching"),
    [DownloadSourceStatus.Failed]: t("download_source_failed"),
  };

  const navigateToCatalogue = (fingerprint?: string) => {
    if (!fingerprint) {
      logger.error("Cannot navigate: fingerprint is undefined");
      return;
    }

    dispatch(clearFilters());
    dispatch(setFilters({ downloadSourceFingerprints: [fingerprint] }));
    navigate("/catalogue");
  };

  return (
    <>
      <AddDownloadSourceModal
        visible={showAddSourceModal}
        onClose={() => {
          setShowAddSourceModal(false);
          clearSourceUrl();
        }}
        onAddDownloadSource={async () => {
          const sources = (await levelDBService.values(
            "downloadSources"
          )) as DownloadSource[];
          const deduped = deduplicateSources(sources);
          setDownloadSources(deduped);
          showSuccessToast("Download source added successfully");
        }}
      />

      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: "0 0 6px 0", fontSize: 14, color: "var(--color-text-subtle)" }}>
          ArcadeX includes verified, pre-configured download catalogs (FitGirl, DODI, SteamRip, GOG, OnlineFix, and Retro ROMs) managed automatically by ArcadeX developers. You can also install custom catalogs from Hydra Library.
        </p>
      </div>

      <div className="settings-download-sources__header">
        <Button
          type="button"
          theme="outline"
          disabled={
            (hasLoadedDownloadSources && !downloadSources.length) ||
            isSyncingDownloadSources
          }
          onClick={syncDownloadSources}
        >
          <SyncIcon />
          {t("sync_download_sources")}
        </Button>

        <Button
          type="button"
          theme="outline"
          onClick={() => setShowAddSourceModal(true)}
          disabled={isSyncingDownloadSources}
        >
          <PlusCircleIcon />
          <span>Add Source</span>
        </Button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-text-subtle)", fontSize: 13, marginLeft: "auto" }}>
          <CheckCircleIcon fill="#10b981" />
          <span>Managed Catalogs Active ({downloadSources.length})</span>
        </div>
      </div>

      <ul className="settings-download-sources__list">
        {downloadSources.map((downloadSource) => {
          const isPendingOrMatching =
            downloadSource.status === DownloadSourceStatus.PendingMatching ||
            downloadSource.status === DownloadSourceStatus.Matching;
          const isClassic =
            downloadSource.name.toLowerCase().includes("retro") ||
            downloadSource.name.toLowerCase().includes("classic") ||
            downloadSource.name.toLowerCase().includes("psx");

          return (
            <li
              key={downloadSource.id}
              className={`settings-download-sources__item ${isSyncingDownloadSources ? "settings-download-sources__item--syncing" : ""} ${isPendingOrMatching ? "settings-download-sources__item--pending" : ""}`}
            >
              <div className="settings-download-sources__item-header">
                <div className="settings-download-sources__title-row">
                  <h2>{downloadSource.name}</h2>
                  <div className="settings-download-sources__badges">
                    <Badge>
                      {isClassic ? "Classic" : "Modern"}
                    </Badge>
                    <Badge>
                      {isPendingOrMatching && (
                        <SyncIcon className="settings-download-sources__spinner" />
                      )}
                      {statusTitle[downloadSource.status] || "Up to Date"}
                    </Badge>
                  </div>
                </div>

                <button
                  type="button"
                  className="settings-download-sources__navigate-button"
                  disabled={!downloadSource.fingerprint}
                  onClick={() =>
                    navigateToCatalogue(downloadSource.fingerprint)
                  }
                >
                  <small>
                    {isPendingOrMatching
                      ? t("download_source_no_information")
                      : t("download_count", {
                          count: downloadSource.downloadCount,
                          countFormatted: numberFormatter.format(
                            downloadSource.downloadCount
                          ),
                        })}
                  </small>
                </button>
              </div>

              <div className="settings-download-sources__url-row">
                <span
                  className="settings-download-sources__url-text"
                  title={downloadSource.url}
                >
                  {downloadSource.url}
                </span>
                <Badge>Verified Source</Badge>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
