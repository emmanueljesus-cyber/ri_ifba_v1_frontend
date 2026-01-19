<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminDashboardService } from '../../services/adminDashboard'
import PageHeader from '../../components/common/PageHeader.vue'
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
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Painel Administrativo"
      subtitle="Visão geral do Restaurante Institucional."
      :breadcrumbs="[{ label: 'Admin' }]"
    />

    <div class="flex justify-end -mt-16 mb-4 relative z-10">
      <Button icon="pi pi-refresh" rounded outlined @click="carregarDados" :loading="loading" severity="secondary" />
    </div>

    <!-- Métricas Rápidas -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
        <div class="p-3 bg-primary-50 rounded-2xl text-primary-600">
          <i class="pi pi-users text-2xl"></i>
        </div>
        <div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bolsistas</p>
          <p class="text-2xl font-black text-slate-800 leading-tight lato-black">{{ resumo?.metricas.total_bolsistas || 0 }}</p>
        </div>
      </div>

      <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
        <div class="p-3 bg-blue-50 rounded-2xl text-blue-600">
          <i class="pi pi-check-circle text-2xl"></i>
        </div>
        <div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Presenças Hoje</p>
          <p class="text-2xl font-black text-slate-800 leading-tight lato-black">{{ resumo?.metricas.presencas_hoje || 0 }}</p>
        </div>
      </div>

      <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
        <div class="p-3 bg-orange-50 rounded-2xl text-orange-600">
          <i class="pi pi-file-edit text-2xl"></i>
        </div>
        <div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Justificativas</p>
          <p class="text-2xl font-black text-slate-800 leading-tight lato-black">{{ resumo?.metricas.justificativas_pendentes || 0 }}</p>
        </div>
      </div>

      <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
        <div class="p-3 bg-red-50 rounded-2xl text-red-600">
          <i class="pi pi-times-circle text-2xl"></i>
        </div>
        <div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faltas Hoje</p>
          <p class="text-2xl font-black text-slate-800 leading-tight lato-black">{{ resumo?.metricas.faltas_hoje || 0 }}</p>
        </div>
      </div>
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
              <p class="text-primary-600 font-bold">
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
