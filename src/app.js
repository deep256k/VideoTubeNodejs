import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// import Routes

import userRouter from "./routes/user.routes.js";

//declare Routes

app.use("/api/v1/users", userRouter);
app.use("/api/v1/login", userRouter);

// Secured Routes
app.use("/api/v1/logout", userRouter);

export { app };
