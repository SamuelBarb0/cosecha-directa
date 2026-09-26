import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({ providedIn: 'root' })
export class AlmacenamientoService {
  async guardar<T>(clave: string, valor: T): Promise<void> {
    await Preferences.set({ key: clave, value: JSON.stringify(valor) });
  }

  async leer<T>(clave: string): Promise<T | null> {
    const { value } = await Preferences.get({ key: clave });
    if (value === null) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async borrar(clave: string): Promise<void> {
    await Preferences.remove({ key: clave });
  }
}
