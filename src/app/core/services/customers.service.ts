
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
  Customer,
  CustomerStatus
} from '../models/customer.model';


@Injectable({
  providedIn: 'root'
})
export class CustomersService {

  private readonly supabase =
    inject(SupabaseService);

  private readonly auth =
    inject(AuthService);


  private readonly campos = `
    id,
    first_name,
    last_name,
    phone,
    status,
    created_at
  `;


  // ==========================================
  // VALIDAR ADMINISTRADOR
  // ==========================================

  private async validarAdministrador(): Promise<void> {

    await this.auth.refresh();

    if (!this.auth.puedeAdministrar()) {

      throw new Error(
        'No tienes permisos para administrar clientes.'
      );

    }

  }


  // ==========================================
  // LISTAR CLIENTES
  // ==========================================

  async listar(): Promise<Customer[]> {

    await this.validarAdministrador();

    const clientes: Customer[] = [];

    const limite = 500;

    let desde = 0;

    while (true) {

      const { data, error } =
        await this.supabase.client

          .from('customers')

          .select(this.campos)

          .order('created_at', {
            ascending: false
          })

          .order('id', {
            ascending: true
          })

          .range(
            desde,
            desde + limite - 1
          );

      if (error) {

        throw error;

      }

      const resultado =
        (data ?? []) as Customer[];

      clientes.push(...resultado);

      if (resultado.length < limite) {

        break;

      }

      desde += limite;

    }

    return clientes;

  }


  // ==========================================
  // OBTENER CLIENTE POR ID
  // ==========================================

  async obtenerPorId(
    id: string
  ): Promise<Customer> {

    await this.validarAdministrador();

    const { data, error } =
      await this.supabase.client

        .from('customers')

        .select(this.campos)

        .eq('id', id)

        .single();

    if (error) {

      throw error;

    }

    return data as Customer;

  }


  // ==========================================
  // ACTUALIZAR ESTADO
  // ==========================================

  async actualizarEstado(

    id: string,

    estado: CustomerStatus

  ): Promise<Customer> {

    await this.validarAdministrador();

    if (!id.trim()) {

      throw new Error(
        'El identificador del cliente es inválido.'
      );

    }

    if (
      estado !== 'active' &&
      estado !== 'blocked'
    ) {

      throw new Error(
        'El estado seleccionado no es válido.'
      );

    }

    const { data, error } =
      await this.supabase.client

        .from('customers')

        .update({
          status: estado
        })

        .eq('id', id)

        .select(this.campos)

        .single();

    if (error) {

      throw error;

    }

    return data as Customer;

  }


  // ==========================================
  // ACTIVAR CLIENTE
  // ==========================================

  activar(id: string): Promise<Customer> {

    return this.actualizarEstado(
      id,
      'active'
    );

  }


  // ==========================================
  // BLOQUEAR CLIENTE
  // ==========================================

  bloquear(id: string): Promise<Customer> {

    return this.actualizarEstado(
      id,
      'blocked'
    );

  }

}
