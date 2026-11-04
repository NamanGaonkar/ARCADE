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
    id: "builtin-arcadex-liquid-glass",
    name: "ArcadeX Liquid Glass (iOS Frosted Acrylic and Specular Glass)",
    authorName: "ArcadeX",
    isActive: false,
    code: `/* ArcadeX Liquid Glass - iOS Style Frosted Translucency and Specular Glass */
:root {
  --color-glass-bg: rgba(16, 20, 30, 0.72) !important;
  --color-glass-panel: rgba(255, 255, 255, 0.05) !important;
  --color-glass-border: rgba(255, 255, 255, 0.16) !important;
  --color-glass-highlight: rgba(255, 255, 255, 0.3) !important;
}

body, #root, main, .container {
  background: radial-gradient(circle at 50% 0%, #171d2c 0%, #0c0e14 100%) !important;
  color: #f8fafc !important;
}

.container__content {
  background: transparent !important;
}

.header, .title-bar, .window-title-bar {
  background: rgba(12, 15, 23, 0.75) !important;
  backdrop-filter: blur(28px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(190%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
}

.header__search, .search-bar {
  background: rgba(255, 255, 255, 0.07) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  border-radius: 9999px !important;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.2) !important;
  color: #ffffff !important;
}

.header__search-input, input, select, textarea {
  color: #ffffff !important;
}
.header__search-input::placeholder, input::placeholder {
  color: rgba(255, 255, 255, 0.45) !important;
}

.sidebar {
  background: rgba(10, 13, 20, 0.78) !important;
  backdrop-filter: blur(30px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(30px) saturate(190%) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.sidebar__menu-item-button {
  border-radius: 12px !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.sidebar__menu-item-button:hover, .sidebar__menu-item-button--active {
  background: rgba(255, 255, 255, 0.12) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.25) !important;
  color: #ffffff !important;
}

.button, button.button--primary, button.button--outline, .home-billboard__btn, .library-category-filter__option {
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border-radius: 9999px !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.button--primary, .home-billboard__btn--primary {
  background: rgba(255, 255, 255, 0.22) !important;
  border: 1px solid rgba(255, 255, 255, 0.35) !important;
  box-shadow: inset 0 1px 1.5px rgba(255, 255, 255, 0.5), 0 6px 18px rgba(0, 0, 0, 0.35) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
}

.button--primary:hover, .home-billboard__btn--primary:hover {
  background: rgba(255, 255, 255, 0.32) !important;
  border-color: rgba(255, 255, 255, 0.55) !important;
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.7), 0 8px 24px rgba(255, 255, 255, 0.2) !important;
  transform: translateY(-1px) scale(1.01) !important;
}

.button--outline, .home-billboard__btn--secondary {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 4px 14px rgba(0, 0, 0, 0.25) !important;
  color: #ffffff !important;
}

.button--outline:hover, .home-billboard__btn--secondary:hover {
  background: rgba(255, 255, 255, 0.16) !important;
  border-color: rgba(255, 255, 255, 0.35) !important;
  box-shadow: inset 0 1px 1.5px rgba(255, 255, 255, 0.4), 0 6px 18px rgba(0, 0, 0, 0.3) !important;
}

.game-card, .game-item, .library-game-card, .theme-card, .home-billboard__hero, .home-billboard__sidebar {
  background: rgba(255, 255, 255, 0.04) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.13) !important;
  border-radius: 16px !important;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.18), 0 12px 36px rgba(0, 0, 0, 0.35) !important;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.game-card:hover, .game-item:hover, .library-game-card:hover, .theme-card:hover {
  border-color: rgba(255, 255, 255, 0.28) !important;
  box-shadow: inset 0 1px 1.5px rgba(255, 255, 255, 0.35), 0 16px 42px rgba(0, 0, 0, 0.45) !important;
  transform: translateY(-2px) !important;
}

.modal, .modal__content, .repacks-modal, .download-settings-modal {
  background: rgba(18, 22, 34, 0.85) !important;
  backdrop-filter: blur(40px) saturate(200%) !important;
  -webkit-backdrop-filter: blur(40px) saturate(200%) !important;
  border: 1px solid rgba(255, 255, 255, 0.22) !important;
  border-radius: 20px !important;
  box-shadow: inset 0 1px 1.5px rgba(255, 255, 255, 0.35), 0 24px 64px rgba(0, 0, 0, 0.6) !important;
}

.badge, .game-item__repackers .badge, .home-billboard__pill-badge {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 9999px !important;
  box-shadow: inset 0 1px 0.5px rgba(255, 255, 255, 0.3) !important;
  color: #ffffff !important;
}

h1, h2, h3, h4, h5, h6, strong, b {
  color: #ffffff !important;
  letter-spacing: -0.01em !important;
}

p, span, label {
  color: rgba(255, 255, 255, 0.85) !important;
}

::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
}
::-webkit-scrollbar-track {
  background: transparent !important;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2) !important;
  border-radius: 9999px !important;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.35) !important;
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
    await levelDBService.del("builtin-arcadex-light", "themes").catch(() => {});
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
