
import {
  Component,
  inject,
  signal,
  computed
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  PopupService
} from '../../../core/services/popup.service';

import {
  RegistrationType
} from '../../../core/models/role.model';

import {
  validarRuc
} from '../../../shared/utils/ruc.utils';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink
  ],
  templateUrl: './registro.component.html',
  styleUrls: [
    '../login/login.component.css',
    './registro.component.css'
  ]
})
export class RegistroComponent {

  private readonly authService =
    inject(AuthService);

  private readonly popupService =
    inject(PopupService);

  private readonly router =
    inject(Router);

  // ==========================================
  // TIPO DE REGISTRO
  // ==========================================

  readonly tipo =
    signal<RegistrationType>('distributor');

  readonly esEmpresa = computed(
    () => this.tipo() === 'distributor'
  );

  readonly esParticular = computed(
    () => this.tipo() === 'customer'
  );

  // ==========================================
  // DATOS EMPRESARIALES
  // ==========================================

  ruc = '';

  company = '';

  // ==========================================
  // DATOS PERSONALES
  // ==========================================

  firstName = '';

  lastName = '';

  // ==========================================
  // DATOS COMUNES
  // ==========================================

  phone = '';

  email = '';

  password = '';

  confirmPassword = '';

  // ==========================================
  // ESTADOS DEL FORMULARIO
  // ==========================================

  readonly busy = signal(false);

  readonly success = signal(false);

  readonly message = signal('');

  readonly mostrarPassword = signal(false);

  readonly mostrarConfirmPassword = signal(false);

  // ==========================================
  // BENEFICIOS SEGUN TIPO DE CLIENTE
  // ==========================================

  readonly beneficios = computed(() => {

    if (this.esEmpresa()) {

      return [

        'Precios mayoristas',

        'Atención comercial personalizada',

        'Consulta de stock',

        'Envíos a nivel nacional',

        'Acceso a sorteos y promociones'

      ];

    }

    return [

      'Acceso a sorteos exclusivos',

      'Promociones tecnológicas',

      'Consulta de participaciones',

      'Resultados de sorteos',

      'Atención personalizada'

    ];

  });

  // ==========================================
  // SELECCIONAR TIPO DE CUENTA
  // ==========================================

  seleccionarTipo(
    tipo: RegistrationType
  ): void {

    if (
      this.busy() ||
      this.success() ||
      this.tipo() === tipo
    ) {
      return;
    }

    this.tipo.set(tipo);

    this.message.set('');

    this.ruc = '';

    this.company = '';

    this.firstName = '';

    this.lastName = '';

    this.password = '';

    this.confirmPassword = '';

    this.mostrarPassword.set(false);

    this.mostrarConfirmPassword.set(false);

  }

  // ==========================================
  // MOSTRAR CONTRASENA
  // ==========================================

  alternarPassword(): void {

    this.mostrarPassword.update(
      value => !value
    );

  }

  alternarConfirmPassword(): void {

    this.mostrarConfirmPassword.update(
      value => !value
    );

  }

  // ==========================================
  // VALIDAR ENTRADA RUC
  // ==========================================

  validarEntradaRuc(valor: string): void {

    let ruc = valor.replace(/\D/g, '');

    // Primer digito: 1 o 2.

    if (ruc && !/^[12]/.test(ruc)) {

      ruc = '';

    }

    // Prefijo obligatorio: 10 o 20.

    if (
      ruc.length >= 2 &&
      !/^(10|20)/.test(ruc)
    ) {

      ruc = ruc.charAt(0);

    }

    this.ruc = ruc.slice(0, 11);

  }

  // ==========================================
  // VALIDAR ENTRADA CELULAR
  // ==========================================

  validarEntradaCelular(
    valor: string
  ): void {

    let phone = valor.replace(/\D/g, '');

    if (phone && !phone.startsWith('9')) {

      phone = '';

    }

    this.phone = phone.slice(0, 9);

  }

  // ==========================================
  // VALIDAR FORMULARIO
  // ==========================================

  private validarFormulario(): void {

    if (this.esEmpresa()) {

      const ruc = this.ruc.trim();

      if (

        !/^(10|20)\d{9}$/.test(ruc) ||

        !validarRuc(ruc)

      ) {

        throw new Error(
          'Ingresa un RUC válido que comience en 10 o 20.'
        );

      }

      if (!this.company.trim()) {

        throw new Error(
          'Ingresa la razón social de tu empresa.'
        );

      }

    } else {

      if (this.firstName.trim().length < 2) {

        throw new Error(
          'Ingresa tus nombres.'
        );

      }

      if (this.lastName.trim().length < 2) {

        throw new Error(
          'Ingresa tus apellidos.'
        );

      }

    }

    if (!/^9\d{8}$/.test(this.phone.trim())) {

      throw new Error(
        'El celular debe comenzar en 9 y tener 9 dígitos.'
      );

    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(this.email.trim())
    ) {

      throw new Error(
        'Ingresa un correo electrónico válido.'
      );

    }

    if (this.password.length < 8) {

      throw new Error(
        'La contraseña debe tener al menos 8 caracteres.'
      );

    }

    if (this.password !== this.confirmPassword) {

      throw new Error(
        'Las contraseñas no coinciden.'
      );

    }

  }

  // ==========================================
  // REGISTRAR USUARIO
  // ==========================================

  async registrar(): Promise<void> {

    if (this.busy() || this.success()) {

      return;

    }

    this.busy.set(true);

    this.message.set('');

    this.success.set(false);

    try {

      // VALIDAR DATOS

      this.validarFormulario();

      // REGISTRAR SEGUN TIPO DE CUENTA

      const tieneSesion = this.esEmpresa()

        ? await this.authService.registro({

            ruc: this.ruc.trim(),

            company: this.company.trim(),

            phone: this.phone.trim(),

            email: this.email.trim(),

            password: this.password

          })

        : await this.authService.registroCliente({

            first_name: this.firstName.trim(),

            last_name: this.lastName.trim(),

            phone: this.phone.trim(),

            email: this.email.trim(),

            password: this.password

          });

      // LIMPIAR CONTRASENAS

      this.password = '';

      this.confirmPassword = '';

      this.mostrarPassword.set(false);

      this.mostrarConfirmPassword.set(false);

      // ======================================
      // CONFIRMACION DE CORREO ELECTRONICO
      // ======================================

      if (!tieneSesion) {

        this.success.set(true);

        const mensaje = this.esEmpresa()

          ? 'Si el registro es válido, recibirás un correo para confirmar tu cuenta. Después inicia sesión y espera la aprobación del administrador.'

          : 'Si el registro es válido, recibirás un correo para confirmar tu cuenta. Después podrás iniciar sesión y acceder a los sorteos.';

        this.message.set(mensaje);

        await this.popupService.success(

          '¡Revisa tu correo electrónico!',

          mensaje

        );

        return;

      }

      // ======================================
      // REGISTRO CON SESION ACTIVA
      // ======================================

      this.success.set(true);

      if (this.esEmpresa()) {

        await this.popupService.success(

          '¡Solicitud registrada!',

          'Tu cuenta empresarial fue registrada correctamente y está pendiente de aprobación.'

        );

      } else {

        await this.popupService.success(

          '¡Bienvenido a Charatec!',

          'Tu cuenta particular fue registrada correctamente.'

        );

      }

      // REDIRECCION SEGUN EL ROL REAL

      const navegacion = await this.router.navigateByUrl(

        this.authService.rutaInicio()

      );

      if (!navegacion) {

        this.message.set(
          'Tu cuenta fue registrada. Puedes continuar desde el inicio de sesión.'
        );

      }

    } catch (error) {

      const mensaje =

        (error as { message?: string })?.message ||

        'No se pudo completar el registro.';

      this.message.set(mensaje);

      await this.popupService.error(

        'No se pudo completar la operación',

        mensaje

      );

    } finally {

      this.busy.set(false);

    }

  }

}
