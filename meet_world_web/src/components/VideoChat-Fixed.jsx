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

export default function VideoChat() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [peer, setPeer] = useState(null);
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
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

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

        newSocket.on('matched', (partnerData) => {
          console.log('Matched with partner:', partnerData);
          setPartnerInfo(partnerData);
          setIsConnected(true);
          setIsConnecting(false);
        });

        newSocket.on('signal', async (data) => {
          console.log('Received signal:', data);
          if (peer) {
            peer.signal(data);
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
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      console.log('Media access granted');
      
      // Log video track information
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('Video track:', {
          enabled: videoTrack.enabled,
          readyState: videoTrack.readyState,
          settings: videoTrack.getSettings()
        });
      } else {
        console.error('No video track found in media stream');
      }
      setStream(mediaStream);
      
      // Set local video
      if (localVideoRef.current) {
        console.log('Setting local video stream');
        localVideoRef.current.srcObject = mediaStream;
        
        // Force a re-render of the video element
        localVideoRef.current.load();
        
        // Ensure video tracks are enabled
        mediaStream.getVideoTracks().forEach(track => {
          track.enabled = true;
          console.log('Video track enabled:', track.readyState);
        });
      }
      
      return mediaStream;
    } catch (error) {
      console.error('Media access error:', error);
      setError(`Media access failed: ${error.message}`);
      return null;
    }
  };

  const startVideoChat = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      console.log('Starting video chat...');
      
      const mediaStream = await getUserMedia();
      if (!mediaStream) {
        setIsConnecting(false);
        return;
      }

      // Dynamic import of simple-peer
      const { default: Peer } = await import('simple-peer');
      
      const newPeer = new Peer({
        initiator: true,
        trickle: false,
        stream: mediaStream
      });

      newPeer.on('signal', (data) => {
        console.log('Sending signal:', data);
        if (socket) {
          socket.emit('join-video-chat', { 
            signal: data,
            userInfo: {
              username: user.username,
              _id: user._id,
              gender: user.gender,
              location: user.location
            },
            filters: filters
          });
        }
      });

      newPeer.on('stream', (stream) => {
        console.log('Received remote stream:', stream);
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          console.log('Setting remote video stream');
          remoteVideoRef.current.srcObject = stream;
          
          // Force a re-render of the video element
          remoteVideoRef.current.load();
          
          // Ensure video tracks are enabled
          stream.getVideoTracks().forEach(track => {
            track.enabled = true;
            console.log('Remote video track enabled:', track.readyState);
          });
          
          // Add error handling for the video element
          remoteVideoRef.current.onerror = (e) => {
            console.error('Remote video error:', e);
          };
        } else {
          console.error('Remote video ref not available');
        }
      });

      newPeer.on('connect', () => {
        console.log('Peer connected');
        setIsConnected(true);
        setIsConnecting(false);
      });

      newPeer.on('error', (err) => {
        console.error('Peer error:', err);
        setError(`Peer connection failed: ${err.message}`);
        setIsConnecting(false);
      });

      setPeer(newPeer);
      
    } catch (error) {
      console.error('Start video chat error:', error);
      setError(`Failed to start video chat: ${error.message}`);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    console.log('Disconnecting...');
    
    if (peer) {
      peer.destroy();
      setPeer(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setPartnerInfo(null);
    setMessages([]);
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
        roomId: partnerInfo?.roomId,
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
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log('Setting up remote video stream in useEffect');
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

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
                  onClick={startVideoChat}
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
                style={{ transform: 'scaleX(-1)' }}  // Mirror the remote video
                onLoadedMetadata={(e) => {
                  console.log('Remote video metadata loaded');
                  e.target.play().catch(err => console.error('Remote video play failed:', err));
                }}
                onPlay={() => console.log('Remote video started playing')}
              />
              
              {/* Local Video (Picture in Picture) */}
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}  // Mirror the local video
                  onLoadedMetadata={(e) => {
                    console.log('Local video metadata loaded');
                    e.target.play().catch(err => console.error('Local video play failed:', err));
                  }}
                  onPlay={() => console.log('Local video started playing')}
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
          {(isConnected || stream) && (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
