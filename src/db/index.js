import mongoose from "mongoose";
import { DATABASE_NAME } from "../constant.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.DATABASE_CONNECTION_STRING}/${DATABASE_NAME}`,
    );
    console.log(
      "DATABASE CONNECTED SUCCESSFULLY",
      connectionInstance.connection.port,
    );
  } catch (error) {
    console.log("DATABASE CONNECTION ERROR: ", error);
    process.exit(1);
  }
};

export default connectDB;
