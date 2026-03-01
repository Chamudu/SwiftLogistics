/**
 * Mock ROS (Route Optimization System)
 * 
 * This is a mock REST API that simulates a cloud-based route optimization service.
 */

import express from 'express';
import cors from 'cors';

// Create Express app
const app = express();
const PORT = 4002;

// Middleware
app.use(cors());  // Enable CORS (Cross-Origin Resource Sharing)
app.use(express.json());  // Parse JSON request bodies

// In-memory storage for routes (in real system, this would be a database)
const routes = new Map();
let routeIdCounter = 1000;

/**
// ============================================
// ENDPOINT 1: Health Check
// ============================================
/**
 * GET /health
 * 
 * Simple endpoint to check if the service is running.
 * Returns: { status: "ok", service: "Mock ROS" }
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Mock ROS (Route Optimization System)',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ENDPOINT 2: Optimize Route (Main Function)
// ============================================
/**
 * POST /api/routes/optimize
 * 
 * This is the main endpoint that creates an optimized delivery route.
 * 
 * Request Body:
 * {
 *   "packageId": "PKG-123",
 *   "address": "123 Main St, Colombo",
 *   "priority": "normal" | "high" | "urgent",
 *   "deliveryWindow": "2024-02-10T14:00:00Z"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "routeId": "ROUTE-1001",
 *   "estimatedDeliveryTime": "2024-02-10T15:30:00Z",
 *   "driverId": "DRV-42",
 *   "distance": 12.5,
 *   "sequence": 3
 * }
 */
app.post('/api/routes/optimize', (req, res) => {
  try {
    const { packageId, address, priority = 'normal', deliveryWindow } = req.body;
    
    // Validation
    if (!packageId || !address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: packageId and address'
      });
    }
    
    // Simulate route optimization (in real system, this would use complex algorithms)
    const routeId = `ROUTE-${routeIdCounter++}`;
    const driverId = `DRV-${Math.floor(Math.random() * 100) + 1}`;
    const distance = (Math.random() * 20 + 5).toFixed(2); // Random distance 5-25 km
    const sequence = Math.floor(Math.random() * 10) + 1; // Position in route
    
    // Calculate estimated delivery time (add random 30-120 minutes)
    const estimatedMinutes = Math.floor(Math.random() * 90) + 30;
    const estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60000).toISOString();
    
    // Create route object
    const route = {
      routeId,
      packageId,
      address,
      priority,
      deliveryWindow,
      estimatedDeliveryTime,
      driverId,
      distance: parseFloat(distance),
      sequence,
      status: 'planned',
      createdAt: new Date().toISOString()
    };
    
    // Store in memory
    routes.set(routeId, route);
    
    console.log(`✅ Route optimized: ${routeId} for package ${packageId}`);
    console.log(`   📍 Address: ${address}`);
    console.log(`   🚗 Driver: ${driverId}`);
    console.log(`   📏 Distance: ${distance} km`);
    console.log(`   ⏰ ETA: ${estimatedDeliveryTime}`);
    
    // Send response
    res.status(201).json({
      success: true,
      routeId,
      estimatedDeliveryTime,
      driverId,
      distance: parseFloat(distance),
      sequence
    });
    
  } catch (error) {
    console.error('❌ Error optimizing route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================
// ENDPOINT 3: Get Route Details
// ============================================
/**
 * GET /api/routes/:routeId
 * 
 * Get details of a specific route.
 */
app.get('/api/routes/:routeId', (req, res) => {
  const { routeId } = req.params;
  
  const route = routes.get(routeId);
  
  if (!route) {
    return res.status(404).json({
      success: false,
      error: `Route ${routeId} not found`
    });
  }
  
  res.json({
    success: true,
    route
  });
});

// ============================================
// ENDPOINT 4: Update Route (e.g., add priority delivery)
// ============================================
/**
 * PUT /api/routes/:routeId
 * 
 * Update an existing route (e.g., change priority, add urgent delivery).
 */
app.put('/api/routes/:routeId', (req, res) => {
  const { routeId } = req.params;
  const updates = req.body;
  
  const route = routes.get(routeId);
  
  if (!route) {
    return res.status(404).json({
      success: false,
      error: `Route ${routeId} not found`
    });
  }
  
  // Merge updates
  const updatedRoute = {
    ...route,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  routes.set(routeId, updatedRoute);
  
  console.log(`🔄 Route updated: ${routeId}`);
  
  res.json({
    success: true,
    route: updatedRoute
  });
});

// ============================================
// ENDPOINT 5: Get All Routes
// ============================================
/**
 * GET /api/routes
 * 
 * Get all routes (useful for testing and debugging).
 */
app.get('/api/routes', (req, res) => {
  const allRoutes = Array.from(routes.values());
  
  res.json({
    success: true,
    count: allRoutes.length,
    routes: allRoutes
  });
});

// ============================================
// ENDPOINT 6: Get Driver's Routes
// ============================================
/**
 * GET /api/drivers/:driverId/routes
 * 
 * Get all routes assigned to a specific driver.
 */
app.get('/api/drivers/:driverId/routes', (req, res) => {
  const { driverId } = req.params;
  
  const driverRoutes = Array.from(routes.values())
    .filter(route => route.driverId === driverId)
    .sort((a, b) => a.sequence - b.sequence); // Sort by sequence
  
  res.json({
    success: true,
    driverId,
    count: driverRoutes.length,
    routes: driverRoutes
  });
});

// ============================================
// Start the Server
// ============================================
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🚀 Mock ROS (Route Optimization System)     ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║   🌐 Server running on: http://localhost:${PORT}  ║`);
  console.log('║   📡 Protocol: REST (HTTP/JSON)                ║');
  console.log('║   ✅ Status: Ready to accept requests          ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log('📝 Available Endpoints:');
  console.log(`   GET    http://localhost:${PORT}/health`);
  console.log(`   POST   http://localhost:${PORT}/api/routes/optimize`);
  console.log(`   GET    http://localhost:${PORT}/api/routes/:routeId`);
  console.log(`   PUT    http://localhost:${PORT}/api/routes/:routeId`);
  console.log(`   GET    http://localhost:${PORT}/api/routes`);
  console.log(`   GET    http://localhost:${PORT}/api/drivers/:driverId/routes`);
  console.log('');
  console.log('💡 Test with: curl http://localhost:4002/health');
  console.log('');
});
