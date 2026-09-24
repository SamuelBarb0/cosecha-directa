import { Injectable, computed, inject, signal } from '@angular/core';
import { ItemCarrito } from '../models/pedido';
import { Producto } from '../models/producto';
import { AlmacenamientoService } from './almacenamiento.service';

const CLAVE_CARRITO = 'carrito';

// Angular 22 funciona sin zone.js: el carrito vive en una señal y cada cambio
// reemplaza el arreglo completo (nunca se muta), para que la vista se repinte.
@Injectable({ providedIn: 'root' })
export class CarritoService {
  private almacenamiento = inject(AlmacenamientoService);

  readonly items = signal<ItemCarrito[]>([]);
  readonly cantidadTotal = computed(() => this.items().reduce((s, i) => s + i.cantidad, 0));
  readonly total = computed(() => this.items().reduce((s, i) => s + i.producto.precio * i.cantidad, 0));
  readonly tienePesoVariable = computed(() => this.items().some((i) => i.producto.pesoVariable));

  async restaurar(): Promise<void> {
    this.items.set((await this.almacenamiento.leer<ItemCarrito[]>(CLAVE_CARRITO)) ?? []);
  }

  cantidadDe(productoId: number): number {
    return this.items().find((i) => i.producto.id === productoId)?.cantidad ?? 0;
  }

  async agregar(producto: Producto, cantidad = 1): Promise<void> {
    const actual = this.cantidadDe(producto.id);
    await this.cambiarCantidad(producto, actual + cantidad);
  }

  async cambiarCantidad(producto: Producto, cantidad: number): Promise<void> {
    const limite = Math.min(Math.max(cantidad, 0), producto.existencias);
    const resto = this.items().filter((i) => i.producto.id !== producto.id);
    if (limite === 0) {
      await this.guardar(resto);
      return;
    }
    const existe = this.items().some((i) => i.producto.id === producto.id);
    const nuevos = existe
      ? this.items().map((i) => (i.producto.id === producto.id ? { ...i, cantidad: limite } : i))
      : [...this.items(), { producto, cantidad: limite }];
    await this.guardar(nuevos);
  }

  async quitar(productoId: number): Promise<void> {
    await this.guardar(this.items().filter((i) => i.producto.id !== productoId));
  }

  async vaciar(): Promise<void> {
    await this.guardar([]);
  }

  private async guardar(items: ItemCarrito[]): Promise<void> {
    this.items.set(items);
    await this.almacenamiento.guardar(CLAVE_CARRITO, items);
  }
}
