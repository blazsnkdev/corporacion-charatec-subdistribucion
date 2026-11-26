
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
  RaffleParticipation,
  RaffleParticipationDetail,
  RaffleContributionReviewRequest,
  RaffleContribution,
  RaffleContributionAdmin,
  RaffleContributionCreateRequest
} from '../models/raffle.model';


@Injectable({
  providedIn: 'root'
})
export class ParticipationsService {

  private readonly supabase =
    inject(SupabaseService);

  private readonly auth =
    inject(AuthService);


  //* ==========================================
  //* VALIDAR PARTICIPANTE
  //* ==========================================

  private async validarParticipante(): Promise<string> {

    await this.auth.refresh();

    if (!this.auth.autenticado()) {

      throw new Error(
        'Debes iniciar sesión.'
      );

    }

    if (!this.auth.puedeParticipar()) {

      throw new Error(
        'Tu cuenta no está habilitada para participar.'
      );

    }

    const userId = this.auth.userId();

    if (!userId) {

      throw new Error(
        'No se pudo identificar al usuario.'
      );

    }

    return userId;

  }


  //* ==========================================
  //* VALIDAR ADMINISTRADOR
  //* ==========================================

  private async validarAdministrador(): Promise<void> {

    await this.auth.refresh();

    if (!this.auth.puedeAdministrar()) {

      throw new Error(
        'No tienes permisos administrativos.'
      );

    }

  }


  //* ==========================================
  //* VALIDAR IDENTIFICADOR DEL SORTEO
  //* ==========================================

  private validarSorteoId(
    raffleId: number
  ): void {

    if (

      !Number.isSafeInteger(raffleId) ||

      raffleId <= 0

    ) {

      throw new Error(
        'El sorteo seleccionado no es válido.'
      );

    }

  }


  //* ==========================================
  //* VALIDAR MONTO
  //* ==========================================

  private validarMonto(
    monto: number | null
  ): void {

    if (

      monto === null ||

      !Number.isFinite(monto) ||

      monto <= 0 ||

      monto > 9999999999.99 ||

      Math.abs(

        monto * 100 -

        Math.round(monto * 100)

      ) > 0.00001

    ) {

      throw new Error(
        'Ingresa un monto válido con un máximo de dos decimales.'
      );

    }

  }


  //* ==========================================
  //* REGISTRAR SOLICITUD DE APORTE
  //* ==========================================

  async registrarAporte(

    request: RaffleContributionCreateRequest

  ): Promise<string> {

    await this.validarParticipante();


    // VALIDAR SORTEO

    this.validarSorteoId(
      request.raffle_id
    );


    // VALIDAR MONTO DECLARADO

    this.validarMonto(
      request.amount
    );


    // VALIDAR METODO DECLARADO

    if (

      !['yape', 'bcp', 'plin'].includes(
        request.payment_method
      )

    ) {

      throw new Error(
        'Selecciona un método válido.'
      );

    }


    // REGISTRAR SOLICITUD EN SUPABASE

    const { data, error } =

      await this.supabase.client.rpc(

'register_contribution',

        {
  p_raffle_id: request.raffle_id,
  p_amount: request.amount,
  p_payment_method: request.payment_method,
  p_contribution_id: request.contribution_id
}

      );


    if (error) {

      throw error;

    }


    // VALIDAR CODIGO GENERADO

    if (

      typeof data !== 'string' ||

      !data

    ) {

      throw new Error(
        'No se pudo obtener el código de la solicitud.'
      );

    }


    return data;

  }


  //* ==========================================
  //* LISTAR MIS APORTES
  //* ==========================================

  async listarMisAportes(

    raffleId?: number

  ): Promise<RaffleContribution[]> {

    const userId =
      await this.validarParticipante();

    if (raffleId !== undefined) {

      this.validarSorteoId(raffleId);

    }

    const resultado: RaffleContribution[] = [];

    const limite = 200;

    let desde = 0;

    while (true) {

      let query = this.supabase.client

        .from('raffle_contributions')

        .select('*')

        .eq('user_id', userId);

      if (raffleId !== undefined) {

        query = query.eq(
          'raffle_id',
          raffleId
        );

      }

      const { data, error } = await query

        .order('created_at', {
          ascending: false
        })

        .order('id', {
          ascending: false
        })

        .range(
          desde,
          desde + limite - 1
        );

      if (error) {

        throw error;

      }

      const registros =
        (data ?? []) as RaffleContribution[];

      resultado.push(...registros);

      if (registros.length < limite) {

        break;

      }

      desde += limite;

    }

    return resultado;

  }


  //* ==========================================
  //* OBTENER MI APORTE POR IDENTIFICADOR
  //* ==========================================

  async obtenerMiAporte(

    contributionId: string

  ): Promise<RaffleContribution | null> {

    const userId =
      await this.validarParticipante();

    if (!contributionId.trim()) {

      throw new Error(
        'La solicitud seleccionada no es válida.'
      );

    }

    const { data, error } =

      await this.supabase.client

        .from('raffle_contributions')

        .select('*')

        .eq('id', contributionId)

        .eq('user_id', userId)

        .maybeSingle();

    if (error) {

      throw error;

    }

    return data as RaffleContribution | null;

  }


  //* ==========================================
  //* OBTENER MI APORTE PENDIENTE
  //* ==========================================

  async obtenerMiAportePendiente(

    raffleId: number

  ): Promise<RaffleContribution | null> {

    const userId =
      await this.validarParticipante();

    this.validarSorteoId(raffleId);

    const { data, error } =

      await this.supabase.client

        .from('raffle_contributions')

        .select('*')

        .eq('raffle_id', raffleId)

        .eq('user_id', userId)

        .eq('status', 'pending')

        .order('created_at', {
          ascending: false
        })

        .order('id', {
          ascending: false
        })

        .limit(1)

        .maybeSingle();

    if (error) {

      throw error;

    }

    return data as RaffleContribution | null;

  }


  //* ==========================================
  //* OBTENER MI ULTIMO APORTE
  //* ==========================================

  async obtenerMiUltimoAporte(

    raffleId: number

  ): Promise<RaffleContribution | null> {

    const userId =
      await this.validarParticipante();

    this.validarSorteoId(raffleId);

    const { data, error } =

      await this.supabase.client

        .from('raffle_contributions')

        .select('*')

        .eq('raffle_id', raffleId)

        .eq('user_id', userId)

        .order('created_at', {
          ascending: false
        })

        .order('id', {
          ascending: false
        })

        .limit(1)

        .maybeSingle();

    if (error) {

      throw error;

    }

    return data as RaffleContribution | null;

  }


  //* ==========================================
  //* LISTAR APORTES ADMINISTRATIVOS
  //* CON INFORMACION DEL PARTICIPANTE
  //* ==========================================

  async listarAportesAdmin(

    raffleId?: number

  ): Promise<RaffleContributionAdmin[]> {

    await this.validarAdministrador();

    if (raffleId !== undefined) {

      this.validarSorteoId(raffleId);

    }

    const resultado: RaffleContributionAdmin[] = [];

    const limite = 200;

    let desde = 0;

    while (true) {

      const { data, error } =

        await this.supabase.client

          .rpc(

            'get_admin_contributions',

            {

              p_raffle_id:
                raffleId ?? null

            }

          )

          .order('created_at', {
            ascending: false
          })

          .order('id', {
            ascending: false
          })

          .range(

            desde,

            desde + limite - 1

          );

      if (error) {

        throw error;

      }

      const registros =

        (data ?? []) as RaffleContributionAdmin[];

      resultado.push(...registros);

      if (registros.length < limite) {

        break;

      }

      desde += limite;

    }

    return resultado;

  }


  //* ==========================================
  //* REVISAR APORTE ADMINISTRATIVO
  //* ==========================================

  async revisarAporte(

    request: RaffleContributionReviewRequest

  ): Promise<void> {

    await this.validarAdministrador();


    // VALIDAR SOLICITUD

    if (!request.contribution_id.trim()) {

      throw new Error(
        'La solicitud seleccionada no es válida.'
      );

    }


    // VALIDAR ESTADO

    if (

      request.status !== 'approved' &&

      request.status !== 'rejected'

    ) {

      throw new Error(
        'Estado de revisión no válido.'
      );

    }


    const comentario =

      request.admin_comment.trim();

    const referencia =

      request.operation_reference?.trim() || null;

    const monto =

      request.approved_amount;


    // VALIDAR OBSERVACION

    if (comentario.length > 500) {

      throw new Error(
        'La observación supera los 500 caracteres.'
      );

    }


    // VALIDAR APROBACION

    if (request.status === 'approved') {

      this.validarMonto(monto);

      if (

        !referencia ||

        referencia.length > 150

      ) {

        throw new Error(
          'Ingresa una referencia de operación válida.'
        );

      }

    }


    // VALIDAR RECHAZO

    if (

      request.status === 'rejected' &&

      !comentario

    ) {

      throw new Error(
        'Debes ingresar el motivo del rechazo.'
      );

    }


    // EJECUTAR FUNCION RPC

    const { error } =

      await this.supabase.client.rpc(

        'review_contribution',

        {

          p_id:
            request.contribution_id,

          p_status:
            request.status,

          p_approved_amount:

            request.status === 'approved'
              ? monto
              : null,

          p_operation_reference:

            request.status === 'approved'
              ? referencia
              : null,

          p_comment:
            comentario || null

        }

      );


    if (error) {

      if (error.code === '23505') {

        throw new Error(

          'La referencia de operación ya está registrada en otra solicitud aprobada.'

        );

      }

      throw error;

    }

  }


  //* ==========================================
  //* REGISTRAR PARTICIPACION ANTERIOR
  //* COMPATIBILIDAD CON COMPONENTES EXISTENTES
  //* ==========================================

  async registrar(

    raffleId: number

  ): Promise<void> {

    await this.validarParticipante();

    this.validarSorteoId(raffleId);

    throw new Error(

      'Utiliza el nuevo formulario de solicitud de participación.'

    );

  }


  //* ==========================================
  //* MIS PARTICIPACIONES
  //* ==========================================

  async listarMisParticipaciones():
    Promise<RaffleParticipation[]> {

    const userId =
      await this.validarParticipante();

    const { data, error } =

      await this.supabase.client

        .from('raffle_participations')

        .select('*')

        .eq('user_id', userId)

        .order('created_at', {
          ascending: false
        });

    if (error) {

      throw error;

    }

    return (data ?? []) as RaffleParticipation[];

  }


  //* ==========================================
  //* MI PARTICIPACION EN UN SORTEO
  //* ==========================================

  async obtenerMiParticipacion(

    raffleId: number

  ): Promise<RaffleParticipation | null> {

    const userId =
      await this.validarParticipante();

    this.validarSorteoId(raffleId);

    const { data, error } =

      await this.supabase.client

        .from('raffle_participations')

        .select('*')

        .eq('raffle_id', raffleId)

        .eq('user_id', userId)

        .order('created_at', {
          ascending: false
        })

        .order('id', {
          ascending: false
        });

    if (error) {

      throw error;

    }

    const items =

      (data ?? []) as RaffleParticipation[];


    // PRIORIZAR PARTICIPACION VIGENTE

    return items.find(item =>

      item.status === 'approved' ||

      item.status === 'pending'

    ) ?? items[0] ?? null;

  }


  //* ==========================================
  //* HISTORIAL DETALLADO DE PARTICIPACIONES
  //* ==========================================

  async listarMiHistorial():
    Promise<RaffleParticipationDetail[]> {

    const userId =
      await this.validarParticipante();

    const resultado: RaffleParticipationDetail[] = [];

    const limite = 200;

    let desde = 0;

    while (true) {

      const { data, error } =

        await this.supabase.client

          .from('raffle_participations')

          .select(`
            id,
            raffle_id,
            user_id,
            participant_name,
            participant_type,
            status,
            admin_comment,
            reviewed_by,
            reviewed_at,
            created_at,
            raffle:raffles (
              id,
              title,
              prize,
              image,
              status,
              ends_at,
              draw_at
            )
          `)

          .eq('user_id', userId)

          .order('created_at', {
            ascending: false
          })

          .order('id', {
            ascending: false
          })

          .range(

            desde,

            desde + limite - 1

          );

      if (error) {

        throw error;

      }

      const registros =

        (data ?? []) as unknown as
          RaffleParticipationDetail[];

      resultado.push(...registros);

      if (registros.length < limite) {

        break;

      }

      desde += limite;

    }

    return resultado;

  }


  //* ==========================================
  //* LISTAR SOLICITUDES ADMINISTRATIVAS
  //* ==========================================

  async listarAdmin(

    raffleId?: number

  ): Promise<RaffleParticipationDetail[]> {

    await this.validarAdministrador();

    if (raffleId !== undefined) {

      this.validarSorteoId(raffleId);

    }

    const resultado: RaffleParticipationDetail[] = [];

    const limite = 200;

    let desde = 0;

    while (true) {

      let query = this.supabase.client

        .from('raffle_participations')

        .select(`
          id,
          raffle_id,
          user_id,
          participant_name,
          participant_type,
          status,
          admin_comment,
          reviewed_by,
          reviewed_at,
          created_at,
          raffle:raffles (
            id,
            title,
            prize,
            image,
            status,
            ends_at,
            draw_at
          )
        `);

      if (raffleId !== undefined) {

        query = query.eq(

          'raffle_id',

          raffleId

        );

      }

      const { data, error } = await query

        .order('created_at', {
          ascending: false
        })

        .order('id', {
          ascending: false
        })

        .range(

          desde,

          desde + limite - 1

        );

      if (error) {

        throw error;

      }

      const registros =

        (data ?? []) as unknown as
          RaffleParticipationDetail[];

      resultado.push(...registros);

      if (registros.length < limite) {

        break;

      }

      desde += limite;

    }

    return resultado;

  }


  //* ==========================================
  //* REVISAR PARTICIPACION ANTERIOR
  //* ==========================================

  async revisar(

    participationId: string,

    estado: 'approved' | 'rejected',

    comentario: string = ''

  ): Promise<void> {

    await this.validarAdministrador();

    if (!participationId.trim()) {

      throw new Error(
        'La participación seleccionada no es válida.'
      );

    }

    if (

      estado !== 'approved' &&

      estado !== 'rejected'

    ) {

      throw new Error(
        'El estado seleccionado no es válido.'
      );

    }

    const observacion = comentario.trim();

    if (

      estado === 'rejected' &&

      !observacion

    ) {

      throw new Error(
        'Debes ingresar el motivo del rechazo.'
      );

    }

    if (observacion.length > 500) {

      throw new Error(
        'La observación no debe superar los 500 caracteres.'
      );

    }

    const { error } =

      await this.supabase.client.rpc(

        'review_free_participation',

        {

          p_id:
            participationId,

          p_status:
            estado,

          p_comment:
            observacion || null

        }

      );

    if (error) {

      throw error;

    }

  }


  //* ==========================================
  //* APROBAR PARTICIPACION ANTERIOR
  //* ==========================================

  aprobar(

    participationId: string,

    comentario: string = ''

  ): Promise<void> {

    return this.revisar(

      participationId,

      'approved',

      comentario

    );

  }


  //* ==========================================
  //* RECHAZAR PARTICIPACION ANTERIOR
  //* ==========================================

  rechazar(

    participationId: string,

    comentario: string

  ): Promise<void> {

    return this.revisar(

      participationId,

      'rejected',

      comentario

    );

  }

}
