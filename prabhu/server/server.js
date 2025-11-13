import 'dotenv/config.js';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { connectDB } from './src/db.js';
import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/user.js';
import path from 'path';
import { fileURLToPath } from 'url';
import UserProfile from './src/models/userProfile.js';
import userProfileRoutes from './src/routes/userProfileRoutes.js'; // ✅ correct path


const app = express();
const PORT = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



app.use(morgan('dev'));
app.use(express.json());
app.use(cors({
origin: 'http://localhost:3001',
credentials: true
}));
app.use('/uploads', express.static('uploads')); 


app.get('/', (_req, res) => {
res.json({ status: 'ok', message: 'API running' });
});


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/userprofile',userProfileRoutes)


await connectDB();
const buildPath = path.join(__dirname, '../client/build');
app.use(express.static(buildPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));