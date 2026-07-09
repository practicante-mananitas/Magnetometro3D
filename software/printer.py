# class Printer:

#     def home(self):

#         print("HOME")

#     def mover(self,x,y,z):

#         print(f"Moviendo a X={x} Y={y} Z={z}")
import serial
import time
from serial import SerialException
from config import *

class Printer:

    def __init__(self):
        self.serial = None

        try:
            self.serial = serial.Serial(
                PUERTO_IMPRESORA,
                BAUD_IMPRESORA,
                timeout=2
            )

            time.sleep(3)
            self.serial.reset_input_buffer()

            print("Impresora conectada")

        except SerialException:
            print(f"[ERROR] No se pudo abrir la impresora en {PUERTO_IMPRESORA}")

    def enviar(self, comando):
        if self.serial is None:
            print(f"[SIM IMPRESORA] {comando}")
            return

        self.serial.write((comando + "\n").encode())

        while True:
            respuesta = self.serial.readline().decode(errors="ignore").strip()

            if respuesta:
                print("K9:", respuesta)

            if "ok" in respuesta.lower():
                break

    def home(self):
        print("Haciendo HOME...")
        self.enviar("G28")

    def mover(self, x, y, z, velocidad=1500):
        print(f"Moviendo a X={x} Y={y} Z={z}")
        self.enviar(f"G1 X{x} Y{y} Z{z} F{velocidad}")

    def esperar_movimiento(self):
        self.enviar("M400")

    def cerrar(self):
        if self.serial is not None:
            self.serial.close()