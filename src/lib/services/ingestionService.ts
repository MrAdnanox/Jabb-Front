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
  // ======================= ELITE FIX : CORRECTION DE LA SYNTAXE DE L'URL =======================
  // 1. La variable `wsProtocol` ne doit PAS contenir de deux-points. Elle contient 'ws' ou 'wss'.
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  
  // 2. La construction de l'URL utilise maintenant la syntaxe standard `protocole://host/path`.
  const wsUrl = `${wsProtocol}://${window.location.host}/api/v1/ws/jobs/${jobId}/status`;
  // ===========================================================================================

  try {
    socket = new WebSocket(wsUrl);
  } catch (error) {
    // Capture l'erreur de construction si l'URL est toujours invalide.
    console.error('[SERVICE ERROR] Failed to construct WebSocket:', error);
    _addLog('ERROR', `Échec de la construction du WebSocket : ${error instanceof Error ? error.message : String(error)}`);
    ingestionStatus.set('FAILED');
    return; // Arrête l'exécution si la construction échoue.
  }

  socket.onopen = () => {
    ingestionStatus.set('RUNNING');
    _addLog('INFO', `Connecté au flux de logs pour le job ${jobId}`);
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'log') {
      _addLog(data.level.toUpperCase(), data.message);
    } else if (data.type === 'status') {
      const newStatus = data.status.toUpperCase() as IngestionStatus;
      ingestionStatus.set(newStatus);
      _addLog('INFO', `Nouveau statut : ${data.status} - ${data.message}`);

      if (newStatus === 'SUCCESS' || newStatus === 'FAILED') {
        _addLog('INFO', 'Job terminé. Fermeture de la connexion WebSocket.');
        socket?.close();
      }
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket Error:', error);
    _addLog('ERROR', 'Erreur de connexion avec le serveur de logs.');
    ingestionStatus.set('FAILED');
  };

  socket.onclose = () => {
    _addLog('INFO', 'Connexion au flux de logs terminée.');
    ingestionStatus.update(status => (status === 'RUNNING' || status === 'PENDING' ? 'IDLE' : status));
  };
}

function _addLog(level: LogEntry['level'], message: string) {
  ingestionLogs.update(currentLogs => {
    return [...currentLogs, { level, message, timestamp: new Date() }];
  });
}