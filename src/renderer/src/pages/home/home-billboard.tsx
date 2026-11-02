import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PlayIcon, PlusIcon, ChevronRightIcon, FlameIcon } from "@primer/octicons-react";
import type { ShopAssets } from "@types";
import { buildGameDetailsPath } from "@renderer/helpers";
import Skeleton from "react-loading-skeleton";
import "./home-billboard.scss";

interface HomeBillboardProps {
  games: ShopAssets[];
  isLoading: boolean;
}

export function HomeBillboard({ games, isLoading }: Readonly<HomeBillboardProps>) {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [games]);

  if (isLoading || !games || games.length === 0) {
    return (
      <div className="home-billboard home-billboard--skeleton">
        <Skeleton height={360} borderRadius={16} />
      </div>
    );
  }

  const trendingList = games.slice(0, 5);
  const activeGame = trendingList[selectedIndex] || games[0];

  const heroImage =
    activeGame.libraryHeroImageUrl ||
    activeGame.coverImageUrl ||
    activeGame.libraryImageUrl ||
    activeGame.iconUrl;

  const tags = ["Most Played", "Trending", "Hot", "Popular", "Featured"];

  const handleCardClick = (game: ShopAssets) => {
    navigate(buildGameDetailsPath(game));
  };

  return (
    <div className="home-billboard">
      {/* Left Column: Billboard Hero */}
      <div className="home-billboard__hero">
        <div className="home-billboard__media-container">
          {heroImage ? (
            <img
              src={heroImage}
              alt={activeGame.title}
              className="home-billboard__media"
            />
          ) : (
            <div className="home-billboard__media-placeholder" />
          )}
          <div className="home-billboard__overlay" />
        </div>

        <div className="home-billboard__hero-content">
          <div className="home-billboard__pill-badge">
            <FlameIcon size={13} />
            <span>{tags[selectedIndex] || "Featured"}</span>
          </div>

          <h1 className="home-billboard__title" title={activeGame.title}>
            {activeGame.title}
          </h1>

          <p className="home-billboard__description">
            Available on ArcadeX with complete launcher integration, high-speed repacks, and cloud save support.
          </p>

          <div className="home-billboard__actions">
            <button
              type="button"
              className="home-billboard__btn home-billboard__btn--primary"
              onClick={() => handleCardClick(activeGame)}
            >
              <PlayIcon size={16} />
              <span>View Game</span>
            </button>

            <button
              type="button"
              className="home-billboard__btn home-billboard__btn--secondary"
              onClick={() => handleCardClick(activeGame)}
            >
              <PlusIcon size={16} />
              <span>Add to Library</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Trending List */}
      <div className="home-billboard__sidebar">
        <div className="home-billboard__list">
          {trendingList.map((game, index) => {
            const isSelected = index === selectedIndex;
            const thumbImage = game.iconUrl || game.coverImageUrl || game.libraryImageUrl;
            const tag = tags[index] || "Popular";

            return (
              <button
                key={game.objectId}
                type="button"
                className={`home-billboard__item ${isSelected ? "home-billboard__item--active" : ""}`}
                onClick={() => setSelectedIndex(index)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="home-billboard__item-thumb">
                  {thumbImage ? (
                    <img src={thumbImage} alt={game.title} />
                  ) : (
                    <div className="home-billboard__item-thumb-placeholder" />
                  )}
                </div>

                <div className="home-billboard__item-info">
                  <span className="home-billboard__item-tag">{tag}</span>
                  <span className="home-billboard__item-title" title={game.title}>
                    {game.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="home-billboard__discover-btn"
          onClick={() => navigate("/catalogue")}
        >
          <span>Discover More</span>
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </div>
  );
}
