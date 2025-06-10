# 🚀 Deployment Guide

## Quick Deploy to Netlify

### Method 1: GitHub Integration (Recommended)
1. Push your code to GitHub (already done!)
2. Go to [Netlify](https://netlify.com) and sign up/login
3. Click "New site from Git"
4. Choose GitHub and select this repository
5. Netlify will auto-detect the `netlify.toml` config
6. Click "Deploy site"
7. Done! ✨

### Method 2: Manual Deploy
```bash
# Build the frontend
cd frontend
npm install
npm run build

# Deploy to Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=build
```

## Deploy to Vercel

### Method 1: GitHub Integration
1. Go to [Vercel](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import from GitHub
4. Set root directory to `frontend`
5. Deploy!

### Method 2: CLI Deploy
```bash
cd frontend
npm install -g vercel
vercel --prod
```

## Environment Variables

For production deployment, set these environment variables:

```
REACT_APP_API_URL=https://your-backend-url.com
REACT_APP_WS_URL=wss://your-backend-url.com
```

## Troubleshooting

**Build fails?**
- Check that `frontend/package.json` exists
- Ensure Node.js version is 18+
- Verify all dependencies are installed

**404 on routes?**
- Netlify: `netlify.toml` handles redirects
- Vercel: `vercel.json` handles redirects
- Both files are configured correctly

**Still having issues?**
- Check the build logs
- Ensure you're deploying from the `frontend` directory
- Verify the build command is `npm run build` 