(function() {
    function sendLog(type, message) {
        window.postMessage({
            source: 'spotify-ex-enhancer',
            type: type,      
            message: message,
            timestamp: Date.now()
        }, '*');
    }
    sendLog('info', 'Extension injected & active on Spotify.');
    let lastUserInteractionTime = Date.now();
    const updateInteractionTime = () => { lastUserInteractionTime = Date.now(); };
    document.addEventListener('click', updateInteractionTime, true);
    document.addEventListener('keydown', updateInteractionTime, true);
    document.addEventListener('keydown', (e) => {
        if (['MediaPlayPause', 'MediaPause', 'MediaStop'].includes(e.key)) {
            sendLog('info', `Media key detected: ${e.key} — treating as user action.`);
            updateInteractionTime();
        }
    }, true);

    if (navigator.mediaSession) {
        const originalSetActionHandler = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession);

        navigator.mediaSession.setActionHandler = function(action, handler) {
            if ((action === 'pause' || action === 'stop') && handler) {
                const wrappedHandler = function(...args) {
                    sendLog('info', `MediaSession "${action}" fired (headphone/OS button) — treating as user action.`);
                    updateInteractionTime(); 
                    return handler.apply(this, args);
                };
                return originalSetActionHandler(action, wrappedHandler);
            }
            return originalSetActionHandler(action, handler);
        };

        sendLog('info', 'MediaSession API intercepted — headphone buttons will be respected.');
    }


    const originalVolumeDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');

    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
        get: function() {
            return originalVolumeDescriptor.get.call(this);
        },
        set: function(value) {
            if (value < 1.0) {
                sendLog('block', `Volume change to ${Math.round(value * 100)}% blocked → forced to 100%.`);
            }
            originalVolumeDescriptor.set.call(this, 1.0);
        }
    });

    const enforceVolume = (e) => {
        if (e.target instanceof HTMLMediaElement && e.target.volume !== 1.0) {
            sendLog('block', 'Volume drift detected via event — corrected to 100%.');
            originalVolumeDescriptor.set.call(e.target, 1.0);
        }
    };

    document.addEventListener('play', enforceVolume, true);
    document.addEventListener('volumechange', enforceVolume, true);

    setInterval(() => {
        document.querySelectorAll('audio, video').forEach(media => {
            if (media.volume !== 1.0) {
                sendLog('block', 'Volume drift detected via sweep — corrected to 100%.');
                originalVolumeDescriptor.set.call(media, 1.0);
            }
        });
    }, 2000);


    const originalPause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function() {
        const timeSinceInteraction = Date.now() - lastUserInteractionTime;

        const result = originalPause.apply(this, arguments);

        if (timeSinceInteraction > 1500) {
       
            sendLog('resume', `External pause detected (${Math.round(timeSinceInteraction / 1000)}s since last input). Auto-resuming...`);

            setTimeout(() => {
                this.play()
                    .then(() => { sendLog('info', 'Auto-resume successful!'); })
                    .catch(e => { sendLog('error', `Auto-resume failed: ${e.message}`); });
            }, 50);
        } else {
            sendLog('info', 'User-initiated pause — allowing it.');
        }

        return result;
    };

})();
