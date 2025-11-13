import express from 'express';
import fs from 'fs';
import path from 'path';
import upload from '../middleware/upload.js';
import UserProfile from '../models/userProfile.js';

const router = express.Router();

// Helper to delete a stored file path like "/uploads/idproofs/123.jpg"
function deleteStoredFile(storedPath) {
  if (!storedPath) return;
  const rel = storedPath.replace(/^\//, ''); // remove leading slash
  const full = path.join(process.cwd(), rel);
  if (fs.existsSync(full)) {
    try { fs.unlinkSync(full); } catch (err) { console.warn('Could not delete file', full, err.message); }
  }
}

// CREATE — accept two files: idProofImage and userImage
// Use upload.fields to accept multiple named file fields
router.post(
  '/',
  upload.fields([
    { name: 'idProofImage', maxCount: 1 },
    { name: 'userImage', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const data = req.body || {};

      // req.files is an object: { idProofImage: [file], userImage: [file] }
      if (req.files && req.files.idProofImage && req.files.idProofImage[0]) {
        data.idProofImage = `/uploads/idproofs/${req.files.idProofImage[0].filename}`;
      }
      if (req.files && req.files.userImage && req.files.userImage[0]) {
        data.userImage = `/uploads/users/${req.files.userImage[0].filename}`;
      }

      const profile = new UserProfile(data);
      await profile.save();

      res.status(201).json({ message: 'Profile created', profile });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating profile', error: error.message });
    }
  }
);

// GET ALL
router.get('/', async (req, res) => {
  try {
    const profiles = await UserProfile.find().sort({ createdAt: -1 });
    res.json({ count: profiles.length, profiles });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profiles', error: error.message });
  }
});

// GET ONE
router.get('/:id', async (req, res) => {
  try {
    const profile = await UserProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// UPDATE — accept new idProofImage and/or userImage
router.put(
  '/:id',
  upload.fields([
    { name: 'idProofImage', maxCount: 1 },
    { name: 'userImage', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const profile = await UserProfile.findById(req.params.id);
      if (!profile) return res.status(404).json({ message: 'Profile not found' });

      // If new idProofImage uploaded, delete old and set new path
      if (req.files && req.files.idProofImage && req.files.idProofImage[0]) {
        // delete old file if exists
        if (profile.idProofImage) deleteStoredFile(profile.idProofImage);
        req.body.idProofImage = `/uploads/idproofs/${req.files.idProofImage[0].filename}`;
      }

      // If new userImage uploaded, delete old and set new path
      if (req.files && req.files.userImage && req.files.userImage[0]) {
        if (profile.userImage) deleteStoredFile(profile.userImage);
        req.body.userImage = `/uploads/users/${req.files.userImage[0].filename}`;
      }

      // Merge updates (text fields) into profile
      Object.assign(profile, req.body);
      await profile.save();

      res.json({ message: 'Profile updated', profile });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
  }
);

// DELETE — remove both files (if present)
router.delete('/:id', async (req, res) => {
  try {
    const profile = await UserProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    // delete stored files if present
    if (profile.idProofImage) deleteStoredFile(profile.idProofImage);
    if (profile.userImage) deleteStoredFile(profile.userImage);

    await profile.deleteOne();
    res.json({ message: 'Profile deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting profile', error: error.message });
  }
});

export default router;
