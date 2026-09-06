const VoiceAssistant = {
  recognition: null,
  isListening: false,

  init(onResultCallback, onStatusCallback) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser.");
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (onStatusCallback) onStatusCallback(true);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onStatusCallback) onStatusCallback(false);
    };

    this.recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResultCallback) onResultCallback(transcript);
    };

    return true;
  },

  startListening(lang = "hi-IN") {
    if (!this.recognition) return;
    try {
      this.recognition.lang = lang === "mr" ? "mr-IN" : (lang === "en" ? "en-IN" : "hi-IN");
      this.recognition.start();
    } catch (e) {
      console.error("Speech recognition start failed:", e);
    }
  },

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  },

  speak(text, lang = "hi") {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "mr" ? "mr-IN" : (lang === "en" ? "en-IN" : "hi-IN");
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }
};

window.VoiceAssistant = VoiceAssistant;
