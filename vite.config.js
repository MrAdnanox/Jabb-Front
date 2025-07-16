// FICHIER CORRIGÉ : frontend/vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
		tailwindcss(), 
		sveltekit()
	],
	server: {
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:8058',
				changeOrigin: true,
				ws: true,
			},
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['./vitest-setup-client.js'],
	}
});