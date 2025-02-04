export default function Health(req, res) {
  // Check if we can reach the API
  fetch(`${process.env.API_URL}/health`)
    .then(response => response.json())
    .then(data => {
      if (data.status === 'healthy') {
        res.status(200).json({ status: 'healthy' });
      } else {
        res.status(503).json({ status: 'unhealthy', reason: 'API not healthy' });
      }
    })
    .catch(error => {
      res.status(503).json({ status: 'unhealthy', reason: 'Cannot reach API' });
    });
} 