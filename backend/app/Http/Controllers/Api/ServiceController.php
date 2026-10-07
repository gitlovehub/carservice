<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    /**
     * Display a listing of services.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Service::query()->where('status', 'ACTIVE');

        if ($request->has('category') && $request->category !== 'Tất cả') {
            $query->where('category', $request->category);
        }

        if ($request->has('search') && !empty($request->search)) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $services = $query->get();

        return response()->json($services);
    }

    /**
     * Display the specified service.
     */
    public function show(Service $service): JsonResponse
    {
        return response()->json($service);
    }
}
