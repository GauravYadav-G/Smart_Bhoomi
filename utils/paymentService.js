const Razorpay = require('razorpay');
const crypto = require('crypto');

class PaymentService {
  constructor() {
    this.razorpay = null;
    
    // Initialize Razorpay if credentials are provided
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        this.razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        console.log('✅ Razorpay payment gateway initialized');
      } catch (error) {
        console.log('⚠️  Payment service running in simulation mode');
      }
    }
  }

  // Create payment order for property transfer
  async createPaymentOrder(transferRequest, user) {
    try {
      const orderAmount = Math.round(transferRequest.proposedPrice * 100); // Convert to paise
      
      if (!this.razorpay) {
        // Simulation mode
        const orderId = `order_sim_${Date.now()}`;
        console.log(`💰 [SIMULATED] Payment order created: ${orderId} for ₹${transferRequest.proposedPrice}`);
        
        return {
          success: true,
          orderId: orderId,
          amount: transferRequest.proposedPrice,
          currency: 'INR',
          receipt: `receipt_${transferRequest.requestId}`,
          simulated: true
        };
      }

      const options = {
        amount: orderAmount,
        currency: 'INR',
        receipt: `receipt_${transferRequest.requestId}`,
        notes: {
          transferRequestId: transferRequest.requestId,
          propertyId: transferRequest.property.propertyId,
          buyerId: user._id.toString(),
          buyerName: user.name,
          buyerEmail: user.email
        }
      };

      const order = await this.razorpay.orders.create(options);
      
      return {
        success: true,
        orderId: order.id,
        amount: transferRequest.proposedPrice,
        currency: order.currency,
        receipt: order.receipt
      };
    } catch (error) {
      console.error('Payment order creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify payment signature
  verifyPaymentSignature(orderId, paymentId, signature) {
    try {
      if (!this.razorpay) {
        // Simulation mode - always return true
        console.log(`🔐 [SIMULATED] Payment signature verified`);
        return true;
      }

      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Payment verification failed:', error);
      return false;
    }
  }

  // Process payment after verification
  async processPayment(paymentData) {
    try {
      const { orderId, paymentId, signature, transferRequestId } = paymentData;

      // Verify payment signature
      const isValid = this.verifyPaymentSignature(orderId, paymentId, signature);

      if (!isValid && !paymentData.simulated) {
        return {
          success: false,
          error: 'Payment verification failed'
        };
      }

      // Fetch payment details
      let paymentDetails;
      if (this.razorpay && !paymentData.simulated) {
        paymentDetails = await this.razorpay.payments.fetch(paymentId);
      } else {
        // Simulated payment details
        paymentDetails = {
          id: paymentId,
          amount: paymentData.amount * 100,
          currency: 'INR',
          status: 'captured',
          method: paymentData.method || 'upi',
          created_at: Math.floor(Date.now() / 1000)
        };
      }

      return {
        success: true,
        transactionId: paymentDetails.id,
        amount: paymentDetails.amount / 100,
        currency: paymentDetails.currency,
        status: paymentDetails.status,
        method: paymentDetails.method,
        timestamp: paymentDetails.created_at * 1000
      };
    } catch (error) {
      console.error('Payment processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate UPI payment QR code
  async generateUPIQRCode(amount, transferRequestId, propertyId) {
    try {
      const upiString = `upi://pay?pa=${process.env.UPI_MERCHANT_ID}&pn=${encodeURIComponent(process.env.UPI_MERCHANT_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Property Transfer - ${propertyId}`)}&tr=${transferRequestId}`;

      return {
        success: true,
        upiString: upiString,
        qrData: upiString
      };
    } catch (error) {
      console.error('UPI QR generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Refund payment (if transfer is cancelled)
  async refundPayment(paymentId, amount, reason) {
    try {
      if (!this.razorpay) {
        console.log(`💸 [SIMULATED] Refund initiated: ₹${amount} for payment ${paymentId}`);
        return {
          success: true,
          refundId: `rfnd_sim_${Date.now()}`,
          amount: amount,
          status: 'processed',
          simulated: true
        };
      }

      const refund = await this.razorpay.payments.refund(paymentId, {
        amount: Math.round(amount * 100),
        notes: {
          reason: reason
        }
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      };
    } catch (error) {
      console.error('Refund failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get payment methods available
  getPaymentMethods() {
    return {
      upi: {
        name: 'UPI',
        description: 'Pay using any UPI app (Google Pay, PhonePe, Paytm, etc.)',
        icon: '📱',
        enabled: true
      },
      netbanking: {
        name: 'Net Banking',
        description: 'Pay using your bank account',
        icon: '🏦',
        enabled: true
      },
      card: {
        name: 'Credit/Debit Card',
        description: 'Pay using Visa, Mastercard, RuPay',
        icon: '💳',
        enabled: true
      },
      wallet: {
        name: 'Wallets',
        description: 'Paytm, PhonePe, Amazon Pay',
        icon: '👛',
        enabled: true
      }
    };
  }
}

module.exports = new PaymentService();
