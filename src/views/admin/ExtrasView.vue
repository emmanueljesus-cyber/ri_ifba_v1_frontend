<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { adminExtrasService, type FilaExtraAdmin, type EstatisticasExtras } from '../../services/adminExtras'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Card from 'primevue/card'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Calendar from 'primevue/calendar'

const toast = useToast()

// Estado
const inscricoes = ref<FilaExtraAdmin[]>([])
const inscricoesHoje = ref<FilaExtraAdmin[]>([])
const estatisticasHojeBackend = ref<{total_inscritos: number, aprovados: number, aguardando: number, rejeitados: number} | null>(null)
const estatisticas = ref<EstatisticasExtras | null>(null)
const loading = ref(false)
const loadingHoje = ref(false)
const loadingEstatisticas = ref(false)

// Filtro de turno para hoje
const turnoHojeFiltro = ref<'almoco' | 'jantar'>('almoco')

// Filtros
const filtroData = ref<Date | null>(null)
const filtroTurno = ref<string | null>(null)
const filtroStatus = ref<string | null>(null)

// Dialogs
const displayRejeitar = ref(false)
const motivoRejeicao = ref('')
const inscricaoSelecionada = ref<FilaExtraAdmin | null>(null)
const displayRelatorio = ref(false)

// Controle de Tabs
const tabAtiva = ref('0')

// Filtros para relatório
const relatorioDataInicio = ref<Date | null>(null)
const relatorioDataFim = ref<Date | null>(null)
const relatorioTurno = ref<string | null>(null)
const loadingExport = ref(false)

// Seleção para ações em lote
const inscricoesSelecionadas = ref<FilaExtraAdmin[]>([])

const turnoOptions = [
  { label: 'Todos', value: null },
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

const statusOptions = [
  { label: 'Todos', value: null },
  { label: 'Aguardando', value: 'inscrito' },
  { label: 'Aprovado', value: 'aprovado' },
  { label: 'Rejeitado', value: 'rejeitado' }
]

// Computed
// Helper para extrair turno (pode vir de refeicao.turno ou diretamente de turno)
const getTurno = (inscricao: FilaExtraAdmin): string => {
  return inscricao.refeicao?.turno || (inscricao as any).turno || ''
}

const inscricoesHojeFiltradas = computed(() => {
  return inscricoesHoje.value.filter(i => getTurno(i) === turnoHojeFiltro.value)
})

const estatisticasHoje = computed(() => {
  const lista = inscricoesHojeFiltradas.value
  if (!lista.length) return { total: 0, confirmados: 0, aguardando: 0, rejeitados: 0 }
  return {
    total: lista.length,
    confirmados: lista.filter(i => i.status === 'aprovado').length,
    aguardando: lista.filter(i => i.status === 'inscrito').length,
    rejeitados: lista.filter(i => i.status === 'rejeitado').length
  }
})

const estatisticasAlmoco = computed(() => {
  const lista = inscricoesHoje.value.filter(i => getTurno(i) === 'almoco')
  return {
    total: lista.length,
    aguardando: lista.filter(i => i.status === 'inscrito').length
  }
})

const estatisticasJantar = computed(() => {
  const lista = inscricoesHoje.value.filter(i => getTurno(i) === 'jantar')
  return {
    total: lista.length,
    aguardando: lista.filter(i => i.status === 'inscrito').length
  }
})

// Métodos
const carregarInscricoes = async () => {
  loading.value = true
  try {
    const filtros: any = {}
    if (filtroData.value) {
      filtros.data = filtroData.value.toISOString().split('T')[0]
    }
    if (filtroTurno.value) filtros.turno = filtroTurno.value
    if (filtroStatus.value) filtros.status = filtroStatus.value

    const { data } = await adminExtrasService.listar(filtros)
    inscricoes.value = data
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar inscrições' })
  } finally {
    loading.value = false
  }
}

const carregarInscricoesHoje = async () => {
  loadingHoje.value = true
  try {
    const { data, meta } = await adminExtrasService.listarHoje()
    inscricoesHoje.value = data
    // Salvar estatísticas do backend (inclui rejeitados que não vêm na lista)
    if (meta?.estatisticas) {
      estatisticasHojeBackend.value = meta.estatisticas
    }
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar inscrições do dia' })
  } finally {
    loadingHoje.value = false
  }
}

const carregarEstatisticas = async () => {
  loadingEstatisticas.value = true
  try {
    estatisticas.value = await adminExtrasService.estatisticas()
  } catch (err) {
    console.error('Erro ao carregar estatísticas:', err)
  } finally {
    loadingEstatisticas.value = false
  }
}

const confirmar = async (inscricao: FilaExtraAdmin) => {
  try {
    await adminExtrasService.aprovar(inscricao.id)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Inscrição confirmada' })
    carregarInscricoesHoje()
    carregarInscricoes()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao confirmar inscrição' })
  }
}

const abrirDialogRejeitar = (inscricao: FilaExtraAdmin) => {
  inscricaoSelecionada.value = inscricao
  motivoRejeicao.value = ''
  displayRejeitar.value = true
}

const confirmarRejeicao = async () => {
  if (!inscricaoSelecionada.value) return
  try {
    await adminExtrasService.rejeitar(inscricaoSelecionada.value.id, motivoRejeicao.value)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Inscrição rejeitada' })
    displayRejeitar.value = false
    carregarInscricoesHoje()
    carregarInscricoes()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao rejeitar inscrição' })
  }
}

const confirmarPresenca = async (inscricao: FilaExtraAdmin) => {
  try {
    await adminExtrasService.confirmarPresenca(inscricao.id)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Presença confirmada' })
    carregarInscricoesHoje()
    carregarInscricoes()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao confirmar presença' })
  }
}

const remover = async (inscricao: FilaExtraAdmin) => {
  try {
    await adminExtrasService.remover(inscricao.id)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Inscrição removida' })
    carregarInscricoesHoje()
    carregarInscricoes()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao remover inscrição' })
  }
}

const confirmarSelecionados = async () => {
  if (!inscricoesSelecionadas.value.length) return
  const ids = inscricoesSelecionadas.value
    .filter(i => i.status === 'inscrito')
    .map(i => i.id)

  if (!ids.length) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Nenhuma inscrição pendente selecionada' })
    return
  }

  try {
    const result = await adminExtrasService.aprovarLote(ids)
    toast.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: `${result.aprovados} inscrições confirmadas`
    })
    inscricoesSelecionadas.value = []
    carregarInscricoesHoje()
    carregarInscricoes()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao confirmar em lote' })
  }
}

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'aprovado': return 'success'
    case 'rejeitado': return 'danger'
    case 'inscrito': return 'warn'
    default: return 'secondary'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'aprovado': return 'Confirmado'
    case 'rejeitado': return 'Rejeitado'
    case 'inscrito': return 'Aguardando'
    default: return status
  }
}

const formatarTurno = (turno: string) => {
  return turno === 'almoco' ? 'Almoço' : 'Jantar'
}

const abrirRelatorio = () => {
  relatorioDataInicio.value = new Date()
  relatorioDataFim.value = new Date()
  relatorioTurno.value = null
  displayRelatorio.value = true
}

const exportarRelatorioExcel = async () => {
  loadingExport.value = true
  try {
    const params: any = {}
    if (relatorioDataInicio.value) {
      params.data_inicio = relatorioDataInicio.value.toISOString().split('T')[0]
    }
    if (relatorioDataFim.value) {
      params.data_fim = relatorioDataFim.value.toISOString().split('T')[0]
    }
    if (relatorioTurno.value) {
      params.turno = relatorioTurno.value
    }

    await adminExtrasService.exportarRelatorio(params)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Relatório exportado com sucesso!' })
    displayRelatorio.value = false
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao exportar relatório' })
  } finally {
    loadingExport.value = false
  }
}

onMounted(() => {
  carregarInscricoesHoje()
  carregarInscricoes()
  carregarEstatisticas()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Cabeçalho -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Fila de Extras</h1>
        <p class="text-slate-500">Gerencie as inscrições de estudantes não-bolsistas para refeições extras.</p>
      </div>
      <Button
        label="Gerar Relatório"
        icon="pi pi-file-excel"
        severity="success"
        @click="abrirRelatorio"
      />
    </div>

    <!-- Seletor de Turno -->
    <div class="flex gap-2">
      <Button
        :label="`🌅 Almoço (${estatisticasAlmoco.total})`"
        :severity="turnoHojeFiltro === 'almoco' ? 'success' : 'secondary'"
        :outlined="turnoHojeFiltro !== 'almoco'"
        @click="turnoHojeFiltro = 'almoco'"
        class="flex-1"
      />
      <Button
        :label="`🌙 Jantar (${estatisticasJantar.total})`"
        :severity="turnoHojeFiltro === 'jantar' ? 'info' : 'secondary'"
        :outlined="turnoHojeFiltro !== 'jantar'"
        @click="turnoHojeFiltro = 'jantar'"
        class="flex-1"
      />
    </div>

    <!-- Cards de Estatísticas do Turno Selecionado -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card class="bg-blue-50 border-blue-200">
        <template #content>
          <div class="text-center">
            <p class="text-3xl font-bold text-blue-600">{{ estatisticasHoje.total }}</p>
            <p class="text-sm text-blue-800">Inscritos ({{ turnoHojeFiltro === 'almoco' ? 'Almoço' : 'Jantar' }})</p>
          </div>
        </template>
      </Card>
      <Card class="bg-amber-50 border-amber-200">
        <template #content>
          <div class="text-center">
            <p class="text-3xl font-bold text-amber-600">{{ estatisticasHoje.aguardando }}</p>
            <p class="text-sm text-amber-800">Aguardando</p>
          </div>
        </template>
      </Card>
      <Card class="bg-green-50 border-green-200">
        <template #content>
          <div class="text-center">
            <p class="text-3xl font-bold text-green-600">{{ estatisticasHoje.confirmados }}</p>
            <p class="text-sm text-green-800">Confirmados</p>
          </div>
        </template>
      </Card>
      <Card class="bg-red-50 border-red-200">
        <template #content>
          <div class="text-center">
            <p class="text-3xl font-bold text-red-600">{{ estatisticasHojeBackend?.rejeitados || 0 }}</p>
            <p class="text-sm text-red-800">Rejeitados (Total)</p>
          </div>
        </template>
      </Card>
    </div>

    <!-- Tabs -->
    <Tabs v-model:value="tabAtiva">
      <TabList>
        <Tab value="0">
          <i class="pi pi-list mr-2"></i>
          Inscrições de Hoje
        </Tab>
        <Tab value="1">
          <i class="pi pi-history mr-2"></i>
          Histórico
        </Tab>
      </TabList>
      <TabPanels>
        <!-- Tab: Inscrições de Hoje -->
        <TabPanel value="0">
          <div class="card bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-slate-700">
                Fila do {{ turnoHojeFiltro === 'almoco' ? 'Almoço' : 'Jantar' }}
              </h3>
              <Button
                v-if="inscricoesSelecionadas.length > 0"
                :label="`Confirmar Selecionados (${inscricoesSelecionadas.filter(i => i.status === 'inscrito').length})`"
                icon="pi pi-check-circle"
                severity="success"
                @click="confirmarSelecionados"
              />
            </div>

            <DataTable
              :value="inscricoesHojeFiltradas"
              :loading="loadingHoje"
              v-model:selection="inscricoesSelecionadas"
              dataKey="id"
              paginator
              :rows="10"
              emptyMessage="Nenhuma inscrição para este turno"
            >
              <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
              <Column field="posicao" header="Posição" :sortable="true">
                <template #body="{ data }">
                  <span v-if="data.posicao && data.status === 'inscrito'" class="font-bold text-lg text-emerald-600">#{{ data.posicao }}</span>
                  <span v-else-if="data.status === 'aprovado'" class="text-sm text-green-600 font-medium">
                    <i class="pi pi-check-circle mr-1"></i>OK
                  </span>
                  <span v-else class="text-slate-400">-</span>
                </template>
              </Column>
              <Column field="user.nome" header="Estudante" :sortable="true">
                <template #body="{ data }">
                  <div>
                    <p class="font-medium">{{ data.user.nome }}</p>
                    <p class="text-sm text-slate-500">{{ data.user.matricula }}</p>
                  </div>
                </template>
              </Column>
              <Column field="inscrito_em" header="Inscrito em" :sortable="true">
                <template #body="{ data }">
                  {{ data.inscrito_em }}
                </template>
              </Column>
              <Column field="status" header="Status" :sortable="true">
                <template #body="{ data }">
                  <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
                </template>
              </Column>
              <Column header="Ações" headerStyle="width: 10rem">
                <template #body="{ data }">
                  <div class="flex gap-1">
                    <Button
                      v-if="data.status === 'inscrito'"
                      icon="pi pi-check"
                      severity="success"
                      text
                      rounded
                      title="Confirmar"
                      @click="confirmar(data)"
                    />
                    <Button
                      v-if="data.status === 'inscrito'"
                      icon="pi pi-times"
                      severity="danger"
                      text
                      rounded
                      title="Rejeitar"
                      @click="abrirDialogRejeitar(data)"
                    />
                    <Button
                      v-if="data.status === 'aprovado'"
                      icon="pi pi-user-check"
                      severity="info"
                      text
                      rounded
                      title="Registrar Presença"
                      @click="confirmarPresenca(data)"
                    />
                    <Button
                      icon="pi pi-trash"
                      severity="secondary"
                      text
                      rounded
                      title="Remover"
                      @click="remover(data)"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </TabPanel>

        <!-- Tab: Histórico Geral -->
        <TabPanel value="1">
          <div class="card bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <!-- Filtros -->
            <div class="flex gap-4 mb-4 flex-wrap">
              <div class="flex flex-col gap-1">
                <label class="text-sm text-slate-600">Data</label>
                <Calendar v-model="filtroData" dateFormat="dd/mm/yy" showIcon @update:modelValue="carregarInscricoes" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm text-slate-600">Turno</label>
                <Select v-model="filtroTurno" :options="turnoOptions" optionLabel="label" optionValue="value" placeholder="Todos" @update:modelValue="carregarInscricoes" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm text-slate-600">Status</label>
                <Select v-model="filtroStatus" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Todos" @update:modelValue="carregarInscricoes" />
              </div>
              <div class="flex items-end">
                <Button label="Limpar Filtros" severity="secondary" text @click="filtroData = null; filtroTurno = null; filtroStatus = null; carregarInscricoes()" />
              </div>
            </div>

            <DataTable
              :value="inscricoes"
              :loading="loading"
              paginator
              :rows="15"
              emptyMessage="Nenhuma inscrição encontrada"
            >
              <Column field="user.nome" header="Estudante" :sortable="true">
                <template #body="{ data }">
                  <div>
                    <p class="font-medium">{{ data.user.nome }}</p>
                    <p class="text-sm text-slate-500">{{ data.user.matricula }}</p>
                  </div>
                </template>
              </Column>
              <Column field="refeicao.data" header="Data" :sortable="true"></Column>
              <Column field="refeicao.turno" header="Turno">
                <template #body="{ data }">
                  <Tag :value="formatarTurno(data.refeicao?.turno)" severity="info" />
                </template>
              </Column>
              <Column field="status" header="Status" :sortable="true">
                <template #body="{ data }">
                  <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
                </template>
              </Column>
            </DataTable>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <!-- Dialog: Rejeitar Inscrição -->
    <Dialog v-model:visible="displayRejeitar" header="Rejeitar Inscrição" modal :style="{ width: '400px' }">
      <div class="space-y-4">
        <p class="text-slate-600">
          Você está prestes a rejeitar a inscrição de
          <strong>{{ inscricaoSelecionada?.user?.nome }}</strong>.
        </p>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Motivo (opcional)</label>
          <InputText v-model="motivoRejeicao" class="w-full" placeholder="Informe o motivo da rejeição" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="displayRejeitar = false" />
        <Button label="Rejeitar" severity="danger" @click="confirmarRejeicao" />
      </template>
    </Dialog>

    <!-- Dialog: Gerar Relatório -->
    <Dialog v-model:visible="displayRelatorio" header="Gerar Relatório de Fila de Extras" modal :style="{ width: '500px' }">
      <div class="space-y-6 py-2">
        <p class="text-slate-600 text-sm">
          Configure o período e filtros para gerar o relatório de inscrições na fila de extras.
        </p>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-700">Data Início</label>
            <Calendar v-model="relatorioDataInicio" dateFormat="dd/mm/yy" showIcon />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-700">Data Fim</label>
            <Calendar v-model="relatorioDataFim" dateFormat="dd/mm/yy" showIcon />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">Turno</label>
          <Select
            v-model="relatorioTurno"
            :options="turnoOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Todos os turnos"
          />
        </div>

        <!-- Preview de estatísticas -->
        <div v-if="estatisticas" class="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h4 class="font-semibold text-slate-700 mb-3">Estatísticas do Período</h4>
          <div class="grid grid-cols-4 gap-3 text-center">
            <div>
              <p class="text-xl font-bold text-slate-700">{{ estatisticas.resumo.total_inscritos }}</p>
              <p class="text-xs text-slate-500">Total</p>
            </div>
            <div>
              <p class="text-xl font-bold text-green-600">{{ estatisticas.resumo.aprovados }}</p>
              <p class="text-xs text-green-700">Confirmados</p>
            </div>
            <div>
              <p class="text-xl font-bold text-red-600">{{ estatisticas.resumo.rejeitados }}</p>
              <p class="text-xs text-red-700">Rejeitados</p>
            </div>
            <div>
              <p class="text-xl font-bold text-blue-600">{{ estatisticas.resumo.taxa_aprovacao }}</p>
              <p class="text-xs text-blue-700">Taxa</p>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="displayRelatorio = false" />
        <Button
          label="Exportar Excel"
          icon="pi pi-file-excel"
          severity="success"
          :loading="loadingExport"
          @click="exportarRelatorioExcel"
        />
      </template>
    </Dialog>
  </div>
</template>
