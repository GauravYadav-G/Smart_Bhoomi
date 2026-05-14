# 🚀 Smart Bhoomi - Render Production Setup Guide

## Critical Configuration Steps for Render Deployment

### 1️⃣ MongoDB Atlas Setup (REQUIRED)

The application needs a MongoDB database. Use MongoDB Atlas free tier:

#### Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (M0 free tier, 512MB storage)
4. Create a database user with strong password
5. Whitelist IP address: Click "Network Access" → "Add IP Address" → Add `0.0.0.0/0` (for Render)

#### Get Connection String
1. In MongoDB Atlas, click "Connect"
2. Choose "Connect your application"
3. Copy the connection string: `mongodb+srv://username:password@cluster.mongodb.net/database_name`
4. Replace `username`, `password`, and database name

### 2️⃣ Configure Render Environment Variables (CRITICAL)

Your Render deployment needs these environment variables set:

**Go to Render Dashboard → Your Service → Environment**

Add these variables:

```env
# Database Connection (REQUIRED - no default fallback!)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smart_bhoomi

# Authentication
JWT_SECRET=generate-a-random-secure-key-here-min-32-characters
JWT_EXPIRE=7d

# Production Mode
NODE_ENV=production

# Email Service (Optional for registration emails)
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=your-email@smart-bhoomi.gov.in
EMAIL_FROM_NAME=Smart Bhoomi Government Property Registry

# Optional: Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Optional: SMS Service
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3️⃣ Verify Render Deployment

After setting environment variables:

1. **Manual Redeploy**: Go to Render Dashboard → Click "Manual Deploy" → "Deploy latest commit"
2. **Wait 3-5 minutes** for deployment to complete
3. **Check Logs**: Click "Logs" to see deployment progress
4. **Verify Status**: Should see "✅ MongoDB Connected" message

### 4️⃣ Test the Application

Once deployed:

**Test Frontend:**
- Visit `https://smart-bhoomi.onrender.com/`
- Should see login page

**Test API:**
- Visit `https://smart-bhoomi.onrender.com/api/health`
- Should return JSON with blockchain status

**Test Login:**
- Use register form
- If successful: User saved to MongoDB Atlas
- If error: Check Render logs and MongoDB connection

### 5️⃣ Troubleshooting

#### Error: "MongooseError: Operation timed out"
**Solution:** 
- Verify `MONGODB_URI` is set correctly in Render environment variables
- Check MongoDB Atlas whitelist includes `0.0.0.0/0`
- Wait for MongoDB cluster to be ready (can take 5-10 mins after creation)

#### Error: "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR"
**Solution:** ✅ FIXED - App now has `app.set('trust proxy', 1)` enabled

#### Error: "Cannot GET /"
**Solution:** ✅ FIXED - React frontend is now served with SPA fallback route

#### Frontend loads but API calls fail
**Solution:** 
- Check browser DevTools → Network tab
- Verify request URL is `/api/...` (relative, not `localhost:5001`)
- Check Render logs for API errors

### 6️⃣ Database Operations

Once connected to MongoDB Atlas:

**View Data:**
1. MongoDB Atlas Dashboard → Collections
2. Find `users`, `properties`, `transfers` collections
3. Click to view documents

**Create Admin User (optional):**
```bash
# Use MongoDB Atlas GUI or run locally:
npm run seed-admin
```

### 7️⃣ Production Checklist

Before going live:

- [ ] MONGODB_URI set in Render environment variables
- [ ] JWT_SECRET changed to secure random value
- [ ] NODE_ENV set to 'production'
- [ ] Frontend loads on root URL
- [ ] Login/Register API responds
- [ ] MongoDB connection successful in logs
- [ ] CORS working (POST requests from browser)

### 📝 Key Files Modified for Production

- `server.js` - Added `app.set('trust proxy', 1)` for Render proxies
- `config/database.js` - Added retry logic and better error messages
- `middleware/security.js` - Fixed rate limiter for proxy environments
- `client/src/services/api.js` - Uses relative `/api` URLs in production

### 🔗 Useful Links

- [MongoDB Atlas Free Tier](https://www.mongodb.com/cloud/atlas)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [Express Rate Limit + Proxies](https://express-rate-limit.github.io/)
- [Smart Bhoomi GitHub](https://github.com/GauravYadav-G/Smart_Bhoomi)

---

**Questions?** Check the logs in Render dashboard for detailed error messages.
