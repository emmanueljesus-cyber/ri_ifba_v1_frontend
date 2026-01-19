<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useToast } from 'primevue/usetoast'
import { adminBolsistaService } from '../../services/adminBolsista'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import FileUpload from 'primevue/fileupload'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Avatar from 'primevue/avatar'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'

const toast = useToast()
const bolsistas = ref<any[]>([])
const aprovados = ref<any[]>([])
const loading = ref(false)
const loadingAprovados = ref(false)
const displayImport = ref(false)
const displayDesligar = ref(false)
const displayTemplates = ref(false)
const selectedBolsista = ref<any>(null)
const motivoDesligamento = ref('')

const filtersAprovados = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

const filtersBolsistas = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

const carregarBolsistas = async () => {
  loading.value = true
  try {
    const data = await adminBolsistaService.listarTodos()
    bolsistas.value = Array.isArray(data) ? data : (data?.data || [])
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar usuários bolsistas' })
  } finally {
    loading.value = false
  }
}

const carregarAprovados = async () => {
  loadingAprovados.value = true
  try {
    const data = await adminBolsistaService.listarAprovados()
    aprovados.value = Array.isArray(data) ? data : (data?.data || [])
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar lista de aprovados' })
  } finally {
    loadingAprovados.value = false
  }
}

const onUpload = async (event: any) => {
  try {
    await adminBolsistaService.importar(event.files[0])
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Importação concluída' })
    displayImport.value = false
    carregarAprovados()
    carregarBolsistas()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha na importação' })
  }
}

const confirmarDesligamento = async () => {
  if (!motivoDesligamento.value) return
  try {
    await adminBolsistaService.desligar(selectedBolsista.value.id, motivoDesligamento.value)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Bolsista desligado' })
    displayDesligar.value = false
    carregarBolsistas()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao desligar' })
  }
}

const downloadTemplate = () => {
  const url = `${import.meta.env.VITE_API_BASE_URL}/admin/bolsistas/template`
  window.open(url, '_blank')
}

onMounted(() => {
  carregarBolsistas()
  carregarAprovados()
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Gestão de Bolsistas"
      subtitle="Visualize e gerencie a lista de bolsistas aprovados e cadastrados."
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Gestão de Bolsistas' }]"
    />

    <div class="flex justify-end -mt-16 mb-4 relative z-10">
      <div class="flex gap-2">
        <Button label="Modelo Excel" icon="pi pi-download" severity="info" text @click="displayTemplates = true" />
        <Button label="Importar Planilha" icon="pi pi-upload" severity="secondary" outlined @click="displayImport = true" />
      </div>
    </div>

    <Tabs value="0">
      <TabList class="gap-4">
        <Tab value="0" class="!px-6">Lista de Aprovados (Importada)</Tab>
        <Tab value="1" class="!px-6">Usuários Bolsistas (Cadastrados)</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="0">
          <div class="card bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <DataTable v-model:filters="filtersAprovados" :value="aprovados" :loading="loadingAprovados" paginator :rows="10"
              :globalFilterFields="['matricula', 'turno']">
              <template #header>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-xl font-bold text-slate-700">Aprovados</span>
                  <IconField>
                    <InputIcon>
                      <i class="pi pi-search" />
                    </InputIcon>
                    <InputText v-model="filtersAprovados['global'].value" placeholder="Buscar aprovado..." />
                  </IconField>
                </div>
              </template>
              <Column field="matricula" header="Matrícula">
                <template #body="{ data }">
                  <div class="flex items-center gap-3">
                    <Avatar icon="pi pi-user" shape="circle" class="bg-primary-50 text-primary-600" />
                    <span class="font-bold text-slate-700">{{ data.matricula }}</span>
                  </div>
                </template>
              </Column>
              <Column field="turno" header="Turno">
                <template #body="{ data }">
                  <Tag :severity="data.turno === 'almoco' ? 'success' : 'info'" class="!rounded-full px-3 uppercase text-[10px] font-black">
                    <i :class="data.turno === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'" class="mr-1"></i>
                    {{ data.turno }}
                  </Tag>
                </template>
              </Column>
              <Column field="ativo" header="Status">
                <template #body="{ data }">
                  <Tag :value="data.ativo ? 'Ativa' : 'Inativa'" :severity="data.ativo ? 'success' : 'danger'" />
                </template>
              </Column>
              <Column header="Ações">
                <template #body="{ data }">
                   <Button v-if="data.ativo" icon="pi pi-times-circle" outlined rounded severity="danger" title="Desativar Matrícula" @click="adminBolsistaService.desativarAprovado(data.id); carregarAprovados()" />
                   <Button v-else icon="pi pi-check-circle" outlined rounded severity="success" title="Reativar Matrícula" @click="adminBolsistaService.reativarAprovado(data.id); carregarAprovados()" />
                </template>
              </Column>
            </DataTable>
          </div>
        </TabPanel>
        <TabPanel value="1">
          <div class="card bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <DataTable v-model:filters="filtersBolsistas" :value="bolsistas" :loading="loading" paginator :rows="10"
              :globalFilterFields="['nome', 'matricula', 'curso']">
              <template #header>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-xl font-bold text-slate-700">Usuários Ativos</span>
                  <IconField>
                    <InputIcon>
                      <i class="pi pi-search" />
                    </InputIcon>
                    <InputText v-model="filtersBolsistas['global'].value" placeholder="Buscar bolsista..." />
                  </IconField>
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
                      icon="pi pi-user"
                      shape="circle"
                      class="bg-primary-50 text-primary-600"
                    />
                    <div class="flex flex-col">
                      <span class="font-bold text-slate-700">{{ data.nome }}</span>
                      <span class="text-[10px] text-slate-400 font-black uppercase">{{ data.matricula }}</span>
                    </div>
                  </div>
                </template>
              </Column>
              <Column field="curso" header="Curso"></Column>
              <Column field="ativo" header="Status">
                <template #body="{ data }">
                  <Tag :value="data.ativo ? 'Ativo' : 'Inativo'" :severity="data.ativo ? 'success' : 'danger'" />
                </template>
              </Column>
              <Column header="Ações">
                <template #body="{ data }">
                  <div class="flex gap-2">
                    <Button v-if="data.ativo" icon="pi pi-user-minus" outlined rounded severity="danger" @click="selectedBolsista = data; displayDesligar = true" />
                    <Button v-else icon="pi pi-user-plus" outlined rounded severity="success" @click="adminBolsistaService.reativar(data.id); carregarBolsistas()" />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <!-- Dialog Importação -->
    <Dialog v-model:visible="displayImport" header="Importar Bolsistas" :style="{ width: '450px' }" modal>
      <div class="space-y-4">
        <p class="text-sm text-slate-600">Selecione o arquivo Excel (.xlsx) ou CSV com a lista de bolsistas aprovados.</p>
        <FileUpload mode="basic" name="arquivo" accept=".xlsx,.csv" :maxFileSize="5000000" customUpload @select="onUpload" chooseLabel="Escolher Arquivo" class="w-full" />
      </div>
    </Dialog>

    <!-- Dialog Desligamento -->
    <Dialog v-model:visible="displayDesligar" header="Confirmar Desligamento" :style="{ width: '400px' }" modal>
      <div class="space-y-4">
        <p>Deseja realmente desligar o bolsista <strong>{{ selectedBolsista?.nome }}</strong>?</p>
        <div class="field">
          <label class="font-bold block mb-2">Motivo</label>
          <InputText v-model="motivoDesligamento" class="w-full" placeholder="Ex: Formatura, Desistência..." />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" icon="pi pi-times" text @click="displayDesligar = false" />
        <Button label="Confirmar" icon="pi pi-check" severity="danger" @click="confirmarDesligamento" />
      </template>
    </Dialog>

    <!-- Dialog Modelos -->
    <Dialog v-model:visible="displayTemplates" header="Modelos de Planilha" :style="{ width: '400px' }" modal class="!rounded-[2rem]">
      <div class="space-y-6 py-4">
        <p class="text-sm text-slate-600">Baixe os modelos oficiais para importação de bolsistas no sistema.</p>
        
        <div class="grid gap-3">
           <Button label="Modelo de Bolsistas (.xlsx)" icon="pi pi-file-excel" severity="emerald" outlined class="!rounded-xl text-left" @click="downloadTemplate" />
        </div>
        
        <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
           <p class="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Nota:</p>
           <p class="text-xs text-emerald-700">A planilha deve conter as colunas: Matrícula, Nome, Curso, Turno e Dias da Semana (0-6).</p>
        </div>
      </div>
    </Dialog>
  </div>
</template>
