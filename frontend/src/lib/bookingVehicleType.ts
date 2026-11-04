export type BookingVehicleType =
  | "Sedan / Hatchback (4-5 chỗ)"
  | "SUV / Crossover (5-7 chỗ)"
  | "Bán tải / MPV (7-8 chỗ)";

export type ApiVehicleType = BookingVehicleType | "MPV" | "PICKUP";
export type CustomVehicleSubtype = "MPV" | "PICKUP";

const PICKUP_MODELS = new Set(["Hilux", "BT-50", "Ranger", "Ranger Raptor", "Triton"]);
const MPV_MODELS = new Set([
  "Innova",
  "Innova Cross",
  "Veloz Cross",
  "Avanza Premio",
  "BR-V",
  "Custin",
  "Stargazer",
  "Carens",
  "Carnival",
  "Transit",
  "Xpander",
]);

export function requiresCustomVehicleSubtype(
  vehicleType: BookingVehicleType,
  model: string,
): boolean {
  return vehicleType === "Bán tải / MPV (7-8 chỗ)"
    && !PICKUP_MODELS.has(model)
    && !MPV_MODELS.has(model);
}

export function getApiVehicleType(
  vehicleType: BookingVehicleType,
  model: string,
  customSubtype?: CustomVehicleSubtype,
): ApiVehicleType {
  if (vehicleType !== "Bán tải / MPV (7-8 chỗ)") {
    return vehicleType;
  }

  if (PICKUP_MODELS.has(model)) {
    return "PICKUP";
  }

  if (MPV_MODELS.has(model)) {
    return "MPV";
  }

  return customSubtype ?? "MPV";
}
