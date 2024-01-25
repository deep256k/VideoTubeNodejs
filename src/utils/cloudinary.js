import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs";

// CLOUDINARY_CLOUD_NAME = dfykobctu;
// CLOUDINARY_API_KEY = 359223474762154;
// CLOUDINARY_API_SECRET = EQp9UBdx65ly9UsG79D70T8ddgI;

cloudinary.config({
  cloud_name: "dfykobctu",
  api_key: "359223474762154",
  api_secret: "EQp9UBdx65ly9UsG79D70T8ddgI",
});

export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const cloudinaryResponse = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    return cloudinaryResponse;
  } catch (err) {
    fs.unlinkSync(localFilePath);
    return null; // removing the file from local system in case there is some error
  }
};
