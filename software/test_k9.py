from printer import Printer
import time

k9 = Printer()

k9.enviar("M115")
time.sleep(1)

k9.home()

k9.mover(10, 10, 10)
k9.esperar_movimiento()

k9.mover(20, 10, 10)
k9.esperar_movimiento()

k9.mover(20, 20, 10)
k9.esperar_movimiento()

print("Prueba terminada")
k9.cerrar()