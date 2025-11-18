import express from 'express';
import fs from 'fs';
import path from 'path';
import upload from '../middleware/upload.js';
import UserProfile from '../models/userProfile.js';
import Bed from "../models/bed.js";
import Room from "../models/room.js";
import mongoose from "mongoose";  
import { createFirstPaymentForUser } from '../services/paymentService.js';

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
// router.post(
//   '/',
//   upload.fields([
//     { name: 'idProofImage', maxCount: 1 },
//     { name: 'userImage', maxCount: 1 }
//   ]),
//   async (req, res) => {
//     try {
//       const data = req.body || {};

//       // req.files is an object: { idProofImage: [file], userImage: [file] }
//       if (req.files && req.files.idProofImage && req.files.idProofImage[0]) {
//         data.idProofImage = `/uploads/idproofs/${req.files.idProofImage[0].filename}`;
//       }
//       if (req.files && req.files.userImage && req.files.userImage[0]) {
//         data.userImage = `/uploads/users/${req.files.userImage[0].filename}`;
//       }

//       const profile = new UserProfile(data);
//       await profile.save();

//       res.status(201).json({ message: 'Profile created', profile });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ message: 'Error creating profile', error: error.message });
//     }
//   }
// );
router.post(
  '/',
  upload.fields([
    { name: 'idProofImage', maxCount: 1 },
    { name: 'userImage', maxCount: 1 }
  ]),
  async (req, res) => {
    let session;
    let profile;
    try {
      const data = req.body || {};
      const bedId = data.bedId;

      if (req.files && req.files.idProofImage && req.files.idProofImage[0]) {
        data.idProofImage = `/uploads/idproofs/${req.files.idProofImage[0].filename}`;
      }
      if (req.files && req.files.userImage && req.files.userImage[0]) {
        data.userImage = `/uploads/users/${req.files.userImage[0].filename}`;
      }

      if (data.joinedDate) {
        const raw = String(data.joinedDate).trim();
        console.log("joinedDate raw from client:", raw);
      
        // try ISO / Date.parse first
        let jd = new Date(raw);
      
        // If invalid, try common non-ISO formats: DD-MM-YYYY or DD/MM/YYYY
        if (isNaN(jd.getTime())) {
          // try detect dd-mm-yyyy or dd/mm/yyyy
          const m = raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
          if (m) {
            // m[1]=day, m[2]=month, m[3]=year
            const day = parseInt(m[1], 10);
            const month = parseInt(m[2], 10) - 1; // zero-based
            const year = parseInt(m[3], 10);
            jd = new Date(year, month, day);
          }
        }
      
        // If still invalid, try numeric timestamp
        if (isNaN(jd.getTime()) && /^\d+$/.test(raw)) {
          const ts = parseInt(raw, 10);
          // assume seconds or ms
          jd = ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
        }
      
        if (!isNaN(jd.getTime())) {
          data.joinedDate = jd;
          console.log("joinedDate parsed to:", jd.toISOString());
        } else {
          console.log("joinedDate INVALID, removing it so default applies");
          delete data.joinedDate;
        }
      }

      // If no bed requested, simple create
      if (!bedId) {
        profile = new UserProfile(data);
        await profile.save();
        return res.status(201).json({ message: 'Profile created', profile });
      }

      // If bedId present -> create profile + allocate bed in a transaction
      session = await mongoose.startSession();
      session.startTransaction();

      const bed = await Bed.findById(bedId).session(session);
      if (!bed) throw new Error("Selected bed not found");
      if (bed.isOccupied) throw new Error("Selected bed is already occupied");

      profile = new UserProfile(data);
      await profile.save({ session });

      bed.isOccupied = true;
      bed.occupant = profile._id;
      await bed.save({ session });

      profile.allocatedBed = bed._id;
      profile.allocatedRoom = bed.room;
      profile.bedNumber = bed.bedNumber;

      const room = await Room.findById(bed.room).session(session);
      if (room) {
        profile.roomNumber = room.roomNumber;
        profile.rentAmount = room.rentAmount;
      }

      await profile.save({ session });

      const remainingFreeBeds = await Bed.countDocuments({
        room: bed.room,
        isOccupied: false
      }).session(session);

      if (room) {
        room.status = remainingFreeBeds === 0 ? "Full" : "Available";
        await room.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      const profileSafe = await UserProfile.findById(profile._id)
        .populate("allocatedBed")
        .populate("allocatedRoom");
      const bedSafe = await Bed.findById(bed._id).populate("room", "roomNumber rentAmount");
    

        // create first payment
        try {
          await createFirstPaymentForUser(profile);
        } catch (e) {
          console.warn("Failed to create initial payment for user:", e.message);
          // you can ignore or handle rollback if desired
        }

      return res.status(201).json({ message: 'Profile created and bed allocated', profile: profileSafe, bed: bedSafe });
    } catch (error) {
      try {
        if (session && session.inTransaction()) await session.abortTransaction();
      } catch (e) { /* ignore */ }
      if (session) session.endSession();

      try {
        if (profile && profile._id) await UserProfile.deleteOne({ _id: profile._id });
      } catch (e) { /* ignore */ }

      if (req.files && req.files.idProofImage && req.files.idProofImage[0]) {
        deleteStoredFile(`/uploads/idproofs/${req.files.idProofImage[0].filename}`);
      }
      if (req.files && req.files.userImage && req.files.userImage[0]) {
        deleteStoredFile(`/uploads/users/${req.files.userImage[0].filename}`);
      }

      return res.status(400).json({ message: "Error creating profile or allocating bed", error: error.message });
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
// router.put(
//   '/:id',
//   upload.fields([
//     { name: 'idProofImage', maxCount: 1 },
//     { name: 'userImage', maxCount: 1 }
//   ]),
//   async (req, res) => {
//     try {
//       const profile = await UserProfile.findById(req.params.id);
//       if (!profile) return res.status(404).json({ message: 'Profile not found' });

//       // If new idProofImage uploaded, delete old and set new path
//       if (req.files && req.files.idProofImage && req.files.idProofImage[0]) {
//         // delete old file if exists
//         if (profile.idProofImage) deleteStoredFile(profile.idProofImage);
//         req.body.idProofImage = `/uploads/idproofs/${req.files.idProofImage[0].filename}`;
//       }

//       // If new userImage uploaded, delete old and set new path
//       if (req.files && req.files.userImage && req.files.userImage[0]) {
//         if (profile.userImage) deleteStoredFile(profile.userImage);
//         req.body.userImage = `/uploads/users/${req.files.userImage[0].filename}`;
//       }

//       // Merge updates (text fields) into profile
//       Object.assign(profile, req.body);
//       await profile.save();

//       res.json({ message: 'Profile updated', profile });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ message: 'Error updating profile', error: error.message });
//     }
//   }
// );

// UPDATE — accept new idProofImage and/or userImage and optionally change bed
// UPDATE — accept new idProofImage and/or userImage and optionally change bed
router.put(
  '/:id',
  upload.fields([
    { name: 'idProofImage', maxCount: 1 },
    { name: 'userImage', maxCount: 1 }
  ]),
  async (req, res) => {
    let session;
    try {
      const profile = await UserProfile.findById(req.params.id);
      if (!profile) return res.status(404).json({ message: 'Profile not found' });

      // Handle new files: delete old file if new uploaded and set req.body values
      if (req.files && req.files.idProofImage && req.files.idProofImage[0]) {
        if (profile.idProofImage) deleteStoredFile(profile.idProofImage);
        req.body.idProofImage = `/uploads/idproofs/${req.files.idProofImage[0].filename}`;
      }
      if (req.files && req.files.userImage && req.files.userImage[0]) {
        if (profile.userImage) deleteStoredFile(profile.userImage);
        req.body.userImage = `/uploads/users/${req.files.userImage[0].filename}`;
      }

      // Extract requested bed change (if any). Client should send bedId (string) to change.
      // To explicitly release bed, send bedId = "" (empty string) or null.
      const requestedBedId = typeof req.body.bedId !== 'undefined' ? req.body.bedId || null : undefined;

      // If no bed change requested, just merge and save
      if (typeof requestedBedId === 'undefined') {
        Object.assign(profile, req.body);
        await profile.save();
        return res.json({ message: 'Profile updated', profile });
      }

      // Start transaction to release old bed (if any) and allocate new bed (if provided)
      session = await mongoose.startSession();
      session.startTransaction();

      // keep track of rooms we need to update status for
      let roomsToRecalc = new Set();

      // 1) If user currently has an allocated bed and it's different from requested, release it
      if (profile.allocatedBed) {
        // If requestedBedId is null -> means release only
        if (!requestedBedId || String(profile.allocatedBed) !== String(requestedBedId)) {
          const oldBed = await Bed.findById(profile.allocatedBed).session(session);
          if (oldBed) {
            oldBed.isOccupied = false;
            oldBed.occupant = null;
            await oldBed.save({ session });
            roomsToRecalc.add(String(oldBed.room));
          }
          // clear allocation fields on profile (we'll set new ones below if any)
          profile.allocatedBed = undefined;
          profile.allocatedRoom = undefined;
          profile.bedNumber = undefined;
          profile.roomNumber = undefined;
          profile.rentAmount = undefined;
        }
      }

      // 2) If a new bedId is provided (non-null, non-empty) — allocate it
      if (requestedBedId) {
        // ensure new bed exists and is free
        const newBed = await Bed.findById(requestedBedId).session(session);
        if (!newBed) throw new Error("Selected new bed not found");
        if (newBed.isOccupied) throw new Error("Selected new bed is already occupied");

        // mark bed occupied and set occupant
        newBed.isOccupied = true;
        newBed.occupant = profile._id;
        await newBed.save({ session });

        // set profile allocation fields
        profile.allocatedBed = newBed._id;
        profile.allocatedRoom = newBed.room;
        profile.bedNumber = newBed.bedNumber;

        // fetch room info and set readable fields
        const newRoom = await Room.findById(newBed.room).session(session);
        if (newRoom) {
          profile.roomNumber = newRoom.roomNumber;
          profile.rentAmount = newRoom.rentAmount;
          roomsToRecalc.add(String(newRoom._id));
        }
      }

      // 3) Merge other text updates (name/phone/etc.) into profile
      //    Important: avoid overwriting allocation fields from req.body inadvertently
      const safeBody = { ...req.body };
      delete safeBody.bedId; // we've already handled bedId
      Object.assign(profile, safeBody);

      // 4) Save profile with session
      await profile.save({ session });

      // 5) Recalculate room statuses for rooms we touched
      for (const roomIdStr of roomsToRecalc) {
        const roomId = new mongoose.Types.ObjectId(roomIdStr); // <-- fixed: use `new`
        const remainingFreeBeds = await Bed.countDocuments({
          room: roomId,
          isOccupied: false
        }).session(session);
        const room = await Room.findById(roomId).session(session);
        if (room) {
          room.status = remainingFreeBeds === 0 ? "Full" : "Available";
          await room.save({ session });
        }
      }

      await session.commitTransaction();
      session.endSession();

      // Return updated profile (populated)
      const updated = await UserProfile.findById(profile._id)
        .populate("allocatedBed")
        .populate("allocatedRoom");

      return res.json({ message: 'Profile updated and bed changed', profile: updated });
    } catch (err) {
      try { if (session && session.inTransaction()) await session.abortTransaction(); } catch (e) {}
      if (session) session.endSession();
      console.error("Error updating profile:", err.message);
      return res.status(400).json({ message: 'Error updating profile', error: err.message });
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
