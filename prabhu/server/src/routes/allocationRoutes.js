// routes/rooms.js
import express from "express";
import mongoose from "mongoose";
import Room from "../models/room.js";
import Bed from "../models/bed.js";
import UserProfile from "../models/userProfile.js";

const router = express.Router();

// Quick logger to see which URL is being hit (remove after debugging)
router.use((req, res, next) => {
  console.log(`[rooms route] ${req.method} ${req.originalUrl}`);
  next();
});

/* =============
   1) AVAILABLE FLOORS
   Returns distinct floor values for rooms that have at least one free bed.
   Example: GET /api/rooms/available-floors
   ============= */
router.get("/available-floors", async (req, res) => {
  try {
    const floors = await Room.aggregate([
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
          freeBedsCount: {
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
      { $match: { freeBedsCount: { $gt: 0 } } },
      {
        $group: {
          _id: "$floor"
        }
      },
      { $project: { _id: 0, floor: "$_id" } },
      { $sort: { floor: 1 } }
    ]);

    res.json(floors.map((f) => f.floor));
  } catch (err) {
    console.error("available-floors error:", err);
    res.status(500).json({ error: err.message });
  }
});



// GET /api/rooms/available-blocks?floor=First
router.get("/available-blocks", async (req, res) => {
  try {
    const { floor } = req.query;
    if (!floor) {
      return res.status(400).json({ message: "floor is required" });
    }

    const blocks = await Room.aggregate([
      { $match: { floor } },  // filter by floor first

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
          freeBedsCount: {
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
      { $match: { freeBedsCount: { $gt: 0 } } },
      {
        $group: {
          _id: "$block"
        }
      },
      { $project: { _id: 0, block: "$_id" } },
      { $sort: { block: 1 } }
    ]);

    return res.json(blocks.map(b => b.block));
  } catch (err) {
    console.error("available-blocks error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =============
   2) Get available rooms (optional ?floor=First)
   ============= */
router.get("/available-rooms", async (req, res) => {
  try {
    const { floor, block } = req.query;
    const matchStage = {};

    if (typeof floor !== "undefined") matchStage.floor = floor;
    if (typeof block !== "undefined") matchStage.block = block;

    const pipeline = [
      { $match: matchStage },
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
      { $project: { beds: 0 } }
    ];

    const rooms = await Room.aggregate(pipeline);
    res.json(rooms);
  } catch (err) {
    console.error("available-rooms error:", err);
    res.status(500).json({ error: err.message });
  }
});


/* =============
   3) Get available beds (existing endpoint)
   Optional query: ?roomId=xxx
   ============= */
// router.get("/available-beds", async (req, res) => {
//   try {
//     const { roomId } = req.query;
//     const filter = { isOccupied: false };

//     if (roomId) {
//       if (!mongoose.Types.ObjectId.isValid(roomId)) {
//         return res.status(400).json({ message: "Invalid roomId" });
//       }
//       filter.room = new mongoose.Types.ObjectId(roomId);
//     }

//     const beds = await Bed.find(filter).populate("room", "roomNumber rentAmount");
//     res.json(beds);
//   } catch (err) {
//     console.error("available-beds error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });


router.get("/available-beds", async (req, res) => {
  try {
    const { roomId, full } = req.query;

    // helper: treat "true", "1", "yes" (case-insensitive) as true
    const parseBool = v =>
      typeof v === "string" && /^(1|true|yes)$/i.test(v);

    const wantFull = parseBool(full);

    // Build base filter. If full requested, no isOccupied filter;
    // otherwise only return free beds.
    const filter = {};
    if (!wantFull) filter.isOccupied = false;

    if (roomId) {
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ message: "Invalid roomId" });
      }
      filter.room = new mongoose.Types.ObjectId(roomId);
    }

    // populate room fields you care about
    const beds = await Bed.find(filter).populate("room", "roomNumber rentAmount");

    res.json(beds);
  } catch (err) {
    console.error("available-beds error:", err);
    res.status(500).json({ error: err.message });
  }
});
/* =============
   4) Get beds for a room (all beds, with isOccupied flag)
   Example: GET /api/rooms/:id/beds
   ============= */
router.get("/:id/beds", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid room id" });

    const beds = await Bed.find({ room: id }).select("bedNumber isOccupied occupant").lean();
    res.json(beds);
  } catch (err) {
    console.error("/:id/beds error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =============
   5) Allocate a bed to a user (atomic)
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

    if (!mongoose.Types.ObjectId.isValid(bedId) || !mongoose.Types.ObjectId.isValid(userId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid userId or bedId" });
    }

    const bed = await Bed.findById(bedId).session(session);
    if (!bed) throw new Error("Bed not found");
    if (bed.isOccupied) throw new Error("Bed already occupied");

    const user = await UserProfile.findById(userId).session(session);
    if (!user) throw new Error("User not found");
    if (user.allocatedBed) throw new Error("User already has an allocated bed");

    bed.isOccupied = true;
    bed.occupant = user._id;
    await bed.save({ session });

    user.allocatedBed = bed._id;
    user.allocatedRoom = bed.room;
    user.bedNumber = bed.bedNumber;
    const room = await Room.findById(bed.room).session(session);
    if (room) {
      user.roomNumber = room.roomNumber;
      user.rentAmount = room.rentAmount;
    }
    await user.save({ session });

    // update room status
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

    res.json({
      message: "Bed allocated",
      bed: await Bed.findById(bed._id).populate("room", "roomNumber rentAmount"),
      user: await UserProfile.findById(user._id)
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("allocate-bed error:", err);
    res.status(400).json({ error: err.message });
  }
});

/* =============
   6) Release bed (de-allocate)
   body: { userId, bedId }
   ============= */
router.post("/release-bed", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, bedId } = req.body;
    if (!userId || !bedId) throw new Error("userId and bedId required");

    if (!mongoose.Types.ObjectId.isValid(bedId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId or bedId");
    }

    const bed = await Bed.findById(bedId).session(session);
    const user = await UserProfile.findById(userId).session(session);
    if (!bed || !user) throw new Error("Bed or user not found");

    if (!bed.isOccupied || String(bed.occupant) !== String(user._id)) {
      throw new Error("This user does not occupy that bed");
    }

    bed.isOccupied = false;
    bed.occupant = null;
    await bed.save({ session });

    user.allocatedBed = undefined;
    user.allocatedRoom = undefined;
    user.bedNumber = undefined;
    user.roomNumber = undefined;
    user.rentAmount = undefined;
    await user.save({ session });

    const room = await Room.findById(bed.room).session(session);
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

    res.json({ message: "Bed released", bed, user });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("release-bed error:", err);
    res.status(400).json({ error: err.message });
  }
});

/* =============
   7) Generic GET room by id
   IMPORTANT: This MUST be last so it does not capture /available-floors etc.
   Example: GET /api/rooms/:id
   ============= */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid room id" });

    const room = await Room.findById(id).populate("beds");
    if (!room) return res.status(404).json({ message: "Room not found" });

    res.json(room);
  } catch (error) {
    console.error("GET /:id error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
