import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria, Producto } from '../models/producto';
import { AlmacenamientoService } from './almacenamiento.service';

interface ProductoApi {
  id: number;
  title: string;
  price: number;
  stock: number;
  thumbnail: string;
}

interface Ficha {
  nombre: string;
  descripcion: string;
  categoria: Categoria;
  origen: string;
  unidad: string;
  pesoVariable: boolean;
}

// La API entrega un catálogo genérico en inglés y en dólares. Esta tabla lo adapta
// al surtido de Cosecha Directa: nombre, categoría, municipio de origen y unidad de venta.
// Los productos de la API que no están en la tabla (comida de mascotas, papel, gaseosas)
// quedan fuera del catálogo.
export const FICHAS: Record<number, Ficha> = {
  16: { nombre: 'Manzana roja', descripcion: 'Manzana crocante y dulce, ideal para lonchera o postres.', categoria: 'Frutas', origen: 'Nuevo Colón', unidad: 'kg', pesoVariable: true },
  17: { nombre: 'Lomo de res', descripcion: 'Corte magro de res criada en pastoreo.', categoria: 'Proteínas', origen: 'Ubaté', unidad: 'kg', pesoVariable: true },
  19: { nombre: 'Pechuga de pollo campesino', descripcion: 'Pollo de granja alimentado con maíz.', categoria: 'Proteínas', origen: 'Chocontá', unidad: 'kg', pesoVariable: true },
  20: { nombre: 'Aceite de cocina', descripcion: 'Aceite vegetal para freír y cocinar.', categoria: 'Abarrotes', origen: 'Bogotá', unidad: 'botella 1 L', pesoVariable: false },
  21: { nombre: 'Pepino cohombro', descripcion: 'Pepino fresco para ensaladas y jugos.', categoria: 'Verduras', origen: 'Villapinzón', unidad: 'kg', pesoVariable: true },
  23: { nombre: 'Huevos AA', descripcion: 'Huevos de gallinas en pastoreo, tamaño AA.', categoria: 'Lácteos y huevos', origen: 'Chocontá', unidad: 'cubeta x 30', pesoVariable: false },
  24: { nombre: 'Filete de trucha', descripcion: 'Trucha arcoíris de estanques de agua fría.', categoria: 'Proteínas', origen: 'Guatavita', unidad: 'kg', pesoVariable: true },
  25: { nombre: 'Pimentón verde', descripcion: 'Pimentón firme y aromático.', categoria: 'Verduras', origen: 'Villapinzón', unidad: 'kg', pesoVariable: true },
  26: { nombre: 'Ají verde', descripcion: 'Ají picante para salsas y guisos.', categoria: 'Verduras', origen: 'Villapinzón', unidad: 'libra', pesoVariable: false },
  27: { nombre: 'Miel de abejas', descripcion: 'Miel pura de apiarios del altiplano.', categoria: 'Abarrotes', origen: 'Sesquilé', unidad: 'frasco 500 g', pesoVariable: false },
  29: { nombre: 'Jugo de naranja', descripcion: 'Jugo natural sin azúcar añadida.', categoria: 'Abarrotes', origen: 'Bogotá', unidad: 'botella 1 L', pesoVariable: false },
  30: { nombre: 'Kiwi', descripcion: 'Kiwi maduro, rico en vitamina C.', categoria: 'Frutas', origen: 'Nuevo Colón', unidad: 'kg', pesoVariable: true },
  31: { nombre: 'Limón Tahití', descripcion: 'Limón jugoso para bebidas y aderezos.', categoria: 'Frutas', origen: 'Ubaté', unidad: 'kg', pesoVariable: true },
  32: { nombre: 'Leche entera', descripcion: 'Leche fresca pasteurizada de hatos lecheros.', categoria: 'Lácteos y huevos', origen: 'Ubaté', unidad: 'bolsa 1 L', pesoVariable: false },
  33: { nombre: 'Mora de Castilla', descripcion: 'Mora fresca para jugos y postres.', categoria: 'Frutas', origen: 'Chocontá', unidad: 'libra', pesoVariable: false },
  35: { nombre: 'Papa pastusa', descripcion: 'Papa de cosecha reciente, ideal para sopas.', categoria: 'Verduras', origen: 'Villapinzón', unidad: 'kg', pesoVariable: true },
  37: { nombre: 'Cebolla cabezona roja', descripcion: 'Cebolla morada de sabor suave.', categoria: 'Verduras', origen: 'Chocontá', unidad: 'kg', pesoVariable: true },
  38: { nombre: 'Arroz blanco', descripcion: 'Arroz de grano largo.', categoria: 'Abarrotes', origen: 'Bogotá', unidad: 'bolsa 1 kg', pesoVariable: false },
  40: { nombre: 'Fresa', descripcion: 'Fresa dulce cultivada sin invernadero.', categoria: 'Frutas', origen: 'Sibaté', unidad: 'libra', pesoVariable: false },
  42: { nombre: 'Agua de manantial', descripcion: 'Agua natural embotellada.', categoria: 'Abarrotes', origen: 'Chocontá', unidad: 'botella 600 ml', pesoVariable: false },
};

const CLAVE_CACHE = 'catalogo';

export function adaptarProducto(p: ProductoApi, tasa = environment.tasaUsdCop): Producto | null {
  const ficha = FICHAS[p.id];
  if (!ficha) {
    return null;
  }
  return {
    id: p.id,
    ...ficha,
    precio: Math.round((p.price * tasa) / 100) * 100,
    existencias: p.stock,
    imagen: p.thumbnail,
  };
}

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);
  private almacenamiento = inject(AlmacenamientoService);

  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(false);
  readonly sinConexion = signal(false);
  readonly categorias = computed(() => [...new Set(this.productos().map((p) => p.categoria))]);

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const respuesta = await firstValueFrom(
        this.http.get<{ products: ProductoApi[] }>(`${environment.apiUrl}/products/category/groceries`, {
          params: { limit: 0, select: 'title,price,stock,thumbnail' },
        }),
      );
      const productos = respuesta.products
        .map((p) => adaptarProducto(p))
        .filter((p): p is Producto => p !== null);
      this.productos.set(productos);
      this.sinConexion.set(false);
      await this.almacenamiento.guardar(CLAVE_CACHE, productos);
    } catch {
      const enCache = await this.almacenamiento.leer<Producto[]>(CLAVE_CACHE);
      this.productos.set(enCache ?? []);
      this.sinConexion.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  buscar(texto: string, categoria: string | null): Producto[] {
    const consulta = texto.trim().toLowerCase();
    return this.productos().filter(
      (p) =>
        (!categoria || p.categoria === categoria) &&
        (consulta.length === 0 ||
          p.nombre.toLowerCase().includes(consulta) ||
          p.origen.toLowerCase().includes(consulta)),
    );
  }

  porId(id: number): Producto | undefined {
    return this.productos().find((p) => p.id === id);
  }
}
