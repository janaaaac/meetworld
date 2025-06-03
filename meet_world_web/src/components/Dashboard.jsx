import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, LogOut, User, Video, MessageCircle } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // If profile is not completed, redirect to complete profile
      if (!parsedUser.profileCompleted) {
        navigate('/complete-profile');
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-5 py-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center">
            <Heart className="text-white w-8 h-8 mr-3" />
            <h1 className="text-white text-3xl font-bold">Meet World</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>

        {/* Welcome Section */}
        <div className="bg-gray-800 rounded-xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="w-12 h-12 text-green-400 mr-4" />
              <div>
                <h2 className="text-2xl font-bold">Welcome back, {user.username}!</h2>
                <p className="text-gray-400">Ready to meet new people?</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/video-chat')}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <Video className="w-6 h-6 mr-2" />
              Start Video Chat
            </button>
          </div>
        </div>

        {/* Main Video Chat CTA */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-8 mb-8 text-center">
          <Video className="w-16 h-16 text-white mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Connect Face-to-Face</h2>
          <p className="text-gray-200 mb-6 text-lg">
            Meet new people through live video chat with real-time messaging
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/video-chat')}
              className="px-8 py-4 bg-white text-purple-600 hover:bg-gray-100 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <Video className="w-6 h-6 mr-2 inline" />
              Start Video Chat Now
            </button>
          </div>
          <div className="flex justify-center items-center mt-4 space-x-6 text-sm text-gray-200">
            <div className="flex items-center">
              <Video className="w-4 h-4 mr-1" />
              HD Video
            </div>
            <div className="flex items-center">
              <MessageCircle className="w-4 h-4 mr-1" />
              Live Chat
            </div>
            <div className="flex items-center">
              <Heart className="w-4 h-4 mr-1" />
              Safe & Secure
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button 
            onClick={() => navigate('/video-chat')}
            className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 text-center transition-colors cursor-pointer"
          >
            <Video className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Video Chat</h3>
            <p className="text-gray-400">Connect with people face-to-face</p>
          </button>
          
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <User className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Profile</h3>
            <p className="text-gray-400">Update your profile and preferences</p>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <Heart className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Matches</h3>
            <p className="text-gray-400">See who liked you back</p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-10 bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Your Activity</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">0</div>
              <div className="text-gray-400">Matches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">0</div>
              <div className="text-gray-400">Likes Sent</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">0</div>
              <div className="text-gray-400">Messages</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
