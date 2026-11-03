import { StackIcon, DeviceDesktopIcon, HistoryIcon } from "@primer/octicons-react";
import { useTranslation } from "react-i18next";
import "./category-filter.scss";

import type { LibraryCategory } from "./library-category";
export type { LibraryCategory } from "./library-category";

export function ClassicsIcon({
  size = 14,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return <HistoryIcon size={size} className={className} />;
}

interface CategoryFilterProps {
  category: LibraryCategory;
  onCategoryChange: (category: LibraryCategory) => void;
}

export function CategoryFilter({
  category,
  onCategoryChange,
}: Readonly<CategoryFilterProps>) {
  const { t } = useTranslation("library");

  const options: {
    value: LibraryCategory;
    label: string;
    icon: JSX.Element;
  }[] = [
    { value: "all", label: t("category_all"), icon: <StackIcon size={14} /> },
    {
      value: "pc",
      label: t("category_pc"),
      icon: <DeviceDesktopIcon size={14} />,
    },
  ];

  return (
    <div className="library-category-filter__container">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`library-category-filter__option ${category === option.value ? "library-category-filter__option--active" : ""}`}
          onClick={() => onCategoryChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
