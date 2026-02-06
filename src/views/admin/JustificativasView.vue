<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useToast } from 'primevue/usetoast'
import { justificativaService } from '../../services/justificativas'
import { useAvatar } from '../../composables/useAvatar'
import PageHeader from '../../components/common/PageHeader.vue'
import type { Justificativa } from '../../types/justificativa'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Avatar from 'primevue/avatar'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Chart from 'primevue/chart'
import { computed } from 'vue'
import Skeleton from 'primevue/skeleton'

const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()
const justificativas = ref<any[]>([])
const stats = ref<any>(null)
const loading = ref(false)
const displayDialog = ref(false)
const selectedJustificativa = ref<any>(null)
const motivoRejeicao = ref('')
const loadingAction = ref(false)

const tipoOptions = ref([
  { label: 'Todos os Tipos', value: null },
  { label: 'Antecipada', value: 'antecipada' },
  { label: 'Posterior', value: 'posterior' }
])

const statusOptions = ref([
  { label: 'Todos Status', value: null },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Aprovada', value: 'aprovada' },
  { label: 'Rejeitada', value: 'rejeitada' }
])

const filters = ref({
  global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
  tipo: { value: null as string | null, matchMode: FilterMatchMode.EQUALS },
  status: { value: null as string | null, matchMode: FilterMatchMode.EQUALS }
})

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'aprovada': return 'success'
    case 'rejeitada': return 'danger'
    case 'pendente': return 'warn'
    default: return 'info'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'aprovada': return 'Aprovada'
    case 'rejeitada': return 'Rejeitada'
    case 'pendente': return 'Pendente'
    default: return status
  }
}

const getTipoSeverity = (tipo: string) => {
  return tipo === 'antecipada' ? 'info' : 'warn'
}

const carregarJustificativas = async () => {
  loading.value = true
  try {
    const params = {
      tipo: filters.value.tipo.value,
      status: filters.value.status.value
    }
    const res = await justificativaService.listarTodasAdmin(params)
    justificativas.value = res.data
    stats.value = res.meta.stats
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar justificativas' })
  } finally {
    loading.value = false
  }
}

watch([() => filters.value.tipo.value, () => filters.value.status.value], () => {
  carregarJustificativas()
})

const abrirDetalhes = (justificativa: Justificativa) => {
  selectedJustificativa.value = justificativa
  motivoRejeicao.value = ''
  displayDialog.value = true
}

const abrirAnexo = (id: number) => {
  const url = `${import.meta.env.VITE_API_BASE_URL}/admin/justificativas/${id}/anexo`
  window.open(url, '_blank')
}

const aprovar = async () => {
  if (!selectedJustificativa.value) return
  loadingAction.value = true
  try {
    await justificativaService.aprovarAdmin(selectedJustificativa.value.id)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Justificativa aprovada' })
    displayDialog.value = false
    carregarJustificativas()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao aprovar' })
  } finally {
    loadingAction.value = false
  }
}

const rejeitar = async () => {
  if (!selectedJustificativa.value || !motivoRejeicao.value) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Informe o motivo da rejeição' })
    return
  }
  loadingAction.value = true
  try {
    await justificativaService.rejeitarAdmin(selectedJustificativa.value.id, motivoRejeicao.value)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Justificativa rejeitada' })
    displayDialog.value = false
    carregarJustificativas()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao rejeitar' })
  } finally {
    loadingAction.value = false
  }
}

// Configuração de cores para os gráficos
const chartColors = {
  pendente: '#f59e0b',
  aprovada: '#10b981',
  rejeitada: '#ef4444'
}

// Dados para gráfico de pizza/donut por status
const statusChartData = computed(() => {
  if (!stats.value) return null
  
  const data = [
    stats.value.pendentes || 0,
    stats.value.aprovadas || 0,
    stats.value.rejeitadas || 0
  ]
  
  const total = data.reduce((a, b) => a + b, 0)
  if (total === 0) return null
  
  return {
    labels: ['Pendentes', 'Aprovadas', 'Rejeitadas'],
    datasets: [{
      data,
      backgroundColor: [chartColors.pendente, chartColors.aprovada, chartColors.rejeitada],
      borderWidth: 0
    }]
  }
})

const statusChartOptions = {
  plugins: {
    legend: {
      position: 'right',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: { size: 13, weight: '600' },
        generateLabels: (chart: any) => {
          const data = chart.data
          if (data.labels.length && data.datasets.length) {
            const dataset = data.datasets[0]
            const total = dataset.data.reduce((a: number, b: number) => a + b, 0)
            
            return data.labels.map((label: string, i: number) => {
              const value = dataset.data[i]
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
              
              return {
                text: `${label}: ${value} (${percentage}%)`,
                fillStyle: dataset.backgroundColor[i],
                hidden: false,
                index: i
              }
            })
          }
          return []
        }
      }
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const value = context.raw
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  },
  cutout: '65%',
  responsive: true,
  maintainAspectRatio: true
}

// Dados para gráfico de barras por status
const statusBarChartData = computed(() => {
  if (!stats.value) return null
  
  const data = [
    stats.value.pendentes || 0,
    stats.value.aprovadas || 0,
    stats.value.rejeitadas || 0
  ]
  
  const total = data.reduce((a, b) => a + b, 0)
  if (total === 0) return null
  
  return {
    labels: ['Pendentes', 'Aprovadas', 'Rejeitadas'],
    datasets: [{
      label: 'Quantidade de Justificativas',
      data,
      backgroundColor: [chartColors.pendente, chartColors.aprovada, chartColors.rejeitada],
      borderWidth: 0,
      borderRadius: 6
    }]
  }
})

const statusBarChartOptions = {
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0)
          const value = context.raw
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        font: { size: 12, weight: '600' },
        color: '#64748b'
      },
      grid: {
        color: '#e2e8f0'
      }
    },
    x: {
      ticks: {
        font: { size: 12, weight: '600' },
        color: '#64748b'
      },
      grid: {
        display: false
      }
    }
  },
  responsive: true,
  maintainAspectRatio: true
}

// Legenda externa customizada com porcentagens
const legendasComPorcentagem = computed(() => {
  if (!stats.value) return []
  
  const data = [
    { label: 'Pendentes', value: stats.value.pendentes || 0, color: chartColors.pendente },
    { label: 'Aprovadas', value: stats.value.aprovadas || 0, color: chartColors.aprovada },
    { label: 'Rejeitadas', value: stats.value.rejeitadas || 0, color: chartColors.rejeitada }
  ]
  
  const total = data.reduce((acc, item) => acc + item.value, 0)
  
  return data.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
  }))
})

onMounted(() => {
  carregarJustificativas()
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Gerenciar Justificativas"
      subtitle="Analise e decida sobre as justificativas dos alunos."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Justificativas' }]"
    />

    <!-- Seção de Gráficos -->
    <div v-if="loading && !stats" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Skeleton v-for="i in 2" :key="i" height="400px" border-radius="12px" />
    </div>
    <div v-else-if="stats" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Gráfico de Barras -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 class="text-sm font-black text-slate-700 mb-4 uppercase tracking-widest">📊 Gráfico de Barras - Status</h3>
        <Chart v-if="statusBarChartData" type="bar" :data="statusBarChartData" :options="statusBarChartOptions" class="h-64" />
        <div v-else class="flex items-center justify-center h-64 text-slate-400">
          <p>Sem dados para exibir</p>
        </div>
        <!-- Legenda externa com porcentagem -->
        <div class="mt-6 space-y-2">
          <div v-for="item in legendasComPorcentagem" :key="item.label" class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: item.color }"></div>
              <span class="text-sm font-semibold text-slate-700">{{ item.label }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-slate-900">{{ item.value }}</span>
              <span class="text-xs font-black text-slate-500 bg-slate-200 px-2 py-1 rounded-full">{{ item.percentage }}%</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Cards de Resumo -->
    <div v-if="loading && !stats" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton v-for="i in 3" :key="i" height="100px" border-radius="12px" />
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div 
        @click="filters.status.value = 'pendente'"
        class="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md cursor-pointer"
        :class="{'ring-4 ring-amber-200': filters.status.value === 'pendente'}"
      >
        <span class="text-4xl font-black text-amber-600 mb-1 leading-none">{{ stats?.pendentes || 0 }}</span>
        <div class="flex items-center gap-2 text-amber-700">
          <i class="pi pi-hourglass text-sm"></i>
          <span class="text-xs font-black uppercase tracking-widest">Pendentes</span>
        </div>
      </div>

      <div 
        @click="filters.status.value = 'aprovada'"
        class="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md cursor-pointer"
        :class="{'ring-4 ring-emerald-200': filters.status.value === 'aprovada'}"
      >
        <span class="text-4xl font-black text-emerald-600 mb-1 leading-none">{{ stats?.aprovadas || 0 }}</span>
        <div class="flex items-center gap-2 text-emerald-700">
          <i class="pi pi-check-circle text-sm"></i>
          <span class="text-xs font-black uppercase tracking-widest">Aprovadas</span>
        </div>
      </div>

      <div 
        @click="filters.status.value = 'rejeitada'"
        class="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md cursor-pointer"
        :class="{'ring-4 ring-red-200': filters.status.value === 'rejeitada'}"
      >
        <span class="text-4xl font-black text-red-600 mb-1 leading-none">{{ stats?.rejeitadas || 0 }}</span>
        <div class="flex items-center gap-2 text-red-700">
          <i class="pi pi-times-circle text-sm"></i>
          <span class="text-xs font-black uppercase tracking-widest">Rejeitadas</span>
        </div>
      </div>
    </div>

    <!-- Barra de Filtros -->
    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-end gap-4">
      <div class="flex flex-col gap-1.5 w-full sm:w-44">
        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
        <Select v-model="filters.status.value" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Status" class="w-full !rounded-xl" />
      </div>
      <div class="flex flex-col gap-1.5 w-full sm:w-44">
        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
        <Select v-model="filters.tipo.value" :options="tipoOptions" optionLabel="label" optionValue="value" placeholder="Tipo" class="w-full !rounded-xl" />
      </div>
      <Button icon="pi pi-refresh" label="Atualizar" class="!rounded-xl px-6 h-11 w-full sm:w-auto" @click="carregarJustificativas" :loading="loading" />
      
      <div class="hidden md:block flex-1"></div>
      
      <div class="flex flex-col gap-1.5 w-full md:w-64">
        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pesquisa</label>
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="filters.global.value" placeholder="Buscar aluno ou motivo..." class="!rounded-xl w-full" />
        </IconField>
      </div>
    </div>

    <!-- Lista de Justificativas -->
    <!-- Skeleton para Listagem -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 5" :key="i" class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex justify-between items-center">
          <Skeleton width="100px" height="1.5rem" border-radius="1rem" />
          <Skeleton width="80px" height="1.5rem" border-radius="1rem" />
        </div>
        <div class="flex items-center gap-3">
          <Skeleton shape="circle" size="3rem" />
          <div class="space-y-2 flex-1">
            <Skeleton width="40%" height="1.2rem" />
            <Skeleton width="20%" height="0.8rem" />
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton v-for="j in 3" :key="j" width="100%" height="3rem" border-radius="0.5rem" />
        </div>
        <Skeleton width="100%" height="4rem" border-radius="0.5rem" />
      </div>
    </div>

    <div v-else class="space-y-4">
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="h-48 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>
      </div>

      <div v-else-if="justificativas.length === 0" class="py-20 text-center bg-white rounded-xl border-2 border-dashed border-slate-200">
        <i class="pi pi-file-edit text-5xl text-slate-200 mb-4"></i>
        <p class="text-slate-500 font-medium">Nenhuma justificativa encontrada com os filtros selecionados.</p>
      </div>

      <div v-for="just in justificativas" :key="just.id" class="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm transition-all hover:shadow-md hover:border-primary-200 relative overflow-hidden group">
        <!-- Badge de Status no topo direito -->
        <div class="flex flex-col sm:flex-row sm:absolute sm:top-6 sm:right-6 items-start sm:items-center gap-3 mb-4 sm:mb-0">
          <div v-if="just.status_justificativa === 'pendente'" class="flex gap-2 w-full sm:w-auto">
            <Button label="Aprovar" icon="pi pi-check" severity="success" size="small" class="!rounded-xl !px-4 flex-1 sm:flex-initial" @click="selectedJustificativa = just; aprovar()" :loading="loadingAction && selectedJustificativa?.id === just.id" />
            <Button label="Rejeitar" icon="pi pi-times" severity="danger" size="small" outlined class="!rounded-xl !px-4 flex-1 sm:flex-initial" @click="abrirDetalhes(just)" />
          </div>
          <Tag :value="getStatusLabel(just.status_justificativa)" :severity="getStatusSeverity(just.status_justificativa)" class="!rounded-full px-4 uppercase text-[10px] font-black shadow-sm" />
        </div>

          <!-- Avatar e Info Aluno -->
          <div class="flex-1 space-y-4">
            <div class="flex items-center gap-3">
              <Avatar :label="getInitials(just.usuario?.nome || 'N/A')" shape="circle" size="normal" class="shadow-sm flex-shrink-0" :style="getAvatarStyle(just.usuario?.nome || '')" />
              <div class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span class="text-base sm:text-lg font-black text-slate-700 leading-tight">{{ just.usuario?.nome || 'Usuário não encontrado' }}</span>
                <span class="text-[10px] sm:text-xs text-slate-400 font-bold">({{ just.usuario?.matricula || '-' }})</span>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="space-y-1">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refeição:</p>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-slate-700">{{ just.refeicao?.data || '-' }}</span>
                  <span class="text-xs text-slate-400 font-medium"> - {{ just.refeicao?.turno }}</span>
                </div>
              </div>
              <div class="space-y-1">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo:</p>
                <span class="text-sm font-bold text-slate-700">{{ just.tipo }}</span>
              </div>
            </div>

            <div class="space-y-1">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo:</p>
              <p class="text-slate-600 text-sm leading-relaxed">{{ just.motivo }}</p>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-50">
              <div class="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Enviado em: {{ just.criado_em }}</span>
                <button v-if="just.tem_anexo" class="text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors" @click="abrirAnexo(just.id)">
                  <i class="pi pi-paperclip text-xs"></i>
                  Possui anexo
                </button>
              </div>
              
              <Button v-if="just.status_justificativa !== 'pendente'" label="Ver Detalhes" icon="pi pi-search-plus" text severity="secondary" size="small" class="!rounded-xl" @click="abrirDetalhes(just)" />
            </div>
          </div>
        </div>
      </div>

    <Dialog 
      v-model:visible="displayDialog" 
      :header="selectedJustificativa?.status_justificativa === 'pendente' ? 'Rejeitar Justificativa' : 'Detalhes da Justificativa'"
      :style="{ width: '90%', maxWidth: '500px' }"
      modal
      class="!rounded-xl overflow-hidden"
    >
      <div v-if="selectedJustificativa" class="space-y-6 py-4">
        <!-- Info do Aluno -->
        <div class="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
          <Avatar :label="getInitials(selectedJustificativa.usuario?.nome)" shape="circle" size="normal" class="shadow-sm" :style="getAvatarStyle(selectedJustificativa.usuario?.nome)" />
          <div>
            <p class="font-bold text-slate-800">{{ selectedJustificativa.usuario?.nome }}</p>
            <p class="text-xs text-slate-500">{{ selectedJustificativa.usuario?.matricula }}</p>
          </div>
        </div>

        <div class="flex items-center justify-between px-1">
          <div class="flex flex-col">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Falta</span>
            <Tag :value="selectedJustificativa.tipo" :severity="getTipoSeverity(selectedJustificativa.tipo)" class="!rounded-full px-3 uppercase text-[10px] font-black w-fit mt-1" />
          </div>
          <div class="flex flex-col items-end">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refeição</span>
            <span class="text-sm font-bold text-slate-700 mt-1">{{ selectedJustificativa.refeicao?.data }} - {{ selectedJustificativa.refeicao?.turno }}</span>
          </div>
        </div>

        <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motivo do Aluno:</p>
          <p class="text-slate-800 text-sm leading-relaxed">{{ selectedJustificativa.motivo }}</p>
        </div>

        <div v-if="selectedJustificativa.tem_anexo" class="flex justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl">
          <Button 
            label="Visualizar Documento" 
            icon="pi pi-external-link" 
            text 
            severity="info"
            @click="abrirAnexo(selectedJustificativa.id)" 
          />
        </div>

        <!-- Área de Rejeição (apenas para pendentes) -->
        <div v-if="selectedJustificativa.status_justificativa === 'pendente'" class="space-y-4 pt-4 border-t border-slate-100">
          <div class="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p class="text-red-700 text-sm flex items-center gap-2">
              <i class="pi pi-exclamation-triangle"></i>
              <span>Você está prestes a <strong>rejeitar</strong> esta justificativa.</span>
            </p>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-1">
              <i class="pi pi-comment"></i>
              Motivo da Rejeição *
            </label>
            <Textarea
              v-model="motivoRejeicao" 
              rows="3" 
              placeholder="Explique o motivo da rejeição para o aluno..."
              class="w-full !rounded-xl"
            />
          </div>

          <div class="flex gap-3 pt-2">
            <Button
              label="Cancelar"
              icon="pi pi-arrow-left"
              severity="secondary"
              outlined
              @click="displayDialog = false"
              class="flex-1 !rounded-xl"
            />
            <Button
              label="Confirmar Rejeição"
              icon="pi pi-times"
              severity="danger"
              @click="rejeitar"
              :loading="loadingAction"
              :disabled="!motivoRejeicao.trim()"
              class="flex-1 !rounded-xl"
            />
          </div>
        </div>

        <!-- Info para justificativas já processadas -->
        <div v-else class="space-y-4 pt-4 border-t border-slate-100">
          <div
            class="p-4 rounded-xl border text-center"
            :class="selectedJustificativa.status_justificativa === 'aprovada' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'"
          >
            <i
              class="text-3xl mb-2"
              :class="selectedJustificativa.status_justificativa === 'aprovada' ? 'pi pi-check-circle text-emerald-500' : 'pi pi-times-circle text-red-500'"
            ></i>
            <p
              class="font-medium"
              :class="selectedJustificativa.status_justificativa === 'aprovada' ? 'text-emerald-700' : 'text-red-700'"
            >
              Esta justificativa foi {{ selectedJustificativa.status_justificativa === 'aprovada' ? 'aprovada' : 'rejeitada' }}.
            </p>
            <p v-if="selectedJustificativa.observacao_admin" class="text-sm mt-2 text-slate-600">
              <strong>Observação:</strong> {{ selectedJustificativa.observacao_admin }}
            </p>
          </div>
          <Button
            label="Fechar"
            icon="pi pi-times"
            severity="secondary"
            outlined
            @click="displayDialog = false"
            class="w-full !rounded-xl"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.capitalize {
  text-transform: capitalize;
}
</style>
