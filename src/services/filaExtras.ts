import api from './api'
import type {
  FilaExtra,
  RefeicaoDisponivel,
  InscricaoRequest,
  PosicaoFila
} from '../types/filaExtras'

interface ApiResponse<T> {
  data: T
  message: string
}

interface RefeicoesDisponiveisResponse {
  refeicoes: RefeicaoDisponivel[]
  data: string
  hora_atual: string
}

export const filaExtrasService = {
  async minhasInscricoes(): Promise<FilaExtra[]> {
    const { data } = await api.get<ApiResponse<FilaExtra[]>>('/estudante/fila-extras')
    return data.data
  },

  async refeicoesDisponiveis(): Promise<RefeicaoDisponivel[]> {
    const { data } = await api.get<ApiResponse<RefeicoesDisponiveisResponse | RefeicaoDisponivel[]>>('/estudante/fila-extras/disponiveis')
    if (Array.isArray(data.data)) {
      return data.data
    }
    return (data.data as RefeicoesDisponiveisResponse).refeicoes // Retorna apenas o array de refeições
  },

  async inscrever(payload: InscricaoRequest): Promise<FilaExtra> {
    const { data } = await api.post<ApiResponse<FilaExtra>>('/estudante/fila-extras', payload)
    return data.data
  },

  async posicao(): Promise<PosicaoFila[]> {
    const { data } = await api.get<ApiResponse<PosicaoFila[]>>('/estudante/fila-extras/posicao')
    return data.data
  },

  async cancelar(id: number): Promise<void> {
    await api.delete(`/estudante/fila-extras/${id}`)
  }
}
