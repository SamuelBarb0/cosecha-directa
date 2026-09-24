import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Pedido } from '../models/pedido';
import { AlmacenamientoService } from './almacenamiento.service';
import { AuthService } from './auth.service';
import { CarritoService } from './carrito.service';

const CLAVE_PEDIDOS = 'pedidos';

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private http = inject(HttpClient);
  private almacenamiento = inject(AlmacenamientoService);
  private auth = inject(AuthService);
  private carrito = inject(CarritoService);

  readonly historial = signal<Pedido[]>([]);

  async restaurar(): Promise<void> {
    this.historial.set((await this.almacenamiento.leer<Pedido[]>(CLAVE_PEDIDOS)) ?? []);
  }

  async confirmar(): Promise<Pedido> {
    const items = this.carrito.items();
    const usuario = this.auth.usuario();
    if (items.length === 0 || !usuario) {
      throw new Error('No hay productos en el carrito o no hay sesión activa.');
    }
    const r = await firstValueFrom(
      this.http.post<{ id: number }>(`${environment.apiUrl}/carts/add`, {
        userId: usuario.id,
        products: items.map((i) => ({ id: i.producto.id, quantity: i.cantidad })),
      }),
    );
    const pedido: Pedido = {
      numero: (this.historial()[0]?.numero ?? 0) + 1,
      referenciaApi: r.id,
      fecha: new Date().toISOString(),
      items,
      total: this.carrito.total(),
      estimado: this.carrito.tienePesoVariable(),
      estado: 'Recibido',
    };
    const historial = [pedido, ...this.historial()];
    await this.almacenamiento.guardar(CLAVE_PEDIDOS, historial);
    this.historial.set(historial);
    await this.carrito.vaciar();
    return pedido;
  }
}
