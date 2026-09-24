import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonAvatar, IonBadge, IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonNote,
  IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline, receiptOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { PedidosService } from '../../services/pedidos.service';

@Component({
  selector: 'app-cuenta',
  templateUrl: 'cuenta.page.html',
  styleUrls: ['cuenta.page.scss'],
  imports: [
    CurrencyPipe, DatePipe, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonListHeader, IonItem, IonAvatar,
    IonLabel, IonNote, IonBadge, IonButton, IonIcon,
  ],
})
export class CuentaPage {
  readonly auth = inject(AuthService);
  readonly pedidos = inject(PedidosService);
  private router = inject(Router);

  constructor() {
    addIcons({ logOutOutline, receiptOutline });
  }

  async salir(): Promise<void> {
    await this.auth.cerrarSesion();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
