import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonIcon, IonInput, IonInputPasswordToggle, IonItem, IonList, IonNote, IonSpinner, IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { leafOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  imports: [FormsModule, IonContent, IonList, IonItem, IonInput, IonInputPasswordToggle, IonButton, IonText, IonNote, IonSpinner, IonIcon],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  usuario = '';
  contrasena = '';
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    addIcons({ leafOutline });
  }

  async ingresar(): Promise<void> {
    if (!this.usuario.trim() || !this.contrasena) {
      this.error.set('Escriba el usuario y la contraseña.');
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    try {
      await this.auth.iniciarSesion(this.usuario, this.contrasena);
      await this.router.navigateByUrl('/tabs/catalogo', { replaceUrl: true });
    } catch (e) {
      const status = e instanceof HttpErrorResponse ? e.status : -1;
      this.error.set(
        status === 400 || status === 401
          ? 'Usuario o contraseña incorrectos.'
          : 'No fue posible conectarse con el servidor. Revise su conexión a internet.',
      );
    } finally {
      this.enviando.set(false);
    }
  }
}
