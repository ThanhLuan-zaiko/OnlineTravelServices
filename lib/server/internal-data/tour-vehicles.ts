import "server-only";

import { uuidv7 } from "uuidv7";

import { executeQuery } from "@/lib/server/scylla";
import type { TourVehicleMutationRequest } from "@/lib/shared/internal";

import { toTourVehicle, type TourVehicleRow } from "./shared";

export async function listTourVehicles(tourId: string) {
  const rows = await executeQuery<TourVehicleRow>(
    `SELECT tour_id, vehicle_id, vehicle_type, plate_number, model, capacity, driver_name,
            driver_phone, notes, status, updated_at
     FROM tour_vehicles_by_tour
     WHERE tour_id = ?
     ORDER BY vehicle_id ASC`,
    [tourId],
  );

  return rows.map(toTourVehicle);
}

export async function findTourVehicle(tourId: string, vehicleId: string) {
  const rows = await executeQuery<TourVehicleRow>(
    `SELECT tour_id, vehicle_id, vehicle_type, plate_number, model, capacity, driver_name,
            driver_phone, notes, status, updated_at
     FROM tour_vehicles_by_tour
     WHERE tour_id = ?`,
    [tourId],
  );

  return rows.map(toTourVehicle).find((vehicle) => vehicle.vehicleId === vehicleId) ?? null;
}

export async function createTourVehicle(tourId: string, input: TourVehicleMutationRequest) {
  const vehicleId = String(uuidv7());
  const updatedAt = new Date();

  await executeQuery(
    `INSERT INTO tour_vehicles_by_tour
      (tour_id, vehicle_id, vehicle_type, plate_number, model, capacity, driver_name, driver_phone, notes, status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tourId,
      vehicleId,
      input.vehicleType,
      input.plateNumber,
      input.model,
      input.capacity,
      input.driverName,
      input.driverPhone,
      input.notes ?? null,
      input.status,
      updatedAt,
    ],
  );

  return findTourVehicle(tourId, vehicleId);
}

export async function updateTourVehicle(tourId: string, vehicleId: string, input: TourVehicleMutationRequest) {
  const existing = await findTourVehicle(tourId, vehicleId);

  if (!existing) {
    return null;
  }

  const updatedAt = new Date();

  await executeQuery(
    `UPDATE tour_vehicles_by_tour
     SET vehicle_type = ?, plate_number = ?, model = ?, capacity = ?, driver_name = ?, driver_phone = ?, notes = ?, status = ?, updated_at = ?
     WHERE tour_id = ? AND vehicle_id = ?`,
    [
      input.vehicleType,
      input.plateNumber,
      input.model,
      input.capacity,
      input.driverName,
      input.driverPhone,
      input.notes ?? null,
      input.status,
      updatedAt,
      tourId,
      vehicleId,
    ],
  );

  return findTourVehicle(tourId, vehicleId);
}

export async function deleteTourVehicle(tourId: string, vehicleId: string) {
  const existing = await findTourVehicle(tourId, vehicleId);

  if (!existing) {
    return null;
  }

  await executeQuery("DELETE FROM tour_vehicles_by_tour WHERE tour_id = ? AND vehicle_id = ?", [tourId, vehicleId]);

  return existing;
}
