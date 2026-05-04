"use client";

import { useMemo, useState } from "react";
import L from "leaflet";
import type { LatLngTuple } from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

export type MapLocationSelection = {
  address: Record<string, string>;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string | null;
};

type MapLocationPickerProps = {
  latitude: number;
  longitude: number;
  onSelect: (selection: MapLocationSelection) => void;
};

type SearchResult = MapLocationSelection;

function formatCoordinates(latitude: unknown, longitude: unknown) {
  const nextLatitude = typeof latitude === "number" && Number.isFinite(latitude) ? latitude : null;
  const nextLongitude = typeof longitude === "number" && Number.isFinite(longitude) ? longitude : null;

  if (nextLatitude === null || nextLongitude === null) {
    return "Không có tọa độ hợp lệ";
  }

  return `${nextLatitude.toFixed(6)}, ${nextLongitude.toFixed(6)}`;
}

const markerIcon = L.icon({
  iconAnchor: [12, 41],
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconSize: [25, 41],
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowSize: [41, 41],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapClickHandler({ onSelect }: { onSelect: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export function MapLocationPicker({ latitude, longitude, onSelect }: MapLocationPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const center = useMemo<LatLngTuple>(() => [latitude || 16.0471, longitude || 108.2068], [latitude, longitude]);

  async function fetchReverse(nextLatitude: number, nextLongitude: number) {
    const response = await fetch(`/api/internal/maps/reverse?lat=${encodeURIComponent(String(nextLatitude))}&lng=${encodeURIComponent(String(nextLongitude))}`);
    const data = (await response.json()) as {
      result?: SearchResult | null;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Không thể lấy vị trí.");
    }

    if (!data.result) {
      return {
        address: {},
        displayName: "",
        latitude: nextLatitude,
        longitude: nextLongitude,
        type: null,
      } satisfies SearchResult;
    }

    return data.result;
  }

  async function handleSearch() {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(`/api/internal/maps/search?q=${encodeURIComponent(trimmed)}`);
      const data = (await response.json()) as { results: SearchResult[]; message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Không thể tìm kiếm địa điểm.");
      }

      setResults(data.results);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Không thể tìm kiếm địa điểm.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-500 dark:border-neutral-800 dark:bg-black"
          placeholder="Tìm địa điểm, thành phố, landmark..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleSearch();
            }
          }}
        />
        <button
          className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 dark:bg-neutral-50 dark:text-neutral-950"
          onClick={() => {
            void handleSearch();
          }}
          type="button"
        >
          {isSearching ? "Đang tìm..." : "Tìm kiếm"}
        </button>
      </div>

      {searchError ? <p className="text-sm text-rose-600 dark:text-rose-300">{searchError}</p> : null}

      {results.length > 0 ? (
        <div className="grid gap-2">
          {results.map((result) => (
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-sky-300 hover:bg-sky-50 dark:border-neutral-800 dark:bg-black dark:hover:border-sky-900 dark:hover:bg-neutral-900"
              key={`${result.latitude}-${result.longitude}-${result.displayName}`}
              onClick={async () => {
                onSelect(result);
                setQuery(result.displayName);
                setResults([]);
              }}
              type="button"
            >
              <span className="block font-semibold text-slate-950 dark:text-neutral-50">{result.displayName}</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-neutral-400">
                {formatCoordinates(result.latitude, result.longitude)}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
        <MapContainer
          center={center}
          className="h-[22rem] w-full"
          key={`${center[0]}-${center[1]}`}
          scrollWheelZoom
          zoom={11}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={center} icon={markerIcon} />
          <MapClickHandler
            onSelect={async (nextLatitude, nextLongitude) => {
              try {
                const result = await fetchReverse(nextLatitude, nextLongitude);
                onSelect(result);
              } catch (error) {
                setSearchError(error instanceof Error ? error.message : "Không thể lấy vị trí.");
              }
            }}
          />
        </MapContainer>
      </div>
    </div>
  );
}
