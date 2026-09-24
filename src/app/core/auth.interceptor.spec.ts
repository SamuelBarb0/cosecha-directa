import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;

  const peticion = async (url: string) => {
    for (let i = 0; i < 50; i++) {
      const [req] = backend.match(url);
      if (req) {
        return req;
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    throw new Error(`No llegó la petición a ${url}`);
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.sesion.set({
      accessToken: 'token-a', refreshToken: 'refresh-a',
      usuario: { id: 1, username: 'emilys', email: '', firstName: 'Emily', lastName: 'Johnson', image: '' },
    });
  });

  afterEach(() => backend.verify());

  it('agrega el token Bearer a las peticiones del API', () => {
    http.get(`${environment.apiUrl}/auth/me`).subscribe();

    const req = backend.expectOne(`${environment.apiUrl}/auth/me`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-a');
    req.flush({});
  });

  it('no envía el token a otros dominios', () => {
    http.get('https://cdn.dummyjson.com/imagen.webp').subscribe();

    const req = backend.expectOne('https://cdn.dummyjson.com/imagen.webp');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('ante un 401 renueva el token y repite la petición', async () => {
    const respuesta = firstValueFrom(http.get<{ ok: boolean }>(`${environment.apiUrl}/auth/me`));

    (await peticion(`${environment.apiUrl}/auth/me`)).flush({}, { status: 401, statusText: 'Unauthorized' });
    (await peticion(`${environment.apiUrl}/auth/refresh`)).flush({ accessToken: 'token-b', refreshToken: 'refresh-b' });
    const repetida = await peticion(`${environment.apiUrl}/auth/me`);
    expect(repetida.request.headers.get('Authorization')).toBe('Bearer token-b');
    repetida.flush({ ok: true });

    expect(await respuesta).toEqual({ ok: true });
  });
});
