import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Video raw binary upload route (supports up to 150MB video files)
  app.post('/api/upload-video', express.raw({ type: '*/*', limit: '150mb' }), (req, res) => {
    try {
      const videoBuffer = req.body;
      if (!videoBuffer || !Buffer.isBuffer(videoBuffer) || videoBuffer.length === 0) {
        return res.status(400).json({ error: 'No video binary payload provided' });
      }

      const publicDir = path.resolve(process.cwd(), 'public/portfolio');
      const distDir = path.resolve(process.cwd(), 'dist/portfolio');

      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      const targetPublic = path.join(publicDir, 'client_video.mp4');
      fs.writeFileSync(targetPublic, videoBuffer);

      const targetDist = path.join(distDir, 'client_video.mp4');
      fs.writeFileSync(targetDist, videoBuffer);

      console.log(`[Upload API] Saved client_video.mp4 successfully (${videoBuffer.length} bytes)`);
      return res.json({
        success: true,
        message: 'Video updated successfully on server',
        bytes: videoBuffer.length,
        url: '/portfolio/client_video.mp4'
      });
    } catch (err: any) {
      console.error('[Upload API] Error saving video:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  // Healthcheck endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // In production, serve dist folder if build exists
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(process.cwd(), 'dist');

  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Vite middleware for development
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
