<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { cardapioService } from '../../services/cardapio'
import PublicLayout from '../../layouts/PublicLayout.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import { useAuthStore } from '../../stores/auth'
import Skeleton from 'primevue/skeleton'
import SelectButton from 'primevue/selectbutton'

const auth = useAuthStore()
const isLoggedIn = computed(() => auth.isAuthenticated)

const cardapios = ref<any[]>([])
const cardapioHoje = ref<any>(null)
const loading = ref(false)
const loadingHoje = ref(false)
const error = ref('')

const activeTab = ref('semanal')
const turnoFiltro = ref<string>('almoco')
const dataReferencia = ref(new Date())

const turnoOptions = [
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

const carregarCardapioSemanal = async () => {
  loading.value = true
  error.value = ''
  try {
    const d = new Date(dataReferencia.value)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const segunda = new Date(d.setDate(diff)).toISOString().split('T')[0]

    const data = await cardapioService.semanal({ data: segunda })
    cardapios.value = data
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erro ao carregar o cardápio semanal'
  } finally {
    loading.value = false
  }
}

const carregarCardapioHoje = async () => {
  loadingHoje.value = true
  try {
    // Usar rota pública se não estiver logado, rota autenticada se estiver
    if (isLoggedIn.value) {
      cardapioHoje.value = await cardapioService.hoje()
    } else {
      // Usar rota pública
      cardapioHoje.value = await cardapioService.hojePublico()
    }
  } catch (err: any) {
    if (err?.response?.status === 404) {
      cardapioHoje.value = null
    } else {
      console.error('Erro ao carregar cardápio de hoje', err)
      error.value = err?.response?.data?.message || 'Erro ao carregar o cardápio de hoje'
    }
  } finally {
    loadingHoje.value = false
  }
}

const mudarSemana = (direcao: number) => {
  const novaData = new Date(dataReferencia.value)
  novaData.setDate(novaData.getDate() + (direcao * 7))
  dataReferencia.value = novaData
  carregarCardapioSemanal()
}

const getDiasSemana = computed(() => {
  const d = new Date(dataReferencia.value)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const segunda = new Date(d.setDate(diff))
  
  return Array.from({ length: 5 }, (_, i) => {
    const data = new Date(segunda)
    data.setDate(segunda.getDate() + i)
    
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    const dataIso = `${ano}-${mes}-${dia}`

    const weekdayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']

    return {
      label: weekdayNames[i],
      dia: data.getDate(),
      dataIso: dataIso
    }
  })
})

const getIntervaloSemana = computed(() => {
  const dias = getDiasSemana.value
  if (dias.length === 0) return ''

  const primeira = dias[0]
  const ultima = dias[dias.length - 1]
  
  if (!primeira || !ultima) return ''
  
  const mesNome = new Date(dataReferencia.value).toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()
  const ano = new Date(dataReferencia.value).getFullYear()
  
  return `${primeira.dia} A ${ultima.dia} DE ${mesNome} DE ${ano}`
})

// Retorna o cardápio de um dia específico pelo turno selecionado
const getCardapioDoDia = (dataIso: string) => {
  return cardapios.value.find(c =>
    c.data_do_cardapio === dataIso && c.turno === turnoFiltro.value
  )
}

// Retorna os itens formatados por categoria para exibição em grid
const getItensCategorizados = (cardapio: any) => {
  if (!cardapio) return []

  const itens = []

  // Proteína 1
  if (cardapio.prato_principal_ptn01) {
    itens.push({ valor: cardapio.prato_principal_ptn01, tipo: 'proteina' })
  }

  // Proteína 2
  if (cardapio.prato_principal_ptn02) {
    itens.push({ valor: cardapio.prato_principal_ptn02, tipo: 'proteina' })
  }

  // Vegetariano
  if (cardapio.ovo_lacto_vegetariano) {
    itens.push({ valor: cardapio.ovo_lacto_vegetariano, tipo: 'vegetariano' })
  }

  // Guarnição
  if (cardapio.guarnicao) {
    itens.push({ valor: cardapio.guarnicao, tipo: 'guarnicao' })
  }

  // Salada
  if (cardapio.salada) {
    itens.push({ valor: cardapio.salada, tipo: 'salada' })
  }

  // Acompanhamento 1 (Arroz)
  if (cardapio.acompanhamento_01) {
    itens.push({ valor: cardapio.acompanhamento_01, tipo: 'arroz' })
  }

  // Acompanhamento 2 (Feijão)
  if (cardapio.acompanhamento_02) {
    itens.push({ valor: cardapio.acompanhamento_02, tipo: 'feijao' })
  }

  // Sobremesa
  if (cardapio.sobremesa) {
    itens.push({ valor: cardapio.sobremesa, tipo: 'sobremesa' })
  }

  // Suco
  if (cardapio.suco) {
    itens.push({ valor: `Suco de ${cardapio.suco}`, tipo: 'suco' })
  }

  return itens
}

const getCorBorda = (tipo: string) => {
  const cores: Record<string, string> = {
    'proteina': 'border-l-blue-500 bg-blue-50',
    'vegetariano': 'border-l-pink-500 bg-pink-50',
    'guarnicao': 'border-l-amber-500 bg-amber-50',
    'salada': 'border-l-emerald-500 bg-emerald-50',
    'arroz': 'border-l-slate-400 bg-slate-50',
    'feijao': 'border-l-slate-400 bg-slate-50',
    'sobremesa': 'border-l-red-400 bg-red-50',
    'suco': 'border-l-purple-500 bg-purple-50'
  }
  return cores[tipo] || 'border-l-slate-300 bg-slate-50'
}

watch([turnoFiltro, dataReferencia], () => {
  if (activeTab.value === 'semanal') carregarCardapioSemanal()
})

// Recarregar dados quando muda a aba
watch(activeTab, (newTab) => {
  if (newTab === 'semanal') carregarCardapioSemanal()
  if (newTab === 'hoje') carregarCardapioHoje()
})

onMounted(() => {
  carregarCardapioSemanal()
  carregarCardapioHoje()
})
</script>

<template>
  <!-- Layout para usuário NÃO logado -->
  <PublicLayout v-if="!isLoggedIn">
    <div class="menu-container max-w-7xl mx-auto space-y-6 animate-fadein pb-20">

      <!-- Header Público -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div class="flex items-center gap-3">
          <i class="pi pi-building text-2xl text-primary-600"></i>
          <span class="text-xl font-black text-slate-800">Campus Salvador</span>
        </div>
        <!-- Sistema de Abas -->
        <div class="flex justify-center gap-2">
          <SelectButton
              v-model="activeTab"
              :options="[{ label: 'Hoje', value: 'hoje' }, { label: 'Semanal', value: 'semanal' }]"
              optionLabel="label"
              optionValue="value"
              :allowEmpty="false"
              class="tab-selector"
          />
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
        <div class="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto justify-between sm:justify-center">
          <button @click="mudarSemana(-1)" class="nav-btn">
            <i class="pi pi-chevron-left"></i>
          </button>
          <span class="text-xs sm:text-sm font-black text-slate-600 uppercase tracking-wider text-center flex-1 sm:flex-initial sm:min-w-[280px]">
            {{ getIntervaloSemana }}
          </span>
          <button @click="mudarSemana(1)" class="nav-btn">
            <i class="pi pi-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- Seletor de Turno -->
      <div class="flex justify-center">
        <SelectButton
          v-model="turnoFiltro"
          :options="turnoOptions"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
        />
      </div>

      <!-- Grid Semanal (Público) -->
      <div v-if="activeTab === 'semanal'" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div v-if="loading" class="p-8">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Skeleton v-for="i in 5" :key="i" height="400px" border-radius="1rem" />
          </div>
        </div>

        <div v-else class="p-4 sm:p-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div v-for="dia in getDiasSemana" :key="dia.dataIso" class="flex flex-col gap-3">
              <div class="day-header">
                <span class="day-label">{{ dia.label }}</span>
                <span class="day-number">{{ dia.dia }}</span>
              </div>

              <div class="flex flex-col gap-2">
                <template v-if="getCardapioDoDia(dia.dataIso)">
                  <div
                    v-for="(item, idx) in getItensCategorizados(getCardapioDoDia(dia.dataIso))"
                    :key="idx"
                    class="menu-item-card"
                    :class="getCorBorda(item.tipo)"
                  >
                    {{ item.valor }}
                  </div>
                </template>
                <div v-else class="no-menu-day">
                  <i class="pi pi-calendar-times text-slate-300 text-xl mb-2"></i>
                  <span class="text-[10px] text-slate-400 font-bold uppercase">Sem cardápio</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Legenda -->
        <div class="legend-bar">
          <div class="legend-item">
            <span class="legend-dot bg-blue-500"></span>
            <span>Proteína</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot bg-pink-500"></span>
            <span>Vegetariano</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot bg-amber-500"></span>
            <span>Guarnição</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot bg-emerald-500"></span>
            <span>Salada</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot bg-slate-400"></span>
            <span>Arroz/Feijão</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot bg-red-400"></span>
            <span>Sobremesa</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot bg-purple-500"></span>
            <span>Suco</span>
          </div>
        </div>
      </div>

      <!-- Aba Hoje (Público) -->
      <div v-if="activeTab === 'hoje'" class="max-w-5xl mx-auto py-6">
        <div v-if="loadingHoje" class="grid md:grid-cols-2 gap-6">
          <Skeleton height="400px" border-radius="1rem" />
          <Skeleton height="400px" border-radius="1rem" />
        </div>
        <div v-else-if="!cardapioHoje || (!cardapioHoje.almoco && !cardapioHoje.jantar)" class="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div class="mb-6">
            <i class="pi pi-calendar-times text-6xl text-slate-200"></i>
          </div>
          <h3 class="text-2xl font-bold text-slate-700 mb-2">Nenhum cardápio para hoje</h3>
          <p class="text-slate-500 mb-6">Confira o cardápio semanal para ver outras opções</p>
          <button
            @click="activeTab = 'semanal'"
            class="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
          >
            Ver Cardápio Semanal
          </button>
        </div>
        <div v-else class="grid md:grid-cols-2 gap-8">
          <!-- Almoço -->
          <div v-if="cardapioHoje.almoco" class="today-card almoco-card">
            <div class="today-card-header">
              <div class="today-icon almoco-icon">
                <i class="pi pi-sun text-2xl"></i>
              </div>
              <div>
                <h3 class="text-2xl font-black">Almoço</h3>
                <p class="text-xs font-bold opacity-80">11:00 - 14:00</p>
              </div>
            </div>
            <div class="today-card-content">
              <div class="today-item main">
                <span class="today-label">Prato Principal</span>
                <span class="today-value">{{ cardapioHoje.prato_principal_ptn01 }}</span>
                <span v-if="cardapioHoje.prato_principal_ptn02" class="today-value text-slate-500">{{ cardapioHoje.prato_principal_ptn02 }}</span>
              </div>
              <div v-if="cardapioHoje.ovo_lacto_vegetariano" class="today-item vegetarian">
                <span class="today-label"><i class="pi pi-heart text-pink-500 mr-1"></i>Opção Vegetariana</span>
                <span class="today-value">{{ cardapioHoje.ovo_lacto_vegetariano }}</span>
              </div>
              <div class="today-item">
                <span class="today-label">Acompanhamentos</span>
                <span class="today-value">{{ cardapioHoje.acompanhamento_01 }}</span>
                <span v-if="cardapioHoje.acompanhamento_02" class="today-value text-slate-500">{{ cardapioHoje.acompanhamento_02 }}</span>
              </div>
              <div class="today-row">
                <div class="today-item small" v-if="cardapioHoje.guarnicao">
                  <span class="today-label">Guarnição</span>
                  <span class="today-value">{{ cardapioHoje.guarnicao }}</span>
                </div>
                <div class="today-item small" v-if="cardapioHoje.salada">
                  <span class="today-label">Salada</span>
                  <span class="today-value">{{ cardapioHoje.salada }}</span>
                </div>
              </div>
              <div class="today-row" v-if="cardapioHoje.sobremesa || cardapioHoje.suco">
                <div class="today-item small dessert" v-if="cardapioHoje.sobremesa">
                  <span class="today-label">Sobremesa</span>
                  <span class="today-value">{{ cardapioHoje.sobremesa }}</span>
                </div>
                <div class="today-item small drink" v-if="cardapioHoje.suco">
                  <span class="today-label">Suco</span>
                  <span class="today-value">{{ cardapioHoje.suco }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- Jantar -->
          <div v-if="cardapioHoje.jantar" class="today-card jantar-card">
            <div class="today-card-header">
              <div class="today-icon jantar-icon">
                <i class="pi pi-moon text-2xl"></i>
              </div>
              <div>
                <h3 class="text-2xl font-black">Jantar</h3>
                <p class="text-xs font-bold opacity-80">18:00 - 20:30</p>
              </div>
            </div>
            <div class="today-card-content">
              <div class="today-item main">
                <span class="today-label">Prato Principal</span>
                <span class="today-value">{{ cardapioHoje.prato_principal_ptn01 }}</span>
                <span v-if="cardapioHoje.prato_principal_ptn02" class="today-value text-slate-500">{{ cardapioHoje.prato_principal_ptn02 }}</span>
              </div>
              <div v-if="cardapioHoje.ovo_lacto_vegetariano" class="today-item vegetarian">
                <span class="today-label"><i class="pi pi-heart text-pink-500 mr-1"></i>Opção Vegetariana</span>
                <span class="today-value">{{ cardapioHoje.ovo_lacto_vegetariano }}</span>
              </div>
              <div class="today-item">
                <span class="today-label">Acompanhamentos</span>
                <span class="today-value">{{ cardapioHoje.acompanhamento_01 }}</span>
                <span v-if="cardapioHoje.acompanhamento_02" class="today-value text-slate-500">{{ cardapioHoje.acompanhamento_02 }}</span>
              </div>
              <div class="today-row">
                <div class="today-item small" v-if="cardapioHoje.guarnicao">
                  <span class="today-label">Guarnição</span>
                  <span class="today-value">{{ cardapioHoje.guarnicao }}</span>
                </div>
                <div class="today-item small" v-if="cardapioHoje.salada">
                  <span class="today-label">Salada</span>
                  <span class="today-value">{{ cardapioHoje.salada }}</span>
                </div>
              </div>
              <div class="today-row" v-if="cardapioHoje.sobremesa || cardapioHoje.suco">
                <div class="today-item small dessert" v-if="cardapioHoje.sobremesa">
                  <span class="today-label">Sobremesa</span>
                  <span class="today-value">{{ cardapioHoje.sobremesa }}</span>
                </div>
                <div class="today-item small drink" v-if="cardapioHoje.suco">
                  <span class="today-label">Suco</span>
                  <span class="today-value">{{ cardapioHoje.suco }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PublicLayout>

  <!-- Layout para usuário LOGADO -->
  <div v-else class="space-y-6 animate-fadein">
    <PageHeader
      title="Cardápio"
      subtitle="Confira o cardápio do Restaurante Institucional"
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Dashboard', route: '/dashboard' }, { label: 'Cardápio' }]"
    />

    <!-- Header com navegação -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <div class="flex flex-wrap items-center justify-center gap-3">
        <SelectButton
            v-model="activeTab"
            :options="[{ label: 'Hoje', value: 'hoje' }, { label: 'Semanal', value: 'semanal' }]"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
        />
        <SelectButton
          v-model="turnoFiltro"
          :options="turnoOptions"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
        />
      </div>

      <div class="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100 w-full md:w-auto justify-between md:justify-center">
        <button @click="mudarSemana(-1)" class="nav-btn">
          <i class="pi pi-chevron-left"></i>
        </button>
        <span class="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider text-center flex-1 md:flex-initial md:min-w-[200px]">
          {{ getIntervaloSemana }}
        </span>
        <button @click="mudarSemana(1)" class="nav-btn">
          <i class="pi pi-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Grid Semanal (Logado) -->
    <div v-if="activeTab === 'semanal'" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div v-if="loading" class="p-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Skeleton v-for="i in 5" :key="i" height="350px" border-radius="0.75rem" />
        </div>
      </div>

      <div v-else class="p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div v-for="dia in getDiasSemana" :key="dia.dataIso" class="flex flex-col gap-2">
            <div class="day-header">
              <span class="day-label">{{ dia.label }}</span>
              <span class="day-number">{{ dia.dia }}</span>
            </div>

            <div class="flex flex-col gap-1.5">
              <template v-if="getCardapioDoDia(dia.dataIso)">
                <div
                  v-for="(item, idx) in getItensCategorizados(getCardapioDoDia(dia.dataIso))"
                  :key="idx"
                  class="menu-item-card"
                  :class="getCorBorda(item.tipo)"
                >
                  {{ item.valor }}
                </div>
              </template>
              <div v-else class="no-menu-day">
                <i class="pi pi-calendar-times text-slate-300 text-lg mb-1"></i>
                <span class="text-[9px] text-slate-400 font-bold uppercase">Sem cardápio</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Legenda -->
      <div class="legend-bar">
        <div class="legend-item">
          <span class="legend-dot bg-blue-500"></span>
          <span>Proteína</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot bg-pink-500"></span>
          <span>Vegetariano</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot bg-amber-500"></span>
          <span>Guarnição</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot bg-emerald-500"></span>
          <span>Salada</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot bg-slate-400"></span>
          <span>Arroz/Feijão</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot bg-red-400"></span>
          <span>Sobremesa</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot bg-purple-500"></span>
          <span>Suco</span>
        </div>
      </div>
    </div>

    <!-- Aba Hoje (Logado) -->
    <div v-if="activeTab === 'hoje'" class="max-w-4xl mx-auto">
      <div v-if="loadingHoje" class="grid md:grid-cols-2 gap-6">
        <Skeleton height="350px" border-radius="0.75rem" />
        <Skeleton height="350px" border-radius="0.75rem" />
      </div>
      <div v-else-if="!cardapioHoje || (!cardapioHoje.almoco && !cardapioHoje.jantar)" class="text-center py-12 bg-white rounded-xl border border-slate-200">
        <i class="pi pi-calendar-times text-5xl text-slate-200 mb-4"></i>
        <h3 class="text-xl font-bold text-slate-700 mb-2">Nenhum cardápio para hoje</h3>
        <p class="text-slate-500 mb-4 text-sm">Confira o cardápio semanal</p>
        <button
          @click="activeTab = 'semanal'"
          class="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors"
        >
          Ver Semanal
        </button>
      </div>
      <div v-else class="grid md:grid-cols-2 gap-6">
        <!-- Almoço -->
        <div v-if="cardapioHoje.almoco" class="today-card almoco-card">
          <div class="today-card-header">
            <div class="today-icon almoco-icon">
              <i class="pi pi-sun text-xl"></i>
            </div>
            <div>
              <h3 class="text-xl font-black">Almoço</h3>
              <p class="text-[10px] font-bold opacity-80">11:00 - 14:00</p>
            </div>
          </div>
          <div class="today-card-content">
            <div class="today-item main">
              <span class="today-label">Prato Principal</span>
              <span class="today-value">{{ cardapioHoje.prato_principal_ptn01 }}</span>
              <span v-if="cardapioHoje.prato_principal_ptn02" class="today-value text-slate-500 text-sm">{{ cardapioHoje.prato_principal_ptn02 }}</span>
            </div>
            <div v-if="cardapioHoje.ovo_lacto_vegetariano" class="today-item vegetarian">
              <span class="today-label"><i class="pi pi-heart text-pink-500 mr-1"></i>Vegetariana</span>
              <span class="today-value">{{ cardapioHoje.ovo_lacto_vegetariano }}</span>
            </div>
            <div class="today-item">
              <span class="today-label">Acompanhamentos</span>
              <span class="today-value">{{ cardapioHoje.acompanhamento_01 }}</span>
              <span v-if="cardapioHoje.acompanhamento_02" class="today-value text-slate-500 text-sm">{{ cardapioHoje.acompanhamento_02 }}</span>
            </div>
            <div class="today-row">
              <div class="today-item small" v-if="cardapioHoje.guarnicao">
                <span class="today-label">Guarnição</span>
                <span class="today-value text-sm">{{ cardapioHoje.guarnicao }}</span>
              </div>
              <div class="today-item small" v-if="cardapioHoje.salada">
                <span class="today-label">Salada</span>
                <span class="today-value text-sm">{{ cardapioHoje.salada }}</span>
              </div>
            </div>
            <div class="today-row" v-if="cardapioHoje.sobremesa || cardapioHoje.suco">
              <div class="today-item small dessert" v-if="cardapioHoje.sobremesa">
                <span class="today-label">Sobremesa</span>
                <span class="today-value text-sm">{{ cardapioHoje.sobremesa }}</span>
              </div>
              <div class="today-item small drink" v-if="cardapioHoje.suco">
                <span class="today-label">Suco</span>
                <span class="today-value text-sm">{{ cardapioHoje.suco }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Jantar -->
        <div v-if="cardapioHoje.jantar" class="today-card jantar-card">
          <div class="today-card-header">
            <div class="today-icon jantar-icon">
              <i class="pi pi-moon text-xl"></i>
            </div>
            <div>
              <h3 class="text-xl font-black">Jantar</h3>
              <p class="text-[10px] font-bold opacity-80">18:00 - 20:30</p>
            </div>
          </div>
          <div class="today-card-content">
            <div class="today-item main">
              <span class="today-label">Prato Principal</span>
              <span class="today-value">{{ cardapioHoje.prato_principal_ptn01 }}</span>
              <span v-if="cardapioHoje.prato_principal_ptn02" class="today-value text-slate-500 text-sm">{{ cardapioHoje.prato_principal_ptn02 }}</span>
            </div>
            <div v-if="cardapioHoje.ovo_lacto_vegetariano" class="today-item vegetarian">
              <span class="today-label"><i class="pi pi-heart text-pink-500 mr-1"></i>Vegetariana</span>
              <span class="today-value">{{ cardapioHoje.ovo_lacto_vegetariano }}</span>
            </div>
            <div class="today-item">
              <span class="today-label">Acompanhamentos</span>
              <span class="today-value">{{ cardapioHoje.acompanhamento_01 }}</span>
              <span v-if="cardapioHoje.acompanhamento_02" class="today-value text-slate-500 text-sm">{{ cardapioHoje.acompanhamento_02 }}</span>
            </div>
            <div class="today-row">
              <div class="today-item small" v-if="cardapioHoje.guarnicao">
                <span class="today-label">Guarnição</span>
                <span class="today-value text-sm">{{ cardapioHoje.guarnicao }}</span>
              </div>
              <div class="today-item small" v-if="cardapioHoje.salada">
                <span class="today-label">Salada</span>
                <span class="today-value text-sm">{{ cardapioHoje.salada }}</span>
              </div>
            </div>
            <div class="today-row" v-if="cardapioHoje.sobremesa || cardapioHoje.suco">
              <div class="today-item small dessert" v-if="cardapioHoje.sobremesa">
                <span class="today-label">Sobremesa</span>
                <span class="today-value text-sm">{{ cardapioHoje.sobremesa }}</span>
              </div>
              <div class="today-item small drink" v-if="cardapioHoje.suco">
                <span class="today-label">Suco</span>
                <span class="today-value text-sm">{{ cardapioHoje.suco }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-container {
  padding: 20px;
}

/* Botão de navegação */
.nav-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: var(--p-primary-50);
  color: var(--p-primary-500);
  border-color: var(--p-primary-500);
}

/* Seletor de Turno - Estilo Limpo */
:deep(.turno-selector) {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
  border: 1px solid #e2e8f0;
}

:deep(.turno-selector .p-togglebutton) {
  border: none !important;
  border-radius: 10px !important;
  padding: 10px 28px !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  background: transparent !important;
  color: #64748b !important;
  box-shadow: none !important;
  transition: all 0.2s ease !important;
}

:deep(.turno-selector .p-togglebutton:hover:not(.p-togglebutton-checked)) {
  background: #e2e8f0 !important;
  color: #334155 !important;
}

:deep(.turno-selector .p-togglebutton.p-togglebutton-checked) {
  background: white !important;
  color: var(--p-primary-500) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
}

/* Seletor de Aba - Estilo Limpo */
:deep(.tab-selector) {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
  border: 1px solid #e2e8f0;
}

:deep(.tab-selector .p-togglebutton) {
  border: none !important;
  border-radius: 10px !important;
  padding: 8px 20px !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  background: transparent !important;
  color: #64748b !important;
  box-shadow: none !important;
  transition: all 0.2s ease !important;
}

:deep(.tab-selector .p-togglebutton:hover:not(.p-togglebutton-checked)) {
  background: #e2e8f0 !important;
  color: #334155 !important;
}

:deep(.tab-selector .p-togglebutton.p-togglebutton-checked) {
  background: white !important;
  color: var(--p-primary-500) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
}

/* Header do Dia */
.day-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  transition: all 0.2s;
}

.day-header:hover {
  border-color: var(--p-primary-500);
  box-shadow: 0 4px 12px rgba(50, 160, 65, 0.1);
}

.day-label {
  display: block;
  font-size: 10px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 4px;
}

.day-number {
  display: block;
  font-size: 2rem;
  font-weight: 900;
  color: #1e293b;
  line-height: 1;
}

/* Card de Item do Menu */
.menu-item-card {
  padding: 10px 12px;
  border-radius: 10px;
  border-left: 4px solid;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  transition: all 0.2s;
  line-height: 1.3;
}

.menu-item-card:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Dia sem cardápio */
.no-menu-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  background: #fafafa;
}

/* Legenda */
.legend-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

/* Cards de Hoje */
.today-card {
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
}

.today-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.almoco-card {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border: 2px solid #a7f3d0;
}

.jantar-card {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 2px solid #bfdbfe;
}

.today-card-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.almoco-card .today-card-header {
  color: #065f46;
}

.jantar-card .today-card-header {
  color: #1e40af;
}

.today-icon {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.almoco-icon {
  background: linear-gradient(135deg, var(--p-primary-400), var(--p-primary-600));
}

.jantar-icon {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.today-card-content {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.today-item {
  background: white;
  padding: 14px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.today-item.main {
  border-left: 4px solid #3b82f6;
}

.today-item.small {
  flex: 1;
  padding: 12px;
}

.today-item.dessert {
  border-left: 3px solid #ec4899;
}

.today-item.drink {
  border-left: 3px solid #8b5cf6;
}

.today-item.vegetarian {
  border-left: 3px solid #ec4899;
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
}

.today-row {
  display: flex;
  gap: 12px;
}

.today-label {
  display: block;
  font-size: 10px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.today-value {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

/* Responsividade */
@media (max-width: 768px) {
  .menu-container {
    padding: 12px;
  }

  .today-row {
    flex-direction: column;
  }

  .day-number {
    font-size: 1.5rem;
  }

  .menu-item-card {
    font-size: 11px;
    padding: 8px 10px;
  }
}

/* Animação */
.animate-fadein {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
