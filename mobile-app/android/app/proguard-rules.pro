# Add project specific ProGuard rules here.
# React Native / Hermes default rules are applied automatically by the RN Gradle plugin.

# Razorpay
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-optimizations !method/inlining/*
-keepclasseswithmembers class * {
  public void onPayment*(...);
}

# Firebase Messaging
-keep class com.google.firebase.messaging.** { *; }

# react-native-maps
-keep class com.google.android.gms.maps.** { *; }
-keep interface com.google.android.gms.maps.** { *; }
