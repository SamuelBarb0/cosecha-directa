import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonChip, IonCol, IonContent,
  IonGrid, IonHeader, IonIcon, IonLabel, IonNote, IonRefresher, IonRefresherContent, IonRow, IonSearchbar, IonSpinner,
  IonTitle, IonToolbar, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline, cloudOfflineOutline } from 'ionicons/icons';
import { Producto } from '../../models/producto';
import { CarritoService } from '../../services/carrito.service';
import { CatalogoService } from '../../services/catalogo.service';

@Component({
  selector: 'app-catalogo',
  templateUrl: 'catalogo.page.html',
  styleUrls: ['catalogo.page.scss'],
  imports: [
    CurrencyPipe, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonChip, IonLabel, IonGrid, IonRow,
    IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonButton, IonIcon, IonSpinner, IonNote,
    IonBadge, IonRefresher, IonRefresherContent,
  ],
})
export class CatalogoPage {
  readonly catalogo = inject(CatalogoService);
  readonly carrito = inject(CarritoService);
  private toast = inject(ToastController);

  readonly texto = signal('');
  readonly categoria = signal<string | null>(null);
  readonly visibles = computed(() => this.catalogo.buscar(this.texto(), this.categoria()));

  constructor() {
    addIcons({ addCircleOutline, cloudOfflineOutline });
    if (this.catalogo.productos().length === 0) {
      this.catalogo.cargar();
    }
  }

  alternarCategoria(c: string): void {
    this.categoria.set(this.categoria() === c ? null : c);
  }

  alBuscar(evento: Event): void {
    this.texto.set((evento as CustomEvent<{ value?: string | null }>).detail.value ?? '');
  }

  async refrescar(evento: Event): Promise<void> {
    await this.catalogo.cargar();
    await (evento.target as HTMLIonRefresherElement).complete();
  }

  async agregar(p: Producto, evento: Event): Promise<void> {
    evento.stopPropagation();
    evento.preventDefault();
    await this.carrito.agregar(p);
    const t = await this.toast.create({ message: `${p.nombre} agregado al carrito`, duration: 1200, position: 'top' });
    await t.present();
  }
}
