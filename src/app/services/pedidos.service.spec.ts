import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { CarritoService } from './carrito.service';
import { leche, papa } from '../testing/datos';
import { PedidosService } from './pedidos.service';

describe('PedidosService', () => {
  let pedidos: PedidosService;
  let carrito: CarritoService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    pedidos = TestBed.inject(PedidosService);
    carrito = TestBed.inject(CarritoService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).sesion.set({
      accessToken: 't', refreshToken: 'r',
      usuario: { id: 1, username: 'emilys', email: '', firstName: 'Emily', lastName: 'Johnson', image: '' },
    });
  });

  afterEach(() => http.verify());

  it('envía el carrito al API, lo guarda en el historial y vacía el carrito', async () => {
    await carrito.agregar(papa, 2);
    await carrito.agregar(leche, 1);

    const confirmacion = pedidos.confirmar();
    const req = http.expectOne(`${environment.apiUrl}/carts/add`);
    expect(req.request.body).toEqual({
      userId: 1,
      products: [{ id: 35, quantity: 2 }, { id: 32, quantity: 1 }],
    });
    req.flush({ id: 51 });
    const pedido = await confirmacion;

    expect(pedido.numero).toBe(1);
    expect(pedido.referenciaApi).toBe(51);
    expect(pedido.total).toBe(2 * 9200 + 14000);
    expect(pedido.estimado).toBe(true);
    expect(pedidos.historial()[0].referenciaApi).toBe(51);
    expect(carrito.items()).toEqual([]);
  });

  it('si el API falla, el carrito se conserva', async () => {
    await carrito.agregar(leche, 2);

    const confirmacion = pedidos.confirmar();
    http.expectOne(`${environment.apiUrl}/carts/add`).error(new ProgressEvent('error'), { status: 0 });

    await expect(confirmacion).rejects.toBeTruthy();
    expect(carrito.cantidadDe(leche.id)).toBe(2);
    expect(pedidos.historial()).toEqual([]);
  });

  it('numera los pedidos en orden aunque el API repita el id', async () => {
    for (const esperado of [1, 2]) {
      await carrito.agregar(leche);
      const confirmacion = pedidos.confirmar();
      http.expectOne(`${environment.apiUrl}/carts/add`).flush({ id: 209 });
      expect((await confirmacion).numero).toBe(esperado);
    }
    expect(pedidos.historial().map((p) => p.numero)).toEqual([2, 1]);
  });

  it('no permite confirmar un carrito vacío', async () => {
    await expect(pedidos.confirmar()).rejects.toThrow();
  });
});
