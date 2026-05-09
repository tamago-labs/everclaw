import { z } from 'zod';

export const weatherSchema = z.object({
  city: z.string().describe('City name'),
  country: z.string().optional().describe('Country code'),
});

// Tool metadata for UI
export const weatherMetadata = {
  uiDescription: 'Get real-time weather information for any city worldwide. Returns temperature, conditions, humidity, and more. Perfect for travel planning or daily weather updates.',
  tags: ['weather', 'realtime', 'api'],
  requiredTools: [] as string[],
  parameters: {
    city: { type: 'string', description: 'City name', required: true },
    country: { type: 'string', description: 'Country code', required: false },
  },
};

export const weatherTool = {
  type: 'function' as const,
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: weatherSchema,
  metadata: weatherMetadata,
  execute: async (result: { city: string; country?: string }) => {
    // Mock implementation - replace with real API call
    return `The weather in ${result.city} is sunny, 22°C with light clouds.`;
  }
};
