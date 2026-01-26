<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="w-full max-w-6xl bg-white shadow-2xl rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
      <!-- Branding Side -->
      <div class="bg-gradient-to-br from-primary-600 to-primary-800 text-white flex flex-col items-center justify-between gap-8 p-8 lg:p-16 relative overflow-hidden">
        <!-- Elementos decorativos de fundo -->
        <div class="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-black/10 rounded-full blur-3xl"></div>

        <!-- Logo e Título -->
        <div class="flex-1 flex flex-col items-center justify-center gap-10 w-full relative z-10">
          <!-- IFBA Logo -->
          <div class="w-32 h-32 lg:w-48 lg:h-48 drop-shadow-2xl animate-pulse-slow">
            <img 
              src="../assets/image/logo_ifba_negativo_branco.svg" 
              alt="IFBA Logo" 
              class="w-full h-full object-contain"
            />
          </div>
          
          <!-- Title and Description -->
          <div class="text-center space-y-6 w-full max-w-md">
            <div class="space-y-2">
              <h1 class="text-3xl lg:text-5xl font-black leading-tight lato-black tracking-tight">
                RI-IFBA
              </h1>
              <p class="text-xl lg:text-2xl font-bold opacity-90 lato-bold">
                Restaurante Institucional
              </p>
            </div>
            
            <div class="h-1.5 w-20 bg-white/40 mx-auto rounded-full"></div>
            
            <p class="text-sm lg:text-lg opacity-80 leading-relaxed font-medium">
              Acesso inteligente e gestão simplificada para a comunidade do <span class="font-bold">IFBA Campus Salvador</span>.
            </p>
          </div>
        </div>

        <!-- Footer fixo -->
        <div class="w-full text-center relative z-10">
          <p class="text-xs lg:text-sm font-bold opacity-60 uppercase tracking-[0.2em]">
            Tecnologia & Inovação IFBA
          </p>
        </div>
      </div>

      <!-- Form Side -->
      <div class="p-6 sm:p-8 lg:p-12 flex items-center">
        <div class="w-full max-w-md mx-auto">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Gradiente verde IFBA */
.bg-\[var\(--ifba-verde\)\] {
  background: linear-gradient(135deg, var(--ifba-verde) 0%, #1e742c 100%);
}
</style>
