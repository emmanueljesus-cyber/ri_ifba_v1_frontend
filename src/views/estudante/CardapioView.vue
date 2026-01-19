<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { cardapioService } from '../../services/cardapio'
import PageHeader from '../../components/common/PageHeader.vue'
import PublicLayout from '../../layouts/PublicLayout.vue'
import type { Cardapio, CardapioDia } from '../../types/cardapio'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'

const cardapios = ref<Cardapio[]>([])
const cardapioHoje = ref<CardapioDia | null>(null)
const loading = ref(false)
const loadingHoje = ref(false)
const error = ref('')
const currentIndex = ref(0)
const auth = useAuthStore()

const carregarCardapio = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await cardapioService.semanal()
    cardapios.value = data
    
    // Encontrar o de hoje se possível na lista semanal
    const hojeStr = new Date().toLocaleDateString('sv-SE')
    const indexHoje = cardapios.value.findIndex(c => c.data_do_cardapio === hojeStr)
    if (indexHoje !== -1) {
      currentIndex.value = indexHoje
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erro ao carregar o cardápio semanal'
  } finally {
    loading.value = false
  }
}

const carregarCardapioHoje = async () => {
  loadingHoje.value = true
  try {
    cardapioHoje.value = await cardapioService.hoje()
  } catch (err) {
    console.error('Erro ao carregar cardápio de hoje', err)
  } finally {
    loadingHoje.value = false
  }
}

const proximo = () => {
  if (currentIndex.value < cardapios.value.length - 1) {
    currentIndex.value++
  }
}

const anterior = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

const formatarDataExtenso = (data: string) => {
  if (!data) return ''
  const [year, month, day] = data.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

onMounted(() => {
  carregarCardapio()
  carregarCardapioHoje()
})
</script>

<template>
  <PublicLayout>
    <div class="max-w-5xl mx-auto space-y-8 animate-fadein">
      <PageHeader
        title="Cardápio Institucional"
        subtitle="Confira as refeições preparadas com carinho para nossa comunidade."
        :breadcrumbs="auth.isAuthenticated ? [{ label: 'Dashboard', route: '/dashboard' }, { label: 'Cardápio' }] : [{ label: 'Início', route: '/' }, { label: 'Cardápio' }]"
      />

      <Tabs value="0">
        <TabList class="!border-b-0 flex justify-center mb-6">
          <Tab value="0" class="!px-8">
            <i class="pi pi-calendar mr-2"></i>
            Hoje
          </Tab>
          <Tab value="1" class="!px-8">
            <i class="pi pi-calendar-plus mr-2"></i>
            Semanal
          </Tab>
        </TabList>

        <TabPanels class="!bg-transparent !p-0">
          <!-- Cardápio de Hoje -->
          <TabPanel value="0">
            <div v-if="loadingHoje" class="grid md:grid-cols-2 gap-6">
              <Skeleton height="300px" border-radius="2rem" />
              <Skeleton height="300px" border-radius="2rem" />
            </div>

            <div v-else-if="cardapioHoje" class="grid md:grid-cols-2 gap-6">
              <!-- Almoço -->
              <div v-if="cardapioHoje.almoco" class="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all">
                <div class="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <i class="pi pi-sun text-6xl text-amber-500"></i>
                </div>
                
                <div class="space-y-6 relative z-10">
                  <div class="flex items-center gap-3">
                    <Tag value="Almoço" severity="warn" class="!rounded-full px-4" />
                    <span class="text-sm font-bold text-slate-400">11:00 - 14:00</span>
                  </div>

                  <div class="space-y-2">
                    <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest">Prato Principal</h3>
                    <p class="text-2xl font-black text-slate-800 leading-tight">{{ cardapioHoje.almoco.prato_principal }}</p>
                  </div>

                  <div class="grid grid-cols-1 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Acompanhamentos</h4>
                      <p class="text-sm text-slate-600 font-medium">{{ cardapioHoje.almoco.acompanhamento }}, {{ cardapioHoje.almoco.guarnicao }}</p>
                    </div>
                    <div>
                      <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Salada e Sobremesa</h4>
                      <p class="text-sm text-slate-600 font-medium">{{ cardapioHoje.almoco.salada }}, {{ cardapioHoje.almoco.sobremesa }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Jantar -->
              <div v-if="cardapioHoje.jantar" class="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all">
                <div class="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <i class="pi pi-moon text-6xl text-blue-500"></i>
                </div>
                
                <div class="space-y-6 relative z-10">
                  <div class="flex items-center gap-3">
                    <Tag value="Jantar" severity="info" class="!rounded-full px-4" />
                    <span class="text-sm font-bold text-slate-400">18:00 - 20:30</span>
                  </div>

                  <div class="space-y-2">
                    <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest">Prato Principal</h3>
                    <p class="text-2xl font-black text-slate-800 leading-tight">{{ cardapioHoje.jantar.prato_principal }}</p>
                  </div>

                  <div class="grid grid-cols-1 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Acompanhamentos</h4>
                      <p class="text-sm text-slate-600 font-medium">{{ cardapioHoje.jantar.acompanhamento }}, {{ cardapioHoje.jantar.guarnicao }}</p>
                    </div>
                    <div>
                      <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Salada e Sobremesa</h4>
                      <p class="text-sm text-slate-600 font-medium">{{ cardapioHoje.jantar.salada }}, {{ cardapioHoje.jantar.sobremesa }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="!cardapioHoje.almoco && !cardapioHoje.jantar" class="md:col-span-2 py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-300">
                <i class="pi pi-calendar-times text-5xl text-slate-200 mb-4"></i>
                <p class="text-slate-500 font-medium">Nenhum cardápio disponível para hoje.</p>
              </div>
            </div>

            <div v-else class="md:col-span-2 py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-300">
              <i class="pi pi-calendar-times text-5xl text-slate-200 mb-4"></i>
              <p class="text-slate-500 font-medium">Nenhum cardápio disponível para hoje.</p>
            </div>
          </TabPanel>

          <!-- Cardápio Semanal -->
          <TabPanel value="1">
            <div v-if="loading" class="space-y-4">
              <Skeleton height="500px" border-radius="2.5rem" />
            </div>

            <div v-else-if="error">
              <Message severity="error" :closable="false" class="!rounded-2xl">{{ error }}</Message>
            </div>

            <div v-else-if="cardapios.length > 0" class="space-y-6">
              <!-- Card do Cardápio Semanal -->
              <div 
                class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-10 shadow-2xl text-white overflow-hidden relative border border-slate-700"
              >
                <!-- Header do Card -->
                <div class="flex justify-between items-center mb-8">
                  <div class="space-y-1">
                    <span class="text-xs font-black text-primary-400 uppercase tracking-[0.2em]">Semana do Refeitório</span>
                    <h2 class="text-xl font-bold text-slate-200">
                      {{ formatarDataExtenso(cardapios[currentIndex].data_do_cardapio) }}
                    </h2>
                  </div>
                  <div class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <i class="pi pi-calendar text-slate-400"></i>
                  </div>
                </div>

                <!-- Turno Selecionado -->
                <div class="flex gap-3 mb-10">
                  <Tag 
                    :value="cardapios[currentIndex].turno === 'almoco' ? '🌅 Almoço' : '🌙 Jantar'" 
                    class="!rounded-full !px-4 !py-1 !bg-primary-600/20 !text-primary-400 !border !border-primary-500/30"
                  />
                </div>

                <!-- Conteúdo Principal -->
                <div class="grid lg:grid-cols-2 gap-12">
                  <div class="space-y-8">
                    <div class="space-y-2">
                      <h3 class="text-xs font-black text-slate-500 uppercase tracking-widest">Prato Principal</h3>
                      <h4 class="text-3xl font-black text-white leading-tight">
                        {{ cardapios[currentIndex].prato_principal_ptn01 || 'Não informado' }}
                      </h4>
                    </div>

                    <div class="flex gap-4">
                      <div class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                         <i class="pi pi-bolt text-amber-400"></i>
                         <span class="text-xs font-bold text-slate-400">620 kcal</span>
                      </div>
                      <div class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                         <i class="pi pi-info-circle text-blue-400"></i>
                         <span class="text-xs font-bold text-slate-400">Contém Glúten</span>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-4">
                    <h3 class="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Guarnição e Acompanhamentos</h3>
                    
                    <div class="space-y-4">
                      <div v-if="cardapios[currentIndex].acompanhamento_01" class="flex items-center justify-between py-2 border-b border-white/5">
                        <span class="text-slate-300 font-medium">{{ cardapios[currentIndex].acompanhamento_01 }}</span>
                        <i class="pi pi-check text-[10px] text-primary-500"></i>
                      </div>
                      <div v-if="cardapios[currentIndex].acompanhamento_02" class="flex items-center justify-between py-2 border-b border-white/5">
                        <span class="text-slate-300 font-medium">{{ cardapios[currentIndex].acompanhamento_02 }}</span>
                        <i class="pi pi-check text-[10px] text-primary-500"></i>
                      </div>
                      <div v-if="cardapios[currentIndex].salada" class="flex items-center justify-between py-2 border-b border-white/5">
                        <span class="text-slate-300 font-medium">{{ cardapios[currentIndex].salada }}</span>
                        <i class="pi pi-check text-[10px] text-primary-500"></i>
                      </div>
                      <div v-if="cardapios[currentIndex].sobremesa" class="flex items-center justify-between py-2 border-b border-white/5">
                        <span class="text-slate-300 font-medium">{{ cardapios[currentIndex].sobremesa }}</span>
                        <i class="pi pi-star-fill text-[10px] text-amber-500"></i>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Rodapé -->
                <div class="mt-12 flex justify-between items-center border-t border-white/5 pt-6">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Cardápio Validado pela Nutrição</span>
                  </div>
                </div>
              </div>

              <!-- Navegação Semanal -->
              <div class="flex justify-between items-center px-6">
                <Button 
                  icon="pi pi-arrow-left" 
                  label="Anterior"
                  rounded 
                  outlined 
                  severity="secondary" 
                  @click="anterior" 
                  :disabled="currentIndex === 0"
                  class="!rounded-2xl !px-6 !border-slate-300 !text-slate-600"
                />
                
                <div class="hidden sm:flex gap-2">
                  <div 
                    v-for="(_, index) in cardapios" 
                    :key="index"
                    class="w-2.5 h-2.5 rounded-full transition-all duration-300"
                    :class="index === currentIndex ? 'bg-primary-600 ring-4 ring-primary-100' : 'bg-slate-300'"
                  ></div>
                </div>

                <Button 
                  icon="pi pi-arrow-right" 
                  iconPos="right"
                  label="Próximo"
                  rounded 
                  outlined 
                  severity="secondary" 
                  @click="proximo" 
                  :disabled="currentIndex === cardapios.length - 1"
                  class="!rounded-2xl !px-6 !border-slate-300 !text-slate-600"
                />
              </div>
            </div>

            <div v-else class="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-300">
              <i class="pi pi-calendar-times text-5xl text-slate-200 mb-4"></i>
              <p class="text-slate-500 font-medium">Nenhum cardápio semanal disponível no momento.</p>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </PublicLayout>
</template>
