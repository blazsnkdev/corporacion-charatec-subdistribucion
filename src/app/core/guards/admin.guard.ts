import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async () => {

  const auth = inject(AuthService);
  const router = inject(Router);

  try {

    await auth.inicializar();
    await auth.refresh();
    if (!auth.autenticado()) {
      return router.createUrlTree(['/login']);
    }

    if (auth.admin()) {
      return true;
    }

    return router.createUrlTree([
      auth.allowed() ? '/catalogo' : '/pendiente'
    ]);

  } catch {

    return router.createUrlTree(['/login']);

  }

};
