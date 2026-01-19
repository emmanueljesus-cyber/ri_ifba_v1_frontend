import api from './api'
import type {
  HistoricoRefeicao,
  ResumoHistorico,
  FiltrosHistorico
} from '../types/historico'

interface ApiResponse<T> {
  data: T
  message: string
  meta?: {
    current_page: number
    total: number
    per_page: number
  }
}

export const historicoService = {
  async listar(filtros?: FiltrosHistorico): Promise<{ data: HistoricoRefeicao[], meta?: any }> {
    const { data } = await api.get<ApiResponse<HistoricoRefeicao[]>>('/estudante/historico', {
      params: filtros
    })
    return { data: data.data, meta: data.meta }
  },

  async resumo(): Promise<ResumoHistorico> {
    const { data } = await api.get<ApiResponse<ResumoHistorico>>('/estudante/historico/resumo')
    return data.data
  }
}
