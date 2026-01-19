export type StatusJustificativa = 'pendente' | 'aprovada' | 'rejeitada';
export type TipoJustificativa = 'antecipada' | 'posterior';

export interface Justificativa {
  id: number;
  user_id: number;
  refeicao_id: number;
  tipo: TipoJustificativa;
  motivo: string;
  anexo: string | null;
  enviado_em: string;
  status: StatusJustificativa;
  avaliado_por?: number | null;
  avaliado_em?: string | null;
  motivo_rejeicao?: string | null;
  refeicao?: {
    id: number;
    data_do_cardapio: string;
    turno: string;
  };
}

export interface CriarJustificativaRequest {
  refeicao_id: number;
  tipo: TipoJustificativa;
  motivo: string;
  anexo?: File | null;
}
