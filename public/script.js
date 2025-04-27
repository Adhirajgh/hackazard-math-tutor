document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    const processImageButton = document.getElementById('processImage');
    const problemTextDiv = document.getElementById('problemText');
    const solutionTextDiv = document.getElementById('solutionText');

    // **Image Processing (OCR with Tesseract.js)**
    processImageButton.addEventListener('click', async () => {
        const file = imageUpload.files[0];
        if (file) {
            problemTextDiv.textContent = 'Processing image...';
            try {
                const { data: { text } } = await Tesseract.recognize(
                    file,
                    'eng', // Specify the language
                    { logger: m => console.log(m) } // Optional logger
                );
                problemTextDiv.textContent = text;
                sendProblemToBackend(text);
            } catch (error) {
                console.error('Error during OCR:', error);
                problemTextDiv.textContent = 'Error processing image. Please try again.';
            }
        } else {
            alert('Please select an image file.');
        }
    });

    // **Voice Input (Web Speech API)**
    const startVoiceButton = document.getElementById('startVoice');
    const stopVoiceButton = document.getElementById('stopVoice');
    const voiceOutputDiv = document.getElementById('voiceOutput');
    let recognition;

    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            voiceOutputDiv.textContent = 'Listening...';
            startVoiceButton.disabled = true;
            stopVoiceButton.disabled = false;
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            voiceOutputDiv.textContent = `You said: ${transcript}`;
            problemTextDiv.textContent = transcript;
            sendProblemToBackend(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            voiceOutputDiv.textContent = 'Speech recognition error. Please try again.';
            startVoiceButton.disabled = false;
            stopVoiceButton.disabled = true;
        };

        recognition.onend = () => {
            startVoiceButton.disabled = false;
            stopVoiceButton.disabled = true;
        };

        startVoiceButton.addEventListener('click', () => {
            recognition.start();
        });

        stopVoiceButton.addEventListener('click', () => {
            recognition.stop();
        });
    } else {
        voiceOutputDiv.textContent = 'Speech recognition is not supported in this browser.';
        startVoiceButton.disabled = true;
    }

    // **Function to Send Problem to Backend**
    async function sendProblemToBackend(problem) {
        const solutionTextDiv = document.getElementById('solutionText'); // Get the correct element


        solutionTextDiv.textContent = 'Solving...';
        try {
            const response = await fetch('http://localhost:3000/api/solve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ problem }),
            });

            if (response.ok) {
                const data = await response.json();
                solutionTextDiv.textContent = data.solution;
            } else {
                solutionTextDiv.textContent = 'Error communicating with the server.';
                console.error('Server error:', response.status);
            }
        } catch (error) {
            solutionTextDiv.textContent = 'Network error.';
            console.error('Network error:', error);
        }
    }
});
