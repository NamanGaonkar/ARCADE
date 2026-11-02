import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useAppSelector,
  useDownload,
  useLibrary,
  useToast,
} from "@renderer/hooks";

import "./bottom-panel.scss";

import { useNavigate } from "react-router-dom";

export function BottomPanel() {
  const { t } = useTranslation(["bottom_panel", "sidebar"]);

  const navigate = useNavigate();

  const { downloadLibrary: library } = useLibrary();

  const { showSuccessToast } = useToast();

  const { lastPacket, progress, downloadSpeed, eta } = useDownload();

  const extraction = useAppSelector((state) => state.download.extraction);

  const [version, setVersion] = useState("");
  const [commonRedistStatus, setCommonRedistStatus] = useState<string | null>(
    null
  );

  useEffect(() => {
    window.electron.getVersion().then((result) => setVersion(result));
  }, []);

  useEffect(() => {
    const unlisten = window.electron.onCommonRedistProgress(
      ({ log, complete }) => {
        if (log === "Installation timed out" || complete) {
          setCommonRedistStatus(null);

          if (complete) {
            showSuccessToast(
              t("installation_complete"),
              t("installation_complete_message")
            );
          }

          return;
        }

        setCommonRedistStatus(log);
      }
    );

    return () => unlisten();
  }, [t, showSuccessToast]);

  const status = useMemo(() => {
    if (commonRedistStatus) {
      return t("installing_common_redist", { log: commonRedistStatus });
    }

    if (extraction) {
      const extractingGame = library.find(
        (game) => game.id === extraction.visibleId
      );

      if (extractingGame) {
        const extractionPercentage = Math.round(extraction.progress * 100);
        return t("extracting", {
          title: extractingGame.title,
          percentage: `${extractionPercentage}%`,
        });
      }
    }

    const targetId = lastPacket?.gameId ? String(lastPacket.gameId) : "";
    const game = targetId
      ? library.find(
          (g) =>
            g.id === targetId ||
            g.id === `game:${targetId}` ||
            `${g.shop}:${g.objectId}` === targetId ||
            g.objectId === targetId ||
            ((lastPacket?.download as any)?.title &&
              g.title?.toLowerCase() === (lastPacket?.download as any).title.toLowerCase())
        )
      : undefined;

    const title = game?.title || (lastPacket?.download as any)?.title;

    if (title) {
      if (lastPacket?.isRecovering)
        return t("recovering", {
          title,
          percentage: `${Math.round((lastPacket.recoveryProgress ?? 0) * 100)}%`,
        });

      if (lastPacket?.isReconnecting)
        return t("reconnecting", {
          title,
        });

      if (lastPacket?.isCheckingFiles)
        return t("checking_files", {
          title,
          percentage: progress,
        });

      if (lastPacket?.isDownloadingMetadata)
        return t("downloading_metadata", {
          title,
          percentage: progress,
        });

      if (!eta) {
        return t("calculating_eta", {
          title,
          percentage: progress,
        });
      }

      return t("downloading", {
        title,
        percentage: progress,
        eta,
        speed: downloadSpeed,
      });
    }

    return t("no_downloads_in_progress");
  }, [
    t,
    library,
    lastPacket,
    progress,
    eta,
    downloadSpeed,
    commonRedistStatus,
    extraction,
  ]);

  return (
    <footer className="bottom-panel">
      <div className="bottom-panel__left" />

      <div className="bottom-panel__center">
        <button
          type="button"
          className="bottom-panel__downloads-button"
          onClick={() => navigate("/downloads")}
        >
          <small>{status}</small>
        </button>
      </div>

      <div className="bottom-panel__right">
        <span className="bottom-panel__version-button">
          <small>ArcadeX v{version}</small>
        </span>
      </div>
    </footer>
  );
}
