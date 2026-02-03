import api from './api'

interface ResumoDashboard {
  refeicao_atual: {
    turno: string
    confirmados: number
    total_esperados: number
    capacidade: number
    vagas_restantes: number
  } | null
  metricas: {
    total_bolsistas: number
    bolsistas_ativos: number
    bolsistas_inativos: number
    presencas_hoje: number
    faltas_hoje: number
    justificativas_pendentes: number
  }
}

export const adminDashboardService = {
  async getResumo(): Promise<ResumoDashboard> {
    const { data } = await api.get<{ data: ResumoDashboard }>('/admin/dashboard/resumo')
    return data.data
  },

  async getTaxaPresenca(dias: number = 7) {
    const { data } = await api.get(`/admin/dashboard/taxa-presenca?dias=${dias}`)
    return data.data
  }
}
