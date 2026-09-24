import { TestBed } from '@angular/core/testing';
import { leche, papa } from '../testing/datos';
import { CarritoService } from './carrito.service';

describe('CarritoService', () => {
  let carrito: CarritoService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    carrito = TestBed.inject(CarritoService);
  });

  it('agrega productos y acumula la cantidad del mismo producto', async () => {
    await carrito.agregar(papa);
    await carrito.agregar(papa);
    await carrito.agregar(leche);

    expect(carrito.items().length).toBe(2);
    expect(carrito.cantidadDe(papa.id)).toBe(2);
    expect(carrito.cantidadTotal()).toBe(3);
  });

  it('calcula el total con precio por cantidad', async () => {
    await carrito.agregar(papa, 2);
    await carrito.agregar(leche, 1);

    expect(carrito.total()).toBe(2 * 9200 + 14000);
  });

  it('no deja pedir más de las existencias disponibles', async () => {
    await carrito.agregar(papa, 50);

    expect(carrito.cantidadDe(papa.id)).toBe(papa.existencias);
  });

  it('retira el producto cuando la cantidad llega a cero', async () => {
    await carrito.agregar(leche, 1);
    await carrito.cambiarCantidad(leche, 0);

    expect(carrito.items()).toEqual([]);
  });

  it('advierte cuando hay productos de peso variable', async () => {
    await carrito.agregar(leche);
    expect(carrito.tienePesoVariable()).toBe(false);

    await carrito.agregar(papa);
    expect(carrito.tienePesoVariable()).toBe(true);
  });

  it('conserva el carrito en el almacenamiento local y lo recupera al reabrir', async () => {
    await carrito.agregar(papa, 3);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reabierto = TestBed.inject(CarritoService);
    expect(reabierto.items()).toEqual([]);

    await reabierto.restaurar();
    expect(reabierto.cantidadDe(papa.id)).toBe(3);
  });

  it('vacía el carrito y también lo borra del almacenamiento', async () => {
    await carrito.agregar(papa);
    await carrito.vaciar();
    await carrito.restaurar();

    expect(carrito.items()).toEqual([]);
  });
});
