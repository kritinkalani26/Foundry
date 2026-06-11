const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Bengaluru":  { lat: 12.9716, lng: 77.5946 },
  "Bangalore":  { lat: 12.9716, lng: 77.5946 },
  "Mumbai":     { lat: 19.0760, lng: 72.8777 },
  "Delhi":      { lat: 28.7041, lng: 77.1025 },
  "Pune":       { lat: 18.5204, lng: 73.8567 },
  "Hyderabad":  { lat: 17.3850, lng: 78.4867 },
  "Chennai":    { lat: 13.0827, lng: 80.2707 },
  "Kolkata":    { lat: 22.5726, lng: 88.3639 },
  "Ahmedabad":  { lat: 23.0225, lng: 72.5714 },
  "Indore":     { lat: 22.7196, lng: 75.8577 },
  "Kota":       { lat: 25.2138, lng: 75.8648 },
  "Nagpur":     { lat: 21.1458, lng: 79.0882 },
  "Bhopal":     { lat: 23.2599, lng: 77.4126 },
  "Varanasi":   { lat: 25.3176, lng: 82.9739 },
  "Patna":      { lat: 25.5941, lng: 85.1376 },
  "Ludhiana":   { lat: 30.9010, lng: 75.8573 },
  "Coimbatore": { lat: 11.0168, lng: 76.9558 },
  "Surat":      { lat: 21.1702, lng: 72.8311 },
  "Jaipur":     { lat: 26.9124, lng: 75.7873 },
  "Chandigarh": { lat: 30.7333, lng: 76.7794 },
};

export function getCityCoords(city: string): { lat: number; lng: number } | null {
  return CITY_COORDS[city] ?? CITY_COORDS[city.trim()] ?? null;
}

export { CITY_COORDS };
