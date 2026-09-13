// ============================================================
// STUDENT FILE
//
// 1) Set your own Wi-Fi name and password so your car is unique.
//    AP_SSID: 1–32 characters. Example: ELECTRO-Car-07
//    AP_PASSWORD: 8–63 characters.
//
// 2) Then implement motor direction control below.
//
// This function is called whenever a direction button is pressed
// (or released) on the website.
//
// Available directions (Dir d):
//   UP, DOWN, LEFT, RIGHT, NONE
//
// Motor driver pins (already defined in electro_bootcamp.ino):
//   AIN1, AIN2  — Motor A direction
//   BIN1, BIN2  — Motor B direction
//
// The UP / DOWN pin values below are only a starter shape.
// They are NOT the correct answer. Finish LEFT, RIGHT, and stop,
// then test on your car and fix HIGH / LOW until each move is right.
// ============================================================

#pragma once

const char* AP_SSID     = "ELECTRO-Car-XX"; // change XX to your number
const char* AP_PASSWORD = "12345678";       // at least 8 characters

void applyDirection(Dir d) {
  currentDir = d;
  //Start writing code here, DO NOT edit the above code!
  if (d == UP) {
    digitalWrite(AIN1, HIGH);
    digitalWrite(AIN2, LOW);
    digitalWrite(BIN1, HIGH);
    digitalWrite(BIN2, LOW);
  } else if (d == DOWN) {
    digitalWrite(AIN1, LOW);
    digitalWrite(AIN2, HIGH);
    digitalWrite(BIN1, LOW);
    digitalWrite(BIN2, HIGH);
  }
  // keep going: LEFT, RIGHT, and an else to stop
  //DO NOT edit past this point!
}
