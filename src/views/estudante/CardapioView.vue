<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { cardapioService } from '../../services/cardapio'
import type { Cardapio } from '../../types/cardapio'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Message from 'primevue/message'
import Tag from 'primevue/tag'

const cardapios = ref<Cardapio[]>([])
const loading = ref(false)
const error = ref('')
const currentIndex = ref(0)
const auth = useAuthStore()

const carregarCardapio = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await cardapioService.semanal()
    cardapios.value = data
    
    // Encontrar o de hoje se possível
    const hoje = new Date().toLocaleDateString('sv-SE') // Formato YYYY-MM-DD local
    const indexHoje = cardapios.value.findIndex(c => c.data_do_cardapio === hoje)
    if (indexHoje !== -1) {
      currentIndex.value = indexHoje
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erro ao carregar o cardápio semanal'
  } finally {
    loading.value = false
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
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

onMounted(carregarCardapio)
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-4 sm:py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Cardápio</h1>
      <Button 
        icon="pi pi-refresh" 
        text 
        rounded 
        @click="carregarCardapio" 
        :loading="loading" 
      />
    </div>

    <div v-if="loading" class="space-y-4">
      <Skeleton height="500px" border-radius="2rem" />
    </div>

    <div v-else-if="error">
      <Message severity="error" :closable="false">{{ error }}</Message>
      <Button label="Tentar Novamente" class="w-full mt-4" @click="carregarCardapio" />
    </div>

    <div v-else-if="cardapios.length > 0" class="space-y-6">
      <!-- Card do Cardápio (Estilo Baseado na Imagem de Referência) -->
      <div 
        class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-8 shadow-2xl text-white overflow-hidden relative border border-slate-700"
      >
        <!-- Header do Card -->
        <div class="flex justify-between items-center mb-6">
          <span class="text-sm font-medium text-slate-400">
            {{ formatarDataExtenso(cardapios[currentIndex].data_do_cardapio) }}
          </span>
          <i class="pi pi-calendar text-slate-500"></i>
        </div>

        <!-- Turnos Disponíveis -->
        <div class="flex gap-2 mb-8">
           <Tag 
            :value="cardapios[currentIndex].turno === 'almoco' ? 'Almoço ✓' : 'Almoço'" 
            :class="[
              'px-3 py-1 text-xs font-semibold rounded-full border',
              cardapios[currentIndex].turno === 'almoco' 
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
            ]"
          />
          <Tag 
            :value="cardapios[currentIndex].turno === 'jantar' ? 'Jantar ✓' : 'Jantar'" 
            :class="[
              'px-3 py-1 text-xs font-semibold rounded-full border',
              cardapios[currentIndex].turno === 'jantar' 
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
            ]"
          />
        </div>

        <!-- Prato Principal -->
        <div class="mb-2">
          <h2 class="text-2xl font-bold leading-tight tracking-tight">
            {{ cardapios[currentIndex].prato_principal_ptn01 || 'Prato não informado' }}
          </h2>
        </div>

        <!-- Info Icons & Calorias -->
        <div class="flex justify-between items-center mb-6">
          <div class="flex gap-3">
            <i class="pi pi-exclamation-triangle text-amber-500 text-sm"></i>
            <i class="pi pi-info-circle text-blue-400 text-sm"></i>
            <i class="pi pi-check-circle text-emerald-500 text-sm"></i>
          </div>
          <span class="text-slate-400 text-sm font-medium">619.17 kcal</span>
        </div>

        <div class="border-t border-slate-700/50 my-6"></div>

        <!-- Itens do Cardápio (Ordem conforme Imagem de Referência) -->
        <div class="space-y-0 text-base">
          <!-- Item 1: Acompanhamento 01 (Arroz) -->
          <div v-if="cardapios[currentIndex].acompanhamento_01" class="group">
             <div class="py-3 flex items-center justify-between">
                <span class="text-slate-200">{{ cardapios[currentIndex].acompanhamento_01 }}</span>
             </div>
             <div class="border-b border-slate-700/50"></div>
          </div>
          
          <!-- Item 2: Acompanhamento 02 (Feijão) -->
          <div v-if="cardapios[currentIndex].acompanhamento_02" class="group">
             <div class="py-3 flex items-center justify-between">
                <span class="text-slate-200">{{ cardapios[currentIndex].acompanhamento_02 }}</span>
             </div>
             <div class="border-b border-slate-700/50"></div>
          </div>

          <!-- Item 3: Sobremesa (Fruta) -->
          <div v-if="cardapios[currentIndex].sobremesa" class="group">
             <div class="py-3 flex items-center justify-between">
                <span class="text-slate-200">{{ cardapios[currentIndex].sobremesa }}</span>
             </div>
             <div class="border-b border-slate-700/50"></div>
          </div>

          <!-- Item 4: Prato Principal 02 (Proteína Alternativa) -->
          <div v-if="cardapios[currentIndex].prato_principal_ptn02" class="group">
             <div class="py-3 flex items-center justify-between">
                <span class="text-slate-200">{{ cardapios[currentIndex].prato_principal_ptn02 }}</span>
             </div>
             <div class="border-b border-slate-700/50"></div>
          </div>

          <!-- Item 5: Salada -->
          <div v-if="cardapios[currentIndex].salada" class="group">
             <div class="py-3 flex items-center justify-between">
                <span class="text-slate-200">{{ cardapios[currentIndex].salada }}</span>
             </div>
             <div class="border-b border-slate-700/50"></div>
          </div>

          <!-- Item 6: Suco -->
          <div v-if="cardapios[currentIndex].suco" class="group">
             <div class="py-3 flex items-center justify-between">
                <span class="text-slate-200">{{ cardapios[currentIndex].suco }}</span>
             </div>
          </div>
        </div>

        <!-- Rodapé do Card -->
        <div class="mt-10 flex justify-between items-center pt-2">
          <span class="text-slate-600 text-[10px] font-bold tracking-widest uppercase">RI - IFBA</span>
          <div v-if="auth.isAdmin" class="flex gap-4">
             <button class="p-1 hover:text-emerald-400 transition-colors">
               <i class="pi pi-pencil text-slate-700 text-sm"></i>
             </button>
             <button class="p-1 hover:text-red-400 transition-colors">
               <i class="pi pi-trash text-slate-700 text-sm"></i>
             </button>
          </div>
        </div>
      </div>

      <!-- Navegação Estilizada -->
      <div class="flex justify-between items-center px-4">
        <Button 
          icon="pi pi-chevron-left" 
          rounded 
          outlined 
          severity="secondary" 
          @click="anterior" 
          :disabled="currentIndex === 0"
          class="!border-slate-300 !text-slate-600 hover:!bg-slate-100"
        />
        
        <div class="flex gap-1.5">
          <div 
            v-for="(_, index) in cardapios" 
            :key="index"
            :class="[
              'w-2 h-2 rounded-full transition-all duration-300',
              index === currentIndex ? 'bg-emerald-600 w-6' : 'bg-slate-300'
            ]"
          ></div>
        </div>

        <Button 
          icon="pi pi-chevron-right" 
          rounded 
          outlined 
          severity="secondary" 
          @click="proximo" 
          :disabled="currentIndex === cardapios.length - 1"
          class="!border-slate-300 !text-slate-600 hover:!bg-slate-100"
        />
      </div>
    </div>

    <div v-else class="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
       <i class="pi pi-calendar-times text-4xl text-slate-300 mb-4"></i>
       <p class="text-slate-500 font-medium">Nenhum cardápio disponível para esta semana.</p>
    </div>
  </div>
</template>
