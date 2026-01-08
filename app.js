// Högskoleprovet Vocabulary Practice App

// State
let words = [];
let currentWord = null;
let sessionCorrect = 0;
let sessionTotal = 0;
let sessionGoal = 20;
let xp = 0;
let streak = 0;
let lastPracticeDate = null;
let wordProgress = {}; // Track mastery per word
let recentlyShown = []; // Track recently shown words to prevent repetition
const RECENT_WORD_BUFFER = 15; // Don't show same word within last 15 questions

// DOM Elements
const elements = {
    streakCount: document.getElementById('streak-count'),
    xpCount: document.getElementById('xp-count'),
    progressFill: document.getElementById('progress-fill'),
    sessionProgress: document.getElementById('session-progress'),
    sessionGoal: document.getElementById('session-goal'),
    questionView: document.getElementById('question-view'),
    resultView: document.getElementById('result-view'),
    completeView: document.getElementById('complete-view'),
    wordDisplay: document.getElementById('word-display'),
    wordType: document.getElementById('word-type'),
    options: document.getElementById('options'),
    resultHeader: document.getElementById('result-header'),
    resultIcon: document.getElementById('result-icon'),
    resultText: document.getElementById('result-text'),
    resultXp: document.getElementById('result-xp'),
    answerWord: document.getElementById('answer-word'),
    correctAnswer: document.getElementById('correct-answer'),
    definition: document.getElementById('definition'),
    etymology: document.getElementById('etymology'),
    example: document.getElementById('example'),
    nextButton: document.getElementById('next-button'),
    continueButton: document.getElementById('continue-button'),
    finalCorrect: document.getElementById('final-correct'),
    finalTotal: document.getElementById('final-total'),
    finalXp: document.getElementById('final-xp'),
    levelName: document.getElementById('level-name'),
    confettiContainer: document.getElementById('confetti-container')
};

// Initialize
async function init() {
    loadProgress();
    updateStreak();
    await loadWords();
    updateUI();
    showNextWord();

    elements.nextButton.addEventListener('click', showNextWord);
    elements.continueButton.addEventListener('click', continueTraining);
}

// Load words from JSON
async function loadWords() {
    try {
        const response = await fetch('data/words.json');
        words = await response.json();
        console.log(`Loaded ${words.length} words`);
    } catch (error) {
        console.error('Failed to load words:', error);
        // Fallback sample words for testing
        words = getSampleWords();
    }
}

// Sample words for testing when JSON not available
function getSampleWords() {
    return [
        {
            word: "maskopi",
            partOfSpeech: "substantiv",
            correctAnswer: "hemligt samförstånd",
            options: ["hemligt samförstånd", "oväntat bakslag", "pinsamt misslyckande", "falsk identitet", "underjordisk rörelse"],
            definition: "Ett hemligt samarbete eller samförstånd mellan parter, ofta i syfte att lura eller bedra andra.",
            etymology: "Från italienska 'macchinazione' via franska. Relaterat till 'maskin' - ursprungligen syftande på hemliga manövrer.",
            difficulty: 3,
            exampleSentence: "De misstänktes för maskopi med konkurrenten."
        },
        {
            word: "eterisk",
            partOfSpeech: "adjektiv",
            correctAnswer: "flyktig",
            options: ["giftig", "flyktig", "explosiv", "frätande", "trögflytande"],
            definition: "Som har att göra med eter; lätt och luftig; himmelsk eller andlig till sin natur.",
            etymology: "Från grekiska 'aither' (den rena övre luften) via latin 'aether'.",
            difficulty: 3,
            exampleSentence: "Hennes eteriska skönhet fängslade alla närvarande."
        },
        {
            word: "perforera",
            partOfSpeech: "verb",
            correctAnswer: "göra hål i",
            options: ["snygga till", "visa upp", "sätta fast", "vika ihop", "göra hål i"],
            definition: "Att göra hål eller en serie hål i något.",
            etymology: "Från latin 'perforare' (per = genom + forare = borra).",
            difficulty: 2,
            exampleSentence: "Maskinen perforerar pappret längs kanten."
        }
    ];
}

// Load progress from localStorage
function loadProgress() {
    const saved = localStorage.getItem('hp-vocab-progress');
    if (saved) {
        const data = JSON.parse(saved);
        xp = data.xp || 0;
        streak = data.streak || 0;
        lastPracticeDate = data.lastPracticeDate;
        wordProgress = data.wordProgress || {};
    }
}

// Save progress to localStorage
function saveProgress() {
    const data = {
        xp,
        streak,
        lastPracticeDate,
        wordProgress
    };
    localStorage.setItem('hp-vocab-progress', JSON.stringify(data));
}

// Update streak based on last practice date
function updateStreak() {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastPracticeDate === today) {
        // Already practiced today, streak continues
    } else if (lastPracticeDate === yesterday) {
        // Practiced yesterday, increment streak
        streak++;
        lastPracticeDate = today;
        saveProgress();
    } else if (lastPracticeDate !== today) {
        // Missed a day or first time, reset streak
        streak = lastPracticeDate ? 0 : 1;
        lastPracticeDate = today;
        saveProgress();
    }
}

// Get next word using spaced repetition logic
function getNextWord() {
    if (words.length === 0) return null;

    // Filter out recently shown words
    const recentWordSet = new Set(recentlyShown);
    const availableWords = words.filter(w => !recentWordSet.has(w.word));

    // If we've filtered out too many, reset the buffer
    if (availableWords.length < 50) {
        recentlyShown = [];
        return getNextWord();
    }

    // Categorize available words
    // A word needs review if: got it wrong recently AND haven't proven mastery since
    // "Proven mastery" = at least 2 correct answers after any mistakes
    const wrongWords = availableWords.filter(w => {
        const progress = wordProgress[w.word];
        if (!progress || progress.attempts === 0) return false;

        const mistakes = progress.attempts - progress.correct;
        // Needs review if: has mistakes AND hasn't gotten 2+ more correct than wrong
        return mistakes > 0 && progress.correct < (mistakes + 2);
    });

    const newWords = availableWords.filter(w => !wordProgress[w.word]);

    // Build weighted pool: 20% wrong words, 60% new words, 20% any
    let pool = [];
    const rand = Math.random();

    if (wrongWords.length > 0 && rand < 0.2) {
        pool = wrongWords;
    } else if (newWords.length > 0 && rand < 0.8) {
        pool = newWords;
    } else {
        pool = availableWords;
    }

    // If selected pool is empty, fall back to available words
    if (pool.length === 0) {
        pool = availableWords;
    }

    // Pick random word from pool
    const word = pool[Math.floor(Math.random() * pool.length)];

    // Track this word as recently shown
    recentlyShown.push(word.word);
    if (recentlyShown.length > RECENT_WORD_BUFFER) {
        recentlyShown.shift();
    }

    return word;
}

// Show the next word
function showNextWord() {
    // Check if session goal reached
    if (sessionTotal >= sessionGoal && sessionTotal > 0) {
        showSessionComplete();
        return;
    }

    currentWord = getNextWord();
    if (!currentWord) {
        elements.wordDisplay.textContent = 'Inga ord tillgängliga';
        return;
    }

    // Reset views
    elements.questionView.classList.remove('hidden');
    elements.resultView.classList.add('hidden');

    // Display word
    elements.wordDisplay.textContent = currentWord.word;
    elements.wordType.textContent = currentWord.partOfSpeech;

    // Shuffle and display options
    const shuffledOptions = shuffleArray([...currentWord.options]);
    elements.options.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D', 'E'];
    shuffledOptions.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.innerHTML = `
            <span class="option-letter">${letters[index]}</span>
            <span class="option-text">${option}</span>
        `;
        button.addEventListener('click', () => handleAnswer(option, button));
        elements.options.appendChild(button);
    });
}

// Handle answer selection
function handleAnswer(selected, button) {
    const isCorrect = selected === currentWord.correctAnswer;

    // Update progress tracking
    if (!wordProgress[currentWord.word]) {
        wordProgress[currentWord.word] = { correct: 0, attempts: 0 };
    }
    wordProgress[currentWord.word].attempts++;
    if (isCorrect) {
        wordProgress[currentWord.word].correct++;
    }

    // Update session stats
    sessionTotal++;
    if (isCorrect) {
        sessionCorrect++;
        xp += 10;
    }

    saveProgress();

    // Disable all buttons
    const buttons = elements.options.querySelectorAll('.option-button');
    buttons.forEach(btn => {
        btn.classList.add('disabled');
        const optionText = btn.querySelector('.option-text').textContent;
        if (optionText === currentWord.correctAnswer) {
            btn.classList.add('correct');
        } else if (btn === button && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });

    // Show result after short delay
    setTimeout(() => showResult(isCorrect), 600);
}

// Show the result view
function showResult(isCorrect) {
    elements.questionView.classList.add('hidden');
    elements.resultView.classList.remove('hidden');

    // Update result header
    elements.resultHeader.className = `result-header ${isCorrect ? 'correct' : 'incorrect'}`;
    elements.resultIcon.textContent = isCorrect ? '✓' : '✗';
    elements.resultText.textContent = isCorrect ? 'Rätt!' : 'Fel';
    elements.resultXp.textContent = isCorrect ? '+10 XP' : '';
    elements.resultXp.style.display = isCorrect ? 'inline' : 'none';

    // Update answer info
    elements.answerWord.textContent = currentWord.word;
    elements.correctAnswer.textContent = currentWord.correctAnswer;
    elements.definition.textContent = currentWord.definition;
    elements.etymology.textContent = currentWord.etymology;
    elements.example.textContent = `"${currentWord.exampleSentence}"`;

    // Update UI
    updateUI();

    // Confetti for correct answers
    if (isCorrect && sessionCorrect % 5 === 0) {
        createConfetti();
    }
}

// Show session complete view
function showSessionComplete() {
    elements.questionView.classList.add('hidden');
    elements.resultView.classList.add('hidden');
    elements.completeView.classList.remove('hidden');

    elements.finalCorrect.textContent = sessionCorrect;
    elements.finalTotal.textContent = sessionTotal;
    elements.finalXp.textContent = sessionCorrect * 10;

    createConfetti();
}

// Continue training after session complete
function continueTraining() {
    sessionTotal = 0;
    sessionCorrect = 0;
    elements.completeView.classList.add('hidden');
    updateUI();
    showNextWord();
}

// Update UI elements
function updateUI() {
    elements.streakCount.textContent = streak;
    elements.xpCount.textContent = xp;
    elements.sessionProgress.textContent = sessionTotal;
    elements.sessionGoal.textContent = sessionGoal;

    const progressPercent = Math.min((sessionTotal / sessionGoal) * 100, 100);
    elements.progressFill.style.width = `${progressPercent}%`;

    // Update level
    elements.levelName.textContent = getLevel(xp);
}

// Get level based on XP
function getLevel(xp) {
    if (xp < 100) return 'Nybörjare';
    if (xp < 500) return 'Lärling';
    if (xp < 1000) return 'Elev';
    if (xp < 2500) return 'Student';
    if (xp < 5000) return 'Kandidat';
    if (xp < 10000) return 'Magister';
    if (xp < 25000) return 'Doktor';
    return 'Professor';
}

// Shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Create confetti effect (elegant version)
function createConfetti() {
    const colors = ['#d4a373', '#e9c46a', '#588157', '#a3b18a', '#c9c5ba'];

    for (let i = 0; i < 40; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = `${Math.random() * 0.4}s`;
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

        elements.confettiContainer.appendChild(confetti);

        setTimeout(() => confetti.remove(), 3000);
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
