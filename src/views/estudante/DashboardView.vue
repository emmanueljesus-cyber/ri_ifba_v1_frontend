<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { cardapioService } from '../../services/cardapio'
import { filaExtrasService } from '../../services/filaExtras'
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
    cardapio.value = await cardapioService.hoje()
  } catch (err: any) {
      // Se for 404, não é erro - simplesmente não há cardápio para hoje
    if (err?.response?.status === 404) {
      cardapio.value = null
    } else {
      errorCardapio.value = err?.response?.data?.message || 'Erro ao carregar cardápio'
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
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-slate-800">Dashboard</h1>
        <p class="text-slate-600 mt-1">Bem-vindo ao sistema de gestão de refeições</p>
      </div>
      <div v-if="presencaHoje && presencaHoje.status !== 'presente'">
        <Button label="Meu QR Code" icon="pi pi-qrcode" severity="success" @click="displayQrCode = true" />
      </div>
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
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <!-- Card: Cardápio do Dia (Visual Refinado) -->
      <Card class="lg:col-span-2 overflow-hidden !rounded-3xl border border-slate-200 shadow-sm">
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-calendar text-emerald-600"></i>
              <span class="text-xl font-bold text-slate-700">Cardápio de Hoje</span>
            </div>
            <Button icon="pi pi-arrow-right" text rounded @click="router.push('/cardapio')" />
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
            <div v-if="cardapio.almoco" class="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col justify-between">
              <div>
                <h3 class="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                   <span class="text-xl">🌅</span> Almoço
                </h3>
                <p class="text-sm font-semibold text-emerald-900 line-clamp-2">
                  {{ cardapio.almoco.prato_principal }}
                </p>
                <p class="text-xs text-emerald-700 mt-2 italic">
                  {{ cardapio.almoco.acompanhamento }}, {{ cardapio.almoco.guarnicao }}
                </p>
              </div>
              <div class="mt-4 flex justify-between items-end">
                 <Tag value="Disponível" severity="success" class="!text-[10px] !px-2 !py-0" />
                 <span class="text-xs text-emerald-600 font-medium">11:00 - 14:00</span>
              </div>
            </div>

            <!-- Jantar -->
            <div v-if="cardapio.jantar" class="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col justify-between">
              <div>
                <h3 class="font-bold text-blue-800 mb-3 flex items-center gap-2">
                   <span class="text-xl">🌙</span> Jantar
                </h3>
                <p class="text-sm font-semibold text-blue-900 line-clamp-2">
                  {{ cardapio.jantar.prato_principal }}
                </p>
                <p class="text-xs text-blue-700 mt-2 italic">
                   {{ cardapio.jantar.acompanhamento }}, {{ cardapio.jantar.guarnicao }}
                </p>
              </div>
              <div class="mt-4 flex justify-between items-end">
                 <Tag value="Disponível" severity="info" class="!text-[10px] !px-2 !py-0" />
                 <span class="text-xs text-blue-600 font-medium">18:00 - 20:30</span>
              </div>
            </div>
            
            <div v-if="!cardapio.almoco && !cardapio.jantar" class="sm:col-span-2">
               <Message severity="info" :closable="false">Nenhuma refeição cadastrada para hoje.</Message>
               <Button
                 label="Ver Cardápio Semanal"
                 icon="pi pi-calendar"
                 class="w-full mt-4 !rounded-xl"
                 severity="success"
                 @click="router.push('/cardapio')"
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
              @click="router.push('/cardapio')"
            />
          </div>
        </template>
      </Card>

      <!-- Card: Status do Bolsista - APENAS PARA BOLSISTAS -->
      <Card v-if="isBolsista" class="!rounded-3xl border border-slate-200 shadow-sm">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-user-check text-emerald-600"></i>
            <span class="text-xl font-bold text-slate-700">Meu Status</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <!-- Status de presença hoje -->
            <div class="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                    <i class="pi pi-check-circle text-white"></i>
                  </div>
                  <div>
                    <p class="font-bold text-emerald-800">Bolsista Ativo</p>
                    <p class="text-xs text-emerald-600">Acesso garantido às refeições</p>
                  </div>
                </div>
                <Tag value="Ativo" severity="success" class="!text-[10px]" />
              </div>
            </div>

            <!-- Presença de hoje -->
            <div v-if="presencaHoje" class="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-blue-800">Presença de Hoje</p>
                  <p class="text-xs text-blue-600 capitalize">{{ presencaHoje?.refeicao?.turno }}</p>
                </div>
                <Tag
                  :value="presencaHoje?.status === 'presente' ? 'Confirmada' : 'Pendente'"
                  :severity="presencaHoje?.status === 'presente' ? 'success' : 'warn'"
                  class="!text-[10px]"
                />
              </div>
            </div>

            <!-- Ações rápidas para bolsista -->
            <div class="flex gap-2">
              <Button
                label="Justificativas"
                icon="pi pi-file-edit"
                class="flex-1 !rounded-xl"
                severity="secondary"
                outlined
                @click="router.push('/justificativas')"
              />
              <Button
                label="Histórico"
                icon="pi pi-history"
                class="flex-1 !rounded-xl"
                severity="secondary"
                outlined
                @click="router.push('/historico')"
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- Card: Minhas Inscrições (Fila Extra) - APENAS PARA NÃO-BOLSISTAS -->
      <Card v-if="isNaoBolsista" class="!rounded-3xl border border-slate-200 shadow-sm">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-ticket text-emerald-600"></i>
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
              @click="router.push('/fila-extras')"
            />
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="inscricao in minhasInscricoes.slice(0, 2)"
              :key="inscricao.id"
              class="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-colors"
            >
              <div class="flex items-start justify-between">
                <div>
                  <p class="font-bold text-slate-800 text-sm">
                    {{ inscricao.refeicao?.turno === 'almoco' ? '🌅 Almoço' : '🌙 Jantar' }}
                  </p>
                  <p class="text-xs text-slate-500 font-medium">
                    {{ new Date(inscricao.refeicao?.data || '').toLocaleDateString('pt-BR') }}
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
              @click="router.push('/fila-extras')"
            />
          </div>
        </template>
      </Card>
    </div>

    <!-- Ações Rápidas (Estilo IFBA/GovBR) -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Ações para TODOS os estudantes -->
      <div
        class="group cursor-pointer p-4 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex items-center gap-4"
        @click="router.push('/cardapio')"
      >
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110 bg-emerald-600">
          <i class="pi pi-calendar text-xl"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-slate-700 text-sm leading-tight">Cardápio Semanal</h3>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter group-hover:text-emerald-500 transition-colors">Acessar agora</span>
        </div>
      </div>

      <!-- Ação: Fila de Extras - APENAS para NÃO-BOLSISTAS -->
      <div
        v-if="isNaoBolsista"
        class="group cursor-pointer p-4 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex items-center gap-4"
        @click="router.push('/fila-extras')"
      >
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110 bg-emerald-700">
          <i class="pi pi-ticket text-xl"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-slate-700 text-sm leading-tight">Fila de Extras</h3>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter group-hover:text-emerald-500 transition-colors">Acessar agora</span>
        </div>
      </div>

      <!-- Ação: Justificativas - APENAS para BOLSISTAS -->
      <div
        v-if="isBolsista"
        class="group cursor-pointer p-4 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex items-center gap-4"
        @click="router.push('/justificativas')"
      >
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110 bg-amber-600">
          <i class="pi pi-file-edit text-xl"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-slate-700 text-sm leading-tight">Justificativas</h3>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter group-hover:text-emerald-500 transition-colors">Acessar agora</span>
        </div>
      </div>

      <!-- Ações para TODOS os estudantes -->
      <div
        class="group cursor-pointer p-4 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex items-center gap-4"
        @click="router.push('/historico')"
      >
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110 bg-slate-700">
          <i class="pi pi-history text-xl"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-slate-700 text-sm leading-tight">Histórico</h3>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter group-hover:text-emerald-500 transition-colors">Acessar agora</span>
        </div>
      </div>

      <div
        class="group cursor-pointer p-4 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex items-center gap-4"
        @click="router.push('/perfil')"
      >
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110 bg-slate-800">
          <i class="pi pi-user text-xl"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-slate-700 text-sm leading-tight">Meu Perfil</h3>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter group-hover:text-emerald-500 transition-colors">Acessar agora</span>
        </div>
      </div>
    </div>
  </div>
</template>
