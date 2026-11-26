
import { Routes } from '@angular/router';

import {
  MainLayoutComponent
} from './layout/main-layout/main-layout.component';


// ==========================================
// GUARDS
// ==========================================

import { homeGuard } from './core/guards/home.guard';

import { guestGuard } from './core/guards/guest.guard';

import { adminGuard } from './core/guards/admin.guard';

import { distributorGuard } from './core/guards/distributor.guard';

import { pendingGuard } from './core/guards/pending.guard';

import { customerGuard } from './core/guards/customer.guard';


// ==========================================
// RUTAS PRINCIPALES
// ==========================================

export const routes: Routes = [

  {
    path: '',
    component: MainLayoutComponent,

    children: [

      // ====================================
      // INICIO SEGUN EL ROL
      // ====================================

      {
        path: '',
        pathMatch: 'full',
        canActivate: [homeGuard],

        loadComponent: () =>
          import(
            './shared/component/home-redirect/home-redirect.component'
          ).then(m => m.HomeRedirectComponent)
      },


      // ====================================
      // AUTENTICACION
      // ====================================

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


      // ====================================
      // EMPRESAS PENDIENTES
      // ====================================

      {
        path: 'pendiente',

        canActivate: [pendingGuard],

        loadComponent: () =>
          import(
            './features/auth/pendiente/pendiente.component'
          ).then(m => m.PendienteComponent)
      },


      // ====================================
      // CATALOGO MAYORISTA B2B
      // ====================================

      {
        path: 'catalogo',

        canActivate: [distributorGuard],

        loadComponent: () =>
          import(
            './features/catalogo/catalogo.component'
          ).then(m => m.CatalogoComponent)
      },


      // ====================================
      // SORTEOS PUBLICOS
      // ====================================

      {
        path: 'sorteos',

        loadComponent: () =>
          import(
            './features/sorteos/listado/sorteos.component'
          ).then(m => m.SorteosComponent)
      },

      {
        path: 'sorteos/:id',

        loadComponent: () =>
          import(
            './features/sorteos/detalle/sorteo-detalle.component'
          ).then(m => m.SorteoDetalleComponent)
      },


      // ====================================
      // MIS PARTICIPACIONES
      // ====================================

      {
        path: 'mis-participaciones',

        canActivate: [customerGuard],

        loadComponent: () =>
          import(
            './features/sorteos/mis-participaciones/mis-participaciones.component'
          ).then(m => m.MisParticipacionesComponent)
      },


      // ====================================
      // ADMINISTRACION
      // ====================================

      {
        path: 'admin',

        canActivate: [adminGuard],

        canActivateChild: [adminGuard],

        children: [

          // INICIO ADMINISTRATIVO

          {
            path: '',
            redirectTo: 'productos',
            pathMatch: 'full'
          },


          // ADMINISTRACION DE PRODUCTOS

          {
            path: 'productos',

            loadComponent: () =>
              import(
                './features/admin/productos/productos.component'
              ).then(m => m.ProductosComponent)
          },


          // ADMINISTRACION DEL TIPO DE CAMBIO

          {
            path: 'tipo-cambio',

            loadComponent: () =>
              import(
                './features/admin/tipo-cambio/tipo-cambio.component'
              ).then(m => m.TipoCambioComponent)
          },


          // ADMINISTRACION DE DISTRIBUIDORES

          {
            path: 'distribuidores',

            loadComponent: () =>
              import(
                './features/admin/distribuidores/distribuidores.component'
              ).then(m => m.DistribuidoresComponent)
          },


          // ADMINISTRACION DE CLIENTES

          {
            path: 'clientes',

            loadComponent: () =>
              import(
                './features/admin/clientes/clientes.component'
              ).then(m => m.ClientesComponent)
          },


          // ADMINISTRACION DE SORTEOS

          {
            path: 'sorteos',

            loadComponent: () =>
              import(
                './features/admin/sorteos/sorteos-admin.component'
              ).then(m => m.SorteosAdminComponent)
          },


          // DETALLE ADMINISTRATIVO DEL SORTEO
{
  path: 'sorteos/:id/ruleta',

  loadComponent: () =>
    import(
      './features/admin/sorteos/ruleta/ruleta.component'
    ).then(m => m.RuletaComponent)
},
          {
            path: 'sorteos/:id',

            loadComponent: () =>
              import(
                './features/admin/sorteos/detalle/sorteo-admin-detalle.component'
              ).then(m => m.SorteoAdminDetalleComponent)
          },


          // ADMINISTRACION DE SOLICITUDES

          {
            path: 'solicitudes',

            loadComponent: () =>
              import(
                './features/admin/solicitudes/solicitudes.component'
              ).then(m => m.SolicitudesComponent)
          },


          // RUTAS ADMINISTRATIVAS INEXISTENTES

          {
            path: '**',
            redirectTo: 'productos'
          }

        ]

      },


      // ====================================
      // RUTAS INEXISTENTES
      // ====================================

      {
        path: '**',
        redirectTo: ''
      }

    ]

  }

];
