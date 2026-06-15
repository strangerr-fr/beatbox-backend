# BeatBox Backend 🎵

YouTube Music streaming backend — BeatBox app ke liye.

## Deploy on Render.com (FREE)

### Step 1 — GitHub pe upload karo
1. GitHub.com pe new repository banao — naam: `beatbox-backend`
2. Ye saari files upload karo (server.js, package.json, render.yaml)

### Step 2 — Render pe deploy karo
1. [render.com](https://render.com) pe jaao — free account banao
2. "New Web Service" click karo
3. Apna GitHub repo connect karo
4. Ye settings lagao:
   - **Build Command:** `npm install && pip3 install yt-dlp`
   - **Start Command:** `npm start`
   - **Region:** Singapore (India ke paas)
5. "Deploy" click karo — 3-5 min mein live ho jaayega

### Step 3 — URL copy karo
Deploy hone ke baad URL milega jaise:
`https://beatbox-backend.onrender.com`

Ye URL BeatBox app mein daalo!

## API Endpoints

- `GET /` — Health check
- `GET /search?q=arijit+singh&limit=20` — Search songs
- `GET /stream?id=VIDEO_ID` — Get audio stream URL
- `GET /trending?lang=hindi` — Get trending songs
- `GET /proxy?url=AUDIO_URL` — Proxy audio for CORS

## Note
Free Render plan pe server 15 min baad sleep ho jaata hai.
Pehli request thodi slow hogi (cold start ~30 sec).
Uske baad fast chalega!
