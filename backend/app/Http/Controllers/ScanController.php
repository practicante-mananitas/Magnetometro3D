<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class ScanController extends Controller
{
    public function data(): JsonResponse
    {
        $path = base_path('../datos/escaneo.csv');

        if (!file_exists($path)) {
            return response()->json([
                'ok' => false,
                'message' => 'No se encontró escaneo.csv',
                'data' => []
            ], 404);
        }

        $file = fopen($path, 'r');

        if ($file === false) {
            return response()->json([
                'ok' => false,
                'message' => 'No se pudo abrir escaneo.csv',
                'data' => []
            ], 500);
        }

        $header = fgetcsv($file);

        if ($header === false) {
            fclose($file);

            return response()->json([
                'ok' => false,
                'message' => 'El CSV está vacío',
                'data' => []
            ], 422);
        }

        $rows = [];

        while (($row = fgetcsv($file)) !== false) {
            if (count($row) !== count($header)) {
                continue;
            }

            $item = array_combine($header, $row);

            if ($item === false) {
                continue;
            }

            $rows[] = [
                'x' => (float) ($item['X_mm'] ?? 0),
                'y' => (float) ($item['Y_mm'] ?? 0),
                'z' => (float) ($item['Z_mm'] ?? 0),

                'bx' => (float) ($item['Bx_mT'] ?? 0),
                'by' => (float) ($item['By_mT'] ?? 0),
                'bz' => (float) ($item['Bz_mT'] ?? 0),

                'b' => (float) ($item['Magnitud_mT'] ?? 0),
            ];
        }

        fclose($file);

        return response()->json([
            'ok' => true,
            'count' => count($rows),
            'data' => $rows
        ]);
    }
}