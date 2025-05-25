import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/theme_provider.dart';

class ThemeHelper {
  static ThemeProvider of(BuildContext context, {bool listen = true}) {
    return Provider.of<ThemeProvider>(context, listen: listen);
  }

  static Color backgroundColor(BuildContext context) {
    final themeProvider = of(context, listen: false);
    return themeProvider.backgroundColor;
  }

  static Color primaryColor(BuildContext context) {
    final themeProvider = of(context, listen: false);
    return themeProvider.primaryColor;
  }

  static Color textColor(BuildContext context) {
    final themeProvider = of(context, listen: false);
    return themeProvider.textColor;
  }

  static Color cardColor(BuildContext context) {
    final themeProvider = of(context, listen: false);
    return themeProvider.cardColor;
  }

  static Color secondaryColor(BuildContext context) {
    final themeProvider = of(context, listen: false);
    return themeProvider.secondaryColor;
  }

  static bool isDarkMode(BuildContext context) {
    final themeProvider = of(context, listen: false);
    return themeProvider.isDarkMode;
  }
}
