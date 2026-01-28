<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { FilterMatchMode } from '@primevue/core/api'
import api from '../../services/api'
import { useAvatar } from '../../composables/useAvatar'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Avatar from 'primevue/avatar'
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
const filtroBolsista = ref<string | null>(null)
const filters = ref({ global: { value: null, matchMode: FilterMatchMode.CONTAINS } })

const turnoOptions = [{ label: 'Todos', value: null }, { label: 'Almoço', value: 'almoco' }, { label: 'Jantar', value: 'jantar' }]
const statusOptions = [{ label: 'Todos', value: null }, { label: 'Presente', value: 'presente' }, { label: 'Falta Justificada', value: 'falta_justificada' }, { label: 'Ausente', value: 'falta_injustificada' }]

// Computed - Estatísticas gerais
const estatisticas = computed(() => {
  const total = bolsistas.value.length
  const almoco = bolsistas.value.filter(b => b.turno_refeicao === 'almoco').length
  const jantar = bolsistas.value.filter(b => b.turno_refeicao === 'jantar').length
  const ambos = bolsistas.value.filter(b => b.turno_refeicao === 'ambos').length
  const totalFaltas = bolsistas.value.reduce((acc, b) => acc + (b.total_faltas || 0), 0)
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
  return [...bolsistas.value]
    .filter(b => (b.total_faltas || 0) > 0)
    .sort((a, b) => (b.total_faltas || 0) - (a.total_faltas || 0))
    .slice(0, 10)
})

// Computed - Estatísticas por dia da semana
const estatsDiaSemana = computed(() => {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => ({ dia: d, presentes: 0, ausentes: 0, total: 0 }))
  presencas.value.forEach(p => {
    const d = p.refeicao?.data ? new Date(p.refeicao.data) : null
    if (!d) return
    const idx = d.getDay()
    dias[idx].total++
    if (p.status_da_presenca === 'presente') dias[idx].presentes++
    else dias[idx].ausentes++
  })
  return dias
})

// Computed - Lista de bolsistas para filtro
const bolsistasUnicos = computed(() => {
  return [{ label: 'Todos', value: null }, ...bolsistas.value.map(b => ({ label: `${b.user?.nome} (${b.user?.matricula})`, value: b.user?.id }))]
})

// Computed - Presenças filtradas por bolsista
const presencasFiltradas = computed(() => {
  let lista = presencas.value
  if (filtroBolsista.value) lista = lista.filter(p => p.user?.id === filtroBolsista.value)
  if (filtroStatus.value) lista = lista.filter(p => p.status_da_presenca === filtroStatus.value || (filtroStatus.value === 'falta_injustificada' && p.status_da_presenca === 'ausente'))
  return lista
})

// Gráficos
const chartTurnoData = computed(() => ({ labels: ['Almoço', 'Jantar', 'Ambos'], datasets: [{ data: [estatisticas.value.almoco, estatisticas.value.jantar, estatisticas.value.ambos], backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6'] }] }))
const chartPresencaData = computed(() => ({ labels: ['Presentes', 'Justificadas', 'Ausentes'], datasets: [{ data: [estatPresencas.value.presentes, estatPresencas.value.justificadas, estatPresencas.value.ausentes], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'] }] }))
const chartDiaData = computed(() => ({ labels: estatsDiaSemana.value.map(d => d.dia), datasets: [{ label: 'Presentes', backgroundColor: '#10b981', data: estatsDiaSemana.value.map(d => d.presentes) }, { label: 'Ausentes', backgroundColor: '#ef4444', data: estatsDiaSemana.value.map(d => d.ausentes) }] }))

const chartEvolucao = computed(() => {
  const p: Record<string, { pres: number, aus: number }> = {}
  presencas.value.forEach(i => { const d = i.refeicao?.data; if (!d) return; if (!p[d]) p[d] = { pres: 0, aus: 0 }; i.status_da_presenca === 'presente' ? p[d].pres++ : p[d].aus++ })
  const labels = Object.keys(p).sort().slice(-14)
  return { labels: labels.map(d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })), datasets: [{ label: 'Presentes', borderColor: '#10b981', data: labels.map(d => p[d]?.pres || 0), fill: false, tension: 0.4 }, { label: 'Ausentes', borderColor: '#ef4444', data: labels.map(d => p[d]?.aus || 0), fill: false, tension: 0.4 }] }
})

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
    const params: any = {}
    if (filtroDataInicio.value) params.data_inicio = filtroDataInicio.value.toISOString().split('T')[0]
    if (filtroDataFim.value) params.data_fim = filtroDataFim.value.toISOString().split('T')[0]
    if (filtroTurno.value) params.turno = filtroTurno.value
    const { data } = await api.get('/admin/presencas', { params }); presencas.value = data.data || []
  } catch { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar presenças' }) }
  finally { loading.value = false }
}

const exportarBolsistas = async () => {
  loadingExport.value = true
  try {
    const response = await api.get('/admin/bolsistas/export', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a'); link.href = url; link.setAttribute('download', `bolsistas_${new Date().toISOString().split('T')[0]}.xlsx`)
    document.body.appendChild(link); link.click(); link.remove()
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Exportado!' })
  } catch { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao exportar' }) }
  finally { loadingExport.value = false }
}

const limparFiltros = () => { filtroDataInicio.value = null; filtroDataFim.value = null; filtroTurno.value = null; filtroStatus.value = null; filtroBolsista.value = null; carregarPresencas() }
const formatarData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
const getDiasSemana = (dias: number[]) => { const n = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; return dias?.map(d => n[d]).join(', ') || '-' }
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
      <div class="flex flex-col gap-1"><label class="text-xs font-bold text-slate-500">Início</label><Calendar v-model="filtroDataInicio" dateFormat="dd/mm/yy" showIcon class="w-36" /></div>
      <div class="flex flex-col gap-1"><label class="text-xs font-bold text-slate-500">Fim</label><Calendar v-model="filtroDataFim" dateFormat="dd/mm/yy" showIcon class="w-36" /></div>
      <div class="flex flex-col gap-1"><label class="text-xs font-bold text-slate-500">Turno</label><Select v-model="filtroTurno" :options="turnoOptions" optionLabel="label" optionValue="value" class="w-32" /></div>
      <div class="flex flex-col gap-1"><label class="text-xs font-bold text-slate-500">Status</label><Select v-model="filtroStatus" :options="statusOptions" optionLabel="label" optionValue="value" class="w-40" /></div>
      <Button icon="pi pi-search" @click="carregarPresencas" /><Button icon="pi pi-times" severity="secondary" text @click="limparFiltros" />
      <div class="flex-1"></div>
      <Button label="Exportar" icon="pi pi-file-excel" severity="success" @click="exportarBolsistas" :loading="loadingExport" />
    </div>

    <!-- Cards -->
    <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><i class="pi pi-users text-blue-600"></i></div><div><p class="text-xl font-black text-blue-600">{{ estatisticas.total }}</p><p class="text-[9px] text-slate-400 uppercase">Bolsistas</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><i class="pi pi-check-circle text-emerald-600"></i></div><div><p class="text-xl font-black text-emerald-600">{{ estatPresencas.presentes }}</p><p class="text-[9px] text-slate-400 uppercase">Presentes</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><i class="pi pi-info-circle text-amber-500"></i></div><div><p class="text-xl font-black text-amber-500">{{ estatPresencas.justificadas }}</p><p class="text-[9px] text-slate-400 uppercase">Justificadas</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><i class="pi pi-times-circle text-red-500"></i></div><div><p class="text-xl font-black text-red-500">{{ estatPresencas.ausentes }}</p><p class="text-[9px] text-slate-400 uppercase">Ausentes</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><i class="pi pi-exclamation-triangle text-slate-600"></i></div><div><p class="text-xl font-black text-slate-600">{{ estatisticas.totalFaltas }}</p><p class="text-[9px] text-slate-400 uppercase">Total Faltas</p></div></div>
      <div class="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl text-white flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center"><i class="pi pi-percentage"></i></div><div><p class="text-xl font-black">{{ estatPresencas.taxa }}%</p><p class="text-[9px] uppercase opacity-80">Frequência</p></div></div>
    </div>

    <!-- Abas -->
    <TabView v-model:activeIndex="activeTab" class="bg-white rounded-xl shadow-sm border">
      <TabPanel header="Visão Geral">
        <div class="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-chart-pie text-indigo-500 mr-2"></i>Presenças</h3><div class="h-56"><Chart type="pie" :data="chartPresencaData" :options="chartOpts" class="h-full" /></div></div>
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-sun text-amber-500 mr-2"></i>Por Turno</h3><div class="h-56"><Chart type="doughnut" :data="chartTurnoData" :options="chartOpts" class="h-full" /></div></div>
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-calendar text-blue-500 mr-2"></i>Por Dia</h3><div class="h-56"><Chart type="bar" :data="chartDiaData" :options="chartBarOpts" class="h-full" /></div></div>
        </div>
        <div class="px-4 pb-4"><div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-chart-line text-green-500 mr-2"></i>Evolução (14 dias)</h3><div class="h-64"><Chart type="line" :data="chartEvolucao" :options="chartBarOpts" class="h-full" /></div></div></div>
      </TabPanel>

      <TabPanel header="Por Bolsista">
        <div class="p-4 space-y-4">
          <Select v-model="filtroBolsista" :options="bolsistasUnicos" optionLabel="label" optionValue="value" filter class="w-80" placeholder="Selecione um bolsista" />
          <div v-if="!filtroBolsista" class="bg-slate-50 p-4 rounded-xl">
            <h3 class="text-sm font-bold mb-3"><i class="pi pi-exclamation-triangle text-red-500 mr-2"></i>Ranking de Faltas</h3>
            <div class="space-y-2">
              <div v-for="(b, i) in rankingFaltas" :key="i" class="flex items-center gap-3 p-2 bg-white rounded-lg border">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold" :class="i < 3 ? 'bg-red-500' : 'bg-slate-300'">{{ i + 1 }}</span>
                <Avatar v-if="b.user?.foto" :image="b.user.foto" shape="circle" size="small" /><Avatar v-else :label="getInitials(b.user?.nome)" shape="circle" size="small" :style="getAvatarStyle(b.user?.nome)" />
                <div class="flex-1"><p class="font-bold text-sm">{{ b.user?.nome }}</p><p class="text-[10px] text-slate-400">{{ b.user?.matricula }}</p></div>
                <div class="text-right"><p class="text-lg font-black text-red-500">{{ b.total_faltas }}</p><p class="text-[10px] text-slate-400">faltas</p></div>
              </div>
              <div v-if="!rankingFaltas.length" class="text-center py-4 text-slate-400"><i class="pi pi-check-circle text-2xl mb-2"></i><p>Nenhuma falta registrada</p></div>
            </div>
          </div>
          <div v-else>
            <div class="bg-blue-50 p-3 rounded-xl flex items-center justify-between mb-4"><p class="font-bold text-blue-700">{{ presencasFiltradas.length }} registros</p><Button label="Ver Todos" size="small" text @click="filtroBolsista = null" /></div>
            <DataTable :value="presencasFiltradas" paginator :rows="10">
              <Column header="Data"><template #body="{ data }"><i class="pi pi-calendar text-slate-400 mr-1"></i>{{ formatarData(data.refeicao?.data) }}</template></Column>
              <Column header="Turno"><template #body="{ data }"><i :class="data.refeicao?.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-blue-500'" class="mr-1"></i>{{ data.refeicao?.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</template></Column>
              <Column header="Status"><template #body="{ data }"><i :class="getStatusIcon(data.status_da_presenca)" class="mr-1"></i><span :class="getStatusColor(data.status_da_presenca)">{{ getStatusLabel(data.status_da_presenca) }}</span></template></Column>
            </DataTable>
          </div>
        </div>
      </TabPanel>

      <TabPanel header="Por Turno">
        <div class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-chart-bar text-blue-500 mr-2"></i>Distribuição</h3><div class="h-72"><Chart type="bar" :data="chartDiaData" :options="chartBarOpts" class="h-full" /></div></div>
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-table text-slate-500 mr-2"></i>Por Dia da Semana</h3>
            <div class="space-y-2">
              <div v-for="d in estatsDiaSemana" :key="d.dia" class="flex items-center gap-3 p-2 bg-white rounded-lg border">
                <span class="w-10 font-bold">{{ d.dia }}</span>
                <div class="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden flex"><div class="bg-emerald-500" :style="{ width: `${(d.presentes / (d.total || 1)) * 100}%` }"></div><div class="bg-red-500" :style="{ width: `${(d.ausentes / (d.total || 1)) * 100}%` }"></div></div>
                <span class="text-xs flex items-center gap-1"><i class="pi pi-check text-emerald-500"></i>{{ d.presentes }}</span>
                <span class="text-xs flex items-center gap-1"><i class="pi pi-times text-red-500"></i>{{ d.ausentes }}</span>
                <span class="font-bold">{{ d.total }}</span>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      <TabPanel header="Lista Bolsistas">
        <div class="p-4">
          <DataTable v-model:filters="filters" :value="bolsistas" :loading="loading" paginator :rows="15" :globalFilterFields="['user.nome', 'user.matricula', 'user.curso']">
            <template #header><div class="flex justify-between"><span class="font-bold">Bolsistas Ativos</span><InputText v-model="filters['global'].value" placeholder="Buscar..." class="w-64" /></div></template>
            <template #empty><div class="text-center py-8 text-slate-400"><i class="pi pi-users text-4xl mb-2"></i><p>Nenhum bolsista</p></div></template>
            <Column field="user.nome" header="Estudante" :sortable="true"><template #body="{ data }"><div class="flex items-center gap-2"><Avatar v-if="data.user?.foto" :image="data.user.foto" shape="circle" size="small" /><Avatar v-else :label="getInitials(data.user?.nome)" shape="circle" size="small" :style="getAvatarStyle(data.user?.nome)" /><div><p class="font-bold text-sm">{{ data.user?.nome }}</p><p class="text-[10px] text-slate-400">{{ data.user?.matricula }}</p></div></div></template></Column>
            <Column header="Curso"><template #body="{ data }">{{ data.user?.curso || '-' }}</template></Column>
            <Column header="Turno"><template #body="{ data }"><i :class="data.turno_refeicao === 'almoco' ? 'pi pi-sun text-amber-500' : data.turno_refeicao === 'jantar' ? 'pi pi-moon text-blue-500' : 'pi pi-sync text-purple-500'" class="mr-1"></i>{{ data.turno_refeicao === 'almoco' ? 'Almoço' : data.turno_refeicao === 'jantar' ? 'Jantar' : 'Ambos' }}</template></Column>
            <Column header="Dias"><template #body="{ data }"><span class="text-sm">{{ getDiasSemana(data.dias_semana) }}</span></template></Column>
            <Column header="Faltas" :sortable="true" sortField="total_faltas"><template #body="{ data }"><span :class="(data.total_faltas || 0) > 3 ? 'text-red-600 font-bold' : 'text-slate-600'">{{ data.total_faltas || 0 }}</span></template></Column>
          </DataTable>
        </div>
      </TabPanel>

      <TabPanel header="Presenças">
        <div class="p-4">
          <DataTable v-model:filters="filters" :value="presencasFiltradas" :loading="loading" paginator :rows="15" :globalFilterFields="['user.nome', 'user.matricula']">
            <template #header><div class="flex justify-between"><span class="font-bold">Histórico de Presenças</span><InputText v-model="filters['global'].value" placeholder="Buscar..." class="w-64" /></div></template>
            <template #empty><div class="text-center py-8 text-slate-400"><i class="pi pi-inbox text-4xl mb-2"></i><p>Nenhum registro</p></div></template>
            <Column field="user.nome" header="Bolsista" :sortable="true"><template #body="{ data }"><div class="flex items-center gap-2"><Avatar :label="getInitials(data.user?.nome)" shape="circle" size="small" :style="getAvatarStyle(data.user?.nome)" /><div><p class="font-bold text-sm">{{ data.user?.nome }}</p><p class="text-[10px] text-slate-400">{{ data.user?.matricula }}</p></div></div></template></Column>
            <Column header="Data" :sortable="true" sortField="refeicao.data"><template #body="{ data }"><i class="pi pi-calendar text-slate-400 mr-1"></i>{{ formatarData(data.refeicao?.data) }}</template></Column>
            <Column header="Turno"><template #body="{ data }"><i :class="data.refeicao?.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-blue-500'" class="mr-1"></i>{{ data.refeicao?.turno === 'almoco' ? 'Alm' : 'Jan' }}</template></Column>
            <Column header="Status"><template #body="{ data }"><i :class="getStatusIcon(data.status_da_presenca)" class="mr-1"></i><span :class="getStatusColor(data.status_da_presenca)" class="font-semibold text-sm">{{ getStatusLabel(data.status_da_presenca) }}</span></template></Column>
          </DataTable>
        </div>
      </TabPanel>
    </TabView>
  </div>
</template>
