const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const TokenBlacklist = require('../models/tokenBlacklistModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/email');

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
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
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
  const frontendUrl = 'http://localhost:5173' ;
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
        .wrapper { background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
        .header-logo { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 10px; }
        .header-subtitle { font-size: 14px; opacity: 0.95; font-weight: 500; }
        .content { padding: 40px 30px; }
        .lang-section { margin-bottom: 50px; }
        .lang-header { font-size: 12px; color: #10b981; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        h2 { color: #1f2937; font-size: 22px; margin-bottom: 15px; font-weight: 700; }
        h3 { color: #1f2937; font-size: 16px; margin-top: 25px; margin-bottom: 12px; font-weight: 700; }
        p { color: #4b5563; font-size: 15px; margin-bottom: 12px; line-height: 1.7; }
        .highlight { color: #10b981; font-weight: 600; }
        .info-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px; }
        .info-box p { margin: 5px 0; font-size: 14px; color: #2d5a3d; }
        .button-container { text-align: center; margin: 35px 0; }
        .button { display: inline-block; background: #10b981; color: #ffffff !important; padding: 14px 42px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: background 0.3s ease; }
        .button:hover { background: #059669; }
        .button-note { color: #6b7280; font-size: 12px; margin-top: 10px; }
        .steps { background: #f9fafb; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .step { display: flex; margin: 12px 0; }
        .step-number { background: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin-right: 12px; flex-shrink: 0; font-size: 14px; }
        .step-content { flex: 1; }
        .step-content p { margin: 0; }
        .divider { height: 1px; background: #e5e7eb; margin: 30px 0; }
        .footer { background: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .footer p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="header-logo">SmartPost AI</div>
            <div class="header-subtitle">Email Verification Required</div>
          </div>
          <div class="content">
            <!-- ENGLISH SECTION -->
            <div class="lang-section">
              <div class="lang-header">English</div>
              
              <h2>Welcome to SmartPost AI</h2>
              <p>Hello <span class="highlight">${newUser.name}</span>,</p>
              
              <p>Thank you for creating your SmartPost AI account. We're excited to have you on board! To complete your registration and access all features of our platform, please verify your email address.</p>
              
              <div class="info-box">
                <p><strong>Why verify your email?</strong></p>
                <p>Email verification ensures the security of your account and allows us to send you important notifications and updates about your workspace.</p>
              </div>
              
              <div class="button-container">
                <a href="${verifyUrl}" class="button">Verify Email Address</a>
                <p class="button-note">This link will expire in 24 hours</p>
              </div>
              
              <h3>Getting Started</h3>
              <p>Once your email is verified, you'll be able to:</p>
              <div class="steps">
                <div class="step">
                  <div class="step-number">1</div>
                  <div class="step-content">
                    <p><strong>Create Workspaces</strong> - Set up project-specific environments for your API testing</p>
                  </div>
                </div>
                <div class="step">
                  <div class="step-number">2</div>
                  <div class="step-content">
                    <p><strong>Build Requests</strong> - Create and manage API requests with advanced testing capabilities</p>
                  </div>
                </div>
                <div class="step">
                  <div class="step-number">3</div>
                  <div class="step-content">
                    <p><strong>Collaborate</strong> - Invite team members and work together in real-time</p>
                  </div>
                </div>
              </div>
              
              <p>If you did not create this account, please disregard this email. Your account will not be activated unless you verify your email address.</p>
            </div>
            
            <div class="divider"></div>
            
            <!-- HINDI SECTION -->
            <div class="lang-section">
              <div class="lang-header">हिंदी</div>
              
              <h2>SmartPost AI में आपका स्वागत है</h2>
              <p>नमस्ते <span class="highlight">${newUser.name}</span>,</p>
              
              <p>SmartPost AI खाता बनाने के लिए धन्यवाद। हम आपको हमारे प्लेटफॉर्म पर स्वागत करते हैं! अपने खाते को सक्रिय करने और हमारे प्लेटफॉर्म की सभी सुविधाओं तक पहुंचने के लिए कृपया अपना ईमेल पता सत्यापित करें।</p>
              
              <div class="info-box">
                <p><strong>ईमेल को सत्यापित करना क्यों महत्वपूर्ण है?</strong></p>
                <p>ईमेल सत्यापन आपके खाते की सुरक्षा सुनिश्चित करता है और हमें आपको महत्वपूर्ण अधिसूचनाएं और अपडेट भेजने की अनुमति देता है।</p>
              </div>
              
              <div class="button-container">
                <a href="${verifyUrl}" class="button">ईमेल पता सत्यापित करें</a>
                <p class="button-note">यह लिंक 24 घंटों में समाप्त हो जाएगा</p>
              </div>
              
              <h3>शुरुआत करना</h3>
              <p>एक बार आपका ईमेल सत्यापित हो जाने के बाद, आप निम्न कर सकेंगे:</p>
              <div class="steps">
                <div class="step">
                  <div class="step-number">1</div>
                  <div class="step-content">
                    <p><strong>कार्यक्षेत्र बनाएं</strong> - अपने API परीक्षण के लिए परियोजना-विशिष्ट वातावरण सेट करें</p>
                  </div>
                </div>
                <div class="step">
                  <div class="step-number">2</div>
                  <div class="step-content">
                    <p><strong>अनुरोध बनाएं</strong> - उन्नत परीक्षण क्षमताओं के साथ API अनुरोध बनाएं और प्रबंधित करें</p>
                  </div>
                </div>
                <div class="step">
                  <div class="step-number">3</div>
                  <div class="step-content">
                    <p><strong>सहयोग करें</strong> - टीम के सदस्यों को आमंत्रित करें और रीयल-टाइम में एक साथ काम करें</p>
                  </div>
                </div>
              </div>
              
              <p>यदि आपने यह खाता नहीं बनाया है, तो कृपया इस ईमेल को अनदेखा करें। आपका खाता तब तक सक्रिय नहीं होगा जब तक आप अपने ईमेल पते को सत्यापित न करें।</p>
            </div>
          </div>
          
          <div class="footer">
            <p>SmartPost AI Automation</p>
            <p>© ${new Date().getFullYear()} All rights reserved</p>
            <p style="margin-top: 10px; color: #9ca3af;">This is an automated email. Please do not reply to this message.</p>
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
      message: 'Registration successful! Verification email sent.'
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

  // Remove user from all workspaces they're a member of
  if (userId) {
    try {
      const workspaces = await Workspace.find({ 
        'members.user': userId
      });

      for (const workspace of workspaces) {
        // Remove user from members array
        workspace.members = workspace.members.filter(m => m.user.toString() !== userId);
        await workspace.save();

        // Emit workspace_updated to refresh member lists
        await workspace.populate('owner', 'name email');
        await workspace.populate('members.user', 'name email');
        req.app.get('io').to(workspace._id.toString()).emit('workspace_updated', workspace);
      }
    } catch (err) {
      console.log('Error removing user from workspaces on logout:', err.message);
    }
  }

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
  const frontendUrl =  'http://localhost:5173' ;
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
        .wrapper { background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
        .header-logo { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 10px; }
        .header-subtitle { font-size: 14px; opacity: 0.95; font-weight: 500; }
        .content { padding: 40px 30px; }
        .lang-section { margin-bottom: 50px; }
        .lang-header { font-size: 12px; color: #dc2626; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        h2 { color: #1f2937; font-size: 22px; margin-bottom: 15px; font-weight: 700; }
        h3 { color: #1f2937; font-size: 16px; margin-top: 25px; margin-bottom: 12px; font-weight: 700; }
        p { color: #4b5563; font-size: 15px; margin-bottom: 12px; line-height: 1.7; }
        strong { font-weight: 700; }
        .highlight { color: #dc2626; font-weight: 600; }
        .warning-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px; }
        .warning-box p { margin: 5px 0; font-size: 14px; color: #7f1d1d; }
        .warning-title { color: #991b1b; font-weight: 700; }
        .info-box { background: #f3f4f6; border-left: 4px solid #6b7280; padding: 16px; margin: 20px 0; border-radius: 4px; }
        .info-box p { margin: 5px 0; font-size: 14px; color: #374151; }
        .button-container { text-align: center; margin: 35px 0; }
        .button { display: inline-block; background: #dc2626; color: #ffffff !important; padding: 14px 42px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); transition: background 0.3s ease; }
        .button:hover { background: #b91c1c; }
        .button-note { color: #6b7280; font-size: 12px; margin-top: 10px; }
        .timer { background: #fee2e2; border: 1px solid #fecaca; border-radius: 4px; padding: 12px; margin: 10px 0; text-align: center; color: #991b1b; font-weight: 600; font-size: 14px; }
        .security-tips { background: #faf5ff; border: 1px solid #f3e8ff; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .security-tips p { font-size: 14px; color: #4c1d95; margin: 8px 0; }
        .security-tips li { color: #4c1d95; font-size: 14px; margin: 8px 0; margin-left: 20px; }
        .divider { height: 1px; background: #e5e7eb; margin: 30px 0; }
        .footer { background: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .footer p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="header-logo">SmartPost AI</div>
            <div class="header-subtitle">Password Reset Request</div>
          </div>
          <div class="content">
            <!-- ENGLISH SECTION -->
            <div class="lang-section">
              <div class="lang-header">English</div>
              
              <h2>Password Reset Request</h2>
              <p>Hello <span class="highlight">${user.name}</span>,</p>
              
              <p>We received a request to reset the password for your SmartPost AI account. If you initiated this request, please click the button below to securely set a new password.</p>
              
              <div class="button-container">
                <a href="${resetUrl}" style="display: inline-block;" class="button">Reset Your Password</a>
                <div class="timer">Valid for 10 minutes only</div>
              </div>
              
              <h3>What if you didn't request this?</h3>
              <div class="warning-box">
                <p><span class="warning-title">No action needed</span></p>
                <p>If you did not request a password reset, please disregard this email. Your account is secure and your current password remains unchanged. Never share your password with anyone.</p>
              </div>
              
              <h3>Security Best Practices</h3>
              <div class="security-tips">
                <p><strong>When setting your new password, please remember:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Use a strong password with a mix of uppercase, lowercase, numbers, and special characters</li>
                  <li>Avoid using easily guessable information like birthdays or names</li>
                  <li>Do not reuse passwords from other accounts</li>
                  <li>Consider enabling two-factor authentication for additional security</li>
                </ul>
              </div>
              
              <div class="info-box">
                <p><strong>Need help?</strong> If you're having trouble resetting your password, please contact our support team at support@smartpost.ai</p>
              </div>
            </div>
            
            <div class="divider"></div>
            
            <!-- HINDI SECTION -->
            <div class="lang-section">
              <div class="lang-header">हिंदी</div>
              
              <h2>पासवर्ड रीसेट अनुरोध</h2>
              <p>नमस्ते <span class="highlight">${user.name}</span>,</p>
              
              <p>हमने आपके SmartPost AI खाते के पासवर्ड को रीसेट करने के लिए एक अनुरोध प्राप्त किया है। यदि आपने यह अनुरोध किया है, तो कृपया नीचे दिए गए बटन पर क्लिक करें और एक नया पासवर्ड सेट करें।</p>
              
              <div class="button-container">
                <a href="${resetUrl}" style="display: inline-block;" class="button">अपना पासवर्ड रीसेट करें</a>
                <div class="timer">केवल 10 मिनट के लिए वैध</div>
              </div>
              
              <h3>अगर आपने यह अनुरोध नहीं किया</h3>
              <div class="warning-box">
                <p><span class="warning-title">कोई कार्रवाई की आवश्यकता नहीं</span></p>
                <p>यदि आपने पासवर्ड रीसेट का अनुरोध नहीं किया है, तो कृपया इस ईमेल को अनदेखा करें। आपका खाता सुरक्षित है और आपका वर्तमान पासवर्ड अपरिवर्तित रहेगा। कभी भी अपना पासवर्ड किसी को साझा न करें।</p>
              </div>
              
              <h3>सुरक्षा सर्वोत्तम प्रथाएं</h3>
              <div class="security-tips">
                <p><strong>अपना नया पासवर्ड सेट करते समय, कृपया याद रखें:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>एक मजबूत पासवर्ड का उपयोग करें जिसमें अपरकेस, लोअरकेस, नंबर और विशेष वर्ण हों</li>
                  <li>जन्मदिन या नामों जैसी आसानी से अनुमान लगाई जा सकने वाली जानकारी का उपयोग न करें</li>
                  <li>अन्य खातों से पासवर्ड का पुनः उपयोग न करें</li>
                  <li>अतिरिक्त सुरक्षा के लिए दो-कारक प्रमाणीकरण सक्षम करने पर विचार करें</li>
                </ul>
              </div>
              
              <div class="info-box">
                <p><strong>सहायता चाहिए?</strong> यदि आपको अपना पासवर्ड रीसेट करने में कोई परेशानी हो रही है, तो कृपया हमारी सहायता टीम से support@smartpost.ai पर संपर्क करें</p>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>SmartPost AI Automation</p>
            <p>© ${new Date().getFullYear()} All rights reserved</p>
            <p style="margin-top: 10px; color: #9ca3af;">This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      //message likhna h baad mai
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
  await User.findByIdAndDelete(req.user.id);
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
