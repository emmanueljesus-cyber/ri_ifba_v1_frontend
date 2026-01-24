export interface Cardapio {
  id: number
  data_do_cardapio: string
  turno: 'almoco' | 'jantar'
  prato_principal_ptn01: string
  prato_principal_ptn02?: string | null
  guarnicao: string
  acompanhamento_01: string
  acompanhamento_02?: string | null
  salada: string
  ovo_lacto_vegetariano?: string | null
  suco: string
  sobremesa: string
  refeicoes?: Refeicao[]
  created_at?: string
  updated_at?: string
}

// Tipo antigo mantido para compatibilidade
export interface CardapioLegacy {
  id: number
  data: string
  almoco_prato_principal: string
  almoco_acompanhamento: string
  almoco_guarnicao: string
  almoco_salada: string
  almoco_sobremesa: string
  jantar_prato_principal: string
  jantar_acompanhamento: string
  jantar_guarnicao: string
  jantar_salada: string
  jantar_sobremesa: string
  created_at?: string
  updated_at?: string
}

export interface Refeicao {
  id: number
  cardapio_id: number
  data_do_cardapio?: string
  turno: 'almoco' | 'jantar'
  prato_principal: string
  prato_principal_ptn02?: string
  acompanhamento: string
  guarnicao: string
  salada: string
  sobremesa: string
  suco?: string
  ovo_lacto_vegetariano?: string
  vagas_extras_disponiveis?: number
  total_inscritos?: number
}

export interface CardapioDia {
  data: string
  dia_semana: string
  almoco: Refeicao | null
  jantar: Refeicao | null
}
