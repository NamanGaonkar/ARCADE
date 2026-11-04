import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  PlusCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LinkExternalIcon,
} from "@primer/octicons-react";
import { Tooltip } from "react-tooltip";

import {
  Badge,
  Button,
  Modal,
  TextField,
  CheckboxField,
  SteamIcon,
} from "@renderer/components";
import type { DownloadSource, Game, GameRepack } from "@types";

import { DownloadSettingsModal } from "./download-settings-modal";
import { gameDetailsContext } from "@renderer/context";
import {
  Downloader,
  getOfficialStoreMembers,
  isEpicMemberInCurrentScope,
} from "@shared";
import { orderBy } from "lodash-es";
import {
  useDate,
  useAppDispatch,
  useAppSelector,
  useIsNonSteamExecutable,
} from "@renderer/hooks";
import { clearNewDownloadOptions } from "@renderer/features";
import { levelDBService } from "@renderer/services/leveldb.service";
import {
  canDownloadOnSteam,
  getGameKey,
  isSteamImportedGame,
} from "@renderer/helpers";
import "./repacks-modal.scss";
import EpicLogo from "@renderer/assets/epic-integration-logo.svg?react";
import { EpicInstallModal } from "./epic-install-modal";
import { useEpicManagedConnection } from "@renderer/hooks/use-epic-managed";
import { useLibrary } from "@renderer/hooks";
import type { LibraryGame } from "@types";
import { epicInstallTiming } from "@renderer/helpers/epic-install-timing";

export interface RepacksModalProps {
  visible: boolean;
  startDownload: (
    repack: GameRepack,
    downloader: Downloader,
    downloadPath: string,
    automaticallyExtract: boolean,
    addToQueueOnly?: boolean,
    fileIndices?: number[],
    selectedFilesSize?: number | null,
    automaticallyDeleteArchiveFiles?: boolean,
    signal?: AbortSignal
  ) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}

export function RepacksModal({
  visible,
  startDownload,
  onClose,
}: Readonly<RepacksModalProps>) {
  const [filteredRepacks, setFilteredRepacks] = useState<GameRepack[]>([]);
  const [repack, setRepack] = useState<GameRepack | null>(null);
  const [showSelectFolderModal, setShowSelectFolderModal] = useState(false);
  const [downloadSources, setDownloadSources] = useState<DownloadSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [filterTerm, setFilterTerm] = useState("");

  const [lastCheckTimestamp, setLastCheckTimestamp] = useState<string | null>(
    null
  );
  const [isLoadingTimestamp, setIsLoadingTimestamp] = useState(true);
  const [viewedRepackIds, setViewedRepackIds] = useState<Set<string>>(
    new Set()
  );

  const { game, presentation, repacks, updateGame } =
    useContext(gameDetailsContext);
  const { steam: steamGame, epic: epicGame } = getOfficialStoreMembers(
    presentation?.members ?? (game ? [game] : [])
  );
  const { installationAvailable: epicAvailable, connection } =
    useEpicManagedConnection();
  const { updateLibrary } = useLibrary();
  const [epicInstallGame, setEpicInstallGame] = useState<LibraryGame | null>(
    null
  );
  const activeEpicInstallGame =
    epicInstallGame?.epicImportScope &&
    epicGame &&
    epicInstallGame.objectId === epicGame.objectId &&
    epicInstallGame.epicImportScope.environment ===
      epicGame.epicImportScope?.environment &&
    epicInstallGame.epicImportScope.userId ===
      epicGame.epicImportScope?.userId &&
    epicInstallGame.epicImportScope.connectionId ===
      epicGame.epicImportScope?.connectionId
      ? epicInstallGame
      : null;
  useEffect(() => {
    if (epicInstallGame && !activeEpicInstallGame) setEpicInstallGame(null);
  }, [epicInstallGame, activeEpicInstallGame]);

  const { t } = useTranslation("game_details");

  const { formatDate } = useDate();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const userPreferences = useAppSelector(
    (state) => state.userPreferences.value
  );

  useEffect(() => {
    const fetchDownloadSources = async () => {
      const sources = (await levelDBService.values(
        "downloadSources"
      )) as DownloadSource[];
      const sorted = orderBy(sources, "createdAt", "desc");
      setDownloadSources(sorted);
    };

    fetchDownloadSources();
  }, []);

  const availableSources = useMemo(() => {
    const names = new Set<string>();
    for (const r of repacks) {
      if (r.downloadSourceName && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(r.downloadSourceName)) {
        names.add(r.downloadSourceName);
      }
    }
    for (const src of downloadSources) {
      if (src.name && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(src.name)) {
        names.add(src.name);
      }
    }
    return Array.from(names).sort();
  }, [repacks, downloadSources]);

  useEffect(() => {
    const fetchLastCheckTimestamp = async () => {
      setIsLoadingTimestamp(true);

      try {
        const timestamp = (await levelDBService.get(
          "downloadSourcesSinceValue",
          null,
          "utf8"
        )) as string | null;

        setLastCheckTimestamp(timestamp);
      } catch {
        setLastCheckTimestamp(null);
      } finally {
        setIsLoadingTimestamp(false);
      }
    };

    if (visible && userPreferences?.enableNewDownloadOptionsBadges !== false) {
      fetchLastCheckTimestamp();
    } else {
      setIsLoadingTimestamp(false);
    }
  }, [visible, repacks, userPreferences?.enableNewDownloadOptionsBadges]);

  useEffect(() => {
    if (
      visible &&
      game?.newDownloadOptionsCount &&
      game.newDownloadOptionsCount > 0
    ) {
      const gameKey = getGameKey(game.shop, game.objectId);
      levelDBService
        .get(gameKey, "games")
        .then((gameData) => {
          if (gameData) {
            const updated = {
              ...(gameData as Game),
              newDownloadOptionsCount: undefined,
            };
            return levelDBService.put(gameKey, updated, "games");
          }
          return Promise.resolve();
        })
        .catch(() => {});

      const gameId = `${game.shop}:${game.objectId}`;
      dispatch(clearNewDownloadOptions({ gameId }));
    }
  }, [visible, game, dispatch]);

  const sortedRepacks = useMemo(() => {
    return orderBy(repacks, [(repack) => repack.uploadDate], ["desc"]);
  }, [repacks]);

  const getRepackAvailabilityStatus = (
    repack: GameRepack
  ): "online" | "partial" | "offline" => {
    const uris = Array.isArray(repack.uris) ? repack.uris : [];
    const unavailableSet = new Set(repack.unavailableUris ?? []);
    const availableCount = uris.filter(
      (uri) => !unavailableSet.has(uri)
    ).length;
    const unavailableCount = uris.length - availableCount;

    if (uris.length === 0) return "offline";
    if (unavailableCount === 0) return "online";
    if (availableCount === 0) return "offline";
    return "partial";
  };

  useEffect(() => {
    const term = filterTerm.trim().toLowerCase();

    const byTerm = sortedRepacks.filter((repack) => {
      if (!term) return true;
      const lowerTitle = repack.title.toLowerCase();
      const lowerRepacker = (repack.downloadSourceName || "").toLowerCase();
      return lowerTitle.includes(term) || lowerRepacker.includes(term);
    });

    const bySource = byTerm.filter((repack) => {
      if (selectedSources.length === 0) return true;
      return selectedSources.includes(repack.downloadSourceName);
    });

    setFilteredRepacks(bySource);
  }, [sortedRepacks, filterTerm, selectedSources]);

  const handleRepackClick = (repack: GameRepack) => {
    setRepack(repack);
    setShowSelectFolderModal(true);
    setViewedRepackIds((prev) => new Set(prev).add(repack.id));
  };

  const handleFilter: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setFilterTerm(event.target.value);
  };

  const toggleSource = (sourceName: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceName)
        ? prev.filter((s) => s !== sourceName)
        : [...prev, sourceName]
    );
  };

  const checkIfLastDownloadedOption = (repack: GameRepack) => {
    if (!game?.download) return false;
    if (!Array.isArray(repack.uris)) return false;
    return repack.uris.some((uri) => uri.includes(game.download!.uri));
  };

  const isNewRepack = (repack: GameRepack): boolean => {
    if (isLoadingTimestamp) return false;

    if (viewedRepackIds.has(repack.id)) return false;

    if (!lastCheckTimestamp || !repack.createdAt) {
      return false;
    }

    try {
      const lastCheckDate = new Date(lastCheckTimestamp);

      if (isNaN(lastCheckDate.getTime())) {
        return false;
      }

      const lastCheckUtc = lastCheckDate.toISOString();

      return repack.createdAt > lastCheckUtc;
    } catch {
      return false;
    }
  };

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const steamOptionTerm = filterTerm.trim().toLowerCase();
  const isNonSteamExecutable = useIsNonSteamExecutable(steamGame);
  const showSteamOption =
    (canDownloadOnSteam(steamGame) ||
      (isSteamImportedGame(steamGame) && isNonSteamExecutable)) &&
    selectedSources.length === 0 &&
    (!steamOptionTerm ||
      "steam".includes(steamOptionTerm) ||
      (game?.title ?? "").toLowerCase().includes(steamOptionTerm));
  const showEpicOption =
    epicAvailable &&
    isEpicMemberInCurrentScope(epicGame, connection) &&
    selectedSources.length === 0 &&
    (!steamOptionTerm ||
      "epic games".includes(steamOptionTerm) ||
      (game?.title ?? "").toLowerCase().includes(steamOptionTerm));

  const handleSteamOptionClick = () => {
    if (!steamGame) return;

    void window.electron.installGameOnSteam(steamGame.objectId);
    onClose();
  };

  useEffect(() => {
    if (!visible) {
      setFilterTerm("");
      setSelectedSources([]);
      setIsFilterDrawerOpen(false);
    }
  }, [visible]);

  return (
    <>
      <DownloadSettingsModal
        visible={showSelectFolderModal}
        onClose={() => setShowSelectFolderModal(false)}
        startDownload={startDownload}
        repack={repack}
      />
      <EpicInstallModal
        game={activeEpicInstallGame}
        presentationGame={activeEpicInstallGame ? (presentation ?? game) : null}
        onClose={() => setEpicInstallGame(null)}
        onStarted={() => {
          setEpicInstallGame(null);
          void Promise.all([updateLibrary(), updateGame()]);
          onClose();
        }}
      />

      <Modal
        visible={visible}
        title={t("download_options_title")}
        description={t("repacks_modal_description")}
        onClose={onClose}
      >
        <div
          className={`repacks-modal__filter-container ${isFilterDrawerOpen ? "repacks-modal__filter-container--drawer-open" : ""}`}
        >
          <div className="repacks-modal__filter-top">
            <TextField
              placeholder={t("filter")}
              value={filterTerm}
              onChange={handleFilter}
            />
            {availableSources.length > 0 && (
              <Button
                type="button"
                theme="outline"
                onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
                className="repacks-modal__filter-toggle"
              >
                {t("filter_by_source")}
                {selectedSources.length > 0 && ` (${selectedSources.length})`}
                {isFilterDrawerOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </Button>
            )}
          </div>

          <div
            className={`repacks-modal__download-sources ${isFilterDrawerOpen ? "repacks-modal__download-sources--open" : ""}`}
          >
            <div className="repacks-modal__source-grid">
              {availableSources.map((sourceName) => {
                const truncatedLabel =
                  sourceName.length > 20
                    ? sourceName.substring(0, 20) + "..."
                    : sourceName;
                return (
                  <div
                    key={sourceName}
                    className="repacks-modal__source-item"
                  >
                    <CheckboxField
                      label={truncatedLabel}
                      checked={selectedSources.includes(sourceName)}
                      onChange={() => toggleSource(sourceName)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="repacks-modal__repacks">
          {showSteamOption && game && (
            <Button
              theme="dark"
              onClick={handleSteamOptionClick}
              className="repacks-modal__repack-button"
            >
              <span
                className="repacks-modal__availability-orb repacks-modal__availability-orb--online"
                data-tooltip-id="availability-orb-steam"
                data-tooltip-content={t("source_online")}
              />
              <Tooltip id="availability-orb-steam" />

              <p className="repacks-modal__repack-title repacks-modal__steam-title">
                <SteamIcon size={16} />
                {game.title}
              </p>

              <p className="repacks-modal__repack-info">
                {t("download_on_steam")}
              </p>
            </Button>
          )}

          {showEpicOption && epicGame && (
            <Button
              theme="dark"
              onClick={() => {
                if (epicGame) epicInstallTiming.beginOptions(epicGame.objectId);
                setEpicInstallGame(epicGame);
              }}
              className="repacks-modal__repack-button"
            >
              <p className="repacks-modal__repack-title repacks-modal__steam-title">
                <EpicLogo width={16} height={16} aria-hidden="true" />
                {game?.title ?? epicGame.title}
              </p>
              <p className="repacks-modal__repack-info">
                {t("download_on_epic")}
              </p>
            </Button>
          )}

          {(showSteamOption || showEpicOption) &&
            filteredRepacks.length > 0 && (
              <div className="repacks-modal__separator" />
            )}

          {filteredRepacks.length === 0
            ? !showSteamOption &&
              !showEpicOption && (
                <div className="repacks-modal__no-results">
                  <div className="repacks-modal__no-results-content">
                    <div className="repacks-modal__no-results-text">
                      {t("no_repacks_found")}
                    </div>
                    <div className="repacks-modal__no-results-button" style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                      <Button
                        type="button"
                        theme="primary"
                        onClick={() => {
                          onClose();
                          navigate("/settings?tab=download_sources");
                        }}
                      >
                        <PlusCircleIcon />
                        {t("add_download_source", { ns: "settings" })}
                      </Button>
                      <Button
                        type="button"
                        theme="outline"
                        onClick={() => window.electron.openExternal("https://library.hydra.wiki/sources/")}
                      >
                        <LinkExternalIcon />
                        Browse Hydra Library
                      </Button>
                    </div>
                  </div>
                </div>
              )
            : filteredRepacks.map((repack) => {
                const isLastDownloadedOption =
                  checkIfLastDownloadedOption(repack);
                const availabilityStatus = getRepackAvailabilityStatus(repack);
                const tooltipId = `availability-orb-${repack.id}`;

                const uris = Array.isArray(repack.uris) ? repack.uris : [];
                const isDirectDownload =
                  uris.some((u) => u.startsWith("http://") || u.startsWith("https://")) &&
                  !uris.some((u) => u.includes(".torrent"));
                const isP2P = uris.some((u) => u.startsWith("magnet:") || u.includes(".torrent"));
                const isHighSpeed = /fitgirl|dodi|steamrip|gog/i.test(
                  repack.downloadSourceName || ""
                );

                return (
                  <Button
                    key={repack.id}
                    theme="dark"
                    onClick={() => handleRepackClick(repack)}
                    className="repacks-modal__repack-button"
                  >
                    <span
                      className={`repacks-modal__availability-orb repacks-modal__availability-orb--${availabilityStatus}`}
                      data-tooltip-id={tooltipId}
                      data-tooltip-content={t(`source_${availabilityStatus}`)}
                    />
                    <Tooltip id={tooltipId} />

                    <p className="repacks-modal__repack-title">
                      {repack.title}
                      {userPreferences?.enableNewDownloadOptionsBadges !==
                        false &&
                        isNewRepack(repack) && (
                          <span className="repacks-modal__new-badge">
                            {t("new_download_option")}
                          </span>
                        )}
                    </p>

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      {isLastDownloadedOption && (
                        <Badge>{t("last_downloaded_option")}</Badge>
                      )}
                      {isHighSpeed && (
                        <Badge>High Speed</Badge>
                      )}
                      {isDirectDownload && (
                        <Badge>Direct Download</Badge>
                      )}
                      {isP2P && (
                        <Badge>P2P Torrent</Badge>
                      )}
                    </div>

                    <p className="repacks-modal__repack-info">
                      {repack.fileSize} - {repack.downloadSourceName} -{" "}
                      {repack.uploadDate ? formatDate(repack.uploadDate) : ""}
                    </p>
                  </Button>
                );
              })}
        </div>
      </Modal>
    </>
  );
}
