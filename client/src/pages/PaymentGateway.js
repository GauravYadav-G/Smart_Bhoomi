import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transferAPI } from '../services/api';
import { toast } from 'react-toastify';
import { 
  FaCreditCard, 
  FaUniversity, 
  FaMobileAlt, 
  FaWallet, 
  FaCheckCircle, 
  FaMoneyBillWave,
  FaArrowLeft,
  FaShieldAlt,
  FaHome,
  FaMapMarkerAlt,
  FaIdCard
} from 'react-icons/fa';
import './PaymentGateway.css';

const PaymentGateway = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [showCashOption, setShowCashOption] = useState(false);
  const [cashConfirmed, setCashConfirmed] = useState(false);

  const paymentMethods = {
    upi: { 
      name: 'UPI Payment', 
      icon: <FaMobileAlt />, 
      description: 'Google Pay, PhonePe, Paytm',
      color: '#10b981'
    },
    card: { 
      name: 'Card Payment', 
      icon: <FaCreditCard />, 
      description: 'Credit/Debit Card',
      color: '#3b82f6'
    },
    netbanking: { 
      name: 'Net Banking', 
      icon: <FaUniversity />, 
      description: 'All Major Banks',
      color: '#8b5cf6'
    },
    wallet: { 
      name: 'Digital Wallet', 
      icon: <FaWallet />, 
      description: 'Paytm, Amazon Pay',
      color: '#f59e0b'
    }
  };

  const fetchTransferDetails = useCallback(async () => {
    if (!requestId) {
      toast.error('Invalid request ID');
      navigate('/transfers');
      return;
    }

    try {
      setLoading(true);
      const response = await transferAPI.getTransferById(requestId);
      const fetchedTransfer = response.data.transfer;
      setTransfer(fetchedTransfer);
      
      if (fetchedTransfer.payment?.status === 'completed') {
        toast.info('Payment already completed for this transfer');
        navigate('/transfers');
      }
    } catch (error) {
      console.error('Error fetching transfer:', error);
      toast.error('Failed to fetch transfer details');
      navigate('/transfers');
    } finally {
      setLoading(false);
    }
  }, [requestId, navigate]);

  useEffect(() => {
    fetchTransferDetails();
  }, [fetchTransferDetails]);

  const handleCashPayment = async () => {
    if (!cashConfirmed) {
      toast.error('Please confirm that you have paid in cash');
      return;
    }

    if (!transfer) {
      toast.error('Transfer information is missing');
      return;
    }

    setProcessing(true);
    
    try {
      const response = await transferAPI.processPayment(requestId, {
        paymentId: `CASH-${Date.now()}`,
        orderId: transfer.payment?.orderId || `order_${Date.now()}`,
        signature: `cash_sig_${Date.now()}`,
        method: 'cash',
        amount: transfer.proposedPrice,
        simulated: true
      });

      if (response.data.success) {
        toast.success('Cash payment marked as completed! 🎉');
        setTimeout(() => navigate('/transfers'), 1500);
      }
    } catch (error) {
      console.error('Cash payment error:', error);
      toast.error(error.response?.data?.message || 'Payment marking failed');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!transfer) {
      toast.error('Transfer information is missing');
      return;
    }

    setProcessing(true);
    
    try {
      toast.info('🔄 Processing payment...', { autoClose: 2000 });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const simulatedPaymentId = `pay_${selectedMethod}_${Date.now()}`;
      const simulatedSignature = `sig_${Date.now()}`;
      
      const response = await transferAPI.processPayment(requestId, {
        paymentId: simulatedPaymentId,
        orderId: transfer.payment?.orderId || `order_${Date.now()}`,
        signature: simulatedSignature,
        method: selectedMethod,
        amount: transfer.proposedPrice,
        simulated: true
      });

      if (response.data.success) {
        toast.success('✅ Payment completed successfully! 🎉');
        setTimeout(() => navigate('/transfers'), 1500);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="payment-loading">
        <div className="loading-spinner"></div>
        <p>Loading payment details...</p>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="payment-error">
        <FaHome className="error-icon" />
        <h2>Transfer Not Found</h2>
        <p>The transfer request could not be found.</p>
        <button 
          type="button"
          onClick={() => navigate('/transfers')} 
          className="btn-back"
        >
          <FaArrowLeft /> Back to Transfers
        </button>
      </div>
    );
  }

  const propertyTitle = transfer.property?.propertyDetails?.title || 'Property';
  const propertyCity = transfer.property?.propertyDetails?.address?.city || 'N/A';
  const propertyState = transfer.property?.propertyDetails?.address?.state || 'N/A';
  const sellerName = transfer.currentOwner?.name || 'Seller';
  const transferId = transfer.requestId || 'N/A';
  const amount = transfer.proposedPrice || 0;

  return (
    <div className="payment-page">
      {/* Header */}
      <div className="payment-header">
        <button 
          type="button"
          onClick={() => navigate('/transfers')} 
          className="back-button"
        >
          <FaArrowLeft /> Back
        </button>
        <div className="header-content">
          <h1>Complete Payment</h1>
          <p className="header-subtitle">
            <FaShieldAlt /> Secure payment gateway powered by demo system
          </p>
        </div>
      </div>

      <div className="payment-container">
        {/* Left Column - Order Summary */}
        <div className="payment-sidebar">
          <div className="summary-card">
            <h2>Order Summary</h2>
            
            <div className="property-summary">
              <div className="property-icon">
                <FaHome />
              </div>
              <div className="property-details">
                <h3>{propertyTitle}</h3>
                <p className="property-location">
                  <FaMapMarkerAlt />
                  {propertyCity}, {propertyState}
                </p>
              </div>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-items">
              <div className="summary-row">
                <span className="summary-label">
                  <FaIdCard /> Transfer ID
                </span>
                <span className="summary-value">{transferId}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Seller</span>
                <span className="summary-value">{sellerName}</span>
              </div>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-total">
              <span>Total Amount</span>
              <span className="total-amount">₹{amount.toLocaleString()}</span>
            </div>
          </div>

          {/* Security Info */}
          <div className="security-card">
            <FaShieldAlt className="security-icon" />
            <div className="security-text">
              <h4>Secure Payment</h4>
              <p>256-bit SSL encryption</p>
              <p>Demo gateway for testing</p>
            </div>
          </div>
        </div>

        {/* Right Column - Payment Methods */}
        <div className="payment-main">
          {/* Cash Payment Banner */}
          <div className="info-banner">
            <div className="banner-icon">
              <FaMoneyBillWave />
            </div>
            <div className="banner-content">
              <h3>Already paid in cash?</h3>
              <p>Mark your payment as completed if you&apos;ve already paid the seller</p>
            </div>
            <button 
              type="button"
              className="banner-toggle"
              onClick={() => setShowCashOption(!showCashOption)}
            >
              {showCashOption ? 'Online Payment' : 'Cash Payment'}
            </button>
          </div>

          {showCashOption ? (
            /* Cash Payment Section */
            <div className="cash-section">
              <div className="cash-card">
                <h2>Cash Payment Confirmation</h2>
                
                <div className="warning-box">
                  <div className="warning-icon">⚠️</div>
                  <div className="warning-content">
                    <h4>Important Notice</h4>
                    <p>Only use this option if you have already paid the seller directly via cash or bank transfer.</p>
                    <p>The seller will verify this payment before final approval.</p>
                  </div>
                </div>

                <div className="cash-details">
                  <div className="detail-row">
                    <span>Payment To:</span>
                    <strong>{sellerName}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Amount Paid:</span>
                    <strong>₹{amount.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="confirmation-box">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={cashConfirmed}
                      onChange={(e) => setCashConfirmed(e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    <span className="checkbox-label">
                      I confirm that I have already paid ₹{amount.toLocaleString()} to {sellerName} via cash or direct bank transfer
                    </span>
                  </label>
                </div>

                <div className="action-buttons">
                  <button 
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowCashOption(false)}
                    disabled={processing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-confirm"
                    onClick={handleCashPayment}
                    disabled={processing || !cashConfirmed}
                  >
                    {processing ? (
                      <>
                        <span className="btn-spinner"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle /> Confirm Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Online Payment Section */
            <div className="payment-methods-section">
              <div className="section-header">
                <h2>Select Payment Method</h2>
                <span className="demo-tag">DEMO MODE</span>
              </div>

              <div className="methods-grid">
                {Object.keys(paymentMethods).map(method => (
                  <div
                    key={method}
                    className={`method-card ${selectedMethod === method ? 'selected' : ''}`}
                    onClick={() => setSelectedMethod(method)}
                  >
                    <div className="method-icon" style={{ color: paymentMethods[method].color }}>
                      {paymentMethods[method].icon}
                    </div>
                    <div className="method-info">
                      <h3>{paymentMethods[method].name}</h3>
                      <p>{paymentMethods[method].description}</p>
                    </div>
                    {selectedMethod === method && (
                      <div className="selected-indicator">
                        <FaCheckCircle />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="action-buttons">
                <button 
                  type="button"
                  className="btn-cancel"
                  onClick={() => navigate('/transfers')}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-pay"
                  onClick={handlePayment}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <span className="btn-spinner"></span>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      Pay ₹{amount.toLocaleString()}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;
