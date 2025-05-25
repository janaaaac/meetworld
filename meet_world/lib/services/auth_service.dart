import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/api.dart';

class AuthService {
  static Future<http.Response> login(String email, String password) async {
    final url = Uri.parse('$baseUrl/auth/login');
    return await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
  }

  static Future<http.Response> register(
    String name,
    String email,
    String password,
  ) async {
    final url = Uri.parse('$baseUrl/auth/register');
    return await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': name,
        'email': email,
        'password': password,
      }),
    );
  }

  static Future<http.Response> completeProfile(
    String token,
    int age,
    String gender,
    String location,
    String bio,
  ) async {
    final url = Uri.parse('$baseUrl/auth/complete-profile');
    return await http.put(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'age': age,
        'gender': gender,
        'location': location,
        'bio': bio,
      }),
    );
  }
}
