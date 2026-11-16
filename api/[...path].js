export default function apiUnavailable(_request, response) {
  response.statusCode = 503;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({
    error: 'The Vivacity API is not hosted on this Vercel deployment. Configure VITE_API_BASE_URL to use a deployed backend.'
  }));
}
