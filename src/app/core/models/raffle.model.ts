
// ==========================================
// ESTADOS DEL SORTEO
// ==========================================

export type RaffleStatus =
  | 'draft'
  | 'published'
  | 'closed'
  | 'finished'
  | 'cancelled';


// ==========================================
// METODOS DE PAGO
// ==========================================

export type PaymentMethod =
  | 'yape'
  | 'bcp'
  | 'plin';


// ==========================================
// ESTADOS DEL APORTE
// ==========================================

export type ContributionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';


// ==========================================
// CONFIGURACION ECONOMICA DEL SORTEO
// ==========================================

export interface RaffleContributionConfig {

  min_contribution: number | null;

  max_contribution: number | null;

  contribution_step: number | null;

  collection_goal: number | null;

}


// ==========================================
// MODELO PRINCIPAL DEL SORTEO
// ==========================================

export interface Raffle
  extends RaffleContributionConfig {

  id: number;

  title: string;

  description: string;

  image: string | null;

  prize: string;

  rules: string;

  status: RaffleStatus;

  published_at: string | null;

  starts_at: string | null;

  ends_at: string;

  draw_at: string;

  created_at: string;

  updated_at: string;

}


// ==========================================
// CREAR SORTEO
// ==========================================

export interface RaffleCreateRequest
  extends RaffleContributionConfig {

  title: string;

  description: string;

  image: string | null;

  prize: string;

  rules: string;

  ends_at: string;

  draw_at: string;

}


// ==========================================
// ACTUALIZAR SORTEO
// ==========================================

export type RaffleUpdateRequest =
  RaffleCreateRequest;


// ==========================================
// ESTADOS DE PARTICIPACION
// ==========================================

export type ParticipationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';


// ==========================================
// TIPOS DE PARTICIPANTES
// ==========================================

export type ParticipantType =
  | 'customer'
  | 'distributor';


// ==========================================
// PARTICIPACION DEL CLIENTE
// ==========================================

export interface RaffleParticipation {

  id: string;

  raffle_id: number;

  user_id: string;

  participant_name: string;

  participant_type: ParticipantType;

  status: ParticipationStatus;

  admin_comment: string | null;

  reviewed_by: string | null;

  reviewed_at: string | null;

  created_at: string;

}


// ==========================================
// RESULTADOS HISTORICOS
// ==========================================

export interface RaffleDraw {

  id: number;

  raffle_id: number;

  winner_participation_id: string;

  total_participants: number;

  executed_by: string;

  executed_at: string;

}


// ==========================================
// DETALLE DE PARTICIPACION
// ==========================================

export interface RaffleParticipationDetail
  extends RaffleParticipation {

  raffle: {

    id: number;

    title: string;

    prize: string;

    image: string | null;

    status: RaffleStatus;

    ends_at: string;

    draw_at: string;

  } | null;

}


// ==========================================
// PARTICIPANTES DE RESULTADOS HISTORICOS
// ==========================================

export interface RaffleDrawEntry {

  raffle_id: number;

  participation_id: string;

  user_id: string;

  participant_name: string;

  entry_number: number;

}


// ==========================================
// RESULTADO DETALLADO HISTORICO
// ==========================================

export interface RaffleDrawResult {

  draw: RaffleDraw;

  entries: RaffleDrawEntry[];

  winner: RaffleDrawEntry;

}


// ==========================================
// ESTADISTICAS DEL SORTEO
// ==========================================

export interface RaffleStatistics {

  total: number;

  pending: number;

  approved: number;

  rejected: number;

  cancelled: number;

  customers: number;

  distributors: number;

}


// ==========================================
// RESULTADO PUBLICO HISTORICO
// ==========================================

export interface PublicRaffleResult {

  raffle_id: number;

  winner_number: number;

  total_participants: number;

  executed_at: string;

  is_my_win: boolean;

}


// ==========================================
// REGISTRO DE APORTES
// ==========================================

export interface RaffleContribution {

  id: string;

  raffle_id: number;

  user_id: string;

  amount: number;

  approved_amount: number | null;

  operation_reference: string | null;

  payment_method: PaymentMethod;

  status: ContributionStatus;

  admin_comment: string | null;

  reviewed_by: string | null;

  reviewed_at: string | null;

  created_at: string;

}


// ==========================================
// REVISION ADMINISTRATIVA DEL APORTE
// ==========================================

export interface RaffleContributionReviewRequest {

  contribution_id: string;

  status: 'approved' | 'rejected';

  approved_amount: number | null;

  operation_reference: string | null;

  admin_comment: string;

}


// ==========================================
// SOLICITUD DE NUEVO APORTE
// ==========================================
export interface RaffleContributionCreateRequest {

  raffle_id: number;

  amount: number;

  payment_method: PaymentMethod;

  contribution_id: string;

}


// ==========================================
// ESTADISTICAS ECONOMICAS DEL SORTEO
// ==========================================

export interface RaffleCollectionStats {

  approved_amount: number;

  pending_amount: number;

  rejected_amount: number;

  collection_goal: number;

  remaining_amount: number;

  exceeded_amount: number;

  progress_percentage: number;

}


// ==========================================
// DETALLE ADMINISTRATIVO DEL APORTE
// ==========================================

export interface RaffleContributionAdmin
  extends RaffleContribution {

  participant_name: string;

  participant_type:
    | 'customer'
    | 'distributor'
    | 'unknown';

  phone: string | null;

  ruc: string | null;

}
