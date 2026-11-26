import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  AuthService
} from '../services/auth.service';

export const homeGuard: CanActivateFn = async () => {

  const auth = inject(AuthService);
  const router = inject(Router);

  try {

    await auth.refresh();

    if (
      !auth.autenticado() ||
      auth.bloqueado() ||
      auth.sinPerfil()
    ) {

      return router.createUrlTree(['/login']);

    }

    return router.parseUrl(
      auth.rutaInicio()
    );

  } catch {

    return router.createUrlTree(['/login']);

  }

};