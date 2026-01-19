<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { cardapioService } from '../../services/cardapio'
import PageHeader from '../../components/common/PageHeader.vue'

// Locale pt-BR para DatePicker
const ptBR = {
  firstDayOfWeek: 0,
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
  monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  today: 'Hoje',
  clear: 'Limpar'
}
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import Checkbox from 'primevue/checkbox'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'

const toast = useToast()
const cardapios = ref<any[]>([])
const loading = ref(false)
const displayDialog = ref(false)
const displayImport = ref(false)
const loadingImport = ref(false)
const displayTemplates = ref(false)
const viewMode = ref('list') // 'list', 'cards' ou 'calendar'
const cardapioForm = ref({
  id: null,
  data_do_cardapio: null as Date | null,
  turnos: ['almoco', 'jantar'],
  prato_principal_ptn01: '',
  prato_principal_ptn02: '',
  guarnicao: '',
  acompanhamento_01: '',
  acompanhamento_02: '',
  salada: '',
  ovo_lacto_vegetariano: '',
  suco: '',
  sobremesa: ''
})

const turnosImport = ref(['almoco', 'jantar'])

const carregarCardapios = async () => {
  loading.value = true
  try {
    const data = await cardapioService.listarAdmin()
    cardapios.value = (data || []).map(c => ({
      ...c,
      // Normalização de datas para evitar problemas de fuso horário na visualização
      _dataObj: c.data_do_cardapio ? new Date(c.data_do_cardapio + 'T12:00:00') : null
    })).sort((a, b) => {
      const dateA = a._dataObj ? a._dataObj.getTime() : 0
      const dateB = b._dataObj ? b._dataObj.getTime() : 0
      return dateB - dateA
    })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar cardápios' })
  } finally {
    loading.value = false
  }
}

const excluirCardapio = async (id: number) => {
  if (!confirm('Deseja realmente excluir este cardápio?')) return
  try {
    await cardapioService.excluirAdmin(id)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Cardápio excluído' })
    carregarCardapios()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao excluir' })
  }
}

const abrirNovo = () => {
  cardapioForm.value = {
    id: null,
    data_do_cardapio: new Date(),
    turnos: ['almoco', 'jantar'],
    prato_principal_ptn01: '',
    prato_principal_ptn02: '',
    guarnicao: '',
    acompanhamento_01: '',
    acompanhamento_02: '',
    salada: '',
    ovo_lacto_vegetariano: '',
    suco: '',
    sobremesa: ''
  }
  displayDialog.value = true
}

const abrirNovoComData = (dataString: string) => {
  abrirNovo()
  cardapioForm.value.data_do_cardapio = new Date(dataString + 'T12:00:00')
}

const editarCardapio = (cardapio: any) => {
  cardapioForm.value = { 
    ...cardapio, 
    data_do_cardapio: cardapio.data_do_cardapio ? new Date(cardapio.data_do_cardapio + 'T12:00:00') : null,
    turnos: cardapio.turnos || ['almoco', 'jantar']
  }
  displayDialog.value = true
}

const salvarCardapio = async () => {
  if (!cardapioForm.value.data_do_cardapio || cardapioForm.value.turnos.length === 0) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Data e Turno são obrigatórios' })
    return
  }

  try {
    // Ajustar a data para o fuso horário local antes de converter para ISO string
    // O DatePicker retorna um objeto Date. Usamos o formato YYYY-MM-DD
    const date = cardapioForm.value.data_do_cardapio
    const ano = date.getFullYear()
    const mes = String(date.getMonth() + 1).padStart(2, '0')
    const dia = String(date.getDate()).padStart(2, '0')
    const dataFormatada = `${ano}-${mes}-${dia}`

    const payload = {
      ...cardapioForm.value,
      data_do_cardapio: dataFormatada
    }
    await cardapioService.salvarAdmin(payload)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Cardápio salvo com sucesso' })
    displayDialog.value = false
    carregarCardapios()
  } catch (err: any) {
    const errorMsg = err?.response?.data?.message || 'Falha ao salvar'
    toast.add({ severity: 'error', summary: 'Erro', detail: errorMsg })
  }
}

const onUpload = async (event: any) => {
  const file = event.files[0]
  if (!file) return

  loadingImport.value = true
  try {
    await cardapioService.importarAdmin(file, turnosImport.value)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Cardápio importado com sucesso' })
    displayImport.value = false
    carregarCardapios()
  } catch (err: any) {
    const errorMsg = err?.response?.data?.message || 'Falha na importação'
    toast.add({ severity: 'error', summary: 'Erro', detail: errorMsg })
  } finally {
    loadingImport.value = false
  }
}

const downloadTemplate = async (tipo: string) => {
  try {
    const url = `${import.meta.env.VITE_API_BASE_URL}/admin/${tipo}/template`
    window.open(url, '_blank')
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao baixar modelo' })
  }
}

// Lógica para o calendário mensal
const diasCalendario = computed(() => {
  const data = new Date()
  const mes = data.getMonth()
  const ano = data.getFullYear()
  
  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia = new Date(ano, mes + 1, 0)
  
  const dias = []
  
  // Dias vazios do início da semana
  for (let i = 0; i < primeiroDia.getDay(); i++) {
    dias.push({ vazio: true })
  }
  
  // Dias do mês
  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    const dataString = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    // Buscar cardápio ignorando fuso horário
    const cardapio = cardapios.value.find(c => c.data_do_cardapio === dataString)
    dias.push({ dia: d, cardapio, dataString })
  }
  
  return dias
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Gestão de Cardápios"
      subtitle="Crie e gerencie os cardápios diários."
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Gestão de Cardápio' }]"
    />

    <div class="flex justify-end -mt-16 mb-4 relative z-10">
      <div class="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
        <SelectButton 
          v-model="viewMode" 
          :options="[{label: 'Lista', value: 'list', icon: 'pi pi-list'}, {label: 'Cards', value: 'cards', icon: 'pi pi-th-large'}, {label: 'Mensal', value: 'calendar', icon: 'pi pi-calendar'}]" 
          optionLabel="label" 
          optionValue="value"
          :allowEmpty="false"
          class="custom-select-button"
        >
          <template #option="slotProps">
            <div class="flex items-center gap-2 px-1">
              <i :class="slotProps.option.icon"></i>
              <span class="text-xs font-bold uppercase tracking-tight">{{ slotProps.option.label }}</span>
            </div>
          </template>
        </SelectButton>
        <div class="h-6 w-px bg-slate-200 mx-1"></div>
        <Button label="Modelos" icon="pi pi-download" severity="info" text size="small" @click="displayTemplates = true" class="!rounded-xl" />
        <Button label="Importar" icon="pi pi-upload" severity="secondary" outlined size="small" @click="displayImport = true" class="!rounded-xl" />
        <Button label="Novo" icon="pi pi-plus" severity="success" size="small" @click="abrirNovo" class="!rounded-xl shadow-md shadow-emerald-100" />
      </div>
    </div>

    <div v-if="viewMode === 'list'" class="card bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <DataTable :value="cardapios" :loading="loading" paginator :rows="10">
        <Column field="data_do_cardapio" header="Data">
          <template #body="{ data }">
            {{ data._dataObj ? data._dataObj.toLocaleDateString('pt-BR') : '-' }}
          </template>
        </Column>
        <Column field="prato_principal_ptn01" header="Prato Principal"></Column>
        <Column field="turnos" header="Turnos">
          <template #body="{ data }">
            <div class="flex gap-1">
              <span v-for="t in data.turnos" :key="t" class="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded capitalize">
                {{ t }}
              </span>
            </div>
          </template>
        </Column>
        <Column header="Ações">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-pencil" outlined rounded @click="editarCardapio(data)" />
              <Button icon="pi pi-trash" outlined rounded severity="danger" @click="excluirCardapio(data.id)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Visualização Mensal (Calendário) -->
    <div v-else-if="viewMode === 'calendar'" class="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div class="grid grid-cols-7 gap-2 mb-4">
            <div v-for="dia in ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']" :key="dia" class="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest pb-2">
                {{ dia }}
            </div>
            <div v-for="(item, index) in diasCalendario" :key="index" class="aspect-square border border-slate-100 rounded-2xl p-2 flex flex-col transition-all" :class="[item.vazio ? 'bg-slate-50/50' : 'hover:border-emerald-200 hover:bg-emerald-50/20']">
                <template v-if="!item.vazio">
                    <span class="text-xs font-bold text-slate-400 mb-1">{{ item.dia }}</span>
                    <div v-if="item.cardapio" class="flex-1 flex flex-col gap-1 overflow-hidden">
                        <div class="bg-emerald-600 rounded-lg p-1 text-[8px] font-black text-white uppercase truncate cursor-pointer hover:bg-emerald-700" @click="editarCardapio(item.cardapio)">
                            {{ item.cardapio.prato_principal_ptn01 }}
                        </div>
                        <div class="flex gap-1">
                            <span v-for="t in item.cardapio.turnos" :key="t" class="w-1 h-1 rounded-full" :class="t === 'almoco' ? 'bg-emerald-400' : 'bg-blue-400'"></span>
                        </div>
                    </div>
                    <Button v-else icon="pi pi-plus" text rounded severity="secondary" class="!w-6 !h-6 !p-0 mt-auto" @click="abrirNovoComData(item.dataString)" />
                </template>
            </div>
        </div>
        <div class="flex gap-4 mt-4 pt-4 border-t border-slate-100 justify-center">
            <div class="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Almoço
            </div>
            <div class="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <span class="w-2 h-2 rounded-full bg-blue-400"></span> Jantar
            </div>
        </div>
    </div>

    <!-- Visualização em Cards (Modo Estudante/Admin) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="card in cardapios" :key="card.id" class="bg-slate-800 rounded-[2rem] p-6 text-white shadow-xl border border-slate-700 relative overflow-hidden group">
        <div class="flex justify-between items-start mb-6">
          <span class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            {{ card._dataObj ? card._dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-' }}
          </span>
          <div class="flex gap-1">
             <Tag v-for="t in card.turnos" :key="t" :value="t" :severity="t === 'almoco' ? 'success' : 'info'" class="!text-[9px] uppercase !px-2" />
          </div>
        </div>

        <h3 class="text-xl font-black mb-4 leading-tight text-emerald-400">{{ card.prato_principal_ptn01 }}</h3>
        
        <div class="space-y-3 mb-6">
          <div class="flex items-center gap-3 py-2 border-b border-white/5">
             <i class="pi pi-circle-fill text-[8px] text-emerald-500"></i>
             <div class="flex flex-col">
                <span class="text-[10px] uppercase font-black text-slate-500">Principal 01</span>
                <span class="text-sm font-medium opacity-90">{{ card.prato_principal_ptn01 }}</span>
             </div>
          </div>
          <div v-if="card.prato_principal_ptn02" class="flex items-center gap-3 py-2 border-b border-white/5">
             <i class="pi pi-circle-fill text-[8px] text-emerald-500"></i>
             <div class="flex flex-col">
                <span class="text-[10px] uppercase font-black text-slate-500">Principal 02</span>
                <span class="text-sm font-medium opacity-90">{{ card.prato_principal_ptn02 }}</span>
             </div>
          </div>
          <div v-if="card.acompanhamento_01" class="flex items-center gap-3 py-2 border-b border-white/5">
             <i class="pi pi-circle-fill text-[8px] text-emerald-500"></i>
             <div class="flex flex-col">
                <span class="text-[10px] uppercase font-black text-slate-500">Acomp. 01</span>
                <span class="text-sm font-medium opacity-90">{{ card.acompanhamento_01 }}</span>
             </div>
          </div>
          <div v-if="card.sobremesa" class="flex items-center gap-3 py-2">
             <i class="pi pi-circle-fill text-[8px] text-emerald-500"></i>
             <div class="flex flex-col">
                <span class="text-[10px] uppercase font-black text-slate-500">Sobremesa</span>
                <span class="text-sm font-medium opacity-90">{{ card.sobremesa }}</span>
             </div>
          </div>
        </div>

        <div class="flex justify-between items-center pt-4 mt-auto border-t border-white/10">
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Refeição RI</span>
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" severity="secondary" text rounded @click="editarCardapio(card)" />
            <Button icon="pi pi-trash" severity="danger" text rounded @click="excluirCardapio(card.id)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog Modelos -->
    <Dialog v-model:visible="displayTemplates" header="Modelos de Planilha" :style="{ width: '400px' }" modal class="!rounded-[2rem]">
      <div class="space-y-6 py-4">
        <p class="text-sm text-slate-600">Baixe os modelos oficiais para importação de dados no sistema.</p>
        
        <div class="grid gap-3">
           <Button label="Modelo de Cardápio (.xlsx)" icon="pi pi-file-excel" severity="success" outlined class="!rounded-xl text-left" @click="downloadTemplate('cardapios')" />
           <Button label="Modelo de Bolsistas (.xlsx)" icon="pi pi-file-excel" severity="emerald" outlined class="!rounded-xl text-left" @click="downloadTemplate('bolsistas')" />
        </div>
        
        <div class="p-4 bg-blue-50 rounded-2xl border border-blue-100">
           <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Dica:</p>
           <p class="text-xs text-blue-700">Preencha todas as colunas obrigatórias para evitar erros na importação.</p>
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="displayDialog" :header="cardapioForm.id ? 'Editar Cardápio' : 'Novo Cardápio'" :style="{ width: '95%', maxWidth: '600px' }" modal class="p-fluid !rounded-[2.5rem] overflow-hidden">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div class="field">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Data *</label>
          <DatePicker v-model="cardapioForm.data_do_cardapio" dateFormat="dd/mm/yy" showIcon :locale="ptBR" class="!rounded-xl" />
        </div>
        <div class="field">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Turnos *</label>
          <SelectButton 
            v-model="cardapioForm.turnos" 
            :options="[{label: 'Almoço', value: 'almoco'}, {label: 'Jantar', value: 'jantar'}]" 
            optionLabel="label" 
            optionValue="value" 
            multiple
            class="custom-select-button-multiple"
          >
            <template #option="slotProps">
              <div class="flex items-center gap-2 px-2">
                <i :class="slotProps.option.value === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'"></i>
                <span class="text-sm font-bold uppercase tracking-tight">{{ slotProps.option.label }}</span>
              </div>
            </template>
          </SelectButton>
        </div>
        <div class="field md:col-span-2">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Prato Principal 01 *</label>
          <InputText v-model="cardapioForm.prato_principal_ptn01" placeholder="Ex: Frango Grelhado" class="!rounded-xl !py-3" />
        </div>
        <div class="field md:col-span-2">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Prato Principal 02</label>
          <InputText v-model="cardapioForm.prato_principal_ptn02" placeholder="Ex: Omelete (Opcional)" class="!rounded-xl !py-3" />
        </div>
        <div class="field">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Guarnição</label>
          <InputText v-model="cardapioForm.guarnicao" placeholder="Ex: Farofa" class="!rounded-xl !py-3" />
        </div>
        <div class="field">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Acompanhamento 01 *</label>
          <InputText v-model="cardapioForm.acompanhamento_01" placeholder="Ex: Arroz" class="!rounded-xl !py-3" />
        </div>
        <div class="field">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Acompanhamento 02 *</label>
          <InputText v-model="cardapioForm.acompanhamento_02" placeholder="Ex: Feijão" class="!rounded-xl !py-3" />
        </div>
        <div class="field">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Salada</label>
          <InputText v-model="cardapioForm.salada" class="!rounded-xl !py-3" />
        </div>
        <div class="field">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Ovo Lacto Veg.</label>
          <InputText v-model="cardapioForm.ovo_lacto_vegetariano" class="!rounded-xl !py-3" />
        </div>
        <div class="field">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Suco</label>
          <InputText v-model="cardapioForm.suco" class="!rounded-xl !py-3" />
        </div>
        <div class="field">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Sobremesa</label>
          <InputText v-model="cardapioForm.sobremesa" class="!rounded-xl !py-3" />
        </div>
      </div>
      <template #footer>
        <div class="flex gap-3 w-full pt-4">
          <Button label="Cancelar" icon="pi pi-times" text @click="displayDialog = false" class="flex-1 !rounded-xl" />
          <Button label="Salvar Cardápio" icon="pi pi-check" @click="salvarCardapio" severity="success" class="flex-1 !rounded-xl shadow-lg shadow-emerald-100" />
        </div>
      </template>
    </Dialog>

    <!-- Dialog Importação -->
    <Dialog v-model:visible="displayImport" header="Importar Cardápios" :style="{ width: '95%', maxWidth: '500px' }" modal class="p-fluid !rounded-[2.5rem] overflow-hidden">
      <div class="space-y-6 pt-4">
        <div class="p-4 bg-blue-50 rounded-2xl border border-blue-100">
          <p class="text-blue-800 text-sm leading-relaxed">
            Selecione o arquivo Excel (.xlsx, .xls) com os cardápios seguindo o modelo oficial. 
          </p>
        </div>

        <div class="field">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Turnos Automáticos</label>
          <SelectButton 
            v-model="turnosImport" 
            :options="[{label: 'Almoço', value: 'almoco'}, {label: 'Jantar', value: 'jantar'}]" 
            optionLabel="label" 
            optionValue="value" 
            multiple
            class="custom-select-button-multiple"
          >
            <template #option="slotProps">
              <div class="flex items-center gap-2 px-2">
                <i :class="slotProps.option.value === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'"></i>
                <span class="text-sm font-bold uppercase tracking-tight">{{ slotProps.option.label }}</span>
              </div>
            </template>
          </SelectButton>
        </div>

        <div class="field">
          <FileUpload 
            mode="basic" 
            name="file" 
            accept=".xlsx,.xls" 
            :maxFileSize="5000000" 
            customUpload 
            @select="onUpload" 
            chooseLabel="Selecionar Arquivo Excel" 
            class="w-full !rounded-xl"
            :disabled="loadingImport"
          />
          <div v-if="loadingImport" class="mt-4 p-4 bg-slate-50 rounded-2xl text-center">
            <i class="pi pi-spin pi-spinner text-primary-600 mb-2"></i>
            <p class="text-sm text-slate-600 font-bold">Processando dados, por favor aguarde...</p>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Fechar" icon="pi pi-times" text @click="displayImport = false" :disabled="loadingImport" class="w-full !rounded-xl" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.custom-select-button :deep(.p-button) {
  border: 0;
  background: transparent;
  color: #64748b;
  font-weight: 700;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
}

.custom-select-button :deep(.p-button.p-highlight) {
  background: #f1f5f9;
  color: #1e293b;
}

.custom-select-button :deep(.p-button:not(.p-highlight):hover) {
  background: #f8fafc;
}

.custom-select-button-multiple :deep(.p-button) {
  background: #f8fafc;
  color: #64748b;
  font-weight: 700;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
}

.custom-select-button-multiple :deep(.p-button.p-highlight) {
  background: var(--ifba-verde);
  color: #ffffff;
  border-color: var(--ifba-verde);
}

.custom-select-button-multiple :deep(.p-button:not(.p-highlight):hover) {
  background: #f1f5f9;
}
</style>