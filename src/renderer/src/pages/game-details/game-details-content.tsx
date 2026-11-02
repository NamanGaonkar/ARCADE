import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PencilIcon } from "@primer/octicons-react";
import { useTranslation } from "react-i18next";

import { HeroPanel } from "./hero";
import { DescriptionHeader } from "./description-header/description-header";
import { GallerySlider } from "./gallery-slider/gallery-slider";
import { Sidebar } from "./sidebar/sidebar";
import { GameLogo } from "./game-logo";
import { CloudSaveWidget } from "./cloud-save-v2";
import { getCloudSaveVisibility } from "./cloud-save-visibility";
import { SimilarGames } from "./similar-games/similar-games";

import { AuthPage } from "@shared";
import { cloudSyncContext, gameDetailsContext } from "@renderer/context";

import cloudIconAnimated from "@renderer/assets/icons/cloud-animated.gif";
import tvEffectVideo from "@renderer/assets/emulation/tv-effect.mp4";
import { useUserDetails, useAppSelector } from "@renderer/hooks";
import {
  CLASSICS_PS_PLATFORM_LABELS,
  resolveClassicsBadge,
} from "@renderer/helpers";
import {
  EMULATOR_ICONS,
  RETROARCH_EMULATOR_ICON,
} from "@renderer/pages/settings/emulation/emulator-icons";
import "./game-details.scss";
import "./hero.scss";

const processMediaElements = (document: Document) => {
  const $images = Array.from(document.querySelectorAll("img"));
  $images.forEach(($image) => {
    $image.loading = "lazy";
    $image.removeAttribute("width");
    $image.removeAttribute("height");
    $image.removeAttribute("style");
    $image.style.maxWidth = "100%";
    $image.style.width = "auto";
    $image.style.height = "auto";
    $image.style.boxSizing = "border-box";
  });

  // Handle videos the same way
  const $videos = Array.from(document.querySelectorAll("video"));
  $videos.forEach(($video) => {
    $video.removeAttribute("width");
    $video.removeAttribute("height");
    $video.removeAttribute("style");
    $video.style.maxWidth = "100%";
    $video.style.width = "auto";
    $video.style.height = "auto";
    $video.style.boxSizing = "border-box";
  });
};

const getImageWithCustomPriority = (
  customUrl: string | null | undefined,
  originalUrl: string | null | undefined,
  fallbackUrl?: string | null | undefined
) => {
  return customUrl || originalUrl || fallbackUrl || "";
};

export function GameDetailsContent() {
  const { t } = useTranslation("game_details");

  const {
    objectId,
    shopDetails,
    game,
    presentation,
    catalogueGame,
    hasNSFWContentBlocked,
    shop,
    setShowGameOptionsModal,
    setGameOptionsInitialCategory,
  } = useContext(gameDetailsContext);

  const { userDetails } = useUserDetails();

  const { getGameArtifacts } = useContext(cloudSyncContext);
  const cloudSaveVisibility = game
    ? getCloudSaveVisibility(game.shop, game.platform)
    : null;

  const aboutTheGame = useMemo(() => {
    const aboutTheGame = shopDetails?.about_the_game;
    if (aboutTheGame) {
      const document = new DOMParser().parseFromString(
        aboutTheGame,
        "text/html"
      );

      processMediaElements(document);

      return document.body.outerHTML;
    }

    if (game?.shop === "custom") {
      return "";
    }

    return t("no_shop_details");
  }, [shopDetails, t, game?.shop]);

  const [backdropOpacity, setBackdropOpacity] = useState(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDescriptionOverflowing, setIsDescriptionOverflowing] =
    useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBackdropOpacity(1);
  }, [objectId]);

  useLayoutEffect(() => {
    const el = descriptionRef.current;
    if (!el) {
      setIsDescriptionOverflowing(false);
      return;
    }

    const measure = () => {
      const collapsedMaxHeight = 300;
      setIsDescriptionOverflowing(el.scrollHeight > collapsedMaxHeight);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);

    const images = Array.from(el.querySelectorAll("img"));
    const onMediaLoad = () => measure();
    images.forEach((img) => {
      if (!img.complete) img.addEventListener("load", onMediaLoad);
    });

    return () => {
      observer.disconnect();
      images.forEach((img) => img.removeEventListener("load", onMediaLoad));
    };
  }, [aboutTheGame]);

  const handleLegacyCloudSaveButtonClick = () => {
    if (!userDetails) {
      globalThis.window.electron.openAuthWindow(AuthPage.SignIn);
      return;
    }

    setGameOptionsInitialCategory("hydra_cloud_legacy");
    setShowGameOptionsModal(true);
  };

  const handleEditGameClick = () => {
    setGameOptionsInitialCategory("assets");
    setShowGameOptionsModal(true);
  };

  useEffect(() => {
    getGameArtifacts();
  }, [getGameArtifacts]);

  const userPreferences = useAppSelector(
    (state) => state.userPreferences.value
  );
  const hideClassicsBookmark = userPreferences?.hideClassicsBookmark ?? false;
  const classicsUseHeroLayout = userPreferences?.classicsUseHeroLayout ?? false;

  const isCustomGame = game?.shop === "custom";
  const isLaunchboxGame = shop === "launchbox";
  const renderClassicsHero = isLaunchboxGame && !classicsUseHeroLayout;

  const heroFallback =
    shopDetails?.assets?.libraryHeroImageUrl ||
    game?.libraryHeroImageUrl ||
    (shopDetails as any)?.background_raw ||
    (shopDetails as any)?.background ||
    shopDetails?.screenshots?.[0]?.path_full ||
    (shopDetails?.steam_appid
      ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${shopDetails.steam_appid}/library_hero.jpg`
      : "") ||
    "";

  const heroImage = isCustomGame
    ? game?.libraryHeroImageUrl || game?.iconUrl || ""
    : getImageWithCustomPriority(
        (presentation ?? game)?.customHeroImageUrl,
        heroFallback
      );

  const launchboxCover = isLaunchboxGame
    ? game?.customCoverImageUrl ||
      shopDetails?.assets?.coverImageUrl ||
      shopDetails?.assets?.libraryImageUrl ||
      game?.libraryImageUrl ||
      shopDetails?.assets?.iconUrl ||
      game?.iconUrl ||
      ""
    : "";

  const resolvedHeroImage = isLaunchboxGame
    ? heroImage || launchboxCover
    : heroImage;

  const launchboxPlatform = isLaunchboxGame
    ? (game?.platform ?? shopDetails?.platform ?? null)
    : null;

  const launchboxTitle = isLaunchboxGame
    ? (game?.title ?? shopDetails?.name ?? "")
    : "";

  const classicsBadge = resolveClassicsBadge(
    "launchbox",
    isLaunchboxGame ? launchboxPlatform : null,
    CLASSICS_PS_PLATFORM_LABELS,
    {
      emulatorIcons: EMULATOR_ICONS,
      retroarchIcon: RETROARCH_EMULATOR_ICON,
    }
  );

  const classicsChipLabel = classicsBadge.label ?? launchboxPlatform;

  const classicsChips =
    isLaunchboxGame && classicsChipLabel ? (
      <div className="game-details__hero-classics-chips">
        <span className="game-details__hero-classics-chip">
          {classicsChipLabel}
        </span>
        {classicsBadge.icon && (
          <span className="game-details__hero-classics-chip game-details__hero-classics-chip--icon">
            <img src={classicsBadge.icon} alt="" />
          </span>
        )}
      </div>
    ) : null;

  const [heroImgSrc, setHeroImgSrc] = useState<string | null>(null);

  useEffect(() => {
    setHeroImgSrc(resolvedHeroImage || null);
  }, [resolvedHeroImage]);

  const handleHeroImgError = () => {
    if (game?.title) {
      window.electron
        .getSteamGridDBArtwork(game.title, objectId)
        .then((art) => {
          if (art?.libraryHeroImageUrl || art?.coverImageUrl) {
            setHeroImgSrc(art.libraryHeroImageUrl || art.coverImageUrl);
          }
        })
        .catch(() => {});
    }
  };

  const heroImageContent = heroImgSrc ? (
    <img
      src={heroImgSrc}
      className="game-details__hero-image"
      alt={game?.title}
      onError={handleHeroImgError}
    />
  ) : (
    <div className="game-details__hero-image game-details__hero-image--placeholder" />
  );

  return (
    <div
      className={`game-details__wrapper ${hasNSFWContentBlocked ? "game-details__wrapper--blurred" : ""}`}
    >
      <section className="game-details__container">
        <div
          className={`game-details__hero${renderClassicsHero ? " game-details__hero--classics-wrapper" : ""}`}
        >
          {renderClassicsHero ? (
            <>
              <div className="game-details__hero--classics">
                <div className="game-details__hero-classics-backdrop">
                  {launchboxCover && (
                    <img src={launchboxCover} alt="" aria-hidden="true" />
                  )}
                  <div className="game-details__hero-classics-backdrop-overlay" />
                </div>
              </div>
              <div className="game-details__hero-classics-content">
                <div className="game-details__hero-classics-cover">
                  {launchboxCover && (
                    <img src={launchboxCover} alt={game?.title} />
                  )}
                </div>
                <div className="game-details__hero-classics-meta">
                  <h1 className="game-details__hero-classics-title">
                    {launchboxTitle}
                  </h1>
                  {classicsChips}
                </div>
              </div>
            </>
          ) : (
            heroImageContent
          )}

          {isLaunchboxGame && !hideClassicsBookmark && (
            <div className="game-details__hero-bookmark" aria-hidden="true">
              <div className="game-details__hero-classics-rainbow">
                <span className="game-details__hero-classics-stripe game-details__hero-classics-stripe--shadow game-details__hero-classics-stripe--orange">
                  <span className="game-details__hero-classics-stripe-band game-details__hero-classics-stripe-band--shadow" />
                </span>
                <span className="game-details__hero-classics-stripe game-details__hero-classics-stripe--shadow game-details__hero-classics-stripe--red">
                  <span className="game-details__hero-classics-stripe-band game-details__hero-classics-stripe-band--shadow" />
                </span>
                <span className="game-details__hero-classics-stripe game-details__hero-classics-stripe--shadow game-details__hero-classics-stripe--yellow">
                  <span className="game-details__hero-classics-stripe-band game-details__hero-classics-stripe-band--shadow" />
                </span>
                <span className="game-details__hero-classics-stripe game-details__hero-classics-stripe--shadow game-details__hero-classics-stripe--green">
                  <span className="game-details__hero-classics-stripe-band game-details__hero-classics-stripe-band--shadow" />
                </span>
                <span className="game-details__hero-classics-stripe game-details__hero-classics-stripe--shadow game-details__hero-classics-stripe--blue">
                  <span className="game-details__hero-classics-stripe-band game-details__hero-classics-stripe-band--shadow" />
                </span>

                <span className="game-details__hero-classics-stripe game-details__hero-classics-stripe--red">
                  <span className="game-details__hero-classics-stripe-band game-details__hero-classics-stripe-band--rtl game-details__hero-classics-stripe-band--delay-1">
                    <video
                      src={tvEffectVideo}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  </span>
                </span>
                <span className="game-details__hero-classics-stripe game-details__hero-classics-stripe--orange">
                  <span className="game-details__hero-classics-stripe-band game-details__hero-classics-stripe-band--ltr game-details__hero-classics-stripe-band--delay-2">
                    <video
                      src={tvEffectVideo}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  </span>
                </span>
                <span className="game-details__hero-classics-stripe game-details__hero-classics-stripe--yellow">
                  <span className="game-details__hero-classics-stripe-band game-details__hero-classics-stripe-band--rtl game-details__hero-classics-stripe-band--delay-3">
                    <video
                      src={tvEffectVideo}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  </span>
                </span>
                <span className="game-details__hero-classics-stripe game-details__hero-classics-stripe--green">
                  <span className="game-details__hero-classics-stripe-band game-details__hero-classics-stripe-band--ltr game-details__hero-classics-stripe-band--delay-4">
                    <video
                      src={tvEffectVideo}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  </span>
                </span>
                <span className="game-details__hero-classics-stripe game-details__hero-classics-stripe--blue">
                  <span className="game-details__hero-classics-stripe-band game-details__hero-classics-stripe-band--rtl game-details__hero-classics-stripe-band--delay-5">
                    <video
                      src={tvEffectVideo}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  </span>
                </span>
              </div>
            </div>
          )}

          <div
            className="game-details__hero-logo-backdrop"
            style={{ opacity: backdropOpacity }}
          >
            <div className="game-details__hero-content">
              {!renderClassicsHero && (
                <div className="game-details__hero-standard-meta">
                  <GameLogo
                    game={presentation ?? game}
                    shopDetails={shopDetails}
                  />
                  {classicsChips}
                </div>
              )}

              <div className="game-details__hero-buttons game-details__hero-buttons--right">
                {game && (
                  <button
                    type="button"
                    className="game-details__edit-custom-game-button"
                    onClick={handleEditGameClick}
                    title={t("edit_game_modal_button")}
                  >
                    <PencilIcon size={16} />
                  </button>
                )}

                {game && cloudSaveVisibility?.hero === "legacy" && (
                  <button
                    type="button"
                    className="game-details__cloud-sync-button"
                    onClick={handleLegacyCloudSaveButtonClick}
                  >
                    <div className="game-details__cloud-icon-container">
                      <img
                        src={cloudIconAnimated}
                        alt=""
                        className="game-details__cloud-icon"
                      />
                    </div>
                    {t("cloud_save")}
                  </button>
                )}

                {game && objectId && cloudSaveVisibility?.hero === "v2" && (
                  <CloudSaveWidget />
                )}
              </div>
            </div>

            <div className="game-details__hero-panel">
              <HeroPanel />
            </div>
          </div>
        </div>

        <div className="game-details__description-container">
          <div className="game-details__description-content">
            <DescriptionHeader />

            <GallerySlider />

            {shopDetails?.about_the_game && (
              <h2 className="game-details__description-title">
                {t("about_this_game")}
              </h2>
            )}

            <div
              ref={descriptionRef}
              dangerouslySetInnerHTML={{
                __html: aboutTheGame,
              }}
              className={`game-details__description ${
                isDescriptionExpanded
                  ? "game-details__description--expanded"
                  : isDescriptionOverflowing
                    ? "game-details__description--collapsed"
                    : ""
              }`}
            />

            {aboutTheGame && isDescriptionOverflowing && (
              <button
                type="button"
                className="game-details__description-toggle"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                {isDescriptionExpanded ? t("show_less") : t("show_more")}
              </button>
            )}

            {shop && objectId && (
              <SimilarGames
                objectId={catalogueGame.objectId}
                shop={catalogueGame.shop}
              />
            )}
          </div>

          {shop !== "custom" && <Sidebar />}
        </div>
      </section>
    </div>
  );
}
