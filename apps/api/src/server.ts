import express from "express";

import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { startScheduler } from "./scheduler/cron.js";

async function bootstrap() {
  try {
    await prisma.$connect();

    console.log("✅ Connected to database");

    startScheduler();

    console.log("⏰ Scheduler started");

    const app = express();

    app.get("/health", (_req, res) => {
      res.json({ status: "ok", uptime: process.uptime() });
    });

    app.listen(config.port, () => {
      console.log(`🌐 Health check listening on :${config.port}`);
    });
  } catch (error) {
    console.error("❌ Error starting application", error);

    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();
