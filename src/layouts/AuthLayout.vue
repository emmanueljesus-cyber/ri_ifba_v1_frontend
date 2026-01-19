<template>
  <div class="min-h-screen bg-slate-100 flex items-center justify-center py-8 px-4">
    <div class="w-full max-w-5xl bg-white shadow-xl rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
      <div class="p-8 lg:p-12">
        <slot />
      </div>
      <div class="bg-[var(--ifba-verde)] text-white flex flex-col items-center justify-center gap-4 p-10">
        <img src="/vite.svg" alt="IFBA" class="w-20 h-20" />
        <div class="text-center space-y-2">
          <h2 class="text-2xl font-semibold">Instituto Federal da Bahia</h2>
          <p class="text-lg font-medium">Refeitório Institucional</p>
          <p class="text-sm opacity-90">Sistema de Gestão do Restaurante Universitário</p>
        </div>
      </div>
    </div>
  </div>
</template>
