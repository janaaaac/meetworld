/**
 * WebRTC helper functions to ensure proper setup and compatibility
 */

// Global setup that should run before using WebRTC
export function setupWebRTC() {
  // Ensure global is defined for libraries that expect it
  if (typeof global === 'undefined') {
    window.global = window;
  }
  
  // Add necessary polyfills for WebRTC dependencies
  if (typeof window.process === 'undefined') {
    window.process = { env: {} };
  }
  
  // Check if WebRTC is supported
  const isWebRTCSupported = Boolean(
    window.RTCPeerConnection && 
    window.RTCSessionDescription &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
  
  return {
    isWebRTCSupported,
    getUserMedia: async (constraints = { video: true, audio: true }) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.error('Media access error:', err);
        throw err;
      }
    },
    
    // Helper to load simple-peer with better error handling
    loadSimplePeer: async () => {
      try {
        // Ensure Buffer is available for simple-peer
        if (typeof window.Buffer === 'undefined') {
          const bufferModule = await import('buffer/');
          window.Buffer = bufferModule.Buffer;
        }
        
        // Just use the default import path - the explicit path causes 404 errors
        try {
          return await import('simple-peer');
        } catch (err) {
          console.error('Could not load simple-peer:', err.message);
          throw new Error('Failed to load WebRTC peer library. Please check your network connection and try again.');
        }
      } catch (err) {
        console.error('Failed to load simple-peer:', err);
        throw err;
      }
    }
  };
}

// Check what version of WebRTC is being used (helpful for debugging)
export function getWebRTCVersion() {
  const rtcPeerConnection = window.RTCPeerConnection || 
                           window.webkitRTCPeerConnection || 
                           window.mozRTCPeerConnection;
  
  if (!rtcPeerConnection) {
    return 'WebRTC not supported';
  }
  
  // Try to determine version/implementation
  let version = 'Unknown';
  
  // Check for adapter.js
  if (window.adapter && window.adapter.browserDetails) {
    version = `${window.adapter.browserDetails.browser} ${window.adapter.browserDetails.version}`;
  } else {
    // Try to determine from user agent
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) {
      const chromeMatch = ua.match(/Chrome\/(\d+)/);
      if (chromeMatch) version = `Chrome ${chromeMatch[1]}`;
    } else if (ua.includes('Firefox')) {
      const firefoxMatch = ua.match(/Firefox\/(\d+)/);
      if (firefoxMatch) version = `Firefox ${firefoxMatch[1]}`;
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      const safariMatch = ua.match(/Version\/(\d+)/);
      if (safariMatch) version = `Safari ${safariMatch[1]}`;
    }
  }
  
  return version;
}

// Add helper for audio initialization
export async function initializeAudio() {
  try {
    console.log('Initializing audio subsystem...');
    
    // Create an audio context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      throw new Error('AudioContext not supported in this browser');
    }
    
    const audioCtx = new AudioContext();
    console.log('AudioContext state:', audioCtx.state);
    
    // If context is in suspended state, try to resume it
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
        console.log('AudioContext resumed:', audioCtx.state);
      } catch (resumeErr) {
        console.warn('Could not resume AudioContext:', resumeErr);
      }
    }
    
    // Create a silent oscillator to "warm up" the audio system
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    // Set the gain to 0 (silent)
    gainNode.gain.value = 0;
    
    // Connect and start the oscillator
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.001); // Stop after 1ms
    
    return {
      success: true,
      context: audioCtx
    };
  } catch (err) {
    console.error('Error initializing audio:', err);
    return {
      success: false,
      error: err.message
    };
  }
}
