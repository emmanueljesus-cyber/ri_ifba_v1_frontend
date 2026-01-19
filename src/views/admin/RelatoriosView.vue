<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { relatorioService } from '../../services/relatorios'
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
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import DatePicker from 'primevue/datepicker'

const loading = ref(false)
const relatorio = ref<any>(null)
const relatorioPresencas = ref<any>(null)
const statsDashboard = ref<any>(null)

const dataAtual = new Date()
const mesSelecionado = ref(dataAtual.getMonth() + 1)
const anoSelecionado = ref(dataAtual.getFullYear())

// Filtros para Relatório de Presenças/Extras
const filtroDataInicio = ref(new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1))
const filtroDataFim = ref(new Date())
const filtroTurno = ref('todos')

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
    const turno = filtroTurno.value === 'todos' ? undefined : filtroTurno.value
    
    const res = await relatorioService.presencas(inicio, fim, turno)
    relatorioPresencas.value = res
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
    const turno = filtroTurno.value === 'todos' ? undefined : filtroTurno.value
    
    const blob = await relatorioService.exportarGeral(inicio, fim, turno)
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

const getStatusSeverity = (status: string) => {
  if (!status) return 'secondary'
  switch (status.toLowerCase()) {
    case 'presente': return 'success'
    case 'falta_injustificada':
    case 'ausente': return 'danger'
    case 'falta_justificada':
    case 'justificado': return 'info'
    case 'cancelado': return 'warn'
    default: return 'secondary'
  }
}

const getStatusLabel = (status: string) => {
  if (!status) return ''
  return status.replace('_', ' ').toUpperCase()
}

onMounted(() => {
  carregarRelatorio()
  carregarPresencas()
  carregarDashboard()
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

const activeTab = ref('0')

watch(activeTab, (newTab) => {
  if (newTab === '0') carregarRelatorio()
  if (newTab === '1') {
    carregarPresencas()
    carregarDashboard()
  }
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader 
      title="Relatórios e Modelos" 
      subtitle="Acompanhamento de consumo e ferramentas de importação"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Relatórios' }]"
    />

    <Tabs v-model:value="activeTab">
      <TabList class="gap-4">
        <Tab value="0" class="!px-6">Geral Mensal</Tab>
        <Tab value="1" class="!px-6">Presenças e Extras</Tab>
        <Tab value="2" class="!px-6">Modelos de Importação</Tab>
      </TabList>
      <TabPanels>
        <!-- ABA 0: RELATÓRIO GERAL MENSAL -->
        <TabPanel value="0">
          <Card class="!rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-4">
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
                   <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p class="text-[10px] font-black text-emerald-600 uppercase">Presentes</p>
                      <p class="text-2xl font-black text-emerald-700">{{ statsDashboard.resumo?.total_presentes || 0 }}</p>
                   </div>
                   <div class="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <p class="text-[10px] font-black text-blue-600 uppercase">Extras</p>
                      <p class="text-2xl font-black text-blue-700">{{ statsDashboard.extras?.total || 0 }}</p>
                   </div>
                   <div class="p-4 bg-red-50 rounded-2xl border border-red-100">
                      <p class="text-[10px] font-black text-red-600 uppercase">Faltas</p>
                      <p class="text-2xl font-black text-red-700">{{ statsDashboard.resumo?.total_faltas || 0 }}</p>
                   </div>
                   <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <p class="text-[10px] font-black text-slate-600 uppercase">Aproveitamento</p>
                      <p class="text-2xl font-black text-slate-700">{{ statsDashboard.taxa_presenca?.porcentagem || '0%' }}</p>
                   </div>
                </div>

                <div class="min-w-[800px]">
                  <table class="w-full border-collapse">
                    <thead>
                      <tr class="bg-slate-800 text-white">
                        <th class="p-4 text-left font-black uppercase tracking-widest text-xs border border-slate-700 w-48">
                          {{ relatorio.mes_ano }}
                        </th>
                        <th v-for="(semana, index) in relatorio.semanas" :key="index" class="p-4 text-center font-black uppercase tracking-widest text-xs border border-slate-700">
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

                  <div class="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-6">
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
        </TabPanel>

        <!-- ABA 1: RELATÓRIO DE PRESENÇAS E EXTRAS -->
        <TabPanel value="1">
          <Card class="!rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-4">
            <template #content>
              <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div class="flex flex-wrap gap-4 items-end">
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-black uppercase text-slate-400">Início</label>
                    <DatePicker v-model="filtroDataInicio" dateFormat="dd/mm/yy" class="w-32" :locale="ptBR" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-black uppercase text-slate-400">Fim</label>
                    <DatePicker v-model="filtroDataFim" dateFormat="dd/mm/yy" class="w-32" :locale="ptBR" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Turno</label>
                    <SelectButton 
                      v-model="filtroTurno" 
                      :options="turnos" 
                      optionLabel="label" 
                      optionValue="value" 
                      :allowEmpty="false"
                      class="custom-select-button"
                    />
                  </div>
                  <Button icon="pi pi-search" label="Filtrar" @click="carregarPresencas" :loading="loading" class="!rounded-xl" />
                </div>
                <Button label="Exportar Detalhado" icon="pi pi-download" severity="info" outlined class="!rounded-xl" @click="exportarGeral" />
              </div>

              <DataTable :value="relatorioPresencas?.data || []" :loading="loading" paginator :rows="10" class="p-datatable-sm mt-4">
                <template #empty>
                  <p class="text-center p-8 text-slate-500">Nenhum registro encontrado para o período.</p>
                </template>
                <Column header="Refeição">
                  <template #body="{ data }">
                    <div class="flex items-center gap-3">
                      <div :class="data.turno === 'almoco' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'" class="w-10 h-10 rounded-xl flex items-center justify-center">
                        <i :class="data.turno === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'" class="text-xl"></i>
                      </div>
                      <div>
                        <p class="font-bold text-slate-800 leading-tight">{{ data.data }}</p>
                        <p class="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{{ data.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</p>
                      </div>
                    </div>
                  </template>
                </Column>
                <Column header="Matrícula" field="matricula"></Column>
                <Column header="Nome" field="nome"></Column>
                <Column header="Status">
                  <template #body="{ data }">
                    <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" class="!rounded-full text-[10px]" />
                  </template>
                </Column>
                <Column header="Tipo">
                  <template #body="{ data }">
                    <Tag :value="data.tipo" :severity="data.tipo === 'extra' ? 'warn' : 'info'" outlined class="!rounded-full text-[10px]" />
                  </template>
                </Column>
              </DataTable>

              <!-- Seção de Resumo Detalhado -->
              <div v-if="relatorioPresencas?.meta?.totais" class="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p class="text-[10px] font-black text-slate-400 uppercase">Total Presentes</p>
                    <p class="text-xl font-bold">{{ relatorioPresencas.meta.totais.presentes }}</p>
                  </div>
                  <div v-if="relatorioPresencas.meta.totais.extras !== undefined" class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p class="text-[10px] font-black text-slate-400 uppercase">Total Extras</p>
                    <p class="text-xl font-bold">{{ relatorioPresencas.meta.totais.extras }}</p>
                  </div>
                  <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p class="text-[10px] font-black text-slate-400 uppercase">Faltas Injust.</p>
                    <p class="text-xl font-bold">{{ relatorioPresencas.meta.totais.falta_injustificada }}</p>
                  </div>
                  <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p class="text-[10px] font-black text-slate-400 uppercase">Faltas Just.</p>
                    <p class="text-xl font-bold">{{ relatorioPresencas.meta.totais.falta_justificada }}</p>
                  </div>
              </div>
            </template>
          </Card>
        </TabPanel>

        <!-- ABA 2: MODELOS DE IMPORTAÇÃO -->
        <TabPanel value="2">
          <div class="grid md:grid-cols-2 gap-6 mt-4">
            <Card class="!rounded-3xl border border-slate-200 shadow-sm">
              <template #title>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
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
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
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

            <Card class="!rounded-3xl border border-slate-200 shadow-sm">
              <template #title>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
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
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
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
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
table th, table td {
  border-width: 1px;
}

.custom-select-button :deep(.p-button) {
  border: 0;
  background: transparent;
  color: #64748b;
  font-weight: 700;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
}

.custom-select-button :deep(.p-button.p-highlight) {
  background: #f1f5f9;
  color: #1e293b;
}

.custom-select-button :deep(.p-button:not(.p-highlight):hover) {
  background: #f8fafc;
}
</style>
