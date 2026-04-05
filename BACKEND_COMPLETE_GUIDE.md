# 🚀 Complete Backend Guide - SmartPost AI

## Table of Contents
1. [What is a Backend?](#what-is-a-backend)
2. [Architecture Overview](#architecture-overview)
3. [Core Components Explained](#core-components-explained)
4. [How Data Flows (Request-Response Cycle)](#how-data-flows)
5. [Your Project Structure](#your-project-structure)
6. [Real Code Examples](#real-code-examples)
7. [Writing Your Own Backend Code](#writing-your-own-backend-code)

---

## What is a Backend?

### Simple Definition
**The backend is the "server-side" of your application.** It's the part that:
- 📦 Stores data in databases
- 🔐 Handles security and authentication
- ⚙️ Performs business logic
- 📤 Returns data to the frontend
- 🔌 Acts as an intermediary between frontend and database

### Frontend vs Backend

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                        │
│              (Frontend - React/Vue/etc)                  │
│  - What user sees (buttons, forms, UI)                  │
│  - User interactions (click, type, scroll)              │
└────────────────────┬────────────────────────────────────┘
                     │
            HTTP/REST API Calls
            (JSON data exchange)
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   YOUR SERVER (Backend)                  │
│              (Node.js/Express in your case)             │
│  - Receives requests from frontend                      │
│  - Processes data and logic                             │
│  - Stores/retrieves from database                       │
│  - Sends back responses                                 │
└────────────────────┬────────────────────────────────────┘
                     │
          Database Queries (MongoDB)
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   DATABASE                               │
│                  (MongoDB)                              │
│  - Stores all user data                                 │
│  - Asks: "WHERE is the name 'John'?"                    │
│  - Returns matching records                             │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

Your SmartPost AI backend follows the **MVC (Model-View-Controller)** + **Routes** pattern:

```
REQUEST FLOW:
┌────────────┐
│  Frontend  │ Sends HTTP request (POST, GET, PUT, DELETE)
└─────┬──────┘
      │
      ▼
┌────────────────────────────────────────────┐
│  ROUTES (Express Router)                   │   ← Where requests enter
│  /api/auth, /api/requests, /api/workspaces│   ← URL paths
└──────────┬─────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────┐
│  CONTROLLERS (Business Logic)              │   ← What happens with data
│  authController, requestController, etc    │   ← Fetch, process, validate
└──────────┬─────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────┐
│  MODELS (Data Structure)                   │   ← How data is shaped
│  User, Workspace, Request, etc             │   ← Rules & validation
└──────────┬─────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────┐
│  DATABASE (MongoDB)                        │   ← Persistent storage
│  Collections: users, workspaces, requests  │
└────────────────────────────────────────────┘

RESPONSE FLOW (Reverse):
Database → Models → Controllers → Routes → Frontend
```

---

## Core Components Explained

### 1. **ROUTES** - The Entry Points

**What they do:** Define URL endpoints and connect them to controller functions.

**File:** `server/src/routes/authRoutes.js`
```javascript
const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Define endpoints
router.post('/register', authController.register);      // POST /api/auth/register
router.post('/login', authController.login);            // POST /api/auth/login
router.post('/logout', authController.logout);          // POST /api/auth/logout
router.patch('/verifyEmail/:token', authController.verifyEmail);  // PATCH /api/auth/verifyEmail/abc123

module.exports = router;
```

**How it works:**
1. Frontend sends: `POST http://localhost:5000/api/auth/register`
2. Express matches this to `router.post('/register', ...)`
3. Calls the `authController.register` function

**HTTP Methods:**
- `GET` - Retrieve data (no body)
- `POST` - Create new data
- `PATCH` - Update existing data
- `DELETE` - Remove data

---

### 2. **CONTROLLERS** - The Business Logic

**What they do:** Handle the actual logic - validate data, process requests, interact with database, send responses.

**File:** `server/src/controllers/authController.js`

**Example 1: User Registration**
```javascript
// This is a controller function
exports.register = catchAsync(async (req, res, next) => {
  // 1️⃣ EXTRACT data from request
  const { name, email, password, passwordConfirm } = req.body;
  
  // 2️⃣ VALIDATE data (using Zod schema)
  const registerSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters")
  });
  
  // 3️⃣ CREATE new user in database
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });
  
  // 4️⃣ CREATE default workspace for user
  await Workspace.create({ 
    name: 'My Workspace', 
    owner: newUser._id,
    members: [{ user: newUser._id, role: 'admin' }]
  });
  
  // 5️⃣ SEND TOKEN & USER to frontend
  createSendToken(newUser, 201, res);  // 201 = Created
});
```

**What happens step-by-step when user clicks "Sign Up":**

```
User fills form: name, email, password
        ↓
Frontend sends POST request with form data
        ↓
Route: POST /api/auth/register → authController.register()
        ↓
Controller extracts: req.body { name, email, password }
        ↓
Validates: Is email format correct? Is password 8+ chars?
        ↓
Creates User in MongoDB with hashed password
        ↓
Creates default Workspace for that user
        ↓
Generates JWT token
        ↓
Sends back: { token, user, status: 'success' }
        ↓
Frontend receives response & saves token in cookies
```

---

### 3. **MODELS** - The Data Structure

**What they do:** Define how data is structured, validated, and stored.

**File:** `server/src/models/userModel.js`

```javascript
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!']  // This field is REQUIRED
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,  // No two users can have same email
    lowercase: true  // 'John@Gmail.com' → 'john@gmail.com'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,  // Password must be at least 8 characters
    select: false  // Don't automatically include password in queries
  },
  isEmailVerified: {
    type: Boolean,
    default: false  // New users haven't verified email yet
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
}, {
  timestamps: true  // Automatically adds createdAt and updatedAt
});

// Middleware: Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);  // Never store plain passwords!
});

// Custom methods attached to user instances
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);  // Check if password is correct
};
```

**Why models matter:**
- ✅ Ensure data is valid before saving
- ✅ Define relationships between data
- ✅ Provide reusable methods
- ✅ Catch errors early

---

### 4. **UTILITIES** - Helper Functions

**What they do:** Reusable code for common tasks.

#### `catchAsync.js` - Error Handling
```javascript
// Wraps async functions to catch errors automatically
module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);  // If error occurs, pass to error handler
  };
};

// USAGE:
exports.register = catchAsync(async (req, res, next) => {
  // If any error here, it's automatically caught!
  await User.create({ ... });
});
```

#### `AppError.js` - Custom Errors
```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;  // 400, 401, 404, 500, etc.
  }
}

// USAGE:
if (!user) {
  return next(new AppError('User not found', 404));
}
```

---

## How Data Flows

### Complete Request-Response Cycle

**Scenario: User logs in**

```
FRONTEND:
  User enters email & password
  Clicks "Login"
  Browser sends:
    POST /api/auth/login
    Body: { email: "john@example.com", password: "123456" }

BACKEND RECEIVES REQUEST:
  ↓
app.js:
  - Receives request on POST /api/auth/login
  - Passes to authRoutes

authRoutes.js:
  router.post('/login', authController.login)
  - Matches the route
  - Calls authController.login()

authController.js (LOGIN LOGIC):
  exports.login = async (req, res, next) => {
    
    // 1. GET email from request
    const { email, password } = req.body;
    
    // 2. CHECK if user exists
    const user = await User.findOne({ email }).select('+password');
    
    // 3. VALIDATE password is correct
    const passwordMatch = await user.correctPassword(password, user.password);
    
    // 4. IF error, send error response
    if (!user || !passwordMatch) {
      return next(new AppError('Incorrect email or password', 401));
    }
    
    // 5. GENERATE JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    
    // 6. SEND response to frontend
    res.status(200).json({
      status: 'success',
      token,
      data: { user }
    });
  }

ERROR HANDLER (if error occurred):
  - Catches the error
  - Formats it nicely
  - Sends error response:
    {
      status: 'fail',
      message: 'Incorrect email or password'
    }

FRONTEND RECEIVES RESPONSE:
  Status 200: ✅ Login successful!
    - Saves token in localStorage/cookies
    - Redirects to Dashboard
    
  Status 401: ❌ Login failed
    - Shows error message to user
```

---

## Your Project Structure

### File Organization

```
server/
├── server.js                 ← ENTRY POINT (starts everything)
├── package.json              ← Dependencies
│
└── src/
    ├── app.js               ← Express app setup & middlewares
    │
    ├── routes/              ← URL endpoints
    │   ├── authRoutes.js     (Login, Register, etc.)
    │   ├── workspaceRoutes.js (Workspace CRUD)
    │   ├── requestRoutes.js  (HTTP Requests CRUD)
    │   └── ... other routes
    │
    ├── controllers/         ← Business logic
    │   ├── authController.js
    │   ├── requestController.js
    │   └── ... other controllers
    │
    ├── models/              ← Data structure & validation
    │   ├── userModel.js
    │   ├── workspaceModel.js
    │   ├── requestModel.js
    │   └── ... other models
    │
    └── utils/               ← Helper functions
        ├── catchAsync.js    (Error handling)
        ├── AppError.js      (Custom errors)
        └── email.js         (Email sending)
```

### Database Collections (MongoDB)

```
MongoDB
├── users              ← User accounts
│   ├── _id
│   ├── name
│   ├── email
│   ├── password (hashed)
│   ├── isEmailVerified
│   └── ...
│
├── workspaces         ← Team workspaces
│   ├── _id
│   ├── name
│   ├── owner (reference to user)
│   ├── members: [{ user, role }]
│   └── ...
│
├── requests           ← HTTP requests (for the API tool)
│   ├── _id
│   ├── name
│   ├── method (GET, POST, PUT, DELETE)
│   ├── url
│   ├── headers
│   ├── body
│   ├── workspaceId (reference to workspace)
│   └── ...
│
└── collections        ← Request folders/organization
    ├── _id
    ├── name
    ├── requests: [array of request IDs]
    └── ...
```

---

## Real Code Examples

### Example 1: Creating a Request (from requestController.js)

**The Code:**
```javascript
exports.createRequest = catchAsync(async (req, res, next) => {
  // 1. Add who created it
  req.body.updatedBy = req.user.id;
  
  // 2. Create in database
  const newRequest = await Request.create(req.body);
  
  // 3. Get user details
  await newRequest.populate('updatedBy', 'name email');
  
  // 4. Notify other users via WebSocket
  if (req.app.get('io') && newRequest.workspaceId) {
    req.app.get('io').to(newRequest.workspaceId.toString())
      .emit('request_updated', newRequest);
  }
  
  // 5. Send response
  res.status(201).json({ status: 'success', data: { request: newRequest } });
});
```

**What happens:**
```
Frontend sends POST /api/requests with:
{
  name: "Get Users",
  method: "GET",
  url: "https://api.example.com/users",
  workspaceId: "123"
}
        ↓
Controller adds: updatedBy = current user ID
        ↓
Request.create() → Saves to MongoDB
        ↓
populate() → Joins with user to get name & email
        ↓
WebSocket notification → All users in workspace see it instantly!
        ↓
Response sent to frontend:
{
  status: 'success',
  data: {
    request: {
      _id: '...',
      name: 'Get Users',
      method: 'GET',
      updatedBy: { name: 'john', email: 'john@example.com' },
      createdAt: '2024-01-01T12:00:00Z',
      ...
    }
  }
}
```

### Example 2: User Authentication (protect middleware)

**The Code:**
```javascript
exports.protect = catchAsync(async (req, res, next) => {
  // 1. GET token from cookies or headers
  let token;
  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // 2. CHECK if token exists
  if (!token) {
    return next(new AppError('Not logged in! Please log in to get access.', 401));
  }
  
  // 3. VERIFY token is valid
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // 4. FIND user with that ID
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user no longer exists.', 401));
  }
  
  // 5. GRANT access by adding user to request
  req.user = currentUser;
  next();
});
```

**Usage:**
```javascript
// In routes.js:
router.delete('/deleteMe', authController.protect, authController.deleteAccount);
                            ↑ This middleware runs first
                            
// When request comes in:
1. protect() runs
2. If valid token → req.user is set
3. deleteAccount() runs and can use req.user
4. If invalid token → Error sent, deleteAccount() never runs
```

---

## Writing Your Own Backend Code

### Step-by-Step Guide to Create a New Feature

**Example: Create a "Notes" feature where users can save notes**

#### Step 1: Create the Model

**File:** `server/src/models/noteModel.js`

```javascript
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Note must have a title'],
    trim: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: [true, 'Note must have content']
  },
  workspaceId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Workspace',
    required: [true, 'Note must belong to a workspace']
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Note must have a creator']
  },
  tags: [String],  // Array of tags for organization
  isPinned: {
    type: Boolean,
    default: false
  },
}, {
  timestamps: true
});

const Note = mongoose.model('Note', noteSchema);
module.exports = Note;
```

#### Step 2: Create the Controller

**File:** `server/src/controllers/noteController.js`

```javascript
const Note = require('../models/noteModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// CREATE a new note
exports.createNote = catchAsync(async (req, res, next) => {
  // 1. Add creator info
  req.body.createdBy = req.user.id;
  
  // 2. Create note
  const newNote = await Note.create(req.body);
  await newNote.populate('createdBy', 'name email');
  
  // 3. Notify workspace members
  if (req.app.get('io')) {
    req.app.get('io').to(req.body.workspaceId).emit('note_created', newNote);
  }
  
  // 4. Send response
  res.status(201).json({
    status: 'success',
    data: { note: newNote }
  });
});

// GET all notes in a workspace
exports.getNotes = catchAsync(async (req, res, next) => {
  const notes = await Note.find({ workspaceId: req.params.workspaceId })
    .populate('createdBy', 'name email')
    .sort('-createdAt');  // Newest first
  
  res.status(200).json({
    status: 'success',
    results: notes.length,
    data: { notes }
  });
});

// UPDATE a note
exports.updateNote = catchAsync(async (req, res, next) => {
  const note = await Note.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }  // Validate data
  ).populate('createdBy', 'name email');
  
  if (!note) {
    return next(new AppError('No note found with that ID', 404));
  }
  
  // Notify workspace members
  if (req.app.get('io') && note.workspaceId) {
    req.app.get('io').to(note.workspaceId.toString())
      .emit('note_updated', note);
  }
  
  res.status(200).json({
    status: 'success',
    data: { note }
  });
});

// DELETE a note
exports.deleteNote = catchAsync(async (req, res, next) => {
  const note = await Note.findByIdAndDelete(req.params.id);
  
  if (!note) {
    return next(new AppError('No note found with that ID', 404));
  }
  
  // Notify workspace members
  if (req.app.get('io') && note.workspaceId) {
    req.app.get('io').to(note.workspaceId.toString())
      .emit('note_deleted', note._id);
  }
  
  res.status(200).json({
    status: 'success',
    data: null
  });
});
```

#### Step 3: Create the Routes

**File:** `server/src/routes/noteRoutes.js`

```javascript
const express = require('express');
const noteController = require('../controllers/noteController');
const authController = require('../controllers/authController');

const router = express.Router();

// All note routes need authentication
router.use(authController.protect);

// Routes
router.post('/', noteController.createNote);                    // POST /api/notes
router.get('/workspace/:workspaceId', noteController.getNotes); // GET /api/notes/workspace/123
router.patch('/:id', noteController.updateNote);                // PATCH /api/notes/123
router.delete('/:id', noteController.deleteNote);               // DELETE /api/notes/123

module.exports = router;
```

#### Step 4: Register Routes in app.js

**File:** `server/src/app.js`

```javascript
const noteRouter = require('./routes/noteRoutes');

// Add this line with other routes
app.use('/api/notes', noteRouter);
```

#### Step 5: Use from Frontend

```javascript
// Create a note
const response = await fetch('/api/notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My First Note',
    content: 'This is awesome!',
    workspaceId: 'workspace-123',
    tags: ['important', 'react']
  })
});

const data = await response.json();
console.log(data.data.note);  // The created note

// Get all notes
const notesResponse = await fetch('/api/notes/workspace/workspace-123');
const notes = await notesResponse.json();

// Update a note
await fetch(`/api/notes/note-123`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ isPinned: true })
});

// Delete a note
await fetch(`/api/notes/note-123`, { method: 'DELETE' });
```

---

## Best Practices for Backend Development

### 1. **Always Validate Input**
```javascript
// ❌ BAD
exports.createUser = async (req, res) => {
  const user = await User.create(req.body);  // What if email is missing?
};

// ✅ GOOD
exports.createUser = catchAsync(async (req, res, next) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  });
  
  const validated = schema.parse(req.body);  // Throws error if invalid
  const user = await User.create(validated);
});
```

### 2. **Always Use Error Handling**
```javascript
// ❌ BAD
exports.deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  res.json(user);  // What if user doesn't exist?
};

// ✅ GOOD
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  res.json(user);
});
```

### 3. **Protect Sensitive Routes**
```javascript
// ❌ BAD - Anyone can delete any user
router.delete('/users/:id', userController.deleteUser);

// ✅ GOOD - Only authenticated users can delete
router.delete('/users/:id', authController.protect, userController.deleteUser);

// ✅ BETTER - Only the user can delete their own account
router.delete('/deleteMe', authController.protect, (req, res, next) => {
  req.params.id = req.user.id;  // Force delete only own account
  next();
}, authController.deleteAccount);
```

### 4. **Use Database Relationships**
```javascript
// Model:
const requestSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',  // Links to User model
    required: true
  }
});

// Controller:
const request = await Request.findById(id)
  .populate('createdBy', 'name email');  // Fetch user details too
  
// Result:
{
  _id: '123',
  name: 'Get Users',
  createdBy: {  // ← Full user object, not just ID
    _id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com'
  }
}
```

### 5. **Return Consistent Response Format**
```javascript
// Success response
res.status(200).json({
  status: 'success',
  data: { user }
});

// Error response
res.status(400).json({
  status: 'fail',
  message: 'Invalid input'
});
```

### 6. **Security: Never Store Plain Passwords**
```javascript
// ❌ NEVER do this
password: req.body.password  // Store plain password - DANGER!

// ✅ DO THIS (in model)
userSchema.pre('save', async function() {
  this.password = await bcrypt.hash(this.password, 12);
});
```

### 7. **Use Async/Await with Error Handling**
```javascript
// ❌ OLD - Callback hell
function fetchUser(id, callback) {
  User.findById(id, (err, user) => {
    if (err) callback(err);
    else callback(null, user);
  });
}

// ✅ NEW - Clean and modern
async function fetchUser(id) {
  const user = await User.findById(id);
  return user;
}

// ✅ WITH ERROR HANDLING
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});
```

---

## Common Patterns in Your Project

### Authentication Flow
```
User logs in
    ↓
Controller validates credentials
    ↓
Generate JWT token
    ↓
Store token in cookie (httpOnly)
    ↓
User can now make requests with token
    ↓
protect middleware validates token on each request
    ↓
If valid → req.user is set, request continues
If invalid → 401 error sent
```

### CRUD Operations
```
CREATE  → POST /api/resource        → controller.create()
READ    → GET /api/resource/:id     → controller.getOne()
UPDATE  → PATCH /api/resource/:id   → controller.update()
DELETE  → DELETE /api/resource/:id  → controller.delete()
LIST    → GET /api/resource         → controller.getAll()
```

### Real-Time Updates (WebSocket)
```
User makes change in frontend
    ↓
Controller updates database
    ↓
Controller emits WebSocket event:
    io.to(workspaceId).emit('event_name', data)
    ↓
All users in that workspace receive update instantly
    ↓
Frontend updates UI without refreshing
```

---

## Summary

### Keep These In Mind:

1. **Backend = Server + Database** - Handles all logic, security, and data storage
2. **Routes = URLs** - /api/users, /api/requests, etc.
3. **Controllers = Logic** - What happens when a request comes in
4. **Models = Structure** - How data is shaped and validated
5. **Database = Storage** - Persistent data (MongoDB in your case)
6. **Error Handling** - Always handle errors gracefully
7. **Security** - Validate input, protect routes, hash passwords
8. **Real-time = WebSocket** - For live updates across users

### Practice Pattern:
1. Create model with schema and validation
2. Create controller with business logic
3. Create routes that connect URLs to controller functions
4. Register routes in app.js
5. Test from frontend using fetch/axios

Good luck! Now you understand how the entire backend works! 🚀
