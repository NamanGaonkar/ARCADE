import { Badge } from "@renderer/components/badge/badge";
import { buildGameDetailsPath } from "@renderer/helpers";
import { useAppSelector, useLibrary } from "@renderer/hooks";
import { lazy, Suspense, useMemo, useState, useEffect } from "react";
import { Link } from "@renderer/components/link/link";

import "./game-item.scss";
import { useTranslation } from "react-i18next";
import { CatalogueSearchResult } from "@types";
import { QuestionIcon, PlusIcon, CheckIcon } from "@primer/octicons-react";
import cn from "classnames";

const ProtonDBBadge = lazy(async () => {
  const mod = await import("./protondb-badge");
  return { default: mod.ProtonDBBadge };
});

export interface GameItemProps {
  game: CatalogueSearchResult;
}

export function GameItem({ game }: GameItemProps) {
  const { i18n, t } = useTranslation("game_details");

  const language = i18n.language.split("-")[0];

  const { steamGenres } = useAppSelector((state) => state.catalogueSearch);

  const [isAddingToLibrary, setIsAddingToLibrary] = useState(false);
  const [added, setAdded] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(game.libraryImageUrl || null);

  const { library, updateLibrary } = useLibrary();
  const shouldShowProtonFeatures = window.electron.platform === "linux";

  useEffect(() => {
    setCoverUrl(game.libraryImageUrl || null);
  }, [game.libraryImageUrl]);

  useEffect(() => {
    const exists = library.some(
      (libItem) =>
        libItem.shop === game.shop && libItem.objectId === game.objectId
    );
    setAdded(exists);
  }, [library, game.shop, game.objectId]);

  const addGameToLibrary = async () => {
    if (added || isAddingToLibrary) return;

    setIsAddingToLibrary(true);

    try {
      await window.electron.addGameToLibrary(
        game.shop,
        game.objectId,
        game.title,
        game.platform ?? null
      );
      updateLibrary();
    } catch (error) {
      console.error(error);
    } finally {
      setIsAddingToLibrary(false);
    }
  };

  const handleImageError = () => {
    if (game.title) {
      window.electron
        .getSteamGridDBArtwork(game.title, game.objectId)
        .then((art) => {
          if (art?.libraryImageUrl || art?.coverImageUrl || art?.iconUrl) {
            setCoverUrl(art.libraryImageUrl || art.coverImageUrl || art.iconUrl);
          }
        })
        .catch(() => {});
    }
  };

  const genres = useMemo(() => {
    return game.genres?.map((genre) => {
      const index = steamGenres["en"]?.findIndex(
        (steamGenre) => steamGenre === genre
      );

      if (
        index !== undefined &&
        steamGenres[language] &&
        steamGenres[language][index]
      ) {
        return steamGenres[language][index];
      }

      return genre;
    });
  }, [game.genres, language, steamGenres]);

  const rawProtonValue =
    game.tier ??
    game.bestReportedTier ??
    game.protondbSupportBadge ??
    game.protondbSupportBadges?.[0] ??
    null;
  const protonBadgeValue = rawProtonValue?.toLowerCase().trim() ?? null;
  const protonBadge =
    protonBadgeValue &&
    ["borked", "bronze", "silver", "gold", "platinum"].includes(
      protonBadgeValue
    )
      ? protonBadgeValue
      : null;

  return (
    <article className="game-item">
      <Link to={buildGameDetailsPath(game)} className="game-item__content-link">
        <div className="game-item__cover-wrapper">
          {coverUrl ? (
            <img
              className="game-item__cover"
              src={coverUrl}
              alt=""
              loading="lazy"
              onError={handleImageError}
            />
          ) : (
            <div className="game-item__cover-placeholder">
              <QuestionIcon size={24} />
            </div>
          )}

          {shouldShowProtonFeatures && protonBadge && (
            <Suspense fallback={null}>
              <ProtonDBBadge badge={protonBadge} />
            </Suspense>
          )}
        </div>

        <div className="game-item__details">
          <span className="game-item__title" title={game.title}>{game.title}</span>
          {genres && genres.length > 0 ? (
            <span className="game-item__genres">{genres.join(", ")}</span>
          ) : (
            <span className="game-item__genres game-item__genres--empty">
              {t("no_genres", { ns: "catalogue" })}
            </span>
          )}

          <div className="game-item__repackers">
            {game.downloadSources && game.downloadSources.length > 0 ? (
              game.downloadSources.slice(0, 3).map((sourceName) => (
                <Badge key={sourceName}>{sourceName}</Badge>
              ))
            ) : (
              <span className="game-item__no-downloads">No downloads available</span>
            )}
          </div>
        </div>
      </Link>
      <button
        type="button"
        className={cn("game-item__plus-wrapper", {
          "game-item__plus-wrapper--added": added,
        })}
        onClick={addGameToLibrary}
        title={added ? t("already_in_library") : t("add_to_library")}
        aria-label={added ? t("already_in_library") : t("add_to_library")}
        disabled={added || isAddingToLibrary}
      >
        {added ? <CheckIcon size={16} /> : <PlusIcon size={16} />}
      </button>
    </article>
  );
}
