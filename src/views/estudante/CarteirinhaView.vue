<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { cardapioService } from '../../services/cardapio'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'

const auth = useAuthStore()
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

onMounted(() => {
  carregarCarteirinha()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header - oculto na impressão -->
    <div class="print:hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Minha Carteirinha Digital</h1>
          <p class="text-slate-600">Carteirinha de Bolsista - IFBA</p>
        </div>
        <Button
          label="Imprimir"
          icon="pi pi-print"
          @click="imprimir"
          severity="primary"
          :disabled="loading || !!error"
        />
      </div>
    </div>

    <!-- Loading -->
    <Card v-if="loading" class="!rounded-xl">
      <template #content>
        <div class="space-y-4">
          <Skeleton height="300px" />
          <Skeleton height="50px" />
        </div>
      </template>
    </Card>

    <!-- Error -->
    <Message v-else-if="error" severity="error" :closable="false">
      {{ error }}
    </Message>

    <!-- Carteirinha -->
    <div v-else-if="carteirinha" class="flex justify-center">
      <!-- Layout para tela -->
      <Card class="print:hidden !rounded-xl shadow-lg max-w-md w-full border-2 border-primary-500">
        <template #header>
          <div class="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
            <div class="flex items-center gap-4">
              <img
                src="../../assets/image/logo_ifba_vector.svg"
                alt="Logo IFBA"
                class="w-16 h-16 bg-white p-2 rounded-lg"
              />
              <div>
                <h2 class="text-2xl font-bold">IFBA</h2>
                <p class="text-sm opacity-90">Instituto Federal da Bahia</p>
              </div>
            </div>
          </div>
        </template>

        <template #content>
          <div class="space-y-6">
            <!-- Dados do Estudante -->
            <div class="text-center space-y-2">
              <div class="w-32 h-32 mx-auto bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                <img
                  v-if="auth.user?.foto_url"
                  :src="auth.user.foto_url"
                  :alt="carteirinha.nome"
                  class="w-full h-full object-cover"
                />
                <i v-else class="pi pi-user text-6xl text-slate-400"></i>
              </div>
              <h3 class="text-xl font-bold text-slate-800">{{ carteirinha.nome }}</h3>
              <p class="text-sm text-slate-600 font-mono">Matrícula: {{ carteirinha.matricula }}</p>
              <p class="text-sm text-slate-600">{{ carteirinha.curso }}</p>
              <Tag
                :value="carteirinha.turno_refeicao === 'almoco' ? 'ALMOÇO' : 'JANTAR'"
                :severity="carteirinha.turno_refeicao === 'almoco' ? 'warning' : 'info'"
                class="!rounded-full text-sm font-bold px-4 py-2"
              />
            </div>

            <!-- QR Code -->
            <div class="flex flex-col items-center space-y-3">
              <div class="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-md">
                <img
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${carteirinha.qr_token}`"
                  alt="QR Code"
                  class="w-64 h-64"
                />
              </div>

              <!-- Token Manual -->
              <div class="w-full p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p class="text-xs text-slate-500 font-bold mb-2 text-center">CÓDIGO PARA DIGITAÇÃO MANUAL</p>
                <p class="text-center font-mono text-base font-bold text-slate-800 select-all break-all">
                  {{ carteirinha.qr_token }}
                </p>
              </div>
            </div>

            <!-- Instruções -->
            <Message severity="info" :closable="false" class="text-sm">
              Apresente este QR Code ao servidor no momento da refeição para confirmar sua presença.
            </Message>

            <!-- Tipo de bolsista -->
            <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p class="text-green-800 font-bold text-lg">BOLSISTA</p>
              <p class="text-green-700 text-sm">Carteira válida para refeições no campus</p>
            </div>
          </div>
        </template>
      </Card>

      <!-- Layout para impressão -->
      <div class="hidden print:block print:page-break-after">
        <div class="border-4 border-primary-600 rounded-3xl p-8 max-w-2xl mx-auto bg-white shadow-2xl">
          <!-- Cabeçalho -->
          <div class="flex items-center justify-between mb-8 pb-6 border-b-4 border-primary-600">
            <div class="flex items-center gap-6">
              <img
                src="../../assets/image/logo_ifba_vector.svg"
                alt="Logo IFBA"
                class="w-24 h-24"
              />
              <div>
                <h1 class="text-4xl font-bold text-primary-700">IFBA</h1>
                <p class="text-lg text-slate-700 font-semibold">Instituto Federal da Bahia</p>
                <p class="text-base text-slate-600">Campus Salvador</p>
              </div>
            </div>
          </div>

          <!-- Tipo de Carteirinha -->
          <div class="text-center mb-6">
            <div class="inline-block bg-green-500 text-white px-8 py-3 rounded-full">
              <p class="text-2xl font-bold">CARTEIRINHA DE BOLSISTA</p>
            </div>
          </div>

          <!-- Corpo da Carteirinha -->
          <div class="grid grid-cols-2 gap-8">
            <!-- Coluna Esquerda: Dados -->
            <div class="space-y-6">
              <!-- Foto -->
              <div class="flex justify-center">
                <div class="w-48 h-48 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border-4 border-slate-300">
                  <img
                    v-if="auth.user?.foto_url"
                    :src="auth.user.foto_url"
                    :alt="carteirinha.nome"
                    class="w-full h-full object-cover"
                  />
                  <i v-else class="pi pi-user text-8xl text-slate-400"></i>
                </div>
              </div>

              <!-- Dados do Estudante -->
              <div class="space-y-3 text-center">
                <div>
                  <p class="text-sm text-slate-600 font-semibold uppercase">Nome</p>
                  <p class="text-xl font-bold text-slate-800">{{ carteirinha.nome }}</p>
                </div>
                <div>
                  <p class="text-sm text-slate-600 font-semibold uppercase">Matrícula</p>
                  <p class="text-lg font-mono font-bold text-slate-800">{{ carteirinha.matricula }}</p>
                </div>
                <div>
                  <p class="text-sm text-slate-600 font-semibold uppercase">Curso</p>
                  <p class="text-base text-slate-700">{{ carteirinha.curso }}</p>
                </div>
                <div>
                  <p class="text-sm text-slate-600 font-semibold uppercase">Turno de Refeição</p>
                  <div class="inline-block mt-1">
                    <span
                      :class="[
                        'px-6 py-2 rounded-full font-bold text-lg',
                        carteirinha.turno_refeicao === 'almoco'
                          ? 'bg-yellow-400 text-yellow-900'
                          : 'bg-blue-400 text-blue-900'
                      ]"
                    >
                      {{ carteirinha.turno_refeicao === 'almoco' ? 'ALMOÇO' : 'JANTAR' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Coluna Direita: QR Code -->
            <div class="flex flex-col justify-center items-center space-y-4">
              <div class="bg-white p-6 rounded-2xl border-4 border-slate-300 shadow-lg">
                <img
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${carteirinha.qr_token}`"
                  alt="QR Code"
                  class="w-80 h-80"
                />
              </div>

              <!-- Token para digitação -->
              <div class="w-full p-4 bg-slate-100 rounded-xl border-2 border-slate-300">
                <p class="text-xs text-slate-600 font-bold mb-2 text-center uppercase">Código Manual</p>
                <p class="text-center font-mono text-lg font-bold text-slate-800">
                  {{ carteirinha.qr_token }}
                </p>
              </div>
            </div>
          </div>

          <!-- Rodapé -->
          <div class="mt-8 pt-6 border-t-2 border-slate-300 text-center space-y-2">
            <p class="text-sm text-slate-600 font-semibold">
              Esta carteirinha é válida para registro de presença nas refeições do Restaurante Institucional
            </p>
            <p class="text-xs text-slate-500">
              Emitido em: {{ new Date().toLocaleDateString('pt-BR') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    size: A4;
    margin: 1cm;
  }

  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
</style>
