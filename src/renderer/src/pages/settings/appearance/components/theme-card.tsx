import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/button/button";
import type { Theme } from "@types";
import "./theme-card.scss";
import { injectCustomCss, removeCustomCss } from "@renderer/helpers";
import { levelDBService } from "@renderer/services/leveldb.service";

interface ThemeCardProps {
  theme: Theme;
  onListUpdated: () => void;
}

export const ThemeCard = ({ theme, onListUpdated }: ThemeCardProps) => {
  const { t } = useTranslation("settings");

  const handleSetTheme = async () => {
    try {
      const currentTheme = (await levelDBService.get(
        theme.id,
        "themes"
      )) as Theme | null;

      if (!currentTheme) return;

      const allThemes = (await levelDBService.values("themes")) as {
        id: string;
        isActive?: boolean;
      }[];
      const activeTheme = allThemes.find((t) => t.isActive);

      if (activeTheme) {
        removeCustomCss();
        await window.electron.toggleCustomTheme(activeTheme.id, false);
      }

      if (currentTheme.code) {
        injectCustomCss(currentTheme.code);
      }

      await window.electron.toggleCustomTheme(currentTheme.id, true);

      onListUpdated();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUnsetTheme = async () => {
    try {
      removeCustomCss();
      await window.electron.toggleCustomTheme(theme.id, false);

      onListUpdated();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div
      className={`theme-card ${theme.isActive ? "theme-card--active" : ""}`}
      key={theme.name}
    >
        <div className="theme-card__header">
          <div className="theme-card__header__title">{theme.name}</div>
        </div>

        {theme.authorName && (
          <p className="theme-card__author">
            {t("by")} <span className="theme-card__author__name">{theme.authorName}</span>
          </p>
        )}

        <div className="theme-card__actions">
          <div className="theme-card__actions__left">
            {theme.isActive ? (
              <Button onClick={handleUnsetTheme} theme="dark">
                {t("unset_theme")}
              </Button>
            ) : (
              <Button onClick={handleSetTheme} theme="outline">
                {t("set_theme")}
              </Button>
            )}
          </div>
        </div>
      </div>
  );
};
