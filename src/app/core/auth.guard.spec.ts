import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard, invitadoGuard } from './auth.guard';

describe('guards de autenticación', () => {
  const ruta = {} as ActivatedRouteSnapshot;
  const estado = {} as RouterStateSnapshot;
  const ejecutar = (guard: typeof authGuard) => TestBed.runInInjectionContext(() => guard(ruta, estado)) as Promise<boolean | UrlTree>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  });

  it('sin sesión, la tienda redirige al login', async () => {
    const resultado = await ejecutar(authGuard);

    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/login');
  });

  it('con sesión, deja entrar a la tienda', async () => {
    localStorage.setItem(
      'CapacitorStorage.sesion',
      JSON.stringify({ accessToken: 't', refreshToken: 'r', usuario: { id: 1 } }),
    );

    expect(await ejecutar(authGuard)).toBe(true);
    expect(TestBed.inject(AuthService).autenticado()).toBe(true);
  });

  it('con sesión, el login redirige al catálogo', async () => {
    localStorage.setItem(
      'CapacitorStorage.sesion',
      JSON.stringify({ accessToken: 't', refreshToken: 'r', usuario: { id: 1 } }),
    );

    const resultado = await ejecutar(invitadoGuard);

    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/tabs/catalogo');
  });
});
