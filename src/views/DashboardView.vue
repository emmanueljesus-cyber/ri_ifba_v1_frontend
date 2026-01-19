<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const userName = computed(() => auth.user?.nome ?? 'Usuário')
</script>

<template>
  <div class="min-h-screen bg-slate-50 py-10 px-4">
    <div class="max-w-5xl mx-auto flex flex-col gap-4">
      <h1 class="text-2xl font-bold text-slate-800">Dashboard</h1>
      <Card>
        <template #title>
          <div class="flex items-center justify-between gap-2">
            <span>Bem-vindo, {{ userName }}</span>
            <Button label="Sair" icon="pi pi-sign-out" severity="secondary" outlined @click="auth.logout" />
          </div>
        </template>
        <template #content>
          <p class="text-slate-600">
            Aqui vão os cartões e métricas do restaurante (presenças, cardápios, filas).
          </p>
        </template>
      </Card>
    </div>
  </div>
</template>
