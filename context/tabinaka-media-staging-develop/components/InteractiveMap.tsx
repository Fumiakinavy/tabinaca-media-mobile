import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Place {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  types?: string[];
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
  };
}

interface InteractiveMapProps {
  places: Place[];
  onPlaceClick?: (place: Place) => void;
  onMapMove?: (bounds: google.maps.LatLngBounds) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 }; // Tokyo
const DEFAULT_ZOOM = 13;

export default function InteractiveMap({
  places,
  onPlaceClick,
  onMapMove,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  className = "",
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      try {
        if (!mapRef.current) return;

        // Check if Google Maps script is loaded
        if (!window.google || !window.google.maps) {
          setError("Google Maps API not loaded");
          setIsLoading(false);
          return;
        }

        // Create map instance
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          gestureHandling: "greedy",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        mapInstanceRef.current = map;

        // Add bounds_changed listener for map movement
        if (onMapMove) {
          map.addListener("idle", () => {
            const bounds = map.getBounds();
            if (bounds) {
              onMapMove(bounds);
            }
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error initializing map:", err);
        setError("Failed to initialize map");
        setIsLoading(false);
      }
    };

    initMap();
  }, [center.lat, center.lng, zoom, onMapMove]);

  // Update markers when places change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    const bounds = new google.maps.LatLngBounds();
    let hasValidLocations = false;

    places.forEach((place) => {
      if (!place.geometry?.location) return;

      const position = {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      };

      // Custom green marker icon
      const icon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: "#10b981", // Green-500
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        scale: 10,
      };

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current || undefined,
        title: place.name,
        icon,
        animation: google.maps.Animation.DROP,
      });

      // Add click listener
      if (onPlaceClick) {
        marker.addListener("click", () => {
          onPlaceClick(place);
        });
      }

      markersRef.current.push(marker);
      bounds.extend(position);
      hasValidLocations = true;
    });

    // Fit map to markers bounds
    if (hasValidLocations && places.length > 0) {
      mapInstanceRef.current.fitBounds(bounds);

      // Adjust zoom if only one place
      if (places.length === 1) {
        const listener = google.maps.event.addListenerOnce(
          mapInstanceRef.current,
          "bounds_changed",
          () => {
            const currentZoom = mapInstanceRef.current?.getZoom();
            if (currentZoom && currentZoom > 16) {
              mapInstanceRef.current?.setZoom(16);
            }
          },
        );
      }
    }
  }, [places, onPlaceClick]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
      >
        <div className="text-center p-8">
          <div className="text-red-500 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-gray-700 font-medium">{error}</p>
          <p className="text-gray-500 text-sm mt-2">
            Please check your Google Maps API configuration
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg"
        >
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-green-500 mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </motion.div>
      )}

      {/* Place count badge */}
      {!isLoading && places.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 bg-white shadow-lg rounded-full px-4 py-2 flex items-center space-x-2"
        >
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700">
            {places.length} {places.length === 1 ? "place" : "places"}
          </span>
        </motion.div>
      )}
    </div>
  );
}
