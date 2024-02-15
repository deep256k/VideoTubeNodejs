import jwt from "jsonwebtoken";
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

const registerUser = asyncHandler(async (req, res) => {
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

const loginUser = asyncHandler(async (req, res) => {
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

const logoutUser = asyncHandler(async (req, res) => {
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

const refershAccessToken = asyncHandler(async (req, res) => {
  // Steps to Referesh the both tokens.
  //1. Get the refersh token from frontend via cookies or header
  //2. Decode the token and get the userid, if no user throw error
  //3. using Id get the refersh token of that user.
  //4. Compare both refersh token. If comparison fails then throw error
  //5. Generate new Tokens and send via cookies.
  //NOTE:- Refersh token should not be send via Authorization headers
  try {
    console.log("refershAccessToken");
    const incomingRefereshToken =
      req.cookies?.refereshToken || req.body?.refereshToken;
    if (!incomingRefereshToken) {
      throw new ApiError(400, "Refersh Token is not provided");
    }
    const decodedToken = jwt.verify(
      incomingRefereshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    console.log("decodedToken", decodedToken);
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(400, "Please provide a correct referesh token");
    }
    console.log("USER IS", user);

    //TODO- Check why refersh token is not getting saved in the DB

    if (incomingRefereshToken !== user?.refereshToken) {
      throw new ApiError(401, "Refersh token expired");
    }
    const { accessToken, refereshToken } = await generateAccessAndRefershTokens(
      user?._id,
    );

    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("refereshToken", refereshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refereshToken,
          },
          "token is refershed",
        ),
      );
  } catch (error) {
    throw new ApiError(400, "Error during generating refersh tokens");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  // Steps to Chnage password
  //1. get email, currentPassword, updatedPassword from user
  //2. if checks fails return error
  //3. check if provided password is correct. if not return error
  //3. find the user by emailid and update old password with the new one.
  //4. send the response to user after success.
  console.log("changePassword", changePassword);
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req?.user._id);
  const checkPassword = await user.isPasswordCorrect(oldPassword);
  console.log("checkPassword", checkPassword);
  if (!checkPassword) {
    throw new ApiError(404, "Invalid old password");
  }
  user.password = newPassword;

  //Read about this
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Chnaged Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req?.user, "current User fetched Successfully"));
});

const updateAccountDetails = () => {};

const getUserChannelProfile = asyncHandler(async (req, res) => {
  // LEARNING
  // when we subcribe any channel so we are pushing our and channel details to the subscription collection
  // Since both channel and subcriber are User so we push them as a USER schema.
  //  Steps  to get the profile Details
  // Suppose i land on a Channel and i want to find the number of subscriber , number of subscribed, whether i have subcribed or not
  //1. get the channel(userid) id from url params
  //2. Now get the information of that particular channel from the User collection
  //3. now we need to get the Subcriber, subscribed , isSubscribed info from the Subscription collection and join it with the currrent user
  //4. After joining we need to send the info to frontednd with the updated Subcriber, subscribed , isSubscribed fields
  //5. After getting the single document of that particular user.

  // THERE ARE 2 TYPES IN THE SUBSCRIPTION COLLECTION
  // 1. CHANNEL 2. SUBSCRIBER
  //. Steps  TO GET SUBSCRIBER
  // 1. search in the subscription collection and search in the CHANNEL where userid is equal to the given id
  //STEPS TO GET SUBSCRIBED COUNT
  // 1. search in the subscription collection and search in  the  SUBSCRIBER fields where userid is equla to the given id

  const channelName = req?.params;

  if (!channelName) {
    throw new ApiError(400, "channel name is missing");
  }

  const channelDetails = await User.aggregate([
    {
      $match: {
        userName: channelName?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "totalSubscriber",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$totalSubscriber",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$totalSubscriber.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelDetails[0],
        "User channel fetched successfully",
      ),
    );
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refershAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
};
