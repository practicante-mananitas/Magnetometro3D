from sensor import Sensor
from printer import Printer

import random
import csv
import os
import time
import json
import urllib.request
import urllib.error


# ============================================
# RUTAS DEL PROYECTO
# ============================================

SOFTWARE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

PROJECT_DIR = os.path.abspath(
    os.path.join(
        SOFTWARE_DIR,
        ".."
    )
)

DATA_DIR = os.path.join(
    PROJECT_DIR,
    "datos"
)

CSV_FILE = os.path.join(
    DATA_DIR,
    "escaneo.csv"
)

STOP_FILE = os.path.join(
    PROJECT_DIR,
    "backend",
    "storage",
    "app",
    "scan_stop.flag"
)

CONFIG_FILE = os.path.join(
    PROJECT_DIR,
    "backend",
    "storage",
    "app",
    "scan_config.json"
)


# ============================================
# CONFIGURACIÓN DE LARAVEL
# ============================================

LARAVEL_API = (
    "http://127.0.0.1:8000/api"
)

LARAVEL_TIMEOUT = 1.0


# ============================================
# EXCEPCIONES
# ============================================

class EscaneoDetenido(Exception):
    pass


class ConfiguracionEscaneoError(Exception):
    pass


# ============================================
# LEER CONFIGURACIÓN DEL HUD
# ============================================

def cargar_configuracion():

    print(
        "\n"
        "[CONFIG] Cargando configuración "
        "del HUD..."
    )

    if not os.path.exists(
        CONFIG_FILE
    ):

        raise ConfiguracionEscaneoError(
            "No existe scan_config.json. "
            "Inicia el escaneo desde el HUD."
        )


    try:

        with open(
            CONFIG_FILE,
            "r",
            encoding="utf-8"
        ) as archivo:

            config = json.load(
                archivo
            )

    except json.JSONDecodeError as error:

        raise ConfiguracionEscaneoError(
            "scan_config.json no contiene "
            "JSON válido."
        ) from error

    except OSError as error:

        raise ConfiguracionEscaneoError(
            "No se pudo abrir "
            "scan_config.json."
        ) from error


    # ========================================
    # CAMPOS OBLIGATORIOS
    # ========================================

    campos = [
        "xStart",
        "xEnd",
        "yStart",
        "yEnd",
        "z",
        "step"
    ]


    for campo in campos:

        if campo not in config:

            raise ConfiguracionEscaneoError(
                f"Falta '{campo}' en "
                "scan_config.json."
            )


    # ========================================
    # CONVERTIR A NÚMEROS
    # ========================================

    try:

        x_inicio = float(
            config["xStart"]
        )

        x_max = float(
            config["xEnd"]
        )

        y_inicio = float(
            config["yStart"]
        )

        y_max = float(
            config["yEnd"]
        )

        altura = float(
            config["z"]
        )

        paso = float(
            config["step"]
        )

    except (
        TypeError,
        ValueError
    ) as error:

        raise ConfiguracionEscaneoError(
            "La configuración contiene "
            "valores no numéricos."
        ) from error


    # ========================================
    # VALIDACIONES
    # ========================================

    if paso <= 0:

        raise ConfiguracionEscaneoError(
            "El paso debe ser mayor que 0."
        )


    if x_max < x_inicio:

        raise ConfiguracionEscaneoError(
            "X final no puede ser menor "
            "que X inicial."
        )


    if y_max < y_inicio:

        raise ConfiguracionEscaneoError(
            "Y final no puede ser menor "
            "que Y inicial."
        )


    # ========================================
    # INFORMACIÓN EN CONSOLA
    # ========================================

    print(
        "[CONFIG] Configuración recibida:"
    )

    print(
        f"         X: {x_inicio} "
        f"-> {x_max} mm"
    )

    print(
        f"         Y: {y_inicio} "
        f"-> {y_max} mm"
    )

    print(
        f"         Z: {altura} mm"
    )

    print(
        f"         Paso: {paso} mm"
    )


    return {
        "x_inicio": x_inicio,
        "x_max": x_max,

        "y_inicio": y_inicio,
        "y_max": y_max,

        "altura": altura,

        "paso": paso
    }


# ============================================
# GENERAR POSICIONES DE UN EJE
# ============================================

def generar_posiciones(
    inicio,
    fin,
    paso
):

    posiciones = []

    actual = inicio

    tolerancia = 1e-9


    while (
        actual <=
        fin + tolerancia
    ):

        posiciones.append(
            round(
                actual,
                6
            )
        )

        actual += paso


    return posiciones


# ============================================
# VERIFICAR PARADA
# ============================================

def verificar_parada():

    if os.path.exists(
        STOP_FILE
    ):

        print(
            "\n"
            "[STOP] Solicitud de parada "
            "recibida desde el HUD."
        )

        raise EscaneoDetenido()


# ============================================
# LIMPIAR BANDERA DE PARADA
# ============================================

def limpiar_bandera_parada():

    if not os.path.exists(
        STOP_FILE
    ):

        return


    try:

        os.remove(
            STOP_FILE
        )

        print(
            "[STOP] Bandera de parada "
            "eliminada."
        )

    except OSError as error:

        print(
            "[STOP] No se pudo eliminar "
            "la bandera de parada:"
        )

        print(
            error
        )


# ============================================
# ENVIAR POST A LARAVEL
# ============================================

def post_laravel(
    endpoint,
    datos=None
):

    if datos is None:

        datos = {}


    url = (
        f"{LARAVEL_API}"
        f"{endpoint}"
    )


    cuerpo = json.dumps(
        datos
    ).encode(
        "utf-8"
    )


    request = urllib.request.Request(
        url,

        data=cuerpo,

        headers={
            "Content-Type":
                "application/json",

            "Accept":
                "application/json"
        },

        method="POST"
    )


    try:

        with urllib.request.urlopen(
            request,
            timeout=LARAVEL_TIMEOUT
        ) as response:

            contenido = (
                response
                .read()
                .decode(
                    "utf-8"
                )
            )


            if not contenido:

                return None


            return json.loads(
                contenido
            )


    except urllib.error.HTTPError as error:

        print(
            "[LIVE] Error HTTP Laravel: "
            f"{error.code}"
        )


    except urllib.error.URLError as error:

        print(
            "[LIVE] Laravel no disponible: "
            f"{error.reason}"
        )


    except TimeoutError:

        print(
            "[LIVE] Laravel tardó demasiado "
            "en responder."
        )


    except Exception as error:

        print(
            "[LIVE] Error enviando datos: "
            f"{error}"
        )


    return None


# ============================================
# INICIAR ESCANEO LIVE
# ============================================

def iniciar_live():

    print(
        "\n"
        "[LIVE] Preparando escaneo "
        "en Laravel..."
    )


    respuesta = post_laravel(
        "/scan/live/reset"
    )


    if respuesta:

        print(
            "[LIVE] Laravel listo para "
            "recibir mediciones."
        )

        return True


    print(
        "[LIVE] No se pudo iniciar "
        "la sesión en Laravel."
    )

    print(
        "[LIVE] El CSV seguirá "
        "guardándose normalmente."
    )


    return False


# ============================================
# ENVIAR MEDICIÓN LIVE
# ============================================

def enviar_medicion_live(
    x,
    y,
    z,
    bx,
    by,
    bz,
    b
):

    datos = {

        "x":
            float(x),

        "y":
            float(y),

        "z":
            float(z),

        "bx":
            float(bx),

        "by":
            float(by),

        "bz":
            float(bz),

        "b":
            float(b)
    }


    respuesta = post_laravel(
        "/scan/live/measurement",
        datos
    )


    if respuesta:

        medicion = respuesta.get(
            "measurement",
            {}
        )


        indice = medicion.get(
            "index",
            "?"
        )


        print(
            "[LIVE] Medición "
            f"{indice} enviada."
        )


        return True


    return False


# ============================================
# FINALIZAR LIVE
# ============================================

def finalizar_live():

    print(
        "\n"
        "[LIVE] Finalizando escaneo..."
    )


    respuesta = post_laravel(
        "/scan/live/finish"
    )


    if respuesta:

        cantidad = respuesta.get(
            "count",
            0
        )


        print(
            "[LIVE] Escaneo finalizado "
            f"con {cantidad} mediciones."
        )


        return True


    print(
        "[LIVE] No se pudo notificar "
        "el final del escaneo."
    )


    return False


# ============================================
# ESCANEO PRINCIPAL
# ============================================

def iniciar():

    sensor = None

    printer = None

    live_activo = False

    escaneo_detenido = False

    escaneo_correcto = False


    try:

        # ====================================
        # CONFIGURACIÓN DEL HUD
        # ====================================

        config = cargar_configuracion()


        X_INICIO_SCAN = (
            config["x_inicio"]
        )

        X_MAX_SCAN = (
            config["x_max"]
        )

        Y_INICIO_SCAN = (
            config["y_inicio"]
        )

        Y_MAX_SCAN = (
            config["y_max"]
        )

        ALTURA_SCAN = (
            config["altura"]
        )

        PASO_SCAN = (
            config["paso"]
        )


        # ====================================
        # GENERAR EJES
        # ====================================

        posiciones_x = (
            generar_posiciones(
                X_INICIO_SCAN,
                X_MAX_SCAN,
                PASO_SCAN
            )
        )


        posiciones_y = (
            generar_posiciones(
                Y_INICIO_SCAN,
                Y_MAX_SCAN,
                PASO_SCAN
            )
        )


        if (
            len(posiciones_x) == 0 or
            len(posiciones_y) == 0
        ):

            raise ConfiguracionEscaneoError(
                "La configuración no generó "
                "ningún punto de escaneo."
            )


        total_puntos = (
            len(posiciones_x)
            *
            len(posiciones_y)
        )


        print(
            "\n"
            "[CONFIG] Cuadrícula:"
        )

        print(
            f"         Columnas X: "
            f"{len(posiciones_x)}"
        )

        print(
            f"         Filas Y: "
            f"{len(posiciones_y)}"
        )

        print(
            f"         Total: "
            f"{total_puntos} puntos"
        )


        # ====================================
        # LIMPIAR STOP ANTERIOR
        # ====================================

        limpiar_bandera_parada()


        # ====================================
        # CREAR HARDWARE
        # ====================================

        sensor = Sensor()

        printer = Printer()


        # ====================================
        # CONECTAR SENSOR
        # ====================================

        usar_simulacion = (
            not sensor.conectar()
        )


        if usar_simulacion:

            print(
                "\n"
                "===== MODO SIMULACIÓN ====="
                "\n"
            )

        else:

            print(
                "\n"
                "===== ESP32 CONECTADO ====="
                "\n"
            )


        # ====================================
        # PREPARAR LARAVEL
        # ====================================

        live_activo = iniciar_live()


        # ====================================
        # COMPROBAR PARADA
        # ====================================

        verificar_parada()


        # ====================================
        # HOME
        # ====================================

        print(
            "[PRINTER] Realizando home..."
        )


        printer.home()


        verificar_parada()


        print(
            "\n"
            "Iniciando escaneo con "
            "la trayectoria del HUD..."
            "\n"
        )


        # ====================================
        # CARPETA DE DATOS
        # ====================================

        os.makedirs(
            DATA_DIR,
            exist_ok=True
        )


        # ====================================
        # CREAR CSV
        # ====================================

        with open(
            CSV_FILE,
            "w",
            newline=""
        ) as archivo:

            escritor = csv.writer(
                archivo
            )


            # ================================
            # ENCABEZADO
            # ================================

            escritor.writerow([
                "X_mm",
                "Y_mm",
                "Z_mm",
                "Bx_mT",
                "By_mT",
                "Bz_mT",
                "Magnitud_mT"
            ])


            archivo.flush()


            # ================================
            # RECORRIDO EN Y
            # ================================

            for row_index, y in enumerate(
                posiciones_y
            ):

                verificar_parada()


                # =============================
                # RECORRIDO SERPENTINA
                # =============================

                if (
                    row_index % 2
                    == 0
                ):

                    recorrido_x = (
                        posiciones_x
                    )

                else:

                    recorrido_x = (
                        list(
                            reversed(
                                posiciones_x
                            )
                        )
                    )


                # =============================
                # RECORRIDO EN X
                # =============================

                for x in recorrido_x:

                    # -------------------------
                    # Antes de cualquier
                    # movimiento nuevo.
                    # -------------------------

                    verificar_parada()


                    # =========================
                    # MOVER IMPRESORA
                    # =========================

                    printer.mover(
                        x,
                        y,
                        ALTURA_SCAN
                    )


                    printer.esperar_movimiento()


                    # Si se pulsó detener
                    # durante el movimiento.
                    verificar_parada()


                    # =========================
                    # ESTABILIZACIÓN
                    # =========================

                    time.sleep(
                        0.2
                    )


                    verificar_parada()


                    # =========================
                    # TOMAR MEDICIÓN
                    # =========================

                    if usar_simulacion:

                        bx = random.uniform(
                            -40,
                            40
                        )

                        by = random.uniform(
                            -40,
                            40
                        )

                        bz = random.uniform(
                            -40,
                            40
                        )


                    else:

                        dato = sensor.leer()


                        if dato is None:

                            print(
                                "[SENSOR] Lectura "
                                "inválida en "
                                f"X={x}, Y={y}. "
                                "Se omite el punto."
                            )

                            continue


                        bx, by, bz = dato


                    verificar_parada()


                    # =========================
                    # MAGNITUD
                    # =========================

                    B = (
                        bx ** 2 +
                        by ** 2 +
                        bz ** 2
                    ) ** 0.5


                    # =========================
                    # GUARDAR CSV
                    # =========================

                    escritor.writerow([
                        x,
                        y,
                        ALTURA_SCAN,
                        bx,
                        by,
                        bz,
                        B
                    ])


                    archivo.flush()


                    # =========================
                    # ENVIAR A LARAVEL LIVE
                    # =========================

                    if live_activo:

                        enviar_medicion_live(
                            x,
                            y,
                            ALTURA_SCAN,
                            bx,
                            by,
                            bz,
                            B
                        )


                    # =========================
                    # CONSOLA
                    # =========================

                    print(
                        f"X={x:7.2f}  "
                        f"Y={y:7.2f}  "
                        f"Z={ALTURA_SCAN:7.2f}  "
                        f"Bx={bx:8.4f}  "
                        f"By={by:8.4f}  "
                        f"Bz={bz:8.4f}  "
                        f"B={B:8.4f} mT"
                    )


        escaneo_correcto = True


    # ========================================
    # PARADA DESDE EL HUD
    # ========================================

    except EscaneoDetenido:

        escaneo_detenido = True


        print(
            "\n"
            "==============================="
        )

        print(
            "Escaneo detenido desde el HUD"
        )

        print(
            "==============================="
            "\n"
        )


    # ========================================
    # ERROR DE CONFIGURACIÓN
    # ========================================

    except ConfiguracionEscaneoError as error:

        print(
            "\n"
            "==============================="
        )

        print(
            "ERROR DE CONFIGURACIÓN"
        )

        print(
            "==============================="
        )

        print(
            error
        )

        print()


    # ========================================
    # CTRL + C
    # ========================================

    except KeyboardInterrupt:

        escaneo_detenido = True


        print(
            "\n"
            "[SCAN] Escaneo detenido "
            "por el usuario."
        )


    # ========================================
    # ERROR GENERAL
    # ========================================

    except Exception as error:

        print(
            "\n"
            "[SCAN] Ocurrió un error:"
        )

        print(
            error
        )


    # ========================================
    # FINALIZACIÓN SEGURA
    # ========================================

    finally:

        # ------------------------------------
        # Laravel
        # ------------------------------------

        if live_activo:

            finalizar_live()


        # ------------------------------------
        # Sensor
        # ------------------------------------

        if sensor is not None:

            try:

                if hasattr(
                    sensor,
                    "cerrar"
                ):

                    sensor.cerrar()

                    print(
                        "[SENSOR] Conexión "
                        "cerrada."
                    )

            except Exception as error:

                print(
                    "[SENSOR] Error al cerrar: "
                    f"{error}"
                )


        # ------------------------------------
        # Impresora
        # ------------------------------------

        if printer is not None:

            try:

                if hasattr(
                    printer,
                    "cerrar"
                ):

                    printer.cerrar()

                    print(
                        "[PRINTER] Conexión "
                        "cerrada."
                    )

            except Exception as error:

                print(
                    "[PRINTER] Error al cerrar: "
                    f"{error}"
                )


        # ------------------------------------
        # Limpiar STOP
        # ------------------------------------

        limpiar_bandera_parada()


    # ========================================
    # MENSAJE FINAL
    # ========================================

    print(
        "\n"
        "==============================="
    )


    if escaneo_detenido:

        print(
            "Escaneo detenido correctamente"
        )


    elif escaneo_correcto:

        print(
            "Escaneo terminado correctamente"
        )


    else:

        print(
            "El escaneo no pudo completarse"
        )


    print(
        "==============================="
        "\n"
    )


# ============================================
# EJECUCIÓN
# ============================================

if __name__ == "__main__":

    iniciar()