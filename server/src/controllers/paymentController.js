const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/email');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = catchAsync(async (req, res, next) => {
  // Amount in paise (100 INR = 10000 paise)
  const amount = 100 * 100;
  
  const options = {
    amount,
    currency: 'INR',
    receipt: `receipt_order_${req.user._id}`,
  };

  const order = await razorpay.orders.create(options);

  if (!order) {
    return next(new AppError('Some error occurred while creating the Razorpay order', 500));
  }

  res.status(200).json({
    status: 'success',
    data: {
      order,
    },
  });
});

exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('Payment details are incomplete', 400));
  }

  const sign = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest('hex');

  if (razorpay_signature === expectedSign) {
    const user = await User.findById(req.user._id);

    let expiresAt;
    if (user.isSubscribed && user.subscriptionExpiresAt && user.subscriptionExpiresAt > Date.now()) {
      expiresAt = new Date(user.subscriptionExpiresAt.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else {
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    user.isSubscribed = true;
    user.razorpayPaymentId = razorpay_payment_id;
    user.subscriptionExpiresAt = expiresAt;
    const updatedUser = await user.save({ validateBeforeSave: false });

    // Send Pro Upgrade Email
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const dashboardUrl = `${frontendUrl}`;
      
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
            .header img { height: 48px; margin-bottom: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2); }
            .badge { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 6px 16px; border-radius: 100px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
            .header-logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #09090b; }
            .content { padding: 40px; }
            h2 { font-size: 22px; font-weight: 700; margin-bottom: 16px; color: #09090b; }
            p { font-size: 15px; color: #52525b; margin-bottom: 24px; }
            .info-card { width: 100%; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px 24px; margin-bottom: 32px; border-collapse: separate; border-spacing: 0; }
            .info-label { color: #71717a; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #f4f4f5; text-align: left; vertical-align: top; }
            .info-value { color: #09090b; font-size: 14px; font-weight: 600; text-align: right; padding: 12px 0; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
            .info-card tr:last-child .info-label, .info-card tr:last-child .info-value { border-bottom: none; padding-bottom: 4px; }
            .info-card tr:first-child .info-label, .info-card tr:first-child .info-value { padding-top: 4px; }
            .button { display: inline-block; background: #2563eb; color: #fff !important; padding: 14px 48px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3); transition: all 0.2s; text-align: center; width: 100%; box-sizing: border-box; }
            .footer { background: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7; font-size: 12px; color: #a1a1aa; }
            .footer p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <img src="${frontendUrl}/logo.png" alt="SmartPost AI Logo" />
                <div class="badge">Success</div>
                <div class="header-logo">Welcome to Pro, ${updatedUser.name}!</div>
              </div>
              <div class="content">
                <h2>Your upgrade is complete.</h2>
                <p>We've received your payment of ₹100. Your account has been upgraded to <strong>SmartPost AI Pro</strong> for the next 12 months. You now have unlimited access to all premium features.</p>
                
                <table class="info-card" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="info-label">Plan</td>
                    <td class="info-value">Pro Annual</td>
                  </tr>
                  <tr>
                    <td class="info-label">Payment ID</td>
                    <td class="info-value">${razorpay_payment_id}</td>
                  </tr>
                  <tr>
                    <td class="info-label">Expires On</td>
                    <td class="info-value">${expiresAt.toLocaleDateString()}</td>
                  </tr>
                </table>

                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
                
                <p style="margin-top: 32px; font-size: 13px; text-align: center; color: #71717a;">Need help? <a href="mailto:support@smartpostai.online" style="color: #2563eb; text-decoration: none; font-weight: 500;">Contact Support</a></p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} SmartPost AI. All rights reserved.</p>
                <p style="margin-top: 6px;">This receipt is an automated message — please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        email: updatedUser.email,
        subject: 'Welcome to SmartPost AI Pro! ',
        html
      });
    } catch (err) {
      console.log('Error sending Pro upgrade email:', err.message);
      // Don't fail the verification process if email fails
    }

    res.status(200).json({
      status: 'success',
      message: 'Payment verified successfully',
      data: {
        user: updatedUser,
      },
    });
  } else {
    return next(new AppError('Invalid payment signature', 400));
  }
});
