<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VehicleController extends Controller
{
    // GET /api/vehicles
    public function index(Request $request)
    {
        $query = Vehicle::with(['customer', 'model']);

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('license_plate', 'like', "%{$search}%")
                    ->orWhere('vin', 'like', "%{$search}%")
                    ->orWhere('variant', 'like', "%{$search}%");
            });
        }

        $vehicles = $query->latest()->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách xe thành công.',
            'data' => $vehicles,
        ]);
    }

    // POST /api/vehicles
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id'   => 'required|exists:customers,id',
            'model_id'      => 'required|exists:vehicle_models,id',
            'variant'       => 'nullable|string|max:100',
            'year'          => 'nullable|integer|min:1900|max:' . (date('Y') + 1),
            'license_plate' => 'nullable|string|max:20',
            'vin'           => 'nullable|string|max:50',
            'mileage'       => 'nullable|integer|min:0',
            'note'          => 'nullable|string',
        ]);

        $vehicle = Vehicle::create($validated);
        $vehicle->load(['customer', 'model']);

        return response()->json([
            'success' => true,
            'message' => 'Thêm xe thành công.',
            'data' => $vehicle,
        ], 201);
    }

    // GET /api/vehicles/{id}
    public function show($id)
    {
        $vehicle = Vehicle::with(['customer', 'model'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin xe thành công.',
            'data' => $vehicle,
        ]);
    }

    // PUT /api/vehicles/{id}
    public function update(Request $request, $id)
    {
        // Tìm xe theo ID, không tồn tại thì Laravel trả về 404
        $vehicle = Vehicle::findOrFail($id);

        // Validate dữ liệu gửi lên
        $validated = $request->validate([
            'customer_id' => [
                'sometimes',
                'exists:customers,id',
            ],

            'model_id' => [
                'sometimes',
                'exists:vehicle_models,id',
            ],

            'variant' => [
                'nullable',
                'string',
                'max:100',
            ],

            'year' => [
                'nullable',
                'integer',
                'min:1900',
                'max:' . (date('Y') + 1),
            ],

            'license_plate' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('vehicles', 'license_plate')
                    ->ignore($vehicle->id),
            ],

            'vin' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('vehicles', 'vin')
                    ->ignore($vehicle->id),
            ],

            'mileage' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'note' => [
                'nullable',
                'string',
            ],
        ]);

        // Cập nhật thông tin xe
        $vehicle->update($validated);

        // Load thông tin khách hàng và model xe
        $vehicle->load([
            'customer',
            'model',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật xe thành công.',
            'data' => $vehicle,
        ], 200);
    }

    // DELETE /api/vehicles/{id}
    public function destroy($id)
    {
        $vehicle = Vehicle::findOrFail($id);

        $vehicle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa xe thành công.',
        ]);
    }

    // GET /api/customers/{customerId}/vehicles
    public function byCustomer($customerId)
    {
        $vehicles = Vehicle::with('model')
            ->where('customer_id', $customerId)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách xe của khách hàng thành công.',
            'data' => $vehicles,
        ]);
    }
}