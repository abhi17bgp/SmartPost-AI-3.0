const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const TokenBlacklist = require('../models/tokenBlacklistModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/email');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const multerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'smartpost-avatars',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

exports.uploadUserPhoto = upload.single('photo');

// Helper function to ensure owner is in members list
const ensureOwnerInMembers = (workspace) => {
  if (!workspace || !workspace.owner) return workspace;

  const ownerInMembers = workspace.members.some(m =>
    m.user._id.toString() === workspace.owner._id.toString()
  );

  if (!ownerInMembers) {
    workspace.members.push({
      user: workspace.owner,
      role: 'admin'
    });
  }

  return workspace;
};

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Calculate token expiry
  const expiresIn = process.env.JWT_EXPIRES_IN || '30d';
  const expiresInMs = parseInt(expiresIn) * 24 * 60 * 60 * 1000; // Convert days to ms
  const expiresAt = new Date(Date.now() + expiresInMs);

  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  };

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    expiresAt: expiresAt.toISOString(),
    data: { user }
  });
};

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

exports.register = catchAsync(async (req, res, next) => {
  const email = req.body.email.toLowerCase();
  
  // Grant 1-year Pro access to students automatically
  const isStudent = email.endsWith('.ac.in') || email.endsWith('.edu.in') || email.endsWith('.edu');

  const newUser = await User.create({
    name: req.body.name,
    email: email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    isSubscribed: isStudent,
    subscriptionExpiresAt: isStudent ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined
  });

  // Generate verification token
  const verificationToken = newUser.createEmailVerificationToken();
  await newUser.save({ validateBeforeSave: false });

  // Create default workspace for user
  await Workspace.create({
    name: 'My Workspace',
    owner: newUser._id,
    members: [{ user: newUser._id, role: 'admin' }]
  });

  // Send verification email
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verifyUrl = `${frontendUrl}/verify-email/${verificationToken}`;

  const message = `Welcome to SmartPost AI! Please verify your email address by clicking this link:\n\n${verifyUrl}\n\n`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background: #f4f4f5; color: #27272a; line-height: 1.7; }
        .wrapper { background: #f4f4f5; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
        .header { background: #ffffff; padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #f4f4f5; }
        .header img { height: 48px; margin-bottom: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
        .header-logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #09090b; }
        .header-subtitle { font-size: 14px; color: #71717a; font-weight: 500; margin-top: 4px; }
        .content { padding: 40px; }
        h2 { color: #09090b; font-size: 22px; margin-bottom: 16px; font-weight: 700; }
        p { color: #52525b; font-size: 15px; margin-bottom: 16px; }
        .highlight { color: #10b981; font-weight: 600; }
        .info-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px 20px; margin: 24px 0; border-radius: 0 6px 6px 0; }
        .info-box p { margin: 4px 0; font-size: 14px; color: #166534; }
        .button-container { text-align: center; margin: 32px 0; }
        .button { display: inline-block; background: #10b981; color: #fff !important; padding: 14px 48px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3); transition: all 0.2s; }
        .button-note { color: #a1a1aa; font-size: 12px; margin-top: 12px; }
        .steps { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 24px; margin: 24px 0; }
        .step { display: flex; margin: 14px 0; align-items: flex-start; }
        .step-number { background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin-right: 14px; flex-shrink: 0; font-size: 13px; }
        .step-content p { margin: 0; color: #3f3f46; font-size: 14px; }
        .footer { background: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7; font-size: 12px; color: #a1a1aa; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <img src="${frontendUrl}/logo.png" alt="SmartPost AI Logo" />
            <div class="header-logo">SmartPost AI</div>
            <div class="header-subtitle">Verify Your Email Address</div>
          </div>
          <div class="content">
            <h2>Welcome, ${newUser.name}!</h2>
            <p>Thank you for creating your SmartPost AI account. To complete your registration and unlock all features, please verify your email address by clicking the button below.</p>
            
            <div class="info-box">
              <p><strong>Why verify?</strong></p>
              <p>Email verification secures your account and enables us to send important workspace notifications and updates.</p>
            </div>
            
            <div class="button-container">
              <a href="${verifyUrl}" class="button">Verify Email Address</a>
              <p class="button-note">This link expires in 24 hours</p>
            </div>
            
            <p style="font-size: 13px; color: #a1a1aa; margin-top: 24px;">If you did not create this account, you can safely ignore this email. Your account will not be activated unless you verify.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SmartPost AI. All rights reserved.</p>
            <p style="margin-top: 6px; color: #a1a1aa;">This is an automated message — please do not reply.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      email: newUser.email,
      subject: 'Verify your SmartPost AI account',
      message,
      html
    });

    res.status(201).json({
      status: 'success',
      message: 'Registration successful! Verification email sent.',
      isStudent: isStudent
    });
  } catch (err) {
    console.error("SendGrid Verification Error: ", err);
    newUser.emailVerificationToken = undefined;
    newUser.emailVerificationExpires = undefined;
    await newUser.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the verification email. Try again later!', 500));
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) Deny login if email is not verified
  if (!user.isEmailVerified) {
    return next(new AppError('Please verify your email address to log in.', 401));
  }

  // 4) If everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res) => {
  // Extract token from header or cookie
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  let userId = null;
  // Blacklist the token if it exists and get user ID
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
      const expiresInMs = (process.env.JWT_EXPIRES_IN || 30) * 24 * 60 * 60 * 1000;

      await TokenBlacklist.create({
        token,
        userId: decoded.id,
        expiresAt: new Date(Date.now() + expiresInMs)
      });
    } catch (err) {
      // Token might be invalid or expired, but still clear the cookie
      console.log('Token blacklist error:', err.message);
    }
  }

  // Removed destructive workspace removal logic during logout

  // Clear the cookie
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // Check if token is blacklisted
  const blacklistedToken = await TokenBlacklist.findOne({ token });
  if (blacklistedToken) {
    return next(new AppError('This token has been invalidated. Please log in again.', 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist.', 401));
  }

  // Check if subscription has expired
  if (currentUser.isSubscribed && currentUser.subscriptionExpiresAt && currentUser.subscriptionExpiresAt < Date.now()) {
    currentUser.isSubscribed = false;
    // We do NOT clear performanceTestCount so they remain blocked until they pay again
    await currentUser.save({ validateBeforeSave: false });
  }

  req.user = currentUser;
  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background: #f4f4f5; color: #27272a; line-height: 1.7; }
        .wrapper { background: #f4f4f5; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
        .header { background: #ffffff; padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #f4f4f5; }
        .header img { height: 48px; margin-bottom: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2); }
        .header-logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #09090b; }
        .header-subtitle { font-size: 14px; color: #71717a; font-weight: 500; margin-top: 4px; }
        .content { padding: 40px; }
        h2 { color: #09090b; font-size: 22px; margin-bottom: 16px; font-weight: 700; }
        h3 { color: #09090b; font-size: 16px; margin-top: 28px; margin-bottom: 12px; font-weight: 700; }
        p { color: #52525b; font-size: 15px; margin-bottom: 16px; }
        .highlight { color: #dc2626; font-weight: 600; }
        .warning-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; margin: 24px 0; border-radius: 0 6px 6px 0; }
        .warning-box p { margin: 4px 0; font-size: 14px; color: #991b1b; }
        .warning-title { color: #dc2626; font-weight: 700; }
        .button-container { text-align: center; margin: 32px 0; }
        .button { display: inline-block; background: #dc2626; color: #fff !important; padding: 14px 48px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3); transition: all 0.2s; }
        .timer { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 10px; margin: 12px 0; text-align: center; color: #dc2626; font-weight: 600; font-size: 13px; }
        .security-tips { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 20px; margin: 24px 0; }
        .security-tips p { font-size: 14px; color: #3f3f46; margin: 6px 0; }
        .security-tips li { color: #52525b; font-size: 14px; margin: 8px 0; margin-left: 20px; }
        .footer { background: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7; font-size: 12px; color: #a1a1aa; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <img src="${frontendUrl}/logo.png" alt="SmartPost AI Logo" />
            <div class="header-logo">SmartPost AI</div>
            <div class="header-subtitle">Password Reset Request</div>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello <span class="highlight">${user.name}</span>,</p>
            
            <p>We received a request to reset the password for your SmartPost AI account. If you initiated this request, click the button below to securely set a new password.</p>
            
            <div class="button-container">
              <a href="${resetUrl}" class="button">Reset Your Password</a>
              <div class="timer">This link is valid for 10 minutes only</div>
            </div>
            
            <h3>Didn't request this?</h3>
            <div class="warning-box">
              <p><span class="warning-title">No action needed.</span></p>
              <p>If you did not request a password reset, simply ignore this email. Your account is secure and your current password remains unchanged.</p>
            </div>
            
            <h3>Security Tips</h3>
            <div class="security-tips">
              <p><strong>When setting your new password:</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Use a mix of uppercase, lowercase, numbers, and special characters</li>
                <li>Avoid easily guessable information like birthdays or names</li>
                <li>Do not reuse passwords from other accounts</li>
              </ul>
            </div>
            
            <p style="font-size: 13px; color: #a1a1aa; margin-top: 24px;">If you are having trouble, contact us at <a href="mailto:support@smartpostai.online" style="color: #dc2626;">support@smartpostai.online</a></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SmartPost AI. All rights reserved.</p>
            <p style="margin-top: 6px; color: #a1a1aa;">This is an automated message — please do not reply.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Reset Your Password — SmartPost AI',
      html
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    console.error("SendGrid Error: ", err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // Also validate payload
  if (!req.body.password || req.body.password.length < 8) {
    return next(new AppError('Password must be at least 8 characters long.', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.password; // 🔥 FIX

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // 3) Log the user in, send JWT
  createSendToken(user, 200, res);
});

// exports.verifyEmail = catchAsync(async (req, res, next) => {
//   const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

//   const user = await User.findOne({
//     emailVerificationToken: hashedToken,
//     emailVerificationExpires: { $gt: Date.now() }
//   });

//   if (!user) {
//     return next(new AppError('Verification link is invalid or has expired.', 400));
//   }

//   user.isEmailVerified = true;
//   user.emailVerificationToken = undefined;
//   user.emailVerificationExpires = undefined;
//   await user.save({ validateBeforeSave: false });

//   // Optionally log them in immediately upon verification, or just tell them to login.
//   // We'll return success and the frontend can push them to login.
//   res.status(200).json({
//     status: 'success',
//     message: 'Email has been verified successfully!'
//   });
// });


// updated code logic(under consideration)

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // 🔥 Step 1: find user ONLY by token (ignore expiry first)
  const user = await User.findOne({
    emailVerificationToken: hashedToken
  });

  // ❌ Token not found at all
  if (!user) {
    return next(new AppError('Invalid verification link.', 400));
  }

  // ✅ Already verified (IMPORTANT FIX)
  if (user.isEmailVerified) {
    return res.status(200).json({
      status: 'success',
      message: 'Email already verified ✅'
    });
  }

  // ❌ Expired token
  if (user.emailVerificationExpires < Date.now()) {
    return next(new AppError('Verification link has expired.', 400));
  }

  // ✅ Verify user
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Email has been verified successfully!'
  });
});


exports.deleteAccount = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  
  if (user) {
    // 1. Delete photo from Cloudinary
    if (user.photo && user.photo !== 'default.jpg') {
      try {
        const parts = user.photo.split('/');
        const filename = parts[parts.length - 1];
        const publicId = `smartpost-avatars/${filename.split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('Failed to delete photo from Cloudinary during account deletion:', err);
      }
    }

    // 2. Delete all workspaces owned by the user
    try {
      // Find workspaces to potentially notify users, or just bulk delete
      const ownedWorkspaces = await Workspace.find({ owner: userId });
      for (const ws of ownedWorkspaces) {
        if (req.app.get('io')) {
          req.app.get('io').to(ws._id.toString()).emit('workspace_deleted', ws._id);
        }
      }
      await Workspace.deleteMany({ owner: userId });
    } catch (err) {
      console.error('Failed to delete owned workspaces during account deletion:', err);
    }

    // 3. Remove user from all other workspaces where they are a member
    try {
      const workspaces = await Workspace.find({ 'members.user': userId });
      for (const workspace of workspaces) {
        workspace.members = workspace.members.filter(m => m.user.toString() !== userId);
        await workspace.save();
        
        if (req.app.get('io')) {
          await workspace.populate('owner', 'name email');
          await workspace.populate('members.user', 'name email');
          req.app.get('io').to(workspace._id.toString()).emit('workspace_updated', workspace);
        }
      }
    } catch (err) {
      console.error('Failed to remove user from workspaces during account deletion:', err);
    }

    // 4. Finally delete the user
    await User.findByIdAndDelete(userId);
  }

  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  res.status(204).json({ status: 'success', data: null });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password) {
    return next(new AppError('This route is not for password updates.', 400));
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = {};
  const allowedFields = ['name', 'bio', 'company', 'title'];
  Object.keys(req.body).forEach(el => {
    if (allowedFields.includes(el)) filteredBody[el] = req.body[el];
  });

  const currentUser = await User.findById(req.user.id);

  if (req.file || (req.body.removePhoto === true || req.body.removePhoto === 'true')) {
    // Check if user has an existing photo on Cloudinary
    if (currentUser.photo && currentUser.photo !== 'default.jpg') {
      try {
        const parts = currentUser.photo.split('/');
        const filename = parts[parts.length - 1]; // xyz.jpg
        const publicId = `smartpost-avatars/${filename.split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('Failed to delete old photo from Cloudinary:', err);
      }
    }

    if (req.file) {
      filteredBody.photo = req.file.path; // Cloudinary secure URL
    } else {
      filteredBody.photo = 'default.jpg';
    }
  }

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

exports.performanceCheck = catchAsync(async (req, res, next) => {
  const user = req.user;

  if (user.isSubscribed) {
    return res.status(200).json({
      status: 'success',
      data: { allowed: true, isPro: true }
    });
  }

  if (user.performanceTestCount < 4) {
    user.performanceTestCount += 1;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({
      status: 'success',
      data: {
        allowed: true,
        isPro: false,
        count: user.performanceTestCount,
        remaining: 4 - user.performanceTestCount
      }
    });
  }

  return res.status(403).json({
    status: 'fail',
    message: 'Free trial limit exceeded. Please upgrade to Pro to continue testing API performance.'
  });
});

// Get current user profile (for cross-device sync)
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});
