import "server-only";

import { uuidv7 } from "uuidv7";

import { executeQuery } from "@/lib/server/scylla";
import type { ServiceProviderMutationRequest } from "@/lib/shared/internal";

import { decimal, toServiceProvider, type ServiceProviderRow } from "./shared";

export async function listInternalServiceProviders(serviceType: string) {
  const rows = await executeQuery<ServiceProviderRow>(
    `SELECT service_type, status, provider_id, provider_name, region, phone, email, rating, contract_status, updated_at
     FROM service_providers_by_type
     WHERE service_type = ?
     ORDER BY status ASC, provider_id ASC`,
    [serviceType],
  );

  return rows.map(toServiceProvider);
}

export async function findInternalServiceProvider(serviceType: string, status: string, providerId: string) {
  const rows = await executeQuery<ServiceProviderRow>(
    `SELECT service_type, status, provider_id, provider_name, region, phone, email, rating, contract_status, updated_at
     FROM service_providers_by_type
     WHERE service_type = ? AND status = ? AND provider_id = ?`,
    [serviceType, status, providerId],
  );

  return rows[0] ? toServiceProvider(rows[0]) : null;
}

export async function createInternalServiceProvider(input: ServiceProviderMutationRequest) {
  const providerId = String(uuidv7());
  const updatedAt = new Date();

  await executeQuery(
    `INSERT INTO service_providers_by_type
      (service_type, status, provider_id, provider_name, region, phone, email, rating, contract_status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.serviceType,
      input.status,
      providerId,
      input.providerName,
      input.region,
      input.phone,
      input.email,
      decimal(String(input.rating)),
      input.contractStatus,
      updatedAt,
    ],
  );

  return findInternalServiceProvider(input.serviceType, input.status, providerId);
}

export async function updateInternalServiceProvider(
  serviceType: string,
  providerId: string,
  input: ServiceProviderMutationRequest,
) {
  const existing = await executeQuery<ServiceProviderRow>(
    `SELECT service_type, status, provider_id, provider_name, region, phone, email, rating, contract_status, updated_at
     FROM service_providers_by_type
     WHERE service_type = ? AND provider_id = ? ALLOW FILTERING`,
    [serviceType, providerId],
  );

  const currentRow = existing[0];

  if (!currentRow) {
    return null;
  }

  const updatedAt = new Date();

  await executeQuery(
    "DELETE FROM service_providers_by_type WHERE service_type = ? AND status = ? AND provider_id = ?",
    [serviceType, currentRow.status, providerId],
  );

  await executeQuery(
    `INSERT INTO service_providers_by_type
      (service_type, status, provider_id, provider_name, region, phone, email, rating, contract_status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.serviceType,
      input.status,
      providerId,
      input.providerName,
      input.region,
      input.phone,
      input.email,
      decimal(String(input.rating)),
      input.contractStatus,
      updatedAt,
    ],
  );

  return findInternalServiceProvider(input.serviceType, input.status, providerId);
}

export async function deleteInternalServiceProvider(serviceType: string, providerId: string) {
  const existingRows = await executeQuery<ServiceProviderRow>(
    `SELECT service_type, status, provider_id, provider_name, region, phone, email, rating, contract_status, updated_at
     FROM service_providers_by_type
     WHERE service_type = ? AND provider_id = ? ALLOW FILTERING`,
    [serviceType, providerId],
  );
  const existing = existingRows[0];

  if (!existing) {
    return null;
  }

  await executeQuery(
    "DELETE FROM service_providers_by_type WHERE service_type = ? AND status = ? AND provider_id = ?",
    [serviceType, existing.status, providerId],
  );

  return toServiceProvider(existing);
}
