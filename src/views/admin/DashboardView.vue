<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminDashboardService } from '../../services/adminDashboard'
import Card from 'primevue/card'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'

const resumo = ref<any>(null)
const loading = ref(true)

const carregarDados = async () => {
  try {
    resumo.value = await adminDashboardService.getResumo()
  } catch (err) {
    console.error('Erro ao carregar dashboard', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  carregarDados()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Painel Administrativo</h1>
        <p class="text-slate-500">Visão geral do Restaurante Institucional.</p>
      </div>
      <Button icon="pi pi-refresh" rounded outlined @click="carregarDados" :loading="loading" />
    </div>

    <!-- Métricas Rápidas -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card class="border-l-4 border-emerald-500">
        <template #content>
          <div class="flex items-center gap-4">
            <div class="p-3 bg-emerald-50 rounded-lg">
              <i class="pi pi-users text-emerald-600 text-xl"></i>
            </div>
            <div>
              <p class="text-sm text-slate-500 font-medium">Total Bolsistas</p>
              <p class="text-2xl font-bold text-slate-800">{{ resumo?.metricas.total_bolsistas || 0 }}</p>
            </div>
          </div>
        </template>
      </Card>

      <Card class="border-l-4 border-blue-500">
        <template #content>
          <div class="flex items-center gap-4">
            <div class="p-3 bg-blue-50 rounded-lg">
              <i class="pi pi-check-circle text-blue-600 text-xl"></i>
            </div>
            <div>
              <p class="text-sm text-slate-500 font-medium">Presenças Hoje</p>
              <p class="text-2xl font-bold text-slate-800">{{ resumo?.metricas.presencas_hoje || 0 }}</p>
            </div>
          </div>
        </template>
      </Card>

      <Card class="border-l-4 border-orange-500">
        <template #content>
          <div class="flex items-center gap-4">
            <div class="p-3 bg-orange-50 rounded-lg">
              <i class="pi pi-file-edit text-orange-600 text-xl"></i>
            </div>
            <div>
              <p class="text-sm text-slate-500 font-medium">Justificativas</p>
              <p class="text-2xl font-bold text-slate-800">{{ resumo?.metricas.justificativas_pendentes || 0 }}</p>
            </div>
          </div>
        </template>
      </Card>

      <Card class="border-l-4 border-red-500">
        <template #content>
          <div class="flex items-center gap-4">
            <div class="p-3 bg-red-50 rounded-lg">
              <i class="pi pi-times-circle text-red-600 text-xl"></i>
            </div>
            <div>
              <p class="text-sm text-slate-500 font-medium">Faltas Hoje</p>
              <p class="text-2xl font-bold text-slate-800">{{ resumo?.metricas.faltas_hoje || 0 }}</p>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Refeição Atual -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card class="lg:col-span-2">
        <template #title> Refeição em Tempo Real </template>
        <template #content>
          <div v-if="resumo?.refeicao_atual" class="space-y-6">
            <div class="flex justify-between items-end">
              <div>
                <p class="text-slate-500 text-sm capitalize">Turno: {{ resumo.refeicao_atual.turno }}</p>
                <p class="text-3xl font-bold text-slate-800">
                  {{ resumo.refeicao_atual.confirmados }} / {{ resumo.refeicao_atual.capacidade }}
                </p>
              </div>
              <p class="text-emerald-600 font-semibold">
                {{ Math.round((resumo.refeicao_atual.confirmados / resumo.refeicao_atual.capacidade) * 100) }}% ocupado
              </p>
            </div>
            <ProgressBar
              :value="Math.round((resumo.refeicao_atual.confirmados / resumo.refeicao_atual.capacidade) * 100)"
              :showValue="false"
              class="h-4"
            />
            <div class="grid grid-cols-2 gap-4 pt-4 border-t">
              <div class="text-center">
                <p class="text-slate-500 text-xs uppercase tracking-wider">Vagas Restantes</p>
                <p class="text-xl font-bold text-slate-700">{{ resumo.refeicao_atual.vagas_restantes }}</p>
              </div>
              <div class="text-center border-l">
                <p class="text-slate-500 text-xs uppercase tracking-wider">Capacidade Total</p>
                <p class="text-xl font-bold text-slate-700">{{ resumo.refeicao_atual.capacidade }}</p>
              </div>
            </div>
          </div>
          <div v-else class="py-12 text-center">
            <i class="pi pi-calendar-times text-4xl text-slate-300 mb-3"></i>
            <p class="text-slate-500">Nenhuma refeição ativa no momento.</p>
          </div>
        </template>
      </Card>

      <Card>
        <template #title> Ações Rápidas </template>
        <template #content>
          <div class="flex flex-col gap-3">
            <Button
              label="Validar QR Code"
              icon="pi pi-qrcode"
              class="w-full"
              severity="success"
              @click="$router.push('/admin/presencas')"
            />
            <Button
              label="Novo Cardápio"
              icon="pi pi-plus"
              class="w-full"
              outlined
              @click="$router.push('/admin/cardapios')"
            />
            <Button
              label="Relatórios"
              icon="pi pi-file-pdf"
              class="w-full"
              severity="secondary"
              outlined
            />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
