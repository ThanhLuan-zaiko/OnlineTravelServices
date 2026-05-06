import type { useVehicleCatalogManager } from "./use-vehicle-catalog-manager";

export type VehicleCatalogManagerState = ReturnType<typeof useVehicleCatalogManager>;

export type VehicleImagePreviewState = {
  alt: string;
  src: string;
} | null;

export function imageFolderLabel(url: string | null) {
  if (!url) {
    return "";
  }

  return url.split("/").slice(0, 4).join("/");
}
