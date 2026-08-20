import {
  ChangeDetectorRef,
  Component,
  NgZone
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import * as Plotly from 'plotly.js-dist';


interface ScanPoint {
  x: number;
  y: number;
  index: number;

  measured: boolean;

  bx: number | null;
  by: number | null;
  bz: number | null;
  b: number | null;
}


interface LiveMeasurement {
  index: number;

  x: number;
  y: number;
  z: number;

  bx: number;
  by: number;
  bz: number;
  b: number;

  received_at?: string;
}


interface LiveScanResponse {
  ok: boolean;

  status:
    | 'idle'
    | 'scanning'
    | 'finished';

  started_at: string | null;
  finished_at: string | null;

  count: number;

  data: LiveMeasurement[];
}


type MapView =
  | 'points'
  | 'surface';


@Component({
  selector: 'app-root',

  standalone: true,

  imports: [
    FormsModule
  ],

  templateUrl: './app.html',

  styleUrl: './app.scss'
})
export class App {

  /* =========================================
     API LARAVEL
     ========================================= */

  apiUrl =
    'http://127.0.0.1:8000/api';


  /* =========================================
     ESCANEO LIVE
     ========================================= */

  livePollMs = 300;

  livePollTimeout:
    ReturnType<typeof setTimeout> |
    null = null;

  lastLiveIndex = -1;

  liveSessionStartedAt:
    string | null = null;

  previousLiveSessionStartedAt:
    string | null = null;

  waitingForLiveScan = false;

  apiError = '';


  /* =========================================
     VISTA DEL MAPA
     ========================================= */

  viewMode: MapView =
    'points';


  /* =========================================
     DATOS DEL IMÁN
     ========================================= */

  magnetWidth = 30;
  magnetLength = 50;
  magnetHeight = 10;

  magnetX = 20;
  magnetY = 20;

  baseZ = 0;


  /* =========================================
     CONFIGURACIÓN DEL ESCANEO
     ========================================= */

  margin = 5;

  sensorDistance = 3;

  step = 5;


  /* =========================================
     ÁREA CALCULADA
     ========================================= */

  xStart = 0;
  xEnd = 0;

  yStart = 0;
  yEnd = 0;

  z = 0;


  /* =========================================
     LÍMITES DE SEGURIDAD
     TEMPORALES
     ========================================= */

  xMinSafe = 0;
  xMaxSafe = 100;

  yMinSafe = 0;
  yMaxSafe = 100;

  zMinSafe = 0;
  zMaxSafe = 100;

  trajectorySafe = false;

  safetyMessage =
    'Calcula el área para validar la trayectoria.';

  safetyErrors: string[] = [];


  /* =========================================
     PUNTOS
     ========================================= */

  points: ScanPoint[] = [];

  scanning = false;

  currentPoint = 0;

  activePoint = -1;


  /* =========================================
     ÚLTIMA MEDICIÓN
     ========================================= */

  bx: number | null = null;
  by: number | null = null;
  bz: number | null = null;
  b: number | null = null;


  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}


  /* =========================================
     GETTERS
     ========================================= */

  get totalPoints(): number {

    return this.points.length;
  }


  get progress(): number {

    if (
      this.totalPoints === 0
    ) {

      return 0;
    }

    return Math.round(
      (
        this.currentPoint /
        this.totalPoints
      ) * 100
    );
  }


  get measuredPoints():
    ScanPoint[] {

    return this.points.filter(
      point =>
        point.measured &&
        point.b !== null
    );
  }


  get minB():
    number | null {

    const valores =
      this.measuredPoints
        .map(
          point =>
            point.b
        )
        .filter(
          (
            value
          ): value is number =>
            value !== null
        );

    if (
      valores.length === 0
    ) {

      return null;
    }

    return Math.min(
      ...valores
    );
  }


  get maxB():
    number | null {

    const valores =
      this.measuredPoints
        .map(
          point =>
            point.b
        )
        .filter(
          (
            value
          ): value is number =>
            value !== null
        );

    if (
      valores.length === 0
    ) {

      return null;
    }

    return Math.max(
      ...valores
    );
  }


  get averageB():
    number | null {

    const valores =
      this.measuredPoints
        .map(
          point =>
            point.b
        )
        .filter(
          (
            value
          ): value is number =>
            value !== null
        );

    if (
      valores.length === 0
    ) {

      return null;
    }

    const suma =
      valores.reduce(
        (
          total,
          value
        ) =>
          total + value,
        0
      );

    return (
      suma /
      valores.length
    );
  }


  /* =========================================
     CALCULAR ÁREA
     ========================================= */

  calcularArea() {

    this.trajectorySafe =
      false;

    this.safetyErrors =
      [];


    if (
      this.magnetWidth <= 0 ||
      this.magnetLength <= 0 ||
      this.magnetHeight <= 0
    ) {

      alert(
        'Las dimensiones del imán deben ser mayores que 0'
      );

      return;
    }


    if (
      this.margin < 0
    ) {

      alert(
        'El margen no puede ser negativo'
      );

      return;
    }


    if (
      this.sensorDistance <= 0
    ) {

      alert(
        'La distancia sensor-imán debe ser mayor que 0'
      );

      return;
    }


    if (
      this.step <= 0
    ) {

      alert(
        'El paso debe ser mayor que 0'
      );

      return;
    }


    this.xStart =
      this.magnetX -
      this.margin;


    this.xEnd =
      this.magnetX +
      this.magnetWidth +
      this.margin;


    this.yStart =
      this.magnetY -
      this.margin;


    this.yEnd =
      this.magnetY +
      this.magnetLength +
      this.margin;


    this.z =
      this.baseZ +
      this.magnetHeight +
      this.sensorDistance;


    this.validarTrayectoria();


    if (
      !this.trajectorySafe
    ) {

      this.points = [];

      this.currentPoint = 0;

      this.viewMode =
        'points';

      this.cdr.detectChanges();

      return;
    }


    this.viewMode =
      'points';


    this.generarPuntos();
  }


  /* =========================================
     VALIDAR TRAYECTORIA
     ========================================= */

  validarTrayectoria() {

    const errores:
      string[] = [];


    if (
      this.xStart <
      this.xMinSafe
    ) {

      errores.push(
        `X inicial (${this.xStart} mm) es menor que el límite seguro (${this.xMinSafe} mm).`
      );
    }


    if (
      this.xEnd >
      this.xMaxSafe
    ) {

      errores.push(
        `X final (${this.xEnd} mm) supera el límite seguro (${this.xMaxSafe} mm).`
      );
    }


    if (
      this.yStart <
      this.yMinSafe
    ) {

      errores.push(
        `Y inicial (${this.yStart} mm) es menor que el límite seguro (${this.yMinSafe} mm).`
      );
    }


    if (
      this.yEnd >
      this.yMaxSafe
    ) {

      errores.push(
        `Y final (${this.yEnd} mm) supera el límite seguro (${this.yMaxSafe} mm).`
      );
    }


    if (
      this.z <
      this.zMinSafe
    ) {

      errores.push(
        `Z (${this.z} mm) es menor que el límite seguro (${this.zMinSafe} mm).`
      );
    }


    if (
      this.z >
      this.zMaxSafe
    ) {

      errores.push(
        `Z (${this.z} mm) supera el límite seguro (${this.zMaxSafe} mm).`
      );
    }


    this.safetyErrors =
      errores;


    if (
      errores.length === 0
    ) {

      this.trajectorySafe =
        true;

      this.safetyMessage =
        'Trayectoria válida y dentro de los límites seguros.';

    } else {

      this.trajectorySafe =
        false;

      this.safetyMessage =
        'La trayectoria calculada no es segura.';
    }
  }


  /* =========================================
     GENERAR CUADRÍCULA
     ========================================= */

  generarPuntos() {

    this.detenerPollingLive();


    const nuevosPuntos:
      ScanPoint[] = [];


    let index = 0;


    const ys:
      number[] = [];


    for (
      let y = this.yStart;
      y <= this.yEnd;
      y += this.step
    ) {

      ys.push(
        y
      );
    }


    ys.forEach(
      (
        y,
        rowIndex
      ) => {

        const xs:
          number[] = [];


        for (
          let x = this.xStart;
          x <= this.xEnd;
          x += this.step
        ) {

          xs.push(
            x
          );
        }


        /*
          Recorrido serpentina.
        */

        if (
          rowIndex % 2 !== 0
        ) {

          xs.reverse();
        }


        xs.forEach(
          x => {

            nuevosPuntos.push(
              {
                x,
                y,
                index,

                measured:
                  false,

                bx:
                  null,

                by:
                  null,

                bz:
                  null,

                b:
                  null
              }
            );

            index++;
          }
        );
      }
    );


    this.points =
      nuevosPuntos;


    this.currentPoint =
      0;

    this.activePoint =
      -1;


    this.bx =
      null;

    this.by =
      null;

    this.bz =
      null;

    this.b =
      null;


    this.cdr.detectChanges();
  }


  /* =========================================
     INICIAR ESCUCHA DEL ESCANEO REAL
     ========================================= */

  async iniciarEscaneo() {

  if (
    this.scanning
  ) {

    return;
  }


  /*
   * No permitimos iniciar si la
   * trayectoria no pasó la validación.
   */
  if (
    !this.trajectorySafe
  ) {

    alert(
      'Primero calcula y valida el área de escaneo.'
    );

    return;
  }


  /*
   * Debe existir la cuadrícula
   * que corresponde a la trayectoria.
   */
  if (
    this.points.length === 0
  ) {

    alert(
      'Primero calcula el área de escaneo.'
    );

    return;
  }


  /*
   * Validación adicional antes de mandar
   * cualquier movimiento a Python.
   */
  if (
    this.step <= 0
  ) {

    alert(
      'El paso debe ser mayor que 0.'
    );

    return;
  }


  if (
    this.xEnd < this.xStart ||
    this.yEnd < this.yStart
  ) {

    alert(
      'La trayectoria calculada no es válida.'
    );

    return;
  }


  /*
   * Detenemos cualquier polling
   * perteneciente a una sesión anterior.
   */
  this.detenerPollingLive();


  /*
   * Regresamos al mapa de puntos.
   */
  this.viewMode =
    'points';


  /*
   * Limpiamos las mediciones anteriores
   * pero conservamos exactamente la
   * cuadrícula calculada.
   */
  this.points =
    this.points.map(
      point => ({
        ...point,

        measured:
          false,

        bx:
          null,

        by:
          null,

        bz:
          null,

        b:
          null
      })
    );


  this.currentPoint =
    0;

  this.activePoint =
    -1;


  this.bx =
    null;

  this.by =
    null;

  this.bz =
    null;

  this.b =
    null;


  this.lastLiveIndex =
    -1;

  this.liveSessionStartedAt =
    null;

  this.apiError =
    '';

  this.waitingForLiveScan =
    true;

  this.scanning =
    true;


  this.cdr.detectChanges();


  /*
   * Esta es la configuración EXACTA
   * que Laravel guardará en:
   *
   * storage/app/scan_config.json
   *
   * y que scanner.py utilizará para
   * mover la impresora.
   */
  const scanConfig = {

    xStart:
      this.xStart,

    xEnd:
      this.xEnd,

    yStart:
      this.yStart,

    yEnd:
      this.yEnd,

    z:
      this.z,

    step:
      this.step
  };


  console.log(
    'Configuración enviada al escáner:',
    scanConfig
  );


  try {

    /*
     * Pedimos a Laravel que:
     *
     * 1. Valide la configuración.
     * 2. Guarde scan_config.json.
     * 3. Arranque scanner.py.
     */
    const response =
      await fetch(
        `${this.apiUrl}/scan/start`,
        {
          method:
            'POST',

          headers: {

            'Accept':
              'application/json',

            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(
              scanConfig
            )
        }
      );


    /*
     * Intentamos leer la respuesta JSON
     * incluso cuando Laravel devuelve
     * un error 422, 500, etc.
     */
    let result:
      any = null;


    try {

      result =
        await response.json();

    } catch {

      result =
        null;
    }


    if (
      !response.ok
    ) {

      let mensaje =
        `No se pudo iniciar scanner.py. HTTP ${response.status}`;


      /*
       * Laravel puede devolver un mensaje
       * más específico.
       */
      if (
        result?.message
      ) {

        mensaje =
          result.message;
      }


      /*
       * Si Laravel devuelve errores de
       * validación, también los mostramos
       * en consola.
       */
      if (
        result?.errors
      ) {

        console.error(
          'Errores de validación Laravel:',
          result.errors
        );
      }


      throw new Error(
        mensaje
      );
    }


    if (
      !result?.ok
    ) {

      throw new Error(
        result?.message ||
        'Laravel no pudo iniciar el escaneo.'
      );
    }


    /*
     * Esto nos permite verificar en
     * DevTools que Laravel recibió
     * exactamente la misma trayectoria.
     */
    console.log(
      'Scanner iniciado desde Angular'
    );


    console.log(
      'Configuración aceptada por Laravel:',
      result.config
    );


    /*
     * Ahora esperamos la nueva sesión
     * live que creará scanner.py.
     */
    await this.prepararEscaneoLive();


  } catch (error) {

    console.error(
      error
    );


    /*
     * Si scanner.py no arrancó,
     * restauramos correctamente el HUD.
     */
    this.detenerPollingLive();


    this.scanning =
      false;

    this.waitingForLiveScan =
      false;

    this.activePoint =
      -1;


    this.apiError =
      error instanceof Error
        ? error.message
        : 'Error desconocido al iniciar el escaneo.';


    this.cdr.detectChanges();


    alert(
      'No se pudo iniciar el escaneo.\n\n' +
      this.apiError
    );
  }
}


  /* =========================================
     PREPARAR SESIÓN LIVE
     ========================================= */

  async prepararEscaneoLive() {

    try {

      /*
        Pedimos un índice altísimo para
        consultar solamente el estado
        sin descargar mediciones antiguas.
      */

      const response =
        await fetch(
          `${this.apiUrl}/scan/live?after=999999999`
        );


      if (
        !response.ok
      ) {

        throw new Error(
          `Laravel respondió HTTP ${response.status}`
        );
      }


      const result:
        LiveScanResponse =
        await response.json();


      /*
        Si Python YA está escaneando,
        nos conectamos a esa sesión.
      */

      if (
        result.status ===
        'scanning'
      ) {

        this.liveSessionStartedAt =
          result.started_at;

        this.previousLiveSessionStartedAt =
          null;

        this.lastLiveIndex =
          -1;

        this.waitingForLiveScan =
          false;


        await this.consultarLive();

        return;
      }


      /*
        Si Laravel contiene un escaneo
        anterior terminado, guardamos su ID
        para NO cargarlo por accidente.
      */

      this.previousLiveSessionStartedAt =
        result.started_at;


      this.liveSessionStartedAt =
        null;


      this.waitingForLiveScan =
        true;


      this.programarSiguienteConsulta();

    } catch (error) {

      this.manejarErrorLive(
        error
      );
    }
  }


  /* =========================================
     CONSULTAR LARAVEL LIVE
     ========================================= */

  async consultarLive() {

    if (
      !this.scanning
    ) {

      return;
    }


    try {

      /*
        Si todavía esperamos que Python
        inicie una sesión, no pedimos datos.

        Solo consultamos estado.
      */

      const after =
        this.liveSessionStartedAt
          ? this.lastLiveIndex
          : 999999999;


      const response =
        await fetch(
          `${this.apiUrl}/scan/live?after=${after}`
        );


      if (
        !response.ok
      ) {

        throw new Error(
          `Laravel respondió HTTP ${response.status}`
        );
      }


      const result:
        LiveScanResponse =
        await response.json();


      /* =====================================
         TODAVÍA NO COMIENZA PYTHON
         ===================================== */

      if (
        !this.liveSessionStartedAt
      ) {

        /*
          Detectamos una nueva sesión
          cuando Laravel cambia a scanning.
        */

        if (
          result.status ===
          'scanning' &&
          result.started_at &&
          result.started_at !==
          this.previousLiveSessionStartedAt
        ) {

          this.liveSessionStartedAt =
            result.started_at;


          this.lastLiveIndex =
            -1;


          this.waitingForLiveScan =
            false;


          /*
            Ahora volvemos a consultar,
            esta vez desde index -1.
          */

          await this.consultarLive();

          return;
        }


        this.programarSiguienteConsulta();

        return;
      }


      /* =====================================
         CAMBIÓ LA SESIÓN
         ===================================== */

      if (
        result.started_at &&
        result.started_at !==
        this.liveSessionStartedAt
      ) {

        this.liveSessionStartedAt =
          result.started_at;


        this.lastLiveIndex =
          -1;


        this.reiniciarMediciones();


        this.scanning =
          true;


        this.waitingForLiveScan =
          false;


        await this.consultarLive();

        return;
      }


      /* =====================================
         PROCESAR PUNTOS NUEVOS
         ===================================== */

      if (
        result.data &&
        result.data.length > 0
      ) {

        const nuevasMediciones =
          [...result.data]
            .sort(
              (
                a,
                b
              ) =>
                a.index -
                b.index
            );


        nuevasMediciones.forEach(
          medicion => {

            this.aplicarMedicionLive(
              medicion
            );
          }
        );
      }


      /* =====================================
         ESCANEO TERMINADO
         ===================================== */

      if (
        result.status ===
        'finished'
      ) {

        this.finalizarEscaneoLive();

        return;
      }


      /* =====================================
         CONTINUAR CONSULTANDO
         ===================================== */

      this.programarSiguienteConsulta();

    } catch (error) {

      this.manejarErrorLive(
        error
      );
    }
  }


  /* =========================================
     APLICAR UNA MEDICIÓN LIVE
     ========================================= */

  aplicarMedicionLive(
    medicion:
      LiveMeasurement
  ) {

    /*
      Evita duplicados.
    */

    if (
      medicion.index <=
      this.lastLiveIndex
    ) {

      return;
    }


    this.zone.run(
      () => {

        const index =
          medicion.index;


        this.activePoint =
          index;


        /*
          Normalmente el recorrido generado
          por Angular y Python debe coincidir.

          Si Python envía más puntos de los
          previstos, Angular los agrega para
          no perder mediciones.
        */

        if (
          index >=
          this.points.length
        ) {

          this.points = [
            ...this.points,
            {
              x:
                medicion.x,

              y:
                medicion.y,

              index,

              measured:
                true,

              bx:
                medicion.bx,

              by:
                medicion.by,

              bz:
                medicion.bz,

              b:
                medicion.b
            }
          ];

        } else {

          this.points =
            this.points.map(
              (
                point,
                pointIndex
              ) => {

                if (
                  pointIndex ===
                  index
                ) {

                  return {
                    ...point,

                    /*
                      Usamos las coordenadas
                      que realmente envió Python.
                    */

                    x:
                      medicion.x,

                    y:
                      medicion.y,

                    measured:
                      true,

                    bx:
                      medicion.bx,

                    by:
                      medicion.by,

                    bz:
                      medicion.bz,

                    b:
                      medicion.b
                  };
                }


                return point;
              }
            );
        }


        /*
          Z real del escaneo.
        */

        this.z =
          medicion.z;


        /*
          Footer.
        */

        this.bx =
          medicion.bx;

        this.by =
          medicion.by;

        this.bz =
          medicion.bz;

        this.b =
          medicion.b;


        /*
          Progreso.
        */

        this.currentPoint =
          index + 1;


        this.lastLiveIndex =
          index;


        this.cdr.detectChanges();


        /*
          Si el usuario está viendo
          la superficie 3D, la actualizamos
          cada 5 mediciones.
        */

        if (
          this.viewMode ===
          'surface' &&
          (
            this.currentPoint % 5 === 0
          )
        ) {

          setTimeout(
            () => {

              this.renderSuperficie3D();

            },
            0
          );
        }
      }
    );
  }


  /* =========================================
     PROGRAMAR PRÓXIMA CONSULTA
     ========================================= */

  programarSiguienteConsulta() {

    if (
      !this.scanning
    ) {

      return;
    }


    this.detenerPollingLive();


    this.livePollTimeout =
      setTimeout(
        () => {

          this.consultarLive();

        },
        this.livePollMs
      );
  }


  /* =========================================
     DETENER TIMER LIVE
     ========================================= */

  detenerPollingLive() {

    if (
      this.livePollTimeout !==
      null
    ) {

      clearTimeout(
        this.livePollTimeout
      );


      this.livePollTimeout =
        null;
    }
  }


  /* =========================================
     ERROR LIVE
     ========================================= */

  manejarErrorLive(
    error:
      unknown
  ) {

    console.error(
      error
    );


    this.apiError =
      error instanceof Error
        ? error.message
        : 'Error desconocido';


    /*
      No cancelamos inmediatamente.

      Si Laravel tuvo una falla temporal,
      volvemos a intentar.
    */

    if (
      this.scanning
    ) {

      this.programarSiguienteConsulta();
    }
  }


  /* =========================================
     FINALIZAR LIVE
     ========================================= */

  finalizarEscaneoLive() {

    this.detenerPollingLive();


    this.scanning =
      false;

    this.waitingForLiveScan =
      false;

    this.activePoint =
      -1;


    /*
      Si Python produjo menos puntos de los
      previstos por Angular, eliminamos los
      puntos vacíos finales.

      Así el progreso termina en 100%.
    */

    if (
      this.currentPoint > 0 &&
      this.currentPoint <
      this.points.length
    ) {

      this.points =
        this.points.slice(
          0,
          this.currentPoint
        );
    }


    this.cdr.detectChanges();


    if (
      this.viewMode ===
      'surface'
    ) {

      setTimeout(
        () => {

          this.renderSuperficie3D();

        },
        0
      );
    }


    console.log(
      `Escaneo live terminado: ${this.currentPoint} mediciones`
    );
  }


  /* =========================================
     DETENER DESDE EL HUD
     ========================================= */

 async detenerEscaneo() {

  if (
    !this.scanning
  ) {

    return;
  }

  try {

    console.log(
      'Enviando solicitud de parada...'
    );

    const response =
      await fetch(
        `${this.apiUrl}/scan/stop`,
        {
          method: 'POST',

          headers: {
            'Accept':
              'application/json',

            'Content-Type':
              'application/json'
          }
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `Laravel respondió HTTP ${response.status}`
      );
    }


    const result =
      await response.json();


    if (
      !result.ok
    ) {

      throw new Error(
        result.message ||
        'No se pudo detener el escaneo.'
      );
    }


    console.log(
      'Solicitud de parada enviada correctamente'
    );


    /*
      MUY IMPORTANTE:

      NO apagamos scanning aquí.

      Angular sigue consultando Laravel
      hasta que scanner.py detecte la
      bandera y mande /scan/live/finish.
    */

    this.waitingForLiveScan =
      false;

    this.cdr.detectChanges();

  } catch (error) {

    console.error(
      error
    );

    this.apiError =
      error instanceof Error
        ? error.message
        : 'Error desconocido al detener el escaneo.';


    alert(
      'No se pudo detener el escaneo.\n\n' +
      this.apiError
    );
  }
}


  /* =========================================
     REINICIAR MEDICIONES
     ========================================= */

  reiniciarMediciones() {

    this.currentPoint =
      0;

    this.activePoint =
      -1;

    this.lastLiveIndex =
      -1;


    this.points =
      this.points.map(
        point => ({
          ...point,

          measured:
            false,

          bx:
            null,

          by:
            null,

          bz:
            null,

          b:
            null
        })
      );


    this.bx =
      null;

    this.by =
      null;

    this.bz =
      null;

    this.b =
      null;


    this.viewMode =
      'points';


    this.cdr.detectChanges();
  }


  /* =========================================
     MAPA DE PUNTOS
     ========================================= */

  mostrarMapaPuntos() {

    this.viewMode =
      'points';


    this.cdr.detectChanges();
  }


  /* =========================================
     SUPERFICIE 3D
     ========================================= */

  mostrarSuperficie3D() {

    if (
      this.measuredPoints.length === 0
    ) {

      alert(
        'Todavía no hay mediciones para generar la superficie 3D.'
      );

      return;
    }


    this.viewMode =
      'surface';


    this.cdr.detectChanges();


    setTimeout(
      () => {

        this.renderSuperficie3D();

      },
      0
    );
  }


  /* =========================================
     RENDER SUPERFICIE 3D
     ========================================= */

  renderSuperficie3D() {

    const graphDiv =
      document.getElementById(
        'surface3d'
      );


    if (
      !graphDiv
    ) {

      return;
    }


    const xs =
      [
        ...new Set(
          this.measuredPoints.map(
            point =>
              point.x
          )
        )
      ]
        .sort(
          (
            a,
            b
          ) =>
            a - b
        );


    const ys =
      [
        ...new Set(
          this.measuredPoints.map(
            point =>
              point.y
          )
        )
      ]
        .sort(
          (
            a,
            b
          ) =>
            a - b
        );


    const pointMap =
      new Map<
        string,
        ScanPoint
      >();


    this.measuredPoints.forEach(
      point => {

        pointMap.set(
          `${point.x}|${point.y}`,
          point
        );
      }
    );


    const zMatrix =
      ys.map(
        y =>

          xs.map(
            x => {

              const point =
                pointMap.get(
                  `${x}|${y}`
                );


              if (
                !point ||
                point.b === null
              ) {

                return null;
              }


              return point.b;
            }
          )
      );


    const customData =
      ys.map(
        y =>

          xs.map(
            x => {

              const point =
                pointMap.get(
                  `${x}|${y}`
                );


              if (
                !point
              ) {

                return [
                  null,
                  null,
                  null
                ];
              }


              return [
                point.bx,
                point.by,
                point.bz
              ];
            }
          )
      );


    const data:
      any[] = [

      {
        type:
          'surface',

        x:
          xs,

        y:
          ys,

        z:
          zMatrix,

        customdata:
          customData,

        colorscale:
          'Viridis',

        showscale:
          true,

        connectgaps:
          false,

        colorbar: {

          title: {
            text:
              'B (mT)'
          },

          thickness:
            14,

          len:
            0.75
        },

        contours: {

          z: {

            show:
              true,

            usecolormap:
              true,

            highlightcolor:
              '#ffffff',

            project: {

              z:
                true
            }
          }
        },

        hovertemplate:
          'X: %{x:.2f} mm' +
          '<br>' +
          'Y: %{y:.2f} mm' +
          '<br>' +
          'B: %{z:.4f} mT' +
          '<br>' +
          'Bx: %{customdata[0]:.4f} mT' +
          '<br>' +
          'By: %{customdata[1]:.4f} mT' +
          '<br>' +
          'Bz: %{customdata[2]:.4f} mT' +
          '<extra></extra>'
      }

    ];


    const layout:
      any = {

      autosize:
        true,

      margin: {
        l: 0,
        r: 0,
        t: 45,
        b: 0
      },

      paper_bgcolor:
        'rgba(0,0,0,0)',

      plot_bgcolor:
        'rgba(0,0,0,0)',

      font: {

        color:
          '#9cb8c7'
      },

      title: {

        text:
          'Superficie 3D del campo magnético',

        font: {

          size:
            16,

          color:
            '#7dd3fc'
        }
      },

      scene: {

        bgcolor:
          'rgba(3, 12, 22, 0.75)',


        xaxis: {

          title: {
            text:
              'X (mm)'
          },

          color:
            '#9cb8c7',

          gridcolor:
            '#23475b',

          zerolinecolor:
            '#23475b'
        },


        yaxis: {

          title: {
            text:
              'Y (mm)'
          },

          color:
            '#9cb8c7',

          gridcolor:
            '#23475b',

          zerolinecolor:
            '#23475b'
        },


        zaxis: {

          title: {
            text:
              'B (mT)'
          },

          color:
            '#9cb8c7',

          gridcolor:
            '#23475b',

          zerolinecolor:
            '#23475b'
        },


        camera: {

          eye: {

            x:
              1.45,

            y:
              1.45,

            z:
              1.15
          }
        }
      }
    };


    const config:
      any = {

      responsive:
        true,

      displaylogo:
        false,

      scrollZoom:
        true,

      modeBarButtonsToRemove: [
        'sendDataToCloud'
      ]
    };


    Plotly.react(
      graphDiv,
      data,
      layout,
      config
    );
  }


  /* =========================================
     INTENSIDAD
     ========================================= */

  getIntensityClass(
    point:
      ScanPoint
  ):
    string {

    if (
      !point.measured ||
      point.b === null
    ) {

      return '';
    }


    if (
      point.b < 0.5
    ) {

      return (
        'intensity-very-low'
      );
    }


    if (
      point.b < 1.0
    ) {

      return (
        'intensity-low'
      );
    }


    if (
      point.b < 1.5
    ) {

      return (
        'intensity-medium'
      );
    }


    if (
      point.b < 2.0
    ) {

      return (
        'intensity-high'
      );
    }


    return (
      'intensity-very-high'
    );
  }
}