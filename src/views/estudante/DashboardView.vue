<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { cardapioService } from '../../services/cardapio'
import { filaExtrasService } from '../../services/filaExtras'
import PageHeader from '../../components/common/PageHeader.vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Message from 'primevue/message'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import type { CardapioDia } from '../../types/cardapio'
import type { FilaExtra, PosicaoFila } from '../../types/filaExtras'

const router = useRouter()
const auth = useAuthStore()

// Computed para verificar tipo de usuário
const isBolsista = computed(() => auth.user?.bolsista === true)
const isNaoBolsista = computed(() => auth.user?.bolsista === false)

const cardapio = ref<CardapioDia | null>(null)
const minhasInscricoes = ref<FilaExtra[]>([])
const posicoesNaFila = ref<PosicaoFila[]>([])
const presencaHoje = ref<any>(null)
const loadingCardapio = ref(false)
const loadingInscricoes = ref(false)
const loadingPresenca = ref(false)
const errorCardapio = ref('')
const displayQrCode = ref(false)

const formatarData = (data: string) => {
  if (!data) return ''
  // Se for apenas data YYYY-MM-DD
  if (data.length === 10 && data.includes('-')) {
    const parts = data.split('-').map(Number) as [number, number, number]
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }
  // Se for objeto data ou string completa
  const dateObj = new Date(data)
  // Adiciona 12 horas para evitar problemas de fuso horário se for apenas data sem hora
  if (!data.includes('T') && !data.includes(':')) {
     dateObj.setHours(12, 0, 0, 0)
  }
  return dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

const carregarCardapio = async () => {
  loadingCardapio.value = true
  errorCardapio.value = ''
  try {
    const result = await cardapioService.hoje()
    cardapio.value = result
  } catch (err: any) {
      // Se for 404, não é erro - simplesmente não há cardápio para hoje
    if (err?.response?.status === 404) {
      cardapio.value = null
    } else {
      errorCardapio.value = err?.response?.data?.message || 'Erro ao carregar cardápio'
      console.error('Erro ao carregar cardápio:', err)
    }
  } finally {
    loadingCardapio.value = false
  }
}

const carregarInscricoes = async () => {
  // Fila de extras é apenas para não-bolsistas
  if (isBolsista.value) {
    return
  }

  loadingInscricoes.value = true
  try {
    minhasInscricoes.value = await filaExtrasService.minhasInscricoes()
    posicoesNaFila.value = await filaExtrasService.posicao()
  } catch (err) {
    console.error('Erro ao carregar inscrições:', err)
  } finally {
    loadingInscricoes.value = false
  }
}

const carregarPresencaHoje = async () => {
  loadingPresenca.value = true
  try {
    presencaHoje.value = await cardapioService.presencaHoje()
  } catch (err) {
    console.error('Nenhuma presença para hoje')
  } finally {
    loadingPresenca.value = false
  }
}

onMounted(() => {
  carregarCardapio()
  carregarInscricoes()
  carregarPresencaHoje()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <PageHeader
      title="Dashboard"
      subtitle="Bem-vindo ao sistema de gestão de refeições"
      :breadcrumbs="[]"
    />

    <div v-if="presencaHoje && presencaHoje.status !== 'presente'" class="flex justify-end -mt-16 relative z-10">
      <Button label="Meu QR Code" icon="pi pi-qrcode" severity="success" @click="displayQrCode = true" class="!rounded-xl shadow-md" />
    </div>

    <!-- Dialog QR Code -->
    <Dialog v-model:visible="displayQrCode" header="Meu QR Code para Refeição" :style="{ width: '350px' }" modal>
      <div class="flex flex-col items-center py-4 space-y-4">
        <div class="bg-white p-4 rounded-xl shadow-md">
          <img 
            :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${presencaHoje?.token}`" 
            alt="QR Code"
            class="w-48 h-48"
          />
        </div>
        <div class="text-center">
          <p class="font-bold text-slate-800 uppercase">{{ presencaHoje?.refeicao.turno }}</p>
          <p class="text-sm text-slate-500">{{ formatarData(presencaHoje?.refeicao.data) }}</p>
        </div>
        <Message severity="info" :closable="false" class="text-xs">
          Apresente este código ao servidor no momento da refeição.
        </Message>
      </div>
    </Dialog>

    <!-- Grid de Cards -->
    <div class="grid gap-6">
      <!-- Card: Cardápio do Dia (Visual Refinado) -->
      <Card class="overflow-hidden !rounded-xl border border-slate-200 shadow-sm">
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-calendar text-primary-600"></i>
              <span class="text-xl font-bold text-slate-700">Cardápio de Hoje</span>
            </div>
            <Button icon="pi pi-arrow-right" text rounded @click="router.push('/dashboard/cardapio')" />
          </div>
        </template>
        <template #content>
          <div v-if="loadingCardapio" class="space-y-4">
            <Skeleton height="150px" border-radius="1rem" />
          </div>

          <Message v-else-if="errorCardapio" severity="error" :closable="false" class="!m-0">
            {{ errorCardapio }}
          </Message>

          <div v-else-if="cardapio" class="grid sm:grid-cols-2 gap-4">
            <!-- Almoço -->
            <div v-if="cardapio.almoco" class="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 shadow-sm">
              <div class="flex items-center gap-3 mb-4 pb-3 border-b border-amber-200">
                <div class="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center">
                  <i class="pi pi-sun text-white text-lg"></i>
                </div>
                <div class="flex-1">
                  <h3 class="font-black text-amber-900 text-base">Almoço</h3>
                  <span class="text-xs text-amber-700 font-semibold">11:00 - 14:00</span>
                </div>
              </div>
              
              <div class="space-y-3">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-star-fill text-amber-600 text-xs"></i>
                    <span class="text-[10px] font-black text-amber-700 uppercase tracking-wider">Prato Principal</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col gap-1">
                      <span class="text-[10px] font-bold text-amber-600">OP 1</span>
                      <p class="text-sm font-bold text-amber-950 leading-tight">{{ cardapio.almoco.prato_principal }}</p>
                    </div>
                    <div v-if="cardapio.almoco.prato_principal_ptn02" class="flex flex-col gap-1">
                      <span class="text-[10px] font-bold text-amber-600">OP 2</span>
                      <p class="text-sm font-bold text-amber-950 leading-tight">{{ cardapio.almoco.prato_principal_ptn02 }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="cardapio.almoco.acompanhamento">
                  <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-circle-fill text-amber-500 text-[6px]"></i>
                    <span class="text-[10px] font-bold text-amber-600 uppercase">Acompanhamento</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col gap-1">
                      <span class="text-[10px] font-bold text-amber-600">OP 1</span>
                      <p class="text-xs text-amber-800">{{ cardapio.almoco.acompanhamento.split(',')[0].trim() }}</p>
                    </div>
                    <div v-if="cardapio.almoco.acompanhamento.includes(',')" class="flex flex-col gap-1">
                      <span class="text-[10px] font-bold text-amber-600">OP 2</span>
                      <p class="text-xs text-amber-800">{{ cardapio.almoco.acompanhamento.split(',')[1].trim() }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="cardapio.almoco.guarnicao">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="pi pi-circle-fill text-amber-500 text-[6px]"></i>
                    <span class="text-[10px] font-bold text-amber-600 uppercase">Guarnição</span>
                  </div>
                  <p class="text-xs text-amber-800 ml-3">{{ cardapio.almoco.guarnicao }}</p>
                </div>

                <div v-if="cardapio.almoco.salada">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="pi pi-verified text-green-600 text-xs"></i>
                    <span class="text-[10px] font-bold text-green-700 uppercase">Salada</span>
                  </div>
                  <p class="text-xs text-green-800 ml-4">{{ cardapio.almoco.salada }}</p>
                </div>

                <div v-if="cardapio.almoco.sobremesa">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="pi pi-gift text-pink-600 text-xs"></i>
                    <span class="text-[10px] font-bold text-pink-700 uppercase">Sobremesa</span>
                  </div>
                  <p class="text-xs text-pink-800 ml-4">{{ cardapio.almoco.sobremesa }}</p>
                </div>

                <div v-if="cardapio.almoco.suco">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="pi pi-bolt text-blue-600 text-xs"></i>
                    <span class="text-[10px] font-bold text-blue-700 uppercase">Suco</span>
                  </div>
                  <p class="text-xs text-blue-800 ml-4">{{ cardapio.almoco.suco }}</p>
                </div>

                <div v-if="cardapio.almoco.ovo_lacto_vegetariano" class="pt-3 border-t border-amber-200">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="pi pi-sparkles text-emerald-600 text-xs"></i>
                    <span class="text-[10px] font-bold text-emerald-700 uppercase">Opção Vegetariana</span>
                  </div>
                  <p class="text-xs text-emerald-800 ml-4">{{ cardapio.almoco.ovo_lacto_vegetariano }}</p>
                </div>
              </div>
            </div>

            <!-- Jantar-->
            <div v-if="cardapio.jantar" class="p-5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 shadow-sm">
              <div class="flex items-center gap-3 mb-4 pb-3 border-b border-indigo-200">
                <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <i class="pi pi-moon text-white text-lg"></i>
                </div>
                <div class="flex-1">
                  <h3 class="font-black text-indigo-900 text-base">Jantar</h3>
                  <span class="text-xs text-indigo-700 font-semibold">18:00 - 20:30</span>
                </div>
              </div>
              
              <div class="space-y-3">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-star-fill text-indigo-600 text-xs"></i>
                    <span class="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Prato Principal</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col gap-1">
                      <span class="text-[10px] font-bold text-indigo-600">OP 1</span>
                      <p class="text-sm font-bold text-indigo-950 leading-tight">{{ cardapio.jantar.prato_principal }}</p>
                    </div>
                    <div v-if="cardapio.jantar.prato_principal_ptn02" class="flex flex-col gap-1">
                      <span class="text-[10px] font-bold text-indigo-600">OP 2</span>
                      <p class="text-sm font-bold text-indigo-950 leading-tight">{{ cardapio.jantar.prato_principal_ptn02 }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="cardapio.jantar.acompanhamento">
                  <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-circle-fill text-indigo-500 text-[6px]"></i>
                    <span class="text-[10px] font-bold text-indigo-600 uppercase">Acompanhamento</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col gap-1">
                      <span class="text-[10px] font-bold text-indigo-600">OP 1</span>
                      <p class="text-xs text-indigo-800">{{ cardapio.jantar.acompanhamento.split(',')[0].trim() }}</p>
                    </div>
                    <div v-if="cardapio.jantar.acompanhamento.includes(',')" class="flex flex-col gap-1">
                      <span class="text-[10px] font-bold text-indigo-600">OP 2</span>
                      <p class="text-xs text-indigo-800">{{ cardapio.jantar.acompanhamento.split(',')[1].trim() }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="cardapio.jantar.guarnicao">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="pi pi-circle-fill text-indigo-500 text-[6px]"></i>
                    <span class="text-[10px] font-bold text-indigo-600 uppercase">Guarnição</span>
                  </div>
                  <p class="text-xs text-indigo-800 ml-3">{{ cardapio.jantar.guarnicao }}</p>
                </div>

                <div v-if="cardapio.jantar.salada">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="pi pi-verified text-green-600 text-xs"></i>
                    <span class="text-[10px] font-bold text-green-700 uppercase">Salada</span>
                  </div>
                  <p class="text-xs text-green-800 ml-4">{{ cardapio.jantar.salada }}</p>
                </div>

                <div v-if="cardapio.jantar.sobremesa">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="pi pi-gift text-pink-600 text-xs"></i>
                    <span class="text-[10px] font-bold text-pink-700 uppercase">Sobremesa</span>
                  </div>
                  <p class="text-xs text-pink-800 ml-4">{{ cardapio.jantar.sobremesa }}</p>
                </div>

                <div v-if="cardapio.jantar.suco">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="pi pi-bolt text-blue-600 text-xs"></i>
                    <span class="text-[10px] font-bold text-blue-700 uppercase">Suco</span>
                  </div>
                  <p class="text-xs text-blue-800 ml-4">{{ cardapio.jantar.suco }}</p>
                </div>

                <div v-if="cardapio.jantar.ovo_lacto_vegetariano" class="pt-3 border-t border-indigo-200">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="pi pi-sparkles text-emerald-600 text-xs"></i>
                    <span class="text-[10px] font-bold text-emerald-700 uppercase">Opção Vegetariana</span>
                  </div>
                  <p class="text-xs text-emerald-800 ml-4">{{ cardapio.jantar.ovo_lacto_vegetariano }}</p>
                </div>
              </div>
            </div>
            
            
            <div v-if="!cardapio.almoco && !cardapio.jantar" class="sm:col-span-2">
               <Message severity="info" :closable="false">Nenhuma refeição cadastrada para hoje.</Message>
               <Button
                 label="Ver Cardápio Semanal"
                 icon="pi pi-calendar"
                 class="w-full mt-4 !rounded-xl"
                 severity="success"
                 @click="router.push('/dashboard/cardapio')"
               />
            </div>
          </div>

          <div v-else class="text-center py-6">
            <div class="mb-4">
              <i class="pi pi-calendar text-4xl text-slate-300"></i>
            </div>
            <p class="text-slate-500 mb-4">Nenhum cardápio disponível para hoje</p>
            <Button
              label="Ver Cardápio Semanal"
              icon="pi pi-calendar"
              class="!rounded-xl"
              severity="success"
              @click="router.push('/dashboard/cardapio')"
            />
          </div>
        </template>
      </Card>



      <!-- Card: Minhas Inscrições (Fila Extra) - APENAS PARA NÃO-BOLSISTAS -->
      <Card v-if="isNaoBolsista" class="!rounded-xl border border-slate-200 shadow-sm">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-ticket text-primary-600"></i>
            <span class="text-xl font-bold text-slate-700">Fila Extra</span>
          </div>
        </template>
        <template #content>
          <div v-if="loadingInscricoes" class="space-y-3">
            <Skeleton height="60px" border-radius="0.75rem" />
            <Skeleton height="60px" border-radius="0.75rem" />
          </div>

          <div v-else-if="minhasInscricoes.length === 0" class="text-center py-4">
            <div class="mb-4">
               <i class="pi pi-ticket text-4xl text-slate-200"></i>
            </div>
            <p class="text-slate-500 text-sm mb-4">Você não possui inscrições ativas</p>
            <Button
              label="Ver Vagas Disponíveis"
              icon="pi pi-plus"
              class="w-full !rounded-xl"
              severity="success"
              @click="router.push('/dashboard/fila-extras')"
            />
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="inscricao in minhasInscricoes.slice(0, 2)"
              :key="inscricao.id"
              class="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary-200 transition-colors"
            >
              <div class="flex items-start justify-between">
                <div>
                  <p class="font-bold text-slate-800 text-sm">
                    {{ inscricao.refeicao?.turno === 'almoco' ? 'Almoco' : 'Jantar' }}
                  </p>
                  <p class="text-xs text-slate-500 font-medium">
                    {{ inscricao.refeicao?.data ? inscricao.refeicao.data.split('-').reverse().join('/') : '-' }}
                  </p>
                </div>
                <Tag
                  v-if="inscricao.confirmado"
                  value="Confirmado"
                  severity="success"
                  class="!text-[10px]"
                />
                <Tag
                  v-else
                  value="Na Fila"
                  severity="warn"
                  class="!text-[10px]"
                />
              </div>
              <div class="mt-3 pt-3 border-t border-slate-200/50 flex justify-between items-center">
                 <span class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sua Posição</span>
                 <span class="text-sm font-black text-emerald-600">{{ inscricao.posicao }}º</span>
              </div>
            </div>

            <Button
              v-if="minhasInscricoes.length > 2"
              label="Ver Todas"
              text
              class="w-full !text-xs"
              @click="router.push('/dashboard/fila-extras')"
            />
          </div>
        </template>
      </Card>
    </div>

    <!-- Ações Rápidas (Estilo IFBA/GovBR) -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Ações para TODOS os estudantes -->
      <div
        class="group cursor-pointer p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all flex items-center gap-4"
        @click="router.push('/dashboard/cardapio')"
      >
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110 bg-primary-600">
          <i class="pi pi-calendar text-xl"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-slate-700 text-sm leading-tight">Cardápio Semanal</h3>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter group-hover:text-primary-600 transition-colors">Acessar agora</span>
        </div>
      </div>

      <!-- Ação: Fila de Extras - APENAS para NÃO-BOLSISTAS -->
      <div
        v-if="isNaoBolsista"
        class="group cursor-pointer p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all flex items-center gap-4"
        @click="router.push('/dashboard/fila-extras')"
      >
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110 bg-primary-700">
          <i class="pi pi-ticket text-xl"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-slate-700 text-sm leading-tight">Fila de Extras</h3>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter group-hover:text-primary-600 transition-colors">Acessar agora</span>
        </div>
      </div>

      <!-- Ação: Justificativas - APENAS para BOLSISTAS -->
      <div
        v-if="isBolsista"
        class="group cursor-pointer p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all flex items-center gap-4"
        @click="router.push('/dashboard/justificativas')"
      >
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110 bg-amber-600">
          <i class="pi pi-file-edit text-xl"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-slate-700 text-sm leading-tight">Justificativas</h3>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter group-hover:text-primary-600 transition-colors">Acessar agora</span>
        </div>
      </div>

      <!-- Ações para TODOS os estudantes -->
      <div
        class="group cursor-pointer p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all flex items-center gap-4"
        @click="router.push('/dashboard/historico')"
      >
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110 bg-slate-700">
          <i class="pi pi-history text-xl"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-slate-700 text-sm leading-tight">Histórico</h3>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter group-hover:text-primary-600 transition-colors">Acessar agora</span>
        </div>
      </div>

      <div
        class="group cursor-pointer p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all flex items-center gap-4"
        @click="router.push('/dashboard/perfil')"
      >
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110 bg-slate-800">
          <i class="pi pi-user text-xl"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-slate-700 text-sm leading-tight">Meu Perfil</h3>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter group-hover:text-primary-600 transition-colors">Acessar agora</span>
        </div>
      </div>
    </div>
  </div>
</template>
