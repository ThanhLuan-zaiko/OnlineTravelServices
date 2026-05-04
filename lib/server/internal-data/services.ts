import "server-only";

import { uuidv7 } from "uuidv7";

import { executeQuery } from "@/lib/server/scylla";
import type { ServiceCatalogMutationRequest } from "@/lib/shared/internal";

import {
  decimal,
  toServiceCatalog,
  type ServiceCatalogRow,
} from "./shared";
import { findInternalDestination } from "./destinations";

export async function listInternalServices(destinationId: string) {
  const rows = await executeQuery<ServiceCatalogRow>(
    `SELECT destination_id, service_type, service_id, provider_id, name, description,
            base_price, currency, status, updated_at
     FROM service_catalog_by_destination
     WHERE destination_id = ?
     ORDER BY service_type ASC, service_id ASC`,
    [destinationId],
  );

  return rows.map(toServiceCatalog);
}

export async function createInternalService(input: ServiceCatalogMutationRequest) {
  const destination = await findInternalDestination(input.destinationId);

  if (!destination) {
    return null;
  }

  const serviceId = String(uuidv7());
  const updatedAt = new Date();

  await executeQuery(
    `INSERT INTO service_catalog_by_destination
      (destination_id, service_type, service_id, provider_id, name, description,
       base_price, currency, status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.destinationId,
      input.serviceType,
      serviceId,
      input.providerId ?? null,
      input.name,
      input.description ?? null,
      decimal(input.basePrice),
      input.currency,
      input.status,
      updatedAt,
    ],
  );

  return findInternalService(input.destinationId, input.serviceType, serviceId);
}

export async function findInternalService(destinationId: string, serviceType: string, serviceId: string) {
  const rows = await executeQuery<ServiceCatalogRow>(
    `SELECT destination_id, service_type, service_id, provider_id, name, description,
            base_price, currency, status, updated_at
     FROM service_catalog_by_destination
     WHERE destination_id = ? AND service_type = ? AND service_id = ?`,
    [destinationId, serviceType, serviceId],
  );

  return rows[0] ? toServiceCatalog(rows[0]) : null;
}

export async function updateInternalService(
  destinationId: string,
  serviceType: string,
  serviceId: string,
  input: ServiceCatalogMutationRequest,
) {
  const existing = await findInternalService(destinationId, serviceType, serviceId);

  if (!existing) {
    return null;
  }

  const updatedAt = new Date();

  await executeQuery(
    `UPDATE service_catalog_by_destination
     SET provider_id = ?, name = ?, description = ?, base_price = ?, currency = ?, status = ?, updated_at = ?
     WHERE destination_id = ? AND service_type = ? AND service_id = ?`,
    [
      input.providerId ?? null,
      input.name,
      input.description ?? null,
      decimal(input.basePrice),
      input.currency,
      input.status,
      updatedAt,
      destinationId,
      serviceType,
      serviceId,
    ],
  );

  return findInternalService(destinationId, serviceType, serviceId);
}

export async function deleteInternalService(destinationId: string, serviceType: string, serviceId: string) {
  const existing = await findInternalService(destinationId, serviceType, serviceId);

  if (!existing) {
    return null;
  }

  await executeQuery(
    "DELETE FROM service_catalog_by_destination WHERE destination_id = ? AND service_type = ? AND service_id = ?",
    [destinationId, serviceType, serviceId],
  );

  return existing;
}
