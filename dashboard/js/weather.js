/**
 * weather.js
 * Dhaka Live Weather Service using Open-Meteo API (Free, keyless)
 */

const CACHE_KEY = 'aura_weather_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const DHAKA_COORDS = { lat: 23.8103, lon: 90.4125 };

const WMO_CODES = {
  0: { label: 'Clear Sky', icon: 'sun' },
  1: { label: 'Mainly Clear', icon: 'sun' },
  2: { label: 'Partly Cloudy', icon: 'cloud-sun' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Foggy', icon: 'cloud' },
  48: { label: 'Depositing Rime Fog', icon: 'cloud' },
  51: { label: 'Light Drizzle', icon: 'cloud-drizzle' },
  53: { label: 'Moderate Drizzle', icon: 'cloud-drizzle' },
  61: { label: 'Slight Rain', icon: 'cloud-rain' },
  63: { label: 'Moderate Rain', icon: 'cloud-rain' },
  65: { label: 'Heavy Rain', icon: 'cloud-rain' },
  80: { label: 'Rain Showers', icon: 'cloud-rain' },
  95: { label: 'Thunderstorm', icon: 'cloud-lightning' }
};

export async function fetchDhakaWeather() {
  // Check cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        return parsed.data;
      }
    }
  } catch (e) {
    console.warn('Weather cache read error', e);
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${DHAKA_COORDS.lat}&longitude=${DHAKA_COORDS.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FDhaka`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const cur = json.current;
    const weatherInfo = WMO_CODES[cur.weather_code] || { label: 'Partly Cloudy', icon: 'cloud-sun' };

    const payload = {
      temp: Math.round(cur.temperature_2m),
      condition: weatherInfo.label,
      iconType: weatherInfo.icon,
      humidity: cur.relative_humidity_2m,
      windSpeed: cur.wind_speed_10m,
      city: 'Dhaka, BD'
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: payload
    }));

    return payload;
  } catch (err) {
    console.warn('Live weather fetch failed, using fallback', err);
    return {
      temp: 29,
      condition: 'Tropical Warm',
      iconType: 'cloud-sun',
      humidity: 72,
      windSpeed: 8,
      city: 'Dhaka, BD'
    };
  }
}
