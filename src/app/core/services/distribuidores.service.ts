
import { Injectable, inject } from '@angular/core';

import { SupabaseService } from './supabase.service';

import {
  Distributor
} from '../models/distributor.model';

@Injectable({
  providedIn: 'root'
})
export class DistribuidoresService {

  private readonly db =
    inject(SupabaseService).client;

  async listar(): Promise<Distributor[]> {

    const { data, error } = await this.db
      .from('distributors')
      .select('*')
      .order('company');

    if (error) {
      throw error;
    }

    return data as Distributor[];
  }

  async obtenerPorId(
    id: string
  ): Promise<Distributor | null> {

    const { data, error } = await this.db
      .from('distributors')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as Distributor | null;
  }

  async actualizarEstado(
    id: string,
    status: string
  ): Promise<void> {

    const { error } = await this.db
      .from('distributors')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

  }

}
