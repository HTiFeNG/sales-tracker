import { useCallback, useEffect, useState } from 'react';
import { type FavoriteProduct, generateId } from '../types';

/** localStorage key for persisting favorite products. */
const STORAGE_KEY = 'sales-tracker-favorites';

/**
 * Safely loads the favorites list from localStorage.
 * Returns an empty array if no data is found or if parsing fails.
 * @returns The parsed FavoriteProduct[], or an empty array.
 */
function loadFromStorage(): FavoriteProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as FavoriteProduct[];
    }
    return [];
  } catch (error) {
    console.error('Failed to load favorites from localStorage:', error);
    return [];
  }
}

/**
 * Safely saves the favorites list to localStorage.
 * @param favorites - The list to persist.
 */
function saveToStorage(favorites: FavoriteProduct[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save favorites to localStorage:', error);
  }
}

/**
 * Return type of the useFavoriteProducts hook.
 */
interface UseFavoriteProductsReturn {
  /** The current list of favorite products. */
  favorites: FavoriteProduct[];
  /** Adds a new favorite (or updates default price if name already exists). */
  addFavorite: (name: string, defaultUnitPrice: number) => void;
  /** Removes a favorite by its ID. */
  removeFavorite: (id: string) => void;
  /** Finds a favorite by product name (case-sensitive). */
  findFavoriteByName: (name: string) => FavoriteProduct | undefined;
  /** Checks whether a name is already in the favorites list. */
  isFavorite: (name: string) => boolean;
}

/**
 * Custom hook for managing favorite (frequently-used) products
 * with localStorage persistence.
 *
 * Favorites are stored under key "sales-tracker-favorites" and
 * survive page refreshes.
 */
export function useFavoriteProducts(): UseFavoriteProductsReturn {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>(() =>
    loadFromStorage()
  );

  // Persist to localStorage whenever the list changes.
  useEffect(() => {
    saveToStorage(favorites);
  }, [favorites]);

  /**
   * Adds a new favorite, or updates the default price if the name
   * already exists (case-sensitive match). Empty names are ignored.
   */
  const addFavorite = useCallback(
    (name: string, defaultUnitPrice: number): void => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const safePrice = Math.max(0, defaultUnitPrice || 0);

      setFavorites((prev) => {
        // If a favorite with the same name exists, update its price.
        const existing = prev.find(
          (f) => f.name === trimmed
        );
        if (existing) {
          return prev.map((f) =>
            f.id === existing.id
              ? { ...f, defaultUnitPrice: safePrice }
              : f
          );
        }
        // Otherwise add a new entry.
        const newFav: FavoriteProduct = {
          id: generateId(),
          name: trimmed,
          defaultUnitPrice: safePrice,
        };
        return [...prev, newFav];
      });
    },
    []
  );

  /** Removes a favorite by its ID. */
  const removeFavorite = useCallback((id: string): void => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  /** Finds a favorite by product name (case-sensitive). */
  const findFavoriteByName = useCallback(
    (name: string): FavoriteProduct | undefined => {
      return favorites.find((f) => f.name === name);
    },
    [favorites]
  );

  /** Checks whether a name already exists in the favorites list. */
  const isFavorite = useCallback(
    (name: string): boolean => {
      return favorites.some((f) => f.name === name);
    },
    [favorites]
  );

  return {
    favorites,
    addFavorite,
    removeFavorite,
    findFavoriteByName,
    isFavorite,
  };
}
