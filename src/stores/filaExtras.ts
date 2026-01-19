import { defineStore } from 'pinia'
import { ref } from 'vue'
import { filaExtrasService } from '../services/filaExtras'
import type { FilaExtra, RefeicaoDisponivel, PosicaoFila } from '../types/filaExtras'

export const useFilaExtrasStore = defineStore('filaExtras', () => {
  const minhasInscricoes = ref<FilaExtra[]>([])
  const refeicoesDisponiveis = ref<RefeicaoDisponivel[]>([])
  const posicoesNaFila = ref<PosicaoFila[]>([])
  const loading = ref(false)

  async function carregarMinhasInscricoes() {
    if (loading.value) return

    loading.value = true
    try {
      minhasInscricoes.value = await filaExtrasService.minhasInscricoes()
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error)
      minhasInscricoes.value = []
    } finally {
      loading.value = false
    }
  }

  async function carregarRefeicoesDisponiveis() {
    // Prevent multiple simultaneous calls
    if (loading.value) return

    loading.value = true
    try {
      const response = await filaExtrasService.refeicoesDisponiveis()
      // Ensure we always set an array
      if (Array.isArray(response)) {
        refeicoesDisponiveis.value = response
      } else {
        console.warn('API retornou formato inesperado:', response)
        refeicoesDisponiveis.value = []
      }
    } catch (error) {
      console.error('Erro ao carregar refeições disponíveis:', error)
      refeicoesDisponiveis.value = []
    } finally {
      loading.value = false
    }
  }

  async function inscrever(refeicaoId: number) {
    loading.value = true
    try {
      const novaInscricao = await filaExtrasService.inscrever({ refeicao_id: refeicaoId })
      minhasInscricoes.value.push(novaInscricao)
      // Recarregar disponíveis para atualizar status
      await carregarRefeicoesDisponiveis()
      return novaInscricao
    } finally {
      loading.value = false
    }
  }

  async function cancelar(inscricaoId: number) {
    loading.value = true
    try {
      await filaExtrasService.cancelar(inscricaoId)
      minhasInscricoes.value = minhasInscricoes.value.filter(i => i.id !== inscricaoId)
      await carregarRefeicoesDisponiveis()
    } finally {
      loading.value = false
    }
  }

  async function carregarPosicoes() {
    loading.value = true
    try {
      posicoesNaFila.value = await filaExtrasService.posicao()
    } finally {
      loading.value = false
    }
  }

  return {
    minhasInscricoes,
    refeicoesDisponiveis,
    posicoesNaFila,
    loading,
    carregarMinhasInscricoes,
    carregarRefeicoesDisponiveis,
    inscrever,
    cancelar,
    carregarPosicoes
  }
})
