
import { Injectable, inject } from '@angular/core';

import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {

  private readonly db =
    inject(SupabaseService).client;

  async obtenerTipoCambio(): Promise<number> {

    const { data, error } = await this.db
      .from('settings')
      .select('rate')
      .eq('id', 1)
      .single();

    if (error) {
      throw error;
    }

    return Number(data.rate);
  }

  async actualizarTipoCambio(
    rate: number
  ): Promise<void> {

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('Tipo de cambio inválido.');
    }

    const { error } = await this.db
      .from('settings')
      .update({ rate })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      throw error;
    }

  }

}
