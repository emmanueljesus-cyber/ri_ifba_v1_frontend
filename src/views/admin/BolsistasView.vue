<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useToast } from 'primevue/usetoast'
import { adminBolsistaService } from '../../services/adminBolsista'
import { useAvatar } from '../../composables/useAvatar'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import FileUpload from 'primevue/fileupload'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Avatar from 'primevue/avatar'
import Select from 'primevue/select'

const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()
const bolsistas = ref<any[]>([])
const loading = ref(false)
const displayImport = ref(false)
const displayDesligar = ref(false)
const displayReativar = ref(false)
const displayTemplates = ref(false)
const displayNovo = ref(false)
const selectedBolsista = ref<any>(null)
const motivoDesligamento = ref('')
const motivoReativacao = ref('')
const salvandoBolsista = ref(false)

const novoBolsista = ref({
  matricula: '',
  turno_refeicao: 'almoco'
})

const statusOptions = ref([
  { label: 'Todos', value: null },
  { label: 'Ativo', value: true },
  { label: 'Inativo', value: false }
])

const turnoOptions = ref([
  { label: 'Todos Turnos', value: null },
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
])

const turnoFormOptions = ref([
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
])

const filtersBolsistas = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  ativo: { value: null, matchMode: FilterMatchMode.EQUALS },
  turno_refeicao: { value: null, matchMode: FilterMatchMode.EQUALS }
})

const carregarBolsistas = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (filtersBolsistas.value.ativo.value !== null) {
      params.ativo = filtersBolsistas.value.ativo.value
    }
    if (filtersBolsistas.value.turno_refeicao.value) {
      params.turno_refeicao = filtersBolsistas.value.turno_refeicao.value
    }
    const data = await adminBolsistaService.listarTodos(params)
    bolsistas.value = Array.isArray(data) ? data : (data?.data || data || [])
  } catch (err: any) {
    console.error('Erro ao carregar bolsistas:', err)
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar usuários bolsistas' })
  } finally {
    loading.value = false
  }
}



watch([() => filtersBolsistas.value.ativo.value, () => filtersBolsistas.value.turno_refeicao.value], () => {
  carregarBolsistas()
})

const onUpload = async (event: any) => {
  try {
    const resultado = await adminBolsistaService.importar(event.files[0])
    const criados = resultado?.data?.criados?.length || 0
    const atualizados = resultado?.data?.atualizados?.length || 0
    const total = criados + atualizados
    toast.add({ 
      severity: 'success', 
      summary: 'Sucesso', 
      detail: `${total} bolsista(s) importado(s) (${criados} novos, ${atualizados} atualizados)`,
      life: 4000
    })
    displayImport.value = false
    // Forçar atualização após breve delay
    setTimeout(() => carregarBolsistas(), 500)
  } catch (err: any) {
    console.error('Erro na importação:', err)
    const errorMsg = err.response?.data?.meta?.message || err.response?.data?.meta?.errors?.[0] || err.response?.data?.message || 'Falha na importação'
    toast.add({ severity: 'error', summary: 'Erro', detail: errorMsg, life: 5000 })
  }
}

const resetNovoBolsista = () => {
  novoBolsista.value = {
    matricula: '',
    turno_refeicao: 'almoco'
  }
}

const salvarNovoBolsista = async () => {
  if (!novoBolsista.value.matricula) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Matrícula é obrigatória', life: 3000 })
    return
  }

  salvandoBolsista.value = true
  try {
    await adminBolsistaService.criarBolsista(novoBolsista.value)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Bolsista adicionado com sucesso!' })
    displayNovo.value = false
    resetNovoBolsista()
    carregarBolsistas()
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.response?.data?.errors?.matricula?.[0] || 'Falha ao adicionar bolsista'
    toast.add({ severity: 'error', summary: 'Erro', detail: errorMsg, life: 5000 })
  } finally {
    salvandoBolsista.value = false
  }
}

const confirmarDesligamento = async () => {
  if (!motivoDesligamento.value || motivoDesligamento.value.length < 10) {
    toast.add({ 
      severity: 'warn', 
      summary: 'Atenção', 
      detail: 'O motivo deve ter no mínimo 10 caracteres',
      life: 3000
    })
    return
  }
  try {
    await adminBolsistaService.desligar(selectedBolsista.value.id, motivoDesligamento.value)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Bolsista desligado' })
    displayDesligar.value = false
    motivoDesligamento.value = ''
    carregarBolsistas()
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || 'Falha ao desligar'
    toast.add({ severity: 'error', summary: 'Erro', detail: errorMsg })
  }
}

const confirmarReativacao = async () => {
  if (motivoReativacao.value && motivoReativacao.value.length < 10) {
    toast.add({ 
      severity: 'warn', 
      summary: 'Atenção', 
      detail: 'Se informado, o motivo deve ter no mínimo 10 caracteres',
      life: 3000
    })
    return
  }
  try {
    await adminBolsistaService.reativar(selectedBolsista.value.id, motivoReativacao.value || undefined)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Bolsista reativado' })
    displayReativar.value = false
    motivoReativacao.value = ''
    carregarBolsistas()
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || 'Falha ao reativar'
    toast.add({ severity: 'error', summary: 'Erro', detail: errorMsg })
  }
}

import api from '../../services/api' // Importe o Axios configurado

const downloadTemplate = async () => {
  try {
    // Usar rota V2 protegida (dentro do grupo admin)
    // O interceptor do api.ts vai adicionar o token Bearer automaticamente
    const url = `/admin/bolsistas/template-v2`

    const response = await api.get(url, {
      responseType: 'blob', // Importante para arquivos binários
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    })

    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })

    const contentDisposition = response.headers['content-disposition']
    let filename = 'template_bolsistas.xlsx'
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1]
      }
    }

    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)

    toast.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Template baixado com sucesso!',
      life: 3000
    })
  } catch (error) {
    console.error('Erro ao baixar template:', error)
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: 'Erro ao baixar template. Tente novamente.',
      life: 5000
    })
  }
}

// Função para abreviar dias da semana
const getDiaSemanaAbrev = (dia: number) => {
  const dias: Record<number, string> = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sáb'
  }
  return dias[dia] || '-'
}

onMounted(() => {
  carregarBolsistas()
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Gestão de Bolsistas"
      subtitle="Visualize e gerencie a lista de bolsistas aprovados e cadastrados."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Gestão de Bolsistas' }]"
    />

    <div class="flex justify-end items-center -mt-16 mb-4 relative z-10">
      <div class="flex gap-2">
        <Button label="Novo" icon="pi pi-plus" severity="success" @click="displayNovo = true" />
        <Button label="Modelo Excel" icon="pi pi-download" severity="info" text @click="displayTemplates = true" />
        <Button label="Importar Planilha" icon="pi pi-upload" severity="secondary" outlined @click="displayImport = true" />
      </div>
    </div>

    <div class="animate-fadein">
      <div class="card bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <DataTable v-model:filters="filtersBolsistas" :value="bolsistas" :loading="loading" paginator :rows="10"
          :globalFilterFields="['nome', 'matricula', 'curso']">
          <template #header>
            <div class="flex flex-col md:flex-row justify-between items-center mb-2 gap-4">
              <span class="text-xl font-bold text-slate-700">Usuários Ativos</span>
              <div class="flex gap-3 items-center w-full md:w-auto">
                <Select v-model="filtersBolsistas['turno_refeicao'].value" :options="turnoOptions" optionLabel="label" optionValue="value" placeholder="Refeição" class="flex-1 md:w-40" />
                <Select v-model="filtersBolsistas['ativo'].value" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Status" class="flex-1 md:w-40" />
                <InputText v-model="filtersBolsistas['global'].value" placeholder="Buscar bolsista..." class="flex-1 md:w-60 !rounded-xl" />
              </div>
            </div>
          </template>
          <Column field="nome" header="Bolsista">
            <template #body="{ data }">
              <div class="flex items-center gap-3">
                <Avatar
                  v-if="data.foto"
                  :image="data.foto"
                  shape="circle"
                />
                <Avatar
                  v-else
                  :label="getInitials(data.nome)"
                  shape="circle"
                  :style="getAvatarStyle(data.nome)"
                />
                <div class="flex flex-col">
                  <span class="font-bold text-slate-700">{{ data.nome }}</span>
                  <span class="text-[10px] text-slate-400 font-black uppercase">{{ data.matricula }}</span>
                </div>
              </div>
            </template>
          </Column>
          <Column field="curso" header="Curso"></Column>
          <Column field="turno_refeicao" header="Refeição">
            <template #body="{ data }">
              <Tag v-if="data.turno_refeicao" :severity="data.turno_refeicao === 'almoco' ? 'success' : 'info'" class="!rounded-full px-3 uppercase text-[10px] font-black">
                <i :class="data.turno_refeicao === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'" class="mr-1"></i>
                {{ data.turno_refeicao }}
              </Tag>
              <span v-else class="text-slate-400 text-xs italic">Não informado</span>
            </template>
          </Column>
          <Column field="preferencia_alimentar" header="Saúde e Restrições">
            <template #body="{ data }">
              <div v-if="data.is_ovolactovegetariano || (data.restricoes_alimentares && data.restricoes_alimentares.length > 0) || data.alergias" class="space-y-1.5">
                <!-- Ovolactovegetariano -->
                <div v-if="data.is_ovolactovegetariano" class="flex items-center gap-2">
                  <i class="pi pi-leaf text-green-500"></i>
                  <span class="text-xs text-green-700 font-semibold">Ovolactovegetariano</span>
                </div>

                <!-- Restrições Alimentares -->
                <div v-if="data.restricoes_alimentares && data.restricoes_alimentares.length > 0">
                  <div class="flex flex-wrap gap-1">
                    <Tag v-for="restricao in data.restricoes_alimentares" :key="restricao" severity="warn" class="!rounded-full px-2 text-[9px]">
                      {{ restricao }}
                    </Tag>
                  </div>
                </div>

                <!-- Alergias -->
                <div v-if="data.alergias" class="flex items-center gap-1">
                  <i class="pi pi-exclamation-triangle text-red-500 text-xs"></i>
                  <Tag severity="danger" class="!rounded-full px-2 text-[9px]">
                    {{ data.alergias }}
                  </Tag>
                </div>
              </div>
              <span v-else class="text-slate-300 text-xs">-</span>
            </template>
          </Column>
          <Column field="dias_semana" header="Dias de Uso">
            <template #body="{ data }">
              <div v-if="data.dias_semana_texto" class="text-xs text-slate-700">

                  {{ data.dias_semana_texto }}

              </div>
              <div v-else-if="data.dias_semana && data.dias_semana.length > 0" class="flex flex-wrap gap-1">
                <Tag v-for="dia in data.dias_semana" :key="dia" severity="secondary" class="!rounded-full px-2 text-[9px]">
                  {{ getDiaSemanaAbrev(dia) }}
                </Tag>
              </div>
              <span v-else class="text-slate-300 text-xs">-</span>
            </template>
          </Column>

          <Column field="ativo" header="Status">
            <template #body="{ data }">
              <Tag :value="data.ativo ? 'Ativo' : 'Inativo'" :severity="data.ativo ? 'success' : 'danger'" />
            </template>
          </Column>
          <Column field="total_faltas" header="Faltas">
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <Tag
                    :value="String(data.total_faltas ?? 0)"
                    :severity="(data.total_faltas ?? 0) === 0 ? 'info' : (data.total_faltas ?? 0) <= 3 ? 'warn' : 'danger'"
                    class="!rounded-full px-3 font-black"
                />
              </div>
            </template>
          </Column>
          <Column header="Ações">
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button v-if="data.ativo" icon="pi pi-user-minus" outlined severity="danger" class="!rounded-lg" @click="selectedBolsista = data; displayDesligar = true" />
                <Button v-else icon="pi pi-user-plus" outlined severity="success" class="!rounded-lg" @click="selectedBolsista = data; displayReativar = true" />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <!-- Dialog Importação -->
    <Dialog v-model:visible="displayImport" header="Importar Bolsistas" :style="{ width: '450px' }" modal>
      <div class="space-y-4">
        <p class="text-sm text-slate-600">Selecione o arquivo Excel (.xlsx) ou CSV com a lista de bolsistas aprovados.</p>
        <FileUpload mode="basic" name="file" accept=".xlsx,.csv" :maxFileSize="5000000" customUpload @select="onUpload" chooseLabel="Escolher Arquivo" class="w-full" />
      </div>
    </Dialog>

    <!-- Dialog Novo Bolsista -->
    <Dialog v-model:visible="displayNovo" header="Novo Bolsista" :style="{ width: '450px' }" modal class="!rounded-xl">
      <div class="space-y-4 py-2">
        <div class="field">
          <label class="font-bold block mb-2">Matrícula <span class="text-red-500">*</span></label>
          <InputText v-model="novoBolsista.matricula" class="w-full" placeholder="Ex: 20231234567" />
        </div>

        <div class="field">
          <label class="font-bold block mb-2">Turno da Refeição <span class="text-red-500">*</span></label>
          <Select v-model="novoBolsista.turno_refeicao" :options="turnoFormOptions" optionLabel="label" optionValue="value" class="w-full" />
        </div>

        <div class="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p class="text-xs text-blue-700">
            <i class="pi pi-info-circle mr-1"></i>
            Ao adicionar a matrícula, o estudante será automaticamente reconhecido como bolsista quando se cadastrar no sistema.
          </p>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" icon="pi pi-times" text @click="displayNovo = false; resetNovoBolsista()" />
        <Button label="Salvar" icon="pi pi-check" severity="success" :loading="salvandoBolsista" @click="salvarNovoBolsista" />
      </template>
    </Dialog>

    <!-- Dialog Desligamento -->
    <Dialog v-model:visible="displayDesligar" header="Confirmar Desligamento" :style="{ width: '400px' }" modal>
      <div class="space-y-4">
        <p>Deseja realmente desligar o bolsista <strong>{{ selectedBolsista?.nome }}</strong>?</p>
        <div class="field">
          <label class="font-bold block mb-2">Motivo <span class="text-red-500">*</span></label>
          <InputText 
            v-model="motivoDesligamento" 
            class="w-full" 
            placeholder="Ex: Formatura, Desistência, Transferência..." 
          />
          <small class="text-slate-500 mt-1 block">
            Mínimo 10 caracteres ({{ motivoDesligamento.length }}/10)
          </small>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" icon="pi pi-times" text @click="displayDesligar = false" />
        <Button label="Confirmar" icon="pi pi-check" severity="danger" @click="confirmarDesligamento" />
      </template>
    </Dialog>

    <!-- Dialog Reativação -->
    <Dialog v-model:visible="displayReativar" header="Confirmar Reativação" :style="{ width: '400px' }" modal>
      <div class="space-y-4">
        <p>Deseja realmente reativar o bolsista <strong>{{ selectedBolsista?.nome }}</strong>?</p>
        <div class="field">
          <label class="font-bold block mb-2">Motivo (opcional)</label>
          <InputText 
            v-model="motivoReativacao" 
            class="w-full" 
            placeholder="Ex: Retorno de licença, Regularização de situação..." 
          />
          <small v-if="motivoReativacao" class="text-slate-500 mt-1 block">
            {{ motivoReativacao.length }}/10 caracteres
          </small>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" icon="pi pi-times" text @click="displayReativar = false" />
        <Button label="Confirmar" icon="pi pi-check" severity="success" @click="confirmarReativacao" />
      </template>
    </Dialog>

    <!-- Dialog Modelos -->
    <Dialog v-model:visible="displayTemplates" header="Modelos de Planilha" :style="{ width: '400px' }" modal class="!rounded-xl">
      <div class="space-y-6 py-4">
        <p class="text-sm text-slate-600">Baixe os modelos oficiais para importação de bolsistas no sistema.</p>
        
        <div class="grid gap-3">
           <Button label="Modelo de Bolsistas (.xlsx)" icon="pi pi-file-excel" severity="emerald" outlined class="!rounded-xl text-left" @click="downloadTemplate" />
        </div>
        
        <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
           <p class="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Nota:</p>
           <p class="text-xs text-emerald-700">A planilha deve conter as colunas: Matrícula, Nome, Curso, Turno e Dias da Semana (0-6).</p>
        </div>
      </div>
    </Dialog>
  </div>
</template>
