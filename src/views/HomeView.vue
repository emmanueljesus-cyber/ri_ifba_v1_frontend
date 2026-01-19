<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50 dark:bg-slate-900">
    <Card class="w-full max-w-2xl shadow-lg border-t-4 border-primary">
      <template #title>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
            IF
          </div>
          <h1 class="text-2xl font-bold text-slate-800 dark:text-white">
            RI-IFBA - Restaurante Institucional
          </h1>
        </div>
      </template>
      <template #content>
        <p class="text-slate-600 dark:text-slate-300 mb-6">
          Bem-vindo ao sistema de gestão do Restaurante Institucional do IFBA. 
          Este projeto segue as diretrizes do Padrão GovBR e identidade visual do IFBA.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button label="Acessar como Estudante" icon="pi pi-user" class="p-button-lg" />
          <Button label="Acessar como Admin" icon="pi pi-lock" severity="secondary" class="p-button-lg" />
        </div>
      </template>
      <template #footer>
        <p class="text-center text-sm text-slate-400">
          Desenvolvido para o IFBA &copy; 2026
        </p>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.border-primary {
  border-top-color: var(--p-primary-500);
}
</style>
