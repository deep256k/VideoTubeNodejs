import { Router } from "express";
import { registerUser } from "../controller/user.controller.js";
import { uploadFiles } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(
  uploadFiles.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser,
);

export default router;
