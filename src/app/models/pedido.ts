import { Producto } from './producto';

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

export interface Pedido {
  numero: number;
  referenciaApi: number;
  fecha: string;
  items: ItemCarrito[];
  total: number;
  estimado: boolean;
  estado: 'Recibido';
}
