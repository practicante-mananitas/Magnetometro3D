from sensor import Sensor
from printer import Printer
import random
import csv
import os

def iniciar():

    sensor = Sensor()
    printer = Printer()

    usar_simulacion = not sensor.conectar()

    if usar_simulacion:
        print("Entrando en MODO SIMULACIÓN\n")
    else:
        print("ESP32 conectado\n")

    printer.home()

    os.makedirs("../datos", exist_ok=True)

    with open("../datos/escaneo.csv", "w", newline="") as archivo:

        escritor = csv.writer(archivo)

        escritor.writerow(["X", "Y", "Z", "Bx", "By", "Bz"])

        for y in range(5):

            if y % 2 == 0:
                recorrido = range(5)
            else:
                recorrido = range(4, -1, -1)

            for x in recorrido:

                printer.mover(x, y, 10)

                if usar_simulacion:

                    bx = random.uniform(-40, 40)
                    by = random.uniform(-40, 40)
                    bz = random.uniform(-40, 40)

                else:

                    dato = sensor.leer()

                    if dato is None:
                        continue

                    bx, by, bz = dato

                escritor.writerow([x, y, 10, bx, by, bz])

                print(
                    f"X={x:2}  Y={y:2}  "
                    f"Bx={bx:7.2f}  "
                    f"By={by:7.2f}  "
                    f"Bz={bz:7.2f}"
                )

    print("\nEscaneo terminado.")
    print("Archivo guardado en datos/escaneo.csv")