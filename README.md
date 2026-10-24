# Aritat ซอยนรก

เกม FPS ยิงแมวปีศาจในซอยกรุงเทพฯ ตอนกลางคืน เล่นคนเดียว หรือ Co-op 2 คนบนเว็บ

**เล่นเลย:** https://warut131.github.io/aritat-doom/

- เมาส์เล็ง · คลิกซ้ายยิง · คลิกขวาเล็ง/ซูม · WASD เดิน · Space กระโดด · Shift แดช · F ฟาด/กลอรี่คิล · C โยนเหรียญ · 1–6 เปลี่ยนปืน
- Co-op: กด "เล่นด้วยกัน" → สร้างห้อง → คัดลอกลิงก์ชวน ส่งให้เพื่อน

## โครงสร้าง
- `index.html` หน้าเกม + HUD · `game.js` โค้ดที่ build แล้ว
- `src/` โค้ดต้นฉบับ (Three.js) — `main.js` เกมเพลย์, `world.js` ฉาก, `cat.js` แมว, `guns.js` ปืน, `post.js` โพสต์โปรเซสซิ่ง
- `assets/` เท็กซ์เจอร์ โมเดลแมว ฟอนต์ · `tools/` สคริปต์ Python ที่สร้างเท็กซ์เจอร์และโมเดลแมว

Build: `npm i three postprocessing n8ao peerjs esbuild && npm run build`
