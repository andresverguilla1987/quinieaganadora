Quiniela-AI Render-ready package
--------------------------------
This package is prepared to deploy to Render (or similar) as a single service that serves both frontend static files and backend demo endpoints.

How it works:
- The server serves static files from /static (frontend/dist). 
- The root "/" returns index.html with a small script injected that sets window.API_BASE to the API_BASE environment variable (set this in Render).
- Set the environment variable API_BASE in Render to the public URL of your backend API if you want the frontend to proxy to another backend; by default it's the same server.

Render deployment steps:
1. Create a new Web Service in Render (from Git or by uploading this repo). 
2. Build Command: (leave empty)
3. Start Command: use the Procfile or set: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Set environment variables in Render dashboard:
   - API_BASE = https://your-backend-url (if you want the frontend to call a different backend) 
5. Deploy.