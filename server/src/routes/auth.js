import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';


const router = Router();


function sign(user) {
return jwt.sign(
{ id: user._id, email: user.email },
process.env.JWT_SECRET,
{ expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
);
}


router.post('/register', async (req, res) => {
try {
    console.log(req.body)
const { name, email, password } = req.body;
if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });


const existing = await User.findOne({ email });
if (existing) return res.status(409).json({ error: 'Email already in use' });


const passwordHash = await bcrypt.hash(password, 12);
const user = await User.create({ name, email, passwordHash });


const token = sign(user);
return res.status(201).json({
user: { id: user._id, name: user.name, email: user.email },
token
});
} catch (e) {
console.error(e);
res.status(500).json({ error: 'Server error' });
}
});


router.post('/login', async (req, res) => {
try {
const { email, password } = req.body;
const user = await User.findOne({ email });
if (!user) return res.status(401).json({ error: 'Invalid credentials' });


const ok = await bcrypt.compare(password, user.passwordHash);
if (!ok) return res.status(401).json({ error: 'Invalid credentials' });


const token = sign(user);
return res.json({
user: { id: user._id, name: user.name, email: user.email },
token
});
} catch (e) {
console.error(e);
res.status(500).json({ error: 'Server error' });
}
});


export default router;