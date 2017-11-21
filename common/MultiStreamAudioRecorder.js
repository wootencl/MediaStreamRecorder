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

    self.audioSourceHash = {};
    self.muted = false; // Indicates whether the stream should be muted or not

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

        self.audioContext.close();
    };

    function getMixedAudioStream() {
        if (arrayOfMediaStreams.length == 0) {
            return;
        }
        // via: @pehrsons
        self.audioContext = new AudioContext();
        self.audioDestination = self.audioContext.createMediaStreamDestination();

        arrayOfMediaStreams.forEach(function(stream) {
            if (!stream.getAudioTracks().length) {
                return;
            }
            var audioSource = self.audioContext.createMediaStreamSource(stream);
            // Store stream for potential deletion later
            self.audioSourceHash[stream.id] = audioSource;
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
            // Special Case: Check if muted prior. If so, mute stream
            if (self.muted) {
                stream.getAudioTracks()[0].enabled = false;
            }

            var audioSource = self.audioContext.createMediaStreamSource(stream);
            // Store stream for potential deletion later
            self.audioSourceHash[stream.id] = audioSource;
            audioSource.connect(self.audioDestination);
        }
    };

    this.removeStream = function(streamToRemove) {
        if (!mediaRecorder || !self.audioSourceHash[streamToRemove.id]) {
            return;
        }
        //Remove from arrayOfMediaStreams
        arrayOfMediaStreams = arrayOfMediaStreams.filter(function(stream) {
            return stream.id != streamToRemove.id;
        });

        self.audioSourceHash[streamToRemove.id].disconnect(self.audioDestination);

        //Delete from `audioSourceHash`
        delete self.audioSourceHash[streamToRemove.id];
    };

    this.ondataavailable = function(blob) {
        if (self.disableLogs) {
            return;
        }
        console.log('ondataavailable', blob);
    };

    this.mute = function() {
        self.muted = true;
        if (arrayOfMediaStreams.length) {
            arrayOfMediaStreams.forEach(function(stream) {
                if (stream.getAudioTracks().length) {
                    stream.getAudioTracks()[0].enabled = false;
                }
            });
        }
    }

    this.unmute = function() {
        self.muted = false;
        if (arrayOfMediaStreams.length) {
            arrayOfMediaStreams.forEach(function(stream) {
                if (stream.getAudioTracks().length) {
                    stream.getAudioTracks()[0].enabled = true;
                }
            });
        }
    }

    this.onstop = function() {};
}

if (typeof MediaStreamRecorder !== 'undefined') {
    MediaStreamRecorder.MultiStreamAudioRecorder = MultiStreamAudioRecorder;
}
