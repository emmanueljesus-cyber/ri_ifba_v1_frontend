<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Breadcrumb from 'primevue/breadcrumb'
import Divider from 'primevue/divider'
import type { MenuItem } from 'primevue/menuitem'

interface Props {
  title: string
  subtitle?: string
  showBackButton?: boolean
  breadcrumbs: MenuItem[]
}

const props = defineProps<Props>()

const router = useRouter()

const goBack = () => {
  router.back()
}

// Home item for breadcrumb
const home: MenuItem = {
  icon: 'pi pi-home',
  route: '/'
}
</script>

<template>
  <div class="mb-6">
    <!-- Breadcrumbs -->
    <Breadcrumb 
      :home="home" 
      :model="breadcrumbs" 
      class="mb-4 bg-transparent border-0 p-0"
    >
      <template #item="{ item, props }">
        <router-link 
          v-if="item.route" 
          v-slot="{ href, navigate }" 
          :to="item.route" 
          custom
        >
          <a :href="href" v-bind="props.action" @click="navigate">
            <span :class="[item.icon, 'text-primary-600']" v-if="item.icon" />
            <span class="text-primary-600 font-bold">{{ item.label }}</span>
          </a>
        </router-link>
        <a v-else :href="item.url" :target="item.target" v-bind="props.action">
          <span class="text-slate-500">{{ item.label }}</span>
        </a>
      </template>
    </Breadcrumb>

    <Divider class="my-4" />

    <!-- Header -->
    <div class="flex items-start gap-3">
      <Button
        v-if="showBackButton"
        icon="pi pi-arrow-left"
        outlined
        severity="secondary"
        @click="goBack"
        aria-label="Voltar"
        class="mt-1 !rounded-xl"
      />
      <div class="flex-1">
        <h1 class="text-3xl font-black text-slate-800 lato-black">{{ title }}</h1>
        <p v-if="subtitle" class="text-slate-600 mt-1 font-medium">{{ subtitle }}</p>
      </div>
    </div>
  </div>
</template>
