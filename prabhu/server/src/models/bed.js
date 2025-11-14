import mongoose from "mongoose";

const bedSchema = new mongoose.Schema(
  {
    bedNumber: { type: String, required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    isOccupied: { type: Boolean, default: false },
    occupant: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export default mongoose.model("Bed", bedSchema);
