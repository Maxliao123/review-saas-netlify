import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchTripAdvisorLocation, getTripAdvisorSummary } from '@/lib/tripadvisor';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.stubEnv('TRIPADVISOR_API_KEY', 'test-api-key');
  mockFetch.mockReset();
});

describe('searchTripAdvisorLocation', () => {
  it('returns the first location result on success', async () => {
    const mockLocation = {
      location_id: '12345',
      name: 'Test Restaurant',
      address_obj: { address_string: '123 Main St, New York' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockLocation] }),
    });

    const result = await searchTripAdvisorLocation('Test Restaurant', 'New York');

    expect(result).toEqual(mockLocation);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0][0]).toContain('/location/search');
    expect(mockFetch.mock.calls[0][0]).toContain('key=test-api-key');
  });

  it('returns null when no results found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const result = await searchTripAdvisorLocation('Nonexistent Place', 'Nowhere');
    expect(result).toBeNull();
  });

  it('returns null on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await searchTripAdvisorLocation('Test', 'New York');
    expect(result).toBeNull();
  });

  it('returns null when API key is missing', async () => {
    vi.stubEnv('TRIPADVISOR_API_KEY', '');

    // Re-import to pick up empty env
    vi.resetModules();
    const mod = await import('@/lib/tripadvisor');

    const result = await mod.searchTripAdvisorLocation('Test', 'New York');
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('getTripAdvisorSummary', () => {
  it('returns parsed summary on success', async () => {
    const mockDetails = {
      location_id: '12345',
      name: 'Test Restaurant',
      rating: '4.5',
      num_reviews: '320',
      ranking_data: { ranking_string: '#1 of 50 restaurants' },
      web_url: 'https://www.tripadvisor.com/Restaurant_Review-12345',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetails,
    });

    const result = await getTripAdvisorSummary('12345');

    expect(result).toEqual({
      location_id: '12345',
      name: 'Test Restaurant',
      rating: 4.5,
      num_reviews: 320,
      ranking_string: '#1 of 50 restaurants',
      web_url: 'https://www.tripadvisor.com/Restaurant_Review-12345',
    });
  });

  it('returns null on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    const result = await getTripAdvisorSummary('12345');
    expect(result).toBeNull();
  });

  it('handles missing optional fields gracefully', async () => {
    const mockDetails = {
      location_id: '99999',
      name: 'Simple Place',
      rating: '3.0',
      num_reviews: '10',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetails,
    });

    const result = await getTripAdvisorSummary('99999');

    expect(result).toEqual({
      location_id: '99999',
      name: 'Simple Place',
      rating: 3.0,
      num_reviews: 10,
      ranking_string: undefined,
      web_url: undefined,
    });
  });

  it('returns null when API key is missing', async () => {
    vi.stubEnv('TRIPADVISOR_API_KEY', '');

    vi.resetModules();
    const mod = await import('@/lib/tripadvisor');

    const result = await mod.getTripAdvisorSummary('12345');
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
