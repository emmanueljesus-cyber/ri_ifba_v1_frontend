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
    const data = await cardapioService.hoje()
    console.log('Dados do cardápio recebidos:', data)
    
    // Se data é nula ou não tem refeições, tratar como não encontrado
    if (!data || (!data.almoco && !data.jantar)) {
        cardapio.value = null
    } else {
        cardapio.value = data
    }
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

    <div v-if="isBolsista && carteirinha" class="flex justify-center sm:justify-end -mt-12 sm:-mt-16 mb-4 relative z-10">
      <Button label="Minha Carteirinha" icon="pi pi-qrcode" severity="success" @click="router.push('/dashboard/carteirinha')" class="!rounded-xl shadow-md w-full sm:w-auto" />
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
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Card: Status da Refeição de Hoje (NOVO) -->


      <!-- Card: Cardápio do Dia (Visual Refinado) -->
      <Card class="overflow-hidden !rounded-xl border border-slate-200 shadow-sm md:col-span-2 lg:col-span-3">
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

          <div v-else-if="cardapio" class="grid sm:grid-cols-2 gap-6">
            <!-- Almoço -->
            <div v-if="cardapio.almoco" class="today-card almoco-card">
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
                  <span class="today-value">{{ cardapio.almoco.prato_principal }}</span>
                  <span v-if="cardapio.almoco.prato_principal_ptn02" class="today-value text-slate-500 text-sm">{{ cardapio.almoco.prato_principal_ptn02 }}</span>
                </div>
                <div v-if="cardapio.almoco.ovo_lacto_vegetariano" class="today-item vegetarian">
                  <span class="today-label"><i class="pi pi-heart text-pink-500 mr-1"></i>Vegetariana</span>
                  <span class="today-value">{{ cardapio.almoco.ovo_lacto_vegetariano }}</span>
                </div>
                <div class="today-item">
                  <span class="today-label">Acompanhamentos</span>
                  <span class="today-value">{{ cardapio.almoco.acompanhamento }}</span>
                </div>
                <div class="today-row">
                  <div class="today-item small" v-if="cardapio.almoco.guarnicao">
                    <span class="today-label">Guarnição</span>
                    <span class="today-value text-sm">{{ cardapio.almoco.guarnicao }}</span>
                  </div>
                  <div class="today-item small" v-if="cardapio.almoco.salada">
                    <span class="today-label">Salada</span>
                    <span class="today-value text-sm">{{ cardapio.almoco.salada }}</span>
                  </div>
                </div>
                <div class="today-row" v-if="cardapio.almoco.sobremesa || cardapio.almoco.suco">
                  <div class="today-item small dessert" v-if="cardapio.almoco.sobremesa">
                    <span class="today-label">Sobremesa</span>
                    <span class="today-value text-sm">{{ cardapio.almoco.sobremesa }}</span>
                  </div>
                  <div class="today-item small drink" v-if="cardapio.almoco.suco">
                    <span class="today-label">Suco</span>
                    <span class="today-value text-sm">{{ cardapio.almoco.suco }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Jantar-->
            <div v-if="cardapio.jantar" class="today-card jantar-card">
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
                  <span class="today-value">{{ cardapio.jantar.prato_principal }}</span>
                  <span v-if="cardapio.jantar.prato_principal_ptn02" class="today-value text-slate-500 text-sm">{{ cardapio.jantar.prato_principal_ptn02 }}</span>
                </div>
                <div v-if="cardapio.jantar.ovo_lacto_vegetariano" class="today-item vegetarian">
                  <span class="today-label"><i class="pi pi-heart text-pink-500 mr-1"></i>Vegetariana</span>
                  <span class="today-value">{{ cardapio.jantar.ovo_lacto_vegetariano }}</span>
                </div>
                <div class="today-item">
                  <span class="today-label">Acompanhamentos</span>
                  <span class="today-value">{{ cardapio.jantar.acompanhamento }}</span>
                </div>
                <div class="today-row">
                  <div class="today-item small" v-if="cardapio.jantar.guarnicao">
                    <span class="today-label">Guarnição</span>
                    <span class="today-value text-sm">{{ cardapio.jantar.guarnicao }}</span>
                  </div>
                  <div class="today-item small" v-if="cardapio.jantar.salada">
                    <span class="today-label">Salada</span>
                    <span class="today-value text-sm">{{ cardapio.jantar.salada }}</span>
                  </div>
                </div>
                <div class="today-row" v-if="cardapio.jantar.sobremesa || cardapio.jantar.suco">
                  <div class="today-item small dessert" v-if="cardapio.jantar.sobremesa">
                    <span class="today-label">Sobremesa</span>
                    <span class="today-value text-sm">{{ cardapio.jantar.sobremesa }}</span>
                  </div>
                  <div class="today-item small drink" v-if="cardapio.jantar.suco">
                    <span class="today-label">Suco</span>
                    <span class="today-value text-sm">{{ cardapio.jantar.suco }}</span>
                  </div>
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

<style scoped>
/* Cards de Hoje - Harmonizado com CardapioView.vue */
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
  font-weight: 800;
  color: #1e293b;
  line-height: 1.2;
}
</style>
