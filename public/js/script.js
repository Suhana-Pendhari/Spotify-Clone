console.log('Spotify Clone initialized');
let currentSong = new Audio();
let songs = [];
let currFolder;

// Player controls
const play = document.getElementById("play");
const previous = document.getElementById("previous");
const next = document.getElementById("next");

// Utility function to format time
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

// Fetch songs from folder
async function getSongs(folder) {
    try {
        currFolder = folder;
        const response = await fetch(`/songs/${folder}/`);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = doc.getElementsByTagName("a");
        
        songs = Array.from(links)
            .filter(link => link.href.endsWith('.mp3'))
            .map(link => link.href.split(`/${folder}/`)[1]);

        // Update song list UI
        const songList = document.querySelector(".songList ul");
        songList.innerHTML = songs.map(song => `
            <li>
                <img class="invert" width="34" src="/img/music.svg" alt="">
                <div class="info">
                    <div>${decodeURI(song).replaceAll("%20", " ")}</div>
                    <div>Artist</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="/img/play.svg" alt="">
                </div>
            </li>
        `).join('');

        // Add click handlers
        document.querySelectorAll(".songList li").forEach(item => {
            item.addEventListener('click', () => {
                const songName = item.querySelector('.info div').textContent.trim();
                playMusic(songName);
            });
        });

        return songs;
    } catch (error) {
        console.error("Error loading songs:", error);
        return [];
    }
}

// Play/pause functionality
function playMusic(track, pause = false) {
    currentSong.src = `/songs/${currFolder}/${encodeURIComponent(track)}`;
    document.querySelector(".songinfo").textContent = track;
    document.querySelector(".songtime").textContent = "00:00 / 00:00";
    
    if (!pause) {
        currentSong.play()
            .then(() => {
                play.src = "/img/pause.svg";
            })
            .catch(error => {
                console.error("Playback failed:", error);
            });
    }
}

// Display album cards
async function displayAlbums() {
    try {
        const response = await fetch('/songs/');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = doc.getElementsByTagName("a");
        const cardContainer = document.querySelector(".cardContainer");
        
        Array.from(links)
            .filter(link => link.href.includes('/songs/') && !link.href.includes('.htaccess'))
            .forEach(async link => {
                const folder = new URL(link.href).pathname.split('/').filter(Boolean).pop();
                
                try {
                    const infoResponse = await fetch(`/songs/${folder}/info.json`);
                    const info = await infoResponse.json();
                    
                    cardContainer.innerHTML += `
                        <div data-folder="${folder}" class="card">
                            <div class="play">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <img src="/songs/${folder}/cover.jpg" alt="${info.title}">
                            <h2>${info.title}</h2>
                            <p>${info.description}</p>
                        </div>
                    `;
                } catch (error) {
                    console.error(`Error loading album ${folder}:`, error);
                }
            });

        // Add album click handlers
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', async () => {
                const folder = card.dataset.folder;
                songs = await getSongs(folder);
                if (songs.length > 0) playMusic(songs[0]);
            });
        });
    } catch (error) {
        console.error("Error loading albums:", error);
    }
}

// Initialize player
async function main() {
    // Load initial songs
    songs = await getSongs("ncs");
    if (songs.length > 0) playMusic(songs[0], true);
    
    // Load albums
    await displayAlbums();
    
    // Player event listeners
    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play().then(() => {
                play.src = "/img/pause.svg";
            });
        } else {
            currentSong.pause();
            play.src = "/img/play.svg";
        }
    });
    
    previous.addEventListener("click", () => {
        const currentIndex = songs.indexOf(currentSong.src.split('/').pop());
        if (currentIndex > 0) playMusic(songs[currentIndex - 1]);
    });
    
    next.addEventListener("click", () => {
        const currentIndex = songs.indexOf(currentSong.src.split('/').pop());
        if (currentIndex < songs.length - 1) playMusic(songs[currentIndex + 1]);
    });
    
    // Progress bar
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").textContent = 
            `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
        document.querySelector(".circle").style.left = 
            `${(currentSong.currentTime / currentSong.duration) * 100}%`;
    });
    
    document.querySelector(".seekbar").addEventListener("click", e => {
        const percent = e.offsetX / e.target.getBoundingClientRect().width;
        currentSong.currentTime = percent * currentSong.duration;
    });
    
    // Volume control
    const volumeControl = document.querySelector(".range input");
    volumeControl.addEventListener("input", e => {
        currentSong.volume = e.target.value / 100;
        document.querySelector(".volume img").src = 
            currentSong.volume > 0 ? "/img/volume.svg" : "/img/mute.svg";
    });
    
    document.querySelector(".volume img").addEventListener("click", e => {
        if (currentSong.volume > 0) {
            currentSong.volume = 0;
            volumeControl.value = 0;
            e.target.src = "/img/mute.svg";
        } else {
            currentSong.volume = 0.5;
            volumeControl.value = 50;
            e.target.src = "/img/volume.svg";
        }
    });
    
    // UI controls
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });
    
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });
}

// Start when DOM is ready
document.addEventListener("DOMContentLoaded", main);