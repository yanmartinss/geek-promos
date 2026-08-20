import cron from "node-cron";
import { checkPromotionsJob } from "../jobs/check-promotion.job.js";

export function startScheduler() {
  let isRunning = false;

  cron.schedule("*/10 * * * *", async () => {
    if (isRunning) {
      console.warn("⏳ checkPromotionsJob ainda em execução, pulando este tick do cron.");
      return;
    }

    console.log("🔎 Checking promotions...");
    isRunning = true;

    try {
      await checkPromotionsJob();
    } catch (error) {
      console.error("❌ checkPromotionsJob failed:", error);
    } finally {
      isRunning = false;
    }
  });
}
