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

    await auth.refresh();

    if (!auth.autenticado()) {

      return true;

    }

    if (
      auth.bloqueado() ||
      auth.sinPerfil()
    ) {

      await auth.logout();

      return true;

    }

    return router.parseUrl(
      auth.rutaInicio()
    );

  } catch {

    return true;

  }

};