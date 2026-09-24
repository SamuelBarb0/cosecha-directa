import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Sesion, Usuario } from '../models/usuario';
import { AlmacenamientoService } from './almacenamiento.service';

interface RespuestaLogin extends Usuario {
  accessToken: string;
  refreshToken: string;
}

const CLAVE_SESION = 'sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private almacenamiento = inject(AlmacenamientoService);

  readonly sesion = signal<Sesion | null>(null);
  readonly autenticado = computed(() => this.sesion() !== null);
  readonly usuario = computed(() => this.sesion()?.usuario ?? null);

  private restaurada: Promise<void> | null = null;

  restaurar(): Promise<void> {
    this.restaurada ??= this.almacenamiento.leer<Sesion>(CLAVE_SESION).then((s) => this.sesion.set(s));
    return this.restaurada;
  }

  async iniciarSesion(usuario: string, contrasena: string): Promise<void> {
    const r = await firstValueFrom(
      this.http.post<RespuestaLogin>(`${environment.apiUrl}/auth/login`, {
        username: usuario.trim(),
        password: contrasena,
        expiresInMins: 30,
      }),
    );
    const sesion: Sesion = {
      accessToken: r.accessToken,
      refreshToken: r.refreshToken,
      usuario: {
        id: r.id,
        username: r.username,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        image: r.image,
      },
    };
    await this.almacenamiento.guardar(CLAVE_SESION, sesion);
    this.sesion.set(sesion);
  }

  async renovar(): Promise<string | null> {
    const actual = this.sesion();
    if (!actual) {
      return null;
    }
    try {
      const r = await firstValueFrom(
        this.http.post<{ accessToken: string; refreshToken: string }>(`${environment.apiUrl}/auth/refresh`, {
          refreshToken: actual.refreshToken,
          expiresInMins: 30,
        }),
      );
      const nueva = { ...actual, accessToken: r.accessToken, refreshToken: r.refreshToken };
      await this.almacenamiento.guardar(CLAVE_SESION, nueva);
      this.sesion.set(nueva);
      return nueva.accessToken;
    } catch {
      await this.cerrarSesion();
      return null;
    }
  }

  async cerrarSesion(): Promise<void> {
    await this.almacenamiento.borrar(CLAVE_SESION);
    this.sesion.set(null);
  }
}
