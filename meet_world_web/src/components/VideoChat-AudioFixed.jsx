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
  Filter
} from 'lucide-react';

export default function VideoChat() {
  // State variables
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
    gender: 'Anyone',
    country: 'Anyone',
    sameCountryOnly: false
  });
  const [roomId, setRoomId] = useState(null);
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const audioContext = useRef(null);
  const audioDestination = useRef(null);
  const remoteAudioNode = useRef(null);
  
  const navigate = useNavigate();

  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        console.log('Initializing VideoChat component...');
        
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
          transports: ['websocket', 'polling'], 
          auth: { token }
        });

        // Socket event handlers
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
          // Start WebRTC handshake
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
        
        // Initialize AudioContext for processing audio
        try {
          audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
          audioDestination.current = audioContext.current.createMediaStreamDestination();
          console.log('Audio context initialized');
        } catch (e) {
          console.error('Failed to create audio context:', e);
        }
        
        // Auto-request match
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
          if (audioContext.current && audioContext.current.state !== 'closed') {
            audioContext.current.close();
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

      // Request media with working configuration
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
      }
      
      // Set up local video element
      if (localVideoRef.current) {
        console.log('Setting up local video');
        localVideoRef.current.srcObject = mediaStream;
        localVideoRef.current.onloadedmetadata = async () => {
          try {
            await localVideoRef.current.play();
            console.log('Local video playing');
          } catch (err) {
            console.error('Error playing local video:', err);
          }
        };
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
        userInfo: { username: user?.username, _id: user?._id, gender: user?.gender, location: user?.location },
        filters
      });
      console.log('Requested video chat match');
    }
  };

  // Initialize WebRTC peer connection
  const startVideoChat = async (initiator = false, room = null) => {
    try {
      console.log('Starting video chat... initiator=', initiator);
      setError(null);
      
      // Get user media stream
      let mediaStream = stream;
      if (!mediaStream) {
        mediaStream = await getUserMedia();
        if (!mediaStream) {
          setIsConnecting(false);
          return;
        }
      }

      // Import SimplePeer
      let Peer;
      try {
        console.log('Importing simple-peer...');
        const SimplePeer = await import('simple-peer');
        Peer = SimplePeer.default;
      } catch (err) {
        console.error('Failed to load simple-peer:', err);
        setError('Failed to initialize video chat. Please check your connection or try a different browser.');
        setIsConnecting(false);
        return;
      }

      // Create new peer connection
      const newPeer = new Peer({
        initiator,
        trickle: true,
        stream: mediaStream,
        config: { 
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ] 
        }
      });
      
      // Store peer instance and process any queued signals
      peerRef.current = newPeer;
      console.log(`Peer created. Processing ${signalQueueRef.current.length} queued signals`);
      
      if (signalQueueRef.current.length) {
        signalQueueRef.current.forEach(sig => {
          try {
            console.log('Applying queued signal:', sig);
            newPeer.signal(sig);
          } catch (err) {
            console.error('Error applying queued signal:', err);
          }
        });
        signalQueueRef.current = [];
      }

      // Set up peer event handlers
      newPeer.on('error', (err) => {
        console.error('Peer connection error:', err);
        setError(`Connection error: ${err.message}. Please try again.`);
        setIsConnecting(false);
      });

      newPeer.on('signal', (data) => {
        console.log('Generated signal data:', data);
        if (socket && room) {
          socket.emit('signal', { 
            roomId: room, 
            signal: data,
            userId: user?._id
          });
        }
      });

      newPeer.on('connect', () => {
        console.log('Peer connection established successfully');
        setIsConnected(true);
        setIsConnecting(false);
      });

      newPeer.on('close', () => {
        console.log('Peer connection closed');
        handleDisconnect();
      });
      
      // Monitor WebRTC connection states for debugging
      if (newPeer._pc) {
        newPeer._pc.addEventListener('iceconnectionstatechange', () => {
          console.log('ICE connection state:', newPeer._pc.iceConnectionState);
          if (newPeer._pc.iceConnectionState === 'failed') {
            console.error('ICE connection failed - possible NAT/firewall issue');
            setError('Connection failed. This may be due to a network issue.');
          }
        });

        newPeer._pc.addEventListener('signalingstatechange', () => {
          console.log('Signaling state:', newPeer._pc.signalingState);
        });
      }

      // CRITICAL PART: Handle remote streams with special audio processing
      newPeer.on('stream', async (stream) => {
        console.log('Received remote stream:', stream);
        
        if (!stream.active) {
          console.error('Received inactive stream');
          return;
        }

        // Process remote audio separately with WebAudio
        if (audioContext.current && stream.getAudioTracks().length > 0) {
          const audioTrack = stream.getAudioTracks()[0];
          console.log('Processing remote audio track:', audioTrack.id);
          
          try {
            // Create a new MediaStream with only the audio track
            const audioStream = new MediaStream([audioTrack]);
            
            // Create an audio source from the stream
            const audioSource = audioContext.current.createMediaStreamSource(audioStream);
            
            // Create a gain node to control volume and explicitly set to 1 (full volume)
            const gainNode = audioContext.current.createGain();
            gainNode.gain.value = 1.0;
            
            // Connect the audio processing
            audioSource.connect(gainNode);
            gainNode.connect(audioContext.current.destination);
            
            // Store the node for later cleanup
            remoteAudioNode.current = audioSource;
            
            console.log('Remote audio connected to audio context');
          } catch (err) {
            console.error('Failed to process audio:', err);
          }
        }

        // Process video separately
        if (remoteVideoRef.current) {
          console.log('Setting remote video stream');
          
          try {
            // Create a video-only stream
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length > 0) {
              const videoStream = new MediaStream([videoTracks[0]]);
              remoteVideoRef.current.srcObject = videoStream;
            } else {
              // Fallback - use the full stream
              remoteVideoRef.current.srcObject = stream;
              // But ensure muted is false to prevent audio doubling
              remoteVideoRef.current.muted = true;  // Mute the video element since we're handling audio separately
            }
            
            // Start playing
            remoteVideoRef.current.play().catch(err => {
              console.warn('Error auto-playing remote video:', err);
              
              // Try on user interaction
              document.addEventListener('click', function playOnFirstClick() {
                remoteVideoRef.current.play().catch(e => 
                  console.error('Still failed to play after click:', e)
                );
                document.removeEventListener('click', playOnFirstClick);
              }, { once: true });
            });
          } catch (err) {
            console.error('Error attaching remote video stream:', err);
          }
        }

        // Store the stream and update UI
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

  // Cleanup when disconnecting
  const handleDisconnect = () => {
    console.log('Disconnecting...');
    
    // Clean up peer connection
    if (peer) {
      try {
        peer.removeAllListeners();
        peer.destroy();
      } catch (err) {
        console.error('Error destroying peer:', err);
      }
      setPeer(null);
      peerRef.current = null;
    }

    // Clean up audio processing
    if (remoteAudioNode.current) {
      try {
        remoteAudioNode.current.disconnect();
        remoteAudioNode.current = null;
      } catch (err) {
        console.error('Error cleaning up audio node:', err);
      }
    }

    // Clean up remote stream
    if (remoteStream) {
      try {
        remoteStream.getTracks().forEach(track => {
          track.stop();
        });
      } catch (err) {
        console.error('Error cleaning up remote stream:', err);
      }
      setRemoteStream(null);
    }

    // Clean up video elements
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setPartnerInfo(null);
    setMessages([]);
  };

  // Find a new partner
  const findNewPartner = () => {
    handleDisconnect();
    setTimeout(() => {
      requestMatch();
    }, 500);
  };

  // Skip current user
  const skipCurrentUser = () => {
    if (socket && isConnected) {
      socket.emit('next-match', {
        roomId: roomId,
        userInfo: { username: user.username, _id: user._id, gender: user.gender, location: user.location },
        filters: filters
      });
    }
    
    handleDisconnect();
    setTimeout(() => {
      requestMatch();
    }, 500);
  };

  // Toggle local video
  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle local audio
  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Send chat message
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

  // Apply search filters
  const applyFilters = (newFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
    
    if (isConnected) {
      handleDisconnect();
      setTimeout(() => {
        requestMatch();
      }, 500);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading Video Chat...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
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

  // No user state
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">No user data available. Please log in again.</div>
      </div>
    );
  }

  // Main component render
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Connection Filters</h2>
              <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-white">
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
                onClick={() => applyFilters({ gender: 'Anyone', country: 'Anyone', sameCountryOnly: false })}
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
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              
              {/* Local Video (Picture in Picture) */}
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>

              {/* Audio Indicator - Visual feedback that audio is working */}
              <div className="absolute bottom-32 left-4 bg-black/50 backdrop-blur-sm rounded-full p-2">
                <div className="flex items-center space-x-1">
                  <div className="animate-pulse w-1 h-4 bg-green-400 rounded-full"></div>
                  <div className="animate-pulse w-1 h-6 bg-green-400 rounded-full"></div>
                  <div className="animate-pulse w-1 h-8 bg-green-400 rounded-full"></div>
                  <div className="animate-pulse w-1 h-5 bg-green-400 rounded-full"></div>
                  <div className="animate-pulse w-1 h-3 bg-green-400 rounded-full"></div>
                </div>
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

              {/* Chat Panel */}
              <div className="absolute bottom-20 right-4 w-80 h-96 bg-black/70 backdrop-blur-sm rounded-lg border border-gray-600 flex flex-col">
                <div className="p-3 border-b border-gray-600 flex justify-between items-center">
                  <h3 className="font-semibold text-white text-sm">Chat with {partnerInfo?.username}</h3>
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                </div>

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
    </div>
  );
}
