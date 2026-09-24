import { Component, inject } from '@angular/core';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cartOutline, personCircleOutline, storefrontOutline } from 'ionicons/icons';
import { CarritoService } from '../services/carrito.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
})
export class TabsPage {
  readonly carrito = inject(CarritoService);

  constructor() {
    addIcons({ storefrontOutline, cartOutline, personCircleOutline });
  }
}
