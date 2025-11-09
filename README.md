# 🎶 Muzer – Party Music Streaming Platform  

![Muzer Banner]<br>
<img src="/muzer/public/banner.jpg" alt="Muzer Banner" width="50" height="50"/>

> 🎧 **Collaborative music streaming for remote parties — enjoy and vote together in real time!**

Muzer is a collaborative **party music streaming platform** where users create shared spaces, add YouTube tracks, and enjoy synchronized playback with friends.  
Built with **Next.js, WebSockets, PostgreSQL, and Docker**, it provides a seamless, scalable real-time experience with queue voting and multi-user participation.

---

## 💡 Why I Built Muzer
Online hangouts often feel disconnected — everyone plays music separately.  
**Muzer** was created to **recreate the shared vibe of house parties online**, letting friends anywhere listen, vote, and control the playlist together.

---

## ✨ Features
- 🎵 **Collaborative Playlists** – Add YouTube tracks to shared spaces.  
- ⚡ **Real-Time Queue Updates** – WebSockets keep all users perfectly in sync.  
- 👍 **Voting System** – Upvote or downvote songs to decide what plays next.  
- 🖥️ **Scalable & Reliable** – Dockerized microservices with PostgreSQL persistence.  
- 🎉 **Engaging Experience** – 30 % boost in engagement through interactive features.  

---

## 🧠 Tech Stack  

![Next.js](https://img.shields.io/badge/Frontend-Next.js-blue?style=for-the-badge&logo=nextdotjs)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Infra-Docker-2496ED?style=for-the-badge&logo=docker)
![WebSocket](https://img.shields.io/badge/Realtime-WebSocket-purple?style=for-the-badge&logo=socketdotio)
![YouTube](https://img.shields.io/badge/Media-YouTube-red?style=for-the-badge&logo=youtube)

**Frontend:** Next.js + React  
**Backend:** Node.js + WebSockets (`ws`)  
**Database:** PostgreSQL  
**Deployment:** Docker + Docker Compose  

---

## 🎥 Demo Video  
> ▶️ **Watch the full walkthrough:**  
[![Watch the demo](https://img.icons8.com/clouds/200/google-drive--v1.png)](https://drive.google.com/file/d/1T8pPPgoyxz_4Qz62OfLadIONmP0UisVf/view?usp=sharing)

---

## 🖼️ Screenshots  

| Dashboard | Shared Space | Real-Time Queue |
|:--:|:--:|:--:|
| ![Dashboard](/muzer/public/img1.png) | ![Space](/muzer/public/img2.png) | ![Queue](/muzer/public/img3.png) |
| ![Dashboard](/muzer/public/img4.png) | ![Space](/muzer/public/img5.png) 

---

## 🚀 Getting Started  

### 1️⃣ Clone the Repository  
```bash
git clone https://github.com/SunnyRajput9198/Muzer.git
cd Muzer
```
## 🐳 Running with Docker
### Pull Prebuilt Images (Recommended)
### App (Next.js + API)
```bash
docker pull sunnyrajput9198/saas-app:latest
``` 
### WebSocket service
```bash
docker pull sunnyrajput9198/saas-websockets:latest

