const Workspace = require('../models/workspaceModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const crypto = require('crypto');

// Helper function to ensure owner is in members list
const ensureOwnerInMembers = (workspace) => {
  if (!workspace || !workspace.owner) return workspace;
  
  const ownerInMembers = workspace.members.some(m => 
    m.user._id.toString() === workspace.owner._id.toString()
  );
  
  if (!ownerInMembers) {
    workspace.members.push({
      user: workspace.owner,
      role: 'admin'
    });
  }
  
  return workspace;
};

exports.getAllWorkspaces = catchAsync(async (req, res, next) => {
  let workspaces = await Workspace.find({
    $or: [{ owner: req.user.id }, { 'members.user': req.user.id }]
  }).populate('owner', 'name email').populate('members.user', 'name email');

  // Ensure owner is always in members list
  workspaces = workspaces.map(ensureOwnerInMembers);

  res.status(200).json({ status: 'success', data: { workspaces } });
});

exports.createWorkspace = catchAsync(async (req, res, next) => {
  const joinCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
  let newWorkspace = await Workspace.create({
    name: req.body.name,
    joinCode,
    owner: req.user.id,
    members: [{ user: req.user.id, role: 'admin' }]
  });
  
  await newWorkspace.populate('owner', 'name email');
  await newWorkspace.populate('members.user', 'name email');

  // Ensure owner is always in members list
  newWorkspace = ensureOwnerInMembers(newWorkspace);
  
  if (req.app.get('io')) {
    req.app.get('io').emit('workspace_created', newWorkspace);
  }

  res.status(201).json({ status: 'success', data: { workspace: newWorkspace } });
});

exports.getWorkspace = catchAsync(async (req, res, next) => {
  let workspace = await Workspace.findOne({
    _id: req.params.id,
    $or: [{ owner: req.user.id }, { 'members.user': req.user.id }]
  }).populate('owner', 'name email').populate('members.user', 'name email');
  
  if (!workspace) return next(new AppError('No workspace found with that ID', 404));
  
  // Ensure owner is always in members list
  workspace = ensureOwnerInMembers(workspace);
  
  res.status(200).json({ status: 'success', data: { workspace } });
});

exports.updateWorkspace = catchAsync(async (req, res, next) => {
  let workspace = await Workspace.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    req.body,
    { new: true, runValidators: true }
  ).populate('owner', 'name email').populate('members.user', 'name email');
  
  if (!workspace) return next(new AppError('No workspace found or you are not the admin', 404));
  
  // Ensure owner is always in members list
  workspace = ensureOwnerInMembers(workspace);
  
  if (req.app.get('io')) {
    req.app.get('io').to(req.params.id).emit('workspace_updated', workspace);
  }

  res.status(200).json({ status: 'success', data: { workspace } });
});

exports.deleteWorkspace = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!workspace) return next(new AppError('No workspace found or you are not the admin', 404));
  
  if (req.app.get('io')) {
    req.app.get('io').to(req.params.id).emit('workspace_deleted', req.params.id);
  }

  res.status(204).json({ status: 'success', data: null });
});

exports.generateCode = catchAsync(async (req, res, next) => {
  const joinCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  let workspace = await Workspace.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    { joinCode },
    { new: true }
  ).populate('owner', 'name email').populate('members.user', 'name email');
  
  if (!workspace) return next(new AppError('No workspace found or you are not the admin', 404));

  // Ensure owner is always in members list
  workspace = ensureOwnerInMembers(workspace);

  if (req.app.get('io')) {
    const workspaceId = workspace._id.toString();
    console.log('[GenerateCode] Emitting workspace_updated to room:', workspaceId);
    console.log('[GenerateCode] New join code:', joinCode);
    req.app.get('io').to(workspaceId).emit('workspace_updated', workspace);
  }

  res.status(200).json({ status: 'success', data: { workspace } });
});

exports.joinWorkspace = catchAsync(async (req, res, next) => {
  const { joinCode } = req.body;
  
  let workspace = await Workspace.findOne({ joinCode });
  if (!workspace) return next(new AppError('Invalid join code', 404));

  // Check if already a member
  const isMember = workspace.members.some(m => m.user.toString() === req.user.id);
  if (isMember) return next(new AppError('You are already a member of this workspace', 400));

  workspace.members.push({ user: req.user.id, role: 'member' });
  await workspace.save();
  await workspace.populate('owner', 'name email');
  await workspace.populate('members.user', 'name email');

  // Ensure owner is always in members list
  workspace = ensureOwnerInMembers(workspace);

  if (req.app.get('io')) {
    const workspaceId = workspace._id.toString();
    console.log('[JoinWorkspace] Emitting workspace_updated to room:', workspaceId);
    
    // Notify all members that someone joined
    req.app.get('io').to(workspaceId).emit('member_joined', {
      workspaceId: workspace._id,
      userId: req.user.id,
      userName: req.user.name,
      workspaceName: workspace.name
    });

    // Also emit workspace update to refresh member list and workspace data
    req.app.get('io').to(workspaceId).emit('workspace_updated', {
      _id: workspace._id,
      name: workspace.name,
      joinCode: workspace.joinCode,
      owner: workspace.owner,
      members: workspace.members
    });
  }

  res.status(200).json({ status: 'success', data: { workspace } });
});

exports.leaveWorkspace = catchAsync(async (req, res, next) => {
  let workspace = await Workspace.findOne({ _id: req.params.id, 'members.user': req.user.id });
  if (!workspace) return next(new AppError('Workspace not found or you are not a member', 404));
  if (workspace.owner.toString() === req.user.id) return next(new AppError('Owner cannot leave, delete the workspace instead', 400));

  workspace.members = workspace.members.filter(m => m.user.toString() !== req.user.id);
  await workspace.save();
  await workspace.populate('owner', 'name email');
  await workspace.populate('members.user', 'name email');

  // Ensure owner is always in members list
  workspace = ensureOwnerInMembers(workspace);

  if (req.app.get('io')) {
    req.app.get('io').to(workspace._id.toString()).emit('member_left', {
      workspaceId: workspace._id,
      userId: req.user.id,
      userName: req.user.name,
      workspaceName: workspace.name
    });

    req.app.get('io').to(workspace._id.toString()).emit('workspace_updated', workspace);
  }

  res.status(200).json({ status: 'success', data: { workspace } });
});

exports.removeMember = catchAsync(async (req, res, next) => {
  let workspace = await Workspace.findOne({ _id: req.params.id, owner: req.user.id });
  if (!workspace) return next(new AppError('Workspace not found or you are not the admin', 404));

  const memberToRemove = workspace.members.find(m => m.user.toString() === req.params.userId);
  if (!memberToRemove) return next(new AppError('Member not found in this workspace', 404));

  workspace.members = workspace.members.filter(m => m.user.toString() !== req.params.userId);
  await workspace.save();
  await workspace.populate('owner', 'name email');
  await workspace.populate('members.user', 'name email');

  // Ensure owner is always in members list
  workspace = ensureOwnerInMembers(workspace);

  if (req.app.get('io')) {
    console.log(`[WorkspaceController] Broadcasting member removal: user ${req.params.userId} removed from workspace ${workspace._id} by ${req.user.name}`);
    
    // Notify the removed user specifically
    req.app.get('io').to(workspace._id.toString()).emit('member_removed', { 
      workspaceId: workspace._id, 
      userId: req.params.userId,
      removedBy: req.user.id,
      removedByName: req.user.name,
      workspaceName: workspace.name
    });
    
    // Notify all other members that someone was removed
    req.app.get('io').to(workspace._id.toString()).emit('workspace_updated', workspace);
  }

  res.status(200).json({ 
    status: 'success', 
    message: 'Member removed successfully',
    data: { workspace } 
  });
});
