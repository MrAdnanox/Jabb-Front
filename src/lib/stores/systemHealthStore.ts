// FICHIER MODIFIÉ : frontend/src/lib/stores/systemHealthStore.ts
import { writable } from 'svelte/store';

export interface SystemHealth {
  postgres_status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
  sqlite_status: 'AVAILABLE' | 'NOT_FOUND';
  total_documents: number;
  total_chunks: number;
  error?: string; // Optionnel: pour afficher les erreurs
}

// L'état initial est maintenant plus simple, car il sera immédiatement remplacé
// par les données chargées par le layout.
const initialHealth: SystemHealth = {
  postgres_status: 'CONNECTING',
  sqlite_status: 'NOT_FOUND',
  total_documents: 0,
  total_chunks: 0,
};

export const systemHealthStore = writable<SystemHealth>(initialHealth);