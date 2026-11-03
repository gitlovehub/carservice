import assert from "node:assert/strict";
import {
  getApiVehicleType,
  requiresCustomVehicleSubtype,
} from "../src/lib/bookingVehicleType.ts";

for (const model of ["Hilux", "BT-50", "Ranger", "Ranger Raptor", "Triton"]) {
  assert.equal(
    getApiVehicleType("Bán tải / MPV (7-8 chỗ)", model),
    "PICKUP",
    `${model} must be sent to the API as a pickup`,
  );
}

for (const model of ["Innova", "Veloz Cross", "BR-V", "Carnival", "Xpander", "Transit"]) {
  assert.equal(
    getApiVehicleType("Bán tải / MPV (7-8 chỗ)", model),
    "MPV",
    `${model} must be sent to the API as an MPV`,
  );
}

assert.equal(getApiVehicleType("Sedan / Hatchback (4-5 chỗ)", "Vios"), "Sedan / Hatchback (4-5 chỗ)");
assert.equal(getApiVehicleType("SUV / Crossover (5-7 chỗ)", "Fortuner"), "SUV / Crossover (5-7 chỗ)");
assert.equal(getApiVehicleType("Bán tải / MPV (7-8 chỗ)", "Khác", "MPV"), "MPV");
assert.equal(getApiVehicleType("Bán tải / MPV (7-8 chỗ)", "Khác", "PICKUP"), "PICKUP");
assert.equal(requiresCustomVehicleSubtype("Bán tải / MPV (7-8 chỗ)", "Dòng xe khác"), true);
assert.equal(requiresCustomVehicleSubtype("Bán tải / MPV (7-8 chỗ)", "Innova"), false);
console.log("PASS booking vehicle type mapping");
