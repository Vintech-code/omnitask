import { clearWeatherCache, getWeatherForecast } from '@/services/WeatherService';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Open-Meteo weather service', () => {
  beforeEach(async () => {
    clearWeatherCache();
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('requests keyless current and hourly data and normalizes the response', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        latitude: 14.6,
        longitude: 121,
        timezone: 'Asia/Manila',
        current: { time: 1784422800, temperature_2m: 30.4, weather_code: 61, wind_speed_10m: 18, is_day: 1 },
        hourly: {
          time: [1784422800],
          temperature_2m: [30.4],
          precipitation_probability: [70],
          weather_code: [61],
          wind_speed_10m: [18],
          wind_gusts_10m: [28],
        },
      }),
    } as Response);

    const result = await getWeatherForecast({ latitude: 14.6, longitude: 121 }, { forecastDays: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('https://api.open-meteo.com/v1/forecast?');
    expect(url).toContain('precipitation_probability');
    expect(url).not.toContain('apikey');
    expect(result.current.temperatureC).toBe(30.4);
    expect(result.current.precipitationProbability).toBe(70);
    expect(result.hourly[0].windGustKmh).toBe(28);
    expect(result.source).toBe('network');
  });

  it('rejects invalid coordinates before making a request', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    await expect(getWeatherForecast({ latitude: 100, longitude: 121 })).rejects.toThrow('valid latitude');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('restores persisted dates and returns cached weather when offline', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        latitude: 14.6, longitude: 121, timezone: 'Asia/Manila',
        current: { time: 1784422800, temperature_2m: 29, weather_code: 3, wind_speed_10m: 10, is_day: 1 },
        hourly: {
          time: [1784422800], temperature_2m: [29], precipitation_probability: [35],
          weather_code: [3], wind_speed_10m: [10], wind_gusts_10m: [14],
        },
      }),
    } as Response);
    await getWeatherForecast({ latitude: 14.6, longitude: 121 }, { forecastDays: 2 });
    clearWeatherCache();
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    const cached = await getWeatherForecast({ latitude: 14.6, longitude: 121 }, { forecastDays: 2 });
    expect(cached.source).toBe('cache');
    expect(cached.current.time).toBeInstanceOf(Date);
    expect(cached.hourly[0].time).toBeInstanceOf(Date);
    expect(cached.current.temperatureC).toBe(29);
  });
});
