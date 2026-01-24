<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { cardapioService } from '../../services/cardapio'
import PublicLayout from '../../layouts/PublicLayout.vue'
import type { CardapioDia } from '../../types/cardapio'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import SelectButton from 'primevue/selectbutton'

const cardapios = ref<any[]>([])
const cardapioHoje = ref<CardapioDia | null>(null)
const loading = ref(false)
const loadingHoje = ref(false)
const error = ref('')

const activeTab = ref('semanal')
const turnoFiltro = ref<string | null>(null) // null = Todos, 'almoco', 'jantar'
const dataReferencia = ref(new Date()) // Data para controle da semana/mês

const turnoOptions = [
  { label: 'Todos', value: null },
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

const carregarCardapioSemanal = async () => {
  loading.value = true
  error.value = ''
  try {
    // Pegar início da semana (segunda-feira)
    const d = new Date(dataReferencia.value)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const segunda = new Date(d.setDate(diff)).toISOString().split('T')[0]

    const data = await cardapioService.semanal({ 
      turno: turnoFiltro.value ?? undefined,
      data: segunda
    })
    cardapios.value = data
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erro ao carregar o cardápio semanal'
  } finally {
    loading.value = false
  }
}

const carregarCardapioMensal = async () => {
  loading.value = true
  try {
    const data = await cardapioService.mensal({ 
      turno: turnoFiltro.value ?? undefined,
      per_page: 50 // Pegar o mês todo
    })
    cardapios.value = data
  } catch (err) {
    console.error('Erro ao carregar cardápio mensal', err)
  } finally {
    loading.value = false
  }
}

const carregarCardapioHoje = async () => {
  loadingHoje.value = true
  try {
    cardapioHoje.value = await cardapioService.hoje()
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

const alternarAba = (tab: string) => {
  activeTab.value = tab
  if (tab === 'semanal') carregarCardapioSemanal()
  if (tab === 'mensal') carregarCardapioMensal()
  if (tab === 'hoje') carregarCardapioHoje()
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
  // diff para segunda-feira
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const segunda = new Date(d.setDate(diff))
  
  return Array.from({ length: 5 }, (_, i) => {
    const data = new Date(segunda)
    data.setDate(segunda.getDate() + i)
    
    // Formatar YYYY-MM-DD manualmente para evitar timezone shift
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    const dataIso = `${ano}-${mes}-${dia}`

    return {
      label: data.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0],
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
  
  const mesNome = new Date(dataReferencia.value).toLocaleDateString('pt-BR', { month: 'long' })
  const ano = new Date(dataReferencia.value).getFullYear()
  
  return `${primeira.dia} a ${ultima.dia} de ${mesNome} de ${ano}`
})

const getCardapioDoDia = (dataIso: string) => {
  return cardapios.value.filter(c => c.data_do_cardapio === dataIso)
}

const getItensFormatados = (dataIso: string) => {
  const cardapiosDia = getCardapioDoDia(dataIso)
  if (cardapiosDia.length === 0) return []

  const itens: any[] = []

  // Almoço
  const almoco = cardapiosDia.find(c => c.turno === 'almoco')
  if (almoco) {
    if (almoco.prato_principal_ptn01) itens.push({ label: almoco.prato_principal_ptn01, tipo: 'proteina_almoco' })
    if (almoco.prato_principal_ptn02) itens.push({ label: almoco.prato_principal_ptn02, tipo: 'proteina_almoco' })
    if (almoco.guarnicao) itens.push({ label: almoco.guarnicao, tipo: 'guarnicao' })
    if (almoco.salada) itens.push({ label: almoco.salada, tipo: 'proteina_almoco' }) // Verde na imagem
    if (almoco.acompanhamento_01) itens.push({ label: almoco.acompanhamento_01, tipo: 'normal' })
    if (almoco.acompanhamento_02) itens.push({ label: almoco.acompanhamento_02, tipo: 'normal' })
    if (almoco.sobremesa) itens.push({ label: almoco.sobremesa, tipo: 'sobremesa' })
    if (almoco.suco) itens.push({ label: almoco.suco, tipo: 'jantar_suco' }) // Azul na imagem
    if (almoco.ovo_lacto_vegetariano) itens.push({ label: almoco.ovo_lacto_vegetariano, tipo: 'veg_almoco' })
  }

  // Jantar (se não for repetido ou se for diferente)
  const jantar = cardapiosDia.find(c => c.turno === 'jantar')
  if (jantar) {
    // Na imagem, parece que o jantar tem itens azuis e roxos
    if (jantar.prato_principal_ptn01 && (!almoco || jantar.prato_principal_ptn01 !== almoco.prato_principal_ptn01)) 
      itens.push({ label: jantar.prato_principal_ptn01, tipo: 'jantar_suco' })
    
    if (jantar.ovo_lacto_vegetariano && (!almoco || jantar.ovo_lacto_vegetariano !== almoco.ovo_lacto_vegetariano))
      itens.push({ label: jantar.ovo_lacto_vegetariano, tipo: 'veg_jantar' })
  }

  return itens
}

watch([turnoFiltro, dataReferencia], () => {
  if (activeTab.value === 'semanal') carregarCardapioSemanal()
  if (activeTab.value === 'mensal') carregarCardapioMensal()
})

onMounted(() => {
  carregarCardapioSemanal()
  carregarCardapioHoje()
})

const getCorEstilo = (tipo: string) => {
  const cores: any = {
    'proteina_almoco': 'bg-emerald-50 border-emerald-500 text-emerald-700',
    'jantar_suco': 'bg-blue-50 border-blue-500 text-blue-700',
    'guarnicao': 'bg-orange-50 border-orange-500 text-orange-700',
    'sobremesa': 'bg-red-50 border-red-500 text-red-700',
    'veg_almoco': 'bg-pink-50 border-pink-500 text-pink-700',
    'veg_jantar': 'bg-purple-50 border-purple-500 text-purple-700'
  }
  return cores[tipo] || 'bg-slate-50 border-slate-300 text-slate-700'
}
</script>

<template>
  <PublicLayout>
    <div class="max-w-7xl mx-auto space-y-6 animate-fadein pb-20">
      <!-- Sistema de Abas Estilo Imagem -->
      <div class="flex justify-center sm:justify-start gap-4 mb-8">
        <button 
          v-for="tab in ['hoje', 'semanal', 'mensal']" 
          :key="tab"
          @click="alternarAba(tab)"
          class="flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all border-b-2"
          :class="activeTab === tab ? 'text-primary-600 border-primary-500 bg-primary-50/50' : 'text-slate-400 border-transparent hover:text-slate-600'"
        >
          <i :class="tab === 'hoje' ? 'pi pi-calendar' : (tab === 'semanal' ? 'pi pi-calendar-plus' : 'pi pi-calendar-minus')"></i>
          <span class="capitalize">{{ tab }}</span>
        </button>
      </div>

      <!-- Card Principal -->
      <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <!-- Header do Card -->
        <div class="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div class="flex items-center gap-3 text-slate-700">
            <i class="pi pi-building text-2xl text-primary-500"></i>
            <span class="text-xl font-bold tracking-tight">Campus Salvador</span>
          </div>

          <div class="flex items-center gap-6 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
            <button @click="mudarSemana(-1)" class="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-primary-600">
              <i class="pi pi-chevron-left text-xl"></i>
            </button>
            <span class="text-sm font-black text-slate-500 uppercase tracking-widest min-w-[250px] text-center">
              {{ getIntervaloSemana }}
            </span>
            <button @click="mudarSemana(1)" class="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-primary-600">
              <i class="pi pi-chevron-right text-xl"></i>
            </button>
          </div>
        </div>

        <!-- Filtro de Turnos Centralizado -->
        <div class="p-6 flex justify-center bg-slate-50/30">
          <SelectButton 
            v-model="turnoFiltro" 
            :options="turnoOptions" 
            optionLabel="label" 
            optionValue="value" 
            :unselectable="false"
            class="custom-selectbutton-dark"
          />
        </div>

        <!-- Conteúdo Principal (Grid Semanal) -->
        <div class="p-4 overflow-x-auto">
          <div v-if="activeTab === 'semanal'" class="min-w-[1000px]">
            <div v-if="loading" class="grid grid-cols-5 gap-4">
              <Skeleton v-for="i in 5" :key="i" height="400px" border-radius="1.5rem" />
            </div>
            <div v-else class="grid grid-cols-5 gap-5">
              <!-- Colunas de Dias -->
              <div v-for="dia in getDiasSemana" :key="dia.dataIso" class="space-y-3">
                <!-- Header do Dia -->
                <div class="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-2xl border-2 border-slate-200 text-center shadow-sm hover:shadow-md transition-shadow">
                  <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{{ dia.label }}</p>
                  <p class="text-3xl font-black text-slate-700 leading-none">{{ dia.dia }}</p>
                </div>

                <!-- Itens do Cardápio -->
                <div class="space-y-2.5">
                  <div 
                    v-for="(item, idx) in getItensFormatados(dia.dataIso)" 
                    :key="idx"
                    class="group p-3.5 border-l-[5px] rounded-xl shadow-sm text-xs font-bold leading-snug transition-all hover:scale-[1.03] hover:shadow-md cursor-default"
                    :class="getCorEstilo(item.tipo)"
                  >
                    <span class="block">{{ item.label }}</span>
                  </div>
                  
                  <div v-if="getItensFormatados(dia.dataIso).length === 0" class="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30 hover:bg-slate-50/50 transition-colors">
                    <i class="pi pi-calendar-times text-slate-200 text-3xl mb-2 block"></i>
                    <p class="text-[9px] font-black text-slate-300 uppercase tracking-[0.15em]">Sem Cardápio</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Aba Hoje (Simples) -->
          <div v-if="activeTab === 'hoje'" class="max-w-5xl mx-auto py-10">
             <div v-if="loadingHoje" class="grid md:grid-cols-2 gap-6">
                <Skeleton height="350px" border-radius="2rem" />
                <Skeleton height="350px" border-radius="2rem" />
             </div>
             <div v-else-if="!cardapioHoje || (!cardapioHoje.almoco && !cardapioHoje.jantar)" class="text-center py-16">
                <div class="mb-6">
                   <i class="pi pi-calendar-times text-6xl text-slate-200"></i>
                </div>
                <h3 class="text-2xl font-bold text-slate-700 mb-2">Nenhum cardápio para hoje</h3>
                <p class="text-slate-500 mb-6">Confira o cardápio semanal para ver outras opções</p>
                <button 
                   @click="activeTab = 'semanal'; carregarCardapioSemanal()"
                   class="px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-colors"
                >
                   Ver Cardápio Semanal
                </button>
             </div>
             <div v-else class="grid md:grid-cols-2 gap-8">
                <!-- Almoço -->
                <div v-if="cardapioHoje.almoco" class="group relative overflow-hidden p-8 rounded-[2.5rem] border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                   <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16"></div>
                   <div class="relative z-10">
                      <div class="flex items-center gap-3 mb-6">
                         <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                            <i class="pi pi-sun text-3xl"></i>
                         </div>
                         <div>
                            <h3 class="text-3xl font-black text-emerald-800 tracking-tight">Almoço</h3>
                            <p class="text-xs font-bold text-emerald-600 uppercase tracking-wider">11:00 - 14:00</p>
                         </div>
                      </div>
                      <div class="space-y-3">
                         <div class="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md transition-shadow">
                            <p class="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                               <i class="pi pi-star-fill"></i> Prato Principal
                            </p>
                            <p class="text-lg font-black text-emerald-900 leading-tight">{{ cardapioHoje.almoco.prato_principal }}</p>
                         </div>
                         <div class="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md transition-shadow">
                            <p class="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Acompanhamentos</p>
                            <p class="text-sm font-semibold text-emerald-700">{{ cardapioHoje.almoco.acompanhamento }}</p>
                         </div>
                         <div class="grid grid-cols-2 gap-3">
                            <div class="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
                               <p class="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Guarnição</p>
                               <p class="text-xs font-bold text-emerald-700">{{ cardapioHoje.almoco.guarnicao }}</p>
                            </div>
                            <div class="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
                               <p class="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Salada</p>
                               <p class="text-xs font-bold text-emerald-700">{{ cardapioHoje.almoco.salada }}</p>
                            </div>
                         </div>
                         <div v-if="cardapioHoje.almoco.sobremesa || cardapioHoje.almoco.suco" class="flex gap-3">
                            <div v-if="cardapioHoje.almoco.sobremesa" class="flex-1 bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-2xl shadow-sm border border-red-100">
                               <p class="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Sobremesa</p>
                               <p class="text-xs font-bold text-red-700">{{ cardapioHoje.almoco.sobremesa }}</p>
                            </div>
                            <div v-if="cardapioHoje.almoco.suco" class="flex-1 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-2xl shadow-sm border border-blue-100">
                               <p class="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Suco</p>
                               <p class="text-xs font-bold text-blue-700">{{ cardapioHoje.almoco.suco }}</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                <!-- Jantar -->
                <div v-if="cardapioHoje.jantar" class="group relative overflow-hidden p-8 rounded-[2.5rem] border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                   <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16"></div>
                   <div class="relative z-10">
                      <div class="flex items-center gap-3 mb-6">
                         <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                            <i class="pi pi-moon text-3xl"></i>
                         </div>
                         <div>
                            <h3 class="text-3xl font-black text-blue-800 tracking-tight">Jantar</h3>
                            <p class="text-xs font-bold text-blue-600 uppercase tracking-wider">18:00 - 20:30</p>
                         </div>
                      </div>
                      <div class="space-y-3">
                         <div class="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
                            <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                               <i class="pi pi-star-fill"></i> Prato Principal
                            </p>
                            <p class="text-lg font-black text-blue-900 leading-tight">{{ cardapioHoje.jantar.prato_principal }}</p>
                         </div>
                         <div class="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
                            <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Acompanhamentos</p>
                            <p class="text-sm font-semibold text-blue-700">{{ cardapioHoje.jantar.acompanhamento }}</p>
                         </div>
                         <div class="grid grid-cols-2 gap-3">
                            <div class="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
                               <p class="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Guarnição</p>
                               <p class="text-xs font-bold text-blue-700">{{ cardapioHoje.jantar.guarnicao }}</p>
                            </div>
                            <div class="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
                               <p class="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Salada</p>
                               <p class="text-xs font-bold text-blue-700">{{ cardapioHoje.jantar.salada }}</p>
                            </div>
                         </div>
                         <div v-if="cardapioHoje.jantar.sobremesa || cardapioHoje.jantar.suco" class="flex gap-3">
                            <div v-if="cardapioHoje.jantar.sobremesa" class="flex-1 bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-2xl shadow-sm border border-red-100">
                               <p class="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Sobremesa</p>
                               <p class="text-xs font-bold text-red-700">{{ cardapioHoje.jantar.sobremesa }}</p>
                            </div>
                            <div v-if="cardapioHoje.jantar.suco" class="flex-1 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-2xl shadow-sm border border-blue-100">
                               <p class="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Suco</p>
                               <p class="text-xs font-bold text-blue-700">{{ cardapioHoje.jantar.suco }}</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <!-- Aba Mensal (Lista) -->
          <div v-if="activeTab === 'mensal'" class="p-4">
             <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="c in cardapios" :key="c.id" class="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-all">
                   <div class="flex justify-between items-center mb-4">
                      <span class="text-sm font-black text-slate-700">{{ new Date(c.data_do_cardapio).toLocaleDateString() }}</span>
                      <Tag :value="c.turno" :severity="c.turno === 'almoco' ? 'success' : 'info'" class="!rounded-full px-3 uppercase text-[10px] font-black" />
                   </div>
                   <p class="font-black text-slate-800 leading-tight">{{ c.prato_principal_ptn01 }}</p>
                   <p class="text-xs text-slate-400 mt-2 font-medium">{{ c.acompanhamento_01 }}, {{ c.guarnicao }}</p>
                </div>
             </div>
          </div>
        </div>

        <!-- Rodapé com Legenda -->
        <div class="p-8 bg-slate-50/50 border-t border-slate-100">
          <div class="flex flex-wrap justify-center gap-6">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-md bg-emerald-500"></div>
              <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Salada / Proteína Almoço</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-md bg-blue-500"></div>
              <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Jantar / Suco</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-md bg-orange-500"></div>
              <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Guarnição</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-md bg-red-500"></div>
              <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sobremesa</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-md bg-pink-500"></div>
              <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vegetariano Almoço</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-md bg-purple-500"></div>
              <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vegetariano Jantar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PublicLayout>
</template>

<style scoped>
:deep(.custom-selectbutton-dark .p-togglebutton.p-togglebutton-active) {
    background-color: #1e293b !important;
    border-color: #1e293b !important;
    color: #ffffff !important;
}

:deep(.custom-selectbutton-dark .p-togglebutton) {
    border-radius: 0.75rem;
    padding: 0.5rem 1.5rem;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.05em;
}
</style>
