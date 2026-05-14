# ⚡ QUICK VISUAL GUIDE - Where to Go & What to Do

## 🎯 YOUR MONGODB CREDENTIALS
```
mongodb+srv://admin:sourabh0yadav@cluster0.7b0vwok.mongodb.net/smart_bhoomi?retryWrites=true&w=majority
```

---

## 🗺️ NAVIGATION PATH

### 1️⃣ Open Browser
**Go to:** https://render.com/dashboard

### 2️⃣ Find Smart Bhoomi Service
On the dashboard page, look for:
```
Services
├── smart-bhoomi  ← CLICK THIS
```

### 3️⃣ Click "Environment" Tab
In the left sidebar:
```
📋 Settings
📊 Metrics
🌍 Environment  ← CLICK HERE
🔐 Security
⚙️  Advanced
```

### 4️⃣ Click "Add Environment Variable"
You'll see a section:
```
Environment Variables
[Add Environment Variable] ← CLICK
```

---

## 📝 WHAT TO ENTER (DO THIS 3 TIMES)

### Variable 1: MONGODB_URI
```
Key:   MONGODB_URI
Value: mongodb+srv://admin:sourabh0yadav@cluster0.7b0vwok.mongodb.net/smart_bhoomi?retryWrites=true&w=majority
```
Click **[Save]**

### Variable 2: JWT_SECRET
```
Key:   JWT_SECRET
Value: sourabh0yadav_jwt_secret_key_production_12345678
```
Click **[Save]**

### Variable 3: NODE_ENV
```
Key:   NODE_ENV
Value: production
```
Click **[Save]**

---

## 🔄 REDEPLOY

After adding all 3 variables:

**Look for this button:**
```
[Manual Deploy ▼]
```

Click it → Select **"Deploy latest commit"**

**Wait 3-5 minutes** ⏳

---

## ✅ CHECK IF WORKING

### In Render Dashboard:
1. Click **"Logs"** tab
2. Look for:
```
✅ MongoDB Connected!
   Host: cluster0.7b0vwok.mongodb.net
   Database: smart_bhoomi
   State: Connected
```

### In Browser:
1. Visit: https://smart-bhoomi.onrender.com/
2. Should see login page ✅

---

## 📱 SCREENSHOTS REFERENCE

### Finding Environment Tab
```
┌─ Render Dashboard
│  └─ smart-bhoomi service (click)
│     ├─ Settings
│     ├─ Metrics
│     ├─ Environment ← CLICK HERE
│     ├─ Security
│     └─ Advanced
```

### Adding Variable
```
┌─ Environment Tab
│  ├─ Environment Variables
│  │  └─ [Add Environment Variable] ← CLICK
│  │     ┌─────────────────┐
│  │     │ Key: MONGODB_URI│
│  │     │ Value: mongodb  │
│  │     │        +srv://..│
│  │     │ [Save]          │
│  │     └─────────────────┘
```

### Deploying
```
┌─ Service Dashboard
│  ├─ [Manual Deploy ▼]  ← CLICK
│  │  ├─ Deploy latest commit
│  │  ├─ View deployment logs
│  │  └─ Cancel deployment
│  │
│  ├─ Logs ← WATCH HERE
│  │  └─ ✅ MongoDB Connected!
```

---

## ⏱️ TOTAL TIME: 5 MINUTES

1. Open Render ........... 30 sec
2. Click Environment ....... 30 sec
3. Add 3 variables ........ 2 min
4. Click Deploy ........... 30 sec
5. Wait & verify .......... 3 min

---

## ✨ After These Steps

Your app will work perfectly:
- ✅ Frontend loads at https://smart-bhoomi.onrender.com/
- ✅ Login/Register works (saved to MongoDB)
- ✅ API endpoints respond
- ✅ Blockchain runs
- ✅ Real-time updates work

**THAT'S IT! 🚀**
