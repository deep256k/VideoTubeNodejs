import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const registerUser = asyncHandler(async (req, res) => {
  // Steps to register the user
  //1. Get the values from request
  //2. Check for the validation
  //3. if validation fails return Error
  //4. check for the unique user
  //5. if not unique return
  // upload the profile and cover image using multer
  //6. upload the profile and cover image to clodinary
  // get the local files path using multer as a middleware
  //7. check for successful upload
  //8. if all we Register the user
  //9. get the Response .
  //10. If Success send the repsonse to client and remove refresh and auth token

  const { userName, email, fullName, password } = req.body;

  if ([userName, email, fullName, password].some((el) => el.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const isUserRegistered = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (isUserRegistered) {
    throw new ApiError(409, "User Already Registered");
  }

  let avatarPath;
  let coverImagePath;
  if (req.files && Array.isArray(req.files?.avatar)) {
    avatarPath = req.files?.avatar[0]?.path || "";
  }

  if (req.files && Array.isArray(req.files?.coverImage)) {
    coverImagePath = req.files?.coverImage[0]?.path;
  }

  console.log("request files", req.files);

  if (!avatarPath) {
    throw new ApiError(400, "Avatar file required");
  }

  const avatarCloudinaryPath = await uploadOnCloudinary(avatarPath);
  const coverImageCloudinaryPath = await uploadOnCloudinary(coverImagePath);

  if (!avatarCloudinaryPath) {
    throw new ApiError(500, "Error in Avatar upload");
  }

  const userRegisterFields = {
    userName: userName.toLowerCase(),
    email,
    fullName,
    password,
    avatar: avatarCloudinaryPath?.url,
    coverImage: coverImageCloudinaryPath?.url || "",
  };

  const user = await User.create(userRegisterFields);
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  if (!createdUser) {
    throw new ApiError(500, "Error during user Registration");
  }
  res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User Created Successfully"));
});
