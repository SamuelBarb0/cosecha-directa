import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

const respuestaLogin = {
  id: 1, username: 'emilys', email: 'emily.johnson@x.dummyjson.com', firstName: 'Emily', lastName: 'Johnson',
  gender: 'female', image: 'https://dummyjson.com/icon/emilys/128', accessToken: 'token-a', refreshToken: 'refresh-a',
};

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  const esperar = () => new Promise((r) => setTimeout(r, 0));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('inicia sesión contra /auth/login y guarda la sesión', async () => {
    const promesa = auth.iniciarSesion(' emilys ', 'emilyspass');

    const req = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'emilys', password: 'emilyspass', expiresInMins: 30 });
    req.flush(respuestaLogin);
    await promesa;

    expect(auth.autenticado()).toBe(true);
    expect(auth.usuario()?.firstName).toBe('Emily');
    expect(auth.sesion()?.accessToken).toBe('token-a');
  });

  it('rechaza credenciales inválidas y no deja sesión', async () => {
    const promesa = auth.iniciarSesion('emilys', 'mala');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({ message: 'Invalid credentials' }, { status: 400, statusText: 'Bad Request' });

    await expect(promesa).rejects.toBeTruthy();
    expect(auth.autenticado()).toBe(false);
  });

  it('restaura la sesión guardada al reabrir la aplicación', async () => {
    const promesa = auth.iniciarSesion('emilys', 'emilyspass');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(respuestaLogin);
    await promesa;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const reabierto = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    await reabierto.restaurar();

    expect(reabierto.usuario()?.username).toBe('emilys');
  });

  it('renueva el token con el refresh token', async () => {
    const login = auth.iniciarSesion('emilys', 'emilyspass');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(respuestaLogin);
    await login;

    const renovacion = auth.renovar();
    const req = http.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(req.request.body.refreshToken).toBe('refresh-a');
    req.flush({ accessToken: 'token-b', refreshToken: 'refresh-b' });

    expect(await renovacion).toBe('token-b');
    expect(auth.sesion()?.refreshToken).toBe('refresh-b');
  });

  it('cierra la sesión si el refresh token ya no sirve', async () => {
    const login = auth.iniciarSesion('emilys', 'emilyspass');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(respuestaLogin);
    await login;

    const renovacion = auth.renovar();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({}, { status: 403, statusText: 'Forbidden' });

    expect(await renovacion).toBeNull();
    await esperar();
    expect(auth.autenticado()).toBe(false);
  });

  it('cerrar sesión borra la sesión guardada', async () => {
    const login = auth.iniciarSesion('emilys', 'emilyspass');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(respuestaLogin);
    await login;

    await auth.cerrarSesion();

    expect(auth.autenticado()).toBe(false);
    expect(localStorage.length).toBe(0);
  });
});
