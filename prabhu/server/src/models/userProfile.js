import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  dateOfBirth: Date,
  address: String,

  occupation: String,
  emergencyContact: String,

  idProofType: { type: String, enum: ['Aadhar', 'PAN', 'Passport', 'DrivingLicense', 'Other'] },
 
  idProofImage: String, 

  roomNumber: String,
  rentAmount: Number,
  bedNumber: String,
  exitDate: { type: Date },
  joinedDate: { type: Date, default: Date.now },

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;
