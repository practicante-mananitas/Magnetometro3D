<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScanProcessController extends Controller
{
    private function stopFilePath(): string
    {
        return storage_path(
            'app/scan_stop.flag'
        );
    }

    private function configFilePath(): string
    {
        return storage_path(
            'app/scan_config.json'
        );
    }

    public function start(
        Request $request
    ): JsonResponse
    {
        /*
         * Validamos la configuración
         * enviada desde Angular.
         */
        $validated = $request->validate([
            'xStart' => [
                'required',
                'numeric'
            ],

            'xEnd' => [
                'required',
                'numeric'
            ],

            'yStart' => [
                'required',
                'numeric'
            ],

            'yEnd' => [
                'required',
                'numeric'
            ],

            'z' => [
                'required',
                'numeric'
            ],

            'step' => [
                'required',
                'numeric',
                'gt:0'
            ],
        ]);


        /*
         * Validaciones geométricas básicas.
         */
        if (
            $validated['xEnd']
            <
            $validated['xStart']
        ) {
            return response()->json([
                'ok' => false,
                'message' =>
                    'X final no puede ser menor que X inicial.'
            ], 422);
        }


        if (
            $validated['yEnd']
            <
            $validated['yStart']
        ) {
            return response()->json([
                'ok' => false,
                'message' =>
                    'Y final no puede ser menor que Y inicial.'
            ], 422);
        }


        /*
         * Localizamos scanner.py.
         */
        $scannerPath =
            base_path(
                '../software/scanner.py'
            );


        if (
            !file_exists(
                $scannerPath
            )
        ) {
            return response()->json([
                'ok' => false,
                'message' =>
                    'No se encontró scanner.py'
            ], 404);
        }


        /*
         * Borramos cualquier solicitud
         * de parada anterior.
         */
        $stopFile =
            $this->stopFilePath();


        if (
            file_exists(
                $stopFile
            )
        ) {
            unlink(
                $stopFile
            );
        }


        /*
         * Guardamos la configuración que
         * Python va a leer.
         */
        $configFile =
            $this->configFilePath();


        $directory =
            dirname(
                $configFile
            );


        if (
            !is_dir(
                $directory
            )
        ) {
            mkdir(
                $directory,
                0775,
                true
            );
        }


        $scanConfig = [
            'xStart' =>
                (float)
                $validated['xStart'],

            'xEnd' =>
                (float)
                $validated['xEnd'],

            'yStart' =>
                (float)
                $validated['yStart'],

            'yEnd' =>
                (float)
                $validated['yEnd'],

            'z' =>
                (float)
                $validated['z'],

            'step' =>
                (float)
                $validated['step'],

            'createdAt' =>
                now()->toISOString(),
        ];


        $saved =
            file_put_contents(
                $configFile,
                json_encode(
                    $scanConfig,
                    JSON_PRETTY_PRINT |
                    JSON_UNESCAPED_UNICODE
                ),
                LOCK_EX
            );


        if (
            $saved === false
        ) {
            return response()->json([
                'ok' => false,
                'message' =>
                    'No se pudo guardar la configuración del escaneo.'
            ], 500);
        }


        /*
         * Iniciamos Python en segundo plano.
         *
         * Esta forma está pensada
         * para Windows.
         */
        $command =
            sprintf(
                'start /B python "%s"',
                $scannerPath
            );


        pclose(
            popen(
                $command,
                'r'
            )
        );


        return response()->json([
            'ok' => true,

            'message' =>
                'Escaneo iniciado con la configuración del HUD.',

            'config' =>
                $scanConfig
        ]);
    }


    public function stop():
        JsonResponse
    {
        $stopFile =
            $this->stopFilePath();


        $directory =
            dirname(
                $stopFile
            );


        if (
            !is_dir(
                $directory
            )
        ) {
            mkdir(
                $directory,
                0775,
                true
            );
        }


        file_put_contents(
            $stopFile,
            now()->toISOString(),
            LOCK_EX
        );


        return response()->json([
            'ok' => true,
            'message' =>
                'Solicitud de parada enviada.'
        ]);
    }
}