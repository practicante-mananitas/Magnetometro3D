import serial

try:
    esp = serial.Serial("COM7", 115200, timeout=2)

    print("Conectado correctamente")

    esp.write(b"PING\n")

    print(esp.readline().decode())

    esp.close()

except Exception as e:

    print(e)