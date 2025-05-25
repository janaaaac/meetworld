import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeProvider with ChangeNotifier {
  bool _isDarkMode = true; // Default to dark mode

  bool get isDarkMode => _isDarkMode;

  ThemeMode get themeMode => _isDarkMode ? ThemeMode.dark : ThemeMode.light;

  ThemeProvider() {
    _loadThemePreference();
  }

  // Load theme preference from SharedPreferences
  void _loadThemePreference() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    _isDarkMode = prefs.getBool('isDarkMode') ?? true; // Default to dark mode
    notifyListeners();
  }

  // Toggle between light and dark mode
  void toggleTheme() async {
    _isDarkMode = !_isDarkMode;
    SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isDarkMode', _isDarkMode);
    notifyListeners();
  }

  // Set specific theme mode
  void setTheme(bool isDark) async {
    if (_isDarkMode != isDark) {
      _isDarkMode = isDark;
      SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.setBool('isDarkMode', _isDarkMode);
      notifyListeners();
    }
  }

  // Get dynamic colors based on current theme
  Color get backgroundColor =>
      _isDarkMode ? const Color(0xFF0A0A0A) : const Color(0xFFF8F9FA);

  Color get primaryColor => const Color(0xFF2AFD92);

  Color get textColor =>
      _isDarkMode ? const Color(0xFFFFFFFF) : const Color(0xFF1A1A1A);

  Color get cardColor =>
      _isDarkMode ? const Color(0xFF1A1A1A) : const Color(0xFFFFFFFF);

  Color get secondaryColor =>
      _isDarkMode ? const Color(0xFF2A2A2A) : const Color(0xFFE9ECEF);
}
