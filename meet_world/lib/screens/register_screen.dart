import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:meet_world/constants/colours.dart';
import 'package:meet_world/providers/theme_provider.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/primary_button.dart';
import '../services/auth_service.dart';
import 'complete_profile_screen.dart';

class RegisterScreen extends StatefulWidget {
  @override
  _RegisterScreenState createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
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
                    _buildRegisterCard(themeProvider),
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

  Widget _buildRegisterCard(ThemeProvider themeProvider) {
    return Container(
      padding: EdgeInsets.all(30),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(20)),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Register',
              style: TextStyle(
                color: themeProvider.textColor,
                fontSize: 32,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 10),
            Text(
              'Create a new account',
              style: TextStyle(
                color: themeProvider.textColor.withOpacity(0.7),
                fontSize: 16,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 30),

            // Name Field
            CustomTextField(
              controller: _nameController,
              hintText: 'Name',
              keyboardType: TextInputType.name,
            ),

            SizedBox(height: 15),

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

            SizedBox(height: 30),

            // Register Button
            PrimaryButton(
              text: 'Sign up',
              onPressed: () async {
                if (_formKey.currentState!.validate()) {
                  final response = await AuthService.register(
                    _nameController.text,
                    _emailController.text,
                    _passwordController.text,
                  );

                  if (response.statusCode == 201) {
                    final data = jsonDecode(response.body);
                    print("Registration success!");

                    // Navigate to complete profile screen
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder:
                            (context) => CompleteProfileScreen(
                              userId: data['_id'],
                              token: data['token'],
                            ),
                      ),
                    );
                  } else {
                    print("Registration failed: ${response.body}");
                    showDialog(
                      context: context,
                      builder:
                          (_) => AlertDialog(
                            backgroundColor: themeProvider.cardColor,
                            title: Text(
                              "Sign Up Failed",
                              style: TextStyle(color: themeProvider.textColor),
                            ),
                            content: Text(
                              "Something went wrong.",
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

            // Terms of Service
            RichText(
              textAlign: TextAlign.center,
              text: TextSpan(
                style: TextStyle(
                  color: themeProvider.textColor.withOpacity(0.7),
                  fontSize: 14,
                ),
                children: [
                  TextSpan(text: 'By signing up, you agree to our '),
                  TextSpan(
                    text: 'Terms of Service',
                    style: TextStyle(color: AppColors.primaryColor),
                  ),
                ],
              ),
            ),
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
          "Already have an account? ",
          style: TextStyle(
            color: themeProvider.textColor.withOpacity(0.7),
            fontSize: 16,
          ),
        ),
        GestureDetector(
          onTap: () {
            Navigator.pop(context);
          },
          child: Text(
            'Login',
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
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
