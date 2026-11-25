
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

  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  ruc = '';
  company = '';
  phone = '';
  email = '';
  password = '';

  readonly busy = signal(false);

  readonly message = signal('');

  readonly success = signal(false);

  readonly mostrarPassword = signal(false);

  alternarPassword(): void {
    this.mostrarPassword.update(value => !value);
  }

  async registrar(): Promise<void> {

    if (this.busy()) {
      return;
    }

    this.message.set('');
    this.success.set(false);

    if (!validarRuc(this.ruc.trim())) {

      this.message.set(
        'Ingresa un número de RUC válido.'
      );

      return;
    }

    if (
      !this.company.trim() ||
      !this.phone.trim() ||
      !this.email.trim()
    ) {

      this.message.set(
        'Completa todos los campos.'
      );

      return;
    }

    if (this.password.length < 8) {

      this.message.set(
        'La contraseña debe tener al menos 8 caracteres.'
      );

      return;
    }

    this.busy.set(true);

    try {

      const tieneSesion =
        await this.authService.registro({

          ruc: this.ruc.trim(),
          company: this.company.trim(),
          phone: this.phone.trim(),
          email: this.email.trim(),
          password: this.password

        });

      this.password = '';

      if (!tieneSesion) {

        this.success.set(true);

        this.message.set(
          'Revisa tu correo para confirmar tu cuenta. ' +
          'Después inicia sesión y espera la aprobación.'
        );

        return;
      }

      await this.router.navigate([
        this.authService.allowed()
          ? '/catalogo'
          : '/pendiente'
      ]);

    } catch (error) {

      this.message.set(
        (error as { message?: string })?.message ||
        'No se pudo completar el registro.'
      );

    } finally {

      this.busy.set(false);

    }

  }

}
