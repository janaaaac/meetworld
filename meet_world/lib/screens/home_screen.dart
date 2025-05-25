import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:meet_world/constants/colours.dart';
import 'package:meet_world/providers/theme_provider.dart';
import 'package:meet_world/widgets/bottom_nav_bar.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:meet_world/services/auth_service.dart';
import 'dart:convert';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? userName;
  String? userLocation;
  String? userToken;
  int selectedTab = 0;
  int currentMatchIndex = 0;
  int selectedBottomNavIndex = 0;
  List<Map<String, dynamic>> allUsers = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadUserData();
    _loadAllUsers();
  }

  _loadUserData() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    setState(() {
      userName = prefs.getString('username') ?? 'User';
      userLocation = prefs.getString('location') ?? 'Location not set';
      userToken = prefs.getString('token');
    });
  }

  _loadAllUsers() async {
    if (userToken == null) {
      SharedPreferences prefs = await SharedPreferences.getInstance();
      userToken = prefs.getString('token');
    }

    if (userToken != null) {
      try {
        final response = await AuthService.getAllUsers(userToken!);
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          setState(() {
            allUsers = List<Map<String, dynamic>>.from(data['users']);
            isLoading = false;
          });
        } else {
          print('Failed to load users: ${response.statusCode}');
          setState(() {
            isLoading = false;
          });
        }
      } catch (e) {
        print('Error loading users: $e');
        setState(() {
          isLoading = false;
        });
      }
    } else {
      setState(() {
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return Scaffold(
          backgroundColor: themeProvider.backgroundColor,
          body: SafeArea(
            child: Column(
              children: [
                // Top Profile Section
                Padding(
                  padding: EdgeInsets.all(20.0),
                  child: Row(
                    children: [
                      // User Avatar
                      GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => ProfileScreen(),
                            ),
                          );
                        },
                        child: Container(
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
                                color: Colors.black,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
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
                                color: themeProvider.textColor,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              userLocation ?? 'Location not set',
                              style: TextStyle(
                                color: themeProvider.textColor.withOpacity(0.7),
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
                          color: themeProvider.cardColor,
                        ),
                        child: Stack(
                          children: [
                            Center(
                              child: Icon(
                                Icons.notifications_outlined,
                                color: themeProvider.textColor,
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
                      _buildFilterPill('Near me', true, themeProvider),
                      SizedBox(width: 12),
                      _buildFilterPill('Travel partner', false, themeProvider),
                      SizedBox(width: 12),
                      _buildFilterPill('Concert partner', false, themeProvider),
                      SizedBox(width: 12),
                      _buildFilterPill('Study buddy', false, themeProvider),
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
                          color: themeProvider.textColor,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: themeProvider.cardColor,
                        ),
                        child: Icon(
                          Icons.search,
                          color: themeProvider.textColor,
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
                    child: _buildMainMatchCard(themeProvider),
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
      },
    );
  }

  Widget _buildFilterPill(
    String title,
    bool isSelected,
    ThemeProvider themeProvider,
  ) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.primaryColor : themeProvider.cardColor,
        borderRadius: BorderRadius.circular(25),
      ),
      child: Text(
        title,
        style: TextStyle(
          color: isSelected ? Colors.black : themeProvider.textColor,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildMainMatchCard(ThemeProvider themeProvider) {
    if (isLoading) {
      return Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF8B5CF6), Color(0xFFA855F7), Color(0xFF3B82F6)],
          ),
        ),
        child: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    if (allUsers.isEmpty) {
      return Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF8B5CF6), Color(0xFFA855F7), Color(0xFF3B82F6)],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.people_outline, color: Colors.white, size: 48),
              SizedBox(height: 16),
              Text(
                'No users found',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'Check back later for new matches!',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final currentMatch = allUsers[currentMatchIndex % allUsers.length];

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
                                currentMatch['username'][0],
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
                  '${currentMatch['username']}, ${currentMatch['age']}',
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
                if (currentMatch['bio'] != null &&
                    currentMatch['bio'].toString().isNotEmpty)
                  Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      currentMatch['bio'],
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 14,
                        fontStyle: FontStyle.italic,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
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
                  currentMatchIndex = (currentMatchIndex + 1) % allUsers.length;
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
              children: List.generate(
                allUsers.length > 4 ? 4 : allUsers.length,
                (index) {
                  if (allUsers.isEmpty) return SizedBox.shrink();
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
                          allUsers[(index + 1) %
                              allUsers.length]['username'][0],
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
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
