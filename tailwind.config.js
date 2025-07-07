/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        colors: {
            // Keep necessary colors
            transparent: 'transparent',
            current: 'currentColor',
            white: '#ffffff',
            black: '#000000',

            // Game theme colors (using client's exact specifications)
            'game-orange': {
                50: '#FDF4F0',
                100: '#FBEADD',
                200: '#F5D1BB',
                300: '#EFB894',
                400: '#E09F6C',
                500: '#C96B2A',  // Client's orange
                600: '#B45A1F',
                700: '#9A4D19',
                800: '#7A3D14',
                900: '#5C2E0F',
            },
            'game-cream': {
                50: '#FEFCF8',
                100: '#F9F5E8',  // Client's cream
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
                700: '#3E3D29',  // Client's brown
                800: '#2F2E1D',  // Brown dark
                900: '#1F1E12',
            },

            // Override all grays with game colors
            gray: {
                50: '#F9F5E8',   // game-cream
                100: '#F0E8D5',  // game-cream-dark
                200: '#E5D5B8',  // lighter cream
                300: '#C5B191',  // neutral bridge
                400: '#9A8B6A',  // warmer neutral
                500: '#6B5F43',  // bridge to brown
                600: '#4A4835',  // game-brown-light
                700: '#3E3D29',  // game-brown
                800: '#2F2E1D',  // game-brown-dark
                900: '#1F1E12',  // darker variant
            },

            // Override ALL blues with orange
            blue: {
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

            // Override ALL purples with orange (for Game Metrics section)
            purple: {
                50: '#FDF4F0',
                100: '#FBEADD',
                200: '#F5D1BB',  // Will be used for text-purple-200
                300: '#EFB894',
                400: '#E09F6C',
                500: '#C96B2A',  // Main orange
                600: '#B45A1F',  // Will be used for from-purple-600
                700: '#9A4D19',  // Will be used for to-purple-700
                800: '#7A3D14',
                900: '#5C2E0F',
            },

            // Override yellows with cream tones
            yellow: {
                50: '#FEFCF8',
                100: '#F9F5E8',
                200: '#F0E8D5',
                300: '#E5D5B8',
                400: '#D4C29A',
                500: '#C5B191',
                600: '#B39F7D',
                700: '#9A8B6A',
                800: '#7A6F57',
                900: '#5A5344',
            },

            // Keep other essential colors
            red: {
                50: '#FEF2F2',
                100: '#FEE2E2',
                200: '#FECACA',
                300: '#FCA5A5',
                400: '#F87171',
                500: '#EF4444',
                600: '#DC2626',
                700: '#B91C1C',
                800: '#991B1B',
                900: '#7F1D1D',
            },
            green: {
                50: '#F9F5E8',   // Light cream (same as your main cream)
                100: '#F0E8D5',  // Slightly darker cream
                200: '#E5D5B8',  // Tan
                300: '#D4C29A',  // Warm tan
                400: '#C5B191',  // Medium tan
                500: '#B39F7D',  // Darker tan (main "success" color)
                600: '#9A8B6A',  // Brown-tan
                700: '#7A6F57',  // Dark brown-tan
                800: '#5A5344',  // Very dark brown-tan
                900: '#4A4835',  // Almost brown
            },
        },
        extend: {
            // Additional customizations can go here
        },
    },
    plugins: [],
};
