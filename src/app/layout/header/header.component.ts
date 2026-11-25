
import {
  Component,
  inject,
  signal
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import {
  AuthService
} from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  readonly menuAbierto = signal(false);

  readonly cerrandoSesion = signal(false);

  readonly mensajeError = signal('');

  alternarMenu(): void {
    this.menuAbierto.update(valor => !valor);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  async cerrarSesion(): Promise<void> {

    if (this.cerrandoSesion()) {
      return;
    }

    this.cerrandoSesion.set(true);
    this.mensajeError.set('');

    try {

      await this.authService.logout();

      this.cerrarMenu();

      await this.router.navigate(['/login']);

    } catch (error) {

      this.mensajeError.set(
        (error as { message?: string })?.message ||
        'No se pudo cerrar la sesión.'
      );

    } finally {

      this.cerrandoSesion.set(false);

    }

  }

}
