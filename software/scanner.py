from sensor import Sensor
from printer import Printer
from config import *

import random
import csv
import os
import time

def iniciar():

    sensor = Sensor()
    printer = Printer()

    usar_simulacion = not sensor.conectar()

    if usar_simulacion:
        print("\n===== MODO SIMULACIÓN =====\n")
    else:
        print("\n===== ESP32 CONECTADO =====\n")

    printer.home()

    print("Iniciando escaneo centrado...\n")

    os.makedirs("../datos", exist_ok=True)

    with open("../datos/escaneo.csv", "w", newline="") as archivo:

        escritor = csv.writer(archivo)

        escritor.writerow([
            "X",
            "Y",
            "Z",
            "Bx",
            "By",
            "Bz",
            "Magnitud"
        ])

        for y in range(Y_INICIO, Y_MAX + 1, PASO):

            # Recorrido serpiente centrado
            if ((y - Y_INICIO) // PASO) % 2 == 0:

                recorrido = range(X_INICIO, X_MAX + 1, PASO)

            else:

                recorrido = range(X_MAX, X_INICIO - 1, -PASO)

            for x in recorrido:

                printer.mover(x, y, ALTURA)

                printer.esperar_movimiento()

                time.sleep(0.2)

                if usar_simulacion:

                    bx = random.uniform(-40, 40)
                    by = random.uniform(-40, 40)
                    bz = random.uniform(-40, 40)

                else:

                    dato = sensor.leer()

                    if dato is None:
                        continue

                    bx, by, bz = dato

                B = (bx**2 + by**2 + bz**2) ** 0.5

                escritor.writerow([
                    x,
                    y,
                    ALTURA,
                    bx,
                    by,
                    bz,
                    B
                ])

                print(
                    f"X={x:3}  "
                    f"Y={y:3}  "
                    f"B={B:7.2f} µT"
                )

    print("\n===============================")
    print("Escaneo terminado correctamente")
    print("===============================\n")