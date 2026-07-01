/** Solar geometry for the site — where the sun is, and therefore which way roof
 *  panels should face and which way shadows fall. Compact SunCalc algorithm
 *  (Vladimir Agafonkin, BSD-2). Angles in degrees; azimuth is a compass bearing
 *  (0 = north, 90 = east, clockwise). */

const RAD = Math.PI / 180;

export type SunPosition = {
  /** Compass bearing of the sun, degrees from north, clockwise. */
  azimuth: number;
  /** Angle above the horizon, degrees (negative = below the horizon). */
  elevation: number;
};

export function sunPosition(date: Date, lat: number, lng: number): SunPosition {
  const days = date.valueOf() / 86400000 - 0.5 + 2440588 - 2451545;
  const m = RAD * (357.5291 + 0.98560028 * days);
  const c = RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
  const eclipticLng = m + c + RAD * 102.9372 + Math.PI;
  const obliquity = RAD * 23.4397;
  const dec = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLng));
  const ra = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLng), Math.cos(eclipticLng));
  const siderealTime = RAD * (280.16 + 360.9856235 * days) - RAD * -lng;
  const hourAngle = siderealTime - ra;
  const phi = RAD * lat;
  const elevation = Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle),
  );
  const azFromSouth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi),
  );
  return {
    azimuth: (azFromSouth / RAD + 180 + 360) % 360,
    elevation: elevation / RAD,
  };
}

/** A UTC instant for a given hour of `base`'s date in the site's *mean solar
 *  time* — so the SunDial's hour slider reads intuitively (12 ≈ sun due south in
 *  the north) regardless of the browser's timezone. */
export function siteSolarTime(hour: number, lng: number, base: Date): Date {
  const d = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate()));
  // local mean solar time = UTC + lng/15h  →  UTC = localHour - lng/15
  d.setUTCMinutes(Math.round((hour - lng / 15) * 60));
  return d;
}

/** Compass label for a bearing, e.g. 200 → "SSW". */
export function compass(bearing: number): string {
  const names = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return names[Math.round((bearing % 360) / 22.5) % 16];
}

/** Relative shadow length (shadow / object height) = cot(elevation), clamped for
 *  a near-horizon sun so it stays drawable. Null when the sun is down. */
export function shadowLength(elevation: number): number | null {
  if (elevation <= 0.5) return null;
  return Math.min(1 / Math.tan(elevation * RAD), 12);
}
