import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, User } from 'lucide-react';
import { authAPI } from '../services/api';

export default function CompleteProfile() {
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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
      
      // If profile is already completed, redirect to dashboard
      if (parsedUser.profileCompleted) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!age || !gender || !location || !bio) {
      setError('Please fill in all fields');
      return;
    }

    if (parseInt(age) < 18 || parseInt(age) > 100) {
      setError('Age must be between 18 and 100');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.completeProfile({
        age: parseInt(age),
        gender,
        location,
        bio
      });

      // Update user data in localStorage
      const updatedUser = { ...user, profileCompleted: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Navigate to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Profile completion failed:', error);
      setError(error.response?.data?.msg || 'Failed to complete profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
      <div className="max-w-md mx-auto px-5 py-10">
        {/* Header */}
        <div className="flex justify-center items-center mb-10">
          <Heart className="text-white w-6 h-6 mr-2" />
          <h1 className="text-white text-2xl font-bold">Meet World</h1>
        </div>

        {/* Profile Completion Card */}
        <div className="px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="text-center mb-8">
              <User className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-white text-3xl font-bold mb-3">
                Complete Your Profile
              </h2>
              <p className="text-gray-400 text-base">
                Help others get to know you better
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500 rounded-xl p-4 mb-6">
                <p className="text-red-400 text-center">{error}</p>
              </div>
            )}

            {/* Age Field */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                min="18"
                max="100"
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                required
              />
            </div>

            {/* Gender Field */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                required
              >
                <option value="">Select your gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Location Field */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                required
              />
            </div>

            {/* Bio Field */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows="4"
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 resize-none"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                isLoading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white active:scale-95'
              }`}
            >
              {isLoading ? 'Completing Profile...' : 'Complete Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
