import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';


const router = Router();


// Example protected route: current profile
router.get('/current_user', auth, async (req, res) => {
const user = await User.findById(req.user.id).select('name email');
if (!user) return res.status(404).json({ error: 'Not found' });
res.json({ user });
});


export default router;