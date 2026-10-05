const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.json({ message: 'Dummy Service is Running!' });
});

app.get('/users', (req, res) => {
    res.json({
        users: ['Saurabh', 'Rohit'],
        protectedBy: 'Rate Limiter Gateway'
    });
});

app.listen(3001, () => {
    console.log('Dummy service running on 3001');
});