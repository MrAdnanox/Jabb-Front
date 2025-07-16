<!-- FICHIER MODIFIÉ : frontend/src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.pcss';
	import { onMount } from 'svelte';
	import { systemHealthStore, type SystemHealth } from '$lib/stores/systemHealthStore';
	import type { LayoutData } from './$types';

	// `data` est automatiquement peuplée par SvelteKit avec le retour
	// de la fonction `load` dans `+layout.server.ts`.
	export let data: LayoutData;

	// Met à jour le store chaque fois que les données de navigation changent.
	// C'est la source de vérité initiale.
	$: if (data.initialHealth) {
		systemHealthStore.set(data.initialHealth);
	}

	// `onMount` s'exécute UNIQUEMENT dans le navigateur, jamais sur le serveur.
	// C'est l'endroit idéal pour la logique côté client comme le polling.
	onMount(() => {
		// Cette fonction utilise le `fetch` natif du navigateur, qui gère
		// correctement les URLs relatives.
		const fetchHealthClientSide = async () => {
			try {
				const response = await fetch('/api/v1/health'); // Pas de `event.fetch` ici, c'est le fetch du navigateur
				if (!response.ok) return; // Gérer l'erreur silencieusement pour ne pas spammer
				const healthData = await response.json();
				
				const newHealthState: SystemHealth = {
					postgres_status: healthData.postgres_status === 'OK' ? 'CONNECTED' : 'DISCONNECTED',
					sqlite_status: healthData.graph_db_status === 'OK' ? 'AVAILABLE' : 'NOT_FOUND',
					total_documents: healthData.document_count,
					total_chunks: healthData.chunk_count,
				};
				systemHealthStore.set(newHealthState);

			} catch (e) {
				// En cas d'échec du polling, on peut mettre à jour le store
				systemHealthStore.update(s => ({...s, postgres_status: 'DISCONNECTED'}));
			}
		};

		// Lance le polling toutes les 10 secondes.
		const intervalId = setInterval(fetchHealthClientSide, 10000);

		// Nettoie l'intervalle lorsque le composant est détruit pour éviter les fuites mémoire.
		return () => clearInterval(intervalId);
	});
</script>

<slot />