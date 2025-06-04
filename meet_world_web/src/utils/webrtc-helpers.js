
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
        
        // Try importing with explicit path first for better error messages
        try {
          return await import('/node_modules/simple-peer/index.js');
        } catch (specificErr) {
          console.warn('Could not load simple-peer from specific path:', specificErr.message);
          // Fall back to default import
          return await import('simple-peer');
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
