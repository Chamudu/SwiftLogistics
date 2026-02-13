# SwiftLogistics - Setup Guide
**Step-by-Step Instructions to Get Started**

---

## 🎯 What We'll Build First

In **Phase 1**, we'll create three mock services to simulate real backend systems:
1. **Mock CMS** (SOAP/XML service)
2. **Mock ROS** (REST/JSON service)
3. **Mock WMS** (TCP/IP service)

These mock services will help us test our middleware without needing access to actual production systems.

---

## 📋 Prerequisites Check

### 1. Node.js Installation

**Check if you have Node.js:**
```bash
node --version
```

**Expected output:** `v18.x.x` or higher

**If not installed:**
- Download from: https://nodejs.org/
- Install LTS version (18 or higher)
- Restart your terminal after installation

### 2. npm Check

```bash
npm --version
```

**Expected output:** `9.x.x` or higher (comes with Node.js)

### 3. Git Check (Optional but recommended)

```bash
git --version
```

### 4. Docker Desktop (We'll install this later)

For now, we'll build without Docker to understand each component.

---

## 🚀 Phase 1: Create Mock Services

### Step 1: Project Initialization

First, let's initialize the project as an npm workspace (monorepo structure).

**Action: Please run these commands:**

```bash
cd c:/Users/Chamudu\ Hansana/Desktop/Projects/SwiftLogistics

# Initialize the main package.json
npm init -y
```

**After running, send me the output so I can verify it worked!**

---

### Step 2: Configure Workspace

We'll use npm workspaces to manage our microservices.

I'll create the configuration file for you (no command needed).

---

## 📚 What Happens Next

After you run the commands above, I'll:

1. ✅ Create the workspace configuration
2. ✅ Set up the mock-cms service (SOAP server)
3. ✅ Set up the mock-ros service (REST server)
4. ✅ Set up the mock-wms service (TCP server)
5. ✅ Guide you through testing each service

---

## 🎓 Learning Points

As we build each service, we'll understand:

### Mock CMS (SOAP)
- **What:** XML-based web service protocol
- **Why:** Legacy systems often use SOAP
- **How:** Using `soap` npm package to create SOAP server

### Mock ROS (REST)
- **What:** Modern HTTP-based API
- **Why:** Cloud services prefer REST
- **How:** Using Express.js to create REST endpoints

### Mock WMS (TCP/IP)
- **What:** Custom protocol over TCP
- **Why:** Internal systems may use proprietary protocols
- **How:** Using Node.js `net` module

---

## 🔄 Current Step

**👉 Please run the commands from Step 1 above and send me the output!**

Once you do, I'll create the project structure and we'll start building the first mock service together! 🚀

---

## ⚠️ Common Issues

### Issue: "npm: command not found"
**Solution:** Node.js not installed or not in PATH. Reinstall Node.js and restart terminal.

### Issue: "Permission denied"
**Solution:** On Windows, run terminal as Administrator, or change to a folder where you have write permissions.

### Issue: Path with spaces
**Solution:** Use quotes around the path:
```bash
cd "c:/Users/Chamudu Hansana/Desktop/Projects/SwiftLogistics"
```

---

Ready to begin? Run the commands and let me know what you see! 💪
