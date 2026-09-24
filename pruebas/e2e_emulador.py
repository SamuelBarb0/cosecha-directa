"""Prueba de extremo a extremo en el emulador de Android.

Instala la app en el emulador, se conecta al WebView por el protocolo de
depuración de Chrome (solo disponible en la compilación debug) y recorre el
flujo completo. Las capturas se toman con `adb screencap`, así que muestran la
pantalla real del teléfono, con barra de estado y todo.
"""
import os
import re
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ADB = os.path.expandvars(r"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe")
PAQUETE = "co.cosechadirecta.tienda"
PUERTO = 9333
SALIDA = Path(__file__).parent / "capturas-emulador"
SALIDA.mkdir(exist_ok=True)


def adb(*args, check=True):
    return subprocess.run([ADB, *args], capture_output=True, text=True, check=check).stdout


def captura(nombre, n):
    time.sleep(0.8)
    destino = SALIDA / f"{n:02d}-{nombre}.png"
    with open(destino, "wb") as f:
        subprocess.run([ADB, "exec-out", "screencap", "-p"], stdout=f, check=True)
    print(f"OK  {n:02d} {nombre}")


def abrir_app():
    adb("shell", "am", "start", "-n", f"{PAQUETE}/.MainActivity")
    pid = None
    for _ in range(40):
        pid = adb("shell", "pidof", PAQUETE, check=False).strip()
        if pid and f"webview_devtools_remote_{pid}" in adb("shell", "cat", "/proc/net/unix"):
            break
        time.sleep(0.5)
    adb("forward", f"tcp:{PUERTO}", f"localabstract:webview_devtools_remote_{pid}")
    return pid


def conectar(p):
    for _ in range(20):
        try:
            navegador = p.chromium.connect_over_cdp(f"http://127.0.0.1:{PUERTO}")
            for contexto in navegador.contexts:
                for pagina in contexto.pages:
                    if pagina.url.startswith("https://localhost"):
                        return navegador, pagina
            navegador.close()
        except Exception:
            pass
        time.sleep(0.5)
    raise RuntimeError("No se encontró el WebView de la app")


def escribir(pagina, selector, texto):
    campo = pagina.locator(f"{selector} input")
    campo.click()
    campo.fill(texto)


version = adb("shell", "getprop", "ro.build.version.release").strip()
modelo = adb("shell", "getprop", "ro.product.model").strip()
print(f"Dispositivo: {modelo}, Android {version}")

adb("shell", "pm", "clear", PAQUETE)
abrir_app()

with sync_playwright() as p:
    navegador, pagina = conectar(p)
    expect(pagina).to_have_url(re.compile(r"/login$"), timeout=15000)
    captura("login", 1)

    escribir(pagina, "[data-test=usuario]", "emilys")
    escribir(pagina, "[data-test=contrasena]", "emilyspass")
    adb("shell", "input", "keyevent", "KEYCODE_BACK")
    pagina.click("[data-test=ingresar]")
    expect(pagina).to_have_url(re.compile(r"/tabs/catalogo$"), timeout=20000)
    expect(pagina.locator("[data-test=producto]").first).to_be_visible(timeout=20000)
    assert pagina.locator("[data-test=producto]").count() == 20
    pagina.wait_for_load_state("networkidle")
    time.sleep(1.5)
    captura("catalogo", 2)

    pagina.locator("[data-test=producto]", has_text="Papa pastusa").locator("[data-test=agregar]").click()
    pagina.locator("[data-test=producto]", has_text="Huevos AA").locator("[data-test=agregar]").click()
    expect(pagina.locator("ion-tab-button[tab=carrito] ion-badge")).to_have_text("2")

    pagina.locator("[data-test=producto]", has_text="Lomo de res").locator("ion-card-title").click()
    expect(pagina.locator("[data-test=nombre]")).to_have_text("Lomo de res")
    pagina.click("[data-test=sumar]")
    expect(pagina.locator("[data-test=peso-variable]")).to_be_visible()
    expect(pagina.locator("ion-toast")).to_have_count(0, timeout=5000)
    captura("ficha-producto", 3)
    adb("shell", "input", "keyevent", "KEYCODE_BACK")
    time.sleep(1)

    pagina.locator("ion-tab-button[tab=carrito]").click()
    expect(pagina.locator("[data-test=item-carrito]")).to_have_count(3)
    total = pagina.locator("[data-test=total]").inner_text()
    captura("carrito", 4)
    navegador.close()

# Persistencia real: se mata el proceso y se vuelve a abrir la app
adb("shell", "am", "force-stop", PAQUETE)
time.sleep(1)
pid_nuevo = abrir_app()
print(f"App reabierta (pid {pid_nuevo})")

with sync_playwright() as p:
    navegador, pagina = conectar(p)
    expect(pagina).to_have_url(re.compile(r"/tabs/catalogo$"), timeout=15000)
    pagina.locator("ion-tab-button[tab=carrito]").click()
    expect(pagina.locator("[data-test=item-carrito]")).to_have_count(3)
    assert pagina.locator("[data-test=total]").inner_text() == total
    captura("carrito-tras-reabrir", 5)

    pagina.click("[data-test=confirmar]")
    expect(pagina.locator("ion-alert")).to_contain_text("Pedido recibido", timeout=20000)
    captura("pedido-confirmado", 6)
    pagina.locator("ion-alert button").click()

    expect(pagina.locator("[data-test=pedido]")).to_have_count(1)
    captura("mi-cuenta", 7)

    pagina.click("[data-test=salir]")
    expect(pagina).to_have_url(re.compile(r"/login$"))
    captura("sesion-cerrada", 8)
    navegador.close()

prefs = adb("shell", "run-as", PAQUETE, "cat", "shared_prefs/CapacitorStorage.xml")
claves = sorted(set(re.findall(r'name="([^"]+)"', prefs)))
print("Claves en SharedPreferences tras cerrar sesión:", claves)
assert "sesion" not in claves and "pedidos" in claves

adb("forward", "--remove", f"tcp:{PUERTO}")
print("\nFlujo completo superado en el emulador.")
