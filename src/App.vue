<script setup lang="ts">
import Toast from 'primevue/toast'
</script>

<template>
  <Toast :life="8000" />
  <router-view />
</template>

