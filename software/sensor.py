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

            # Limpiar el buffer (por ejemplo el mensaje "READY")
            self.esp.reset_input_buffer()

        except SerialException:

            print(f"\n[ERROR] No se pudo abrir el puerto {PUERTO_SENSOR}")
            print("Verifica que el ESP32 esté conectado.\n")

    def conectar(self):

        if self.esp is None:
            return False

        self.esp.reset_input_buffer()

        self.esp.write(b"PING\n")

        respuesta = self.esp.readline().decode().strip()

        return respuesta == "PONG"

    def leer(self):

        if self.esp is None:
            return None

        self.esp.reset_input_buffer()

        self.esp.write(b"READ\n")

        linea = self.esp.readline().decode().strip()

        try:

            bx, by, bz = linea.split(",")

            return float(bx), float(by), float(bz)

        except:

            return None

    def cerrar(self):

        if self.esp is not None:
            self.esp.close()