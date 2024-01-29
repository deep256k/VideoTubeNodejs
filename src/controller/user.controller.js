import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefershTokens = async (userId) => {
  try {
    const user = await User.findById(userId._id);
    if (!user) {
      throw new ApiError(500, "Error while getting the User");
    }
    const accessToken = user.generateAccessToken();
    const refereshToken = user.generateRefreshToken();
    user.refereshToken = refereshToken;
    // saving refersh token in DB.
    await user.save({ validateBeforeSave: false });
    return { accessToken, refereshToken };
  } catch (error) {
    throw new ApiError(500, "Error in generating Access and Refersh Tokens");
  }
};

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

export const loginUser = asyncHandler(async (req, res) => {
  // Steps to login a user
  //1. check if email, username and password is provided, if not return
  //2. check if user exist for provided email and username in the DB, if not return
  //3. fetch user from DB and validate the password, if password does not match retuen
  //4. if password matches, Generate a access token and referesh token.
  //5. Save the referesh token in the DB.
  //6 Send a response for the suucessful login along with the access and referesh token in the cookies.

  const { email, userName, password } = req.body;

  if (!(email || userName)) {
    throw new ApiError(400, "Please provide Username or Email");
  }

  const user = await User.findOne({
    $or: [{ email }, { userName }],
  });

  if (!user) {
    throw new ApiError(404, "User Does not exist");
  }

  //   console.log("User is", user);
  const isPasswordValid = await user.isPasswordCorrect(user?.password);

  //   console.log("isPasswordValid", isPasswordValid);
  //   if (!isPasswordValid) {
  //     throw new ApiError(401, "Please enter a correct password");
  //   }

  const { accessToken, refereshToken } = await generateAccessAndRefershTokens(
    user._id,
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  // Sending Secure Cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refereshToken", refereshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refereshToken },
        "User Logged in Successfully",
      ),
    );
});

export const logoutUser = asyncHandler(async (req, res) => {
  // Steps to logout USer
  //1. This will be secure route so add a middle ware to extract acesstoken and refersh token.
  //2. We need to get the refersh token from the frontend,
  //3. validate the refresh toke, if not throw error
  //4. reteriew the userid from the refersh token, if not return error

  // All Above steps are done by Middleware
  //5. delete the cokkies and delete the refersh token from DB.
  console.log("user Logout");
  await User.findByIdAndUpdate(
    req?.user._id,
    {
      $set: {
        refereshToken: undefined,
      },
    },
    {
      new: true,
    },
  );

  // Sending Secure Cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refereshToken", options)
    .json(new ApiResponse(200, {}, "User Loggedout Successfully"));
});
