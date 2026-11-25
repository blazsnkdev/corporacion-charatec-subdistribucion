
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

  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  email = '';
  password = '';

  readonly busy = signal(false);

  readonly message = signal('');

  readonly mostrarPassword = signal(false);

  alternarPassword(): void {
    this.mostrarPassword.update(value => !value);
  }

  async ingresar(): Promise<void> {

    if (this.busy()) {
      return;
    }

    this.message.set('');

    if (!this.email.trim() || !this.password) {

      this.message.set(
        'Ingresa tu correo y contraseña.'
      );

      return;
    }

    this.busy.set(true);

    try {

      await this.authService.login({
        email: this.email.trim(),
        password: this.password
      });

      if (!this.authService.autenticado()) {
        throw new Error(
          'No se pudo recuperar la sesión.'
        );
      }

      this.password = '';

      if (this.authService.admin()) {

        await this.router.navigate(['/admin/productos']);

      } else if (this.authService.allowed()) {

        await this.router.navigate(['/catalogo']);

      } else {

        await this.router.navigate(['/pendiente']);

      }


    } catch (error) {

      const mensaje =
        (error as { message?: string })?.message ||
        'No se pudo iniciar sesión.';

      this.message.set(
        mensaje === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos.'
          : mensaje
      );

    } finally {

      this.busy.set(false);

    }

  }

}
