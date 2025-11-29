// Audio
let audioContext = null;

function initAudio() { 
    if (!audioContext) { 
        audioContext = new (window.AudioContext || window.webkitAudioContext)(); 
    } 
}

function playBeep(frequency, duration) {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playBuzzer() {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 150;
    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
}

// Game State
let currentCategory = null;
let team1Score = 0;
let team2Score = 0;
let currentTeam = 1;
let isPlaying = false;
let timerInterval = null;
let usedPhrases = [];
let currentPhrase = "";
let timerStartTime = 0;
let baseDuration = 0;
let randomEndTime = 0;
let currentPitch = 400;

// Get phrases for current category
function getPhrases() {
    switch(currentCategory) {
        case 'world': return worldPhrases;
        case 'sports': return sportsPhrases;
        case 'science': return sciencePhrases;
        default: return [];
    }
}

function selectCategory(category) {
    if (isPlaying) return;
    currentCategory = category;
    usedPhrases = [];
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('disabled');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    document.getElementById('phrase').textContent = '—';
    document.getElementById('status').textContent = 'Press Start to begin!';
    document.getElementById('startBtn').disabled = false;
}

function showRules() { 
    document.getElementById('rulesModal').classList.add('show'); 
}

function closeRules() { 
    document.getElementById('rulesModal').classList.remove('show'); 
}

function getRandomPhrase() {
    const phrases = getPhrases();
    if (usedPhrases.length >= phrases.length) usedPhrases = [];
    let available = phrases.filter(p => !usedPhrases.includes(p));
    let phrase = available[Math.floor(Math.random() * available.length)];
    usedPhrases.push(phrase);
    return phrase;
}

function updateDisplay() {
    // Update team display
    const teamDisplay = document.getElementById('teamDisplay');
    teamDisplay.textContent = `Team ${currentTeam}`;
    teamDisplay.className = `team-display team${currentTeam}`;
    
    // Update score display
    document.getElementById('scoreDisplay').innerHTML = 
        `Score: <span>${team1Score}</span> - <span>${team2Score}</span>`;
}

function startRound() {
    if (isPlaying || !currentCategory) return;
    
    initAudio();
    isPlaying = true;
    
    // Lock categories - gray out non-selected ones
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (!btn.classList.contains('active')) {
            btn.classList.add('disabled');
        }
        btn.classList.add('locked');
    });
    
    // Switch controls
    document.getElementById('controlsPregame').classList.add('hidden');
    document.getElementById('controlsIngame').classList.remove('hidden');
    
    currentPhrase = getRandomPhrase();
    document.getElementById('phrase').textContent = currentPhrase;
    document.getElementById('status').textContent = "Don't say the word!";
    
    baseDuration = 45000 + Math.random() * 45000;
    randomEndTime = baseDuration + (Math.random() * 10000 - 5000);
    timerStartTime = Date.now();
    currentPitch = 400;
    
    updateDisplay();
    startTimer();
}

function startTimer() {
    const flashOverlay = document.getElementById('flashOverlay');
    let lastFlashTime = 0;
    
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - timerStartTime;
        const progress = Math.min(elapsed / baseDuration, 1);
        
        if (progress > 0.4) {
            const intensity = (progress - 0.4) / 0.6;
            const flashInterval = 1500 - (intensity * 1350);
            currentPitch = 400 + (intensity * 800);
            
            const now = Date.now();
            if (now - lastFlashTime >= flashInterval) {
                flashOverlay.classList.add('active');
                playBeep(currentPitch, 0.15);
                setTimeout(() => flashOverlay.classList.remove('active'), 80);
                lastFlashTime = now;
            }
        }
        
        if (elapsed >= randomEndTime) endRound();
    }, 30);
}

function endRound() {
    clearInterval(timerInterval);
    timerInterval = null;
    
    const flashOverlay = document.getElementById('flashOverlay');
    flashOverlay.classList.remove('active');
    flashOverlay.classList.add('buzzer');
    playBuzzer();
    setTimeout(() => flashOverlay.classList.remove('buzzer'), 1000);
    
    isPlaying = false;
    
    // Switch controls back
    document.getElementById('controlsPregame').classList.remove('hidden');
    document.getElementById('controlsIngame').classList.add('hidden');
    
    // Unlock categories
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('locked');
        btn.classList.remove('disabled');
    });
    
    const scoringTeam = currentTeam === 1 ? 2 : 1;
    if (scoringTeam === 1) team1Score++; else team2Score++;
    
    document.getElementById('status').textContent = `Team ${scoringTeam} scores! Answer: ${currentPhrase}`;
    updateDisplay();
    checkWinner();
}

function gotIt() {
    if (!isPlaying) return;
    currentTeam = currentTeam === 1 ? 2 : 1;
    updateDisplay();
    currentPhrase = getRandomPhrase();
    document.getElementById('phrase').textContent = currentPhrase;
}

function skipWord() {
    if (!isPlaying) return;
    currentPhrase = getRandomPhrase();
    document.getElementById('phrase').textContent = currentPhrase;
}

function checkWinner() {
    if (team1Score >= 7) showWinner(1);
    else if (team2Score >= 7) showWinner(2);
}

function showWinner(team) {
    const overlay = document.getElementById('winnerOverlay');
    const text = document.getElementById('winnerText');
    text.textContent = `🎉 Team ${team} Wins! 🎉`;
    text.style.background = team === 1 
        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
        : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    text.style.webkitBackgroundClip = 'text';
    text.style.webkitTextFillColor = 'transparent';
    text.style.backgroundClip = 'text';
    overlay.classList.add('show');
}

function resetGame() {
    clearInterval(timerInterval);
    timerInterval = null;
    
    team1Score = 0; 
    team2Score = 0; 
    currentTeam = 1; 
    isPlaying = false; 
    usedPhrases = [];
    currentCategory = null;
    
    document.getElementById('winnerOverlay').classList.remove('show');
    document.getElementById('flashOverlay').classList.remove('active', 'buzzer');
    document.getElementById('phrase').textContent = '—';
    document.getElementById('status').textContent = 'Select a category to start!';
    document.getElementById('startBtn').disabled = true;
    
    // Reset controls
    document.getElementById('controlsPregame').classList.remove('hidden');
    document.getElementById('controlsIngame').classList.add('hidden');
    
    // Reset categories
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('disabled');
        btn.classList.remove('locked');
    });
    
    updateDisplay();
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('rulesModal').addEventListener('click', function(e) { 
        if (e.target === this) closeRules(); 
    });
    document.getElementById('startBtn').disabled = true;
    updateDisplay();
});
