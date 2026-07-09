// #include <Wire.h>
// #include <Adafruit_Sensor.h>
// #include <Adafruit_BNO055.h>

// #define SDA_PIN 21
// #define SCL_PIN 22

// Adafruit_BNO055 bno = Adafruit_BNO055(55, 0x28);

// void setup()
// {
//     Serial.begin(115200);

//     Wire.begin(SDA_PIN, SCL_PIN);

//     if (!bno.begin())
//     {
//         Serial.println("ERROR:BNO055");
//         while (1);
//     }

//     delay(1000);

//     bno.setExtCrystalUse(true);

//     Serial.println("READY");
// }

// void loop()
// {
//     if (Serial.available())
//     {
//         String comando = Serial.readStringUntil('\n');

//         comando.trim();

//         if (comando == "PING")
//         {
//             Serial.println("PONG");
//         }

//         else if (comando == "READ")
//         {
//             sensors_event_t event;

//             bno.getEvent(&event, Adafruit_BNO055::VECTOR_MAGNETOMETER);

//             Serial.print(event.magnetic.x, 3);
//             Serial.print(",");
//             Serial.print(event.magnetic.y, 3);
//             Serial.print(",");
//             Serial.println(event.magnetic.z, 3);
//         }

//         else
//         {
//             Serial.println("ERROR:CMD");
//         }
//     }
// }





void setup()
{
  Serial.begin(115200);
  delay(1000);
  Serial.println("READY");
}

void loop()
{
  if (Serial.available())
  {
    String comando = Serial.readStringUntil('\n');
    comando.trim();

    if (comando == "PING")
    {
      Serial.println("PONG");
    }
    else if (comando == "READ")
    {
      Serial.println("12.500,-8.200,35.700");
    }
    else
    {
      Serial.println("ERROR:CMD");
    }
  }
}