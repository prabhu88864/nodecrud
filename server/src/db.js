import mongoose from 'mongoose';


export async function connectDB() {
const uri = process.env.MONGO_URI;
if (!uri) throw new Error('MONGO_URI not set');
await mongoose.connect(uri, { dbName: uri.split('/').pop() });
console.log('MongoDB connected');
}