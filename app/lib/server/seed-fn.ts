import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { seedUserData } from "./seed";

export const seedUserDataFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    return await seedUserData(data.userId);
  });
