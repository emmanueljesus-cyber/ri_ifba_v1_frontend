<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import Button from 'primevue/button'
import Message from 'primevue/message'

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
const error = ref('')
let html5QrCode: Html5Qrcode | null = null

const startScanning = async () => {
  try {
    error.value = ''
    html5QrCode = new Html5Qrcode('qr-reader')
    
    const config = {
      fps: props.fps || 10,
      qrbox: props.qrbox || 250,
      aspectRatio: props.aspectRatio || 1.0
    }

    await html5QrCode.start(
      { facingMode: 'environment' }, // Câmera traseira em mobile
      config,
      (decodedText) => {
        emit('scan', decodedText)
      },
      (_errorMessage) => {
        // Ignorar erros de scan contínuo
      }
    )
    
    isScanning.value = true
  } catch (err: any) {
    error.value = err.message || 'Erro ao acessar a câmera'
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
    <div v-if="error" class="mb-4">
      <Message severity="error" :closable="false">{{ error }}</Message>
    </div>
    
    <div 
      id="qr-reader" 
      class="rounded-xl overflow-hidden border-2 border-slate-200"
      :class="{ 'hidden': !isScanning }"
    ></div>
    
    <div v-if="!isScanning" class="text-center space-y-4">
      <div class="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <i class="pi pi-camera text-6xl text-slate-300 mb-4"></i>
        <p class="text-slate-500 text-sm font-medium mb-4">
          Clique no botão abaixo para ativar a câmera
        </p>
        <Button 
          label="Ativar Câmera" 
          icon="pi pi-camera" 
          severity="success" 
          @click="startScanning"
          class="!rounded-xl"
        />
      </div>
    </div>
    
    <div v-else class="mt-4 text-center">
      <Button 
        label="Parar Scanner" 
        icon="pi pi-times" 
        severity="danger" 
        outlined
        @click="stopScanning"
        class="!rounded-xl"
      />
    </div>
  </div>
</template>

<style scoped>
#qr-reader {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

:deep(#qr-reader video) {
  border-radius: 0.75rem;
}

:deep(#qr-reader__dashboard) {
  display: none !important;
}
</style>
