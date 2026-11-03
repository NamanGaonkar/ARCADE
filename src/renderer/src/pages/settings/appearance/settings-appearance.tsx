import { useCallback, useContext, useEffect, useState } from "react";
import "./settings-appearance.scss";
import { ThemeActions, ThemeCard } from "./index";
import type { Theme } from "@types";
import { ImportThemeModal } from "./modals/import-theme-modal";
import { settingsContext } from "@renderer/context";
import { useNavigate } from "react-router-dom";
import { levelDBService } from "@renderer/services/leveldb.service";

interface SettingsAppearanceProps {
  appearance: {
    theme: string | null;
    authorId: string | null;
    authorName: string | null;
  };
}

const BUILT_IN_THEMES: Array<Omit<Theme, "createdAt" | "updatedAt">> = [
  {
    id: "builtin-arcadex-light",
    name: "ArcadeX Signature Light (White & Black Accents)",
    authorName: "ArcadeX",
    isActive: false,
    code: `/* ArcadeX Signature Light - Fully Unified White & Black Accents */
:root {
  --color-background-primary: #ffffff !important;
  --color-background-secondary: #f8fafc !important;
  --color-background-tertiary: #f1f5f9 !important;
  --color-text-primary: #09090b !important;
  --color-text-secondary: #475569 !important;
  --color-text-muted: #64748b !important;
  --color-border: #e2e8f0 !important;
}

/* Base Body & App Container */
body, #root, main, .container, .container__content {
  background-color: #ffffff !important;
  color: #09090b !important;
}

/* Force dark readable text everywhere */
p, span, h1, h2, h3, h4, h5, h6, label, a, strong, b {
  color: #09090b !important;
}

.text-muted, .catalogue__result-count, .catalogue__sort-label, .game-item__genres {
  color: #64748b !important;
}

/* Sidebar */
.sidebar {
  background-color: #f8fafc !important;
  border-right: 1px solid #e2e8f0 !important;
}
.sidebar__menu-item-button {
  color: #0f172a !important;
}
.sidebar__menu-item-button:hover, .sidebar__menu-item-button--active {
  background-color: #e2e8f0 !important;
  color: #000000 !important;
}
.sidebar__collapse-button {
  color: #64748b !important;
}

/* Title Bar */
.title-bar {
  background-color: #ffffff !important;
  border-bottom: 1px solid #e2e8f0 !important;
  color: #0f172a !important;
}
.title-bar__title, .title-bar__button {
  color: #0f172a !important;
}
.title-bar__button:hover {
  background-color: #f1f5f9 !important;
}

/* Text Inputs, Search, Select Fields */
input, select, textarea, .text-field, .text-field__input, .search-bar, .select-field__select {
  background-color: #ffffff !important;
  color: #000000 !important;
  border: 1px solid #cbd5e1 !important;
  box-shadow: none !important;
}
input::placeholder, .text-field__input::placeholder {
  color: #94a3b8 !important;
}
.select-field__select option {
  background-color: #ffffff !important;
  color: #000000 !important;
}

/* Buttons */
.button--primary {
  background: #000000 !important;
  border: 1.5px solid #000000 !important;
  color: #ffffff !important;
  font-weight: 700 !important;
}
.button--primary * {
  color: #ffffff !important;
}
.button--primary:hover {
  background: #27272a !important;
  border-color: #27272a !important;
  color: #ffffff !important;
}
.button--outline {
  background: #ffffff !important;
  border: 1.5px solid #000000 !important;
  color: #000000 !important;
  font-weight: 700 !important;
}
.button--outline * {
  color: #000000 !important;
}
.button--outline:hover {
  background: #f4f4f5 !important;
}
.button--dark {
  background: #f1f5f9 !important;
  border: 1px solid #cbd5e1 !important;
  color: #09090b !important;
}
.button--dark * {
  color: #09090b !important;
}

/* Badges */
.badge {
  background-color: #000000 !important;
  color: #ffffff !important;
  border: none !important;
}
.badge * {
  color: #ffffff !important;
}
.badge--outline {
  background-color: transparent !important;
  border: 1px solid #000000 !important;
  color: #000000 !important;
}
.badge--outline * {
  color: #000000 !important;
}

/* Home Page & Featured Carousel */
.home, .home__content, .home__header, .home-billboard, .home-billboard__banner {
  background-color: #ffffff !important;
  color: #09090b !important;
}
.home__title {
  color: #09090b !important;
}
.featured-carousel, .hero-panel {
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 12px !important;
}
.featured-carousel__side-list {
  background: #f1f5f9 !important;
  border-left: 1px solid #e2e8f0 !important;
}
.featured-carousel__item {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
}
.featured-carousel__item:hover, .featured-carousel__item--active {
  background: #e2e8f0 !important;
  border-color: #000000 !important;
}
.featured-carousel__title, .hero-panel__title, .home-billboard__title {
  color: #09090b !important;
  font-weight: 800 !important;
}
.featured-carousel__description, .hero-panel__description, .home-billboard__description {
  color: #475569 !important;
}
.home__buttons-list button {
  background: #f1f5f9 !important;
  color: #09090b !important;
  border: 1px solid #cbd5e1 !important;
}
.home__buttons-list button:hover, .home__buttons-list button--active {
  background: #000000 !important;
  color: #ffffff !important;
}

/* Trending & Featured Cards */
.trending-games, .trending-games__item, .trending-games__card {
  background-color: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  color: #09090b !important;
}
.trending-games__title {
  color: #09090b !important;
}

/* Library & Category Filter */
.library, .library__content, .library__games-scroll {
  background-color: #ffffff !important;
}
.library-category-filter__container {
  background-color: #f1f5f9 !important;
  border: 1px solid #cbd5e1 !important;
}
.library-category-filter__option {
  color: #475569 !important;
}
.library-category-filter__option--active {
  background-color: #000000 !important;
  color: #ffffff !important;
}
.library-category-filter__option--active * {
  color: #ffffff !important;
}

/* Catalogue & Game Items */
.catalogue, .catalogue__content, .catalogue__filters-container {
  background-color: #ffffff !important;
}
.catalogue__header {
  background-color: #ffffff !important;
  border-bottom: 1px solid #e2e8f0 !important;
}
.catalogue__filters-sections {
  background-color: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
}
.game-item {
  background-color: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}
.game-item:hover {
  border-color: #000000 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}
.game-item__title {
  color: #09090b !important;
  font-weight: 700 !important;
}

/* Theme Cards in Settings */
.theme-card {
  background-color: #ffffff !important;
  border: 1px solid #cbd5e1 !important;
}
.theme-card--active {
  background-color: #f8fafc !important;
  border-color: #000000 !important;
}
.theme-card__header__title, .theme-card__title {
  color: #09090b !important;
  font-weight: 700 !important;
}
.theme-card__author, .theme-card__author__name {
  color: #475569 !important;
}

/* Game Details */
.game-details, .game-details__content {
  background-color: #ffffff !important;
  color: #09090b !important;
}

/* Modals & Dialogs */
.modal, .modal__content, .repacks-modal, .download-settings-modal {
  background-color: #ffffff !important;
  border: 1px solid #cbd5e1 !important;
  color: #09090b !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
}
.modal__title, .modal__description, .repacks-modal__repack-title {
  color: #09090b !important;
}
.repacks-modal__repack-button {
  background-color: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  color: #09090b !important;
}
.repacks-modal__repack-button:hover {
  border-color: #000000 !important;
  background-color: #f1f5f9 !important;
}
.repacks-modal__download-sources {
  background-color: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
}

/* Settings */
.settings__container, .settings__content, .settings__sidebar {
  background-color: #ffffff !important;
}
.settings__sidebar {
  background-color: #f8fafc !important;
  border-right: 1px solid #e2e8f0 !important;
}
.settings__sidebar-item, .settings__sidebar-item--active {
  color: #09090b !important;
}
.settings__sidebar-item--active {
  background-color: #e2e8f0 !important;
  font-weight: 700 !important;
}

/* Scrollbars */
::-webkit-scrollbar {
  background-color: #f8fafc !important;
}
::-webkit-scrollbar-thumb {
  background-color: #cbd5e1 !important;
}
::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8 !important;
}`,
  },
  {
    id: "builtin-arcadex-oled",
    name: "Arcade Midnight OLED",
    authorName: "ArcadeX",
    isActive: false,
    code: `/* Arcade Midnight OLED */
.container__content { background: #000000 !important; }
.sidebar { background-color: #050507 !important; border-right: 1px solid rgba(255, 255, 255, 0.08) !important; }
.title-bar { background-color: #050507 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important; }
.button--primary { background: #18181b !important; border: 1px solid rgba(255, 255, 255, 0.25) !important; color: #ffffff !important; }`,
  },
  {
    id: "builtin-cyber-charcoal",
    name: "Cyber Charcoal",
    authorName: "ArcadeX",
    isActive: false,
    code: `/* Cyber Charcoal */
.container__content { background: linear-gradient(180deg, #131418 0%, #0d0e12 100%) !important; }
.sidebar { background-color: #0a0b0e !important; border-right: 1px solid rgba(255, 255, 255, 0.07) !important; }
.title-bar { background-color: #0a0b0e !important; }
.button--primary { background: #27272a !important; border-color: #3f3f46 !important; color: #fff !important; }`,
  },
  {
    id: "builtin-obsidian-cyan",
    name: "Obsidian Cyan",
    authorName: "ArcadeX",
    isActive: false,
    code: `/* Obsidian Cyan */
.container__content { background: linear-gradient(180deg, #080d14 0%, #04070a 100%) !important; }
.sidebar { background-color: #05080d !important; border-right: 1px solid rgba(14, 165, 233, 0.2) !important; }
.title-bar { background-color: #05080d !important; border-bottom: 1px solid rgba(14, 165, 233, 0.15) !important; }
.button--primary { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important; border-color: #38bdf8 !important; color: #ffffff !important; }`,
  },
  {
    id: "builtin-crimson-shadow",
    name: "Crimson Shadow",
    authorName: "ArcadeX",
    isActive: false,
    code: `/* Crimson Shadow */
.container__content { background: linear-gradient(180deg, #12090b 0%, #090405 100%) !important; }
.sidebar { background-color: #0a0406 !important; border-right: 1px solid rgba(225, 29, 72, 0.2) !important; }
.title-bar { background-color: #0a0406 !important; border-bottom: 1px solid rgba(225, 29, 72, 0.15) !important; }
.button--primary { background: linear-gradient(135deg, #be123c 0%, #9f1239 100%) !important; border-color: #f43f5e !important; color: #ffffff !important; }`,
  },
  {
    id: "builtin-titanium-silver",
    name: "Titanium Silver",
    authorName: "ArcadeX",
    isActive: false,
    code: `/* Titanium Silver */
.container__content { background: linear-gradient(180deg, #18191c 0%, #0f1012 100%) !important; }
.sidebar { background-color: #111214 !important; border-right: 1px solid rgba(255, 255, 255, 0.1) !important; }
.title-bar { background-color: #111214 !important; }
.button--primary { background: #33363d !important; border-color: #525660 !important; color: #ffffff !important; }`,
  },
];

export function SettingsAppearance({
  appearance,
}: Readonly<SettingsAppearanceProps>) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isImportThemeModalVisible, setIsImportThemeModalVisible] =
    useState(false);
  const [importTheme, setImportTheme] = useState<{
    theme: string;
    authorId: string;
    authorName: string;
  } | null>(null);
  const [hasShownModal, setHasShownModal] = useState(false);

  const { clearTheme } = useContext(settingsContext);
  const navigate = useNavigate();

  const loadThemes = useCallback(async () => {
    let themesList = (await levelDBService.values("themes")) as Theme[];

    for (const preset of BUILT_IN_THEMES) {
      const existing = themesList?.find((t) => t.id === preset.id);
      if (!existing || existing.name !== preset.name) {
        const fullTheme: Theme = {
          ...preset,
          createdAt: existing?.createdAt ?? new Date(),
          updatedAt: new Date(),
        };
        await levelDBService.put(preset.id, fullTheme, "themes");
      }
    }
    themesList = (await levelDBService.values("themes")) as Theme[];
    setThemes(themesList);
  }, []);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  useEffect(() => {
    const unsubscribe = window.electron.onCustomThemeUpdated(() => {
      loadThemes();
    });

    return () => unsubscribe();
  }, [loadThemes]);

  useEffect(() => {
    if (
      appearance.theme &&
      appearance.authorId &&
      appearance.authorName &&
      !hasShownModal
    ) {
      setIsImportThemeModalVisible(true);
      setImportTheme({
        theme: appearance.theme,
        authorId: appearance.authorId,
        authorName: appearance.authorName,
      });
      setHasShownModal(true);

      navigate("/settings", { replace: true });
      clearTheme();
    }
  }, [
    appearance.theme,
    appearance.authorId,
    appearance.authorName,
    navigate,
    hasShownModal,
    clearTheme,
  ]);

  const onThemeImported = useCallback(() => {
    setIsImportThemeModalVisible(false);
    setImportTheme(null);
    loadThemes();
  }, [loadThemes]);

  return (
    <div className="settings-appearance">
      <ImportThemeModal
        visible={isImportThemeModalVisible}
        onClose={() => setIsImportThemeModalVisible(false)}
        onThemeImported={onThemeImported}
        themeName={importTheme?.theme || ""}
        authorId={importTheme?.authorId || ""}
        authorName={importTheme?.authorName || ""}
      />

      <ThemeActions onListUpdated={loadThemes} themesCount={themes.length} />

      <div className="settings-appearance__themes">
        {[...themes]
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          .map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              onListUpdated={loadThemes}
            />
          ))}
      </div>
    </div>
  );
}
