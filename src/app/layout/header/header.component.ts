
import {
  Component,
  inject,
  signal,
  computed,
  HostListener,
  ElementRef,
  DestroyRef
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  NavigationEnd
} from '@angular/router';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import { filter } from 'rxjs';

import {
  AuthService
} from '../../core/services/auth.service';

import {
  PopupService
} from '../../core/services/popup.service';


// ==========================================
// MODELOS DEL MENU
// ==========================================

interface NavChild {

  label: string;
  route: string;
  icon?: string;
  exact?: boolean;

}

interface NavItem {

  id: string;
  label: string;
  route?: string;
  icon?: string;
  exact?: boolean;
  children?: NavChild[];

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


  // ==========================================
  // SERVICIOS
  // ==========================================

  readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  private readonly popupService =
    inject(PopupService);

  private readonly elementRef =
    inject(ElementRef<HTMLElement>);

  private readonly destroyRef =
    inject(DestroyRef);


  // ==========================================
  // ESTADOS DEL HEADER
  // ==========================================

  readonly menuAbierto = signal(false);

  readonly submenuAbierto =
    signal<string | null>(null);

  readonly cerrandoSesion = signal(false);

  readonly mensajeError = signal('');

  readonly rutaActual = signal(this.router.url);


  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor() {

    this.router.events

      .pipe(

        filter(
          evento => evento instanceof NavigationEnd
        ),

        takeUntilDestroyed(this.destroyRef)

      )

      .subscribe(evento => {

        this.rutaActual.set(
          evento.urlAfterRedirects
        );

        this.cerrarMenu();

      });

  }


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
    if (!this.authService.ready()) {
      return '';
    }
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


// ==========================================
// MENU DINAMICO SEGUN EL ROL
// ==========================================

readonly menuItems = computed<NavItem[]>(() => {

  const auth = this.authService;

  // ESPERAR LA AUTENTICACION

  if (!auth.ready()) {
    return [];
  }


  // ========================================
  // USUARIO SIN SESION
  // ========================================

  if (!auth.autenticado()) {

    return [

      {
        id: 'sorteos',
        label: 'Sorteos',
        route: '/sorteos',
        icon: 'gift'
      },

      {
        id: 'login',
        label: 'Iniciar sesión',
        route: '/login',
        icon: 'login',
        exact: true
      },

      {
        id: 'registro',
        label: 'Crear cuenta',
        route: '/registro',
        icon: 'user-plus',
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

      // CATALOGO

      {
        id: 'catalogo',
        label: 'Catálogo',
        icon: 'package',

        children: [

          {
            label: 'Ver catálogo',
            route: '/catalogo',
            icon: 'grid'
          },

          {
            label: 'Productos y stock',
            route: '/admin/productos',
            icon: 'package'
          }

        ]

      },


      // USUARIOS

      {
        id: 'usuarios',
        label: 'Usuarios',
        icon: 'users',

        children: [

          {
            label: 'Distribuidores',
            route: '/admin/distribuidores',
            icon: 'building'
          },

          {
            label: 'Clientes particulares',
            route: '/admin/clientes',
            icon: 'user'
          }

        ]

      },


      // SORTEOS

      {
        id: 'sorteos',
        label: 'Sorteos',
        icon: 'gift',

        children: [

          {
            label: 'Ver sorteos',
            route: '/sorteos',
            icon: 'gift'
          },

          {
            label: 'Administrar sorteos',
            route: '/admin/sorteos',
            icon: 'clipboard'
          }

        ]

      },


      // CONFIGURACION

      {
        id: 'configuracion',
        label: 'Configuración',
        icon: 'settings',

        children: [

          {
            label: 'Tipo de cambio',
            route: '/admin/tipo-cambio',
            icon: 'exchange'
          }

        ]

      }

    ];

  }


  // ========================================
  // CLIENTE EMPRESA
  // ========================================

  if (auth.distributor()) {


    // DISTRIBUIDOR APROBADO

    if (auth.allowed()) {

      return [

        {
          id: 'catalogo',
          label: 'Catálogo',
          route: '/catalogo',
          icon: 'package'
        },

        {
          id: 'sorteos',
          label: 'Sorteos',
          icon: 'gift',

          children: [

            {
              label: 'Ver sorteos',
              route: '/sorteos',
              icon: 'gift'
            },

            {
              label: 'Mis participaciones',
              route: '/mis-participaciones',
              icon: 'clipboard'
            }

          ]

        }

      ];

    }


    // DISTRIBUIDOR PENDIENTE

    if (auth.pendiente()) {

      return [

        {
          id: 'sorteos',
          label: 'Sorteos',
          route: '/sorteos',
          icon: 'gift'
        },

        {
          id: 'estado-cuenta',
          label: 'Estado de mi cuenta',
          route: '/pendiente',
          icon: 'user'
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
        id: 'sorteos',
        label: 'Sorteos',
        route: '/sorteos',
        icon: 'gift'
      },

      {
        id: 'participaciones',
        label: 'Mis participaciones',
        route: '/mis-participaciones',
        icon: 'clipboard'
      }

    ];

  }

  return [];

});



  // ==========================================
  // VERIFICAR SI UNA RUTA ESTA ACTIVA
  // ==========================================

  esRutaActiva(
    ruta: string,
    exacta = false
  ): boolean {

    const actual = this.rutaActual()

      .split('?')[0]

      .split('#')[0];

    if (exacta) {

      return actual === ruta;

    }

    return actual === ruta ||

      actual.startsWith(ruta + '/');

  }


  // ==========================================
  // VERIFICAR MENU PRINCIPAL ACTIVO
  // ==========================================

  esMenuActivo(item: NavItem): boolean {

    if (item.children?.length) {

      return item.children.some(hijo =>

        this.esRutaActiva(
          hijo.route,
          hijo.exact
        )

      );

    }

    return item.route

      ? this.esRutaActiva(
        item.route,
        item.exact
      )

      : false;

  }


  // ==========================================
  // ABRIR / CERRAR SUBMENU
  // ==========================================

  alternarSubmenu(id: string): void {

    this.submenuAbierto.update(actual =>

      actual === id ? null : id

    );

  }


  cerrarSubmenu(): void {

    this.submenuAbierto.set(null);

  }


  // ==========================================
  // VERIFICAR SI EL SUBMENU ESTA ABIERTO
  // ==========================================

  esSubmenuAbierto(id: string): boolean {

    return this.submenuAbierto() === id;

  }


  // ==========================================
  // MENU RESPONSIVE
  // ==========================================

  alternarMenu(): void {

    this.menuAbierto.update(
      valor => !valor
    );

    if (!this.menuAbierto()) {

      this.cerrarSubmenu();

    }

  }


  cerrarMenu(): void {

    this.menuAbierto.set(false);

    this.cerrarSubmenu();

  }


  // ==========================================
  // CERRAR AL HACER CLIC FUERA DEL HEADER
  // ==========================================

  @HostListener('document:click', ['$event'])
  detectarClickExterior(evento: MouseEvent): void {

    const elemento = evento.target;

    if (
      elemento instanceof Node &&
      !this.elementRef.nativeElement.contains(elemento)
    ) {

      this.cerrarMenu();

    }

  }


  // ==========================================
  // CERRAR CON TECLA ESCAPE
  // ==========================================

  @HostListener('document:keydown.escape')
  cerrarMenuEscape(): void {

    if (this.submenuAbierto()) {

      this.cerrarSubmenu();

      return;

    }

    this.cerrarMenu();

  }


  // ==========================================
  // CERRAR MENU AL CAMBIAR RESOLUCION
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

    this.cerrarMenu();

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
