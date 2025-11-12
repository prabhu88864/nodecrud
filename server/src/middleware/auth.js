import jwt from 'jsonwebtoken';


export function auth(req, res, next) {
const header = req.headers.authorization || '';
const token = header.startsWith('Bearer ') ? header.slice(7) : null;
if (!token) return res.status(401).json({ error: 'Missing token' });
try {
const payload = jwt.verify(token, process.env.JWT_SECRET);
req.user = payload; // { id, email }
next();
} catch (err) {
return res.status(401).json({ error: 'Invalid or expired token' });
}
}