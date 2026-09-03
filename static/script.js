const socket = io();

// Zmienne do płynnego licznika (historii poprzednich wyników)
window.lastPool = undefined;
window.lastScores = {};

// Funkcja odpowiedzialna za "przewijanie się" punktów (licznik)
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // ease-out: szybko startuje, zwalnia pod sam koniec
        const easeOut = progress * (2 - progress);
        const currentVal = Math.round(start + (end - start) * easeOut);
        
        if (element && document.body.contains(element)) {
            element.innerText = currentVal;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                element.innerText = end;
            }
        }
    };
    window.requestAnimationFrame(step);
}

const teamNames = { 
    'niebiescy': 'NIEBIESCY', 
    'zieloni': 'ZIELONI', 
    'zolci': 'ŻÓŁCI', 
    'czerwoni': 'CZERWONI', 
    'pomaranczowi': 'POMARAŃCZOWI', 
    'fioletowi': 'FIOLETOWI', 
    'rozowi': 'RÓŻOWI', 
    'mistrzowie': 'MISTRZOWIE' 
};

const categories = [
    "Archidiecezja Białostocka", "Paramenty liturgiczne", "Szaty liturgiczne", 
    "Święta i uroczystości", "Budowa kościoła", "Sakramenty", 
    "Księgi liturgiczne", "Postawy i gesty", "Hierarchia kościelna", "Czarna Skrzynka"
];

document.addEventListener("DOMContentLoaded", () => {
    createWheelSegments();
});

function createWheelSegments() {
    const wheel = document.getElementById('fortune-wheel');
    if (!wheel) return;
    wheel.innerHTML = '';
    
    const sliceAngle = 360 / categories.length;
    
    categories.forEach((cat, index) => {
        // Białe linie przedzielające
        const separator = document.createElement('div');
        separator.className = 'wheel-separator';
        separator.style.transform = `rotate(${index * sliceAngle - 90}deg)`;
        wheel.appendChild(separator);

        // Pojemnik na wycinek
        const slice = document.createElement('div');
        slice.className = 'wheel-slice';
        const rotation = (index * sliceAngle) + (sliceAngle / 2) - 90;
        slice.style.transform = `rotate(${rotation}deg)`;
        
        // Tekst
        const textSpan = document.createElement('span');
        textSpan.className = 'slice-text';
        textSpan.innerText = cat;
        
        let normalizedRotation = (rotation + 360) % 360;
        if (normalizedRotation > 90 && normalizedRotation < 270) {
            textSpan.classList.add('flipped');
        }
        
        slice.appendChild(textSpan);
        wheel.appendChild(slice);
    });
}

let currentRotation = 0;

socket.on('update_state', function(gameState) {
    const startScreen = document.getElementById('start-screen');
    const gameContent = document.getElementById('game-content');
    const wheelWrapper = document.getElementById('wheel-wrapper');
    const questionBox = document.getElementById('question-box');
    const poolSection = document.getElementById('pool-section');
    const teamsContainer = document.getElementById('teams-container');
    const answerBox = document.getElementById('answer-box');
    const answerText = document.getElementById('answer-text');
    
    const hasTeams = gameState.teams && Object.keys(gameState.teams).length > 0;

    // Przełączanie ekranu powitalnego
    if (!hasTeams) {
        startScreen.classList.remove('hidden');
        gameContent.classList.add('hidden');
        return;
    } else {
        startScreen.classList.add('hidden');
        gameContent.classList.remove('hidden');
    }

    // PULA NA STOLE (uruchomienie płynnego licznika)
    const poolEl = document.getElementById('pool');
    if (window.lastPool !== undefined && window.lastPool !== gameState.pool) {
        animateValue(poolEl, window.lastPool, gameState.pool, 1500);
    } else {
        poolEl.innerText = gameState.pool;
    }
    window.lastPool = gameState.pool;

    // ZARZĄDZANIE WIDOKAMI (KOŁO vs PYTANIE)
    if (gameState.is_spinning) {
        wheelWrapper.classList.remove('hidden');
        poolSection.classList.add('hidden');
        teamsContainer.classList.add('hidden');
        questionBox.classList.add('hidden');
        if (answerBox) answerBox.classList.add('hidden');
        
    } else if (gameState.current_question !== "") {
        wheelWrapper.classList.add('hidden');
        poolSection.classList.remove('hidden');
        teamsContainer.classList.remove('hidden');
        questionBox.classList.remove('hidden');
        document.getElementById('category-title').innerText = gameState.current_category;
        document.getElementById('question').innerText = gameState.current_question;

        if (answerBox && answerText) {
            const hasAnswer = Boolean(gameState.current_answer && String(gameState.current_answer).trim() !== "");
            if (Boolean(gameState.show_answer) && hasAnswer) {
                answerText.innerText = gameState.current_answer;
                answerBox.classList.remove('hidden');
            } else {
                answerBox.classList.add('hidden');
                answerText.innerText = '';
            }
        }
        
    } else {
        wheelWrapper.classList.add('hidden');
        poolSection.classList.remove('hidden');
        teamsContainer.classList.remove('hidden');
        if (answerBox) answerBox.classList.add('hidden');
        
        if (gameState.current_category && gameState.current_category !== "Nowa gra rozpoczęta!") {
            questionBox.classList.remove('hidden');
            document.getElementById('category-title').innerText = "WYLOSOWANA KATEGORIA:";
            document.getElementById('question').innerText = gameState.current_category;
        } else {
            questionBox.classList.add('hidden');
        }
    }
    
    // Szukanie lidera licytacji, by nałożyć mu klasy animacji (świecenie)
    let maxBid = 0;
    for (const b of Object.values(gameState.bids)) {
        if (b > maxBid) maxBid = b;
    }
    const teamsWithMaxBid = Object.values(gameState.bids).filter(b => b === maxBid).length;
    
    teamsContainer.innerHTML = ''; 
    let animationsToRun = [];

    // BUDOWANIE DRUŻYN
    for (const [teamId, score] of Object.entries(gameState.teams)) {
        const currentBid = gameState.bids[teamId] || 0;
        const bidClass = currentBid > 0 ? 'bid-info' : 'bid-info bid-inactive';
        
        const prevScore = window.lastScores[teamId] !== undefined ? window.lastScores[teamId] : score;
        let extraClasses = '';
        
        // Zwycięzca Licytacji (jeśli jest tylko jeden prowadzący)
        if (currentBid === maxBid && maxBid > 0 && (teamsWithMaxBid === 1 || !gameState.is_bidding)) {
            extraClasses += ' leader-highlight';
            // Gdy skończył licytację i ma odpowiadać
            if (!gameState.is_bidding && gameState.current_category !== "Oczekiwanie na start..." && gameState.current_category !== "Nowa gra rozpoczęta!") {
                extraClasses += ' answering-highlight';
            }
        }
        
        // Animacje rozbłysków w momencie dodawania lub zabierania punktów
        if (score > prevScore && window.lastScores[teamId] !== undefined) {
            extraClasses += ' money-gain';
        } else if (score < prevScore && window.lastScores[teamId] !== undefined) {
            extraClasses += ' money-loss';
        }
        
        const teamDiv = document.createElement('div');
        teamDiv.className = `team ${teamId} ${extraClasses}`;
        teamDiv.innerHTML = `
            <h2>${teamNames[teamId]}</h2>
            <div class="score" id="score-${teamId}">${prevScore}</div>
            <div class="${bidClass}">LICYTUJE: <strong>${currentBid}</strong></div>
        `;
        teamsContainer.appendChild(teamDiv);
        
        // Jeśli zmienił się wynik, szykujemy jego animację do odpalenia
        if (prevScore !== score) {
            animationsToRun.push({ id: `score-${teamId}`, start: prevScore, end: score });
        }
        window.lastScores[teamId] = score;
    }

    // Uruchom płynne zliczanie punktów nałożone po utworzeniu DIVów
    animationsToRun.forEach(anim => {
        animateValue(document.getElementById(anim.id), anim.start, anim.end, 1500);
    });
});

socket.on('spin_animation', function(data) {
    const wheel = document.getElementById('fortune-wheel');
    const targetCategory = data.target_category;
    const targetIndex = categories.indexOf(targetCategory);
    
    const sliceAngle = 360 / categories.length;
    const extraSpins = 360 * 6;
    
    const targetAngle = 360 - (targetIndex * sliceAngle) - (sliceAngle / 2);
    
    let rotationToAdd = targetAngle - (currentRotation % 360);
    if (rotationToAdd < 0) {
        rotationToAdd += 360;
    }
    
    currentRotation += extraSpins + rotationToAdd;

    wheel.style.transition = 'transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)';
    wheel.style.transform = `rotate(${currentRotation}deg)`;
});