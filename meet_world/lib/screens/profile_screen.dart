import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:meet_world/constants/colours.dart';
import 'package:meet_world/providers/theme_provider.dart';
import 'package:meet_world/widgets/bottom_nav_bar.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String? userName = 'User';
  String? userEmail = '';
  String? userLocation = 'Location not set';
  String? userBio = 'No bio available';
  String? userGender = '';
  int? userAge = 0;
  String? userToken;
  bool isLoading = false;
  bool isEditing = false;

  final _nameController = TextEditingController();
  final _locationController = TextEditingController();
  final _bioController = TextEditingController();
  final _ageController = TextEditingController();
  String _selectedGender = '';

  final List<String> _genders = ['Male', 'Female', 'Other'];

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  _loadUserProfile() async {
    setState(() {
      isLoading = true;
    });

    SharedPreferences prefs = await SharedPreferences.getInstance();
    userToken = prefs.getString('token');

    // Initialize controllers
    _nameController.text = userName ?? '';
    _locationController.text = userLocation ?? '';
    _bioController.text = userBio ?? '';
    _ageController.text = userAge?.toString() ?? '';
    _selectedGender = userGender ?? '';

    setState(() {
      isLoading = false;
    });
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder:
          (context) => Consumer<ThemeProvider>(
            builder: (context, themeProvider, child) {
              return AlertDialog(
                backgroundColor: themeProvider.cardColor,
                title: Text(
                  'Logout',
                  style: TextStyle(color: themeProvider.textColor),
                ),
                content: Text(
                  'Are you sure you want to logout?',
                  style: TextStyle(
                    color: themeProvider.textColor.withOpacity(0.7),
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text(
                      'Cancel',
                      style: TextStyle(
                        color: themeProvider.textColor.withOpacity(0.7),
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _logout();
                    },
                    child: Text('Logout', style: TextStyle(color: Colors.red)),
                  ),
                ],
              );
            },
          ),
    );
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
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return Scaffold(
          backgroundColor: themeProvider.backgroundColor,
          body: SafeArea(
            child:
                isLoading
                    ? Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primaryColor,
                      ),
                    )
                    : SingleChildScrollView(
                      child: Column(
                        children: [
                          // Header
                          Padding(
                            padding: EdgeInsets.all(20.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Profile',
                                  style: TextStyle(
                                    color: themeProvider.textColor,
                                    fontSize: 28,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Row(
                                  children: [
                                    // Theme Toggle Button
                                    GestureDetector(
                                      onTap: () {
                                        themeProvider.toggleTheme();
                                      },
                                      child: Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: AppColors.primaryColor,
                                        ),
                                        child: Icon(
                                          themeProvider.isDarkMode
                                              ? Icons.light_mode
                                              : Icons.dark_mode,
                                          color: Colors.black,
                                          size: 20,
                                        ),
                                      ),
                                    ),
                                    SizedBox(width: 12),
                                    // Logout Button
                                    GestureDetector(
                                      onTap: () {
                                        _showLogoutDialog();
                                      },
                                      child: Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: themeProvider.cardColor,
                                        ),
                                        child: Icon(
                                          Icons.logout,
                                          color: themeProvider.textColor,
                                          size: 20,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          // Profile Picture Section
                          Container(
                            width: 120,
                            height: 120,
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
                                  fontSize: 48,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),

                          SizedBox(height: 20),

                          // User Name
                          Text(
                            userName ?? 'User',
                            style: TextStyle(
                              color: themeProvider.textColor,
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),

                          SizedBox(height: 8),

                          // User Email
                          Text(
                            userEmail ?? '',
                            style: TextStyle(
                              color: themeProvider.textColor.withOpacity(0.7),
                              fontSize: 16,
                            ),
                          ),

                          SizedBox(height: 30),

                          // Simple Info Cards
                          Padding(
                            padding: EdgeInsets.symmetric(horizontal: 20),
                            child: Column(
                              children: [
                                _buildSimpleInfoCard(
                                  'Age',
                                  userAge?.toString() ?? 'Not set',
                                  Icons.cake,
                                ),
                                SizedBox(height: 16),
                                _buildSimpleInfoCard(
                                  'Gender',
                                  userGender ?? 'Not set',
                                  Icons.person,
                                ),
                                SizedBox(height: 16),
                                _buildSimpleInfoCard(
                                  'Location',
                                  userLocation ?? 'Not set',
                                  Icons.location_on,
                                ),
                                SizedBox(height: 16),
                                _buildSimpleInfoCard(
                                  'Bio',
                                  userBio ?? 'Not set',
                                  Icons.info,
                                ),
                              ],
                            ),
                          ),

                          SizedBox(height: 30),

                          // Statistics Section
                          Padding(
                            padding: EdgeInsets.symmetric(horizontal: 20),
                            child: Row(
                              children: [
                                Text(
                                  'Activity',
                                  style: TextStyle(
                                    color: themeProvider.textColor,
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          SizedBox(height: 16),
                          Padding(
                            padding: EdgeInsets.symmetric(horizontal: 20),
                            child: Row(
                              children: [
                                Expanded(
                                  child: _buildStatCard(
                                    'Matches',
                                    '12',
                                    Icons.favorite,
                                  ),
                                ),
                                SizedBox(width: 16),
                                Expanded(
                                  child: _buildStatCard(
                                    'Likes',
                                    '25',
                                    Icons.thumb_up,
                                  ),
                                ),
                                SizedBox(width: 16),
                                Expanded(
                                  child: _buildStatCard(
                                    'Views',
                                    '148',
                                    Icons.visibility,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          SizedBox(
                            height: 100,
                          ), // Bottom padding for navigation
                        ],
                      ),
                    ),
          ),
          bottomNavigationBar: BottomNavBar(
            selectedIndex: 0,
            onItemTapped: (index) {
              switch (index) {
                case 0:
                  Navigator.pop(context);
                  break;
                case 1:
                  print('Navigate to Explore');
                  break;
                case 2:
                  print('Navigate to Likes');
                  break;
                case 3:
                  print('Navigate to Chat');
                  break;
              }
            },
          ),
        );
      },
    );
  }

  Widget _buildSimpleInfoCard(String title, String value, IconData icon) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return Container(
          width: double.infinity,
          padding: EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: themeProvider.cardColor,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, color: AppColors.primaryColor, size: 20),
                  SizedBox(width: 12),
                  Text(
                    title,
                    style: TextStyle(
                      color: themeProvider.textColor,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              SizedBox(height: 12),
              Text(
                value,
                style: TextStyle(
                  color: themeProvider.textColor.withOpacity(0.8),
                  fontSize: 16,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return Container(
          padding: EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: themeProvider.cardColor,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: [
              Icon(icon, color: AppColors.primaryColor, size: 24),
              SizedBox(height: 8),
              Text(
                value,
                style: TextStyle(
                  color: themeProvider.textColor,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                title,
                style: TextStyle(
                  color: themeProvider.textColor.withOpacity(0.7),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _locationController.dispose();
    _bioController.dispose();
    _ageController.dispose();
    super.dispose();
  }
}
