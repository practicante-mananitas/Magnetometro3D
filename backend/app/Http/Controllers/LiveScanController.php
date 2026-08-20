<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LiveScanController extends Controller
{
    private function liveFilePath(): string
    {
        return storage_path('app/live_scan.json');
    }

    private function initialState(): array
    {
        return [
            'status' => 'idle',
            'started_at' => null,
            'finished_at' => null,
            'measurements' => [],
        ];
    }

    private function readState(): array
    {
        $path = $this->liveFilePath();

        if (!file_exists($path)) {
            return $this->initialState();
        }

        $content = file_get_contents($path);

        if ($content === false || trim($content) === '') {
            return $this->initialState();
        }

        $data = json_decode($content, true);

        if (!is_array($data)) {
            return $this->initialState();
        }

        return $data;
    }

    private function writeState(array $state): void
    {
        $path = $this->liveFilePath();

        $directory = dirname($path);

        if (!is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        file_put_contents(
            $path,
            json_encode(
                $state,
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
            ),
            LOCK_EX
        );
    }

    public function reset(): JsonResponse
    {
        $state = [
            'status' => 'scanning',
            'started_at' => now()->toISOString(),
            'finished_at' => null,
            'measurements' => [],
        ];

        $this->writeState($state);

        return response()->json([
            'ok' => true,
            'message' => 'Escaneo en vivo iniciado.',
            'data' => $state,
        ]);
    }

    public function measurement(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'x' => ['required', 'numeric'],
            'y' => ['required', 'numeric'],
            'z' => ['required', 'numeric'],

            'bx' => ['required', 'numeric'],
            'by' => ['required', 'numeric'],
            'bz' => ['required', 'numeric'],
            'b' => ['required', 'numeric'],
        ]);

        $state = $this->readState();

        if (($state['status'] ?? null) !== 'scanning') {
            $state = [
                'status' => 'scanning',
                'started_at' => now()->toISOString(),
                'finished_at' => null,
                'measurements' => [],
            ];
        }

        $index = count($state['measurements']);

        $measurement = [
            'index' => $index,

            'x' => (float) $validated['x'],
            'y' => (float) $validated['y'],
            'z' => (float) $validated['z'],

            'bx' => (float) $validated['bx'],
            'by' => (float) $validated['by'],
            'bz' => (float) $validated['bz'],
            'b' => (float) $validated['b'],

            'received_at' => now()->toISOString(),
        ];

        $state['measurements'][] = $measurement;

        $this->writeState($state);

        return response()->json([
            'ok' => true,
            'measurement' => $measurement,
        ], 201);
    }

    public function show(Request $request): JsonResponse
    {
        $state = $this->readState();

        $after = (int) $request->query('after', -1);

        $measurements = array_values(
            array_filter(
                $state['measurements'] ?? [],
                fn ($measurement) =>
                    ($measurement['index'] ?? -1) > $after
            )
        );

        return response()->json([
            'ok' => true,

            'status' =>
                $state['status'] ?? 'idle',

            'started_at' =>
                $state['started_at'] ?? null,

            'finished_at' =>
                $state['finished_at'] ?? null,

            'count' =>
                count($state['measurements'] ?? []),

            'data' =>
                $measurements,
        ]);
    }

    public function finish(): JsonResponse
    {
        $state = $this->readState();

        $state['status'] = 'finished';

        $state['finished_at'] =
            now()->toISOString();

        $this->writeState($state);

        return response()->json([
            'ok' => true,
            'message' => 'Escaneo finalizado.',
            'count' => count(
                $state['measurements'] ?? []
            ),
        ]);
    }
}