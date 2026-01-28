<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useToast } from 'primevue/usetoast'
import { cardapioService } from '../../services/cardapio'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import FileUpload from 'primevue/fileupload'
import Dropdown from 'primevue/dropdown'

const toast = useToast()
const cardapios = ref<any[]>([])
const loading = ref(false)
const displayDialog = ref(false)
const displayImport = ref(false)
const loadingImport = ref(false)
const displayTemplates = ref(false)
const viewMode = ref('list') // 'list', 'cards' ou 'calendar'

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

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  prato_principal_ptn01: { value: null, matchMode: FilterMatchMode.CONTAINS },
  guarnicao: { value: null, matchMode: FilterMatchMode.CONTAINS },
  data_do_cardapio: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

// Opções de filtro de turno
const turnoFiltro = ref<string | null>(null)
const turnoOpcoes = [
  { label: 'Todos', value: null },
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

const cardapiosFiltrados = computed(() => {
  if (!turnoFiltro.value) return cardapios.value
  return cardapios.value.filter(c => {
    const turnos = c.turnos || (c.refeicoes?.map((r: any) => r.turno) || [])
    return turnos.includes(turnoFiltro.value)
  })
})

const cardapioForm = ref({
  id: null,
  data_do_cardapio: null as Date | null,
  turnos: ['almoco', 'jantar'],
  prato_principal_ptn01: '',
  prato_principal_ptn02: '',
  guarnicao: '',
  acompanhamento_01: '',
  acompanhamento_02: '',
  salada: '',
  ovo_lacto_vegetariano: '',
  suco: '',
  sobremesa: ''
})

const turnosImport = ref(['almoco', 'jantar'])
const selectedCardapios = ref<any[]>([])
const displayDeletePeriod = ref(false)
const periodForm = ref({
  data_inicio: null as Date | null,
  data_fim: null as Date | null
})

const carregarCardapios = async () => {
  loading.value = true
  try {
    const data = await cardapioService.listarAdmin()
    cardapios.value = (data || []).map(c => ({
      ...c,
      // Normalização de datas para evitar problemas de fuso horário na visualização
      _dataObj: c.data_do_cardapio ? new Date(c.data_do_cardapio + 'T12:00:00') : null
    })).sort((a, b) => {
      const dateA = a._dataObj ? a._dataObj.getTime() : 0
      const dateB = b._dataObj ? b._dataObj.getTime() : 0
      return dateB - dateA
    })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar cardápios' })
  } finally {
    loading.value = false
  }
}

const excluirCardapio = async (id: number) => {
  if (!confirm('Deseja realmente excluir este cardápio?')) return
  try {
    await cardapioService.excluirAdmin(id)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Cardápio excluído' })
    carregarCardapios()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao excluir' })
  }
}

const deletarMultiplos = async () => {
  if (selectedCardapios.value.length === 0) return
  if (!confirm(`Deseja realmente excluir ${selectedCardapios.value.length} cardápios selecionados?`)) return
  
  try {
    const ids = selectedCardapios.value.map(c => c.id)
    await cardapioService.deletarMultiplosAdmin(ids)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Cardápios excluídos' })
    selectedCardapios.value = []
    carregarCardapios()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao excluir selecionados' })
  }
}

const deletarPorPeriodo = async () => {
  if (!periodForm.value.data_inicio || !periodForm.value.data_fim) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Selecione o período completo' })
    return
  }

  const format = (d: Date) => {
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }
  
  try {
    await cardapioService.deletarPorPeriodoAdmin(
      format(periodForm.value.data_inicio),
      format(periodForm.value.data_fim)
    )
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Cardápios do período excluídos' })
    displayDeletePeriod.value = false
    carregarCardapios()
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Erro', detail: err.response?.data?.message || 'Falha ao excluir por período' })
  }
}

const limparTodos = async () => {
  if (!confirm('ATENÇÃO: Isso excluirá TODOS os cardápios do sistema. Deseja continuar?')) return
  try {
    await cardapioService.deletarTodosAdmin()
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Todos os cardápios foram removidos' })
    carregarCardapios()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao limpar tudo' })
  }
}

const abrirNovo = () => {
  cardapioForm.value = {
    id: null,
    data_do_cardapio: new Date(),
    turnos: ['almoco', 'jantar'],
    prato_principal_ptn01: '',
    prato_principal_ptn02: '',
    guarnicao: '',
    acompanhamento_01: '',
    acompanhamento_02: '',
    salada: '',
    ovo_lacto_vegetariano: '',
    suco: '',
    sobremesa: ''
  }
  displayDialog.value = true
}

const abrirNovoComData = (dataString: string) => {
  abrirNovo()
  cardapioForm.value.data_do_cardapio = new Date(dataString + 'T12:00:00')
}

const editarCardapio = (cardapio: any) => {
  cardapioForm.value = { 
    ...cardapio, 
    data_do_cardapio: cardapio.data_do_cardapio ? new Date(cardapio.data_do_cardapio + 'T12:00:00') : null,
    turnos: cardapio.turnos || ['almoco', 'jantar']
  }
  displayDialog.value = true
}

const salvarCardapio = async () => {
  if (!cardapioForm.value.data_do_cardapio || cardapioForm.value.turnos.length === 0) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Data e Turno são obrigatórios' })
    return
  }

  try {
    // Ajustar a data para o fuso horário local antes de converter para ISO string
    // O DatePicker retorna um objeto Date. Usamos o formato YYYY-MM-DD
    const date = cardapioForm.value.data_do_cardapio
    const ano = date.getFullYear()
    const mes = String(date.getMonth() + 1).padStart(2, '0')
    const dia = String(date.getDate()).padStart(2, '0')
    const dataFormatada = `${ano}-${mes}-${dia}`

    const payload = {
      ...cardapioForm.value,
      data_do_cardapio: dataFormatada
    }
    await cardapioService.salvarAdmin(payload)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Cardápio salvo com sucesso' })
    displayDialog.value = false
    carregarCardapios()
  } catch (err: any) {
    const errorMsg = err?.response?.data?.message || 'Falha ao salvar'
    toast.add({ severity: 'error', summary: 'Erro', detail: errorMsg })
  }
}

const downloadTemplate = (tipo: string) => {
  const url = `${import.meta.env.VITE_API_BASE_URL}/admin/${tipo}/template`
  window.location.href = url
}

const onUpload = async (event: any) => {
  const file = event.files[0]
  if (!file) return

  loadingImport.value = true
  try {
    await cardapioService.importarAdmin(file, turnosImport.value)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Cardápios importados' })
    displayImport.value = false
    carregarCardapios()
  } catch (err: any) {
    const errorMsg = err?.response?.data?.message || 'Falha na importação'
    toast.add({ severity: 'error', summary: 'Erro', detail: errorMsg })
  } finally {
    loadingImport.value = false
  }
}

// Controles do calendário mensal
const calendarioMes = ref(new Date().getMonth())
const calendarioAno = ref(new Date().getFullYear())

const mesAnoAtual = computed(() => {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${meses[calendarioMes.value]} de ${calendarioAno.value}`
})

const navegarMes = (direcao: number) => {
  calendarioMes.value += direcao
  if (calendarioMes.value > 11) {
    calendarioMes.value = 0
    calendarioAno.value++
  } else if (calendarioMes.value < 0) {
    calendarioMes.value = 11
    calendarioAno.value--
  }
}

const irParaHoje = () => {
  calendarioMes.value = new Date().getMonth()
  calendarioAno.value = new Date().getFullYear()
}

// Computed para cardápios filtrados por mês/ano (para o calendário)
const cardapiosMesAtual = computed(() => {
  const mes = calendarioMes.value
  const ano = calendarioAno.value

  return cardapios.value.filter(c => {
    if (!c.data_do_cardapio) return false
    const data = new Date(c.data_do_cardapio + 'T12:00:00')
    return data.getMonth() === mes && data.getFullYear() === ano
  })
})

// Lógica para o calendário mensal
const diasCalendario = computed(() => {
  const mes = calendarioMes.value
  const ano = calendarioAno.value

  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia = new Date(ano, mes + 1, 0)

  const dias: any[] = []

  // Dias vazios do início da semana (para alinhar com domingo)
  const diasVaziosInicio = primeiroDia.getDay()
  for (let i = 0; i < diasVaziosInicio; i++) {
    dias.push({ vazio: true })
  }

  // Dias do mês
  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    const dataString = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    // Buscar cardápio no array filtrado do mês
    const cardapio = cardapiosMesAtual.value.find(c => {
      // Comparação direta de string
      return c.data_do_cardapio === dataString
    })
    dias.push({ dia: d, cardapio, dataString })
  }

  return dias
})

// Carregar cardápios ao montar o componente
onMounted(() => {
  carregarCardapios()
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Gestão de Cardápios"
      subtitle="Crie e gerencie os cardápios diários."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Gestão de Cardápio' }]"
    />

    <div class="flex justify-end -mt-16 mb-4 relative z-10">
      <div class="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-slate-200 shadow-sm">
        <SelectButton 
          v-model="viewMode" 
          :options="[{label: 'Lista', value: 'list', icon: 'pi pi-list'}, {label: 'Cards', value: 'cards', icon: 'pi pi-th-large'}, {label: 'Mensal', value: 'calendar', icon: 'pi pi-calendar'}]" 
          optionLabel="label" 
          optionValue="value"
          :allowEmpty="false"
          class="custom-select-button"
        >
          <template #option="slotProps">
            <div class="flex items-center gap-2 px-1">
              <i :class="slotProps.option.icon"></i>
              <span class="text-xs font-bold uppercase tracking-tight">{{ slotProps.option.label }}</span>
            </div>
          </template>
        </SelectButton>
        <div class="h-6 w-px bg-slate-200 mx-1"></div>
        <Button v-if="selectedCardapios.length > 0" :label="'Excluir (' + selectedCardapios.length + ')'" icon="pi pi-trash" severity="danger" text size="small" @click="deletarMultiplos" class="!rounded-xl" />
        <Button label="Limpar Período" icon="pi pi-calendar-minus" severity="warning" text size="small" @click="displayDeletePeriod = true" class="!rounded-xl" />
        <Button label="Modelos" icon="pi pi-download" severity="info" text size="small" @click="displayTemplates = true" class="!rounded-xl" />
        <Button label="Importar" icon="pi pi-upload" severity="secondary" outlined size="small" @click="displayImport = true" class="!rounded-xl" />
        <Button label="Novo" icon="pi pi-plus" severity="success" size="small" @click="abrirNovo" class="!rounded-xl shadow-md " />
      </div>
    </div>

    <div v-if="viewMode === 'list'" class="card bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <DataTable v-model:selection="selectedCardapios" v-model:filters="filters" 
        :value="cardapiosFiltrados" :loading="loading" paginator :rows="10" dataKey="id"
        filterDisplay="menu"
        :globalFilterFields="['prato_principal_ptn01', 'prato_principal_ptn02', 'guarnicao', 'acompanhamento_01', 'acompanhamento_02', 'salada', 'suco', 'sobremesa', 'ovo_lacto_vegetariano']"
        rowHover
        :rowClass="() => 'cursor-pointer'"
        @row-click="(e) => editarCardapio(e.data)"
        class="cardapio-datatable">
        <template #header>
          <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
            <div>
              <span class="text-lg font-black text-slate-700">Cardápios Cadastrados</span>
              <p class="text-xs text-slate-500">Clique em uma linha para editar</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <label class="text-xs font-bold text-slate-500 uppercase">Turno:</label>
                <Dropdown
                  v-model="turnoFiltro"
                  :options="turnoOpcoes"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Todos"
                  class="!rounded-xl !w-32"
                />
              </div>
              <InputText v-model="filters['global'].value" placeholder="Buscar..." class="!rounded-xl" />
            </div>
          </div>
        </template>
        <Column selectionMode="multiple" headerStyle="width: 3rem" />
        <Column field="data_do_cardapio" header="Data" :sortable="true" :style="{ width: '120px' }">
          <template #body="{ data }">
            <div class="flex flex-col">
              <span class="font-bold text-slate-800">{{ data._dataObj ? data._dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-' }}</span>
              <span class="text-[10px] text-slate-400 uppercase">{{ data._dataObj ? data._dataObj.toLocaleDateString('pt-BR', { weekday: 'short' }) : '' }}</span>
            </div>
          </template>
        </Column>
        <Column header="Pratos Principais" :style="{ minWidth: '200px' }">
          <template #body="{ data }">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                <span class="text-sm font-semibold text-slate-700">{{ data.prato_principal_ptn01 || '-' }}</span>
              </div>
              <div v-if="data.prato_principal_ptn02" class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-blue-300"></span>
                <span class="text-xs text-slate-500">{{ data.prato_principal_ptn02 }}</span>
              </div>
            </div>
          </template>
        </Column>
        <Column header="Vegetariano" :style="{ width: '150px' }">
          <template #body="{ data }">
            <div v-if="data.ovo_lacto_vegetariano" class="flex items-center gap-2">
              <i class="pi pi-heart-fill text-pink-500 text-xs"></i>
              <span class="text-xs text-slate-600">{{ data.ovo_lacto_vegetariano }}</span>
            </div>
            <span v-else class="text-xs text-slate-300">-</span>
          </template>
        </Column>
        <Column header="Acompanhamentos" :style="{ minWidth: '180px' }">
          <template #body="{ data }">
            <div class="flex flex-col gap-0.5">
              <span v-if="data.acompanhamento_01" class="text-xs text-slate-600">{{ data.acompanhamento_01 }}</span>
              <span v-if="data.acompanhamento_02" class="text-xs text-slate-500">{{ data.acompanhamento_02 }}</span>
              <span v-if="!data.acompanhamento_01 && !data.acompanhamento_02" class="text-xs text-slate-300">-</span>
            </div>
          </template>
        </Column>
        <Column header="Guarnição / Salada" :style="{ minWidth: '150px' }">
          <template #body="{ data }">
            <div class="flex flex-col gap-0.5">
              <div v-if="data.guarnicao" class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span class="text-xs text-slate-600">{{ data.guarnicao }}</span>
              </div>
              <div v-if="data.salada" class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span class="text-xs text-slate-600">{{ data.salada }}</span>
              </div>
            </div>
          </template>
        </Column>
        <Column header="Sobremesa / Suco" :style="{ minWidth: '140px' }">
          <template #body="{ data }">
            <div class="flex flex-col gap-0.5">
              <div v-if="data.sobremesa" class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                <span class="text-xs text-slate-600">{{ data.sobremesa }}</span>
              </div>
              <div v-if="data.suco" class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                <span class="text-xs text-slate-600">{{ data.suco }}</span>
              </div>
            </div>
          </template>
        </Column>
        <Column header="Turnos" :style="{ width: '120px' }">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-1">
              <template v-if="data.turnos && data.turnos.length > 0">
                <Tag v-for="t in data.turnos" :key="t"
                  :value="t === 'almoco' ? 'Almoço' : 'Jantar'"
                  :severity="t === 'almoco' ? 'success' : 'info'"
                  class="!text-[9px] uppercase !rounded-full !px-2" />
              </template>
              <template v-else-if="data.refeicoes && data.refeicoes.length > 0">
                <Tag v-for="r in data.refeicoes" :key="r.turno"
                  :value="r.turno === 'almoco' ? 'Almoço' : 'Jantar'"
                  :severity="r.turno === 'almoco' ? 'success' : 'info'"
                  class="!text-[9px] uppercase !rounded-full !px-2" />
              </template>
              <span v-else class="text-xs text-slate-400">-</span>
            </div>
          </template>
        </Column>
        <Column header="Ações" :style="{ width: '120px' }">
          <template #body="{ data }">
            <div class="flex gap-2" @click.stop>
              <Button
                icon="pi pi-pencil"
                outlined
                rounded
                severity="secondary"
                size="small"
                @click="editarCardapio(data)"
                class="!border-slate-400 !text-slate-600"
              />
              <Button
                icon="pi pi-trash"
                outlined
                rounded
                severity="danger"
                size="small"
                @click="excluirCardapio(data.id)"
                class="!border-red-400 !text-red-600"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Visualização Mensal (Calendário) -->
    <div v-else-if="viewMode === 'calendar'" class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <!-- Header com navegação -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <Button icon="pi pi-chevron-left" text rounded severity="secondary" @click="navegarMes(-1)" class="!w-10 !h-10" />
              <div class="min-w-[240px] text-center">
                <h3 class="text-xl font-bold text-slate-700 capitalize">
                  {{ mesAnoAtual }}
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ cardapiosMesAtual.length }} cardápio(s) cadastrado(s)
                </p>
              </div>
              <Button icon="pi pi-chevron-right" text rounded severity="secondary" @click="navegarMes(1)" class="!w-10 !h-10" />
            </div>
            <Button label="Hoje" icon="pi pi-calendar" text severity="primary" size="small" @click="irParaHoje" class="!rounded-lg" />
          </div>
          <div class="flex gap-4 text-xs">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-primary-500"></span>
              <span class="font-medium text-slate-600">Com cardápio</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded border-2 border-dashed border-slate-300"></span>
              <span class="font-medium text-slate-600">Sem cardápio</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-7 gap-2 mb-4">
            <div v-for="dia in ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']" :key="dia"
                 class="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest pb-2 border-b border-slate-100">
                {{ dia }}
            </div>
        </div>

        <div class="grid grid-cols-7 gap-2">
            <div v-for="(item, index) in diasCalendario" :key="index"
                 class="min-h-[120px] border rounded-xl p-2 flex flex-col transition-all"
                 :class="[
                   item.vazio ? 'bg-slate-50/50 border-transparent' :
                   item.cardapio ? 'border-primary-200 bg-primary-50/30 hover:border-primary-400 hover:bg-primary-50 cursor-pointer' :
                   'border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                 ]"
                 @click="item.cardapio ? editarCardapio(item.cardapio) : (item.dataString ? abrirNovoComData(item.dataString) : null)">
                <template v-if="!item.vazio">
                    <div class="flex justify-between items-start mb-1">
                      <span class="text-sm font-bold" :class="item.cardapio ? 'text-primary-700' : 'text-slate-400'">{{ item.dia }}</span>
                      <div v-if="item.cardapio" class="flex gap-0.5">
                        <span v-for="t in item.cardapio.turnos" :key="t"
                              class="w-2 h-2 rounded-full"
                              :class="t === 'almoco' ? 'bg-amber-400' : 'bg-indigo-400'"
                              :title="t === 'almoco' ? 'Almoço' : 'Jantar'"></span>
                      </div>
                    </div>

                    <div v-if="item.cardapio" class="flex-1 flex flex-col gap-1 overflow-hidden">
                        <div class="flex items-start gap-1">
                          <span class="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0"></span>
                          <p class="text-[10px] font-bold text-slate-700 line-clamp-2 leading-tight">
                            {{ item.cardapio.prato_principal_ptn01 }}
                          </p>
                        </div>
                        <div v-if="item.cardapio.ovo_lacto_vegetariano" class="flex items-start gap-1">
                          <i class="pi pi-heart-fill text-[8px] text-pink-500 mt-0.5"></i>
                          <span class="text-[9px] text-pink-600 truncate">{{ item.cardapio.ovo_lacto_vegetariano }}</span>
                        </div>
                        <div v-if="item.cardapio.acompanhamento_01" class="flex items-start gap-1">
                          <span class="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 flex-shrink-0"></span>
                          <span class="text-[9px] text-slate-500 truncate">{{ item.cardapio.acompanhamento_01 }}</span>
                        </div>
                        <div class="mt-auto pt-1 border-t border-primary-100 flex items-center gap-2">
                          <span v-if="item.cardapio.sobremesa" class="text-[8px] text-red-400 truncate flex-1">{{ item.cardapio.sobremesa }}</span>
                          <span v-if="item.cardapio.suco" class="text-[8px] text-purple-400 truncate">{{ item.cardapio.suco }}</span>
                        </div>
                    </div>

                    <div v-else class="flex-1 flex items-center justify-center">
                      <div class="text-center">
                        <i class="pi pi-plus text-slate-300 text-lg"></i>
                        <p class="text-[9px] text-slate-400 mt-1">Adicionar</p>
                      </div>
                    </div>
                </template>
            </div>
        </div>

        <div class="flex gap-6 mt-6 pt-4 border-t border-slate-100 justify-center">
            <div class="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span class="w-3 h-3 rounded-full bg-amber-400"></span> Almoço
            </div>
            <div class="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span class="w-3 h-3 rounded-full bg-indigo-400"></span> Jantar
            </div>
            <div class="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span> Prato Principal
            </div>
            <div class="flex items-center gap-2 text-xs font-medium text-slate-500">
                <i class="pi pi-heart-fill text-pink-500 text-[10px]"></i> Vegetariano
            </div>
        </div>
    </div>

    <!-- Visualização em Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-if="loading" class="col-span-full text-center py-12">
        <i class="pi pi-spin pi-spinner text-3xl text-primary-500"></i>
        <p class="mt-2 text-slate-500">Carregando cardápios...</p>
      </div>

      <div v-else-if="cardapios.length === 0" class="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
        <i class="pi pi-calendar-times text-5xl text-slate-200 mb-4"></i>
        <p class="text-slate-500">Nenhum cardápio cadastrado</p>
        <Button label="Criar Primeiro Cardápio" icon="pi pi-plus" severity="success" class="mt-4 !rounded-xl" @click="abrirNovo" />
      </div>

      <div v-for="card in cardapios" :key="card.id"
           class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
           @click="editarCardapio(card)">
        <!-- Header do Card -->
        <div class="bg-gradient-to-r from-primary-600 to-primary-700 p-4 text-white">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-xs font-bold opacity-80 uppercase tracking-wider">
                {{ card._dataObj ? card._dataObj.toLocaleDateString('pt-BR', { weekday: 'long' }) : '-' }}
              </p>
              <p class="text-2xl font-black">
                {{ card._dataObj ? card._dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '-' }}
              </p>
            </div>
            <div class="flex gap-1">
              <Tag v-for="t in card.turnos" :key="t"
                class="!bg-white/20 !text-white !text-xs !px-2 !py-1">
                <template #default>
                  <i :class="t === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'" class="text-xs"></i>
                </template>
              </Tag>
            </div>
          </div>
        </div>

        <!-- Conteúdo do Card -->
        <div class="p-4 space-y-3">
          <!-- Pratos Principais -->
          <div class="space-y-1">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pratos Principais</p>
            <p class="text-sm font-bold text-slate-800">{{ card.prato_principal_ptn01 || '-' }}</p>
            <p v-if="card.prato_principal_ptn02" class="text-xs text-slate-500">{{ card.prato_principal_ptn02 }}</p>
          </div>

          <!-- Vegetariano -->
          <div v-if="card.ovo_lacto_vegetariano" class="flex items-center gap-2 p-2 bg-pink-50 rounded-lg border border-pink-100">
            <i class="pi pi-heart-fill text-pink-500 text-xs"></i>
            <span class="text-xs font-medium text-pink-700">{{ card.ovo_lacto_vegetariano }}</span>
          </div>

          <!-- Grid de informações -->
          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <div v-if="card.acompanhamento_01 || card.acompanhamento_02">
              <p class="text-[9px] font-black text-slate-400 uppercase">Acompanhamentos</p>
              <p class="text-xs text-slate-600">{{ card.acompanhamento_01 }}</p>
              <p v-if="card.acompanhamento_02" class="text-xs text-slate-500">{{ card.acompanhamento_02 }}</p>
            </div>
            <div v-if="card.guarnicao">
              <p class="text-[9px] font-black text-slate-400 uppercase">Guarnição</p>
              <p class="text-xs text-slate-600">{{ card.guarnicao }}</p>
            </div>
            <div v-if="card.salada">
              <p class="text-[9px] font-black text-slate-400 uppercase">Salada</p>
              <p class="text-xs text-slate-600">{{ card.salada }}</p>
            </div>
            <div v-if="card.sobremesa">
              <p class="text-[9px] font-black text-slate-400 uppercase">Sobremesa</p>
              <p class="text-xs text-slate-600">{{ card.sobremesa }}</p>
            </div>
            <div v-if="card.suco">
              <p class="text-[9px] font-black text-slate-400 uppercase">Suco</p>
              <p class="text-xs text-slate-600">{{ card.suco }}</p>
            </div>
          </div>
        </div>

        <!-- Footer do Card -->
        <div class="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2" @click.stop>
          <Button
            icon="pi pi-pencil"
            outlined
            rounded
            size="small"
            severity="secondary"
            @click="editarCardapio(card)"
            class="!border-slate-300 !text-slate-600 hover:!bg-slate-100"
          />
          <Button
            icon="pi pi-trash"
            outlined
            rounded
            size="small"
            severity="danger"
            @click="excluirCardapio(card.id)"
            class="!border-red-300 !text-red-600 hover:!bg-red-50"
          />
        </div>
      </div>
    </div>

    <!-- Dialog Modelos -->
    <Dialog v-model:visible="displayTemplates" header="Modelos de Planilha" :style="{ width: '400px' }" modal class="!rounded-xl">
      <div class="space-y-6 py-4">
        <p class="text-sm text-slate-600">Baixe os modelos oficiais para importação de dados no sistema.</p>
        
        <div class="grid gap-3">
           <Button label="Modelo de Cardápio (.xlsx)" icon="pi pi-file-excel" severity="success" outlined class="!rounded-xl text-left" @click="downloadTemplate('cardapios')" />
           <Button label="Modelo de Bolsistas (.xlsx)" icon="pi pi-file-excel" severity="emerald" outlined class="!rounded-xl text-left" @click="downloadTemplate('bolsistas')" />
        </div>
        
        <div class="p-4 bg-blue-50 rounded-xl border border-blue-100">
           <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Dica:</p>
           <p class="text-xs text-blue-700">Preencha todas as colunas obrigatórias para evitar erros na importação.</p>
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="displayDialog"
      :header="cardapioForm.id ? 'Editar Cardápio' : 'Novo Cardápio'"
      :style="{ width: '95vw', maxWidth: '1000px' }"
      modal
      :maximizable="true"
      class="p-fluid !rounded-xl"
      :contentStyle="{ maxHeight: '75vh', overflow: 'auto' }"
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div class="field">
          <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Data *</label>
          <DatePicker v-model="cardapioForm.data_do_cardapio" dateFormat="dd/mm/yy" showIcon :locale="ptBR" class="!rounded-xl w-full" />
        </div>
        <div class="field md:col-span-2">
          <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Turnos *</label>
          <SelectButton
            v-model="cardapioForm.turnos" 
            :options="[{label: 'Almoço', value: 'almoco'}, {label: 'Jantar', value: 'jantar'}]" 
            optionLabel="label" 
            optionValue="value" 
            multiple
            class="custom-select-button-multiple"
          >
            <template #option="slotProps">
              <div class="flex items-center gap-2 px-2">
                <i :class="slotProps.option.value === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'"></i>
                <span class="text-sm font-bold uppercase tracking-tight">{{ slotProps.option.label }}</span>
              </div>
            </template>
          </SelectButton>
        </div>

        <!-- Pratos Principais -->
        <div class="field md:col-span-2">
          <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Prato Principal 01 *</label>
          <InputText v-model="cardapioForm.prato_principal_ptn01" placeholder="Ex: Frango Grelhado" class="!rounded-xl" />
        </div>
        <div class="field">
          <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Prato Principal 02</label>
          <InputText v-model="cardapioForm.prato_principal_ptn02" placeholder="Ex: Carne Assada" class="!rounded-xl" />
        </div>

        <!-- Acompanhamentos -->
        <div class="field">
          <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Acompanhamento 01 *</label>
          <InputText v-model="cardapioForm.acompanhamento_01" placeholder="Ex: Arroz" class="!rounded-xl" />
        </div>
        <div class="field">
          <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Acompanhamento 02 *</label>
          <InputText v-model="cardapioForm.acompanhamento_02" placeholder="Ex: Feijão" class="!rounded-xl" />
        </div>
        <div class="field">
          <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Guarnição</label>
          <InputText v-model="cardapioForm.guarnicao" placeholder="Ex: Farofa" class="!rounded-xl" />
        </div>

        <!-- Vegetariano e Salada -->
        <div class="field md:col-span-2">
          <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Opção Vegetariana</label>
          <InputText v-model="cardapioForm.ovo_lacto_vegetariano" placeholder="Ex: Omelete de legumes" class="!rounded-xl" />
        </div>
        <div class="field">
          <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Salada</label>
          <InputText v-model="cardapioForm.salada" placeholder="Ex: Alface com tomate" class="!rounded-xl" />
        </div>

        <!-- Sobremesa e Suco -->
        <div class="field">
          <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Sobremesa</label>
          <InputText v-model="cardapioForm.sobremesa" placeholder="Ex: Gelatina" class="!rounded-xl" />
        </div>
        <div class="field">
          <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Suco</label>
          <InputText v-model="cardapioForm.suco" placeholder="Ex: Laranja" class="!rounded-xl" />
        </div>
        <div class="field flex items-end">
          <!-- Espaço vazio para alinhamento -->
        </div>
      </div>
      <template #footer>
        <div class="flex gap-3 w-full pt-4">
          <Button label="Cancelar" icon="pi pi-times" text @click="displayDialog = false" class="flex-1 !rounded-xl" />
          <Button label="Salvar Cardápio" icon="pi pi-check" @click="salvarCardapio" severity="success" class="flex-1 !rounded-xl shadow-md" />
        </div>
      </template>
    </Dialog>

    <!-- Dialog Importação -->
    <Dialog v-model:visible="displayImport" header="Importar Cardápios" :style="{ width: '95%', maxWidth: '500px' }" modal class="p-fluid !rounded-xl overflow-hidden">
      <div class="space-y-6 pt-4">
        <div class="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p class="text-blue-800 text-sm leading-relaxed">
            Selecione o arquivo Excel (.xlsx, .xls) com os cardápios seguindo o modelo oficial. 
          </p>
        </div>

        <div class="field">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Turnos Automáticos</label>
          <SelectButton 
            v-model="turnosImport" 
            :options="[{label: 'Almoço', value: 'almoco'}, {label: 'Jantar', value: 'jantar'}]" 
            optionLabel="label" 
            optionValue="value" 
            multiple
            class="custom-select-button-multiple"
          >
            <template #option="slotProps">
              <div class="flex items-center gap-2 px-2">
                <i :class="slotProps.option.value === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'"></i>
                <span class="text-sm font-bold uppercase tracking-tight">{{ slotProps.option.label }}</span>
              </div>
            </template>
          </SelectButton>
        </div>

        <div class="field">
          <FileUpload 
            mode="basic" 
            name="file" 
            accept=".xlsx,.xls" 
            :maxFileSize="5242880" 
            customUpload 
            @select="onUpload" 
            chooseLabel="Selecionar Arquivo Excel" 
            class="w-full !rounded-xl"
            :disabled="loadingImport"
          />
          <p class="text-[10px] text-slate-500 mt-2 ml-1">Tamanho máximo: 5MB (.xlsx, .xls)</p>
          <div v-if="loadingImport" class="mt-4 p-4 bg-slate-50 rounded-xl text-center">
            <i class="pi pi-spin pi-spinner text-primary-600 mb-2"></i>
            <p class="text-sm text-slate-600 font-bold">Processando dados, por favor aguarde...</p>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Fechar" icon="pi pi-times" text @click="displayImport = false" :disabled="loadingImport" class="w-full !rounded-xl" />
      </template>
    </Dialog>

    <!-- Dialog Limpar por Período -->
    <Dialog v-model:visible="displayDeletePeriod" header="Limpar Cardápios por Período" :style="{ width: '95%', maxWidth: '450px' }" modal class="p-fluid !rounded-xl overflow-hidden">
      <div class="space-y-6 pt-4">
        <div class="p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p class="text-amber-800 text-sm leading-relaxed">
            Selecione um intervalo de datas para remover permanentemente todos os cardápios cadastrados nesse período.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="field">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Data Início</label>
            <DatePicker v-model="periodForm.data_inicio" dateFormat="dd/mm/yy" :locale="ptBR" showIcon class="!rounded-xl" />
          </div>
          <div class="field">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Data Fim</label>
            <DatePicker v-model="periodForm.data_fim" dateFormat="dd/mm/yy" :locale="ptBR" showIcon class="!rounded-xl" />
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 mt-6">
           <Button label="Limpar Tudo (CUIDADO)" icon="pi pi-exclamation-triangle" severity="danger" text size="small" @click="limparTodos" class="w-full !rounded-xl" />
        </div>
      </div>
      <template #footer>
        <div class="flex gap-3 w-full">
          <Button label="Cancelar" icon="pi pi-times" text @click="displayDeletePeriod = false" class="flex-1 !rounded-xl" />
          <Button label="Excluir Período" icon="pi pi-trash" @click="deletarPorPeriodo" severity="danger" class="flex-1 !rounded-xl shadow-lg" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.custom-select-button :deep(.p-button) {
  border: 0;
  background: transparent;
  color: #64748b;
  font-weight: 700;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
}

.custom-select-button :deep(.p-button.p-highlight) {
  background: #f1f5f9;
  color: #1e293b;
}

.custom-select-button :deep(.p-button:not(.p-highlight):hover) {
  background: #f8fafc;
}

.custom-select-button-multiple :deep(.p-button) {
  background: #f8fafc;
  color: #64748b;
  font-weight: 700;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
}

.custom-select-button-multiple :deep(.p-button.p-highlight) {
  background: var(--ifba-verde);
  color: #ffffff;
  border-color: var(--ifba-verde);
}

.custom-select-button-multiple :deep(.p-button:not(.p-highlight):hover) {
  background: #f1f5f9;
}

/* DataTable de Cardápios */
.cardapio-datatable :deep(.p-datatable-tbody > tr) {
  transition: all 0.15s ease;
}

.cardapio-datatable :deep(.p-datatable-tbody > tr:hover) {
  background: #f0fdf4 !important;
}

.cardapio-datatable :deep(.p-datatable-thead > tr > th) {
  background: #f8fafc !important;
  font-size: 0.7rem !important;
  padding: 0.75rem 0.5rem !important;
}

.cardapio-datatable :deep(.p-datatable-tbody > tr > td) {
  padding: 0.75rem 0.5rem !important;
  vertical-align: top !important;
}

/* Line clamp para textos */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>