# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Explicit native Capacitor plugins and reflective annotations.
-keepattributes *Annotation*,Signature,EnclosingMethod,InnerClasses
-keep class com.shadowlessstudios.passwordmanager.ParolaDocumentExportPlugin { *; }
-keep class com.shadowlessstudios.passwordmanager.ParolaBillingPlugin { *; }

# FirebaseAuthentication includes optional Facebook provider bytecode, but Parola only enables google.com.
# The Facebook SDK is intentionally not bundled; suppress its missing optional classes.
-dontwarn com.facebook.CallbackManager$Factory
-dontwarn com.facebook.CallbackManager
-dontwarn com.facebook.FacebookCallback
-dontwarn com.facebook.login.LoginManager
