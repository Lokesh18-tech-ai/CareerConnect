import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const isDev = process.env.NODE_ENV !== "production";

app.use(
  pinoHttp({
    logger,
    // In dev, log all requests. In prod, skip health checks.
    autoLogging: isDev
      ? true
      : { ignore: (req) => req.url === "/api/healthz" },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

app.use(
  cors({
    origin: isDev
      ? [
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:4173",
          "http://127.0.0.1:5173",
        ]
      : process.env.FRONTEND_URL ?? true,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
