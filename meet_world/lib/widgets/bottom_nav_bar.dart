import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:meet_world/providers/theme_provider.dart';
import 'package:meet_world/constants/colours.dart';

class BottomNavBar extends StatelessWidget {
  final int selectedIndex;
  final Function(int) onItemTapped;

  const BottomNavBar({
    Key? key,
    required this.selectedIndex,
    required this.onItemTapped,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return Container(
          height: 100,
          margin: EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          decoration: BoxDecoration(
            color: themeProvider.cardColor,
            borderRadius: BorderRadius.circular(50),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildBottomNavItem(Icons.home, 'Home', 0, themeProvider),
              _buildBottomNavItem(
                Icons.location_on_outlined,
                'Explore',
                1,
                themeProvider,
              ),
              _buildBottomNavItem(
                Icons.favorite_outline,
                'Likes',
                2,
                themeProvider,
              ),
              _buildBottomNavItem(
                Icons.chat_bubble_outline,
                'Chat',
                3,
                themeProvider,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBottomNavItem(
    IconData icon,
    String title,
    int index,
    ThemeProvider themeProvider,
  ) {
    bool isActive = selectedIndex == index;
    return GestureDetector(
      onTap: () => onItemTapped(index),
      child: AnimatedContainer(
        duration: Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        padding: EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isActive ? AppColors.primaryColor : Colors.transparent,
          borderRadius: BorderRadius.circular(50),
        ),
        child: AnimatedSwitcher(
          duration: Duration(milliseconds: 200),
          transitionBuilder: (Widget child, Animation<double> animation) {
            return ScaleTransition(scale: animation, child: child);
          },
          child: Icon(
            icon,
            key: ValueKey('$icon-$isActive'),
            color: isActive ? Colors.black : themeProvider.textColor,
            size: 28,
          ),
        ),
      ),
    );
  }
}
