import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  it('pide usuario y contraseña antes de llamar al API', async () => {
    const pagina = TestBed.createComponent(LoginPage).componentInstance;

    await pagina.ingresar();

    expect(pagina.error()).toBe('Escriba el usuario y la contraseña.');
    http.expectNone(`${environment.apiUrl}/auth/login`);
  });

  it('muestra un mensaje claro si las credenciales son incorrectas', async () => {
    const pagina = TestBed.createComponent(LoginPage).componentInstance;
    pagina.usuario = 'emilys';
    pagina.contrasena = 'mala';

    const intento = pagina.ingresar();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({}, { status: 400, statusText: 'Bad Request' });
    await intento;

    expect(pagina.error()).toBe('Usuario o contraseña incorrectos.');
    expect(pagina.enviando()).toBe(false);
  });

  it('distingue la falta de conexión de un error de credenciales', async () => {
    const pagina = TestBed.createComponent(LoginPage).componentInstance;
    pagina.usuario = 'emilys';
    pagina.contrasena = 'emilyspass';

    const intento = pagina.ingresar();
    http.expectOne(`${environment.apiUrl}/auth/login`).error(new ProgressEvent('error'), { status: 0 });
    await intento;

    expect(pagina.error()).toContain('No fue posible conectarse');
  });
});
