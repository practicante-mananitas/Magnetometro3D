import serial
from serial import SerialException
import time
from config import *

class Sensor:

    def __init__(self):

        self.esp = None

        try:

            self.esp = serial.Serial(
                PUERTO_SENSOR,
                BAUD_SENSOR,
                timeout=2
            )

            # Esperar a que el ESP32 reinicie
            time.sleep(2)

            # Limpiar el mensaje "READY"
            self.esp.reset_input_buffer()

            print(f"ESP32 conectado en {PUERTO_SENSOR}")

        except SerialException as e:

            print(f"\n[ERROR] No se pudo abrir el puerto {PUERTO_SENSOR}")
            print(e)

    def conectar(self):

        if self.esp is None:
            return False

        self.esp.reset_input_buffer()

        self.esp.write(b"PING\n")

        time.sleep(0.1)

        respuesta = self.esp.readline().decode(errors="ignore").strip()

        print("Respuesta ESP32:", respuesta)

        return respuesta == "PONG"

    def leer(self):

        if self.esp is None:
            return None

        self.esp.reset_input_buffer()

        self.esp.write(b"READ\n")

        time.sleep(0.1)

        linea = self.esp.readline().decode(errors="ignore").strip()

        try:

            bx, by, bz = linea.split(",")

            return float(bx), float(by), float(bz)

        except:

            print("Lectura inválida:", linea)

            return None

    def cerrar(self):

        if self.esp is not None:
            self.esp.close()