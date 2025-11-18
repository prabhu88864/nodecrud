import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  dateOfBirth: Date,
  address: String,

  occupation: String,
  emergencyContact: String,

  idProofType: { type: String},
 
  idProofImage: String, 
  userImage: String,

  roomNumber: String,
  rentAmount: Number,
  bedNumber: String,
  exitDate: { type: Date },
  joinedDate: { type: Date },

  isActive: { type: Boolean, default: true },
  allocatedRoom: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  allocatedBed: { type: mongoose.Schema.Types.ObjectId, ref: "Bed" },
  createdAt: { type: Date, default: Date.now }
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;
