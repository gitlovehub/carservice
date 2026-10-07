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
            ->with(['services' => function ($q) {
                $q->select('services.id', 'services.name', 'services.category', 'services.base_price', 'maintenance_package_services.quantity');
            }]);
            
        // The DB might not have 'status' column or it might be different, let's just get all or by model_id
        if ($request->has('model_id') && !empty($request->model_id)) {
            $query->where('vehicle_model_id', $request->model_id);
        }

        $packages = $query->get();
        
        // Add calculated price if needed, or format response
        $packages->each(function ($pkg) {
            $pkg->price = $pkg->services->sum(function ($svc) {
                return $svc->base_price * ($svc->quantity ?? 1);
            });
            // Fake mileage_km for frontend compatibility if mileage_milestone is used
            $pkg->mileage_km = $pkg->mileage_milestone;
        });

        return response()->json($packages);
    }

    /**
     * Display the specified maintenance package.
     */
    public function show(MaintenancePackage $maintenancePackage): JsonResponse
    {
        $maintenancePackage->load(['services', 'parts']);
        
        $maintenancePackage->price = $maintenancePackage->services->sum(function ($svc) {
            return $svc->base_price * ($svc->quantity ?? 1);
        });
        $maintenancePackage->mileage_km = $maintenancePackage->mileage_milestone;

        return response()->json($maintenancePackage);
    }
}
