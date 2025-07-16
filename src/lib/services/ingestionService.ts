// FICHIER MODIFIÉ : frontend/src/lib/services/ingestionService.ts
import { writable } from 'svelte/store';

// --- Les types et stores restent inchangés, ils sont le contrat avec l'UI ---
export type IngestionStatus = 'IDLE' | 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
export interface LogEntry {
  level: 'INFO' | 'ERROR' | 'WARN';
  message: string;
  timestamp: Date;
}
export const ingestionStatus = writable<IngestionStatus>('IDLE');
export const ingestionLogs = writable<LogEntry[]>([]);
export const currentJobId = writable<string | null>(null);

// --- ELITE IMPLEMENTATION: Remplacement de la logique factice par l'intégration réelle ---

let socket: WebSocket | null = null;

/**
 * Démarre un job d'ingestion en appelant l'API backend.
 * @param {File[]} files - Les fichiers à ingérer.
 */
export async function startIngestion(files: File[]) {
  if (files.length === 0) return;

  // 1. Réinitialisation de l'état pour un nouveau job
  ingestionStatus.set('PENDING');
  ingestionLogs.set([]);
  currentJobId.set(null);
  if (socket) {
    socket.close(); // Ferme toute connexion précédente
  }

  // 2. Préparation de la requête multipart/form-data
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  try {
    // 3. Appel de l'endpoint d'ingestion
    const response = await fetch('/api/v1/ingest', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    currentJobId.set(result.job_id);
    _addLog('INFO', result.message);

    // 4. Établissement de la connexion WebSocket pour le suivi en temps réel
    connectToJobStatus(result.job_id);

  } catch (error) {
    console.error('[SERVICE ERROR] Failed to start ingestion:', error);
    _addLog('ERROR', `Échec du démarrage de l'ingestion : ${error}`);
    ingestionStatus.set('FAILED');
  }
}

/**
 * Se connecte au WebSocket pour recevoir les mises à jour d'un job.
 * @param {string} jobId - L'ID du job à suivre.
 */
function connectToJobStatus(jobId: string) {
  // Construit l'URL WebSocket en respectant le protocole de la page (ws/wss)
  const wsProtocol = window.location.protocol === 'https' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${window.location.host}/ws/jobs/${jobId}/status`;
  
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    ingestionStatus.set('RUNNING');
    _addLog('INFO', `Connecté au flux de logs pour le job ${jobId}`);
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'log') {
      _addLog(data.level.toUpperCase(), data.message);
    } else if (data.type === 'status') {
      ingestionStatus.set(data.status.toUpperCase() as IngestionStatus);
      _addLog('INFO', `Nouveau statut : ${data.status} - ${data.message}`);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket Error:', error);
    _addLog('ERROR', 'Erreur de connexion avec le serveur de logs.');
    ingestionStatus.set('FAILED');
  };

  socket.onclose = () => {
    _addLog('INFO', 'Connexion au flux de logs terminée.');
    // Ne changez le statut que s'il est encore en cours
    ingestionStatus.update(status => (status === 'RUNNING' || status === 'PENDING' ? 'IDLE' : status));
  };
}

/**
 * Ajoute une entrée de log au store.
 * @param {LogEntry['level']} level - Le niveau du log.
 * @param {string} message - Le message du log.
 */
function _addLog(level: LogEntry['level'], message: string) {
  ingestionLogs.update(currentLogs => {
    return [...currentLogs, { level, message, timestamp: new Date() }];
  });
}