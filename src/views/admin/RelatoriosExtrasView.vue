<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { FilterMatchMode } from '@primevue/core/api'
import { adminExtrasService } from '../../services/adminExtras'
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

const inscricoesRaw = ref<any[]>([])
const loading = ref(false)
const loadingExport = ref(false)
const activeTab = ref(0)
const filtroDataInicio = ref<Date | null>(null)
const filtroDataFim = ref<Date | null>(null)
const filtroTurno = ref<string | null>(null)
const filtroStatus = ref<string | null>(null)
const filtroUsuario = ref<string | null>(null)
const filters = ref({ global: { value: null, matchMode: FilterMatchMode.CONTAINS } })

const turnoOptions = [{ label: 'Todos', value: null }, { label: 'Almoço', value: 'almoco' }, { label: 'Jantar', value: 'jantar' }]
const statusOptions = [{ label: 'Todos', value: null }, { label: 'Atendido', value: 'atendido' }, { label: 'Na Fila', value: 'na_fila' }, { label: 'Não Atendido', value: 'nao_atendido' }, { label: 'Não Compareceu', value: 'nao_compareceu' }]

const inscricoes = computed(() => {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return inscricoesRaw.value.map(item => {
    const dataRef = item.refeicao?.data ? new Date(item.refeicao.data) : null
    if (dataRef) dataRef.setHours(0, 0, 0, 0)
    let statusFinal = 'na_fila', statusLabel = 'Na Fila', statusIcon = 'pi pi-clock', statusColor = 'text-amber-500'
    if (item.status === 'aprovado') { statusFinal = 'atendido'; statusLabel = 'Atendido'; statusIcon = 'pi pi-check-circle'; statusColor = 'text-emerald-600' }
    else if (item.status === 'rejeitado') { statusFinal = 'nao_compareceu'; statusLabel = 'Não Compareceu'; statusIcon = 'pi pi-times-circle'; statusColor = 'text-red-500' }
    else if (item.status === 'inscrito' && dataRef && dataRef < hoje) { statusFinal = 'nao_atendido'; statusLabel = 'Não Atendido'; statusIcon = 'pi pi-minus-circle'; statusColor = 'text-slate-400' }
    return { ...item, statusFinal, statusLabel, statusIcon, statusColor, diaSemana: dataRef ? dias[dataRef.getDay()] : '-' }
  }).filter(item => !filtroStatus.value || item.statusFinal === filtroStatus.value)
})

const estatisticas = computed(() => {
  const t = inscricoes.value.length, a = inscricoes.value.filter(i => i.statusFinal === 'atendido').length
  const na = inscricoes.value.filter(i => i.statusFinal === 'nao_atendido').length, nc = inscricoes.value.filter(i => i.statusFinal === 'nao_compareceu').length
  const nf = inscricoes.value.filter(i => i.statusFinal === 'na_fila').length
  return { total: t, atendidos: a, naoAtendidos: na, naoCompareceram: nc, naFila: nf, taxa: t > 0 ? ((a / t) * 100).toFixed(1) : '0' }
})

const rankingUsuarios = computed(() => {
  const c: Record<string, any> = {}
  inscricoes.value.forEach(i => { if (!i.user?.id) return; if (!c[i.user.id]) c[i.user.id] = { nome: i.user.nome, matricula: i.user.matricula, foto: i.user.foto, total: 0, atendidos: 0 }; c[i.user.id].total++; if (i.statusFinal === 'atendido') c[i.user.id].atendidos++ })
  return Object.values(c).sort((a: any, b: any) => b.total - a.total).slice(0, 10)
})

const usuariosUnicos = computed(() => {
  const u = new Map(); inscricoesRaw.value.forEach(i => { if (i.user?.id && !u.has(i.user.id)) u.set(i.user.id, { label: `${i.user.nome} (${i.user.matricula})`, value: i.user.id }) })
  return [{ label: 'Todos', value: null }, ...Array.from(u.values())]
})

const inscricoesPorUsuario = computed(() => filtroUsuario.value ? inscricoes.value.filter(i => i.user?.id === filtroUsuario.value) : inscricoes.value)

const estatsDiaSemana = computed(() => {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => ({ dia: d, total: 0, atendidos: 0, almoco: 0, jantar: 0 }))
  inscricoes.value.forEach(i => { const d = i.refeicao?.data ? new Date(i.refeicao.data) : null; if (!d) return; const idx = d.getDay(); dias[idx].total++; if (i.statusFinal === 'atendido') dias[idx].atendidos++; i.refeicao?.turno === 'almoco' ? dias[idx].almoco++ : dias[idx].jantar++ })
  return dias
})

const chartStatusData = computed(() => ({ labels: ['Atendidos', 'Na Fila', 'Não Atendidos', 'Não Compareceram'], datasets: [{ data: [estatisticas.value.atendidos, estatisticas.value.naFila, estatisticas.value.naoAtendidos, estatisticas.value.naoCompareceram], backgroundColor: ['#10b981', '#f59e0b', '#94a3b8', '#ef4444'] }] }))
const chartTurnoData = computed(() => ({ labels: ['Almoço', 'Jantar'], datasets: [{ data: [inscricoes.value.filter(i => i.refeicao?.turno === 'almoco').length, inscricoes.value.filter(i => i.refeicao?.turno === 'jantar').length], backgroundColor: ['#f59e0b', '#3b82f6'] }] }))
const chartDiaData = computed(() => ({ labels: estatsDiaSemana.value.map(d => d.dia), datasets: [{ label: 'Almoço', backgroundColor: '#f59e0b', data: estatsDiaSemana.value.map(d => d.almoco) }, { label: 'Jantar', backgroundColor: '#3b82f6', data: estatsDiaSemana.value.map(d => d.jantar) }] }))

const chartEvolucao = computed(() => {
  const p: Record<string, { a: number, t: number }> = {}
  inscricoes.value.forEach(i => { const d = i.refeicao?.data; if (!d) return; if (!p[d]) p[d] = { a: 0, t: 0 }; p[d].t++; if (i.statusFinal === 'atendido') p[d].a++ })
  const labels = Object.keys(p).sort().slice(-14)
  return { labels: labels.map(d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })), datasets: [{ label: 'Atendidos', borderColor: '#10b981', data: labels.map(d => p[d]?.a || 0), fill: false, tension: 0.4 }, { label: 'Total', borderColor: '#6366f1', data: labels.map(d => p[d]?.t || 0), fill: false, tension: 0.4 }] }
})

const chartOpts = { plugins: { legend: { position: 'bottom' as const } }, maintainAspectRatio: false }
const chartBarOpts = { plugins: { legend: { position: 'top' as const } }, scales: { y: { beginAtZero: true } }, maintainAspectRatio: false }

const carregarDados = async () => {
  loading.value = true
  try {
    const f: any = {}; if (filtroDataInicio.value) f.data_inicio = filtroDataInicio.value.toISOString().split('T')[0]; if (filtroDataFim.value) f.data_fim = filtroDataFim.value.toISOString().split('T')[0]; if (filtroTurno.value) f.turno = filtroTurno.value; f.per_page = 1000
    const { data } = await adminExtrasService.listar(f); inscricoesRaw.value = data
  } catch { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar' }) } finally { loading.value = false }
}

const exportarExcel = async () => {
  loadingExport.value = true
  try {
    const params: any = {}
    if (filtroDataInicio.value) params.data_inicio = filtroDataInicio.value.toISOString().split('T')[0]
    if (filtroDataFim.value) params.data_fim = filtroDataFim.value.toISOString().split('T')[0]
    if (filtroTurno.value) params.turno = filtroTurno.value
    await adminExtrasService.exportarRelatorio(params)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Exportado!' })
  } catch {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha' })
  } finally {
    loadingExport.value = false
  }
}
const limparFiltros = () => { filtroDataInicio.value = null; filtroDataFim.value = null; filtroTurno.value = null; filtroStatus.value = null; filtroUsuario.value = null; carregarDados() }
const formatarData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
const formatarDataHora = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'

onMounted(() => { const h = new Date(), t = new Date(); t.setDate(h.getDate() - 30); filtroDataInicio.value = t; filtroDataFim.value = h; carregarDados() })
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Relatório de Extras" subtitle="Análise completa com gráficos e estatísticas" :show-back-button="true" :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Relatórios' }, { label: 'Extras' }]" />

    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
      <div class="flex flex-col gap-1"><label class="text-xs font-bold text-slate-500">Início</label><Calendar v-model="filtroDataInicio" dateFormat="dd/mm/yy" showIcon class="w-36" /></div>
      <div class="flex flex-col gap-1"><label class="text-xs font-bold text-slate-500">Fim</label><Calendar v-model="filtroDataFim" dateFormat="dd/mm/yy" showIcon class="w-36" /></div>
      <div class="flex flex-col gap-1"><label class="text-xs font-bold text-slate-500">Turno</label><Select v-model="filtroTurno" :options="turnoOptions" optionLabel="label" optionValue="value" class="w-32" /></div>
      <div class="flex flex-col gap-1"><label class="text-xs font-bold text-slate-500">Status</label><Select v-model="filtroStatus" :options="statusOptions" optionLabel="label" optionValue="value" class="w-40" /></div>
      <Button icon="pi pi-search" @click="carregarDados" /><Button icon="pi pi-times" severity="secondary" text @click="limparFiltros" />
      <div class="flex-1"></div>
      <Button label="Exportar" icon="pi pi-file-excel" severity="success" @click="exportarExcel" :loading="loadingExport" />
    </div>

    <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><i class="pi pi-list text-slate-600"></i></div><div><p class="text-xl font-black">{{ estatisticas.total }}</p><p class="text-[9px] text-slate-400 uppercase">Total</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><i class="pi pi-check-circle text-emerald-600"></i></div><div><p class="text-xl font-black text-emerald-600">{{ estatisticas.atendidos }}</p><p class="text-[9px] text-slate-400 uppercase">Atendidos</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><i class="pi pi-clock text-amber-500"></i></div><div><p class="text-xl font-black text-amber-500">{{ estatisticas.naFila }}</p><p class="text-[9px] text-slate-400 uppercase">Na Fila</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><i class="pi pi-minus-circle text-slate-400"></i></div><div><p class="text-xl font-black text-slate-500">{{ estatisticas.naoAtendidos }}</p><p class="text-[9px] text-slate-400 uppercase">Não Atend.</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><i class="pi pi-times-circle text-red-500"></i></div><div><p class="text-xl font-black text-red-500">{{ estatisticas.naoCompareceram }}</p><p class="text-[9px] text-slate-400 uppercase">Não Comp.</p></div></div>
      <div class="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl text-white flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center"><i class="pi pi-percentage"></i></div><div><p class="text-xl font-black">{{ estatisticas.taxa }}%</p><p class="text-[9px] uppercase opacity-80">Taxa</p></div></div>
    </div>

    <TabView v-model:activeIndex="activeTab" class="bg-white rounded-xl shadow-sm border">
      <TabPanel header="Visão Geral">
        <div class="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-chart-pie text-indigo-500 mr-2"></i>Status</h3><div class="h-56"><Chart type="pie" :data="chartStatusData" :options="chartOpts" class="h-full" /></div></div>
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-sun text-amber-500 mr-2"></i>Turno</h3><div class="h-56"><Chart type="doughnut" :data="chartTurnoData" :options="chartOpts" class="h-full" /></div></div>
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-calendar text-blue-500 mr-2"></i>Dia da Semana</h3><div class="h-56"><Chart type="bar" :data="chartDiaData" :options="chartBarOpts" class="h-full" /></div></div>
        </div>
        <div class="px-4 pb-4"><div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-chart-line text-green-500 mr-2"></i>Evolução (14 dias)</h3><div class="h-64"><Chart type="line" :data="chartEvolucao" :options="chartBarOpts" class="h-full" /></div></div></div>
      </TabPanel>

      <TabPanel header="Por Usuário">
        <div class="p-4 space-y-4">
          <Select v-model="filtroUsuario" :options="usuariosUnicos" optionLabel="label" optionValue="value" filter class="w-80" placeholder="Selecione um estudante" />
          <div v-if="!filtroUsuario" class="bg-slate-50 p-4 rounded-xl">
            <h3 class="text-sm font-bold mb-3"><i class="pi pi-trophy text-amber-500 mr-2"></i>Top 10 Usuários</h3>
            <div class="space-y-2">
              <div v-for="(u, i) in rankingUsuarios" :key="i" class="flex items-center gap-3 p-2 bg-white rounded-lg border">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold" :class="i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300'">{{ i + 1 }}</span>
                <Avatar v-if="u.foto" :image="u.foto" shape="circle" size="small" /><Avatar v-else :label="getInitials(u.nome)" shape="circle" size="small" :style="getAvatarStyle(u.nome)" />
                <div class="flex-1"><p class="font-bold text-sm">{{ u.nome }}</p><p class="text-[10px] text-slate-400">{{ u.matricula }}</p></div>
                <div class="text-right"><p class="text-lg font-black text-indigo-600">{{ u.total }}</p><p class="text-[10px] text-slate-400">{{ u.atendidos }} atend.</p></div>
              </div>
            </div>
          </div>
          <div v-else>
            <div class="bg-indigo-50 p-3 rounded-xl flex items-center justify-between mb-4"><p class="font-bold text-indigo-700">{{ inscricoesPorUsuario.length }} inscrições</p><Button label="Ver Todos" size="small" text @click="filtroUsuario = null" /></div>
            <DataTable :value="inscricoesPorUsuario" paginator :rows="10">
              <Column header="Data"><template #body="{ data }"><i class="pi pi-calendar text-slate-400 mr-1"></i>{{ formatarData(data.refeicao?.data) }}</template></Column>
              <Column header="Dia"><template #body="{ data }">{{ data.diaSemana }}</template></Column>
              <Column header="Turno"><template #body="{ data }"><i :class="data.refeicao?.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-blue-500'" class="mr-1"></i>{{ data.refeicao?.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</template></Column>
              <Column header="Status"><template #body="{ data }"><i :class="[data.statusIcon, data.statusColor]" class="mr-1"></i><span :class="data.statusColor">{{ data.statusLabel }}</span></template></Column>
            </DataTable>
          </div>
        </div>
      </TabPanel>

      <TabPanel header="Por Dia">
        <div class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-chart-bar text-blue-500 mr-2"></i>Gráfico</h3><div class="h-72"><Chart type="bar" :data="chartDiaData" :options="chartBarOpts" class="h-full" /></div></div>
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-table text-slate-500 mr-2"></i>Detalhes</h3>
            <div class="space-y-2">
              <div v-for="d in estatsDiaSemana" :key="d.dia" class="flex items-center gap-3 p-2 bg-white rounded-lg border">
                <span class="w-10 font-bold">{{ d.dia }}</span>
                <div class="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden flex"><div class="bg-amber-500" :style="{ width: `${(d.almoco / (d.total || 1)) * 100}%` }"></div><div class="bg-blue-500" :style="{ width: `${(d.jantar / (d.total || 1)) * 100}%` }"></div></div>
                <span class="text-xs flex items-center gap-1"><i class="pi pi-sun text-amber-500"></i>{{ d.almoco }}</span>
                <span class="text-xs flex items-center gap-1"><i class="pi pi-moon text-blue-500"></i>{{ d.jantar }}</span>
                <span class="font-bold">{{ d.total }}</span>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      <TabPanel header="Detalhado">
        <div class="p-4">
          <DataTable v-model:filters="filters" :value="inscricoes" :loading="loading" paginator :rows="15" :globalFilterFields="['user.nome', 'user.matricula']">
            <template #header><div class="flex justify-between"><span class="font-bold">Histórico Completo</span><InputText v-model="filters['global'].value" placeholder="Buscar..." class="w-64" /></div></template>
            <template #empty><div class="text-center py-8 text-slate-400"><i class="pi pi-inbox text-4xl mb-2"></i><p>Nenhum registro</p></div></template>
            <Column field="user.nome" header="Estudante" :sortable="true"><template #body="{ data }"><div class="flex items-center gap-2"><Avatar v-if="data.user?.foto" :image="data.user.foto" shape="circle" size="small" /><Avatar v-else :label="getInitials(data.user?.nome)" shape="circle" size="small" :style="getAvatarStyle(data.user?.nome)" /><div><p class="font-bold text-sm">{{ data.user?.nome }}</p><p class="text-[10px] text-slate-400">{{ data.user?.matricula }}</p></div></div></template></Column>
            <Column header="Data" :sortable="true" sortField="refeicao.data"><template #body="{ data }"><i class="pi pi-calendar text-slate-400 mr-1"></i>{{ formatarData(data.refeicao?.data) }}</template></Column>
            <Column header="Dia"><template #body="{ data }">{{ data.diaSemana }}</template></Column>
            <Column header="Turno"><template #body="{ data }"><i :class="data.refeicao?.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-blue-500'" class="mr-1"></i>{{ data.refeicao?.turno === 'almoco' ? 'Alm' : 'Jan' }}</template></Column>
            <Column header="Inscrito"><template #body="{ data }"><i class="pi pi-clock text-slate-400 mr-1"></i>{{ formatarDataHora(data.inscrito_em) }}</template></Column>
            <Column header="Status"><template #body="{ data }"><i :class="[data.statusIcon, data.statusColor]" class="mr-1"></i><span :class="data.statusColor" class="font-semibold text-sm">{{ data.statusLabel }}</span></template></Column>
          </DataTable>
        </div>
      </TabPanel>
    </TabView>
  </div>
</template>
