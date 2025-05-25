import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:meet_world/constants/colours.dart';
import 'package:meet_world/providers/theme_provider.dart';
import 'package:meet_world/widgets/google_button.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/primary_button.dart';
import '../services/auth_service.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';
import 'home_screen.dart';
import 'complete_profile_screen.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return Scaffold(
          backgroundColor: themeProvider.backgroundColor,
          body: SafeArea(
            child: SingleChildScrollView(
              child: Padding(
                padding: EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    SizedBox(height: 60),

                    // App title row at the top
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.favorite,
                          color: themeProvider.textColor,
                          size: 24,
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Meet World',
                          style: TextStyle(
                            color: themeProvider.textColor,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),

                    SizedBox(height: 40),
                    _buildLoginCard(themeProvider),
                    SizedBox(height: 40),
                    _buildBottomSection(themeProvider),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildLoginCard(ThemeProvider themeProvider) {
    return Container(
      padding: EdgeInsets.all(30),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(20)),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Login',
              style: TextStyle(
                color: themeProvider.textColor,
                fontSize: 32,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 10),
            Text(
              'Please sign in to continue.',
              style: TextStyle(
                color: themeProvider.textColor.withOpacity(0.7),
                fontSize: 16,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 30),

            // Email Field
            CustomTextField(
              controller: _emailController,
              hintText: 'Email address',
              keyboardType: TextInputType.emailAddress,
            ),

            SizedBox(height: 15),

            // Password Field
            CustomTextField(
              controller: _passwordController,
              hintText: 'Password',
              isPassword: true,
            ),

            // Forgot Password (moved below password field, aligned right)
            Align(
              alignment: Alignment.centerRight,
              child: GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ForgotPasswordScreen(),
                    ),
                  );
                },
                child: Padding(
                  padding: EdgeInsets.only(top: 8, bottom: 8),
                  child: Text(
                    'Forgot password?',
                    style: TextStyle(
                      color: AppColors.primaryColor,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ),

            SizedBox(height: 30),

            // Login Button
            PrimaryButton(
              text: 'Log in',
              onPressed: () async {
                if (_formKey.currentState!.validate()) {
                  final response = await AuthService.login(
                    _emailController.text,
                    _passwordController.text,
                  );

                  if (response.statusCode == 200) {
                    final data = jsonDecode(response.body);

                    // Save all user data to SharedPreferences
                    SharedPreferences prefs =
                        await SharedPreferences.getInstance();
                    await prefs.setString('token', data['token']);
                    await prefs.setString(
                      'username',
                      data['username'] ?? 'User',
                    );
                    await prefs.setString('email', _emailController.text);

                    // Save profile data if available
                    if (data['location'] != null) {
                      await prefs.setString('location', data['location']);
                    }
                    if (data['bio'] != null) {
                      await prefs.setString('bio', data['bio']);
                    }
                    if (data['gender'] != null) {
                      await prefs.setString('gender', data['gender']);
                    }
                    if (data['age'] != null) {
                      await prefs.setInt('age', data['age']);
                    }
                    await prefs.setBool(
                      'profileCompleted',
                      data['profileCompleted'] ?? false,
                    );

                    print("Login success: ${data['token']}");

                    // Navigate to home screen
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (context) => HomeScreen()),
                      (Route<dynamic> route) => false,
                    );
                  } else {
                    // Handle error
                    print("Login failed: ${response.body}");
                    showDialog(
                      context: context,
                      builder:
                          (_) => AlertDialog(
                            backgroundColor: themeProvider.cardColor,
                            title: Text(
                              "Login Failed",
                              style: TextStyle(color: themeProvider.textColor),
                            ),
                            content: Text(
                              "Invalid email or password",
                              style: TextStyle(
                                color: themeProvider.textColor.withOpacity(0.7),
                              ),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: Text(
                                  "OK",
                                  style: TextStyle(
                                    color: AppColors.primaryColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                    );
                  }
                }
              },
            ),

            SizedBox(height: 20),

            // Google Sign In Button (moved below login button)
            GoogleButton(
              onPressed: () {
                print('Google Sign In tapped');
              },
            ),

            SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomSection(ThemeProvider themeProvider) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          "Don't have an account? ",
          style: TextStyle(
            color: themeProvider.textColor.withOpacity(0.7),
            fontSize: 16,
          ),
        ),
        GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => RegisterScreen()),
            );
          },
          child: Text(
            'Sign up',
            style: TextStyle(
              color: AppColors.primaryColor,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
