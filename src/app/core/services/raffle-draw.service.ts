
import {
  Injectable,
  inject
} from '@angular/core';

import {
  SupabaseService
} from './supabase.service';

import {
  AuthService
} from './auth.service';

import {
  RaffleDraw,
  RaffleDrawEntry,
  RaffleDrawResult,
  PublicRaffleResult
} from '../models/raffle.model';


// ==========================================
// MODELO DE PARTICIPANTE PONDERADO
// ==========================================

export interface WeightedRaffleParticipant {

  user_id: string;

  participant_name: string;

  participant_type:
    'customer' | 'distributor' | 'unknown';

  total_contributions: number;

  confirmed_amount: number;

  winning_probability: number;

}


@Injectable({
  providedIn: 'root'
})
export class RaffleDrawService {

  private readonly supabase =
    inject(SupabaseService);

  private readonly auth =
    inject(AuthService);


  // ==========================================
  // VALIDAR ADMINISTRADOR
  // ==========================================

  private async validarAdministrador(): Promise<void> {

    await this.auth.refresh();

    if (!this.auth.puedeAdministrar()) {

      throw new Error(
        'No tienes permisos para administrar sorteos.'
      );

    }

  }


  // ==========================================
  // VALIDAR IDENTIFICADOR
  // ==========================================

  private validarId(raffleId: number): void {

    if (
      !Number.isSafeInteger(raffleId) ||
      raffleId <= 0
    ) {

      throw new Error(
        'El identificador del sorteo no es válido.'
      );

    }

  }


  // ==========================================
  // CONSULTAR PARTICIPANTES PONDERADOS
  // ==========================================

  async obtenerParticipantesPonderados(
    raffleId: number
  ): Promise<WeightedRaffleParticipant[]> {

    await this.validarAdministrador();

    this.validarId(raffleId);

    const participantes:
      WeightedRaffleParticipant[] = [];

    const limite = 200;

    let desde = 0;

    while (true) {

      const { data, error } =
        await this.supabase.client

          .rpc(
            'get_weighted_raffle_participants',
            {
              p_raffle_id: raffleId
            }
          )

          .order('confirmed_amount', {
            ascending: false
          })

          .order('user_id', {
            ascending: true
          })

          .range(
            desde,
            desde + limite - 1
          );

      if (error) {

        throw error;

      }

      const registros =
        (data ?? []) as WeightedRaffleParticipant[];

      for (const item of registros) {

        const monto =
          Number(item.confirmed_amount);

        const cantidad =
          Number(item.total_contributions);

        const probabilidad =
          Number(item.winning_probability);

        if (
          !Number.isFinite(monto) ||
          monto <= 0 ||
          !Number.isSafeInteger(cantidad) ||
          cantidad <= 0 ||
          !Number.isFinite(probabilidad) ||
          probabilidad < 0 ||
          probabilidad > 100
        ) {

          throw new Error(
            'Se encontraron aportes con datos no válidos.'
          );

        }

        participantes.push({

          user_id:
            item.user_id,

          participant_name:
            item.participant_name,

          participant_type:
            item.participant_type,

          total_contributions:
            cantidad,

          confirmed_amount:
            monto,

          winning_probability:
            probabilidad

        });

      }

      if (registros.length < limite) {

        break;

      }

      desde += limite;

    }


    // ========================================
    // VALIDAR PARTICIPANTES DUPLICADOS
    // ========================================

    const usuarios = new Set(

      participantes.map(
        item => item.user_id
      )

    );

    if (usuarios.size !== participantes.length) {

      throw new Error(
        'El listado cambió durante la consulta. Actualiza la ruleta.'
      );

    }


    // ========================================
    // ORDENAR DE MAYOR A MENOR APORTE
    // ========================================

    return participantes.sort((a, b) =>

      b.confirmed_amount -
      a.confirmed_amount ||

      a.user_id.localeCompare(b.user_id)

    );

  }


  // ==========================================
  // CONSULTAR RESULTADO PUBLICO HISTORICO
  // ==========================================

  async obtenerResultadoPublico(
    raffleId: number
  ): Promise<PublicRaffleResult | null> {

    this.validarId(raffleId);

    const { data, error } =
      await this.supabase.client.rpc(

        'get_public_raffle_result',

        {
          p_raffle_id: raffleId
        }

      );

    if (error) {

      throw error;

    }

    return data as PublicRaffleResult | null;

  }


  // ==========================================
  // ESTADISTICAS DESDE SUPABASE
  // ==========================================

  async obtenerEstadisticas(
    raffleId: number
  ): Promise<Record<string, unknown>> {

    await this.validarAdministrador();

    this.validarId(raffleId);

    const { data, error } =
      await this.supabase.client.rpc(

        'get_raffle_stats',

        {
          p_raffle_id: raffleId
        }

      );

    if (error) {

      throw error;

    }

    return (data ?? {}) as Record<string, unknown>;

  }


  // ==========================================
  // OBTENER RESULTADO HISTORICO
  // ==========================================

  async obtenerResultado(
    raffleId: number
  ): Promise<RaffleDraw | null> {

    await this.validarAdministrador();

    this.validarId(raffleId);

    const { data, error } =
      await this.supabase.client

        .from('raffle_draws')

        .select('*')

        .eq('raffle_id', raffleId)

        .maybeSingle();

    if (error) {

      throw error;

    }

    return data as RaffleDraw | null;

  }


  // ==========================================
  // OBTENER PARTICIPANTES HISTORICOS
  // ==========================================

  async obtenerParticipantesOficiales(
    raffleId: number
  ): Promise<RaffleDrawEntry[]> {

    await this.validarAdministrador();

    this.validarId(raffleId);

    const resultado: RaffleDrawEntry[] = [];

    const limite = 200;

    let desde = 0;

    while (true) {

      const { data, error } =
        await this.supabase.client

          .from('raffle_draw_entries')

          .select('*')

          .eq('raffle_id', raffleId)

          .order('entry_number', {
            ascending: true
          })

          .range(
            desde,
            desde + limite - 1
          );

      if (error) {

        throw error;

      }

      const registros =
        (data ?? []) as RaffleDrawEntry[];

      resultado.push(...registros);

      if (registros.length < limite) {

        break;

      }

      desde += limite;

    }

    return resultado;

  }


  // ==========================================
  // OBTENER RESULTADO COMPLETO HISTORICO
  // ==========================================

  async obtenerResultadoCompleto(
    raffleId: number
  ): Promise<RaffleDrawResult | null> {

    const draw =
      await this.obtenerResultado(raffleId);

    if (!draw) {

      return null;

    }

    const entries =
      await this.obtenerParticipantesOficiales(
        raffleId
      );

    const winner = entries.find(item =>

      item.participation_id ===
        draw.winner_participation_id

    );

    if (!winner) {

      throw new Error(
        'No se encontró al ganador en el registro histórico.'
      );

    }

    if (
      entries.length !==
      draw.total_participants
    ) {

      throw new Error(
        'El total de participantes no coincide con el registro histórico.'
      );

    }

    return {

      draw,

      entries,

      winner

    };

  }


  // ==========================================
  // EJECUCION OFICIAL DESHABILITADA
  // COMPATIBILIDAD CON COMPONENTES ANTERIORES
  // ==========================================

  async ejecutar(
    raffleId: number
  ): Promise<RaffleDrawResult> {

    await this.validarAdministrador();

    this.validarId(raffleId);

    throw new Error(
      'La ruleta funciona únicamente como simulación visual.'
    );

  }

}
