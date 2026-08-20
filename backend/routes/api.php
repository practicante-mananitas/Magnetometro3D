<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ScanController;
use App\Http\Controllers\LiveScanController;
use App\Http\Controllers\ScanProcessController;


/*
|--------------------------------------------------------------------------
| Estado
|--------------------------------------------------------------------------
*/

Route::get('/status', function () {
    return response()->json([
        'status' => 'ok',
        'sistema' => 'Magnetometro3D'
    ]);
});


/*
|--------------------------------------------------------------------------
| CSV terminado
|--------------------------------------------------------------------------
*/

Route::get(
    '/scan/data',
    [ScanController::class, 'data']
);


/*
|--------------------------------------------------------------------------
| Escaneo en vivo
|--------------------------------------------------------------------------
*/

Route::post(
    '/scan/live/reset',
    [LiveScanController::class, 'reset']
);

Route::post(
    '/scan/live/measurement',
    [LiveScanController::class, 'measurement']
);

Route::get(
    '/scan/live',
    [LiveScanController::class, 'show']
);

Route::post(
    '/scan/live/finish',
    [LiveScanController::class, 'finish']
);



Route::post(
    '/scan/start',
    [ScanProcessController::class, 'start']
);

Route::post(
    '/scan/stop',
    [ScanProcessController::class, 'stop']
);