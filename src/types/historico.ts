export interface Presenca {
  id: number
  user_id: number
  refeicao_id: number
  data: string
  turno: 'almoco' | 'jantar'
  presente: boolean
  confirmado_em: string | null
  created_at?: string
  updated_at?: string
}

export interface HistoricoRefeicao {
  id: number
  data: string
  turno: 'almoco' | 'jantar'
  prato_principal: string
  presente: boolean
  tipo: 'extra' | 'bolsista'
  confirmado_em: string | null
  hora_entrada?: string
}

export interface ResumoHistorico {
  total_refeicoes: number
  total_extras: number
  mes_atual: {
    total: number
    extras: number
    refeicoes: number
  }
  ultima_refeicao: HistoricoRefeicao | null
}

export interface FiltrosHistorico {
  data_inicio?: string
  data_fim?: string
  turno?: 'almoco' | 'jantar' | 'todos'
  tipo?: 'extra' | 'bolsista' | 'todos'
  page?: number
  per_page?: number
}
