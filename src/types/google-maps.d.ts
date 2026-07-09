/**
 * Minimal ambient declarations for the slice of the Google Maps JS API we use
 * (map + draggable marker + geocoder + places autocomplete). Kept in-repo so we
 * don't have to pull the full @types/google.maps package for a few classes.
 */
declare namespace google.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }
  interface MapMouseEvent {
    latLng: LatLng | null;
  }
  interface MapsEventListener {
    remove(): void;
  }
  interface MapOptions {
    center?: LatLngLiteral | LatLng;
    zoom?: number;
    disableDefaultUI?: boolean;
    zoomControl?: boolean;
    clickableIcons?: boolean;
    gestureHandling?: string;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
  }
  class Map {
    constructor(el: HTMLElement, opts?: MapOptions);
    panTo(pos: LatLngLiteral | LatLng): void;
    setZoom(zoom: number): void;
    addListener(event: string, handler: (e: MapMouseEvent) => void): MapsEventListener;
  }
  interface MarkerOptions {
    map?: Map;
    position?: LatLngLiteral | LatLng;
    draggable?: boolean;
    title?: string;
  }
  class Marker {
    constructor(opts?: MarkerOptions);
    setPosition(pos: LatLngLiteral | LatLng): void;
    getPosition(): LatLng | null | undefined;
    setMap(map: Map | null): void;
    addListener(event: string, handler: (e: MapMouseEvent) => void): MapsEventListener;
  }
  interface GeocoderRequest {
    location?: LatLngLiteral | LatLng;
  }
  interface GeocoderResult {
    formatted_address: string;
  }
  interface GeocoderResponse {
    results: GeocoderResult[];
  }
  class Geocoder {
    geocode(request: GeocoderRequest): Promise<GeocoderResponse>;
  }
  namespace places {
    interface PlaceGeometry {
      location?: LatLng;
    }
    interface PlaceResult {
      geometry?: PlaceGeometry;
      formatted_address?: string;
      name?: string;
    }
    interface AutocompleteOptions {
      fields?: string[];
      componentRestrictions?: { country: string | string[] };
      types?: string[];
    }
    class Autocomplete {
      constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
      getPlace(): PlaceResult;
      addListener(event: string, handler: () => void): MapsEventListener;
    }
  }
}
