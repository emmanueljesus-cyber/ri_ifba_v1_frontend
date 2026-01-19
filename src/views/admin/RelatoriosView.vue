<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { relatorioService } from '../../services/relatorios'
import PageHeader from '../../components/common/PageHeader.vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Select from 'primevue/select'
import ProgressSpinner from 'primevue/progressspinner'

const loading = ref(false)
const relatorio = ref<any>(null)
const dataAtual = new Date()
const mesSelecionado = ref(dataAtual.getMonth() + 1)
const anoSelecionado = ref(dataAtual.getFullYear())

const meses = [
  { label: 'Janeiro', value: 1 },
  { label: 'Fevereiro', value: 2 },
  { label: 'Março', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Maio', value: 5 },
  { label: 'Junho', value: 6 },
  { label: 'Julho', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Setembro', value: 9 },
  { label: 'Outubro', value: 10 },
  { label: 'Novembro', value: 11 },
  { label: 'Dezembro', value: 12 }
]

const anos = computed(() => {
  const list = []
  for (let y = 2024; y <= dataAtual.getFullYear() + 1; y++) {
    list.push(y)
  }
  return list
})

const carregarRelatorio = async () => {
  loading.value = true
  try {
    relatorio.value = await relatorioService.semanal(mesSelecionado.value, anoSelecionado.value)
  } catch (error) {
    console.error('Erro ao carregar relatório:', error)
  } finally {
    loading.value = false
  }
}

const exportarExcel = async () => {
  try {
    const blob = await relatorioService.exportarSemanal(mesSelecionado.value, anoSelecionado.value)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `relatorio_semanal_${mesSelecionado.value}_${anoSelecionado.value}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('Erro ao exportar:', error)
  }
}

onMounted(carregarRelatorio)

const categorias = [
  { key: 'presente', label: 'Presente', color: 'bg-emerald-50 text-emerald-700' },
  { key: 'extra', label: 'Extra', color: 'bg-blue-50 text-blue-700' },
  { key: 'ausente', label: 'Ausente', color: 'bg-red-50 text-red-700' },
  { key: 'atestado', label: 'Atestado', color: 'bg-orange-50 text-orange-700' },
  { key: 'justificado', label: 'Justificado', color: 'bg-amber-50 text-amber-700' },
  { key: 'n_frequenta', label: 'Ñ Frequenta', color: 'bg-slate-50 text-slate-700' }
]
</script>

<template>
  <div class="space-y-6">
    <PageHeader 
      title="Relatórios Mensais" 
      subtitle="Acompanhamento semanal de presenças e consumo"
    />

    <Card class="!rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <template #content>
        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div class="flex gap-2 items-center">
            <Select v-model="mesSelecionado" :options="meses" optionLabel="label" optionValue="value" class="w-40" @change="carregarRelatorio" />
            <Select v-model="anoSelecionado" :options="anos" class="w-24" @change="carregarRelatorio" />
            <Button icon="pi pi-refresh" text rounded @click="carregarRelatorio" :loading="loading" />
          </div>
          <Button label="Exportar Excel" icon="pi pi-file-excel" severity="success" class="!rounded-xl" @click="exportarExcel" />
        </div>

        <div v-if="loading" class="flex flex-col items-center py-20">
          <ProgressSpinner />
          <p class="text-slate-500 mt-4">Gerando relatório...</p>
        </div>

        <div v-else-if="relatorio" class="overflow-x-auto">
          <div class="min-w-[800px]">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-slate-800 text-white">
                  <th class="p-4 text-left font-black uppercase tracking-widest text-xs border border-slate-700 w-48">
                    {{ relatorio.mes_ano }}
                  </th>
                  <th v-for="(semana, index) in relatorio.semanas" :key="index" class="p-4 text-center font-black uppercase tracking-widest text-xs border border-slate-700">
                    Semana {{ index + 1 }}
                  </th>
                  <th class="p-4 text-center font-black uppercase tracking-widest text-xs border border-slate-700 bg-slate-700">
                    Total Mês
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cat in categorias" :key="cat.key" class="hover:bg-slate-50 transition-colors">
                  <td :class="['p-4 border border-slate-200 font-bold text-sm', cat.color]">
                    {{ cat.label }}
                  </td>
                  <td v-for="(val, index) in relatorio.dados[cat.key]" :key="index" class="p-4 border border-slate-200 text-center text-sm font-medium">
                    <span v-if="val.tipo === 'texto'" class="text-[10px] text-slate-400 font-black uppercase">{{ val.valor }}</span>
                    <span v-else>{{ val.valor }}</span>
                  </td>
                  <td class="p-4 border border-slate-200 text-center text-sm font-black bg-slate-50">
                    {{ relatorio.totais[cat.key] }}
                  </td>
                </tr>
                <tr class="bg-slate-100 font-black">
                  <td class="p-4 border border-slate-200 text-sm">Total Mensal de Refeições</td>
                  <td :colspan="relatorio.semanas.length" class="p-4 border border-slate-200 text-center text-slate-400">------</td>
                  <td class="p-4 border border-slate-200 text-center text-lg text-emerald-700">
                    {{ relatorio.total_mensal_refeicoes }}
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês de Referência</p>
                    <p class="text-xl font-black text-slate-800 capitalize">{{ relatorio.mes_texto }}</p>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semanas Ativas</p>
                    <p class="text-xl font-black text-slate-800">{{ relatorio.semanas.length }}</p>
                </div>
                <div class="col-span-2 text-right">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consumo Total Acumulado</p>
                    <p class="text-3xl font-black text-emerald-600">{{ relatorio.total_mensal_refeicoes }} <span class="text-sm font-medium text-slate-400">refeições</span></p>
                </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-20">
          <i class="pi pi-file-excel text-5xl text-slate-200 mb-4"></i>
          <p class="text-slate-500">Selecione um período para visualizar o relatório.</p>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
table th, table td {
  border-width: 1px;
}
</style>
