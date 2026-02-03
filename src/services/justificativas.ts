import api from './api'
import type { Justificativa, CriarJustificativaRequest } from '../types/justificativa'

interface ApiResponse<T> {
  data: T
  message: string
}

export const justificativaService = {
  async listarMinhas(): Promise<Justificativa[]> {
    const { data } = await api.get<ApiResponse<Justificativa[]>>('/estudante/justificativas')
    return data.data
  },

  async enviar(payload: CriarJustificativaRequest & { data?: string; turno?: string }): Promise<Justificativa> {
    const formData = new FormData()

    // Pode enviar refeicao_id OU (data + turno)
    if (payload.refeicao_id) {
      formData.append('refeicao_id', payload.refeicao_id.toString())
    }
    if (payload.data) {
      formData.append('data', payload.data)
    }
    if (payload.turno) {
      formData.append('turno', payload.turno)
    }

    formData.append('tipo', payload.tipo)
    formData.append('motivo', payload.motivo)
    if (payload.anexo) {
      formData.append('anexo', payload.anexo)
    }

    const { data } = await api.post<ApiResponse<Justificativa>>('/estudante/justificativas', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return data.data
  },

  async verDetalhes(id: number): Promise<Justificativa> {
    const { data } = await api.get<ApiResponse<Justificativa>>(`/estudante/justificativas/${id}`)
    return data.data
  },

  // Admin methods
  async listarTodasAdmin(params?: any): Promise<{ data: Justificativa[], meta: any }> {
    const { data } = await api.get<any>('/admin/justificativas', { params })

    // Check if data.data is the array or if it's nested in a pagination object
    const items = Array.isArray(data.data) ? data.data : (data.data?.data || [])

    return { data: items, meta: data.meta }
  },

  async aprovarAdmin(id: number): Promise<void> {
    await api.post(`/admin/justificativas/${id}/aprovar`)
  },

  async rejeitarAdmin(id: number, motivo: string): Promise<void> {
    await api.post(`/admin/justificativas/${id}/rejeitar`, { observacao: motivo })
  }
}
