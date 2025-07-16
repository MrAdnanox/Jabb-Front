<!-- FICHIER MODIFIÉ : frontend/src/lib/components/IngestionControlPanel.svelte -->
<script lang="ts">
  import { startIngestion, ingestionStatus } from '$lib/services/ingestionService';
  import AdvancedFilePicker from './AdvancedFilePicker.svelte';

  let filesToIngest: File[] = [];

  function handleFileSelection(event: CustomEvent<{ files: File[] }>) {
    filesToIngest = event.detail.files;
  }

  $: isLoading = $ingestionStatus === 'PENDING' || $ingestionStatus === 'RUNNING';
  $: isSubmitDisabled = filesToIngest.length === 0 || isLoading;

  function handleSubmit() {
    if (isSubmitDisabled) return;
    startIngestion(filesToIngest);
  }
</script>

<div>
  <h2 class="text-2xl font-bold text-brand-text mb-4">Panneau de Pilotage de l'Ingestion</h2>
  
  <AdvancedFilePicker on:change={handleFileSelection} />

  <div class="mt-6 text-center">
    <button 
      on:click={handleSubmit} 
      disabled={isSubmitDisabled} 
      class="w-full sm:w-auto bg-brand-primary text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:bg-brand-surface disabled:text-brand-text-dim disabled:cursor-not-allowed"
    >
      {#if isLoading}
        <span>Traitement en cours...</span>
      {:else}
        Lancer l'ingestion ({filesToIngest.length})
      {/if}
    </button>
  </div>
</div>