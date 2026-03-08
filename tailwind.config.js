/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            boxShadow: {
                card: '0 0 0 1px rgba(148, 163, 184, 0.06), 0 4px 24px rgba(0, 0, 0, 0.35)',
                glow: '0 0 20px rgba(56, 189, 248, 0.15)',
                'glow-emerald': '0 0 20px rgba(52, 211, 153, 0.15)',
                'glow-rose': '0 0 20px rgba(251, 113, 133, 0.12)',
                inset: 'inset 0 1px 4px rgba(0, 0, 0, 0.3)',
                glass: '0 10px 35px rgba(2, 6, 23, 0.45)',
            },
        },
    },
    plugins: [],
};
