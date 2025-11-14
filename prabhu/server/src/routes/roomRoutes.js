import express from "express";
import Room from "../models/room.js";
import Bed from "../models/bed.js";

const router = express.Router();

/* ============================
   CREATE ROOM WITH BEDS
   ============================ */
router.post("/", async (req, res) => {
  try {
    const { roomNumber, rentAmount, beds } = req.body; // beds = ["A1","A2","A3"]

    const room = await Room.create({ roomNumber, rentAmount });

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
router.put("/edit/:id", async (req, res) => {
  try {
    const { roomNumber, rentAmount, beds } = req.body;

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    // update room fields
    if (roomNumber) room.roomNumber = roomNumber;
    if (rentAmount) room.rentAmount = rentAmount;

    // update beds (optional)
    if (beds && beds.length > 0) {
      // delete old beds
      await Bed.deleteMany({ room: room._id });

      // create new beds
      const newBeds = await Promise.all(
        beds.map((b) => Bed.create({ bedNumber: b, room: room._id }))
      );

      room.beds = newBeds.map((b) => b._id);
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
