document.addEventListener('DOMContentLoaded', () => {
    const snapContainer = document.getElementById('snap-container');
    const pages = document.querySelectorAll('.page');
    let isScrolling = false;

    // --- Vertical Scroll Logic (Top-to-Bottom Wheel) ---
    snapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (isScrolling) return;

        const delta = e.deltaY;
        const currentPageIndex = Math.round(snapContainer.scrollTop / window.innerHeight);
        let nextPageIndex = currentPageIndex;

        if (delta > 0 && currentPageIndex < pages.length - 1) {
            nextPageIndex++;
        } else if (delta < 0 && currentPageIndex > 0) {
            nextPageIndex--;
        }

        if (nextPageIndex !== currentPageIndex) {
            isScrolling = true;
            snapContainer.scrollTo({
                top: nextPageIndex * window.innerHeight,
                behavior: 'smooth'
            });

            // Re-enable scrolling after animation completes
            setTimeout(() => {
                isScrolling = false;
            }, 800); // Matches smooth scroll duration
        }
    }, { passive: false });

    // Keyboard support for vertical navigation
    window.addEventListener('keydown', (e) => {
        const currentPageIndex = Math.round(snapContainer.scrollTop / window.innerHeight);
        if (e.key === 'ArrowDown' && currentPageIndex < pages.length - 1) {
            snapContainer.scrollTo({ top: (currentPageIndex + 1) * window.innerHeight, behavior: 'smooth' });
        } else if (e.key === 'ArrowUp' && currentPageIndex > 0) {
            snapContainer.scrollTo({ top: (currentPageIndex - 1) * window.innerHeight, behavior: 'smooth' });
        }
    });

    // --- Intersection Observer for Lazy Loading & Video Autoplay ---
    const observerOptions = {
        threshold: 0.6
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const page = entry.target;
            const videos = page.querySelectorAll('video');
            const lazyImages = page.querySelectorAll('.lazy-load');

            if (entry.isIntersecting) {
                videos.forEach(video => {
                    video.play().catch(() => {});
                });
                
                lazyImages.forEach(img => {
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.remove('lazy-load');
                    }
                });
            } else {
                videos.forEach(video => video.pause());
            }
        });
    }, observerOptions);

    pages.forEach(page => observer.observe(page));

    // --- Custom Audio Players ---
    const players = document.querySelectorAll('.custom-player');
    const allAudioObjects = [];

    // Also collect Page 5 audio
    const audioDay = document.getElementById('audio-day');
    const audioNight = document.getElementById('audio-night');
    if (audioDay) allAudioObjects.push(audioDay);
    if (audioNight) allAudioObjects.push(audioNight);

    players.forEach(player => {
        const audioPath = player.dataset.audio;
        const audio = new Audio(audioPath);
        allAudioObjects.push(audio);
        const playBtn = player.querySelector('.play-btn');
        const progressBar = player.querySelector('.progress-bar');
        const progressContainer = player.querySelector('.player-progress');

        // Create volume mixer
        const volumeContainer = document.createElement('div');
        volumeContainer.className = 'volume-container';
        volumeContainer.innerHTML = `
            <img src="icons/mastering.svg" class="volume-icon" alt="Vol">
            <input type="range" class="volume-slider" min="0" max="1" step="0.1" value="1">
        `;
        player.appendChild(volumeContainer);

        const volumeSlider = volumeContainer.querySelector('.volume-slider');
        volumeSlider.addEventListener('input', (e) => {
            audio.volume = e.target.value;
        });

        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                // Pause all other audio
                allAudioObjects.forEach(a => {
                    a.pause();
                    // If it's a DOM audio element, we need to reset its play button
                    // But here we only handle the new Audio objects' play buttons
                });
                document.querySelectorAll('.play-btn').forEach(b => b.classList.remove('pause'));
                
                audio.play();
                playBtn.classList.add('pause');
            } else {
                audio.pause();
                playBtn.classList.remove('pause');
            }
        });

        audio.addEventListener('timeupdate', () => {
            const percent = (audio.currentTime / audio.duration) * 100;
            if (progressBar) progressBar.style.width = `${percent}%`;
            
            if (player.querySelector('.equalizer')) {
                updateEqualizer(player);
            }
        });

        if (progressContainer) {
            progressContainer.addEventListener('click', (e) => {
                const rect = progressContainer.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                audio.currentTime = pos * audio.duration;
            });
        }
    });

    function updateEqualizer(player) {
        const bars = player.querySelectorAll('.eq-bar');
        bars.forEach(bar => {
            bar.style.height = `${Math.random() * 40 + 10}px`;
        });
    }

    // --- Leitmotif Switch Logic ---
    const leitmotifPage = document.querySelector('.page--leitmotif');
    const leitmotifToggle = document.getElementById('leitmotif-toggle');
    const leitmotifPlay = document.getElementById('leitmotif-play');
    // audioDay and audioNight are already declared above
    const videoDay = document.getElementById('video-day');
    const videoNight = document.getElementById('video-night');

    // Add volume slider to leitmotif
    const leitmotifContainer = document.querySelector('.custom-player-leitmotif');
    if (leitmotifContainer) {
        const leitmotifVolContainer = document.createElement('div');
        leitmotifVolContainer.className = 'volume-container';
        leitmotifVolContainer.innerHTML = `
            <img src="icons/mastering.svg" class="volume-icon" alt="Vol">
            <input type="range" class="volume-slider" min="0" max="1" step="0.1" value="1">
        `;
        leitmotifContainer.appendChild(leitmotifVolContainer);

        const leitmotifVolSlider = leitmotifVolContainer.querySelector('.volume-slider');
        let masterLeitmotifVolume = 1;

        leitmotifVolSlider.addEventListener('input', (e) => {
            masterLeitmotifVolume = e.target.value;
            const isNight = leitmotifToggle.checked;
            if (!audioDay.paused || !audioNight.paused) {
                audioDay.volume = isNight ? 0 : masterLeitmotifVolume;
                audioNight.volume = isNight ? masterLeitmotifVolume : 0;
            }
        });

        leitmotifToggle.addEventListener('change', () => {
            const isNight = leitmotifToggle.checked;
            if (isNight) {
                leitmotifPage.classList.add('night');
                videoDay.classList.remove('active');
                videoNight.classList.add('active');
                fadeAudio(audioDay, audioNight);
            } else {
                leitmotifPage.classList.remove('night');
                videoNight.classList.remove('active');
                videoDay.classList.add('active');
                fadeAudio(audioNight, audioDay);
            }
        });

        function fadeAudio(from, to) {
            const duration = 1000;
            const steps = 20;
            const interval = duration / steps;
            
            if (!from.paused || !to.paused) {
                let step = 0;
                const fadeInterval = setInterval(() => {
                    step++;
                    const fromVol = masterLeitmotifVolume * (1 - (step / steps));
                    const toVol = masterLeitmotifVolume * (step / steps);
                    from.volume = Math.max(0, fromVol);
                    to.volume = Math.min(masterLeitmotifVolume, toVol);
                    if (step >= steps) {
                        clearInterval(fadeInterval);
                        from.pause();
                    }
                }, interval);
                to.play();
            }
        }

        leitmotifPlay.addEventListener('click', () => {
            if (audioDay.paused && audioNight.paused) {
                // Pause all other audio
                allAudioObjects.forEach(a => a.pause());
                document.querySelectorAll('.play-btn').forEach(b => b.classList.remove('pause'));

                const isNight = leitmotifToggle.checked;
                audioDay.volume = isNight ? 0 : masterLeitmotifVolume;
                audioNight.volume = isNight ? masterLeitmotifVolume : 0;
                audioDay.play();
                audioNight.play();
                leitmotifPlay.classList.add('pause');
            } else {
                audioDay.pause();
                audioNight.pause();
                leitmotifPlay.classList.remove('pause');
            }
        });
    }

    // --- Particle Animation ---
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        function resize() {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1;
                this.speedX = Math.random() * 1 - 0.5;
                this.speedY = Math.random() * 1 - 0.5;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x > canvas.width) this.x = 0;
                if (this.x < 0) this.x = canvas.width;
                if (this.y > canvas.height) this.y = 0;
                if (this.y < 0) this.y = canvas.height;
            }
            draw() {
                ctx.fillStyle = 'rgba(177, 156, 217, 0.4)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        for (let i = 0; i < 40; i++) particles.push(new Particle());
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            requestAnimationFrame(animate);
        }
        animate();
    }

    // --- Bubble Animation ---
    const bubbleContainer = document.querySelector('.bubble-container');
    if (bubbleContainer) {
        setInterval(() => {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            const size = Math.random() * 20 + 10;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.left = `${Math.random() * 100}%`;
            bubble.style.position = 'absolute';
            bubble.style.bottom = '-20px';
            bubble.style.background = 'rgba(255, 255, 255, 0.2)';
            bubble.style.borderRadius = '50%';
            bubble.style.animation = 'rise 4s linear forwards';
            bubbleContainer.appendChild(bubble);
            setTimeout(() => bubble.remove(), 4000);
        }, 800);
    }
});

// CSS for dynamic bubble rise (injected here for simplicity or added to style.css)
const style = document.createElement('style');
style.textContent = `
@keyframes rise {
    to { transform: translateY(-60vh); opacity: 0; }
}
`;
document.head.appendChild(style);
