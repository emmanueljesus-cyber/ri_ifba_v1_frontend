<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useFilaExtrasStore } from '../../stores/filaExtras'
import { cardapioService } from '../../services/cardapio'
import { useToast } from 'primevue/usetoast'
import PageHeader from '../../components/common/PageHeader.vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Message from 'primevue/message'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import type { CardapioDia } from '../../types/cardapio'

const router = useRouter()
const auth = useAuthStore()
const filaStore = useFilaExtrasStore()
const toast = useToast()

// Computed para verificar tipo de usuário
const isBolsista = computed(() => auth.user?.bolsista === true)
const isNaoBolsista = computed(() => auth.user?.bolsista === false)

const cardapio = ref<CardapioDia | null>(null)
const presencaHoje = ref<any>(null)
const carteirinha = ref<any>(null)
const loadingCardapio = ref(false)
const loadingPresenca = ref(false)
const loadingCarteirinha = ref(false)
const errorCardapio = ref('')
const displayQrCode = ref(false)

// Fila Extras
const dialogInscricao = ref(false)
const refeicaoSelecionada = ref<any>(null)
const loadingAcao = ref(false)
const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})



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
      console.error('Erro ao carregar cardápio:', err)
    }
  } finally {
    loadingCardapio.value = false
  }
}

// Fila Extras functions
const abrirDialogInscricao = (refeicao: any) => {
  refeicaoSelecionada.value = refeicao
  dialogInscricao.value = true
}

const confirmarInscricao = async () => {
  if (!refeicaoSelecionada.value) return

  loadingAcao.value = true
  try {
    await filaStore.inscrever(refeicaoSelecionada.value.refeicao_id)
    toast.add({
      severity: 'success',
      summary: 'Sucesso!',
      detail: 'Inscrição realizada com sucesso',
      life: 3000
    })
    dialogInscricao.value = false
    // Recarregar dados para sincronizar UI
    await Promise.all([
      filaStore.carregarMinhasInscricoes(),
      filaStore.carregarRefeicoesDisponiveis(),
      filaStore.carregarPosicoes()
    ])
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: err?.response?.data?.message || 'Erro ao realizar inscrição',
      life: 5000
    })
  } finally {
    loadingAcao.value = false
  }
}

const cancelarInscricao = async (inscricaoId: number) => {
  loadingAcao.value = true
  try {
    await filaStore.cancelar(inscricaoId)
    toast.add({
      severity: 'success',
      summary: 'Sucesso!',
      detail: 'Inscrição cancelada',
      life: 3000
    })
    // Recarregar dados para sincronizar UI
    await Promise.all([
      filaStore.carregarMinhasInscricoes(),
      filaStore.carregarRefeicoesDisponiveis(),
      filaStore.carregarPosicoes()
    ])
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: err?.response?.data?.message || 'Erro ao cancelar inscrição',
      life: 5000
    })
  } finally {
    loadingAcao.value = false
  }
}

const carregarPresencaHoje = async () => {
  // Presença só faz sentido para bolsistas
  if (!isBolsista.value) {
    presencaHoje.value = null
    return
  }

  loadingPresenca.value = true
  try {
    presencaHoje.value = await cardapioService.presencaHoje()
  } catch (err: any) {
    // 404 é esperado quando não há presença registrada para hoje
    if (err?.response?.status === 404) {
      presencaHoje.value = null
      console.log('Nenhuma presença registrada para hoje')
    } else {
      console.error('Erro ao carregar presença:', err)
    }
  } finally {
    loadingPresenca.value = false
  }
}

const carregarCarteirinha = async () => {
  // Carteirinha só para bolsistas
  if (!isBolsista.value) {
    carteirinha.value = null
    return
  }

  loadingCarteirinha.value = true
  try {
    carteirinha.value = await cardapioService.carteirinha()
  } catch (err: any) {
    console.error('Erro ao carregar carteirinha:', err)
    carteirinha.value = null
  } finally {
    loadingCarteirinha.value = false
  }
}

onMounted(async () => {
  carregarCardapio()
  carregarPresencaHoje()
  carregarCarteirinha()
  
  // Carregar dados de Fila Extras para não-bolsistas
  if (isNaoBolsista.value) {
    await Promise.all([
      filaStore.carregarRefeicoesDisponiveis(),
      filaStore.carregarMinhasInscricoes(),
      filaStore.carregarPosicoes()
    ])
  }
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

    <div v-if="isBolsista && carteirinha" class="flex justify-end -mt-16 relative z-10">
      <Button label="Minha Carteirinha" icon="pi pi-qrcode" severity="success" @click="router.push('/dashboard/carteirinha')" class="!rounded-xl shadow-md" />
    </div>

    <!-- Dialog QR Code -->
    <Dialog v-model:visible="displayQrCode" header="Minha Carteirinha Digital" :style="{ width: '400px' }" modal>
      <div class="flex flex-col items-center py-4 space-y-4">
        <div class="bg-white p-4 rounded-xl shadow-md">
          <img 
            :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${carteirinha?.qr_token}`" 
            alt="QR Code"
            class="w-48 h-48"
          />
        </div>
        <div class="text-center space-y-1">
          <p class="font-bold text-slate-900 text-lg">{{ carteirinha?.nome }}</p>
          <p class="text-sm text-slate-600 font-mono">{{ carteirinha?.matricula }}</p>
          <p class="text-xs text-slate-500">{{ carteirinha?.curso }}</p>
          <div class="pt-2">
            <Tag 
              :value="carteirinha?.turno_refeicao === 'almoco' ? 'Almoço' : 'Jantar'" 
              :severity="carteirinha?.turno_refeicao === 'almoco' ? 'warning' : 'info'"
              class="!rounded-full"
            />
          </div>
        </div>
        
        <!-- Token para digitação manual -->
        <div class="w-full p-3 bg-slate-50 rounded-xl border border-slate-200">
          <p class="text-xs text-slate-500 font-bold mb-1 text-center">TOKEN PARA DIGITAÇÃO MANUAL</p>
          <p class="text-center font-mono text-sm font-bold text-slate-800 select-all break-all">
            {{ carteirinha?.qr_token }}
          </p>
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
                      <p class="text-xs text-amber-800">{{ cardapio.almoco.acompanhamento?.split(',')[0]?.trim() }}</p>
                    </div>
                    <div v-if="cardapio.almoco.acompanhamento?.includes(',')" class="flex flex-col gap-1">
                      <span class="text-[10px] font-bold text-amber-600">OP 2</span>
                      <p class="text-xs text-amber-800">{{ cardapio.almoco.acompanhamento?.split(',')[1]?.trim() }}</p>
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
                      <p class="text-xs text-indigo-800">{{ cardapio.jantar.acompanhamento?.split(',')[0]?.trim() }}</p>
                    </div>
                    <div v-if="cardapio.jantar.acompanhamento?.includes(',')" class="flex flex-col gap-1">
                      <span class="text-[10px] font-bold text-indigo-600">OP 2</span>
                      <p class="text-xs text-indigo-800">{{ cardapio.jantar.acompanhamento?.split(',')[1]?.trim() }}</p>
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



      <!-- Fila de Extras - APENAS PARA NÃO-BOLSISTAS -->
      <section v-if="isNaoBolsista">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
            <i class="pi pi-ticket text-primary-600"></i>
          </div>
          <h2 class="text-xl font-black text-slate-800 lato-black">Fila de Extras</h2>
        </div>

        <div v-if="filaStore.loading && filaStore.refeicoesDisponiveis.length === 0" class="space-y-4">
           <Skeleton height="80px" border-radius="1.5rem" v-for="i in 3" :key="i" />
        </div>

        <div v-else-if="filaStore.refeicoesDisponiveis.length === 0">
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
             <i class="pi pi-calendar-times text-4xl text-slate-300 mb-4"></i>
             <p class="text-slate-600 font-medium mb-2">Não há refeições disponíveis para inscrição no momento</p>
             <p class="text-slate-400 text-sm mb-3">As inscrições só estão disponíveis no dia da refeição, dentro do horário permitido:</p>
             <div class="space-y-2 mb-4">
               <p class="text-slate-500 text-sm font-medium">
                 <i class="pi pi-sun text-amber-500 mr-2"></i>
                 Almoço: disponível até 13:30
               </p>
               <p class="text-slate-500 text-sm font-medium">
                 <i class="pi pi-moon text-indigo-500 mr-2"></i>
                 Jantar: disponível até 19:00
               </p>
             </div>
             <p class="text-slate-400 text-xs">
               💡 Volte mais tarde ou verifique se há cardápio cadastrado para hoje
             </p>
          </div>
        </div>

        <div v-else class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-4">
          <DataTable
            v-model:filters="filters"
            :value="filaStore.refeicoesDisponiveis"
            :rows="10"
            :paginator="filaStore.refeicoesDisponiveis.length > 10"
            :globalFilterFields="['turno', 'turno_label']"
            class="p-datatable-sm"
            responsiveLayout="stack"
            breakpoint="768px"
          >
            <template #header>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-black text-slate-400 uppercase tracking-widest">Vagas Disponíveis</span>
                <InputText v-model="filters['global'].value" placeholder="Filtrar..." />
              </div>
            </template>
            <Column header="Refeição" style="min-width: 150px">
              <template #body="{ data }">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                    <i :class="data.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-indigo-500'"></i>
                  </div>
                  <div>
                    <p class="font-bold text-slate-800">Hoje</p>
                    <p class="text-xs text-slate-500">{{ data.turno_label }}</p>
                  </div>
                </div>
              </template>
            </Column>
            <Column header="Disponibilidade" style="min-width: 120px">
              <template #body="{ data }">
                <div class="flex flex-col gap-1">
                   <Tag
                    :value="`${data.vagas_disponiveis} vagas`"
                    :severity="data.vagas_disponiveis > 10 ? 'success' : 'warn'"
                    class="!rounded-full w-fit"
                  />
                  <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Até {{ data.horario_fim }}</span>
                </div>
              </template>
            </Column>
            <Column header="Posição" style="min-width: 100px; text-align: center" headerStyle="text-align: center">
              <template #body="{ data }">
                <div v-if="data.inscrito" class="flex flex-col items-center">
                  <span class="text-2xl font-black text-primary-600">{{ data.posicao_fila }}º</span>
                  <span class="text-[9px] text-slate-400 uppercase font-bold">na fila</span>
                </div>
                <span v-else class="text-slate-300 text-sm">—</span>
              </template>
            </Column>
            <Column header="Status" style="min-width: 120px">
              <template #body="{ data }">
                <Tag
                  v-if="data.inscrito && data.status_inscricao === 'aprovado'"
                  value="Confirmado"
                  severity="success"
                  class="!rounded-full"
                />
                <Tag
                  v-else-if="data.inscrito && data.status_inscricao === 'rejeitado'"
                  value="Cancelado"
                  severity="danger"
                  class="!rounded-full"
                />
                <Tag
                  v-else-if="data.inscrito"
                  value="Aguardando"
                  severity="warn"
                  class="!rounded-full"
                />
                <span v-else class="text-slate-300 text-sm">—</span>
              </template>
            </Column>
            <Column header="Ações" style="min-width: 150px; text-align: right" headerStyle="text-align: right">
              <template #body="{ data }">
                <Button
                  v-if="data.pode_inscrever && !data.inscrito"
                  label="Inscrever-se"
                  icon="pi pi-plus"
                  size="small"
                  class="!rounded-xl"
                  severity="success"
                  :loading="loadingAcao"
                  @click="abrirDialogInscricao(data)"
                />
                <Button
                  v-else-if="data.inscrito && data.status_inscricao === 'inscrito'"
                  label="Cancelar"
                  icon="pi pi-times"
                  size="small"
                  class="!rounded-xl"
                  severity="danger"
                  outlined
                  :loading="loadingAcao"
                  @click="cancelarInscricao(data.inscricao_id)"
                />
                <div v-else-if="data.inscrito && data.status_inscricao === 'aprovado'" class="flex items-center justify-end gap-2 text-green-600 font-bold text-sm">
                   <i class="pi pi-check-circle"></i>
                   Confirmado
                </div>
                <Tag v-else value="Expirado" severity="danger" class="!rounded-full" />
              </template>
            </Column>
          </DataTable>
        </div>
      </section>
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

    <!-- Dialog de Confirmação (Estilo Refinado) -->
    <Dialog
      v-model:visible="dialogInscricao"
      modal
      header="Confirmar Inscrição"
      :style="{ width: '90%', maxWidth: '400px' }"
      :draggable="false"
      class="!rounded-xl overflow-hidden"
    >
      <div v-if="refeicaoSelecionada" class="space-y-6 py-4">
        <div class="p-4 bg-primary-50 rounded-xl border border-primary-100">
           <p class="text-primary-800 text-sm leading-relaxed">
             Deseja confirmar sua inscrição para esta refeição? Sua posição será gerada por ordem de chegada na fila virtual.
           </p>
        </div>

        <div class="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
          <div class="flex justify-between">
            <span class="text-slate-500">Data:</span>
            <span class="font-bold text-slate-800">Hoje</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Turno:</span>
            <span class="font-bold text-slate-800">{{ refeicaoSelecionada.turno_label }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Prato:</span>
            <span class="font-bold text-slate-800">{{ refeicaoSelecionada.cardapio?.prato_principal || 'Refeição do dia' }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 w-full">
          <Button label="Voltar" text class="flex-1 !rounded-xl" @click="dialogInscricao = false" />
          <Button
            label="Confirmar"
            class="flex-1 !rounded-xl"
            severity="success"
            :loading="loadingAcao"
            @click="confirmarInscricao"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
