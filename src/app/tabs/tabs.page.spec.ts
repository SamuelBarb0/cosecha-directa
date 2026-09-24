import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CarritoService } from '../services/carrito.service';
import { papa } from '../testing/datos';
import { TabsPage } from './tabs.page';

describe('TabsPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('muestra en la pestaña del carrito cuántos productos lleva', async () => {
    await TestBed.inject(CarritoService).agregar(papa, 3);
    const fixture = TestBed.createComponent(TabsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ion-badge')?.textContent.trim()).toBe('3');
  });
});
