export interface WeatherData {
  city: string;
  temperature: number;
  condition: string;
  icon: string;
  isDay: boolean;
  loading: boolean;
  error?: string;
}

const DEFAULT_WEATHER: WeatherData = {
  city: "Detecting Location...",
  temperature: 28,
  condition: "Mostly Clear",
  icon: "cloud-sun",
  isDay: true,
  loading: true,
};

function getWeatherCondition(code: number): { condition: string; icon: string } {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return { condition: "Clear Sky", icon: "sun" };
  if (code === 1) return { condition: "Mainly Clear", icon: "sun" };
  if (code === 2) return { condition: "Partly Cloudy", icon: "cloud-sun" };
  if (code === 3) return { condition: "Overcast", icon: "cloud" };
  if ([45, 48].includes(code)) return { condition: "Foggy / Mist", icon: "cloud-fog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: "Drizzle", icon: "cloud-drizzle" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: "Rainy", icon: "cloud-rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "Snow", icon: "cloud-snow" };
  if ([95, 96, 99].includes(code)) return { condition: "Thunderstorm", icon: "cloud-lightning" };
  return { condition: "Pleasant", icon: "cloud-sun" };
}

export async function fetchLiveLocationWeather(): Promise<WeatherData> {
  // Check localStorage cache first for fast display
  try {
    const cached = localStorage.getItem("maya_weather_cache");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - (parsed.cachedAt || 0) < 30 * 60 * 1000) {
        // Cached within 30 mins
        return { ...parsed, loading: false };
      }
    }
  } catch {}

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      fallbackIpWeather(resolve);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const weather = await fetchWeatherByCoords(lat, lon);
          resolve(weather);
        } catch {
          fallbackIpWeather(resolve);
        }
      },
      () => {
        // User denied or GPS disabled, fallback to IP geo
        fallbackIpWeather(resolve);
      },
      { timeout: 7000, enableHighAccuracy: false }
    );
  });
}

async function fetchWeatherByCoords(lat: number, lon: number): Promise<WeatherData> {
  // 1. Fetch live weather from free Open-Meteo API
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`
  );
  const weatherJson = await weatherRes.json();
  const current = weatherJson.current || {};
  const temp = Math.round(current.temperature_2m ?? 28);
  const code = current.weather_code ?? 2;
  const isDay = current.is_day === 1;
  const { condition, icon } = getWeatherCondition(code);

  // 2. Reverse Geocode to get City name
  let cityName = "Your Location";
  try {
    const geoRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      cityName = geoData.city || geoData.locality || geoData.principalSubdivision || "Your Area";
    }
  } catch {
    // fallback city
    cityName = "Local";
  }

  const result: WeatherData = {
    city: cityName,
    temperature: temp,
    condition,
    icon,
    isDay,
    loading: false,
  };

  try {
    localStorage.setItem(
      "maya_weather_cache",
      JSON.stringify({ ...result, cachedAt: Date.now() })
    );
  } catch {}

  return result;
}

async function fallbackIpWeather(resolve: (data: WeatherData) => void) {
  try {
    // Free IP based geolocation
    const ipRes = await fetch("https://ipapi.co/json/");
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      const lat = ipData.latitude || 22.5726;
      const lon = ipData.longitude || 88.3639;
      const city = ipData.city || "Local";
      const weather = await fetchWeatherByCoords(lat, lon);
      weather.city = city;
      resolve(weather);
      return;
    }
  } catch {}

  resolve({
    city: "Local",
    temperature: 28,
    condition: "Mostly Clear",
    icon: "cloud-sun",
    isDay: true,
    loading: false,
  });
}
