import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  dateOfBirth: Date,
  address: String,

  occupation: String,
  emergencyContact: String,

  idProofType: { type: String },
  idProofImage: String,
  userImage: String,

  floor: { type: String },
  block: { type: String },           // 👈 ADD THIS
  
  roomNumber: String,
  rentAmount: Number,
  bedNumber: String,

  exitDate: { type: Date },
  joinedDate: { type: Date },

  damageCharges: { type: Number, default: 0 },
  advanceAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },

  allocatedRoom: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  allocatedBed: { type: mongoose.Schema.Types.ObjectId, ref: "Bed" },

  allocatedFloor: { type: String },
  allocatedBlock: { type: String },   // 👈 OPTIONAL (if you want)

  createdAt: { type: Date, default: Date.now }
});


const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;
