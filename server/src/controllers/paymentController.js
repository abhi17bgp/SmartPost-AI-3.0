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
    // Payment is successful
    // Update user subscription status
    // Calculate 1 year from now
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        isSubscribed: true,
        razorpayPaymentId: razorpay_payment_id,
        subscriptionExpiresAt: expiresAt
      },
      { new: true, runValidators: true }
    );

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
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background: #000; color: #fff; line-height: 1.6; }
            .wrapper { background: #000; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #0a0a0a; border-radius: 24px; border: 1px solid #1a1a1a; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
            .header { background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%); padding: 60px 40px; text-align: center; color: #ffffff; }
            .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; backdrop-blur: 10px; }
            .header-logo { font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-bottom: 8px; }
            .content { padding: 40px; }
            h2 { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #fff; }
            p { font-size: 16px; color: #a1a1a1; margin-bottom: 24px; }
            .info-card { background: #111; border: 1px solid #222; border-radius: 16px; padding: 24px; margin-bottom: 32px; }
            .info-item { display: flex; justify-content: space-between; margin-bottom: 12px; }
            .info-label { color: #666; font-size: 14px; }
            .info-value { color: #fff; font-size: 14px; font-weight: 600; }
            .button { display: inline-block; background: #fff; color: #000 !important; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; transition: all 0.3s ease; text-align: center; width: 100%; box-sizing: border-box; }
            .footer { padding: 30px; text-align: center; border-top: 1px solid #1a1a1a; font-size: 12px; color: #444; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <div class="badge">Success</div>
                <div class="header-logo">SmartPost AI</div>
                <h1 style="font-size: 28px; font-weight: 800;">Welcome to Pro, ${updatedUser.name}!</h1>
              </div>
              <div class="content">
                <h2>Your upgrade is complete.</h2>
                <p>We've received your payment of ₹100. Your account has been upgraded to <strong>SmartPost AI Pro</strong> for the next 12 months. You now have unlimited access to all premium features.</p>
                
                <div class="info-card">
                  <div class="info-item">
                    <span class="info-label">Plan</span>
                    <span class="info-value">Pro Annual</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Payment ID</span>
                    <span class="info-value">${razorpay_payment_id}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Expires On</span>
                    <span class="info-value">${expiresAt.toLocaleDateString()}</span>
                  </div>
                </div>

                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
                
                <p style="margin-top: 32px; font-size: 14px; text-align: center;">Need help? <a href="mailto:support@smartpostai.online" style="color: #3a7bd5;">Contact Support</a></p>
              </div>
              <div class="footer">
                <p>&copy; 2026 SmartPost AI. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        email: updatedUser.email,
        subject: 'Welcome to SmartPost AI Pro! 🚀',
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
