import express from 'express';
import fs from 'fs';
import path from 'path';
import upload from '../middleware/upload.js';
import UserProfile from '../models/userProfile.js';

const router = express.Router();

// CREATE — POST /api/userprofile
router.post('/', upload.single('idProofImage'), async (req, res) => {
  try {
    const data = req.body;

    if (req.file) {
      data.idProofImage = `/uploads/idproofs/${req.file.filename}`;
    }

    const profile = new UserProfile(data);
    await profile.save();

    res.status(201).json({ message: 'Profile created', profile });
  } catch (error) {
    res.status(500).json({ message: 'Error creating profile', error });
  }
});

// GET ALL — GET /api/userprofile
router.get('/', async (req, res) => {
  try {
    const profiles = await UserProfile.find().sort({ createdAt: -1 });
    res.json({ count: profiles.length, profiles });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profiles', error });
  }
});

// GET ONE — GET /api/userprofile/:id
router.get('/:id', async (req, res) => {
  try {
    const profile = await UserProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    res.json({ profile });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
});

// UPDATE — PUT /api/userprofile/:id
router.put('/:id', upload.single('idProofImage'), async (req, res) => {
  try {
    const profile = await UserProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    // handle new file upload
    if (req.file) {
      // delete old file if exists
      if (profile.idProofImage) {
        const oldFile = path.join(process.cwd(), profile.idProofImage.replace(/^\//, ''));
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
      req.body.idProofImage = `/uploads/idproofs/${req.file.filename}`;
    }

    // update fields
    Object.assign(profile, req.body);
    await profile.save();

    res.json({ message: 'Profile updated', profile });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error });
  }
});

// DELETE — DELETE /api/userprofile/:id
router.delete('/:id', async (req, res) => {
  try {
    const profile = await UserProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    // delete stored file
    if (profile.idProofImage) {
      const filePath = path.join(process.cwd(), profile.idProofImage.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await profile.deleteOne();

    res.json({ message: 'Profile deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting profile', error });
  }
});

export default router;
