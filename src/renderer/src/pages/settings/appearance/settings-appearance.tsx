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
    id: "builtin-arcadex-dark",
    name: "ArcadeX Dark",
    authorName: "ArcadeX",
    isActive: false,
    code: `/* ArcadeX Dark */
.container__content { background: linear-gradient(0deg, #0d0f12 50%, #15181e 100%) !important; }
.sidebar { background-color: #0b0c0e !important; }
.title-bar { background-color: #0b0c0e !important; }
.button--primary { background-color: #16b195 !important; border-color: #16b195 !important; }`,
  },
  {
    id: "builtin-cyberpunk",
    name: "Cyberpunk Neon",
    authorName: "ArcadeX",
    isActive: false,
    code: `/* Cyberpunk Neon */
.container__content { background: linear-gradient(180deg, #150928 0%, #080314 100%) !important; }
.sidebar { background-color: #0d041a !important; border-right: 1px solid rgba(255, 0, 128, 0.25) !important; }
.title-bar { background-color: #0d041a !important; border-bottom: 1px solid rgba(0, 240, 255, 0.25) !important; }
.button--primary { background: linear-gradient(90deg, #ff007f, #7928ca) !important; border-color: #ff007f !important; color: #fff !important; }`,
  },
  {
    id: "builtin-midnight-blue",
    name: "Midnight Blue",
    authorName: "ArcadeX",
    isActive: false,
    code: `/* Midnight Blue */
.container__content { background: linear-gradient(180deg, #0f1c3f 0%, #060b19 100%) !important; }
.sidebar { background-color: #080f24 !important; border-right: 1px solid rgba(66, 153, 225, 0.25) !important; }
.title-bar { background-color: #080f24 !important; }
.button--primary { background: linear-gradient(90deg, #1a56db, #0ea5e9) !important; border-color: #3b82f6 !important; }`,
  },
  {
    id: "builtin-emerald-matrix",
    name: "Emerald Matrix",
    authorName: "ArcadeX",
    isActive: false,
    code: `/* Emerald Matrix */
.container__content { background: linear-gradient(180deg, #0a1f14 0%, #040d08 100%) !important; }
.sidebar { background-color: #05120a !important; border-right: 1px solid rgba(16, 185, 129, 0.25) !important; }
.title-bar { background-color: #05120a !important; }
.button--primary { background: linear-gradient(90deg, #059669, #10b981) !important; border-color: #10b981 !important; color: #fff !important; }`,
  },
  {
    id: "builtin-retro-gold",
    name: "Retro Gold",
    authorName: "ArcadeX",
    isActive: false,
    code: `/* Retro Gold */
.container__content { background: linear-gradient(180deg, #1f1a10 0%, #0d0b07 100%) !important; }
.sidebar { background-color: #14110b !important; border-right: 1px solid rgba(245, 158, 11, 0.25) !important; }
.title-bar { background-color: #14110b !important; }
.button--primary { background: linear-gradient(90deg, #d97706, #f59e0b) !important; border-color: #f59e0b !important; color: #000 !important; font-weight: 600 !important; }`,
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

    if (!themesList || themesList.length === 0) {
      // Seed default themes
      for (const preset of BUILT_IN_THEMES) {
        const fullTheme: Theme = {
          ...preset,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await levelDBService.set(preset.id, fullTheme, "themes");
      }
      themesList = (await levelDBService.values("themes")) as Theme[];
    }

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
        theme={importTheme?.theme || ""}
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
