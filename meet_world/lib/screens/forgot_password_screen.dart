import 'package:flutter/material.dart';
import 'package:meet_world/constants/colours.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/primary_button.dart';

class ForgotPasswordScreen extends StatefulWidget {
  @override
  _ForgotPasswordScreenState createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();

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
                SizedBox(height: 60),
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
                _buildForgotPasswordCard(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildForgotPasswordCard() {
    return Container(
      padding: EdgeInsets.all(30),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(20)),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Forgot Password',
              style: TextStyle(
                color: AppColors.textColor,
                fontSize: 32,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 10),
            Text(
              'Enter your email to receive password reset instructions.',
              style: TextStyle(
                color: AppColors.textColor.withOpacity(0.7),
                fontSize: 16,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 30),
            CustomTextField(
              controller: _emailController,
              hintText: 'Email address',
              keyboardType: TextInputType.emailAddress,
            ),
            SizedBox(height: 30),
            PrimaryButton(
              text: 'Send Reset Link',
              onPressed: () {
                if (_formKey.currentState!.validate()) {
                  // Add your password reset logic here
                  print('Reset link sent to: \\${_emailController.text}');
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text('Reset link sent!')));
                }
              },
            ),
            SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Remember your password? ',
                  style: TextStyle(
                    color: AppColors.textColor.withOpacity(0.7),
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
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }
}
