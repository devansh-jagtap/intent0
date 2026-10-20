# Product video source

The video on the website (`public/media/intent0.mp4` / `.webm`) is made from a real recording of intent0 on the example site, placed into animated scenes.

1. Run the example site and intent0 next to it (see `examples/city-services/README.md`), without a model key.
2. Record the footage (Chrome DevTools screencast frames + timestamps):
   `node record.mjs ./raw` (needs the `playwright` package and Chromium)
3. Serve this folder and render the scenes frame by frame at 30 fps:
   `python3 -m http.server 8099 --bind 127.0.0.1` then `node render.mjs ./frames all` (`stills` renders a few preview frames)
4. Encode:
   ```bash
   ffmpeg -framerate 30 -i frames/%05d.jpg -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart intent0.mp4
   ffmpeg -framerate 30 -i frames/%05d.jpg -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 intent0.webm
   ffmpeg -i frames/00400.jpg -q:v 3 -vf scale=1600:-1 poster.jpg
   ```

`compose.html` holds the script and timing of every scene. The agent scene shows a real `tools/call` result from the example site.
