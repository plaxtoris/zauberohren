let themesData = {};
let currentThemeIndex = 0;
let currentTheme = null;
let currentPlaylist = [];
let lastPlayedIndex = -1;
let audioElement = null;
let isPlaying = false;
let playStartTime = null;
let currentTitle = null;
let touchStartX = 0;
let touchEndX = 0;
let themesArray = [];
let isTransitioning = false;

document.addEventListener('DOMContentLoaded', async () => {
    audioElement = document.getElementById('audio-element');
    await loadThemes();
    setupSwipeListeners();
    setupPlayerControls();
});

async function loadThemes() {
    try {
        const response = await fetch('/api/themes');
        themesData = await response.json();
        themesArray = Object.keys(themesData);
        renderThemeSlides();

        // Start at position 1 because of clone at position 0
        const container = document.getElementById('themes-container');
        container.style.transform = `translateX(-100%)`;
        container.style.transition = 'none';

        selectRandomStory(currentThemeIndex);
    } catch (error) {
        console.error('Fehler beim Laden der Themen:', error);
    }
}

function renderThemeSlides() {
    const container = document.getElementById('themes-container');
    container.innerHTML = '';

    // Helper function to create a slide
    const createSlide = (theme, index) => {
        const slide = document.createElement('div');
        slide.className = 'theme-slide';
        slide.dataset.theme = theme;
        slide.dataset.index = index;

        // Set background image
        const imagePath = `/data/${theme}/image.jpg`;
        slide.style.backgroundImage = `url('${imagePath}')`;

        const content = document.createElement('div');
        content.className = 'theme-content';

        const nameEl = document.createElement('h2');
        nameEl.className = 'theme-name';
        nameEl.textContent = theme;

        const storyEl = document.createElement('p');
        storyEl.className = 'current-story';
        storyEl.id = `story-${index}`;
        storyEl.textContent = 'Geschichte wird geladen...';

        const controls = document.createElement('div');
        controls.className = 'player-controls';

        const playBtn = document.createElement('button');
        playBtn.className = 'play-btn';
        playBtn.id = `play-${index}`;
        playBtn.innerHTML = `
            <svg class="play-icon" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <svg class="pause-icon hidden" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
            </svg>
        `;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'next-btn';
        nextBtn.id = `next-${index}`;
        nextBtn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M6 6v12l8-6z"/>
                <path d="M14 6v12l8-6z"/>
            </svg>
        `;

        controls.appendChild(playBtn);
        controls.appendChild(nextBtn);

        content.appendChild(nameEl);
        content.appendChild(storyEl);
        content.appendChild(controls);

        slide.appendChild(content);

        // Add event listeners
        playBtn.addEventListener('click', () => togglePlayPause(index));
        nextBtn.addEventListener('click', () => playNextStory(index));

        return slide;
    };

    // Add all slides
    themesArray.forEach((theme, index) => {
        container.appendChild(createSlide(theme, index));
    });

    // Clone first and last slides for seamless transition
    if (themesArray.length > 0) {
        const firstClone = createSlide(themesArray[0], 0);
        firstClone.classList.add('clone');
        const lastClone = createSlide(themesArray[themesArray.length - 1], themesArray.length - 1);
        lastClone.classList.add('clone');

        container.appendChild(firstClone);
        container.insertBefore(lastClone, container.firstChild);
    }
}

function setupSwipeListeners() {
    const carousel = document.getElementById('theme-carousel');
    const leftIndicator = document.querySelector('.swipe-indicator.left');
    const rightIndicator = document.querySelector('.swipe-indicator.right');

    // Touch events
    carousel.addEventListener('touchstart', handleTouchStart, {passive: true});
    carousel.addEventListener('touchmove', handleTouchMove, {passive: true});
    carousel.addEventListener('touchend', handleTouchEnd);

    // Mouse events for desktop
    let mouseDown = false;
    carousel.addEventListener('mousedown', (e) => {
        mouseDown = true;
        touchStartX = e.clientX;
    });

    carousel.addEventListener('mousemove', (e) => {
        if (mouseDown) {
            touchEndX = e.clientX;
        }
    });

    carousel.addEventListener('mouseup', () => {
        if (mouseDown) {
            mouseDown = false;
            handleSwipe();
        }
    });

    carousel.addEventListener('mouseleave', () => {
        mouseDown = false;
    });

    // Click indicators
    leftIndicator.addEventListener('click', () => navigateTheme(-1));
    rightIndicator.addEventListener('click', () => navigateTheme(1));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') navigateTheme(-1);
        if (e.key === 'ArrowRight') navigateTheme(1);
    });
}

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
}

function handleTouchMove(e) {
    touchEndX = e.touches[0].clientX;
}

function handleTouchEnd() {
    handleSwipe();
}

function handleSwipe() {
    const swipeDistance = touchStartX - touchEndX;
    const minSwipeDistance = 50;

    if (Math.abs(swipeDistance) > minSwipeDistance) {
        if (swipeDistance > 0) {
            navigateTheme(1); // Swipe left - next theme
        } else {
            navigateTheme(-1); // Swipe right - previous theme
        }
    }
}

function navigateTheme(direction) {
    if (isTransitioning) return;

    // Track playtime before switching
    trackPlaytime();

    isTransitioning = true;
    const container = document.getElementById('themes-container');

    // Calculate visual position (including clone offset)
    let visualIndex = currentThemeIndex + 1; // +1 because of clone at start
    visualIndex += direction;

    // Animate to new position
    container.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    container.style.transform = `translateX(-${visualIndex * 100}%)`;

    // Update logical index
    currentThemeIndex += direction;

    // Handle wrap-around logic after animation
    setTimeout(() => {
        container.style.transition = 'none';

        if (currentThemeIndex < 0) {
            currentThemeIndex = themesArray.length - 1;
            container.style.transform = `translateX(-${themesArray.length * 100}%)`;
        } else if (currentThemeIndex >= themesArray.length) {
            currentThemeIndex = 0;
            container.style.transform = `translateX(-100%)`;
        }

        isTransitioning = false;
    }, 300);

    // Update current theme data
    currentTheme = themesArray[currentThemeIndex];
    currentPlaylist = themesData[currentTheme];

    // Stop current audio
    if (!audioElement.paused) {
        audioElement.pause();
        updatePlayPauseButton(currentThemeIndex, false);
    }

    // Load new story
    selectRandomStory(currentThemeIndex);
}

function selectRandomStory(themeIndex) {
    const theme = themesArray[themeIndex];
    const playlist = themesData[theme];

    if (!playlist || playlist.length === 0) return;

    const randomIndex = Math.floor(Math.random() * playlist.length);
    const story = playlist[randomIndex];

    // Update story display
    const storyEl = document.getElementById(`story-${themeIndex}`);
    if (storyEl) {
        storyEl.textContent = story.titel;
    }

    // Prepare audio but don't play
    if (themeIndex === currentThemeIndex) {
        const audioUrl = `/api/audio/${theme}/${encodeURIComponent(story.titel)}`;
        audioElement.src = audioUrl;
        currentTitle = story.titel;
        lastPlayedIndex = randomIndex;
    }
}

function playNextStory(themeIndex) {
    if (themeIndex !== currentThemeIndex) return;

    const theme = themesArray[themeIndex];
    const playlist = themesData[theme];

    if (!playlist || playlist.length === 0) return;

    // Track current playtime before switching
    trackPlaytime();

    let newIndex;
    if (playlist.length === 1) {
        newIndex = 0;
    } else {
        do {
            newIndex = Math.floor(Math.random() * playlist.length);
        } while (newIndex === lastPlayedIndex);
    }

    lastPlayedIndex = newIndex;
    const story = playlist[newIndex];

    // Update story display
    const storyEl = document.getElementById(`story-${themeIndex}`);
    if (storyEl) {
        storyEl.textContent = story.titel;
    }

    // Load and play new story
    const audioUrl = `/api/audio/${theme}/${encodeURIComponent(story.titel)}`;
    audioElement.src = audioUrl;
    currentTitle = story.titel;
    playStartTime = null;
    audioElement.play();
    updatePlayPauseButton(themeIndex, true);
}

function togglePlayPause(themeIndex) {
    if (themeIndex !== currentThemeIndex) return;

    if (!audioElement.src || audioElement.src === '') {
        selectRandomStory(themeIndex);
    }

    if (audioElement.paused) {
        audioElement.play();
        updatePlayPauseButton(themeIndex, true);
    } else {
        audioElement.pause();
        updatePlayPauseButton(themeIndex, false);
    }
}

function updatePlayPauseButton(themeIndex, playing) {
    const playBtn = document.getElementById(`play-${themeIndex}`);
    if (!playBtn) return;

    const playIcon = playBtn.querySelector('.play-icon');
    const pauseIcon = playBtn.querySelector('.pause-icon');

    if (playing) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    }
}

function setupPlayerControls() {
    audioElement.addEventListener('play', () => {
        if (!playStartTime) {
            playStartTime = Date.now();
        }
        updatePlayPauseButton(currentThemeIndex, true);
    });

    audioElement.addEventListener('pause', () => {
        trackPlaytime();
        updatePlayPauseButton(currentThemeIndex, false);
    });

    audioElement.addEventListener('ended', () => {
        trackPlaytime();
        playNextStory(currentThemeIndex);
    });

    audioElement.volume = 0.7;

    audioElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    audioElement.controlsList = 'nodownload';
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