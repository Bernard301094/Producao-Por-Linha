export let timeOffset = 0;
export let isTimeSynced = false;

const TIME_SOURCES = [
  async () => {
    const res = await fetch('https://worldtimeapi.org/api/timezone/America/Sao_Paulo', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('WorldTimeAPI failed');
    const data = await res.json();
    return new Date(data.datetime).getTime();
  },
  async () => {
    const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=America%2FSao_Paulo', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('TimeAPI.io failed');
    const data = await res.json();
    return new Date(data.dateTime).getTime();
  },
  async () => {
    // Use Cloudflare's trace endpoint - it returns server time in the Date header
    const res = await fetch('https://cloudflare.com/cdn-cgi/trace', { signal: AbortSignal.timeout(4000) });
    const serverDate = res.headers.get('date');
    if (!serverDate) throw new Error('Cloudflare trace failed');
    return new Date(serverDate).getTime();
  }
];

export const syncServerTime = async () => {
  try {
    // Race all sources simultaneously — fastest one wins
    const serverTime = await Promise.any(TIME_SOURCES.map(source => source()));
    timeOffset = serverTime - Date.now();
    isTimeSynced = true;
    console.log(`[TimeSync] Sincronizado. Offset: ${timeOffset}ms`);
  } catch {
    // All sources failed — silently use local time
    timeOffset = 0;
    isTimeSynced = true;
    console.warn('[TimeSync] All sources failed. Using local time silently.');
  }
};

export const getServerTime = (): Date => {
  return new Date(Date.now() + timeOffset);
};

export const getServerTimeISO = (): string => {
  return getServerTime().toISOString();
};
