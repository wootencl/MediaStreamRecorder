// ______________________
// MultiStreamAudioRecorder.js

function MultiStreamAudioRecorder(arrayOfMediaStreams) {
    if (arrayOfMediaStreams instanceof MediaStream) {
        arrayOfMediaStreams = [arrayOfMediaStreams];
    }
    var self = this;

    if (!this.mimeType) {
        this.mimeType = 'audio/wav';
    }

    this.start = function(timeSlice) {
        isStoppedRecording = false;

        var mixedAudioStream = getMixedAudioStream();

        mediaRecorder = new MediaStreamRecorder(mixedAudioStream);

        for (var prop in self) {
            if (typeof self[prop] !== 'function') {
                mediaRecorder[prop] = self[prop];
            }
        }

        mediaRecorder.ondataavailable = function(blob) {
            self.ondataavailable(blob);
        };

        mediaRecorder.onstop = self.onstop;

        drawVideosToCanvas();

        mediaRecorder.start(timeSlice);
    };

    this.stop = function(callback) {
        isStoppedRecording = true;

        if (!mediaRecorder) {
            return;
        }

        mediaRecorder.stop(function(blob) {
            callback(blob);
        });
    };

    function getMixedAudioStream() {
        // via: @pehrsons
        self.audioContext = new AudioContext();
        var audioSources = [];

        var audioTracksLength = 0;
        arrayOfMediaStreams.forEach(function(stream) {
            if (!stream.getAudioTracks().length) {
                return;
            }

            audioTracksLength++;

            audioSources.push(self.audioContext.createMediaStreamSource(stream));
        });

        if (!audioTracksLength) {
            return;
        }

        self.audioDestination = self.audioContext.createMediaStreamDestination();
        audioSources.forEach(function(audioSource) {
            audioSource.connect(self.audioDestination);
        });
        return self.audioDestination.stream;
    }

    var mediaRecorder;

    var isStoppedRecording = false;

    this.pause = function() {
        if (mediaRecorder) {
            mediaRecorder.pause();
        }
    };

    this.resume = function() {
        if (mediaRecorder) {
            mediaRecorder.resume();
        }
    };

    this.clearRecordedData = function() {
        isStoppedRecording = false;
        mediaRecorder = null;

        if (mediaRecorder) {
            mediaRecorder.clearRecordedData();
        }
    };

    this.addStream = function(stream) {
        if (stream instanceof Array && stream.length) {
            stream.forEach(this.addStream);
            return;
        }
        arrayOfMediaStreams.push(stream);

        if (!mediaRecorder) {
            return;
        }

        if (stream.getAudioTracks().length && self.audioContext) {
            var audioSource = self.audioContext.createMediaStreamSource(stream);
            audioSource.connect(self.audioDestination);
        }
    };

    this.ondataavailable = function(blob) {
        if (self.disableLogs) {
            return;
        }
        console.log('ondataavailable', blob);
    };

    this.onstop = function() {};
}

if (typeof MediaStreamRecorder !== 'undefined') {
    MediaStreamRecorder.MultiStreamAudioRecorder = MultiStreamAudioRecorder;
}