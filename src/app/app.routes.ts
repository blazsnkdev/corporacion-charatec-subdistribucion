
import { Routes } from '@angular/router';

// LAYOUT

import {
  MainLayoutComponent
} from './layout/main-layout/main-layout.component';

// GUARDS

import {
  authGuard
} from './core/guards/auth.guard';

import {
  guestGuard
} from './core/guards/guest.guard';

import {
  adminGuard
} from './core/guards/admin.guard';

import {
  distributorGuard
} from './core/guards/distributor.guard';

export const routes: Routes = [

  {
    path: '',
    component: MainLayoutComponent,

    children: [

      // INICIO

      {
        path: '',
        redirectTo: 'catalogo',
        pathMatch: 'full'
      },

      // AUTENTICACIÓN

      {
        path: 'login',

        canActivate: [guestGuard],

        loadComponent: () =>
          import(
            './features/auth/login/login.component'
          ).then(m => m.LoginComponent)
      },

      {
        path: 'registro',

        canActivate: [guestGuard],

        loadComponent: () =>
          import(
            './features/auth/registro/registro.component'
          ).then(m => m.RegistroComponent)
      },

      {
        path: 'pendiente',

        canActivate: [authGuard],

        loadComponent: () =>
          import(
            './features/auth/pendiente/pendiente.component'
          ).then(m => m.PendienteComponent)
      },

      // CATÁLOGO B2B

      {
        path: 'catalogo',

        canActivate: [distributorGuard],

        loadComponent: () =>
          import(
            './features/catalogo/catalogo.component'
          ).then(m => m.CatalogoComponent)
      },

      // ADMINISTRACIÓN

      {
        path: 'admin',

        canActivate: [adminGuard],

        canActivateChild: [adminGuard],

        children: [

          {
            path: '',
            redirectTo: 'productos',
            pathMatch: 'full'
          },

          {
            path: 'productos',

            loadComponent: () =>
              import(
                './features/admin/productos/productos.component'
              ).then(m => m.ProductosComponent)
          },

          {
            path: 'tipo-cambio',

            loadComponent: () =>
              import(
                './features/admin/tipo-cambio/tipo-cambio.component'
              ).then(m => m.TipoCambioComponent)
          },

          {
            path: 'distribuidores',

            loadComponent: () =>
              import(
                './features/admin/distribuidores/distribuidores.component'
              ).then(m => m.DistribuidoresComponent)
          }

        ]

      },

      // RUTAS INEXISTENTES

      {
        path: '**',
        redirectTo: 'catalogo'
      }

    ]

  }

];
