
import {
  Component,
  inject,
  signal
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

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  private readonly authService =
    inject(AuthService);

  private readonly popupService =
    inject(PopupService);

  private readonly router =
    inject(Router);


  // ==========================================
  // DATOS DEL FORMULARIO
  // ==========================================

  email = '';

  password = '';


  // ==========================================
  // ESTADOS
  // ==========================================

  readonly busy = signal(false);

  readonly message = signal('');

  readonly mostrarPassword = signal(false);

  readonly correoSinConfirmar = signal(false);

  readonly reenviandoCorreo = signal(false);


  // ==========================================
  // MOSTRAR U OCULTAR CONTRASENA
  // ==========================================

  alternarPassword(): void {

    this.mostrarPassword.update(
      value => !value
    );

  }


  // ==========================================
  // LIMPIAR MENSAJES
  // ==========================================

  limpiarMensaje(): void {

    this.message.set('');

    this.correoSinConfirmar.set(false);

  }


  // ==========================================
  // INICIAR SESION
  // ==========================================

  async ingresar(): Promise<void> {

    if (
      this.busy() ||
      this.reenviandoCorreo()
    ) {

      return;

    }

    this.limpiarMensaje();

    const email = this.email.trim();

    if (!email || !this.password) {

      this.message.set(
        'Ingresa tu correo y contraseña.'
      );

      return;

    }

    if (!this.validarEmail(email)) {

      this.message.set(
        'Ingresa un correo electrónico válido.'
      );

      return;

    }

    this.busy.set(true);

    try {

      // AUTENTICAR USUARIO

      await this.authService.login({

        email,

        password: this.password

      });

      // VALIDAR SESION

      if (!this.authService.autenticado()) {

        throw new Error(
          'No se pudo recuperar la sesión.'
        );

      }

      // LIMPIAR CONTRASENA

      this.password = '';

      this.mostrarPassword.set(false);

      // REDIRECCION AUTOMATICA SEGUN ROL

      const ruta =
        this.authService.rutaInicio();

      const navegacion =
        await this.router.navigateByUrl(ruta);

      if (!navegacion) {

        this.message.set(
          'La sesión está activa, pero no se pudo abrir tu panel.'
        );

      }

    } catch (error) {

      const authError = error as {

        message?: string;

        code?: string;

        status?: number;

      };

      const mensaje =
        this.obtenerMensajeError(authError);

      this.message.set(mensaje);

      // CORREO PENDIENTE DE CONFIRMACION

      if (

        authError.code === 'email_not_confirmed' ||

        authError.message === 'Email not confirmed'

      ) {

        this.correoSinConfirmar.set(true);

        await this.popupService.warning(

          'Correo sin confirmar',

          'Revisa tu correo electrónico o solicita un nuevo enlace de confirmación.'

        );

        return;

      }

      // CUENTA BLOQUEADA

      if (

        mensaje.toLowerCase().includes('bloqueada') ||

        authError.code === 'user_banned'

      ) {

        await this.popupService.warning(

          'Cuenta bloqueada',

          'Tu cuenta no tiene acceso actualmente. Comunícate con Corporación Charatec.'

        );

        return;

      }

      // OTROS ERRORES

      await this.popupService.error(

        'No se pudo iniciar sesión',

        mensaje

      );

    } finally {

      this.busy.set(false);

    }

  }


  // ==========================================
  // REENVIAR CORREO DE CONFIRMACION
  // ==========================================

  async reenviarConfirmacion(): Promise<void> {

    if (

      this.reenviandoCorreo() ||

      this.busy()

    ) {

      return;

    }

    const email = this.email.trim();

    if (!this.validarEmail(email)) {

      await this.popupService.warning(

        'Correo inválido',

        'Ingresa un correo electrónico válido.'

      );

      return;

    }

    this.reenviandoCorreo.set(true);

    try {

      await this.authService.reenviarConfirmacion(
        email
      );

      this.limpiarMensaje();

      await this.popupService.success(

        'Solicitud enviada',

        'Si tu cuenta está pendiente de confirmación, recibirás un nuevo enlace en tu correo. Revisa también la carpeta de correo no deseado.'

      );

    } catch (error) {

      const mensaje =
        this.obtenerMensajeError(error);

      await this.popupService.error(

        'No se pudo reenviar el correo',

        mensaje

      );

    } finally {

      this.reenviandoCorreo.set(false);

    }

  }


  // ==========================================
  // RECUPERACION DE CONTRASENA
  // ==========================================

  async recuperarPassword(): Promise<void> {

    // Habilitaremos el envio del enlace cuando
    // exista la pantalla restablecer-password.

    if (this.busy()) {

      return;

    }

    await this.popupService.warning(

      'Recuperación de contraseña',

      'Por el momento, comunícate con nuestro equipo de atención para recuperar el acceso a tu cuenta.'

    );

  }


  // ==========================================
  // VALIDAR CORREO ELECTRONICO
  // ==========================================

  private validarEmail(
    email: string
  ): boolean {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(email);

  }


  // ==========================================
  // TRADUCIR ERRORES DE SUPABASE
  // ==========================================

  private obtenerMensajeError(
    error: unknown
  ): string {

    const authError = error as {

      message?: string;

      code?: string;

      status?: number;

    };

    switch (authError?.code) {

      case 'invalid_credentials':

        return 'Correo o contraseña incorrectos.';

      case 'email_not_confirmed':

        return 'Debes confirmar tu correo electrónico antes de iniciar sesión.';

      case 'user_banned':

        return 'Tu cuenta se encuentra bloqueada.';

      case 'over_request_rate_limit':

      case 'over_email_send_rate_limit':

        return 'Has realizado demasiadas solicitudes. Inténtalo nuevamente más tarde.';

      case 'request_timeout':

        return 'La solicitud tardó demasiado. Verifica tu conexión a Internet.';

      case 'session_not_found':

        return 'Tu sesión ha expirado. Inicia sesión nuevamente.';

    }

    const mensaje = authError?.message || '';

    if (mensaje === 'Invalid login credentials') {

      return 'Correo o contraseña incorrectos.';

    }

    if (mensaje === 'Email not confirmed') {

      return 'Tu correo electrónico aún no ha sido confirmado.';

    }

    if (

      mensaje === 'Failed to fetch' ||

      mensaje === 'NetworkError when attempting to fetch resource.'

    ) {

      return 'No se pudo conectar con el servidor. Verifica tu conexión.';

    }

    if (authError?.status === 429) {

      return 'Demasiadas solicitudes. Inténtalo nuevamente más tarde.';

    }

    return mensaje ||
      'No se pudo completar la operación.';

  }

}
