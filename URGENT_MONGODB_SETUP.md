# 🚨 URGENT: Fix MongoDB Connection on Render

## Problem

Your Render deployment is failing because it's trying to connect to `localhost:27017` (a local MongoDB instance that doesn't exist on Render servers).

```
❌ connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
```

## Solution: Configure MongoDB Atlas in 3 Steps

### ⏱️ Time Required: 10 minutes

---

## Step 1️⃣: Create MongoDB Atlas Account (2 minutes)

1. Go to **[mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)**
2. Click **Sign Up** (or Sign In if you have account)
3. Create account with:
   - Email
   - Password
   - Accept terms

### Step 1b: Create Free Cluster

1. After login, click **"Create a Deployment"**
2. Choose **"Free" Tier** (M0)
3. Select **Region**: Choose closest to your location (or AWS us-east-1)
4. Click **"Create Deployment"** (wait 2-3 minutes)

---

## Step 2️⃣: Get Connection String (3 minutes)

1. After cluster is created, click **"Connect"** button
2. Choose **"Drivers"** tab
3. Select **"Node.js"** driver
4. Copy the connection string:
   ```
   mongodb+srv://username:password@cluster0.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
   ```
5. Replace placeholders:
   - `username` → Your database username (create in Security tab)
   - `password` → Your database user password
   - `myFirstDatabase` → `smart_bhoomi`

**Example result:**

```
mongodb+srv://admin:MyPassword123@cluster0.mongodb.net/smart_bhoomi?retryWrites=true&w=majority
```

⚠️ **Save this string** - you'll need it in next step

---

## Step 3️⃣: Set Environment Variable in Render (2 minutes)

1. Go to **[render.com](https://render.com)** → Dashboard
2. Click your **Smart Bhoomi** service
3. Go to **"Environment"** tab on left sidebar
4. Click **"Add Environment Variable"**
5. Enter:
   - **Key**: `MONGODB_URI`
   - **Value**: (Paste your MongoDB connection string from Step 2)
   - Click **"Save"**

6. Also add:
   - **Key**: `JWT_SECRET`
   - **Value**: (Generate random 32+ char key)
   - **Key**: `NODE_ENV`
   - **Value**: `production`

### How to Generate JWT_SECRET

Run this command in terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 4️⃣: Important - Whitelist Render IPs (1 minute)

1. Go back to **MongoDB Atlas**
2. In left sidebar, click **"Network Access"**
3. Click **"Add IP Address"**
4. Enter: `0.0.0.0/0` (allows all IPs - needed for Render)
5. Click **"Confirm"**

⚠️ **This is required!** Otherwise Render can't connect to MongoDB

---

## Step 5️⃣: Trigger Redeploy (3 minutes)

1. Go back to **Render Dashboard**
2. Click your **Smart Bhoomi** service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**
4. Wait 3-5 minutes for deployment
5. Check **"Logs"** tab

### Success Indicators ✅

Look for these messages in logs:

```
🔗 Connecting to MongoDB: mongodb+srv://...
✅ MongoDB Connected: cluster0.mongodb.net
   Database: smart_bhoomi
   State: Connected
```

### Still Failing? ❌

Check these:

- MongoDB cluster status (should be "Connected" in Atlas dashboard)
- Connection string is copied correctly (no extra spaces)
- IP whitelist includes `0.0.0.0/0`
- Database user is created in MongoDB Atlas Security tab

---

## Verify It Works

Once deployment completes:

**Test API:**

```bash
curl https://smart-bhoomi.onrender.com/api/health
```

Should return JSON with blockchain status

**Test Frontend:**

- Visit https://smart-bhoomi.onrender.com/
- Try to register a new user
- If successful, user is saved to MongoDB Atlas ✅

---

## Files Changed

- ✅ `.env` - Removed localhost MongoDB reference
- ✅ `.env.example` - Added template with all required variables
- ✅ `config/database.js` - Already configured to read MONGODB_URI

---

## Quick Reference Checklist

- [ ] Created MongoDB Atlas account
- [ ] Created M0 (free) cluster
- [ ] Got connection string
- [ ] Set MONGODB_URI in Render environment
- [ ] Set JWT_SECRET in Render environment
- [ ] Set NODE_ENV=production in Render
- [ ] Whitelisted 0.0.0.0/0 in MongoDB Network Access
- [ ] Clicked Manual Deploy on Render
- [ ] Verified ✅ MongoDB Connected in logs
- [ ] Tested /api/health endpoint
- [ ] Tested register/login from frontend

---

## Still Need Help?

Check these resources:

- **MongoDB Atlas Guide**: https://www.mongodb.com/docs/cloud/
- **Render Env Variables**: https://render.com/docs/environment-variables
- **Logs Location**: Render Dashboard → Your Service → Logs tab

Once MongoDB connection is verified, **rest of the app will work automatically!**

Good luck! 🚀
