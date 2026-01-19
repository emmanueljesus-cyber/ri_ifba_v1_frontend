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
  id: number
  cardapio_id: number
  turno: 'almoco' | 'jantar'
  data: string
  prato_principal: string
  acompanhamento: string
  guarnicao: string
  salada: string
  sobremesa: string
  vagas_disponiveis: number
  total_inscritos: number
  limite_inscricoes: string // hora limite (ex: "10:00")
  pode_inscrever: boolean
  ja_inscrito: boolean
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
