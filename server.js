import express from 'express';
import controllerRouting from './routes/index';

const app = express();
const port = process.env.PORT || 5000;

// Middleware to parse JSON requests
app.use(express.json());

// Routing
controllerRouting(app);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
