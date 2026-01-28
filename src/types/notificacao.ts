export type TipoNotificacao =
  | 'justificativa_aprovada'
  | 'justificativa_rejeitada'
  | 'cadastro_confirmado'
  | 'fila_confirmada'
  | 'fila_posicao_alterada'
  | 'fila_aprovada'
  | 'fila_rejeitada'
  | 'geral'
  | 'sucesso'
  | 'aviso'
  | 'solicitacao_aprovada'
  | 'solicitacao_rejeitada'

export interface Notificacao {
  id: number
  user_id: number
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  dados?: Record<string, any> | null
  lida_em: string | null
  created_at: string
  updated_at?: string
}

export interface ContadorNotificacoes {
  count: number
}
