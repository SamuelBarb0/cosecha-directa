import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { CatalogoService, adaptarProducto } from './catalogo.service';

const apiGroceries = {
  products: [
    { id: 16, title: 'Apple', price: 1.99, stock: 8, thumbnail: 'apple.webp' },
    { id: 18, title: 'Cat Food', price: 8.99, stock: 46, thumbnail: 'cat.webp' },
    { id: 32, title: 'Milk', price: 3.49, stock: 27, thumbnail: 'milk.webp' },
  ],
};
const urlCatalogo = `${environment.apiUrl}/products/category/groceries`;

describe('CatalogoService', () => {
  let catalogo: CatalogoService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    catalogo = TestBed.inject(CatalogoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('adapta un producto del API al catálogo en pesos colombianos', () => {
    const p = adaptarProducto(apiGroceries.products[0], 4000);

    expect(p?.nombre).toBe('Manzana roja');
    expect(p?.categoria).toBe('Frutas');
    expect(p?.precio).toBe(8000);
    expect(p?.pesoVariable).toBe(true);
  });

  it('descarta los productos que la tienda no vende', () => {
    expect(adaptarProducto(apiGroceries.products[1])).toBeNull();
  });

  it('carga el catálogo desde el API y lo guarda para uso sin conexión', async () => {
    const carga = catalogo.cargar();
    const req = http.expectOne((r) => r.url === urlCatalogo);
    expect(req.request.params.get('limit')).toBe('0');
    req.flush(apiGroceries);
    await carga;

    expect(catalogo.productos().map((p) => p.nombre)).toEqual(['Manzana roja', 'Leche entera']);
    expect(catalogo.sinConexion()).toBe(false);
    expect(localStorage.getItem('CapacitorStorage.catalogo')).toContain('Manzana roja');
  });

  it('sin conexión muestra el último catálogo guardado', async () => {
    const primera = catalogo.cargar();
    http.expectOne((r) => r.url === urlCatalogo).flush(apiGroceries);
    await primera;

    const segunda = catalogo.cargar();
    http.expectOne((r) => r.url === urlCatalogo).error(new ProgressEvent('error'), { status: 0 });
    await segunda;

    expect(catalogo.sinConexion()).toBe(true);
    expect(catalogo.productos().length).toBe(2);
  });

  it('busca por nombre o municipio y filtra por categoría', async () => {
    const carga = catalogo.cargar();
    http.expectOne((r) => r.url === urlCatalogo).flush(apiGroceries);
    await carga;

    expect(catalogo.buscar('manz', null).length).toBe(1);
    expect(catalogo.buscar('ubaté', null)[0].nombre).toBe('Leche entera');
    expect(catalogo.buscar('', 'Frutas').length).toBe(1);
    expect(catalogo.buscar('leche', 'Frutas').length).toBe(0);
  });
});
