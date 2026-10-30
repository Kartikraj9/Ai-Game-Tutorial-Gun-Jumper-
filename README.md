# 🔫 Gun Jumper: Recoil Platformer

> A fast-paced, recoil-driven 2D precision platformer built with **Phaser** and **Vite**.

Made by **[NitrexBoy](https://github.com/NitrexBoy)**, built using **Google Antigravity**.

---

Take control of a daring Goblin Tinkerer armed with an explosive blunderbuss and a scrap-built jetpack. Shoot downward to launch yourself skyward, ride massive kickback across bottomless chasms, and conquer an expansive 64,000-pixel steampunk obstacle course!

---

## ✨ Features

- **Blunderbuss Recoil Propulsion**: Use weapon kickback as your primary aerial mobility tool—aim down to launch yourself over massive gaps and hazards.
- **Limited Air Ammo**: Carefully manage 3 mid-air shots per jump before needing to touch solid ground to reload.
- **Jetpack Thrusters**: Boost through tight platforming sections with real-time fuel burn, dynamic particle effects, and ground recharge.
- **Dynamic Hazards & Traps**: Face rotating sawblades, timed pop-up spike traps, crushing pistons, and springy bounce mushrooms.
- **Massive 64,000px Gauntlet**: Multi-phase procedural and hand-tuned obstacle chunks with progressive difficulty scaling and spaced health pickups.
- **Cinematic Experience**: Complete with an intro video cutscene, dynamic ambient audio and music transitions, screen shake, and custom particle VFX.

---

## 🎮 Controls

| Action | Control |
|---|---|
| **Move Left / Right** | `A` / `D` |
| **Jump** | `W` (Ground only) |
| **Jetpack Thrust** | `SPACE` (Drains fuel) |
| **Aim & Shoot** | `Mouse Aim` + `Left Click` |
| **Pause Game** | `ESC` |

---

## 🛠️ Tech Stack

- **Game Engine:** [Phaser](https://phaser.io/)
- **Bundler & Dev Server:** [Vite](https://vitejs.dev/)
- **Asset Processing:** Node.js + [Sharp](https://sharp.pixelplumbing.com/) (custom spritesheet packing & asset pipelines)
- **Language:** ES6+ Vanilla JavaScript

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/NitrexBoy/<repo-name>.git
   cd <repo-name>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## 📜 Custom Scripts

- `npm run dev`: Starts the local Vite dev server.
- `npm run build`: Compiles production bundle to `dist/`.
- `npm run pack-sheets`: Runs the custom Sharp script to generate uniform 512x600 sprite sheets from raw animation frames.
- `npm run convert-sprites`: Utility script to process and format sprite assets.

---

## 👤 Author & Credits

- **Creator:** [NitrexBoy](https://github.com/NitrexBoy)
- **Developed with:** [Google Antigravity](https://antigravity.google)
