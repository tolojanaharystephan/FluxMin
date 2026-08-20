export type GeoResult = {
  local: boolean;
  pays: string | null;
  paysCode: string | null;
  ville: string | null;
  region: string | null;
  isp: string | null;
  latitude: string | null;
  longitude: string | null;
  provider: string | null;
  mapUrl?: string | null;
};

const geoCache = new Map<string, { at: number; value: GeoResult }>();
const GEO_TTL_MS = 10 * 60 * 1000;
const GEO_SERVICE_URL = (process.env.GEO_SERVICE_URL || 'http://localhost:8001').replace(/\/$/, '');

export function extractClientIp(req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string {
  const xf = req.headers['x-forwarded-for'];
  const raw =
    (typeof xf === 'string' ? xf.split(',')[0] : Array.isArray(xf) ? xf[0] : '') ||
    req.headers['x-real-ip'] ||
    req.ip ||
    req.socket?.remoteAddress ||
    '';
  const ip = String(raw).trim().replace(/^::ffff:/, '');
  return ip || 'unknown';
}

export function isPrivateIp(ip: string): boolean {
  if (!ip || ip === 'unknown' || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return true;
  }
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  return false;
}

const emptyGeo = (provider: string | null = null): GeoResult => ({
  local: false,
  pays: null,
  paysCode: null,
  ville: null,
  region: null,
  isp: null,
  latitude: null,
  longitude: null,
  provider,
});

export async function geolocateIp(ip: string): Promise<GeoResult> {
  if (isPrivateIp(ip)) {
    return {
      ...emptyGeo('local'),
      local: true,
      ville: 'Réseau local',
      isp: 'IP privée — lookup public impossible',
    };
  }

  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.at < GEO_TTL_MS) return cached.value;

  try {
    const res = await fetch(`${GEO_SERVICE_URL}/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    const value: GeoResult = {
      local: !!data.local,
      pays: data.pays ?? null,
      paysCode: data.paysCode ?? null,
      ville: data.ville ?? null,
      region: data.region ?? null,
      isp: data.isp ?? null,
      latitude: data.latitude != null ? String(data.latitude) : null,
      longitude: data.longitude != null ? String(data.longitude) : null,
      provider: data.provider ?? null,
      mapUrl: data.mapUrl ?? null,
    };
    geoCache.set(ip, { at: Date.now(), value });
    return value;
  } catch {
    return emptyGeo(null);
  }
}
