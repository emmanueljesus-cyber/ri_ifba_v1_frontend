<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = defineProps<{
  title: string
  subtitle?: string
  showBackButton?: boolean
}>()

const router = useRouter()

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="mb-4 sm:mb-6">
    <div class="flex items-start gap-2 sm:gap-3">
      <Button
        v-if="showBackButton"
        icon="pi pi-arrow-left"
        text
        rounded
        severity="secondary"
        @click="goBack"
        aria-label="Voltar"
        class="mt-1"
      />
      <div class="flex-1">
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-800">{{ title }}</h1>
        <p v-if="subtitle" class="text-slate-600 mt-1 text-sm sm:text-base">{{ subtitle }}</p>
      </div>
    </div>
  </div>
</template>
