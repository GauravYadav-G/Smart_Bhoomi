# 🚀 Configure Render Environment Variables - Step by Step

## Your MongoDB Connection Details
```
Connection String: mongodb+srv://admin:sourabh0yadav@cluster0.7b0vwok.mongodb.net/?appName=Cluster0
Username: admin
Password: sourabh0yadav
Cluster: cluster0.7b0vwok.mongodb.net
```

---

## 📋 STEP-BY-STEP: Set Environment Variables in Render

### STEP 1: Open Render Dashboard
1. Open browser
2. Go to: **https://render.com/dashboard**
3. You should see your services listed

### STEP 2: Click Your Smart Bhoomi Service
In the dashboard, find and click: **"smart-bhoomi"** service

You'll see service details page

### STEP 3: Click "Environment" Tab
On the left sidebar, click: **"Environment"**

You'll see a section that says:
```
Environment Variables
Add → Environment Variable
```

---

## 🔧 Add MongoDB Connection String

### STEP 4: Add MONGODB_URI Variable

Click **"Add Environment Variable"** button

**Fill in these fields:**

| Field | Value |
|-------|-------|
| **Key** | `MONGODB_URI` |
| **Value** | `mongodb+srv://admin:sourabh0yadav@cluster0.7b0vwok.mongodb.net/smart_bhoomi?retryWrites=true&w=majority` |

⚠️ **IMPORTANT:** Change the connection string:
- Original: `mongodb+srv://admin:sourabh0yadav@cluster0.7b0vwok.mongodb.net/?appName=Cluster0`
- Updated: `mongodb+srv://admin:sourabh0yadav@cluster0.7b0vwok.mongodb.net/smart_bhoomi?retryWrites=true&w=majority`

Click **"Save"** button

---

### STEP 5: Add JWT_SECRET Variable

Click **"Add Environment Variable"** again

**Fill in these fields:**

| Field | Value |
|-------|-------|
| **Key** | `JWT_SECRET` |
| **Value** | `sourabh0yadav_jwt_secret_key_min_32_chars_1234567890` |

(Or use any 32+ character string)

Click **"Save"** button

---

### STEP 6: Add NODE_ENV Variable

Click **"Add Environment Variable"** one more time

**Fill in these fields:**

| Field | Value |
|-------|-------|
| **Key** | `NODE_ENV` |
| **Value** | `production` |

Click **"Save"** button

---

## 🔄 STEP 7: Trigger Redeploy

After adding all variables:

1. Look for **"Manual Deploy"** button (should have dropdown arrow ▼)
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. You'll see deployment starting

**Wait 3-5 minutes** for deployment to complete

---

## ✅ STEP 8: Verify Connection

1. In Render dashboard, click **"Logs"** tab
2. Look for this success message:

```
✅ MongoDB Connected!
   Host: cluster0.7b0vwok.mongodb.net
   Database: smart_bhoomi
   State: Connected
```

If you see this → **SUCCESS!** 🎉

---

## 🧪 STEP 9: Test the Application

### Test Frontend
Open browser and visit:
```
https://smart-bhoomi.onrender.com/
```

You should see:
- ✅ Login page loads
- ✅ Can see form fields
- ✅ No 404 errors

### Test API
Open browser and visit:
```
https://smart-bhoomi.onrender.com/api/health
```

You should see JSON response with blockchain status:
```json
{
  "success": true,
  "message": "Smart Bhoomi National Land Infrastructure API",
  "services": {
    "database": "connected",
    "blockchain": {...}
  }
}
```

### Test Login/Register
1. Go to: https://smart-bhoomi.onrender.com/
2. Fill in registration form
3. Click "Register"
4. If successful → User saved to MongoDB ✅

---

## 🔍 Render Environment Variables Screen

What you should see after adding all variables:

```
┌─────────────────────────────────────────┐
│ Environment Variables                   │
├─────────────────────────────────────────┤
│ MONGODB_URI                             │
│ mongodb+srv://admin:sourabh0yadav@...   │
│                                         │
│ JWT_SECRET                              │
│ sourabh0yadav_jwt_secret_key_...        │
│                                         │
│ NODE_ENV                                │
│ production                              │
└─────────────────────────────────────────┘
```

---

## ✅ QUICK CHECKLIST

- [ ] Opened https://render.com/dashboard
- [ ] Clicked "smart-bhoomi" service
- [ ] Clicked "Environment" tab
- [ ] Added MONGODB_URI variable
- [ ] Added JWT_SECRET variable
- [ ] Added NODE_ENV = production
- [ ] Clicked "Manual Deploy"
- [ ] Waited 3-5 minutes
- [ ] Checked logs for "✅ MongoDB Connected"
- [ ] Visited https://smart-bhoomi.onrender.com/ → Page loads
- [ ] Visited /api/health → JSON response works
- [ ] Tried register → Success

---

## 🚨 If Something Goes Wrong

### Check MongoDB Connection in Logs
- Click "Logs" tab
- Look for "MongoDB Connected" message
- If error: connection string might be wrong

### Verify Connection String Format
Your connection string should be:
```
mongodb+srv://admin:sourabh0yadav@cluster0.7b0vwok.mongodb.net/smart_bhoomi?retryWrites=true&w=majority
```

Changes made:
- ✅ Added database name: `/smart_bhoomi`
- ✅ Added parameters: `?retryWrites=true&w=majority`
- ✅ Removed the original: `?appName=Cluster0`

### Restart Deployment
1. Click "Manual Deploy" again
2. Wait for new deployment to complete

---

## 📞 Need Help?

**Check these:**
1. Is MONGODB_URI set exactly as shown above?
2. Does it include your password: `sourabh0yadav`?
3. Is NODE_ENV set to `production`?
4. Have you waited 3-5 minutes after deploy?
5. Did you check the logs for errors?

---

**Once you complete these steps, your app will be FULLY FUNCTIONAL! 🚀**
