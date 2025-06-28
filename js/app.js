/**
 * Voice-Enabled To-Do List Application
 * Utilizes Web Speech API for voice recognition and localStorage for persistence
 */

class VoiceTodoApp {
    constructor() {
        this.tasks = this.loadTasks();
        this.recognition = null;
        this.isListening = false;
        
        this.initElements();
        this.initSpeechRecognition();
        this.bindEvents();
        this.renderTasks();
        this.updateStats();
        this.updateCharCount();
    }

    /**
     * Initialize DOM elements
     */
    initElements() {
        this.voiceButton = document.getElementById('voiceButton');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.taskInput = document.getElementById('taskInput');
        this.addButton = document.getElementById('addButton');
        this.taskList = document.getElementById('taskList');
        this.totalTasks = document.getElementById('totalTasks');
        this.completedTasks = document.getElementById('completedTasks');
        this.pendingTasks = document.getElementById('pendingTasks');
        this.charCount = document.getElementById('char-count');
    }

    /**
     * Initialize Web Speech API
     */
    initSpeechRecognition() {
        // Check for Web Speech API support
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Configure speech recognition
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = navigator.language || 'en-US';
            this.recognition.maxAlternatives = 1;

            this.setupSpeechEventHandlers();
        } else {
            this.handleUnsupportedBrowser();
        }
    }

    /**
     * Setup speech recognition event handlers
     */
    setupSpeechEventHandlers() {
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateVoiceButton(true);
            this.updateVoiceStatus('Listening... Speak your task now!', 'listening');
        };

        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };

        this.recognition.onerror = (event) => {
            this.handleSpeechError(event);
        };

        this.recognition.onend = () => {
            this.resetVoiceButton();
        };
    }

    /**
     * Handle speech recognition results
     */
    handleSpeechResult(event) {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // Show interim results
        if (interimTranscript) {
            this.updateVoiceStatus(`Hearing: "${interimTranscript}"`, 'listening');
        }

        // Process final results
        if (finalTranscript) {
            const task = finalTranscript.trim();
            if (task && task.length > 0) {
                this.addTask(task, true);
                this.updateVoiceStatus(`✅ Added: "${task}"`, 'success');
                this.announceToScreenReader(`Task added: ${task}`);
            } else {
                this.updateVoiceStatus('No valid task detected. Please try again.', 'error');
            }
        }
    }

    /**
     * Handle speech recognition errors
     */
    handleSpeechError(event) {
        this.resetVoiceButton();
        let errorMessage = 'Voice recognition error occurred.';
        
        switch(event.error) {
            case 'no-speech':
                errorMessage = 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage = 'No microphone found. Please check your microphone.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow microphone access and reload the page.';
                break;
            case 'network':
                errorMessage = 'Network error occurred. Please check your internet connection.';
                break;
            case 'service-not-allowed':
                errorMessage = 'Speech recognition service not allowed. Please check your browser settings.';
                break;
            default:
                errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        this.updateVoiceStatus(errorMessage, 'error');
        console.error('Speech recognition error:', event.error);
    }

    /**
     * Handle unsupported browser
     */
    handleUnsupportedBrowser() {
        this.voiceButton.style.display = 'none';
        this.voiceStatus.innerHTML = `
            <div class="browser-support">
                ⚠️ Voice recognition is not supported in this browser. 
                Please use Chrome, Edge, or Safari for voice features.
                You can still add tasks manually using the text input below.
            </div>
        `;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Voice button
        this.voiceButton.addEventListener('click', () => {
            if (this.isListening) {
                this.stopVoiceRecognition();
            } else {
                this.startVoiceRecognition();
            }
        });

        // Manual input
        this.addButton.addEventListener('click', () => {
            this.addTaskFromInput();
        });

        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addTaskFromInput();
            }
        });

        this.taskInput.addEventListener('input', () => {
            this.updateCharCount();
            this.validateInput();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + M for voice input
            if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                if (this.recognition && !this.isListening) {
                    this.startVoiceRecognition();
                }
            }
        });
    }

    /**
     * Start voice recognition
     */
    startVoiceRecognition() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Failed to start voice recognition:', error);
                this.updateVoiceStatus('Voice recognition is already active or unavailable.', 'error');
            }
        }
    }

    /**
     * Stop voice recognition
     */
    stopVoiceRecognition() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    /**
     * Update voice button state
     */
    updateVoiceButton(listening) {
        if (listening) {
            this.voiceButton.textContent = '🛑 Stop Listening';
            this.voiceButton.classList.add('listening');
            this.voiceButton.setAttribute('aria-label', 'Stop voice input');
        } else {
            this.resetVoiceButton();
        }
    }

    /**
     * Reset voice button to default state
     */
    resetVoiceButton() {
        this.isListening = false;
        this.voiceButton.textContent = '🎤 Start Voice Input';
        this.voiceButton.classList.remove('listening');
        this.voiceButton.setAttribute('aria-label', 'Start voice input');
    }

    /**
     * Update voice status message
     */
    updateVoiceStatus(message, type = 'default') {
        this.voiceStatus.textContent = message;
        this.voiceStatus.className = 'voice-status';
        if (type !== 'default') {
            this.voiceStatus.classList.add(type);
        }
    }

    /**
     * Add task from manual input
     */
    addTaskFromInput() {
        const task = this.taskInput.value.trim();
        if (task && this.validateTaskLength(task)) {
            this.addTask(task);
            this.taskInput.value = '';
            this.updateCharCount();
            this.taskInput.focus();
        } else if (!task) {
            this.taskInput.focus();
        }
    }

    /**
     * Validate task length
     */
    validateTaskLength(task) {
        if (task.length > 200) {
            alert('Task is too long. Please keep it under 200 characters.');
            return false;
        }
        return true;
    }

    /**
     * Validate input as user types
     */
    validateInput() {
        const value = this.taskInput.value;
        const remaining = 200 - value.length;
        
        if (remaining < 0) {
            this.taskInput.style.borderColor = '#e74c3c';
            this.addButton.disabled = true;
        } else if (remaining < 20) {
            this.taskInput.style.borderColor = '#f39c12';
            this.addButton.disabled = false;
        } else {
            this.taskInput.style.borderColor = '#e0e0e0';
            this.addButton.disabled = false;
        }
    }

    /**
     * Update character count display
     */
    updateCharCount() {
        const current = this.taskInput.value.length;
        const max = 200;
        const remaining = max - current;
        
        this.charCount.textContent = `${current}/${max} characters`;
        
        if (remaining < 0) {
            this.charCount.style.color = '#e74c3c';
        } else if (remaining < 20) {
            this.charCount.style.color = '#f39c12';
        } else {
            this.charCount.style.color = '#666';
        }
    }

    /**
     * Add a new task
     */
    addTask(text, isVoice = false) {
        if (!this.validateTaskLength(text)) {
            return;
        }

        const task = {
            id: Date.now()
