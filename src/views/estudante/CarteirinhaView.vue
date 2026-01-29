<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { cardapioService } from '../../services/cardapio'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'

const carteirinha = ref<any>(null)
const loading = ref(false)
const error = ref('')

const carregarCarteirinha = async () => {
  loading.value = true
  error.value = ''
  try {
    carteirinha.value = await cardapioService.carteirinha()
  } catch (err: any) {
    console.error('Erro ao carregar carteirinha:', err)
    error.value = err?.response?.data?.message || 'Erro ao carregar carteirinha'
  } finally {
    loading.value = false
  }
}

const imprimir = () => {
  window.print()
}

const dataEmissao = computed(() => {
  return new Date().toLocaleDateString('pt-BR')
})

const turnoLabel = computed(() => {
  return carteirinha.value?.turno_refeicao === 'almoco' ? 'Almoço' : 'Jantar'
})

onMounted(() => {
  carregarCarteirinha()
})
</script>

<template>
  <div class="carteirinha-container">
    <!-- Header - oculto na impressão -->
    <div class="print:hidden max-w-2xl mx-auto mb-6 px-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Carteira de Identificação</h1>
          <p class="text-sm text-slate-500">Assistência Estudantil - Alimentação</p>
        </div>
        <Button
          label="Imprimir"
          icon="pi pi-print"
          @click="imprimir"
          severity="secondary"
          :disabled="loading || !!error"
          class="!rounded-lg w-full sm:w-auto"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="max-w-2xl mx-auto px-4 print:hidden">
      <div class="bg-white rounded-lg p-8 shadow">
        <Skeleton height="300px" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="max-w-2xl mx-auto px-4 print:hidden">
      <Message severity="error" :closable="false">
        {{ error }}
      </Message>
    </div>

    <!-- Carteirinha -->
    <div v-else-if="carteirinha" class="max-w-2xl mx-auto px-4 print:max-w-none print:mx-0 print:px-0">

      <!-- Card da Carteirinha -->
      <div id="carteirinha-print" class="carteirinha-card bg-white shadow-lg print:shadow-none">

        <!-- Header Verde Institucional -->
        <div class="carteirinha-header bg-ifba-verde text-white p-4 sm:px-6 sm:py-4">
          <div class="flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-4">
            <div class="flex items-center gap-3 sm:gap-4">
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <img
                  src="../../assets/image/logo_ifba_vector.svg"
                  alt="IFBA"
                  class="w-7 h-7 sm:w-9 sm:h-9"
                />
              </div>
              <div class="border-l border-white/30 pl-3 sm:pl-4 text-center sm:text-left">
                <p class="text-[9px] sm:text-[10px] font-medium text-white/80 uppercase tracking-wider">Ministério da Educação</p>
                <p class="text-sm sm:text-base font-bold">Instituto Federal da Bahia</p>
              </div>
            </div>
            <div class="text-center sm:text-right">
              <p class="text-[9px] sm:text-[10px] text-white/70 uppercase tracking-wider">Assistência Estudantil</p>
              <p class="text-sm sm:text-base font-bold">Programa de Alimentação</p>
            </div>
          </div>
        </div>

        <!-- Título do Documento -->
        <div class="bg-ifba-verde/90 px-4 sm:px-6 py-2">
          <p class="text-center text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
            Carteira de Identificação do Beneficiário
          </p>
        </div>

        <!-- Corpo da Carteirinha -->
        <div class="p-4 sm:p-6">
          <div class="flex flex-col sm:flex-row gap-4 sm:gap-6">

            <!-- Dados do Beneficiário -->
            <div class="flex-1 space-y-3 sm:space-y-4 order-2 sm:order-1">

              <!-- Nome -->
              <div class="border-b border-slate-200 pb-2">
                <p class="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Nome Completo</p>
                <p class="text-base sm:text-lg font-bold text-slate-900">{{ carteirinha.nome }}</p>
              </div>

              <!-- Grid de informações -->
              <div class="grid grid-cols-2 gap-3 sm:gap-4">
                <div class="border-b border-slate-200 pb-2">
                  <p class="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Matrícula</p>
                  <p class="text-sm sm:text-base font-mono font-bold text-slate-900">{{ carteirinha.matricula }}</p>
                </div>
                <div class="border-b border-slate-200 pb-2">
                  <p class="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Turno Autorizado</p>
                  <p class="text-sm sm:text-base font-bold text-slate-900">{{ turnoLabel }}</p>
                </div>
              </div>

              <div class="border-b border-slate-200 pb-2">
                <p class="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Curso</p>
                <p class="text-xs sm:text-sm font-semibold text-slate-800">{{ carteirinha.curso }}</p>
              </div>

              <!-- Status e Validade -->
              <div class="grid grid-cols-2 gap-2 sm:gap-3">
                <div class="bg-green-50 border border-green-200 rounded px-2 sm:px-3 py-1.5 sm:py-2">
                  <p class="text-[8px] sm:text-[9px] font-semibold text-green-700 uppercase tracking-wider">Situação</p>
                  <p class="text-xs sm:text-sm font-bold text-green-800">● Ativo</p>
                </div>
                <div class="bg-slate-50 border border-slate-200 rounded px-2 sm:px-3 py-1.5 sm:py-2">
                  <p class="text-[8px] sm:text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Emissão</p>
                  <p class="text-xs sm:text-sm font-bold text-slate-700">{{ dataEmissao }}</p>
                </div>
              </div>

              <!-- Código de Identificação -->
              <div class="bg-slate-800 rounded px-3 sm:px-4 py-2 sm:py-2.5">
                <p class="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Código de Identificação</p>
                <p class="font-mono text-sm sm:text-base font-bold text-white tracking-wider sm:tracking-widest select-all break-all">
                  {{ carteirinha.qr_token }}
                </p>
              </div>
            </div>

            <!-- QR Code -->
            <div class="flex flex-col items-center justify-center order-1 sm:order-2 sm:w-44 flex-shrink-0">
              <div class="border-2 border-slate-300 rounded-lg p-2 bg-white">
                <img
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(carteirinha.qr_token)}&ecc=H&margin=1`"
                  alt="QR Code de Identificação"
                  class="w-32 h-32 sm:w-36 sm:h-36"
                />
              </div>
              <p class="text-[8px] sm:text-[9px] text-slate-500 mt-2 text-center font-medium">
                Código de validação
              </p>
            </div>
          </div>
        </div>

        <!-- Rodapé -->
        <div class="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-2 sm:py-3">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-1 text-[9px] sm:text-[10px] text-slate-600 text-center sm:text-left">
            <p>Documento válido para acesso ao Restaurante Institucional do IFBA.</p>
            <p class="font-semibold">ifba.edu.br</p>
          </div>
        </div>

        <!-- Faixa Inferior Verde -->
        <div class="h-1 sm:h-1.5 bg-ifba-verde"></div>
      </div>

      <!-- Informações Complementares (apenas tela) -->
      <div class="print:hidden mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <i class="pi pi-info-circle text-green-600 text-lg mt-0.5 flex-shrink-0"></i>
          <div class="text-sm text-green-800">
            <p class="font-semibold mb-1">Instruções de Uso</p>
            <ul class="list-disc list-inside space-y-1 text-green-700 text-xs sm:text-sm">
              <li>Apresente o QR Code ao servidor no momento da refeição</li>
              <li>Em caso de falha na leitura, informe o código de identificação</li>
              <li>Esta carteira é pessoal e intransferível</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.carteirinha-container {
  min-height: 100vh;
  background: #f1f5f9;
  padding: 2rem 0;
}

@media print {
  .carteirinha-container {
    min-height: auto;
    background: white;
    padding: 0;
  }

  @page {
    size: 210mm 148mm; /* A5 landscape */
    margin: 10mm;
  }

  * {
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  #carteirinha-print {
    width: 100% !important;
    max-width: 100% !important;
    box-shadow: none !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .carteirinha-card {
    border: 2px solid #248c35;
    border-radius: 8px;
  }

  .carteirinha-header {
    padding: 12px 16px !important;
  }

  .bg-ifba-verde {
    background-color: #248c35 !important;
  }

  .bg-ifba-verde\/90 {
    background-color: rgba(36, 140, 53, 0.9) !important;
  }

  .bg-slate-800 {
    background-color: #1e293b !important;
  }

  .bg-green-50 {
    background-color: #f0fdf4 !important;
  }

  .bg-slate-50 {
    background-color: #f8fafc !important;
  }

  /* Ajustes de fonte para impressão */
  .carteirinha-card p,
  .carteirinha-card span {
    font-size: 11px !important;
  }

  .carteirinha-card .text-lg,
  .carteirinha-card .text-base {
    font-size: 14px !important;
  }

  .carteirinha-card .text-sm {
    font-size: 12px !important;
  }

  .carteirinha-card .text-xs {
    font-size: 10px !important;
  }

  /* QR Code na impressão */
  .carteirinha-card img[alt="QR Code de Identificação"] {
    width: 120px !important;
    height: 120px !important;
  }
}
</style>
