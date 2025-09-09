let themesData = {};
let currentTheme = null;
let currentPlaylist = [];
let lastPlayedIndex = -1;
let audioElement = null;
let isPlaying = false;
let previousVolume = 0.7;
let playStartTime = null;
let currentTitle = null;

const themeEmojis = {
    'Piraten': '🏴‍☠️',
    'Drachen': '🐉',
    'Einhörner': '🦄',
    'Weltraum': '🚀',
    'Ritter': '⚔️',
    'Hexen': '🧙‍♀️',
    'Detektive': '🔍',
    'Grusel': '👻',
    'Dinosaurier': '🦕',
    'Elfen': '🧚',
    'Monster': '👾',
    'Weihnachten': '🎄'
};

document.addEventListener('DOMContentLoaded', async () => {
    audioElement = document.getElementById('audio-element');
    await loadThemes();
    setupAudioPlayer();
});

async function loadThemes() {
    try {
        const response = await fetch('/api/themes');
        themesData = await response.json();
        renderThemeCards();
    } catch (error) {
        console.error('Fehler beim Laden der Themen:', error);
    }
}

function renderThemeCards() {
    const grid = document.getElementById('themes-grid');
    grid.innerHTML = '';
    
    Object.keys(themesData).forEach(theme => {
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.dataset.theme = theme;
        
        const emoji = document.createElement('div');
        emoji.className = 'emoji';
        emoji.textContent = themeEmojis[theme] || '📚';
        
        const title = document.createElement('div');
        title.className = 'theme-title';
        title.textContent = theme;
        
        card.appendChild(emoji);
        card.appendChild(title);
        
        card.addEventListener('click', () => selectTheme(theme));
        grid.appendChild(card);
    });
}

function selectTheme(theme) {
    const cards = document.querySelectorAll('.theme-card');
    cards.forEach(card => card.classList.remove('active'));
    
    if (currentTheme === theme) {
        currentTheme = null;
        currentPlaylist = [];
        stopPlayback();
        return;
    }
    
    const selectedCard = document.querySelector(`[data-theme="${theme}"]`);
    selectedCard.classList.add('active');
    
    currentTheme = theme;
    currentPlaylist = themesData[theme];
    lastPlayedIndex = -1;
    
    playRandomStory();
}

function playRandomStory() {
    if (!currentPlaylist || currentPlaylist.length === 0) return;
    
    // Track current playtime before switching
    trackPlaytime();
    
    let randomIndex;
    if (currentPlaylist.length === 1) {
        randomIndex = 0;
    } else {
        do {
            randomIndex = Math.floor(Math.random() * currentPlaylist.length);
        } while (randomIndex === lastPlayedIndex);
    }
    
    lastPlayedIndex = randomIndex;
    const story = currentPlaylist[randomIndex];
    
    const audioUrl = `/api/audio/${currentTheme}/${encodeURIComponent(story.titel)}`;
    audioElement.src = audioUrl;
    
    currentTitle = story.titel;
    document.getElementById('current-title').textContent = story.titel;
    document.getElementById('audio-player').classList.remove('hidden');
    
    // Reset playStartTime before playing new track
    playStartTime = null;
    audioElement.play();
    updatePlayPauseButton(true);
}

// formatTime function is now imported from utils.js

function setupAudioPlayer() {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const seekBar = document.getElementById('seek-bar');
    const volumeControl = document.getElementById('volume-control');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const muteBtn = document.getElementById('mute-btn');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    
    playPauseBtn.addEventListener('click', togglePlayPause);
    
    shuffleBtn.addEventListener('click', () => {
        if (currentTheme && currentPlaylist.length > 0) {
            playRandomStory();
        }
    });
    
    audioElement.addEventListener('timeupdate', () => {
        if (audioElement.duration && !isNaN(audioElement.duration)) {
            const progress = (audioElement.currentTime / audioElement.duration) * 100;
            seekBar.value = progress;
            // Update visual progress indicator
            seekBar.style.setProperty('--progress', progress + '%');
            
            timeCurrent.textContent = formatTime(audioElement.currentTime);
            timeTotal.textContent = formatTime(audioElement.duration);
        }
    });
    
    audioElement.addEventListener('loadedmetadata', () => {
        seekBar.disabled = false;
    });
    
    audioElement.addEventListener('ended', () => {
        trackPlaytime();
        if (currentTheme) {
            playRandomStory();
        }
    });
    
    audioElement.addEventListener('play', () => {
        updatePlayPauseButton(true);
        // Only set playStartTime if it's not already set
        if (!playStartTime) {
            playStartTime = Date.now();
        }
    });
    
    audioElement.addEventListener('pause', () => {
        updatePlayPauseButton(false);
        trackPlaytime();
    });
    
    seekBar.addEventListener('input', (e) => {
        if (audioElement.duration && !isNaN(audioElement.duration)) {
            const seekTo = (parseFloat(e.target.value) / 100) * audioElement.duration;
            audioElement.currentTime = seekTo;
            // Update visual progress indicator
            seekBar.style.setProperty('--progress', e.target.value + '%');
        }
    });
    
    volumeControl.addEventListener('input', (e) => {
        audioElement.volume = e.target.value / 100;
        // Update visual volume indicator
        volumeControl.style.setProperty('--volume', e.target.value + '%');
        if (audioElement.volume > 0) {
            previousVolume = audioElement.volume;
            updateMuteButton(false);
        } else {
            updateMuteButton(true);
        }
    });
    
    muteBtn.addEventListener('click', () => {
        if (audioElement.volume > 0) {
            previousVolume = audioElement.volume;
            audioElement.volume = 0;
            volumeControl.value = 0;
            volumeControl.style.setProperty('--volume', '0%');
            updateMuteButton(true);
        } else {
            audioElement.volume = previousVolume;
            volumeControl.value = previousVolume * 100;
            volumeControl.style.setProperty('--volume', (previousVolume * 100) + '%');
            updateMuteButton(false);
        }
    });
    
    // Initialize volume and visual indicators
    audioElement.volume = 0.7;
    previousVolume = 0.7;
    volumeControl.value = 70;
    volumeControl.style.setProperty('--volume', '70%');
    seekBar.style.setProperty('--progress', '0%');
    
    audioElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
    
    audioElement.controlsList = 'nodownload';
}

function togglePlayPause() {
    if (!audioElement.src) return;
    
    if (audioElement.paused) {
        audioElement.play();
    } else {
        audioElement.pause();
    }
}

function updatePlayPauseButton(playing) {
    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');
    
    if (playing) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    }
}

function updateMuteButton(muted) {
    const volumeIcon = document.querySelector('.volume-icon');
    const mutedIcon = document.querySelector('.muted-icon');
    
    if (muted) {
        volumeIcon.classList.add('hidden');
        mutedIcon.classList.remove('hidden');
    } else {
        volumeIcon.classList.remove('hidden');
        mutedIcon.classList.add('hidden');
    }
}

function stopPlayback() {
    trackPlaytime();
    audioElement.pause();
    audioElement.src = '';
    document.getElementById('audio-player').classList.add('hidden');
    document.getElementById('current-title').textContent = 'Kein Titel ausgewählt';
    document.getElementById('time-current').textContent = '0:00';
    document.getElementById('time-total').textContent = '0:00';
    updatePlayPauseButton(false);
    currentTitle = null;
    playStartTime = null;
}

function trackPlaytime() {
    if (playStartTime && currentTheme && currentTitle) {
        const duration = Math.floor((Date.now() - playStartTime) / 1000);
        if (duration > 0) {
            fetch('/api/track-playtime', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    theme: currentTheme,
                    title: currentTitle,
                    duration: duration
                })
            }).catch(err => console.error('Tracking error:', err));
        }
        playStartTime = null;
    }
}

window.addEventListener('beforeunload', () => {
    trackPlaytime();
});