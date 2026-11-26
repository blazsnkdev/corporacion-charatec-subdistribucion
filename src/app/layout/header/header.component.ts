import { PopupService } from '../../core/services/popup.service';
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
  private readonly popupService = inject(PopupService);
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

    if (this.cerrandoSesion()) return;

    this.cerrandoSesion.set(true);

    try {

      const confirmar = await this.popupService.confirm(
        '¿Cerrar sesión?',
        '¿Estás seguro de que deseas cerrar tu sesión en Corporación Charatec B2B?',
        'Cerrar sesión'
      );

      if (!confirmar) return;

      await this.authService.logout();

      this.cerrarMenu();

      await this.router.navigate(['/login']);

    } catch (error) {

      await this.popupService.error(
        'Error al cerrar sesión',
        'No se pudo completar la operación. Inténtalo nuevamente.'
      );

    } finally {

      this.cerrandoSesion.set(false);

    }

  }

}
