
import {
  Component,
  inject,
  signal
} from '@angular/core';

import { Router } from '@angular/router';

import {
  AuthService
} from '../../../core/services/auth.service';

@Component({
  selector: 'app-pendiente',
  standalone: true,
  templateUrl: './pendiente.component.html',
  styleUrl: './pendiente.component.css'
})
export class PendienteComponent {

  readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  readonly busy = signal(false);

  readonly message = signal('');

  async actualizarEstado(): Promise<void> {

    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    this.message.set('');

    try {

      await this.authService.refresh();

      if (!this.authService.autenticado()) {

        await this.router.navigate(['/login']);

      } else if (this.authService.allowed()) {

        await this.router.navigate(['/catalogo']);

      } else {

        this.message.set(
          'Tu cuenta todavía no tiene acceso autorizado.'
        );

      }

    } catch (error) {

      this.message.set(
        (error as { message?: string })?.message ||
        'No se pudo actualizar el estado.'
      );

    } finally {

      this.busy.set(false);

    }

  }

}
