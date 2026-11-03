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
    code: `/* ArcadeX Signature Light */
:root {
  --color-background-primary: #ffffff !important;
  --color-background-secondary: #f8fafc !important;
  --color-text-primary: #09090b !important;
  --color-text-secondary: #52525b !important;
  --color-border: #e4e4e7 !important;
}
.container__content { background: #ffffff !important; color: #09090b !important; }
.sidebar { background-color: #f8fafc !important; border-right: 1px solid #e2e8f0 !important; }
.sidebar__item-button { color: #0f172a !important; }
.title-bar { background-color: #ffffff !important; border-bottom: 1px solid #e2e8f0 !important; color: #0f172a !important; }
.title-bar__title, .title-bar__button { color: #0f172a !important; }
.button--primary { background: #000000 !important; border: 1px solid #000000 !important; color: #ffffff !important; font-weight: 600 !important; }
.button--primary:hover { background: #27272a !important; border-color: #27272a !important; color: #ffffff !important; }
.button--outline { background: #ffffff !important; border: 1.5px solid #000000 !important; color: #000000 !important; font-weight: 600 !important; }
.button--outline:hover { background: #f4f4f5 !important; color: #000000 !important; }
.button--dark { background: #f4f4f5 !important; border: 1px solid #e4e4e7 !important; color: #09090b !important; }
.badge { background-color: #000000 !important; color: #ffffff !important; }
.badge--outline { background-color: transparent !important; color: #000000 !important; border: 1px solid #000000 !important; }
.game-item { background-color: #f8fafc !important; border: 1px solid #e2e8f0 !important; }
.game-item__title { color: #09090b !important; }`,
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
