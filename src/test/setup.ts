import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * In-memory localStorage implementation for jsdom.
 * jsdom provides localStorage, but we reset it between tests to guarantee
 * isolation for the useSalesRecords persistence tests.
 */
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});
