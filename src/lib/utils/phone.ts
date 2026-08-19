/**
 * Is this a number we can actually dial, and what does `tel:` need it to say?
 *
 * Shared by the customer's "call your rider" control and the rider's "call the
 * customer" control, so the two cannot disagree about what counts as a usable
 * number — a `tel:` link built from a half-entered number produces a dialler
 * full of nonsense, which is worse than a control that says it has nothing.
 *
 * Returns null when the number is unusable, which is the callers' signal to
 * render the control disabled rather than hide it.
 */
export function callablePhone(
  phone: string | null | undefined
): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  // India-only platform (see lib/location/pinned): a bare 10-digit number is
  // local, anything already carrying 91 is kept as dialled.
  return digits.startsWith("91") ? `+${digits}` : `+91${digits.slice(-10)}`;
}

/**
 * Turn-by-turn to a pin, in whatever the device uses for maps.
 *
 * `google.com/maps/dir/` rather than a `geo:` URI: geo: is Android-only and
 * silently dead on iOS, while this resolves to the Google Maps app when it is
 * installed on either platform and to the web map when it isn't.
 */
export function mapsDirectionsUrl(point: { lat: number; lng: number }): string {
  const destination = `${point.lat},${point.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination
  )}`;
}
