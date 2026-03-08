/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            boxShadow: {
                glass: '0 10px 35px rgba(2, 6, 23, 0.35)',
                soft: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                subtle: '0 1px 3px rgba(0, 0, 0, 0.02)',
            },
        },
    },
    plugins: [],
};
