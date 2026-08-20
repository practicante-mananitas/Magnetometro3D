// // // #include <Wire.h>
// // // #include <Adafruit_Sensor.h>
// // // #include <Adafruit_BNO055.h>

// // // #define SDA_PIN 21
// // // #define SCL_PIN 22

// // // Adafruit_BNO055 bno = Adafruit_BNO055(55, 0x28);

// // // void setup()
// // // {
// // //     Serial.begin(115200);

// // //     Wire.begin(SDA_PIN, SCL_PIN);

// // //     if (!bno.begin())
// // //     {
// // //         Serial.println("ERROR:BNO055");
// // //         while (1);
// // //     }

// // //     delay(1000);

// // //     bno.setExtCrystalUse(true);

// // //     Serial.println("READY");
// // // }

// // // void loop()
// // // {
// // //     if (Serial.available())
// // //     {
// // //         String comando = Serial.readStringUntil('\n');

// // //         comando.trim();

// // //         if (comando == "PING")
// // //         {
// // //             Serial.println("PONG");
// // //         }

// // //         else if (comando == "READ")
// // //         {
// // //             sensors_event_t event;

// // //             bno.getEvent(&event, Adafruit_BNO055::VECTOR_MAGNETOMETER);

// // //             Serial.print(event.magnetic.x, 3);
// // //             Serial.print(",");
// // //             Serial.print(event.magnetic.y, 3);
// // //             Serial.print(",");
// // //             Serial.println(event.magnetic.z, 3);
// // //         }

// // //         else
// // //         {
// // //             Serial.println("ERROR:CMD");
// // //         }
// // //     }
// // // }





// // void setup()
// // {
// //   Serial.begin(115200);
// //   delay(1000);
// //   Serial.println("READY");
// // }

// // void loop()
// // {
// //   if (Serial.available())
// //   {
// //     String comando = Serial.readStringUntil('\n');
// //     comando.trim();

// //     if (comando == "PING")
// //     {
// //       Serial.println("PONG");
// //     }
// //     else if (comando == "READ")
// //     {
// //       Serial.println("12.500,-8.200,35.700");
// //     }
// //     else
// //     {
// //       Serial.println("ERROR:CMD");
// //     }
// //   }
// // }


// #include <Wire.h>
// #include "TLx493D_inc.hpp"

// using namespace ifx::tlx493d;

// #define SDA_PIN 8
// #define SCL_PIN 9

// // El módulo de Adafruit utiliza el sensor TLV493D-A1B6.
// TLx493D_A1B6 sensor(Wire, TLx493D_IIC_ADDR_A0_e);

// void setup()
// {
//     Serial.begin(115200);
//     delay(1000);

//     Wire.begin(SDA_PIN, SCL_PIN);

//     sensor.begin();
//     sensor.setSensitivity(TLx493D_FULL_RANGE_e);

//     Serial.println("TLV493D listo");
// }

// void loop()
// {
//     double bx;
//     double by;
//     double bz;
//     double temperatura;

//     bool lecturaCorrecta =
//         sensor.getMagneticFieldAndTemperature(
//             &bx,
//             &by,
//             &bz,
//             &temperatura
//         );

//     if (lecturaCorrecta)
//     {
//         Serial.print("Bx: ");
//         Serial.print(bx, 4);
//         Serial.print(" mT   ");

//         Serial.print("By: ");
//         Serial.print(by, 4);
//         Serial.print(" mT   ");

//         Serial.print("Bz: ");
//         Serial.print(bz, 4);
//         Serial.print(" mT   ");

//         Serial.print("Temperatura: ");
//         Serial.print(temperatura, 2);
//         Serial.println(" C");
//     }
//     else
//     {
//         Serial.println("ERROR: no se pudo leer el TLV493D");
//     }

//     delay(300);
// }
#include <Wire.h>
#include "TLx493D_inc.hpp"

using namespace ifx::tlx493d;

#define SDA_PIN 8
#define SCL_PIN 9

// Sensor TLV493D-A1B6
TLx493D_A1B6 sensor(Wire, TLx493D_IIC_ADDR_A0_e);

void setup()
{
    Serial.begin(115200);
    delay(1000);

    Wire.begin(SDA_PIN, SCL_PIN);

    sensor.begin();
    sensor.setSensitivity(TLx493D_FULL_RANGE_e);

    Serial.println("READY");
}

void loop()
{
    if (Serial.available() == 0)
    {
        return;
    }

    String comando = Serial.readStringUntil('\n');
    comando.trim();
    comando.toUpperCase();

    if (comando == "PING")
    {
        Serial.println("PONG");
    }
    else if (comando == "READ")
    {
        leerSensor();
    }
    else
    {
        Serial.println("ERROR:CMD");
    }
}

void leerSensor()
{
    double bx;
    double by;
    double bz;
    double temperatura;

    bool lecturaCorrecta =
        sensor.getMagneticFieldAndTemperature(
            &bx,
            &by,
            &bz,
            &temperatura
        );

    if (!lecturaCorrecta)
    {
        Serial.println("ERROR:READ");
        return;
    }

    // Salida para Python: Bx,By,Bz en mT
    Serial.print(bx, 4);
    Serial.print(",");
    Serial.print(by, 4);
    Serial.print(",");
    Serial.println(bz, 4);
}