import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true, unique: true },
    rentAmount: { type: Number, required: true },
    beds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bed" }],
    status: { type: String, default: "Available" } ,
    floor: { type: String, required: true, unique: true } 
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
