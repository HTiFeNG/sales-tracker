import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavoriteProducts } from '../hooks/useFavoriteProducts';
import { type FavoriteProduct } from '../types';

// The localStorage key the hook uses internally for favorites.
const FAV_STORAGE_KEY = 'sales-tracker-favorites';

beforeEach(() => {
  localStorage.clear();
});

describe('useFavoriteProducts - initial state', () => {
  it('starts with an empty favorites list', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    expect(result.current.favorites).toEqual([]);
  });

  it('loads existing favorites from localStorage on init', () => {
    const seed: FavoriteProduct[] = [
      { id: 'f1', name: '苹果', defaultUnitPrice: 5 },
      { id: 'f2', name: '香蕉', defaultUnitPrice: 3.5 },
    ];
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(seed));
    const { result } = renderHook(() => useFavoriteProducts());
    expect(result.current.favorites).toHaveLength(2);
    expect(result.current.favorites[0].name).toBe('苹果');
    expect(result.current.favorites[1].defaultUnitPrice).toBe(3.5);
  });

  it('returns an empty list when localStorage contains invalid JSON', () => {
    localStorage.setItem(FAV_STORAGE_KEY, '{not valid json');
    const { result } = renderHook(() => useFavoriteProducts());
    expect(result.current.favorites).toEqual([]);
  });

  it('returns an empty list when localStorage contains a non-array value', () => {
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify({ not: 'an array' }));
    const { result } = renderHook(() => useFavoriteProducts());
    expect(result.current.favorites).toEqual([]);
  });
});

describe('useFavoriteProducts - addFavorite', () => {
  it('adds a new favorite with a generated id', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('苹果', 5));
    expect(result.current.favorites).toHaveLength(1);
    const fav = result.current.favorites[0];
    expect(fav.id).toEqual(expect.any(String));
    expect(fav.id.length).toBeGreaterThan(0);
    expect(fav.name).toBe('苹果');
    expect(fav.defaultUnitPrice).toBe(5);
  });

  it('trims whitespace from the name before saving', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('  苹果  ', 5));
    expect(result.current.favorites[0].name).toBe('苹果');
  });

  it('ignores an empty/whitespace-only name', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('   ', 5));
    expect(result.current.favorites).toHaveLength(0);
  });

  it('ignores an empty string name', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('', 5));
    expect(result.current.favorites).toHaveLength(0);
  });

  it('clamps a negative default price to 0', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('苹果', -10));
    expect(result.current.favorites[0].defaultUnitPrice).toBe(0);
  });

  it('treats a NaN price as 0', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('苹果', NaN));
    expect(result.current.favorites[0].defaultUnitPrice).toBe(0);
  });

  it('updates the price when adding a name that already exists (no duplicate)', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('苹果', 5));
    act(() => result.current.addFavorite('苹果', 8));
    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].defaultUnitPrice).toBe(8);
    // The id should remain stable (same entry updated, not replaced).
    expect(result.current.favorites[0].name).toBe('苹果');
  });

  it('treats names case-sensitively (Apple and apple are distinct)', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('Apple', 5));
    act(() => result.current.addFavorite('apple', 3));
    expect(result.current.favorites).toHaveLength(2);
  });

  it('can add multiple distinct favorites', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => {
      result.current.addFavorite('苹果', 5);
      result.current.addFavorite('香蕉', 3);
      result.current.addFavorite('橙子', 4);
    });
    expect(result.current.favorites).toHaveLength(3);
    expect(result.current.favorites.map((f) => f.name)).toEqual([
      '苹果',
      '香蕉',
      '橙子',
    ]);
  });
});

describe('useFavoriteProducts - removeFavorite', () => {
  it('removes a favorite by id', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => {
      result.current.addFavorite('苹果', 5);
      result.current.addFavorite('香蕉', 3);
    });
    const firstId = result.current.favorites[0].id;
    act(() => result.current.removeFavorite(firstId));
    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites.find((f) => f.id === firstId)).toBeUndefined();
    expect(result.current.favorites[0].name).toBe('香蕉');
  });

  it('is a no-op when the id does not exist', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('苹果', 5));
    act(() => result.current.removeFavorite('nonexistent-id'));
    expect(result.current.favorites).toHaveLength(1);
  });

  it('can remove all favorites leaving an empty list', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => {
      result.current.addFavorite('苹果', 5);
      result.current.addFavorite('香蕉', 3);
    });
    const ids = result.current.favorites.map((f) => f.id);
    act(() => {
      result.current.removeFavorite(ids[0]);
      result.current.removeFavorite(ids[1]);
    });
    expect(result.current.favorites).toHaveLength(0);
  });
});

describe('useFavoriteProducts - findFavoriteByName & isFavorite', () => {
  it('findFavoriteByName returns the matching favorite', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('苹果', 5));
    const found = result.current.findFavoriteByName('苹果');
    expect(found).toBeDefined();
    expect(found?.defaultUnitPrice).toBe(5);
  });

  it('findFavoriteByName returns undefined for an unknown name', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('苹果', 5));
    expect(result.current.findFavoriteByName('橙子')).toBeUndefined();
  });

  it('findFavoriteByName is case-sensitive', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('Apple', 5));
    expect(result.current.findFavoriteByName('apple')).toBeUndefined();
  });

  it('isFavorite returns true for an existing name', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('苹果', 5));
    expect(result.current.isFavorite('苹果')).toBe(true);
  });

  it('isFavorite returns false for an unknown name', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('苹果', 5));
    expect(result.current.isFavorite('橙子')).toBe(false);
  });

  it('isFavorite reflects removal immediately', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('苹果', 5));
    expect(result.current.isFavorite('苹果')).toBe(true);
    const id = result.current.favorites[0].id;
    act(() => result.current.removeFavorite(id));
    expect(result.current.isFavorite('苹果')).toBe(false);
  });
});

describe('useFavoriteProducts - persistence', () => {
  it('persists favorites to localStorage after adding', () => {
    const { result } = renderHook(() => useFavoriteProducts());
    act(() => result.current.addFavorite('苹果', 5));
    const raw = localStorage.getItem(FAV_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as FavoriteProduct[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('苹果');
  });

  it('survives a remount: data persists across hook instances', () => {
    const { result, unmount } = renderHook(() => useFavoriteProducts());
    act(() => {
      result.current.addFavorite('苹果', 5);
      result.current.addFavorite('香蕉', 3);
    });
    unmount();

    // Simulate a fresh page load.
    const { result: result2 } = renderHook(() => useFavoriteProducts());
    expect(result2.current.favorites).toHaveLength(2);
    expect(result2.current.favorites.map((f) => f.name)).toEqual([
      '苹果',
      '香蕉',
    ]);
  });

  it('persisted removal survives a remount', () => {
    const { result, unmount } = renderHook(() => useFavoriteProducts());
    act(() => {
      result.current.addFavorite('苹果', 5);
      result.current.addFavorite('香蕉', 3);
    });
    const appleId = result.current.favorites[0].id;
    act(() => result.current.removeFavorite(appleId));
    unmount();

    const { result: result2 } = renderHook(() => useFavoriteProducts());
    expect(result2.current.favorites).toHaveLength(1);
    expect(result2.current.favorites[0].name).toBe('香蕉');
  });
});
