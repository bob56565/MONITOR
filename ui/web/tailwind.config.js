/**
 * Tailwind CSS Configuration for Results UI
 * 
 * Defines premium clinical-tech design system with:
 * - Consistent spacing, typography, and color palette
 * - Custom components and utilities
 * - Accessibility-first approach
 * - Dark mode support
 */

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  
  theme: {
    extend: {
      // ====== COLORS ======
      colors: {
        // Clinical brand palette
        'clinical': {
          50: '#f0f7ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c3d66',
        },
      },

      // ====== TYPOGRAPHY ======
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Poppins', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },

      // ====== SPACING ======
      spacing: {
        '0.5': '0.125rem',
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
        '32': '8rem',
      },

      // ====== SHADOWS ======
      boxShadow: {
        'none': 'none',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'base': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'md': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'lg': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'clinical': '0 4px 12px rgba(2, 132, 199, 0.15)',
      },

      // ====== BORDER RADIUS ======
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',
        'base': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },

      // ====== ANIMATIONS ======
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-in-out',
        'pulse-gentle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },

      // ====== TRANSITIONS ======
      transitionDuration: {
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
      },
    },
  },

  plugins: [
    // Custom component utilities
    function ({ addComponents, theme }) {
      const components = {
        // ====== CARD COMPONENTS ======
        '.card': {
          '@apply bg-white rounded-lg border border-gray-200 shadow-sm p-4': {},
        },
        '.card-lg': {
          '@apply bg-white rounded-lg border border-gray-200 shadow-sm p-6': {},
        },
        '.card-hover': {
          '@apply card hover:shadow-md transition-shadow cursor-pointer': {},
        },

        // ====== BADGE COMPONENTS ======
        '.badge': {
          '@apply inline-block px-3 py-1 rounded-full text-sm font-medium': {},
        },
        '.badge-primary': {
          '@apply badge bg-blue-100 text-blue-800': {},
        },
        '.badge-success': {
          '@apply badge bg-green-100 text-green-800': {},
        },
        '.badge-warning': {
          '@apply badge bg-yellow-100 text-yellow-800': {},
        },
        '.badge-danger': {
          '@apply badge bg-red-100 text-red-800': {},
        },
        '.badge-neutral': {
          '@apply badge bg-gray-100 text-gray-800': {},
        },

        // ====== BUTTON COMPONENTS ======
        '.btn': {
          '@apply inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200': {},
        },
        '.btn-primary': {
          '@apply btn bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400': {},
        },
        '.btn-secondary': {
          '@apply btn bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100': {},
        },
        '.btn-outline': {
          '@apply btn border-2 border-gray-300 text-gray-900 hover:bg-gray-50': {},
        },
        '.btn-sm': {
          '@apply btn px-3 py-1 text-sm': {},
        },
        '.btn-lg': {
          '@apply btn px-6 py-3 text-lg': {},
        },

        // ====== FORM ELEMENTS ======
        '.input': {
          '@apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent': {},
        },
        '.input-sm': {
          '@apply input px-3 py-1 text-sm': {},
        },
        '.textarea': {
          '@apply input resize-none': {},
        },
        '.select': {
          '@apply input appearance-none bg-white cursor-pointer': {},
        },

        // ====== TEXT UTILITIES ======
        '.text-heading-1': {
          '@apply text-4xl font-bold text-gray-900': {},
        },
        '.text-heading-2': {
          '@apply text-3xl font-bold text-gray-900': {},
        },
        '.text-heading-3': {
          '@apply text-2xl font-semibold text-gray-900': {},
        },
        '.text-heading-4': {
          '@apply text-xl font-semibold text-gray-900': {},
        },
        '.text-body': {
          '@apply text-base text-gray-700': {},
        },
        '.text-caption': {
          '@apply text-xs text-gray-500': {},
        },

        // ====== STATE UTILITIES ======
        '.state-success': {
          '@apply bg-green-50 border border-green-200 text-green-900': {},
        },
        '.state-warning': {
          '@apply bg-yellow-50 border border-yellow-200 text-yellow-900': {},
        },
        '.state-error': {
          '@apply bg-red-50 border border-red-200 text-red-900': {},
        },
        '.state-info': {
          '@apply bg-blue-50 border border-blue-200 text-blue-900': {},
        },

        // ====== ACCESSIBILITY ======
        '.sr-only': {
          '@apply absolute w-px h-px p-0 m-0 overflow-hidden clip-rect(0, 0, 0, 0) border-0': {},
        },
        '.focus-ring': {
          '@apply outline-none ring-2 ring-blue-500 ring-offset-2': {},
        },
      };

      addComponents(components);
    },

    // Dark mode support
    function ({ addVariant }) {
      addVariant('dark', '@media (prefers-color-scheme: dark)');
    },
  ],
};
