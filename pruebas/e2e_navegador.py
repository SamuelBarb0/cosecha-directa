"""Prueba de extremo a extremo en el navegador (Playwright + Microsoft Edge).

Recorre el flujo completo de la tienda con el API real de DummyJSON y guarda
una captura por paso en pruebas/capturas-navegador/. Requiere la app servida con:
    npx ng serve --host 127.0.0.1 --port 4300
"""
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4300"
SALIDA = Path(__file__).parent / "capturas-navegador"
SALIDA.mkdir(exist_ok=True)
resultados = []


def paso(nombre, pagina, n):
    pagina.wait_for_timeout(600)
    pagina.screenshot(path=str(SALIDA / f"{n:02d}-{nombre}.png"))
    resultados.append(nombre)
    print(f"OK  {n:02d} {nombre}")


def escribir(pagina, selector, texto):
    campo = pagina.locator(f"{selector} input")
    campo.click()
    campo.fill(texto)


with sync_playwright() as p:
    navegador = p.chromium.launch(channel="msedge", headless=True)
    contexto = navegador.new_context(
        viewport={"width": 412, "height": 915}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="es-CO"
    )
    pagina = contexto.new_page()
    errores = []
    pagina.on("pageerror", lambda e: errores.append(str(e)))

    # 1. Sin sesión, cualquier ruta termina en el login
    pagina.goto(f"{URL}/tabs/carrito")
    expect(pagina).to_have_url(f"{URL}/login")
    paso("login", pagina, 1)

    # 2. Credenciales inválidas
    escribir(pagina, "[data-test=usuario]", "emilys")
    escribir(pagina, "[data-test=contrasena]", "clave-equivocada")
    pagina.click("[data-test=ingresar]")
    expect(pagina.locator("[data-test=error]")).to_have_text("Usuario o contraseña incorrectos.")
    paso("login-error", pagina, 2)

    # 3. Autenticación correcta contra /auth/login
    escribir(pagina, "[data-test=contrasena]", "emilyspass")
    with pagina.expect_response(lambda r: "/auth/login" in r.url and r.status == 200):
        pagina.click("[data-test=ingresar]")
    expect(pagina).to_have_url(f"{URL}/tabs/catalogo")
    expect(pagina.locator("[data-test=producto]").first).to_be_visible()
    total_productos = pagina.locator("[data-test=producto]").count()
    assert total_productos == 20, total_productos
    pagina.wait_for_load_state("networkidle")
    paso("catalogo", pagina, 3)

    # 4. Búsqueda por municipio
    pagina.locator("[data-test=buscar] input").fill("ubaté")
    pagina.wait_for_timeout(500)
    assert pagina.locator("[data-test=producto]").count() == 3
    paso("busqueda-ubate", pagina, 4)
    pagina.locator("[data-test=buscar] input").fill("")
    pagina.wait_for_timeout(500)

    # 5. Filtro por categoría
    pagina.locator("ion-chip", has_text="Frutas").click()
    pagina.wait_for_timeout(300)
    assert pagina.locator("[data-test=producto]").count() == 5
    paso("filtro-frutas", pagina, 5)

    # 6. Agregar desde el catálogo
    pagina.locator("[data-test=producto]", has_text="Fresa").locator("[data-test=agregar]").click()
    pagina.locator("[data-test=producto]", has_text="Manzana roja").locator("[data-test=agregar]").click()
    expect(pagina.locator("ion-tab-button[tab=carrito] ion-badge")).to_have_text("2")
    paso("agregado", pagina, 6)
    pagina.locator("ion-chip", has_text="Frutas").click()

    # 7. Ficha del producto y cantidad
    pagina.locator("[data-test=producto]", has_text="Leche entera").locator("ion-card-title").click()
    expect(pagina.locator("[data-test=nombre]")).to_have_text("Leche entera")
    pagina.click("[data-test=sumar]")
    pagina.click("[data-test=sumar]")
    expect(pagina.locator("[data-test=cantidad]")).to_have_text("2")
    paso("ficha-producto", pagina, 7)
    pagina.locator("ion-back-button").click()
    pagina.wait_for_timeout(500)

    # 8. Carrito con total estimado
    pagina.locator("ion-tab-button[tab=carrito]").click()
    expect(pagina.locator("[data-test=item-carrito]")).to_have_count(3)
    total = pagina.locator("[data-test=total]").inner_text()
    paso("carrito", pagina, 8)

    # 9. Persistencia: recargar la app conserva sesión y carrito
    pagina.reload()
    expect(pagina.locator("[data-test=item-carrito]")).to_have_count(3)
    assert pagina.locator("[data-test=total]").inner_text() == total
    guardado = pagina.evaluate("Object.keys(localStorage).filter(k => k.startsWith('CapacitorStorage.'))")
    assert {"CapacitorStorage.sesion", "CapacitorStorage.carrito", "CapacitorStorage.catalogo"} <= set(guardado), guardado
    paso("carrito-tras-recargar", pagina, 9)

    # 10. Confirmar pedido contra /carts/add
    with pagina.expect_response(lambda r: "/carts/add" in r.url and r.status == 201):
        pagina.click("[data-test=confirmar]")
    expect(pagina.locator("ion-alert")).to_contain_text("Pedido recibido")
    paso("pedido-confirmado", pagina, 10)
    pagina.locator("ion-alert button").click()

    # 11. Historial en Mi cuenta y carrito vacío
    expect(pagina.locator("[data-test=pedido]")).to_have_count(1)
    expect(pagina.locator("[data-test=nombre-usuario]")).to_have_text("Emily Johnson")
    paso("mi-cuenta", pagina, 11)

    # 12. Sin conexión: el catálogo sale del almacenamiento local
    contexto.route("https://dummyjson.com/products/**", lambda r: r.abort())
    pagina.goto(f"{URL}/tabs/catalogo")
    expect(pagina.locator("[data-test=sin-conexion]")).to_be_visible()
    assert pagina.locator("[data-test=producto]").count() == 20
    paso("sin-conexion", pagina, 12)
    contexto.unroute("https://dummyjson.com/products/**")

    # 13. Cerrar sesión borra la sesión y protege las rutas
    pagina.locator("ion-tab-button[tab=cuenta]").click()
    pagina.click("[data-test=salir]")
    expect(pagina).to_have_url(f"{URL}/login")
    pagina.goto(f"{URL}/tabs/catalogo")
    expect(pagina).to_have_url(f"{URL}/login")
    paso("sesion-cerrada", pagina, 13)

    navegador.close()

if errores:
    print("Errores de JavaScript en la página:", *errores, sep="\n  ")
    sys.exit(1)
print(f"\n{len(resultados)} pasos superados, sin errores de JavaScript.")
