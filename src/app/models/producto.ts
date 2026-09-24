export type Categoria = 'Frutas' | 'Verduras' | 'Lácteos y huevos' | 'Proteínas' | 'Abarrotes';

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: Categoria;
  origen: string;
  unidad: string;
  pesoVariable: boolean;
  precio: number;
  existencias: number;
  imagen: string;
}
