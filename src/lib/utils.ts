import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import i18n from "@/i18n";
import type { Category } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLocalizedCategoryName(category: Category | { name: string; translations?: Record<string, { name: string }> }, locale?: string): string {
  const currentLocale = locale || i18n.language || 'en';
  
  if (category.translations && category.translations[currentLocale]) {
    const translatedName = category.translations[currentLocale].name;
    if (translatedName && translatedName.trim() !== '') {
      return translatedName;
    }
  }
  
  return category.name;
}
