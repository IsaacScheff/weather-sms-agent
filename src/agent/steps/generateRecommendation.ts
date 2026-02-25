import type { Intent, WeatherSnapshot } from '../types.js';

export type RecommendationOptions = {
  intent: Intent;
  weather: WeatherSnapshot;
  includeRefId?: boolean;
  traceId?: string;
};

function formatTemp(value: number): string {
  return `${Math.round(value)}C`;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function generateRecommendation(options: RecommendationOptions): string {
  const { intent, weather, includeRefId, traceId } = options;
  const suggestions: string[] = [];

  if (weather.precip_prob >= 0.4) {
    suggestions.push('Bring an umbrella or rain jacket');
  }
  if (weather.temp_high_c >= 28) {
    suggestions.push('Light breathable clothes + water');
  }
  if (weather.temp_low_c <= 5) {
    suggestions.push('Warm layers and a jacket');
  }
  if (weather.wind_kph && weather.wind_kph >= 30) {
    suggestions.push('Windy: secure hats and outer layers');
  }

  if (suggestions.length < 2) {
    suggestions.push('Comfortable shoes');
  }

  const activityHint = intent.activity ? ` for your ${intent.activity}` : '';

  let activitySuggestion = 'Good for outdoor plans.';
  if (weather.precip_prob >= 0.6) {
    activitySuggestion = 'Consider indoor activities.';
  } else if (weather.temp_high_c >= 30) {
    activitySuggestion = 'Best to stay in shade mid-day.';
  }

  const summary = `${weather.condition_summary}. High ${formatTemp(weather.temp_high_c)} / Low ${formatTemp(weather.temp_low_c)}. Rain chance ${percent(weather.precip_prob)}.`;
  const advice = `${suggestions.slice(0, 2).join(' · ')}${activityHint}.`;

  let message = `${summary} ${advice} ${activitySuggestion}`.trim();

  if (includeRefId && traceId) {
    message = `${message} (ref: ${traceId})`;
  }

  if (message.length > 480) {
    message = message.slice(0, 477).trimEnd() + '...';
  }

  return message;
}
