
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
  Raffle,
  RaffleCreateRequest,
  RaffleUpdateRequest
} from '../models/raffle.model';


@Injectable({
  providedIn: 'root'
})
export class RafflesService {

  private readonly supabase =
    inject(SupabaseService);

  private readonly auth =
    inject(AuthService);

  private readonly bucket =
    'raffle-images';


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
  // LISTAR SORTEOS ADMINISTRADOR
  // ==========================================

  async listarAdmin(): Promise<Raffle[]> {

    await this.validarAdministrador();

    const { data, error } =
      await this.supabase.client

        .from('raffles')

        .select('*')

        .order('created_at', {
          ascending: false
        });

    if (error) {
      throw error;
    }

    return (data ?? []) as Raffle[];

  }


  // ==========================================
  // LISTAR SORTEOS PUBLICOS
  // ==========================================

  async listarPublicos(): Promise<Raffle[]> {

    const { data, error } =
      await this.supabase.client

        .from('raffles')

        .select('*')

        .in('status', [
          'published',
          'closed',
          'finished'
        ])

        .order('published_at', {
          ascending: false
        });

    if (error) {
      throw error;
    }

    return (data ?? []) as Raffle[];

  }


  // ==========================================
  // OBTENER SORTEO POR ID
  // ==========================================

  async obtenerPorId(
    id: number
  ): Promise<Raffle> {

    this.validarId(id);

    const { data, error } =
      await this.supabase.client

        .from('raffles')

        .select('*')

        .eq('id', id)

        .single();

    if (error) {
      throw error;
    }

    return data as Raffle;

  }


  // ==========================================
  // CREAR SORTEO
  // ==========================================

  async crear(
    request: RaffleCreateRequest
  ): Promise<Raffle> {

    await this.validarAdministrador();

    this.validarDatos(request);

    this.validarAportes(request);

    const { data, error } =
      await this.supabase.client

        .from('raffles')

        .insert({

          ...request,

          image: request.image ?? '',

          status: 'draft',

          published_at: null,

          starts_at: null

        })

        .select()

        .single();

    if (error) {
      throw error;
    }

    return data as Raffle;

  }


  // ==========================================
  // ACTUALIZAR SORTEO
  // ==========================================

 
async actualizar(
  id: number,
  request: RaffleUpdateRequest
): Promise<Raffle> {

  await this.validarAdministrador();

  this.validarId(id);

  this.validarDatos(request);

  this.validarAportes(request);

  const { data, error } =
    await this.supabase.client

      .from('raffles')

      .update({

        ...request,

        image: request.image ?? '',

        updated_at: new Date().toISOString()

      })

      .eq('id', id)

      .in('status', [
        'draft',
        'published'
      ])

      .select()

      .single();

  if (error) {
    throw error;
  }

  return data as Raffle;

}



  // ==========================================
  // VALIDAR CONFIGURACION ECONOMICA
  // ==========================================

  private validarAportes(
    request: RaffleCreateRequest
  ): void {

    const minimo =
      request.min_contribution;

    const maximo =
      request.max_contribution;

    const incremento =
      request.contribution_step;

    const meta =
      request.collection_goal;


    // VALIDAR APORTE MINIMO

    if (
      minimo === null ||
      !Number.isFinite(minimo) ||
      minimo <= 0
    ) {

      throw new Error(
        'Ingresa un aporte mínimo válido.'
      );

    }


    // VALIDAR APORTE MAXIMO

    if (
      maximo === null ||
      !Number.isFinite(maximo) ||
      maximo < minimo
    ) {

      throw new Error(
        'El aporte máximo debe ser mayor o igual al mínimo.'
      );

    }


    // VALIDAR INCREMENTO

    if (
      incremento === null ||
      !Number.isFinite(incremento) ||
      incremento <= 0
    ) {

      throw new Error(
        'Ingresa un incremento válido.'
      );

    }


    // VALIDAR META

    if (
      meta === null ||
      !Number.isFinite(meta) ||
      meta <= 0
    ) {

      throw new Error(
        'Ingresa una meta de recaudación válida.'
      );

    }


    // VALIDAR DECIMALES Y LIMITES

    const montos = [
      minimo,
      maximo,
      incremento,
      meta
    ];

    if (
      montos.some(monto =>

        monto > 9999999999.99 ||

        Math.abs(
          monto * 100 -
          Math.round(monto * 100)
        ) > 0.00001

      )
    ) {

      throw new Error(
        'Los montos deben tener hasta dos decimales y estar dentro del límite permitido.'
      );

    }


    // VALIDAR RANGO DEL SELECTOR

    const minimoCentimos =
      Math.round(minimo * 100);

    const maximoCentimos =
      Math.round(maximo * 100);

    const incrementoCentimos =
      Math.round(incremento * 100);

    const rangoCentimos =
      maximoCentimos - minimoCentimos;

    if (
      incrementoCentimos <= 0 ||
      rangoCentimos % incrementoCentimos !== 0
    ) {

      throw new Error(
        'El incremento debe ser compatible con el rango de aportes.'
      );

    }

  }


  // ==========================================
  // SUBIR IMAGEN DEL SORTEO
  // ==========================================

  async subirImagen(
    archivo: File
  ): Promise<string> {

    await this.validarAdministrador();

    const tiposPermitidos: Record<string, string> = {

      'image/jpeg': 'jpg',

      'image/png': 'png',

      'image/webp': 'webp'

    };

    const extension =
      tiposPermitidos[archivo.type];

    if (!extension) {

      throw new Error(
        'Solo se permiten imágenes JPG, PNG o WEBP.'
      );

    }

    const limite =
      2 * 1024 * 1024;

    if (archivo.size > limite) {

      throw new Error(
        'La imagen no debe superar los 2 MB.'
      );

    }

    const ruta =
      `sorteos/${crypto.randomUUID()}.${extension}`;

    const { error } =
      await this.supabase.client.storage

        .from(this.bucket)

        .upload(ruta, archivo, {

          cacheControl: '3600',

          upsert: false,

          contentType: archivo.type

        });

    if (error) {
      throw error;
    }

    const { data } =
      this.supabase.client.storage

        .from(this.bucket)

        .getPublicUrl(ruta);

    return data.publicUrl;

  }


  // ==========================================
  // PUBLICAR SORTEO
  // ==========================================

  async publicar(
    id: number
  ): Promise<void> {

    await this.validarAdministrador();

    this.validarId(id);

    const { error } =
      await this.supabase.client.rpc(

        'publish_raffle',

        {
          p_raffle_id: id
        }

      );

    if (error) {
      throw error;
    }

  }


  // ==========================================
  // CERRAR SORTEO
  // ==========================================

  async cerrar(
    id: number
  ): Promise<void> {

    await this.validarAdministrador();

    this.validarId(id);

    const { error } =
      await this.supabase.client.rpc(

        'close_raffle',

        {
          p_raffle_id: id
        }

      );

    if (error) {
      throw error;
    }

  }


  // ==========================================
  // VALIDAR IDENTIFICADOR
  // ==========================================

  private validarId(
    id: number
  ): void {

    if (
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {

      throw new Error(
        'El identificador del sorteo no es válido.'
      );

    }

  }


  // ==========================================
  // VALIDAR DATOS GENERALES
  // ==========================================

  private validarDatos(
    request: RaffleCreateRequest
  ): void {

    if (request.title.trim().length < 3) {

      throw new Error(
        'Ingresa un título válido.'
      );

    }

    if (!request.description.trim()) {

      throw new Error(
        'Ingresa la descripción del sorteo.'
      );

    }

    if (!request.prize.trim()) {

      throw new Error(
        'Ingresa el premio del sorteo.'
      );

    }

    if (!request.rules.trim()) {

      throw new Error(
        'Ingresa las reglas del sorteo.'
      );

    }


    // VALIDAR FECHAS

    const cierre =
      new Date(request.ends_at).getTime();

    const sorteo =
      new Date(request.draw_at).getTime();

    if (
      !Number.isFinite(cierre) ||
      !Number.isFinite(sorteo)
    ) {

      throw new Error(
        'Las fechas ingresadas no son válidas.'
      );

    }

    if (cierre <= Date.now()) {

      throw new Error(
        'La fecha de cierre debe ser futura.'
      );

    }

    if (sorteo < cierre) {

      throw new Error(
        'El sorteo no puede realizarse antes del cierre de participaciones.'
      );

    }

  }

}
