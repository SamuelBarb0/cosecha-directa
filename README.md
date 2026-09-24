# Cosecha Directa — tienda en línea híbrida

Aplicación móvil híbrida de la tienda en línea **Cosecha Directa S.A.S.**, que vende productos
agrícolas del altiplano cundiboyacense con entrega a domicilio en Bogotá. Es el producto final
del proyecto ABP de la asignatura *Desarrollo de Aplicaciones Móviles Híbridas* (Fundación
Universitaria Compensar).

Una sola base de código en **Ionic 9 + Angular 22 + Capacitor 8** que se compila para Android e iOS.

| Requisito de la actividad | Dónde está |
|---|---|
| Autenticación | `src/app/services/auth.service.ts`, `core/auth.guard.ts`, `core/auth.interceptor.ts`, `pages/login` |
| Servicios API | `services/catalogo.service.ts` (catálogo), `services/pedidos.service.ts` (pedidos), `services/auth.service.ts` (login y renovación del token) |
| Carrito de compras | `services/carrito.service.ts`, `pages/carrito`, `pages/producto` |
| Almacenamiento local | `services/almacenamiento.service.ts` (Capacitor Preferences): sesión, carrito, historial de pedidos y catálogo sin conexión |

## Funcionalidades

- **Inicio de sesión** contra `POST /auth/login` del API (token JWT de acceso y de renovación).
  El interceptor adjunta el token a cada petición y, ante un `401`, lo renueva una vez con
  `POST /auth/refresh`. Las rutas de la tienda están protegidas por un guard.
- **Catálogo** desde `GET /products/category/groceries`, adaptado al surtido de la tienda
  (nombre en español, municipio de origen, unidad de venta, precio en pesos). Búsqueda por
  producto o municipio, filtro por categoría y ficha de cada producto.
- **Carrito**: agregar, cambiar cantidades (con tope en las existencias), quitar y total.
  Advierte cuando hay productos de peso variable, cuyo valor es estimado.
- **Pedido**: se envía a `POST /carts/add` y queda en el historial de «Mi cuenta».
- **Sin conexión**: si el API no responde, el catálogo se muestra desde la última copia guardada.
- **Persistencia**: la sesión, el carrito y el historial sobreviven al cierre de la app.

**API:** [DummyJSON](https://dummyjson.com). Cuenta de demostración: `emilys` / `emilyspass`.

## Ejecutar en desarrollo

```bash
npm install --legacy-peer-deps
npx ng serve            # http://localhost:4200
```

`--legacy-peer-deps` evita un fallo de npm 10 al resolver las dependencias de vitest; no
afecta a las dependencias de la app.

## Pruebas

```bash
npx ng test --watch=false             # 33 pruebas unitarias y de integración (Vitest)
npx ng test --watch=false --coverage  # con reporte de cobertura
npx ng lint
```

Pruebas de extremo a extremo (Python + Playwright + Microsoft Edge):

```bash
npx ng serve --host 127.0.0.1 --port 4300
python pruebas/e2e_navegador.py       # 13 pasos en el navegador
python pruebas/e2e_emulador.py        # 8 pasos en el emulador de Android (compilación debug instalada)
```

Las capturas quedan en `pruebas/capturas-navegador/` y `pruebas/capturas-emulador/`.

## Compilar para Android

```bash
npx ng build
npx cap sync android
cd android
./gradlew assembleDebug                    # APK de depuración
./gradlew bundleRelease assembleRelease    # AAB y APK firmados para producción
```

Gradle necesita `JAVA_HOME` (el `jbr` de Android Studio) y `ANDROID_HOME` (el SDK).

La firma de producción lee `android/keystore.properties`, que **no está en el repositorio**
(tampoco la llave). Para compilar con una llave propia, se copia
`android/keystore.properties.example` a `android/keystore.properties` y se completan los datos.
Sin ese archivo, `bundleRelease` genera el paquete sin firmar.

Resultado: `android/app/build/outputs/bundle/release/app-release.aab`, el archivo que se sube
a Google Play Console.

## Compilar para iOS

La compilación de iOS requiere macOS con Xcode:

```bash
npx ng build
npx cap sync ios
npx cap open ios        # abre ios/App/App.xcodeproj en Xcode
```

En Xcode: seleccionar el equipo de firma (Apple Developer Program), luego
**Product → Archive** y, en el Organizer, **Distribute App → App Store Connect**.

## Estructura

```
src/app/
  core/        guard de autenticación e interceptor HTTP
  models/      Producto, Pedido, Usuario
  services/    almacenamiento, auth, catálogo, carrito, pedidos
  pages/       login, catálogo, producto, carrito, cuenta
  tabs/        barra de pestañas
pruebas/       pruebas de extremo a extremo y capturas
assets/        fuentes del ícono y la pantalla de inicio
android/ ios/  proyectos nativos generados por Capacitor
```

---

Samuel Felipe Barbosa Ríos — Ingeniería de Software, Fundación Universitaria Compensar, 2026.
