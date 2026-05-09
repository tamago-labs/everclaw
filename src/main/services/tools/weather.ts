import { z } from 'zod';

export const weatherSchema = z.object({
  city: z.string().describe('City name'),
  country: z.string().optional().describe('Country code'),
});

export const weatherTool = {
  type: 'function' as const,
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: weatherSchema,
  execute: async ({ city, country }: { city: string; country?: string }) => {
    // Mock implementation - replace with real API call
    return `The weather in ${city} is sunny, 22°C with light clouds.`;
  }
};
