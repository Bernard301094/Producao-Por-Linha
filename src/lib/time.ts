export let timeOffset = 0;
export let isTimeSynced = false;

export const syncServerTime = async () => {
  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/America/Sao_Paulo');
    if (!res.ok) throw new Error('Failed to fetch from WorldTimeAPI');
    const data = await res.json();
    const serverTime = new Date(data.datetime).getTime();
    timeOffset = serverTime - Date.now();
    isTimeSynced = true;
    console.log(`[TimeSync] Sincronizado. Offset: ${timeOffset}ms`);
  } catch (e) {
    console.warn('[TimeSync] Fallback to local time due to network block', e);
    isTimeSynced = false;
  }
};

export const getServerTime = (): Date => {
  return new Date(Date.now() + timeOffset);
};

export const getServerTimeISO = (): string => {
  return getServerTime().toISOString();
};
