/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                // Game theme colors
                'game-orange': {
                    50: '#FDF4F0',
                    100: '#FBEADD',
                    200: '#F5D1BB',
                    300: '#EFB894',
                    400: '#E09F6C',
                    500: '#C96B2A',  // Main orange
                    600: '#B45A1F',
                    700: '#9A4D19',
                    800: '#7A3D14',
                    900: '#5C2E0F',
                },
                'game-cream': {
                    50: '#FEFCF8',
                    100: '#F9F5E8',  // Main cream
                    200: '#F0E8D5',
                    300: '#E5D5B8',
                    400: '#D4C29A',
                    500: '#C5B191',
                    600: '#B39F7D',
                    700: '#9A8B6A',
                    800: '#7A6F57',
                    900: '#5A5344',
                },
                'game-brown': {
                    50: '#F5F4F0',
                    100: '#EBEAE6',
                    200: '#D6D4CD',
                    300: '#B8B5AB',
                    400: '#9A9589',
                    500: '#6B5F43',
                    600: '#4A4835',  // Brown light
                    700: '#3E3D29',  // Main brown
                    800: '#2F2E1D',  // Brown dark
                    900: '#1F1E12',
                },

                // KPI colors - explicit and separate from theme
                'kpi-capacity': {
                    50: '#EFF6FF',
                    100: '#DBEAFE',
                    200: '#BFDBFE',
                    300: '#93C5FD',
                    400: '#60A5FA',
                    500: '#3B82F6',  // Main capacity blue
                    600: '#2563EB',
                    700: '#1D4ED8',
                    800: '#1E40AF',
                    900: '#1E3A8A',
                },
                'kpi-orders': {
                    50: '#FFFBEB',
                    100: '#FEF3C7',
                    200: '#FDE68A',
                    300: '#FCD34D',
                    400: '#FBBF24',
                    500: '#F59E0B',  // Main orders yellow
                    600: '#D97706',
                    700: '#B45309',
                    800: '#92400E',
                    900: '#78350F',
                },
                'kpi-cost': {
                    50: '#F0FDF4',
                    100: '#DCFCE7',
                    200: '#BBF7D0',
                    300: '#86EFAC',
                    400: '#4ADE80',
                    500: '#22C55E',  // Main cost green
                    600: '#16A34A',
                    700: '#15803D',
                    800: '#166534',
                    900: '#14532D',
                },
                'kpi-asp': {
                    50: '#FEF2F2',
                    100: '#FEE2E2',
                    200: '#FECACA',
                    300: '#FCA5A5',
                    400: '#F87171',
                    500: '#EF4444',  // Main ASP red
                    600: '#DC2626',
                    700: '#B91C1C',
                    800: '#991B1B',
                    900: '#7F1D1D',
                },

                // Dark theme colors for team app
                'dark-theme': {
                    50: '#F9FAFB',
                    100: '#F3F4F6',
                    200: '#E5E7EB',
                    300: '#D1D5DB',
                    400: '#9CA3AF',
                    500: '#6B7280',
                    600: '#4B5563',
                    700: '#374151',
                    800: '#1F2937',
                    900: '#111827',
                },
            },
        },
    },
    plugins: [],
};
