<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { relatorioService } from '../../services/relatorios'
import { adminExtrasService } from '../../services/adminExtras'
import PageHeader from '../../components/common/PageHeader.vue'

// Locale pt-BR para DatePicker
const ptBR = {
  firstDayOfWeek: 0,
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
  monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  today: 'Hoje',
  clear: 'Limpar'
}
import Card from 'primevue/card'
import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import ProgressSpinner from 'primevue/progressspinner'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import Chart from 'primevue/chart'

const loading = ref(false)
const loadingExtras = ref(false)
const relatorio = ref<any>(null)
const relatorioPresencas = ref<any>(null)
const relatorioExtras = ref<any[]>([])
const estatisticasExtras = ref<any>(null)
const statsDashboard = ref<any>(null)

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

const filtersExtras = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

const dataAtual = new Date()
const mesSelecionado = ref(dataAtual.getMonth() + 1)
const anoSelecionado = ref(dataAtual.getFullYear())

// Filtros para Relatório de Presenças/Extras
const filtroDataInicio = ref(new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1))
const filtroDataFim = ref(new Date())
const filtroTurno = ref('todos')

// Funções de filtros rápidos
const aplicarFiltroHoje = () => {
  const hoje = new Date()
  filtroDataInicio.value = new Date(hoje.setHours(0, 0, 0, 0))
  filtroDataFim.value = new Date()
  if (activeTab.value === 'presencas') carregarPresencas()
  if (activeTab.value === 'extras') carregarExtras()
}

const aplicarFiltroSemana = () => {
  const hoje = new Date()
  const primeiroDia = new Date(hoje)
  primeiroDia.setDate(hoje.getDate() - hoje.getDay()) // Domingo
  filtroDataInicio.value = primeiroDia
  filtroDataFim.value = new Date()
  if (activeTab.value === 'presencas') carregarPresencas()
  if (activeTab.value === 'extras') carregarExtras()
}

const aplicarFiltroMes = () => {
  const hoje = new Date()
  filtroDataInicio.value = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  filtroDataFim.value = new Date()
  if (activeTab.value === 'presencas') carregarPresencas()
  if (activeTab.value === 'extras') carregarExtras()
}

const turnos = [
  { label: 'Todos', value: 'todos' },
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

const carregarRelatorio = async () => {
  loading.value = true
  try {
    relatorio.value = await relatorioService.semanal(mesSelecionado.value, anoSelecionado.value)
    // Se o relatório vir vazio ou sem semanas, forçamos um estado limpo
    if (relatorio.value && (!relatorio.value.semanas || relatorio.value.semanas.length === 0)) {
       relatorio.value = null
    }
  } catch (error) {
    console.error('Erro ao carregar relatório:', error)
    relatorio.value = null
  } finally {
    loading.value = false
  }
}

const carregarPresencas = async () => {
  loading.value = true
  try {
    const inicio = filtroDataInicio.value.toISOString().split('T')[0]
    const fim = filtroDataFim.value.toISOString().split('T')[0]
    const turno = filtroTurno.value === 'todos' ? '' : filtroTurno.value

    relatorioPresencas.value = await relatorioService.presencas(inicio, fim, turno || undefined)
  } catch (error) {
    console.error('Erro ao carregar presenças:', error)
  } finally {
    loading.value = false
  }
}

const carregarDashboard = async () => {
  loading.value = true
  try {
    const inicio = filtroDataInicio.value.toISOString().split('T')[0]
    const fim = filtroDataFim.value.toISOString().split('T')[0]
    statsDashboard.value = await relatorioService.dashboard({ data_inicio: inicio, data_fim: fim })
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
  } finally {
    loading.value = false
  }
}

const downloadTemplate = (tipo: string) => {
  window.open(`${import.meta.env.VITE_API_BASE_URL}/admin/${tipo}/template`, '_blank')
}

const exportarExcel = async () => {
  try {
    const blob = await relatorioService.exportarSemanal(mesSelecionado.value, anoSelecionado.value)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `relatorio_semanal_${mesSelecionado.value}_${anoSelecionado.value}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('Erro ao exportar:', error)
  }
}

const exportarGeral = async () => {
  try {
    const inicio = filtroDataInicio.value.toISOString().split('T')[0]
    const fim = filtroDataFim.value.toISOString().split('T')[0]
    const turno = filtroTurno.value === 'todos' ? '' : filtroTurno.value

    const blob = await relatorioService.exportarGeral(inicio, fim, turno || undefined)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `relatorio_geral_${inicio}_${fim}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('Erro ao exportar geral:', error)
  }
}

// ===== RELATÓRIO DE EXTRAS =====
const carregarExtras = async () => {
  loadingExtras.value = true
  try {
    const inicio = filtroDataInicio.value.toISOString().split('T')[0]
    const fim = filtroDataFim.value.toISOString().split('T')[0]
    const turno = filtroTurno.value === 'todos' ? undefined : filtroTurno.value

    const { data } = await adminExtrasService.listar({
      data: inicio,
      turno: turno as any
    })
    relatorioExtras.value = data || []

    // Carregar estatísticas
    estatisticasExtras.value = await adminExtrasService.estatisticas(inicio, fim)
  } catch (error) {
    console.error('Erro ao carregar extras:', error)
    relatorioExtras.value = []
  } finally {
    loadingExtras.value = false
  }
}

const exportarExtras = async () => {
  try {
    const inicio = filtroDataInicio.value.toISOString().split('T')[0]
    const fim = filtroDataFim.value.toISOString().split('T')[0]
    const turno = filtroTurno.value === 'todos' ? undefined : filtroTurno.value

    await adminExtrasService.exportarRelatorio({
      data_inicio: inicio,
      data_fim: fim,
      turno
    })
  } catch (error) {
    console.error('Erro ao exportar extras:', error)
  }
}

const getStatusExtras = (status: string) => {
  switch (status) {
    case 'aprovado': return { label: 'Aprovado', severity: 'success' }
    case 'inscrito': return { label: 'Aguardando', severity: 'warning' }
    case 'rejeitado': return { label: 'Rejeitado', severity: 'danger' }
    default: return { label: status, severity: 'secondary' }
  }
}

onMounted(() => {
  carregarRelatorio()
  carregarPresencas()
  carregarDashboard()
  carregarExtras()
})

const meses = [
  { label: 'Janeiro', value: 1 },
  { label: 'Fevereiro', value: 2 },
  { label: 'Março', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Maio', value: 5 },
  { label: 'Junho', value: 6 },
  { label: 'Julho', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Setembro', value: 9 },
  { label: 'Outubro', value: 10 },
  { label: 'Novembro', value: 11 },
  { label: 'Dezembro', value: 12 }
]

const anos = computed(() => {
  const anoAtual = new Date().getFullYear()
  const lista = []
  for (let i = anoAtual - 2; i <= anoAtual + 1; i++) {
    lista.push(i)
  }
  return lista
})

const categorias = [
  { key: 'presente', label: 'Presente', color: 'bg-emerald-50 text-emerald-700' },
  { key: 'extra', label: 'Extra', color: 'bg-blue-50 text-blue-700' },
  { key: 'ausente', label: 'Ausente', color: 'bg-red-50 text-red-700' },
  { key: 'atestado', label: 'Atestado', color: 'bg-orange-50 text-orange-700' },
  { key: 'justificado', label: 'Justificado', color: 'bg-amber-50 text-amber-700' },
  { key: 'n_frequenta', label: 'Ñ Frequenta', color: 'bg-slate-50 text-slate-700' }
]

const chartPalette = [
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#64748b'
]

const geralChartData = computed(() => {
  if (!relatorio.value?.totais) return null

  return {
    labels: categorias.map(cat => cat.label),
    datasets: [
      {
        data: categorias.map(cat => relatorio.value?.totais?.[cat.key] || 0),
        backgroundColor: chartPalette,
        borderWidth: 0
      }
    ]
  }
})

const geralChartOptions = {
  plugins: {
    legend: { position: 'bottom' }
  },
  cutout: '60%'
}

const presencasChartData = computed(() => {
  const totais = relatorioPresencas.value?.meta?.totais
  if (!totais) return null

  return {
    labels: ['Presentes', 'Falta Justificada', 'Falta Injustificada', 'Cancelados'],
    datasets: [
      {
        data: [
          totais.presentes || 0,
          totais.falta_justificada || 0,
          totais.falta_injustificada || 0,
          totais.cancelados || 0
        ],
        backgroundColor: ['#10b981', '#3b82f6', '#ef4444', '#f59e0b'],
        borderWidth: 0
      }
    ]
  }
})

const presencasChartOptions = {
  plugins: {
    legend: { position: 'bottom' }
  },
  cutout: '60%'
}

const extrasChartData = computed(() => {
  const resumo = estatisticasExtras.value?.resumo
  if (!resumo) return null

  return {
    labels: ['Aprovados', 'Aguardando', 'Rejeitados'],
    datasets: [
      {
        data: [resumo.aprovados || 0, resumo.aguardando || 0, resumo.rejeitados || 0],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0
      }
    ]
  }
})

const extrasChartOptions = {
  plugins: {
    legend: { position: 'bottom' }
  },
  cutout: '60%'
}

const activeTab = ref('geral')

const tabOptions = [
  { label: 'Geral Mensal', value: 'geral', icon: 'pi pi-chart-bar' },
  { label: 'Presenças', value: 'presencas', icon: 'pi pi-users' },
  { label: 'Extras', value: 'extras', icon: 'pi pi-user-plus' },
  { label: 'Modelos', value: 'modelos', icon: 'pi pi-download' }
]

watch(activeTab, (newTab) => {
  if (newTab === 'geral') carregarRelatorio()
  if (newTab === 'presencas') {
    carregarPresencas()
    carregarDashboard()
  }
  if (newTab === 'extras') {
    carregarExtras()
  }
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader 
      title="Relatórios e Modelos" 
      subtitle="Acompanhamento de consumo e ferramentas de importação"
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Relatórios' }]"
    />

    <!-- Seletor de Aba usando SelectButton -->
    <div class="flex justify-center mb-6">
      <SelectButton
        v-model="activeTab"
        :options="tabOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        class="tab-select-button"
      >
        <template #option="slotProps">
          <div class="flex items-center gap-2 px-2">
            <i :class="slotProps.option.icon"></i>
            <span class="font-bold">{{ slotProps.option.label }}</span>
          </div>
        </template>
      </SelectButton>
    </div>

    <!-- ABA: RELATÓRIO GERAL MENSAL -->
    <div v-if="activeTab === 'geral'">
      <Card class="!rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <template #content>
              <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div class="flex gap-2 items-center">
                  <Select v-model="mesSelecionado" :options="meses" optionLabel="label" optionValue="value" class="w-40" @change="carregarRelatorio" />
                  <Select v-model="anoSelecionado" :options="anos" class="w-24" @change="carregarRelatorio" />
                  <Button icon="pi pi-refresh" text rounded @click="carregarRelatorio" :loading="loading" />
                </div>
                <Button label="Exportar Excel" icon="pi pi-file-excel" severity="success" class="!rounded-xl" @click="exportarExcel" />
              </div>

              <div v-if="loading" class="flex flex-col items-center py-20">
                <ProgressSpinner />
                <p class="text-slate-500 mt-4">Gerando relatório...</p>
              </div>

              <div v-else-if="relatorio" class="overflow-x-auto">
                <!-- Resumo Rápido -->
                <div v-if="statsDashboard" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                   <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p class="text-[10px] font-black text-emerald-600 uppercase">Presentes</p>
                      <p class="text-2xl font-black text-emerald-700">{{ statsDashboard.resumo?.total_presentes || 0 }}</p>
                   </div>
                   <div class="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p class="text-[10px] font-black text-blue-600 uppercase">Extras</p>
                      <p class="text-2xl font-black text-blue-700">{{ statsDashboard.extras?.total || 0 }}</p>
                   </div>
                   <div class="p-4 bg-red-50 rounded-xl border border-red-100">
                      <p class="text-[10px] font-black text-red-600 uppercase">Faltas</p>
                      <p class="text-2xl font-black text-red-700">{{ statsDashboard.resumo?.total_faltas || 0 }}</p>
                   </div>
                   <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p class="text-[10px] font-black text-slate-600 uppercase">Aproveitamento</p>
                      <p class="text-2xl font-black text-slate-700">{{ statsDashboard.taxa_presenca?.porcentagem || '0%' }}</p>
                   </div>
                </div>

                <div v-if="geralChartData" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div class="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <h4 class="text-sm font-black text-slate-700 mb-4">Distribuição Mensal</h4>
                    <Chart type="doughnut" :data="geralChartData" :options="geralChartOptions" />
                  </div>
                  <div class="p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 class="text-sm font-black text-slate-700 mb-3">Leitura Rápida</h4>
                    <p class="text-sm text-slate-600 leading-relaxed">
                      Este gráfico consolida o total do mês por categoria para comparação imediata
                      do volume de refeições e faltas.
                    </p>
                  </div>
                </div>

                <div class="min-w-[800px]">
                  <table class="w-full border-collapse">
                    <thead>
                      <tr class="bg-slate-800 text-white">
                        <th class="p-4 text-left font-black uppercase tracking-widest text-xs border border-slate-700 w-48">
                          {{ relatorio.mes_ano }}
                        </th>
                        <th v-for="(_, index) in relatorio.semanas" :key="index" class="p-4 text-center font-black uppercase tracking-widest text-xs border border-slate-700">
                          Semana {{ index + 1 }}
                        </th>
                        <th class="p-4 text-center font-black uppercase tracking-widest text-xs border border-slate-700 bg-slate-700">
                          Total Mês
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="cat in categorias" :key="cat.key" class="hover:bg-slate-50 transition-colors">
                        <td :class="['p-4 border border-slate-200 font-bold text-sm', cat.color]">
                          {{ cat.label }}
                        </td>
                        <td v-for="(val, index) in relatorio.dados[cat.key]" :key="index" class="p-4 border border-slate-200 text-center text-sm font-medium">
                          <span v-if="val.tipo === 'texto'" class="text-[10px] text-slate-400 font-black uppercase">{{ val.valor }}</span>
                          <span v-else>{{ val.valor }}</span>
                        </td>
                        <td class="p-4 border border-slate-200 text-center text-sm font-black bg-slate-50">
                          {{ relatorio.totais[cat.key] }}
                        </td>
                      </tr>
                      <tr class="bg-slate-100 font-black">
                        <td class="p-4 border border-slate-200 text-sm">Total Mensal de Refeições</td>
                        <td :colspan="relatorio.semanas.length" class="p-4 border border-slate-200 text-center text-slate-400">------</td>
                        <td class="p-4 border border-slate-200 text-center text-lg text-emerald-700">
                          {{ relatorio.total_mensal_refeicoes }}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div class="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês de Referência</p>
                          <p class="text-xl font-black text-slate-800 capitalize">{{ relatorio.mes_texto }}</p>
                      </div>
                      <div>
                          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semanas Ativas</p>
                          <p class="text-xl font-black text-slate-800">{{ relatorio.semanas.length }}</p>
                      </div>
                      <div class="col-span-2 text-right">
                          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consumo Total Acumulado</p>
                          <p class="text-3xl font-black text-emerald-600">{{ relatorio.total_mensal_refeicoes }} <span class="text-sm font-medium text-slate-400">refeições</span></p>
                      </div>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- ABA: RELATÓRIO DE PRESENÇAS -->
        <div v-else-if="activeTab === 'presencas'">
          <Card class="!rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <template #content>
              <!-- Filtros -->
              <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div class="flex flex-wrap gap-4 items-end">
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500">Início</label>
                    <DatePicker v-model="filtroDataInicio" dateFormat="dd/mm/yy" class="w-36" :locale="ptBR" showIcon />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500">Fim</label>
                    <DatePicker v-model="filtroDataFim" dateFormat="dd/mm/yy" class="w-36" :locale="ptBR" showIcon />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500">Turno</label>
                    <SelectButton
                      v-model="filtroTurno" 
                      :options="turnos" 
                      optionLabel="label" 
                      optionValue="value" 
                      :allowEmpty="false"
                      class="custom-select-button"
                    />
                  </div>
                  <Button icon="pi pi-search" label="Buscar" severity="primary" @click="carregarPresencas" :loading="loading" class="!rounded-xl" />
                </div>
                <Button label="Exportar Excel" icon="pi pi-file-excel" severity="success" outlined class="!rounded-xl" @click="exportarGeral" />
              </div>

              <!-- Resumo -->
              <div v-if="relatorioPresencas?.meta?.totais" class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <p class="text-[10px] font-bold text-emerald-600 uppercase">Presentes</p>
                  <p class="text-2xl font-black text-emerald-700">{{ relatorioPresencas.meta.totais.presentes }}</p>
                </div>
                <div class="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <p class="text-[10px] font-bold text-blue-600 uppercase">Faltas Just.</p>
                  <p class="text-2xl font-black text-blue-700">{{ relatorioPresencas.meta.totais.falta_justificada }}</p>
                </div>
                <div class="p-4 bg-red-50 rounded-xl border border-red-100 text-center">
                  <p class="text-[10px] font-bold text-red-600 uppercase">Faltas Injust.</p>
                  <p class="text-2xl font-black text-red-700">{{ relatorioPresencas.meta.totais.falta_injustificada }}</p>
                </div>
                <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                  <p class="text-[10px] font-bold text-amber-600 uppercase">Cancelados</p>
                  <p class="text-2xl font-black text-amber-700">{{ relatorioPresencas.meta.totais.cancelados }}</p>
                </div>
                <div class="p-4 bg-slate-100 rounded-xl border border-slate-200 text-center">
                  <p class="text-[10px] font-bold text-slate-600 uppercase">Total</p>
                  <p class="text-2xl font-black text-slate-700">{{ relatorioPresencas.meta.totais.total_registros }}</p>
                </div>
              </div>

              <div v-if="presencasChartData" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div class="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <h4 class="text-sm font-black text-slate-700 mb-4">Distribuição de Presenças</h4>
                  <Chart type="doughnut" :data="presencasChartData" :options="presencasChartOptions" />
                </div>
                <div class="p-6 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 class="text-sm font-black text-slate-700 mb-3">Observações</h4>
                  <p class="text-sm text-slate-600 leading-relaxed">
                    Use esta visão para identificar rapidamente a proporção de faltas e cancelamentos
                    no período selecionado.
                  </p>
                </div>
              </div>

              <!-- Tabela de dados -->
              <DataTable
                v-model:filters="filters"
                :value="relatorioPresencas?.data || []" 
                :loading="loading" 
                paginator 
                :rows="15"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                class="p-datatable-sm"
                :globalFilterFields="['data', 'turno']"
                stripedRows
              >
                <template #header>
                  <div class="flex justify-between items-center">
                    <span class="text-lg font-bold text-slate-700">Registro de Presenças por Dia</span>
                    <InputText v-model="filters['global'].value" placeholder="Buscar..." class="!rounded-xl w-60" />
                  </div>
                </template>
                <template #empty>
                  <div class="text-center py-8 text-slate-400">
                    <i class="pi pi-inbox text-4xl mb-2"></i>
                    <p>Nenhum registro encontrado para o período.</p>
                  </div>
                </template>

                <Column header="Data" field="data" :sortable="true" :style="{ width: '120px' }">
                  <template #body="{ data }">
                    <span class="font-bold text-slate-800">{{ data.data }}</span>
                  </template>
                </Column>

                <Column header="Turno" field="turno" :sortable="true" :style="{ width: '120px' }">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <div :class="data.turno === 'almoco' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'" class="w-8 h-8 rounded-lg flex items-center justify-center">
                        <i :class="data.turno === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'"></i>
                      </div>
                      <span class="font-medium">{{ data.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</span>
                    </div>
                  </template>
                </Column>

                <Column header="Presentes" field="presentes" :sortable="true" :style="{ width: '100px' }">
                  <template #body="{ data }">
                    <Tag :value="data.presentes.toString()" severity="success" class="!rounded-full !px-3 !font-bold" />
                  </template>
                </Column>

                <Column header="Falta Just." field="falta_justificada" :sortable="true" :style="{ width: '100px' }">
                  <template #body="{ data }">
                    <Tag :value="data.falta_justificada.toString()" severity="info" class="!rounded-full !px-3" />
                  </template>
                </Column>

                <Column header="Falta Injust." field="falta_injustificada" :sortable="true" :style="{ width: '110px' }">
                  <template #body="{ data }">
                    <Tag :value="data.falta_injustificada.toString()" severity="danger" class="!rounded-full !px-3" />
                  </template>
                </Column>

                <Column header="Cancelados" field="cancelados" :sortable="true" :style="{ width: '100px' }">
                  <template #body="{ data }">
                    <Tag :value="data.cancelados.toString()" severity="warn" class="!rounded-full !px-3" />
                  </template>
                </Column>

                <Column header="Total" field="total" :sortable="true" :style="{ width: '80px' }">
                  <template #body="{ data }">
                    <span class="font-black text-slate-700">{{ data.total }}</span>
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>
        </div>

        <!-- ABA: RELATÓRIO DE EXTRAS -->
        <div v-else-if="activeTab === 'extras'">
          <Card class="!rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <template #content>
              <!-- Filtros -->
              <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div class="flex flex-wrap gap-4 items-end">
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500">Início</label>
                    <DatePicker v-model="filtroDataInicio" dateFormat="dd/mm/yy" class="w-36" :locale="ptBR" showIcon />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500">Fim</label>
                    <DatePicker v-model="filtroDataFim" dateFormat="dd/mm/yy" class="w-36" :locale="ptBR" showIcon />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500">Turno</label>
                    <SelectButton
                      v-model="filtroTurno"
                      :options="turnos"
                      optionLabel="label"
                      optionValue="value"
                      :allowEmpty="false"
                      class="custom-select-button"
                    />
                  </div>
                  <Button icon="pi pi-search" label="Buscar" severity="primary" @click="carregarExtras" :loading="loadingExtras" class="!rounded-xl" />
                </div>
                <Button label="Exportar Excel" icon="pi pi-file-excel" severity="success" outlined class="!rounded-xl" @click="exportarExtras" />
              </div>

              <!-- Estatísticas -->
              <div v-if="estatisticasExtras?.resumo" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p class="text-[10px] font-bold text-slate-600 uppercase">Total Inscritos</p>
                  <p class="text-2xl font-black text-slate-700">{{ estatisticasExtras.resumo.total_inscritos || 0 }}</p>
                </div>
                <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <p class="text-[10px] font-bold text-emerald-600 uppercase">Aprovados</p>
                  <p class="text-2xl font-black text-emerald-700">{{ estatisticasExtras.resumo.aprovados || 0 }}</p>
                </div>
                <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                  <p class="text-[10px] font-bold text-amber-600 uppercase">Aguardando</p>
                  <p class="text-2xl font-black text-amber-700">{{ estatisticasExtras.resumo.aguardando || 0 }}</p>
                </div>
                <div class="p-4 bg-red-50 rounded-xl border border-red-100 text-center">
                  <p class="text-[10px] font-bold text-red-600 uppercase">Rejeitados</p>
                  <p class="text-2xl font-black text-red-700">{{ estatisticasExtras.resumo.rejeitados || 0 }}</p>
                </div>
              </div>

              <div v-if="extrasChartData" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div class="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <h4 class="text-sm font-black text-slate-700 mb-4">Status das Inscrições</h4>
                  <Chart type="doughnut" :data="extrasChartData" :options="extrasChartOptions" />
                </div>
                <div class="p-6 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 class="text-sm font-black text-slate-700 mb-3">Leitura Rápida</h4>
                  <p class="text-sm text-slate-600 leading-relaxed">
                    Acompanhe o equilíbrio entre aprovações, aguardando e rejeições para
                    ajustar a gestão da fila de extras.
                  </p>
                </div>
              </div>

              <!-- Tabela -->
              <DataTable
                v-model:filters="filtersExtras"
                :value="relatorioExtras"
                :loading="loadingExtras"
                paginator
                :rows="15"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                class="p-datatable-sm"
                :globalFilterFields="['user.nome', 'user.matricula', 'status']"
                stripedRows
              >
                <template #header>
                  <div class="flex justify-between items-center">
                    <span class="text-lg font-bold text-slate-700">Inscrições na Fila de Extras</span>
                    <InputText v-model="filtersExtras['global'].value" placeholder="Buscar..." class="!rounded-xl w-60" />
                  </div>
                </template>
                <template #empty>
                  <div class="text-center py-8 text-slate-400">
                    <i class="pi pi-user-plus text-4xl mb-2"></i>
                    <p>Nenhuma inscrição encontrada para o período.</p>
                  </div>
                </template>

                <Column header="Estudante" field="user.nome" :sortable="true">
                  <template #body="{ data }">
                    <div class="flex flex-col">
                      <span class="font-bold text-slate-800">{{ data.user?.nome || '-' }}</span>
                      <span class="text-[10px] text-slate-400 font-black uppercase">{{ data.user?.matricula || '-' }}</span>
                    </div>
                  </template>
                </Column>

                <Column header="Data" field="refeicao.data" :sortable="true" :style="{ width: '120px' }">
                  <template #body="{ data }">
                    <span class="font-medium text-slate-700">{{ data.refeicao?.data || '-' }}</span>
                  </template>
                </Column>

                <Column header="Turno" field="refeicao.turno" :sortable="true" :style="{ width: '120px' }">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <div :class="data.refeicao?.turno === 'almoco' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'" class="w-8 h-8 rounded-lg flex items-center justify-center">
                        <i :class="data.refeicao?.turno === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'"></i>
                      </div>
                      <span class="font-medium">{{ data.refeicao?.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</span>
                    </div>
                  </template>
                </Column>

                <Column header="Status" field="status" :sortable="true" :style="{ width: '130px' }">
                  <template #body="{ data }">
                    <Tag
                      :value="getStatusExtras(data.status).label"
                      :severity="getStatusExtras(data.status).severity as any"
                      class="!rounded-full !px-3 !font-bold"
                    />
                  </template>
                </Column>

                <Column header="Inscrito em" field="inscrito_em" :sortable="true" :style="{ width: '150px' }">
                  <template #body="{ data }">
                    <span class="text-sm text-slate-600">{{ data.inscrito_em || '-' }}</span>
                  </template>
                </Column>

                <Column header="Posição" field="posicao" :sortable="true" :style="{ width: '90px' }">
                  <template #body="{ data }">
                    <span v-if="data.posicao" class="font-black text-slate-700">#{{ data.posicao }}</span>
                    <span v-else class="text-slate-400">-</span>
                  </template>
                </Column>
              </DataTable>

              <!-- Top estudantes -->
              <div v-if="estatisticasExtras?.top_estudantes?.length" class="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 class="text-sm font-bold text-slate-700 mb-3">
                  <i class="pi pi-star-fill text-amber-500 mr-2"></i>
                  Top Estudantes (mais inscrições)
                </h4>
                <div class="flex flex-wrap gap-3">
                  <div
                    v-for="(est, idx) in estatisticasExtras.top_estudantes.slice(0, 5)"
                    :key="idx"
                    class="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200"
                  >
                    <span class="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                      {{ idx + 1 }}
                    </span>
                    <div>
                      <p class="text-sm font-semibold text-slate-700">{{ est.nome }}</p>
                      <p class="text-[10px] text-slate-400">{{ est.total_inscricoes }} inscrições</p>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- ABA: MODELOS DE IMPORTAÇÃO -->
        <div v-else-if="activeTab === 'modelos'" class="grid md:grid-cols-2 gap-6">
            <Card class="!rounded-xl border border-slate-200 shadow-sm">
              <template #title>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <i class="pi pi-users"></i>
                  </div>
                  <span class="text-lg font-bold">Importação de Bolsistas</span>
                </div>
              </template>
              <template #content>
                <p class="text-sm text-slate-500 mb-6">
                  Use este modelo para importar a lista de estudantes aprovados no programa de bolsas. 
                  O sistema criará automaticamente as contas ou vinculará aos usuários existentes.
                </p>
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
                  <h4 class="text-xs font-black uppercase text-slate-400 mb-2">Colunas Necessárias:</h4>
                  <ul class="text-xs text-slate-600 space-y-1">
                    <li>• <strong>Matrícula:</strong> Número de identificação do aluno.</li>
                    <li>• <strong>Turno:</strong> almoco ou jantar.</li>
                    <li>• <strong>Dias:</strong> Lista de dias da semana (ex: 1,2,3,4,5).</li>
                  </ul>
                </div>
                <Button 
                  label="Baixar Modelo de Bolsistas" 
                  icon="pi pi-file-excel" 
                  class="w-full !rounded-xl" 
                  severity="success"
                  @click="downloadTemplate('bolsistas')"
                />
              </template>
            </Card>

            <Card class="!rounded-xl border border-slate-200 shadow-sm">
              <template #title>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <i class="pi pi-calendar"></i>
                  </div>
                  <span class="text-lg font-bold">Importação de Cardápios</span>
                </div>
              </template>
              <template #content>
                <p class="text-sm text-slate-500 mb-6">
                  Modelo para importação em lote de cardápios. Ideal para planejar o mês inteiro de uma só vez. 
                  O sistema gera as refeições para os turnos selecionados.
                </p>
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
                  <h4 class="text-xs font-black uppercase text-slate-400 mb-2">Colunas Necessárias:</h4>
                  <ul class="text-xs text-slate-600 space-y-1">
                    <li>• <strong>Data:</strong> Data do cardápio (DD/MM/AAAA).</li>
                    <li>• <strong>Prato Principal:</strong> Nome do prato principal.</li>
                    <li>• <strong>Acompanhamentos:</strong> Arroz, feijão, guarnição, etc.</li>
                  </ul>
                </div>
                <Button 
                  label="Baixar Modelo de Cardápio" 
                  icon="pi pi-file-excel" 
                  class="w-full !rounded-xl" 
                  severity="info"
                  @click="downloadTemplate('cardapios')"
                />
              </template>
            </Card>
        </div>
  </div>
</template>

<style scoped>
table th, table td {
  border-width: 1px;
}

/* Estilo para SelectButton de abas */
.tab-select-button :deep(.p-togglebutton) {
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  margin: 0 4px;
  transition: all 0.2s ease;
}

.tab-select-button :deep(.p-togglebutton:hover:not(.p-togglebutton-checked)) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.tab-select-button :deep(.p-togglebutton.p-togglebutton-checked) {
  background: var(--ifba-verde, #32a041);
  border-color: var(--ifba-verde, #32a041);
  color: white;
  box-shadow: 0 2px 8px rgba(50, 160, 65, 0.3);
}

.custom-select-button :deep(.p-togglebutton) {
  border: 0;
  background: transparent;
  color: #64748b;
  font-weight: 700;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
}

.custom-select-button :deep(.p-togglebutton.p-togglebutton-checked) {
  background: #f1f5f9;
  color: #1e293b;
}

.custom-select-button :deep(.p-togglebutton:hover:not(.p-togglebutton-checked)) {
  background: #f8fafc;
}
</style>
