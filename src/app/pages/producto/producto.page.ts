import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote,
  IonTitle, IonToolbar, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline, scaleOutline } from 'ionicons/icons';
import { CarritoService } from '../../services/carrito.service';
import { CatalogoService } from '../../services/catalogo.service';

@Component({
  selector: 'app-producto',
  templateUrl: 'producto.page.html',
  styleUrls: ['producto.page.scss'],
  imports: [
    CurrencyPipe, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonNote,
    IonButton, IonIcon, IonFooter,
  ],
})
export class ProductoPage {
  private catalogo = inject(CatalogoService);
  readonly carrito = inject(CarritoService);
  private toast = inject(ToastController);

  readonly id = input.required<string>();
  readonly producto = computed(() => this.catalogo.porId(Number(this.id())));
  readonly enCarrito = computed(() => {
    const p = this.producto();
    return p ? this.carrito.cantidadDe(p.id) : 0;
  });

  constructor() {
    addIcons({ addOutline, removeOutline, scaleOutline });
    if (this.catalogo.productos().length === 0) {
      this.catalogo.cargar();
    }
  }

  async cambiar(delta: number): Promise<void> {
    const p = this.producto();
    if (!p) {
      return;
    }
    await this.carrito.cambiarCantidad(p, this.enCarrito() + delta);
    if (delta > 0 && this.enCarrito() === 1) {
      const t = await this.toast.create({ message: `${p.nombre} agregado al carrito`, duration: 1200, position: 'top' });
      await t.present();
    }
  }
}
