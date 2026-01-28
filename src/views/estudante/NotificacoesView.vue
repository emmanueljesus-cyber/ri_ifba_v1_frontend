<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useNotificacoesStore } from '@/stores/notificacoes'
import { notificacoesService } from '@/services/notificacoes'
import type { Notificacao } from '@/types/notificacao'
import PageHeader from '@/components/common/PageHeader.vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Badge from 'primevue/badge'
import Skeleton from 'primevue/skeleton'
import Message from 'primevue/message'

const notificacoesStore = useNotificacoesStore()
const notificacoes = ref<Notificacao[]>([])
const loading = ref(false)
const error = ref('')

const naoLidas = computed(() => notificacoes.value.filter(n => !n.lida_em))
const lidas = computed(() => notificacoes.value.filter(n => n.lida_em))

const getSeverityByTipo = (tipo: string): 'success' | 'info' | 'warn' | 'danger' => {
  const severityMap: Record<string, 'success' | 'info' | 'warn' | 'danger'> = {
    justificativa_aprovada: 'success',
    fila_aprovada: 'success',
    solicitacao_aprovada: 'success',
    sucesso: 'success',
    justificativa_rejeitada: 'danger',
    fila_rejeitada: 'danger',
    solicitacao_rejeitada: 'danger',
    aviso: 'warn',
    fila_confirmada: 'info',
    fila_posicao_alterada: 'info',
    cadastro_confirmado: 'info',
    geral: 'info',
  }
  return severityMap[tipo] || 'info'
}

const getIconByTipo = (tipo: string): string => {
  const iconMap: Record<string, string> = {
    justificativa_aprovada: 'pi-check-circle',
    justificativa_rejeitada: 'pi-times-circle',
    fila_aprovada: 'pi-check-circle',
    fila_rejeitada: 'pi-times-circle',
    fila_confirmada: 'pi-ticket',
    fila_posicao_alterada: 'pi-sort-alt',
    cadastro_confirmado: 'pi-user-plus',
    solicitacao_aprovada: 'pi-check-circle',
    solicitacao_rejeitada: 'pi-times-circle',
    sucesso: 'pi-check',
    aviso: 'pi-exclamation-triangle',
    geral: 'pi-bell',
  }
  return iconMap[tipo] || 'pi-bell'
}

const formatarTempo = (data: string): string => {
  try {
    const date = new Date(data)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `há ${days} dia${days > 1 ? 's' : ''}`
    if (hours > 0) return `há ${hours} hora${hours > 1 ? 's' : ''}`
    if (minutes > 0) return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`
    return 'agora mesmo'
  } catch {
    return 'há algum tempo'
  }
}

const carregarNotificacoes = async () => {
  loading.value = true
  error.value = ''
  try {
    notificacoes.value = await notificacoesService.listar()
  } catch (err: any) {
    console.error('Erro ao carregar notificações:', err)
    error.value = err?.response?.data?.message || 'Erro ao carregar notificações'
  } finally {
    loading.value = false
  }
}

const marcarComoLida = async (notificacao: Notificacao) => {
  if (notificacao.lida_em) return

  try {
    await notificacoesService.marcarComoLida(notificacao.id)
    notificacao.lida_em = new Date().toISOString()
    notificacoesStore.carregarNaoLidas() // Atualizar badge no header
  } catch (err) {
    console.error('Erro ao marcar notificação como lida:', err)
  }
}

const marcarTodasComoLidas = async () => {
  try {
    await notificacoesService.marcarTodasComoLidas()
    notificacoes.value.forEach(n => {
      if (!n.lida_em) {
        n.lida_em = new Date().toISOString()
      }
    })
    notificacoesStore.carregarNaoLidas() // Atualizar badge no header
  } catch (err) {
    console.error('Erro ao marcar todas como lidas:', err)
  }
}

onMounted(() => {
  carregarNotificacoes()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Notificações"
      subtitle="Acompanhe suas mensagens e atualizações do sistema"
      :breadcrumbs="[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Notificações' }]"
    />

    <!-- Actions -->
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-2">
        <Badge :value="naoLidas.length" severity="danger" v-if="naoLidas.length > 0" />
        <span class="text-slate-600">{{ naoLidas.length }} não lida(s)</span>
      </div>
      <Button
        v-if="naoLidas.length > 0"
        label="Marcar todas como lidas"
        icon="pi pi-check"
        size="small"
        @click="marcarTodasComoLidas"
        outlined
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <Card v-for="i in 3" :key="i">
        <template #content>
          <div class="space-y-2">
            <Skeleton height="1.5rem" width="70%" />
            <Skeleton height="1rem" />
            <Skeleton height="1rem" width="90%" />
          </div>
        </template>
      </Card>
    </div>

    <!-- Error -->
    <Message v-else-if="error" severity="error" :closable="false">
      {{ error }}
    </Message>

    <!-- Notificações -->
    <div v-else-if="notificacoes.length > 0" class="space-y-6">
      <!-- Não Lidas -->
      <div v-if="naoLidas.length > 0">
        <h2 class="text-lg font-bold text-slate-800 mb-4">Não Lidas</h2>
        <div class="space-y-3">
          <Card
            v-for="notif in naoLidas"
            :key="notif.id"
            class="hover:shadow-md transition-shadow cursor-pointer border-l-4"
            :class="{
              'border-l-green-500': getSeverityByTipo(notif.tipo) === 'success',
              'border-l-blue-500': getSeverityByTipo(notif.tipo) === 'info',
              'border-l-yellow-500': getSeverityByTipo(notif.tipo) === 'warn',
              'border-l-red-500': getSeverityByTipo(notif.tipo) === 'danger',
            }"
            @click="marcarComoLida(notif)"
          >
            <template #content>
              <div class="flex items-start gap-4">
                <div
                  class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="{
                    'bg-green-100 text-green-600': getSeverityByTipo(notif.tipo) === 'success',
                    'bg-blue-100 text-blue-600': getSeverityByTipo(notif.tipo) === 'info',
                    'bg-yellow-100 text-yellow-600': getSeverityByTipo(notif.tipo) === 'warn',
                    'bg-red-100 text-red-600': getSeverityByTipo(notif.tipo) === 'danger',
                  }"
                >
                  <i :class="`pi ${getIconByTipo(notif.tipo)} text-xl`"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="font-bold text-slate-800">{{ notif.titulo }}</h3>
                    <Badge value="Nova" severity="danger" class="flex-shrink-0" />
                  </div>
                  <p class="text-slate-600 mt-1 text-sm">{{ notif.mensagem }}</p>
                  <p class="text-xs text-slate-400 mt-2">{{ formatarTempo(notif.created_at) }}</p>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>

      <!-- Lidas -->
      <div v-if="lidas.length > 0">
        <h2 class="text-lg font-bold text-slate-800 mb-4">Anteriores</h2>
        <div class="space-y-3">
          <Card
            v-for="notif in lidas"
            :key="notif.id"
            class="opacity-60 hover:opacity-100 transition-opacity"
          >
            <template #content>
              <div class="flex items-start gap-4">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-400"
                >
                  <i :class="`pi ${getIconByTipo(notif.tipo)}`"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-slate-700">{{ notif.titulo }}</h3>
                  <p class="text-slate-600 mt-1 text-sm">{{ notif.mensagem }}</p>
                  <p class="text-xs text-slate-400 mt-2">{{ formatarTempo(notif.created_at) }}</p>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>

    <!-- Vazio -->
    <Card v-else>
      <template #content>
        <div class="text-center py-12">
          <i class="pi pi-bell text-6xl text-slate-300 mb-4"></i>
          <p class="text-slate-500 text-lg">Nenhuma notificação ainda</p>
          <p class="text-slate-400 text-sm mt-2">
            Você receberá notificações sobre justificativas, fila de extras e outras atualizações
          </p>
        </div>
      </template>
    </Card>
  </div>
</template>
