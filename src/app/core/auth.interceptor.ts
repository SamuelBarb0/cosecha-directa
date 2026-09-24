import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

const conToken = (req: HttpRequest<unknown>, token: string) =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

// Adjunta el token a las peticiones del API y, si el servidor responde 401,
// intenta una sola renovación con el refresh token antes de rendirse.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.sesion()?.accessToken;
  const esApi = req.url.startsWith(environment.apiUrl);
  const esAuth = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  if (!esApi || esAuth || !token) {
    return next(req);
  }

  return next(conToken(req, token)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return from(auth.renovar()).pipe(
        switchMap((nuevo) => (nuevo ? next(conToken(req, nuevo)) : throwError(() => error))),
      );
    }),
  );
};
