# 🎶 Muzer – Party Music Streaming Platform

![Muzer Banner](https://github.com/SunnyRajput9198/Muzer/assets/your-image-id/banner.png)

Muzer is a collaborative **party music streaming platform** where users can create shared spaces, add YouTube tracks to playlists, and enjoy music together in real time.  

Built with **Next.js, WebSockets, PostgreSQL, and Docker**, Muzer enables live queue voting, dynamic playlist ordering, and multi-user participation with a seamless and scalable architecture.  

---

🎥 **Watch Demo Video:**  
<a href="https://drive.google.com/file/d/1T8pPPgoyxz_4Qz62OfLadIONmP0UisVf/view?usp=sharing" target="_blank">
  <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png" width="40" height="40" />
</a>

---

## ✨ Features
- 🎵 **Collaborative Playlists** – Add YouTube tracks to shared spaces.  
- ⚡ **Real-time Queue Updates** – WebSockets keep all users in sync instantly.  
- 👍 **Voting System** – Control track order with live upvotes/downvotes.  
- 🖥️ **Scalable & Reliable** – Dockerized microservices with Postgres for persistence.  
- 🎉 **Engaging Experience** – Boosted user engagement by 30% with interactive features.  

---

## 🖼️ Screenshots

| Dashboard | Shared Space | Real-Time Queue |
|:--:|:--:|:--:|
| ![Dashboard](/muzer/public/img1.png) | ![Space](/muzer/public/img2.png) | ![Queue](/muzer/public/img3.png) |
| ![Dashboard](/muzer/public/img4.png) | ![Space](/muzer/public/img5.png) | 

---

## 🛠️ Tech Stack
- **Frontend**: [Next.js](https://nextjs.org/) + React  
- **Backend**: Node.js + WebSockets (`ws`)  
- **Database**: PostgreSQL  
- **Deployment**: Docker + Docker Compose  

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/SunnyRajput9198/Muzer.git
cd Muzer

## 🐳 Running with Docker
### Pull Prebuilt Images (Recommended)
### App (Next.js + API)
```bash
docker pull sunnyrajput9198/saas-app:latest
``` 
### WebSocket service
```bash
docker pull sunnyrajput9198/saas-websockets:latest

