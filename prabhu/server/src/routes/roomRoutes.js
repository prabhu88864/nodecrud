import express from "express";
import Room from "../models/room.js";
import Bed from "../models/bed.js";

const router = express.Router();

/* ============================
   CREATE ROOM WITH BEDS
   ============================ */
router.post("/", async (req, res) => {
  try {
    const { roomNumber, rentAmount, beds, floor,block  } = req.body; // beds = ["A1","A2","A3"]

    const room = await Room.create({ roomNumber, rentAmount, floor,block  });

    // create bed entries
    const createdBeds = await Promise.all(
      beds.map((b) => Bed.create({ bedNumber: b, room: room._id }))
    );

    // link beds to room
    room.beds = createdBeds.map((b) => b._id);
    await room.save();

    res.json({ message: "Room created successfully", room, beds: createdBeds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ============================
   VIEW ALL ROOMS
   ============================ */
router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find().populate("beds");
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ============================
   VIEW ONE ROOM
   ============================ */
router.get("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate("beds");
    if (!room) return res.status(404).json({ message: "Room not found" });

    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ============================
   UPDATE ROOM (roomNumber, rentAmount)
   AND UPDATE BEDS if given
   ============================ */
// router.put("/:id", async (req, res) => {
//   try {
//     const { roomNumber, rentAmount, beds, floor, block } = req.body;

//     const room = await Room.findById(req.params.id);
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     if (roomNumber) room.roomNumber = roomNumber;
//     if (rentAmount) room.rentAmount = rentAmount;
//     if (floor) room.floor = floor;
//     if (block) room.block = block;

//     // beds update → ADD NEW BEDS ONLY, do NOT delete anything
//     if (beds && beds.length > 0) {
//       const existingBeds = await Bed.find({ room: room._id });

//       const existingNumbers = existingBeds.map(b => b.bedNumber);
//       const newBedNumbers = beds.filter(b => !existingNumbers.includes(b));

//       const newBeds = await Promise.all(
//         newBedNumbers.map(b =>
//           Bed.create({ bedNumber: b, room: room._id })
//         )
//       );

//       room.beds = [...room.beds, ...newBeds.map(b => b._id)];
//     }

//     await room.save();

//     res.json({ message: "Room updated", room });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

router.put("/:id", async (req, res) => {
  try {
    const { roomNumber, rentAmount, beds, floor, block } = req.body;

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (roomNumber) room.roomNumber = roomNumber;
    if (rentAmount) room.rentAmount = rentAmount;
    if (floor) room.floor = floor;
    if (block) room.block = block;

    if (Array.isArray(beds)) {
      // GET all existing beds for the room
      const existingBeds = await Bed.find({ room: room._id });

      const existingNumbers = existingBeds.map(b => b.bedNumber);
      const incomingNumbers = beds;

      // 1️⃣ Add new beds
      const toAdd = incomingNumbers.filter(n => !existingNumbers.includes(n));
      const newBeds = await Promise.all(
        toAdd.map(n => Bed.create({ bedNumber: n, room: room._id }))
      );

      // 2️⃣ Remove deleted beds
      const toRemove = existingNumbers.filter(n => !incomingNumbers.includes(n));

      if (toRemove.length > 0) {
        const bedsToRemove = await Bed.find({
          room: room._id,
          bedNumber: { $in: toRemove }
        });

        const removeIds = bedsToRemove.map(b => b._id);

        // delete bed docs
        await Bed.deleteMany({ _id: { $in: removeIds } });

        // remove from room.beds array
        room.beds = room.beds.filter(id => !removeIds.includes(id));
      }

      // Add newly created bed IDs
      room.beds = room.beds.concat(newBeds.map(b => b._id));
    }

    await room.save();

    res.json({ message: "Room updated", room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/* ============================
   DELETE ROOM + BEDS
   ============================ */
router.delete("/delete/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    // delete beds under this room
    await Bed.deleteMany({ room: room._id });

    // delete room
    await room.deleteOne();

    res.json({ message: "Room deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
