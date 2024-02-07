import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refershAccessToken,
  registerUser,
} from "../controller/user.controller.js";
import { uploadFiles } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

router.route("/login").post(loginUser);
router.route("/refersh-token").post(refershAccessToken);
// Secure Routes

router.route("/logout").post(verifyJWT, logoutUser);

export default router;
