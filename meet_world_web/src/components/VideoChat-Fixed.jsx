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

  const startVideoChat = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      console.log('Starting video chat...');
      
      // Reuse existing stream or request media if not yet enabled
      let mediaStream = stream;
      if (!mediaStream) {
        mediaStream = await getUserMedia();
        if (!mediaStream) {
          setIsConnecting(false);
          return;
        }
      }

      // Dynamic import with error handling and retries
      let Peer;
      try {
        const SimplePeer = await import('simple-peer').catch(async (err) => {
          console.error('Error loading simple-peer:', err);
          // Retry once with a delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          return import('simple-peer');
        });
        Peer = SimplePeer.default;
      } catch (err) {
        console.error('Failed to load simple-peer:', err);
        setError('Failed to initialize video chat. Please check your connection and try again.');
        setIsConnecting(false);
        return;
      }

      // Configure peer with ICE servers
      const newPeer = new Peer({
        initiator: true,
        trickle: false,
        stream: mediaStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      // Add error handling for peer events
      newPeer.on('error', (err) => {
        console.error('Peer connection error:', err);
        setError(`Connection error: ${err.message}. Please try again.`);
        setIsConnecting(false);
      });

      newPeer.on('signal', (data) => {
        console.log('Generated signal data:', data);
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

      newPeer.on('connect', () => {
        console.log('Peer connection established');
        setIsConnected(true);
        setIsConnecting(false);
      });

      newPeer.on('close', () => {
        console.log('Peer connection closed');
        handleDisconnect();
      });

      // Enhanced stream handling
      newPeer.on('stream', async (stream) => {
        console.log('Received remote stream:', stream);
        if (!stream.active) {
          console.error('Received inactive stream');
          return;
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) {
          console.error('No video track in remote stream');
          return;
        }

        console.log('Remote video track:', {
          enabled: videoTrack.enabled,
          readyState: videoTrack.readyState,
          settings: videoTrack.getSettings()
        });

        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          // force load and play the remote video
          remoteVideoRef.current.load();
          try {
            await remoteVideoRef.current.play();
            console.log('Remote video playing');
          } catch (err) {
            console.error('Error playing remote video:', err);
          }
        }
      });

      setPeer(newPeer);
      
    } catch (error) {
      console.error('Error starting video chat:', error);
      setError(`Failed to start video chat: ${error.message}`);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    console.log('Handling disconnect...');
    setIsConnected(false);
    setPartnerInfo(null);
    setRemoteStream(null);
    setMessages([]);
    if (peer) {
      peer.destroy();
      setPeer(null);
    }
    if (socket) {
      socket.emit('leave-video-chat');
    }
  };

  const handleSkip = () => {
    console.log('Skipping to next partner...');
    if (socket) {
      socket.emit('skip-partner');
    }
    handleDisconnect();
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    const message = {
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      fromPartner: false
    };
    setMessages(prev => [...prev, message]);
    socket.emit('chat-message', message);
    setNewMessage('');
    scrollToBottom();
  };

  const handleToggleVideo = () => {
    if (peer) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('Toggled video:', videoTrack.enabled);
      }
    }
  };

  const handleToggleAudio = () => {
    if (peer) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('Toggled audio:', audioTrack.enabled);
      }
    }
  };

  const handleLogout = () => {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
    console.log('Applied filters:', newFilters);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 flex relative">
        <video
          ref={localVideoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
        />
        {remoteStream && (
          <video
            ref={remoteVideoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
          />
        )}
        <div className="m-4">
          <button 
            onClick={handleToggleVideo} 
            className="p-2 rounded-full bg-white bg-opacity-75 hover:bg-opacity-100 transition"
            title={isVideoEnabled ? "Disable Video" : "Enable Video"}
          >
            {isVideoEnabled ? <Video className="w-6 h-6 text-red-500" /> : <VideoOff className="w-6 h-6 text-green-500" />}
          </button>
          <button 
            onClick={handleToggleAudio} 
            className="p-2 rounded-full bg-white bg-opacity-75 hover:bg-opacity-100 transition ml-2"
            title={isAudioEnabled ? "Disable Audio" : "Enable Audio"}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6 text-red-500" /> : <MicOff className="w-6 h-6 text-green-500" />}
          </button>
          <button 
            onClick={handleSkip} 
            className="p-2 rounded-full bg-white bg-opacity-75 hover:bg-opacity-100 transition ml-2"
            title="Skip Partner"
          >
            <SkipForward className="w-6 h-6 text-blue-500" />
          </button>
          <button 
            onClick={handleLogout} 
            className="p-2 rounded-full bg-white bg-opacity-75 hover:bg-opacity-100 transition ml-2"
            title="Logout"
          >
            <LogOut className="w-6 h-6 text-gray-500" />
          </button>
        </div>
      </div>
      <div className="flex-none p-4 bg-gray-100">
        <div className="flex items-center mb-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Video Chat</h2>
          </div>
          <div>
            <button 
              onClick={() => setShowFilters(true)} 
              className="p-2 rounded-full bg-white bg-opacity-75 hover:bg-opacity-100 transition"
              title="Filters"
            >
              <Filter className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="mb-4">
          {skipNotification && (
            <div className="p-2 bg-yellow-100 text-yellow-800 rounded-md mb-2">
              {skipNotification}
            </div>
          )}
          {error && (
            <div className="p-2 bg-red-100 text-red-800 rounded-md mb-2">
              {error}
            </div>
          )}
          <div className="max-h-60 overflow-auto">
            {messages.map((msg, index) => (
              <div key={index} className={`p-2 rounded-md mb-2 ${msg.fromPartner ? 'bg-blue-100' : 'bg-green-100'}`}>
                <div className="text-sm text-gray-500">
                  {msg.timestamp}
                </div>
                <div className="text-md">
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <form onSubmit={handleSendMessage} className="flex">
          <input 
            type="text" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit" 
            className="p-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Apply Filters</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select 
                value={filters.gender} 
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })} 
                className="block w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Anyone">Anyone</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input 
                type="text" 
                value={filters.country} 
                onChange={(e) => setFilters({ ...filters, country: e.target.value })} 
                placeholder="Enter your country"
                className="block w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4 flex items-center">
              <input 
                type="checkbox" 
                checked={filters.sameCountryOnly} 
                onChange={(e) => setFilters({ ...filters, sameCountryOnly: e.target.checked })} 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Same Country Only
              </label>
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => setShowFilters(false)} 
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition mr-2"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleApplyFilters(filters)} 
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
