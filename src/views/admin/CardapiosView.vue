<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { cardapioService } from '../../services/cardapio'
import PageHeader from '../../components/common/PageHeader.vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import FileUpload from 'primevue/fileupload'

const toast = useToast()
const cardapios = ref<any[]>([])
const loading = ref(false)
const displayDialog = ref(false)
const displayImport = ref(false)
const loadingImport = ref(false)
const viewMode = ref('cards') // 'cards' ou 'calendar'

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
      _dataObj: c.data_do_cardapio ? new Date(c.data_do_cardapio + 'T12:00:00') : null
    })).sort((a, b) => {
      const dateA = a._dataObj ? a._dataObj.getTime() : 0
      const dateB = b._dataObj ? b._dataObj.getTime() : 0
      return dateA - dateB
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

const deletarPorPeriodo = async () => {
  if (!periodForm.value.data_inicio || !periodForm.value.data_fim) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Selecione o período completo' })
    return
  }
  const format = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  try {
    await cardapioService.deletarPorPeriodoAdmin(format(periodForm.value.data_inicio), format(periodForm.value.data_fim))
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Cardápios do período excluídos' })
    displayDeletePeriod.value = false
    carregarCardapios()
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Erro', detail: err.response?.data?.message || 'Falha ao excluir por período' })
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
    const date = cardapioForm.value.data_do_cardapio
    const dataFormatada = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    await cardapioService.salvarAdmin({ ...cardapioForm.value, data_do_cardapio: dataFormatada })
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Cardápio salvo com sucesso' })
    displayDialog.value = false
    carregarCardapios()
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Erro', detail: err?.response?.data?.message || 'Falha ao salvar' })
  }
}

import api from '../../services/api' // Importe o Axios configurado

const downloadTemplate = async (tipo: string) => {
  try {
    // Usar rota V2 protegida (dentro do grupo admin)
    // O interceptor do api.ts vai adicionar o token Bearer automaticamente
    const url = `/admin/${tipo}/template-v2`

    const response = await api.get(url, {
      responseType: 'blob', // Importante para arquivos binários
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    })

    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })

    const contentDisposition = response.headers['content-disposition']
    let filename = `template_${tipo}.xlsx`
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1]
      }
    }

    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)

    toast.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Template baixado com sucesso!',
      life: 3000
    })
  } catch (error) {
    console.error('Erro ao baixar template:', error)
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: 'Erro ao baixar template. Tente novamente.',
      life: 5000
    })
  }
}

const onUpload = async (event: any) => {
  const file = event.files[0]
  if (!file) return
  loadingImport.value = true
  try {
    const resultado = await cardapioService.importarAdmin(file, turnosImport.value)
    const total = resultado?.meta?.total_importados || resultado?.data?.length || 0
    toast.add({ 
      severity: 'success', 
      summary: 'Sucesso', 
      detail: `${total} cardápio(s) importado(s) com sucesso!`,
      life: 4000
    })
    displayImport.value = false
    // Forçar atualização após breve delay
    setTimeout(() => carregarCardapios(), 500)
  } catch (err: any) {
    console.error('Erro na importação:', err)
    const errorMsg = err?.response?.data?.meta?.message || err?.response?.data?.message || 'Falha na importação'
    toast.add({ severity: 'error', summary: 'Erro', detail: errorMsg, life: 5000 })
  } finally {
    loadingImport.value = false
  }
}

// ============= ORGANIZAÇÃO POR SEMANAS =============
const semanaAtual = ref(0) // Index da semana atual no array

const getWeekKey = (date: Date): string => {
  const d = new Date(date)
  const dayOfWeek = d.getDay()
  const weekStart = new Date(d)
  weekStart.setDate(d.getDate() - dayOfWeek)
  return weekStart.toISOString().split('T')[0] ?? ''
}

const cardapiosPorSemana = computed(() => {
  const semanas: Map<string, { weekStart: Date, weekEnd: Date, cards: any[] }> = new Map()

  cardapiosFiltrados.value.forEach(card => {
    if (!card._dataObj) return
    const key = getWeekKey(card._dataObj)

    if (!semanas.has(key)) {
      const weekStart = new Date(key + 'T12:00:00')
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      semanas.set(key, { weekStart, weekEnd, cards: [] })
    }
    semanas.get(key)!.cards.push(card)
  })

  return Array.from(semanas.values()).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
})

const semanaAtualData = computed(() => cardapiosPorSemana.value[semanaAtual.value] || null)

const navegarSemana = (dir: number) => {
  const novoIndex = semanaAtual.value + dir
  if (novoIndex >= 0 && novoIndex < cardapiosPorSemana.value.length) {
    semanaAtual.value = novoIndex
  }
}

const irParaSemanaAtual = () => {
  const hoje = new Date()
  const keyHoje = getWeekKey(hoje)
  const index = cardapiosPorSemana.value.findIndex(s => getWeekKey(s.weekStart) === keyHoje)
  semanaAtual.value = index >= 0 ? index : 0
}

// Inicializar na semana atual quando carregar
watch(cardapiosPorSemana, () => {
  if (cardapiosPorSemana.value.length > 0) {
    irParaSemanaAtual()
  }
}, { immediate: true })

const formatarSemana = (weekStart: Date, weekEnd: Date) => {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const diaInicio = weekStart.getDate()
  const diaFim = weekEnd.getDate()
  const mesInicio = meses[weekStart.getMonth()]
  const mesFim = meses[weekEnd.getMonth()]

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${diaInicio} - ${diaFim} de ${mesInicio}`
  }
  return `${diaInicio} ${mesInicio} - ${diaFim} ${mesFim}`
}

// ============= CALENDÁRIO MENSAL =============
const calendarioMes = ref(new Date().getMonth())
const calendarioAno = ref(new Date().getFullYear())

const mesAnoAtual = computed(() => {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${meses[calendarioMes.value]} de ${calendarioAno.value}`
})

const navegarMes = (dir: number) => {
  calendarioMes.value += dir
  if (calendarioMes.value > 11) { calendarioMes.value = 0; calendarioAno.value++ }
  else if (calendarioMes.value < 0) { calendarioMes.value = 11; calendarioAno.value-- }
}

const irParaHoje = () => {
  calendarioMes.value = new Date().getMonth()
  calendarioAno.value = new Date().getFullYear()
}

const cardapiosMesAtual = computed(() => {
  return cardapiosFiltrados.value.filter(c => {
    if (!c.data_do_cardapio) return false
    const data = new Date(c.data_do_cardapio + 'T12:00:00')
    return data.getMonth() === calendarioMes.value && data.getFullYear() === calendarioAno.value
  })
})

const diasCalendario = computed(() => {
  const primeiroDia = new Date(calendarioAno.value, calendarioMes.value, 1)
  const ultimoDia = new Date(calendarioAno.value, calendarioMes.value + 1, 0)
  const dias: any[] = []

  for (let i = 0; i < primeiroDia.getDay(); i++) dias.push({ vazio: true })

  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    const dataString = `${calendarioAno.value}-${String(calendarioMes.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const cardapio = cardapiosMesAtual.value.find(c => c.data_do_cardapio === dataString)
    dias.push({ dia: d, cardapio, dataString })
  }
  return dias
})

onMounted(() => carregarCardapios())
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Gestão de Cardápios"
      subtitle="Crie e gerencie os cardápios diários."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Gestão de Cardápio' }]"
    />

    <!-- Barra de Controles -->
    <div class="flex flex-wrap justify-between items-center gap-4 -mt-12 mb-4 relative z-10">
      <div class="flex items-center gap-14 bg-white/90 backdrop-blur-sm p-2 rounded-2xl border border-slate-200 shadow-sm">
        <!-- Seletor de View -->
        <SelectButton
          v-model="viewMode"
          :options="[{label: 'Cards', value: 'cards', icon: 'pi pi-th-large'}, {label: 'Mensal', value: 'calendar', icon: 'pi pi-calendar'}]"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
          class="view-select"
        >
          <template #option="{ option }">
            <div class="flex items-center gap-2 px-2 py-1">
              <i :class="option.icon" class="text-sm"></i>
              <span class="text-xs font-bold uppercase">{{ option.label }}</span>
            </div>
          </template>
        </SelectButton>


        <!-- Filtro de Turno -->
        <div class="flex items-center gap-2">
          <SelectButton
            v-model="turnoFiltro"
            :options="turnoOpcoes"
            optionLabel="label"
            optionValue="value"
            class="turno-select"
          >
            <template #option="{ option }">
              <div class="flex items-center gap-1.5 px-2 py-1">
                <i v-if="option.value === 'almoco'" class="pi pi-sun text-amber-500 text-xs"></i>
                <i v-else-if="option.value === 'jantar'" class="pi pi-moon text-indigo-500 text-xs"></i>
                <i v-else class="pi pi-circle text-slate-400 text-xs"></i>
                <span class="text-xs font-semibold">{{ option.label }}</span>
              </div>
            </template>
          </SelectButton>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Button label="Importar" icon="pi pi-upload" severity="secondary" outlined size="small" @click="displayImport = true" class="!rounded-xl" />
        <Button label="Novo" icon="pi pi-plus" severity="success" size="small" @click="abrirNovo" class="!rounded-xl shadow-lg" />
      </div>
    </div>

    <!-- ============= VIEW: CARDS POR SEMANA ============= -->
    <div v-if="viewMode === 'cards'">
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <i class="pi pi-spin pi-spinner text-4xl text-primary-500 mb-4"></i>
          <p class="text-slate-500">Carregando cardápios...</p>
        </div>
      </div>

      <div v-else-if="cardapiosPorSemana.length === 0" class="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <i class="pi pi-calendar-times text-6xl text-slate-200 mb-4"></i>
        <h3 class="text-lg font-bold text-slate-600 mb-2">Nenhum cardápio cadastrado</h3>
        <p class="text-slate-400 mb-6">Comece criando seu primeiro cardápio</p>
        <Button label="Criar Cardápio" icon="pi pi-plus" severity="success" @click="abrirNovo" class="!rounded-xl" />
      </div>

      <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <!-- Header da Semana -->
        <div class="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4">
          <div class="flex items-center justify-between">
            <Button
              icon="pi pi-chevron-left"
              text
              rounded
              class="!text-white/80 hover:!text-white hover:!bg-white/10"
              :disabled="semanaAtual === 0"
              @click="navegarSemana(-1)"
            />

            <div class="text-center">
              <p class="text-[10px] font-bold uppercase tracking-wider opacity-80 text-white">
                Semana
              </p>
              <h2 v-if="semanaAtualData" class="text-xl font-black text-white">
                {{ formatarSemana(semanaAtualData.weekStart, semanaAtualData.weekEnd) }}
              </h2>
              <div class="flex items-center justify-center gap-4 mt-2">
                <span class="text-xs text-white/70">
                  <span class="font-bold text-white">{{ semanaAtualData?.cards.length || 0 }}</span> cardápios
                </span>
                <span class="text-white/30">•</span>
                <span class="text-xs text-white/70">
                  Semana <span class="font-bold text-white">{{ semanaAtual + 1 }}</span> de {{ cardapiosPorSemana.length }}
                </span>
              </div>
            </div>

            <Button
              icon="pi pi-chevron-right"
              text
              rounded
              class="!text-white/80 hover:!text-white hover:!bg-white/10"
              :disabled="semanaAtual >= cardapiosPorSemana.length - 1"
              @click="navegarSemana(1)"
            />
          </div>

          <!-- Indicador de semanas -->
          <div class="flex justify-center gap-1.5 mt-4">
            <button
              v-for="(_, i) in cardapiosPorSemana"
              :key="i"
              @click="semanaAtual = i"
              class="w-2 h-2 rounded-full transition-all"
              :class="i === semanaAtual ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'"
            />
          </div>
        </div>

        <!-- Grid de Cards da Semana -->
        <div class="p-4 sm:p-6">
          <div v-if="semanaAtualData" class="flex flex-wrap justify-center gap-4 sm:gap-6">
            <div
              v-for="card in semanaAtualData.cards"
              :key="card.id"
              class="w-full sm:w-[calc(50%-8px)] lg:w-[calc(50%-12px)] xl:w-[calc(33.333%-16px)] group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl hover:border-primary-300 transition-all duration-300 cursor-pointer"
              @click="editarCardapio(card)"
            >
              <!-- Header do Card com Data -->
              <div class="bg-gradient-to-r from-primary-600 to-primary-700 p-5 text-white relative overflow-hidden">
                <div class="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full"></div>
                <div class="absolute -right-2 -bottom-8 w-20 h-20 bg-white/5 rounded-full"></div>
                <div class="relative flex justify-center items-start">
                  <div>
                    <p class="text-xs font-bold opacity-80 uppercase tracking-wider text-center">
                      {{ card._dataObj?.toLocaleDateString('pt-BR', { weekday: 'long' }) }}
                    </p>
                    <p class="text-3xl font-black mt-1">
                      {{ card._dataObj?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }}
                    </p>
                  </div>
                  <div class="flex gap-1.5">
                    <Tag v-for="t in card.turnos" :key="t" class="!bg-white/20 !text-white !text-xs !px-3 !py-1.5 !rounded-full">
                      <template #default>
                        <i :class="t === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'" class="mr-1"></i>
                        {{ t === 'almoco' ? 'Almoço' : 'Jantar' }}
                      </template>
                    </Tag>
                  </div>
                </div>
              </div>

              <!-- Conteúdo do Card -->
              <div class="p-5 space-y-4">
                <!-- Pratos Principais -->
                <div class="space-y-2">
                  <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pratos Principais</p>
                  <p class="text-base font-bold text-slate-800 leading-snug">{{ card.prato_principal_ptn01 || '-' }}</p>
                  <p v-if="card.prato_principal_ptn02" class="text-sm text-slate-600">{{ card.prato_principal_ptn02 }}</p>
                </div>

                <!-- Vegetariano -->
                <div v-if="card.ovo_lacto_vegetariano" class="flex items-center gap-3 p-3 bg-pink-50 rounded-xl border border-pink-100">
                  <div class="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-heart-fill text-pink-500"></i>
                  </div>
                  <div>
                    <p class="text-[9px] font-bold text-pink-400 uppercase">Vegetariano</p>
                    <p class="text-sm font-medium text-pink-700">{{ card.ovo_lacto_vegetariano }}</p>
                  </div>
                </div>

                <!-- Grid de informações -->
                <div class="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div v-if="card.acompanhamento_01 || card.acompanhamento_02">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Acompanhamentos</p>
                    <p class="text-sm text-slate-700">{{ card.acompanhamento_01 }}</p>
                    <p v-if="card.acompanhamento_02" class="text-xs text-slate-500">{{ card.acompanhamento_02 }}</p>
                  </div>
                  <div v-if="card.guarnicao">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Guarnição</p>
                    <p class="text-sm text-slate-700">{{ card.guarnicao }}</p>
                  </div>
                  <div v-if="card.salada">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Salada</p>
                    <p class="text-sm text-slate-700">{{ card.salada }}</p>
                  </div>
                  <div v-if="card.sobremesa">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Sobremesa</p>
                    <p class="text-sm text-slate-700">{{ card.sobremesa }}</p>
                  </div>
                  <div v-if="card.suco">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Suco</p>
                    <p class="text-sm text-slate-700">{{ card.suco }}</p>
                  </div>
                </div>
              </div>

              <!-- Footer do Card -->
              <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-center gap-2" @click.stop>
                <Button
                  icon="pi pi-pencil"
                  outlined
                  rounded
                  size="small"
                  severity="secondary"
                  @click="editarCardapio(card)"
                  class="!text-xs"
                />
                <Button
                  icon="pi pi-trash"
                  outlined
                  rounded
                  size="small"
                  severity="danger"
                  @click="excluirCardapio(card.id)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Ir para Semana Atual -->
        <div class="px-6 pb-4 flex justify-center">
          <Button
            label="Ir para Semana Atual"
            icon="pi pi-calendar"
            text
            size="small"
            @click="irParaSemanaAtual"
            class="!text-slate-500 hover:!text-primary-600"
          />
        </div>
      </div>
    </div>

    <!-- ============= VIEW: CALENDÁRIO MENSAL ============= -->
    <div v-else-if="viewMode === 'calendar'" class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <Button icon="pi pi-chevron-left" text rounded severity="secondary" @click="navegarMes(-1)" class="!w-10 !h-10" />
            <div class="min-w-[220px] text-center">
              <h3 class="text-xl font-bold text-slate-700 capitalize">{{ mesAnoAtual }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">{{ cardapiosMesAtual.length }} cardápio(s)</p>
            </div>
            <Button icon="pi pi-chevron-right" text rounded severity="secondary" @click="navegarMes(1)" class="!w-10 !h-10" />
          </div>
          <Button label="Hoje" icon="pi pi-calendar" text severity="primary" size="small" @click="irParaHoje" class="!rounded-lg" />
        </div>
        <div class="flex gap-4 text-xs">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-primary-500"></span>
            <span class="text-slate-600">Com cardápio</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded border-2 border-dashed border-slate-300"></span>
            <span class="text-slate-600">Sem cardápio</span>
          </div>
        </div>
      </div>

      <!-- Dias da semana -->
      <div class="grid grid-cols-7 gap-2 mb-3">
        <div v-for="dia in ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']" :key="dia"
             class="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest py-2">
          {{ dia }}
        </div>
      </div>

      <!-- Grid do calendário -->
      <div class="grid grid-cols-7 gap-2">
        <div
          v-for="(item, index) in diasCalendario"
          :key="index"
          class="min-h-[110px] border rounded-xl p-2 flex flex-col transition-all"
          :class="[
            item.vazio ? 'bg-slate-50/50 border-transparent' :
            item.cardapio ? 'border-primary-200 bg-primary-50/50 hover:border-primary-400 hover:bg-primary-50 cursor-pointer' :
            'border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
          ]"
          @click="item.cardapio ? editarCardapio(item.cardapio) : (item.dataString ? abrirNovoComData(item.dataString) : null)"
        >
          <template v-if="!item.vazio">
            <div class="flex justify-between items-start mb-1">
              <span class="text-sm font-bold" :class="item.cardapio ? 'text-primary-700' : 'text-slate-400'">{{ item.dia }}</span>
              <div v-if="item.cardapio" class="flex gap-0.5">
                <span v-for="t in item.cardapio.turnos" :key="t" class="w-2 h-2 rounded-full" :class="t === 'almoco' ? 'bg-amber-400' : 'bg-indigo-400'"></span>
              </div>
            </div>
            <div v-if="item.cardapio" class="flex-1 flex flex-col gap-1 overflow-hidden">
              <p class="text-[10px] font-bold text-slate-700 line-clamp-2 leading-tight">{{ item.cardapio.prato_principal_ptn01 }}</p>
              <div v-if="item.cardapio.ovo_lacto_vegetariano" class="flex items-center gap-1">
                <i class="pi pi-heart-fill text-[8px] text-pink-500"></i>
                <span class="text-[9px] text-pink-600 truncate">{{ item.cardapio.ovo_lacto_vegetariano }}</span>
              </div>
              <div class="mt-auto flex gap-2">
                <span v-if="item.cardapio.sobremesa" class="text-[8px] text-slate-400 truncate">{{ item.cardapio.sobremesa }}</span>
              </div>
            </div>
            <div v-else class="flex-1 flex items-center justify-center">
              <div class="text-center opacity-50 hover:opacity-100 transition-opacity">
                <i class="pi pi-plus text-slate-300 text-lg"></i>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ============= DIALOG NOVO/EDITAR ============= -->
    <Dialog
      v-model:visible="displayDialog"
      :header="cardapioForm.id ? 'Editar Cardápio' : 'Novo Cardápio'"
      :style="{ width: '95vw', maxWidth: '900px' }"
      modal
      class="!rounded-2xl"
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div>
          <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Data *</label>
          <DatePicker v-model="cardapioForm.data_do_cardapio" dateFormat="dd/mm/yy" showIcon :locale="ptBR" class="w-full" />
        </div>
        <div class="md:col-span-2">
          <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Turnos *</label>
          <SelectButton v-model="cardapioForm.turnos" :options="[{label: 'Almoço', value: 'almoco'}, {label: 'Jantar', value: 'jantar'}]" optionLabel="label" optionValue="value" multiple class="turno-select" />
        </div>
        <div class="md:col-span-2">
          <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Prato Principal 01 *</label>
          <InputText v-model="cardapioForm.prato_principal_ptn01" class="w-full" />
        </div>
        <div>
          <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Prato Principal 02</label>
          <InputText v-model="cardapioForm.prato_principal_ptn02" class="w-full" />
        </div>
        <div>
          <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Acompanhamento 01 *</label>
          <InputText v-model="cardapioForm.acompanhamento_01" class="w-full" />
        </div>
        <div>
          <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Acompanhamento 02 *</label>
          <InputText v-model="cardapioForm.acompanhamento_02" class="w-full" />
        </div>
        <div>
          <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Guarnição</label>
          <InputText v-model="cardapioForm.guarnicao" class="w-full" />
        </div>
        <div class="md:col-span-2">
          <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Opção Vegetariana</label>
          <InputText v-model="cardapioForm.ovo_lacto_vegetariano" class="w-full" />
        </div>
        <div>
          <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Salada</label>
          <InputText v-model="cardapioForm.salada" class="w-full" />
        </div>
        <div>
          <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Sobremesa</label>
          <InputText v-model="cardapioForm.sobremesa" class="w-full" />
        </div>
        <div>
          <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Suco</label>
          <InputText v-model="cardapioForm.suco" class="w-full" />
        </div>
      </div>
      <template #footer>
        <div class="flex gap-3 pt-4">
          <Button label="Cancelar" icon="pi pi-times" text @click="displayDialog = false" class="flex-1" />
          <Button label="Salvar" icon="pi pi-check" @click="salvarCardapio" severity="success" class="flex-1 shadow-lg" />
        </div>
      </template>
    </Dialog>

    <!-- ============= DIALOG IMPORTAÇÃO ============= -->
    <Dialog v-model:visible="displayImport" header="Importar Cardápios" :style="{ width: '450px' }" modal class="!rounded-2xl">
      <div class="space-y-4">
        <p class="text-sm text-slate-600">Selecione o arquivo Excel com os cardápios.</p>
        <div>
          <label class="text-[10px] font-black text-slate-400 uppercase mb-2 block">Turnos</label>
          <SelectButton v-model="turnosImport" :options="[{label: 'Almoço', value: 'almoco'}, {label: 'Jantar', value: 'jantar'}]" optionLabel="label" optionValue="value" multiple class="turno-select" />
        </div>
        <FileUpload mode="basic" name="arquivo" accept=".xlsx,.xls,.csv" :maxFileSize="10000000" customUpload @select="onUpload" chooseLabel="Escolher Arquivo" class="w-full" :disabled="loadingImport" />
        <div class="p-3 bg-amber-50 rounded-xl border border-amber-200">
          <p class="text-xs text-amber-700"><i class="pi pi-info-circle mr-1"></i> Cardápios existentes serão atualizados.</p>
        </div>
        <Button label="Baixar Modelo" icon="pi pi-download" severity="secondary" outlined class="w-full" @click="downloadTemplate('cardapios')" />
      </div>
    </Dialog>

    <!-- ============= DIALOG EXCLUIR PERÍODO ============= -->
    <Dialog v-model:visible="displayDeletePeriod" header="Excluir por Período" :style="{ width: '400px' }" modal class="!rounded-2xl">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Início</label>
            <DatePicker v-model="periodForm.data_inicio" dateFormat="dd/mm/yy" showIcon :locale="ptBR" class="w-full" />
          </div>
          <div>
            <label class="text-[10px] font-black text-slate-400 uppercase mb-1 block">Fim</label>
            <DatePicker v-model="periodForm.data_fim" dateFormat="dd/mm/yy" showIcon :locale="ptBR" class="w-full" />
          </div>
        </div>
        <div class="p-3 bg-red-50 rounded-xl border border-red-200">
          <p class="text-xs text-red-700"><i class="pi pi-exclamation-triangle mr-1"></i> Ação irreversível!</p>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="displayDeletePeriod = false" />
        <Button label="Excluir" severity="danger" @click="deletarPorPeriodo" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.view-select :deep(.p-button) {
  border: 0;
  background: transparent;
  color: #64748b;
  font-weight: 700;
  padding: 0.5rem;
  border-radius: 0.75rem;
}
.view-select :deep(.p-button.p-highlight) {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}
.view-select :deep(.p-button:not(.p-highlight):hover) {
  background: #f1f5f9;
}

.turno-select :deep(.p-button) {
  border: 1px solid #e2e8f0;
  background: transparent;
  color: #64748b;
  font-weight: 600;
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
}
.turno-select :deep(.p-button.p-highlight) {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}
.turno-select :deep(.p-button:not(.p-highlight):hover) {
  background: #f8fafc;
}
</style>