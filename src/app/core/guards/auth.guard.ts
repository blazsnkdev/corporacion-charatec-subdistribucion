
import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {

  const auth = inject(AuthService);
  const router = inject(Router);

  try {

    await auth.inicializar();

    return auth.autenticado()
      ? true
      : router.createUrlTree(['/login']);

  } catch {

    return router.createUrlTree(['/login']);

  }

};
