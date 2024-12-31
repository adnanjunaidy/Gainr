
import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { db } from "@db";
import { users, portfolioItems } from "@db/schema";
import { eq, and } from "drizzle-orm";

declare module "express-serve-static-core" {
  interface Request {
    user?: import("@db/schema").User;
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    const userId = Number(req.params.id);
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.json(user);
  });

  // Portfolio routes
  app.get("/api/portfolio", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const items = await db.query.portfolioItems.findMany({
      where: eq(portfolioItems.userId, req.user.id)
    });
    res.json(items);
  });

  app.post("/api/portfolio", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const item = await db.insert(portfolioItems).values({
      ...req.body,
      userId: req.user.id,
      purchaseDate: new Date(),
    }).returning();
    res.json(item[0]);
  });

  app.delete("/api/portfolio/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await db.delete(portfolioItems).where(and(
      eq(portfolioItems.id, parseInt(req.params.id)),
      eq(portfolioItems.userId, req.user.id)
    ));
    res.json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}

