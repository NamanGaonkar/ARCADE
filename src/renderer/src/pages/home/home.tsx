import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { levelDBService } from "@renderer/services/leveldb.service";
import { orderBy } from "lodash-es";
import { useNavigate } from "react-router-dom";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { Button, GameCard } from "@renderer/components";
import type { DownloadSource, ShopAssets, Steam250Game } from "@types";
import { SparkleIcon } from "@primer/octicons-react";
import { buildGameDetailsPath, ensureArray } from "@renderer/helpers";
import { CatalogueCategory } from "@shared";
import { HomeBillboard } from "./home-billboard";
import "./home.scss";

export default function Home() {
  const { t } = useTranslation("home");
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [randomGame, setRandomGame] = useState<Steam250Game | null>(null);

  const [currentCatalogueCategory, setCurrentCatalogueCategory] = useState(
    CatalogueCategory.Hot
  );

  const [catalogue, setCatalogue] = useState<
    Record<CatalogueCategory, ShopAssets[]>
  >({
    [CatalogueCategory.Hot]: [],
    [CatalogueCategory.Weekly]: [],
    [CatalogueCategory.Achievements]: [],
  });

  const getCatalogue = useCallback(async (category: CatalogueCategory) => {
    try {
      setCurrentCatalogueCategory(category);
      setIsLoading(true);

      const sources = (await levelDBService.values(
        "downloadSources"
      )) as DownloadSource[];
      const downloadSources = orderBy(sources, "createdAt", "desc");

      const params = {
        take: 12,
        skip: 0,
        downloadSourceIds: downloadSources.map((source) => source.id),
      };

      const catalogue = await window.electron.hydraApi
        .get<ShopAssets[]>(`/catalogue/${category}`, {
          params,
          needsAuth: false,
        })
        .catch(() => []);

      setCatalogue((prev) => ({
        ...prev,
        [category]: ensureArray<ShopAssets>(
          catalogue,
          `/catalogue/${category}`
        ),
      }));
    } catch {
      setCatalogue((prev) => ({
        ...prev,
        [category]: [],
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRandomGame = useCallback(() => {
    window.electron.getRandomGame().then((game) => {
      if (game) setRandomGame(game);
    });
  }, []);

  const handleRandomizerClick = () => {
    if (randomGame) {
      navigate(
        buildGameDetailsPath(
          { ...randomGame, shop: "steam" },
          {
            fromRandomizer: "1",
          }
        )
      );
    }
  };

  const handleCategoryClick = (category: CatalogueCategory) => {
    if (category !== currentCatalogueCategory) {
      getCatalogue(category);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    getCatalogue(CatalogueCategory.Hot);
    getRandomGame();
  }, [getCatalogue, getRandomGame]);

  const categories = Object.values(CatalogueCategory);

  return (
    <SkeletonTheme baseColor="#1c1c1c" highlightColor="#444">
      <section className="home__content">
        <HomeBillboard
          games={catalogue[CatalogueCategory.Hot]}
          isLoading={isLoading && !catalogue[CatalogueCategory.Hot].length}
        />

        <section className="home__header">
          <ul className="home__buttons-list">
            {categories.map((category) => (
              <li key={category}>
                <Button
                  theme={
                    category === currentCatalogueCategory
                      ? "primary"
                      : "outline"
                  }
                  onClick={() => handleCategoryClick(category)}
                >
                  {t(category)}
                </Button>
              </li>
            ))}
          </ul>

          <Button
            onClick={handleRandomizerClick}
            theme="outline"
            disabled={!randomGame}
          >
            <span style={{ display: "inline-flex", marginRight: 6 }}>
              <SparkleIcon size={14} />
            </span>
            {t("surprise_me")}
          </Button>
        </section>

        <h2 className="home__title">
          {t(currentCatalogueCategory)}
        </h2>

        <section className="home__cards">
          {isLoading
            ? Array.from({ length: 12 }).map((_, index) => (
                <Skeleton key={index} className="home__card-skeleton" />
              ))
            : catalogue[currentCatalogueCategory].map((result) => (
                <GameCard
                  key={result.objectId}
                  game={result}
                  onClick={() => navigate(buildGameDetailsPath(result))}
                />
              ))}
        </section>
      </section>
    </SkeletonTheme>
  );
}
