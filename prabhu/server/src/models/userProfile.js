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

  // floor value saved when allocating user
  floor: { type: String },

  roomNumber: String,
  rentAmount: Number,
  bedNumber: String,

  exitDate: { type: Date },
  joinedDate: { type: Date },

  damageCharges: { type: Number, default: 0 },
  advanceAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 }, 

  isActive: { type: Boolean, default: true },

  // these are correct
  allocatedRoom: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  allocatedBed: { type: mongoose.Schema.Types.ObjectId, ref: "Bed" },

  // ➕ ADD THIS
  allocatedFloor: { type: String },

  createdAt: { type: Date, default: Date.now }
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;
