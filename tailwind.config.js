/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 세종 스쿨이음톡 디자인 토큰
        primary: {
          50:  '#eef8f7',
          100: '#d5efed',
          200: '#aee0dc',
          300: '#7cccc5',
          400: '#4db3ab',
          500: '#0a8a7a', // 메인 틸
          600: '#087a6c',
          700: '#066359',
          800: '#054e46',
          900: '#033b35',
        },
        navy: {
          50:  '#eef1f5',
          100: '#d5dbe5',
          200: '#a8b5c8',
          300: '#7a8eab',
          400: '#4d688e',
          500: '#1a4060',
          600: '#152f4a',
          700: '#0d2137',
          800: '#091828',
          900: '#050e18',
        },
        accent: {
          DEFAULT: '#f7a600',
          warm: '#e05c2a',
        },
        // 학교급별 색상
        school: {
          kindergarten: '#f06292',
          elementary: '#4285f4',
          middle: '#34a853',
          high: '#fbbc05',
          special: '#ab47bc',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f7fafc',
          bg: '#f0f4f8',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Helvetica Neue',
          'Apple SD Gothic Neo',
          '맑은 고딕',
          'sans-serif',
        ],
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
      },
      boxShadow: {
        card: '0 2px 16px rgba(13, 33, 55, 0.08)',
        'card-lg': '0 8px 40px rgba(13, 33, 55, 0.14)',
        glow: '0 0 20px rgba(10, 138, 122, 0.3)',
      },
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1440px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
