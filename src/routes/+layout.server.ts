// FICHIER MODIFIÉ : frontend/src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import type { SystemHealth } from '$lib/stores/systemHealthStore';

export const load: LayoutServerLoad = async ({ fetch }) => {
    
    async function fetchInitialHealth(): Promise<SystemHealth> {
        try {
            const response = await fetch('/api/v1/health');
            if (!response.ok) {
                throw new Error(`API Health Check failed with status ${response.status}`);
            }
            const data = await response.json();

            return {
                postgres_status: data.postgres_status === 'OK' ? 'CONNECTED' : 'DISCONNECTED',
                sqlite_status: data.graph_db_status === 'OK' ? 'AVAILABLE' : 'NOT_FOUND',
                total_documents: data.document_count,
                total_chunks: data.chunk_count,
            };
        } catch (error: unknown) { // La variable 'error' est de type 'unknown'
            
            // ELITE FIX: Implémentation d'un garde de type pour gérer 'error' en toute sécurité.
            let errorMessage: string;
            if (error instanceof Error) {
                // Si c'est une instance d'Error, nous pouvons accéder à .message en toute sécurité.
                errorMessage = error.message;
            } else {
                // Sinon, nous convertissons la valeur capturée en chaîne de caractères.
                errorMessage = String(error);
            }

            console.error('[Layout Load] Failed to fetch initial system health:', errorMessage);
            
            return {
                postgres_status: 'DISCONNECTED',
                sqlite_status: 'NOT_FOUND',
                total_documents: 0,
                total_chunks: 0,
                error: errorMessage // On utilise maintenant la variable sûre.
            };
        }
    }

    return {
        initialHealth: await fetchInitialHealth()
    };
};