import { NextRequest, NextResponse } from "next/server";

const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required." }, { status: 400 });
  }
  if (!MAPS_KEY) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY not configured." }, { status: 500 });
  }

  try {
    const url  = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status !== "OK" || !data.results?.[0]) {
      return NextResponse.json({ error: "Could not reverse geocode location." }, { status: 400 });
    }

    const result     = data.results[0];
    const components = result.address_components as Array<{ long_name: string; short_name: string; types: string[] }>;

    const get = (type: string) =>
      components.find(c => c.types.includes(type))?.long_name ?? "";

    return NextResponse.json({
      data: {
        formatted:  result.formatted_address,
        lineOne:    `${get("street_number")} ${get("route")}`.trim() || get("sublocality_level_1") || get("sublocality"),
        city:       get("locality") || get("administrative_area_level_2"),
        state:      get("administrative_area_level_1"),
        pincode:    get("postal_code"),
        country:    get("country"),
      },
    });
  } catch (err) {
    console.error("[geocode]", err);
    return NextResponse.json({ error: "Geocoding failed." }, { status: 500 });
  }
}
