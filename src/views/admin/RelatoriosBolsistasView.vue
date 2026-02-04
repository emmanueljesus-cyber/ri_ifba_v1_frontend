<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { FilterMatchMode } from '@primevue/core/api'
import api from '../../services/api'
import { relatorioService } from '../../services/relatorios'
import { useAvatar } from '../../composables/useAvatar'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Avatar from 'primevue/avatar'
import Skeleton from 'primevue/skeleton'
import Calendar from 'primevue/calendar'
import Select from 'primevue/select'
import Chart from 'primevue/chart'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'

const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()

const bolsistas = ref<any[]>([])
const presencas = ref<any[]>([])
const loading = ref(false)
const loadingExport = ref(false)
const activeTab = ref(0)
const filtroDataInicio = ref<Date | null>(null)
const filtroDataFim = ref<Date | null>(null)
const filtroTurno = ref<string | null>(null)
const filtroStatus = ref<string | null>(null)
const filtroBolsista = ref<number | null>(null)
const filters = ref({ global: { value: null, matchMode: FilterMatchMode.CONTAINS } })

const turnoOptions = [{ label: 'Todos', value: null }, { label: 'Almoço', value: 'almoco' }, { label: 'Jantar', value: 'jantar' }]
const statusOptions = [{ label: 'Todos', value: null }, { label: 'Presente', value: 'presente' }, { label: 'Falta Justificada', value: 'falta_justificada' }, { label: 'Ausente', value: 'falta_injustificada' }]

// Computed - Estatísticas gerais
const estatisticas = computed(() => {
  const total = bolsistas.value.length
  const almoco = bolsistas.value.filter(b => b.turno_refeicao === 'almoco').length
  const jantar = bolsistas.value.filter(b => b.turno_refeicao === 'jantar').length
  const ambos = bolsistas.value.filter(b => b.turno_refeicao === 'ambos').length
  const totalFaltas = presencas.value.filter(p => ['falta_injustificada', 'ausente'].includes(p.status_da_presenca)).length
  return { total, almoco, jantar, ambos, totalFaltas }
})

// Computed - Estatísticas de presenças
const estatPresencas = computed(() => {
  const total = presencas.value.length
  const presentes = presencas.value.filter(p => p.status_da_presenca === 'presente').length
  const justificadas = presencas.value.filter(p => p.status_da_presenca === 'falta_justificada').length
  const ausentes = presencas.value.filter(p => ['falta_injustificada', 'ausente'].includes(p.status_da_presenca)).length
  const taxa = total > 0 ? ((presentes / total) * 100).toFixed(1) : '0'
  return { total, presentes, justificadas, ausentes, taxa }
})

// Computed - Ranking de faltas
const rankingFaltas = computed(() => {
  const c: Record<string, any> = {}
  presencas.value.forEach(p => {
    if (!p.user?.id) return
    if (!['falta_injustificada', 'ausente'].includes(p.status_da_presenca)) return
    if (!c[p.user.id]) {
      c[p.user.id] = { id: p.user.id, nome: p.user.nome, matricula: p.user.matricula, foto: p.user.foto, total_faltas: 0 }
    }
    c[p.user.id].total_faltas++
  })
  return Object.values(c).sort((a: any, b: any) => b.total_faltas - a.total_faltas).slice(0, 10)
})

// Computed - Estatísticas por dia da semana
const estatsDiaSemana = computed(() => {
  // Inicializa apenas dias úteis: Seg (1) a Sex (5)
  const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const dias = [1, 2, 3, 4, 5].map(idx => ({ dia: nomesDias[idx], presentes: 0, ausentes: 0, total: 0, idx }))
  
  presencas.value.forEach(p => {
    const d = p.refeicao?.data ? new Date(p.refeicao.data) : null
    if (!d || isNaN(d.getTime())) return
    const idx = d.getDay()
    
    // Filtra apenas Seg-Sex
    const diaAlvo = dias.find(item => item.idx === idx)
    if (!diaAlvo) return
    
    diaAlvo.total++
    if (p.status_da_presenca === 'presente') diaAlvo.presentes++
    else diaAlvo.ausentes++
  })
  return dias
})

// Computed - Lista de bolsistas para filtro
const bolsistasUnicos = computed(() => {
  return [{ label: 'Todos', value: null }, ...bolsistas.value.map(b => ({ label: `${b.nome} (${b.matricula})`, value: b.id }))]
})

// Computed - Presenças filtradas por bolsista
const presencasFiltradas = computed(() => {
  let lista = presencas.value
  if (filtroBolsista.value) lista = lista.filter(p => p.user?.id === filtroBolsista.value)
  if (filtroStatus.value) lista = lista.filter(p => p.status_da_presenca === filtroStatus.value || (filtroStatus.value === 'falta_injustificada' && p.status_da_presenca === 'ausente'))
  return lista
})

const faltasPorBolsista = computed(() => {
  const mapa = new Map<number, number>()
  presencas.value.forEach(p => {
    if (!p.user?.id) return
    if (!['falta_injustificada', 'ausente'].includes(p.status_da_presenca)) return
    mapa.set(p.user.id, (mapa.get(p.user.id) || 0) + 1)
  })
  return mapa
})

// Gráficos
const chartTurnoData = computed(() => ({ labels: ['Almoço', 'Jantar', 'Ambos'], datasets: [{ data: [estatisticas.value.almoco, estatisticas.value.jantar, estatisticas.value.ambos], backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6'] }] }))
const chartPresencaData = computed(() => ({ labels: ['Presentes', 'Justificadas', 'Ausentes'], datasets: [{ data: [estatPresencas.value.presentes, estatPresencas.value.justificadas, estatPresencas.value.ausentes], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'] }] }))
const chartDiaData = computed(() => ({ labels: estatsDiaSemana.value.map(d => d.dia), datasets: [{ label: 'Presentes', backgroundColor: '#10b981', data: estatsDiaSemana.value.map(d => d.presentes) }, { label: 'Ausentes', backgroundColor: '#ef4444', data: estatsDiaSemana.value.map(d => d.ausentes) }] }))

const chartOpts = { plugins: { legend: { position: 'bottom' as const } }, maintainAspectRatio: false }
const chartBarOpts = { plugins: { legend: { position: 'top' as const } }, scales: { y: { beginAtZero: true } }, maintainAspectRatio: false }

// Métodos
const carregarBolsistas = async () => {
  loading.value = true
  try { const { data } = await api.get('/admin/bolsistas'); bolsistas.value = data.data || [] }
  catch { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar bolsistas' }) }
  finally { loading.value = false }
}

const carregarPresencas = async () => {
  loading.value = true
  try {
    const dataInicio = filtroDataInicio.value ? filtroDataInicio.value.toISOString().split('T')[0] : undefined
    const dataFim = filtroDataFim.value ? filtroDataFim.value.toISOString().split('T')[0] : undefined
    const turno = filtroTurno.value || undefined
    if (!dataInicio || !dataFim) { presencas.value = []; return }
    presencas.value = await relatorioService.presencasDetalhadas(dataInicio, dataFim, turno, true) || []
  } catch { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar presenças' }) }
  finally { loading.value = false }
}

const exportarBolsistas = async () => {
  loadingExport.value = true
  try {
    const dataInicio = filtroDataInicio.value ? filtroDataInicio.value.toISOString().split('T')[0] : undefined
    const dataFim = filtroDataFim.value ? filtroDataFim.value.toISOString().split('T')[0] : undefined
    const turno = filtroTurno.value || undefined
    if (!dataInicio || !dataFim) throw new Error('Período inválido')
    const blob = await relatorioService.exportarGeral(dataInicio, dataFim, turno, 'xlsx', true)
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a'); link.href = url; link.setAttribute('download', `bolsistas_${new Date().toISOString().split('T')[0]}.xlsx`)
    document.body.appendChild(link); link.click(); link.remove()
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Exportado!' })
  } catch { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao exportar' }) }
  finally { loadingExport.value = false }
}

const limparFiltros = () => { filtroDataInicio.value = null; filtroDataFim.value = null; filtroTurno.value = null; filtroStatus.value = null; filtroBolsista.value = null; carregarPresencas() }
const formatarData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
const getDiasSemana = (dias: number[]) => { 
  const n = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; 
  // Filtra apenas dias úteis para exibição na lista, se necessário, 
  // mas aqui apenas mapeia os nomes.
  return dias?.map(d => n[d]).filter(d => d !== 'Dom' && d !== 'Sáb').join(', ') || '-' 
}
const getStatusIcon = (s: string) => s === 'presente' ? 'pi pi-check-circle text-emerald-600' : s === 'falta_justificada' ? 'pi pi-info-circle text-amber-500' : 'pi pi-times-circle text-red-500'
const getStatusLabel = (s: string) => s === 'presente' ? 'Presente' : s === 'falta_justificada' ? 'Justificada' : 'Ausente'
const getStatusColor = (s: string) => s === 'presente' ? 'text-emerald-600' : s === 'falta_justificada' ? 'text-amber-500' : 'text-red-500'

onMounted(() => {
  const h = new Date(), t = new Date(); t.setDate(h.getDate() - 30); filtroDataInicio.value = t; filtroDataFim.value = h
  carregarBolsistas(); carregarPresencas()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Relatório de Bolsistas" subtitle="Análise de frequência e estatísticas dos bolsistas" :show-back-button="true" :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Relatórios' }, { label: 'Bolsistas' }]" />

    <!-- Filtros -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
      <div class="flex flex-col gap-1"><label class="text-xs font-bold text-slate-500">Início</label><Calendar v-model="filtroDataInicio" dateFormat="dd/mm/yy" showIcon class="w-full sm:w-36" /></div>
      <div class="flex flex-col gap-1"><label class="text-xs font-bold text-slate-500">Fim</label><Calendar v-model="filtroDataFim" dateFormat="dd/mm/yy" showIcon class="w-full sm:w-36" /></div>
      <div class="flex flex-col gap-1"><label class="text-xs font-bold text-slate-500">Turno</label><Select v-model="filtroTurno" :options="turnoOptions" optionLabel="label" optionValue="value" class="w-full sm:w-32 !rounded-xl" /></div>
      <div class="flex flex-col gap-1"><label class="text-xs font-bold text-slate-500">Status</label><Select v-model="filtroStatus" :options="statusOptions" optionLabel="label" optionValue="value" class="w-full sm:w-40 !rounded-xl" /></div>
      <div class="flex gap-2 w-full sm:w-auto">
        <Button icon="pi pi-search" @click="carregarPresencas" class="!rounded-xl flex-1 sm:flex-initial" />
        <Button icon="pi pi-times" severity="secondary" text @click="limparFiltros" class="!rounded-xl" />
      </div>
      <div class="hidden sm:block flex-1"></div>
      <Button label="Exportar" icon="pi pi-file-excel" severity="success" @click="exportarBolsistas" :loading="loadingExport" class="w-full sm:w-auto !rounded-xl" />
    </div>

    <!-- Cards -->
    <div v-if="loading && bolsistas.length === 0" class="grid grid-cols-3 md:grid-cols-6 gap-3">
      <Skeleton v-for="i in 6" :key="i" height="60px" border-radius="12px" />
    </div>
    <div v-else class="grid grid-cols-3 md:grid-cols-6 gap-3">
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><i class="pi pi-users text-blue-600"></i></div><div><p class="text-xl font-black text-blue-600">{{ estatisticas.total }}</p><p class="text-[9px] text-slate-400 uppercase">Bolsistas</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><i class="pi pi-check-circle text-emerald-600"></i></div><div><p class="text-xl font-black text-emerald-600">{{ estatPresencas.presentes }}</p><p class="text-[9px] text-slate-400 uppercase">Presentes</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><i class="pi pi-info-circle text-amber-500"></i></div><div><p class="text-xl font-black text-amber-500">{{ estatPresencas.justificadas }}</p><p class="text-[9px] text-slate-400 uppercase">Justificadas</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><i class="pi pi-times-circle text-red-500"></i></div><div><p class="text-xl font-black text-red-500">{{ estatPresencas.ausentes }}</p><p class="text-[9px] text-slate-400 uppercase">Ausentes</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><i class="pi pi-exclamation-triangle text-slate-600"></i></div><div><p class="text-xl font-black text-slate-600">{{ estatisticas.totalFaltas }}</p><p class="text-[9px] text-slate-400 uppercase">Total Faltas</p></div></div>
      <div class="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl text-white flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center"><i class="pi pi-percentage"></i></div><div><p class="text-xl font-black">{{ estatPresencas.taxa }}%</p><p class="text-[9px] uppercase opacity-80">Frequência</p></div></div>
    </div>

    <!-- Abas -->
    <TabView v-model:activeIndex="activeTab" class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <TabPanel value="0" header="Visão Geral">
        <div class="p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-chart-pie text-indigo-500 mr-2"></i>Presenças</h3><div class="h-64"><Chart type="pie" :data="chartPresencaData" :options="chartOpts" class="h-full" /></div></div>
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-sun text-amber-500 mr-2"></i>Por Turno</h3><div class="h-64"><Chart type="doughnut" :data="chartTurnoData" :options="chartOpts" class="h-full" /></div></div>
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-calendar text-blue-500 mr-2"></i>Por Dia</h3><div class="h-64"><Chart type="bar" :data="chartDiaData" :options="chartBarOpts" class="h-full" /></div></div>
        </div>

      </TabPanel>

      <TabPanel value="1" header="Por Bolsista">
        <div class="p-2 sm:p-4 space-y-4">
          <Select v-model="filtroBolsista" :options="bolsistasUnicos" optionLabel="label" optionValue="value" filter class="w-full sm:w-80 !rounded-xl" placeholder="Selecione um bolsista" />
          <div v-if="!filtroBolsista" class="bg-slate-50 p-4 rounded-xl">
            <h3 class="text-sm font-bold mb-3"><i class="pi pi-exclamation-triangle text-red-500 mr-2"></i>Ranking de Faltas</h3>
            <div class="space-y-2">
              <div v-for="(b, i) in rankingFaltas" :key="i" class="flex items-center gap-3 p-2 bg-white rounded-lg border">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold" :class="i < 3 ? 'bg-red-500' : 'bg-slate-300'">{{ i + 1 }}</span>
                <Avatar v-if="b.foto" :image="b.foto" shape="circle" size="small" /><Avatar v-else :label="getInitials(b.nome)" shape="circle" size="small" :style="getAvatarStyle(b.nome)" />
                <div class="flex-1 min-w-0"><p class="font-bold text-sm truncate">{{ b.nome }}</p><p class="text-[10px] text-slate-400">{{ b.matricula }}</p></div>
                <div class="text-right flex-shrink-0"><p class="text-lg font-black text-red-500">{{ b.total_faltas }}</p><p class="text-[10px] text-slate-400">faltas</p></div>
              </div>
              <div v-if="!rankingFaltas.length" class="text-center py-4 text-slate-400"><i class="pi pi-check-circle text-2xl mb-2"></i><p>Nenhuma falta registrada</p></div>
            </div>
          </div>
          <div v-else>
            <div class="bg-blue-50 p-3 rounded-xl flex items-center justify-between mb-4"><p class="font-bold text-blue-700">{{ presencasFiltradas.length }} registros</p><Button label="Ver Todos" size="small" text @click="filtroBolsista = null" /></div>
            <DataTable :value="presencasFiltradas" paginator :rows="10" responsiveLayout="stack" breakpoint="960px">
              <Column header="Data"><template #body="{ data }"><i class="pi pi-calendar text-slate-400 mr-1"></i>{{ formatarData(data.refeicao?.data) }}</template></Column>
              <Column header="Turno"><template #body="{ data }"><i :class="data.refeicao?.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-blue-500'" class="mr-1"></i>{{ data.refeicao?.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</template></Column>
              <Column header="Status"><template #body="{ data }"><i :class="getStatusIcon(data.status_da_presenca)" class="mr-1"></i><span :class="getStatusColor(data.status_da_presenca)">{{ getStatusLabel(data.status_da_presenca) }}</span></template></Column>
            </DataTable>
          </div>
        </div>
      </TabPanel>

      <TabPanel value="2" header="Por Turno">
        <div class="p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-chart-bar text-blue-500 mr-2"></i>Distribuição</h3><div class="h-72"><Chart type="bar" :data="chartDiaData" :options="chartBarOpts" class="h-full" /></div></div>
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-table text-slate-500 mr-2"></i>Por Dia da Semana</h3>
            <div class="space-y-2">
              <div v-for="d in estatsDiaSemana" :key="d.dia" class="flex items-center gap-3 p-2 bg-white rounded-lg border">
                <span class="w-10 font-bold text-xs sm:text-sm">{{ d.dia }}</span>
                <div class="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden flex"><div class="bg-emerald-500" :style="{ width: `${(d.presentes / (d.total || 1)) * 100}%` }"></div><div class="bg-red-500" :style="{ width: `${(d.ausentes / (d.total || 1)) * 100}%` }"></div></div>
                <span class="text-[10px] sm:text-xs flex items-center gap-1"><i class="pi pi-check text-emerald-500"></i>{{ d.presentes }}</span>
                <span class="text-[10px] sm:text-xs flex items-center gap-1"><i class="pi pi-times text-red-500"></i>{{ d.ausentes }}</span>
                <span class="font-bold text-xs sm:text-sm">{{ d.total }}</span>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      <TabPanel value="3" header="Lista Bolsistas">
        <div class="p-2 sm:p-4">
          <DataTable v-if="!loading" v-model:filters="filters" :value="bolsistas" paginator :rows="15" :globalFilterFields="['nome', 'matricula', 'curso']" responsiveLayout="stack" breakpoint="960px">
            <template #header><div class="flex flex-col sm:flex-row justify-between items-center gap-3"><span class="font-bold">Bolsistas Ativos</span><IconField class="w-full sm:w-64"><InputIcon class="pi pi-search" /><InputText v-model="filters['global'].value" placeholder="Buscar..." class="w-full !rounded-xl" /></IconField></div></template>
            <template #empty><div class="text-center py-8 text-slate-400"><i class="pi pi-users text-4xl mb-2"></i><p>Nenhum bolsista</p></div></template>
            <Column field="nome" header="Estudante" :sortable="true"><template #body="{ data }"><div class="flex items-center gap-2"><Avatar v-if="data.foto_url" :image="data.foto_url" shape="circle" size="small" class="hidden sm:flex" /><Avatar v-else :label="getInitials(data.nome)" shape="circle" size="small" :style="getAvatarStyle(data.nome)" class="hidden sm:flex" /><div><p class="font-bold text-sm leading-tight">{{ data.nome }}</p><p class="text-[10px] text-slate-400 uppercase font-bold">{{ data.matricula }}</p></div></div></template></Column>
            <Column header="Curso"><template #body="{ data }"><span class="text-sm">{{ data.curso || '-' }}</span></template></Column>
            <Column header="Turno"><template #body="{ data }"><Tag :severity="data.turno_refeicao === 'almoco' ? 'success' : data.turno_refeicao === 'jantar' ? 'info' : 'secondary'" class="!rounded-full px-3 uppercase text-[10px] font-black"><i :class="data.turno_refeicao === 'almoco' ? 'pi pi-sun' : data.turno_refeicao === 'jantar' ? 'pi pi-moon' : 'pi pi-sync'" class="mr-1"></i>{{ data.turno_refeicao }}</Tag></template></Column>
            <Column header="Dias"><template #body="{ data }"><span class="text-xs text-slate-600 font-medium">{{ getDiasSemana(data.dias_semana) }}</span></template></Column>
            <Column header="Faltas" class="text-right sm:text-left"><template #body="{ data }"><Tag :value="String(faltasPorBolsista.get(data.id) || 0)" :severity="(faltasPorBolsista.get(data.id) || 0) > 3 ? 'danger' : 'info'" class="!rounded-full px-3 font-bold" /></template></Column>
          </DataTable>
          <div v-else class="p-4 space-y-6">
            <div v-for="i in 5" :key="i" class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-50 pb-4 last:border-0">
              <div class="flex items-center gap-3 w-full md:w-1/2">
                <Skeleton shape="circle" size="3rem" class="flex-shrink-0 hidden md:block" />
                <div class="space-y-2 w-full">
                  <Skeleton width="70%" height="1rem" />
                  <Skeleton width="40%" height="0.6rem" />
                </div>
              </div>
              <div class="w-full md:w-1/4 space-y-2">
                <Skeleton width="60%" height="0.875rem" />
              </div>
              <div class="flex justify-end w-full md:w-auto gap-2">
                <Skeleton width="80px" height="1.5rem" border-radius="20px" />
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      <TabPanel value="4" header="Presenças">
        <div class="p-2 sm:p-4">
          <DataTable v-if="!loading" v-model:filters="filters" :value="presencasFiltradas" paginator :rows="15" :globalFilterFields="['user.nome', 'user.matricula']" responsiveLayout="stack" breakpoint="960px">
            <template #header><div class="flex flex-col sm:flex-row justify-between items-center gap-3"><span class="font-bold">Histórico de Presenças</span><IconField class="w-full sm:w-64"><InputIcon class="pi pi-search" /><InputText v-model="filters['global'].value" placeholder="Buscar..." class="w-full !rounded-xl" /></IconField></div></template>
            <template #empty><div class="text-center py-8 text-slate-400"><i class="pi pi-inbox text-4xl mb-2"></i><p>Nenhum registro</p></div></template>
            <Column field="user.nome" header="Bolsista" :sortable="true"><template #body="{ data }"><div class="flex items-center gap-2"><Avatar :label="getInitials(data.user?.nome)" shape="circle" size="small" :style="getAvatarStyle(data.user?.nome)" class="hidden sm:flex" /><div><p class="font-bold text-sm leading-tight">{{ data.user?.nome }}</p><p class="text-[10px] text-slate-400 font-bold uppercase">{{ data.user?.matricula }}</p></div></div></template></Column>
            <Column header="Data" :sortable="true" sortField="refeicao.data"><template #body="{ data }"><div class="flex items-center gap-2"><i class="pi pi-calendar text-slate-400"></i><span class="text-sm font-medium text-slate-700">{{ formatarData(data.refeicao?.data) }}</span></div></template></Column>
            <Column header="Turno"><template #body="{ data }"><Tag :severity="data.refeicao?.turno === 'almoco' ? 'success' : 'info'" class="!rounded-full px-3 uppercase text-[10px] font-black"><i :class="data.refeicao?.turno === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'" class="mr-1"></i>{{ data.refeicao?.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</Tag></template></Column>
            <Column header="Status"><template #body="{ data }"><div class="flex items-center gap-2"><i :class="getStatusIcon(data.status_da_presenca)" class="text-sm"></i><span :class="getStatusColor(data.status_da_presenca)" class="font-bold text-xs uppercase">{{ getStatusLabel(data.status_da_presenca) }}</span></div></template></Column>
          </DataTable>
          <div v-else class="p-4 space-y-6">
            <div v-for="i in 5" :key="i" class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-50 pb-4 last:border-0">
              <div class="flex items-center gap-3 w-full md:w-1/3">
                 <Skeleton shape="circle" size="2.5rem" class="flex-shrink-0 hidden md:block" />
                 <div class="space-y-2 w-full">
                    <Skeleton width="70%" height="1rem" />
                    <Skeleton width="40%" height="0.6rem" />
                 </div>
              </div>
              <div class="w-full md:w-1/3 space-y-2">
                 <Skeleton width="60%" height="0.875rem" />
                 <Skeleton width="40%" height="0.875rem" />
              </div>
              <div class="flex justify-end w-full md:w-auto gap-2">
                <Skeleton width="80px" height="1.5rem" border-radius="20px" />
              </div>
            </div>
          </div>
        </div>
      </TabPanel>
    </TabView>
  </div>
</template>
