<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFilaExtrasStore } from '../../stores/filaExtras'
import { useToast } from 'primevue/usetoast'
import PageHeader from '../../components/common/PageHeader.vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'

const filaStore = useFilaExtrasStore()
const toast = useToast()

const dialogInscricao = ref(false)
const refeicaoSelecionada = ref<any>(null)
const loadingAcao = ref(false)

const formatarData = (data: string) => {
  return new Date(data).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  })
}

const formatarTurno = (turno: string) => {
  return turno === 'almoco' ? '🌅 Almoço' : '🌙 Jantar'
}

const abrirDialogInscricao = (refeicao: any) => {
  refeicaoSelecionada.value = refeicao
  dialogInscricao.value = true
}

const confirmarInscricao = async () => {
  if (!refeicaoSelecionada.value) return

  loadingAcao.value = true
  try {
    await filaStore.inscrever(refeicaoSelecionada.value.id)
    toast.add({
      severity: 'success',
      summary: 'Sucesso!',
      detail: 'Inscrição realizada com sucesso',
      life: 3000
    })
    dialogInscricao.value = false
    await filaStore.carregarMinhasInscricoes()
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

onMounted(async () => {
  await Promise.all([
    filaStore.carregarRefeicoesDisponiveis(),
    filaStore.carregarMinhasInscricoes(),
    filaStore.carregarPosicoes()
  ])
})
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <PageHeader
      title="Fila de Extras"
      subtitle="Garanta sua refeição inscrevendo-se nas vagas remanescentes"
      :show-back-button="true"
    />

    <!-- Minhas Inscrições (Cards Horizontais) -->
    <section>
      <div class="flex items-center gap-2 mb-4">
        <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <i class="pi pi-ticket text-emerald-600"></i>
        </div>
        <h2 class="text-xl font-bold text-slate-800">Minhas Inscrições Ativas</h2>
      </div>

      <div v-if="filaStore.loading && filaStore.minhasInscricoes.length === 0" class="grid gap-4 sm:grid-cols-2">
        <Skeleton height="120px" border-radius="1.5rem" />
        <Skeleton height="120px" border-radius="1.5rem" />
      </div>

      <div v-else-if="filaStore.minhasInscricoes.length === 0">
        <div class="bg-white border border-dashed border-slate-300 rounded-3xl p-8 text-center">
           <p class="text-slate-500">Você não possui inscrições ativas no momento.</p>
        </div>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div 
          v-for="inscricao in filaStore.minhasInscricoes" 
          :key="inscricao.id"
          class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div class="flex justify-between items-start mb-4">
            <div>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{{ formatarTurno(inscricao.refeicao?.turno) }}</p>
              <p class="font-bold text-slate-800">{{ formatarData(inscricao.refeicao?.data) }}</p>
            </div>
            <Tag
              v-if="inscricao.confirmado"
              value="Confirmado"
              severity="success"
              class="!rounded-full"
            />
            <Tag
              v-else-if="inscricao.cancelado"
              value="Cancelado"
              severity="danger"
              class="!rounded-full"
            />
            <Tag
              v-else
              value="Aguardando"
              severity="warn"
              class="!rounded-full"
            />
          </div>
          
          <div class="bg-slate-50 rounded-2xl p-3 mb-4">
            <p class="text-sm text-slate-700 font-medium line-clamp-1">
              {{ inscricao.refeicao?.cardapio?.prato_principal || 'Refeição do dia' }}
            </p>
          </div>

          <div class="flex justify-between items-center">
            <div class="flex flex-col">
               <span class="text-[10px] text-slate-400 uppercase font-black">Sua Posição</span>
               <span class="text-lg font-black text-emerald-600">{{ inscricao.posicao }}º</span>
            </div>
            <Button
              v-if="!inscricao.confirmado && !inscricao.cancelado"
              label="Cancelar"
              severity="danger"
              text
              size="small"
              icon="pi pi-times"
              class="!rounded-xl"
              :loading="loadingAcao"
              @click="cancelarInscricao(inscricao.id)"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Refeições Disponíveis -->
    <section>
      <div class="flex items-center gap-2 mb-4">
        <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <i class="pi pi-list text-emerald-600"></i>
        </div>
        <h2 class="text-xl font-bold text-slate-800">Vagas Disponíveis</h2>
      </div>

      <div v-if="filaStore.loading && filaStore.refeicoesDisponiveis.length === 0" class="space-y-4">
         <Skeleton height="80px" border-radius="1.5rem" v-for="i in 3" :key="i" />
      </div>

      <div v-else-if="filaStore.refeicoesDisponiveis.length === 0">
        <div class="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center">
           <i class="pi pi-calendar-times text-4xl text-slate-300 mb-4"></i>
           <p class="text-slate-500 font-medium">Não há refeições disponíveis para inscrição no momento.</p>
        </div>
      </div>

      <div v-else class="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        <DataTable
          :value="filaStore.refeicoesDisponiveis"
          :rows="10"
          :paginator="filaStore.refeicoesDisponiveis.length > 10"
          class="p-datatable-sm"
          responsiveLayout="stack"
          breakpoint="768px"
        >
          <Column header="Refeição">
            <template #body="{ data }">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                  {{ data.turno === 'almoco' ? '🌅' : '🌙' }}
                </div>
                <div>
                  <p class="font-bold text-slate-800">{{ formatarData(data.data) }}</p>
                  <p class="text-xs text-slate-500 capitalize">{{ data.turno }}</p>
                </div>
              </div>
            </template>
          </Column>
          <Column field="prato_principal" header="Prato Principal" class="font-medium text-slate-700" />
          <Column header="Disponibilidade">
            <template #body="{ data }">
              <div class="flex flex-col gap-1">
                 <Tag
                  :value="`${data.vagas_disponiveis} vagas`"
                  :severity="data.vagas_disponiveis > 10 ? 'success' : 'warn'"
                  class="!rounded-full w-fit"
                />
                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Até {{ data.limite_inscricoes }}</span>
              </div>
            </template>
          </Column>
          <Column header="Ações" class="text-right">
            <template #body="{ data }">
              <Button
                v-if="data.pode_inscrever && !data.ja_inscrito"
                label="Inscrever-se"
                icon="pi pi-plus"
                size="small"
                class="!rounded-2xl"
                severity="success"
                @click="abrirDialogInscricao(data)"
              />
              <div v-else-if="data.ja_inscrito" class="flex items-center justify-end gap-2 text-emerald-600 font-bold text-sm">
                 <i class="pi pi-check-circle"></i>
                 Inscrito
              </div>
              <Tag v-else value="Expirado" severity="danger" class="!rounded-full" />
            </template>
          </Column>
        </DataTable>
      </div>
    </section>

    <!-- Dialog de Confirmação (Estilo Refinado) -->
    <Dialog
      v-model:visible="dialogInscricao"
      modal
      header="Confirmar Inscrição"
      :style="{ width: '90%', maxWidth: '400px' }"
      :draggable="false"
      class="!rounded-[2rem] overflow-hidden"
    >
      <div v-if="refeicaoSelecionada" class="space-y-6 py-4">
        <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
           <p class="text-emerald-800 text-sm leading-relaxed">
             Deseja confirmar sua inscrição para esta refeição? Sua posição será gerada por ordem de chegada na fila virtual.
           </p>
        </div>

        <div class="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
          <div class="flex justify-between">
            <span class="text-slate-500">Data:</span>
            <span class="font-bold text-slate-800">{{ formatarData(refeicaoSelecionada.data) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Turno:</span>
            <span class="font-bold text-slate-800 capitalize">{{ refeicaoSelecionada.turno }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Prato:</span>
            <span class="font-bold text-slate-800">{{ refeicaoSelecionada.prato_principal }}</span>
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
