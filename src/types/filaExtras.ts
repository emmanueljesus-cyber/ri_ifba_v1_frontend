export interface FilaExtra {
  id: number
  user_id: number
  refeicao_id: number
  data_inscricao: string
  posicao: number
  confirmado: boolean
  cancelado: boolean
  refeicao?: {
    id: number
    turno: 'almoco' | 'jantar'
    data: string
    cardapio?: {
      prato_principal: string
    }
  }
  created_at?: string
  updated_at?: string
}

export interface RefeicaoDisponivel {
  refeicao_id: number
  turno: 'almoco' | 'jantar'
  turno_label: string
  horario_inicio: string
  horario_fim: string
  esta_no_horario: boolean
  pode_inscrever: boolean
  vagas_disponiveis: number
  capacidade_total: number
  presencas_confirmadas: number
  inscrito: boolean
  inscricao_id?: number
  posicao_fila?: number
  status_inscricao?: string
  cardapio: {
    id: number
    prato_principal_ptn01: string
    prato_principal_ptn02: string
    guarnicao: string
    acompanhamento_01: string
    acompanhamento_02: string
    salada: string
    ovo_lacto_vegetariano: string
    suco: string
    sobremesa: string
  }
}

export interface InscricaoRequest {
  refeicao_id: number
}

export interface PosicaoFila {
  refeicao_id: number
  posicao: number
  total_na_fila: number
  sua_vez_aproximada: string
  status: 'aguardando' | 'proximo' | 'confirmado'
}
