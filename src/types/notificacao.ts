export interface Notificacao {
  id: number
  user_id: number
  tipo: 'info' | 'sucesso' | 'alerta' | 'erro'
  titulo: string
  mensagem: string
  lida: boolean
  lida_em: string | null
  created_at: string
  updated_at?: string
}

export interface ContadorNotificacoes {
  total: number
  nao_lidas: number
}
