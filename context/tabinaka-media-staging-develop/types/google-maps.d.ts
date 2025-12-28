// Google Maps JavaScript API type declarations

interface Window {
  google: typeof google;
}

declare namespace google.maps {
  class Map {
    constructor(mapDiv: Element, opts?: MapOptions);
    fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral): void;
    getBounds(): LatLngBounds | undefined;
    getCenter(): LatLng;
    getDiv(): Element;
    getZoom(): number;
    panTo(latLng: LatLng | LatLngLiteral): void;
    setCenter(latlng: LatLng | LatLngLiteral): void;
    setZoom(zoom: number): void;
    addListener(eventName: string, handler: Function): MapsEventListener;
  }

  interface MapOptions {
    center?: LatLng | LatLngLiteral;
    zoom?: number;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    zoomControl?: boolean;
    styles?: MapTypeStyle[];
    gestureHandling?: "greedy" | "cooperative" | "auto" | "none";
  }

  interface MapTypeStyle {
    featureType?: string;
    elementType?: string;
    stylers?: Array<{ [key: string]: any }>;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
    toString(): string;
    toJSON(): LatLngLiteral;
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  class LatLngBounds {
    constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
    extend(point: LatLng | LatLngLiteral): LatLngBounds;
    getCenter(): LatLng;
    getNorthEast(): LatLng;
    getSouthWest(): LatLng;
    contains(latLng: LatLng | LatLngLiteral): boolean;
    toJSON(): LatLngBoundsLiteral;
  }

  interface LatLngBoundsLiteral {
    east: number;
    north: number;
    south: number;
    west: number;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    setMap(map: Map | null): void;
    getPosition(): LatLng | undefined;
    setPosition(latlng: LatLng | LatLngLiteral): void;
    setTitle(title: string): void;
    setIcon(icon: string | Icon | Symbol): void;
    setZIndex(zIndex: number): void;
    addListener(eventName: string, handler: Function): MapsEventListener;
    static MAX_ZINDEX: number;
  }

  interface MarkerOptions {
    position?: LatLng | LatLngLiteral;
    map?: Map;
    title?: string;
    icon?: string | Icon | Symbol;
    animation?: Animation;
    zIndex?: number;
  }

  interface Icon {
    url: string;
    size?: Size;
    scaledSize?: Size;
    anchor?: Point;
  }

  interface Symbol {
    path: string | SymbolPath;
    fillColor?: string;
    fillOpacity?: number;
    scale?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
  }

  enum SymbolPath {
    CIRCLE,
    FORWARD_CLOSED_ARROW,
    FORWARD_OPEN_ARROW,
    BACKWARD_CLOSED_ARROW,
    BACKWARD_OPEN_ARROW,
  }

  enum Animation {
    BOUNCE,
    DROP,
  }

  class Size {
    constructor(
      width: number,
      height: number,
      widthUnit?: string,
      heightUnit?: string,
    );
    width: number;
    height: number;
  }

  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  interface MapsEventListener {
    remove(): void;
  }

  namespace event {
    function addListener(
      instance: object,
      eventName: string,
      handler: Function,
    ): MapsEventListener;
    function addListenerOnce(
      instance: object,
      eventName: string,
      handler: Function,
    ): MapsEventListener;
    function removeListener(listener: MapsEventListener): void;
  }
}
