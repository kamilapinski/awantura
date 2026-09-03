const socket = io();

const teamNames = { 
    'niebiescy': 'NIEBIESCY', 'zieloni': 'ZIELONI', 'zolci': 'ŻÓŁCI', 
    'czerwoni': 'CZERWONI', 'pomaranczowi': 'POMARAŃCZOWI', 
    'fioletowi': 'FIOLETOWI', 'rozowi': 'RÓŻOWI', 'mistrzowie': 'MISTRZOWIE' 
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
        const slice = document.createElement('div');
        slice.className = 'wheel-slice';
        // Obracamy wycinek koła
        const rotation = index * sliceAngle;
        slice.style.transform = `rotate(${rotation}deg)`;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'slice-text';
        textSpan.innerText = cat;
        // Kontr-rotacja tekstu, aby zawsze był czytelny wzdłuż promienia
        textSpan.style.transform = `rotate(${sliceAngle / 2}deg)`;
        
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

    if (!hasTeams) {
        startScreen.classList.remove('hidden');
        gameContent.classList.add('hidden');
        return;
    } else {
        startScreen.classList.add('hidden');
        gameContent.classList.remove('hidden');
    }

    document.getElementById('pool').innerText = gameState.pool;

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
        
        // PO WYLOSOWANIU: pokazujemy wylosowaną kategorię na środku/górze
        if (gameState.current_category && gameState.current_category !== "Nowa gra rozpoczęta!") {
            questionBox.classList.remove('hidden');
            document.getElementById('category-title').innerText = "WYLOSOWANA KATEGORIA:";
            document.getElementById('question').innerText = gameState.current_category;
        } else {
            questionBox.classList.add('hidden');
        }
    }
    
    teamsContainer.innerHTML = ''; 

    for (const [teamId, score] of Object.entries(gameState.teams)) {
        const currentBid = gameState.bids[teamId] || 0;
        const bidClass = currentBid > 0 ? 'bid-info' : 'bid-info bid-inactive';
        
        const teamDiv = document.createElement('div');
        teamDiv.className = `team ${teamId}`;
        teamDiv.innerHTML = `
            <h2>${teamNames[teamId]}</h2>
            <div class="score">${score}</div>
            <div class="${bidClass}">LICYTUJE: <strong>${currentBid}</strong></div>
        `;
        teamsContainer.appendChild(teamDiv);
    }
});

socket.on('spin_animation', function(data) {
    const wheel = document.getElementById('fortune-wheel');
    const targetCategory = data.target_category;
    const targetIndex = categories.indexOf(targetCategory);
    
    const sliceAngle = 360 / categories.length;
    const extraSpins = 360 * 6;
    // Wskaźnik jest na górze (0 stopni), więc celujemy tak, aby środek wylosowanego segmentu trafił na góra
    const targetAngle = 360 - (targetIndex * sliceAngle) - (sliceAngle / 2);
    
    currentRotation += extraSpins + (targetAngle - (currentRotation % 360));

    wheel.style.transition = 'transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)';
    wheel.style.transform = `rotate(${currentRotation}deg)`;
});