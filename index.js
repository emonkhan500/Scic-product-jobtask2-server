const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hzfjxhp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoDB client
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Connect to MongoDB and set up routes
async function run() {
    try {
        // Connect to the MongoDB cluster
        await client.connect();
        console.log("Successfully connected to MongoDB!");

        // Get the collection
        const productsCollection = client.db("productsDB").collection('products');

        // Get products with pagination, sorting, and filtering
        app.get('/product', async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;
                const searchQuery = req.query.search || '';
                const sortBy = req.query.sort || 'price_asc'; // Default sorting
                const brandFilter = req.query.brand || '';
                const categoryFilter = req.query.category || '';
                const priceFilter = req.query.price || '';

                const searchRegex = new RegExp(searchQuery, 'i'); // Case-insensitive search

                // Determine sort order
                let sortOptions = {};
                if (sortBy === 'price_asc') {
                    sortOptions = { price_range: 1 }; // Sort by price ascending
                } else if (sortBy === 'price_desc') {
                    sortOptions = { price_range: -1 }; // Sort by price descending
                } else if (sortBy === 'date_asc') {
                    sortOptions = { date: 1 }; // Sort by date ascending
                } else if (sortBy === 'date_desc') {
                    sortOptions = { date: -1 }; // Sort by date descending
                } else {
                    return res.status(400).send({ error: "Invalid sort option" });
                }

                console.log(`Fetching products with sort: ${JSON.stringify(sortOptions)}`);

                // Build filter criteria
                let filterCriteria = { title: searchRegex };
                if (brandFilter) {
                    filterCriteria.brand_name = brandFilter;
                }
                if (categoryFilter) {
                    filterCriteria.category_name = categoryFilter;
                }
                if (priceFilter) {
                    const [minPrice, maxPrice] = priceFilter.split('-').map(Number);
                    filterCriteria.price_range = {
                        $gte: minPrice,
                        $lte: maxPrice
                    };
                }

                // Fetch products with sorting, pagination, and filtering
                const cursor = productsCollection.find(filterCriteria).sort(sortOptions).skip(skip).limit(limit);
                const result = await cursor.toArray();

                // Get total count of matching products
                const totalProducts = await productsCollection.countDocuments(filterCriteria);
                const totalPages = Math.ceil(totalProducts / limit);

                res.send({
                    totalProducts,
                    totalPages,
                    currentPage: page,
                    products: result
                });
            } catch (error) {
                res.status(500).send({ error: "Error fetching products" });
                console.error("Error fetching products:", error);
            }
        });

        // Test the connection
        await client.db("admin").command({ ping: 1 });
    } finally {
        // Ensure the client closes when you finish/error
        // Uncomment the following line if you want the client to close on server stop
        // await client.close();
    }
}

run().catch(console.dir);

// Basic route
app.get('/', (req, res) => {
    res.send('Assignment server is running');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
