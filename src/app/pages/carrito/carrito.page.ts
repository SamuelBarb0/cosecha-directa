import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController, IonButton, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonItemOption, IonItemOptions,
  IonItemSliding, IonLabel, IonList, IonNote, IonSpinner, IonThumbnail, IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, cartOutline, removeOutline, trashOutline } from 'ionicons/icons';
import { ItemCarrito } from '../../models/pedido';
import { CarritoService } from '../../services/carrito.service';
import { PedidosService } from '../../services/pedidos.service';

@Component({
  selector: 'app-carrito',
  templateUrl: 'carrito.page.html',
  styleUrls: ['carrito.page.scss'],
  imports: [
    CurrencyPipe, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonItemSliding, IonItemOptions,
    IonItemOption, IonThumbnail, IonLabel, IonNote, IonButton, IonIcon, IonFooter, IonSpinner,
  ],
})
export class CarritoPage {
  readonly carrito = inject(CarritoService);
  private pedidos = inject(PedidosService);
  private alertas = inject(AlertController);
  private router = inject(Router);

  readonly confirmando = signal(false);

  constructor() {
    addIcons({ addOutline, removeOutline, trashOutline, cartOutline });
  }

  cambiar(item: ItemCarrito, delta: number): Promise<void> {
    return this.carrito.cambiarCantidad(item.producto, item.cantidad + delta);
  }

  quitar(item: ItemCarrito): Promise<void> {
    return this.carrito.quitar(item.producto.id);
  }

  async confirmar(): Promise<void> {
    this.confirmando.set(true);
    try {
      const pedido = await this.pedidos.confirmar();
      const alerta = await this.alertas.create({
        header: 'Pedido recibido',
        message: `Su pedido n.º ${pedido.numero} quedó registrado. Puede consultarlo en «Mi cuenta».`,
        buttons: ['Aceptar'],
      });
      await alerta.present();
      await this.router.navigateByUrl('/tabs/cuenta');
    } catch {
      const alerta = await this.alertas.create({
        header: 'No se pudo enviar el pedido',
        message: 'Revise su conexión a internet e intente de nuevo. Su carrito sigue guardado.',
        buttons: ['Aceptar'],
      });
      await alerta.present();
    } finally {
      this.confirmando.set(false);
    }
  }
}
