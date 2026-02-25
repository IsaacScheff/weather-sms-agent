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
  const conditionLower = weather.condition_summary.toLowerCase();

  if (weather.precip_prob >= 0.4 || conditionLower.includes('rain') || conditionLower.includes('thunderstorm')) {
    suggestions.push('Bring an umbrella');
  }
  if (conditionLower.includes('snow')) {
    suggestions.push('Snow gear advised');
  }
  if (weather.temp_high_c >= 28) {
    suggestions.push('Light clothes and water');
  }
  if (weather.temp_low_c <= 5) {
    suggestions.push('Warm layers and a jacket');
  }
  if (weather.wind_kph && weather.wind_kph >= 30) {
    suggestions.push('Windy: secure hats and outer layers');
  }

  while (suggestions.length < 2) {
    suggestions.push('Comfortable shoes');
  }

  const activityHint = intent.activity ? ` Good for your ${intent.activity}.` : '';

  let activitySuggestion = 'Good for outdoor plans.';
  if (weather.precip_prob >= 0.6) {
    activitySuggestion = 'Consider indoor activities.';
  } else if (weather.temp_high_c >= 30) {
    activitySuggestion = 'Best to stay in shade mid-day.';
  }

  const summary = `${weather.condition_summary}. High ${formatTemp(weather.temp_high_c)} / Low ${formatTemp(weather.temp_low_c)}. Rain chance ${percent(weather.precip_prob)}.`;
  const advice = `${suggestions.slice(0, 2).join(' · ')}.`;

  let message = `${summary} ${advice}${activityHint} ${activitySuggestion}`.trim();

  if (includeRefId && traceId) {
    message = `${message} (ref: ${traceId})`;
  }

  if (message.length > 480) {
    message = message.slice(0, 477).trimEnd() + '...';
  }

  return message;
}
