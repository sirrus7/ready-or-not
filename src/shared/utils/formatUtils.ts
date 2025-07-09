/**
 * Shared formatting utilities
 */

/**
 * Format currency values with K/M suffixes
 * @param value - The numeric value to format
 * @returns Formatted currency string (e.g., "$1.2M", "$500K", "$1,234")
 */
export const formatCurrency = (value: number | undefined | null): string => {
    if (value == null || isNaN(value)) return '$0';

    const num = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (num >= 1_000_000) {
        return `${sign}$${(Math.abs(value) / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
        return `${sign}$${(Math.abs(value) / 1_000).toFixed(0)}K`;
    }
    return `${sign}$${Math.abs(value).toLocaleString()}`;
};

/**
 * Format percentage values
 * @param value - The numeric value (as decimal, e.g., 0.25 for 25%)
 * @returns Formatted percentage string (e.g., "25%")
 */
export const formatPercentage = (value: number | undefined | null): string => {
    if (value == null || isNaN(value)) return '0%';
    return `${(value * 100).toFixed(1)}%`;
};

/**
 * Format number values with commas (for capacity, orders, etc.)
 * @param value - The numeric value to format
 * @returns Formatted number string (e.g., "1,234")
 */
export const formatNumber = (value: number | undefined | null): string => {
    if (value == null || isNaN(value)) return '0';
    return Math.abs(value).toLocaleString();
};
