<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenancePackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaintenancePackageController extends Controller
{
    /**
     * Display a listing of maintenance packages.
     */
    public function index(Request $request): JsonResponse
    {
        $query = MaintenancePackage::query()
            ->with(['services', 'parts']);

        if ($request->has('model_id') && !empty($request->model_id)) {
            $query->where('vehicle_model_id', $request->model_id);
        }

        $packages = $query->get()->map(fn (MaintenancePackage $package) => $package->withComputedFields());

        return response()->json($packages);
    }

    /**
     * Display the specified maintenance package.
     */
    public function show(MaintenancePackage $maintenancePackage): JsonResponse
    {
        $maintenancePackage->load(['services', 'parts']);

        $maintenancePackage->withComputedFields();

        return response()->json($maintenancePackage);
    }
}
