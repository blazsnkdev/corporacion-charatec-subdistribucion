
import { Injectable } from '@angular/core';

import {
  createClient,
  SupabaseClient
} from '@supabase/supabase-js';

import { config } from '../config/supabase.config';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  readonly client: SupabaseClient;

  constructor() {

    if (!config.url || !config.key) {
      throw new Error(
        'Falta configurar la conexión con Supabase.'
      );
    }

    this.client = createClient(
      config.url,
      config.key
    );

  }

}
