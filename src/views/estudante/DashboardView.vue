<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { cardapioService } from '../../services/cardapio'
import { filaExtrasService } from '../../services/filaExtras'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Message from 'primevue/message'
import type { CardapioDia } from '../../types/cardapio'
import type { FilaExtra, PosicaoFila } from '../../types/filaExtras'

const router = useRouter()

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
  return new Date(data).toLocaleDateString('pt-BR', {
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
    errorCardapio.value = err?.response?.data?.message || 'Erro ao carregar cardápio'
  } finally {
    loadingCardapio.value = false
  }
}

const carregarInscricoes = async () => {
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
            </div>
          </div>

          <div v-else>
            <Message severity="info" :closable="false">
              Nenhum cardápio disponível para hoje
            </Message>
          </div>
        </template>
      </Card>

      <!-- Card: Minhas Inscrições (Fila Extra) -->
      <Card class="!rounded-3xl border border-slate-200 shadow-sm">
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
      <div 
        v-for="acao in [
          { label: 'Cardápio Semanal', icon: 'pi-calendar', route: '/cardapio', color: 'bg-emerald-600' },
          { label: 'Fila de Extras', icon: 'pi-ticket', route: '/fila-extras', color: 'bg-emerald-700' },
          { label: 'Histórico', icon: 'pi-history', route: '/historico', color: 'bg-slate-700' },
          { label: 'Meu Perfil', icon: 'pi-user', route: '/perfil', color: 'bg-slate-800' }
        ]"
        :key="acao.label"
        class="group cursor-pointer p-4 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex items-center gap-4"
        @click="router.push(acao.route)"
      >
        <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110', acao.color]">
          <i :class="['pi', acao.icon, 'text-xl']"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-slate-700 text-sm leading-tight">{{ acao.label }}</h3>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter group-hover:text-emerald-500 transition-colors">Acessar agora</span>
        </div>
      </div>
    </div>
  </div>
</template>
