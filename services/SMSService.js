const twilio = require('twilio');

class SMSService {
  constructor() {
    this.client = null;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    // Log initialization status
    console.log('📱 SMS Service: Initializing...');
    
    // Initialize Twilio client only if credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        this.client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        console.log('✅ SMS Service: REAL MODE (Twilio connected)');
      } catch (error) {
        console.error('❌ SMS Service: Twilio initialization failed', error.message);
        console.log('⚠️  SMS service running in simulation mode');
      }
    } else {
      console.log('⚠️  SMS Service: SIMULATION MODE (missing credentials)');
      console.log('   Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env');
    }
  }

  async sendSMS(to, message) {
    try {
      // Simulation mode
      if (!this.client) {
        console.log(`📱 [SIMULATED SMS] To: ${to}`);
        console.log(`📱 [SIMULATED SMS] Message: ${message}`);
        return {
          success: true,
          messageId: `sim_${Date.now()}`,
          status: 'delivered',
          simulated: true
        };
      }

      // Validate phone number format (must start with +)
      if (!to || !to.startsWith('+')) {
        throw new Error(`Invalid phone format: ${to}. Must include + and country code (e.g., +919876543210)`);
      }

      // Send real SMS via Twilio
      const response = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      });

      console.log(`✅ SMS sent to ${to} | SID: ${response.sid} | Status: ${response.status}`);
      
      return {
        success: true,
        messageId: response.sid,
        status: response.status,
        to: to
      };
      
    } catch (error) {
      // Detailed error logging for debugging
      console.error('❌ SMS sending failed:');
      console.error('   Error:', error.message);
      console.error('   Code:', error.code || 'N/A');
      console.error('   To:', to);
      console.error('   From:', this.fromNumber);
      
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        status: 'failed'
      };
    }
  }

  // Registration SMS
  async sendRegistrationSMS(user) {
    if (!user.phoneNumber) {
      console.error('❌ Cannot send registration SMS: user.phoneNumber is missing');
      return { success: false, error: 'Phone number missing' };
    }
    
    const message = `Welcome to Smart Bhoomi Property Registry! Your account has been created successfully. Login at ${process.env.CLIENT_URL || 'your portal'}`;
    return await this.sendSMS(user.phoneNumber, message);
  }

  // Property registration SMS
  async sendPropertyRegistrationSMS(user, property) {
    if (!user.phoneNumber) {
      console.error('❌ Cannot send property SMS: user.phoneNumber is missing');
      return { success: false, error: 'Phone number missing' };
    }
    
    const message = `Property Registered! ID: ${property.propertyId}. Title: ${property.propertyDetails.title}. Status: Pending Verification. View: ${process.env.CLIENT_URL}/properties/${property.propertyId}`;
    return await this.sendSMS(user.phoneNumber, message);
  }

  // Property verification SMS
  async sendVerificationSMS(user, property, isApproved) {
    if (!user.phoneNumber) {
      return { success: false, error: 'Phone number missing' };
    }
    
    const status = isApproved ? 'VERIFIED ✓' : 'REJECTED ✗';
    const message = `Property ${status}! ID: ${property.propertyId}, Title: ${property.propertyDetails.title}. Check details at ${process.env.CLIENT_URL}/properties/${property.propertyId}`;
    return await this.sendSMS(user.phoneNumber, message);
  }

  // Transfer request SMS
  async sendTransferRequestSMS(owner, buyer, property, transferRequest) {
    if (!owner.phoneNumber) {
      return { success: false, error: 'Owner phone number missing' };
    }
    
    const message = `New Transfer Request! Property: ${property.propertyDetails.title}, Buyer: ${buyer.name}, Amount: ₹${transferRequest.proposedPrice.toLocaleString('en-IN')}. Review: ${process.env.CLIENT_URL}/transfers`;
    return await this.sendSMS(owner.phoneNumber, message);
  }

  // Transfer approval SMS (to buyer)
  async sendTransferApprovalSMS(buyer, property, transferRequest) {
    if (!buyer.phoneNumber) {
      return { success: false, error: 'Buyer phone number missing' };
    }
    
    const message = `Transfer Approved! Property: ${property.propertyDetails.title}. Proceed with payment of ₹${transferRequest.proposedPrice.toLocaleString('en-IN')}. Request ID: ${transferRequest.requestId}`;
    return await this.sendSMS(buyer.phoneNumber, message);
  }

  // Transfer completion SMS
  async sendTransferCompletionSMS(user, property, transferRequest) {
    if (!user.phoneNumber) {
      return { success: false, error: 'Phone number missing' };
    }
    
    const message = `Transfer Completed! Property: ${property.propertyDetails.title}, Amount: ₹${transferRequest.proposedPrice.toLocaleString('en-IN')}. Blockchain verified. View: ${process.env.CLIENT_URL}/properties/${property.propertyId}`;
    return await this.sendSMS(user.phoneNumber, message);
  }

  // Payment confirmation SMS
  async sendPaymentConfirmationSMS(user, paymentDetails) {
    if (!user.phoneNumber) {
      return { success: false, error: 'Phone number missing' };
    }
    
    const message = `Payment Confirmed! Amount: ₹${paymentDetails.amount.toLocaleString('en-IN')}, TxID: ${paymentDetails.transactionId}. Status: Success. Time: ${new Date(paymentDetails.timestamp).toLocaleString()}`;
    return await this.sendSMS(user.phoneNumber, message);
  }

  // OTP SMS for 2FA
  async sendOTPSMS(user, otp) {
    if (!user.phoneNumber) {
      return { success: false, error: 'Phone number missing' };
    }
    
    const message = `Your Smart Bhoomi Property Registry OTP is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
    return await this.sendSMS(user.phoneNumber, message);
  }
}

module.exports = new SMSService();
