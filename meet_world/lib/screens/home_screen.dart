import 'package:flutter/material.dart';
import 'package:meet_world/constants/colours.dart';
import 'package:meet_world/widgets/bottom_nav_bar.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? userName;
  int selectedTab = 0;
  int currentMatchIndex = 0;
  int selectedBottomNavIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  _loadUserData() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    setState(() {
      userName = prefs.getString('username') ?? 'User';
    });
  }

  _logout() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => LoginScreen()),
      (Route<dynamic> route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // Top Profile Section
            Padding(
              padding: EdgeInsets.all(20.0),
              child: Row(
                children: [
                  // User Avatar
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          AppColors.primaryColor,
                          AppColors.primaryColor.withOpacity(0.7),
                        ],
                      ),
                    ),
                    child: Center(
                      child: Text(
                        (userName ?? 'U')[0].toUpperCase(),
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          userName ?? 'User',
                          style: TextStyle(
                            color: AppColors.textColor,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Bali, Indonesia',
                          style: TextStyle(
                            color: AppColors.textColor.withOpacity(0.7),
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Notification Bell
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.cardColor,
                    ),
                    child: Stack(
                      children: [
                        Center(
                          child: Icon(
                            Icons.notifications_outlined,
                            color: AppColors.textColor,
                            size: 20,
                          ),
                        ),
                        Positioned(
                          top: 8,
                          right: 10,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: AppColors.primaryColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Filter Pills
            Container(
              height: 50,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: EdgeInsets.symmetric(horizontal: 20),
                children: [
                  _buildFilterPill('Near me', true),
                  SizedBox(width: 12),
                  _buildFilterPill('Travel partner', false),
                  SizedBox(width: 12),
                  _buildFilterPill('Concert partner', false),
                  SizedBox(width: 12),
                  _buildFilterPill('Study buddy', false),
                ],
              ),
            ),

            SizedBox(height: 20),

            // Best Match Section
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Best match',
                    style: TextStyle(
                      color: AppColors.textColor,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.cardColor,
                    ),
                    child: Icon(
                      Icons.search,
                      color: AppColors.textColor,
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),

            SizedBox(height: 20),

            // Main Match Card
            Expanded(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: _buildMainMatchCard(),
              ),
            ),

            SizedBox(height: 20),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavBar(
        selectedIndex: selectedBottomNavIndex,
        onItemTapped: (index) {
          setState(() {
            selectedBottomNavIndex = index;
          });
          // Handle navigation to different screens
          switch (index) {
            case 0:
              // Already on Home
              break;
            case 1:
              // Navigate to Explore
              print('Navigate to Explore');
              break;
            case 2:
              // Navigate to Likes
              print('Navigate to Likes');
              break;
            case 3:
              // Navigate to Chat
              print('Navigate to Chat');
              break;
          }
        },
      ),
    );
  }

  Widget _buildFilterPill(String title, bool isSelected) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.primaryColor : AppColors.cardColor,
        borderRadius: BorderRadius.circular(25),
      ),
      child: Text(
        title,
        style: TextStyle(
          color: isSelected ? Colors.black : AppColors.textColor,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildMainMatchCard() {
    // Sample match data
    List<Map<String, dynamic>> matches = [
      {
        'name': 'Kenna',
        'age': 26,
        'location': 'Bali, Indonesia',
        'isActive': true,
        'interests': ['Travel', 'Music', 'Art', 'Photography'],
      },
      {
        'name': 'Emma',
        'age': 24,
        'location': 'Jakarta, Indonesia',
        'isActive': false,
        'interests': ['Dancing', 'Cooking', 'Yoga', 'Reading'],
      },
      {
        'name': 'Sophie',
        'age': 28,
        'location': 'Ubud, Indonesia',
        'isActive': true,
        'interests': ['Hiking', 'Photography', 'Surfing', 'Coffee'],
      },
    ];

    final currentMatch = matches[currentMatchIndex % matches.length];

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF8B5CF6), Color(0xFFA855F7), Color(0xFF3B82F6)],
        ),
      ),
      child: Stack(
        children: [
          // Main content
          Padding(
            padding: EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Active status
                if (currentMatch['isActive'])
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: AppColors.primaryColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Active',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),

                Spacer(),

                // Profile section
                Expanded(
                  flex: 3,
                  child: Center(
                    child: Container(
                      width: 200,
                      height: 250,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.purple.withOpacity(0.3),
                            Colors.purple.withOpacity(0.7),
                          ],
                        ),
                      ),
                      child: Stack(
                        children: [
                          // Placeholder avatar
                          Center(
                            child: CircleAvatar(
                              radius: 60,
                              backgroundColor: Colors.white.withOpacity(0.2),
                              child: Text(
                                currentMatch['name'][0],
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 40,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),

                          // Social media icons
                          Positioned(
                            right: 15,
                            top: 20,
                            child: Column(
                              children: [
                                _buildSocialIcon(
                                  Icons.facebook,
                                  Color(0xFF1877F2),
                                ),
                                SizedBox(height: 8),
                                _buildSocialIcon(
                                  Icons.camera_alt,
                                  Color(0xFFE4405F),
                                ),
                                SizedBox(height: 8),
                                _buildSocialIcon(
                                  Icons.music_note,
                                  Color(0xFF000000),
                                ),
                              ],
                            ),
                          ),

                          // Heart icon
                          Positioned(
                            right: 15,
                            bottom: 20,
                            child: Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.9),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.favorite,
                                color: Colors.red,
                                size: 20,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // User info
                Text(
                  '${currentMatch['name']}, ${currentMatch['age']}',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  currentMatch['location'],
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.8),
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),

          // Navigation arrow
          Positioned(
            right: 20,
            top: 20,
            child: GestureDetector(
              onTap: () {
                setState(() {
                  currentMatchIndex = (currentMatchIndex + 1) % matches.length;
                });
              },
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.arrow_forward_ios,
                  color: Colors.white,
                  size: 16,
                ),
              ),
            ),
          ),

          // Small profile previews at bottom
          Positioned(
            bottom: 20,
            left: 210,
            child: Row(
              children: List.generate(4, (index) {
                return Transform.translate(
                  offset: Offset(index > 0 ? -10.0 * index : 0, 0),
                  child: Container(
                    width: 45,
                    height: 45,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                      gradient: LinearGradient(
                        colors: [AppColors.primaryColor, Colors.purple],
                      ),
                    ),
                    child: Center(
                      child: Text(
                        matches[(index + 1) % matches.length]['name'][0],
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSocialIcon(IconData icon, Color color) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      child: Icon(icon, color: Colors.white, size: 16),
    );
  }
}
