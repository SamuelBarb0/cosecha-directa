import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restaurar();
  return auth.autenticado() ? true : router.createUrlTree(['/login']);
};

export const invitadoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restaurar();
  return auth.autenticado() ? router.createUrlTree(['/tabs/catalogo']) : true;
};
