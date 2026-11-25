
import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = async () => {

  const auth = inject(AuthService);
  const router = inject(Router);

  try {

    await auth.inicializar();

    if (!auth.autenticado()) {
      return true;
    }

    return router.createUrlTree([
      auth.allowed() ? '/catalogo' : '/pendiente'
    ]);

  } catch {

    return true;

  }

};
