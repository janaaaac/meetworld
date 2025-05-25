import 'package:flutter/material.dart';

class AppColors {
  // Dark Mode Colors
  static const Color darkBackgroundColor = Color(0xFF0A0A0A);
  static const Color darkPrimaryColor = Color(0xFF2AFD92);
  static const Color darkTextColor = Color(0xFFFFFFFF);
  static const Color darkCardColor = Color(0xFF1A1A1A);
  static const Color darkSecondaryColor = Color(0xFF2A2A2A);

  // Light Mode Colors
  static const Color lightBackgroundColor = Color(0xFFF8F9FA);
  static const Color lightPrimaryColor = Color(0xFF2AFD92);
  static const Color lightTextColor = Color(0xFF1A1A1A);
  static const Color lightCardColor = Color(0xFFFFFFFF);
  static const Color lightSecondaryColor = Color(0xFFE9ECEF);

  // Legacy colors (for backward compatibility)
  static const Color backgroundColor = Color(0xFF0A0A0A);
  static const Color primaryColor = Color(0xFF2AFD92);
  static const Color textColor = Color(0xFFFFFFFF);
  static const Color cardColor = Color(0xFF1A1A1A);
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: AppColors.darkPrimaryColor,
      scaffoldBackgroundColor: AppColors.darkBackgroundColor,
      cardColor: AppColors.darkCardColor,
      textTheme: TextTheme(
        bodyLarge: TextStyle(color: AppColors.darkTextColor),
        bodyMedium: TextStyle(color: AppColors.darkTextColor),
        titleLarge: TextStyle(color: AppColors.darkTextColor),
        titleMedium: TextStyle(color: AppColors.darkTextColor),
      ),
      colorScheme: ColorScheme.dark(
        primary: AppColors.darkPrimaryColor,
        background: AppColors.darkBackgroundColor,
        surface: AppColors.darkCardColor,
        onPrimary: Colors.black,
        onBackground: AppColors.darkTextColor,
        onSurface: AppColors.darkTextColor,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.darkBackgroundColor,
        foregroundColor: AppColors.darkTextColor,
        elevation: 0,
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.darkCardColor,
        selectedItemColor: AppColors.darkPrimaryColor,
        unselectedItemColor: AppColors.darkTextColor.withOpacity(0.6),
      ),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: AppColors.lightPrimaryColor,
      scaffoldBackgroundColor: AppColors.lightBackgroundColor,
      cardColor: AppColors.lightCardColor,
      textTheme: TextTheme(
        bodyLarge: TextStyle(color: AppColors.lightTextColor),
        bodyMedium: TextStyle(color: AppColors.lightTextColor),
        titleLarge: TextStyle(color: AppColors.lightTextColor),
        titleMedium: TextStyle(color: AppColors.lightTextColor),
      ),
      colorScheme: ColorScheme.light(
        primary: AppColors.lightPrimaryColor,
        background: AppColors.lightBackgroundColor,
        surface: AppColors.lightCardColor,
        onPrimary: Colors.white,
        onBackground: AppColors.lightTextColor,
        onSurface: AppColors.lightTextColor,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.lightBackgroundColor,
        foregroundColor: AppColors.lightTextColor,
        elevation: 0,
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.lightCardColor,
        selectedItemColor: AppColors.lightPrimaryColor,
        unselectedItemColor: AppColors.lightTextColor.withOpacity(0.6),
      ),
    );
  }
}
