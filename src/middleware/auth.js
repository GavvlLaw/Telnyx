/**
 * Simple API key authentication middleware
 * In a production environment, you should use a more robust authentication system
 */
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // Skip authentication for webhook endpoints
  if (req.path.includes('/webhook')) {
    return next();
  }
  
  // Check if API key is provided and matches
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  
  next();
};

module.exports = apiKeyAuth;

 