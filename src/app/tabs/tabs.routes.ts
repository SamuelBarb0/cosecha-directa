import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'catalogo',
        loadComponent: () => import('../pages/catalogo/catalogo.page').then((m) => m.CatalogoPage),
      },
      {
        path: 'carrito',
        loadComponent: () => import('../pages/carrito/carrito.page').then((m) => m.CarritoPage),
      },
      {
        path: 'cuenta',
        loadComponent: () => import('../pages/cuenta/cuenta.page').then((m) => m.CuentaPage),
      },
      { path: '', redirectTo: '/tabs/catalogo', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: '/tabs/catalogo', pathMatch: 'full' },
];
