// FICHIER MODIFIÉ : frontend/vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
		tailwindcss(), 
		sveltekit()
	],
	// Redirige les requêtes /api vers le serveur backend pour éviter les erreurs CORS.
	server: {
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:8058',
				changeOrigin: true,
			},
			// Le proxy WebSocket est géré automatiquement par le serveur de dev Vite
			// lors de la mise à niveau de la connexion HTTP.
			'/ws': {
				target: 'ws://127.0.0.1:8058',
				ws: true,
			}
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['./vitest-setup-client.js'],
	}
});