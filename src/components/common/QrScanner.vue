<script setup lang="ts">
import { ref, onUnmounted, computed, onMounted } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

const emit = defineEmits<{
  (e: 'scan', value: string): void
  (e: 'error', error: string): void
}>()

const props = defineProps<{
  fps?: number
  qrbox?: number
  aspectRatio?: number
}>()

const isScanning = ref(false)
const isLoading = ref(false)
const error = ref('')
const permissionDenied = ref(false)
const isMobile = ref(false)
let html5QrCode: Html5Qrcode | null = null

// Detectar se é mobile
onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})

// Configuração responsiva do qrbox
const qrboxSize = computed(() => {
  if (props.qrbox) return props.qrbox
  
  const width = window.innerWidth
  if (width < 400) return Math.floor(width * 0.7) // 70% da largura em telas pequenas
  if (width < 768) return Math.floor(width * 0.6) // 60% em tablets
  return 300 // Desktop
})

const startScanning = async () => {
  try {
    error.value = ''
    permissionDenied.value = false
    isLoading.value = true
    
    html5QrCode = new Html5Qrcode('qr-reader')
    
    const config = {
      fps: props.fps || (isMobile.value ? 5 : 10), // Reduzir FPS em mobile para performance
      qrbox: qrboxSize.value,
      aspectRatio: props.aspectRatio || (isMobile.value ? 1.0 : 1.333),
      disableFlip: false, // Permitir flip da imagem
    }

    // Configuração da câmera
    const cameraConfig = isMobile.value 
      ? { facingMode: { exact: 'environment' } } // Câmera traseira em mobile
      : { facingMode: 'user' } // Câmera frontal em desktop

    await html5QrCode.start(
      cameraConfig,
      config,
      (decodedText) => {
        // Vibrar ao escanear (apenas mobile)
        if (isMobile.value && navigator.vibrate) {
          navigator.vibrate(200)
        }
        emit('scan', decodedText)
      },
      (_errorMessage) => {
        // Ignorar erros de scan contínuo
      }
    )
    
    isScanning.value = true
    isLoading.value = false
  } catch (err: any) {
    isLoading.value = false
    
    // Detectar se é erro de permissão
    if (err.name === 'NotAllowedError' || err.message.includes('Permission')) {
      permissionDenied.value = true
      error.value = 'Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.'
    } else if (err.name === 'NotFoundError') {
      error.value = 'Nenhuma câmera encontrada no dispositivo.'
    } else if (err.name === 'NotReadableError') {
      error.value = 'Câmera está sendo usada por outro aplicativo.'
    } else {
      error.value = err.message || 'Erro ao acessar a câmera. Verifique as permissões.'
    }
    
    emit('error', error.value)
  }
}

const stopScanning = async () => {
  if (html5QrCode && isScanning.value) {
    try {
      await html5QrCode.stop()
      html5QrCode.clear()
      isScanning.value = false
    } catch (err) {
      console.error('Erro ao parar scanner:', err)
    }
  }
}

onUnmounted(() => {
  stopScanning()
})

defineExpose({
  startScanning,
  stopScanning,
  isScanning
})
</script>

<template>
  <div class="qr-scanner-container">
    <!-- Mensagem de erro -->
    <div v-if="error" class="mb-4">
      <Message severity="error" :closable="false">
        <div class="space-y-2">
          <p class="font-semibold">{{ error }}</p>
          <div v-if="permissionDenied" class="text-sm space-y-1">
            <p class="font-medium">Como permitir acesso à câmera:</p>
            <ul class="list-disc list-inside space-y-1 ml-2">
              <li><strong>Chrome/Edge:</strong> Clique no ícone de cadeado ao lado da URL → Permissões → Câmera → Permitir</li>
              <li><strong>Safari (iOS):</strong> Ajustes → Safari → Câmera → Permitir</li>
              <li><strong>Firefox:</strong> Clique no ícone de câmera na barra de endereço → Permitir</li>
            </ul>
          </div>
        </div>
      </Message>
    </div>
    
    <!-- Loading -->
    <div v-if="isLoading" class="text-center p-8">
      <ProgressSpinner 
        style="width: 50px; height: 50px" 
        strokeWidth="4" 
        fill="transparent"
        animationDuration="1s"
      />
      <p class="mt-4 text-slate-600 font-medium">Iniciando câmera...</p>
    </div>
    
    <!-- Scanner -->
    <div 
      id="qr-reader" 
      class="rounded-xl overflow-hidden border-2 transition-all duration-300"
      :class="{ 
        'hidden': !isScanning,
        'border-emerald-400 shadow-lg shadow-emerald-100': isScanning,
        'border-slate-200': !isScanning
      }"
    ></div>
    
    <!-- Estado inicial -->
    <div v-if="!isScanning && !isLoading" class="text-center space-y-4">
      <div class="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-gradient-to-br from-slate-50 to-white">
        <div class="relative inline-block mb-4">
          <i class="pi pi-camera text-6xl text-slate-300"></i>
          <div class="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
        </div>
        <p class="text-slate-700 text-base font-semibold mb-2">
          Scanner QR Code
        </p>
        <p class="text-slate-500 text-sm mb-6">
          {{ isMobile ? 'Toque no botão para ativar a câmera traseira' : 'Clique para ativar a câmera' }}
        </p>
        <Button 
          :label="isMobile ? 'Ativar Câmera' : 'Ativar Câmera'" 
          icon="pi pi-camera" 
          severity="success" 
          size="large"
          @click="startScanning"
          class="!rounded-xl !px-8 !py-3 !text-base !font-semibold"
        />
      </div>
      
      <!-- Dicas -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
        <div class="flex items-start gap-3">
          <i class="pi pi-info-circle text-blue-600 text-xl mt-0.5"></i>
          <div class="text-sm text-blue-900 space-y-1">
            <p class="font-semibold">Dicas para melhor leitura:</p>
            <ul class="list-disc list-inside space-y-1 ml-2 text-blue-800">
              <li>Mantenha o QR code bem iluminado</li>
              <li>Posicione dentro da área marcada</li>
              <li>Mantenha a câmera estável</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Controles quando escaneando -->
    <div v-if="isScanning" class="mt-4 space-y-3">
      <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
        <div class="flex items-center justify-center gap-2 text-emerald-700">
          <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span class="font-semibold">Escaneando... Aponte para o QR Code</span>
        </div>
      </div>
      
      <Button 
        label="Parar Scanner" 
        icon="pi pi-times" 
        severity="danger" 
        outlined
        size="large"
        @click="stopScanning"
        class="!rounded-xl w-full !py-3"
      />
    </div>
  </div>
</template>

<style scoped>
.qr-scanner-container {
  width: 100%;
}

#qr-reader {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  min-height: 250px;
}

:deep(#qr-reader video) {
  border-radius: 0.75rem;
  width: 100% !important;
  height: auto !important;
  object-fit: cover;
}

:deep(#qr-reader__dashboard) {
  display: none !important;
}

:deep(#qr-reader__dashboard_section) {
  display: none !important;
}

:deep(#qr-reader__camera_selection) {
  display: none !important;
}

/* Animação para o indicador de escaneamento */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Responsividade mobile */
@media (max-width: 640px) {
  #qr-reader {
    max-width: 100%;
  }
  
  .qr-scanner-container {
    padding: 0;
  }
}
</style>
