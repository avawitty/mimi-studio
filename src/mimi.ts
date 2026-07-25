import express, { Router } from "express";

export const mimiRouter: Router = express.Router();

// Health check endpoint
mimiRouter.get("/", (req, res) => {
  res.json({ message: "Mimi API", status: "ready" });
});

// Example: POST route to create a brief
mimiRouter.post("/brief", (req, res) => {
  const { title, sourceMaterial } = req.body;
  
  if (!title || !sourceMaterial) {
    return res.status(400).json({ 
      error: "Missing required fields: title, sourceMaterial" 
    });
  }
  
  // TODO: Add brief creation logic
  res.json({ 
    status: "created",
    brief: {
      id: `brief-${Date.now()}`,
      title,
      sourceMaterial
    }
  });
});

// Example: GET route to retrieve a brief
mimiRouter.get("/brief/:id", (req, res) => {
  const { id } = req.params;
  
  // TODO: Add brief retrieval logic
  res.json({ 
    status: "retrieved",
    brief: {
      id,
      title: "Example brief",
      sourceMaterial: "Example material"
    }
  });
});
