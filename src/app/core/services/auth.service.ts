
import {
  Injectable,
  inject,
  signal,
  computed
} from '@angular/core';

import { SupabaseService } from './supabase.service';

import {
  LoginRequest,
  UserRole
} from '../models/auth.model';

import {
  DistributorRegistration
} from '../models/distributor.model';

import {
  validarRuc
} from '../../shared/utils/ruc.utils';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly db =
    inject(SupabaseService).client;

  private readonly _ready = signal(false);
  private readonly _user = signal('');
  private readonly _admin = signal(false);
  private readonly _status = signal('');

  readonly ready = this._ready.asReadonly();
  readonly user = this._user.asReadonly();
  readonly admin = this._admin.asReadonly();
  readonly status = this._status.asReadonly();

  readonly autenticado = computed(
    () => !!this._user()
  );

  readonly allowed = computed(
    () =>
      this._admin() ||
      this._status() === 'approved'
  );

  readonly rol = computed<UserRole>(() => {

    if (this._admin()) {
      return 'Administrador';
    }

    if (this._user()) {
      return 'Distribuidor';
    }

    return 'Invitado';

  });

  private inicializacion?: Promise<void>;

  inicializar(): Promise<void> {

    if (!this.inicializacion) {

      this.inicializacion = this.refresh()
        .finally(() => this._ready.set(true));

    }

    return this.inicializacion;
  }

  tieneRol(rol: UserRole): boolean {
    return this.rol() === rol;
  }

  async refresh(): Promise<void> {

    this.limpiarSesion();

    const { data, error } =
      await this.db.auth.getUser();

    if (error || !data.user) {
      return;
    }

    const user = data.user;

    const adminResult = await this.db
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (adminResult.error) {
      throw adminResult.error;
    }

    const esAdmin = !!adminResult.data;

    let profile = await this.db
      .from('distributors')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profile.error) {
      throw profile.error;
    }

    if (!esAdmin && !profile.data) {

      const metadata = user.user_metadata;

      if (
        metadata['ruc'] &&
        metadata['company'] &&
        metadata['phone']
      ) {

        const result = await this.db
          .from('distributors')
          .insert({
            id: user.id,
            ruc: metadata['ruc'],
            company: metadata['company'],
            phone: metadata['phone']
          });

        if (result.error) {
          throw result.error;
        }

        profile = await this.db
          .from('distributors')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profile.error) {
          throw profile.error;
        }

      }

    }

    this._user.set(user.email || '');
    this._admin.set(esAdmin);
    this._status.set(
      profile.data?.status || 'pending'
    );

  }

  async login(
    request: LoginRequest
  ): Promise<void> {

    const { error } =
      await this.db.auth.signInWithPassword({
        email: request.email,
        password: request.password
      });

    if (error) {
      throw error;
    }

    await this.refresh();

  }

  async registro(
    request: DistributorRegistration
  ): Promise<boolean> {

    if (
      !validarRuc(request.ruc) ||
      !request.company.trim() ||
      !request.phone.trim()
    ) {

      throw new Error(
        'Revisa RUC, razón social y teléfono.'
      );

    }

    const { data, error } =
      await this.db.auth.signUp({

        email: request.email,
        password: request.password,

        options: {

          data: {
            ruc: request.ruc,
            company: request.company,
            phone: request.phone
          },

          emailRedirectTo:
            window.location.origin

        }

      });

    if (error) {
      throw error;
    }

    if (!data.session) {
      return false;
    }

    await this.refresh();

    return true;

  }

  async logout(): Promise<void> {

    const { error } =
      await this.db.auth.signOut();

    if (error) {
      throw error;
    }

    this.limpiarSesion();

  }

  private limpiarSesion(): void {

    this._user.set('');
    this._admin.set(false);
    this._status.set('');

  }

}
