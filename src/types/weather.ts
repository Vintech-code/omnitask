export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface HourlyWeather {
  time: Date;
  temperatureC: number;
  precipitationProbability: number;
  weatherCode: number;
  windSpeedKmh: number;
  windGustKmh: number;
}

export interface CurrentWeather {
  time: Date;
  temperatureC: number;
  precipitationProbability: number;
  weatherCode: number;
  windSpeedKmh: number;
  apparentTemperatureC?: number;
  humidityPercent?: number;
  isDay: boolean;
}

export interface WeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  fetchedAt: number;
  source?: 'network' | 'cache';
  isStale?: boolean;
}

export type WeatherWarningReason = 'rain' | 'severe-condition' | 'strong-wind';

export interface WeatherWarningAssessment {
  shouldWarn: boolean;
  reasons: WeatherWarningReason[];
  severity: 'none' | 'advisory' | 'severe';
}

export type DayLensRiskLevel = 'clear' | 'advisory' | 'severe';

export interface DayLensInsight {
  eventId: string;
  level: DayLensRiskLevel;
  condition: string;
  guidance: string;
  precipitationProbability: number;
  temperatureC: number;
  weatherCode: number;
}
