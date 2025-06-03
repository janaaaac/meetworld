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
  LogOut
} from 'lucide-react';

export default function VideoChat() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

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
        
        const newSocket = io('http://localhost:5001', {
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

        newSocket.on('webrtc-offer', async (data) => {
          console.log('Received WebRTC offer:', data);
          await handleOffer(data.offer);
        });

        newSocket.on('webrtc-answer', async (data) => {
          console.log('Received WebRTC answer:', data);
          await handleAnswer(data.answer);
        });

        newSocket.on('webrtc-ice-candidate', async (data) => {
          console.log('Received ICE candidate:', data);
          await handleIceCandidate(data.candidate);
        });

        newSocket.on('partner-disconnected', () => {
          console.log('Partner disconnected');
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
          if (peerConnection) {
            peerConnection.close();
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
      setStream(mediaStream);
      
      // Set local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }
      
      return mediaStream;
    } catch (error) {
      console.error('Media access error:', error);
      setError(`Media access failed: ${error.message}`);
      return null;
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(rtcConfig);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('Sending ICE candidate');
        socket.emit('webrtc-ice-candidate', {
          candidate: event.candidate,
          userInfo: {
            username: user.username,
            _id: user._id
          }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote stream');
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setIsConnected(false);
        setIsConnecting(false);
      }
    };

    return pc;
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

      const pc = createPeerConnection();
      setPeerConnection(pc);

      // Add local stream to peer connection
      mediaStream.getTracks().forEach(track => {
        pc.addTrack(track, mediaStream);
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit('webrtc-offer', {
          offer: offer,
          userInfo: {
            username: user.username,
            _id: user._id
          }
        });
      }
      
    } catch (error) {
      console.error('Start video chat error:', error);
      setError(`Failed to start video chat: ${error.message}`);
      setIsConnecting(false);
    }
  };

  const handleOffer = async (offer) => {
    try {
      if (!peerConnection) {
        const pc = createPeerConnection();
        setPeerConnection(pc);

        // Add local stream if available
        if (stream) {
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
        }

        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socket) {
          socket.emit('webrtc-answer', {
            answer: answer,
            userInfo: {
              username: user.username,
              _id: user._id
            }
          });
        }
      }
    } catch (error) {
      console.error('Handle offer error:', error);
      setError(`Failed to handle offer: ${error.message}`);
    }
  };

  const handleAnswer = async (answer) => {
    try {
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error('Handle answer error:', error);
      setError(`Failed to handle answer: ${error.message}`);
    }
  };

  const handleIceCandidate = async (candidate) => {
    try {
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Handle ICE candidate error:', error);
    }
  };

  const handleDisconnect = () => {
    console.log('Disconnecting...');
    
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
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
    setShowChat(false);
  };

  const findNewPartner = () => {
    handleDisconnect();
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
      {/* Header */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div className="flex items-center">
          <Heart className="text-red-400 w-6 h-6 mr-2" />
          <h1 className="text-xl font-bold">Meet World Video Chat</h1>
          <span className="ml-4 text-sm text-green-400">✅ Native WebRTC</span>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>
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
                <p className="text-lg">Connecting you with someone...</p>
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
              />
              
              {/* Local Video (Picture in Picture) */}
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Partner Info */}
              {partnerInfo && (
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-white font-semibold">{partnerInfo.username}</p>
                </div>
              )}
            </>
          )}

          {/* Video Controls */}
          {(isConnected || stream) && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>
              
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>

              <button
                onClick={() => setShowChat(!showChat)}
                className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <MessageCircle className="w-6 h-6" />
              </button>

              <button
                onClick={findNewPartner}
                className="p-3 rounded-full bg-green-600 hover:bg-green-700 transition-colors"
              >
                <RotateCcw className="w-6 h-6" />
              </button>

              <button
                onClick={handleDisconnect}
                className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
              >
                <Phone className="w-6 h-6 transform rotate-[135deg]" />
              </button>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        {showChat && isConnected && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold">Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.fromPartner ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg ${
                      message.fromPartner
                        ? 'bg-gray-700 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={sendMessage}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
