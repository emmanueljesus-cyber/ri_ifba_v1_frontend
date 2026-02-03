import api from './api'
import type {
  HistoricoRefeicao,
  ResumoHistorico,
  FiltrosHistorico
} from '../types/historico'

export const historicoService = {
  async listar(filtros?: FiltrosHistorico): Promise<{ data: HistoricoRefeicao[], meta?: any }> {
    const response = await api.get('/estudante/historico', {
      params: filtros
    })
    // A resposta já vem como { data: [...], meta: {...} }
    return { data: response.data.data || response.data, meta: response.data.meta }
  },

  async resumo(): Promise<ResumoHistorico> {
    const response = await api.get('/estudante/historico/resumo')
    // A resposta vem como { data: {...}, message: '...' }
    return response.data.data || response.data
  }
}
