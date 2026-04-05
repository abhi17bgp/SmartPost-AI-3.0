# Backend Quick Reference Cheat Sheet

## Quick URL Patterns

```
Your Backend: http://localhost:5000
```

### Authentication Routes
```
POST   /api/auth/register        → Create new account
POST   /api/auth/login           → Log in user
POST   /api/auth/logout          → Log out user
PATCH  /api/auth/verifyEmail/:token → Verify email
POST   /api/auth/forgotPassword   → Request password reset
PATCH  /api/auth/resetPassword/:token → Reset password
```

### Workspace Routes
```
GET    /api/workspaces           → Get all my workspaces
POST   /api/workspaces           → Create workspace
GET    /api/workspaces/:id       → Get one workspace
PATCH  /api/workspaces/:id       → Update workspace
DELETE /api/workspaces/:id       → Delete workspace
POST   /api/workspaces/joinByCode/:code → Join workspace
```

### Request Routes (HTTP Requests)
```
POST   /api/requests             → Create new request
GET    /api/requests/:id         → Get one request
PATCH  /api/requests/:id         → Update request
DELETE /api/requests/:id         → Delete request
```

### Collections Routes (Folders)
```
POST   /api/collections          → Create collection
GET    /api/collections/:id      → Get collection
PATCH  /api/collections/:id      → Update collection
DELETE /api/collections/:id      → Delete collection
```

---

## Controller Template

Copy-paste this template for new controllers:

```javascript
const [Model] = require('../models/[modelName]Model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// CREATE
exports.create[Name] = catchAsync(async (req, res, next) => {
  req.body.createdBy = req.user.id;  // Add creator
  const new[Name] = await [Model].create(req.body);
  await new[Name].populate('createdBy', 'name email');
  
  if (req.app.get('io')) {
    req.app.get('io').emit('[name]_created', new[Name]);
  }
  
  res.status(201).json({
    status: 'success',
    data: { [name]: new[Name] }
  });
});

// READ ONE
exports.get[Name] = catchAsync(async (req, res, next) => {
  const [name] = await [Model].findById(req.params.id);
  if (![ [name]]) return next(new AppError('Not found', 404));
  
  res.status(200).json({
    status: 'success',
    data: { [name] }
  });
});

// READ ALL
exports.getAll[Names] = catchAsync(async (req, res, next) => {
  const [names] = await [Model].find().sort('-createdAt');
  
  res.status(200).json({
    status: 'success',
    results: [names].length,
    data: { [names] }
  });
});

// UPDATE
exports.update[Name] = catchAsync(async (req, res, next) => {
  const [name] = await [Model].findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (![name]) return next(new AppError('Not found', 404));
  
  if (req.app.get('io')) {
    req.app.get('io').emit('[name]_updated', [name]);
  }
  
  res.status(200).json({
    status: 'success',
    data: { [name] }
  });
});

// DELETE
exports.delete[Name] = catchAsync(async (req, res, next) => {
  const [name] = await [Model].findByIdAndDelete(req.params.id);
  if (![name]) return next(new AppError('Not found', 404));
  
  if (req.app.get('io')) {
    req.app.get('io').emit('[name]_deleted', req.params.id);
  }
  
  res.status(200).json({
    status: 'success',
    data: null
  });
});
```

---

## Model Template

```javascript
const mongoose = require('mongoose');

const [modelName]Schema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  description: String,
  
  // Reference to another model
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Array of references
  members: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  }],
  
  // Timestamps
}, { timestamps: true });

// Middleware: Run before save
[modelName]Schema.pre('save', function() {
  // Do something before saving
});

// Custom methods
[modelName]Schema.methods.customMethod = function() {
  // Instance method
};

const [ModelName] = mongoose.model('[ModelName]', [modelName]Schema);
module.exports = [ModelName];
```

---

## Routes Template

```javascript
const express = require('express');
const [name]Controller = require('../controllers/[name]Controller');
const authController = require('../controllers/authController');

const router = express.Router();

// Middleware: Require authentication
router.use(authController.protect);

// Routes
router.post('/', [name]Controller.create[Name]);
router.get('/', [name]Controller.getAll[Names]);
router.get('/:id', [name]Controller.get[Name]);
router.patch('/:id', [name]Controller.update[Name]);
router.delete('/:id', [name]Controller.delete[Name]);

module.exports = router;
```

---

## Error Handling Patterns

### Validation Error
```javascript
if (!email.includes('@')) {
  return next(new AppError('Invalid email format', 400));
}
```

### Not Found Error
```javascript
const user = await User.findById(id);
if (!user) {
  return next(new AppError('User not found', 404));
}
```

### Unauthorized Error
```javascript
if (req.user.id !== resource.ownerId) {
  return next(new AppError('Not authorized', 403));
}
```

### Duplicate Key Error (handled in app.js)
```javascript
// When user tries to register with existing email
// Error code 11000 from MongoDB
// app.js catches it and shows friendly message
```

---

## Common Mongoose Operations

### Create
```javascript
const user = await User.create({ name: 'John', email: 'john@example.com' });
```

### Find One
```javascript
const user = await User.findById(id);
const user = await User.findOne({ email: 'john@example.com' });
```

### Find Many
```javascript
const users = await User.find();  // All
const users = await User.find({ role: 'admin' });  // Filter
```

### Update
```javascript
const user = await User.findByIdAndUpdate(id, { name: 'Jane' }, { new: true });
```

### Delete
```javascript
const user = await User.findByIdAndDelete(id);
```

### Populate (Join)
```javascript
const workspace = await Workspace.findById(id).populate('owner');
// Now workspace.owner has full user details

const workspace = await Workspace.findById(id)
  .populate('owner', 'name email')  // Only name and email
  .populate('members.user', 'name');  // Nested populate
```

### Sorting
```javascript
const users = await User.find().sort('-createdAt');  // Newest first
const users = await User.find().sort('name');  // A-Z
```

### Limiting & Pagination
```javascript
const users = await User.find().limit(10);  // First 10
const users = await User.find().skip(10).limit(10);  // Page 2
```

---

## HTTP Status Codes Reference

```
200  ✅ OK - Request succeeded
201  ✅ Created - Resource created
204  ✅ No Content - Delete successful (no body)

400  ❌ Bad Request - Invalid input
401  ❌ Unauthorized - Need authentication/valid token
403  ❌ Forbidden - Not allowed/insufficient permissions
404  ❌ Not Found - Resource doesn't exist
409  ❌ Conflict - Duplicate (email already exists)

500  💥 Internal Server Error - Server error
```

---

## Response Format

### Success Response
```json
{
  "status": "success",
  "data": {
    "user": { /* object */ }
  }
}
```

### Error Response
```json
{
  "status": "fail",
  "message": "Invalid email format"
}
```

### List Response
```json
{
  "status": "success",
  "results": 5,
  "data": {
    "users": [ /* array */ ]
  }
}
```

---

## Testing Your API

### Using Fetch (Frontend)
```javascript
// GET
const response = await fetch('/api/users/123');
const data = await response.json();

// POST
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John', email: 'john@example.com' })
});

// PATCH
const response = await fetch('/api/users/123', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Jane' })
});

// DELETE
const response = await fetch('/api/users/123', {
  method: 'DELETE'
});
```

### Using cURL (Terminal)
```bash
# GET
curl http://localhost:5000/api/users/123

# POST
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'

# PATCH
curl -X PATCH http://localhost:5000/api/users/123 \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane"}'

# DELETE
curl -X DELETE http://localhost:5000/api/users/123
```

### Using Postman App
1. Open Postman
2. Create new request
3. Select method (GET, POST, etc.)
4. Enter URL: http://localhost:5000/api/users
5. Add headers: Content-Type: application/json
6. Add body (for POST/PATCH)
7. Click Send

---

## Environment Variables (.env)

```
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/smartpost-ai
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=30d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

FRONTEND_URL=http://localhost:5173
```

---

## Debugging Tips

### 1. Check Server Logs
```
Look at terminal where you ran: npm start
```

### 2. Check MongoDB
```javascript
// In controller, before response
console.log('Data:', data);  // Log what you're sending
```

### 3. Check Frontend Network
```
1. Open Developer Tools (F12)
2. Go to Network tab
3. Make request
4. Click request
5. See Response and Headers
```

### 4. Check Error
```javascript
// Catch and log error
exports.test = catchAsync(async (req, res, next) => {
  try {
    const result = await someOperation();
    res.json(result);
  } catch (error) {
    console.error('Error details:', error);  // See exact error
    next(error);
  }
});
```

---

## Common Mistakes & Solutions

### ❌ Forgetting to await
```javascript
// WRONG
const user = User.findById(id);  // Returns promise!
console.log(user.name);  // undefined

// RIGHT
const user = await User.findById(id);
console.log(user.name);  // ✅ works
```

### ❌ Not using catchAsync
```javascript
// WRONG - Error crashes server
exports.test = async (req, res, next) => {
  const user = await User.findById(undefined); // Error!
};

// RIGHT - Error is handled
exports.test = catchAsync(async (req, res, next) => {
  const user = await User.findById(undefined); // Error caught!
});
```

### ❌ Storing plain password
```javascript
// WRONG
password: req.body.password  // Anyone who reads DB sees password!

// RIGHT - Hash in model pre-save hook
userSchema.pre('save', async function() {
  this.password = await bcrypt.hash(this.password, 12);
});
```

### ❌ No authentication check
```javascript
// WRONG - Anyone can delete any user
router.delete('/users/:id', userController.deleteUser);

// RIGHT - Only logged-in users
router.delete('/users/:id', authController.protect, userController.deleteUser);
```

### ❌ Wrong response status
```javascript
// WRONG
res.status(200).json(newUser);  // 200 = OK, but it's a CREATE

// RIGHT
res.status(201).json(newUser);  // 201 = Created
```

---

## Next Steps to Practice

1. **Create a new model** (Example: Comment, Tag, Category)
2. **Create controller functions** for CRUD
3. **Create routes** 
4. **Register in app.js**
5. **Test from frontend** using fetch
6. **Add WebSocket emit** for real-time updates
7. **Add authentication** to protected routes

Good luck! Reference this sheet while coding! 🚀
