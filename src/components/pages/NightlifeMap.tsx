'use client';

import L from 'leaflet';
import { Marker, Popup, TileLayer, useMapEvents, MapContainer } from 'react-leaflet';
import { NightlifePin } from '@/types';

interface NightlifeMapProps {
  pins: NightlifePin[];
  draftPin: { lat: number; lng: number } | null;
  onMapClick: (coords: { lat: number; lng: number }) => void;
}

function MapClickCapture({ onMapClick }: { onMapClick: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(event) {
      onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

export default function NightlifeMap({ pins, draftPin, onMapClick }: NightlifeMapProps) {
  const safePins: Array<{
    id: string;
    name: string;
    address: string;
    type: 'house-party' | 'nightclub';
    lat: number;
    lng: number;
  }> = [];

  for (const raw of Array.isArray(pins) ? pins : []) {
    if (!raw || typeof raw !== 'object') continue;
    const lat = Number((raw as Partial<NightlifePin>).lat);
    const lng = Number((raw as Partial<NightlifePin>).lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    safePins.push({
      id: String((raw as Partial<NightlifePin>).id ?? `pin-${safePins.length}`),
      name: String((raw as Partial<NightlifePin>).name ?? 'Nightlife Spot'),
      address: String((raw as Partial<NightlifePin>).address ?? 'Exeter'),
      type: (raw as Partial<NightlifePin>).type === 'nightclub' ? 'nightclub' : 'house-party',
      lat,
      lng,
    });
  }

  const markerData: Array<{
    id: string;
    name: string;
    address: string;
    type: 'house-party' | 'nightclub';
    lat: number;
    lng: number;
    latlng: L.LatLng;
  }> = [];

  for (const pin of safePins) {
    try {
      const latlng = L.latLng(pin.lat, pin.lng);
      markerData.push({ ...pin, latlng });
    } catch {
      // Skip malformed coordinates defensively.
    }
  }
  const exeterBounds: [[number, number], [number, number]] = [
    [50.68, -3.62],
    [50.77, -3.45],
  ];

  const clubIcon = L.divIcon({
    className: 'nightlife-marker-wrapper',
    html: '<div class="nightlife-marker nightclub">🎵</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

  const partyIcon = L.divIcon({
    className: 'nightlife-marker-wrapper',
    html: '<div class="nightlife-marker houseparty">🏠</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

  const draftIcon = L.divIcon({
    className: 'nightlife-marker-wrapper',
    html: '<div class="nightlife-marker draft">📍</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return (
    <MapContainer
      center={[50.726, -3.53]}
      zoom={14}
      minZoom={13}
      maxZoom={18}
      maxBounds={exeterBounds}
      maxBoundsViscosity={1.0}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {markerData.map((pin) => {
        return (
          <Marker key={pin.id} position={pin.latlng} icon={pin.type === 'nightclub' ? clubIcon : partyIcon}>
            <Popup>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{pin.name}</p>
                <p className="text-xs">{pin.address}</p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${pin.lat},${pin.lng}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-[#00796B]"
                >
                  Get directions
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {draftPin && (
        <Marker
          position={[draftPin.lat, draftPin.lng]}
          icon={draftIcon}
        />
      )}

      <MapClickCapture onMapClick={onMapClick} />
    </MapContainer>
  );
}
