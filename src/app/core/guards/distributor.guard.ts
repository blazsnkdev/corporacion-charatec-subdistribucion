
import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import { AuthService } from '../services/auth.service';

export const distributorGuard: CanActivateFn = async () => {

  const auth = inject(AuthService);
  const router = inject(Router);

  try {

    await auth.inicializar();

    if (!auth.autenticado()) {
      return router.createUrlTree(['/login']);
    }

    if (auth.allowed()) {
      return true;
    }

    return router.createUrlTree(['/pendiente']);

  } catch {

    return router.createUrlTree(['/login']);

  }

};
