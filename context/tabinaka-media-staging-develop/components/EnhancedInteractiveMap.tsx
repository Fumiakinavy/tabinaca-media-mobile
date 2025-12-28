import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getPlacePhotoUrl, getGoogleMapsUrl } from "@/lib/placesHelpers";

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

interface EnhancedInteractiveMapProps {
  places: Place[];
  selectedPlace?: Place | null;
  onPlaceClick?: (place: Place | null) => void;
  onMapMove?: (bounds: google.maps.LatLngBounds) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}

const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 }; // Tokyo
const DEFAULT_ZOOM = 13;

// Japan bounds: approximately 24°N-46°N, 123°E-146°E
const JAPAN_BOUNDS = {
  minLat: 24.0,
  maxLat: 46.0,
  minLng: 123.0,
  maxLng: 146.0,
};

// Validate if location is within Japan bounds
const isValidJapanLocation = (location: {
  lat: number;
  lng: number;
}): boolean => {
  return (
    location.lat >= JAPAN_BOUNDS.minLat &&
    location.lat <= JAPAN_BOUNDS.maxLat &&
    location.lng >= JAPAN_BOUNDS.minLng &&
    location.lng <= JAPAN_BOUNDS.maxLng
  );
};

export default function EnhancedInteractiveMap({
  places,
  selectedPlace,
  onPlaceClick,
  onMapMove,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  userLocation: propUserLocation,
  className = "",
}: EnhancedInteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<any>(null);
  const onPlaceClickRef = useRef<typeof onPlaceClick>(onPlaceClick);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only use location if it's within Japan bounds
  const rawUserLocation = propUserLocation;
  const userLocation =
    rawUserLocation && isValidJapanLocation(rawUserLocation)
      ? rawUserLocation
      : null;

  // Keep the latest onPlaceClick without retriggering effects
  useEffect(() => {
    onPlaceClickRef.current = onPlaceClick;
  }, [onPlaceClick]);

  // Calculate walking time using Haversine formula
  const calculateWalkingTime = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return Math.round(distance * 12); // Assuming 5km/h walking speed = 12 minutes per km
  };

  // Straight-line distance (meters) using the same Haversine logic
  const getDistanceMeters = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const createPinIcon = (isSelected: boolean) => ({
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
    fillColor: isSelected ? "#ef4444" : "#10b981", // Red for selected, Green for others
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: isSelected ? 3 : 2,
    scale: isSelected ? 2 : 1.5,
    anchor: new google.maps.Point(12, 22),
  });

  // Initialize Google Maps (only once)
  useEffect(() => {
    const initMap = async () => {
      try {
        if (!mapRef.current || mapInstanceRef.current) return; // Prevent re-initialization

        // Check if Google Maps script is loaded
        if (!window.google || !window.google.maps) {
          setError("Google Maps API not loaded");
          setIsLoading(false);
          return;
        }

        // Use userLocation if available, otherwise use center prop (defaults to Tokyo)
        const initialCenter = userLocation || center;

        // Create map instance
        const map = new google.maps.Map(mapRef.current, {
          center: initialCenter,
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
        infoWindowRef.current = new (window as any).google.maps.InfoWindow();

        // Add click listener for map (not on markers)
        // This will reset the selection when clicking on empty map area
        map.addListener("click", () => {
          // Small delay to check if a marker was clicked
          setTimeout(() => {
            if (
              !(window as any).__mapMarkerClicked &&
              onPlaceClickRef.current
            ) {
              onPlaceClickRef.current(null);
            }
          }, 100);
        });

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
  }, []); // Remove dependencies to prevent re-initialization

  // Update map center when userLocation becomes available (if no places are shown)
  useEffect(() => {
    if (mapInstanceRef.current && userLocation && places.length === 0) {
      mapInstanceRef.current.setCenter(userLocation);
      mapInstanceRef.current.setZoom(15);
    }
  }, [userLocation, places.length]);

  // Update map center and zoom when props change (without re-initializing)
  // Only update if userLocation is not available or places are shown
  useEffect(() => {
    if (mapInstanceRef.current) {
      // If userLocation is available and no places are shown, use userLocation
      // Otherwise, use center prop
      const targetCenter =
        userLocation && places.length === 0 ? userLocation : center;
      mapInstanceRef.current.setCenter(targetCenter);
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [center.lat, center.lng, zoom, userLocation, places.length]);

  // Update markers when places change (selection does not refit map)
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

      // Create custom pin icon
      const isSelected = Boolean(
        selectedPlace && selectedPlace.place_id === place.place_id,
      );
      const pinIcon = createPinIcon(isSelected);

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current || undefined,
        title: place.name,
        icon: pinIcon,
        animation: google.maps.Animation.DROP,
      });

      // Attach place id for later icon updates
      (marker as any).__placeId = place.place_id;

      // Add hover event for info window
      marker.addListener("mouseover", () => {
        if (!infoWindowRef.current) return;

        const walkingTime = userLocation
          ? calculateWalkingTime(
              userLocation.lat,
              userLocation.lng,
              place.geometry!.location.lat,
              place.geometry!.location.lng,
            )
          : null;
        const mapsUrl = getGoogleMapsUrl(place.place_id, place.name);

        const photoHtml =
          place.photos && place.photos[0]
            ? `<div class="mb-2 overflow-hidden rounded-md">
               <img src="${getPlacePhotoUrl(place.photos[0].photo_reference, 320)}" alt="${place.name}" style="width:100%;height:120px;object-fit:cover;" />
             </div>`
            : "";

        const content = `
          <div class="p-2 max-w-[220px]">
            ${photoHtml}
            <h3 class="font-semibold text-gray-900 mb-1 text-sm leading-snug">${place.name}</h3>
            <div class="space-y-1 text-xs text-gray-600 leading-snug">
              ${place.formatted_address ? `<p>${place.formatted_address}</p>` : ""}
              ${place.rating ? `<p>⭐ ${place.rating} (${place.user_ratings_total} reviews)</p>` : ""}
              ${
                place.opening_hours?.open_now !== undefined
                  ? `<p class="${place.opening_hours.open_now ? "text-green-600" : "text-red-600"}">
                  ${place.opening_hours.open_now ? "Open Now" : "Closed"}
                </p>`
                  : ""
              }
              ${walkingTime ? `<p class="text-blue-600">🚶‍♂️ ${walkingTime} min walk</p>` : ""}
              <div class="pt-2">
                <a
                  href="${mapsUrl}"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex items-center justify-center w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-center text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        `;

        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(mapInstanceRef.current, marker);
      });

      // Add click listener
      if (onPlaceClickRef.current) {
        marker.addListener("click", () => {
          // Set flag to prevent map click handler from firing
          (window as any).__mapMarkerClicked = true;
          setTimeout(() => {
            (window as any).__mapMarkerClicked = false;
          }, 100);
          onPlaceClickRef.current?.(place);
        });
      }

      markersRef.current.push(marker);
      bounds.extend(position);
      hasValidLocations = true;
    });

    // Include user location in bounds only when places are within 2km
    if (userLocation) {
      const isUserNearPlaces = places.some((place) => {
        if (!place.geometry?.location) return false;
        const { lat, lng } = place.geometry.location;
        return (
          getDistanceMeters(userLocation.lat, userLocation.lng, lat, lng) <=
          2000
        );
      });

      if (isUserNearPlaces) {
        bounds.extend(userLocation);
      }
    }

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
  }, [places, userLocation]);

  // Update marker icons when selection changes without refitting/zooming
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((marker) => {
      const placeId = (marker as any).__placeId as string | undefined;
      const isSelected =
        !!selectedPlace && !!placeId && placeId === selectedPlace.place_id;
      marker.setIcon(createPinIcon(isSelected));
    });
  }, [selectedPlace]);

  // Update user location marker - always show if available, in blue color
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    // Add user location marker if available
    if (userLocation) {
      userMarkerRef.current = new google.maps.Marker({
        position: userLocation,
        map: mapInstanceRef.current,
        title: "Your Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#3b82f6", // Blue-500
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
          scale: 12,
        },
      });
      // Set zIndex after marker creation to ensure it's always on top
      userMarkerRef.current.setZIndex(google.maps.Marker.MAX_ZINDEX + 1);

      // Center map on user location if no places are shown
      if (places.length === 0) {
        mapInstanceRef.current.setCenter(userLocation);
        mapInstanceRef.current.setZoom(15);
      }
    }
  }, [userLocation, places.length]);

  // Show InfoWindow when place is selected (card clicked)
  useEffect(() => {
    if (!mapInstanceRef.current || !infoWindowRef.current) return;

    if (selectedPlace) {
      // Find the marker for the selected place
      const selectedMarker = markersRef.current.find((marker) => {
        const position = marker.getPosition();
        if (!position || !selectedPlace.geometry?.location) return false;
        return (
          Math.abs(position.lat() - selectedPlace.geometry.location.lat) <
            0.0001 &&
          Math.abs(position.lng() - selectedPlace.geometry.location.lng) <
            0.0001
        );
      });

      if (selectedMarker) {
        const walkingTime = userLocation
          ? calculateWalkingTime(
              userLocation.lat,
              userLocation.lng,
              selectedPlace.geometry!.location.lat,
              selectedPlace.geometry!.location.lng,
            )
          : null;
        const selectedMapsUrl = getGoogleMapsUrl(
          selectedPlace.place_id,
          selectedPlace.name,
        );

        const photoHtml =
          selectedPlace.photos && selectedPlace.photos[0]
            ? `<div class="mb-2 overflow-hidden rounded-md">
               <img src="${getPlacePhotoUrl(selectedPlace.photos[0].photo_reference, 320)}" alt="${selectedPlace.name}" style="width:100%;height:120px;object-fit:cover;" />
             </div>`
            : "";

        const content = `
          <div class="p-2 max-w-[220px]">
            ${photoHtml}
            <h3 class="font-semibold text-gray-900 mb-1 text-sm leading-snug">${selectedPlace.name}</h3>
            <div class="space-y-1 text-xs text-gray-600 leading-snug">
              ${selectedPlace.formatted_address ? `<p>${selectedPlace.formatted_address}</p>` : ""}
              ${selectedPlace.rating ? `<p>⭐ ${selectedPlace.rating} (${selectedPlace.user_ratings_total} reviews)</p>` : ""}
              ${
                selectedPlace.opening_hours?.open_now !== undefined
                  ? `<p class="${selectedPlace.opening_hours.open_now ? "text-green-600" : "text-red-600"}">
                  ${selectedPlace.opening_hours.open_now ? "Open Now" : "Closed"}
                </p>`
                  : ""
              }
              ${walkingTime ? `<p class="text-blue-600">🚶‍♂️ ${walkingTime} min walk</p>` : ""}
              <div class="pt-2">
                <a
                  href="${selectedMapsUrl}"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex items-center justify-center w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-center text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        `;

        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(mapInstanceRef.current, selectedMarker);
      }
    } else {
      // Close InfoWindow when no place is selected
      infoWindowRef.current.close();
    }
  }, [selectedPlace, userLocation]);

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
    <div className={`relative w-full h-full ${className}`}>
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

      {/* User location status */}
      {!isLoading && userLocation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4 bg-white shadow-lg rounded-lg px-3 py-2 flex items-center space-x-2"
        >
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm text-gray-700">Your location</span>
        </motion.div>
      )}
    </div>
  );
}
