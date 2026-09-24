import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { AuthService } from './services/auth.service';
import { CarritoService } from './services/carrito.service';
import { PedidosService } from './services/pedidos.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    inject(AuthService).restaurar();
    inject(CarritoService).restaurar();
    inject(PedidosService).restaurar();
  }
}
