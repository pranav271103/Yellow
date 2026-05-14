<p align="center">
  <svg width="400" height="100" viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FFF700;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#FFAA00;stop-opacity:1" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <stop offset="0%" style="stop-color:#FFF700;stop-opacity:1" />
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dx="2" dy="2" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.5" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <text x="50%" y="70%" text-anchor="middle" font-family="'Outfit', 'Inter', sans-serif" font-size="80" font-weight="900" fill="url(#yellowGradient)" filter="url(#shadow)">YELLOW</text>
  </svg>
</p>

<p align="center">
  <strong>Yellow is your Personal AI super intelligence. Private, Simple and extremely powerful.</strong>
</p>

<p align="center">
 <img src="https://img.shields.io/badge/status-stable-green" alt="Stable" />
 <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
</p>

<p align="center">
  <img src="./Yellow.png" alt="Yellow Logo" width="1000"/>
</p>

> **Note on Architecture**: Yellow is a custom AI platform built with a proprietary backend architecture. The user interface is based on the Yellow UI framework, while the core intelligence, inference engine, and backend services are developed independently.

---

# What is Yellow?

Yellow is an agentic assistant designed to integrate with you in your daily life. It provides a clean desktop experience and deep integrations into your professional stack.

- **Simple & Unified UI**: A premium desktop experience that takes you from install to a working agent in seconds.
- **Deep Integrations**: Connect your professional accounts (Gmail, Notion, GitHub, Slack, etc.) and have the agent understand your daily workflow.
- **Privacy First**: Everything is processed with a focus on privacy. Your data stays under your control.
- **Advanced Model Routing**: Automatically sends tasks to the most efficient model (NVIDIA NIM, Ollama, etc.) to optimize for speed and cost.

---

# Getting Started

### Installation

For Windows:
1. Clone this repository.
2. Follow the setup instructions for the backend and frontend.

### Running the App

1. **Backend**:
   ```powershell
   python python_core/main.py
   ```
2. **Frontend**:
   ```powershell
   cd app
   pnpm dev:web
   ```

---

# Credits & Technical Foundation

Yellow is built upon several world-class technologies:

- **Backend**: Developed by me, focusing on high-performance inference and robust integration loops.
- **UI Framework**: Based on [OpenHuman](https://github.com/tinyhumansai/openhuman), providing a modern and responsive user experience.
- **Intelligence**: Powered by NVIDIA NIM and local models via Ollama.

---

# Contributing

If you'd like to contribute to Yellow, please feel free to open a PR or an issue.
