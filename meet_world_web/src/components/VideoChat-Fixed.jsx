import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  MessageCircle, 
  Send,
  Heart,
  X,
  RotateCcw,
  LogOut,
  SkipForward,
  Settings,
  Filter
} from 'lucide-react';
import { setupWebRTC, getWebRTCVersion, initializeAudio } from '../utils/webrtc-helpers';
import WebRTCFallback from './WebRTCFallback';

export default function VideoChat() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [peer, setPeer] = useState(null);
  const peerRef = useRef(null);
  const signalQueueRef = useRef([]);
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [skipNotification, setSkipNotification] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    gender: 'Anyone', // 'Male', 'Female', 'Anyone'
    country: 'Anyone', // User's country or 'Anyone'
    sameCountryOnly: false
  });
  const [roomId, setRoomId] = useState(null);
  const [showAudioUnlock, setShowAudioUnlock] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        console.log('Initializing VideoChat component...');
        
        // ENHANCED: Set up audio context early to allow for user interaction
        try {
          // Initialize audio using our helper
          const audioResult = await initializeAudio();
          
          if (audioResult.success) {
            console.log('Audio system successfully initialized');
            
            // Add event listener to resume audio context on user interaction
            const resumeAudio = async () => {
              try {
                // Try to initialize audio again on user interaction
                const result = await initializeAudio();
                if (result.success) {
                  console.log('Audio context resumed after user interaction');
                }
              } catch (e) {
                console.warn('Error resuming audio on interaction:', e);
              }
            };
            
            // Add multiple event listeners for different user interactions
            document.addEventListener('click', resumeAudio, { once: true });
            document.addEventListener('touchstart', resumeAudio, { once: true });
            document.addEventListener('keypress', resumeAudio, { once: true });
            
            // Create an unlocked audio element that can be played anywhere
            const unlockAudio = document.createElement('audio');
            unlockAudio.autoplay = true;
            unlockAudio.muted = true;
            unlockAudio.src = 'data:audio/mp3;base64,/+MYxAAAAANIAAAAAExBTUUzLjk4LjIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
            document.body.appendChild(unlockAudio);
            
            // Try to play the audio element
            try {
              await unlockAudio.play();
              console.log('Successfully played unlock audio');
            } catch (e) {
              console.warn('Could not auto-play unlock audio:', e);
            } finally {
              // Clean up the element
              setTimeout(() => {
                if (unlockAudio.parentNode) {
                  unlockAudio.parentNode.removeChild(unlockAudio);
                }
              }, 1000);
            }
          } else {
            console.warn('Audio initialization failed:', audioResult.error);
          }
        } catch (e) {
          console.warn('Could not initialize audio context:', e);
        }
        
        // Set up WebRTC environment
        const webRTCHelpers = setupWebRTC();
        console.log('WebRTC support check:', webRTCHelpers.isWebRTCSupported ? 'Supported' : 'Not supported');
        console.log('WebRTC version:', getWebRTCVersion());
        
        if (!webRTCHelpers.isWebRTCSupported) {
          setError('WebRTC is not supported in this browser. Please try Chrome, Firefox, or Safari.');
          return;
        }
        
        // Check authentication
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (!token || !userData) {
          console.log('No auth data found');
          navigate('/login');
          return;
        }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log('User authenticated:', parsedUser);

        // Initialize socket connection
        const { default: io } = await import('socket.io-client');
        
        const newSocket = io('https://meetworldbackend-production.up.railway.app', {
          transports: ['websocket'], // use WebSocket only
          auth: { token }
        });

        newSocket.on('connect', () => {
          console.log('Socket connected');
          setError(null);
        });

        newSocket.on('connect_error', (err) => {
          console.error('Socket error:', err);
          setError(`Connection failed: ${err.message}`);
        });

        newSocket.on('matched', ({ partnerInfo: pInfo, roomId: rId, initiator }) => {
          console.log('Matched with partner:', pInfo, 'in room', rId, 'initiator=', initiator);
          newSocket.emit('join-room', rId);
          setPartnerInfo(pInfo);
          setRoomId(rId);
          // start WebRTC handshake; on peer.connect we’ll set isConnected
          startVideoChat(initiator, rId);
        });

        newSocket.on('signal', async (data) => {
          console.log('Received signal:', data);
          if (peerRef.current) {
            // Extract the actual signal from the data object
            if (data.signal) {
              peerRef.current.signal(data.signal);
            } else {
              peerRef.current.signal(data); // Backward compatibility
            }
          } else {
            console.warn('Queuing signal, peer not initialized yet');
            signalQueueRef.current.push(data.signal || data);
          }
        });

        newSocket.on('partner-disconnected', () => {
          console.log('Partner disconnected');
          handleDisconnect();
        });

        newSocket.on('user-left', () => {
          console.log('Partner skipped to next user');
          setSkipNotification('Your partner moved on to someone else');
          setTimeout(() => setSkipNotification(null), 3000);
          handleDisconnect();
        });

        newSocket.on('chat-message', (message) => {
          console.log('Received message:', message);
          setMessages(prev => [...prev, { ...message, fromPartner: true }]);
          scrollToBottom();
        });

        setSocket(newSocket);
        setIsLoading(false);
        // Auto-request match for two logged-in users
        requestMatch();

        // Cleanup function
        return () => {
          console.log('Cleaning up...');
          if (newSocket) newSocket.disconnect();
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          if (peer) {
            peer.destroy();
          }
        };

      } catch (error) {
        console.error('Initialization error:', error);
        setError(`Initialization failed: ${error.message}`);
        setIsLoading(false);
      }
    };

    initializeComponent();
  }, [navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getUserMedia = async () => {
    try {
      console.log('Requesting media access...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported');
      }
      
      // First list available devices and permissions
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('Available devices:', devices.map(d => ({
          kind: d.kind,
          label: d.label,
          id: d.deviceId
        })));
      } catch (e) {
        console.error('Error listing devices:', e);
      }

      // Request media with working configuration from test
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        },
        audio: true
      });
      
      console.log('Media access granted');
      setStream(mediaStream);
      
      // Enhanced video track setup and monitoring
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        // Enable track and log detailed state
        videoTrack.enabled = true;
        const settings = videoTrack.getSettings();
        console.log('Video track:', {
          enabled: videoTrack.enabled,
          readyState: videoTrack.readyState,
          settings: settings
        });

        // Monitor track state changes
        videoTrack.onended = () => console.log('Video track ended');
        videoTrack.onmute = () => console.log('Video track muted');
        videoTrack.onunmute = () => console.log('Video track unmuted');
      } else {
        console.error('No video track found in media stream');
      }
      
      // Enhanced local video element setup
      if (localVideoRef.current) {
        console.log('Setting up local video');
        
        // Stop any existing tracks
        if (localVideoRef.current.srcObject) {
          const tracks = localVideoRef.current.srcObject.getTracks();
          tracks.forEach(track => track.stop());
        }
        
        // Set new stream
        localVideoRef.current.srcObject = mediaStream;
        
        // Add error handler
        localVideoRef.current.onerror = (e) => {
          console.error('Local video error:', e);
        };

        // Add metadata and state change handlers
        localVideoRef.current.onloadedmetadata = async () => {
          console.log('Local video metadata loaded');
          try {
            await localVideoRef.current.play();
            console.log('Local video playing');
          } catch (err) {
            console.error('Error playing local video:', err);
            // Retry play on user interaction
            localVideoRef.current.onclick = async () => {
              try {
                await localVideoRef.current.play();
                console.log('Local video playing after user interaction');
                localVideoRef.current.onclick = null;
              } catch (e) {
                console.error('Play after click failed:', e);
              }
            };
          }
        };

        // Monitor state changes
        localVideoRef.current.onpause = () => console.log('Local video paused');
        localVideoRef.current.onplay = () => console.log('Local video started playing');
        localVideoRef.current.onwaiting = () => console.log('Local video waiting for data');
      }
      
      return mediaStream;
    } catch (error) {
      console.error('Media access error:', error);
      setError(`Media access failed: ${error.message}`);
      return null;
    }
  };

  // Request a match from the server
  const requestMatch = () => {
    if (socket) {
      setIsConnecting(true);
      setError(null);
      socket.emit('join-video-chat', {
        userInfo: { username: user.username, _id: user._id, gender: user.gender, location: user.location },
        filters
      });
      console.log('Requested video chat match');
    }
  };

  // Step 2: after server match, kick off WebRTC handshake
  // `room` passed from matched event avoids stale state
  const startVideoChat = async (initiator = false, room = null) => {
    try {
      console.log('Starting video chat... initiator=', initiator);
      setError(null);
      
      // Reuse existing stream or request media
      let mediaStream = stream;
      if (!mediaStream) {
        mediaStream = await getUserMedia();
        if (!mediaStream) {
          setIsConnecting(false);
          return;
        }
      }

      // Use the helper to load SimplePeer
      let Peer;
      try {
        // Load simple-peer with the helper function
        console.log('Attempting to import simple-peer with helper...');
        
        const webRTCHelpers = setupWebRTC();
        const SimplePeer = await webRTCHelpers.loadSimplePeer();
        
        console.log('SimplePeer import successful, checking for default export');
        // Check if default export exists before using it
        if (!SimplePeer.default) {
          console.warn('SimplePeer has no default export. Available exports:', Object.keys(SimplePeer));
          // Try CommonJS/UMD fallback
          Peer = SimplePeer;
        } else {
          Peer = SimplePeer.default;
        }
        console.log('SimplePeer initialized successfully');
      } catch (err) {
        console.error('Failed to load simple-peer:', err);
        setError(`Failed to initialize video chat: ${err.message}. Please check your network connection, try disabling any ad blockers, or try a different browser.`);
        setIsConnecting(false);
        return;
      }

      // Configure peer with initiator flag and expanded ICE servers
      const newPeer = new Peer({
        initiator,
        trickle: true, // Enable trickle ICE for better connection success
        stream: mediaStream,
        config: { 
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:global.stun.twilio.com:3478' }
            // Add TURN servers if available for better NAT traversal
            /* Example TURN config:
            {
              urls: 'turn:your-turn-server.com:3478',
              username: 'username',
              credential: 'password'
            }
            */
          ] 
        }
      });
     // store peer instance and flush any queued signals
      peerRef.current = newPeer;
      console.log(`Peer created. Processing ${signalQueueRef.current.length} queued signals`);
      if (signalQueueRef.current.length) {
        // Process each queued signal
        signalQueueRef.current.forEach(sig => {
          try {
            console.log('Applying queued signal:', sig);
            newPeer.signal(sig);
          } catch (err) {
            console.error('Error applying queued signal:', err);
          }
        });
        // Clear the queue
        signalQueueRef.current = [];
      }

      // Add error handling for peer events
      newPeer.on('error', (err) => {
        console.error('Peer connection error:', err);
        setError(`Connection error: ${err.message}. Please try again.`);
        setIsConnecting(false);
      });

      newPeer.on('signal', (data) => {
        console.log('Generated signal data:', data);
        if (socket && room) {
          // Make sure to include the roomId for proper routing
          socket.emit('signal', { 
            roomId: room, 
            signal: data,
            userId: user?._id
          });
        }
      });

      // Listen for connection events
      newPeer.on('connect', () => {
        console.log('Peer connection established successfully');
        setIsConnected(true);
        setIsConnecting(false);
      });

      // Handle peer connection lifecycle events
      newPeer.on('close', () => {
        console.log('Peer connection closed');
        handleDisconnect();
      });
      
      // Log ICE connection state changes for debugging
      newPeer._pc.addEventListener('iceconnectionstatechange', () => {
        console.log('ICE connection state:', newPeer._pc.iceConnectionState);
        
        // Show specific message when ICE fails
        if (newPeer._pc.iceConnectionState === 'failed') {
          console.error('ICE connection failed - possible NAT/firewall issue');
          setError('Connection failed. This may be due to a network issue.');
        }
      });

      // Monitor signaling state
      newPeer._pc.addEventListener('signalingstatechange', () => {
        console.log('Signaling state:', newPeer._pc.signalingState);
      });
      
      // Log when candidates are generated
      newPeer._pc.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
          console.log('ICE candidate generated', event.candidate.candidate.substring(0, 50) + '...');
        }
      });

      // Enhanced stream handling with better error checking
      newPeer.on('stream', async (stream) => {
        console.log('Received remote stream:', stream);
        if (!stream.active) {
          console.error('Received inactive stream');
          return;
        }

        // Log all tracks for debugging
        stream.getTracks().forEach(track => {
          console.log(`Remote ${track.kind} track:`, {
            kind: track.kind,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            settings: track.getSettings()
          });
        });

        // Handle video track
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          console.log('Remote video track settings:', videoTrack.getSettings());
          // Ensure video track is enabled
          videoTrack.enabled = true;
        } else {
          console.warn('No video track in remote stream - might be video-off');
        }

        // IMPROVED AUDIO FIX: Create separate audio element for better audio playback
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          console.log('Remote audio track settings:', audioTrack.getSettings());
          // Make sure audio is enabled
          audioTrack.enabled = true;
          
          // Create a separate audio element for audio playback
          try {
            console.log('CRITICAL: Creating separate audio element for remote audio');
            const audioElement = document.createElement('audio');
            
            // Create a new stream with just the audio track
            const audioStream = new MediaStream([audioTrack]);
            
            // Configure the audio element - fix typo in autoplay (lowercase p)
            audioElement.srcObject = audioStream;
            audioElement.autoplay = true; // Fixed: was autoPlay (uppercase P)
            audioElement.controls = false; // Hidden control
            audioElement.volume = 1.0; // Full volume
            audioElement.muted = false; // Explicitly unmuted
            
            // Set crossOrigin to anonymous to avoid CORS issues on some browsers
            audioElement.crossOrigin = "anonymous";
            
            // Add to DOM with positioning to make it invisible
            audioElement.style.position = 'absolute';
            audioElement.style.opacity = '0';
            audioElement.style.pointerEvents = 'none';
            audioElement.style.height = '1px';
            audioElement.style.width = '1px';
            document.body.appendChild(audioElement);
            
            // Try to resume audio context first if available
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              if (audioCtx.state === 'suspended') {
                audioCtx.resume();
              }
            } catch (err) {
              console.log('AudioContext not available or already running');
            }
            
            // Start playback immediately
            audioElement.play()
              .then(() => {
                console.log('Remote audio playing in separate element');
                // Create an audio visualization to verify audio is working
                try {
                  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                  const source = audioCtx.createMediaStreamSource(audioStream);
                  const analyser = audioCtx.createAnalyser();
                  source.connect(analyser);
                  
                  // Update audio indicator
                  updateAudioIndicator(analyser);
                } catch (visErr) {
                  console.warn('Could not create audio visualization:', visErr);
                }
              })
              .catch(err => {
                console.error('Error playing remote audio:', err);
                
                // Try on user interaction with visual indicator
                setError('Click anywhere to enable audio playback');
                
                const enableAudio = () => {
                  audioElement.play()
                    .then(() => {
                      console.log('Audio playing after user interaction');
                      setError(null);
                    })
                    .catch(e => console.error('Failed to play audio after click:', e));
                };
                
                document.addEventListener('click', enableAudio, { once: true });
                document.addEventListener('touchstart', enableAudio, { once: true });
              });
              
            // Store reference to remove it later
            window._remoteAudioElement = audioElement;
          } catch (err) {
            console.error('Failed to set up separate audio element:', err);
          }
        } else {
          console.warn('No audio track in remote stream - might be audio-off');
        }

        // Set video stream to remote video element (without audio)
        if (remoteVideoRef.current) {
          try {
            // Set stream to video element but keep it muted to avoid doubling the audio
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.muted = true; // CRITICAL: Mute video element since we use separate audio element
            console.log('Remote video element configured with stream');
            
            remoteVideoRef.current.play().catch(err => {
              console.warn('Auto-play of remote video failed, will try on click', err);
              
              // Try to play on user interaction
              remoteVideoRef.current.onclick = () => {
                remoteVideoRef.current.play().catch(e => console.error('Play on click failed:', e));
              };
            });
          } catch (err) {
            console.error('Error attaching stream to video element:', err);
          }
        }

        setRemoteStream(stream);
        setIsConnected(true);
        setIsConnecting(false);
      });

      setPeer(newPeer);
      
    } catch (error) {
      console.error('Error starting video chat:', error);
      setError(`Failed to start video chat: ${error.message}`);
      setIsConnecting(false);
    }
  };

  // Audio visualization helper
  const updateAudioIndicator = (analyser) => {
    if (!analyser || !isConnected) return;
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudio = () => {
      if (!isConnected) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Update indicator if we're still connected
      const indicator = document.getElementById('audio-level-indicator');
      if (indicator) {
        // Show active if sound detected
        if (average > 5) {
          indicator.classList.add('audio-active');
        } else {
          indicator.classList.remove('audio-active');
        }
      }
      
      // Schedule next check if we're still connected
      if (isConnected) {
        requestAnimationFrame(checkAudio);
      }
    };
    
    checkAudio();
  };

  const handleDisconnect = () => {
    console.log('Disconnecting...');
    
    // Clean up peer connection
    if (peer) {
      try {
        peer.removeAllListeners(); // Remove all event listeners
        peer.destroy();
      } catch (err) {
        console.error('Error destroying peer:', err);
      }
      setPeer(null);
      peerRef.current = null;
    }

    // Clean up remote stream
    if (remoteStream) {
      try {
        remoteStream.getTracks().forEach(track => {
          track.stop();
          remoteStream.removeTrack(track);
        });
      } catch (err) {
        console.error('Error cleaning up remote stream:', err);
      }
      setRemoteStream(null);
    }

    // Clean up video elements
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.load(); // Force reload of video element
    }
    
    // CRITICAL: Clean up the separate audio element if it exists
    if (window._remoteAudioElement) {
      try {
        console.log('Cleaning up separate audio element');
        // Stop playback
        window._remoteAudioElement.pause();
        
        // Stop any tracks
        if (window._remoteAudioElement.srcObject) {
          window._remoteAudioElement.srcObject.getTracks().forEach(track => track.stop());
        }
        
        // Remove from DOM
        if (window._remoteAudioElement.parentNode) {
          window._remoteAudioElement.parentNode.removeChild(window._remoteAudioElement);
        }
        
        // Clear reference
        window._remoteAudioElement = null;
      } catch (err) {
        console.error('Error cleaning up audio element:', err);
      }
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setPartnerInfo(null);
    setMessages([]);

    // Log cleanup completion
    console.log('Cleanup completed');
  };

  const findNewPartner = () => {
    handleDisconnect();
    setTimeout(() => {
      startVideoChat();
    }, 500);
  };

  const skipCurrentUser = () => {
    console.log('Skipping current user...');
    
    if (socket && isConnected) {
      // Notify the backend that we're skipping this user
      socket.emit('next-match', {
        roomId: roomId,
        userInfo: {
          username: user.username,
          _id: user._id,
          gender: user.gender,
          location: user.location
        },
        filters: filters
      });
    }
    
    // Disconnect from current user and find new partner
    handleDisconnect();
    
    // Start looking for a new partner after a short delay
    setTimeout(() => {
      startVideoChat();
    }, 500);
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && socket && isConnected) {
      const message = {
        text: newMessage,
        timestamp: new Date(),
        sender: user.username
      };
      
      socket.emit('chat-message', message);
      setMessages(prev => [...prev, { ...message, fromPartner: false }]);
      setNewMessage('');
      scrollToBottom();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const applyFilters = (newFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
    
    // If currently connected, disconnect and find new match with filters
    if (isConnected) {
      handleDisconnect();
      setTimeout(() => {
        startVideoChat();
      }, 500);
    }
  };

  useEffect(() => {
    if (stream && localVideoRef.current) {
      console.log('Setting up local video stream in useEffect');
      
      const setupLocalVideo = async () => {
        try {
          // Ensure any existing stream is cleaned up
          if (localVideoRef.current.srcObject) {
            const oldTracks = localVideoRef.current.srcObject.getTracks();
            oldTracks.forEach(track => track.stop());
          }

          // Set new stream and log state
          localVideoRef.current.srcObject = stream;
          console.log('Local video track state:', {
            tracks: stream.getTracks().map(t => ({
              kind: t.kind,
              enabled: t.enabled,
              readyState: t.readyState,
              muted: t.muted
            }))
          });

          // Wait for metadata and attempt to play
          await new Promise((resolve) => {
            if (localVideoRef.current.readyState >= 2) {
              resolve();
            } else {
              localVideoRef.current.onloadeddata = () => resolve();
            }
          });

          await localVideoRef.current.play();
          console.log('Local video playing successfully');
        } catch (err) {
          console.error('Error setting up local video:', err);
          // Add UI feedback for video errors
          setError(`Video setup error: ${err.message}. Try refreshing the page.`);
        }
      };

      setupLocalVideo();

      // Cleanup function
      return () => {
        if (localVideoRef.current && localVideoRef.current.srcObject) {
          const tracks = localVideoRef.current.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          localVideoRef.current.srcObject = null;
        }
      };
    }
  }, [stream]);      useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log('Setting up remote video stream in useEffect');
      
      const setupRemoteVideo = async () => {
        try {
          // Ensure any existing stream is cleaned up
          if (remoteVideoRef.current.srcObject) {
            const oldTracks = remoteVideoRef.current.srcObject.getTracks();
            oldTracks.forEach(track => track.stop());
          }

          // Set new stream and log state
          remoteVideoRef.current.srcObject = remoteStream;
          
          // Make sure audio tracks are enabled
          const audioTracks = remoteStream.getAudioTracks();
          if (audioTracks.length > 0) {
            audioTracks.forEach(track => {
              track.enabled = true;
              console.log('Remote audio track enabled:', track.id);
            });
          } else {
            console.warn('No audio tracks found in remote stream');
          }
          
          // Log the state of all tracks
          console.log('Remote video track state:', {
            tracks: remoteStream.getTracks().map(t => ({
              kind: t.kind,
              enabled: t.enabled,
              readyState: t.readyState,
              muted: t.muted
            }))
          });

          // Ensure video element is not muted
          remoteVideoRef.current.muted = false;
          console.log('Remote video muted property set to:', remoteVideoRef.current.muted);
          
          // Wait for metadata and attempt to play
          await new Promise((resolve) => {
            if (remoteVideoRef.current.readyState >= 2) {
              resolve();
            } else {
              remoteVideoRef.current.onloadeddata = () => resolve();
            }
          });

          try {
            await remoteVideoRef.current.play();
            console.log('Remote video playing successfully');
          } catch (playErr) {
            console.error('Error auto-playing remote video - may need user interaction:', playErr);
            // Add a visual indicator that user needs to click to enable audio
            setError('Click on the video to enable audio');
            
            // Try to autoplay without sound and then enable sound after user interaction
            remoteVideoRef.current.muted = true;
            await remoteVideoRef.current.play();
            
            // Add click handler to unmute
            const clickHandler = async () => {
              try {
                remoteVideoRef.current.muted = false;
                await remoteVideoRef.current.play();
                console.log('Remote video unmuted after user interaction');
                setError(null);
                // Remove click handler once successful
                remoteVideoRef.current.removeEventListener('click', clickHandler);
              } catch (e) {
                console.error('Failed to unmute on click:', e);
              }
            };
            remoteVideoRef.current.addEventListener('click', clickHandler);
          }
        } catch (err) {
          console.error('Error setting up remote video:', err);
          // Add UI feedback for video errors
          setError(`Remote video setup error: ${err.message}. Try refreshing the page.`);
        }
      };

      setupRemoteVideo();

      // Cleanup function
      return () => {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          const tracks = remoteVideoRef.current.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          remoteVideoRef.current.srcObject = null;
        }
      };
    }
  }, [remoteStream]);

  // Ensure camera preview always gets the stream during connecting state
  useEffect(() => {
    if (isConnecting && stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, [isConnecting, stream]);

  // Ensure local preview in connected state
  useEffect(() => {
    if (isConnected && stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(err => console.error('Error playing local video in connected state', err));
    }
  }, [isConnected, stream]);

  // Ensure remote video playback after connection
  useEffect(() => {
    if (isConnected && remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = false; // Ensure it's not muted
      
      // Try to play the video and handle autoplay restrictions
      const playVideo = async () => {
        try {
          await remoteVideoRef.current.play();
          console.log('Remote video playing in connected state');
        } catch (err) {
          console.error('Error playing remote video in connected state - might need user interaction:', err);
          
          // Add click-to-play functionality
          const handleClick = async () => {
            try {
              remoteVideoRef.current.muted = false; // Ensure unmuted on click
              await remoteVideoRef.current.play();
              console.log('Remote video playing after user interaction');
              setError(null); // Clear any error message
              document.removeEventListener('click', handleClick);
            } catch (clickErr) {
              console.error('Error playing on click:', clickErr);
            }
          };
          
          // Add a visual indicator that user needs to interact
          setError('Click anywhere to enable audio and video');
          document.addEventListener('click', handleClick, { once: true });
        }
      };
      
      playVideo();
    }
  }, [isConnected, remoteStream]);

  // Handle manual audio unlock
  const unlockAudio = async () => {
    console.log('Manual audio unlock requested');
    try {
      // Try direct audio context initialization
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      await ctx.resume();
      
      // Try to play the hidden audio element if it exists
      if (window._remoteAudioElement) {
        window._remoteAudioElement.play()
          .then(() => {
            console.log('Successfully played remote audio');
            setShowAudioUnlock(false);
          })
          .catch(e => console.error('Failed to play audio after unlock:', e));
      }
      
      // Initialize audio system
      await initializeAudio();
      
      setShowAudioUnlock(false);
    } catch (err) {
      console.error('Manual audio unlock failed:', err);
    }
  };
  
  // Show unlock button if audio doesn't play within 5 seconds of connection
  useEffect(() => {
    let timer;
    if (isConnected) {
      timer = setTimeout(() => {
        // Check if we might need audio unlock
        if (window._remoteAudioElement) {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          if (audioCtx.state === 'suspended') {
            setShowAudioUnlock(true);
          }
        }
      }, 5000);
    }
    
    return () => clearTimeout(timer);
  }, [isConnected]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading VideoChat...</div>
        </div>
      </div>
    );
  }

  if (error) {
    // Special handling for WebRTC connection errors
    if (error.includes('WebRTC') || error.includes('video chat') || error.includes('simple-peer')) {
      return (
        <WebRTCFallback 
          onRetry={() => window.location.reload()} 
          errorMessage={error}
        />
      );
    }
    
    // Standard error display for other errors
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️ Error</div>
          <div className="text-white text-lg mb-6">{error}</div>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors text-white"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">No user data available...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Connection Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Gender Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Gender Preference</label>
                <select
                  value={filters.gender}
                  onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Anyone">Anyone</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* Country Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Location Preference</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.sameCountryOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, sameCountryOnly: e.target.checked }))}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Same country only ({user?.location || 'Unknown'})</span>
                  </label>
                </div>
              </div>

              {/* Current Filters Display */}
              <div className="bg-gray-700 p-3 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Current Filters:</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Gender: {filters.gender}</li>
                  <li>• Location: {filters.sameCountryOnly ? `${user?.location || 'Unknown'} only` : 'Anywhere'}</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => applyFilters(filters)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  setFilters({ gender: 'Anyone', country: 'Anyone', sameCountryOnly: false });
                  applyFilters({ gender: 'Anyone', country: 'Anyone', sameCountryOnly: false });
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Notification */}
      {skipNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white px-6 py-3 rounded-lg z-40">
          {skipNotification}
        </div>
      )}
      
      {/* Audio Unlock Button */}
      {showAudioUnlock && isConnected && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-600/90 text-white px-6 py-3 rounded-lg z-40 shadow-lg flex items-center space-x-2">
          <span>Can't hear audio?</span>
          <button 
            onClick={unlockAudio}
            className="bg-white text-blue-600 px-3 py-1 rounded-md font-medium hover:bg-blue-50 transition-colors"
          >
            Click to Enable Audio
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div className="flex items-center">
          <Heart className="text-red-400 w-6 h-6 mr-2" />
          <h1 className="text-xl font-bold">Meet World Video Chat</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {(filters.gender !== 'Anyone' || filters.sameCountryOnly) && (
              <span className="ml-2 bg-red-500 text-xs px-2 py-1 rounded-full">•</span>
            )}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Video Section */}
        <div className="flex-1 relative">
          {!isConnected && !isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <Heart className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-4">Ready to meet someone new?</h2>
                <p className="text-gray-400 mb-6">Start a video chat and connect with people around the world</p>
                
                {/* Local preview after enabling camera */}
                {stream && (
                  <div className="w-48 h-36 mx-auto mb-6 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600 relative">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                  </div>
                )}
                
                {/* Active Filters Display */}
                {(filters.gender !== 'Anyone' || filters.sameCountryOnly) && (
                  <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 mb-4 inline-block">
                    <p className="text-blue-300 text-sm mb-1">Active Filters:</p>
                    <div className="text-blue-200 text-xs space-y-1">
                      {filters.gender !== 'Anyone' && (
                        <div>• Looking for: {filters.gender}</div>
                      )}
                      {filters.sameCountryOnly && (
                        <div>• Location: {user?.location || 'Unknown'} only</div>
                      )}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={requestMatch}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-semibold text-lg transition-colors"
                >
                  Start Video Chat
                </button>
              </div>
            </div>
          )}

          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                {/* Camera Preview */}
                {stream && (
                  <div className="w-64 h-48 mx-auto mb-6 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600 relative">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                  </div>
                )}
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
                <p className="text-lg mb-2">Connecting you with someone...</p>
                {(filters.gender !== 'Anyone' || filters.sameCountryOnly) && (
                  <div className="text-gray-400 text-sm">
                    Looking for {filters.gender === 'Anyone' ? 'anyone' : filters.gender.toLowerCase()}
                    {filters.sameCountryOnly && ` from ${user?.location || 'your country'}`}
                  </div>
                )}
              </div>
            </div>
          )}

          {isConnected && (
            <>
              {/* Remote Video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={true} /* CRITICAL: Keep video muted to avoid audio issues, we're using separate audio element */
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                onError={(e) => {
                  console.error('Remote video error:', e);
                  setError('Remote video error. Please try refreshing.');
                }}
                onLoadedData={() => console.log('Remote video data loaded')}
                onPlaying={() => console.log('Remote video playing')}
                onStalled={() => console.log('Remote video stalled')}
              />
              
              {/* Enhanced Audio Indicator - Visual feedback with live level detection */}
              <div id="audio-level-indicator" className="absolute bottom-32 left-4 bg-black/60 backdrop-blur-sm rounded-full p-2 transition-all duration-200">
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-4 bg-green-400/50 rounded-full transition-all duration-100"></div>
                  <div className="w-1 h-6 bg-green-400/50 rounded-full transition-all duration-100"></div>
                  <div className="w-1 h-8 bg-green-400/50 rounded-full transition-all duration-100"></div>
                  <div className="w-1 h-5 bg-green-400/50 rounded-full transition-all duration-100"></div>
                  <div className="w-1 h-3 bg-green-400/50 rounded-full transition-all duration-100"></div>
                  <span className="text-xs text-white ml-1">Audio</span>
                </div>
              </div>
              
              {/* Add CSS for audio indicator */}
              <style jsx>{`
                #audio-level-indicator.audio-active div {
                  background-color: rgb(74, 222, 128);
                  animation: pulse 0.5s infinite alternate;
                }
                @keyframes pulse {
                  0% { opacity: 0.7; }
                  100% { opacity: 1; }
                }
              `}</style>
              
              {/* Local Video (Picture in Picture) */}
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                  onError={(e) => {
                    console.error('Local video error:', e);
                    setError('Local video error. Please try refreshing.');
                  }}
                  onLoadedData={() => console.log('Local video data loaded')}
                  onPlaying={() => console.log('Local video playing')}
                  onStalled={() => console.log('Local video stalled')}
                />
              </div>

              {/* Partner Info */}
              {partnerInfo && (
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-white font-semibold">{partnerInfo.username}</p>
                  <div className="text-gray-300 text-sm mt-1 space-y-1">
                    {partnerInfo.gender && (
                      <div className="flex items-center">
                        <span className="text-blue-400">•</span>
                        <span className="ml-1">{partnerInfo.gender}</span>
                      </div>
                    )}
                    {partnerInfo.location && (
                      <div className="flex items-center">
                        <span className="text-green-400">•</span>
                        <span className="ml-1">{partnerInfo.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chat Panel - Always visible when connected */}
              <div className="absolute bottom-20 right-4 w-80 h-96 bg-black/70 backdrop-blur-sm rounded-lg border border-gray-600 flex flex-col">
                {/* Chat Header */}
                <div className="p-3 border-b border-gray-600 flex justify-between items-center">
                  <h3 className="font-semibold text-white text-sm">Chat with {partnerInfo?.username}</h3>
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm mt-8">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Start a conversation!</p>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.fromPartner ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[200px] px-3 py-2 rounded-lg text-sm ${
                            message.fromPartner
                              ? 'bg-gray-700/80 text-white'
                              : 'bg-blue-600/80 text-white'
                          }`}
                        >
                          <p>{message.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-3 border-t border-gray-600">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 bg-gray-800/80 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
                    />
                    <button
                      onClick={sendMessage}
                      className="px-3 py-2 bg-blue-600/80 hover:bg-blue-700/80 rounded-lg transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Video Controls */}
          {stream && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  isVideoEnabled ? 'bg-gray-700/80 hover:bg-gray-600/80' : 'bg-red-600/80 hover:bg-red-700/80'
                }`}
                title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>
              
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  isAudioEnabled ? 'bg-gray-700/80 hover:bg-gray-600/80' : 'bg-red-600/80 hover:bg-red-700/80'
                }`}
                title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>

              {isConnected && (
                <button
                  onClick={skipCurrentUser}
                  className="p-3 rounded-full bg-blue-600/80 hover:bg-blue-700/80 transition-colors"
                  title="Skip to next person"
                >
                  <SkipForward className="w-6 h-6" />
                </button>
              )}

              {isConnected ? (
                <>
                  <button
                    onClick={findNewPartner}
                    className="p-3 rounded-full bg-green-600/80 hover:bg-green-700/80 transition-colors"
                    title="Find new partner"
                  >
                    <RotateCcw className="w-6 h-6" />
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="p-3 rounded-full bg-red-600/80 hover:bg-red-700/80 transition-colors"
                    title="End call"
                  >
                    <Phone className="w-6 h-6 transform rotate-[135deg]" />
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Emergency Audio Unlock Button */}
      {showAudioUnlock && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-semibold">Audio is locked. Click to unlock and enable audio playback.</span>
          </div>
          <button
            onClick={unlockAudio}
            className="mt-2 px-4 py-2 bg-white text-green-600 rounded-lg font-semibold transition-colors hover:bg-gray-100"
          >
            Unlock Audio
          </button>
        </div>
      )}
    </div>
  );
}
