import { useState, useEffect } from 'react';

export default function WebRTCFallback({ onRetry, errorMessage }) {
  const [browserInfo, setBrowserInfo] = useState(null);
  
  useEffect(() => {
    // Get browser info for troubleshooting
    const ua = navigator.userAgent;
    let browserName = "Unknown";
    let browserVersion = "Unknown";
    
    if (ua.includes("Chrome")) {
      browserName = "Chrome";
      browserVersion = ua.match(/Chrome\/([0-9.]+)/)[1];
    } else if (ua.includes("Firefox")) {
      browserName = "Firefox";
      browserVersion = ua.match(/Firefox\/([0-9.]+)/)[1];
    } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
      browserName = "Safari";
      browserVersion = ua.match(/Version\/([0-9.]+)/)[1];
    } else if (ua.includes("Edge")) {
      browserName = "Edge";
      browserVersion = ua.match(/Edge\/([0-9.]+)/)[1];
    }
    
    // Check for WebRTC support
    const isWebRTCSupported = Boolean(
      window.RTCPeerConnection && 
      window.RTCSessionDescription &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
    
    setBrowserInfo({
      browserName,
      browserVersion,
      isWebRTCSupported,
      isMobile: /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua)
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-xl max-w-md w-full mx-4">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          
          <h2 className="text-xl font-semibold text-white mb-2">
            Video Chat Connection Error
          </h2>
          
          <p className="text-gray-300 mb-6">
            {errorMessage || "We couldn't establish a WebRTC connection for video chat."}
          </p>
          
          {browserInfo && (
            <div className="bg-gray-700 p-4 rounded-lg text-left mb-6">
              <h3 className="text-white font-medium mb-2">Troubleshooting Information</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Browser: {browserInfo.browserName} {browserInfo.browserVersion}</li>
                <li>• WebRTC Support: {browserInfo.isWebRTCSupported ? "Yes" : "No"}</li>
                <li>• Device Type: {browserInfo.isMobile ? "Mobile" : "Desktop"}</li>
              </ul>
              
              {!browserInfo.isWebRTCSupported && (
                <div className="mt-3 p-2 bg-yellow-900/50 border border-yellow-700/50 rounded text-yellow-200 text-xs">
                  Your browser doesn't support WebRTC technology required for video chat. Please try a different browser like Chrome or Firefox.
                </div>
              )}
              
              {browserInfo.browserName === "Safari" && (
                <div className="mt-3 p-2 bg-blue-900/50 border border-blue-700/50 rounded text-blue-200 text-xs">
                  Safari has limited WebRTC support. Try enabling WebRTC in your Safari settings or switch to Chrome or Firefox for the best experience.
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-3">
            <button 
              onClick={onRetry}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
            >
              Try Again
            </button>
            
            <a
              href="https://webrtc.org/getting-started/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
            >
              Learn About WebRTC Compatibility
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
