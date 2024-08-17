const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hzfjxhp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const productsCollection = client.db("productsDB").collection('products');

        // Get products with pagination and search
        app.get('/product', async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const searchQuery = req.query.search || '';

            const searchRegex = new RegExp(searchQuery, 'i'); // Case-insensitive search

            const cursor = productsCollection.find({ title: searchRegex }).skip(skip).limit(limit);
            const result = await cursor.toArray();

            const totalProducts = await productsCollection.countDocuments({ title: searchRegex });
            const totalPages = Math.ceil(totalProducts / limit);

            res.send({
                totalProducts,
                totalPages,
                currentPage: page,
                products: result
            });
        });

        await client.db("admin").command({ ping: 1 });
        console.log("Successfully connected to MongoDB!");
    } finally {
        // Ensure the client closes when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Assignment server is running');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
