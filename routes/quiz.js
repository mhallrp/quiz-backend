const express = require('express');
const router = express.Router();
const axios = require('axios');
const maxRetries = 3;
const retryDelay = 3000;

async function fetchTrivia(categoryId, attempt = 1) {
    try {
        const response = await axios.get(`https://opentdb.com/api.php?amount=10&category=${categoryId}`);
        return response;
    } catch (error) {
        if (attempt < maxRetries) {
            console.log(`Attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return fetchTrivia(categoryId, attempt + 1);
        } else {
            throw error;
        }
    }
}

router.get('/trivia', async (req, res) => {
    const categoryId = req.query.category;
    try {
        const response = await fetchTrivia(categoryId);
        res.json(response.data.results);
    } catch (error) {
        console.error(`All attempts failed: ${error.message}`);
        res.status(500).send("Failed to fetch trivia questions");
    }
});

router.get('/categories', async (req, res) => {
    try {
        const response = await axios.get("https://opentdb.com/api_category.php");
        res.json(response.data.trivia_categories);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

module.exports=router;