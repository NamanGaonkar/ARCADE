import type { GameStats, ShopAssets } from "@types";

import EpicLogo from "@renderer/assets/epic-integration-logo.svg?react";
import SteamLogo from "@renderer/assets/steam-logo.svg?react";

import "./game-card.scss";

import { useCallback, useState } from "react";

export interface GameCardProps
  extends React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > {
  game: ShopAssets;
}

const shopIcon = {
  steam: <SteamLogo className="game-card__shop-icon" />,
  epic: <EpicLogo className="game-card__shop-icon" />,
};

export function GameCard({ game, ...props }: GameCardProps) {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [currentCover, setCurrentCover] = useState<string | null>(
    game.coverImageUrl || game.libraryHeroImageUrl || game.libraryImageUrl || game.iconUrl || null
  );

  const handleHover = useCallback(() => {
    if (!stats) {
      window.electron.getGameStats(game.objectId, game.shop).then((stats) => {
        setStats(stats);
      });
    }
  }, [game, stats]);

  const handleImageError = () => {
    if (currentCover !== game.coverImageUrl && game.coverImageUrl) {
      setCurrentCover(game.coverImageUrl);
    } else if (game.title) {
      window.electron
        .getSteamGridDBArtwork(game.title, game.objectId)
        .then((art) => {
          if (art?.coverImageUrl || art?.libraryHeroImageUrl || art?.libraryImageUrl) {
            setCurrentCover(art.coverImageUrl || art.libraryHeroImageUrl || art.libraryImageUrl);
          }
        })
        .catch(() => {});
    }
  };

  return (
    <button
      {...props}
      type="button"
      className="game-card"
      onMouseEnter={handleHover}
    >
      <div className="game-card__backdrop">
        {currentCover ? (
          <img
            src={currentCover}
            alt=""
            className="game-card__cover"
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="game-card__cover game-card__cover--fallback" />
        )}

        <div className="game-card__content">
          <div className="game-card__title-container">
            {shopIcon[game.shop]}
            <p className="game-card__title">{game.title}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
