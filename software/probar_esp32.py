# import serial

# try:
#     esp = serial.Serial("COM7", 115200, timeout=2)

#     print("Conectado correctamente")

#     esp.write(b"PING\n")

#     print(esp.readline().decode())

#     esp.close()

# except Exception as e:

#     print(e)
import serial
import time

PUERTO = "COM7"
BAUD = 115200

esp = None

try:
    esp = serial.Serial(
        PUERTO,
        BAUD,
        timeout=2
    )

    time.sleep(2)
    esp.reset_input_buffer()

    print("Conectado correctamente")

    esp.write(b"PING\n")
    respuesta = esp.readline().decode(errors="ignore").strip()

    print("PING:", respuesta)

    esp.write(b"READ\n")
    lectura = esp.readline().decode(errors="ignore").strip()

    print("Lectura:", lectura)

except Exception as error:
    print("ERROR:", error)

finally:
    if esp is not None and esp.is_open:
        esp.close()