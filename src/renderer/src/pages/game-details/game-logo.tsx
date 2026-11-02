import { useEffect, useState } from "react";
import type { Game, ShopDetailsWithAssets } from "@types";

interface GameLogoProps {
  game: Game | null;
  shopDetails: ShopDetailsWithAssets | null;
}

const getImageWithCustomPriority = (
  customUrl: string | null | undefined,
  originalUrl: string | null | undefined,
  fallbackUrl?: string | null | undefined
) => {
  return customUrl || originalUrl || fallbackUrl || "";
};

export function GameLogo({ game, shopDetails }: Readonly<GameLogoProps>) {
  const isCustomGame = game?.shop === "custom";

  const logoFallback =
    shopDetails?.assets?.logoImageUrl ||
    game?.logoImageUrl ||
    (shopDetails?.steam_appid
      ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${shopDetails.steam_appid}/logo.png`
      : "") ||
    "";

  const logoImage = isCustomGame
    ? game?.logoImageUrl || ""
    : getImageWithCustomPriority(
        game?.customLogoImageUrl,
        logoFallback
      );

  const title = game?.title || shopDetails?.name || "";
  const [currentLogo, setCurrentLogo] = useState<string | null>(logoImage || null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setCurrentLogo(logoImage || null);
    setHasFailed(false);
  }, [logoImage]);

  const handleLogoError = () => {
    if (title && !hasFailed) {
      window.electron
        .getSteamGridDBArtwork(title, shopDetails?.steam_appid || game?.objectId)
        .then((art) => {
          if (art?.logoImageUrl) {
            setCurrentLogo(art.logoImageUrl);
          } else {
            setHasFailed(true);
          }
        })
        .catch(() => setHasFailed(true));
    } else {
      setHasFailed(true);
    }
  };

  if (currentLogo && !hasFailed) {
    return (
      <img
        src={currentLogo}
        className="game-details__game-logo"
        alt={title}
        onError={handleLogoError}
      />
    );
  }

  return <div className="game-details__game-logo-text">{title}</div>;
}
