// imports at top of file
import express from "express";
import mongoose from "mongoose";
import Room from "../models/room.js";
import Bed from "../models/bed.js";
import UserProfile from "../models/userProfile.js";

const router = express.Router();

/* =============
   Get available rooms
   Returns rooms that have at least one non-occupied bed, along with availableBedsCount
   ============= */
router.get("/available-rooms", async (req, res) => {
  try {
    // Option A (efficient): aggregate beds count per room
    const rooms = await Room.aggregate([
      {
        $lookup: {
          from: "beds",
          localField: "_id",
          foreignField: "room",
          as: "beds"
        }
      },
      {
        $addFields: {
          availableBedsCount: {
            $size: {
              $filter: {
                input: "$beds",
                as: "b",
                cond: { $eq: ["$$b.isOccupied", false] }
              }
            }
          }
        }
      },
      { $match: { availableBedsCount: { $gt: 0 } } },
      { $project: { beds: 0 } } // don't return large bed arrays here
    ]);

    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============
   Get available beds
   Optional query: ?roomId=xxx
   ============= */
   router.get("/available-beds", async (req, res) => {
    try {
      const { roomId } = req.query;
      const filter = { isOccupied: false };
  
      if (roomId) {
        filter.room = new mongoose.Types.ObjectId(roomId);
      }
  
      const beds = await Bed.find(filter).populate("room", "roomNumber rentAmount");
      res.json(beds);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  

/* =============
   Allocate a bed to a user (atomic)
   body: { userId, bedId }
   ============= */
router.post("/allocate-bed", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, bedId } = req.body;
    if (!userId || !bedId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "userId and bedId required" });
    }

    // load bed and ensure it's free (with session)
    const bed = await Bed.findById(bedId).session(session);
    if (!bed) throw new Error("Bed not found");
    if (bed.isOccupied) throw new Error("Bed already occupied");

    // optionally check if user already has an allocation
    const user = await UserProfile.findById(userId).session(session);
    if (!user) throw new Error("User not found");
    if (user.allocatedBed) throw new Error("User already has an allocated bed");

    // mark bed occupied and set occupant
    bed.isOccupied = true;
    bed.occupant = user._id;
    await bed.save({ session });

    // update user profile with allocation details (also store human readable numbers)
    user.allocatedBed = bed._id;
    user.allocatedRoom = bed.room;
    user.bedNumber = bed.bedNumber;
    // optional: populate room to grab rent/roomNumber
    const room = await Room.findById(bed.room).session(session);
    if (room) {
      user.roomNumber = room.roomNumber;
      user.rentAmount = room.rentAmount;
    }
    await user.save({ session });

    // after allocating, check if the room has any free beds left:
    const remainingFreeBeds = await Bed.countDocuments({
      room: bed.room,
      isOccupied: false
    }).session(session);

    room.status = remainingFreeBeds === 0 ? "Full" : "Available";
    await room.save({ session });

    await session.commitTransaction();
    session.endSession();

    // return useful info
    res.json({
      message: "Bed allocated",
      bed: await Bed.findById(bed._id).populate("room", "roomNumber rentAmount"),
      user: await UserProfile.findById(user._id)
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
});

/* =============
   Release bed (de-allocate)
   body: { userId, bedId } or parameterize as needed
   ============= */
router.post("/release-bed", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, bedId } = req.body;
    if (!userId || !bedId) throw new Error("userId and bedId required");

    const bed = await Bed.findById(bedId).session(session);
    const user = await UserProfile.findById(userId).session(session);
    if (!bed || !user) throw new Error("Bed or user not found");

    if (!bed.isOccupied || String(bed.occupant) !== String(user._id)) {
      throw new Error("This user does not occupy that bed");
    }

    // free the bed
    bed.isOccupied = false;
    bed.occupant = null;
    await bed.save({ session });

    // clear user allocation
    user.allocatedBed = undefined;
    user.allocatedRoom = undefined;
    user.bedNumber = undefined;
    user.roomNumber = undefined;
    user.rentAmount = undefined;
    await user.save({ session });

    // update room status
    const room = await Room.findById(bed.room).session(session);
    const remainingFreeBeds = await Bed.countDocuments({
      room: bed.room,
      isOccupied: false
    }).session(session);

    room.status = remainingFreeBeds === 0 ? "Full" : "Available";
    await room.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Bed released", bed, user });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
});

export default router;
