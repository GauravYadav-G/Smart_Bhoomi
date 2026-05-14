import React from 'react';
import { Navigate } from 'react-router-dom';

// 2FA has been removed — redirect to login
const VerifyTwoFactor = () => <Navigate to="/login" replace />;

export default VerifyTwoFactor;
