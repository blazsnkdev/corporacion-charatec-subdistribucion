
import {
  Injectable,
  inject,
  signal,
  computed
} from '@angular/core';

import type { User } from '@supabase/supabase-js';

import {
  SupabaseService
} from './supabase.service';

import {
  LoginRequest,
  UserRole
} from '../models/auth.model';

import {
  UserRole as RoleCode
} from '../models/role.model';

import {
  DistributorRegistration
} from '../models/distributor.model';

import {
  Customer,
  CustomerStatus,
  CustomerRegisterRequest
} from '../models/customer.model';

import {
  validarRuc
} from '../../shared/utils/ruc.utils';


type DistributorStatus =
  | 'pending'
  | 'approved'
  | 'blocked';


interface DistributorProfile {

  id: string;
  ruc: string;
  company: string;
  phone: string;
  status: DistributorStatus;

}


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly db =
    inject(SupabaseService).client;


  // ==========================================
  // ESTADOS PRIVADOS
  // ==========================================

  private readonly _ready = signal(false);

  private readonly _user = signal('');

  private readonly _userId = signal('');

  private readonly _role =
    signal<RoleCode>('guest');

  private readonly _distributorProfile =
    signal<DistributorProfile | null>(null);

  private readonly _customerProfile =
    signal<Customer | null>(null);

  private readonly _loading = signal(false);


  // ==========================================
  // CONTROL DE OPERACIONES ASINCRONAS
  // ==========================================

  private inicializacion?: Promise<void>;

  private recuperacion?: Promise<void>;

  private operacionAuth = false;


  // ==========================================
  // ESTADOS PUBLICOS
  // ==========================================

  readonly ready = this._ready.asReadonly();

  readonly user = this._user.asReadonly();

  readonly userId = this._userId.asReadonly();

  readonly role = this._role.asReadonly();

  readonly loading = this._loading.asReadonly();

  readonly distributorProfile =
    this._distributorProfile.asReadonly();

  readonly customerProfile =
    this._customerProfile.asReadonly();


  // ==========================================
  // IDENTIFICACION DE ROLES
  // ==========================================

  readonly autenticado = computed(
    () => !!this._userId()
  );

  readonly admin = computed(
    () => this._role() === 'admin'
  );

  readonly distributor = computed(
    () => this._role() === 'distributor'
  );

  readonly customer = computed(
    () => this._role() === 'customer'
  );

  readonly invitado = computed(
    () => this._role() === 'guest'
  );

  readonly sinPerfil = computed(
    () => this._role() === 'unregistered'
  );


  // ==========================================
  // ESTADOS DE LOS PERFILES
  // ==========================================

  readonly status = computed<string>(() => {

    if (this.admin()) {
      return 'approved';
    }

    return this._distributorProfile()?.status || '';

  });

  readonly customerStatus =
    computed<CustomerStatus | null>(() =>

      this._customerProfile()?.status ?? null

    );

  readonly pendiente = computed(() =>

    this.distributor() &&
    this.status() === 'pending'

  );

  readonly bloqueado = computed(() =>

    (
      this.distributor() &&
      this.status() === 'blocked'
    ) ||

    (
      this.customer() &&
      this.customerStatus() === 'blocked'
    )

  );


  // ==========================================
  // PERMISOS DEL SISTEMA
  // ==========================================

  // Acceso exclusivo al catalogo mayorista.

  readonly allowed = computed(() =>

    this.admin() ||

    (
      this.distributor() &&
      this.status() === 'approved'
    )

  );


  // Acceso a participaciones de sorteos.

  readonly puedeParticipar = computed(() =>

    this.autenticado() &&

    (
      (
        this.distributor() &&
        this.status() === 'approved'
      ) ||

      (
        this.customer() &&
        this.customerStatus() === 'active'
      )
    )

  );


  // Acceso al panel administrativo.

  readonly puedeAdministrar = computed(() =>

    this.autenticado() && this.admin()

  );


  // ==========================================
  // INFORMACION DEL USUARIO
  // ==========================================

  readonly rol = computed<UserRole>(() => {

    switch (this._role()) {

      case 'admin':

        return 'Administrador';

      case 'distributor':

        return 'Distribuidor';

      case 'customer':

        return 'Cliente particular';

      case 'unregistered':

        return 'Sin perfil';

      default:

        return 'Invitado';

    }

  });


  readonly nombreCompleto = computed(() => {

    const cliente = this._customerProfile();

    if (cliente) {

      return `${cliente.first_name} ${cliente.last_name}`
        .trim();

    }

    const empresa = this._distributorProfile();

    if (empresa) {

      return empresa.company;

    }

    if (this.admin()) {

      return 'Administrador';

    }

    return this._user() || 'Invitado';

  });


  readonly telefono = computed(() =>

    this._customerProfile()?.phone ||

    this._distributorProfile()?.phone ||

    ''

  );


  readonly ruc = computed(() =>

    this._distributorProfile()?.ruc || ''

  );


  readonly razonSocial = computed(() =>

    this._distributorProfile()?.company || ''

  );


  // ==========================================
  // RUTA SEGUN EL ROL
  // ==========================================

  readonly rutaInicio = computed(() => {

    if (!this.autenticado()) {

      return '/login';

    }

    if (this.admin()) {

      return '/admin/productos';

    }

    if (this.distributor()) {

      return this.allowed()

        ? '/catalogo'

        : '/pendiente';

    }

    if (this.customer()) {

      return this.customerStatus() === 'active'

        ? '/sorteos'

        : '/login';

    }

    return '/login';

  });


  // ==========================================
  // INICIALIZAR AUTENTICACION
  // ==========================================

  inicializar(): Promise<void> {

    if (this._ready()) {

      return Promise.resolve();

    }

    if (!this.inicializacion) {

      this.inicializacion = this.refresh()

        .then(() => {

          this._ready.set(true);

        })

        .finally(() => {

          this.inicializacion = undefined;

        });

    }

    return this.inicializacion;

  }


  // ==========================================
  // VERIFICAR ROL
  // ==========================================

  tieneRol(rol: UserRole): boolean {

    return this.rol() === rol;

  }


  tieneRoleCode(rol: RoleCode): boolean {

    return this._role() === rol;

  }


  // ==========================================
  // RECUPERAR SESION
  // ==========================================

  refresh(): Promise<void> {

    if (!this.recuperacion) {

      this.recuperacion = this.cargarSesion()

        .finally(() => {

          this.recuperacion = undefined;

        });

    }

    return this.recuperacion;

  }


  private async cargarSesion(): Promise<void> {

    this._loading.set(true);

    this.limpiarSesion();

    try {

      const sessionResult =
        await this.db.auth.getSession();

      if (sessionResult.error) {

        throw sessionResult.error;

      }

      if (!sessionResult.data.session) {

        return;

      }

      const { data, error } =
        await this.db.auth.getUser();

      if (error) {

        throw error;

      }

      const user = data.user;

      if (!user) {

        return;

      }


      // ======================================
      // VERIFICAR CORREO CONFIRMADO
      // ======================================

      if (!user.email_confirmed_at) {

        this.establecerUsuario(
          user,
          'unregistered'
        );

        return;

      }


      // ======================================
      // CONSULTAR PERFILES EN PARALELO
      // ======================================

      const [

        esAdmin,

        distribuidor,

        cliente

      ] = await Promise.all([

        this.consultarAdministrador(user.id),

        this.consultarDistribuidor(user.id),

        this.consultarCliente(user.id)

      ]);


      // ======================================
      // EVITAR ROLES CONTRADICTORIOS
      // ======================================

      const cantidadRoles = [

        esAdmin,

        !!distribuidor,

        !!cliente

      ].filter(Boolean).length;


      if (cantidadRoles > 1) {

        throw new Error(
          'La cuenta tiene perfiles incompatibles. Comunícate con el administrador.'
        );

      }


      // ======================================
      // ADMINISTRADOR
      // ======================================

      if (esAdmin) {

        this.establecerUsuario(
          user,
          'admin'
        );

        return;

      }


      // ======================================
      // DISTRIBUIDOR EXISTENTE
      // ======================================

      if (distribuidor) {

        this.establecerDistribuidor(
          user,
          distribuidor
        );

        return;

      }


      // ======================================
      // CLIENTE PARTICULAR EXISTENTE
      // ======================================

      if (cliente) {

        this.establecerCliente(
          user,
          cliente
        );

        return;

      }


      // ======================================
      // CREAR PERFIL NUEVO
      // ======================================

      await this.crearPerfilDesdeMetadata(user);

    } catch (error) {

      this.limpiarSesion();

      throw error;

    } finally {

      this._loading.set(false);

    }

  }


  // ==========================================
  // CONSULTAR ADMINISTRADOR
  // ==========================================

  private async consultarAdministrador(
    userId: string
  ): Promise<boolean> {

    const { data, error } = await this.db

      .from('admins')

      .select('id')

      .eq('id', userId)

      .maybeSingle();

    if (error) {

      throw error;

    }

    return !!data;

  }


  // ==========================================
  // CONSULTAR DISTRIBUIDOR
  // ==========================================

  private async consultarDistribuidor(
    userId: string
  ): Promise<DistributorProfile | null> {

    const { data, error } = await this.db

      .from('distributors')

      .select('id, ruc, company, phone, status')

      .eq('id', userId)

      .maybeSingle();

    if (error) {

      throw error;

    }

    return data as DistributorProfile | null;

  }


  // ==========================================
  // CONSULTAR CLIENTE PARTICULAR
  // ==========================================

  private async consultarCliente(
    userId: string
  ): Promise<Customer | null> {

    const { data, error } = await this.db

      .from('customers')

      .select(
        'id, first_name, last_name, phone, status, created_at'
      )

      .eq('id', userId)

      .maybeSingle();

    if (error) {

      throw error;

    }

    return data as Customer | null;

  }


  // ==========================================
  // CREAR PERFIL DESDE METADATA
  // ==========================================

  private async crearPerfilDesdeMetadata(
    user: User
  ): Promise<void> {

    const metadata = user.user_metadata ?? {};

    const registrationType =
      metadata['registration_type'];


    // CLIENTE PARTICULAR

    if (registrationType === 'customer') {

      const cliente =
        await this.crearPerfilCliente(user);

      this.establecerCliente(
        user,
        cliente
      );

      return;

    }


    // CLIENTE EMPRESA
    // Compatible con los registros anteriores.

    if (

      (
        registrationType === 'distributor' ||
        !registrationType
      ) &&

      metadata['ruc'] &&

      metadata['company'] &&

      metadata['phone']

    ) {

      const distribuidor =
        await this.crearPerfilDistribuidor(user);

      this.establecerDistribuidor(
        user,
        distribuidor
      );

      return;

    }


    // USUARIO SIN PERFIL VALIDO

    this.establecerUsuario(
      user,
      'unregistered'
    );

  }


  // ==========================================
  // CREAR PERFIL EMPRESARIAL
  // ==========================================

  private async crearPerfilDistribuidor(
    user: User
  ): Promise<DistributorProfile> {

    const metadata = user.user_metadata ?? {};

    const ruc =
      String(metadata['ruc'] ?? '').trim();

    const company =
      String(metadata['company'] ?? '').trim();

    const phone =
      String(metadata['phone'] ?? '').trim();


    // Mantener compatibilidad con registros
    // empresariales anteriores.

    if (

      !validarRuc(ruc) ||

      !company ||

      !phone

    ) {

      throw new Error(
        'Los datos del perfil empresarial no son válidos.'
      );

    }

    const { error } = await this.db

      .from('distributors')

      .insert({

        id: user.id,

        ruc,

        company,

        phone,

        status: 'pending'

      });

    if (error && error.code !== '23505') {

      throw error;

    }

    const perfil =
      await this.consultarDistribuidor(user.id);

    if (!perfil) {

      throw new Error(
        'No se pudo registrar la empresa. Verifica si el RUC ya está registrado.'
      );

    }

    return perfil;

  }


  // ==========================================
  // CREAR PERFIL PARTICULAR
  // ==========================================

  private async crearPerfilCliente(
    user: User
  ): Promise<Customer> {

    const metadata = user.user_metadata ?? {};

    const firstName =
      String(metadata['first_name'] ?? '').trim();

    const lastName =
      String(metadata['last_name'] ?? '').trim();

    const phone =
      String(metadata['phone'] ?? '').trim();

    this.validarDatosCliente(
      firstName,
      lastName,
      phone
    );

    const { error } = await this.db

      .from('customers')

      .insert({

        id: user.id,

        first_name: firstName,

        last_name: lastName,

        phone,

        status: 'active'

      });

    if (error && error.code !== '23505') {

      throw error;

    }

    const perfil =
      await this.consultarCliente(user.id);

    if (!perfil) {

      throw new Error(
        'No se pudo registrar el perfil particular.'
      );

    }

    return perfil;

  }


  // ==========================================
  // ESTABLECER SESION GENERAL
  // ==========================================

  private establecerUsuario(

    user: User,

    role: RoleCode

  ): void {

    this._user.set(user.email || '');

    this._userId.set(user.id);

    this._role.set(role);

  }


  // ==========================================
  // ESTABLECER SESION EMPRESARIAL
  // ==========================================

  private establecerDistribuidor(

    user: User,

    perfil: DistributorProfile

  ): void {

    this._distributorProfile.set(perfil);

    this._customerProfile.set(null);

    this.establecerUsuario(

      user,

      'distributor'

    );

  }


  // ==========================================
  // ESTABLECER SESION PARTICULAR
  // ==========================================

  private establecerCliente(

    user: User,

    perfil: Customer

  ): void {

    this._customerProfile.set(perfil);

    this._distributorProfile.set(null);

    this.establecerUsuario(

      user,

      'customer'

    );

  }


  // ==========================================
  // INICIAR SESION
  // ==========================================

  async login(
    request: LoginRequest
  ): Promise<void> {

    await this.ejecutarOperacionAuth(async () => {

      const { error } =
        await this.db.auth.signInWithPassword({

          email: request.email.trim(),

          password: request.password

        });

      if (error) {

        throw error;

      }

      try {

        await this.refresh();

        if (!this.autenticado()) {

          throw new Error(
            'No se pudo recuperar la sesión.'
          );

        }

        if (this.bloqueado()) {

          throw new Error(
            'Tu cuenta se encuentra bloqueada. Comunícate con Charatec.'
          );

        }

        if (this.sinPerfil()) {

          throw new Error(
            'No encontramos un perfil válido asociado a tu cuenta.'
          );

        }

        this._ready.set(true);

      } catch (error) {

        await this.db.auth.signOut()
          .catch(() => { });

        this.limpiarSesion();

        throw error;

      }

    });

  }


  // ==========================================
  // REGISTRO EMPRESARIAL
  // ==========================================

  async registro(
    request: DistributorRegistration
  ): Promise<boolean> {

    const ruc = request.ruc.trim();

    const company = request.company.trim();

    const phone = request.phone.trim();

    const email = request.email.trim();

    const password = request.password;


    // VALIDAR RUC

    if (

      !/^(10|20)\d{9}$/.test(ruc) ||

      !validarRuc(ruc)

    ) {

      throw new Error(
        'Ingresa un RUC válido que comience en 10 o 20.'
      );

    }


    // VALIDAR RAZON SOCIAL

    if (!company || company.length > 150) {

      throw new Error(
        'Ingresa una razón social válida.'
      );

    }


    // VALIDAR CELULAR

    if (!/^9\d{8}$/.test(phone)) {

      throw new Error(
        'El celular debe comenzar en 9 y tener 9 dígitos.'
      );

    }

    this.validarCredenciales(
      email,
      password
    );


    return this.registrarUsuario(

      email,

      password,

      {

        registration_type: 'distributor',

        ruc,

        company,

        phone

      }

    );

  }


  // ==========================================
  // REGISTRO CLIENTE PARTICULAR
  // ==========================================

  async registroCliente(
    request: CustomerRegisterRequest
  ): Promise<boolean> {

    const firstName =
      request.first_name.trim();

    const lastName =
      request.last_name.trim();

    const phone =
      request.phone.trim();

    const email =
      request.email.trim();

    const password =
      request.password;


    this.validarDatosCliente(

      firstName,

      lastName,

      phone

    );


    this.validarCredenciales(

      email,

      password

    );


    return this.registrarUsuario(

      email,

      password,

      {

        registration_type: 'customer',

        first_name: firstName,

        last_name: lastName,

        phone

      }

    );

  }


  // ==========================================
  // REGISTRO GENERAL REUTILIZABLE
  // ==========================================

  private async registrarUsuario(

    email: string,

    password: string,

    metadata: Record<string, string>

  ): Promise<boolean> {

    return this.ejecutarOperacionAuth(async () => {

      const { data, error } =
        await this.db.auth.signUp({

          email,

          password,

          options: {

            data: metadata,

            emailRedirectTo:
              window.location.origin

          }

        });

      if (error) {

        throw error;

      }


      // El usuario debe confirmar su correo.

      if (!data.session) {

        return false;

      }


      // Si Supabase devuelve una sesion activa,
      // recuperar el perfil correspondiente.

      try {

        await this.refresh();

        if (
          !this.autenticado() ||
          this.sinPerfil()
        ) {

          throw new Error(
            'No se pudo completar el perfil del usuario.'
          );

        }

        this._ready.set(true);

        return true;

      } catch (error) {

        await this.db.auth.signOut()
          .catch(() => { });

        this.limpiarSesion();

        throw error;

      }

    });

  }


  // ==========================================
  // REENVIAR CORREO DE CONFIRMACION
  // ==========================================

  async reenviarConfirmacion(
    email: string
  ): Promise<void> {

    const correo = email.trim();

    if (!this.validarEmail(correo)) {

      throw new Error(
        'Ingresa un correo electrónico válido.'
      );

    }

    const { error } =
      await this.db.auth.resend({

        type: 'signup',

        email: correo,

        options: {

          emailRedirectTo:
            window.location.origin

        }

      });

    if (error) {

      throw error;

    }

  }


  // ==========================================
  // RECUPERAR CONTRASENA
  // ==========================================

  async recuperarPassword(
    email: string
  ): Promise<void> {

    const correo = email.trim();

    if (!this.validarEmail(correo)) {

      throw new Error(
        'Ingresa un correo electrónico válido.'
      );

    }

    const { error } =
      await this.db.auth.resetPasswordForEmail(

        correo,

        {

          redirectTo:
            `${window.location.origin}/restablecer-password`

        }

      );

    if (error) {

      throw error;

    }

  }


  // ==========================================
  // ACTUALIZAR CONTRASENA
  // ==========================================

  async actualizarPassword(
    password: string
  ): Promise<void> {

    if (password.length < 8) {

      throw new Error(
        'La contraseña debe tener al menos 8 caracteres.'
      );

    }

    const { error } =
      await this.db.auth.updateUser({

        password

      });

    if (error) {

      throw error;

    }

  }


  // ==========================================
  // VALIDACIONES REUTILIZABLES
  // ==========================================

  private validarDatosCliente(

    firstName: string,

    lastName: string,

    phone: string

  ): void {

    if (

      firstName.length < 2 ||

      firstName.length > 100

    ) {

      throw new Error(
        'Ingresa nombres válidos.'
      );

    }

    if (

      lastName.length < 2 ||

      lastName.length > 100

    ) {

      throw new Error(
        'Ingresa apellidos válidos.'
      );

    }

    if (!/^9\d{8}$/.test(phone)) {

      throw new Error(
        'El celular debe comenzar en 9 y tener 9 dígitos.'
      );

    }

  }


  private validarCredenciales(

    email: string,

    password: string

  ): void {

    if (!this.validarEmail(email)) {

      throw new Error(
        'Ingresa un correo electrónico válido.'
      );

    }

    if (password.length < 8) {

      throw new Error(
        'La contraseña debe tener al menos 8 caracteres.'
      );

    }

  }


  private validarEmail(
    email: string
  ): boolean {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(email);

  }


  // ==========================================
  // CONTROLAR OPERACIONES DE AUTENTICACION
  // ==========================================

  private async ejecutarOperacionAuth<T>(
    operacion: () => Promise<T>
  ): Promise<T> {

    if (this.operacionAuth) {

      throw new Error(
        'Existe una operación de autenticación en proceso.'
      );

    }

    this.operacionAuth = true;

    try {

      if (this.recuperacion) {

        await this.recuperacion
          .catch(() => { });

      }

      return await operacion();

    } finally {

      this.operacionAuth = false;

    }

  }


  // ==========================================
  // CERRAR SESION
  // ==========================================

  async logout(): Promise<void> {

    await this.ejecutarOperacionAuth(async () => {

      const { error } =
        await this.db.auth.signOut();

      if (error) {

        throw error;

      }

      this.limpiarSesion();

      this._ready.set(true);

    });

  }


  // ==========================================
  // LIMPIAR SESION
  // ==========================================

  private limpiarSesion(): void {

    this._user.set('');

    this._userId.set('');

    this._role.set('guest');

    this._distributorProfile.set(null);

    this._customerProfile.set(null);

  }

}
