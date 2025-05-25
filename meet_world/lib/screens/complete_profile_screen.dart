import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:meet_world/constants/colours.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/primary_button.dart';
import '../services/auth_service.dart';
import 'home_screen.dart';

class CompleteProfileScreen extends StatefulWidget {
  final String userId;
  final String token;

  const CompleteProfileScreen({
    Key? key,
    required this.userId,
    required this.token,
  }) : super(key: key);

  @override
  _CompleteProfileScreenState createState() => _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends State<CompleteProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _ageController = TextEditingController();
  final _locationController = TextEditingController();
  final _bioController = TextEditingController();

  String _selectedGender = '';
  bool _isLoading = false;

  final List<String> _genders = ['Male', 'Female', 'Other'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.all(20.0),
            child: Column(
              children: [
                SizedBox(height: 40),

                // App title row at the top
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.favorite, color: AppColors.textColor, size: 24),
                    SizedBox(width: 8),
                    Text(
                      'Meet World',
                      style: TextStyle(
                        color: AppColors.textColor,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),

                SizedBox(height: 40),
                _buildProfileCard(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProfileCard() {
    return Container(
      padding: EdgeInsets.all(30),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(20)),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Complete Your Profile',
              style: TextStyle(
                color: AppColors.textColor,
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 10),
            Text(
              'Tell us a bit more about yourself to find better matches.',
              style: TextStyle(
                color: AppColors.textColor.withOpacity(0.7),
                fontSize: 16,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 30),

            // Age Field
            CustomTextField(
              controller: _ageController,
              hintText: 'Age',
              keyboardType: TextInputType.number,
            ),

            SizedBox(height: 20),

            // Gender Selection
            Text(
              'Gender',
              style: TextStyle(
                color: AppColors.textColor,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primaryColor, width: 1.5),
              ),
              child: Column(
                children:
                    _genders.map((gender) {
                      return RadioListTile<String>(
                        title: Text(
                          gender,
                          style: TextStyle(color: AppColors.textColor),
                        ),
                        value: gender,
                        groupValue: _selectedGender,
                        onChanged: (value) {
                          setState(() {
                            _selectedGender = value!;
                          });
                        },
                        activeColor: AppColors.primaryColor,
                      );
                    }).toList(),
              ),
            ),

            SizedBox(height: 20),

            // Location Field
            CustomTextField(
              controller: _locationController,
              hintText: 'Location (City, Country)',
              keyboardType: TextInputType.text,
            ),

            SizedBox(height: 20),

            // Bio Field
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primaryColor, width: 1.5),
              ),
              child: TextFormField(
                controller: _bioController,
                maxLines: 4,
                maxLength: 500,
                style: TextStyle(color: AppColors.textColor),
                decoration: InputDecoration(
                  hintText: 'Tell us about yourself...',
                  hintStyle: TextStyle(
                    color: AppColors.textColor.withOpacity(0.5),
                  ),
                  filled: true,
                  fillColor: AppColors.backgroundColor,
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.all(16),
                  counterStyle: TextStyle(
                    color: AppColors.textColor.withOpacity(0.5),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please tell us about yourself';
                  }
                  if (value.trim().length < 10) {
                    return 'Bio must be at least 10 characters';
                  }
                  return null;
                },
              ),
            ),

            SizedBox(height: 30),

            // Complete Profile Button
            PrimaryButton(
              text: _isLoading ? 'Completing...' : 'Complete Profile',
              onPressed: _isLoading ? null : _handleCompleteProfile,
            ),

            SizedBox(height: 20),

            // Skip for now option
            TextButton(
              onPressed: _isLoading ? null : _handleSkipProfile,
              child: Text(
                'Skip for now',
                style: TextStyle(
                  color: AppColors.textColor.withOpacity(0.7),
                  fontSize: 16,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleCompleteProfile() {
    _completeProfile();
  }

  void _handleSkipProfile() {
    _skipProfile();
  }

  Future<void> _completeProfile() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedGender.isEmpty) {
      _showErrorDialog('Please select your gender');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      print("Sending complete profile request...");
      print("Token: ${widget.token}");
      print("Age: ${_ageController.text}");
      print("Gender: $_selectedGender");
      print("Location: ${_locationController.text}");
      print("Bio: ${_bioController.text}");

      final response = await AuthService.completeProfile(
        widget.token,
        int.parse(_ageController.text),
        _selectedGender,
        _locationController.text,
        _bioController.text,
      );

      print("Response status: ${response.statusCode}");
      print("Response body: ${response.body}");

      if (response.statusCode == 200) {
        // Save profile completion status
        SharedPreferences prefs = await SharedPreferences.getInstance();
        await prefs.setBool('profileCompleted', true);

        print("Profile completed successfully!");

        // Navigate to home screen
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => HomeScreen()),
          (Route<dynamic> route) => false,
        );
      } else {
        final errorData = jsonDecode(response.body);
        _showErrorDialog(errorData['msg'] ?? 'Failed to complete profile');
      }
    } catch (e) {
      _showErrorDialog('Something went wrong. Please try again.');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _skipProfile() async {
    // Save that user skipped profile completion
    SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool('profileCompleted', false);

    // Navigate to home screen
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => HomeScreen()),
      (Route<dynamic> route) => false,
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            backgroundColor: AppColors.cardColor,
            title: Text("Error", style: TextStyle(color: AppColors.textColor)),
            content: Text(
              message,
              style: TextStyle(color: AppColors.textColor.withOpacity(0.7)),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(
                  "OK",
                  style: TextStyle(color: AppColors.primaryColor),
                ),
              ),
            ],
          ),
    );
  }

  @override
  void dispose() {
    _ageController.dispose();
    _locationController.dispose();
    _bioController.dispose();
    super.dispose();
  }
}
