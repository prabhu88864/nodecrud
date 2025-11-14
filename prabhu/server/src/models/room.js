import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true, unique: true },
    rentAmount: { type: Number, required: true },
    beds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bed" }],
    status: { type: String, default: "Available" } 
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
