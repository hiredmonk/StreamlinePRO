import { z } from 'zod';

export const markNotificationReadSchema = z.object({
  id: z.uuid()
});
