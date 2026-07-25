/**
 * Venue formatting and map links.
 *
 * Coordinates are preferred over the address string when building directions: a
 * field with a name like "Pitch 3, North Complex" rarely geocodes correctly, but a
 * lat/lng always resolves to the right spot.
 */

export interface VenueLike {
    name: string;
    address?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    mapUrl?: string | null;
}

/** Single-line address for display, skipping any parts that weren't filled in. */
export function formatVenueAddress(venue: VenueLike): string {
    const parts = [venue.address, venue.city, venue.region, venue.postalCode].filter(
        (p): p is string => Boolean(p && p.trim()),
    );
    return parts.join(', ');
}

/** Full label combining the venue name with its address. */
export function formatVenueLabel(venue: VenueLike): string {
    const address = formatVenueAddress(venue);
    return address ? `${venue.name} — ${address}` : venue.name;
}

/**
 * A link that opens turn-by-turn directions.
 *
 * An explicit `mapUrl` wins, then coordinates, then the address text. Uses Google
 * Maps' universal URL, which iOS and Android both hand off to their native app.
 */
export function directionsUrl(venue: VenueLike): string | null {
    if (venue.mapUrl) return venue.mapUrl;

    if (typeof venue.latitude === 'number' && typeof venue.longitude === 'number') {
        return `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;
    }

    const address = formatVenueAddress(venue);
    if (!address) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

/** Static map-search link, for showing the location without starting navigation. */
export function mapSearchUrl(venue: VenueLike): string | null {
    if (venue.mapUrl) return venue.mapUrl;

    if (typeof venue.latitude === 'number' && typeof venue.longitude === 'number') {
        return `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`;
    }

    const address = formatVenueAddress(venue);
    if (!address) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Validate a coordinate pair, rejecting partial or out-of-range input. */
export function parseCoordinates(
    latitude: unknown,
    longitude: unknown,
): { latitude: number | null; longitude: number | null; error: string | null } {
    const hasLat = latitude !== undefined && latitude !== null && latitude !== '';
    const hasLng = longitude !== undefined && longitude !== null && longitude !== '';

    if (!hasLat && !hasLng) return { latitude: null, longitude: null, error: null };
    if (hasLat !== hasLng) {
        return { latitude: null, longitude: null, error: 'Provide both latitude and longitude, or neither' };
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return { latitude: null, longitude: null, error: 'Latitude must be between -90 and 90' };
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return { latitude: null, longitude: null, error: 'Longitude must be between -180 and 180' };
    }

    return { latitude: lat, longitude: lng, error: null };
}
