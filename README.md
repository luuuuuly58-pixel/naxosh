# نەخۆش — Naxoş (Online Doctor Service Demo)

A clickable demo of an online doctor / telemedicine service for a **Kurdish Sorani** audience, inspired by Doctor on Demand. Fully right-to-left, no build tools, no server required.

> ⚠️ This is a **demo/prototype** — it does not provide real medical care, real video, or real payments. Bookings and chat are saved only in your own browser (localStorage).

## چۆن بیکەیتەوە / How to run

**Easiest:** double-click `index.html` — it opens in your browser. That's it.

**Nicer (optional):** if you have Python installed, run a tiny local server from this folder so links behave perfectly:
```
python -m http.server 8000
```
then open `http://localhost:8000` in your browser.

## پەیجەکان / Pages

| File | What it is |
|------|-----------|
| `index.html` | سەرەتا — Home / landing |
| `specialties.html` | خزمەتگوزارییەکان — what works online + what doesn't (safety) |
| `doctors.html` | پزیشکەکان — find a doctor, filter by specialty |
| `doctor.html` | پڕۆفایل + تۆمارکردن — profile + booking |
| `chat.html` | گفتوگۆ — simulated text consultation |
| `appointments.html` | چاوپێکەوتنەکانم — your saved bookings |

## دەستکاریکردن / How to customize (no coding needed for most)

- **Doctors, specialties, prices, time slots:** edit `assets/js/data.js`
- **All interface text (menus, buttons):** edit `assets/js/i18n.js`
- **Colors & look:** edit the `:root` color variables at the top of `assets/css/styles.css`

## بڵاوکردنەوە / Publishing it online (free)

Drag this whole folder onto **Netlify Drop** (app.netlify.com/drop), or push to **GitHub** and enable GitHub Pages. No server needed — it's a static site.

## دواتر / What a real product would add later

Real video calls, online payments, doctor & patient logins, secure medical records, and health-data compliance. Those belong to a future build, not this demo.
