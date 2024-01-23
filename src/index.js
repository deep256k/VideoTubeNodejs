import { app } from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    // app.on("error", (err) => {
    //   console.log("EEROR In Connection", err);
    //   throw err;
    // });

    app.listen(4000, () => {
      console.log("APP IS RUNNING AT", 4000);
    });
  })
  .catch((err) => {
    console.log("DATABASE CONNECTION ERROR IS:", err);
  });
