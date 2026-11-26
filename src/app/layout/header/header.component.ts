
import {
  Component,
  inject,
  signal,
  computed,
  HostListener
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import {
  AuthService
} from '../../core/services/auth.service';

import {
  PopupService
} from '../../core/services/popup.service';


interface NavItem {

  label: string;
  route: string;
  exact?: boolean;

}


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

  private readonly popupService =
    inject(PopupService);


  // ==========================================
  // ESTADOS DEL HEADER
  // ==========================================

  readonly menuAbierto = signal(false);

  readonly cerrandoSesion = signal(false);

  readonly mensajeError = signal('');


  // ==========================================
  // RUTA PRINCIPAL DEL LOGO
  // ==========================================

  readonly rutaLogo = computed(() =>
    this.authService.rutaInicio()
  );


  // ==========================================
  // SUBTITULO SEGUN TIPO DE CUENTA
  // ==========================================

  readonly subtitulo = computed(() => {

    if (this.authService.admin()) {

      return 'PORTAL DE ADMINISTRACIÓN';

    }

    if (this.authService.distributor()) {

      return 'PORTAL DE SUBDISTRIBUCIÓN';

    }

    if (this.authService.customer()) {

      return 'PORTAL DE CLIENTES';

    }

    return 'TECNOLOGÍA Y NEGOCIOS';

  });


  // ==========================================
  // NOMBRE VISIBLE DEL ROL
  // ==========================================

  readonly nombreRol = computed(() => {

    if (this.authService.distributor()) {

      return 'Cliente empresa';

    }

    return this.authService.rol();

  });


  // ==========================================
  // MENU DINAMICO SEGUN EL ROL
  // ==========================================

  readonly menuItems = computed<NavItem[]>(() => {

    const auth = this.authService;


    // ========================================
    // USUARIO SIN SESION
    // ========================================

    if (!auth.autenticado()) {

      return [

        {
          label: 'Sorteos',
          route: '/sorteos',
          exact: true
        },

        {
          label: 'Iniciar sesión',
          route: '/login',
          exact: true
        },

        {
          label: 'Crear cuenta',
          route: '/registro',
          exact: true
        }

      ];

    }


    // ========================================
    // CUENTAS BLOQUEADAS O SIN PERFIL
    // ========================================

    if (
      auth.bloqueado() ||
      auth.sinPerfil()
    ) {

      return [];

    }


    // ========================================
    // ADMINISTRADOR
    // ========================================

    if (auth.admin()) {

      return [

        {
          label: 'Catálogo',
          route: '/catalogo'
        },

        {
          label: 'Productos y stock',
          route: '/admin/productos'
        },

        {
          label: 'Tipo de cambio',
          route: '/admin/tipo-cambio'
        },

        {
          label: 'Distribuidores',
          route: '/admin/distribuidores'
        },

        {
          label: 'Clientes',
          route: '/admin/clientes'
        },
        {
          label: 'Administrar sorteos',
          route: '/admin/sorteos'
        },
        {
          label: 'Sorteos',
          route: '/sorteos'
        }

      ];

    }


    // ========================================
    // CLIENTE EMPRESA
    // ========================================

    // ==========================================
    // CLIENTE EMPRESA
    // ==========================================

    if (auth.distributor()) {

      if (auth.allowed()) {

        return [

          {
            label: 'Catálogo',
            route: '/catalogo'
          },

          {
            label: 'Sorteos',
            route: '/sorteos'
          },

          {
            label: 'Mis participaciones',
            route: '/mis-participaciones'
          }

        ];

      }

      if (auth.pendiente()) {

        return [

          {
            label: 'Sorteos',
            route: '/sorteos'
          },

          {
            label: 'Estado de mi cuenta',
            route: '/pendiente'
          }

        ];

      }

    }


    // ========================================
    // CLIENTE PARTICULAR
    // ========================================

    if (
      auth.customer() &&
      auth.puedeParticipar()
    ) {

      return [

        {
          label: 'Sorteos',
          route: '/sorteos'
        },

        {
          label: 'Mis participaciones',
          route: '/mis-participaciones'
        }

      ];

    }

    return [];

  });


  // ==========================================
  // MENU RESPONSIVE
  // ==========================================

  alternarMenu(): void {

    this.menuAbierto.update(
      valor => !valor
    );

  }


  cerrarMenu(): void {

    this.menuAbierto.set(false);

  }


  // ==========================================
  // CERRAR MENU CON TECLA ESCAPE
  // ==========================================

  @HostListener('document:keydown.escape')
  cerrarMenuEscape(): void {

    this.cerrarMenu();

  }


  // ==========================================
  // CERRAR MENU AL CAMBIAR A ESCRITORIO
  // ==========================================

  @HostListener('window:resize')
  verificarResolucion(): void {

    if (window.innerWidth > 850) {

      this.cerrarMenu();

    }

  }


  // ==========================================
  // CERRAR SESION
  // ==========================================

  async cerrarSesion(): Promise<void> {

    if (this.cerrandoSesion()) {

      return;

    }

    this.cerrandoSesion.set(true);

    this.mensajeError.set('');

    try {

      const confirmar =
        await this.popupService.confirm(

          '¿Cerrar sesión?',

          '¿Estás seguro de que deseas cerrar tu sesión en Corporación Charatec?',

          'Cerrar sesión'

        );

      if (!confirmar) {

        return;

      }

      await this.authService.logout();

      this.cerrarMenu();

      await this.router.navigate(
        ['/login'],
        {
          replaceUrl: true
        }
      );

    } catch (error) {

      const mensaje =
        'No se pudo cerrar la sesión correctamente. Inténtalo nuevamente.';

      this.mensajeError.set(mensaje);

      await this.popupService.error(

        'Error al cerrar sesión',

        mensaje

      );

    } finally {

      this.cerrandoSesion.set(false);

    }

  }

}
