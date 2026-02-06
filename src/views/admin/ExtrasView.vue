<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useToast } from 'primevue/usetoast'
import { adminExtrasService, type FilaExtraAdmin } from '../../services/adminExtras'
import { useAvatar } from '../../composables/useAvatar'
import PageHeader from '../../components/common/PageHeader.vue'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import Avatar from 'primevue/avatar'

const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()

// Estado
const inscricoesHoje = ref<FilaExtraAdmin[]>([])
const vagasInfo = ref<{
  almoco?: { bolsistas_esperados: number, bolsistas_presentes: number, vagas_extras_total: number, extras_inscritos: number, vagas_restantes: number },
  jantar?: { bolsistas_esperados: number, bolsistas_presentes: number, vagas_extras_total: number, extras_inscritos: number, vagas_restantes: number }
} | null>(null)
const loading = ref(false)

const filtersHoje = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

// Filtro de turno
const turnoSelecionado = ref<'almoco' | 'jantar'>('almoco')

// Seleção para ações em lote
const inscricoesSelecionadas = ref<FilaExtraAdmin[]>([])

// Computed
const getTurno = (inscricao: FilaExtraAdmin): string => {
  return inscricao.refeicao?.turno || (inscricao as any).turno || ''
}

const inscricoesFiltradas = computed(() => {
  return inscricoesHoje.value.filter(i => getTurno(i) === turnoSelecionado.value)
})

const estatisticas = computed(() => {
  const lista = inscricoesFiltradas.value
  return {
    total: lista.length,
    naFila: lista.filter(i => i.status === 'inscrito').length,
    atendidos: lista.filter(i => i.status === 'aprovado').length
  }
})

const estatisticasAlmoco = computed(() => {
  const lista = inscricoesHoje.value.filter(i => getTurno(i) === 'almoco')
  return { total: lista.length, naFila: lista.filter(i => i.status === 'inscrito').length }
})

const estatisticasJantar = computed(() => {
  const lista = inscricoesHoje.value.filter(i => getTurno(i) === 'jantar')
  return { total: lista.length, naFila: lista.filter(i => i.status === 'inscrito').length }
})

// Métodos
const carregarInscricoes = async () => {
  loading.value = true
  try {
    const { data, meta } = await adminExtrasService.listarHoje()
    inscricoesHoje.value = data
    if (meta?.vagas) {
      vagasInfo.value = meta.vagas
    }
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar inscrições' })
  } finally {
    loading.value = false
  }
}

const atenderExtra = async (inscricao: FilaExtraAdmin) => {
  try {
    await adminExtrasService.aprovar(inscricao.id)
    await adminExtrasService.confirmarPresenca(inscricao.id)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: `${inscricao.user?.nome} foi atendido!` })
    carregarInscricoes()
  } catch {
    try {
      await adminExtrasService.confirmarPresenca(inscricao.id)
      toast.add({ severity: 'success', summary: 'Sucesso', detail: `${inscricao.user?.nome} foi atendido!` })
      carregarInscricoes()
    } catch {
      toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao atender estudante' })
    }
  }
}

const marcarNaoCompareceu = async (inscricao: FilaExtraAdmin) => {
  try {
    await adminExtrasService.rejeitar(inscricao.id, 'Não compareceu no horário')
    toast.add({ severity: 'info', summary: 'Info', detail: 'Marcado como não compareceu' })
    carregarInscricoes()
  } catch {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao atualizar status' })
  }
}

const atenderSelecionados = async () => {
  const inscritos = inscricoesSelecionadas.value.filter(i => i.status === 'inscrito')
  if (!inscritos.length) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Nenhuma inscrição na fila selecionada' })
    return
  }

  let atendidos = 0
  for (const inscricao of inscritos) {
    try {
      await adminExtrasService.aprovar(inscricao.id)
      await adminExtrasService.confirmarPresenca(inscricao.id)
      atendidos++
    } catch { /* ignora */ }
  }

  toast.add({ severity: 'success', summary: 'Sucesso', detail: `${atendidos} estudante(s) atendido(s)` })
  inscricoesSelecionadas.value = []
  carregarInscricoes()
}


const getStatusLabel = (status: string) => {
  switch (status) {
    case 'aprovado': return 'Atendido'
    case 'rejeitado': return 'Não Compareceu'
    case 'inscrito': return 'Na Fila'
    default: return status
  }
}

const formatarDataHora = (dataString: string) => {
  if (!dataString) return '-'
  // Se já é só hora (HH:mm:ss)
  if (dataString.includes(':') && !dataString.includes('-') && !dataString.includes('/')) {
    return dataString.substring(0, 5)
  }
  const data = new Date(dataString)
  if (isNaN(data.getTime())) return dataString
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
         data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  carregarInscricoes()
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Fila de Extras"
      subtitle="Atenda os estudantes não-bolsistas inscritos para refeições extras."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Fila de Extras' }]"
    />

    <!-- Seletor de Turno -->
    <div class="flex flex-col gap-4">
      <SelectButton
        v-model="turnoSelecionado"
        :options="[
          { label: 'Almoço', value: 'almoco', icon: 'pi pi-sun', total: estatisticasAlmoco.total, naFila: estatisticasAlmoco.naFila },
          { label: 'Jantar', value: 'jantar', icon: 'pi pi-moon', total: estatisticasJantar.total, naFila: estatisticasJantar.naFila }
        ]"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        class="w-full md:w-auto"
      >
        <template #option="slotProps">
          <div class="flex items-center gap-3 px-2">
            <i :class="slotProps.option.icon" class="text-lg"></i>
            <span class="font-bold">{{ slotProps.option.label }}</span>
            <span v-if="slotProps.option.naFila > 0" class="bg-amber-100 text-amber-700 text-xs font-black px-2 py-0.5 rounded-full">
              {{ slotProps.option.naFila }} na fila
            </span>
          </div>
        </template>
      </SelectButton>
    </div>

    <!-- Cards de Estatísticas -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-xl shadow-lg flex flex-col items-center justify-center text-white">
        <p class="text-3xl font-black">{{ vagasInfo?.[turnoSelecionado]?.vagas_restantes ?? '-' }}</p>
        <p class="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-90">Vagas Disponíveis</p>
      </div>

      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
        <div class="flex items-baseline gap-1">
          <p class="text-2xl font-black text-blue-600">{{ vagasInfo?.[turnoSelecionado]?.bolsistas_presentes ?? 0 }}</p>
          <p class="text-slate-400">/</p>
          <p class="text-lg font-bold text-slate-400">{{ vagasInfo?.[turnoSelecionado]?.bolsistas_esperados ?? 0 }}</p>
        </div>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Bolsistas Presentes</p>
      </div>

      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
        <p class="text-3xl font-black text-amber-600">{{ estatisticas.naFila }}</p>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Na Fila</p>
      </div>

      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
        <p class="text-3xl font-black text-green-600">{{ estatisticas.atendidos }}</p>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Atendidos</p>
      </div>
    </div>

    <!-- Tabela de Fila -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <div class="flex justify-between items-center gap-4 mb-2">
          <h3 class="text-lg font-bold text-slate-700">
            Fila do {{ turnoSelecionado === 'almoco' ? 'Almoço' : 'Jantar' }}
          </h3>
          <InputText v-model="filtersHoje['global'].value" placeholder="Buscar aluno..." class="!rounded-xl bg-slate-100" />

        <Button
          v-if="inscricoesSelecionadas.filter(i => i.status === 'inscrito').length > 0"
          :label="`Atender ${inscricoesSelecionadas.filter(i => i.status === 'inscrito').length} selecionados`"
          icon="pi pi-check-circle"
          severity="success"
          size="small"
          @click="atenderSelecionados"
        />
      </div>

      <DataTable
        v-model:filters="filtersHoje"
        v-model:selection="inscricoesSelecionadas"
        :value="inscricoesFiltradas"
        :loading="loading"
        dataKey="id"
        paginator
        :rows="10"
        :globalFilterFields="['user.nome', 'user.matricula']"
      >
        <template #loading>
          <div class="flex items-center justify-center py-12">
            <i class="pi pi-spinner pi-spin text-4xl text-primary-500"></i>
          </div>
        </template>
        <template #header>
          <div class="flex justify-end">

          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center justify-center py-12 text-slate-400">
            <i class="pi pi-users text-6xl mb-4 text-slate-200"></i>
            <p class="text-lg font-semibold text-slate-500">Nenhum estudante na fila</p>
            <p class="text-sm text-slate-400 mt-1">Quando estudantes se inscreverem, aparecerão aqui.</p>
          </div>
        </template>

        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

        <Column field="posicao" header="Posição" style="width: 100px">
          <template #body="{ data }">
            <span v-if="data.posicao && data.status === 'inscrito'" class="font-black text-xl text-emerald-600">#{{ data.posicao }}</span>
            <span v-else-if="data.status === 'aprovado'" class="text-green-600 flex items-center gap-1">
              <i class="pi pi-check-circle"></i>
            </span>
            <span v-else class="text-slate-300">-</span>
          </template>
        </Column>

        <Column field="user.nome" header="Estudante">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <Avatar
                v-if="data.user?.foto"
                :image="data.user.foto"
                shape="circle"
              />
              <Avatar
                v-else
                :label="getInitials(data.user?.nome)"
                shape="circle"
                :style="getAvatarStyle(data.user?.nome)"
              />
              <div>
                <p class="font-bold text-slate-700">{{ data.user?.nome }}</p>
                <p class="text-xs text-slate-400 font-mono">{{ data.user?.matricula }}</p>
              </div>
            </div>
          </template>
        </Column>

        <Column field="inscrito_em" header="Inscrito em" style="width: 140px">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <i class="pi pi-clock text-slate-400"></i>
              <span class="text-slate-600 font-medium text-sm">{{ formatarDataHora(data.inscrito_em) }}</span>
            </div>
          </template>
        </Column>

        <Column field="atendido_em" header="Atendido em" style="width: 140px">
          <template #body="{ data }">
            <div v-if="data.atendido_em && data.status === 'aprovado'" class="flex items-center gap-2">
              <span class="text-sm">{{ formatarDataHora(data.atendido_em) }}</span>
            </div>
            <span v-else class="text-slate-300 text-sm">-</span>
          </template>
        </Column>

        <Column field="status" header="Status" style="width: 140px">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <i :class="[
                data.status === 'aprovado' ? 'pi pi-check-circle text-emerald-600' :
                data.status === 'rejeitado' ? 'pi pi-times-circle text-red-500' :
                'pi pi-clock text-amber-500'
              ]"></i>
              <span :class="[
                'font-bold',
                data.status === 'aprovado' ? 'text-emerald-600' :
                data.status === 'rejeitado' ? 'text-red-500' :
                'text-amber-500'
              ]">{{ getStatusLabel(data.status) }}</span>
            </div>
          </template>
        </Column>

        <Column header="Ações" style="width: 200px; text-align: right" headerStyle="text-align: right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-2">
              <Button
                v-if="data.status === 'inscrito'"
                label="Atender"
                icon="pi pi-check"
                severity="success"
                size="small"
                class="!py-1.5 !px-3 !rounded-lg"
                @click="atenderExtra(data)"
              />
              <Button
                v-if="data.status === 'inscrito'"
                icon="pi pi-times"
                severity="danger"
                variant="outlined"
                size="small"
                class="!w-8 !h-8 !p-0 !flex !items-center !justify-center !rounded-lg" 
                title="Não compareceu"
                @click="marcarNaoCompareceu(data)"
              />

            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
</style>
