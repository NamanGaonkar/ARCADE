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

/* Header & Window Title Bar */
.header {
  background-color: #ffffff !important;
  border-bottom: 1px solid #e2e8f0 !important;
  color: #09090b !important;
}
.header__search {
  background-color: #f1f5f9 !important;
  border: 1px solid #cbd5e1 !important;
}
.header__search-input {
  color: #09090b !important;
}
.header__search-input::placeholder {
  color: #94a3b8 !important;
}
.header__action-button {
  color: #09090b !important;
  border-color: #cbd5e1 !important;
}
.header__action-button:hover {
  color: #000000 !important;
  border-color: #94a3b8 !important;
}
.window-title-bar {
  background-color: #ffffff !important;
  border-bottom: 1px solid #e2e8f0 !important;
}
.window-title-bar__title, .window-title-bar__control {
  color: #09090b !important;
}
.window-title-bar__control:hover {
  background-color: #f1f5f9 !important;
}
.window-title-bar__control--close:hover {
  background-color: #ef4444 !important;
  color: #ffffff !important;
}

/* General Dark Readable Text */
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

/* Tooltips */
div[role="tooltip"], .tooltip {
  background-color: #000000 !important;
  color: #ffffff !important;
  border-radius: 6px !important;
}
div[role="tooltip"] *, .tooltip * {
  color: #ffffff !important;
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

/* Home Page & Billboard */
.home, .home__content, .home__header {
  background-color: #ffffff !important;
  color: #09090b !important;
}
.home__title {
  color: #09090b !important;
}
.home__buttons-list button {
  background: #ffffff !important;
  color: #09090b !important;
  border: 1px solid #cbd5e1 !important;
}
.home__buttons-list button:hover, .home__buttons-list button--active {
  background: #000000 !important;
  color: #ffffff !important;
  border-color: #000000 !important;
}

/* Hero panel inside billboard MUST keep white text over artwork overlay */
.home-billboard__hero {
  border: 1px solid #cbd5e1 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
}
.home-billboard__hero .home-billboard__title,
.home-billboard__title {
  color: #ffffff !important;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9) !important;
}
.home-billboard__hero .home-billboard__description,
.home-billboard__description {
  color: #e2e8f0 !important;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8) !important;
}
.home-billboard__pill-badge {
  background: rgba(255, 255, 255, 0.22) !important;
  border-color: rgba(255, 255, 255, 0.45) !important;
  color: #ffffff !important;
}
.home-billboard__pill-badge * {
  color: #ffffff !important;
}
.home-billboard__btn--primary {
  background: #ffffff !important;
  color: #000000 !important;
  border: 1.5px solid #ffffff !important;
}
.home-billboard__btn--primary * {
  color: #000000 !important;
}
.home-billboard__btn--secondary {
  background: rgba(255, 255, 255, 0.18) !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
}
.home-billboard__btn--secondary * {
  color: #ffffff !important;
}

/* Billboard right sidebar */
.home-billboard__item {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
}
.home-billboard__item:hover, .home-billboard__item--active {
  background: #f1f5f9 !important;
  border-color: #000000 !important;
}
.home-billboard__item-tag {
  color: #64748b !important;
}
.home-billboard__item-title {
  color: #09090b !important;
}
.home-billboard__discover-btn {
  background: #ffffff !important;
  border: 1.5px solid #000000 !important;
  color: #000000 !important;
}
.home-billboard__discover-btn:hover {
  background: #000000 !important;
  color: #ffffff !important;
}

/* Game Cards (Home Grid) - Keep white text over cover artwork gradient */
.game-card {
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}
.game-card:hover {
  border-color: #000000 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
}
.game-card__title, .game-card__title-container, .game-card__content {
  color: #ffffff !important;
}
.game-card__title {
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9) !important;
}
.game-card__no-download-label {
  color: #e2e8f0 !important;
}
.game-card__shop-icon {
  color: #ffffff !important;
}
.game-card__download-options li {
  background: rgba(0, 0, 0, 0.75) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: #ffffff !important;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
}
.game-item:hover {
  border-color: #000000 !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1) !important;
}
.game-item__details {
  background: #ffffff !important;
}
.game-item__title {
  color: #09090b !important;
  font-weight: 700 !important;
}

/* Settings & Theme Cards */
.settings, .settings__content, .settings__panel {
  background-color: #ffffff !important;
  color: #09090b !important;
}
.settings__sidebar {
  background-color: #f8fafc !important;
  border-right: 1px solid #e2e8f0 !important;
}
.settings__sidebar-button {
  color: #0f172a !important;
}
.settings__sidebar-button:hover, .settings__sidebar-button--active {
  background-color: #e2e8f0 !important;
  color: #000000 !important;
}
.theme-card {
  background-color: #ffffff !important;
  border: 1.5px solid #cbd5e1 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
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
