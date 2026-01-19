import api from './api'

export interface FilaExtraAdmin {
  id: number
  user: {
    id: number
    nome: string
    matricula: string
    email?: string
  }
  refeicao?: {
    id: number
    turno: string
    data: string
  }
  turno?: string  // Turno direto (retornado pelo backend em /hoje)
  status: string
  inscrito_em: string
  posicao: number | null
}

export interface EstatisticasExtras {
  resumo: {
    total_inscritos: number
    aprovados: number
    rejeitados: number
    aguardando: number
    taxa_aprovacao: string
  }
  top_estudantes: Array<{
    nome: string
    matricula: string
    total_inscricoes: number
  }>
  periodo: {
    inicio: string
    fim: string
  }
}

interface ApiResponse<T> {
  data: T
  errors: Record<string, string[]>
  meta: Record<string, any>
}

interface PaginatedResponse<T> extends ApiResponse<T> {
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export interface FiltrosExtras {
  data?: string
  turno?: 'almoco' | 'jantar'
  status?: 'inscrito' | 'aprovado' | 'rejeitado'
  per_page?: number
  page?: number
}

export const adminExtrasService = {
  /**
   * Lista todas as inscrições na fila de extras
   */
  async listar(filtros: FiltrosExtras = {}): Promise<{ data: FilaExtraAdmin[], meta: any }> {
    const { data } = await api.get<PaginatedResponse<FilaExtraAdmin[]>>('/admin/extras', {
      params: filtros
    })
    return { data: data.data, meta: data.meta }
  },

  /**
   * Lista inscrições do dia atual
   */
  async listarHoje(turno?: string): Promise<{ data: FilaExtraAdmin[], meta: any }> {
    const { data } = await api.get<ApiResponse<FilaExtraAdmin[]>>('/admin/extras/hoje', {
      params: { turno }
    })
    return { data: data.data, meta: data.meta }
  },

  /**
   * Obtém estatísticas de extras
   */
  async estatisticas(dataInicio?: string, dataFim?: string): Promise<EstatisticasExtras> {
    const { data } = await api.get<ApiResponse<EstatisticasExtras>>('/admin/extras/estatisticas', {
      params: { data_inicio: dataInicio, data_fim: dataFim }
    })
    return data.data
  },

  /**
   * Aprovar inscrição na fila
   */
  async aprovar(id: number): Promise<void> {
    await api.post(`/admin/extras/${id}/aprovar`)
  },

  /**
   * Rejeitar inscrição na fila
   */
  async rejeitar(id: number, motivo?: string): Promise<void> {
    await api.post(`/admin/extras/${id}/rejeitar`, { motivo })
  },

  /**
   * Confirmar presença de extra
   */
  async confirmarPresenca(id: number): Promise<void> {
    await api.post(`/admin/extras/${id}/confirmar-presenca`)
  },

  /**
   * Remover inscrição da fila
   */
  async remover(id: number): Promise<void> {
    await api.delete(`/admin/extras/${id}`)
  },

  /**
   * Aprovar múltiplas inscrições em lote
   */
  async aprovarLote(ids: number[]): Promise<{ aprovados: number, erros: string[] }> {
    const { data } = await api.post<ApiResponse<{ aprovados: number, erros: string[] }>>('/admin/extras/aprovar-lote', { ids })
    return data.data
  },

  /**
   * Exportar relatório de fila de extras em Excel
   */
  async exportarRelatorio(params: { data_inicio?: string, data_fim?: string, turno?: string }): Promise<void> {
    const response = await api.get('/admin/extras/exportar', {
      params,
      responseType: 'blob'
    })

    // Criar link de download
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    const dataAtual = new Date().toISOString().split('T')[0]
    link.setAttribute('download', `relatorio_fila_extras_${dataAtual}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }
}
