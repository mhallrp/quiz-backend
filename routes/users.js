const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

module.exports = (connection) => {

    router.post("/register", async (req, res) => {
        const { username, password } = req.body.user;
        if (!username || !password) {
            return res.status(400).json({ message: "Incomplete data" });
        }
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ message: "Username must be between 3 and 20 characters" });
        }
        if (!username.match(/^[a-zA-Z0-9]+$/)) {
            return res.status(400).json({ message: "Username must be alphanumeric" });
        }
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            connection.query('SELECT username FROM users WHERE username = ?', [username], (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Database error" });
                } else if (result.length > 0) {
                    return res.status(403).json({ message: "User already exists" });
                } else {
                    connection.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (insertErr) => {
                        if (insertErr) {
                            return res.status(500).json({ message: "Database error on user creation" });
                        }
                        return res.status(200).json({ message: "User added successfully" });
                    });
                }
            });
        } catch (hashErr) {
            return res.status(500).json({ message: "Error hashing password" });
        }
    });

    router.post("/login", async (req, res) => {
        const { username, password } = req.body.user;
        if (!username || !password) {
            return res.status(400).json({ message: "Incomplete data" });
        }
        connection.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
            if (err) return res.status(500).json({ message: "Database error" });
            if (results.length === 0) return res.status(401).json({ message: "Invalid credentials" });
            const user = results[0];
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) return res.status(401).json({ message: "Invalid credentials" });
            let accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            req.session.authorization = { accessToken };
            return res.status(200).json({ message: true, accessToken });
        });
    });
    

    router.get('/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ message: 'Error logging out' });
            }
            res.clearCookie('connect.sid');
            res.status(200).json({ message: 'Logout successful' });
        });
    });

    return router
}